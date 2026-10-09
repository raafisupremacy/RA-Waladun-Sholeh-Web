# SKMS — Sistem Informasi dan Keuangan Sekolah
### RA Waladun Sholeh

Aplikasi web modern untuk digitalisasi operasional sekolah anak usia dini (PAUD / RA): pengelolaan data master siswa, orang tua, guru, dan kelas, penagihan SPP bulanan otomatis dengan verifikasi bukti transfer digital, buku kas masuk/keluar, jurnal harian & catatan anekdot perkembangan anak, pengumuman bertarget, serta dashboard analitik kepala sekolah dan laporan evaluasi.

**Teknologi Utama:**
* **Backend:** PHP 8.2+ · Laravel 11 · MySQL · Spatie Permission
* **Frontend:** Inertia.js · React 18 · TypeScript · Tailwind CSS
* **Design System:** Apple Human Interface Guidelines style · Inter Font · Lucide Icons

---

## Panduan Cepat Menjalankan Proyek (Local Development)

Ikuti langkah-langkah praktis berikut untuk menjalankan aplikasi di komputer lokal (Windows dengan **XAMPP** atau **Laragon**):

### 1. Prasyarat Sistem
Pastikan software berikut sudah terinstal di komputer Anda:
* **XAMPP** atau **Laragon** (dengan PHP 8.2 atau lebih baru dan modul MySQL aktif)
* **Composer** ([getcomposer.org](https://getcomposer.org/))
* **Node.js & npm** ([nodejs.org](https://nodejs.org/), v18 atau v20+)
* **Git**

Periksa di PowerShell, Command Prompt, atau Terminal Laragon:
```powershell
php -v
composer -V
node -v
npm -v
```
> [!TIP]
> - **Pengguna Laragon:** PHP, Composer, dan Git biasanya sudah otomatis terintegrasi dan siap pakai di terminal bawaan Laragon (**Laragon > Terminal**).
> - **Pengguna XAMPP:** Jika perintah `php` atau `composer` belum dikenali di PowerShell biasa, tambahkan path PHP XAMPP (biasanya `C:\xampp\php`) ke Environment Variables `PATH` Windows Anda, lalu buka ulang terminal.

---

### 2. Clone Repositori
Buka terminal dan clone repositori ke komputer Anda:
```powershell
git clone https://github.com/raafisupremacy/RA-Waladun-Sholeh-Web.git
cd RA-Waladun-Sholeh-Web
```

---

### 3. Nyalakan MySQL & Buat Database
Pilih salah satu sesuai perangkat lunak stack lokal yang Anda gunakan:

* **Opsi A — Menggunakan XAMPP:**
  1. Buka **XAMPP Control Panel**, klik **Start** pada modul **MySQL** (Apache tidak wajib dinyalakan).
  2. Buka browser ke **phpMyAdmin** (`http://localhost/phpmyadmin`).
* **Opsi B — Menggunakan Laragon:**
  1. Buka **Laragon**, klik **Start All** (atau klik kanan > **MySQL** > **Start MySQL**).
  2. Buka pengelola database melalui tombol **Database** (HeidiSQL) atau via phpMyAdmin (`http://localhost/phpmyadmin`).

Lalu buat database baru dengan nama:
```text
skms
```
*(Pilih collation: `utf8mb4_unicode_ci`)*.

---

### 4. Pasang Dependensi (Vendor & Node Modules)
Jalankan di folder proyek:
```powershell
# Pasang paket backend Laravel
composer install

# Pasang paket frontend React & TypeScript
npm install
```

---

### 5. Konfigurasi Lingkungan (`.env`)
Salin file konfigurasi contoh dan buat application key:
```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Buka file `.env` dan pastikan konfigurasi basis data sesuai dengan stack lokal Anda:
```dotenv
APP_NAME=SKMS
APP_ENV=local
APP_DEBUG=true
APP_TIMEZONE=Asia/Jakarta
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skms
DB_USERNAME=root
DB_PASSWORD=
```
*(Baik pada XAMPP maupun Laragon bawaan default, `DB_USERNAME` adalah `root` dan `DB_PASSWORD` dikosongkan).*

---

### 6. Migrasi Tabel & Isi Data Demo (Seeder)
Jalankan migrasi untuk membuat seluruh tabel dan mengisinya dengan data simulasi yang realistis:
```powershell
php artisan migrate:fresh --seed
```
> [!NOTE]
> Perintah ini akan membuat data kelas (Kelompok A & Kelompok B), 78 siswa aktif, akun wali murid, akun guru, tagihan SPP dengan berbagai status, jurnal perkembangan, serta pengumuman.

---

### 7. Jalankan Server Aplikasi
Jalankan dua terminal di folder proyek secara berdampingan:

**Terminal 1 — Server Backend Laravel:**
```powershell
php artisan serve
```

**Terminal 2 — Compiler Aset Frontend Vite:**
```powershell
npm run dev
```

Buka browser Anda dan akses:  
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## Akun Demo untuk Masuk (Login)

Semua akun demo di lingkungan pengembangan lokal menggunakan kata sandi yang sama:  
🔑 **Kata Sandi:** `password`

| Peran (Role) | Email | Fitur Utama yang Dapat Dicoba |
| :--- | :--- | :--- |
| **Admin (Tata Usaha)** | `admin@skms.test` | Master data (Siswa, Guru, Ortu, Kelas), Generate tagihan SPP, Verifikasi pembayaran bukti transfer, Buku kas, Pengumuman, Rekap laporan. |
| **Guru (Wali Kelas)** | `guru@skms.test` | Beranda kelas, Isi jurnal harian capaian anak (5 aspek), Riwayat jurnal, Catatan anekdot + upload foto kegiatan. |
| **Kepala Sekolah** | `kepsek@skms.test` | Dashboard analitik sekolah, Grafik tren pembayaran SPP, Laporan keuangan, Cetak/Unduh rapor evaluasi siswa (PDF & Excel). |
| **Orang Tua / Wali** | `ortu@skms.test` | Beranda orang tua, Lihat pengumuman tersemat, Bayar tagihan SPP & unggah foto bukti transfer, Pantau grafik perkembangan anak & catatan anekdot. |

---

## Perintah Pengujian & Pemeliharaan Kualitas Kode

Proyek ini dilengkapi dengan suite pengujian otomatis, validasi kontras aksesibilitas, dan linter ketat:

```powershell
# Jalankan test suite backend otomatis (107 tests passed, 1022 assertions)
php artisan test

# Jalankan pengujian frontend & WCAG contrast check (6 tests passed)
npm run test:js

# Periksa formatting & code style PHP (Pint)
.\vendor\bin\pint --test

# Periksa TypeScript dan linter frontend (ESLint)
npm run lint

# Kompilasi aset frontend untuk rilis produksi
npm run build
```

---

## Panduan Masalah Umum (Troubleshooting)

1. **`SQLSTATE[HY000] [2002] No connection could be made`**
   * Pastikan modul MySQL di XAMPP Control Panel sudah dalam kondisi **Start** (berwarna hijau).
2. **Perintah `php` atau `composer` tidak dikenali di PowerShell**
   * Jalankan PowerShell sebagai Administrator dan tambahkan path PHP XAMPP ke environment variable:
     ```powershell
     [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\xampp\php", [EnvironmentVariableTarget]::User)
     ```
   * Buka jendela terminal baru setelahnya.
3. **Tampilan antarmuka berantakan / tidak ada styling CSS**
   * Pastikan Terminal 2 yang menjalankan `npm run dev` tidak ditutup selama Anda membuka aplikasi.
4. **Cache konfigurasi tersangkut**
   * Jika ada perubahan konfigurasi atau rute yang belum terbaca, bersihkan cache dengan:
     ```powershell
     php artisan optimize:clear
     ```

---

## Struktur Konfigurasi Penting

* **Nama Aplikasi & Identitas:** Diatur via `APP_NAME` di `.env` dan dibaca dari tabel `school_settings` (`school_name` = `RA Waladun Sholeh`).
* **Jendela Edit Jurnal:** Konfigurasi batas waktu pengubahan jurnal oleh guru diatur pada `config/skms.php`.
* **Penyimpanan Berkas Privat:** Berkas bukti transfer pembayaran tersimpan di disk privat (`storage/app/private/`) dan disajikan secara aman melalui policy otorisasi per-peran.
