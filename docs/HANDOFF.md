# Handoff SKMS

Diperbarui 15 Oktober 2026 (Asia/Jakarta). Catatan ini berdasarkan kode dan verifikasi aktual. Semua perubahan tetap lokal dan belum di-commit. Keputusan pemilik D1–D7 ada di `docs/DECISIONS.md`.

## Status audit terkini

Run penuh terbaru: **216 kasus, 216 lulus, 0 gagal, 0 dilewati, 3.002 assertion**. Rincian bukti ada di [docs/TEST-AUDIT.md](TEST-AUDIT.md).

| Batch | Status | Bukti utama |
|---|---|---|
| Batch 1 Integritas data/RBAC | Sebagian | Alur dasar lulus; alur disk dan regresi guru pengganti lulus; konkurensi MySQL masih terbuka. |
| Batch 2 Fondasi visual | Sebagian | Komponen/token, identitas dinamis, lint/build, dan tes JS lulus; browser visual dan E2E belum seluruhnya terbukti. |
| Batch 3A Keuangan admin | Sebagian | SPP, payment, ledger, receipt, ekspor, search, dan kegagalan disk teruji; MySQL/browser workflow belum diuji. |
| Batch 3B Keuangan orang tua | Selesai secara feature test | `ParentInvoiceUiTest` lulus untuk scope anak, empat state, upload, private proof, receipt, dan RBAC; E2E browser belum diuji. |
| Batch 3C Guru/perkembangan | Selesai | `JournalFlowTest` dan `JournalRbacAuditCoverageTest` lulus, termasuk membership aktif dan penggantian wali. |
| Batch 3D Dashboard/laporan | Sebagian | SQLite feature test lulus; verifikasi query agregasi dan lock pada MySQL `skms_test` masih terbuka. |
| Batch 3E Master/pengumuman/profil | Sebagian | Feature test lulus; verifikasi MySQL/E2E masih terbuka. |
| Batch 4 QA | Sebagian | Pint, lint, build, dan tes JS lulus; E2E penuh, visual browser, accessibility runtime, dan state semua layar belum terbukti. |

## Fitur yang tersedia

- Laravel 11, React/TypeScript/Inertia, Tailwind, Inter, komponen desain, empat layout role, dan Playwright runner.
- Migration, backed enum, model, factory, role/seeder, invoice/payment state machine, ledger atomik, receipt KWT/YYYY/MM/NNN, jurnal/anekdot, master data, pengumuman, dashboard, laporan PDF/Excel, audit log, dan private file routes.
- ParentStudentContext membatasi anak orang tua; Student::visibleTo dan service/controller membatasi kelas aktif guru pada jalur tertentu.
- /profile Breeze dihapus; /styleguide hanya local; school settings dibagikan melalui HandleInertiaRequests; upload bukti memakai disk privat.
- Seeder lokal/testing memiliki 4 kelas A-1, A-2, B-1, B-2 dengan distribusi 20/19/20/19 dan akun demo. Kata sandi tidak ditulis di dokumen.

## Temuan terbuka yang terkonfirmasi

- Audit identitas publik lulus; verifikasi pixel/browser dan E2E tetap belum dijalankan.
- SQLite belum membuktikan kompatibilitas query agregasi dengan ONLY_FULL_GROUP_BY MySQL.
- MySQL `skms_test` perlu menjalankan query laporan dengan ONLY_FULL_GROUP_BY sebelum Batch 3D/3E ditandai selesai.
- Payment proof kini menghapus berkas saat transaksi gagal dan mengembalikan galat validasi Bahasa Indonesia.
- D7: unggahan bukti wajib menyertakan nominal transfer rupiah dan tanggal transfer yang tidak boleh di masa depan; nama pengirim default ke nama profil wali dan verifikasi menyimpan nominal aktual untuk menampilkan kesesuaian atau selisih.
- ProgressSteps, logo/foto, dan token visual tersedia, tetapi render browser, font audit log kecil, kontras runtime, focus/tap target, dan pixel comparison belum diverifikasi menyeluruh.

## Verifikasi terakhir

- php artisan test --no-ansi: **216 passed, 0 failed, 0 skipped, 3.002 assertions**.
- ./vendor/bin/pint --test: lulus.
- npm run test:js: **6 passed, 0 failed**.
- npm run lint: lulus (TypeScript + ESLint).
- npm run build: lulus (Vite 6.4.3, 3515 modul); proses membutuhkan izin sandbox untuk membaca konfigurasi Vite.
- npm run e2e: tidak dijalankan. Runner saat ini melakukan reset database/e2e.sqlite dan mengandalkan seeder file SQLite; audit ini membatasi tes ke SQLite in-memory atau database MySQL skms_test.

## Keputusan dan batasan penting

- Controller tipis, business logic di app/Services, props Inertia eksplisit/resource.
- Uang integer rupiah; invoice lunas final; approve/reject memakai transaksi dan lock; receipt unik.
- Tes default memakai SQLite :memory:. phpunit.mysql.xml dan composer test:mysql memakai database terpisah persis skms_test; belum ada MySQL di PATH dan database belum dijalankan.
- SQLite tidak membuktikan ONLY_FULL_GROUP_BY, lock antarproses, deadlock, cache lock bersama, collation/wildcard MySQL, atau perilaku DATE MySQL. Worker paralel dan E2E payment penuh belum ada.
- Keputusan (lihat `docs/DECISIONS.md`): D1 guru pendamping dan pelepasan wali lama; D2 status tunggakan; D3 kalender dan penyebut jurnal; D4 tren enrollment; D5 shared props identitas publik versus rekening privat. Dokumen tersebut mencatat dampak kode/tes dan fixture tes yang telah diselaraskan dengan D2/D3.
- D6: keterisian jurnal dilaporkan per kelas, menghitung semua penulis final yang cocok dengan roster aktif dan label wali kelas aktif.

## Versi dan perintah

Terverifikasi: PHP 8.2.12 (XAMPP), Composer 2.10.2, Node.js 24.18.0, npm 11.16.0. mysql --version tidak tersedia di PATH.

- Database demo skms: jangan reset, migrate:fresh, db:wipe, atau seeder dari agent.
- Tes default: php artisan test menggunakan SQLite in-memory.
- Tes MySQL: pemilik dapat membuat skms_test dengan CREATE DATABASE skms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;, lalu menjalankan composer test:mysql.
- Dev: composer install, npm install, php artisan serve, dan npm run dev.
- Verifikasi: php artisan test, ./vendor/bin/pint --test, npm run lint, npm run build.
- Screenshot existing: npm run shots saat server lokal siap; jangan mengirim kredensial ke host lain.

Akun demo yang dibuat seeder lokal/testing mencakup admin@skms.test, guru@skms.test, kepsek@skms.test, dan ortu@skms.test; kata sandi tidak dicantumkan.

## Langkah berikutnya

1. Terapkan D1–D5 dari `docs/DECISIONS.md` tanpa mengubah atau melonggarkan tes.
2. Lakukan validasi visual browser dan E2E.
3. Siapkan MySQL skms_test, worker concurrency, dan E2E workflow sesuai aturan keselamatan.

- Master data admin kini mendukung ubah guru/orang tua, aktivasi/nonaktivasi akun, pelepasan guru nonaktif dari kelas, dan halaman detail siswa; seluruh jalur diuji di MasterDataTest.
- Disk local tidak lagi di-serve oleh Laravel; private tidak memiliki URL/serve dan StorageExposureTest memverifikasi /storage tidak membuka bukti.

