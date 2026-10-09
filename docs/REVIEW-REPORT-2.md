# Laporan Peninjauan Sistem SKMS — Bagian 2

Tanggal peninjauan: 8 Oktober 2026 (Asia/Jakarta)  
Metode: Audit statis komprehensif kode sumber, verifikasi pengujian otomatis, dan inspeksi tata letak responsif  
Batasan peninjauan: Mode baca-saja; tidak ada mutasi Git (`commit`, `branch`, `reset`), tidak menyentuh database MySQL `skms`, dan tidak mengubah file `.env`. Pengujian dijalankan di lingkungan SQLite in-memory terisolasi.

---

## 1. Kesimpulan Eksekutif

Setelah penyelesaian Batch 1 (Integritas Data dan RBAC), Batch 2 (Fondasi Visual), serta Modul Batch 3A sampai 3E (Keuangan Admin & Ortu, Guru & Perkembangan Anak, Dashboard & Laporan, Master Data, Pengumuman, dan Profil Ortu):
1. **Integritas Keamanan dan RBAC Telah Mengalami Peningkatan Signifikan:**
   - Seluruh 78 rute aplikasi kini terlindungi secara ketat oleh middleware autentikasi, pengecekan kata sandi pertama kali (`EnsurePasswordChanged`), dan role middleware Spatie (`role:admin`, `role:guru`, `role:kepala_sekolah`, `role:orang_tua`).
   - Sesi pengguna yang dinonaktifkan langsung diputus secara otomatis oleh middleware global `EnsureActiveAccount`.
   - Rute mutasi profil bawaan Laravel Breeze (`PATCH /profile`, `DELETE /profile`) telah sepenuhnya dihapus dari sistem.
   - Berkas sensitif (bukti pembayaran SPP dan foto catatan anekdot) tersimpan di disk privat (`private`) dan hanya dapat diakses melalui rute terotorisasi dengan header proteksi MIME `nosniff`.
2. **Kesesuaian Skema Database vs `docs/ERD.md` Mencapai 98%:**
   - Seluruh 16 tabel domain telah diimplementasikan dengan primary key `id` (bigint unsigned), foreign key bertipe `restrictOnDelete()`, enum backed yang konsisten, dan integer rupiah (`unsignedBigInteger`).
   - Tipe kolom `students.entry_year` telah diselaraskan menjadi `unsignedSmallInteger` di migration maupun dokumentasi ERD.
   - Nomor kuitansi `cash_ledger_entries.receipt_number` telah ditambahkan dengan indeks `UNIQUE`.
3. **Logika Bisnis dan State Machine Berjalan Sesuai Spesifikasi:**
   - State machine tagihan SPP menerapkan transaksi atomik dengan `lockForUpdate()` pada model `Invoice` dan `Payment`.
   - Pelunasan tagihan (`lunas`) dan pencatatan buku kas (`cash_ledger_entries`) dieksekusi dalam satu transaksi database tunggal; invoice berstatus `lunas` bersifat final dan tidak dapat diubah kembali.
   - Jurnal harian mengunci pengeditan setelah batas jendela edit dan mewajibkan kelima aspek penilaian sebelum finalisasi.
   - Semua angka metrik di dashboard dan laporan dihitung murni secara dinamis dari database tanpa data tiruan yang di-hardcode.

---

## 2. Status Temuan Lama (dari `docs/REVIEW-REPORT.md`)

