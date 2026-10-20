import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  accountState,
  act,
  finishWorkout,
  localDate,
  recordScheduledWorkout,
  registerAccount,
  signIn,
  testProgram,
} from './helpers';

test('invitation consent unlocks coaching; member reflection receives trainer feedback and a message', async ({
  browser,
  baseURL,
  request,
}) => {
  test.setTimeout(90_000);
  const trainer = await registerAccount(request, 'trainer', 'Review Coach');
  const member = await registerAccount(request, 'member', 'Review Member');
  const trainerContext = await browser.newContext({ baseURL });
  const memberContext = await browser.newContext({ baseURL });
  const coachPage = await trainerContext.newPage();
  const memberPage = await memberContext.newPage();
  try {
    await signIn(coachPage, trainer);
    await coachPage
      .getByRole('button', { name: 'Invite a member', exact: true })
      .first()
      .click();
    await coachPage
      .getByLabel('Member email', { exact: true })
      .fill(member.email);
    await coachPage
      .getByLabel('Personal note (optional)', { exact: true })
      .fill('Let us plan a steady training block.');
    await coachPage
      .getByRole('button', { name: 'Create invitation', exact: true })
      .click();
    await expect(coachPage.getByRole('dialog')).toHaveCount(0);
    expect((await accountState(request, trainer)).relationships[0].status).toBe(
      'pending',
    );
    await signIn(memberPage, member);
    await memberPage.goto('/#discover');
    await expect(
      memberPage.getByText(
        /Accepting lets this trainer see your training profile/,
      ),
    ).toBeVisible();
    await memberPage
      .getByRole('button', { name: 'Accept', exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await accountState(request, member)).relationships[0].status,
      )
      .toBe('active');

    const program = testProgram(trainer, 'Coach assigned strength');
    await act(request, trainer, { type: 'save_program', program });
    await act(request, trainer, {
      type: 'assign_program',
      programId: program.id,
      memberId: member.state.user.id,
      startDate: localDate(),
      weeks: 2,
      mapping: [
        { day: new Date().getDay(), routineId: program.routines[0].id },
      ],
      note: 'Keep your first working set controlled.',
      operationId: randomUUID(),
    });
    await memberPage.goto('/#today');
    await memberPage.reload();
    await recordScheduledWorkout(
      memberPage,
      'Last repetition was hard but controlled.',
    );
    await finishWorkout(memberPage);
    await expect
      .poll(async () => (await accountState(request, member)).workouts.length)
      .toBe(1);

    await coachPage.reload();
    await coachPage.getByRole('button').filter({ hasText: 'Review →' }).click();
    await expect(
      coachPage
        .getByText('Last repetition was hard but controlled.', { exact: true })
        .last(),
    ).toBeVisible();
    await coachPage
      .getByLabel(/^Coaching feedback/)
      .fill('Keep 22.5 kg next time and aim for ten controlled reps.');
    await coachPage
      .getByRole('button', { name: 'Send feedback', exact: true })
      .click();
    await expect(
      coachPage.getByRole('button', { name: 'Update feedback', exact: true }),
    ).toBeVisible();
    await coachPage
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();
    await memberPage.goto('/#journal');
    await memberPage.reload();
    await memberPage.getByRole('button', { name: /E2E Full Body/ }).click();
    await expect(
      memberPage.getByText(
        'Keep 22.5 kg next time and aim for ten controlled reps.',
        { exact: true },
      ),
    ).toBeVisible();
    await memberPage
      .getByRole('button', { name: 'Close dialog', exact: true })
      .click();

    await coachPage.goto('/#messages');
    await coachPage
      .getByLabel('Message Review Member', { exact: true })
      .fill('Your session feedback is ready in the journal.');
    await coachPage
      .getByRole('button', { name: 'Send message', exact: true })
      .click();
    await memberPage.goto('/#messages');
    await memberPage.reload();
    await expect(
      memberPage
        .getByRole('log', { name: 'Message history' })
        .getByText('Your session feedback is ready in the journal.', {
          exact: true,
        }),
    ).toBeVisible();
    const saved = await accountState(request, member);
    expect(saved.workouts[0].review?.trainerId).toBe(trainer.state.user.id);

    await memberPage.goto('/#discover');
    await memberPage
      .getByRole('button', { name: 'Disconnect', exact: true })
      .click();
    await memberPage
      .getByRole('dialog', { name: 'Disconnect coaching?' })
      .getByRole('button', { name: 'Confirm', exact: true })
      .click();
    await expect(memberPage.getByRole('dialog')).toHaveCount(0);
    const disconnected = await accountState(request, trainer);
    expect(disconnected.workouts).toHaveLength(0);
    expect(disconnected.occurrences).toHaveLength(0);
    expect((await accountState(request, member)).workouts).toHaveLength(1);
    await coachPage.reload();
    await expect(
      coachPage.getByRole('log', { name: 'Message history' }),
    ).toHaveCount(0);
  } finally {
    await trainerContext.close();
    await memberContext.close();
  }
});
