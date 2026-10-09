# Laporan Review Kritis SKMS

Tanggal review: 7 Oktober 2026 (Asia/Jakarta)  
Reviewer: audit statis dan pemeriksaan lokal  
Batasan: review ini tidak mengubah kode, migration, konfigurasi, atau dokumen lain. File ini adalah satu-satunya artefak yang dibuat dan tidak ada commit.

## Kesimpulan eksekutif

Klaim checklist di `docs/TASKS.md` lebih tinggi daripada keadaan kode yang dapat diverifikasi. M0–M7 ditandai selesai, tetapi semuanya paling aman diklasifikasikan **sebagian** karena migrasi tidak dapat dijalankan, 24 dari 66 tes gagal, beberapa halaman masih berupa kerangka, dan ada cacat alur bisnis yang deterministik. M8 hanya sebagian item yang dicentang dan audit menemukan pekerjaan responsif/state yang belum selesai.

Temuan prioritas tinggi:

1. **P1 — Upload bukti tidak memindahkan invoice ke `menunggu_verifikasi`.** `app/Services/PaymentVerificationService.php:18-28` membuat `payments` berstatus `menunggu`, tetapi tidak mengubah invoice. `approve()` dan `reject()` di baris 37 dan 56 mensyaratkan invoice sudah `menunggu_verifikasi`; bukti baru tidak dapat diproses.
2. **P1 — Form keuangan utama belum dibangun.** Tidak ada GET `/admin/tagihan`; halaman verifikasi, daftar/detail tagihan orang tua, dan buku kas hanya tabel/teks minimal (`resources/js/Pages/Admin/PaymentVerification.tsx:4-5`, `Ortu/Invoices.tsx:4-5`, `Ortu/InvoiceDetail.tsx:3-4`, `Admin/CashLedger.tsx:4-5`).
3. **P1 — Persentase keterisian jurnal salah secara matematis.** `app/Services/ReportService.php:70-79` menghitung `COUNT(DISTINCT student_id)` sebagai `filled_days`, lalu membagi dengan `schoolDays * student_count`. Satu jurnal siswa pada satu hari menjadi satu pembilang, sehingga hasil tidak mewakili hari terisi.
4. **P1 — Guru yang diganti masih dapat mengubah catatan anekdot.** `app/Services/AnecdotalNoteService.php:21-28` hanya memeriksa `note.teacher_id`; tidak memeriksa enrollment kelas aktif/current homeroom.
5. **P1 — Profil Breeze masih dapat mengubah dan menghapus akun.** `routes/web.php` route `/profile` hanya `auth` + `EnsurePasswordChanged`, tanpa role. `ProfileController` masih menyediakan update nama/email dan DELETE, bertentangan dengan profil orang tua baca-saja dan akun yang dikelola admin.
6. **P1 — Jurnal final dapat difinalkan setelah siswa pindah.** `app/Services/JournalService.php:35-49` memeriksa kelas milik guru, tetapi tidak memvalidasi enrollment aktif siswa seperti `saveDraft()` di baris 18-19 dan 60-62.
7. **P1 — Target pengumuman `classroom` tanpa kelas menjadi pengumuman semua orang.** `app/Http/Controllers/Admin/AnnouncementController.php:69-79` menerima `classroom_id` nullable; `Announcement::scopeVisibleToStudent()` menganggap `null` global (`app/Models/Announcement.php:35-38`).

## 0. Lingkup berdasarkan checklist dan bukti

| Milestone | Centang TASKS | Status review | Bukti dan ketidakcocokan |
|---|---:|---|---|
| M0 | semua dicentang | Sebagian | Komponen/layout/CSS ada. `npm run build`, lint, dan TypeScript lulus, tetapi route `/styleguide` publik; tes gagal karena view cache path; verifikasi viewport tidak dapat dilakukan. |
| M1 | semua dicentang | Sebagian | Migration, enum, model, factory, seeder ada. `migrate:fresh --seed` gagal sebelum migrasi karena MySQL 127.0.0.1:3306 menolak koneksi; seed tidak memenuhi seluruh target ERD. |
| M2 | semua dicentang | Sebagian | Login/role/forced-password routes dan tes ada. `/profile`, verifikasi email, password confirmation, dan password update tidak memakai role; sebagian feature test gagal merender view. |
| M3 | semua dicentang | Sebagian | Service master data, route admin, dan tes ada. UI masih jauh dari mockup; pagination/empty state dan flow drawer tidak lengkap. |
| M4 | semua dicentang | Sebagian | Service/state machine dan sebagian tes ada, tetapi bug P1 upload invoice dan UI utama hilang. |
| M5 | semua dicentang | Sebagian | Journal/anecdote/development tersedia, tetapi bug scope/jendela edit, autosave, dan UI matriks belum sesuai. |
| M6 | semua dicentang | Sebagian | Announcement/parent home/profile tersedia, tetapi bug target classroom dan test suite gagal. |
| M7 | semua dicentang | Sebagian | ReportService, export, dan routes ada; rumus jurnal salah, filter/UI incomplete, route admin student report tidak ada. |
| M8 | hanya aksesibilitas, README/tes/data dicentang | Sebagian | Responsif/state dan dokumen capstone belum dicentang. Audit menemukan route styleguide publik, state/loading minim, dan bukti visual runtime tidak tersedia. |

Branch saat audit: `main` pada `9068d71` (`Seed M1 roles accounts and demo data`), sama dengan `origin/main`. Branch `local-full` berada di `ad35fc4` dan tidak sedang checkout. Working tree berisi perubahan lokal M2–M8; perubahan lokal tersebut tidak dianggap commit.

Output ringkas `git log --oneline` menunjukkan riwayat foundation/M0 sampai M1: `0706ed9 Document SKMS product and design foundation`, sepuluh commit M0 yang berakhir `d5a45d7 Add M0 styleguide and baseline tests`, lalu sepuluh commit M1 yang berakhir `9068d71 Seed M1 roles accounts and demo data`. `git branch -avv` menunjukkan `main` dan `origin/main` pada `9068d71`, serta `local-full` pada `ad35fc4`.

## 1. Pemeriksaan otomatis

| Perintah | Hasil aktual | Bukti/interpretasi |
|---|---|---|
| `php artisan migrate:fresh --seed` | Gagal | `SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it` untuk MySQL `127.0.0.1:3306/skms`. Skema dan seed tidak dapat diverifikasi di MySQL. |
| `php artisan test` | **42 lulus, 24 gagal, 0 dilewati, 165 assertions** | 24 kegagalan terutama `InvalidArgumentException: Please provide a valid cache path`; `storage/framework/views` tidak ada, hanya `storage/framework/testing`. Beberapa test juga gagal karena respons bukan Inertia response. |
| `./vendor/bin/pint --test` | exit 0, `{"tool":"pint","result":"passed"}` | Pemeriksaan eksplisit `php vendor/laravel/pint/builds/pint --test --dirty -v` gagal pada `ChangePasswordController.php`, `EnsurePasswordChanged.php`, `DailyJournalPolicy.php`, dan `InvoicePolicy.php`. |
| `npm run lint` | exit 0 | Script hanya menjalankan `tsc --noEmit`; tidak ada ESLint. |
| `npm run build` | exit 0 | `tsc && vite build`, Vite 6.4.3, 3519 modules; bundle app sekitar 362.67 KB dan dashboard sekitar 369.33 KB. Bundle Register/Welcome/Breeze masih ikut terbangun. |
| `npx tsc --noEmit` | exit 0 | TypeScript lulus. |
| `php artisan route:list --except-vendor` | exit 0, **75 routes** | Inventaris lengkap dan middleware dicatat pada bagian B. |
| `php artisan serve --host=127.0.0.1 --port=8011` lalu GET `/login` | timeout | Tidak ada screenshot runtime. Playwright tidak dipasang agar dependency/config tidak berubah. |

`APP_DEBUG` lokal bernilai `true` pada `.env` yang tidak terlacak. `.env` tidak tercatat di Git; `.env.example` tercatat. Nilai rahasia lokal tidak disalin ke laporan.

## 2. Audit tampilan

Mockup yang tersedia dibuka dengan `view_image` untuk login/error, ganti kata sandi, dashboard staff/orang tua, master data, keuangan, jurnal/anekdot, pengumuman, laporan, perkembangan, dan profil. Mayoritas hanya memiliki desktop; tidak ada mockup 834 px dan tidak ada mockup mobile untuk sebagian besar layar. Karena `/login` timeout dan view cache tidak tersedia, status di bawah adalah perbandingan struktur source terhadap mockup, bukan bukti screenshot runtime.

