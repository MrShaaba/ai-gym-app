# Infrastructure Deploy Runbook — Phase 8

Project ref: `fcsllrdvsizlrrqatgeq`

## 1. Run pending migrations (SQL Editor)

Run these in order via **Supabase Dashboard → SQL Editor → New Query**:

```sql
-- Phase 7C: AI generation columns
\i supabase/migrations/phase7c_ai_generation.sql

-- Phase 7C: hosted repair (if not already applied)
\i supabase/migrations/phase7c_hosted_repair.sql

-- Phase 8: Marketplace columns on profiles
\i supabase/migrations/phase8_marketplace_profiles.sql
```

Or paste each file's contents into the SQL Editor and click **Run**.

## 2. Deploy the Edge Function

```bash
# From project root
npx supabase functions deploy generate-plan --project-ref fcsllrdvsizlrrqatgeq
```

## 3. Set the OpenAI API key secret

```bash
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here --project-ref fcsllrdvsizlrrqatgeq
```

## 4. Verify

- **Migrations:** Check `profiles` table has `username`, `specialties`, `is_public`, etc.
- **Edge Function:** `npx supabase functions list --project-ref fcsllrdvsizlrrqatgeq` → `generate-plan` should appear.
- **Secret:** The Edge Function should now respond without "OPENAI_API_KEY not set" errors.

## Rollback

If anything breaks, the app is frozen at `v0.7.3-stable`:

```bash
git checkout v0.7.3-stable
```

Migrations are additive (new columns, new policy) — no destructive changes.
