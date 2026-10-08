<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MasterDataTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Classroom $classroom;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'guru', 'orang_tua', 'kepala_sekolah'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $year = AcademicYear::factory()->create(['is_active' => true]);
        $this->classroom = Classroom::factory()->create(['academic_year_id' => $year->id]);
    }

    private function studentData(array $extra = []): array
    {
        return array_replace([
            'name' => 'Anak Baru', 'nis' => '2627-099', 'birth_date' => '2021-05-14',
            'gender' => 'L', 'entry_year' => 2026, 'classroom_id' => $this->classroom->id,
            'existing_guardian' => false, 'relationship' => 'ibu',
            'guardian_name' => 'Wali Baru', 'guardian_email' => 'wali.baru@example.test',
            'guardian_phone' => '08123456', 'guardian_address' => 'Alamat wali',
        ], $extra);
    }

    public function test_student_creation_provisions_guardian_and_enrolls_in_active_year(): void
    {
        $this->actingAs($this->admin)->post('/admin/siswa', $this->studentData())->assertRedirect('/admin/siswa');
        $student = Student::where('nis', '2627-099')->firstOrFail();
        $user = User::where('email', 'wali.baru@example.test')->firstOrFail();
        $this->assertTrue($user->hasRole('orang_tua'));
        $this->assertTrue($user->must_change_password);
        $this->assertDatabaseHas('enrollments', ['student_id' => $student->id, 'academic_year_id' => $this->classroom->academic_year_id]);
        $this->assertSame($user->guardian->id, $student->guardians->sole()->id);
        $response = $this->get('/admin/siswa');
        $response->assertInertia(fn (Assert $page) => $page
            ->where('temporaryAccount.email', $user->email)
            ->where('temporaryAccount.password', function ($value) use ($user) {
                return strlen($value) >= 8 && preg_match('/[0-9]/', $value) && Hash::check($value, $user->password);
            }));
        $password = $response->viewData('page')['props']['temporaryAccount']['password'];
        $this->assertNotSame($password, $user->password);
        $this->assertStringNotContainsString($password, AuditLog::all()->toJson());
        $this->get('/admin/siswa')->assertInertia(fn (Assert $page) => $page->where('temporaryAccount', null));
    }

    public function test_duplicate_email_returns_indonesian_error_and_no_partial_student(): void
    {
        User::factory()->create(['email' => 'wali.baru@example.test']);
        $this->actingAs($this->admin)->post('/admin/siswa', $this->studentData())
            ->assertSessionHasErrors(['guardian_email' => 'Email sudah dipakai akun lain.']);
        $this->assertDatabaseMissing('students', ['nis' => '2627-099']);
    }

    public function test_two_children_share_one_existing_guardian_account(): void
    {
        $guardian = Guardian::factory()->create();
        $users = User::count();
        foreach (['2627-091', '2627-092'] as $nis) {
            $this->actingAs($this->admin)->post('/admin/siswa', $this->studentData([
                'nis' => $nis, 'existing_guardian' => true, 'guardian_id' => $guardian->id,
            ]))->assertSessionHasNoErrors();
        }
        $this->assertSame(2, $guardian->students()->count());
        $this->assertSame($users, User::count());
    }

    public function test_teacher_creation_can_assign_class_and_reset_password_once(): void
    {
        $this->actingAs($this->admin)->post('/admin/guru', [
            'name' => 'Guru Baru', 'nip' => 'NEW-1', 'email' => 'guru.baru@example.test', 'phone' => '08123',
            'classroom_id' => $this->classroom->id,
        ])->assertSessionHasNoErrors();
        $teacher = Teacher::where('nip', 'NEW-1')->firstOrFail();
        $this->assertSame($teacher->id, $this->classroom->fresh()->homeroom_teacher_id);
        $oldHash = $teacher->user->password;
        $this->post("/admin/guru/{$teacher->id}/reset-kata-sandi")->assertSessionHasNoErrors();
        $this->assertNotSame($oldHash, $teacher->user->fresh()->password);
        $this->assertDatabaseHas('audit_logs', ['action' => 'password_reset', 'entity_id' => $teacher->user_id]);
    }

    public function test_bulk_transfer_is_atomic_and_deactivation_preserves_enrollment(): void
    {
        $target = Classroom::factory()->create(['academic_year_id' => $this->classroom->academic_year_id]);
        $students = Student::factory(2)->create();
        foreach ($students as $student) {
            $student->enrollments()->create(['classroom_id' => $this->classroom->id, 'academic_year_id' => $this->classroom->academic_year_id, 'status' => 'aktif']);
        }
        $this->actingAs($this->admin)->post("/admin/kelas/{$target->id}/siswa", ['student_ids' => $students->modelKeys()])->assertSessionHasNoErrors();
        foreach ($students as $student) {
            $this->assertDatabaseHas('enrollments', ['student_id' => $student->id, 'classroom_id' => $target->id]);
        }
        $this->post("/admin/siswa/{$students[0]->id}/nonaktifkan")->assertSessionHasNoErrors();
        $this->assertDatabaseHas('students', ['id' => $students[0]->id, 'status' => 'nonaktif']);
        $this->assertDatabaseHas('enrollments', ['student_id' => $students[0]->id]);
    }

    public function test_all_master_data_routes_are_admin_only(): void
    {
        foreach (['guru', 'orang_tua', 'kepala_sekolah'] as $role) {
            $user = User::factory()->create();
            $user->assignRole($role);
            foreach (['/admin/siswa', '/admin/siswa/create', '/admin/orang-tua', '/admin/guru', '/admin/kelas'] as $url) {
                $this->actingAs($user)->get($url)->assertForbidden();
            }
            foreach (['/admin/siswa', '/admin/guru', '/admin/orang-tua'] as $url) {
                $this->post($url, [])->assertForbidden();
            }
        }
    }

    public function test_filters_and_inactive_students_are_excluded_from_new_invoices(): void
    {
        $active = Student::factory()->create(['name' => 'Cari Siswa', 'nis' => '2627-022', 'status' => 'aktif']);
        $inactive = Student::factory()->create(['name' => 'Tidak Aktif', 'status' => 'nonaktif']);
        foreach ([$active, $inactive] as $student) {
            $student->enrollments()->create(['classroom_id' => $this->classroom->id, 'academic_year_id' => $this->classroom->academic_year_id, 'status' => 'aktif']);
        }
        $this->actingAs($this->admin)->get('/admin/siswa?search=2627-022&status=aktif&classroom_id='.$this->classroom->id)
            ->assertInertia(fn (Assert $page) => $page->has('students.data', 1)->where('students.data.0.id', $active->id));
        app(InvoiceService::class)->generate(10, 2026, $this->classroom->academic_year_id, 100000);
        $this->assertDatabaseHas('invoices', ['student_id' => $active->id]);
        $this->assertDatabaseMissing('invoices', ['student_id' => $inactive->id]);
    }

    public function test_bulk_transfer_rolls_back_if_one_student_has_no_active_enrollment(): void
    {
        $target = Classroom::factory()->create(['academic_year_id' => $this->classroom->academic_year_id]);
        $students = Student::factory(2)->create();
        $students[0]->enrollments()->create(['classroom_id' => $this->classroom->id, 'academic_year_id' => $this->classroom->academic_year_id, 'status' => 'aktif']);
        $this->actingAs($this->admin)->post("/admin/kelas/{$target->id}/siswa", ['student_ids' => $students->modelKeys()])->assertNotFound();
        $this->assertDatabaseHas('enrollments', ['student_id' => $students[0]->id, 'classroom_id' => $this->classroom->id]);
        $this->assertDatabaseMissing('audit_logs', ['action' => 'student_moved']);
    }

    public function test_one_teacher_cannot_hold_two_classes_in_same_year(): void
    {
        $teacher = Teacher::factory()->create();
        $this->classroom->update(['homeroom_teacher_id' => $teacher->id]);
        $other = Classroom::factory()->create(['academic_year_id' => $this->classroom->academic_year_id]);
        $this->actingAs($this->admin)->post("/admin/kelas/{$other->id}/wali", ['teacher_id' => $teacher->id])->assertSessionHasErrors('teacher_id');
        $this->assertNull($other->fresh()->homeroom_teacher_id);
    }
}
