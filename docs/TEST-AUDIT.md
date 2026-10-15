# Audit tes dan klaim penyelesaian

Tanggal: 14 Oktober 2026 (Asia/Jakarta). Tahap A dijalankan sebelum menambahkan tes audit. Kode aplikasi, skema, dependensi, dan .env tidak diperbaiki.

## Baseline nyata (Tahap A)

`php artisan test --no-ansi`: **112 lulus, 0 gagal, 0 dilewati, 1.606 assertion**. `php artisan test --list-tests --no-ansi` mendeteksi 112 metode, cocok dengan inventaris berikut. Tidak ditemukan data provider, @test, #[Test], markTestSkipped, atau markTestIncomplete pada suite awal. Assertion bukan jumlah tes: scanning sumber di SecurityFixesTest dan loop seeder menambah banyak assertion dalam satu metode.

| Berkas awal | Metode PHP terdeteksi | Terakhir diubah (jam lokal mesin) |
|---|---:|---|
| `tests/TestCase.php` | 0 | 2026-10-07 18:50:25 |
| `tests/Feature/AdminAuditLogUiTest.php` | 2 | 2026-10-08 23:46:58 |
| `tests/Feature/AdminFinanceTest.php` | 7 | 2026-10-08 02:18:35 |
| `tests/Feature/AuthorizationScopeTest.php` | 2 | 2026-10-07 01:52:30 |
| `tests/Feature/ConcurrencySafeNumberingTest.php` | 5 | 2026-10-08 15:29:21 |
| `tests/Feature/DomainFlowTest.php` | 11 | 2026-10-07 18:47:56 |
| `tests/Feature/ExampleTest.php` | 1 | 2026-10-09 11:11:46 |
| `tests/Feature/JournalFlowTest.php` | 11 | 2026-10-08 18:05:57 |
| `tests/Feature/MasterDataTest.php` | 16 | 2026-10-08 21:32:25 |
| `tests/Feature/MilestoneM6Test.php` | 8 | 2026-10-08 14:41:43 |
| `tests/Feature/MilestoneM7Test.php` | 6 | 2026-10-12 20:12:21 |
| `tests/Feature/MilestoneServicesTest.php` | 1 | 2026-10-07 01:52:30 |
| `tests/Feature/ParentInvoiceUiTest.php` | 6 | 2026-10-08 15:28:35 |
| `tests/Feature/ProfileTest.php` | 1 | 2026-10-07 18:49:11 |
| `tests/Feature/SecurityFixesTest.php` | 14 | 2026-10-12 20:17:04 |
| `tests/Feature/SeederDataCompletenessTest.php` | 4 | 2026-10-13 00:26:40 |
| `tests/Feature/StyleguideTest.php` | 1 | 2026-10-08 15:29:21 |
| `tests/Feature/Auth/AuthenticationTest.php` | 4 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/PasswordResetTest.php` | 4 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/PasswordUpdateTest.php` | 2 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/RegistrationTest.php` | 1 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/RoleAccessTest.php` | 4 | 2026-10-07 18:47:37 |
| `tests/js/progress-steps.test.mjs` | 0 | 2026-10-08 12:49:39 |
| `tests/js/text-contrast.test.mjs` | 0 | 2026-10-08 12:48:44 |
| `tests/Unit/ExampleTest.php` | 1 | 2026-10-07 01:57:53 |

Total PHP **112** pada **22 berkas tes**; TestCase.php adalah base class, bukan tes. Dua berkas JS memakai node:test: progress-steps.test.mjs memiliki 5 kasus, text-contrast.test.mjs memiliki 1 kasus. Keduanya tidak dijalankan oleh php artisan test. E2E di e2e/ juga tidak termasuk jumlah PHP: 4 smoke + 3 safety, masing-masing pada tiga project viewport (21 kasus konfigurasi).

## Jawaban awal (a), (b), (c)

- **(a) Catatan lama ada:** angka 85/558 adalah hasil historis Batch 3B. HANDOFF saat ini juga sudah berisi pembaruan 112/1606 (14 Oktober), tetapi masih mencampurkan klaim selesai lama. Tidak dapat membuktikan dokumen ditulis dari ingatan atau maksud penulis hanya dari filesystem.
- **(b) Tes bertambah, cakupan belum lengkap:** suite awal benar-benar 112 tes. Audit menemukan belum ada regresi bermakna pada sejumlah batas akses, agregasi, target pengumuman melalui HTTP, dan audit pembaruan master data.
- **(c) Fitur berikutnya ada di kode:** modul guru, laporan, master data, pengumuman, profil dan audit log hadir; keberadaan tidak membuktikan semua aturan benar. Temuan perilaku akan dicatat setelah tes baru dijalankan.

