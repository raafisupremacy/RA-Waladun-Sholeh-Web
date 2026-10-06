# Arsitektur — SKMS

## 1. Stack

| Lapisan | Pilihan |
|---|---|
| Backend | Laravel 11, PHP 8.2+ |
| Frontend | Inertia.js + React (TypeScript), starter Laravel Breeze (React + TypeScript) |
| Styling | Tailwind CSS + shadcn/ui, token dari `DESIGN.md` sebagai CSS variables |
| Database | MySQL 8 |
| RBAC | spatie/laravel-permission |
| Grafik | Recharts |
| PDF dan Excel | barryvdh/laravel-dompdf, maatwebsite/excel |
| File | Disk privat Laravel (`storage/app/private`) untuk bukti bayar dan lampiran |
| Tes | Pest atau PHPUnit (feature test untuk RBAC dan alur SPP) |
| Lokal | Laragon (Windows) atau Herd (Mac) |

## 2. Struktur folder

```
app/
  Http/
    Controllers/
      Auth/
      Admin/          StudentController, GuardianController, TeacherController,
                      ClassroomController, InvoiceController, PaymentVerificationController,
                      CashLedgerController, AnnouncementController, ReportController
      Guru/           DashboardController, JournalController, AnecdotalNoteController, HistoryController
      Kepsek/         DashboardController, FinanceReportController, StudentReportController
      Ortu/           DashboardController, InvoiceController, DevelopmentController, ProfileController
    Middleware/       EnsurePasswordChanged, SetActiveChild
    Requests/         (Form Request per aksi)
  Models/
  Policies/           StudentPolicy, InvoicePolicy, PaymentPolicy, JournalPolicy, ...
  Services/           AccountProvisioningService, InvoiceService, PaymentVerificationService,
                      JournalService, ReportService, AnnouncementService
  Exports/            CashLedgerExport, FinanceReportExport
database/
  migrations/ seeders/ factories/
resources/js/
  Layouts/            AdminLayout, TeacherLayout, PrincipalLayout, ParentLayout (nav sesuai DESIGN.md)
  Components/         StatusCapsule, BigNumber, Tile, ProgressSteps, ResponsiveTable,
                      SegmentedControl, BottomSheet, ConfirmDialog, EmptyState, ChartTile
  Pages/
    Auth/ Admin/ Guru/ Kepsek/ Ortu/
  lib/                format.ts (rupiah, tanggal Indonesia), constants.ts
routes/               web.php (dikelompokkan per role)
tests/Feature/        Rbac/, Billing/, Journals/
design/stitch/        screenshot dan HTML acuan per layar
docs/                 PRD.md, ERD.md, ARCHITECTURE.md, SCREEN-MAP.md, TASKS.md
```

## 3. Routing (ringkas)

Semua route di belakang `auth` dan `EnsurePasswordChanged`; role middleware `role:admin`, dan seterusnya.

| Role | Prefix | Contoh route |
|---|---|---|
| Umum | `/` | `/login`, `/ganti-kata-sandi`, `/lupa-kata-sandi` |
| Admin | `/admin` | `/admin`, `/admin/siswa`, `/admin/siswa/create`, `/admin/orang-tua`, `/admin/guru`, `/admin/kelas`, `/admin/tagihan`, `/admin/verifikasi`, `/admin/buku-kas`, `/admin/pengumuman`, `/admin/laporan` |
| Guru | `/guru` | `/guru`, `/guru/jurnal/{student}`, `/guru/anekdot`, `/guru/riwayat` |
| Kepala Sekolah | `/kepsek` | `/kepsek`, `/kepsek/laporan-keuangan`, `/kepsek/laporan-evaluasi` |
| Orang Tua | `/ortu` | `/ortu`, `/ortu/tagihan`, `/ortu/tagihan/{invoice}`, `/ortu/perkembangan`, `/ortu/profil` |

Setelah login, pengguna diarahkan ke beranda sesuai rolenya. Orang tua dengan beberapa anak memakai parameter anak aktif (`?anak={student}` atau session), selalu divalidasi terhadap `guardian_student`.

## 4. Matriks hak akses (RBAC)

| Sumber daya dan aksi | Admin | Guru | Kepala Sekolah | Orang Tua |
|---|---|---|---|---|
| Siswa, orang tua, guru, kelas: CRUD | ya | tidak | tidak | tidak |
| Lihat siswa | semua | kelasnya | semua (baca) | anaknya |
| Reset kata sandi pengguna | ya | tidak | tidak | tidak |
| Generate tagihan, ubah nominal | ya | tidak | tidak | tidak |
| Lihat tagihan | semua | tidak | semua (baca) | anaknya |
| Unggah bukti bayar | tidak | tidak | tidak | anaknya |
| Setujui atau tolak pembayaran | ya | tidak | tidak | tidak |
| Buku kas | ya | tidak | baca | tidak |
| Jurnal harian: isi dan ubah | tidak | kelasnya | tidak | tidak |
| Jurnal dan anekdot: baca | baca | kelasnya | semua | anaknya |
| Catatan anekdot: isi dan ubah | tidak | kelasnya | tidak | tidak |
| Pengumuman: kelola | ya | tidak | tidak | tidak |
| Pengumuman: baca | ya | ya | ya | yang relevan |
| Dashboard analitik | ringkas | tidak | penuh | tidak |
| Ekspor laporan keuangan | ya | tidak | ya | tidak |
| Ekspor rapor bayangan | ya | tidak | ya | anaknya (unduh laporan) |
| Audit log | baca | tidak | baca | tidak |

Tegakkan lewat Policy dan query scope (misalnya `Student::visibleTo($user)`), bukan hanya menyembunyikan menu.

## 5. Komponen UI bersama

`StatusCapsule` (4 status tagihan, status siswa, status akun), `BigNumber`, `Tile`, `ProgressSteps` (Belum Bayar → Menunggu Verifikasi → Lunas), `ResponsiveTable` (tabel di desktop, daftar bertumpuk di mobile), `SegmentedControl`, `BottomSheet` (sheet di mobile, dialog di desktop), `ConfirmDialog`, `EmptyState`, `ChartTile`. Semua mengikuti token `DESIGN.md`.

## 6. Keputusan teknis

- **Tanpa API terpisah:** Inertia meneruskan data dari controller langsung ke halaman React.
- **File bukti bayar:** disimpan di disk privat dan diunduh lewat route yang dicek Policy.
- **Ekspor:** PDF dengan DomPDF (laporan keuangan, rapor bayangan), Excel dengan Laravel Excel.
- **Zona waktu:** `Asia/Jakarta`; format tanggal Indonesia (8 Okt 2026), rupiah `Rp 350.000`.
- **Notifikasi email:** opsional, dikerjakan setelah semua modul inti selesai (antrean `database` queue).
- **Deploy:** cukup VPS atau hosting PHP dengan MySQL; langkah deploy ditulis di `README.md` pada milestone terakhir.
