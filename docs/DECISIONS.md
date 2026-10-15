# Keputusan pemilik proyek

Ditetapkan 14 Oktober 2026 (Asia/Jakarta). D1–D5 menggantikan pertanyaan dan asumsi terkait dalam audit sebelumnya. Keputusan ini adalah kontrak target; penetapan dokumen tidak berarti kode, seeder, atau tes sudah diperbaiki. Status implementasi ada di `TASKS.md` dan `HANDOFF.md`; `TEST-AUDIT.md` tetap merupakan bukti historis audit.

## D1 — Wali kelas dan guru pendamping

**Keputusan:** guru pendamping dipertahankan. Maksimal tiga guru per kelas: satu wali kelas dan hingga dua pendamping. Keduanya boleh membaca dan menulis jurnal serta anekdot siswa kelasnya pada tahun ajaran aktif. Saat wali kelas diganti, guru lama dilepas sepenuhnya dari kelas tersebut, termasuk pivot `classroom_teacher`; ia kehilangan akses baca dan tulis. Penugasan kembali sebagai pendamping harus merupakan tindakan admin yang terpisah. Jurnal lama tetap menyimpan `teacher_id` penulis asli dan tidak dapat diubah olehnya setelah ia dilepas. Penugasan pendamping tidak menghapus aturan jurnal hanya dapat diedit penulisnya dalam jendela edit.

**Alasan:** pendamping perlu bekerja bersama wali kelas; penggantian wali tidak boleh mempertahankan akses secara diam-diam. Riwayat penulis harus tetap utuh.

**Dampak kode:** gunakan penugasan aktif melalui `classrooms.homeroom_teacher_id` dan pivot `classroom_teacher` dengan role `wali_kelas`/`pendamping`, enrollment aktif, dan tahun ajaran aktif di service, policy, dan query baca. Penggantian harus melepaskan pivot guru lama, bukan mengubahnya menjadi pendamping. Batas tiga merupakan aturan aplikasi, bukan constraint jumlah baris database.

**Dampak tes:** uji wali dan pendamping yang sah, guru kelas lain, proses penggantian admin sebenarnya, hilangnya akses list/form/file/write, dan penugasan kembali yang eksplisit. Lima regresi `JournalRbacAuditCoverageTest` tetap relevan; jangan mengubahnya agar lolos akibat guru lama masih tercatat otomatis sebagai pendamping.

## D2 — Tunggakan lebih dari 30 hari

**Keputusan:** hanya invoice `belum_bayar` atau `ditolak` dengan `due_date < tanggal_hari_ini - 30 hari` yang termasuk tunggakan. `menunggu_verifikasi` dan `lunas` tidak dihitung. Hari ini menggunakan zona waktu Asia/Jakarta; batas tepat 30 hari tidak termasuk. Layar, PDF, dan Excel tunggakan memakai query, filter, serta nominal akhir (`amount - discount_amount`) yang sama.

**Alasan:** pengajuan yang sedang diperiksa sekolah tidak dibebankan sebagai tunggakan orang tua; ekspor harus konsisten dengan layar.

**Dampak kode:** satukan pemilihan invoice tunggakan pada layanan laporan dan gunakan pada tampilan serta kedua ekspor. Bedakan aturan laporan ini dari label keterlambatan umum pada detail invoice.

**Dampak tes:** uji 29/30/31 hari, kedua status yang termasuk, pengecualian pending/lunas, diskon, filter, dan isi ekspor. Tes `ReportAuditCoverageTest::test_overdue_includes_rejected_and_pending_invoices_that_are_not_paid` saat ini mengharapkan pending ikut dihitung: **bertentangan dengan D2**. Ia tetap utuh dan gagal pada tugas dokumen ini; hentikan dan jelaskan konflik sebelum pekerjaan tes berikutnya, jangan membuat aplikasi memasukkan pending demi meluluskan tes tersebut.

## D3 — Keterisian jurnal dan kalender sekolah

**Keputusan:** keterisian = jumlah jurnal `final` / (`hari sekolah × siswa aktif kelas`) × 100. Hari sekolah adalah Senin–Jumat dikurangi tanggal libur di `school_settings.school_holidays`, berupa teks JSON daftar tanggal `YYYY-MM-DD`, misalnya `["2026-10-02"]`. Untuk bulan berjalan, hitung hanya tanggal sampai hari ini; tanggal setelah hari ini tidak masuk pembilang maupun penyebut. Jangan membagi dengan hanya tanggal yang sudah memiliki jurnal atau membulatkan rata-rata siswa sebelum menghitung persentase.

**Alasan:** hari yang belum diisi harus menurunkan persentase, sedangkan hari libur dan hari yang belum berlangsung tidak boleh menambah kewajiban.

**Dampak kode:** baca kalender dari key pada tabel settings yang sudah ada; tidak perlu kolom baru. Terapkan kalender/rentang yang sama pada dashboard, riwayat, laporan, dan perbaikan seeder. Kelompokkan laporan guru sesuai penulis/kelas yang dilaporkan, dengan roster siswa aktif. Bila tidak ada kesempatan pengisian, tampilkan 0%, bukan pembagian nol.

