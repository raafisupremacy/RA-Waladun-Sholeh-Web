<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TeacherFactory extends Factory
{
    public function definition(): array
    {
        return ['user_id' => User::factory(), 'name' => $this->faker->name(), 'nip' => $this->faker->unique()->numerify('NIP########'), 'phone' => $this->faker->phoneNumber()];
    }
}
