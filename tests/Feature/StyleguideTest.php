<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class StyleguideTest extends TestCase
{
    public function test_styleguide_page_is_local_only(): void
    {
        $this->assertFalse(Route::has('styleguide'));
        $this->get('/styleguide')->assertNotFound();
    }
}