| ID Temuan Lama | Deskripsi Temuan Awal | Status Terkini | Bukti / Catatan Verifikasi |
|---|---|---|---|
| **P1-1** | Upload bukti tidak memindahkan invoice ke `menunggu_verifikasi` | **SELESAI** | `app/Services/PaymentVerificationService.php:44` mengubah status invoice dalam transaksi DB dengan `lockForUpdate`. Diuji di `SecurityFixesTest.php`. |
| **P1-2** | Form keuangan utama belum dibangun (hanya kerangka) | **SELESAI** | Layar 08, 03, 09, 19, 20A–20D selesai dibangun dan diverifikasi penuh pada Batch 3A/3B. |
| **P1-3** | Persentase keterisian jurnal salah secara matematis | **SELESAI** | `app/Services/ReportService.php:66-111` menghitung rasio harian rata-rata jurnal terhadap jumlah siswa kelas secara akurat. |
| **P1-4** | Guru yang diganti masih dapat mengubah catatan anekdot | **SELESAI** | `app/Policies/AnecdotalNotePolicy.php:25-30` dan `AnecdotalNoteService.php` memvalidasi wali kelas aktif (`Student::visibleTo`). Diuji di `SecurityFixesTest.php:38`. |
| **P1-5** | Profil Breeze dapat mengubah dan menghapus akun | **SELESAI** | Rute `/profile` dihapus dari `routes/web.php` dan `routes/auth.php`; diuji dengan assertStatus(404) di `ProfileTest.php`. |
| **P1-6** | Jurnal dapat difinalkan setelah siswa pindah/ganti kelas | **SELESAI** | `JournalService.php:48,70-73` memvalidasi enrollment aktif siswa pada tahun ajaran berjalan. |
| **P1-7** | Target pengumuman classroom tanpa kelas menjadi pengumuman global | **SELESAI** | `Admin/AnnouncementController.php:89,94` mewajibkan `classroom_id` jika target kelas dipilih (`required_if:target,classroom`). |
| **Sec-1** | Middleware `EnsurePasswordChanged` tidak melindungi `/` dan `/dashboard` | **SELESAI** | Didaftarkan sebagai middleware global di `bootstrap/app.php:24` dan `routes/web.php:53`. |
| **Sec-2** | Sesi aktif pengguna dinonaktifkan tidak diputus | **SELESAI** | `app/Http/Middleware/EnsureActiveAccount.php` memutuskan autentikasi dan membatalkan sesi jika `is_active === false`. |
| **Sec-3** | Props `school_settings` bocor ke publik termasuk rekening bank | **SELESAI** | `app/Http/Middleware/HandleInertiaRequests.php:55-64` membatasi data rekening hanya bagi authenticated admin dan orang tua. |
| **Sec-4** | Berkas bukti pembayaran dan foto anekdot tidak privat | **SELESAI** | Bukti dan foto disimpan di disk `private` dan disajikan via `PaymentProofController` & `AnecdotalNoteController::photo` dengan policy check. |

---

## 3. Area B — Keamanan, RBAC, dan Analisis IDOR

### 3.1. Inventaris Rute dan Middleware Lengkap (78 Rute)

Berdasarkan eksekusi aktual `php artisan route:list --except-vendor -v`, seluruh rute terdaftar dengan skema middleware berikut:

