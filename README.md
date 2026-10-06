# SKMS — Sistem Informasi dan Keuangan Sekolah

Aplikasi web untuk pengelolaan data sekolah, tagihan SPP, pembayaran, jurnal perkembangan anak, dan pengumuman. Aplikasi menggunakan Laravel 11, Inertia.js, React + TypeScript, Tailwind CSS, dan MySQL.

## Menjalankan di Windows dengan XAMPP

### Prasyarat

- XAMPP dengan **MySQL** aktif dari XAMPP Control Panel.
- PHP 8.2 atau lebih baru.
- Composer.
- Node.js dan npm.

Pastikan perintah berikut bisa dijalankan di PowerShell:

```powershell
php -v
composer -V
node -v
npm -v
```

Jika `php` belum dikenali, tambahkan folder PHP XAMPP (biasanya `C:\xampp\php`) ke `PATH`, lalu buka ulang PowerShell.

### 1. Buat database MySQL

Di phpMyAdmin (`http://localhost/phpmyadmin`) buat database dengan nama:

```text
skms
```

Nama database harus sama dengan `DB_DATABASE` pada `.env`. Pada instalasi XAMPP standar, username MySQL adalah `root` dan password kosong.

### 2. Pasang dependensi

Buka PowerShell di folder proyek:

```powershell
Set-Location "C:\Users\User\Documents\GitHub\TK-Tunas-Harapan-Web"
composer install
npm install
```

### 3. Buat dan atur `.env`

Jalankan:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Periksa bagian database di `.env`:

```dotenv
APP_NAME=SKMS
APP_TIMEZONE=Asia/Jakarta
APP_LOCALE=id

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skms
DB_USERNAME=root
DB_PASSWORD=
```

Jika MySQL XAMPP memakai password atau port berbeda, sesuaikan `DB_PASSWORD` atau `DB_PORT`. File `.env` bersifat lokal dan tidak boleh di-commit.

### 4. Migrasi dan data demo

Untuk membuat seluruh tabel dan mengisi data demo:

```powershell
php artisan migrate:fresh --seed
```

Perintah ini menghapus isi database `skms` lalu membuatnya ulang. Jangan jalankan pada database produksi.

### 5. Jalankan aplikasi

Buka dua jendela PowerShell di folder proyek.

Terminal 1 — server Laravel:

```powershell
php artisan serve
```

Terminal 2 — Vite untuk aset React:

```powershell
npm run dev
```

Buka [http://127.0.0.1:8000](http://127.0.0.1:8000). Biarkan kedua terminal tetap berjalan selama pengembangan.

Alternatif, perintah Composer berikut menjalankan server, queue, log, dan Vite sekaligus:

```powershell
composer run dev
```

### Akun demo

Semua akun demo memakai kata sandi awal `password`.

| Peran | Email |
| --- | --- |
| Admin | `admin@skms.test` |
| Guru | `guru@skms.test` |
| Kepala sekolah | `kepsek@skms.test` |
| Orang tua | `ortu@skms.test` |

Seeder juga membuat data siswa, kelas, tagihan, pembayaran, jurnal, dan pengumuman untuk pengujian alur aplikasi.

## Perintah pengembangan

```powershell
# Pengujian PHP
php artisan test

# Format PHP (cek tanpa mengubah file)
.\vendor\bin\pint --test

# Cek TypeScript
npm run lint

# Build frontend produksi
npm run build
```

## Catatan XAMPP

- Untuk pengembangan, Apache XAMPP tidak wajib dijalankan; `php artisan serve` sudah menyediakan server aplikasi.
- MySQL XAMPP harus aktif sebelum menjalankan migrasi atau membuka aplikasi.
- Jika ingin memakai Apache XAMPP, document root harus diarahkan ke folder `public/`, bukan ke akar proyek.
- Berkas unggahan privat tidak disajikan sebagai URL publik. Jangan menyalin folder `storage` ke `public` untuk mengakses bukti pembayaran.

## Struktur konfigurasi penting

- Nama aplikasi berasal dari `APP_NAME` di `.env` dan `config/app.php`.
- Identitas sekolah, rekening, dan nominal SPP dibaca dari tabel `school_settings`.
- Konfigurasi jendela edit jurnal berada di `config/skms.php`.