## Hasil pemeriksaan awal

| Perintah | Hasil |
|---|---|
| php artisan test | 112 passed / 1606 assertions |
| ./vendor/bin/pint --test | exit 0; keluaran JSON passed; akan diperiksa pula dengan binary Pint asli |
| npm run lint | exit 0; TypeScript + ESLint |
| npm run build | exit 0; Vite 6.4.3, 3515 modules; proses dengan izin baca konfigurasi tambahan |

Tahap B hanya menambahkan tes perilaku pada fitur yang ada/sebagian. Tidak ada kegagalan baru yang dilewati atau dilonggarkan.

## Perbandingan tanggal kode dan tes awal

Tanggal filesystem adalah petunjuk perubahan terakhir, bukan bukti riwayat commit atau bukti fitur sudah diuji. Salinan/junction dapat mengubah tanggal. Path checkout TK pada stack trace di-resolve sebagai RA-Waladun-Sholeh-Web; keduanya mengarah ke berkas proyek yang dibaca di sesi ini.

| Area | Sumber terbaru | Tes awal terkait | Kesimpulan cakupan |
|---|---|---|---|
| Penomoran invoice | InvoiceService 8 Okt 18:27 | ConcurrencySafeNumberingTest 8 Okt 15:29 | Kode lebih baru; tes sequential/MAX+1 tidak menjalankan worker paralel/retry nyata. |
| Pembayaran | PaymentVerificationService 8 Okt 15:29 | DomainFlow 7 Okt; ParentInvoice 8 Okt 15:28 | Jalur dasar ada; kegagalan tulis disk dan audit terakhir belum teruji. |
| Scope jurnal | JournalController/AnecdotalNoteController 13 Okt 00:25; JournalService 8 Okt 21:25 | JournalFlow 8 Okt 18:05; SecurityFixes 12 Okt 20:17 | Tes mengganti FK langsung; tidak menjalankan penggantian dengan pivot pendamping. |
| Master data | MasterDataService/AdminDataController 13 Okt 00:25 | MasterDataTest 8 Okt 21:32 | Update siswa tanpa audit dan validasi wali pada tambah kelas belum teruji. |
| Pengumuman | AnnouncementService/Model/Controller 13 Okt 00:12–00:19 | M6 8 Okt 14:41; SeederData 13 Okt 00:26 | Seeder menguji scope tingkat; HTTP publish/unpublish/target eksklusif belum tercakup. |
| Agregasi/ekspor | ReportService 13 Okt 17:59; Admin ReportController 13 Okt 18:01; PDF 13 Okt 23:18 | M7 12 Okt 20:12 | Tes ekspor awal terutama respons/download, tidak isi XLSX dan narasi kosong. |
| Pencarian keuangan | InvoiceController/PaymentQueue/CashLedgerService 13 Okt 18:29 | AdminFinance 8 Okt 02:18 | Search nama/NIS lebih baru dan belum dites; kini ditambah. |
| Identitas/brand | GuestLayout/BrandMark 13 Okt 23:34; shared props 13 Okt 23:32 | SecurityFixes 12 Okt 20:17 | Scanning lama hanya melarang nama sekolah lama; nama sekolah baru hardcoded lolos. |
| Pie/semester/audit font | Dashboard kepsek/AuditLog React 13 Okt 23:34 | M7 12 Okt; AdminAuditLog 8 Okt | Backend props bukan bukti render, font, interaksi, atau kontras. |
| Empat kelas/seeder | DatabaseSeeder 14 Okt 00:21; SchoolSettingsSeeder 13 Okt 18:25 | SeederData 13 Okt 00:26; SecurityFixes 12 Okt | Jumlah/nama kelas terbukti, tetapi timestamp tes tetap lebih tua dari perubahan terakhir. |

Sumber asli per berkas yang dibaca:

