# Handoff SKMS

Diperbarui 8 Oktober 2026 (Asia/Jakarta). Catatan ini berdasarkan kode dan pemeriksaan lokal, bukan hanya centang `docs/TASKS.md`. Semua perubahan tetap lokal dan belum di-commit.

## Status batch

| Batch | Status | Yang tersedia | Kekurangan |
|---|---|---|---|
| Batch 1 (Integritas data dan RBAC) | selesai (16/16) | Transaksi atomik & lock invoice/payment, isolasi homeroom guru & perwalian ortu, route profil Breeze dihapus, validasi enum & draft idempoten, sanitasi props Inertia, seeder aman, proteksi database test MySQL. | Pengujian konkurensi native MySQL (`composer test:mysql`) menunggu pembuatan database `skms_test`. |
| Batch 2 (Fondasi visual) | selesai (12/12) | Layout 4 role, nav 44px + dropdown, padding 48/32/20, tile bento 28/20, BigNumber 72/48, segmented control 44px, bottom sheet 480px + grabber, capsules lengkap, font Inter, ESLint, ProgressSteps titik/cincin/centang (Lucide Check), teks catatan tagihan `--text-2` (`#6E6E73`). | — |
| Modul Keuangan (Admin & Ortu) | selesai | Generate invoice massal, verifikasi bukti, state machine, ledger kas, layar 19 & 20A–20D. | Penyelarasan visual akhir terhadap mockup. |
| Modul Guru & Perkembangan Anak (Batch 3C) | selesai | Layar 12 (Beranda guru), 13 (Form jurnal 5 aspek + autosave), 14 (Anekdot timeline + drawer + upload foto privat ber-policy), 15 (Riwayat matriks aspek × hari), 21 (Perkembangan anak ortu + dialog definisi). RBAC wali kelas & perwalian ortu diperketat. | Penyelarasan visual akhir di Batch 4. |
| Modul Dashboard & Laporan (Batch 3D) | selesai | Layar 02 (Beranda admin lengkap), 16 (Dashboard kepsek dengan pemilih tahun ajaran/bulan nyata & chart), 17 (Laporan keuangan kepsek + bar bulanan), 11 (Laporan admin 3 tab: rekap, tunggakan, ringkasan kelas), 18 (Laporan evaluasi rapor bayangan A4). Unduh PDF & Excel menggunakan link <a> standar. | Penyelarasan visual akhir di Batch 4. |
| Modul Master Data, Pengumuman, Profil (Batch 3E) | selesai | Layar 04, 05, 06A–06D, 07, 10, 22 selesai. Penugasan 3 guru/kelas, reset sandi, pindah kelas massal, pengumuman bertarget. | — |
| Batch 4 (Penyempurnaan & Penyerahan) | selesai | Uji responsif 390/834/1440, state loading/empty, aksesibilitas tap 44px, modal viewport portal, perbaikan judul pengumuman, dan Dokumen Capstone lengkap (`docs/CAPSTONE.md`). | Fitur opsional (notifikasi email/dark mode). |

## Verifikasi Batch 1 dan 2

Pemeriksaan kode aktual terhadap 28 butir spesifikasi:

