// Run with: node --test tests/js
// Renders the real ProgressSteps component with react-dom/server. The TSX source is
// transpiled with the project's own TypeScript, so no extra test dependency is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = readFileSync(join(root, 'resources/js/Components/ProgressSteps.tsx'), 'utf8');
const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
// Inside node_modules so bare imports (react, lucide-react) resolve from the project.
const outDir = join(root, 'node_modules/.cache/skms-tests');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'ProgressSteps.mjs');
writeFileSync(outFile, outputText);
const { default: ProgressSteps } = await import(pathToFileURL(outFile).href + '?t=' + Date.now());

const steps = ['Diajukan', 'Verifikasi', 'Selesai'];
const render = (current) => renderToStaticMarkup(createElement(ProgressSteps, { steps, current }));
const items = (html) => [...html.matchAll(/<li([^>]*)>(.*?)<\/li>/g)].map(([, attrs, body]) => ({ attrs, body }));
const marker = (body) => body.match(/<span[^>]*>(.*?)<\/span>/)?.[1] ?? '';

test('markers never render step numbers', () => {
    for (const current of [0, 1, 2]) {
        for (const { body } of items(render(current))) {
            const visibleText = marker(body).replace(/<[^>]*>/g, '');
            assert.doesNotMatch(visibleText, /\d/, `marker contains a number at current=${current}`);
        }
    }
});

test('belum bayar: first step is the current ring, the rest upcoming', () => {
    const [first, second, third] = items(render(0));
    assert.match(first.attrs, /is-current/);
    assert.match(first.attrs, /aria-current="step"/);
    assert.match(second.attrs, /is-upcoming/);
    assert.match(third.attrs, /is-upcoming/);
    assert.doesNotMatch(marker(first.body), /<svg/);
});

test('menunggu verifikasi: first step complete with a check, second is current', () => {
    const [first, second, third] = items(render(1));
    assert.match(first.attrs, /is-complete/);
    assert.match(marker(first.body), /<svg/);
    assert.match(second.attrs, /is-current/);
    assert.match(third.attrs, /is-upcoming/);
});

test('lunas: reaching the final step marks every step complete', () => {
    const html = render(2);
    for (const { attrs, body } of items(html)) {
        assert.match(attrs, /is-complete/);
        assert.match(marker(body), /<svg/);
    }
    assert.doesNotMatch(html, /aria-current/);
});

test('the line between two completed steps is marked as linked', () => {
    const [first, second] = items(render(1));
    assert.doesNotMatch(first.attrs, /is-linked/, 'line towards the current step stays neutral');
    const [a, b] = items(render(2));
    assert.match(a.attrs, /is-linked/);
    assert.match(b.attrs, /is-linked/);
    assert.doesNotMatch(second.attrs, /is-linked/);
});
