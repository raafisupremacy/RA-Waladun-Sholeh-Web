# TASKS — Sumber kebenaran status SKMS

Diperbarui 15 Oktober 2026 (Asia/Jakarta). Keputusan D1–D7 ada di `docs/DECISIONS.md`. Bukti audit ada di `docs/TEST-AUDIT.md`; konteks handoff ada di `docs/HANDOFF.md`. Centang hanya bukti yang benar-benar lulus atau artefak yang dapat diverifikasi.

## Hasil tes terakhir

`php artisan test --no-ansi`: **219 lulus, 0 gagal, 0 dilewati, 3.012 assertion**.

`npm run test:js`: 6 lulus. `./vendor/bin/pint --test`, `npm run lint`, dan `npm run build` lulus. `npm run e2e`: **21 lulus** (safety dan smoke login/home pada 390/834/1440 px).

## Status batch

| Batch | Definisi | Status | Bukti |
|---|---|---|---|
| Batch 0 | Lingkungan verifikasi | Sebagian | `phpunit.xml`, `phpunit.mysql.xml`, `tests/TestCase.php`, e2e safety spec, dan lint/build ada; E2E penuh belum dijalankan. |
| Batch 1 | Integritas data dan RBAC | Sebagian | `SecurityFixesTest`, `DomainFlowTest`, `AuthorizationScopeTest`, `FinanceAuditCoverageTest`, `JournalRbacAuditCoverageTest` lulus; kegagalan tersisa berada pada audit identitas. |
| Batch 2 | Fondasi visual | Sebagian | Komponen/layout/CSS dan `tests/js` lulus; render browser semua layar belum terbukti dan identitas dinamis gagal pada tes audit. |
| Batch 3A | Keuangan admin | Sebagian | `AdminFinanceTest`, `FinanceAuditCoverageTest`, `ConcurrencySafeNumberingTest` lulus; verifikasi concurrency native MySQL masih terbuka. |
| Batch 3B | Keuangan orang tua | Selesai | `ParentInvoiceUiTest` lulus untuk scope anak, empat state, upload, private proof, receipt, dan RBAC. E2E browser belum termasuk bukti batch. |
| Batch 3C | Guru dan perkembangan | Selesai | `JournalFlowTest` dan seluruh `JournalRbacAuditCoverageTest` lulus; scope keanggotaan aktif dan pelepasan wali lama teruji. |
| Batch 3D | Dashboard dan laporan | Sebagian | Tes SQLite lulus; verifikasi query agregasi dan lock pada MySQL `skms_test` masih terbuka. |
| Batch 3E | Master data, pengumuman, profil | Sebagian | Feature test lulus; verifikasi MySQL/E2E masih terbuka. |
| Batch 4 | Penyempurnaan | Sebagian | Sebagian state, komponen, tes JS, lint/build tersedia; responsif semua layar, accessibility runtime, state lengkap, dan E2E belum terbukti. |

## QA R1–R5

| QA | Fokus | Status | Bukti |
|---|---|---|---|
| R1 | School settings, identitas publik, CSRF, upload galeri | Selesai | `SecurityFixesTest`, `BrandIdentityAuditCoverageTest`, dan seeder settings lulus. |
| R2 | PDF/Excel, ringkasan kelas, rapor, receipt | Selesai | `ReportAuditCoverageTest` dan `MilestoneM7Test` lulus untuk PDF/XLSX, ringkasan, tunggakan, batas tanggal, anekdot, dan rapor kosong. |
| R3 | Empat kelas dan target pengumuman | Selesai | `SeederDataCompletenessTest` dan `MasterAnnouncementAuditCoverageTest` menguji A-1/A-2/B-1/B-2 serta target semua/tingkat/kelas. |
| R4 | Logo, foto, palette, pencarian, audit-log UI | Sebagian | Aset dan source tersedia; browser visual/font/kontras/tap target belum diverifikasi penuh. |
| R5 | E2E dan verifikasi release | Belum | `e2e/safety.spec.ts` ada, tetapi `npm run e2e` dan workflow penuh belum dijalankan. |

## Bukti fitur yang sudah teruji

- [x] Database test default dipaksa SQLite in-memory; database MySQL test dipisahkan sebagai `skms_test`.
- [x] Invoice anti-duplikat, preview, state payment utama, receipt unik, dan ledger atomik diuji.
- [x] Orang tua dibatasi `guardian_student`; private proof, receipt, nominal transfer, dan tanggal transfer diuji.
- [x] Draft jurnal idempoten, lima aspek final, jendela edit, foto anekdot privat, dan parent development scope diuji.
- [x] Akun sementara sekali tampil, email unik, kakak-adik satu guardian, nonaktif bukan hapus, dan reset password diuji.
- [x] Pengumuman draf/kedaluwarsa serta target semua/tingkat/kelas diuji.
- [x] PDF/Excel laporan dan isi kuitansi diuji pada sebagian jalur.
- [x] Empat kelas A-1, A-2, B-1, B-2 diuji melalui seeder.
- [x] Tes JavaScript ProgressSteps dan text contrast lulus.

## Bukti yang belum terbukti

