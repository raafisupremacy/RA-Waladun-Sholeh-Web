<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

class EnrollmentFactory extends Factory
{
    public function definition(): array
    {
        return ['student_id' => Student::factory(), 'classroom_id' => Classroom::factory(), 'academic_year_id' => AcademicYear::factory(), 'status' => 'aktif'];
    }
}
