<?php

namespace Tests\Feature;

use App\Enums\AnnouncementStatus;
use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MilestoneM6Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $parent;

    private Student $child;

    private Student $otherChild;

    private Classroom $groupA;

    private Classroom $groupB;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->parent = User::factory()->create();
        $this->parent->assignRole('orang_tua');
        $guardian = Guardian::create(['user_id' => $this->parent->id, 'name' => 'Wali Anak', 'phone' => '0812', 'address' => 'Alamat']);
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $this->groupA = Classroom::factory()->create(['academic_year_id' => $year->id, 'name' => 'Kelompok A']);
        $this->groupB = Classroom::factory()->create(['academic_year_id' => $year->id, 'name' => 'Kelompok B']);
        $this->child = Student::factory()->create(['name' => 'Anak Wali']);
        $this->otherChild = Student::factory()->create(['name' => 'Anak Lain']);
        foreach ([[$this->child, $this->groupA], [$this->otherChild, $this->groupB]] as [$student, $classroom]) {
            $student->enrollments()->create(['classroom_id' => $classroom->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        }
        $guardian->students()->attach($this->child->id, ['relationship' => 'ibu', 'is_primary' => true]);
    }

    public function test_parent_dashboard_only_shows_relevant_published_announcements(): void
    {
        $visible = Announcement::factory()->create(['created_by' => $this->admin->id, 'title' => 'Untuk semua']);
        $groupVisible = Announcement::factory()->create(['created_by' => $this->admin->id, 'classroom_id' => $this->groupA->id, 'title' => 'Untuk A', 'is_pinned' => true]);
        Announcement::factory()->create(['created_by' => $this->admin->id, 'status' => AnnouncementStatus::Draft, 'title' => 'Draf']);
        Announcement::factory()->create(['created_by' => $this->admin->id, 'expires_at' => now()->subMinute(), 'title' => 'Kedaluwarsa']);
        Announcement::factory()->create(['created_by' => $this->admin->id, 'classroom_id' => $this->groupB->id, 'title' => 'Untuk B']);

        $this->actingAs($this->parent)->get('/ortu')
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeStudentId', $this->child->id)
                ->has('announcements', 2)
                ->where('announcements.0.id', $groupVisible->id)
                ->where('announcements.1.id', $visible->id));
    }

    public function test_parent_cannot_select_another_child_by_url(): void
    {
        $this->actingAs($this->parent)->get('/ortu?student_id='.$this->otherChild->id)->assertForbidden();
    }

    public function test_active_child_is_persisted_in_session(): void
    {
        $this->actingAs($this->parent)->get('/ortu?student_id='.$this->child->id)->assertSessionHas('active_student_id', $this->child->id);
        $this->get('/ortu')->assertInertia(fn (Assert $page) => $page->where('activeStudentId', $this->child->id));
    }

    public function test_admin_can_create_targeted_announcement_and_non_admin_cannot(): void
    {
        $this->actingAs($this->admin)->post('/admin/pengumuman', [
            'title' => 'Kegiatan Kelompok A', 'body' => 'Informasi untuk kelompok A.', 'target' => 'classroom', 'classroom_id' => $this->groupA->id,
            'is_pinned' => true, 'status' => 'terbit', 'expires_at' => now()->addWeek()->toDateTimeString(),
        ])->assertRedirect('/admin/pengumuman');
        $this->assertDatabaseHas('announcements', ['title' => 'Kegiatan Kelompok A', 'classroom_id' => $this->groupA->id, 'status' => 'terbit']);

        $this->actingAs($this->parent)->get('/admin/pengumuman')->assertForbidden();
    }

    public function test_parent_profile_contains_only_linked_children(): void
    {
        $this->actingAs($this->parent)->get('/ortu/profil')
            ->assertInertia(fn (Assert $page) => $page->where('guardian.name', 'Wali Anak')->has('students', 1)->where('students.0.id', $this->child->id));
    }

    public function test_announcement_target_classroom_requires_classroom_id(): void
    {
        $this->actingAs($this->admin)->post('/admin/pengumuman', [
            'title' => 'Judul Tanpa Kelas',
            'body' => 'Isi pengumuman.',
            'target' => 'classroom',
            'classroom_id' => null,
            'status' => 'terbit',
        ])->assertSessionHasErrors(['classroom_id']);
    }

    public function test_admin_can_delete_announcement_and_non_admin_cannot(): void
    {
        $announcement = Announcement::factory()->create(['title' => 'Pengumuman Dihapus']);

        $this->actingAs($this->parent)->delete('/admin/pengumuman/'.$announcement->id)->assertForbidden();

        $this->actingAs($this->admin)->delete('/admin/pengumuman/'.$announcement->id)
            ->assertRedirect();

        $this->assertDatabaseMissing('announcements', ['id' => $announcement->id]);
    }

    public function test_guardian_filtering_by_account_status(): void
    {
        $this->parent->update(['must_change_password' => true]);

        $this->actingAs($this->admin)->get('/admin/orang-tua?status=belum_masuk')
            ->assertInertia(fn (Assert $page) => $page
                ->has('guardians.data', 1)
                ->where('guardians.data.0.account_status', 'belum_masuk')
            );
    }
}