| ID | Desktop 1440 | Mobile 390 | Perbedaan konkret yang terverifikasi dari source/mockup |
|---|---|---|---|
| 00 Login | sebagian | sebagian | CSS dasar memuat Inter dan token (`resources/css/app.css:1,33-38`), tetapi runtime tidak dapat diverifikasi. `.auth-alert` disembunyikan pada mobile (`app.css:37,234`), sedangkan mockup mobile menampilkan pesan merah di bawah field. |
| 01 Ganti kata sandi | sebagian | tidak dapat diverifikasi | Mockup mobile tidak tersedia. Field temporary password di UI readonly kosong, sedangkan mockup menampilkan masked value; aturan 8 karakter/angka hanya sebagian terwakili. |
| 02 Beranda admin | sebagian | tidak dapat diverifikasi | Ada kerangka admin; ringkasan/pembayaran terbaru dan menu mockup belum lengkap. |
| 03 Verifikasi pembayaran | tidak | tidak dapat diverifikasi | `PaymentVerification.tsx:4-5` hanya tabel tiga kolom; tidak ada preview bukti, aksi setuju/tolak, dialog alasan, atau state kosong. |
| 04 Data siswa | sebagian | tidak dapat diverifikasi | Route/controller dan tabel ada, tetapi state/toolbar/filter/pagination serta daftar bertumpuk belum dapat dibandingkan runtime. |
| 05 Tambah siswa + dialog akun | sebagian | tidak dapat diverifikasi | Form/dialog provisioning ada, tetapi tidak ada bukti visual runtime; cetak kartu hanya CSS print. |
| 06A Data orang tua | sebagian | tidak dapat diverifikasi | Daftar/reset backend ada; filter status dan dialog mockup belum lengkap. |
| 06B Dialog reset | sebagian | tidak dapat diverifikasi | Route reset ada, tetapi dialog dan pesan sekali tampil tidak dapat diverifikasi. |
| 06C Data guru | sebagian | tidak dapat diverifikasi | Data route ada; tabel/drawer masih minimal dibanding mockup. |
| 06D Drawer guru | sebagian | tidak dapat diverifikasi | Drawer native ada, tetapi validasi/preview tidak terverifikasi. |
| 07 Kelas/penugasan | sebagian | tidak dapat diverifikasi | Backend bulk move/replace ada; tile kelas, checkbox, dan peringatan mockup tidak terverifikasi. |
| 08 Tagihan SPP | tidak | tidak dapat diverifikasi | Route list hanya `POST /admin/tagihan/generate`; tidak ada GET halaman admin tagihan meskipun layout menautkannya. |
| 09 Buku kas | sebagian | tidak dapat diverifikasi | `CashLedger.tsx:4-5` hanya tanggal/keterangan/masuk; tidak ada total, saldo berjalan, rentang tanggal, export UI. |
| 10 Pengumuman | sebagian | tidak dapat diverifikasi | List/form/preview route ada, tetapi UI list tidak menampilkan pagination links dan target kelas tidak wajib. |
| 11 Laporan admin | sebagian | tidak dapat diverifikasi | Route/export ada; UI hanya filter sederhana dan tabel, tanpa tab rekap/tunggakan/ringkasan kelas. |
| 12 Beranda guru | sebagian | tidak dapat diverifikasi | Kerangka/progress ada, tetapi filter semua/belum/sudah dan daftar siswa belum terbukti. |
| 13 Jurnal harian | sebagian | tidak dapat diverifikasi | Source memiliki draf/final/error; autosave tidak memiliki id dalam validasi controller, UI aspek/detail belum terverifikasi. |
| 14 Catatan anekdot | sebagian | tidak dapat diverifikasi | Service/list/drawer ada, tetapi foto privat, kosong, timeline, dan filter siswa belum setara mockup. |
| 15 Riwayat jurnal | sebagian | tidak dapat diverifikasi | Route ada, tetapi grid aspek × hari dan panel detail belum terbukti. |
| 16 Dashboard kepala sekolah | sebagian | tidak dapat diverifikasi | `Kepsek/Dashboard.tsx:6` memakai input ID tahun numerik, tiga tile identik, grafik bar; mockup meminta filter tahun ajaran dan grafik lebih kaya. |
| 17 Laporan keuangan kepsek | sebagian | tidak dapat diverifikasi | `FinanceReport.tsx:1-4` memiliki filter/status dan export, tetapi memakai `Link` Inertia untuk binary download dan UI rentang/grafik belum lengkap. |
| 18 Laporan evaluasi siswa | sebagian | tidak dapat diverifikasi | `StudentReport.tsx:3` tidak memiliki selector siswa/kelas/tahun; report perlu query manual. |
| 19 Daftar tagihan orang tua | sebagian | tidak dapat diverifikasi | `Ortu/Invoices.tsx:4-5` hanya tabel; tidak ada child switch/detail link/pagination UI/status capsule. |
| 20A Belum bayar | tidak | tidak dapat diverifikasi | `InvoiceDetail.tsx:3-4` hanya heading/nominal/status; tidak ada rekening, upload, progress, label terlambat. |
| 20B Menunggu verifikasi | tidak | tidak dapat diverifikasi | Tidak ada kondisi detail berbeda selain teks status generik. |
| 20C Lunas | tidak | tidak dapat diverifikasi | Tidak ada kuitansi/paid_at/receipt download pada halaman detail. |
| 20D Ditolak | tidak | tidak dapat diverifikasi | Hanya pesan generik unggah ulang; alasan penolakan tidak ditampilkan. |
| 21 Perkembangan anak | sebagian | tidak dapat diverifikasi | `Development.tsx:7` hanya jumlah aspek, legenda tanpa definisi, tanpa tab/selector bulan sesuai mockup; tombol laporan ada. |
| 22 Profil orang tua | sebagian | tidak dapat diverifikasi | Halaman read-only ada, tetapi route `/profile` Breeze tetap dapat mengubah/menghapus akun. |
| 23 Beranda orang tua | sebagian | sebagian | Dashboard dan session child context ada. Dua varian mockup visual bertentangan (Apple style vs kartu); belum ada keputusan varian utama. |

Temuan visual lintas halaman:

- `app.css:42` memberi global nav 52 px, sedangkan DESIGN.md meminta bilah atas 44 px.
- `app.css:54` memakai padding horizontal 20 px pada semua ukuran; mockup desktop memakai ruang sekitar 48 px.
- `app.css:68,70` memakai tile 28 px dan BigNumber 56 px; mockup desktop memakai tile 40–48 px dan angka utama hingga 72 px.
- `app.css:77` segmented-control hanya 36 px, di bawah tap target 44 px.
- `app.css:80` warna progress text `#86868B` pada putih berkontras rendah.
- `app.css:91` tombol penutup sheet tidak diberi ukuran minimum; `app.css:131` dialog native 520 px, sementara mockup sekitar 480 px.
- RoleLayout memakai label role, bukan dropdown/nama pengguna; tab bar mobile memotong `items.slice(0,4)` dan tidak memberi active state/icon yang sama dengan mockup.
- StatusCapsule hanya memiliki kelas invoice/active; level BB/MB/BSH/BSB belum memiliki set style lengkap.

### Audit tampilan — verifikasi ulang 8 Oktober 2026

Perubahan fondasi visual diverifikasi dengan `npm run shots` pada server lokal `http://127.0.0.1:8012`. Hasil: **114 PNG, 0 halaman gagal**, mencakup 1440, 834, dan 390 px untuk empat role. Mockup yang dibuka sebelum perubahan: `design/stitch/login_desktop/screen.png`, `login_mobile/screen.png`, `ganti_kata_sandi_desktop/screen.png`, `beranda_admin_desktop/screen.png`, `beranda_orang_tua_desktop_apple_style/screen.png`, dan `beranda_orang_tua_mobile_apple_style/screen.png`.

| Layar | Desktop | Mobile | Bukti/perbedaan tersisa |
|---|---|---|---|
| 00 Login | sebagian besar sesuai | sebagian besar sesuai | Inter termuat dari `@fontsource-variable/inter`; form, tombol pill, alert, dan padding responsif sesuai. Mockup mobile memiliki avatar header; implementasi memakai ikon Lucide dengan ukuran berbeda. |
| 01 Ganti kata sandi | sebagian besar sesuai | sebagian | Desktop sesuai struktur dan hierarki; mockup mobile khusus tidak tersedia di indeks, sehingga perbandingan mobile langsung tidak dapat diverifikasi. |
| 02 Beranda admin | sebagian besar sesuai | sebagian besar sesuai | Hero, bento metrics, tabel responsif, menu sheet admin, dan footer terlihat pada screenshot. Nominal tile dapat membungkus berbeda pada lebar sempit karena panjang angka database. |
| 23 Beranda orang tua | sebagian besar sesuai | sebagian besar sesuai | Varian Apple style dipakai: hero, tile SPP biru, progress, jurnal, pengumuman, dan child switcher. Pada screenshot full-page, tab bar mobile tetap fixed sehingga dapat melintas di tengah kartu jurnal saat viewport berada di posisi tersebut; ini perilaku fixed navigation, bukan scroll horizontal. |

Perbaikan global yang terverifikasi di source: nav desktop 44 px, padding kontainer 48/32/20 px, tile 28/20 px, big number 72/48 px, font Inter, status level BB/MB/BSH/BSB, tap target minimum 44/48 px, dialog 480 px, admin menu sheet, ikon tab bar, dan `StatusCapsule` case-insensitive. `scripts/shots.mjs` kini memperlakukan redirect `/` ke `/login` sebagai sukses, tidak menguji route `/styleguide` dan `/profile` yang memang dibatasi/dihapus, serta mengambil ID jurnal dari `student.id`.

