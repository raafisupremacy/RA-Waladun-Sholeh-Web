<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class GuardianFactory extends Factory
{
    public function definition(): array
    {
        return ['user_id' => User::factory(), 'name' => $this->faker->name(), 'phone' => $this->faker->phoneNumber(), 'address' => $this->faker->address()];
    }
}
