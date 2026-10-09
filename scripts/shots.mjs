import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Use the project-local browser when installed; otherwise use Playwright's default cache.
const browserCache = resolve('node_modules/.cache/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    try {
        await access(browserCache);
        process.env.PLAYWRIGHT_BROWSERS_PATH = browserCache;
    } catch { /* Default Playwright cache is also supported. */ }
}
const { chromium } = await import('playwright');
const baseURL = process.env.SHOTS_BASE_URL || 'http://127.0.0.1:8000';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
    throw new Error('SHOTS_BASE_URL must point to a local server; demo credentials must stay local.');
}
if (process.argv.includes('--help')) {
    console.log('Start Laravel and build assets, then run npm run shots.\nOptional: SHOTS_BASE_URL, SHOTS_PASSWORD, SHOTS_<ROLE>_EMAIL/PASSWORD.\nOutput: storage/app/shots/<role>/<width>/*.png and results.json.');
    process.exit(0);
}

const widths = [1440, 834, 390];
const output = resolve('storage/app/shots');
const roles = {
    admin: ['/admin', '/admin/siswa', '/admin/siswa/create', '/admin/orang-tua', '/admin/guru', '/admin/kelas', '/admin/tagihan', '/admin/verifikasi', '/admin/buku-kas', '/admin/pengumuman', '/admin/pengumuman/create', '/admin/laporan'],
    guru: ['/guru', '/guru/jurnal', '/guru/anekdot', '/guru/riwayat'],
    kepsek: ['/kepsek', '/kepsek/laporan-keuangan', '/kepsek/laporan-evaluasi'],
    ortu: ['/ortu', '/ortu/tagihan', '/ortu/perkembangan', '/ortu/profil'],
};
const results = [];
let browser;
await mkdir(output, { recursive: true });

async function capture(page, role, path) {
    const item = { role, path, screenshots: [], errors: [] };
    results.push(item);
    const onError = error => item.errors.push(error.message);
    page.on('pageerror', onError);
    let props = {};
    try {
        const response = await page.goto(path, { waitUntil: 'networkidle' });
        if (!response?.ok()) item.errors.push(`HTTP ${response?.status() ?? 'no response'}`);
        const expectedPath = path === '/' && role === 'guest' ? '/login' : new URL(path, baseURL).pathname;
        if (role !== 'ortu-fixtures' && new URL(page.url()).pathname !== expectedPath) {
            item.errors.push(`Unexpected redirect to ${new URL(page.url()).pathname}`);
        }
        const data = await page.locator('#app').getAttribute('data-page', { timeout: 5000 });
        props = JSON.parse(data || '{}').props || {};
        try {
            await page.locator('#app > *').first().waitFor({ timeout: 10000 });
        } catch {
            item.errors.push('React did not render visible content; screenshots record the broken page.');
        }
        for (const width of widths) {
            await page.setViewportSize({ width, height: 1000 });
            await page.evaluate(() => document.fonts.ready);
            // Allow responsive charts and transitions to settle after resizing.
            await page.waitForTimeout(300);
            const directory = resolve(output, role, String(width));
            await mkdir(directory, { recursive: true });
            const name = path.replace(/[^a-z0-9-]/gi, '_').replace(/^_+/, '') || 'root';
            const file = resolve(directory, `${name}.png`);
            await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
            item.screenshots.push(file);
        }
    } catch (error) {
        item.errors.push(error.message);
    } finally {
        page.off('pageerror', onError);
        console.log(`${item.errors.length ? 'FAIL' : 'OK'} ${role} ${path}`);
    }
    return props;
}

try {
    browser = await chromium.launch();
    const guest = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const publicPage = await guest.newPage();
    publicPage.setDefaultTimeout(15000);
    for (const path of ['/', '/login', '/forgot-password']) {
        await capture(publicPage, 'guest', path);
    }
    await guest.close();

    for (const [role, paths] of Object.entries(roles)) {
        const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        try {
            await page.goto('/login', { waitUntil: 'networkidle' });
            await page.locator('#email').fill(process.env[`SHOTS_${role.toUpperCase()}_EMAIL`] || `${role}@skms.test`);
            await page.locator('#password').fill(process.env[`SHOTS_${role.toUpperCase()}_PASSWORD`] || process.env.SHOTS_PASSWORD || 'password');
            await Promise.all([
                page.waitForURL(url => url.pathname === paths[0]),
                page.getByRole('button', { name: 'Masuk', exact: true }).click(),
            ]);
            const extra = new Set();
            for (const path of paths) {
                const props = await capture(page, role, path);
                // Use only IDs returned to the logged-in role; never guess record IDs.
                if (path === '/ortu/tagihan') {
                    const seen = new Set();
                    for (const invoice of props.invoices?.data || []) {
                        if (!seen.has(invoice.status)) extra.add(`/ortu/tagihan/${invoice.id}`);
                        seen.add(invoice.status);
                    }
                }
                if (path === '/guru/jurnal' && props.journals?.data?.[0]) {
                    const studentId = props.journals.data[0].student?.id;
                    if (studentId) extra.add(`/guru/jurnal/${studentId}`);
                }
                if (path === '/admin/pengumuman' && props.announcements?.data?.[0]) {
                    extra.add(`/admin/pengumuman/${props.announcements.data[0].id}/edit`);
                }
                if (path === '/kepsek/laporan-evaluasi' && props.students?.[0] && props.academicYearId) {
                    extra.add(`/kepsek/laporan-evaluasi?student_id=${props.students[0].id}&academic_year_id=${props.academicYearId}`);
                }
            }
            if (role === 'ortu' && process.env.SHOTS_PARENT_FIXTURES === '1') {
                const shell = await (await context.request.get('/ortu')).text();
                // Preview files are synthetic, matching the SQLite test payload only.
                await page.route('**/ortu/pembayaran/*/bukti?preview=1', route => route.fulfill({status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#F5F5F7"/><text x="20" y="100">Bukti transfer data uji</text></svg>'}));
                for (const state of ['belum_bayar', 'menunggu_verifikasi', 'ditolak', 'lunas']) {
                    const fixture = await readFile(resolve(output, 'fixtures', state + '.html'), 'utf8');
                    const payload = fixture.match(/data-page="([^"]*)"/)[0];
                    const html = shell.replace(/data-page="[^"]*"/, () => payload);
                    const path = '/ortu/tagihan/fixture-' + state;
                    await page.route('**' + path, route => route.fulfill({status: 200, contentType: 'text/html', body: html}));
                    await capture(page, 'ortu-fixtures', path);
                    await page.unroute('**' + path);
                }
                await page.unroute('**/ortu/pembayaran/*/bukti?preview=1');
            }
            for (const path of [...extra, '/ganti-kata-sandi']) {
                await capture(page, role, path);
            }
        } catch (error) {
            results.push({ role, path: '/login', screenshots: [], errors: [error.message] });
            console.error(`FAIL login ${role}: ${error.message}`);
        } finally {
            await context.close();
        }
    }
} catch (error) {
    results.push({ role: 'setup', errors: [error.message], screenshots: [] });
    console.error(error.message);
} finally {
    await browser?.close();
    await writeFile(resolve(output, 'results.json'), JSON.stringify({ baseURL, widths, results }, null, 2));
    const failed = results.filter(result => result.errors.length);
    console.log(`${results.reduce((total, result) => total + result.screenshots.length, 0)} screenshots; ${failed.length} failed pages. See storage/app/shots/results.json.`);
    if (failed.length) process.exitCode = 1;
}
