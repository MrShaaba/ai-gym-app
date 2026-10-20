import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const workspaces = [
  {
    role: 'member',
    routes: [
      'today',
      'plans',
      'journal',
      'progress',
      'discover',
      'messages',
      'notifications',
      'settings',
      'studio',
    ],
  },
  {
    role: 'trainer',
    routes: [
      'coach',
      'clients',
      'plans',
      'messages',
      'notifications',
      'settings',
      'studio',
    ],
  },
] as const;

for (const workspace of workspaces) {
  test(`${workspace.role} workspace routes render without browser exceptions`, async ({
    page,
  }, testInfo) => {
    const failures: string[] = [];
    const nonlocalRequests: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        ['http:', 'https:'].includes(url.protocol) &&
        !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      )
        nonlocalRequests.push(`${url.origin}${url.pathname}`);
    });
    const previewDirectory = resolve(process.cwd(), 'docs/web-preview');
    await mkdir(previewDirectory, { recursive: true });
    if (workspace.role === 'member') {
      await page.goto('/');
      await expect(
        page.getByRole('button', { name: 'Sign in', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: resolve(previewDirectory, 'sign-in.png'),
        fullPage: true,
      });
    }
    await signIn(page, {
      email: `${workspace.role}@aigym.local`,
      password: 'TrainToday!2026',
    });
    const screenshot = testInfo.outputPath(`${workspace.role}-dashboard.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach(`${workspace.role} dashboard`, {
      path: screenshot,
      contentType: 'image/png',
    });
    await page.screenshot({
      path: resolve(previewDirectory, `${workspace.role}.png`),
      fullPage: true,
    });
    if (workspace.role === 'member') {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.getByRole('button', { name: 'Open navigation', exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: resolve(previewDirectory, 'member-mobile.png'),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    for (const route of workspace.routes) {
      await page.goto(`/#${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main')).not.toContainText(
        /something went wrong|uncaught exception/i,
      );
    }
    expect(failures).toEqual([]);
    expect(
      nonlocalRequests,
      'Local preview must not contact hosted services',
    ).toEqual([]);
  });
}
