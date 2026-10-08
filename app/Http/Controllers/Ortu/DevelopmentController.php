<?php

namespace App\Http\Controllers\Ortu;

use App\Http\Controllers\Controller;
use App\Models\AnecdotalNote;
use App\Models\DailyJournal;
use App\Services\ParentStudentContext;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class DevelopmentController extends Controller
{
    public function index(Request $r, ParentStudentContext $context)
    {
        $students = $context->students($r->user());
        $activeStudent = $context->resolve($r);
        $studentId = $activeStudent?->id;

        $month = (int) ($r->integer('month') ?: now()->month);
        $year = (int) ($r->integer('year') ?: now()->year);

        $dateCarbon = Carbon::createFromDate($year, $month, 1);
        $monthName = $dateCarbon->locale('id')->translatedFormat('F Y');

        $activeEnrollment = $activeStudent?->enrollments()
            ->where('status', 'aktif')
            ->whereHas('academicYear', fn ($y) => $y->where('is_active', true))
            ->with('classroom')
            ->first();
        $classroomName = $activeEnrollment?->classroom?->name ?? 'Kelompok A';

        $journals = DailyJournal::with(['student', 'assessments'])
            ->where('status', 'final')
            ->where('student_id', $studentId ?: -1)
            ->whereMonth('journal_date', $month)
            ->whereYear('journal_date', $year)
            ->latest('journal_date')
            ->get()
            ->map(function (DailyJournal $journal) {
                return [
                    'id' => $journal->id,
                    'journal_date' => $journal->journal_date?->toDateString(),
                    'journal_date_formatted' => $journal->journal_date ? Carbon::parse($journal->journal_date)->locale('id')->translatedFormat('l, j M') : '',
                    'activity_summary' => $journal->activity_summary,
                    'assessments' => $journal->assessments->map(fn ($assessment) => [
                        'aspect' => $assessment->aspect?->value,
                        'level' => $assessment->level?->value,
                        'note' => $assessment->note,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        $anecdotes = AnecdotalNote::where('student_id', $studentId ?: -1)
            ->whereMonth('noted_at', $month)
            ->whereYear('noted_at', $year)
            ->latest('noted_at')
            ->get()
            ->map(function (AnecdotalNote $note) {
                return [
                    'id' => $note->id,
                    'noted_at' => $note->noted_at?->toISOString(),
                    'noted_at_formatted' => $note->noted_at ? Carbon::parse($note->noted_at)->locale('id')->translatedFormat('l, j M Y · H.i').' WIB' : '',
                    'observed_behavior' => $note->observed_behavior,
                    'interpretation' => $note->interpretation,
                    'follow_up' => $note->follow_up,
                    'has_photo' => ! empty($note->photo_path),
                    'photo_url' => ! empty($note->photo_path) ? route('anecdotes.photo', $note->id) : null,
                ];
            })
            ->values()
            ->all();

        // Calculate prev and next month
        $prevMonth = $dateCarbon->copy()->subMonth();
        $nextMonth = $dateCarbon->copy()->addMonth();

        return Inertia::render('Ortu/Development', [
            'students' => $students->map(fn ($student) => [
                'id' => $student->id,
                'name' => $student->name,
                'nis' => $student->nis,
            ])->values()->all(),
            'selectedStudent' => $activeStudent ? [
                'id' => $activeStudent->id,
                'name' => $activeStudent->name,
                'nis' => $activeStudent->nis,
                'classroom_name' => $classroomName,
            ] : null,
            'selectedStudentId' => $studentId,
            'month' => $month,
            'year' => $year,
            'month_name' => $monthName,
            'prev_month' => ['month' => $prevMonth->month, 'year' => $prevMonth->year],
            'next_month' => ['month' => $nextMonth->month, 'year' => $nextMonth->year],
            'journals' => [
                'data' => $journals,
            ],
            'anecdotes' => [
                'data' => $anecdotes,
            ],
        ]);
    }
}
