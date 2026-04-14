// supabase/functions/generate-plan/index.ts
// Supabase Edge Function — AI workout plan generation
// Deploy: supabase functions deploy generate-plan --no-verify-jwt
// Secret: supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface GenerationRequest {
  goal: string;
  horizon: 'today' | 'week' | 'month';
  daysPerWeek: number;
  durationMinutes: number;
  difficulty: string;
  equipment: string[];
  focusAreas: string[];
}

const SYSTEM_PROMPT = `You are an expert fitness coach. Generate a structured workout plan as JSON.
Rules:
- Return ONLY valid JSON, no markdown or prose
- Use realistic exercises, sets, reps, and weights
- Match the difficulty level and available equipment
- Each routine should be completable within the specified duration
- Use the exact JSON schema provided

Output schema:
{
  "title": "string — short plan name",
  "goal": "string — restated goal",
  "summary": "string — 1-2 sentence overview",
  "routines": [
    {
      "name": "string — e.g. 'Day 1 - Push'",
      "difficulty": "beginner | intermediate | advanced",
      "durationMinutes": number,
      "exercises": [
        {
          "exercise": {
            "id": "string — unique like 'gen-01'",
            "name": "string — exercise name",
            "muscleGroups": ["string — e.g. 'chest', 'triceps'"],
            "equipment": "string — barbell|dumbbell|kettlebell|machine|bodyweight|cable|resistance_band|pull_up_bar"
          },
          "sets": [
            { "reps": number, "weight": number, "restSeconds": number }
          ]
        }
      ]
    }
  ]
}`;

function buildUserPrompt(req: GenerationRequest): string {
  const routineCount =
    req.horizon === 'today' ? 1 : req.horizon === 'week' ? req.daysPerWeek : req.daysPerWeek * 4;

  return `Generate a ${req.horizon} workout plan with these constraints:
- Goal: ${req.goal}
- ${routineCount} routine(s)
- ${req.daysPerWeek} days per week
- ~${req.durationMinutes} minutes per session
- Difficulty: ${req.difficulty}
- Equipment available: ${req.equipment.join(', ')}
- Focus areas: ${req.focusAreas.join(', ')}

Return the JSON only.`;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get('authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the calling user
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body: GenerationRequest = await req.json();

    // Premium gate: check generation count
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_generation_count, plan_tier, trial_ends_at, admin_override')
      .eq('id', user.id)
      .single();

    const FREE_LIMIT = 3;
    const count = profile?.ai_generation_count ?? 0;
    const hasPremiumAccess = Boolean(profile?.admin_override)
      || profile?.plan_tier === 'premium'
      || (typeof profile?.trial_ends_at === 'string' && new Date(profile.trial_ends_at).getTime() > Date.now());

    if (!hasPremiumAccess && count >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'generation_limit_reached',
          message: 'You have used all free AI generations. Upgrade to Premium for unlimited access.',
          used: count,
          limit: FREE_LIMIT,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Call OpenAI
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(body) },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('OpenAI error:', errText);
      return new Response(
        JSON.stringify({ error: 'generation_failed', message: 'AI generation failed. Please try again.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'generation_failed', message: 'No content returned from AI.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Parse and validate the generated plan
    let plan;
    try {
      plan = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: 'generation_failed', message: 'AI returned invalid JSON.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Increment generation count
    await supabase.rpc('increment_ai_generation_count', { user_id: user.id });

    // Return the plan with metadata
    const result = {
      ...plan,
      horizon: body.horizon,
      daysPerWeek: body.daysPerWeek,
      generatedAt: new Date().toISOString(),
      model: 'gpt-4o-mini',
      request: body,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: 'An unexpected error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
