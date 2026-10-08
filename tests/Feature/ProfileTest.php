<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProfileTest extends TestCase
{
    public function test_breeze_profile_mutation_routes_are_unavailable(): void
    {
        $this->get('/profile')->assertNotFound();
        $this->patch('/profile')->assertNotFound();
        $this->delete('/profile')->assertNotFound();
    }
}
