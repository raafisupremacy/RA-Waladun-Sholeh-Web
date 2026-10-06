<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class StudentFactory extends Factory
{
    public function definition(): array
    {
        return ['nis' => $this->faker->unique()->numerify('2425-###'), 'name' => $this->faker->name(), 'birth_date' => $this->faker->date(), 'gender' => $this->faker->randomElement(['L', 'P']), 'entry_year' => 2025, 'status' => 'aktif'];
    }
}
