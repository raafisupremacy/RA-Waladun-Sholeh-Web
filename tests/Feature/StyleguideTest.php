<?php

namespace Tests\Feature;

use Tests\TestCase;

class StyleguideTest extends TestCase
{
    public function test_styleguide_page_is_available(): void
    {
        $this->get('/styleguide')->assertOk();
    }
}
