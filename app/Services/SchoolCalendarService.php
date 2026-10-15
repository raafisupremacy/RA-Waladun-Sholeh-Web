<?php

namespace App\Services;

use App\Models\SchoolSetting;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class SchoolCalendarService
{
    public function schoolDays(Carbon $start, Carbon $end): Collection
    {
        $start = $start->copy()->timezone('Asia/Jakarta')->startOfDay();
        $end = $end->copy()->timezone('Asia/Jakarta')->endOfDay();
        $today = now('Asia/Jakarta')->startOfDay();
        if ($start->copy()->startOfMonth()->gt($today->copy()->startOfMonth())) {
            return collect();
        }
        if ($start->year === $today->year && $start->month === $today->month) {
            $end = $end->min($today->endOfDay());
        }
        if ($start->gt($end)) {
            return collect();
        }

        $holidays = $this->holidays();

        return collect(CarbonPeriod::create($start, $end))
            ->filter(fn (Carbon $date) => $date->isWeekday() && ! $holidays->contains($date->toDateString()))
            ->values();
    }

    public function holidays(): Collection
    {
        $value = SchoolSetting::where('key', 'school_holidays')->value('value');
        $dates = json_decode((string) $value, true);

        return collect(is_array($dates) ? $dates : [])
            ->filter(fn ($date) => is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))
            ->values();
    }
}