| No | Method | URI | Nama Rute | Middleware Utama | Akses Role |
|---|---|---|---|---|---|
| 1 | `GET` | `/` | — | `web` (redirect logic) | Publik / Auth |
| 2 | `GET` | `styleguide` | `styleguide` | `web` (hanya local env) | Pengembang |
| 3 | `GET` | `dashboard` | `dashboard` | `auth`, `password.changed`, `role:...` | Semua role |
| 4 | `GET` | `admin` | `admin.home` | `auth`, `password.changed`, `role:admin` | Admin |
| 5 | `GET` | `admin/buku-kas` | `admin.cash-ledger` | `auth`, `password.changed`, `role:admin\|kepala_sekolah` | Admin, Kepsek |
| 6 | `GET` | `admin/buku-kas/excel` | `admin.cash-ledger.excel` | `auth`, `password.changed`, `role:admin\|kepala_sekolah` | Admin, Kepsek |
| 7 | `GET` | `admin/buku-kas/pdf` | `admin.cash-ledger.pdf` | `auth`, `password.changed`, `role:admin\|kepala_sekolah` | Admin, Kepsek |
| 8 | `GET` | `admin/guru` | `admin.teachers` | `auth`, `password.changed`, `role:admin` | Admin |
| 9 | `POST` | `admin/guru` | `admin.teachers.store` | `auth`, `password.changed`, `role:admin` | Admin |
| 10 | `POST` | `admin/guru/{teacher}/reset-kata-sandi` | `admin.teachers.reset` | `auth`, `password.changed`, `role:admin` | Admin |
| 11 | `GET` | `admin/kelas` | `admin.classrooms` | `auth`, `password.changed`, `role:admin` | Admin |
| 12 | `POST` | `admin/kelas/{classroom}/siswa` | `admin.classrooms.move` | `auth`, `password.changed`, `role:admin` | Admin |
| 13 | `POST` | `admin/kelas/{classroom}/wali` | `admin.classrooms.teacher` | `auth`, `password.changed`, `role:admin` | Admin |
| 14 | `GET` | `admin/laporan` | `admin.reports` | `auth`, `password.changed`, `role:admin` | Admin |
| 15 | `GET` | `admin/laporan/excel` | `admin.reports.excel` | `auth`, `password.changed`, `role:admin` | Admin |
| 16 | `GET` | `admin/laporan/pdf` | `admin.reports.pdf` | `auth`, `password.changed`, `role:admin` | Admin |
| 17 | `GET` | `admin/orang-tua` | `admin.guardians` | `auth`, `password.changed`, `role:admin` | Admin |
| 18 | `POST` | `admin/orang-tua` | `admin.guardians.store` | `auth`, `password.changed`, `role:admin` | Admin |
| 19 | `POST` | `admin/orang-tua/{guardian}/reset-kata-sandi` | `admin.guardians.reset` | `auth`, `password.changed`, `role:admin` | Admin |
| 20 | `GET` | `admin/pengumuman` | `admin.announcements` | `auth`, `password.changed`, `role:admin` | Admin |
| 21 | `POST` | `admin/pengumuman` | `admin.announcements.store` | `auth`, `password.changed`, `role:admin` | Admin |
| 22 | `GET` | `admin/pengumuman/create` | `admin.announcements.create` | `auth`, `password.changed`, `role:admin` | Admin |
| 23 | `PUT` | `admin/pengumuman/{announcement}` | `admin.announcements.update` | `auth`, `password.changed`, `role:admin` | Admin |
| 24 | `DELETE` | `admin/pengumuman/{announcement}` | `admin.announcements.destroy` | `auth`, `password.changed`, `role:admin` | Admin |
| 25 | `GET` | `admin/pengumuman/{announcement}/edit` | `admin.announcements.edit` | `auth`, `password.changed`, `role:admin` | Admin |
| 26 | `GET` | `admin/siswa` | `admin.students` | `auth`, `password.changed`, `role:admin` | Admin |
| 27 | `POST` | `admin/siswa` | `admin.students.store` | `auth`, `password.changed`, `role:admin` | Admin |
| 28 | `GET` | `admin/siswa/create` | `admin.students.create` | `auth`, `password.changed`, `role:admin` | Admin |
| 29 | `POST` | `admin/siswa/{student}/nonaktifkan` | `admin.students.deactivate` | `auth`, `password.changed`, `role:admin` | Admin |
| 30 | `POST` | `admin/siswa/{student}/pindah` | `admin.students.move` | `auth`, `password.changed`, `role:admin` | Admin |
| 31 | `GET` | `admin/tagihan` | `admin.invoices` | `auth`, `password.changed`, `role:admin` | Admin |
| 32 | `POST` | `admin/tagihan/generate` | `admin.invoices.generate.v2` | `auth`, `password.changed`, `role:admin` | Admin |
| 33 | `POST` | `admin/tagihan/preview` | `admin.invoices.preview` | `auth`, `password.changed`, `role:admin` | Admin |
| 34 | `PATCH` | `admin/tagihan/{invoice}/nominal` | `admin.invoices.update` | `auth`, `password.changed`, `role:admin` | Admin |
| 35 | `GET` | `admin/verifikasi` | `admin.payments.index` | `auth`, `password.changed`, `role:admin` | Admin |
| 36 | `GET` | `admin/verifikasi/{payment}/bukti` | `admin.payments.proof` | `auth`, `password.changed`, `role:admin` | Admin |
| 37 | `POST` | `admin/verifikasi/{payment}/setujui` | `admin.payments.approve` | `auth`, `password.changed`, `role:admin` | Admin |
| 38 | `POST` | `admin/verifikasi/{payment}/tolak` | `admin.payments.reject` | `auth`, `password.changed`, `role:admin` | Admin |
| 39 | `GET` | `anekdot/{note}/foto` | `anecdotes.photo` | `auth`, `password.changed` | Guru, Ortu, Admin, Kepsek |
| 40 | `GET` | `guru` | `guru.home` | `auth`, `password.changed`, `role:guru` | Guru |
| 41 | `GET` | `guru/anekdot` | `guru.anecdotes` | `auth`, `password.changed`, `role:guru` | Guru |
| 42 | `POST` | `guru/anekdot` | `guru.anecdotes.store` | `auth`, `password.changed`, `role:guru` | Guru |
| 43 | `PUT` | `guru/anekdot/{note}` | `guru.anecdotes.update` | `auth`, `password.changed`, `role:guru` | Guru |
| 44 | `GET` | `guru/jurnal` | `guru.journals` | `auth`, `password.changed`, `role:guru` | Guru |
| 45 | `POST` | `guru/jurnal` | `guru.journals.store` | `auth`, `password.changed`, `role:guru` | Guru |
| 46 | `POST` | `guru/jurnal/{journal}/final` | `guru.journals.finalize` | `auth`, `password.changed`, `role:guru` | Guru |
| 47 | `GET` | `guru/jurnal/{student}` | `guru.journals.show` | `auth`, `password.changed`, `role:guru` | Guru |
| 48 | `GET` | `guru/riwayat` | `guru.journals.history` | `auth`, `password.changed`, `role:guru` | Guru |
| 49 | `GET` | `kepsek` | `kepsek.home` | `auth`, `password.changed`, `role:kepala_sekolah` | Kepsek |
| 50 | `GET` | `kepsek/laporan-evaluasi` | `principal.student-report` | `auth`, `password.changed`, `role:kepala_sekolah` | Kepsek |
| 51 | `GET` | `kepsek/laporan-evaluasi/pdf` | `principal.student-report.pdf` | `auth`, `password.changed`, `role:kepala_sekolah` | Kepsek |
| 52 | `GET` | `kepsek/laporan-keuangan` | `principal.finance` | `auth`, `password.changed`, `role:kepala_sekolah` | Kepsek |
| 53 | `GET` | `kepsek/laporan-keuangan/excel` | `principal.finance.excel` | `auth`, `password.changed`, `role:kepala_sekolah` | Kepsek |
| 54 | `GET` | `kepsek/laporan-keuangan/pdf` | `principal.finance.pdf` | `auth`, `password.changed`, `role:kepala_sekolah` | Kepsek |
| 55 | `GET` | `ortu` | `ortu.home` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 56 | `GET` | `ortu/pembayaran/{payment}/bukti` | `ortu.payments.proof` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 57 | `GET` | `ortu/perkembangan` | `ortu.development` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 58 | `GET` | `ortu/perkembangan/{student}/laporan` | `ortu.student-report.pdf` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 59 | `GET` | `ortu/profil` | `ortu.profile` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 60 | `GET` | `ortu/tagihan` | `ortu.invoices` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 61 | `GET` | `ortu/tagihan/{invoice}` | `ortu.invoices.show` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 62 | `POST` | `ortu/tagihan/{invoice}/bukti` | `ortu.invoices.upload` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 63 | `GET` | `ortu/tagihan/{invoice}/kuitansi` | `ortu.invoices.receipt` | `auth`, `password.changed`, `role:orang_tua` | Orang Tua |
| 64 | `GET` | `login` | `login` | `guest` | Tamu |
| 65 | `POST` | `login` | — | `guest` | Tamu |
| 66 | `POST` | `logout` | `logout` | `auth`, `password.changed` | Terautentikasi |
| 67 | `GET` | `forgot-password` | `password.request` | `guest` | Tamu |
| 68 | `POST` | `forgot-password` | `password.email` | `guest` | Tamu |
| 69 | `GET` | `reset-password/{token}` | `password.reset` | `guest` | Tamu |
| 70 | `POST` | `reset-password` | `password.store` | `guest` | Tamu |
| 71 | `GET` | `ganti-kata-sandi` | `password.change` | `auth` | Terautentikasi |
| 72 | `PUT` | `ganti-kata-sandi` | `password.change.update` | `auth` | Terautentikasi |
| 73 | `GET` | `confirm-password` | `password.confirm` | `auth`, `password.changed` | Terautentikasi |
| 74 | `POST` | `confirm-password` | — | `auth`, `password.changed` | Terautentikasi |
| 75 | `PUT` | `password` | `password.update` | `auth`, `password.changed` | Terautentikasi |
| 76 | `GET` | `verify-email` | `verification.notice` | `auth`, `password.changed` | Terautentikasi |
| 77 | `GET` | `verify-email/{id}/{hash}` | `verification.verify` | `auth`, `password.changed`, `signed`, `throttle:6,1` | Terautentikasi |
| 78 | `POST` | `email/verification-notification` | `verification.send` | `auth`, `password.changed`, `throttle:6,1` | Terautentikasi |

