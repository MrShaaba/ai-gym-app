import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { accountState, registerAccount, signIn } from './helpers';

test('profile settings persist and account export contains only the signed-in account records', async ({
  page,
  request,
}) => {
  const account = await registerAccount(request, 'member');
  await signIn(page, account);
  await page.goto('/#settings');
  await page.getByLabel('Full name', { exact: true }).fill('Updated Member');
  await page
    .getByLabel('Training goal', { exact: true })
    .fill('Train three times a week with steady progress.');
  await page.getByLabel(/^Weight display/).selectOption('lb');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect
    .poll(async () => (await accountState(request, account)).user.name)
    .toBe('Updated Member');
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue(
    'Updated Member',
  );
  await expect(page.getByLabel(/^Weight display/)).toHaveValue('lb');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  const contents = await readFile(path!, 'utf8');
  expect(contents).toContain(account.email);
  expect(contents).toContain('Updated Member');
  expect(contents).not.toContain('member@aigym.local');
  expect(contents).not.toContain('passwordHash');
  expect(contents).not.toContain(account.token);
  expect(() => JSON.parse(contents) as unknown).not.toThrow();
});

test('password change and account deletion use explicit account controls', async ({
  page,
  request,
}) => {
  const account = await registerAccount(request, 'member');
  await signIn(page, account);
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'Change', exact: true }).click();
  await page
    .getByLabel('Current password', { exact: true })
    .fill(account.password);
  const nextPassword = 'ChangedPassword!2026';
  await page.getByLabel(/^New password/).fill(nextPassword);
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill(nextPassword);
  await page
    .getByRole('button', { name: 'Update password', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /sign out/i }).click();
  await signIn(page, { ...account, password: nextPassword });
  await page.goto('/#settings');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete my account', exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel('Confirm your password', { exact: true })
    .fill(nextPassword);
  await page
    .getByLabel('I understand that deleting my account is permanent.', {
      exact: true,
    })
    .check();
  await page
    .getByRole('button', { name: 'Delete my account', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  const rejected = await request.post('/api/auth/login', {
    data: { email: account.email, password: nextPassword },
  });
  expect(rejected.status()).toBe(401);
});
