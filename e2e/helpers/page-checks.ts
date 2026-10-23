import { expect, Page } from 'playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function checkPage(page: Page, role: string, name: string) {
    const consoleErrors: string[] = [];
    const handler = (message: { type(): string; text(): string }) => { if (message.type() === 'error') consoleErrors.push(message.text()); };
    page.on('console', handler);
    const response = await page.waitForLoadState('networkidle').then(() => page.url());
    expect(response).toBeTruthy();
    expect(consoleErrors, 'console errors').toEqual([]);
    const body = await page.locator('body').innerText();
    for (const forbidden of ['[ISI', 'Internal Server Error', 'CSRF token mismatch', 'Page Expired', 'tatausaha@', 'Lorem', 'undefined', 'NaN']) expect(body).not.toContain(forbidden);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious, `Accessibility serious/critical violations on ${page.url()}`).toEqual([]);
    const width = page.viewportSize()?.width ?? 0;
    const output = resolve('e2e-results', 'screens', role, `${name}-${width}.png`);
    await mkdir(resolve('e2e-results', 'screens', role), { recursive: true });
    await page.screenshot({ path: output, fullPage: true });
    page.off('console', handler);
}
