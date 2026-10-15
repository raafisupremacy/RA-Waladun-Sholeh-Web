import { expect, Page } from 'playwright/test';

export type Role = 'admin' | 'guru' | 'kepsek' | 'ortu';
const home: Record<Role, string> = { admin: '/admin', guru: '/guru', kepsek: '/kepsek', ortu: '/ortu' };

export async function login(page: Page, role: Role) {
    const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
    const password = process.env.E2E_PASSWORD;
    if (!email || !password) throw new Error(`Missing E2E credentials for ${role}`);
    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await Promise.all([page.waitForURL(url => url.pathname === home[role]), page.getByRole('button', { name: 'Masuk', exact: true }).click()]);
    await expect(page).toHaveURL(new RegExp(`${home[role]}$`));
}

export { home };
