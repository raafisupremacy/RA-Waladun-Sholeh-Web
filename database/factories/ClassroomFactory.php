<?php

namespace Database\Factories;

use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClassroomFactory extends Factory
{
    public function definition(): array
    {
        return ['academic_year_id' => AcademicYear::factory(), 'homeroom_teacher_id' => null, 'name' => 'Kelompok '.$this->faker->unique()->randomLetter(), 'age_range' => '4–5 tahun'];
    }
}