| Sumber | Terakhir diubah |
|---|---|
| `app/Services/InvoiceService.php` | 2026-10-08 18:27:22 |
| `app/Services/PaymentVerificationService.php` | 2026-10-08 15:29:21 |
| `app/Services/JournalService.php` | 2026-10-08 21:25:56 |
| `app/Services/AnecdotalNoteService.php` | 2026-10-08 21:26:32 |
| `app/Services/MasterDataService.php` | 2026-10-13 00:25:16 |
| `app/Services/AccountProvisioningService.php` | 2026-10-08 21:24:02 |
| `app/Services/AnnouncementService.php` | 2026-10-13 00:12:36 |
| `app/Services/ReportService.php` | 2026-10-13 17:59:10 |
| `app/Models/Announcement.php` | 2026-10-13 00:12:35 |
| `app/Http/Controllers/Guru/JournalController.php` | 2026-10-13 00:25:18 |
| `app/Http/Controllers/Guru/AnecdotalNoteController.php` | 2026-10-13 00:25:19 |
| `app/Http/Controllers/Admin/AdminDataController.php` | 2026-10-13 00:25:17 |
| `app/Http/Controllers/Admin/AnnouncementController.php` | 2026-10-13 00:19:03 |
| `app/Http/Controllers/Admin/ReportController.php` | 2026-10-13 18:01:06 |
| `app/Http/Controllers/Admin/PaymentQueueController.php` | 2026-10-13 18:29:23 |
| `app/Http/Controllers/Admin/InvoiceController.php` | 2026-10-13 18:29:23 |
| `app/Http/Middleware/HandleInertiaRequests.php` | 2026-10-13 23:32:54 |
| `app/Policies/DailyJournalPolicy.php` | 2026-10-07 18:13:49 |
| `app/Policies/AnecdotalNotePolicy.php` | 2026-10-08 13:09:19 |
| `resources/js/Pages/Ortu/InvoiceDetail.tsx` | 2026-10-13 23:34:31 |
| `resources/js/Pages/Guru/JournalForm.tsx` | 2026-10-13 23:34:31 |
| `resources/js/Pages/Kepsek/Dashboard.tsx` | 2026-10-13 23:34:31 |
| `resources/js/Pages/Admin/AuditLog.tsx` | 2026-10-13 23:34:31 |
| `resources/js/Layouts/GuestLayout.tsx` | 2026-10-13 23:34:31 |
| `resources/js/Components/BrandMark.tsx` | 2026-10-13 23:34:31 |
| `resources/views/exports/student-report.blade.php` | 2026-10-13 23:18:44 |
| `database/seeders/DatabaseSeeder.php` | 2026-10-14 00:21:55 |
| `database/seeders/SchoolSettingsSeeder.php` | 2026-10-13 18:25:15 |

## Matriks setiap butir (celah terlebih dahulu)

**Ada** berarti jalur implementasi ditemukan, bukan seluruh acceptance criterion sempurna. **Sebagian** berarti jalur ada tetapi gagal aturan atau belum dapat diverifikasi. **Tidak ada** berarti implementasi/tes tertentu tidak ditemukan. Singkatan tes baru: **F** FinanceAuditCoverageTest, **J** JournalRbacAuditCoverageTest, **M** MasterAnnouncementAuditCoverageTest, **R** ReportAuditCoverageTest, **B** BrandIdentityAuditCoverageTest. Seluruhnya di tests/Feature/. Nomor baris mengacu kode pada 14 Oktober, bukan laporan historis.

