# PRD — Smart Kindergarten Management System (SKMS)

Keputusan pemilik D1–D5 pada 14 Oktober 2026 adalah sumber kebenaran tambahan; lihat `docs/DECISIONS.md`. PRD menjelaskan perilaku produk, sedangkan `docs/ERD.md` menjelaskan skema migration aktual.

Versi 1.0 · Proyek capstone · RA Waladun Sholeh

## 1. Latar belakang dan masalah

TK memiliki sekitar 80 siswa tetapi hanya 1 staf Tata Usaha (TU). Tiga masalah utama:
1. **Beban kerja TU tidak seimbang.** Rekap keuangan memakan 2–3 hari.
2. **Verifikasi SPP tercecer.** Bukti transfer dikirim orang tua lewat WhatsApp pribadi, sehingga sulit dilacak dan tidak punya status yang jelas.
3. **Asesmen anak hanya lisan.** Perkembangan anak disampaikan verbal, tanpa rekam jejak permanen.

## 2. Tujuan

| Tujuan | Ukuran keberhasilan |
|---|---|
| Menyederhanakan administrasi | Rekap keuangan bulanan otomatis, tanpa input ulang |
| Memusatkan verifikasi pembayaran | 100% pembayaran SPP memiliki status (Belum Bayar, Menunggu Verifikasi, Lunas, Ditolak) |
| Menstandarkan asesmen | Jurnal harian berdasarkan 5 aspek perkembangan tersimpan permanen |
| Transparansi ke orang tua | Orang tua dapat melihat tagihan dan perkembangan anak secara mandiri |
| Pengawasan kepala sekolah | Dashboard menampilkan kelancaran SPP, tren siswa, dan keterisian jurnal |

## 3. Pengguna (persona)

| Role | Contoh | Kebutuhan utama | Perangkat utama |
|---|---|---|---|
| Admin / TU | Pak Dedi | Kelola data, terbitkan tagihan, verifikasi pembayaran | Desktop |
| Guru | Bu Sari Wulandari | Isi jurnal harian dan catatan anekdot dengan cepat | Tablet dan HP |
| Kepala Sekolah | Ibu Dra. Hartini | Memantau dan mengambil keputusan, hanya baca | Desktop |
| Orang Tua | Ibu Rina | Bayar SPP, lihat perkembangan anak | HP |

## 4. Ruang lingkup

**Termasuk (in scope):** 5 modul pada bagian 5, 4 role dengan RBAC, desain responsif (mobile, tablet, desktop), seeder data demo, ekspor PDF dan Excel.

**Tidak termasuk (out of scope):** pembayaran otomatis lewat payment gateway (verifikasi tetap manual dengan mencocokkan mutasi), pendaftaran mandiri orang tua, aplikasi native, chat, absensi kehadiran harian.

**Opsional jika waktu cukup:** notifikasi email, audit log tampilan UI, dark mode.

## 5. Modul, user story, dan kriteria penerimaan

### Modul 1 — Master data dan autentikasi (Admin)
- **US-1.1** Sebagai admin, saya menambah siswa beserta data orang tuanya agar data tersimpan terstruktur.
  - Siswa dan orang tua tersimpan dengan relasi. Satu orang tua bisa memiliki beberapa anak (kakak-adik memakai orang tua yang sudah terdaftar).
  - Email orang tua unik; email ganda menampilkan pesan "Email sudah dipakai akun lain."
- **US-1.2** Sebagai admin, saya mendapat akun login otomatis untuk orang tua dan guru saat data diinput.
  - Sistem membuat akun dengan kata sandi sementara acak, ditampilkan sekali di dialog "Akun berhasil dibuat" dengan tombol Salin dan Cetak kartu akun.
  - Pengguna wajib mengganti kata sandi pada login pertama.
  - Admin dapat mereset kata sandi.
- **US-1.3** Sebagai admin, saya membagi siswa ke A-1, A-2, B-1, dan B-2 serta menugaskan satu wali kelas dan hingga dua guru pendamping per kelas.
  - Pindah kelas massal lewat pilihan checkbox; ganti wali kelas menampilkan peringatan bahwa guru lama tidak lagi dapat mengisi jurnal kelas tersebut.
  - Wali dan pendamping yang sedang ditugaskan boleh membaca dan menulis jurnal/anekdot kelas pada tahun ajaran aktif. Penggantian wali melepas guru lama sepenuhnya; penugasan sebagai pendamping harus menjadi aksi terpisah.