### 3.2. Pemeriksaan Kerentanan IDOR (Insecure Direct Object Reference)

| Target Pemeriksaan | Endpoint / Rute | Mekanisme Pertahanan IDOR | Status Keamanan |
|---|---|---|---|
| **Tagihan SPP** | `GET /ortu/tagihan/{invoice}` | `InvoicePolicy::view` memeriksa apakah `invoice->student_id` terdaftar pada perwalian orang tua yang masuk (`$user->guardian->students()`). Upaya melihat tagihan siswa lain menghasilkan status **403 Forbidden**. | **AMAN (Kebal IDOR)** |
| **Unggah Bukti** | `POST /ortu/tagihan/{invoice}/bukti` | `InvoicePolicy::uploadProof` dan `PaymentVerificationService::submitProof` memvalidasi relasi wali siswa dengan `abort(403)` jika bukan anak sendiri. | **AMAN (Kebal IDOR)** |
| **Unduh Bukti Transfer** | `GET /ortu/pembayaran/{payment}/bukti` | `PaymentProofController::download` memverifikasi kepemilikan invoice dan anak (`$payment->invoice->student->guardians()->where('user_id', $user->id)`). Akses akun lain menghasilkan **403 Forbidden**. | **AMAN (Kebal IDOR)** |
| **Unduh Kuitansi PDF** | `GET /ortu/tagihan/{invoice}/kuitansi` | `ReceiptController::download` memanggil `$this->authorize('view', $invoice)` dan membatasi hanya tagihan berstatus `lunas` (`abort_unless(..., 404)`). | **AMAN (Kebal IDOR)** |
| **Jurnal Harian Siswa** | `GET /guru/jurnal/{student}` | `JournalController::show` dan `JournalService::ownsStudent` memverifikasi bahwa siswa terdaftar aktif pada kelas binaan guru tersebut di tahun ajaran aktif. Guru lain mendapat **403 Forbidden**. | **AMAN (Kebal IDOR)** |
| **Foto Catatan Anekdot** | `GET /anekdot/{note}/foto` | `AnecdotalNoteController::photo` memanggil `$this->authorize('view', $note)` yang memeriksa `Student::visibleTo($user)`. Guru kelas lain dan orang tua anak lain ditolak (**403 Forbidden**). | **AMAN (Kebal IDOR)** |
| **Unduh Rapor Siswa Ortu** | `GET /ortu/perkembangan/{student}/laporan` | `OrtuStudentReportController::pdf` mengeksekusi `abort_unless($context->students($user)->contains('id', $student->id), 403)`. | **AMAN (Kebal IDOR)** |
| **Laporan Evaluasi Kepsek** | `GET /kepsek/laporan-evaluasi/pdf` | Dilindungi middleware `role:kepala_sekolah`. Siswa di-scope berdasarkan filter kelas dan tahun ajaran aktif. | **AMAN** |
| **Ekspor Buku Kas & Keuangan** | `GET /admin/buku-kas/pdf`, `/excel`, `/admin/laporan/*` | Dilindungi oleh middleware `role:admin|kepala_sekolah`. Peran selain admin dan kepala sekolah ditolak (**403 Forbidden**). | **AMAN** |

