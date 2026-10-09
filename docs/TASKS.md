# TASKS — Rencana Pengerjaan SKMS

Kerjakan berurutan. Centang saat selesai. Setiap milestone ditutup dengan: tes lulus, lint dan build lulus, demo kecil bisa dijalankan.

Status Pengerjaan (merujuk pada batch `docs/HANDOFF.md`):
- Batch 1 (Integritas data dan RBAC): Selesai (16/16 butir terverifikasi)
- Batch 2 (Fondasi visual): Selesai (12/12 butir terverifikasi)
- Modul Keuangan (Admin & Ortu): Selesai (Batch 3A & 3B)
- Modul Guru & Perkembangan Anak: Selesai (Batch 3C)
- Modul Dashboard & Laporan: Selesai (Batch 3D)
- Modul Master Data, Pengumuman, Profil (Batch 3E): Selesai (Layar 04, 05, 06A–06D, 07, 10, 22 terverifikasi)
- Batch 4 (Penyempurnaan & Penyerahan): Selesai (Viewport modals & portals, sanitasi pagination, capstone doc, audit log UI, dan pengujian menyeluruh)

## Batch 2. Fondasi visual & Layout (Selesai)
- [x] Buat proyek Laravel 11, pasang Breeze (React + TypeScript), spatie/laravel-permission, DomPDF, Laravel Excel, shadcn/ui, Recharts
- [x] Atur `.env` (MySQL, zona waktu `Asia/Jakarta`, locale `id`)
- [x] Token desain dari `DESIGN.md` sebagai CSS variables dan tema Tailwind; pasang font (Inter variable)
- [x] Komponen dasar: `StatusCapsule`, `BigNumber`, `Tile`, `ProgressSteps` (titik/centang/cincin), `ResponsiveTable`, `SegmentedControl`, `BottomSheet`, `ConfirmDialog`, `EmptyState`
- [x] Layout per role: `AdminLayout`, `TeacherLayout`, `PrincipalLayout`, `ParentLayout` (nav atas desktop 44px, tab bar bawah mobile)
- [x] Pastikan mockup di `design/stitch/` terdaftar di `docs/MOCKUP-INDEX.md` sesuai pemetaan `docs/SCREEN-MAP.md`

## Batch 1. Integritas data, Database, dan RBAC (Selesai)
- [x] Migration semua tabel di `docs/ERD.md` dengan FK, UNIQUE, indeks (termasuk `entry_year` unsignedSmallInteger)
- [x] Model, relasi, enum (PHP backed enums), factory
- [x] Seeder role dan akun demo; seeder data demo sesuai `docs/ERD.md` bagian 6; proteksi sandi produksi acak
- [x] Login (00), lupa kata sandi, logout; redirect sesuai role; hapus rute mutasi profil Breeze
- [x] Middleware `EnsurePasswordChanged` global (termasuk `/` dan `/dashboard`) dan `EnsureActiveAccount`
- [x] Role middleware, isolasi homeroom guru dan perwalian orang tua, serta pengamanan props Inertia
- [x] Tes lengkap (97 passed, 909 assertions) dan konfigurasi pengujian `skms_test` terisolasi

## M3. Master data (Admin) (Batch 3E - Selesai)
- [x] Beranda admin kerangka (02, data menyusul)
- [x] Data siswa (04) dan tambah siswa (05) dengan `AccountProvisioningService`
- [x] Data orang tua (06A, 06B) + reset kata sandi; data guru (06C, 06D)
- [x] Penugasan guru ke kelas di Data Guru (/admin/guru) dengan aturan maksimal 3 guru per kelas (1 wali kelas utama + hingga 2 pendamping)
- [x] Kelas dan penugasan (07): pindah kelas, ganti wali kelas
- [x] Tes: akun otomatis, email unik, orang tua dengan beberapa anak, penugasan guru & batasan 3 guru per kelas

## M4. Keuangan dan SPP (Batch 3A & 3B - Selesai)
- [x] Generate tagihan massal dengan dialog konfirmasi (08), anti-ganda, ubah nominal
- [x] Orang tua: daftar tagihan (19), detail dan unggah bukti (20 A sampai D) dengan disk privat
  - Verifikasi UI 8 Oktober 2026: filter tahun ajaran dan anak aktif, empat kondisi detail, validasi berkas, pratinjau privat, dan kuitansi; bukti pemeriksaan di `docs/REVIEW-REPORT.md`.