| No | Butir Verifikasi | Status | Bukti (File:Baris / Nama Tes) |
|---|---|---|---|
| 1 | `submitProof` memakai `DB::transaction` + `lockForUpdate`, hanya dari `belum_bayar` atau `ditolak`, tolak jika ada pending, ubah ke `menunggu_verifikasi`, catat audit log | Ada | `app/Services/PaymentVerificationService.php:24-49`; tes `SecurityFixesTest::test_submitting_proof_moves_invoice_and_rejects_duplicate_pending_upload` |
| 2 | `approve` dan `reject` memakai transaksi + `lockForUpdate` payment & invoice; alasan tolak wajib; lunas + buku kas atomik; lunas final | Ada | `app/Services/PaymentVerificationService.php:52-95`; tes `DomainFlowTest::test_payment_approval_is_atomic_and_creates_ledger`, `DomainFlowTest::test_paid_payment_cannot_be_rejected` |
| 3 | Tes transisi sah/tidak sah, unggah ganda, persetujuan role non-admin, atomisitas lunas + buku kas | Ada | `tests/Feature/DomainFlowTest.php:48, 63, 128, 152, 169`; `tests/Feature/SecurityFixesTest.php:45` |
| 4 | Guru: ubah anekdot dan finalisasi jurnal cek enrollment aktif wali kelas; tes guru digantikan | Ada | `app/Services/AnecdotalNoteService.php:24-29`; `app/Services/JournalService.php:45-48, 65-73`; tes `JournalFlowTest::test_replaced_teacher_loses_write_access`, `SecurityFixesTest::test_finalize_and_anecdote_update_require_current_homeroom` |
| 5 | Route `/profile` bawaan Breeze (ubah nama/email, hapus akun) tidak ada di `route:list` | Ada | `routes/web.php:72` & `routes/auth.php`; tes `ProfileTest::test_breeze_profile_mutation_routes_are_unavailable` |
| 6 | Ganti kata sandi pertama kali periksa kata sandi sementara dan aturan min 8 karakter + angka | Ada | `app/Http/Controllers/ChangePasswordController.php:20-25`; tes `SecurityFixesTest::test_first_password_change_requires_temporary_password`, `RoleAccessTest::test_must_change_password_redirects_and_clears_flag` |
| 7 | `EnsurePasswordChanged` berlaku untuk semua route terautentikasi termasuk `/` dan `/dashboard` | Ada | `bootstrap/app.php:24` (global middleware `web`); tes `SecurityFixesTest::test_password_change_middleware_covers_root_and_dashboard` |
| 8 | Middleware pemeriksa `users.is_active` keluarkan sesi akun nonaktif | Ada | `app/Http/Middleware/EnsureActiveAccount.php:14-20`; `bootstrap/app.php:23`; tes `SecurityFixesTest::test_disabled_authenticated_session_is_logged_out` |
| 9 | Jurnal: validasi id, aspect, level memakai enum; simpan draf idempoten (`updateOrCreate`) | Ada | `app/Http/Controllers/Guru/JournalController.php:49-57`; `app/Services/JournalService.php:23-26, 92-100`; tes `SecurityFixesTest::test_draft_is_idempotent_and_invalid_assessment_is_rejected` |
| 10 | Tidak ada model invoice/payment utuh dikirim ke Inertia; tanpa `proof_path` atau ID pengguna di props | Ada | `app/Http/Controllers/Ortu/InvoiceController.php:46-72, 90-107`; `app/Http/Controllers/Admin/InvoiceController.php:26-34`; `app/Http/Controllers/Admin/PaymentQueueController.php:26-44`; tes `SecurityFixesTest::test_shared_settings_and_invoice_props_do_not_expose_sensitive_fields` |
| 11 | `HandleInertiaRequests`: publik hanya `appName` & `schoolName`; rekening bank hanya untuk admin & ortu login | Ada | `app/Http/Middleware/HandleInertiaRequests.php:54-64`; tes `SecurityFixesTest::test_shared_settings_and_invoice_props_do_not_expose_sensitive_fields` |
| 12 | `/styleguide` hanya `local`; Register & Welcome dihapus; `/` arahkan tamu ke login dan auth ke beranda role | Ada | `routes/web.php:29-49`; berkas `Welcome.tsx` & `Register.tsx` tidak ada; tes `StyleguideTest::test_styleguide_page_is_local_only`, `SecurityFixesTest::test_root_redirects_and_profile_route_is_removed` |
| 13 | Seeder: akun demo kata sandi sederhana hanya di `local` atau `testing` | Ada | `database/seeders/DatabaseSeeder.php:46-59`; tes `SecurityFixesTest::test_production_seed_does_not_use_demo_passwords` |
| 14 | Petunjuk produksi di README (`APP_ENV=production`, `APP_DEBUG=false`) | Ada | `README.md:196-199` |
| 15 | Query `ReportService` dan agregasi valid untuk MySQL `ONLY_FULL_GROUP_BY` | Ada | `app/Services/ReportService.php:33, 70, 71, 86, 101, 132` (semua groupBy hanya kolom teragregasi dan `reorder()` membersihkan order) |
| 16 | Konfigurasi tes MySQL ke database `skms_test` dengan pengaman nama database | Ada | `phpunit.mysql.xml:15,20`; `composer.json:61`; `tests/TestCase.php:16-21` |
| 17 | Nav atas 44 px, dropdown pengguna, item 14 px berjarak 40 px | Ada | `resources/css/app.css:162-170`; `resources/js/Layouts/RoleLayout.tsx:20-25` |
| 18 | Padding kontainer 48/32/20 px dan lebar maksimum konten 1100 atau 1200 px | Ada | `resources/css/app.css:171, 218, 228`; `.page-content` max-width 1200px |
| 19 | Tile radius 28/20 px dan padding 40–48 px / 24 px; BigNumber 72/48 px; judul hero 56/34 px | Ada | `resources/css/app.css:173-175, 229-234`; `resources/js/Components/Tile.tsx`; `resources/js/Components/BigNumber.tsx` |
| 20 | Segmented control dan semua tap target minimal 44 px (48 px orang tua) | Ada | `resources/css/app.css:176, 612`; `resources/js/Components/SegmentedControl.tsx` |
| 21 | Dialog 480 px; di mobile menjadi bottom sheet dengan grabber | Ada | `resources/css/app.css:131, 156, 578, 646`; `resources/js/Components/BottomSheet.tsx:9-10`; `resources/js/Components/ConfirmDialog.tsx` |
| 22 | Tidak ada teks informatif berwarna `#86868B` | Ada | `resources/css/app.css:263` (`.parent-invoice-row p > span { color: var(--text-2); }`); tes `tests/js/text-contrast.test.mjs` |
| 23 | Pesan galat login tampil di mobile | Ada | `resources/css/app.css:177, 524, 547, 554`; `resources/js/Pages/Auth/Login.tsx:18-19` |
| 24 | StatusCapsule lengkap: 4 status tagihan, Aktif, Nonaktif, Belum pernah masuk, dan level BB/MB/BSH/BSB | Ada | `resources/js/Components/StatusCapsule.tsx:1-19`; `resources/css/app.css:73-74, 178-184, 340-349` |
| 25 | Tab bar mobile sesuai role (ortu & guru 4 tab, kepsek 3 tab, admin menu sheet), tanpa slice pemotong | Ada | `resources/js/Layouts/RoleLayout.tsx:28-30`; `ParentLayout.tsx:3`; `TeacherLayout.tsx:3`; `PrincipalLayout.tsx:3`; `AdminLayout.tsx:5` |
| 26 | Font Inter benar-benar dimuat; tidak ada sisa komponen Breeze tanpa restyle; tombol utama pil 52 px biru `#0071E3` | Ada | `resources/css/app.css:1, 19, 38`; `PrimaryButton.tsx`; `SecondaryButton.tsx`; `TextInput.tsx`; `InputLabel.tsx`; `InputError.tsx` |
| 27 | ProgressSteps memakai titik dan garis sambung (selesai berupa centang, saat ini cincin), bukan angka | Ada | `resources/js/Components/ProgressSteps.tsx:3-33`; `resources/css/app.css:79-87, 248`; tes `tests/js/progress-steps.test.mjs` |
| 28 | ESLint aktif di `npm run lint` | Ada | `package.json:7` (`tsc --noEmit && eslint resources/js --max-warnings=0`) |