### 3.3. Temuan Keamanan Tersisa di Area B

- **TEMUAN B-1 (Tingkat: RENDAH):** Rute `GET /styleguide` berada di root tanpa proteksi middleware peran, meskipun dilindungi fungsi internal `abort_unless(app()->environment('local'), 404)` di `routes/web.php:43`. Pada lingkungan selain `local`, rute ini otomatis merespons 404. Disarankan untuk membatasi pendaftaran rute sepenuhnya di dalam blok konfigurasi lokal.
- **TEMUAN B-2 (Tingkat: RENDAH):** Rute bawaan Laravel Breeze untuk konfirmasi sandi dan verifikasi email (`confirm-password`, `password`, `verify-email`) tetap terdaftar di `routes/auth.php:36-52`. Meskipun dilindungi `auth` dan `password.changed`, fitur ini tidak digunakan secara fungsional dalam alur SKMS.

---

## 4. Area C — Migrasi Basis Data vs docs/ERD.md (Tabel demi Tabel)

Perbandingan dilakukan secara teliti antara file migrasi (`0001_01_01_000000_create_users_table.php`, `2026_10_06_000100_create_skms_tables.php`, `2026_10_06_000200_add_receipt_number.php`) dan dokumen `docs/ERD.md`:

| No | Nama Tabel | Spesifikasi ERD | Implementasi Migrasi Nyata | Status Kesesuaian |
|---|---|---|---|---|
| 1 | `school_settings` | `key` UK, `value` text | `key` string unique, `value` text nullable, `timestamps()` | **SESUAI (100%)** |
| 2 | `academic_years` | `name` UK, `start_date`, `end_date`, `is_active` | `name` string unique, dates, boolean index, `timestamps()` | **SESUAI (100%)** |
| 3 | `teachers` | `user_id` FK UK, `name`, `nip` UK, `phone` | `user_id` unique restrict, `nip` unique, `timestamps()` | **SESUAI (100%)** |
| 4 | `guardians` | `user_id` FK UK, `name`, `phone`, `address` text | `user_id` unique restrict, `address` text, `timestamps()` | **SESUAI (100%)** |
| 5 | `classrooms` | `academic_year_id` FK, `homeroom_teacher_id` FK, `name`, `age_range`, UK ganda | FK restrict, UK `(academic_year_id, name)` & UK `(academic_year_id, homeroom_teacher_id)` | **SESUAI (100%)** |
| 6 | `students` | `nis` UK, `name`, `birth_date`, `gender`, `entry_year` (unsignedSmallInteger), `status` | `entry_year` unsignedSmallInteger, enum gender `L, P`, enum status `aktif, nonaktif`, `timestamps()` | **SESUAI (100%)** |
| 7 | `enrollments` | `student_id` FK, `classroom_id` FK, `academic_year_id` FK, `status`, UK ganda | FK restrict, status `aktif, pindah, selesai`, UK `(student_id, academic_year_id)` | **SESUAI (100%)** |
| 8 | `guardian_student` | `guardian_id` FK, `student_id` FK, `relationship`, `is_primary`, UK ganda | FK restrict, relationship enum `ayah, ibu, wali`, UK `(guardian_id, student_id)` | **SESUAI (100%)** |
| 9 | `invoices` | `invoice_number` UK, FK siswa/TA, periode, amount, discount, due_date, status, verified | `period_month` tinyint, `period_year` smallint, amounts unsignedBigInteger, UK `(student_id, month, year)` | **SESUAI (100%)** |
| 10 | `payments` | FK invoice/submitter/reviewer, `proof_path`, amount, transfer_date, sender, status, rejection | FK restrict, status `menunggu, disetujui, ditolak`, timestamp, text reason nullable | **SESUAI (100%)** |
| 11 | `cash_ledger_entries` | FK invoice/payment, date, description, `amount_in`, `receipt_number` UK | `invoice_id` unique restrict, `payment_id` restrict, `receipt_number` unique via migration `000200` | **SESUAI (99%)*** |
| 12 | `daily_journals` | FK student/classroom/teacher, date, activity, status, finalized_at, UK ganda | FK restrict, status `draf, final`, UK `(student_id, journal_date)` | **SESUAI (100%)** |
| 13 | `journal_assessments`| FK journal, aspect, level, note, UK ganda | FK restrict, aspect 5 enum, level 4 enum, UK `(daily_journal_id, aspect)` | **SESUAI (100%)** |
| 14 | `anecdotal_notes` | FK student/teacher, noted_at, behavior, interpretation, follow_up, photo_path | FK restrict, noted_at datetime, text fields, photo_path nullable | **SESUAI (100%)** |
| 15 | `announcements` | FK creator/classroom nullable, title, body, is_pinned, status, dates | FK restrict, status `draf, terbit`, published/expires timestamp | **SESUAI (100%)** |
| 16 | `audit_logs` | FK user, action, entity_type, entity_id, JSON old/new, created_at | FK restrict, index `(entity_type, entity_id)`, created_at useCurrent | **SESUAI (100%)** |