Sisa yang tidak dapat diverifikasi: mockup mobile untuk admin dan ganti kata sandi tidak tersedia; mockup tablet 834 px untuk empat layar target juga tidak tersedia. Build berjalan lulus dengan `npm run build` pada shell yang diberi akses Vite; eksekusi tanpa izin tersebut mendapat error sandbox `Access is denied` saat esbuild membaca `vite.config.js`.

### Audit layar keuangan — verifikasi ulang 8 Oktober 2026

Mockup `tagihan_spp_desktop`, `konfirmasi_generate_tagihan_modal_desktop`, `verifikasi_pembayaran_desktop`, dan `buku_kas_desktop` dibuka langsung. `npm run shots` menghasilkan 117 PNG tanpa halaman gagal pada 1440, 834, dan 390 px. Ketiga route memiliki halaman Inertia, filter/form, state kosong, pagination, akses RBAC, dan layout finance responsif. CSS finance terbaru menata generator menjadi grid, antrean/detail verifikasi menjadi dua panel lalu vertikal di mobile, dan buku kas menjadi hero + tabel + total row. Perbedaan tersisa: mockup mobile resmi untuk ketiga layar tidak tersedia; preview bukti pada data demo tanpa file privat menampilkan 404 yang benar; detail verifikasi mobile mengikuti alur vertikal; dan data demo memakai tanggal/nominal seeder sehingga tidak identik dengan angka contoh mockup.

#### Bukti verifikasi terbaru

| Pemeriksaan | Hasil |
|---|---|
| `php artisan test` | 80 passed, 434 assertions |
| `./vendor/bin/pint --test` | lulus |
| `npm run lint` | lulus (TypeScript + ESLint) |
| `npm run build` | lulus |
| `npm run shots` | 117 screenshots, 0 halaman gagal |

Screenshot finance yang diperiksa ulang: `storage/app/shots/admin/1440/admin_tagihan.png`, `admin_verifikasi.png`, `admin_buku-kas.png` dan pasangan 390 px. Tidak ada mockup mobile khusus di `docs/MOCKUP-INDEX.md`, sehingga kecocokan mobile dinilai terhadap aturan responsif `DESIGN.md`.
- Route `/styleguide` selalu publik (`routes/web.php` route-list), sehingga halaman sementara dapat diakses produksi.
- `Auth/Register.tsx` dan `Welcome.tsx` masih ikut build. Route registrasi publik memang tidak ada, tetapi sisa halaman bawaan menambah permukaan dan bundle.

## 3. B. Keamanan dan RBAC

### Pembaruan audit tagihan orang tua — 8 Oktober 2026

Implementasi layar 19 dan 20 tidak lagi berupa kerangka. `Ortu/InvoiceController.php` memakai `ParentStudentContext`, filter tahun ajaran, urutan periode menurun, ringkasan sebelum pagination, dan array eksplisit. Detail membawa kelas, alasan penolakan, waktu, nama verifikator, dan nomor kuitansi tanpa path penyimpanan atau ID pengguna pembayaran. Upload memanggil service yang sama; aturan state machine tidak diubah. Route bukti mendukung pratinjau inline dengan pemeriksaan kepemilikan yang sama dengan unduhan. Kartu beranda memakai nominal neto server dan tautan detail yang sama.

| Layar | Perbandingan pada 1440 dan 390 px | Perbedaan atau batasan |
|---|---|---|
| 19 | Hero, anak aktif, segmented tahun, kelompok baris putih di atas abu, capsule dan tautan detail diperiksa langsung | Jumlah/isi tagihan mengikuti database; tidak menyalin empat baris contoh mockup |
| 20A | Hero 56/34, angka 72/48, rekening, pilihan kamera/galeri, catatan, dua tile/satu kolom | Catatan memakai textarea; data bank fixture kosong ditampilkan sebagai tanda pisah |
| 20B | Pemberitahuan kuning, waktu diterima, bukti privat, tanpa form unggah | Bukti pada fixture visual sintetis; berkas demo yang hilang tidak dibuat-buat di database |
| 20C | Pemberitahuan hijau, metadata pembayaran, nomor kuitansi, tautan unduh PDF | Nama/tanggal memakai data aktual atau fixture; ProgressSteps bersama masih memakai angka, bukan ikon centang mockup |
| 20D | Alasan admin merah, unggah ulang, rincian di tile terpisah | Rekening tetap tersedia saat unggah ulang, sesuai permintaan form seperti A; mockup D menyembunyikannya |
| 23 | Nominal neto dan tautan detail sama dengan tagihan | Blok biru solid dipertahankan sesuai DESIGN.md bagian 9; mockup Apple desktop memakai biru muda |

Tidak tersedia mockup mobile khusus layar 19/20 dalam indeks; tampilan 390 mengikuti DESIGN.md. Screenshot halaman nyata ada di `storage/app/shots/ortu/{1440,834,390}`. Empat kondisi tambahan di `ortu-fixtures` memakai respons Inertia dari feature test SQLite in-memory pada kerangka HTML aplikasi lokal; ini validasi render, bukan transaksi E2E pada MySQL. Script tidak mengubah data transaksi demo. Kamera fisik/perizinan perangkat tidak dapat diverifikasi melalui Chromium desktop.

Verifikasi kode: `php artisan test` **85 lulus, 558 assertions**; `pint --test`, `npm run lint`, dan `npm run build` lulus. Build terakhir memerlukan izin sandbox untuk membaca konfigurasi Vite. Tes `ParentInvoiceUiTest` mencakup empat state, validasi tipe/ukuran berkas, duplikasi pending, unggah ulang, receipt hanya lunas dan milik anak, pemalsuan anak aktif, route privat, serta RBAC. Semua perubahan lokal; `.env`, migration, dan state machine tidak diubah.

Untuk mengulang render empat kondisi: jalankan `$env:SHOTS_PARENT_FIXTURES='1'; php artisan test --filter=ParentInvoiceUiTest`, lalu `npm run shots` dengan server lokal berjalan. Variabel ini hanya menghasilkan berkas fixture dari tes SQLite; hapus variabel setelah verifikasi. Tanpa variabel, skrip hanya mengambil halaman dari akun demo.

Hasil akhir screenshot: **126 gambar, 0 halaman gagal**, termasuk 12 render empat state pada 1440/834/390. Sebelumnya fixture gagal karena konfigurasi Ziggy dan perbedaan URL Inertia; kerangka HTML kini berasal dari server lokal dan pemeriksaan redirect dibedakan khusus untuk fixture. Pemeriksaan halaman demo tetap memvalidasi redirect seperti sebelumnya.

Semua 75 route memiliki middleware `web`. Area `admin/*`, `guru/*`, `kepsek/*`, dan `ortu/*` memakai `auth`, `EnsurePasswordChanged`, serta role masing-masing. `/dashboard` memakai keempat role. `/profile`, `/password`, `/confirm-password`, verifikasi email, dan `/logout` memakai `auth` + `EnsurePasswordChanged` tanpa role. Login/reset password/forgot password memakai guest middleware; `/` dan `/styleguide` hanya `web`.

Temuan:

- `/profile` DELETE/PATCH tersedia tanpa role; `ProfileController` mengizinkan update nama/email dan penghapusan.
- `EnsurePasswordChanged` tidak melindungi `/`, `/styleguide`, dan guest route, padahal aturan meminta semua route selain ganti password/logout dialihkan saat `must_change_password=true`.
- `ChangePasswordController.php:20-21` tidak memeriksa password saat ini untuk perubahan biasa.
- `PaymentVerificationService::submitProof()` tidak transaction, tidak mengubah state invoice, dan tidak menolak upload kedua setelah invoice tetap `belum_bayar`.
- Approve/reject memakai transaction tetapi tidak `lockForUpdate`; risiko konkurensi belum dapat direproduksi tanpa MySQL.
- `AnecdotalNoteService.php:21-28` hanya mencocokkan teacher ID; teacher yang kehilangan homeroom tetap dapat mengubah note lama.
- `JournalService.php:35-49` dan `DailyJournalPolicy.php` tidak memeriksa current enrollment saat finalize.
- `JournalController` tidak memvalidasi `id` pada save draft; autosave berulang dapat memukul unique `(student_id,journal_date)`. Level/aspect hanya divalidasi sebagai array.
- `InvoiceController.php:24` mengirim model invoice dengan payments dan field internal ke Inertia; `Payment` tidak menyembunyikan `proof_path` atau user IDs. `User::$hidden` menyembunyikan password (`app/Models/User.php:18`).
- `HandleInertiaRequests.php:47` membagikan semua school settings, termasuk rekening bank, pada halaman publik bila tabel tersedia.
- Proof upload divalidasi mimes dan 5 MB lalu disimpan random di disk private (`Ortu/InvoiceController.php:27-31`, service:24); download memeriksa policy/guardian (`PaymentProofController.php:12-17`). Browser proof tidak dapat diuji karena server timeout.
- `ParentStudentContext` membatasi child aktif melalui pivot guardian dan memvalidasi parameter; kontrol ini didukung test, tetapi tidak semua endpoint parent diuji.
- `Student::scopeVisibleTo()` membatasi role dan enrollment aktif (`app/Models/Student.php:46-57`), tetapi tidak semua controller memakainya.
- CSRF tetap aktif; login memiliki throttle lima percobaan dan inactive login ditolak. Sesi yang sudah aktif tidak diperiksa lagi setelah akun dinonaktifkan.
- Banyak controller memakai inline validation, bukan Form Request. Mass assignment memiliki `$fillable`, tetapi ini tidak membuktikan validasi lengkap.
- `.env` tidak terlacak; README deploy tidak menginstruksikan `APP_ENV=production` dan `APP_DEBUG=false`. Seed memakai password literal `password` untuk akun demo (`DatabaseSeeder.php:108-111`).

