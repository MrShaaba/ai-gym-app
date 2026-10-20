import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import type { Action, Program, Role, WebState } from '../../web/types';

export interface TestAccount {
  email: string;
  password: string;
  token: string;
  state: WebState;
}

export async function registerAccount(
  request: APIRequestContext,
  role: Role,
  name?: string,
): Promise<TestAccount> {
  const suffix = randomUUID().slice(0, 8);
  const email = `${role}-${suffix}@e2e.example`;
  const password = 'StrongTest!2026';
  const response = await request.post('/api/auth/register', {
    data: { email, password, name: name || `Test ${role} ${suffix}`, role },
  });
  expect(
    response.ok(),
    `Register ${role}: ${await response.text()}`,
  ).toBeTruthy();
  const payload = (await response.json()) as { token: string; state: WebState };
  return { email, password, ...payload };
}

export async function act(
  request: APIRequestContext,
  account: TestAccount,
  action: Action,
): Promise<WebState> {
  const response = await request.post('/api/action', {
    headers: { Authorization: `Bearer ${account.token}` },
    data: action,
  });
  expect(
    response.ok(),
    `${action.type}: ${await response.text()}`,
  ).toBeTruthy();
  return (await response.json()) as WebState;
}

export async function accountState(
  request: APIRequestContext,
  account: TestAccount,
): Promise<WebState> {
  const response = await request.get('/api/state', {
    headers: { Authorization: `Bearer ${account.token}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as WebState;
}

export async function signIn(
  page: Page,
  account: Pick<TestAccount, 'email' | 'password'>,
): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
}

export async function recordScheduledWorkout(
  page: Page,
  notes: string,
): Promise<void> {
  await page
    .getByRole('button', { name: 'Start workout', exact: true })
    .click();
  await page.getByLabel(/set 1 weight \(kg\)$/).fill('22.5');
  await page.getByLabel(/set 1 reps$/).fill('9');
  await page.getByRole('button', { name: /^Complete .+ set 1$/ }).click();
  await page.getByLabel('Session notes', { exact: true }).fill(notes);
}

export async function finishWorkout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Finish workout/ }).click();
  await page
    .getByRole('dialog', { name: 'Finish and save your workout?' })
    .getByRole('button', { name: 'Confirm', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

export function localDate(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function testProgram(
  account: TestAccount,
  title = 'E2E Strength Plan',
): Program {
  const exercise = account.state.exercises[0];
  if (!exercise)
    throw new Error(
      'Exercise catalog must be available to authenticated accounts.',
    );
  return {
    id: randomUUID(),
    ownerId: account.state.user.id,
    title,
    description: 'Automated test program with recurring workouts.',
    source: account.state.user.role === 'trainer' ? 'trainer' : 'self',
    difficulty: 'beginner',
    revision: 1,
    archived: false,
    createdAt: new Date().toISOString(),
    visibility: 'private',
    routines: [
      {
        id: randomUUID(),
        name: 'E2E Full Body',
        durationMinutes: 30,
        exercises: [
          {
            exerciseId: exercise.id,
            name: exercise.name,
            sets: [{ reps: 8, weight: 22.5, restSeconds: 0 }],
          },
        ],
      },
    ],
  };
}

export async function scheduleOwnProgram(
  request: APIRequestContext,
  account: TestAccount,
): Promise<WebState> {
  const program = testProgram(account);
  await act(request, account, { type: 'save_program', program });
  return act(request, account, {
    type: 'assign_program',
    programId: program.id,
    memberId: account.state.user.id,
    startDate: localDate(),
    weeks: 2,
    mapping: [{ day: new Date().getDay(), routineId: program.routines[0].id }],
    note: 'Keep 22.5 kg as a decimal weight.',
    operationId: randomUUID(),
  });
}