| Butir | Fitur | Bukti kode/route | Tes sebelum → sesudah audit |
|---|---|---|---|
| Penomoran invoice anti-balapan paralel | Sebagian | InvoiceService.php:41 cache lock, :86 retry; UNIQUE migration 000100:95 | ConcurrencySafeNumberingTest sequential; **tidak ada** worker paralel; Perlu MySQL |
| Retry collision kuitansi sungguhan | Sebagian | PaymentVerificationService.php:65,103 | Tes bernama simulated_collision hanya menambah nomor lama sebelum MAX+1; tidak ada benturan/retry sungguhan |
| Kepala sekolah hanya baca seluruh endpoint | Ada untuk jalur diuji; audit seluruh route sebagian | routes/web.php:75 area admin; :127 guru; policy jurnal | JournalFlowTest read-only; F::test_non_admins_cannot_mutate_invoice_amount_or_review_payments_over_http; J::test_admin_principal_and_parent_cannot_finalize_or_update_teacher_records; M::test_non_admin_roles_cannot_mutate_announcements_or_reset_accounts |
| Guru baca sesudah digantikan | Sebagian | Guru/JournalController.php:234; Guru/AnecdotalNoteController.php:37 | Tidak ada regresi list awal → J::test_replaced_teacher_history_does_not_expose_former_child_assessments dan test_replaced_teacher_anecdote_list_does_not_expose_former_child_behavior **gagal** |
| Guru tulis sesudah ganti wali sebenarnya | Sebagian | MasterDataService.php:147; JournalService.php:68; AnecdotalNoteService.php:34 | Tes awal mengubah FK manual → J::test_real_homeroom_replacement_revokes_former_teacher_journal_writes dan test_real_homeroom_replacement_revokes_former_teacher_anecdote_writes **gagal** |
| Policy jurnal cek kelas aktif | Sebagian | DailyJournalPolicy.php:27 tidak cek enrollment | Tidak ada kasus awal → J::test_journal_update_policy_denies_replaced_teacher_even_inside_edit_window **gagal** |
| Keterisian jurnal per guru | Selesai | ReportService memakai SchoolCalendarService dan penyebut hari sekolah × siswa aktif | ReportAuditCoverageTest lulus
| Grafik penerimaan sesuai filter/akhir bulan | Selesai | monthlyReceived memfilter invoice/enrollment dan rentang inklusif | Tes monthly received lulus
| Ringkasan per kelas dan batas jatuh tempo | Selesai | ReportService agregasi satu query dengan batas D2 | Tes ringkasan kelas lulus
| Excel tunggakan sesuai tab | Selesai | OverdueReportExport memakai hasil query tunggakan | Tes Excel tunggakan lulus
| Rapor kosong tanpa narasi karangan | Selesai | student-report Blade memakai pesan netral | Tes rapor kosong lulus
| Anekdot hari terakhir semester masuk rapor | Selesai | ReportService memakai akhir hari inklusif | Tes batas hari terakhir lulus
| Audit log pembaruan siswa/pindah lewat form edit | Sebagian | AdminDataController.php:102 tidak mencatat audit | MasterDataTest update ada tanpa audit assertion → M::test_student_update_and_class_transfer_leave_an_audit_trail **gagal** |
| Validasi wali saat buat kelas baru | Sebagian | ClassroomController.php:52–61; UNIQUE migration:50 | Tes replaceTeacher ada, create konflik tidak → M::test_new_classroom_cannot_assign_a_teacher_already_homeroom_in_active_year **gagal 500** |
| Identitas sekolah dari settings tanpa nama tetap | Selesai | GuestLayout/HandleInertiaRequests memakai school_name shared prop | BrandIdentityAuditCoverageTest lulus
| Wordmark APP_NAME | Selesai | BrandMark memakai appName dan menampilkan school_name sebagai pendukung | BrandIdentityAuditCoverageTest lulus
| Footer publik memakai school_name | Selesai | HandleInertiaRequests membagi props publik terbatas dan GuestLayout merender footer dinamis | BrandIdentityAuditCoverageTest lulus
| Nomor telepon TU sebagai tel: | Sebagian | Login.tsx:19, ChangePassword.tsx:17, Ortu/Profile.tsx:69; shared props tidak membagi telepon ke tamu | M::test_school_contact_and_banking_are_read_from_settings_for_parent_and_admin lulus untuk login internal; klik bantuan publik **tidak ada**, Perlu E2E; keputusan props publik perlu ditanyakan |
| Opsi Kamera dihapus | Ada | Ortu/InvoiceDetail.tsx:103 tombol galeri, tidak ditemukan capture/Kamera | **Tidak ada** tes picker browser; Perlu E2E |
| Audit log berfont besar | Sebagian | AuditLog.tsx:428 15px; :517,526,530,558,564 masih 10/11px | AdminAuditLogUiTest menguji backend; **tidak ada** pemeriksaan font browser |
| Tema warna/logo dan fallback | Ada sebagian | CSS tokens, BrandMark.tsx:8, exports/partials/school-logo:1; aset logo.png/school.jpg ada | brandAssets + render B; tidak ada tes visual warna/fallback; Perlu E2E. DESIGN.md masih biru lama dan melarang hero foto |
| Pie chart komposisi SPP | Ada | Kepsek/Dashboard.tsx:201 Recharts Pie | Tidak ada UI test → R::test_dashboard_supplies_database_pie_composition_and_configured_semester_progress memeriksa data; bentuk chart Perlu E2E |
| Bar kelangsungan semester | Ada | Kepsek/Dashboard.tsx:233–235; Kepsek/DashboardController props | R::test_dashboard_supplies_database_pie_composition_and_configured_semester_progress lulus data; render/overflow Perlu E2E |
| Nomor halaman dan tata letak PDF bersama | Sebagian | exports/partials/pdf-footer.blade.php:3 CSS counters | R menguji teks footer + renderer PDF asli, tidak nomor halaman output/pixel |
| Generate massal anti-duplikat dan preview jumlah | Ada | InvoiceService.php:22,25,54; Admin/Invoices.tsx dialog | AdminFinanceTest::test_preview_matches_generation_and_repeated_generation_skips_existing_invoices → F::test_batch_preview_is_read_only_and_generation_respects_enrollment_year_and_existing_period; dialog Perlu E2E |
| submitProof transaksi + lock invoice | Ada, efektivitas paralel belum diuji | PaymentVerificationService.php:27–28 | SecurityFixesTest + F::test_submission_checks_current_database_state_even_with_stale_invoice; test_submission_rolls_back_payment_invoice_and_earlier_audit_if_status_audit_fails |
| submitProof hanya unpaid/rejected dan pending ganda ditolak | Ada | PaymentVerificationService.php:29,32,47 | DomainFlowTest + F::test_existing_pending_payment_blocks_upload_even_if_invoice_is_unpaid |
| Tulis disk gagal tidak mengubah invoice | Selesai | PaymentVerificationService menangani false/exception dan cleanup | Finance audit coverage lulus
| approve/reject status sah, alasan wajib, lunas final | Ada | PaymentVerificationService.php:76,124,130 | DomainFlowTest/SecurityFixesTest → F::test_review_cannot_reopen_a_settled_payment_using_stale_instance; test_paid_invoice_remains_final_and_receipt_uses_net_invoice_amount |
| Buku kas atomik + kuitansi KWT | Ada | PaymentVerificationService.php:72–98 | DomainFlowTest rollback → F::test_review_rolls_back_all_writes_when_final_audit_insert_fails; paid snapshot/KWT |
| Unduh kuitansi lunas anak sendiri | Ada | Ortu/ReceiptController.php:15–16 | ParentInvoiceUiTest scope → F::test_parent_cannot_download_receipt_for_pending_or_rejected_invoice; R::test_own_paid_receipt_pdf_contains_receipt_number_net_amount_and_school_footer |
| Bukti bayar privat, validasi ukuran/tipe/nama | Ada kecuali kegagalan disk di atas | Ortu/InvoiceController.php:78; PaymentProofController.php:15; private disk | ParentInvoiceUiTest::test_payment_proof_upload_boundary_and_storage_security; F::test_non_parent_roles_and_guests_cannot_download_parent_proof_or_receipt |
| Orang tua hanya tagihan/bukti anak sendiri | Ada | InvoicePolicy.php:29; ParentStudentContext.php:23 | DomainFlowTest + ParentInvoiceUiTest → F::test_another_parent_cannot_submit_proof_for_unrelated_child |
| Orang tua hanya jurnal/rapor/unduhan sendiri | Ada | DevelopmentController.php:15; StudentReportController.php:17; policies | JournalFlowTest/M7 → J::test_forged_parent_session_cannot_authorize_foreign_report_or_photo_downloads; test_forged_parent_session_is_repaired_without_other_child_journals_or_anecdotes |
| Guru hanya kelas/tahun/enrollment aktif | Sebagian karena kasus replacement di atas | Student.php:56; JournalService.php:65–75 | AuthorizationScopeTest + J::test_teacher_cannot_read_or_write_inactive_academic_year_or_inactive_enrollment |
| Admin tidak menulis jurnal/anekdot | Ada | routes/web.php:127; policies | JournalFlowTest::test_principal_and_admin_cannot_write_journals_or_anecdotes + J finalize/update negative |
| Akun nonaktif kehilangan sesi | Ada | EnsureActiveAccount.php:14 | SecurityFixesTest::test_disabled_authenticated_session_is_logged_out → J::test_disabled_parent_session_cannot_download_and_clears_active_child_context |
| Ganti kata sandi pertama kali | Ada | ChangePasswordController.php:20; EnsurePasswordChanged.php:13 | Auth/RoleAccessTest + SecurityFixesTest → J::test_first_password_change_blocks_downloads_and_rejects_wrong_or_weak_password |
| Route /profile Breeze tidak ada | Ada | routes/web.php/routes/auth.php tidak mendaftarkan profile | ProfileTest::test_breeze_profile_mutation_routes_are_unavailable |
| Styleguide hanya local | Ada | routes/web.php:43 | StyleguideTest::test_styleguide_page_is_local_only |
| Lima aspek wajib final, enum valid | Ada | JournalService.php:52,96 | JournalFlowTest final incomplete/complete; J::test_finalization_with_invalid_fifth_level_preserves_draft_and_existing_assessments |
| Draf idempoten dan tidak overwrite id palsu | Ada | JournalService.php:23–24,100 | JournalFlowTest autosave + SecurityFixesTest → J::test_forged_journal_id_cannot_overwrite_another_student_draft |
| Jendela edit dan lock tepat batas | Ada | JournalService.php:80 | JournalFlowTest lock → J::test_final_journal_edits_work_at_end_of_next_day_and_lock_at_midnight |
| Satu jurnal siswa per hari | Ada | migration 000100:132 UNIQUE | Existing autosave → J::test_journal_unique_student_date_constraint_rejects_second_teacher_record |
| Anekdot/foto privat dan validasi | Ada; scope list/write bermasalah di atas | AnecdotalNoteService.php:23; controller:104,132 | JournalFlowTest photo → J::test_anecdote_upload_stays_private_uses_random_name_and_hides_storage_path dan invalid/oversized |
| Akun otomatis + temporary sekali tampil | Ada | AccountProvisioningService.php:31,53,119; shared props session pull | MasterDataTest::test_student_creation_provisions_guardian_and_enrolls_in_active_year → M::test_teacher_reset_password_is_shown_once_and_hash_and_audit_exclude_plaintext |
| Kakak-adik satu orang tua | Ada | AccountProvisioningService.php:80–84 | MasterDataTest::test_two_children_share_one_existing_guardian_account |
| Email unik | Ada | MasterDataRequest.php:23,30; UNIQUE users | MasterDataTest duplicate guardian → M::test_duplicate_teacher_email_does_not_create_a_partial_profile_or_audit |
| Nonaktif bukan hapus | Ada | MasterDataService.php:156; status update | MasterDataTest::test_bulk_transfer_is_atomic_and_deactivation_preserves_enrollment dan exclusion from generation |
| Pindah kelas + ganti wali + audit | Sebagian | MasterDataService.php:17,115,147 | MasterDataTest bulk rollback; M::test_replacing_homeroom_updates_assignment_and_records_old_and_new_teacher lulus; J actual revocation gagal |
| Pengumuman draf/kedaluwarsa tidak tampil | Ada | Announcement.php:43–45; DashboardController scope | MilestoneM6Test → M::test_draft_publish_unpublish_and_expiry_boundary_affect_parent_feed |
| Pengumuman target semua/tingkat/kelas | Ada | AnnouncementController.php:89–105; Announcement.php scope | SeederDataCompletenessTest → M::test_http_targets_reach_only_matching_levels_and_classrooms; test_level_target_requires_valid_level_and_no_partial_announcement |
| Persentase SPP dan total | Ada | ReportService.php:26,166 | M7 summary → R::test_tuition_composition_aggregates_discounts_rejections_and_selected_period; test_finance_totals_and_page_share_inclusive_date_class_and_year_filters |
| Tren siswa aktif | Ada dengan batas histori | ReportService.php:50 memakai enrollment aktif/created_at dan status siswa | ReportAuditCoverageTest lulus; histori status kini tetap merupakan batas D4
| Tunggakan >30 hari | Selesai | ReportService::overdueQuery memakai status D2 dan cutoff Asia/Jakarta | Boundary, rejected/pending, diskon, dan ekspor lulus
| Ekspor PDF/Excel keuangan | Selesai | controller report, OverdueReportExport, ClassSummaryExport | Tes M7 dan ReportAuditCoverageTest lulus
| Rapor PDF lima aspek/narasi/3 anekdot/tanda tangan | Selesai | ReportService dan student-report Blade memakai rentang inklusif/fallback netral | ReportAuditCoverageTest lulus
| Empat kelas A-1/A-2/B-1/B-2 | Ada | DatabaseSeeder.php:67–70 | SeederDataCompletenessTest::test_seeder_creates_expected_students_and_accounts memeriksa 20/19/20/19 |
| Placeholder [ISI tidak ada | Ada pada pencarian area aplikasi | SecurityFixesTest.php:196 + rg resources/app | Existing scanning lulus; browser Perlu E2E |
| Template PDF judul/footer bersama | Ada sebagian | exports/*.blade.php include pdf-footer dan school-logo | R finance/summary/student/ledger/receipt menguji identitas, judul/footer + %PDF; pagination bukan bukti |
| Pencarian nama siswa/nama-NIS | Ada | Admin/InvoiceController.php:24, PaymentQueueController.php:18, CashLedgerService.php:22 | Tidak ada tes finance awal → F::test_student_name_and_nis_search_filter_invoice_queue_and_ledger_content lulus dataset nama/NIS; wildcard MySQL belum diuji |

## Pertanyaan aturan yang perlu diputuskan pemilik

1. **Guru pendamping:** kode baru mengizinkan semua pivot teacher di kelas, tetapi ERD.md:249,252 dan PRD.md:50 menyebut wali kelas aktif serta pencabutan akses guru lama. Audit memegang aturan tertulis itu; lima regresi merah tetap dipertahankan. Jika pendamping memang boleh mengisi, dokumen harus menjelaskan bagaimana akses guru lama dibedakan.
2. **Tunggakan menunggu verifikasi:** ERD.md:245 menghitung keterlambatan untuk semua status bukan lunas. Apakah laporan >30 hari juga memasukkan menunggu dan ditolak? Tes memakai belum lunas; saat ini query hanya unpaid. Kasus ini tidak dilonggarkan; konfirmasi definisi sebelum memperbaiki.
3. **Hari sekolah:** tidak ada kalender libur di skema. Tes memakai weekday yang digunakan service, pada akhir bulan penuh (22 hari di Oktober). Untuk pertengahan bulan, hari sampai hari ini atau seluruh bulan perlu diputuskan.
4. **Tren historis:** status siswa hanya terbaru. current active + created_at bukan snapshot aktif masa lalu. Perlu keputusan bila ingin rekonstruksi siswa sebelum dinonaktifkan.
5. **Kontak halaman publik:** kebijakan shared props publik hanya nama aplikasi/sekolah bersinggungan dengan bantuan tel: login; phone kosong pada tamu. Bagikan school_phone publik bila pemilik menginginkannya, bukan rekening.
6. **Brand:** DESIGN.md masih #0071E3 dan melarang hero foto, sedangkan HANDOFF mencatat palet #1C3C84 dan foto. Audit ini tidak menetapkan keputusan desain atau mengubah aplikasi/desain.
7. **RBAC baca:** matriks ARCHITECTURE.md membolehkan kepsek baca audit log, admin unduh rapor, dan staff baca pengumuman; route/middleware aktual belum menyediakan seluruh jalur tersebut. Tidak dibuat tes menebak route yang belum didefinisikan; konfirmasi endpoint yang dikehendaki.

## Perlu MySQL

SQLite tidak menegakkan ONLY_FULL_GROUP_BY dan tidak membuktikan lockForUpdate, deadlock, lock cache antarproses, collation, wildcard escaping, atau cast DATE MySQL. Tidak ada MySQL yang dibuat/direset/di-seed pada tugas ini.

- Jalankan query `tuitionSummary`, `journalCompletion` (roster dan agregasi jurnal), `overdueStudents`, `financeTotals`, `monthlyReceived` (filter invoice/enrollment), `classSummaryReport`, serta agregasi SUM/CASE cash-ledger pada MySQL `skms_test` dengan ONLY_FULL_GROUP_BY aktif. Periksa GROUP BY, filter kelas/tahun, urutan, join enrollment, zona waktu dan batas tanggal; SQLite tidak membuktikan kompatibilitas MySQL.
- Jalankan worker/barrier terpisah untuk generate periode sama, submit ganda, approve/approve, approve/reject, dan benturan invoice/KWT. Suite ConcurrencySafeNumberingTest saat ini hanya sequential meski namanya menyebut concurrency.
- Periksa cache lock shared nyata; konfigurasi suite MySQL masih CACHE_STORE=array, bukan shared antarproses.
- Approve mengambil payment→invoice, reject invoice→payment (PaymentVerificationService.php:73–74,128–129); telusuri potensi deadlock, bukan klaim terjadi tanpa bukti.
- Periksa kasus tanggal ledger akhir bulan pada MySQL DATE: failure SQLite tidak boleh digeneralisasi menjadi failure MySQL.
- Periksa pencarian %, _, backslash serta perbedaan LIKE/collation.

SQL untuk dijalankan **oleh pemilik** (belum dijalankan):

```sql
CREATE DATABASE skms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SELECT @@SESSION.sql_mode;
```

Dengan koneksi lokal tersedia dan database persis skms_test, jalankan `composer test:mysql`. Konfigurasinya phpunit.mysql.xml dan pengaman tests/TestCase.php:15 menolak database selain SQLite :memory: atau MySQL skms_test sebelum RefreshDatabase. Ini menjalankan suite yang sama, **belum** menambahkan worker parallel. Jangan menjalankan ke skms atau mengganti .env. Kredensial test bila diperlukan hanya melalui environment terminal; tidak ditulis di dokumen ini.

## Perlu E2E

`npm run e2e` tidak dijalankan dalam audit ini: runner e2e/run.mjs:21–29 membuat/reset database file database/e2e.sqlite, menjalankan seeder, dan menulis e2e-results di luar daftar berkas yang diizinkan tugas; AGENTS membatasi database tes ke SQLite in-memory/skms_test. Tidak ada batch yang diklaim selesai tanpa E2E. Minta izin/selaraskan pengaman sebelum runner digunakan. Pemeriksaan source menemukan:

- Smoke hanya login/home empat role pada tiga viewport, bukan semua halaman, dialogs, atau alur keuangan.
- e2e/helpers/page-checks.ts:18 hanya console.warn untuk axe serious/critical; tidak ada expect yang membuat test gagal pada pelanggaran tersebut. Klaim lulus smoke tidak berarti aksesibilitas lulus.
- Tidak ada workflow generate→upload→reject/resubmit→approve→download, autosave/final/locked, dialog akun sekali, clipboard/print, ganti anak, pie/semester, pilih galeri tanpa Kamera, dan bantuan tel:.
- Perlu memeriksa ukuran font audit log (10/11px di sejumlah detail), kontras palet baru, fallback logo/foto, focus/tap targets, responsive 390/834/1440, dan nomer halaman PDF output. Audit ini membaca React/render statis tertentu; tidak menyatakan kecocokan piksel.
- Fixture B merender komponen React asli dengan props Inertia buatan, tidak menguji browser/hydration/CSS. Node/React/TypeScript yang terpasang dipakai tanpa menambah dependency.

## Koreksi HANDOFF yang diperlukan

Angka 85/558 adalah historis, baseline sekarang 112/1606. Klaim Batch 1 integritas sempurna, Batch 3C RBAC lengkap, Batch 3D agregasi benar, Batch 3E seluruh audit, Batch 4 seluruh state/aksesibilitas terverifikasi harus diturunkan menjadi sebagian. Klaim ProgressSteps angka sudah usang: komponen kini titik/ring/centang dan 5 tes JS lulus. Klaim logo belum ada usang: aset benar-benar ada. Catatan HANDOFF sebelumnya menyuruh menjalankan sendiri migrate:fresh --seed tanpa database eksplisit berisiko menimpa skms; instruksi itu dihapus dari status terkini. Riwayat hasil audit lama di REVIEW-REPORT tidak diubah karena di luar berkas yang diizinkan.



## Inventaris setelah Tahap B

| Berkas | Metode PHP terdeteksi | Terakhir diubah |
|---|---:|---|
| `tests/Feature/AdminAuditLogUiTest.php` | 2 | 2026-10-08 23:46:58 |
| `tests/Feature/AdminFinanceTest.php` | 7 | 2026-10-08 02:18:35 |
| `tests/Feature/Auth/AuthenticationTest.php` | 4 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/PasswordResetTest.php` | 4 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/PasswordUpdateTest.php` | 2 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/RegistrationTest.php` | 1 | 2026-10-07 01:52:30 |
| `tests/Feature/Auth/RoleAccessTest.php` | 4 | 2026-10-07 18:47:37 |
| `tests/Feature/AuthorizationScopeTest.php` | 2 | 2026-10-07 01:52:30 |
| `tests/Feature/BrandIdentityAuditCoverageTest.php` | 3 | 2026-10-14 17:29:56 |
| `tests/Feature/ConcurrencySafeNumberingTest.php` | 5 | 2026-10-08 15:29:21 |
| `tests/Feature/DomainFlowTest.php` | 11 | 2026-10-07 18:47:56 |
| `tests/Feature/ExampleTest.php` | 1 | 2026-10-09 11:11:46 |
| `tests/Feature/FinanceAuditCoverageTest.php` | 15 | 2026-10-14 17:23:24 |
| `tests/Feature/JournalFlowTest.php` | 11 | 2026-10-08 18:05:57 |
| `tests/Feature/JournalRbacAuditCoverageTest.php` | 20 | 2026-10-14 17:20:56 |
| `tests/Feature/MasterAnnouncementAuditCoverageTest.php` | 11 | 2026-10-14 17:22:43 |
| `tests/Feature/MasterDataTest.php` | 16 | 2026-10-08 21:32:25 |
| `tests/Feature/MilestoneM6Test.php` | 8 | 2026-10-08 14:41:43 |
| `tests/Feature/MilestoneM7Test.php` | 6 | 2026-10-12 20:12:21 |
| `tests/Feature/MilestoneServicesTest.php` | 1 | 2026-10-07 01:52:30 |
| `tests/Feature/ParentInvoiceUiTest.php` | 6 | 2026-10-08 15:28:35 |
| `tests/Feature/ProfileTest.php` | 1 | 2026-10-07 18:49:11 |
| `tests/Feature/ReportAuditCoverageTest.php` | 22 | 2026-10-14 17:26:33 |
| `tests/Feature/SecurityFixesTest.php` | 14 | 2026-10-12 20:17:04 |
| `tests/Feature/SeederDataCompletenessTest.php` | 4 | 2026-10-13 00:26:40 |
| `tests/Feature/StyleguideTest.php` | 1 | 2026-10-08 15:29:21 |
| `tests/fixtures/render-brand.mjs` | 0 | 2026-10-14 17:29:56 |
| `tests/js/progress-steps.test.mjs` | 0 | 2026-10-08 12:49:39 |
| `tests/js/text-contrast.test.mjs` | 0 | 2026-10-08 12:48:44 |
| `tests/TestCase.php` | 0 | 2026-10-07 18:50:25 |
| `tests/Unit/ExampleTest.php` | 1 | 2026-10-07 01:57:53 |

Inventaris ini mencakup **31 berkas** (termasuk fixture JS/runner). Metode PHP terdeteksi: **183**; PHPUnit akhir mendeteksi **199 kasus** karena data provider memperluas metode menjadi beberapa kasus. Berkas tests/fixtures/render-brand.mjs hanya fixture komponen, bukan kasus PHPUnit.





