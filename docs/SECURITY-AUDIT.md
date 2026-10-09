# Audit keamanan M8

- Role middleware dipasang pada semua area `/admin`, `/guru`, `/kepsek`, dan `/ortu`; route beranda tiap role memakai role yang sama.
- `/profile`, perubahan kata sandi, dan logout adalah area akun bersama: tetap di belakang `auth` dan `password.changed`, tanpa role spesifik.
- Policy terdaftar untuk `Student`, `Invoice`, `Payment`, `DailyJournal`, `Teacher`, `Guardian`, dan `Classroom`. Controller pembayaran memanggil `PaymentPolicy` sebelum service state machine.
- Scope `Student::visibleTo` membatasi guru ke kelas aktif dan orang tua ke relasi `guardian_student`.
- Bukti pembayaran memakai disk `private` dan route download memeriksa policy serta relasi wali. Tidak ada route `storage` publik untuk disk private.
- Registrasi publik tidak memiliki route; akun dibuat oleh admin melalui provisioning service.

Verifikasi otomatis: feature test mencakup akses lintas role, parent-child scope, dan file bukti privat. Route publik yang tersisa hanya landing page, styleguide, login, reset password, dan endpoint health.
