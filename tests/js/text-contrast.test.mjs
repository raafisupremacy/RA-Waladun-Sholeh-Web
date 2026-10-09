// Run with: node --test tests/js
// DESIGN.md: --text-3 (#86868B) is for tertiary use and placeholders only; informative
// text must use --text-2 (#6E6E73) or darker to keep 4.5:1 contrast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(join(root, 'resources/css/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('no text color uses #86868B outside placeholders', () => {
    const offenders = [];
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/(^|[;\s])color\s*:\s*(var\(--text-3\)|#86868b)/i.test(body)) continue;
        if (/::placeholder/.test(selector)) continue;
        offenders.push(selector.trim());
    }
    assert.deepEqual(offenders, [], `informative text uses #86868B: ${offenders.join(', ')}`);
});
