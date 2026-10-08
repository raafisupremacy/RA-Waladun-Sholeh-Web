<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthorizationScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['guru', 'orang_tua'] as $r) {
            Role::findOrCreate($r, 'web');
        }
    }

    public function test_parent_only_sees_linked_child(): void
    {
        $u = User::factory()->create();
        $u->assignRole('orang_tua');
        $g = Guardian::create(['user_id' => $u->id, 'name' => 'Wali', 'phone' => '0812', 'address' => 'A']);
        $own = Student::factory()->create();
        $other = Student::factory()->create();
        $g->students()->attach($own->id, ['relationship' => 'wali', 'is_primary' => true]);
        $this->assertTrue(Student::visibleTo($u)->whereKey($own->id)->exists());
        $this->assertFalse(Student::visibleTo($u)->whereKey($other->id)->exists());
    }

    public function test_teacher_only_sees_active_homeroom_class(): void
    {
        $year = AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        $u = User::factory()->create();
        $u->assignRole('guru');
        $t = Teacher::create(['user_id' => $u->id, 'name' => 'Guru', 'nip' => 'NIP-X', 'phone' => '0812']);
        $class = Classroom::create(['academic_year_id' => $year->id, 'homeroom_teacher_id' => $t->id, 'name' => 'A', 'age_range' => '4']);
        $otherClass = Classroom::create(['academic_year_id' => $year->id, 'name' => 'B', 'age_range' => '5']);
        $own = Student::factory()->create();
        $other = Student::factory()->create();
        $own->enrollments()->create(['classroom_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        $other->enrollments()->create(['classroom_id' => $otherClass->id, 'academic_year_id' => $year->id, 'status' => 'aktif']);
        $this->assertTrue(Student::visibleTo($u)->whereKey($own->id)->exists());
        $this->assertFalse(Student::visibleTo($u)->whereKey($other->id)->exists());
    }
}