**Dampak tes:** uji final vs draf, beberapa siswa/hari, libur weekday, akhir pekan, bulan berjalan, hari mendatang, dan penyebut nol. Tes akhir bulan tanpa libur masih berguna, tetapi belum mencakup kalender D3. **Ketidaksesuaian seeder:** klaim lama “17 hari sekolah Oktober” tidak boleh dijadikan konstanta. Oktober 2026 penuh memiliki 22 weekday sebelum libur; sampai 14 Oktober ada 10 weekday sebelum libur. Key libur serta tanggal dan persentase demo perlu diselaraskan pada tugas seeder terpisah; seeder tidak diubah sekarang.

## D4 — Tren siswa aktif

**Keputusan:** tren dihitung dari enrollment berstatus `aktif` yang dibuat sebelum akhir bulan terkait, dalam tahun ajaran terpilih, dengan siswa yang sekarang masih aktif. Siswa yang kini nonaktif tidak dihitung mundur. Hitung siswa unik; gunakan `enrollments.created_at`, bukan hanya `students.created_at`. Tidak menambahkan kolom histori baru.

**Alasan:** memanfaatkan skema yang sudah ada dan menghindari klaim rekonstruksi sejarah yang tidak didukung data.

**Dampak kode:** ubah query tren agar memakai status/tanggal enrollment dan status siswa saat ini. Beri catatan bahwa grafik memakai enrollment/status terkini; menonaktifkan siswa dapat mengubah titik bulan terdahulu.

**Dampak tes:** bedakan tanggal pembuatan siswa dan enrollment, enrollment aktif/nonaktif/tahun lain, batas akhir bulan, serta siswa yang sekarang nonaktif. Tes tren registrasi yang ada bukan bukti kepatuhan D4; pemeriksaan baru memerlukan kontrak enrollment ini dan tidak boleh sekadar mengikuti query lama.

## D5 — Identitas pada halaman publik

**Keputusan:** `school_name`, `school_phone`, dan `school_address` boleh dibagikan ke halaman publik melalui shared props Inertia. Data rekening bank tidak boleh dibagikan kepada tamu. `APP_NAME` tetap nama aplikasi/wordmark; identitas sekolah dibaca dari `school_settings`, bukan literal komponen.

**Alasan:** tamu perlu mengenali sekolah dan menghubungi Tata Usaha, tanpa menerima data keuangan yang tidak diperlukan.

**Dampak kode:** bagikan tiga key publik dari `HandleInertiaRequests` dan gunakan pada login, bantuan `tel:`, caption, serta footer. Bank/default SPP tetap terbatas untuk admin dan orang tua terautentikasi yang memerlukannya.

**Dampak tes:** uji nilai dinamis pada tamu, tidak adanya key bank pada props publik, bantuan telepon, footer, dan wordmark aplikasi. Tiga regresi `BrandIdentityAuditCoverageTest` tetap terbuka; tidak ada perubahan tes/kode pada penetapan ini.

## Penerapan berikutnya

## D7 — Nominal transfer

**Keputusan:** unggahan bukti orang tua wajib menyertakan nominal transfer rupiah dan tanggal transfer yang tidak boleh di masa depan. Nama pengirim opsional dan default ke nama wali. Nominal tidak diisi otomatis dari nominal akhir tagihan. Verifikasi menampilkan “Sesuai” hanya bila nominal transfer sama dengan nominal akhir tagihan; bila berbeda, tampilkan selisihnya.

**Dampak kode dan tes:** Form Request/controller dan form Inertia memvalidasi nominal/tanggal; `PaymentVerificationService` menerima nilai wajib tanpa fallback; layar verifikasi menghitung label kesesuaian dari dua nominal.

## D6 — Keterisian jurnal per kelas

**Keputusan:** keterisian jurnal dihitung per kelas. Pembilang adalah jurnal berstatus `final` pada tanggal hari sekolah untuk siswa aktif kelas tersebut, siapa pun penulisnya (wali, pendamping, atau guru yang telah diganti). Penyebut adalah hari sekolah dikalikan siswa aktif kelas. Hasil dibatasi maksimal 100 dan ditampilkan dengan nama wali kelas aktif.

**Dampak kode dan tes:** agregasi laporan dikelompokkan berdasarkan `classroom_id`, tetap menghitung jurnal historis guru lama, mengecualikan draf, akhir pekan, dan hari libur, serta menggunakan roster aktif kelas.

Dokumen spesifikasi telah diselaraskan; penerapan D1–D5 di kode/seeder/tes belum dikerjakan pada tugas ini. Seluruh konflik tes harus dijelaskan sebelum ada perubahan ekspektasi; dilarang melewati atau melonggarkan tes agar suite tampak lulus. Tema/foto terhadap `DESIGN.md` dan kelengkapan endpoint baca pada matriks RBAC masih merupakan catatan audit terpisah, bukan keputusan baru D1–D5.