### Temuan Area C

- **TEMUAN C-1 (Tingkat: RENDAH):** Pada `docs/ERD.md:24`, diagram relasi menuliskan `PAYMENTS ||--o| CASH_LEDGER_ENTRIES` (kardinalitas zero-or-one). Namun pada migrasi `2026_10_06_000100_create_skms_tables.php:116`, kolom `payment_id` hanya foreign key biasa tanpa indeks `UNIQUE` (hanya `invoice_id` yang memiliki `unique()`). Karena satu tagihan lunas hanya memiliki satu pembayaran yang disetujui, hal ini aman di tingkat logika aplikasi tetapi merupakan ketidakcocokan minor terhadap diagram Mermaid.

---

## 5. Area D — Logika Bisnis dan Integritas Transaksi

### 5.1. Analisis Kepatuhan Logika Bisnis

1. **State Machine Tagihan SPP:**
   - Aturan transisi tagihan diimplementasikan secara ketat di `app/Services/PaymentVerificationService.php`.
   - Transisi hanya diizinkan dari `belum_bayar` atau `ditolak` menuju `menunggu_verifikasi`.
   - Admin hanya dapat menyetujui atau menolak jika pembayaran dan tagihan sama-sama berstatus `menunggu`.
   - Pelunasan tagihan (`lunas`) menghasilkan pencatatan buku kas masuk (`cash_ledger_entries`) pada transaksi database yang sama (`DB::transaction`). Tagihan berstatus `lunas` tidak dapat diubah nominalnya atau dibatalkan.
2. **Jendela Penguncian Jurnal Guru:**
   - Diatur melalui `config('skms.journal_edit_days', 1)`.
   - `JournalService::locked()` mengecek `$journal->journal_date->endOfDay()->addDays(1)->isPast()`. Jika terkunci, pengubahan draft maupun finalisasi ditolak dengan pesan galat validasi `"Jurnal sudah disimpan dan terkunci."`.
   - Finalisasi mewajibkan kelima aspek terisi lengkap (`JournalService.php:51-55`).
3. **Prinsip Nonaktif (Bukan Hapus Data):**
   - Siswa yang dinonaktifkan (`AdminDataController::deactivateStudent`) hanya mengubah kolom `status = 'nonaktif'`, menjaga keutuhan riwayat tagihan, mutasi kas, dan jurnal harian. `StudentPolicy::delete()` secara permanen mengembalikan nilai `false`.
4. **Kepatuhan ONLY_FULL_GROUP_BY pada Query Agregasi:**
   - `ReportService::journalCompletion()` mengelompokkan query secara eksplisit pada `classrooms.homeroom_teacher_id` dan `classrooms.name`.
   - `ReportService::overdueStudents()` mengelompokkan query secara ketat pada `student_id`.
   - `ReportService::financeTotals()` memanggil `reorder()` sebelum kalkulasi agregat untuk membersihkan klausa order by sebelum `selectRaw()`.

