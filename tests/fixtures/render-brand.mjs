// Render the real components with supplied Inertia props; no browser or database.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, 'tests/fixtures/generated-brand');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'inertia.mjs'), `
    import { createElement } from 'react';
    export const usePage = () => ({ props: JSON.parse(process.argv[3]) });
    export const Link = ({ children, ...props }) => createElement('a', props, children);
`);
for (const [name, source] of [['BrandMark', 'Components/BrandMark'], ['GuestLayout', 'Layouts/GuestLayout']]) {
    const { outputText } = ts.transpileModule(readFileSync(resolve(root, `resources/js/${source}.tsx`), 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    });
    writeFileSync(resolve(output, `${name}.mjs`), outputText
        .replaceAll("'@inertiajs/react'", "'./inertia.mjs'")
        .replaceAll("'@/Components/BrandMark'", "'./BrandMark.mjs'"));
}
try {
    const { default: Component } = await import(pathToFileURL(resolve(output, `${process.argv[2]}.mjs`)).href);
    const props = JSON.parse(process.argv[3]);
    process.stdout.write(renderToStaticMarkup(createElement(Component, process.argv[2] === 'BrandMark' ? props : { showFooter: true })));
} finally {
    for (const file of ['inertia.mjs', 'BrandMark.mjs', 'GuestLayout.mjs']) rmSync(resolve(output, file));
}
