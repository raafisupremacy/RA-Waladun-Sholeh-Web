import { test, expect } from 'playwright/test';
import { validateE2eEnvironment } from './run.mjs';

test('E2E-SAFETY rejects MySQL', () => {
    expect(() => validateE2eEnvironment('DB_CONNECTION=mysql\nDB_DATABASE=skms')).toThrow(/E2E safety check failed/);
});

test('E2E-SAFETY rejects a non-e2e SQLite filename', () => {
    expect(() => validateE2eEnvironment('DB_CONNECTION=sqlite\nDB_DATABASE=database/skms.sqlite')).toThrow(/E2E safety check failed/);
});

test('E2E-SAFETY accepts only the e2e SQLite filename', () => {
    expect(validateE2eEnvironment('DB_CONNECTION=sqlite\nDB_DATABASE=database/e2e.sqlite').DB_DATABASE).toBe('database/e2e.sqlite');
});