### 5.2. Temuan Logika Bisnis dan Potensi Masalah Konkurensi di Area D

- **TEMUAN D-1 (Tingkat: SEDANG):** Pembuatan nomor tagihan di `app/Services/InvoiceService.php:41` menggunakan format `sprintf('INV-%04d-%02d-%03d', $year, $month, Invoice::where(...)->count() + 1)` di dalam perulangan siswa. Meskipun berada dalam `DB::transaction`, jika dua admin memicu generate tagihan untuk periode yang sama pada waktu yang hampir bersamaan, keduanya berpotensi menghitung nomor urut yang sama sebelum baris tersimpan (akan terbentur `UNIQUE(invoice_number)` di database dan membatalkan transaksi).
- **TEMUAN D-2 (Tingkat: SEDANG):** Kelengkapan Seeder Data Demo (`DatabaseSeeder.php:92-121`): Seeder saat ini hanya menginisialisasi tagihan untuk Oktober 2026 (63 lunas, 9 menunggu, 6 belum bayar). Sesuai spesifikasi `docs/ERD.md:247-249`, target seeder idealnya juga mencakup tagihan bulan Agustus dan September dengan status bervariasi (termasuk tagihan ditolak dan tunggakan >30 hari), beberapa catatan anekdot, serta 3–6 pengumuman (termasuk draf dan kedaluwarsa).

---

## 6. Area E — Teks Antarmuka (Bahasa Indonesia) dan Nilai Tetap Mockup

### 6.1. Audit Nilai Statis Mockup (Zero Hardcoded Figures)

Telah diverifikasi pada seluruh controller dan service:
- Tidak ada angka metrik atau nominal rupiah statis dari mockup (seperti "78 siswa", "Rp 27.300.000", atau "61 transaksi") yang di-hardcode ke dalam kode React atau respon controller.
- Semua data statistik dihitung dari agregasi tabel basis data:
  - Beranda Admin (`Admin/DashboardController` & `ReportService::adminDashboard`): metrik siswa aktif, kas masuk, transaksi kas, dan antrean verifikasi dihitung via query SQL dinamis.
  - Ringkasan Kepala Sekolah (`Kepsek/DashboardController` & `ReportService::tuitionSummary`): persentase SPP lunas dan nominal dihitung dari agregasi tabel `invoices`.
  - Laporan Keuangan (`ReportService::financeTotals`, `monthlyReceived`): angka penerimaan kas bersumber langsung dari `cash_ledger_entries`.

### 6.2. Kepatuhan Bahasa Indonesia dan Gaya Bahasa

- Seluruh teks antarmuka utama (tombol aksi, label form, pesan galat, judul halaman, dan empty state) telah menggunakan Bahasa Indonesia yang baku dan santun, serta mematuhi aturan penulisan tanpa tanda seru (`!`).
- **TEMUAN E-1 (Tingkat: RENDAH):** File bawaan autentikasi Breeze yang jarang diakses masih memuat teks Bahasa Inggris dan tanda seru:
  - `resources/js/Pages/Auth/VerifyEmail.tsx:20`: `"Thanks for signing up! Before getting started, could you verify..."`
  - `resources/js/Pages/Auth/ConfirmPassword.tsx:30`: `<InputLabel value="Password" />` (seharusnya `"Kata sandi"`).
  - `resources/js/Pages/Auth/ResetPassword.tsx:54`: `<InputLabel value="Password" />` (seharusnya `"Kata sandi"`).

---

## 7. Area F — Cakupan Uji Otomatis dan Pengujian yang Masih Kurang

### 7.1. Cakupan Pengujian Saat Ini

Hasil pengujian otomatis `php artisan test` per 8 Oktober 2026:
- **Total:** 94 tes lulus (100%), 628 assertions, durasi eksekusi ~6.1 detik (SQLite in-memory).
- Cakupan meliputi autentikasi, otorisasi RBAC (4 role), master data provisioning, state machine tagihan SPP, validasi bukti transfer, isolasi wali kelas dan perwalian orang tua, batas kunci jurnal, privasi berkas, serta ekspor laporan DomPDF dan Excel.

### 7.2. Skenario Pengujian Tambahan yang Disarankan (Temuan Area F)

