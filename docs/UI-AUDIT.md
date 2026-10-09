# Audit UI M8

Status: audit berjalan, belum selesai. Tabel di bawah adalah temuan awal dari kode, bukan hasil perbandingan screenshot. Gambar mockup baru diinventarisasi ukuran dan namanya; belum seluruhnya dibuka. Target pengujian browser adalah 390, 834, dan 1440 px. Jangan memakai daftar ini sebagai bukti kesesuaian visual.

| Layar | Referensi | Perbedaan yang ditemukan | Perbaikan M8 |
|---|---|---|---|
| 00 Login | `login_*` | state galat dan input fokus perlu konsisten di mobile | cincin fokus global, target tombol, font lokal Inter, state galat tetap berlabel |
| 01 Ganti kata sandi | `ganti_kata_sandi_desktop` | fokus keyboard dan aturan kata sandi perlu terlihat | fokus global, label/error, aturan responsif |
| 02, 16 Dashboard | `beranda_admin_desktop`, `ringkasan_kepala_sekolah_desktop` | tile dan grafik perlu tetap terbaca di tablet/mobile | grid satu kolom mobile, chart responsif, status/loading primitives |
| 03, 08, 09, 11, 17 | referensi keuangan | tabel panjang berisiko meluber | `ResponsiveTable`, scroll tabel desktop, stacked rows mobile |
| 04–07 | referensi master data | drawer/dialog dan form perlu target sentuh konsisten | tombol/input minimal 44 px, 48 px pada mobile, fokus terlihat |
| 10, 14 | pengumuman/anekdot | state kosong dan drawer harus tetap dapat dinavigasi keyboard | empty state bersama, fokus global, reduced motion |
| 12, 13, 15 | jurnal guru | validasi dan terkunci harus terbaca tanpa warna saja | pesan error/status berteks, status capsule, focus ring |
| 18, 21–23 | evaluasi dan orang tua | layout harus menjaga lebar baca dan aksi unduh | max-width, stacked mobile, tombol 48 px pada area orang tua |
| 20A–20D | detail tagihan | status dan aksi harus tetap terlihat pada layar kecil | capsule berteks, tombol penuh pada mobile |
| 403, 404, 500 | state aplikasi | sebelumnya belum ada halaman konsisten | halaman error Inertia dengan layout tamu dan tombol kembali |

Perbedaan yang masih tersisa: sumber mockup mobile/tablet staff belum tersedia untuk dibandingkan secara piksel; audit menggunakan token, breakpoint, dan pola responsif DESIGN.md. Pengambilan screenshot browser otomatis tidak dilakukan karena server lokal tidak dijalankan selama audit.
