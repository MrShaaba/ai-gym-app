import { expect, test } from '@playwright/test';
import {
  accountState,
  finishWorkout,
  localDate,
  recordScheduledWorkout,
  registerAccount,
  scheduleOwnProgram,
  signIn,
} from './helpers';

test('workout draft survives pause and reload; completion preserves decimal weight, reflection, and recurrence', async ({
  page,
  request,
}) => {
  const account = await registerAccount(request, 'member');
  const scheduled = await scheduleOwnProgram(request, account);
  expect(scheduled.occurrences).toHaveLength(2);
  await signIn(page, account);
  await recordScheduledWorkout(
    page,
    'Strong and controlled. Keep this load next week.',
  );
  await page
    .getByRole('button', { name: 'Pause workout', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Resume workout', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Keep draft & close', exact: true })
    .click();
  await page.reload();
  await page
    .getByRole('button', { name: /^Return to workout/ })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Resume workout', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel(/set 1 weight \(kg\)$/)).toHaveValue('22.5');
  await expect(page.getByLabel(/set 1 reps$/)).toHaveValue('9');
  await page
    .getByRole('button', { name: 'Resume workout', exact: true })
    .click();
  await finishWorkout(page);
  await expect
    .poll(async () => (await accountState(request, account)).workouts.length)
    .toBe(1);
  const state = await accountState(request, account);
  expect(state.workouts[0].exercises[0].sets[0]).toMatchObject({
    weight: 22.5,
    reps: 9,
    completed: true,
  });
  expect(state.workouts[0].reflection.notes).toBe(
    'Strong and controlled. Keep this load next week.',
  );
  expect(
    state.occurrences.find((item) => item.date === localDate())?.status,
  ).toBe('completed');
  expect(
    state.occurrences.find((item) => item.date === localDate(7))?.status,
  ).toBe('planned');
  await page.goto('/#journal');
  await page.getByRole('button', { name: /E2E Full Body/ }).click();
  await expect(
    page.getByText('Strong and controlled. Keep this load next week.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.goto('/#today');
  await page.getByLabel('Schedule date').fill(localDate(7));
  await expect(
    page.getByRole('button', { name: 'Start workout', exact: true }),
  ).toBeVisible();
});

test('failed completion survives reload and account switching, then syncs exactly once for its owner', async ({
  page,
  request,
}) => {
  const owner = await registerAccount(request, 'member', 'Outbox Owner');
  const other = await registerAccount(request, 'member', 'Different Member');
  await scheduleOwnProgram(request, owner);
  await signIn(page, owner);
  await page.route('**/api/action', async (route) => {
    const body: unknown = route.request().postDataJSON();
    if (
      body &&
      typeof body === 'object' &&
      'type' in body &&
      body.type === 'complete_workout'
    )
      await route.abort('failed');
    else await route.continue();
  });
  await recordScheduledWorkout(page, 'Retain this offline reflection.');
  await finishWorkout(page);
  await expect(
    page.getByText('1 workout waiting to sync', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('1 workout waiting to sync', { exact: true }),
  ).toBeVisible();
  expect((await accountState(request, owner)).workouts).toHaveLength(0);
  await page.getByRole('button', { name: /sign out/i }).click();
  await signIn(page, other);
  await expect(page.getByText(/workout waiting to sync/)).toHaveCount(0);
  expect((await accountState(request, other)).workouts).toHaveLength(0);
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.unroute('**/api/action');
  await signIn(page, owner);
  await expect
    .poll(async () => (await accountState(request, owner)).workouts.length)
    .toBe(1);
  await expect(page.getByText(/workout waiting to sync/)).toHaveCount(0);
  await page.reload();
  const state = await accountState(request, owner);
  expect(state.workouts).toHaveLength(1);
  expect(state.workouts[0].reflection.notes).toBe(
    'Retain this offline reflection.',
  );
  expect((await accountState(request, other)).workouts).toHaveLength(0);
});

test('restart clears only the active draft; cancelling restores the scheduled occurrence', async ({
  page,
  request,
}) => {
  const account = await registerAccount(request, 'member');
  await scheduleOwnProgram(request, account);
  await signIn(page, account);
  await recordScheduledWorkout(page, 'This draft will be restarted.');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Restart this workout?' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Restart this workout?' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('dialog', { name: 'E2E Full Body', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Restart', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Restart this workout?' })
    .getByRole('button', { name: 'Confirm', exact: true })
    .click();
  await expect(page.getByLabel('Session notes', { exact: true })).toHaveValue(
    '',
  );
  await expect(
    page.getByRole('button', { name: /^Complete .+ set 1$/ }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Cancel workout', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Cancel this workout?' })
    .getByRole('button', { name: 'Confirm', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Start workout', exact: true }),
  ).toBeVisible();
  const state = await accountState(request, account);
  expect(state.workouts).toHaveLength(0);
  expect(state.occurrences).toHaveLength(2);
  expect(
    state.occurrences.every((item) => item.status === 'planned'),
  ).toBeTruthy();
});
