import { test } from 'playwright/test';
import { login, home, Role } from './helpers/auth';
import { checkPage } from './helpers/page-checks';

for (const role of ['admin', 'guru', 'kepsek', 'ortu'] as Role[]) {
    test(`E2E-SMOKE ${role} login and home`, async ({ page }) => {
        await login(page, role);
        await checkPage(page, role, home[role].slice(1) || 'home');
    });
}