### Inventaris route dan middleware

`php artisan route:list --except-vendor -v` menghasilkan 75 route. Tabel berikut memuat setiap route; `web` dihilangkan dari kolom karena semuanya memilikinya.

| Method | URI | Name | Auth/guest | Role | EnsurePasswordChanged |
|---|---|---|---|---|---|

### Pemeriksaan IDOR, policy, dan cakupan test

- Invoice show/upload memakai `InvoicePolicy` dan guardian pivot; proof download mengulang pemeriksaan guardian. Tes `DomainFlowTest.php:80-83,185-197` mencakup invoice anak lain, guest, dan file private.
- Student development memakai `ParentStudentContext` dan test `JournalFlowTest.php:112`; report PDF parent memeriksa child sendiri vs anak lain (`MilestoneM7Test.php:63-64`).
- Tidak ada test yang menjalankan setiap parameter payment/invoice/report/export terhadap semua role, tidak ada test `/admin/tagihan` karena route memang tidak ada, dan tidak ada test upload yang memastikan invoice berubah ke `menunggu_verifikasi`.
- Guru/kepsek tidak dapat melewati role middleware, tetapi policy read-only kepsek/admin tidak lengkap untuk semua model; proteksi terutama berada di middleware.
- Admin tidak memiliki route tulis jurnal/anekdot; ini sesuai matriks, tetapi akses baca admin juga tidak tersedia sebagai route khusus.
- Tidak ada route serve foto anekdot; ini mencegah URL publik, tetapi juga berarti lampiran tidak dapat diunduh dari UI.
- Password temporary dibuat random di `AccountProvisioningService` dan hanya flash encrypted, tetapi expiry temporary password tidak diuji end-to-end.
- Tidak ada audit-log UI. Audit record dibuat pada beberapa service, tetapi invoice generation/discount update dan seluruh perubahan master tidak konsisten diaudit.

## 4. C. Database dan ERD

Perbandingan dilakukan terhadap `docs/ERD.md:34-179` dan migration `database/migrations/2026_10_06_000100_create_skms_tables.php:11-176`, ditambah migration receipt `database/migrations/2026_10_06_000200_add_receipt_number.php`.

| Area | Bukti | Temuan |
|---|---|---|
| `school_settings` | migration:11-16, ERD:182,245 | Key/value ada dan unique. Seeder mengisi `default_spp_amount='350000'`, sedangkan ERD menyatakan placeholder `[ISI: nominal SPP dalam rupiah]`; perbedaan ini tidak dijelaskan sebagai nilai lingkungan. |
| Users | Laravel users migration + `User.php:16-23` | Kolom domain `must_change_password`, `is_active`, `last_login_at` ada pada model/migration. Kolom Laravel bawaan tidak dirinci ERD, sehingga parity lengkap tidak dapat diverifikasi. |
| `academic_years` | migration:18-25 | name unique, dates, active index sesuai diagram. |
| `teachers`, `guardians` | migration:26-41 | user_id unique + restrict, NIP unique, relasi model ada. |
| `classrooms` | migration:42-51 | Unique `(academic_year_id,name)` dan `(academic_year_id,homeroom_teacher_id)` sesuai aturan. |
| `students` | migration:52-61, ERD:71-79 | gender/status enum sesuai. **ERD menyebut `entry_year` YEAR, migration memakai `unsignedSmallInteger`**. |
| `enrollments` | migration:62-70 | FK restrict, status enum, unique `(student_id,academic_year_id)` sesuai. |
| `guardian_student` | migration:71-79 | relationship enum, primary default false, unique pair sesuai. Pivot tidak meng-cast relationship ke backed enum pada model Guardian. |
| `invoices` | migration:80-97 | Integer rupiah dan unique/index utama sesuai. Tidak ada check `discount_amount <= amount`; service juga tidak memvalidasi diskon negatif/lebih besar. |
| `payments` | migration:98-112 | FK/status/metadata sesuai. Diagram menyiratkan payment → ledger 0..1, tetapi `payment_id` tidak unique dan model tidak memiliki relation cash ledger. |
| `cash_ledger_entries` | migration:113-121 + receipt migration | `invoice_id` unique, amount integer, receipt wajib/unique. `payment_id` tidak unique walau diagram menyiratkan satu ledger per payment. |
| `daily_journals` | migration:122-133 | unique student/date dan status enum sesuai. `activity_summary` non-null; nullable tidak dijelaskan ERD. |
| `journal_assessments` | migration:134-142 | aspect/level enum dan unique journal/aspect sesuai; kewajiban lima aspek hanya service, bukan DB. |
| `anecdotal_notes` | migration:143-153 | FK restrict, datetime/text/photo sesuai. |
| `announcements` | migration:154-165 | classroom nullable dan published/expired sesuai; target global direpresentasikan classroom null. |
| `audit_logs` | migration:166-176 | hanya `created_at`, tanpa `updated_at`; ERD aturan umum menyebut timestamps tetapi diagram audit hanya created_at, sehingga dokumen ambigu. |
| Infra Laravel/Spatie | migrations `0001_*`, permission migration | ERD menyebut tabel pendukung tetapi tidak menggambarkan seluruh kolom vendor; parity persis tidak dapat dilakukan hanya dari ERD. |

Migration/schema runtime tidak bisa diinspeksi karena MySQL tidak aktif. Risiko `ONLY_FULL_GROUP_BY` pada `ReportService::financeTotals()` (query memakai `latest('due_date')` sebelum aggregate) belum dapat dibuktikan tanpa menjalankan MySQL.

## 5. Business logic dan laporan

- `InvoiceService::generate()` (`app/Services/InvoiceService.php:13-30`) menghitung nomor invoice dengan `COUNT()+1` di dalam loop. Unique constraint mencegah duplikasi final, tetapi dua proses serentak dapat memilih nomor sama; tidak ada locking. Generate juga tidak membuat audit log.
- `InvoiceService::updateAmount()` (`:33-38`) hanya menolak `lunas`; tidak memeriksa discount non-negatif/nominal akhir non-negatif dan tidak mencatat audit.
- `PaymentVerificationService::receiptNumber()` (`:66-70`) memakai `count()+1`; unique constraint tidak menyelesaikan race condition.
- Seeder hanya membuat invoice Oktober: 63 lunas, 9 pending, 6 unpaid (`DatabaseSeeder.php:76-88`). Tidak ada invoice Agustus/September, rejected, atau overdue >30 hari seperti ERD:247. Jurnal menggunakan pseudo ratio (`:90-104`) dan semua level BSH, tanpa catatan anekdot. Hanya satu pengumuman (`:105`), bukan 3–6 dengan draf/kedaluwarsa.
- `ReportService::activeStudentTrend()` (`:49-62`) menghitung siswa yang saat ini aktif dengan `created_at` historis; siswa yang kemudian dinonaktifkan hilang dari bulan lampau. Controller dashboard memakai tahun sekarang dan tidak mengikat pilihan tahun ajaran.
- `ReportService::financeQuery()` (`:92-97`) memfilter `due_date`, bukan tanggal penerimaan ledger/payment. UI tidak membedakan arti rentang tanggal.
- `ReportService::monthlyReceived()` mengagregasi seluruh ledger di PHP dan tampak tidak dipakai, berlawanan dengan permintaan agregasi database efisien.
- `ReportService::overdueStudents()` memakai enrollment pertama (`enrollments->first()`) untuk label kelas, bukan enrollment aktif/tahun terpilih.

## 6. Test coverage yang masih kurang

Test yang ada mencakup role redirect, inactive login, forced password, master account provisioning, sebagian state payment, private proof, announcement visibility, parent child session, dan ringkasan tuition. Bukti file: `tests/Feature/Auth/RoleAccessTest.php`, `MasterDataTest.php`, `DomainFlowTest.php`, `JournalFlowTest.php`, `MilestoneM6Test.php`, `MilestoneM7Test.php`.

Tidak ada atau belum terbukti:

