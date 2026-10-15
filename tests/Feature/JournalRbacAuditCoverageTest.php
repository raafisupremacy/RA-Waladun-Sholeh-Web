<?php

namespace Tests\Feature;

use App\Enums\JournalAspect;
use App\Enums\JournalStatus;
use App\Models\AcademicYear;
use App\Models\AnecdotalNote;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class JournalRbacAuditCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 1)->setTime(12, 0));
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }

    protected function tearDown(): void
    {
        $this->travelBack();
        parent::tearDown();
    }

    public function test_forged_parent_session_is_repaired_without_other_child_journals_or_anecdotes(): void
    {
        [$teacherUser, $teacher, $classroom, $own] = $this->classroomFixture();
        $other = Student::factory()->create();
        $parent = $this->parentOf($own);
        $ownJournal = $this->journal($teacher, $classroom, $own);
        $otherJournal = $this->journal($teacher, $classroom, $other);
        $ownNote = $this->note($teacher, $own);
        $otherNote = $this->note($teacher, $other);

        $this->actingAs($parent)->withSession(['active_student_id' => $other->id])
            ->get(route('ortu.development', ['month' => 10, 'year' => 2026]))
            ->assertOk()->assertSessionHas('active_student_id', $own->id)
            ->assertInertia(fn (Assert $page) => $page
                ->where('selectedStudentId', $own->id)
                ->has('students', 1)->where('students.0.id', $own->id)
                ->has('journals.data', 1)->where('journals.data.0.id', $ownJournal->id)
                ->has('anecdotes.data', 1)->where('anecdotes.data.0.id', $ownNote->id));

        $this->get(route('ortu.development', ['student_id' => $other->id]))->assertForbidden();
        $this->assertTrue(Gate::forUser($parent)->allows('view', $ownJournal));
        $this->assertFalse(Gate::forUser($parent)->allows('view', $otherJournal));
        $this->assertTrue(Gate::forUser($parent)->allows('view', $ownNote));
        $this->assertFalse(Gate::forUser($parent)->allows('view', $otherNote));
    }

    public function test_parent_can_switch_between_linked_children_and_drafts_stay_private(): void
    {
        [, $teacher, $classroom, $own] = $this->classroomFixture();
        $sibling = Student::factory()->create();
        $parent = $this->parentOf($own);
        $parent->guardian->students()->attach($sibling->id, ['relationship' => 'ibu', 'is_primary' => true]);
        $this->journal($teacher, $classroom, $own);
        $siblingJournal = $this->journal($teacher, $classroom, $sibling);
        $draft = $this->journal($teacher, $classroom, $sibling, '2026-10-02');
        $draft->update(['status' => JournalStatus::Draft, 'finalized_at' => null]);

        $this->actingAs($parent)->get(route('ortu.development', ['student_id' => $sibling->id, 'month' => 10, 'year' => 2026]))
            ->assertSessionHas('active_student_id', $sibling->id)
            ->assertInertia(fn (Assert $page) => $page
                ->has('students', 2)->where('selectedStudentId', $sibling->id)
                ->has('journals.data', 1)->where('journals.data.0.id', $siblingJournal->id));
        $this->get(route('ortu.development', ['month' => 10, 'year' => 2026]))
            ->assertInertia(fn (Assert $page) => $page->where('selectedStudentId', $sibling->id));
    }

    public function test_forged_parent_session_cannot_authorize_foreign_report_or_photo_downloads(): void
    {
        Storage::fake('private');
        [, $teacher, $classroom, $own] = $this->classroomFixture();
        $other = Student::factory()->create();
        $parent = $this->parentOf($own);
        $note = $this->note($teacher, $other);
        Storage::disk('private')->put('anecdotes/foreign.jpg', 'foreign-private-content');
        $note->update(['photo_path' => 'anecdotes/foreign.jpg']);

        $this->actingAs($parent)->withSession(['active_student_id' => $other->id])
            ->get(route('ortu.student-report.pdf', $other))->assertForbidden();
        $this->get(route('anecdotes.photo', $note))->assertForbidden();
        $this->get(route('ortu.student-report.pdf', ['student' => $other->id, 'student_id' => $own->id]))->assertForbidden();
    }

    public function test_replaced_teacher_cannot_read_form_or_private_photo(): void
    {
        Storage::fake('private');
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $note = $this->note($teacher, $student);
        Storage::disk('private')->put('anecdotes/private.jpg', 'private-content');
        $note->update(['photo_path' => 'anecdotes/private.jpg']);
        $replacement = Teacher::factory()->create();
        $classroom->update(['homeroom_teacher_id' => $replacement->id]);

        $this->actingAs($user)->get(route('guru.journals.show', $student))->assertForbidden();
        $this->get(route('anecdotes.photo', $note))->assertForbidden();
    }

    public function test_journal_update_policy_denies_replaced_teacher_even_inside_edit_window(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $journal = $this->journal($teacher, $classroom, $student);
        $this->assertTrue(Gate::forUser($user)->allows('update', $journal));
        $classroom->update(['homeroom_teacher_id' => Teacher::factory()->create()->id]);

        $this->assertFalse(Gate::forUser($user)->allows('update', $journal));
    }

    public function test_replaced_teacher_history_does_not_expose_former_child_assessments(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $this->journal($teacher, $classroom, $student);
        $classroom->update(['homeroom_teacher_id' => Teacher::factory()->create()->id]);

        $this->actingAs($user)->get(route('guru.journals.history', ['student_id' => $student->id, 'month' => 10, 'year' => 2026]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('students', 0)->where('selected_student', null)
                ->has('journals', 0)->has('journals_by_date', 0));
    }

    public function test_replaced_teacher_anecdote_list_does_not_expose_former_child_behavior(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $this->note($teacher, $student);
        $classroom->update(['homeroom_teacher_id' => Teacher::factory()->create()->id]);

        $this->actingAs($user)->get(route('guru.anecdotes', ['student_id' => $student->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('students', 0)->where('selected_student', null)->has('notes.data', 0));
    }

    public function test_real_homeroom_replacement_revokes_former_teacher_journal_writes(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $classroom->teachers()->attach($teacher->id, ['role' => 'wali_kelas']);
        $replacement = Teacher::factory()->create();
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->post(route('admin.classrooms.teacher', $classroom), ['teacher_id' => $replacement->id])->assertRedirect();
        $this->assertSame($replacement->id, $classroom->fresh()->homeroom_teacher_id);

        $this->actingAs($user)->postJson(route('guru.journals.store'), $this->draftPayload($classroom, $student))->assertForbidden();
        $this->assertDatabaseCount('daily_journals', 0);
    }

    public function test_real_homeroom_replacement_revokes_former_teacher_anecdote_writes(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $classroom->teachers()->attach($teacher->id, ['role' => 'wali_kelas']);
        $note = $this->note($teacher, $student);
        $replacement = Teacher::factory()->create();
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->post(route('admin.classrooms.teacher', $classroom), ['teacher_id' => $replacement->id])->assertRedirect();

        $this->actingAs($user)->putJson(route('guru.anecdotes.update', $note), [
            'noted_at' => '2026-10-01 09:00:00', 'observed_behavior' => 'Unauthorized change', 'interpretation' => 'Unauthorized interpretation',
        ])->assertForbidden();
        $this->assertSame('Private observed behavior', $note->fresh()->observed_behavior);
    }

    public function test_teacher_cannot_read_or_write_inactive_academic_year_or_inactive_enrollment(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $oldYear = AcademicYear::factory()->create(['is_active' => false]);
        $oldClassroom = Classroom::factory()->create(['academic_year_id' => $oldYear->id, 'homeroom_teacher_id' => $teacher->id]);
        $formerStudent = Student::factory()->create();
        $formerStudent->enrollments()->create(['classroom_id' => $oldClassroom->id, 'academic_year_id' => $oldYear->id, 'status' => 'aktif']);

        $this->actingAs($user)->get(route('guru.journals.show', $formerStudent))->assertForbidden();
        $this->postJson(route('guru.journals.store'), $this->draftPayload($oldClassroom, $formerStudent))->assertForbidden();
        $student->enrollments()->update(['status' => 'pindah']);
        $this->get(route('guru.journals.show', $student))->assertForbidden();
        $this->postJson(route('guru.journals.store'), $this->draftPayload($classroom, $student))->assertForbidden();
        $this->assertDatabaseCount('daily_journals', 0);
    }

    public function test_admin_principal_and_parent_cannot_finalize_or_update_teacher_records(): void
    {
        [, $teacher, $classroom, $student] = $this->classroomFixture();
        $journal = $this->journal($teacher, $classroom, $student);
        $note = $this->note($teacher, $student);

        foreach (['admin', 'kepala_sekolah', 'orang_tua'] as $role) {
            $user = $this->userWithRole($role);
            $this->actingAs($user)->postJson(route('guru.journals.finalize', $journal), [
                'activity_summary' => 'Unauthorized change', 'assessments' => $this->assessments(),
            ])->assertForbidden();
            $this->putJson(route('guru.anecdotes.update', $note), [
                'noted_at' => '2026-10-01 09:00:00', 'observed_behavior' => 'Unauthorized change', 'interpretation' => 'Unauthorized interpretation',
            ])->assertForbidden();
        }
        $this->assertSame('Private learning summary', $journal->fresh()->activity_summary);
        $this->assertSame('Private observed behavior', $note->fresh()->observed_behavior);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_journal_unique_student_date_constraint_rejects_second_teacher_record(): void
    {
        [, $teacher, $classroom, $student] = $this->classroomFixture();
        $first = $this->journal($teacher, $classroom, $student);
        try {
            $this->journal(Teacher::factory()->create(), $classroom, $student);
            $this->fail('A student must have only one journal per day, regardless of teacher.');
        } catch (QueryException $exception) {
            $this->assertStringContainsString('UNIQUE constraint failed', $exception->getMessage());
        }
        $this->assertDatabaseCount('daily_journals', 1);
        $this->assertDatabaseHas('daily_journals', ['id' => $first->id, 'teacher_id' => $teacher->id]);
    }

    public function test_invalid_draft_assessment_rolls_back_summary_and_other_valid_assessments(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $payload = $this->draftPayload($classroom, $student);
        $this->actingAs($user)->postJson(route('guru.journals.store'), $payload)->assertOk();
        $journal = DailyJournal::firstOrFail();
        $payload['activity_summary'] = 'Should not persist';
        $payload['assessments'] = ['kognitif' => ['level' => 'BSB', 'note' => 'Should not persist'], 'unknown_aspect' => 'BSH'];
        $this->postJson(route('guru.journals.store'), $payload)->assertUnprocessable()->assertJsonValidationErrors('assessments');

        $this->assertSame('Original draft', $journal->fresh()->activity_summary);
        $this->assertDatabaseCount('journal_assessments', 1);
        $this->assertDatabaseHas('journal_assessments', ['daily_journal_id' => $journal->id, 'aspect' => 'kognitif', 'level' => 'MB', 'note' => 'Original assessment']);
    }

    public function test_forged_journal_id_cannot_overwrite_another_student_draft(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $other = Student::factory()->create();
        $otherJournal = $this->journal($teacher, $classroom, $other);
        $payload = $this->draftPayload($classroom, $student) + ['id' => $otherJournal->id];

        $this->actingAs($user)->postJson(route('guru.journals.store'), $payload)->assertForbidden();
        $this->assertDatabaseCount('daily_journals', 1);
        $this->assertSame('Private learning summary', $otherJournal->fresh()->activity_summary);
    }

    public function test_finalization_with_invalid_fifth_level_preserves_draft_and_existing_assessments(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $this->actingAs($user)->postJson(route('guru.journals.store'), $this->draftPayload($classroom, $student))->assertOk();
        $journal = DailyJournal::firstOrFail();
        $assessments = $this->assessments();
        $assessments['sosial_emosional'] = ['level' => 'INVALID', 'note' => 'Invalid'];
        $this->postJson(route('guru.journals.finalize', $journal), [
            'activity_summary' => 'Should not persist', 'assessments' => $assessments,
        ])->assertUnprocessable()->assertJsonValidationErrors('assessments');

        $this->assertSame(JournalStatus::Draft, $journal->fresh()->status);
        $this->assertNull($journal->fresh()->finalized_at);
        $this->assertSame('Original draft', $journal->fresh()->activity_summary);
        $this->assertDatabaseCount('journal_assessments', 1);
        $this->assertDatabaseHas('journal_assessments', ['daily_journal_id' => $journal->id, 'aspect' => 'kognitif', 'level' => 'MB']);
    }

    public function test_final_journal_edits_work_at_end_of_next_day_and_lock_at_midnight(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $journal = $this->journal($teacher, $classroom, $student);
        $this->travelTo(now()->setDate(2026, 10, 2)->setTime(23, 59, 59, 999999));
        $this->actingAs($user)->postJson(route('guru.journals.finalize', $journal), [
            'activity_summary' => 'Last allowed edit', 'assessments' => $this->assessments(),
        ])->assertOk();
        $this->assertSame('Last allowed edit', $journal->fresh()->activity_summary);
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(0, 0));
        $this->get(route('guru.journals.show', ['student' => $student->id, 'date' => '2026-10-01']))
            ->assertInertia(fn (Assert $page) => $page->where('is_locked', true)->where('can_edit', false));
        $this->postJson(route('guru.journals.finalize', $journal), [
            'activity_summary' => 'Locked edit', 'assessments' => $this->assessments(),
        ])->assertUnprocessable()->assertJsonValidationErrors('journal');
        $this->postJson(route('guru.journals.store'), array_replace($this->draftPayload($classroom, $student), [
            'id' => $journal->id, 'activity_summary' => 'Locked autosave',
        ]))->assertUnprocessable()->assertJsonValidationErrors('journal');
        $this->assertSame('Last allowed edit', $journal->fresh()->activity_summary);
        $this->assertDatabaseCount('journal_assessments', 5);
    }

    public function test_anecdote_upload_stays_private_uses_random_name_and_hides_storage_path(): void
    {
        Storage::fake('private');
        Storage::fake('public');
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $file = UploadedFile::fake()->image('sensitive-child-name.jpg');
        $this->actingAs($user)->post(route('guru.anecdotes.store'), [
            'student_id' => $student->id, 'noted_at' => '2026-10-01 09:00:00',
            'observed_behavior' => 'Private behavior', 'interpretation' => 'Private interpretation', 'photo' => $file,
        ])->assertRedirect();
        $note = AnecdotalNote::firstOrFail();
        Storage::disk('private')->assertExists($note->photo_path);
        Storage::disk('public')->assertMissing($note->photo_path);
        $this->assertStringNotContainsString('sensitive-child-name', $note->photo_path);
        $this->get(route('guru.anecdotes', ['student_id' => $student->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('notes.data', 1)->missing('notes.data.0.photo_path')
                ->where('notes.data.0.photo_url', route('anecdotes.photo', $note)));
        $this->get(route('anecdotes.photo', $note))->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertDatabaseHas('audit_logs', ['action' => 'anecdotal_note_created', 'entity_id' => $note->id, 'user_id' => $user->id]);
    }

    public function test_anecdote_invalid_or_oversized_upload_creates_no_note_or_private_file(): void
    {
        Storage::fake('private');
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $payload = ['student_id' => $student->id, 'noted_at' => '2026-10-01 09:00:00', 'observed_behavior' => 'Behavior', 'interpretation' => 'Interpretation'];
        $this->actingAs($user)->postJson(route('guru.anecdotes.store'), $payload + [
            'photo' => UploadedFile::fake()->create('script.jpg', 10, 'text/html'),
        ])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->postJson(route('guru.anecdotes.store'), $payload + [
            'photo' => UploadedFile::fake()->image('too-large.jpg')->size(5121),
        ])->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->assertDatabaseCount('anecdotal_notes', 0);
        $this->assertDatabaseCount('audit_logs', 0);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_first_password_change_blocks_downloads_and_rejects_wrong_or_weak_password(): void
    {
        [, $teacher, $classroom, $student] = $this->classroomFixture();
        $parent = $this->parentOf($student);
        $parent->update(['must_change_password' => true]);
        $originalHash = $parent->password;
        $this->actingAs($parent)->get(route('ortu.student-report.pdf', $student))->assertRedirect(route('password.change'));
        $this->putJson(route('password.change.update'), [
            'current_password' => 'incorrect', 'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
        foreach (['short1', 'longwithoutdigits'] as $invalid) {
            $this->putJson(route('password.change.update'), [
                'current_password' => 'password', 'password' => $invalid, 'password_confirmation' => $invalid,
            ])->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->assertTrue($parent->fresh()->must_change_password);
        $this->assertSame($originalHash, $parent->fresh()->password);
    }

    public function test_disabled_parent_session_cannot_download_and_clears_active_child_context(): void
    {
        [, $teacher, $classroom, $student] = $this->classroomFixture();
        $parent = $this->parentOf($student);
        $this->actingAs($parent)->withSession(['active_student_id' => $student->id]);
        $parent->update(['is_active' => false]);

        $this->get(route('ortu.student-report.pdf', $student))->assertRedirect(route('login'))
            ->assertSessionMissing('active_student_id');
        $this->assertGuest();
    }

    public function test_assistant_reads_class_records_but_only_edits_own_journals(): void
    {
        [, $teacher, $classroom, $student] = $this->classroomFixture();
        $user = $this->userWithRole('guru');
        $assistant = Teacher::factory()->create(['user_id' => $user->id]);
        $classroom->teachers()->attach($assistant->id, ['role' => 'pendamping']);
        $journal = $this->journal($teacher, $classroom, $student);
        $note = $this->note($teacher, $student);

        $this->actingAs($user)->get(route('guru.journals'))
            ->assertInertia(fn (Assert $page) => $page->has('journals.data', 1)
                ->where('journals.data.0.id', $journal->id)->where('today_stats.filled', 1));
        $this->get(route('guru.journals.show', $student))
            ->assertInertia(fn (Assert $page) => $page->where('journal.id', $journal->id)
                ->where('can_edit', false)->has('journals', 1));
        $this->get(route('guru.journals.history', ['student_id' => $student->id, 'month' => 10, 'year' => 2026]))
            ->assertInertia(fn (Assert $page) => $page->has('journals', 1)->where('journals.0.id', $journal->id));
        $this->get(route('guru.anecdotes', ['student_id' => $student->id]))
            ->assertInertia(fn (Assert $page) => $page->has('notes.data', 1)->where('notes.data.0.id', $note->id));
        $this->assertFalse(Gate::forUser($user)->allows('update', $journal));
        $this->postJson(route('guru.journals.store'), $this->draftPayload($classroom, $student))->assertForbidden();
        $payload = array_replace($this->draftPayload($classroom, $student), ['journal_date' => '2026-10-02']);
        $this->postJson(route('guru.journals.store'), $payload)->assertOk();
        $ownJournal = DailyJournal::where('teacher_id', $assistant->id)->firstOrFail();
        $this->assertTrue(Gate::forUser($user)->allows('update', $ownJournal));
        $this->postJson(route('guru.journals.finalize', $ownJournal), [
            'activity_summary' => 'Assistant journal', 'assessments' => $this->assessments(),
        ])->assertOk();
        $this->post(route('guru.anecdotes.store'), [
            'student_id' => $student->id, 'noted_at' => '2026-10-01 10:00:00',
            'observed_behavior' => 'Assistant observation', 'interpretation' => 'Assistant interpretation',
        ])->assertRedirect();
        $ownNote = AnecdotalNote::where('teacher_id', $assistant->id)->firstOrFail();
        $this->putJson(route('guru.anecdotes.update', $ownNote), [
            'noted_at' => '2026-10-01 10:00:00', 'observed_behavior' => 'Updated assistant observation',
            'interpretation' => 'Assistant interpretation',
        ])->assertRedirect();
    }

    public function test_replacement_in_full_class_preserves_assistants_and_journal_author_then_requires_explicit_reassignment(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $classroom->teachers()->attach($teacher->id, ['role' => 'wali_kelas']);
        $assistants = Teacher::factory()->count(2)->create();
        foreach ($assistants as $assistant) {
            $classroom->teachers()->attach($assistant->id, ['role' => 'pendamping']);
        }
        $journal = $this->journal($teacher, $classroom, $student);
        $replacement = Teacher::factory()->create();
        $admin = $this->userWithRole('admin');
        $this->actingAs($admin)->post(route('admin.classrooms.teacher', $classroom), ['teacher_id' => $replacement->id])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($replacement->id, $classroom->fresh()->homeroom_teacher_id);
        $this->assertFalse($classroom->teachers()->whereKey($teacher->id)->exists());
        $this->assertSame(2, $classroom->teachers()->wherePivot('role', 'pendamping')->count());
        $this->assertSame($teacher->id, $journal->fresh()->teacher_id);
        $this->assertFalse(Gate::forUser($user)->allows('view', $journal));
        $this->assertFalse(Gate::forUser($user)->allows('update', $journal));

        $this->post(route('admin.teachers.assign-class', $assistants->first()), ['classroom_id' => null])->assertRedirect();
        $this->post(route('admin.teachers.assign-class', $teacher), ['classroom_id' => $classroom->id, 'role' => 'pendamping'])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($replacement->id, $classroom->fresh()->homeroom_teacher_id);
        $this->assertTrue(Gate::forUser($user)->allows('view', $journal));
        $this->assertTrue(Gate::forUser($user)->allows('update', $journal));
    }

    public function test_teacher_assignment_as_homeroom_detaches_previous_homeroom(): void
    {
        [$user, $teacher, $classroom, $student] = $this->classroomFixture();
        $classroom->teachers()->attach($teacher->id, ['role' => 'wali_kelas']);
        $replacement = Teacher::factory()->create();
        $this->actingAs($this->userWithRole('admin'))->post(route('admin.teachers.assign-class', $replacement), [
            'classroom_id' => $classroom->id, 'role' => 'wali_kelas',
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($replacement->id, $classroom->fresh()->homeroom_teacher_id);
        $this->assertFalse($classroom->teachers()->whereKey($teacher->id)->exists());
        $this->assertFalse(Student::visibleTo($user)->whereKey($student->id)->exists());
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create(['must_change_password' => false, 'is_active' => true]);
        $user->assignRole($role);

        return $user;
    }

    private function classroomFixture(): array
    {
        $year = AcademicYear::factory()->create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        $user = $this->userWithRole('guru');
        $teacher = Teacher::factory()->create(['user_id' => $user->id]);
        $classroom = Classroom::factory()->create(['academic_year_id' => $year->id, 'homeroom_teacher_id' => $teacher->id]);
        $student = Student::factory()->create(['status' => 'aktif']);
        $student->enrollments()->create(['classroom_id' => $classroom->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);

        return [$user, $teacher, $classroom, $student];
    }

    private function parentOf(Student $student): User
    {
        $parent = $this->userWithRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $parent->id, 'name' => 'Parent', 'phone' => '0812', 'address' => 'Test address']);
        $guardian->students()->attach($student->id, ['relationship' => 'ibu', 'is_primary' => true]);

        return $parent;
    }

    private function journal(Teacher $teacher, Classroom $classroom, Student $student, string $date = '2026-10-01'): DailyJournal
    {
        $journal = DailyJournal::create([
            'student_id' => $student->id, 'classroom_id' => $classroom->id, 'teacher_id' => $teacher->id,
            'journal_date' => $date, 'activity_summary' => 'Private learning summary', 'status' => JournalStatus::Final, 'finalized_at' => now(),
        ]);
        foreach (JournalAspect::cases() as $aspect) {
            $journal->assessments()->create(['aspect' => $aspect->value, 'level' => 'BSH', 'note' => 'Private assessment']);
        }

        return $journal;
    }

    private function note(Teacher $teacher, Student $student): AnecdotalNote
    {
        return AnecdotalNote::create([
            'student_id' => $student->id, 'teacher_id' => $teacher->id, 'noted_at' => '2026-10-01 09:00:00',
            'observed_behavior' => 'Private observed behavior', 'interpretation' => 'Private interpretation', 'follow_up' => 'Private follow up',
        ]);
    }

    private function draftPayload(Classroom $classroom, Student $student): array
    {
        return [
            'student_id' => $student->id, 'classroom_id' => $classroom->id, 'journal_date' => '2026-10-01',
            'activity_summary' => 'Original draft', 'assessments' => ['kognitif' => ['level' => 'MB', 'note' => 'Original assessment']],
        ];
    }

    private function assessments(): array
    {
        return array_fill_keys(array_column(JournalAspect::cases(), 'value'), ['level' => 'BSH', 'note' => 'Final assessment']);
    }
}
