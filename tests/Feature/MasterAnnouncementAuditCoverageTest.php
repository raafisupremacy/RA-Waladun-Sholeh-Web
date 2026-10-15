<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MasterAnnouncementAuditCoverageTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private AcademicYear $year;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 14)->setTime(12, 0));
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->year = AcademicYear::factory()->create(['is_active' => true]);
    }

    private function classroom(string $name, string $level): Classroom
    {
        return Classroom::factory()->create(['academic_year_id' => $this->year->id, 'name' => $name, 'level' => $level]);
    }

    private function parentWithChild(Classroom $classroom): array
    {
        $parent = User::factory()->create();
        $parent->assignRole('orang_tua');
        $guardian = Guardian::factory()->create(['user_id' => $parent->id]);
        $child = Student::factory()->create();
        $guardian->students()->attach($child, ['relationship' => 'ibu', 'is_primary' => true]);
        $child->enrollments()->create(['classroom_id' => $classroom->id, 'academic_year_id' => $this->year->id, 'status' => 'aktif']);

        return [$parent, $child];
    }

    private function announcementData(array $extra = []): array
    {
        return array_replace(['title' => 'Informasi sekolah uji', 'body' => 'Informasi berdasarkan data.', 'target' => 'all', 'status' => 'terbit'], $extra);
    }

    public function test_http_targets_reach_only_matching_levels_and_classrooms(): void
    {
        $a1 = $this->classroom('A-1', 'A');
        $a2 = $this->classroom('A-2', 'A');
        $b1 = $this->classroom('B-1', 'B');
        $targets = [
            'Semua' => ['target' => 'all', 'classroom_id' => $b1->id, 'target_level' => 'B'],
            'Tingkat A' => ['target' => 'level', 'target_level' => 'A', 'classroom_id' => $b1->id],
            'Kelas A-2' => ['target' => 'classroom', 'classroom_id' => $a2->id, 'target_level' => 'B'],
        ];
        foreach ($targets as $title => $data) {
            $this->actingAs($this->admin)->post('/admin/pengumuman', $this->announcementData($data + ['title' => $title]))
                ->assertSessionHasNoErrors();
        }
        $this->assertDatabaseHas('announcements', ['title' => 'Semua', 'classroom_id' => null, 'target_level' => null]);
        $this->assertDatabaseHas('announcements', ['title' => 'Tingkat A', 'classroom_id' => null, 'target_level' => 'A']);
        $this->assertDatabaseHas('announcements', ['title' => 'Kelas A-2', 'classroom_id' => $a2->id, 'target_level' => null]);
        foreach ([[$a1, ['Semua', 'Tingkat A']], [$a2, ['Kelas A-2', 'Semua', 'Tingkat A']], [$b1, ['Semua']]] as [$classroom, $expected]) {
            [$parent] = $this->parentWithChild($classroom);
            $this->actingAs($parent)->get('/ortu')->assertInertia(fn (Assert $page) => $page
                ->where('announcements', fn ($items) => collect($items)->pluck('title')->sort()->values()->all() === $expected));
        }
    }

    public function test_level_target_requires_valid_level_and_no_partial_announcement(): void
    {
        foreach ([null, 'C'] as $level) {
            $this->actingAs($this->admin)->post('/admin/pengumuman', $this->announcementData(['target' => 'level', 'target_level' => $level]))
                ->assertSessionHasErrors('target_level');
        }
        $this->assertDatabaseCount('announcements', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_draft_publish_unpublish_and_expiry_boundary_affect_parent_feed(): void
    {
        [$parent] = $this->parentWithChild($this->classroom('A-1', 'A'));
        $this->actingAs($this->admin)->post('/admin/pengumuman', $this->announcementData(['status' => 'draf']))->assertSessionHasNoErrors();
        $announcement = Announcement::sole();
        $this->assertNull($announcement->published_at);
        $this->actingAs($parent)->get('/ortu')->assertInertia(fn (Assert $page) => $page->has('announcements', 0));
        $this->actingAs($this->admin)->put('/admin/pengumuman/'.$announcement->id, $this->announcementData())->assertSessionHasNoErrors();
        $this->assertNotNull($announcement->fresh()->published_at);
        $this->actingAs($parent)->get('/ortu')->assertInertia(fn (Assert $page) => $page->has('announcements', 1));
        $this->actingAs($this->admin)->put('/admin/pengumuman/'.$announcement->id, $this->announcementData(['expires_at' => now()->toDateTimeString()]))->assertSessionHasNoErrors();
        $this->actingAs($parent)->get('/ortu')->assertInertia(fn (Assert $page) => $page->has('announcements', 0));
        $this->actingAs($this->admin)->put('/admin/pengumuman/'.$announcement->id, $this->announcementData(['status' => 'draf']))->assertSessionHasNoErrors();
        $this->assertNull($announcement->fresh()->published_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'announcement_created', 'entity_id' => $announcement->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'announcement_updated', 'entity_id' => $announcement->id]);
    }

    public function test_non_admin_roles_cannot_mutate_announcements_or_reset_accounts(): void
    {
        $announcement = Announcement::factory()->create(['created_by' => $this->admin->id]);
        $guardian = Guardian::factory()->create();
        $originalHash = $guardian->user->password;
        foreach (['guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            $user = User::factory()->create();
            $user->assignRole($role);
            $this->actingAs($user)->post('/admin/pengumuman', $this->announcementData())->assertForbidden();
            $this->put('/admin/pengumuman/'.$announcement->id, $this->announcementData(['title' => 'Tidak boleh berubah']))->assertForbidden();
            $this->delete('/admin/pengumuman/'.$announcement->id)->assertForbidden();
            $this->post('/admin/orang-tua/'.$guardian->id.'/reset-kata-sandi')->assertForbidden();
        }
        $this->assertDatabaseCount('announcements', 1);
        $this->assertSame($announcement->title, $announcement->fresh()->title);
        $this->assertSame($originalHash, $guardian->user->fresh()->password);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_student_update_and_class_transfer_leave_an_audit_trail(): void
    {
        $source = $this->classroom('A-1', 'A');
        $target = $this->classroom('A-2', 'A');
        [, $student] = $this->parentWithChild($source);
        $this->actingAs($this->admin)->put(route('admin.students.update', $student), [
            'name' => 'Nama diperbarui audit', 'nis' => $student->nis, 'gender' => 'L', 'status' => 'aktif', 'classroom_id' => $target->id,
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame('Nama diperbarui audit', $student->fresh()->name);
        $this->assertSame($target->id, $student->enrollments()->sole()->classroom_id);
        $this->assertGreaterThan(0, AuditLog::where('user_id', $this->admin->id)->count(), 'Every admin master-data write must create an audit trail (AGENTS.md).');
    }

    public function test_non_active_year_classroom_is_rejected_without_changing_student(): void
    {
        $source = $this->classroom('A-1', 'A');
        [, $student] = $this->parentWithChild($source);
        $past = AcademicYear::factory()->create(['is_active' => false]);
        $target = Classroom::factory()->create(['academic_year_id' => $past->id]);
        $this->actingAs($this->admin)->put(route('admin.students.update', $student), [
            'name' => 'Tidak boleh disimpan', 'nis' => $student->nis, 'gender' => 'L', 'status' => 'aktif', 'classroom_id' => $target->id,
        ])->assertSessionHasErrors('classroom_id');
        $this->assertSame($source->id, $student->enrollments()->sole()->classroom_id);
        $this->assertNotSame('Tidak boleh disimpan', $student->fresh()->name);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_replacing_homeroom_updates_assignment_and_records_old_and_new_teacher(): void
    {
        $old = Teacher::factory()->create();
        $new = Teacher::factory()->create();
        $class = $this->classroom('A-1', 'A');
        $class->update(['homeroom_teacher_id' => $old->id]);
        $class->teachers()->attach($old, ['role' => 'wali_kelas']);
        $this->actingAs($this->admin)->post(route('admin.classrooms.teacher', $class), ['teacher_id' => $new->id])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($new->id, $class->fresh()->homeroom_teacher_id);
        $audit = AuditLog::where('action', 'homeroom_changed')->sole();
        $this->assertSame($old->id, $audit->old_values['homeroom_teacher_id']);
        $this->assertSame($new->id, $audit->new_values['homeroom_teacher_id']);
    }

    public function test_duplicate_teacher_email_does_not_create_a_partial_profile_or_audit(): void
    {
        User::factory()->create(['email' => 'existing@example.test']);
        $users = User::count();
        $this->actingAs($this->admin)->post('/admin/guru', ['name' => 'Guru duplikat', 'email' => 'existing@example.test', 'nip' => 'DUPLICATE-EMAIL', 'phone' => '080000'])
            ->assertSessionHasErrors(['email' => 'Email sudah dipakai akun lain.']);
        $this->assertSame($users, User::count());
        $this->assertDatabaseMissing('teachers', ['nip' => 'DUPLICATE-EMAIL']);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_new_classroom_cannot_assign_a_teacher_already_homeroom_in_active_year(): void
    {
        $teacher = Teacher::factory()->create();
        $classroom = $this->classroom('A-1', 'A');
        $classroom->update(['homeroom_teacher_id' => $teacher->id]);
        $this->actingAs($this->admin)->post('/admin/kelas', ['name' => 'A-2', 'age_range' => '4–5 tahun', 'teacher_id' => $teacher->id])
            ->assertSessionHasErrors('teacher_id');
        $this->assertDatabaseMissing('classrooms', ['name' => 'A-2', 'academic_year_id' => $this->year->id]);
        $this->assertSame($teacher->id, $classroom->fresh()->homeroom_teacher_id);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_teacher_reset_password_is_shown_once_and_hash_and_audit_exclude_plaintext(): void
    {
        $teacher = Teacher::factory()->create();
        $oldHash = $teacher->user->password;
        $this->actingAs($this->admin)->post(route('admin.teachers.reset', $teacher))->assertRedirect()->assertSessionHasNoErrors();
        $response = $this->get('/admin/guru')->assertInertia(fn (Assert $page) => $page
            ->where('temporaryAccount.email', $teacher->user->email)
            ->where('temporaryAccount.password', fn ($password) => strlen($password) >= 8 && (bool) preg_match('/\d/', $password)));
        $password = $response->viewData('page')['props']['temporaryAccount']['password'];
        $user = $teacher->user->fresh();
        $this->assertTrue($user->must_change_password);
        $this->assertNotSame($oldHash, $user->password);
        $this->assertNotSame($password, $user->password);
        $this->assertTrue(Hash::check($password, $user->password));
        $this->assertDatabaseHas('audit_logs', ['action' => 'password_reset', 'entity_id' => $user->id]);
        $this->assertStringNotContainsString($password, AuditLog::all()->toJson());
        $this->get('/admin/guru')->assertInertia(fn (Assert $page) => $page->where('temporaryAccount', null));
    }

    public function test_school_contact_and_banking_are_read_from_settings_for_parent_and_admin(): void
    {
        foreach (['school_name' => 'Sekolah pengujian dinamis', 'school_phone' => '0800111222', 'bank_account_number' => '098700001111'] as $key => $value) {
            SchoolSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
        [$parent] = $this->parentWithChild($this->classroom('A-1', 'A'));
        foreach ([[$this->admin, '/admin/siswa'], [$parent, '/ortu/profil']] as [$user, $url]) {
            $this->actingAs($user)->get($url)->assertInertia(fn (Assert $page) => $page
                ->where('schoolName', 'Sekolah pengujian dinamis')
                ->where('schoolSettings.school_phone', '0800111222')
                ->where('schoolSettings.bank_account_number', '098700001111'));
        }
    }
}
