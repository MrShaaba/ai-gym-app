import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { registerAccount, signIn } from './helpers';

test('trainer can register from the browser and starts with an empty roster', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  await page.getByLabel('Full name', { exact: true }).fill('New Browser Coach');
  await page
    .getByLabel('Email', { exact: true })
    .fill(`browser-${randomUUID()}@e2e.example`);
  await page.getByLabel('Password', { exact: true }).fill('BrowserSignup!2026');
  await page
    .getByRole('combobox', { name: 'Account type', exact: true })
    .selectOption('trainer');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('New Browser Coach', { exact: true }).first(),
  ).toBeVisible();
  await page.goto('/#clients');
  await expect(
    page.getByText('No members here yet', { exact: true }),
  ).toBeVisible();
});

test('demo accounts open their role-specific workspace without sharing a session', async ({
  browser,
  baseURL,
}) => {
  const memberContext = await browser.newContext({ baseURL });
  const trainerContext = await browser.newContext({ baseURL });
  const member = await memberContext.newPage();
  const trainer = await trainerContext.newPage();
  try {
    await signIn(member, {
      email: 'member@aigym.local',
      password: 'TrainToday!2026',
    });
    await signIn(trainer, {
      email: 'trainer@aigym.local',
      password: 'TrainToday!2026',
    });
    await expect(
      member.getByText('Alex Morgan', { exact: true }).first(),
    ).toBeVisible();
    await expect(
      trainer.getByText('Jordan Lee', { exact: true }).first(),
    ).toBeVisible();
    await member.reload();
    await trainer.reload();
    await expect(
      member.getByText('Alex Morgan', { exact: true }).first(),
    ).toBeVisible();
    await expect(
      trainer.getByText('Jordan Lee', { exact: true }).first(),
    ).toBeVisible();
    await member.getByRole('button', { name: /sign out/i }).click();
    await expect(
      member.getByRole('button', { name: 'Sign in', exact: true }),
    ).toBeVisible();
    await expect(
      trainer.getByRole('button', { name: /sign out/i }),
    ).toBeVisible();
  } finally {
    await memberContext.close();
    await trainerContext.close();
  }
});

test('new account remains empty and does not inherit demo workout data', async ({
  page,
  request,
}) => {
  const account = await registerAccount(request, 'member', 'Fresh Member');
  await signIn(page, account);
  await expect(
    page.getByText('Fresh Member', { exact: true }).first(),
  ).toBeVisible();
  expect(account.state.workouts).toHaveLength(0);
  expect(account.state.assignments).toHaveLength(0);
  await page.goto('/#journal');
  await expect(
    page.getByText('Your first entry is waiting.', { exact: true }),
  ).toBeVisible();
});

test('keyboard sign-in and narrow-screen navigation remain usable', async ({
  page,
  request,
}) => {
  const account = await registerAccount(request, 'member', 'Keyboard Member');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const email = page.getByLabel('Email', { exact: true });
  await email.focus();
  await page.keyboard.type(account.email);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.keyboard.type(account.password);
  await page.keyboard.press('Enter');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }),
  ).toHaveCount(0);
  await page.locator('main').focus();
  for (let index = 0; index < 4; index += 1)
    await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Open navigation', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  await expect(
    page.getByText('Keyboard Member', { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Today', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }),
  ).toHaveCount(0);
  for (const route of ['today', 'plans', 'journal', 'progress', 'settings']) {
    await page.goto(`/#${route}`);
    await expect(page.locator('main')).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(
      hasHorizontalOverflow,
      `${route} overflows a 390px viewport`,
    ).toBeFalsy();
  }
});
