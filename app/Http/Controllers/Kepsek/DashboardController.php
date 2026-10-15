<?php

namespace App\Http\Controllers\Kepsek;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request, ReportService $reports)
    {
        $yearId = $request->integer('academic_year_id');
        $year = $yearId ? AcademicYear::find($yearId) : AcademicYear::where('is_active', true)->first();
        if (! $year) {
            $year = AcademicYear::latest('start_date')->first();
        }

        $month = max(1, min(12, $request->integer('month') ?: now()->month));
        $periodYear = now()->year;
        $startYear = now()->year;
        $endYear = now()->year;
        if ($year && $year->start_date && $year->end_date) {
            $startYear = Carbon::parse($year->start_date)->year;
            $endYear = Carbon::parse($year->end_date)->year;
            $periodYear = ($month >= 7) ? $startYear : $endYear;
        }

        $summary = $reports->tuitionSummary($month, $periodYear, $year?->id);
        $trend = $reports->activeStudentTrend($year?->id, 4);
        $journalCompletion = $reports->journalCompletion($month, $periodYear, $year?->id);
        $overdue = $reports->overdueStudents(30, $year?->id);
        $settings = SchoolSetting::whereIn('key', ['semester_1_start', 'semester_1_end', 'semester_2_start', 'semester_2_end'])->pluck('value', 'key');
        $today = now('Asia/Jakarta')->startOfDay();
        $semester = collect([['name' => 'Semester 1', 'start' => $settings['semester_1_start'] ?? null, 'end' => $settings['semester_1_end'] ?? null], ['name' => 'Semester 2', 'start' => $settings['semester_2_start'] ?? null, 'end' => $settings['semester_2_end'] ?? null]])->filter(fn ($s) => $s['start'] && $s['end'])->first(fn ($s) => $today->between(Carbon::parse($s['start']), Carbon::parse($s['end'])));
        $semesterProgress = $semester ? ['name' => $semester['name'], 'start' => $semester['start'], 'end' => $semester['end'], 'days_total' => Carbon::parse($semester['start'])->diffInDays(Carbon::parse($semester['end'])) + 1, 'days_elapsed' => Carbon::parse($semester['start'])->diffInDays($today) + 1] : ['name' => $today->lt(Carbon::parse($settings['semester_1_start'] ?? '9999-01-01')) ? 'Semester 1 belum dimulai' : 'Semester telah berakhir'];

        $activeStudentsCount = Student::where('status', 'aktif')
            ->when($year?->id, fn ($q) => $q->whereHas('enrollments', fn ($e) => $e->where('academic_year_id', $year->id)))
            ->count();

        return Inertia::render('Kepsek/Dashboard', [
            'month' => $month,
            'year' => $periodYear,
            'startYear' => $startYear,
            'endYear' => $endYear,
            'academicYearId' => $year?->id,
            'academicYears' => AcademicYear::latest('start_date')->get(['id', 'name']),
            'summary' => $summary,
            'trend' => $trend,
            'activeStudentsCount' => $activeStudentsCount,
            'journalCompletion' => $journalCompletion,
            'overdue' => $overdue,
            'semesterProgress' => $semesterProgress,
        ]);
    }
}
