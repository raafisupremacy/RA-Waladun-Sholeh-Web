<?php

namespace Tests\Feature;

use App\Models\SchoolSetting;
use App\Services\SchoolCalendarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SchoolCalendarServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_calendar_compares_month_and_year_and_excludes_weekend_holidays(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-15 12:00:00', 'Asia/Jakarta'));
        SchoolSetting::create(['key' => 'school_holidays', 'value' => '["2026-10-10","2026-10-12"]']);
        $calendar = app(SchoolCalendarService::class);

        $this->assertCount(0, $calendar->schoolDays(Carbon::parse('2026-11-01'), Carbon::parse('2026-11-30')));
        $this->assertCount(23, $calendar->schoolDays(Carbon::parse('2025-10-01'), Carbon::parse('2025-10-31')));
        $this->assertCount(10, $calendar->schoolDays(Carbon::parse('2026-10-01'), Carbon::parse('2026-10-31')));
        $this->assertNotContains('2026-10-10', $calendar->schoolDays(Carbon::parse('2026-10-01'), Carbon::parse('2026-10-31'))->map->toDateString()->all());
        Carbon::setTestNow();
    }
}
