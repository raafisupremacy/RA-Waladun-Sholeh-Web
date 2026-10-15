import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateE2eEnvironment(content) {
    const values = Object.fromEntries(content.split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
    }));
    if (values.DB_CONNECTION !== 'sqlite' || !values.DB_DATABASE?.toLowerCase().endsWith('e2e.sqlite') || values.DB_DATABASE.toLowerCase().includes('skms')) {
        throw new Error('E2E safety check failed: DB_CONNECTION must be sqlite and DB_DATABASE must end with e2e.sqlite, never skms.');
    }
    return values;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const root = resolve(import.meta.dirname, '..');
    const envPath = resolve(root, '.env.e2e');
    const values = validateE2eEnvironment(readFileSync(envPath, 'utf8'));
    const dbPath = resolve(root, values.DB_DATABASE);
    mkdirSync(resolve(root, 'database'), { recursive: true });
    if (!existsSync(dbPath)) { const { closeSync, openSync } = await import('node:fs'); closeSync(openSync(dbPath, 'a')); }
    const env = { ...process.env, ...values, APP_ENV: 'e2e', DB_CONNECTION: 'sqlite', DB_DATABASE: dbPath, PLAYWRIGHT_BROWSERS_PATH: resolve(root, 'node_modules/.cache/ms-playwright') };
    const run = (command, args) => new Promise((resolveRun, reject) => { const executable = process.platform === 'win32' && command === 'npx' ? 'npx.cmd' : command; const child = spawn(executable, args, { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' }); child.on('error', reject); child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`${command} exited ${code}`))); });
    let server;
    try {
        await run('php', ['artisan', 'migrate:fresh', '--seed', '--env=e2e']);
        server = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8100'], { cwd: root, env, stdio: 'inherit', shell: false });
        await new Promise(resolveReady => setTimeout(resolveReady, 2000));
        await run('npx', ['playwright', 'test']);
    } finally {
        server?.kill();
    }
}