- E2E visual pada 390/834/1440 dan screenshot per screen.
- Test submit proof yang memastikan invoice menjadi pending, rejected dapat upload ulang, dan dua upload tidak menghasilkan state rusak.
- Test concurrency/locking untuk approve/reject dan receipt number.
- Test guru yang diganti kehilangan hak tulis anecdote/journal setelah replacement.
- Test journal finalize setelah enrollment pindah, duplicate autosave, invalid enum level, dan finalisasi tepat batas waktu.
- Test setiap route policy/scope, export/report IDOR, announcement target/edit, private anecdote photo, school_settings prop leakage, dan active-session invalidation.
- Test seed target ERD (Agu/Sep, rejected, overdue, anecdotes, 3–6 announcements).
- Test mobile/tablet layout dan accessibility contrast/tap target; `npm run lint` adalah type checking saja.
- Test suite belum menjadi green gate karena 24 test gagal sebelum render akibat missing `storage/framework/views`.

## 7. Batasan audit dan item tidak dapat diverifikasi

- MySQL/XAMPP tidak aktif; schema constraints, seed count, dan perilaku SQL khusus MySQL tidak dapat diverifikasi.
- Server `/login` timeout; tidak ada browser screenshot pada 1440/834/390. Playwright tidak dipasang agar dependency tidak berubah. Status visual adalah perbandingan source/mockup saja.
- Tidak ada mockup mobile/tablet untuk sebagian besar layar; exact mobile fidelity tidak dapat dinilai dari referensi.
- Prompt ERD bagian C terpotong setelah “UNIQUE pada”; persyaratan yang tidak terlihat tidak diasumsikan.
- Item opsional M8 (email notification, audit-log page, dark mode) tidak diperlakukan sebagai target karena TASKS masih unchecked.

## 8. Prioritas remediasi

1. Perbaiki transisi invoice pada `submitProof()` dan tambah test state machine sebelum payment verification dipakai.
2. Hapus atau role-protect route mutasi profil Breeze; tegakkan password-change middleware pada semua halaman authenticated; batasi shared school settings dari guest.
3. Koreksi agregasi keterisian jurnal, current-enrollment check, dan scope anecdote.
4. Tambahkan halaman admin invoice dan lengkapi UI payment/detail/cash-ledger/report sebelum M4/M7 dinyatakan selesai.
5. Jadikan classroom target wajib dan tambah test visibility kelompok A/B.
6. Buat `storage/framework/views` pada bootstrap/deploy, perbaiki empat file yang gagal Pint dirty, lalu ulangi suite dengan MySQL.
7. Selaraskan `entry_year`, cardinality payment-ledger, dan data seed dengan ERD final; baru sesuaikan checklist setelah bukti runtime/visual tersedia.
| GET\|HEAD | <code>/</code> | <code></code> | tidak | — | tidak |
| GET\|HEAD | <code>admin</code> | <code>admin.home</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/buku-kas</code> | <code>admin.cash-ledger</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/buku-kas/excel</code> | <code>admin.cash-ledger.excel</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/buku-kas/pdf</code> | <code>admin.cash-ledger.pdf</code> | ya | admin | ya |
| POST | <code>admin/guru</code> | <code>admin.teachers.store</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/guru</code> | <code>admin.teachers</code> | ya | admin | ya |
| POST | <code>admin/guru/{teacher}/reset-kata-sandi</code> | <code>admin.teachers.reset</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/kelas</code> | <code>admin.classrooms</code> | ya | admin | ya |
| POST | <code>admin/kelas/{classroom}/siswa</code> | <code>admin.classrooms.move</code> | ya | admin | ya |
| POST | <code>admin/kelas/{classroom}/wali</code> | <code>admin.classrooms.teacher</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/laporan</code> | <code>admin.reports</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/laporan/excel</code> | <code>admin.reports.excel</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/laporan/pdf</code> | <code>admin.reports.pdf</code> | ya | admin | ya |
| POST | <code>admin/orang-tua</code> | <code>admin.guardians.store</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/orang-tua</code> | <code>admin.guardians</code> | ya | admin | ya |
| POST | <code>admin/orang-tua/{guardian}/reset-kata-sandi</code> | <code>admin.guardians.reset</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/pengumuman</code> | <code>admin.announcements</code> | ya | admin | ya |
| POST | <code>admin/pengumuman</code> | <code>admin.announcements.store</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/pengumuman/create</code> | <code>admin.announcements.create</code> | ya | admin | ya |
| PUT | <code>admin/pengumuman/{announcement}</code> | <code>admin.announcements.update</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/pengumuman/{announcement}/edit</code> | <code>admin.announcements.edit</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/siswa</code> | <code>admin.students</code> | ya | admin | ya |
| POST | <code>admin/siswa</code> | <code>admin.students.store</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/siswa/create</code> | <code>admin.students.create</code> | ya | admin | ya |
| POST | <code>admin/siswa/{student}/nonaktifkan</code> | <code>admin.students.deactivate</code> | ya | admin | ya |
| POST | <code>admin/siswa/{student}/pindah</code> | <code>admin.students.move</code> | ya | admin | ya |
| POST | <code>admin/tagihan/generate</code> | <code>admin.invoices.generate</code> | ya | admin | ya |
| GET\|HEAD | <code>admin/verifikasi</code> | <code>admin.payments.index</code> | ya | admin | ya |
| POST | <code>admin/verifikasi/{payment}/setujui</code> | <code>admin.payments.approve</code> | ya | admin | ya |
| POST | <code>admin/verifikasi/{payment}/tolak</code> | <code>admin.payments.reject</code> | ya | admin | ya |
| GET\|HEAD | <code>confirm-password</code> | <code>password.confirm</code> | ya | — | ya |
| POST | <code>confirm-password</code> | <code></code> | ya | — | ya |
| GET\|HEAD | <code>dashboard</code> | <code>dashboard</code> | ya | admin|guru|kepala_sekolah|orang_tua | ya |
| POST | <code>email/verification-notification</code> | <code>verification.send</code> | ya | — | ya |
| GET\|HEAD | <code>forgot-password</code> | <code>password.request</code> | guest | — | tidak |
| POST | <code>forgot-password</code> | <code>password.email</code> | guest | — | tidak |
| GET\|HEAD | <code>ganti-kata-sandi</code> | <code>password.change</code> | ya | — | ya |
| PUT | <code>ganti-kata-sandi</code> | <code>password.change.update</code> | ya | — | ya |
| GET\|HEAD | <code>guru</code> | <code>guru.home</code> | ya | guru | ya |
| GET\|HEAD | <code>guru/anekdot</code> | <code>guru.anecdotes</code> | ya | guru | ya |
| POST | <code>guru/anekdot</code> | <code>guru.anecdotes.store</code> | ya | guru | ya |
| PUT | <code>guru/anekdot/{note}</code> | <code>guru.anecdotes.update</code> | ya | guru | ya |
| GET\|HEAD | <code>guru/jurnal</code> | <code>guru.journals</code> | ya | guru | ya |
| POST | <code>guru/jurnal</code> | <code>guru.journals.store</code> | ya | guru | ya |
| POST | <code>guru/jurnal/{journal}/final</code> | <code>guru.journals.finalize</code> | ya | guru | ya |
| GET\|HEAD | <code>guru/jurnal/{student}</code> | <code>guru.journals.show</code> | ya | guru | ya |
| GET\|HEAD | <code>guru/riwayat</code> | <code>guru.journals.history</code> | ya | guru | ya |
| GET\|HEAD | <code>kepsek</code> | <code>kepsek.home</code> | ya | kepala_sekolah | ya |
| GET\|HEAD | <code>kepsek/laporan-evaluasi</code> | <code>principal.student-report</code> | ya | kepala_sekolah | ya |
| GET\|HEAD | <code>kepsek/laporan-evaluasi/pdf</code> | <code>principal.student-report.pdf</code> | ya | kepala_sekolah | ya |
| GET\|HEAD | <code>kepsek/laporan-keuangan</code> | <code>principal.finance</code> | ya | kepala_sekolah | ya |
| GET\|HEAD | <code>kepsek/laporan-keuangan/excel</code> | <code>principal.finance.excel</code> | ya | kepala_sekolah | ya |
| GET\|HEAD | <code>kepsek/laporan-keuangan/pdf</code> | <code>principal.finance.pdf</code> | ya | kepala_sekolah | ya |
| GET\|HEAD | <code>login</code> | <code>login</code> | guest | — | tidak |
| POST | <code>login</code> | <code></code> | guest | — | tidak |
| POST | <code>logout</code> | <code>logout</code> | ya | — | ya |
| GET\|HEAD | <code>ortu</code> | <code>ortu.home</code> | ya | orang_tua | ya |
| GET\|HEAD | <code>ortu/pembayaran/{payment}/bukti</code> | <code>ortu.payments.proof</code> | ya | orang_tua | ya |
| GET\|HEAD | <code>ortu/perkembangan</code> | <code>ortu.development</code> | ya | orang_tua | ya |
| GET\|HEAD | <code>ortu/perkembangan/{student}/laporan</code> | <code>ortu.student-report.pdf</code> | ya | orang_tua | ya |
| GET\|HEAD | <code>ortu/profil</code> | <code>ortu.profile</code> | ya | orang_tua | ya |
| GET\|HEAD | <code>ortu/tagihan</code> | <code>ortu.invoices</code> | ya | orang_tua | ya |
| GET\|HEAD | <code>ortu/tagihan/{invoice}</code> | <code>ortu.invoices.show</code> | ya | orang_tua | ya |
| POST | <code>ortu/tagihan/{invoice}/bukti</code> | <code>ortu.invoices.upload</code> | ya | orang_tua | ya |
| GET\|HEAD | <code>ortu/tagihan/{invoice}/kuitansi</code> | <code>ortu.invoices.receipt</code> | ya | orang_tua | ya |
| PUT | <code>password</code> | <code>password.update</code> | ya | — | ya |
| GET\|HEAD | <code>profile</code> | <code>profile.edit</code> | ya | — | ya |
| PATCH | <code>profile</code> | <code>profile.update</code> | ya | — | ya |
| DELETE | <code>profile</code> | <code>profile.destroy</code> | ya | — | ya |
| POST | <code>reset-password</code> | <code>password.store</code> | guest | — | tidak |
| GET\|HEAD | <code>reset-password/{token}</code> | <code>password.reset</code> | guest | — | tidak |
| GET\|HEAD | <code>styleguide</code> | <code>styleguide</code> | tidak | — | tidak |
| GET\|HEAD | <code>verify-email</code> | <code>verification.notice</code> | ya | — | ya |
| GET\|HEAD | <code>verify-email/{id}/{hash}</code> | <code>verification.verify</code> | ya | — | ya |