- **US-1.4** Sebagai admin, saya menonaktifkan siswa tanpa menghapus riwayatnya.
- **US-1.5** Sebagai pengguna, saya login, logout, dan mereset kata sandi.

### Modul 2 — Keuangan dan SPP (Admin dan Orang Tua)
- **US-2.1** Sebagai admin, saya menerbitkan tagihan SPP bulanan untuk semua siswa aktif sekaligus.
  - Input: bulan, tahun ajaran, nominal, jatuh tempo. Dialog konfirmasi menampilkan jumlah tagihan dan jumlah siswa yang dilewati karena sudah punya tagihan bulan itu.
  - Tidak ada tagihan ganda untuk siswa dan bulan yang sama.
  - Admin dapat mengubah nominal satu tagihan (misalnya diskon kakak-adik) selama belum lunas.
- **US-2.2** Sebagai orang tua, saya mengunggah foto bukti transfer.
  - Format gambar atau PDF, maksimal 5 MB. Status berubah dari Belum Bayar menjadi Menunggu Verifikasi.
  - Halaman menampilkan rekening tujuan dengan tombol Salin.
- **US-2.3** Sebagai admin, saya memeriksa bukti dan menyetujui atau menolak.
  - Layar verifikasi menampilkan bukti, nominal tagihan dibanding nominal transfer, tanggal transfer, dan nama pengirim.
  - Setuju: status Lunas dan entri buku kas dibuat dalam satu transaksi.
  - Tolak: alasan wajib diisi; orang tua melihat alasan dan dapat mengunggah ulang.
- **US-2.4** Sebagai admin, saya melihat buku kas digital yang terisi otomatis dari tagihan Lunas, dengan saldo berjalan dan ekspor PDF dan Excel.
- **US-2.5** Sebagai orang tua, saya mengunduh bukti pembayaran untuk tagihan Lunas.

### Modul 3 — Buku penghubung dan asesmen (Guru dan Orang Tua)
- **US-3.1** Sebagai guru, saya mengisi jurnal harian per siswa.
  - 5 aspek: Nilai Agama dan Moral, Fisik Motorik, Kognitif, Bahasa, Sosial Emosional. Tiap aspek memiliki penilaian BB, MB, BSH, atau BSB dan catatan.
  - Draf dapat disimpan; jurnal final dapat diubah sampai akhir hari berikutnya, setelah itu terkunci.
  - Wali dan pendamping hanya dapat membaca/menulis siswa pada kelas yang sedang ditugaskan kepadanya pada tahun ajaran aktif. Guru yang dilepas dari kelas kehilangan baca/tulis; jurnal lama tetap menyimpan nama penulisnya.
- **US-3.2** Sebagai guru, saya mencatat catatan anekdot (perilaku teramati, interpretasi, tindak lanjut, foto opsional).
- **US-3.3** Sebagai guru, saya melihat riwayat jurnal per siswa per bulan dalam bentuk grid.
- **US-3.4** Sebagai orang tua, saya membaca jurnal dan catatan anekdot anak saya.
  - Hanya anak sendiri. Orang tua dengan beberapa anak dapat berpindah anak lewat "Ganti anak".

### Modul 4 — Pengumuman (Admin dan Orang Tua)
- **US-4.1** Sebagai admin, saya membuat pengumuman (judul, isi, tujuan: semua atau kelompok tertentu, sematkan, tanggal berakhir), draf atau terbit.
- **US-4.2** Sebagai orang tua, saya melihat pengumuman yang relevan di beranda; yang disematkan tampil paling atas dan yang kedaluwarsa tidak tampil.

### Modul 5 — Dashboard dan laporan
- **US-5.1** Sebagai kepala sekolah, saya melihat persentase SPP lunas bulan berjalan, tren siswa aktif, keterisian jurnal per guru, dan daftar tunggakan lebih dari 30 hari.
  - Tunggakan lebih dari 30 hari hanya invoice `belum_bayar` atau `ditolak`; `menunggu_verifikasi` tidak dihitung. PDF dan Excel memakai query yang sama.
  - Keterisian jurnal memakai jurnal final / (hari sekolah × siswa aktif), dengan Senin–Jumat dikurangi JSON `school_settings.school_holidays`; bulan berjalan berhenti pada hari ini.
  - Tren memakai enrollment aktif yang dibuat sebelum akhir bulan dan siswa yang saat ini aktif; status siswa kini tidak direkonstruksi mundur.
