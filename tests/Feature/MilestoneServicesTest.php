<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Invoice;
use App\Models\Student;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MilestoneServicesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $r) {
            Role::findOrCreate($r, 'web');
        }
    }

    public function test_invoice_generation_skips_duplicates_and_only_active_students(): void
    {
        $year = AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        $class = Classroom::create(['academic_year_id' => $year->id, 'name' => 'A', 'age_range' => '4-5']);
        $students = Student::factory(2)->create();
        foreach ($students as $s) {
            $s->enrollments()->create(['classroom_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        }Invoice::factory()->create(['student_id' => $students[0]->id, 'academic_year_id' => $year->id, 'period_month' => 10, 'period_year' => 2026]);
        $result = app(InvoiceService::class)->generate(10, 2026, $year->id, 350000);
        $this->assertSame(1, $result['created']);
        $this->assertSame(1, $result['skipped']);
    }
}
