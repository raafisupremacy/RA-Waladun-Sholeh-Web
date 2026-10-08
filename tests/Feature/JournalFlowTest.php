<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\AnecdotalNote;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\JournalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class JournalFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('guru', 'web');
        Role::findOrCreate('orang_tua', 'web');
    }

    private function fixture(): array
    {
        $year = AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        $user = User::factory()->create();
        $user->assignRole('guru');
        $teacher = Teacher::create(['user_id' => $user->id, 'name' => 'Guru', 'nip' => 'NIP-1', 'phone' => '0812']);
        $class = Classroom::create(['academic_year_id' => $year->id, 'homeroom_teacher_id' => $teacher->id, 'name' => 'A', 'age_range' => '4-5']);
        $student = Student::factory()->create();
        $student->enrollments()->create(['classroom_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);

        return [$user, $teacher, $class, $student];
    }

    public function test_final_journal_requires_five_aspects(): void
    {
        [, $teacher,$class,$student] = $this->fixture();
        $journal = app(JournalService::class)->saveDraft(['student_id' => $student->id, 'classroom_id' => $class->id, 'journal_date' => '2026-10-01', 'activity_summary' => 'Kegiatan'], $teacher);
        $this->expectException(ValidationException::class);
        app(JournalService::class)->finalize($journal, ['assessments' => ['kognitif' => 'BSH']], $teacher);
    }

    public function test_teacher_can_finalize_complete_journal(): void
    {
        [, $teacher,$class,$student] = $this->fixture();
        $journal = app(JournalService::class)->saveDraft(['student_id' => $student->id, 'classroom_id' => $class->id, 'journal_date' => '2026-10-01', 'activity_summary' => 'Kegiatan'], $teacher);
        $assessments = [];
        foreach (['nilai_agama_moral', 'fisik_motorik', 'kognitif', 'bahasa', 'sosial_emosional'] as $a) {
            $assessments[$a] = 'BSH';
        }$final = app(JournalService::class)->finalize($journal, ['assessments' => $assessments], $teacher);
        $this->assertSame('final', $final->status->value);
        $this->assertCount(5, $final->assessments);
    }

    public function test_teacher_cannot_write_student_from_another_class(): void
    {
        [, $teacher, $class] = $this->fixture();
        $otherClass = Classroom::create(['academic_year_id' => $class->academic_year_id, 'name' => 'B', 'age_range' => '5']);
        $otherStudent = Student::factory()->create();
        $otherStudent->enrollments()->create(['classroom_id' => $otherClass->id, 'academic_year_id' => $class->academic_year_id, 'status' => 'aktif']);

        $this->expectException(HttpException::class);
        app(JournalService::class)->saveDraft(['student_id' => $otherStudent->id, 'classroom_id' => $otherClass->id, 'journal_date' => '2026-10-01'], $teacher);
    }

    public function test_replaced_teacher_loses_write_access(): void
    {
        [, $teacher, $class, $student] = $this->fixture();
        $replacementUser = User::factory()->create();
        $replacementUser->assignRole('guru');
        $replacement = Teacher::create(['user_id' => $replacementUser->id, 'name' => 'Pengganti', 'nip' => 'NIP-2', 'phone' => '0813']);
        $class->update(['homeroom_teacher_id' => $replacement->id]);

        $this->expectException(HttpException::class);
        app(JournalService::class)->saveDraft(['student_id' => $student->id, 'classroom_id' => $class->id, 'journal_date' => '2026-10-01'], $teacher);
    }

    public function test_final_journal_is_locked_after_edit_window(): void
    {
        Carbon::setTestNow('2026-10-02 12:00:00');
        [, $teacher, $class, $student] = $this->fixture();
        $journal = app(JournalService::class)->saveDraft(['student_id' => $student->id, 'classroom_id' => $class->id, 'journal_date' => '2026-10-01'], $teacher);
        $assessments = array_fill_keys(['nilai_agama_moral', 'fisik_motorik', 'kognitif', 'bahasa', 'sosial_emosional'], 'BSH');
        $final = app(JournalService::class)->finalize($journal, ['assessments' => $assessments], $teacher);

        Carbon::setTestNow('2026-10-03 00:00:00');
        try {
            $this->expectException(ValidationException::class);
            app(JournalService::class)->finalize($final, ['assessments' => $assessments], $teacher);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_parent_cannot_view_another_child_development(): void
    {
        $parent = User::factory()->create();
        $parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'Alamat']);
        $own = Student::factory()->create();
        $other = Student::factory()->create();
        $guardian->students()->attach($own->id, ['relationship' => 'wali', 'is_primary' => true]);

        $this->actingAs($parent)->get(route('ortu.development', ['student_id' => $other->id]))->assertForbidden();
    }

    public function test_autosave_does_not_create_duplicate_journals(): void
    {
        [$user, $teacher, $class, $student] = $this->fixture();

        $payload = [
            'student_id' => $student->id,
            'classroom_id' => $class->id,
            'journal_date' => '2026-10-01',
            'activity_summary' => 'Draf awal',
            'assessments' => ['kognitif' => ['level' => 'MB', 'note' => 'Catatan awal']],
        ];

        // First autosave
        $this->actingAs($user)->postJson(route('guru.journals.store'), $payload)->assertOk();
        $this->assertDatabaseCount('daily_journals', 1);

        // Second autosave for same student and date
        $payload['activity_summary'] = 'Draf kedua diperbarui';
        $payload['assessments'] = ['kognitif' => ['level' => 'BSH', 'note' => 'Catatan revisi']];
        $this->actingAs($user)->postJson(route('guru.journals.store'), $payload)->assertOk();
        $this->assertDatabaseCount('daily_journals', 1);

        $this->assertDatabaseHas('daily_journals', [
            'student_id' => $student->id,
            'activity_summary' => 'Draf kedua diperbarui',
        ]);
    }

    public function test_principal_and_admin_cannot_write_journals_or_anecdotes(): void
    {
        [, , $class, $student] = $this->fixture();

        Role::findOrCreate('admin', 'web');
        Role::findOrCreate('kepala_sekolah', 'web');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $kepsek = User::factory()->create();
        $kepsek->assignRole('kepala_sekolah');

        $payload = [
            'student_id' => $student->id,
            'classroom_id' => $class->id,
            'journal_date' => '2026-10-01',
            'activity_summary' => 'Percobaan',
        ];

        // Admin cannot write journal (route is role:guru)
        $this->actingAs($admin)->post(route('guru.journals.store'), $payload)->assertForbidden();
        // Kepsek cannot write journal
        $this->actingAs($kepsek)->post(route('guru.journals.store'), $payload)->assertForbidden();

        // Admin cannot store anecdote
        $anecdotePayload = [
            'student_id' => $student->id,
            'noted_at' => '2026-10-01 10:00:00',
            'observed_behavior' => 'Perilaku',
            'interpretation' => 'Interpretasi',
        ];
        $this->actingAs($admin)->post(route('guru.anecdotes.store'), $anecdotePayload)->assertForbidden();
        $this->actingAs($kepsek)->post(route('guru.anecdotes.store'), $anecdotePayload)->assertForbidden();
    }

    public function test_anecdote_attachment_requires_authorization(): void
    {
        Storage::fake('private');
        [$teacherUser, $teacher, $class, $student] = $this->fixture();

        // Create parent for this student
        $parentUser = User::factory()->create();
        $parentUser->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parentUser->id, 'name' => 'Wali Siswa', 'phone' => '08123', 'address' => 'Alamat']);
        $guardian->students()->attach($student->id, ['relationship' => 'ibu', 'is_primary' => true]);

        // Create another parent not linked to this student
        $otherParentUser = User::factory()->create();
        $otherParentUser->assignRole('orang_tua');
        $otherGuardian = Guardian::create(['user_id' => $otherParentUser->id, 'name' => 'Wali Lain', 'phone' => '08124', 'address' => 'Alamat']);
        $otherStudent = Student::factory()->create();
        $otherGuardian->students()->attach($otherStudent->id, ['relationship' => 'ayah', 'is_primary' => true]);

        // Upload photo and create anecdote
        $file = UploadedFile::fake()->image('observasi.jpg');
        $path = $file->store('anecdotes', 'private');

        $note = AnecdotalNote::create([
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'noted_at' => now(),
            'observed_behavior' => 'Bermain dengan balok',
            'interpretation' => 'Kreativitas berkembang',
            'follow_up' => 'Pendampingan bermain mandiri',
            'photo_path' => $path,
        ]);

        // 1. Authorized teacher can view photo
        $this->actingAs($teacherUser)
            ->get(route('anecdotes.photo', $note->id))
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        // 2. Authorized parent can view photo
        $this->actingAs($parentUser)
            ->get(route('anecdotes.photo', $note->id))
            ->assertOk();

        // 3. Unauthorized parent cannot view photo (403)
        $this->actingAs($otherParentUser)
            ->get(route('anecdotes.photo', $note->id))
            ->assertForbidden();

        // 4. Guest is redirected to login
        Auth::logout();
        $this->get(route('anecdotes.photo', $note->id))
            ->assertRedirect(route('login'));
    }

    public function test_teacher_cannot_access_journal_form_of_other_class_student(): void
    {
        [$teacherUser, $teacher, $class] = $this->fixture();

        $otherClass = Classroom::create(['academic_year_id' => $class->academic_year_id, 'name' => 'B', 'age_range' => '5']);
        $otherStudent = Student::factory()->create();
        $otherStudent->enrollments()->create(['classroom_id' => $otherClass->id, 'academic_year_id' => $class->academic_year_id, 'status' => 'aktif']);

        $this->actingAs($teacherUser)
            ->get(route('guru.journals.show', $otherStudent->id))
            ->assertForbidden();
    }
}