- [x] Kegagalan private disk tidak boleh membuat payment pending.
- [x] D1: guru lama benar-benar dilepas dari pivot saat ganti wali dan kehilangan baca/tulis; pendamping sah tetap boleh bekerja.
- [x] D2: query tunggakan yang sama untuk layar, PDF, dan Excel dan mengecualikan pending.
- [x] D3: `school_holidays` JSON, penyebut hari sekolah × siswa aktif, dan batas bulan berjalan.
- [x] D4: tren berbasis enrollment aktif dan status siswa terkini.
- [x] D6: keterisian jurnal per kelas, semua penulis sah, kalender D3, dan batas 100%.
- [x] D5: school_name/phone/address publik, bank tetap privat, APP_NAME wordmark.
- [ ] Uji worker paralel dan lock/deadlock MySQL.
- [ ] Jalankan suite MySQL `skms_test` dengan ONLY_FULL_GROUP_BY dan verifikasi query agregasi laporan.
- [ ] E2E workflow payment, jurnal, child switch, dialogs, clipboard, print, dan galeri.
- [ ] Perbandingan browser 390/834/1440 semua layar.
- [ ] Accessibility runtime: axe yang menggagalkan serious/critical, focus order, contrast, dan tap target.

## Perbaikan dari audit tes

Item yang belum dicentang tetap terbuka. Jangan mengubah atau melonggarkan tes untuk membuatnya lulus.

### BrandIdentityAuditCoverageTest — 3

- [ ] `test_navigation_wordmark_uses_app_name_even_when_school_name_is_available`
- [ ] `test_guest_photo_caption_uses_dynamic_school_name_without_hardcoded_identity`
- [ ] `test_public_footer_uses_shared_school_name_without_exposing_banking_settings`

### FinanceAuditCoverageTest — 1

- [x] `test_failed_private_disk_write_cannot_create_payment_without_proof`

### JournalRbacAuditCoverageTest — 5

- [x] `test_journal_update_policy_denies_replaced_teacher_even_inside_edit_window`
- [x] `test_replaced_teacher_history_does_not_expose_former_child_assessments`
- [x] `test_replaced_teacher_anecdote_list_does_not_expose_former_child_behavior`
- [x] `test_real_homeroom_replacement_revokes_former_teacher_journal_writes`
- [x] `test_real_homeroom_replacement_revokes_former_teacher_anecdote_writes`

### MasterAnnouncementAuditCoverageTest — 2

- [x] `test_student_update_and_class_transfer_leave_an_audit_trail`
- [x] `test_new_classroom_cannot_assign_a_teacher_already_homeroom_in_active_year`

### ReportAuditCoverageTest — 9

- [x] `test_journal_completion_uses_final_journals_over_school_days_times_active_students`
- [x] `test_overdue_includes_rejected_but_excludes_pending_invoices`
- [x] `test_monthly_received_uses_cash_ledger_and_fills_empty_months`
- [x] `test_monthly_received_respects_the_selected_academic_year_and_class`
- [x] `test_class_summary_aggregates_invoice_counts_net_amounts_and_all_class_totals`
- [x] `test_admin_arrears_excel_excludes_paid_and_not_yet_overdue_invoices`
- [x] `test_class_summary_excel_contains_classes_and_matching_total_row`
- [x] `test_student_report_includes_anecdotes_on_last_day_of_selected_semester`
- [x] `test_empty_student_report_does_not_invent_development_narratives`

Tidak ada kegagalan tambahan di luar tiga audit identitas pada run penuh terakhir.

## Perlu MySQL

- ONLY_FULL_GROUP_BY untuk semua agregasi laporan.
- LockForUpdate, cache lock bersama, deadlock approve/reject, dan race penomoran invoice/receipt dengan worker paralel.
- Perbedaan DATE/timestamp, collation, dan wildcard LIKE pada MySQL.

SQL dibuat oleh pemilik, bukan agent:

```sql
CREATE DATABASE skms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Lalu jalankan `composer test:mysql` dengan database tepat `skms_test`. Jangan menyentuh `skms`.

## Perlu E2E

- `npm run e2e` memakai hanya `database/e2e.sqlite` jika pengaman skrip menerima `DB_CONNECTION=sqlite` dan nama file berakhiran `e2e.sqlite`.
- Login/home empat role pada 390/834/1440.
- Generate → upload → reject/resubmit → approve → download receipt.
- Autosave/final/locked journal, replacement teacher, child switch, dialog akun/reset, clipboard/print, focus/contrast/tap target, dan visual screenshots semua layar.

## Aturan kerja

1. Baca `AGENTS.md`, `docs/DECISIONS.md`, `docs/PRD.md`, `docs/ERD.md`, `docs/ARCHITECTURE.md`, `docs/SCREEN-MAP.md`, dan `docs/HANDOFF.md` sebelum bekerja.
2. Sebelum mengubah layar, buka mockup desktop/mobile yang tersedia dan bandingkan setelah selesai.
3. Jangan menyatakan batch selesai hanya karena checkbox lama; gunakan bukti tes dan audit.
4. Jangan membuat tes tampak lulus dengan mengubah, melewati, atau melonggarkan tes.

- [x] Admin dapat mengubah data guru/orang tua dengan validasi email/NIP unik dan audit nilai lama/baru.
- [x] Aktivasi/nonaktivasi akun guru/orang tua, pelepasan guru dari kelas, dan pengecualian tagihan wali nonaktif diuji.
- [x] Detail siswa admin tersedia di /admin/siswa/{student} dengan riwayat kelas, wali, dan ringkasan tagihan.
- [x] Disk local tidak dilayani lewat /storage; bukti dan lampiran tetap privat dan diuji tanpa login.

