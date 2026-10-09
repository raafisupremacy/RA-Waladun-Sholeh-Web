# Hasil penyiapan lingkungan verifikasi — 7 Oktober 2026

## Insiden isolasi database

Percobaan tambahan dengan environment eksternal `DB_CONNECTION=mysql`, `DB_DATABASE=skms` sempat memakai database MySQL demo. Override `<env force="true">` PHPUnit belum menimpa nilai di `$_SERVER`, yang dibaca Laravel lebih dahulu. Suite memakai RefreshDatabase, sehingga database tersebut terkena migrasi/reset. Pemeriksaan read-only setelahnya menunjukkan `users=0`, `students=0`, `invoices=0`, `daily_journals=0`. Tidak ada snapshot sebelum percobaan untuk memulihkan data manual. Ini kesalahan pelaksanaan verifikasi, bukan perubahan fitur yang diminta.

Tindakan pengamanan sekarang:

- `phpunit.xml` mengoverride `$_SERVER` dan environment untuk SQLite `:memory:`, mengosongkan DB_URL, serta memakai path config cache khusus testing.
- `tests/TestCase.php::createApplication()` menolak koneksi selain SQLite in-memory sebelum RefreshDatabase dijalankan.
- Uji ulang dengan environment eksternal MySQL lulus 66 tes setelah pengaman dipasang.
- Tidak ada seed/perubahan lanjutan ke MySQL setelah insiden; permintaan keputusan pemulihan data demo telah disampaikan. Seed ulang hanya bisa membuat demo bawaan, bukan mengembalikan data manual.

## Perubahan lingkungan

- Direktori `storage/framework/views`, `storage/framework/cache/data`, `storage/framework/sessions`, dan `storage/logs` kini memiliki `.gitignore` standar (`*` dan `!.gitignore`). Parent framework/cache juga memiliki pengecualian untuk subdirektori.
- Sebelumnya `git ls-files storage` kosong. Git tidak menyimpan direktori kosong; tidak ada file penjaga pada revisi saat ini. Penyebab historis hilangnya file saat penyalinan/scaffolding tidak dapat dipastikan. File penjaga sudah tersedia di working tree untuk disertakan saat pengguna kelak menyimpan versi proyek; clone remote yang belum memuat file ini tetap belum berubah.
- Ditambahkan ignore `storage/app/shots` dan cache npm lokal. Playwright dipasang sebagai devDependency, Chromium berada di `node_modules/.cache/ms-playwright` karena cache profil pengguna tidak dapat ditulis dari lingkungan ini.
- `npm run shots` login via UI untuk admin, guru, kepsek, dan orang tua; memotret halaman statis dan detail yang ID-nya berasal dari props pengguna. Tidak ada form mutasi yang dikirim selain login.
- Cara menjalankan ulang tercantum dalam README bagian “Verifikasi terisolasi dan screenshot”.

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
|---|---|
| `php artisan migrate:fresh --seed --no-interaction` dengan SQLite khusus `storage/app/shots/verification.sqlite` | Lulus, 6 migration dan seeder exit 0. Tidak dijalankan sebagai reset MySQL demo untuk pemeriksaan ini. |
| `php artisan test` setelah folder runtime dipulihkan | 66 lulus, 0 gagal, 0 dilewati; 281 assertions. |
| Uji environment MySQL sebelum pengaman lengkap | 65 lulus, 1 gagal; 273 assertions. Terjadi insiden isolasi yang dijelaskan di atas. |
| Uji environment MySQL setelah override server + guard | 66 lulus, 0 gagal, 0 dilewati; 281 assertions, SQLite in-memory. |
| Pint tanpa `--test`, lalu pemeriksaan path eksplisit | Lulus setelah formatting. Lima file PHP sumber berubah gaya: ChangePasswordController, EnsurePasswordChanged, Student, DailyJournalPolicy, InvoicePolicy; cache bootstrap juga sempat diformat. Tidak ada logika fitur diperbaiki. |
| `npm run lint` dan `npm run build` | Lulus. |
| `npm run shots` | 141 PNG = 47 kunjungan halaman × 3 lebar (1440/834/390). Login keempat role berhasil. Satu halaman rusak; exit 1 sengaja menunjukkan kegagalan itu. |

## Kegagalan lingkungan

- Kegagalan view cache pada review sebelumnya hilang setelah direktori storage dipulihkan.
- Cache npm dan browser di profil Windows menghasilkan EPERM; pemasangan berhasil menggunakan cache dalam proyek.
- Isolasi PHPUnit sebelumnya tidak tahan terhadap environment yang diwariskan ke `$_SERVER`; kini diperkuat dengan override dan guard sebelum migrasi.

## Kegagalan kode — dicatat, tidak diperbaiki

1. Halaman `/` gagal render React: `Ziggy error: route 'register' is not in the route list.` Pemanggil berada di `resources/js/Pages/Welcome.tsx:62`. Screenshot halaman kosong tetap disimpan dan ditandai gagal di `storage/app/shots/results.json`.
2. Test `MilestoneM7Test::test_principal_can_read_dashboard_but_teacher_cannot_read_finance` gagal pada MySQL, `tests/Feature/MilestoneM7Test.php:48`. Log menunjukkan SQLSTATE 42000/1140: agregasi `SUM(...)` disertai `ORDER BY due_date` tanpa GROUP BY. Sumber query: `app/Services/ReportService.php:96,101`. Ini cacat query MySQL, bukan kekurangan direktori runtime. SQLite tidak menolaknya; karena itu hasil tes SQLite lulus tidak membuktikan kompatibilitas MySQL.

Tidak ada bug fitur pada laporan review sebelumnya yang diperbaiki. Instalasi npm melaporkan 13 advisory dependency (2 moderate, 9 high, 2 critical); tidak dijalankan `npm audit fix` karena berpotensi mengubah dependency di luar lingkup.

Tidak ada perintah Git mutasi, branch, commit, atau push. Semua perubahan tetap di working tree.
