<?php

namespace Tests\Feature;

use App\Enums\JournalAspect;
use App\Models\AcademicYear;
use App\Models\AnecdotalNote;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportAuditCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-10-31 12:00:00', 'Asia/Jakarta'));
    }

    public function test_tuition_composition_aggregates_discounts_rejections_and_selected_period(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        Invoice::factory()->create(['academic_year_id' => $year->id, 'period_month' => 9, 'amount' => 999999]);
        Invoice::factory()->create(['period_month' => 10, 'amount' => 888888]);

        $summary = app(ReportService::class)->tuitionSummary(10, 2026, $year->id);

        $this->assertSame(4, $summary['total_invoices']);
        $this->assertSame(25.0, $summary['paid_percentage']);
        $this->assertSame(1295000, $summary['target_amount']);
        $this->assertSame([
            'lunas' => ['count' => 1, 'amount' => 350000],
            'menunggu_verifikasi' => ['count' => 1, 'amount' => 190000],
            'belum_bayar' => ['count' => 2, 'amount' => 755000],
        ], $summary['composition']);
    }

    public function test_empty_tuition_and_finance_have_zero_totals_without_division_by_zero(): void
    {
        $summary = app(ReportService::class)->tuitionSummary(10, 2026);
        $this->assertEquals(0, $summary['paid_percentage']);
        $this->assertSame(0, $summary['target_amount']);
        $this->assertSame(0, $summary['total_invoices']);
        $this->assertSame(['received' => 0, 'unreceived' => 0, 'invoice_count' => 0], app(ReportService::class)->financeTotals([]));
    }

    public function test_student_trend_counts_database_registration_dates_and_selected_academic_year(): void
    {
        $year = $this->academicYear();
        $classroom = Classroom::factory()->create(['academic_year_id' => $year->id]);
        foreach (['2026-07-31 23:59:59', '2026-08-01 00:00:00', '2026-10-15 10:00:00'] as $date) {
            $student = Student::factory()->create(['created_at' => $date]);
            $this->enroll($student, $classroom);
            $student->enrollments()->first()->forceFill(['created_at' => $date])->save();
        }
        $inactive = Student::factory()->create(['status' => 'nonaktif', 'created_at' => '2026-07-01']);
        $this->enroll($inactive, $classroom);
        Student::factory()->create(['created_at' => '2026-07-01']);

        $trend = app(ReportService::class)->activeStudentTrend($year->id, 4, Carbon::parse('2026-10-31'));

        $this->assertSame(['2026-07', '2026-08', '2026-09', '2026-10'], array_column($trend, 'period'));
        $this->assertSame([1, 2, 2, 3], array_column($trend, 'total'));
    }

    public function test_journal_completion_uses_final_journals_over_school_days_times_active_students(): void
    {
        $year = $this->academicYear();
        $teacher = Teacher::factory()->create();
        $classroom = Classroom::factory()->create(['academic_year_id' => $year->id, 'homeroom_teacher_id' => $teacher->id]);
        $first = Student::factory()->create();
        $second = Student::factory()->create();
        $inactive = Student::factory()->create(['status' => 'nonaktif']);
        foreach ([$first, $second, $inactive] as $student) {
            $this->enroll($student, $classroom);
        }
        $this->journal($first, $classroom, $teacher, '2026-10-01');
        $this->journal($second, $classroom, $teacher, '2026-10-01');
        $this->journal($first, $classroom, $teacher, '2026-10-02');
        $this->journal($second, $classroom, $teacher, '2026-10-02', 'draf');
        $this->journal($first, $classroom, $teacher, '2026-09-30');

        $completion = app(ReportService::class)->journalCompletion(10, 2026, $year->id);

        $this->assertCount(1, $completion);
        $this->assertSame($teacher->id, $completion[0]['teacher_id']);
        // October 2026 has 22 weekdays: three final records out of 44 possible records.
        $this->assertEquals(6.8, $completion[0]['percentage']);
    }

    public function test_overdue_strictly_excludes_thirty_days_and_groups_discounted_invoices(): void
    {
        $year = $this->academicYear();
        $student = Student::factory()->create();
        foreach ([['2026-09-30', 8, 300000, 50000], ['2026-09-01', 9, 200000, 10000]] as [$due, $month, $amount, $discount]) {
            Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'due_date' => $due, 'period_month' => $month, 'amount' => $amount, 'discount_amount' => $discount]);
        }
        Invoice::factory()->create(['academic_year_id' => $year->id, 'due_date' => '2026-10-01']);
        Invoice::factory()->create(['academic_year_id' => $year->id, 'due_date' => '2026-09-30', 'status' => 'lunas']);
        Invoice::factory()->create(['due_date' => '2026-09-01']);

        $overdue = app(ReportService::class)->overdueStudents(30, $year->id);

        $this->assertCount(1, $overdue);
        $this->assertSame($student->id, $overdue[0]['student_id']);
        $this->assertSame(440000, $overdue[0]['amount']);
        $this->assertSame(2, $overdue[0]['invoice_count']);
        $this->assertSame('2026-09-01', Carbon::parse($overdue[0]['oldest_due_date'])->toDateString());
        $this->assertSame('Agustus 2026, September 2026', $overdue[0]['months']);
    }

    public function test_overdue_excludes_pending_and_includes_rejected_invoices(): void
    {
        $year = $this->academicYear();
        $student = Student::factory()->create();
        Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'period_month' => 8, 'due_date' => '2026-09-01', 'status' => 'ditolak', 'amount' => 300000, 'discount_amount' => 50000]);
        Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'period_month' => 9, 'due_date' => '2026-09-30', 'status' => 'menunggu_verifikasi', 'amount' => 200000]);

        $rows = app(ReportService::class)->overdueStudents(30, $year->id);

        $this->assertCount(1, $rows);
        $this->assertSame(250000, $rows[0]['amount']);
        $this->assertSame(1, $rows[0]['invoice_count']);
    }

    public function test_finance_totals_and_page_share_inclusive_date_class_and_year_filters(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        Invoice::factory()->create(['academic_year_id' => $year->id, 'amount' => 999999]);
        $outside = Student::factory()->create();
        $this->enroll($outside, $classroom);
        Invoice::factory()->create(['student_id' => $outside->id, 'academic_year_id' => $year->id, 'period_month' => 9, 'due_date' => '2026-09-30', 'amount' => 888888]);
        Invoice::factory()->create(['student_id' => $outside->id, 'period_year' => 2025, 'due_date' => '2026-10-01', 'amount' => 777777]);
        $filters = ['start_date' => '2026-10-01', 'end_date' => '2026-10-31', 'academic_year_id' => $year->id, 'classroom_id' => $classroom->id];

        $this->assertSame(['received' => 350000, 'unreceived' => 945000, 'invoice_count' => 4], app(ReportService::class)->financeTotals($filters));
        $this->assertSame(['received' => 350000, 'unreceived' => 0, 'invoice_count' => 1], app(ReportService::class)->financeTotals($filters + ['status' => 'lunas']));
        $this->actingAs($this->user('kepala_sekolah'))->get('/kepsek/laporan-keuangan?'.http_build_query($filters))
            ->assertInertia(fn (Assert $page) => $page->component('Kepsek/FinanceReport')
                ->where('totals.received', 350000)->where('totals.unreceived', 945000)
                ->where('invoices.total', 4)->has('invoices.data', 4));
    }

    public function test_monthly_received_uses_cash_ledger_and_fills_empty_months(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        $this->ledger($invoices[0], '2026-07-31', 350000);
        $this->ledger($invoices[1], '2026-09-01', 190000);
        $this->ledger($invoices[2], '2026-10-01', 275000);
        $this->ledger($invoices[3], '2026-10-31', 480000);
        $excluded = Invoice::factory()->create();
        $this->ledger($excluded, '2026-06-30', 999999);

        $rows = app(ReportService::class)->monthlyReceived(['end_date' => '2026-10-31'], 4);

        $this->assertSame(['2026-07', '2026-08', '2026-09', '2026-10'], array_column($rows, 'period'));
        $this->assertSame([350000, 0, 190000, 755000], array_column($rows, 'total'));
    }

    public function test_monthly_received_respects_the_selected_academic_year_and_class(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        $this->ledger($invoices[0], '2026-10-01', 350000);
        $otherClass = Invoice::factory()->create(['academic_year_id' => $year->id]);
        $this->ledger($otherClass, '2026-10-01', 999999);
        $otherYear = Invoice::factory()->create();
        $this->ledger($otherYear, '2026-10-01', 888888);

        $rows = app(ReportService::class)->monthlyReceived(['end_date' => '2026-10-31', 'academic_year_id' => $year->id, 'classroom_id' => $classroom->id], 4);

        $this->assertSame([0, 0, 0, 350000], array_column($rows, 'total'));
    }

    public function test_class_summary_aggregates_invoice_counts_net_amounts_and_all_class_totals(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        Classroom::factory()->create(['academic_year_id' => $year->id, 'name' => 'B-2']);
        Invoice::factory()->create(['student_id' => $invoices[0]->student_id, 'period_year' => 2025, 'amount' => 999999]);
        $summary = app(ReportService::class)->classSummaryReport($year->id);
        $row = collect($summary['classes'])->firstWhere('id', $classroom->id);

        $this->assertCount(2, $summary['classes']);
        $this->assertSame(4, $row['student_count']);
        $this->assertSame(4, $row['invoice_count']);
        $this->assertSame(1, $row['paid_count']);
        $this->assertSame(3, $row['unpaid_count']);
        $this->assertSame(1, $row['pending_count']);
        $this->assertSame(350000, $row['received_amount']);
        $this->assertSame(945000, $row['outstanding_amount']);
        $this->assertSame(25.0, $row['achievement_percentage']);
        $this->assertSame(4, $summary['totals']['invoice_count']);
        $this->assertSame(350000, $summary['totals']['received_amount']);
        $this->assertSame(945000, $summary['totals']['outstanding_amount']);
        $this->assertSame(0, $row['overdue_count']);
    }

    public function test_dashboard_supplies_database_pie_composition_and_configured_semester_progress(): void
    {
        [$year] = $this->financeFixture();
        SchoolSetting::create(['key' => 'semester_1_start', 'value' => '2026-10-01']);
        SchoolSetting::create(['key' => 'semester_1_end', 'value' => '2026-11-29']);

        $this->actingAs($this->user('kepala_sekolah'))->get('/kepsek?month=10&academic_year_id='.$year->id)
            ->assertInertia(fn (Assert $page) => $page->component('Kepsek/Dashboard')
                ->where('summary.paid_percentage', 25)
                ->where('summary.composition.lunas.count', 1)
                ->where('summary.composition.menunggu_verifikasi.count', 1)
                ->where('summary.composition.belum_bayar.count', 2)
                ->where('semesterProgress.name', 'Semester 1')
                ->where('semesterProgress.start', '2026-10-01')
                ->where('semesterProgress.end', '2026-11-29')
                ->where('semesterProgress.days_elapsed', 31)
                ->where('semesterProgress.days_total', 60));
    }

    public function test_finance_pdf_renders_filtered_rows_net_totals_title_and_shared_footer(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        $outsider = Invoice::factory()->create(['academic_year_id' => $year->id, 'invoice_number' => 'EXCLUDED-INVOICE']);
        $principal = $this->user('kepala_sekolah');
        $this->schoolSettings();
        $this->actingAs($principal);

        $this->assertPdfContent('/kepsek/laporan-keuangan/pdf?academic_year_id='.$year->id.'&classroom_id='.$classroom->id,
            ['Laporan Keuangan Sekolah', 'Sekolah Audit', 'Jalan Audit 17', $principal->name, '31 Oktober 2026, 12:00', 'WIB', 'Halaman', 'Rp 350.000', 'Rp 945.000', $invoices[0]->invoice_number, $invoices[0]->student->name],
            [$outsider->invoice_number]);
    }

    public function test_finance_excel_contains_filtered_invoice_rows_and_integer_net_amounts(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        Invoice::factory()->create(['academic_year_id' => $year->id, 'invoice_number' => 'EXCLUDED-INVOICE']);
        $this->actingAs($this->user('kepala_sekolah'));

        $rows = $this->spreadsheetRows('/kepsek/laporan-keuangan/excel?academic_year_id='.$year->id.'&classroom_id='.$classroom->id);

        $this->assertSame(['Nomor tagihan', 'Siswa', 'Status', 'Jatuh tempo', 'Nominal'], $rows[0]);
        $this->assertCount(5, $rows);
        $mapped = collect(array_slice($rows, 1))->keyBy(fn ($row) => $row[0]);
        foreach ($invoices as $invoice) {
            $this->assertSame($invoice->student->name, $mapped[$invoice->invoice_number][1]);
            $this->assertEquals($invoice->amount - $invoice->discount_amount, $mapped[$invoice->invoice_number][4]);
        }
        $this->assertFalse($mapped->has('EXCLUDED-INVOICE'));
    }

    public function test_admin_arrears_excel_excludes_paid_and_not_yet_overdue_invoices(): void
    {
        $year = $this->academicYear();
        $overdue = Invoice::factory()->create(['academic_year_id' => $year->id, 'due_date' => '2026-09-30']);
        Invoice::factory()->create(['academic_year_id' => $year->id, 'due_date' => '2026-09-30', 'status' => 'lunas']);
        Invoice::factory()->create(['academic_year_id' => $year->id, 'due_date' => '2026-10-01']);
        $this->actingAs($this->user('admin'));

        $rows = $this->spreadsheetRows('/admin/laporan/excel?tab=tunggakan&academic_year_id='.$year->id);

        $this->assertCount(3, $rows, 'The arrears export must contain its header, overdue invoices, and a total row.');
        $this->assertSame($overdue->student->name, $rows[1][0]);
        $this->assertSame('Total', $rows[2][0]);
    }

    public function test_class_summary_excel_contains_classes_and_matching_total_row(): void
    {
        [$year] = $this->financeFixture();
        $this->actingAs($this->user('admin'));

        $rows = $this->spreadsheetRows('/admin/laporan/excel?tab=ringkasan_kelas&academic_year_id='.$year->id);

        $this->assertCount(3, $rows);
        $this->assertSame('Jumlah tagihan', $rows[0][3]);
        $this->assertSame('Kelompok A-1', $rows[1][0]);
        $this->assertSame('Total', $rows[2][0]);
        foreach ([2 => 4, 3 => 4, 4 => 1295000, 5 => 350000, 6 => 945000, 7 => 1, 8 => 0] as $column => $expected) {
            $this->assertEquals($expected, $rows[1][$column]);
            $this->assertEquals($expected, $rows[2][$column]);
        }
        $this->assertSame('25%', $rows[2][9]);
    }

    public function test_admin_class_summary_pdf_contains_class_amounts_totals_and_shared_footer(): void
    {
        [$year, $classroom] = $this->financeFixture();
        $admin = $this->user('admin');
        $this->actingAs($admin);
        $this->schoolSettings();

        $this->assertPdfContent('/admin/laporan/pdf?tab=ringkasan_kelas&academic_year_id='.$year->id,
            ['Laporan Ringkasan Penerimaan SPP per Kelas', $classroom->display_name, 'Guru Audit', 'Jumlah tagihan', 'Rp 1.295.000', 'Rp 350.000', 'Rp 945.000', '25%', 'Total', 'Sekolah Audit', 'Jalan Audit 17', $admin->name, 'Halaman']);
    }

    public function test_admin_arrears_pdf_contains_only_strictly_overdue_unpaid_data(): void
    {
        $year = $this->academicYear();
        $student = Student::factory()->create(['name' => 'Siswa Menunggak Audit']);
        Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'due_date' => '2026-09-30', 'period_month' => 9, 'amount' => 350000, 'discount_amount' => 50000]);
        $paid = Student::factory()->create(['name' => 'Siswa Lunas Audit']);
        Invoice::factory()->create(['student_id' => $paid->id, 'academic_year_id' => $year->id, 'due_date' => '2026-09-30', 'status' => 'lunas']);
        $boundary = Student::factory()->create(['name' => 'Siswa Tiga Puluh Hari Audit']);
        Invoice::factory()->create(['student_id' => $boundary->id, 'academic_year_id' => $year->id, 'due_date' => '2026-10-01']);
        $this->actingAs($this->user('admin'));

        $this->assertPdfContent('/admin/laporan/pdf?tab=tunggakan&academic_year_id='.$year->id,
            ['Laporan Tunggakan SPP (>30 Hari)', $student->name, 'September 2026', 'Rp 300.000', 'Total Tunggakan'],
            [$paid->name, $boundary->name]);
    }

    public function test_student_report_pdf_contains_five_aspects_database_narratives_three_anecdotes_and_signatures(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        $teacher = $classroom->homeroomTeacher;
        $student = $invoices[0]->student;
        $principal = $this->user('kepala_sekolah');
        Teacher::factory()->create(['user_id' => $principal->id, 'nip' => 'PRINCIPAL-AUDIT']);
        $this->schoolSettings();
        $journal = $this->journal($student, $classroom, $teacher, '2026-10-01');
        foreach (JournalAspect::cases() as $aspect) {
            $journal->assessments()->create(['aspect' => $aspect, 'level' => 'BSH', 'note' => 'Narasi tersimpan '.$aspect->value]);
        }
        $draft = $this->journal($student, $classroom, $teacher, '2026-10-02', 'draf');
        $draft->assessments()->create(['aspect' => 'bahasa', 'level' => 'BB', 'note' => 'Narasi draf rahasia']);
        $outside = $this->journal($student, $classroom, $teacher, '2027-01-02');
        $outside->assessments()->create(['aspect' => 'bahasa', 'level' => 'BB', 'note' => 'Narasi semester lain']);
        for ($day = 1; $day <= 4; $day++) {
            AnecdotalNote::create(['student_id' => $student->id, 'teacher_id' => $teacher->id, 'noted_at' => '2026-10-0'.$day.' 10:00:00', 'observed_behavior' => 'Anekdot audit '.$day, 'interpretation' => 'Interpretasi audit '.$day, 'follow_up' => 'Tindak lanjut']);
        }
        $report = app(ReportService::class)->studentReport($student, $year);
        $this->assertCount(5, $report['assessments']);
        foreach (JournalAspect::cases() as $aspect) {
            $this->assertSame(['BSH' => 1], $report['assessments'][$aspect->value]);
            $this->assertSame(['Narasi tersimpan '.$aspect->value], $report['narratives'][$aspect->value]);
        }
        $this->assertCount(3, $report['anecdotes']);
        $this->assertSame('Anekdot audit 4 Interpretasi audit 4', $report['anecdotes'][0]['text']);
        $this->actingAs($principal);

        $expected = ['Laporan Perkembangan Anak', 'Sekolah Audit', 'Jalan Audit 17', $student->name, $student->nis, 'Nilai Agama dan Moral', 'Fisik Motorik', 'Kognitif', 'Bahasa', 'Sosial Emosional', 'BSH 1 hari', 'Anekdot audit 4', 'Anekdot audit 3', 'Anekdot audit 2', $teacher->name, $teacher->nip, $principal->name, 'PRINCIPAL-AUDIT', 'Wali Kelas', 'Kepala Sekolah', 'Halaman'];
        foreach (JournalAspect::cases() as $aspect) {
            $expected[] = 'Narasi tersimpan '.$aspect->value;
        }
        $this->assertPdfContent('/kepsek/laporan-evaluasi/pdf?student_id='.$student->id.'&academic_year_id='.$year->id, $expected, ['Narasi draf rahasia', 'Narasi semester lain', 'Anekdot audit 1']);
    }

    public function test_student_report_includes_anecdotes_on_last_day_of_selected_semester(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        $student = $invoices[0]->student;
        AnecdotalNote::create(['student_id' => $student->id, 'teacher_id' => $classroom->homeroom_teacher_id, 'noted_at' => '2026-12-31 15:00:00', 'observed_behavior' => 'Pengamatan akhir semester', 'interpretation' => 'Interpretasi terakhir', 'follow_up' => 'Tindak lanjut']);

        $report = app(ReportService::class)->studentReport($student, $year, 'semester_1');

        $this->assertCount(1, $report['anecdotes']);
        $this->assertSame('Pengamatan akhir semester Interpretasi terakhir', $report['anecdotes'][0]['text']);
    }

    public function test_empty_student_report_does_not_invent_development_narratives(): void
    {
        [$year, $classroom, $invoices] = $this->financeFixture();
        $this->actingAs($this->user('kepala_sekolah'));

        $this->assertPdfContent('/kepsek/laporan-evaluasi/pdf?student_id='.$invoices[0]->student_id.'&academic_year_id='.$year->id,
            ['Laporan Perkembangan Anak', 'BSH 0 hari'],
            ['Aisyah terbiasa berdoa', 'Keterampilan motorik halus berkembang sangat baik', 'Mampu menyampaikan ide dan bercerita kembali']);
    }

    public function test_cash_ledger_pdf_and_excel_contain_filtered_money_balances_and_shared_footer(): void
    {
        [, , $invoices] = $this->financeFixture();
        $this->ledger($invoices[0], '2026-09-30', 350000);
        $this->ledger($invoices[1], '2026-10-05', 190000);
        $admin = $this->user('admin');
        $this->actingAs($admin);
        $this->schoolSettings();
        $query = '?start_date=2026-10-01&end_date=2026-10-31';

        $this->assertPdfContent('/admin/buku-kas/pdf'.$query,
            ['Buku kas', $invoices[1]->invoice_number, 'Rp 190.000', 'Rp 350.000', 'Rp 540.000', 'Sekolah Audit', 'Jalan Audit 17', $admin->name, 'Halaman'],
            [$invoices[0]->invoice_number]);
        $rows = $this->spreadsheetRows('/admin/buku-kas/excel'.$query);
        $this->assertCount(3, $rows);
        $this->assertSame(['Tanggal', 'Keterangan', 'No. tagihan', 'Kelas', 'Masuk (Rp)', 'Saldo berjalan (Rp)'], $rows[0]);
        $this->assertSame($invoices[1]->invoice_number, $rows[1][2]);
        $this->assertEquals(190000, $rows[1][4]);
        $this->assertEquals(540000, $rows[1][5]);
        $this->assertSame('Total penerimaan periode ini', $rows[2][1]);
        $this->assertEquals(190000, $rows[2][4]);
        $this->assertEquals(540000, $rows[2][5]);
    }

    public function test_own_paid_receipt_pdf_contains_receipt_number_net_amount_and_school_footer(): void
    {
        [, , $invoices] = $this->financeFixture();
        $invoice = $invoices[0];
        $this->ledger($invoice, '2026-10-05', 350000);
        $parent = $this->user('orang_tua');
        $guardian = Guardian::factory()->create(['user_id' => $parent->id]);
        $guardian->students()->attach($invoice->student_id, ['relationship' => 'ibu', 'is_primary' => true]);
        $this->actingAs($parent);
        $this->schoolSettings();

        $this->assertPdfContent('/ortu/tagihan/'.$invoice->id.'/kuitansi',
            ['Bukti Pembayaran', $invoice->invoice_number, $invoice->cashLedgerEntry->receipt_number, $invoice->student->name, 'Rp 350.000', '05-10-2026', 'Sekolah Audit', 'Jalan Audit 17', $parent->name, 'Halaman']);
    }

    private function academicYear(): AcademicYear
    {
        return AcademicYear::factory()->create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
    }

    private function user(string $role): User
    {
        Role::findOrCreate($role, 'web');
        $user = User::factory()->create(['name' => 'Pengguna audit '.$role]);
        $user->assignRole($role);

        return $user;
    }

    private function enroll(Student $student, Classroom $classroom): void
    {
        $student->enrollments()->create(['classroom_id' => $classroom->id, 'academic_year_id' => $classroom->academic_year_id, 'status' => 'aktif']);
    }

    private function financeFixture(): array
    {
        $year = $this->academicYear();
        $teacher = Teacher::factory()->create(['name' => 'Guru Audit', 'nip' => 'TEACHER-AUDIT']);
        $classroom = Classroom::factory()->create(['academic_year_id' => $year->id, 'homeroom_teacher_id' => $teacher->id, 'name' => 'A-1', 'level' => 'A']);
        $invoices = [];
        foreach ([['lunas', 400000, 50000, '2026-10-01'], ['menunggu_verifikasi', 200000, 10000, '2026-10-01'], ['ditolak', 300000, 25000, '2026-10-01'], ['belum_bayar', 500000, 20000, '2026-10-31']] as [$status, $amount, $discount, $due]) {
            $student = Student::factory()->create();
            $this->enroll($student, $classroom);
            $invoices[] = Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'status' => $status, 'amount' => $amount, 'discount_amount' => $discount, 'due_date' => $due]);
        }

        return [$year, $classroom, $invoices];
    }

    private function journal(Student $student, Classroom $classroom, Teacher $teacher, string $date, string $status = 'final'): DailyJournal
    {
        return DailyJournal::create(['student_id' => $student->id, 'classroom_id' => $classroom->id, 'teacher_id' => $teacher->id, 'journal_date' => $date, 'activity_summary' => 'Kegiatan audit', 'status' => $status]);
    }

    private function ledger(Invoice $invoice, string $date, int $amount): void
    {
        $invoice->update(['status' => 'lunas', 'paid_at' => $date]);
        $payment = Payment::factory()->create(['invoice_id' => $invoice->id, 'status' => 'disetujui', 'amount_transferred' => $amount, 'transfer_date' => $date]);
        CashLedgerEntry::factory()->create(['invoice_id' => $invoice->id, 'payment_id' => $payment->id, 'entry_date' => $date, 'amount_in' => $amount]);
    }

    private function schoolSettings(): void
    {
        SchoolSetting::create(['key' => 'school_name', 'value' => 'Sekolah Audit']);
        SchoolSetting::create(['key' => 'school_address', 'value' => 'Jalan Audit 17']);
    }

    private function spreadsheetRows(string $url): array
    {
        $response = $this->get($url)->assertOk();
        $spreadsheet = IOFactory::load($response->baseResponse->getFile()->getPathname());

        try {
            return $spreadsheet->getActiveSheet()->toArray(null, true, false, false);
        } finally {
            $spreadsheet->disconnectWorksheets();
        }
    }

    private function assertPdfContent(string $url, array $expected, array $excluded = []): void
    {
        $renderer = app('dompdf.wrapper');
        $text = '';
        Pdf::shouldReceive('loadView')->once()->andReturnUsing(function (string $view, array $data) use ($renderer, &$text) {
            $html = view($view, $data)->render();
            $content = preg_replace('/<style[^>]*>.*?<\/style>/si', '', $html);
            $text = html_entity_decode(preg_replace('/\s+/u', ' ', strip_tags($content)), ENT_QUOTES, 'UTF-8');

            return $renderer->loadHTML($html);
        });

        $response = $this->get($url)->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        foreach ($expected as $value) {
            $this->assertStringContainsString($value, $text);
        }
        foreach ($excluded as $value) {
            $this->assertStringNotContainsString($value, $text);
        }
    }
}