- **US-5.2** Sebagai kepala sekolah dan admin, saya mengekspor laporan keuangan (rentang tanggal) ke PDF dan Excel.
- **US-5.3** Sebagai kepala sekolah, saya mengekspor laporan evaluasi siswa (rapor bayangan) per anak ke PDF, berisi ringkasan penilaian per aspek dan catatan anekdot terpilih.
- **US-5.4** Sebagai admin, saya melihat beranda kerja: jumlah pembayaran menunggu verifikasi, ringkasan siswa dan kas, pembayaran terbaru.

## 6. Kebutuhan non-fungsional

- **Keamanan:** RBAC ketat (orang tua hanya melihat anaknya, guru hanya kelasnya, kepala sekolah hanya baca); bukti bayar tidak dapat diakses publik; kata sandi di-hash; audit log aksi admin.
- **D7 Nominal transfer:** saat mengunggah bukti, orang tua wajib mengisi nominal transfer dan tanggal transfer yang tidak boleh di masa depan. Nama pengirim opsional dan default ke nama wali; nominal tidak diisi otomatis dari tagihan. Verifikasi menampilkan “Sesuai” hanya bila nominal transfer sama dengan nominal akhir tagihan, atau selisih nominal bila berbeda.
- **Integritas data:** foreign key ketat, uang dalam integer rupiah, transaksi database untuk perubahan berantai.
- **Kinerja:** halaman daftar memakai pagination; laporan 80 siswa selesai dalam beberapa detik.
- **Kegunaan:** responsif di 390px, 834px, dan 1440px; tap target minimal 44px; kontras teks minimal 4.5:1.
- **Bahasa:** seluruh UI Bahasa Indonesia.

## 6.1 Keputusan data dan identitas (D1–D5)

- `school_name`, `school_phone`, dan `school_address` boleh dibagikan pada halaman publik. Rekening bank tidak boleh dibagikan kepada tamu; semua nilai berasal dari `school_settings`.
- Skema nyata memiliki pivot `classroom_teacher` dengan `role` string, maksimal tiga penugasan per kelas sebagai aturan aplikasi, serta `classrooms.level` dan `announcements.target_level` enum A/B nullable.
- Seeder saat ini menargetkan kelas A-1, A-2, B-1, dan B-2. Klaim lama tentang 17 hari sekolah Oktober adalah ketidaksesuaian dokumentasi/seeder yang harus diselaraskan pada pekerjaan seeder berikutnya; jangan memakai angka tersebut sebagai konstanta.
- Detail alasan dan dampak implementasi ada di `docs/DECISIONS.md`.

## 7. Risiko dan asumsi

| Risiko atau asumsi | Penanganan |
|---|---|
| Orang tua kurang paham teknologi | Alur unggah bukti 3 langkah, tombol besar, bantuan "Hubungi Tata Usaha" |
| Bukti transfer palsu atau salah nominal | Verifikasi manual, tampilkan selisih nominal, alasan penolakan wajib |
| Cakupan terlalu besar untuk satu orang | Urutan milestone di `TASKS.md`; fitur opsional dikerjakan terakhir |
| Angka di mockup berbeda dengan data seeder | Angka diambil dari database, mockup hanya acuan tampilan |
| Pembayaran dilakukan tunai | Di luar cakupan awal; dapat ditambahkan sebagai "catat pembayaran tunai oleh admin" |

## 8. Lampiran: proses bisnis untuk diagram BPMN

**As-is (kondisi sekarang), pembayaran SPP:** TU mengumumkan SPP lewat grup WhatsApp, orang tua transfer lalu mengirim foto bukti lewat chat pribadi, TU mencocokkan mutasi bank secara manual, mencatat di buku atau spreadsheet, membalas konfirmasi lewat chat, merekap di akhir bulan (2–3 hari).

**To-be (dengan SKMS):** Admin generate tagihan (massal) → orang tua melihat tagihan di akun → transfer dan unggah bukti → status Menunggu Verifikasi → admin mencocokkan mutasi dan memutuskan → Lunas (otomatis masuk buku kas) atau Ditolak (orang tua unggah ulang) → rekap dan ekspor otomatis.

**As-is, asesmen anak:** guru mengamati, menyampaikan lisan saat penjemputan, tidak ada rekam jejak. **To-be:** guru mengisi jurnal harian dan anekdot → orang tua membaca kapan saja → akhir semester, rapor bayangan diekspor otomatis.

**Diagram capstone yang perlu dibuat:** use case (4 aktor), BPMN as-is dan to-be (SPP dan asesmen), state diagram status tagihan (ada di `ERD.md`), ERD (ada di `ERD.md`).