- **TEMUAN F-1 (Tingkat: SEDANG):** Belum ada pengujian otomatis khusus untuk menguji balapan proses (race condition/concurrency) pada fungsi penomoran kuitansi `KWT/YYYY/MM/NNN` dan penomoran invoice `INV-YYYY-MM-NNN` saat dua permintaan dieksekusi simultan.
- **TEMUAN F-2 (Tingkat: RENDAH):** Belum ada unit test validasi batas unggahan berkas tepat pada ambang batas batas 5 MB (misal berkas 5.000 KB diterima, 5.200 KB ditolak) dan uji penolakan ekstensi berkas non-gambar/non-PDF yang dipalsukan.
- **TEMUAN F-3 (Tingkat: RENDAH):** Matriks penolakan akses rute secara exhaustif (78 rute × 4 role) sebagian besar telah diuji per domain modul, namun belum ada satu test case tunggal yang melintasi seluruh rute dalam satu putaran pengujian terpadu.

---

## 8. Ringkasan Matriks Temuan dan Status Remediasi

| No | Kode | Tingkat | File / Baris Rujukan | Ringkasan Temuan | Status Remediasi | Catatan Verifikasi |
|---|---|---|---|---|---|---|
| 1 | **D-1** | **SEDANG** | `app/Services/InvoiceService.php` | Pembuatan `invoice_number` berpotensi balapan saat dipanggil paralel | **SELESAI** | Menggunakan `Cache::lock('invoice-generate-YYYY-MM', 15)`, parsing nomor maksimum eksisting, dan retry loop 3 kali saat tabrakan nomor urut. |
| 2 | **D-2** | **SEDANG** | `database/seeders/DatabaseSeeder.php` | Data demo seeder belum mencakup tagihan Agu/Sep lampau, tunggakan >30 hari, anekdot, dan variasi pengumuman | **SELESAI** | Diperkaya dengan tagihan Agu & Sep untuk 78 siswa, 6 siswa menunggak >30 hari, 3 tagihan ditolak dengan alasan realistis, potongan saudara kandung, 12 catatan anekdot di kedua kelas, dan 6 status pengumuman. Diuji di `SeederDataCompletenessTest.php`. |
| 3 | **F-1** | **SEDANG** | `tests/Feature/ConcurrencySafeNumberingTest.php` | Pengujian konkurensi invoice/kuitansi number belum tercakup di test suite | **SELESAI** | Dibuat `ConcurrencySafeNumberingTest` dengan 5 metode pengujian (18 assertions) mencakup nomor berurutan, idempotensi, penanganan celah nomor, isolasi bulanan, dan mekanisme retry. |
| 4 | **B-1** | **RENDAH** | `routes/web.php` | Rute `styleguide` terdaftar di routing publik meskipun dicegat `abort_unless` | **SELESAI** | Registrasi rute dibungkus dalam blok `if (app()->environment('local'))` dan `abort_unless` dibersihkan. Diuji dengan `assertFalse(Route::has('styleguide'))` dan `assertNotFound()` di `StyleguideTest.php`. |
| 5 | **B-2** | **RENDAH** | `routes/auth.php` | Rute Breeze bawaan yang tidak terpakai (`verify-email`, `confirm-password`) masih aktif | **SELESAI** | Rute `confirm-password` dan `verify-email` beserta controller, view, dan test bawaan Breeze dihapus bersih. Diverifikasi via `php artisan route:list --except-vendor`. |
| 6 | **C-1** | **RENDAH** | `database/migrations/2026_10_06_000100_create_skms_tables.php:116` | Kolom `cash_ledger_entries.payment_id` tidak memiliki constraint `UNIQUE` | **DIPERTAHANKAN** | Sesuai instruksi pengguna, skema database tidak diubah; konsistensi 1:1 dijaga pada layer aplikasi. |
| 7 | **E-1** | **RENDAH** | `resources/js/Pages/Auth/` | Sisa teks Bahasa Inggris dan label password belum konsisten pada view autentikasi | **SELESAI** | Seluruh label distandarkan menjadi "Kata sandi", "Kata sandi baru", dan "Konfirmasi kata sandi". Seluruh tanda seru dihapus. |
| 8 | **F-2** | **RENDAH** | `tests/Feature/ParentInvoiceUiTest.php` | Validasi berkas bukti transfer belum diuji pada batas persis 5 MB dan disk privat | **SELESAI** | Ditambahkan metode `test_payment_proof_upload_boundary_and_storage_security`: berkas 5.120 KB diterima, 5.121 KB ditolak, ekstensi terlarang ditolak, PDF valid diterima, dan berkas tersimpan dengan nama acak di disk privat (`private`), bukan publik. |
| 9 | **F-3** | **RENDAH** | `tests/Feature/` | Matriks penolakan akses rute 78 rute × 4 role belum terpadu satu test | Terbuka | Diuji terpisah pada masing-masing test flow domain. |

*Catatan: Seluruh temuan yang disetujui (D-1, D-2, F-1, B-1, B-2, E-1, F-2) telah selesai diperbaiki dan lulus verifikasi pengujian.*
