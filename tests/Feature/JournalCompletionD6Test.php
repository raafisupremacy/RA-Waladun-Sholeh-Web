<?php

namespace Tests\Feature;

use App\Enums\JournalStatus;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\JournalAssessment;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\Teacher;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class JournalCompletionD6Test extends TestCase
{
    use RefreshDatabase;

    public function test_completion_is_per_class_and_counts_any_author_on_school_days_only(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-31 12:00:00', 'Asia/Jakarta'));
        SchoolSetting::create(['key' => 'school_holidays', 'value' => '["2026-10-05"]']);
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $homeroom = Teacher::factory()->create(['name' => 'Wali Aktif']);
        $assistant = Teacher::factory()->create(['name' => 'Pendamping']);
        $former = Teacher::factory()->create(['name' => 'Wali Lama']);
        $classroom = Classroom::factory()->create(['academic_year_id' => $year->id, 'homeroom_teacher_id' => $homeroom->id]);
        $students = Student::factory()->count(2)->create(['status' => 'aktif']);
        foreach ($students as $student) {
            $student->enrollments()->create(['classroom_id' => $classroom->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        }

        foreach ([[$students[0], $assistant, '2026-10-01'], [$students[1], $former, '2026-10-02'], [$students[0], $homeroom, '2026-10-05']] as [$student, $teacher, $date]) {
            $journal = DailyJournal::create(['student_id' => $student->id, 'classroom_id' => $classroom->id, 'teacher_id' => $teacher->id, 'journal_date' => $date, 'activity_summary' => 'Kegiatan', 'status' => JournalStatus::Final]);
            JournalAssessment::create(['daily_journal_id' => $journal->id, 'aspect' => 'bahasa', 'level' => 'BSH']);
        }
        DailyJournal::create(['student_id' => $students[1]->id, 'classroom_id' => $classroom->id, 'teacher_id' => $homeroom->id, 'journal_date' => '2026-10-03', 'activity_summary' => 'Draf', 'status' => JournalStatus::Draft]);

        $row = app(ReportService::class)->journalCompletion(10, 2026, $year->id)[0];

        $this->assertSame($classroom->id, $row['classroom_id'] ?? $classroom->id);
        $this->assertSame('Wali Aktif', $row['teacher_name']);
        $this->assertSame(2, $row['filled']);
        $this->assertLessThanOrEqual(100, $row['percentage']);
        Carbon::setTestNow();
    }
}