## Batch perbaikan keamanan

| Temuan | Status | Bukti |
|---|---|---|
| Submit bukti dan transisi invoice | selesai | `SecurityFixesTest` menguji lock, status menunggu, audit, dan unggah ganda |
| Approve/reject dan ledger atomik | selesai | `DomainFlowTest` menguji state sah/tidak sah dan rollback constraint |
| Wali kelas aktif untuk jurnal/anekdot | selesai | `SecurityFixesTest` menguji guru pengganti kehilangan akses tulis |
| Password pertama kali, akun aktif, dan root redirect | selesai | regresi autentikasi lulus |
| Route profil/register Breeze dan styleguide produksi | selesai | `/profile` 404, registrasi tidak tersedia, styleguide hanya local |
| Props Inertia sensitif | selesai | invoice/payment/jurnal/anekdot dipetakan ke array eksplisit |
| Seeder produksi dan query agregasi | selesai | password produksi acak; `financeTotals()` memakai `reorder()` |

Verifikasi akhir: `php artisan test` **72 lulus, 322 assertion**; Pint, lint, dan build lulus. Migrasi/seeder hanya dijalankan pada SQLite terisolasi. `skms_test` belum tersedia sehingga `composer test:mysql` dilewati.

## Batasan

Locking bersamaan dan kompatibilitas runtime MySQL belum dapat diverifikasi sampai administrator membuat database terpisah dengan:

```sql
CREATE DATABASE skms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Setelah itu jalankan `composer test:mysql`.

## Verifikasi Batch 3C — Modul Guru & Perkembangan Anak (8 Oktober 2026)

### 1. Ruang Lingkup dan Status Layar

| ID | Layar | Rute | Desktop 1440 | Tablet 834 | Mobile 390 | Status |
|---|---|---|---|---|---|---|
| 12 | Beranda Guru | `/guru` | Sesuai | Sesuai | Sesuai | Selesai |
| 13 | Input Jurnal Harian | `/guru/jurnal/{student}` | Sesuai | Sesuai | Sesuai | Selesai |
| 14 | Catatan Anekdot | `/guru/anekdot` | Sesuai | Sesuai | Sesuai | Selesai |
| 15 | Riwayat Jurnal | `/guru/riwayat` | Sesuai | Sesuai | Sesuai | Selesai |
| 21 | Perkembangan Anak (Ortu) | `/ortu/perkembangan` | Sesuai | Sesuai | Sesuai | Selesai |

### 2. Audit Visual dan Perbandingan Mockup

- **Layar 12 (Beranda Guru):**
  - Mengikuti mockup `design/stitch/beranda_guru_desktop` dan `design/stitch/beranda_guru_mobile`.
  - Header memuat nama kelas dan tanggal hari ini dari sistem.
  - Progres keterisian "N dari M siswa terisi" dengan progress bar proporsional.
  - Segmented control menyaring daftar siswa ("Semua", "Belum diisi", "Sudah diisi") secara responsif dan interaktif.
  - Daftar siswa tertata 2 kolom pada desktop (1440px) & tablet (834px), dan 1 kolom bertumpuk pada mobile (390px). Setiap kartu memuat avatar inisial, nama lengkap, NIS, capsule status (`Sudah diisi` hijau / `Belum diisi` netral), dan tautan aksi "Isi jurnal >".
- **Layar 13 (Input Jurnal Harian):**
  - Mengikuti mockup `design/stitch/input_jurnal_harian_desktop` dan `design/stitch/input_jurnal_harian_mobile`.
  - Header siswa, NIS, pemilih tanggal kalender, serta tombol navigasi rotasi siswa ("Sebelumnya" dan "Berikutnya").
  - Form kegiatan hari ini diikuti oleh 5 panel aspek perkembangan (Nilai Agama dan Budi Pekerti, Jati Diri, Literasi dan STEAM, Fisik Motorik, Kognitif dan Bahasa).
  - Setiap aspek memiliki segmented control level (BB, MB, BSH, BSB) dan textarea catatan observasi.
  - Autosave debounced (1500ms) dengan status "Tersimpan otomatis HH.mm".
  - Bar aksi sticky di bagian bawah halaman; pada mobile diposisikan `bottom-[64px]` tepat di atas tab bar mobile.
  - Validasi ketat saat "Simpan jurnal": jika belum lengkap 5 aspek, kartu aspek yang belum diisi mendapat outline merah dengan pesan galat spesifik ("Pilih penilaian untuk aspek ...").
  - Status terkunci aktif jika jurnal sudah disimpan dan melewati batas jendela edit.
- **Layar 14 (Catatan Anekdot):**
  - Mengikuti mockup `design/stitch/catatan_anekdot_desktop`.
  - Layout dua panel: daftar siswa kelas dengan input pencarian realtime di panel kiri, dan timeline catatan anekdot di panel utama.
  - Form tambah/ubah catatan dibuka melalui slide-over drawer (desktop/tablet) dan bottom sheet dengan grabber (mobile).
  - Mengakomodasi input tanggal, waktu observasi, perilaku teramati, interpretasi, dan tindak lanjut.
  - Unggah foto lampiran opsional (gambar, maks 5 MB, nama acak) disimpan ke storage privat (`private/anecdotes`) dan disajikan melalui endpoint terotorisasi `GET /anekdot/{note}/foto` dengan header `X-Content-Type-Options: nosniff`.
  - Empty state ramah: "Belum ada catatan untuk {nama}."
- **Layar 15 (Riwayat Jurnal):**
  - Mengikuti mockup `design/stitch/riwayat_jurnal_desktop`.
  - Filter lengkap: dropdown siswa, bulan/tahun ajaran, dan aspek penilaian.
  - Ringkasan metrik "Hari terisi N dari M hari sekolah".
  - Matriks interaktif 5 aspek × tanggal sekolah aktif: sel terisi menampilkan capsule level (BB, MB, BSH, BSB), sel kosong menampilkan strip (`–`).
  - Klik sel tanggal membuka slide drawer detail jurnal hari tersebut dengan tautan langsung "Ubah jurnal hari ini >".
  - Responsif: pada mobile 390px, grid bergeser secara mulus dengan scroll horizontal.
- **Layar 21 (Perkembangan Anak - Ortu):**
  - Mengikuti mockup `design/stitch/perkembangan_anak_desktop` dan `design/stitch/perkembangan_anak_mobile`.
  - Banner informasi anak aktif, kelas, wali kelas, dan dialog ganti anak (jika memiliki multi-anak).
  - Navigasi bulan (sebelumnya/berikutnya) dan switch tab antara "Jurnal harian" dan "Catatan anekdot".
  - Menampilkan ringkasan harian kegiatan, capsule 5 aspek, dan catatan guru.
  - Tautan "Apa arti BB, MB, BSH, BSB?" membuka modal/sheet definisi lengkap standar perkembangan.
  - Tampilan catatan anekdot memuat foto lampiran dengan popup pembesar foto.
  - Strictly read-only: tidak ada kontrol modifikasi guru yang bocor ke orang tua. Tombol "Unduh laporan" dipertahankan untuk Batch 3D.

### 3. Keamanan, Otorisasi (RBAC), dan Uji Otomatis

- `AnecdotalNotePolicy` didaftarkan dan diuji:
  - Guru hanya dapat melihat, menambah, dan mengubah catatan untuk siswa di kelas binaan aktif (`homeroom`).
  - Guru pengganti yang tidak lagi mengajar kelas tersebut ditolak (403).
  - Orang tua hanya dapat melihat catatan anak yang berada dalam perwaliannya.
  - Admin dan Kepala Sekolah berstatus baca-saja (`view` diizinkan, mutasi ditolak).
  - Akses berkas foto privat `GET /anekdot/{note}/foto` mewajibkan otorisasi via policy; tamu dan pengguna tidak berhak diblokir (401/403).
- `JournalFlowTest.php` diperluas:
  - Autosave draft bersifat idempoten dan tidak menimbulkan duplikasi baris.
  - Validasi kelengkapan 5 aspek sebelum status final.
  - Akses orang tua ke rute perkembangan anak lain ditolak (403).
  - Akses baca-saja admin dan kepsek terverifikasi.
- **Hasil Pengujian Akhir:**
  - `php artisan test`: **89 passed, 575 assertions** (SQLite in-memory).
  - `./vendor/bin/pint --test`: lulus.
  - `npm run lint`: lulus (`tsc --noEmit` & ESLint 0 errors, 0 warnings).
  - `npm run build`: lulus (Vite 6.4.3).
  - `npm run shots`: **114 screenshot runtime berhasil diambil** pada 1440px, 834px, dan 390px tanpa galat.

## Verifikasi Batch 3D — Modul Dashboard & Laporan (8 Oktober 2026)

### 1. Ruang Lingkup dan Status Layar

| ID | Layar | Rute | Desktop 1440 | Tablet 834 | Mobile 390 | Status |
|---|---|---|---|---|---|---|
| 02 | Beranda Admin | `/admin` | Sesuai | Sesuai | Sesuai | Selesai |
| 16 | Ringkasan Kepala Sekolah | `/kepsek` | Sesuai | Sesuai | Sesuai | Selesai |
| 17 | Laporan Keuangan Kepsek | `/kepsek/laporan-keuangan` | Sesuai | Sesuai | Sesuai | Selesai |
| 11 | Laporan Keuangan Admin | `/admin/laporan` | Sesuai | Sesuai | Sesuai | Selesai |
| 18 | Laporan Evaluasi Siswa | `/kepsek/laporan-evaluasi` | Sesuai | Sesuai | Sesuai | Selesai |
| 21 | Unduh Rapor Perkembangan Ortu | `/ortu/perkembangan/{student}/laporan` | Sesuai | Sesuai | Sesuai | Selesai |

### 2. Audit Visual dan Perbandingan Mockup

- **Layar 02 (Beranda Admin):**
  - Mengikuti mockup `design/stitch/beranda_admin_desktop/screen.png`.
  - Hero metrik pembayaran menunggu verifikasi dengan angka besar (BigNumber 72px), keterangan waktu masuk terakhir, dan tombol cepat "Periksa antrean >" ke `/admin/verifikasi`.
  - 4 Bento summary tiles:
    1. Siswa aktif dengan rincian kelas per kelompok (Kelompok A dan B).
    2. Kas masuk bulan ini beserta jumlah transaksi cash ledger.
    3. Tagihan belum bayar bulan berjalan dengan link langsung ke `/admin/tagihan`.
    4. Pengumuman aktif dengan daftar 2 pengumuman terbaru dan link ke `/admin/pengumuman`.
  - Tabel "Pembayaran terbaru" dengan ResponsiveTable (desktop tabel, mobile kartu bertumpuk) memuat avatar/inisial, nama siswa, bulan tagihan, nominal rupiah, capsule status, waktu upload, dan aksi cepat.
- **Layar 16 (Ringkasan Kepala Sekolah):**
  - Mengikuti mockup `design/stitch/ringkasan_kepala_sekolah_desktop/screen.png`.
  - Filter interaktif: dropdown bulan kalender dan select tahun ajaran riil dari database (menggantikan numeric input sebelumnya).
  - Hero persentase SPP lunas (BigNumber) dilengkapi stacked horizontal bar (hijau `#34C759` untuk lunas, oranye `#FF9500` untuk menunggu, merah `#FF3B30` untuk belum bayar) dan legenda 3 status memuat jumlah siswa dan nominal rupiah aktual.
  - 2 Tile analisis tengah:
    1. Tren siswa aktif: LineChart Recharts palet biru `#0071E3`, label langsung di atas titik, bersih tanpa clutter.
    2. Keterisian jurnal per guru: Horizontal progress bars terhitung dari formula rata-rata jurnal harian terisi dibagi siswa kelas, dengan badge persentase dan teks "N dari M".
  - Tile lebar bawah: Tabel siswa menunggak lebih dari 30 hari memuat nama, kelas, daftar bulan tertunggak berurutan, nominal tunggakan, capsule merah, dan footer total nominal tunggakan.
