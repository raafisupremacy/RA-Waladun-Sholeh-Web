<?php

namespace Database\Factories;

use App\Enums\AnnouncementStatus;
use App\Models\Announcement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AnnouncementFactory extends Factory
{
    protected $model = Announcement::class;

    public function definition(): array
    {
        return ['created_by' => User::factory(), 'classroom_id' => null, 'title' => fake()->sentence(4), 'body' => fake()->paragraph(), 'is_pinned' => false, 'status' => AnnouncementStatus::Published, 'published_at' => now()->subDay(), 'expires_at' => null];
    }
}
