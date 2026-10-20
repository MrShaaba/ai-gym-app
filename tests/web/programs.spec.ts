import { expect, test } from '@playwright/test';
import type { Program } from '../../web/types';
import { accountState, act, registerAccount, signIn } from './helpers';

test('trainer builds two routines, maps separate weekdays, and deletion preserves assigned snapshots', async ({
  page,
  request,
}) => {
  const trainer = await registerAccount(request, 'trainer', 'Program Coach');
  const member = await registerAccount(request, 'member', 'Program Member');
  const pending = await act(request, trainer, {
    type: 'request_link',
    memberEmail: member.email,
  });
  const link = pending.relationships.find(
    (item) => item.memberId === member.state.user.id,
  );
  expect(link).toBeTruthy();
  await act(request, member, {
    type: 'respond_link',
    id: link!.id,
    accept: true,
  });
  const exerciseName = trainer.state.exercises[0].name;
  await signIn(page, trainer);
  await page.goto('/#plans');
  await page
    .getByRole('button', { name: 'Create program', exact: true })
    .first()
    .click();
  await page
    .getByLabel('Program title', { exact: true })
    .fill('Separate training days');
  await page.getByLabel('Routine name', { exact: true }).fill('Day A');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises', { exact: true }).fill(exerciseName);
  await page
    .getByRole('button', { name: `Add ${exerciseName}`, exact: true })
    .click();
  await page
    .getByLabel(`${exerciseName} set 1 load in kg`, { exact: true })
    .fill('22.5');
  await page
    .getByRole('button', { name: 'Duplicate Day A', exact: true })
    .click();
  await page.getByLabel('Routine name', { exact: true }).fill('Day B');
  await page.getByRole('button', { name: 'Save program', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  let trainerState = await accountState(request, trainer);
  expect(trainerState.programs).toHaveLength(1);
  expect(trainerState.programs[0].routines.map((item) => item.name)).toEqual([
    'Day A',
    'Day B',
  ]);
  expect(trainerState.programs[0].routines[0].exercises[0].sets[0].weight).toBe(
    22.5,
  );
  await page
    .getByRole('button', { name: 'Assign to client', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Client', exact: true })
    .selectOption(member.state.user.id);
  await page.getByLabel('Number of weeks', { exact: true }).fill('2');
  await page
    .getByRole('combobox', { name: 'Monday', exact: true })
    .selectOption({ label: 'Day A' });
  await page
    .getByRole('combobox', { name: 'Wednesday', exact: true })
    .selectOption({ label: 'Day B' });
  await expect(page.getByText('4 sessions', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Confirm schedule', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const memberState = await accountState(request, member);
  expect(memberState.occurrences).toHaveLength(4);
  for (const occurrence of memberState.occurrences) {
    expect(occurrence.routine.name).toBe(
      new Date(`${occurrence.date}T12:00:00`).getDay() === 1
        ? 'Day A'
        : 'Day B',
    );
  }
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  trainerState = await accountState(request, trainer);
  expect(trainerState.programs).toHaveLength(0);
  expect((await accountState(request, member)).occurrences).toEqual(
    memberState.occurrences,
  );
});

test('local plan preview is honestly labeled and saves only after customization', async ({
  page,
  request,
}) => {
  const account = await registerAccount(request, 'member');
  await signIn(page, account);
  await page.goto('/#studio');
  await expect(
    page.getByText(/Hosted AI is not connected/).first(),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Training goal', exact: true })
    .fill('Build a consistent full-body strength habit.');
  await page
    .getByRole('combobox', { name: 'Days per week', exact: true })
    .selectOption('2');
  await page
    .getByRole('button', { name: 'Create local plan preview', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Customize & save plan', exact: true }),
  ).toBeVisible();
  expect((await accountState(request, account)).programs).toHaveLength(0);
  await page
    .getByRole('button', { name: 'Customize & save plan', exact: true })
    .click();
  await page
    .getByLabel('Program title', { exact: true })
    .fill('My realistic starting plan');
  await page.getByRole('button', { name: 'Save program', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const state = await accountState(request, account);
  expect(state.programs).toHaveLength(1);
  expect(state.programs[0]).toMatchObject({
    title: 'My realistic starting plan',
    source: 'ai',
  });
  expect(state.programs[0].routines).toHaveLength(2);
});

test('only explicitly shared member programs can receive trainer endorsement; edits invalidate it', async ({
  browser,
  baseURL,
  request,
}) => {
  const trainer = await registerAccount(
    request,
    'trainer',
    'Endorsement Coach',
  );
  const member = await registerAccount(request, 'member', 'Private Planner');
  const pending = await act(request, trainer, {
    type: 'request_link',
    memberEmail: member.email,
  });
  await act(request, member, {
    type: 'respond_link',
    id: pending.relationships[0].id,
    accept: true,
  });
  const generation = await request.post('/api/generate', {
    headers: { Authorization: `Bearer ${member.token}` },
    data: {
      goal: 'Build full body strength.',
      days: 1,
      minutes: 30,
      equipment: ['bodyweight'],
      difficulty: 'beginner',
    },
  });
  expect(generation.ok()).toBeTruthy();
  const program = ((await generation.json()) as { program: Program }).program;
  program.title = 'Private until shared';
  program.routines[0].name = 'E2E Full Body';
  await act(request, member, { type: 'save_program', program });
  const coachContext = await browser.newContext({ baseURL });
  const memberContext = await browser.newContext({ baseURL });
  const coachPage = await coachContext.newPage();
  const memberPage = await memberContext.newPage();
  try {
    await signIn(coachPage, trainer);
    await coachPage.goto('/#plans');
    await expect(
      coachPage.getByRole('button', {
        name: 'Private until shared',
        exact: true,
      }),
    ).toHaveCount(0);
    await signIn(memberPage, member);
    await memberPage.goto('/#plans');
    await memberPage.getByRole('button', { name: 'Edit', exact: true }).click();
    await memberPage.getByLabel(/^Visibility/).selectOption('shared');
    await memberPage
      .getByRole('button', { name: 'Save program', exact: true })
      .click();
    await expect(memberPage.getByRole('dialog')).toHaveCount(0);
    await coachPage.reload();
    await coachPage
      .getByRole('button', { name: 'View plan', exact: true })
      .click();
    await expect(
      coachPage.getByRole('button', {
        name: 'Mark reviewed by trainer',
        exact: true,
      }),
    ).toBeDisabled();
    await coachPage
      .getByLabel('I reviewed E2E Full Body', { exact: true })
      .check();
    await coachPage
      .getByRole('button', { name: 'Mark reviewed by trainer', exact: true })
      .click();
    await expect(
      coachPage.getByText('You reviewed this version', { exact: true }),
    ).toBeVisible();
    await memberPage.reload();
    await expect(
      memberPage.getByText('Reviewed by trainer', { exact: true }),
    ).toBeVisible();
    await memberPage.getByRole('button', { name: 'Edit', exact: true }).click();
    await memberPage
      .getByLabel('Routine name', { exact: true })
      .fill('Revised routine needs review');
    await memberPage
      .getByRole('button', { name: 'Save program', exact: true })
      .click();
    await expect(memberPage.getByRole('dialog')).toHaveCount(0);
    await expect(
      memberPage.getByText('Reviewed by trainer', { exact: true }),
    ).toHaveCount(0);
    const updated = (await accountState(request, member)).programs[0];
    expect(updated.endorsedRevision).not.toBe(updated.revision);
  } finally {
    await coachContext.close();
    await memberContext.close();
  }
});