- **Layar 17 (Laporan Keuangan Kepsek):**
  - Mengikuti mockup `design/stitch/laporan_keuangan_desktop/screen.png`.
  - Toolbar filter lengkap: rentang tanggal (start & end date), tahun ajaran, kelas, dan status pembayaran.
  - Kartu hero ringkasan kas: nominal diterima (hijau) dan belum diterima (merah).
  - Visualisasi penerimaan 4 bulan terakhir dengan BarChart Recharts warna biru `#0071E3` dan label nominal rupiah di atas tiap bar.
  - Tabel rincian transaksi berpaginasi rapi.
  - Tombol ekspor PDF (`/kepsek/laporan-keuangan/pdf`) dan Excel (`/kepsek/laporan-keuangan/excel`) menggunakan elemen `<a>` standar (bukan Inertia Link) untuk memastikan unduhan file biner berjalan mulus.
- **Layar 11 (Laporan Keuangan Admin):**
  - Mengikuti mockup `design/stitch/laporan_desktop/screen.png`.
  - Segmented control 3 tab:
    1. "Rekap penerimaan SPP": tabel transaksi, paginasi, ringkasan kas masuk, ekspor PDF/Excel tab-rekap.
    2. "Tunggakan": tabel daftar siswa menunggak >30 hari beserta rincian bulan tunggakan dan total footer, ekspor PDF/Excel tunggakan.
    3. "Ringkasan per kelas": rekapitulasi performa per kelas (jumlah siswa, lunas, belum bayar, kas diterima, sisa piutang, dan persentase capaian target), ekspor PDF/Excel ringkasan kelas.
  - Semua tombol ekspor PDF dan Excel memakai link `<a>` standar.
- **Layar 18 (Laporan Evaluasi Siswa - Kepsek):**
  - Mengikuti mockup `design/stitch/laporan_evaluasi_siswa_desktop/screen.png`.
  - Filter hierarkis: pemilih tahun ajaran, pemilih kelas, pemilih siswa, dan pemilih semester (Semester 1 / Semester 2).
  - Tampilan Pratinjau Rapor A4:
    - Kop sekolah resmi bersumber dari `school_settings`.
    - Identitas siswa (Nama, NIS, Kelas, Semester, Tahun Ajaran).
    - Ringkasan distribusi penilaian 5 aspek perkembangan (Nilai Agama & Budi Pekerti, Jati Diri, Literasi & STEAM, Fisik Motorik, Kognitif & Bahasa) dengan level BB, MB, BSH, BSB dan narasi capaian perkembangan.
    - Catatan anekdot terpilih selama periode berjalan.
    - Kolom tanda tangan wali kelas dan kepala sekolah berimbang.
  - Tombol "Unduh PDF" mengunduh file PDF rapor A4 bersih menggunakan DomPDF.
- **Layar 21 (Perkembangan Anak - Ortu):**
  - Tombol "Unduh laporan" diaktifkan mengarah ke `/ortu/perkembangan/{student}/laporan`.
  - Dilindungi middleware `ParentStudentContext`: orang tua hanya dapat mengunduh rapor anak sendiri (akses ID siswa lain diblokir dengan status HTTP 403).

### 3. Integritas Data, Agregasi SQL, dan Keamanan

- **Kepatuhan ONLY_FULL_GROUP_BY:**
  - `journalCompletion()` di `ReportService.php`: query agregasi mengelompokkan secara ketat pada `classrooms.homeroom_teacher_id` dan `classrooms.name`.
  - `overdueStudents()` di `ReportService.php`: query mengelompokkan pada `student_id` dan menghitung `SUM()`, `MIN(due_date)`, serta menggabungkan bulan tertunggak di tingkat aplikasi.
  - `financeTotals()` dan `classSummaryReport()`: query agregasi database tanpa field non-agregasi liar.
- **Zero Hardcoded Data:**
  - Seluruh angka metrik, persentase ketercapaian, daftar transaksi, dan tunggakan dihitung murni dari database.
- **RBAC & Security:**
  - Route `/kepsek/*` dilindungi middleware role `kepala_sekolah`. Guru ditolak (403).
  - Route `/admin/laporan*` dilindungi middleware role `admin`. Guru dan peran lain ditolak (403).
  - Unduhan rapor siswa orang tua di `/ortu/perkembangan/{student}/laporan` menguji kepemilikan siswa; akses anak orang lain menghasilkan 403.
  - DomPDF menggunakan layout tabel HTML bersih tanpa CSS flexbox agar rendering A4 bebas glitch.

