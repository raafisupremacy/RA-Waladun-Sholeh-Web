import { test, expect, Page } from 'playwright/test';
import { login } from './helpers/auth';

test.describe('E2E-BUSINESS alur inti', () => {
    test.skip(({ page }) => page.viewportSize()?.width !== 1440, 'Alur mutasi dijalankan serial pada desktop');
    test.setTimeout(180_000);

    let invoiceHref = '';
    const proof = {
        name: 'bukti-transfer.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    };

    async function waitForPost(page: Page, path: string, action: () => Promise<void>) {
        const [response] = await Promise.all([
            page.waitForResponse(response => response.url().includes(path) && ['POST', 'PUT'].includes(response.request().method())),
            action(),
        ]);
        expect(response.status(), response.status() >= 400 ? `${path}: ${await response.text()}` : path).toBeLessThan(400);
        await page.waitForLoadState('networkidle');
    }

    async function switchRole(page: Page, role: 'admin' | 'guru' | 'kepsek' | 'ortu') {
        const userMenu = page.getByRole('button', { name: /Menu pengguna/ });
        if (await userMenu.count()) {
            await userMenu.click();
            await Promise.all([
                page.waitForURL(url => url.pathname === '/login'),
                page.getByRole('menuitem', { name: 'Keluar', exact: true }).click(),
            ]);
        }
        await login(page, role);
    }

    test('admin membuat tagihan untuk periode baru', async ({ page }) => {
        await switchRole(page, 'admin');
        await page.goto('/admin/tagihan', { waitUntil: 'networkidle' });
        const monthSelect = page.locator('.invoice-generator [aria-haspopup="listbox"]').first();
        await monthSelect.click();
        await page.getByRole('option', { name: 'November', exact: true }).click();
        await page.locator('.invoice-generator input[type="date"]').fill('2026-11-10');
        await page.getByRole('button', { name: 'Generate untuk semua siswa aktif' }).click();
        await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeVisible();
        await waitForPost(page, '/admin/tagihan/generate', () => page.getByRole('button', { name: 'Generate', exact: true }).click());
        await expect(page.locator('[role="status"]').filter({ hasText: /tagihan dibuat/i }).first()).toBeVisible();
    });

    test('orang tua unggah, admin tolak, unggah ulang, lalu setujui bukti', async ({ page }) => {
        await switchRole(page, 'ortu');
        await page.goto('/ortu/tagihan', { waitUntil: 'networkidle' });
        const hrefs = await page.locator('a[href^="/ortu/tagihan/"]').evaluateAll(links => links
            .map(link => link.getAttribute('href') ?? '')
            .filter(href => /^\/ortu\/tagihan\/\d+$/.test(href)));
        expect(hrefs.length).toBeGreaterThan(0);
        invoiceHref = hrefs[0];
        await page.goto(invoiceHref, { waitUntil: 'networkidle' });
        await page.locator('input[type="file"]').setInputFiles(proof);
        await page.locator('input[type="number"]').fill('350000');
        await page.locator('input[type="date"]').fill('2026-10-01');
        await waitForPost(page, '/bukti', () => page.getByRole('button', { name: 'Kirim bukti', exact: true }).click());
        await expect(page.getByText(/Bukti sudah diterima|Sedang diperiksa sekolah/i)).toBeVisible();

        await switchRole(page, 'admin');
        await page.goto('/admin/verifikasi?search=Aisyah', { waitUntil: 'networkidle' });
        const paymentHref = await page.locator('a[href*="/admin/verifikasi?payment="]').first().getAttribute('href');
        expect(paymentHref).toBeTruthy();
        await page.goto(paymentHref!, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Tolak', exact: true }).click();
        await page.getByLabel('Alasan penolakan').fill('Bukti perlu dikonfirmasi ulang.');
        await waitForPost(page, '/tolak', () => page.getByRole('button', { name: 'Tolak pembayaran', exact: true }).click());

        await switchRole(page, 'ortu');
        await page.goto(invoiceHref, { waitUntil: 'networkidle' });
        await expect(page.getByText(/Bukti pembayaran ditolak|perlu dikonfirmasi ulang/i)).toBeVisible();
        await page.locator('input[type="file"]').setInputFiles(proof);
        await page.locator('input[type="number"]').fill('350000');
        await page.locator('input[type="date"]').fill('2026-10-02');
        await waitForPost(page, '/bukti', () => page.getByRole('button', { name: 'Unggah ulang', exact: true }).click());

        await switchRole(page, 'admin');
        await page.goto('/admin/verifikasi?search=Aisyah', { waitUntil: 'networkidle' });
        await page.locator('a[href*="/admin/verifikasi?payment="]').first().click();
        await waitForPost(page, '/setujui', () => page.getByRole('button', { name: /Setujui \(tandai lunas\)/ }).click());

        await switchRole(page, 'ortu');
        await page.goto(invoiceHref, { waitUntil: 'networkidle' });
        await expect(page.locator('span.status-lunas')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Unduh bukti pembayaran', exact: true })).toBeVisible();
    });

    test('admin menerbitkan pengumuman dan orang tua melihatnya', async ({ page }) => {
        const title = `Uji browser ${Date.now()}`;
        await switchRole(page, 'admin');
        await page.goto('/admin/pengumuman/create', { waitUntil: 'networkidle' });
        await page.locator('#title').fill(title);
        await page.locator('#body').fill('Pengumuman hasil pengujian browser.');
        await waitForPost(page, '/admin/pengumuman', () => page.getByRole('button', { name: 'Terbitkan', exact: true }).click());
        await switchRole(page, 'ortu');
        await page.goto('/ortu', { waitUntil: 'networkidle' });
        await expect(page.getByText(title, { exact: true })).toBeVisible();
    });

    test('guru menyimpan dan memfinalisasi jurnal lima aspek', async ({ page }) => {
        await switchRole(page, 'guru');
        await page.goto('/guru/jurnal', { waitUntil: 'networkidle' });
        await page.getByRole('link', { name: 'Isi Jurnal Hari Ini', exact: true }).click();
        await page.locator('#activity-summary').fill('Kegiatan pengujian jurnal browser.');
        await page.getByRole('button', { name: 'Simpan jurnal', exact: true }).click();
        await expect(page.getByText('Mohon lengkapi penilaian wajib', { exact: true })).toBeVisible();
        const levels = page.getByRole('tab', { name: 'BSH', exact: true });
        await expect(levels).toHaveCount(5);
        for (const tab of await levels.all()) await tab.click();
        await waitForPost(page, '/guru/jurnal', () => page.getByRole('button', { name: 'Simpan draf', exact: true }).click());
        await expect(page.getByText(/Tersimpan otomatis/i)).toBeVisible();
        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.locator('#activity-summary')).toHaveValue('Kegiatan pengujian jurnal browser.');
        await expect(page.getByRole('tab', { name: 'BSH', exact: true, selected: true })).toHaveCount(5);
        await waitForPost(page, '/final', () => page.getByRole('button', { name: 'Simpan jurnal', exact: true }).click());
        await expect(page).toHaveURL(/\/guru$/);
    });

    test('guru membuat catatan anekdot', async ({ page }) => {
        await switchRole(page, 'guru');
        await page.goto('/guru/anekdot', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /Tambah Catatan|Tambah catatan/ }).first().click();
        await page.locator('#observed-behavior').fill('Anak mengikuti kegiatan dengan tertib.');
        await page.locator('#interpretation').fill('Perkembangan sosial emosional sesuai harapan.');
        await page.locator('#follow-up').fill('Lanjutkan penguatan kebiasaan positif.');
        await waitForPost(page, '/guru/anekdot', () => page.getByRole('button', { name: 'Simpan', exact: true }).click());
        await expect(page.getByText('Anak mengikuti kegiatan dengan tertib.', { exact: true })).toBeVisible();
    });

    test('kepala sekolah mengunduh laporan PDF dan Excel', async ({ page }) => {
        await switchRole(page, 'kepsek');
        await page.goto('/kepsek/laporan-keuangan', { waitUntil: 'networkidle' });
        const excel = page.getByRole('link', { name: /Excel|XLS/i }).first();
        const pdf = page.getByRole('link', { name: /PDF/i }).first();
        const [excelDownload] = await Promise.all([page.waitForEvent('download'), excel.click()]);
        expect(excelDownload.suggestedFilename()).toMatch(/\.xlsx$/i);
        const [pdfDownload] = await Promise.all([page.waitForEvent('download'), pdf.click()]);
        expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/i);
    });
});
