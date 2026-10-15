import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    retries: 0,
    reporter: [['list'], ['html', { outputFolder: 'e2e-results/report', open: 'never' }]],
    use: { baseURL: 'http://127.0.0.1:8100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    projects: [
        { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
        { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1000 } } },
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    ],
});