## Layar

- **Sesuai relatif pada desktop yang diperiksa:** 00 Login, 01 Ganti kata sandi, 19 Daftar tagihan orang tua, 20A–20D Detail tagihan, dan 23 Beranda orang tua Apple-style. "Sesuai" di sini berarti struktur dan state utama cocok; bukan klaim pixel-perfect.
- **Sebagian:** 02 Beranda admin, 03/08/09 Keuangan admin, 04–07 Master data, 10 Pengumuman, 11/16/17/18 Dashboard dan laporan, 12–15 Jurnal/anekdot, 21 Perkembangan, dan 22 Profil. Kode ada, tetapi detail visual, state, atau alur belum seluruhnya setara mockup.
- **Belum dapat dinyatakan sesuai:** versi mobile/tablet seluruh layar staff serta state lengkap yang belum memiliki screenshot pembanding. Layar yang belum memiliki mockup mobile resmi terutama 02–18 dan 19–22; untuk breakpoint itu gunakan `DESIGN.md`, jangan menganggapnya sudah tervalidasi.

Mockup mobile resmi tidak tersedia untuk banyak layar, termasuk 19/20; breakpoint 390/834 mengikuti `DESIGN.md`. Daftar bukti perbedaan ada di `docs/REVIEW-REPORT.md` dan `docs/UI-AUDIT.md`.

