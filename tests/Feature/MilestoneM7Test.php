<?php

namespace Tests\Feature;

use App\Enums\AssessmentLevel;
use App\Enums\InvoiceStatus;
use App\Enums\JournalAspect;
use App\Enums\JournalStatus;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MilestoneM7Test extends TestCase
{
    use RefreshDatabase;

    public function test_tuition_summary_calculates_database_totals(): void
    {
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $students = Student::factory()->count(4)->create();
        Invoice::factory()->create(['student_id' => $students[0]->id, 'academic_year_id' => $year->id, 'status' => InvoiceStatus::Paid, 'amount' => 300000]);
        Invoice::factory()->create(['student_id' => $students[1]->id, 'academic_year_id' => $year->id, 'status' => InvoiceStatus::Pending, 'amount' => 300000]);
        Invoice::factory()->create(['student_id' => $students[2]->id, 'academic_year_id' => $year->id, 'status' => InvoiceStatus::Unpaid, 'amount' => 300000]);

        $summary = app(ReportService::class)->tuitionSummary(10, 2026, $year->id);

        $this->assertSame(3, $summary['total_invoices']);
        $this->assertSame(33.3, $summary['paid_percentage']);
        $this->assertSame(1, $summary['composition']['lunas']['count']);
        $this->assertSame(900000, $summary['target_amount']);
    }

    public function test_journal_completion_and_overdue_calculations(): void
    {
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $teacherUser = User::factory()->create();
        $teacherUser->assignRole(Role::findOrCreate('guru', 'web'));
        $teacher = Teacher::factory()->create([
            'user_id' => $teacherUser->id,
            'name' => 'Ibu Guru',
            'phone' => '08123456789',
        ]);
        $classroom = Classroom::create([
            'academic_year_id' => $year->id,
            'name' => 'Kelompok A',
            'age_range' => '4-5',
            'homeroom_teacher_id' => $teacher->id,
        ]);

        $student = Student::factory()->create(['status' => 'aktif']);
        $student->enrollments()->create([
            'classroom_id' => $classroom->id,
            'academic_year_id' => $year->id,
            'status' => 'aktif',
        ]);

        // Create a final journal entry
        $journal = DailyJournal::create([
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'classroom_id' => $classroom->id,
            'journal_date' => now()->format('Y-m-d'),
            'activity_summary' => 'Belajar berhitung',
            'status' => JournalStatus::Final,
        ]);
        $journal->assessments()->create([
            'aspect' => JournalAspect::Moral,
            'level' => AssessmentLevel::BSH,
        ]);

        $reportService = app(ReportService::class);
        $completion = $reportService->journalCompletion((int) now()->format('n'), (int) now()->format('Y'), $year->id);

        $this->assertNotEmpty($completion);
        $this->assertSame('Kelompok A', $completion[0]['classroom_name']);
        $this->assertSame('Ibu Guru', $completion[0]['teacher_name']);
        $this->assertSame(1, $completion[0]['possible']);
        $this->assertSame(100.0, $completion[0]['percentage']);

        // Test overdue > 30 days
        $overdueInvoice = Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_year_id' => $year->id,
            'status' => InvoiceStatus::Unpaid,
            'amount' => 300000,
            'due_date' => now()->subDays(45)->format('Y-m-d'),
            'period_month' => (int) now()->subMonths(1)->format('n'),
            'period_year' => (int) now()->subMonths(1)->format('Y'),
        ]);

        $overdue = $reportService->overdueStudents(30, $year->id);
        $this->assertCount(1, $overdue);
        $this->assertSame($student->name, $overdue[0]['student_name']);
        $this->assertSame(300000, $overdue[0]['amount']);
    }

    public function test_principal_can_read_dashboard_but_teacher_cannot_read_finance(): void
    {
        foreach (['guru', 'kepala_sekolah', 'orang_tua', 'admin'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $principal = User::factory()->create();
        $principal->assignRole('kepala_sekolah');
        $teacher = User::factory()->create();
        $teacher->assignRole('guru');
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($principal)->get('/kepsek')->assertInertia(fn (Assert $page) => $page->component('Kepsek/Dashboard'));
        $this->actingAs($principal)->get('/kepsek/laporan-keuangan')->assertInertia(fn (Assert $page) => $page->component('Kepsek/FinanceReport'));
        $this->actingAs($teacher)->get('/kepsek/laporan-keuangan')->assertForbidden();
        $this->actingAs($teacher)->get('/admin/laporan')->assertForbidden();
        $this->actingAs($admin)->get('/admin/laporan')->assertInertia(fn (Assert $page) => $page->component('Admin/Reports'));
    }

    public function test_export_downloads_for_principal_and_admin(): void
    {
        foreach (['admin', 'kepala_sekolah'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $principal = User::factory()->create();
        $principal->assignRole('kepala_sekolah');

        $year = AcademicYear::factory()->create(['is_active' => true]);
        $student = Student::factory()->create(['nis' => '12345']);
        $invoice = Invoice::factory()->create([
            'student_id' => $student->id,
            'academic_year_id' => $year->id,
            'status' => InvoiceStatus::Paid,
            'amount' => 300000,
        ]);

        // Principal exports
        $this->actingAs($principal)->get('/kepsek/laporan-keuangan/pdf')->assertOk()->assertDownload('laporan-keuangan-kepsek.pdf');
        $this->actingAs($principal)->get('/kepsek/laporan-keuangan/excel')->assertOk()->assertDownload('laporan-keuangan-kepsek.xlsx');
        $this->actingAs($principal)->get('/kepsek/laporan-evaluasi/pdf?student_id='.$student->id.'&academic_year_id='.$year->id)->assertOk()->assertDownload('rapor-12345.pdf');

        // Admin exports
        $this->actingAs($admin)->get('/admin/laporan/pdf?tab=rekap')->assertOk()->assertDownload('laporan-rekap-spp.pdf');
        $this->actingAs($admin)->get('/admin/laporan/excel?tab=rekap')->assertOk()->assertDownload('laporan-admin-rekap.xlsx');
        $this->actingAs($admin)->get('/admin/laporan/pdf?tab=tunggakan')->assertOk()->assertDownload('laporan-tunggakan-spp.pdf');
        $this->actingAs($admin)->get('/admin/laporan/excel?tab=tunggakan')->assertOk()->assertDownload('laporan-admin-tunggakan.xlsx');
        $this->actingAs($admin)->get('/admin/laporan/pdf?tab=ringkasan_kelas')->assertOk()->assertDownload('laporan-ringkasan-kelas.pdf');
        $this->actingAs($admin)->get('/admin/laporan/excel?tab=ringkasan_kelas')->assertOk()->assertDownload('laporan-admin-ringkasan_kelas.xlsx');
    }

    public function test_parent_can_download_only_own_student_report(): void
    {
        Role::findOrCreate('orang_tua', 'web');
        $parent = User::factory()->create();
        $parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'Alamat']);
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $child = Student::factory()->create();
        $other = Student::factory()->create();
        $guardian->students()->attach($child->id, ['relationship' => 'ibu', 'is_primary' => true]);

        $this->actingAs($parent)->get('/ortu/perkembangan/'.$child->id.'/laporan')->assertOk();
        $this->actingAs($parent)->get('/ortu/perkembangan/'.$other->id.'/laporan')->assertForbidden();
    }
}
