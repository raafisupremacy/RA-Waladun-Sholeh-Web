import { test, expect, Page } from 'playwright/test';
import { login } from './helpers/auth';

test.describe.configure({ mode: 'serial' });
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
            page.waitForResponse(response => response.url().includes(path) && ['POST', 'PUT', 'PATCH'].includes(response.request().method())),
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
        const receipt = page.getByRole('link', { name: 'Unduh bukti pembayaran', exact: true });
        await expect(receipt).toBeVisible();
        const [receiptDownload] = await Promise.all([page.waitForEvent('download'), receipt.click()]);
        expect(receiptDownload.suggestedFilename()).toMatch(/\.pdf$/i);
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
        await page.locator('#photo-file').setInputFiles({ name: 'observasi.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
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

    test('semua halaman baca utama dapat dibuka oleh role yang berwenang', async ({ page }) => {
        const routes: Array<['admin' | 'guru' | 'kepsek' | 'ortu', string[]]> = [
            ['admin', ['/admin', '/admin/siswa', '/admin/orang-tua', '/admin/guru', '/admin/kelas', '/admin/tagihan', '/admin/verifikasi', '/admin/buku-kas', '/admin/pengumuman', '/admin/laporan', '/admin/audit-log']],
            ['guru', ['/guru', '/guru/jurnal', '/guru/riwayat', '/guru/anekdot']],
            ['kepsek', ['/kepsek', '/kepsek/laporan-keuangan', '/kepsek/laporan-evaluasi']],
            ['ortu', ['/ortu', '/ortu/tagihan', '/ortu/perkembangan', '/ortu/profil']],
        ];
        for (const [role, paths] of routes) {
            await switchRole(page, role);
            for (const path of paths) {
                const response = await page.goto(path, { waitUntil: 'networkidle' });
                expect(response?.status(), `${role} ${path}`).toBeLessThan(400);
                await expect(page.locator('body')).not.toContainText(/Internal Server Error|CSRF token mismatch|Page Expired|undefined|NaN/);
            }
        }
    });

    test('orang tua mengganti anak dan mengunduh laporan perkembangan', async ({ page }) => {
        await switchRole(page, 'ortu');
        await page.goto('/ortu/perkembangan', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Pilih profil anak', exact: true }).click();
        const children = page.locator('.child-option-card');
        await expect(children).toHaveCount(2);
        await children.nth(1).click();
        await expect(page).toHaveURL(/student_id=/);
        const report = page.getByRole('link', { name: 'Unduh laporan', exact: true });
        const [download] = await Promise.all([page.waitForEvent('download'), report.click()]);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    });

    test('admin dapat mengekspor buku kas', async ({ page }) => {
        await switchRole(page, 'admin');
        await page.goto('/admin/buku-kas', { waitUntil: 'networkidle' });
        const [excel] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Export Excel', exact: true }).click()]);
        expect(excel.suggestedFilename()).toMatch(/\.xlsx$/i);
        const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Export PDF', exact: true }).click()]);
        expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
    });

    test('kepala sekolah mengekspor laporan evaluasi siswa', async ({ page }) => {
        await switchRole(page, 'kepsek');
        await page.goto('/kepsek/laporan-evaluasi', { waitUntil: 'networkidle' });
        const selects = page.locator('main [aria-haspopup="listbox"]');
        await selects.nth(0).click();
        await page.getByRole('option').first().click();
        await selects.nth(1).click();
        await page.getByRole('option').first().click();
        const exportPdf = page.getByRole('link', { name: 'Export PDF', exact: true });
        await expect(exportPdf).toBeVisible();
        const [download] = await Promise.all([page.waitForEvent('download'), exportPdf.click()]);
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    });

    test('admin menyimpan pengumuman sebagai draf', async ({ page }) => {
        await switchRole(page, 'admin');
        await page.goto('/admin/pengumuman/create', { waitUntil: 'networkidle' });
        await page.locator('#title').fill(`Draf browser ${Date.now()}`);
        await page.locator('#body').fill('Isi draf pengujian browser.');
        await waitForPost(page, '/admin/pengumuman', () => page.getByRole('button', { name: 'Simpan draf', exact: true }).click());
        await expect(page).toHaveURL(/\/admin\/pengumuman$/);
    });

    test('admin mengubah nominal invoice yang belum lunas', async ({ page }) => {
        await switchRole(page, 'admin');
        await page.goto('/admin/tagihan', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Ubah nominal', exact: true }).first().click();
        const amount = page.locator('input[type="number"]').last();
        await amount.fill('340000');
        await waitForPost(page, '/nominal', () => page.getByRole('button', { name: 'Simpan Perubahan', exact: true }).click());
        await expect(page.getByText('Rp 340.000', { exact: true })).toBeVisible();
    });

    test('admin reset akun wali dan menonaktifkan siswa', async ({ page }) => {
        await switchRole(page, 'admin');
        await page.goto('/admin/orang-tua', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /Reset kata sandi/ }).first().click();
        await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
        await waitForPost(page, '/reset-kata-sandi', () => page.getByRole('button', { name: 'Reset', exact: true }).click());
        await page.goto('/admin/siswa', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Menu tindakan' }).first().click();
        await page.getByRole('button', { name: 'Nonaktifkan', exact: true }).click();
        await waitForPost(page, '/nonaktifkan', () => page.getByRole('button', { name: 'Nonaktifkan', exact: true }).last().click());
        await expect(page.getByText('Siswa dinonaktifkan. Riwayat tetap tersimpan.', { exact: true })).toBeVisible();
    });

    test('orang tua memvalidasi file PDF, file invalid, dan tanggal transfer masa depan', async ({ page }) => {
        await switchRole(page, 'ortu');
        await page.goto('/ortu/tagihan', { waitUntil: 'networkidle' });
        const hrefs = await page.locator('a[href^="/ortu/tagihan/"]').evaluateAll(links => links.map(link => link.getAttribute('href') ?? '').filter(href => /^\/ortu\/tagihan\/\d+$/.test(href)));
        let uploadHref = '';
        for (const href of hrefs) {
            await page.goto(href, { waitUntil: 'networkidle' });
            if (await page.locator('input[type="file"]').count()) { uploadHref = href; break; }
        }
        expect(uploadHref).toBeTruthy();
        const upload = page.locator('input[type="file"]');
        await upload.setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
        await expect(page.getByText('Pilih file JPG, PNG, atau PDF.', { exact: true })).toBeVisible();
        await upload.setInputFiles({ name: 'bukti.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
        await page.locator('input[type="number"]').fill('350000');
        const transferDate = page.locator('input[type="date"]');
        await transferDate.fill('2999-01-01');
        await expect(transferDate).toHaveAttribute('max', /\d{4}-\d{2}-\d{2}/);
        await transferDate.fill('2026-10-01');
        await waitForPost(page, '/bukti', () => page.getByRole('button', { name: /Kirim bukti|Unggah ulang/ }).click());
        await expect(page.getByText(/Bukti sudah diterima|Sedang diperiksa sekolah/i)).toBeVisible();
    });
});