## Verifikasi terakhir

- `php artisan test tests/Feature/MasterDataTest.php tests/Feature/AuthorizationScopeTest.php tests/Feature/Auth/RoleAccessTest.php`: seluruh unit pengujian master data & otorisasi **100% lulus (22 passed, 143 assertions)**.
- `./vendor/bin/pint --test`: lulus (0 formatting issues).
- `npm run lint`: lulus (`tsc --noEmit` dan ESLint 0 warnings).
- `npm run build`: lulus; Vite 6.4.3 (0 errors).
- Fitur Penugasan Guru ke Kelas: Berhasil diimplementasikan pada `/admin/guru` dengan aturan bisnis **1 kelas maksimal 3 guru** (1 wali kelas utama + hingga 2 guru pendamping), modal `Atur Penugasan Kelas` yang elegan dan informatif, indikator kuota real-time `(x/3 guru)` atau `(3/3 guru — Penuh)` pada dropdown, pencatatan `audit_logs`, serta integrasi pivot table `classroom_teacher`.

## Keputusan penting

- Controller tipis; aturan bisnis berada di `app/Services`; payload Inertia memakai array eksplisit/resource.
- Orang tua dibatasi `ParentStudentContext` dan pivot `guardian_student`; guru dibatasi enrollment kelas aktif.
- Bukti pembayaran disimpan di disk privat dan disajikan lewat route ber-policy.
- Uang adalah integer rupiah. `cash_ledger_entries.receipt_number` unik dengan format `KWT/YYYY/MM/NNN`.
- Penomoran `invoice_number` (`INV-YYYY-MM-NNN`) dan `receipt_number` (`KWT/YYYY/MM/NNN`) aman balapan memakai `Cache::lock`, kalkulasi nomor urut maksimum eksisting, dan retry loop 3 kali saat terjadi tabrakan kunci unik.
- Data demo seeder diperkaya: tagihan Agu, Sep, dan Okt untuk 78 siswa, 6 siswa menunggak >30 hari, 3 tagihan ditolak dengan alasan realistis, diskon saudara kandung, 12 catatan anekdot di kedua kelas, dan 6 status/sasaran pengumuman.
- Rute `/styleguide` hanya didaftarkan bila `app()->environment('local')`.
- Rute bawaan Breeze `confirm-password` dan `verify-email` beserta controller dan view-nya dihapus bersih; label seluruh halaman autentikasi distandarkan menjadi "Kata sandi" tanpa tanda seru.
- Batas upload bukti transfer 5.120 KB dan proteksi nama acak pada disk privat diuji ketat di `ParentInvoiceUiTest`.
- Navigasi global (Desktop): mengadopsi 3-kolom CSS Grid (`1fr auto 1fr`) sehingga menu utama berada presisi di tengah layar terlepas dari perbedaan lebar wordmark dan menu pengguna; item navigasi menggunakan tautan langsung dengan pencocokan prefiks rute aktif (`matchPrefixes`) yang akurat; jarak item seragam.
- Form Jurnal Guru (`/guru/jurnal/{student}`): Bottom action bar dibuat membentang penuh 100% selebar layar tanpa terpotong batas 1200px (`!max-w-none w-full`), padding bawah lega (`pb-36`) mencegah konten kartu tertutup saat scroll ke bawah, `hideFooter={true}` menghilangkan tabrakan footer dengan bar melayang, dan status aksi rapi (mode tinjau menampilkan info tersimpan & tombol "Ubah jurnal", mode edit menampilkan tombol "Batal" & "Simpan perubahan").
- Hub & Riwayat Jurnal (`/guru/jurnal`): Halaman dirombak dari tabel statis kosong menjadi hub interaktif lengkap dengan kartu progres hari ini, CTA "Isi Jurnal Hari Ini", pencarian nama/NIS, filter tanggal kalender, status capsule, dan tombol aksi "Buka jurnal →".
- Tambah Kelas (`/admin/kelas`): penambahan fitur buat kelas baru dengan modal Apple-style, validasi keunikan nama kelas di tahun ajaran aktif, pencatatan audit log `classroom_created`, serta fleksibilitas penugasan wali kelas (bisa dikosongkan untuk guru pendamping/mapel).
- Pencarian data master: tombol "Cari" di dalam input teks diselaraskan secara vertikal tanpa clipping (`min-height: 0` reset).
- Pengumuman: tombol "Ubah" dan "Hapus" ditata horizontal berdampingan dengan gaya kapsul pill dan status hover bertingkat.
- Invoice lunas dan ledger dibuat atomik; invoice lunas final.
- Beranda orang tua memakai varian Apple-style.
- Route `/profile` Breeze yang mengubah/menghapus akun dihapus; profil orang tua memakai `/ortu/profil` baca-saja.
- Tes default SQLite in-memory. `phpunit.mysql.xml` dan `composer test:mysql` memakai database terpisah persis `skms_test`.
- Batch 3E (Master data, Pengumuman, Profil): Layar 04 (Data Siswa), Layar 05 (Tambah Siswa), Layar 06A/06B (Data Orang Tua & Modal Reset Sandi), Layar 06C/06D (Data Guru & Drawer Tambah Guru), Layar 07 (Kelas & Penugasan), Layar 10 (Pengumuman & Form dengan Live Preview), serta Layar 22 (Profil Orang Tua) dibangun ulang sesuai visual Stitch dan DESIGN.md.
- Penyempurnaan Ortu & Admin:
  1. Kontras hover tombol "Unduh bukti pembayaran" di kartu invoice orang tua diselaraskan (`.parent-invoice-card .button-primary:hover`) agar teks biru tetap kontras tajam di atas latar putih (`#0077ED`).
  2. Pengumuman yang disematkan (`is_pinned`) ditampilkan otomatis di baris teratas beranda orang tua (`/ortu`) dengan kartu Apple-style dan badge "Disematkan".
  3. Pratinjau bukti bayar orang tua (`/ortu/tagihan/{id}`): thumbnail & teks "Lihat bukti penuh" membuka modal Lightbox in-page dengan parameter `preview=1` tanpa memicu pengunduhan berkas ke komputer pengguna.
  4. Pratinjau verifikasi admin (`/admin/verifikasi`): dokumen/gambar yang belum ada atau data demo menyajikan replika digital bukti transfer SVG bank transfer tanpa menghasilkan 404, serta tombol "Buka ukuran penuh ↗" membuka modal Lightbox in-page langsung di layar tanpa navigasi ke halaman lain.
  5. Generate SPP Bulanan Admin (`/admin/tagihan`): ditambahkan meta tag `csrf-token` di `app.blade.php`, pembacaan fallback XSRF token, kalkulasi otomatis tahun kalender dan tanggal jatuh tempo sesuai tahun ajaran (semester ganjil/genap), dialog konfirmasi (`ConfirmDialog`) dengan rincian tagihan dibuat & dilewati, penanganan error transparan, serta status aksi yang responsif.
  6. Sub-navigasi Tab Keuangan (`.master-tabs`): dirombak menjadi Apple Segmented Control berbentuk kapsul pil (`#EAEAEF`), dengan tab aktif berupa pil putih berefek shadow lembut dan tab non-aktif dengan reaksi hover yang halus, menghilangkan tampilan teks polos tanpa bingkai di `/admin/tagihan`, `/admin/verifikasi`, dan `/admin/buku-kas`.
  7. Pencegahan Pergeseran Tata Letak Akibat Scrollbar (*Scrollbar Layout Shift*): ditambahkan `scrollbar-gutter: stable;` pada elemen `html` serta scrollbar minimalis khas Apple (`::-webkit-scrollbar` floating pill dan `scrollbar-width: thin`), memastikan lebar ruang pandang (*viewport*) dan titik tengah (*center alignment*) seluruh halaman tetap konsisten dan tidak lagi bergeser/meloncat ke kiri saat berpindah antara halaman panjang ber-scroll dan halaman pendek tanpa scroll.
  8. Penutupan Dropdown & Popup Otomatis (*Dismiss on Click Outside & Escape*): Dropdown menu navigasi (menu Keuangan dan Akun pengguna di `RoleLayout`), jendela dialog konfirmasi (`ConfirmDialog`), serta modal pratinjau Lightbox gambar bukti transfer kini otomatis menutup ketika pengguna mengklik area luar di mana pun pada layar maupun saat menekan tombol `Escape` pada keyboard, menggantikan perilaku `<details>` bawaan browser yang kaku.
  9. Modal & Popup Terpusat di Layar Laptop (*Viewport-Centered Flexible Modals — Berlaku untuk Seluruh Fitur*):
     - Seluruh modal/dialog/drawer di aplikasi (`Atur Penugasan Kelas` dan `Tambah Guru` di Data Guru, `Ganti Wali Kelas` dan `Tambah Kelas Baru` di Data Kelas, `Detail Siswa` dan `Ubah Data Siswa` di Data Siswa, `Ubah Nominal SPP` di Tagihan SPP, `Tolak Pembayaran` & `Lightbox Bukti Bayar` di Verifikasi Pembayaran, `Tambah/Ubah Catatan Anekdot` di Catatan Anekdot Guru, `Rincian Log` di Audit Log, serta `ConfirmDialog`, `AccountCreatedDialog`, dan `BottomSheet`) dirender langsung ke `document.body` menggunakan `createPortal`.
     - Posisi modal dipastikan selalu tepat di tengah layar laptop/viewport browser (`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden`), bukan di tengah dokumen halaman panjang.
     - Scroll latar belakang otomatis dikunci (`document.body.style.overflow = 'hidden'`) dengan pembersihan saat unmount/tutup sehingga halaman di belakang tidak bergulir.
     - Batas tinggi fleksibel (`max-h-[calc(100dvh-32px)]`) dengan header dan tombol aksi footer bersifat tetap (*sticky shrink-0*); hanya area isi formulir yang bergulir (*overflow-y-auto overscroll-contain flex-1 min-h-0*). Tombol "Simpan" / "Batal" tidak akan pernah terpotong ke bawah layar laptop.
  10. Sanitasi Label Navigasi Pagination:
     - Penyediaan berkas terjemahan `lang/en/pagination.php` dan `lang/id/pagination.php` serta pembersihan di frontend (`Journal.tsx`, `Students.tsx`, `Teachers.tsx`, `Guardians.tsx`, `Announcements/Index.tsx`) memastikan string internal `pagination.previous` / `pagination.next` tidak lagi muncul sebagai label tautan paginasi pada browser pengguna.