- [x] `PaymentVerificationService` dan layar verifikasi (03), alasan tolak wajib
- [x] Buku kas otomatis saat lunas (09), ekspor PDF dan Excel
- [x] Audit log untuk transisi status
- [x] Tes: seluruh transisi state machine, transaksi lunas + ledger, orang tua tidak bisa mengakses tagihan anak lain

## M5. Jurnal dan anekdot (Batch 3C - Selesai)
- [x] Beranda guru (12), input jurnal (13) dengan draf, final, kunci setelah jendela edit
- [x] Catatan anekdot (14), riwayat jurnal (15)
- [x] Orang tua: perkembangan anak (21) dan ganti anak
- [x] Tes: guru hanya kelasnya, orang tua hanya anaknya, jurnal terkunci
  - Verifikasi UI & Test 8 Oktober 2026: Layar 12, 13, 14, 15, 21 dibangun sesuai Stitch & token DESIGN.md. 89 tes lulus (575 assertions). Route privat foto anekdot dilindungi policy.

## M6. Pengumuman dan beranda orang tua (Batch 3E - Selesai)
- [x] Pengumuman admin (10) dengan target, sematkan, kedaluwarsa, pratinjau orang tua, hapus
- [x] Beranda orang tua (23) dan profil (22)
  - Verifikasi UI & Test 8 Oktober 2026: Layar 04, 05, 06A–06D, 07, 10, 22 dibangun sesuai Stitch & DESIGN.md. 94 tes lulus (628 assertions). Pint, ESLint, dan Vite build sukses.

## M7. Dashboard dan laporan (Batch 3D - Selesai)
- [x] Beranda admin lengkap (02)
- [x] Dashboard kepala sekolah (16) dengan filter bulan dan tahun ajaran
- [x] Laporan keuangan kepsek (17) dan admin (11) dengan ekspor
- [x] Laporan evaluasi siswa (18) dengan ekspor PDF (rapor bayangan)
  - Verifikasi Batch 3D 8 Oktober 2026: Layar 02, 16, 17, 11, 18 selesai dibangun dan disesuaikan token DESIGN.md & Stitch mockup. Ekspor PDF & Excel admin/kepsek berfungsi dengan tag <a> standar. 91 tes lulus (611 assertions), Pint passed, TypeScript/ESLint passed, Vite build passed.

## M8. Penyempurnaan dan penyerahan (Batch 4 - Selesai)
- [x] Uji responsif 390 / 834 / 1440 px, adaptasi mobile untuk seluruh layar staf dan orang tua
- [x] State kosong, galat, dan loading di semua layar
- [x] Aksesibilitas: fokus 3px ring, kontras teks, ukuran tap minimum 44px pada layar sentuh
- [x] Tampilan audit log (`/admin/audit-log`) dengan visual inspection & diff, filter aksi, entitas, tanggal, dan RBAC policy ketat
- [ ] Opsional: notifikasi email, dark mode
- [x] Dokumen capstone: use case, BPMN as-is dan to-be, ERD final, state diagram (`docs/CAPSTONE.md`)

## Prompt awal untuk Codex (salin per milestone)

**Mulai proyek:**
> Baca AGENTS.md, docs/PRD.md, docs/ERD.md, docs/ARCHITECTURE.md, docs/SCREEN-MAP.md, dan DESIGN.md. Ringkas pemahamanmu dalam 10 poin, lalu kerjakan hanya M0 dari docs/TASKS.md. Jangan mulai M1. Setelah selesai, jalankan lint dan build, lalu centang tugas yang selesai.

**M1:**
> Kerjakan M1 dari docs/TASKS.md. Buat migration persis sesuai docs/ERD.md (kolom, enum, UNIQUE, FK). Bila ada ketidakcocokan, tanyakan dulu. Buat seeder data demo sesuai docs/ERD.md bagian 6 dan pastikan `php artisan migrate:fresh --seed` berhasil.

**Layar dari mockup (pola umum):**
> Kerjakan layar 03 (Verifikasi pembayaran). Lihat `design/stitch/verifikasi_pembayaran_desktop/screen.png` dan `code.html`, pemetaan di `docs/MOCKUP-INDEX.md` serta `docs/SCREEN-MAP.md`, dan aturan transisi di `docs/ERD.md` bagian 4. Bangun controller tipis, service, policy, halaman React memakai komponen bersama, dan tes. Jangan menyalin HTML Stitch; bangun ulang sebagai komponen.

**Perbaikan tampilan:**
> Bandingkan halaman yang baru dibuat dengan screenshot di design/stitch/. Daftarkan perbedaan (tata letak, ukuran teks, warna, jarak) lalu perbaiki satu per satu. Patuhi DESIGN.md bagian 2 (visual weight rules).


