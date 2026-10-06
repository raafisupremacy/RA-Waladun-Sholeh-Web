<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class AcademicYearFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => $this->faker->unique()->year().'/'.($this->faker->year() + 1), 'start_date' => now()->startOfYear(), 'end_date' => now()->endOfYear(), 'is_active' => false];
    }
}