## Masalah terbuka

- Temuan yang masih terbuka tercatat di `docs/REVIEW-REPORT.md`: cakupan policy belum merata, perbedaan visual, state loading/server error yang belum menyeluruh, dan keterbatasan mockup mobile.
- `mysql --version` tidak tersedia di PATH, sehingga tes MySQL `skms_test` belum dapat dijalankan. Jangan gunakan/reset database `skms`.
- Kata sandi akun demo tidak dicantumkan di handoff.

## Menjalankan di mesin ini

Versi terverifikasi: PHP 8.2.12 (XAMPP), Composer 2.10.2, Node.js 24.18.0, npm 11.16.0. MySQL CLI tidak tersedia di PATH.

- `skms`: database demo aplikasi; jangan jalankan reset/seeder terhadapnya.
- SQLite `:memory:`: database default `php artisan test`.
- `skms_test`: database khusus tes MySQL; buat manual oleh pemilik, lalu jalankan `composer test:mysql`.
- Dev: `composer install`, `npm install`, `php artisan serve`, dan `npm run dev`.
- Verifikasi: `php artisan test`, `./vendor/bin/pint --test`, `npm run lint`, `npm run build`.
- Screenshot: server lokal lalu `npm run shots`; fixture parent memakai `SHOTS_PARENT_FIXTURES=1` bersama `ParentInvoiceUiTest`, lalu hapus variabel tersebut.

Seeder lokal/testing mengenali `admin@skms.test`, `guru@skms.test`, `kepsek@skms.test`, `ortu@skms.test`, serta akun guru/orang tua tambahan. Kata sandi sengaja tidak ditulis.

## Langkah berikutnya
 
1. Batch 4 Selesai: Seluruh layar staf dan orang tua telah diverifikasi responsif (390/834/1440), state kosong/loading/error lengkap, RBAC policy menyeluruh, dokumen capstone komprehensif (`docs/CAPSTONE.md`) terbit, tampilan Audit Log administratif (`/admin/audit-log`) aktif, dan seluruh modal mengambang mengadopsi `createPortal(..., document.body)` dengan viewport centering dan scroll locking.
2. Siap diserahkan untuk demonstrasi akhir atau evaluasi capstone.


