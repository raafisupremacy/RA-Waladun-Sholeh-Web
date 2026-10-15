# Peta Layar (Mockup → Route → Halaman → Data)

Keputusan pemilik D1–D5 berlaku untuk semua layar; lihat `docs/DECISIONS.md`. Kelas demo yang tersedia adalah A-1, A-2, B-1, dan B-2 dari data dinamis, bukan label tetap di komponen.

Mockup aktual disimpan di `design/stitch/` sebagai folder tanpa penggantian nama; setiap folder layar biasanya berisi `screen.png` dan `code.html`. Karena nama folder berasal dari sumber mockup, pemetaan ke ID layar, versi, dan kondisi dicatat di `docs/MOCKUP-INDEX.md`. Untuk layar dengan beberapa kondisi, gunakan satu ID layar dengan kondisi yang berbeda.

HTML dari Stitch hanya acuan visual dan struktur. Bangun ulang sebagai komponen React memakai komponen bersama (lihat `docs/ARCHITECTURE.md`).

## Umum

| ID | Layar | Route | Halaman Inertia | Data dan aksi |
|---|---|---|---|---|
| 00 | Login | `/login` | `Auth/Login` | Email, kata sandi; pesan galat "Email atau kata sandi tidak sesuai." |
| 01 | Ganti kata sandi pertama kali | `/ganti-kata-sandi` | `Auth/ForcePasswordChange` | Dipaksa saat `must_change_password`; checklist aturan (min 8 karakter, ada angka) |

## Admin / Tata Usaha

| ID | Layar | Route | Halaman Inertia | Data dan aksi |
|---|---|---|---|---|
| 02 | Beranda admin | `/admin` | `Admin/Dashboard` | Jumlah menunggu verifikasi, siswa aktif per kelas, masuk bulan ini, belum bayar, pengumuman aktif, 6 pembayaran terbaru |
| 03 | Verifikasi pembayaran | `/admin/verifikasi` | `Admin/Payments/Verification` | Antrean `payments.menunggu`; detail bukti, nominal tagihan vs transfer, selisih; setujui, tolak (alasan wajib); dialog tolak; state kosong |
| 04 | Data siswa | `/admin/siswa`, `/admin/siswa/{student}` | `Admin/Students/Index`, `Admin/StudentShow` | Cari (nama, NIS), filter kelas dan status, pagination, lihat rincian, ubah, nonaktifkan |
| 05 | Tambah siswa | `/admin/siswa/create` | `Admin/Students/Create` | Form siswa + orang tua (baru atau pilih yang sudah ada); validasi email unik; dialog "Akun berhasil dibuat" (kata sandi sementara sekali tampil) |
| 06A | Data orang tua | `/admin/orang-tua`, `/admin/orang-tua/{guardian}` | `Admin/Guardians/Index` | Daftar, ubah nama/HP/alamat/email, aktif/nonaktif, filter status akun, reset kata sandi (dialog 06B) |
| 06C | Data guru | `/admin/guru`, `/admin/guru/{teacher}` | `Admin/Teachers/Index` | Daftar guru, ubah nama/NIP/HP/email, aktif/nonaktif, drawer tambah guru (06D) dengan wali kelas opsional |
| 07 | Kelas dan penugasan | `/admin/kelas` | `Admin/Classrooms/Index` | Empat kelas (A-1, A-2, B-1, B-2), satu wali + hingga dua pendamping dari pivot `classroom_teacher`, pindahkan siswa (checkbox), dialog ganti wali kelas |
| 08 | Tagihan SPP | `/admin/tagihan` | `Admin/Invoices/Index` | Panel generate massal + dialog konfirmasi (jumlah dibuat dan dilewati); tabel tagihan, filter, ubah nominal, label terlambat |
| 09 | Buku kas | `/admin/buku-kas` | `Admin/CashLedger/Index` | Rentang tanggal, total, tabel ledger saldo berjalan, ekspor PDF dan Excel, hanya baca |
| 10 | Pengumuman | `/admin/pengumuman` | `Admin/Announcements/Index`, `Form` | Daftar, buat dan ubah, tujuan, sematkan, kedaluwarsa, pratinjau tampilan orang tua |
| 11 | Laporan | `/admin/laporan` | `Admin/Reports/Index` | Rekap penerimaan SPP, tunggakan, ringkasan per kelas; ekspor PDF dan Excel |

## Guru

