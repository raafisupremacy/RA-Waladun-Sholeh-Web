# TASKS — Rencana Pengerjaan SKMS

Kerjakan berurutan. Centang saat selesai. Setiap milestone ditutup dengan: tes lulus, lint dan build lulus, demo kecil bisa dijalankan.

## M0. Fondasi proyek
- [x] Buat proyek Laravel 11, pasang Breeze (React + TypeScript), spatie/laravel-permission, DomPDF, Laravel Excel, shadcn/ui, Recharts
- [x] Atur `.env` (MySQL, zona waktu `Asia/Jakarta`, locale `id`)
- [x] Token desain dari `DESIGN.md` sebagai CSS variables dan tema Tailwind; pasang font (SF Pro stack, Inter fallback)
- [x] Komponen dasar: `StatusCapsule`, `BigNumber`, `Tile`, `ProgressSteps`, `ResponsiveTable`, `SegmentedControl`, `BottomSheet`, `ConfirmDialog`, `EmptyState`
- [x] Layout per role: `AdminLayout`, `TeacherLayout`, `PrincipalLayout`, `ParentLayout` (nav atas desktop, tab bar bawah mobile)
- [x] Pastikan mockup di `design/stitch/` terdaftar di `docs/MOCKUP-INDEX.md` sesuai pemetaan `docs/SCREEN-MAP.md`

## M1. Database dan seeder
- [x] Migration semua tabel di `docs/ERD.md` dengan FK, UNIQUE, indeks
- [x] Model, relasi, enum (PHP backed enums), factory
- [x] Seeder role dan akun demo; seeder data demo sesuai `docs/ERD.md` bagian 6
- [x] `php artisan migrate:fresh --seed` berjalan bersih

## M2. Autentikasi dan RBAC
- [x] Login (00), lupa kata sandi, logout; redirect sesuai role
- [x] Middleware `EnsurePasswordChanged` dan halaman ganti kata sandi (01)
- [x] Role middleware dan Policy dasar
- [x] Tes: tiap role hanya masuk ke area miliknya

## M3. Master data (Admin)
- [x] Beranda admin kerangka (02, data menyusul)
- [x] Data siswa (04) dan tambah siswa (05) dengan `AccountProvisioningService`
- [x] Data orang tua (06A) + reset kata sandi; data guru (06C, 06D)
- [x] Kelas dan penugasan (07): pindah kelas, ganti wali kelas
- [x] Tes: akun otomatis, email unik, orang tua dengan beberapa anak

## M4. Keuangan dan SPP
- [x] Generate tagihan massal dengan dialog konfirmasi (08), anti-ganda, ubah nominal
- [x] Orang tua: daftar tagihan (19), detail dan unggah bukti (20 A sampai D) dengan disk privat
- [x] `PaymentVerificationService` dan layar verifikasi (03), alasan tolak wajib
- [x] Buku kas otomatis saat lunas (09), ekspor PDF dan Excel
- [x] Audit log untuk transisi status
- [x] Tes: seluruh transisi state machine, transaksi lunas + ledger, orang tua tidak bisa mengakses tagihan anak lain

## M5. Jurnal dan anekdot
- [x] Beranda guru (12), input jurnal (13) dengan draf, final, kunci setelah jendela edit
- [x] Catatan anekdot (14), riwayat jurnal (15)
- [x] Orang tua: perkembangan anak (21) dan ganti anak
- [x] Tes: guru hanya kelasnya, orang tua hanya anaknya, jurnal terkunci

## M6. Pengumuman dan beranda orang tua
- [ ] Pengumuman admin (10) dengan target, sematkan, kedaluwarsa
- [ ] Beranda orang tua (23) dan profil (22)

## M7. Dashboard dan laporan
- [ ] Beranda admin lengkap (02)
- [ ] Dashboard kepala sekolah (16) dengan filter bulan dan tahun ajaran
- [ ] Laporan keuangan kepsek (17) dan admin (11) dengan ekspor
- [ ] Laporan evaluasi siswa (18) dengan ekspor PDF (rapor bayangan)

## M8. Penyempurnaan dan penyerahan
- [ ] Uji responsif 390 / 834 / 1440 px, versi mobile semua layar
- [ ] State kosong, galat, dan loading di semua layar
- [ ] Aksesibilitas: fokus, kontras, ukuran tap
- [ ] Opsional: notifikasi email, tampilan audit log, dark mode
- [ ] README (instalasi, akun demo, deploy), tes akhir, data demo final
- [ ] Dokumen capstone: use case, BPMN as-is dan to-be, ERD final, state diagram

## Prompt awal untuk Codex (salin per milestone)

**Mulai proyek:**
> Baca AGENTS.md, docs/PRD.md, docs/ERD.md, docs/ARCHITECTURE.md, docs/SCREEN-MAP.md, dan DESIGN.md. Ringkas pemahamanmu dalam 10 poin, lalu kerjakan hanya M0 dari docs/TASKS.md. Jangan mulai M1. Setelah selesai, jalankan lint dan build, lalu centang tugas yang selesai.

**M1:**
> Kerjakan M1 dari docs/TASKS.md. Buat migration persis sesuai docs/ERD.md (kolom, enum, UNIQUE, FK). Bila ada ketidakcocokan, tanyakan dulu. Buat seeder data demo sesuai docs/ERD.md bagian 6 dan pastikan `php artisan migrate:fresh --seed` berhasil.

**Layar dari mockup (pola umum):**
> Kerjakan layar 03 (Verifikasi pembayaran). Lihat `design/stitch/verifikasi_pembayaran_desktop/screen.png` dan `code.html`, pemetaan di `docs/MOCKUP-INDEX.md` serta `docs/SCREEN-MAP.md`, dan aturan transisi di `docs/ERD.md` bagian 4. Bangun controller tipis, service, policy, halaman React memakai komponen bersama, dan tes. Jangan menyalin HTML Stitch; bangun ulang sebagai komponen.

**Perbaikan tampilan:**
> Bandingkan halaman yang baru dibuat dengan screenshot di design/stitch/. Daftarkan perbedaan (tata letak, ukuran teks, warna, jarak) lalu perbaiki satu per satu. Patuhi DESIGN.md bagian 2 (visual weight rules).
