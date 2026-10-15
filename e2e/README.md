# E2E smoke infrastructure

Jalankan `npm run e2e`. Skrip memvalidasi `.env.e2e`, membuat/reset hanya `database/e2e.sqlite`, menjalankan seeder pada environment `e2e`, menyalakan Laravel di port 8100, lalu menjalankan Playwright.

Struktur utama: `playwright.config.ts`, `e2e/run.mjs`, `e2e/helpers/auth.ts`, `e2e/helpers/page-checks.ts`, dan `e2e/smoke.spec.ts`. Tiga project viewport tersedia: 390, 834, dan 1440 px. Screenshot, trace, database SQLite, dan laporan berada di folder yang di-ignore.

Tambahkan skenario baru di `e2e/` dan gunakan `checkPage` pada setiap kunjungan halaman. Lihat laporan dengan `npx playwright show-report e2e-results/report`.

Suite ini hanya memakai SQLite E2E. Suite tidak boleh membuka koneksi MySQL `skms`.