| ID | Layar | Route | Halaman Inertia | Data dan aksi |
|---|---|---|---|---|
| 12 | Beranda guru | `/guru` | `Guru/Dashboard` | Kelas, tanggal, progres jurnal hari ini, daftar siswa (sudah atau belum diisi) |
| 13 | Input jurnal harian | `/guru/jurnal/{student}` | `Guru/Journals/Form` | 5 aspek x BB/MB/BSH/BSB + catatan, kegiatan hari ini, simpan draf dan final, simpan otomatis, navigasi siswa, kondisi terkunci |
| 14 | Catatan anekdot | `/guru/anekdot` | `Guru/Anecdotes/Index` | Pilih siswa, timeline, tambah dan ubah (drawer), foto opsional, state kosong |
| 15 | Riwayat jurnal | `/guru/riwayat` | `Guru/Journals/History` | Grid aspek x hari per siswa per bulan, panel detail hari |

## Kepala Sekolah (hanya baca)

| ID | Layar | Route | Halaman Inertia | Data dan aksi |
|---|---|---|---|---|
| 16 | Dashboard | `/kepsek` | `Kepsek/Dashboard` | % SPP lunas dan komposisi, tren enrollment aktif, keterisian jurnal final per guru (hari sekolah × siswa aktif), tunggakan >30 hari hanya belum_bayar/ditolak; filter bulan dan tahun ajaran |
| 17 | Laporan keuangan | `/kepsek/laporan-keuangan` | `Kepsek/FinanceReport` | Total diterima dan belum diterima, grafik bulanan, tabel, ekspor PDF dan Excel |
| 18 | Laporan evaluasi siswa | `/kepsek/laporan-evaluasi` | `Kepsek/StudentReport` | Pilih kelas dan siswa, pratinjau rapor bayangan (A4), ekspor PDF |

## Orang Tua

| ID | Layar | Route | Halaman Inertia | Data dan aksi |
|---|---|---|---|---|
| 23 | Beranda orang tua | `/ortu` | `Ortu/Dashboard` | Anak aktif + "Ganti anak", tagihan terbaru, pengumuman (disematkan dulu), jurnal terakhir |
| 19 | Daftar tagihan | `/ortu/tagihan` | `Ortu/Invoices/Index` | Filter tahun ajaran, daftar 4 status, state kosong |
| 20 | Detail tagihan (A belum bayar, B menunggu, C lunas, D ditolak) | `/ortu/tagihan/{invoice}` | `Ortu/Invoices/Show` | Satu halaman, empat kondisi berdasarkan status; rekening tujuan dari `school_settings`; unggah bukti; unduh bukti pembayaran; alasan penolakan |
| 21 | Perkembangan anak | `/ortu/perkembangan` | `Ortu/Development/Index` | Pilih anak dan bulan; tab jurnal dan anekdot; legenda BB/MB/BSH/BSB; unduh laporan |
| 22 | Profil | `/ortu/profil` | `Ortu/Profile` | Data hanya baca, daftar anak, ganti kata sandi, keluar |

## Catatan lintas layar

- **Navigasi** per role mengikuti `DESIGN.md` bagian 7: nav atas di desktop; bar atas + tab bar bawah di mobile (orang tua, guru, kepala sekolah); admin memakai menu sheet di mobile.
- **Kondisi wajib** yang ada di mockup: state kosong, galat validasi, dialog konfirmasi, status Ditolak beserta alasan, pemilih anak.
- **Mobile:** tabel menjadi daftar bertumpuk, dialog menjadi bottom sheet, tombol utama selebar layar.
- Bila mockup dan `docs/PRD.md` atau `docs/ERD.md` berbeda, tanyakan; jangan menebak.

## Kontrak data lintas layar

- Keterisian jurnal memakai weekday dikurangi tanggal JSON `school_settings.school_holidays`; untuk bulan berjalan berhenti pada hari ini. Dokumentasi/seeder lama yang menyebut 17 hari Oktober adalah ketidaksesuaian yang harus diselaraskan pada pekerjaan seeder, bukan angka UI.
- Laporan tunggakan layar 16, laporan admin/kepsek, PDF, dan Excel memakai query yang sama: invoice `belum_bayar` atau `ditolak`, jatuh tempo lebih dari 30 hari; `menunggu_verifikasi` tidak termasuk.
- Halaman publik boleh menerima `school_name`, `school_phone`, dan `school_address`; rekening bank tetap hanya untuk halaman terautentikasi yang memerlukannya.
- Guru wali dan pendamping yang ditugaskan dapat membaca/menulis jurnal dan anekdot kelas aktif. Ganti wali melepas guru lama sepenuhnya; akses historis baca/tulis tidak diberikan kembali secara otomatis.