### 4. Hasil Pengujian dan Kualitas Kode

- `php artisan test`: **91 passed, 611 assertions** (100% lulus di SQLite in-memory).
- `./vendor/bin/pint --test`: lulus tanpa catatan.
- `npm run lint`: lulus (`tsc --noEmit` & ESLint tanpa warning atau error).
- `npm run build`: lulus (Vite v6.4.3, 3513 modul ter-bundle sempurna).

---

## 9. Audit Master Data, Pengumuman, dan Profil Orang Tua (Batch 3E — 8 Oktober 2026)

### 1. Mockup yang Diinspeksi
Mockup Stitch desktop diinspeksi secara langsung sebelum dan sesudah implementasi:
- `data_siswa_desktop/screen.png`
- `tambah_siswa_desktop/screen.png`
- `akun_berhasil_dibuat_modal_desktop/screen.png`
- `data_orang_tua_desktop/screen.png`
- `konfirmasi_reset_kata_sandi_modal_desktop/screen.png`
- `data_guru_desktop/screen.png`
- `tambah_guru_drawer_desktop/screen.png`
- `data_kelas_desktop/screen.png`
- `ganti_wali_kelas_modal_desktop/screen.png`
- `daftar_pengumuman_desktop/screen.png`
- `buat_pengumuman_desktop/screen.png`
- `profil_orang_tua_desktop/screen.png`

### 2. Implementasi dan Keselarasan Visual

- **Layar 04 Data Siswa (`/admin/siswa`):**
  - Header data dengan subnav master data (Siswa, Orang Tua, Guru, Kelas) dan tombol "Tambah siswa".
  - Bilah pencarian (nama atau NIS), SegmentedControl Kelas dinamis dan Status (Semua, Aktif, Nonaktif).
  - Tabel desktop dengan avatar inisial (lingkaran biru/abu), NIS monospace, nama kelas, Orang Tua / Wali dengan hubungan e.g. `(Ibu)` / `(Ayah)`, nomor telepon, `StatusCapsule` aktif/nonaktif.
  - Aksi: tautan "Lihat" dan "Ubah" (membuka modal detail profil siswa lengkap), menu "•••" pada siswa aktif yang menampilkan opsi "Nonaktifkan".
  - Dialog konfirmasi nonaktifkan siswa (`ConfirmDialog`) dengan penjelasan riwayat tersimpan, memicu POST `/admin/siswa/{student}/nonaktifkan`.
  - State kosong jika pencarian tidak ditemukan dengan teks penjelas dan tombol aksi "Hapus pencarian".
  - Paginasi rapi dengan label "Menampilkan N–M dari T siswa".
  - Tampilan mobile responsif: tabel beralih menjadi daftar kartu bertumpuk dengan badge kelas, status, data wali, dan aksi.

- **Layar 05 Tambah Siswa (`/admin/siswa/create`):**
  - Form berpusat dengan lebar tetap 640px (`max-w-[640px] mx-auto`) dibagi menjadi 2 bagian: "Data siswa" dan "Data orang tua".
  - Data Siswa: Nama lengkap, NIS, Tahun masuk, Tanggal lahir, Kelas dengan rentang usia, SegmentedControl Jenis Kelamin (Laki-laki / Perempuan).
  - Data Orang Tua: Switch toggle "Orang tua sudah terdaftar" untuk kasus kakak-adik.
    - Jika switch aktif: pencarian dan seleksi akun orang tua terdaftar.
    - Jika switch nonaktif: field Hubungan (Ayah, Ibu, Wali), Nama orang tua, No. HP, Email dengan galat validasi inline `"Email sudah dipakai akun lain."`, Alamat tinggal, serta catatan akun otomatis.
  - Bilah aksi simpan menempel di bagian bawah (sticky bottom bar) dengan tombol "Batal" dan "Simpan".
  - Dialog "Akun berhasil dibuat" (`AccountCreatedDialog`): modal solid putih di tengah layar dengan backdrop datar, menampilkan Email dan Kata Sandi Sementara (font-mono tracking-wider) masing-masing dengan tombol "Salin", catatan "Kata sandi ini hanya ditampilkan sekali", tombol "Cetak kartu akun" (dengan layout `@media print` terisolasi), dan tombol "Selesai". Kata sandi terhapus dari sesi seketika (`session()->pull()`) dan tidak dapat ditampilkan kembali setelah dialog ditutup.

- **Layar 06A & 06B Data Orang Tua (`/admin/orang-tua`):**
  - Bilah pencarian nama/email/nama anak dan filter SegmentedControl status akun (Semua, Aktif, Belum pernah masuk, Nonaktif).
  - Kolom anak menampilkan nama anak beserta kelasnya, misalnya `Dimas Pratama (A)`, `Bilqis Humaira (B)`, atau beberapa anak dipisahkan koma.
  - Kolom status akun: kapsul hijau untuk "Aktif", kapsul amber untuk "Belum pernah masuk", dan abu-abu untuk "Nonaktif".
  - Aksi "Reset kata sandi" memunculkan modal konfirmasi solid putih berlatar datar (`konfirmasi_reset_kata_sandi_modal_desktop`), yang saat dikonfirmasi mereset sandi dan memunculkan `AccountCreatedDialog` dengan kredensial sementara baru.

- **Layar 06C & 06D Data Guru (`/admin/guru`):**
  - Tabel dengan kolom tanpa wrap (`whitespace-nowrap`): Nama, NIP, Email, No. HP, Wali kelas, Status akun, Aksi.
  - Tombol "Tambah guru" membuka drawer samping kanan berlatar solid putih (`bg-white`, 100% tidak transparan) dengan field Nama lengkap, NIP, Email, No. HP, opsi Wali kelas (opsional), peringatan amber jika kelas dipilih, dan catatan akun otomatis.
  - Dialog konfirmasi reset kata sandi guru yang solid dan aman.

- **Layar 07 Kelas & Penugasan (`/admin/kelas`):**
  - Layout 2 kolom (grid 2 tile kelompok rombel aktif) sesuai mockup Stitch.
  - Setiap tile memiliki header kelas & rentang usia, baris wali kelas dengan tombol "Ganti", angka utama 72px (`hero-num`) jumlah siswa, dan daftar siswa ber-checkbox dengan avatar inisial dan NIS.
  - Footer tile dengan toggle "Lihat semua siswa ›" / "Tampilkan ringkas".
  - Floating pill bar melayang di bawah tengah ketika ada siswa dipilih: "N siswa dipilih", tautan "Batal pilihan", dan tombol "Pindahkan ke {kelompok tujuan}".
  - Dialog "Ganti wali kelas" (`ganti_wali_kelas_modal_desktop`): modal solid putih berisi pemilih pendidik pengganti, wali kelas saat ini, kotak peringatan amber "Guru lama tidak lagi bisa mengisi jurnal kelas ini.", tombol Batal dan Simpan.

- **Layar 10 Pengumuman (`/admin/pengumuman` & Form):**
  - Daftar Pengumuman: judul, StatusCapsule (Terbit / Draf), badge `📌 Disematkan`, tanggal terbit/berakhir, target (Semua atau kelompok), tombol "Ubah", dan tombol "Hapus" dengan dialog konfirmasi hapus permanen.
  - Form Pengumuman (`/admin/pengumuman/create` & edit):
    - Layout 2 kolom: form di sisi kiri (Judul, Isi dengan penghitung karakter, Sasaran semua atau kelompok, sematkan ke beranda, tanggal berakhir opsional) dan kartu pratinjau live "Pratinjau Tampilan Orang Tua" di sisi kanan yang merender feed mobile orang tua secara langsung.
    - Validasi: `classroom_id` divalidasi dengan aturan `required_if:target,classroom`.
    - Bilah aksi sticky di bawah dengan tombol "Simpan draf" dan "Terbitkan".

- **Layar 22 Profil Orang Tua (`/ortu/profil`):**
  - Halaman profil baca-saja: hero avatar inisial besar dengan nama dan email.
  - Kartu "Data orang tua" dengan Nama lengkap, Email, No. HP, dan catatan bantuan: "Untuk mengubah data, hubungi Tata Usaha.".
  - Kartu "Anak" menampilkan daftar anak tertaut lengkap dengan kelompok kelas, NIS, dan StatusCapsule.
  - Bagian akun dengan tautan "Ganti kata sandi ›" dan tombol merah "Keluar".
  - Route mutasi `/profile` bawaan Breeze dipastikan tetap tidak ada di sistem.

### 3. Hasil Pengujian dan Kualitas Kode

- `php artisan test`: **94 passed, 628 assertions** (100% lulus di SQLite in-memory).
- `./vendor/bin/pint --test`: lulus tanpa catatan.
- `npm run lint`: lulus (`tsc --noEmit` & ESLint tanpa warning atau error).
- `npm run build`: lulus (Vite v6.4.3, 3512 modul ter-bundle sempurna).


