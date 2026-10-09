<?php

namespace App\Http\Controllers\Guru;

use App\Enums\JournalStatus;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Student;
use App\Services\JournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class JournalController extends Controller
{
    public function index(Request $request)
    {
        $teacher = auth()->user()->teacher;
        $classroom = Classroom::where(fn ($q) => $q->where('homeroom_teacher_id', $teacher?->id)->orWhereHas('teachers', fn ($t) => $t->where('teachers.id', $teacher?->id)))
            ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->first();

        $activeStudentsQuery = Student::visibleTo(auth()->user());
        if ($classroom) {
            $activeStudentsQuery->whereHas('enrollments', fn ($q) => $q->where('classroom_id', $classroom->id)
                ->where('status', 'aktif')
                ->whereHas('academicYear', fn ($y) => $y->where('is_active', true)));
        }
        $totalStudents = (clone $activeStudentsQuery)->count();
        $filledToday = DailyJournal::where('teacher_id', $teacher?->id)
            ->whereDate('journal_date', today())
            ->where('status', JournalStatus::Final)
            ->count();

        $filledTodayStudentIds = DailyJournal::where('teacher_id', $teacher?->id)
            ->whereDate('journal_date', today())
            ->where('status', JournalStatus::Final)
            ->pluck('student_id');

        $firstUnfilledStudent = (clone $activeStudentsQuery)
            ->whereNotIn('students.id', $filledTodayStudentIds)
            ->first();

        $query = DailyJournal::with('student')
            ->where('teacher_id', $teacher?->id)
            ->whereIn('student_id', $activeStudentsQuery->pluck('students.id'));

        if ($request->filled('date')) {
            $query->whereDate('journal_date', $request->input('date'));
        }

        if ($request->filled('q')) {
            $q = $request->input('q');
            $query->whereHas('student', fn ($s) => $s->where('name', 'like', "%{$q}%")->orWhere('nis', 'like', "%{$q}%"));
        }

        $journals = $query->latest('journal_date')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (DailyJournal $journal) => [
                'id' => $journal->id,
                'student_id' => $journal->student_id,
                'student' => $journal->student ? [
                    'id' => $journal->student->id,
                    'name' => $journal->student->name,
                    'nis' => $journal->student->nis,
                    'initials' => collect(explode(' ', $journal->student->name))
                        ->filter()
                        ->take(2)
                        ->map(fn ($p) => mb_substr($p, 0, 1))
                        ->implode(''),
                ] : null,
                'journal_date' => $journal->journal_date?->toDateString(),
                'journal_date_formatted' => $journal->journal_date?->locale('id')->translatedFormat('j M Y'),
                'activity_summary' => $journal->activity_summary ?: 'Belum ada ringkasan kegiatan',
                'status' => $journal->status?->value,
                'status_label' => $journal->status === JournalStatus::Final ? 'Sudah disimpan' : 'Draf',
            ]);

        return Inertia::render('Guru/Journal', [
            'classroom' => $classroom ? [
                'id' => $classroom->id,
                'name' => $classroom->name,
            ] : null,
            'today_stats' => [
                'date_formatted' => today()->locale('id')->translatedFormat('l, j M Y'),
                'filled' => $filledToday,
                'total' => $totalStudents,
                'next_student_id' => $firstUnfilledStudent?->id,
            ],
            'filters' => [
                'date' => $request->input('date', ''),
                'q' => $request->input('q', ''),
            ],
            'journals' => $journals,
        ]);
    }

    public function show(Student $student, Request $request)
    {
        abort_unless(Student::visibleTo(auth()->user())->whereKey($student->id)->exists(), 403);

        $teacher = auth()->user()->teacher;
        $classroom = Classroom::where(fn ($q) => $q->where('homeroom_teacher_id', $teacher?->id)->orWhereHas('teachers', fn ($t) => $t->where('teachers.id', $teacher?->id)))
            ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->first();

        // Get all active classroom students for prev / next navigation
        $classStudents = Student::query()
            ->whereHas('enrollments', fn ($q) => $q->where('classroom_id', $classroom?->id)
                ->where('status', 'aktif')
                ->whereHas('academicYear', fn ($y) => $y->where('is_active', true)))
            ->where('status', 'aktif')
            ->orderBy('name')
            ->get();

        $currentIndex = $classStudents->search(fn ($s) => $s->id === $student->id);
        $prevStudent = ($currentIndex !== false && $currentIndex > 0)
            ? ['id' => $classStudents[$currentIndex - 1]->id, 'name' => $classStudents[$currentIndex - 1]->name]
            : null;
        $nextStudent = ($currentIndex !== false && $currentIndex < $classStudents->count() - 1)
            ? ['id' => $classStudents[$currentIndex + 1]->id, 'name' => $classStudents[$currentIndex + 1]->name]
            : null;

        $date = $request->input('date') ?: today()->toDateString();
        $dateFormatted = Carbon::parse($date)->locale('id')->translatedFormat('j M Y');

        $journal = DailyJournal::with('assessments')
            ->where('teacher_id', $teacher?->id)
            ->where('student_id', $student->id)
            ->whereDate('journal_date', $date)
            ->first();

        $allJournals = DailyJournal::with('assessments')
            ->where('teacher_id', $teacher?->id)
            ->where('student_id', $student->id)
            ->latest('journal_date')
            ->get()
            ->map(fn (DailyJournal $j) => $this->summary($j, true))
            ->values()
            ->all();

        $editWindowDays = (int) config('skms.journal_edit_days', 1);
        $isLocked = false;
        $canEdit = true;
        $lockedUntilDate = null;

        if ($journal && $journal->status === JournalStatus::Final) {
            $lockExpiry = $journal->journal_date->endOfDay()->addDays($editWindowDays);
            $isLocked = $lockExpiry->isPast();
            $canEdit = ! $isLocked;
            $lockedUntilDate = $journal->journal_date->addDays($editWindowDays)->locale('id')->translatedFormat('j M Y');
        }

        $assessmentsMap = [];
        if ($journal) {
            foreach ($journal->assessments as $assessment) {
                $assessmentsMap[$assessment->aspect->value] = [
                    'level' => $assessment->level->value,
                    'note' => $assessment->note ?? '',
                ];
            }
        }

        return Inertia::render('Guru/JournalForm', [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'nis' => $student->nis,
            ],
            'classroom' => $classroom ? [
                'id' => $classroom->id,
                'name' => $classroom->name,
            ] : null,
            'date' => $date,
            'date_formatted' => $dateFormatted,
            'journal' => $journal ? [
                'id' => $journal->id,
                'activity_summary' => $journal->activity_summary,
                'status' => $journal->status->value,
                'finalized_at' => $journal->finalized_at?->toISOString(),
                'assessments' => $assessmentsMap,
            ] : null,
            'is_locked' => $isLocked,
            'can_edit' => $canEdit,
            'locked_until_date' => $lockedUntilDate,
            'prev_student' => $prevStudent,
            'next_student' => $nextStudent,
            'journals' => $allJournals,
        ]);
    }

    public function history(Request $request)
    {
        $teacher = $request->user()->teacher;
        $classroom = Classroom::where(fn ($q) => $q->where('homeroom_teacher_id', $teacher?->id)->orWhereHas('teachers', fn ($t) => $t->where('teachers.id', $teacher?->id)))
            ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->first();

        $month = (int) ($request->integer('month') ?: now()->month);
        $year = (int) ($request->integer('year') ?: now()->year);
        $aspectFilter = $request->input('aspect') ?: 'all';

        $students = Student::query()
            ->whereHas('enrollments', fn ($q) => $q->where('classroom_id', $classroom?->id)
                ->where('status', 'aktif')
                ->whereHas('academicYear', fn ($y) => $y->where('is_active', true)))
            ->where('status', 'aktif')
            ->orderBy('name')
            ->get();

        $selectedStudentId = (int) ($request->integer('student_id') ?: ($students->first()?->id ?? 0));
        $selectedStudent = $students->firstWhere('id', $selectedStudentId);

        // Calculate school days in that month (Mon-Fri)
        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();
        $schoolDays = [];
        $cur = $startOfMonth->copy();
        while ($cur->lte($endOfMonth)) {
            if ($cur->isWeekday()) {
                $schoolDays[] = [
                    'date' => $cur->toDateString(),
                    'day_name' => $cur->locale('id')->translatedFormat('D'),
                    'day_number' => $cur->day,
                    'is_past_or_today' => $cur->lte(today()),
                ];
            }
            $cur->addDay();
        }

        $journalsQuery = DailyJournal::with(['student', 'assessments'])
            ->where('teacher_id', $teacher?->id)
            ->whereMonth('journal_date', $month)
            ->whereYear('journal_date', $year);

        if ($selectedStudentId) {
            $journalsQuery->where('student_id', $selectedStudentId);
        }

        $journals = $journalsQuery->get();

        $journalsByDate = [];
        foreach ($journals as $journal) {
            $dateKey = $journal->journal_date->toDateString();
            $assessments = [];
            foreach ($journal->assessments as $assessment) {
                $assessments[$assessment->aspect->value] = [
                    'level' => $assessment->level->value,
                    'note' => $assessment->note ?? '',
                ];
            }
            $journalsByDate[$dateKey] = [
                'id' => $journal->id,
                'activity_summary' => $journal->activity_summary,
                'status' => $journal->status->value,
                'finalized_at' => $journal->finalized_at?->toISOString(),
                'assessments' => $assessments,
            ];
        }

        $effectiveSchoolDays = array_filter($schoolDays, fn ($d) => $d['is_past_or_today']);
        $totalSchoolDays = count($effectiveSchoolDays) ?: count($schoolDays);
        $filledDays = count(array_filter($effectiveSchoolDays, fn ($d) => isset($journalsByDate[$d['date']]) && $journalsByDate[$d['date']]['status'] === 'final'));

        return Inertia::render('Guru/JournalHistory', [
            'classroom' => $classroom ? [
                'id' => $classroom->id,
                'name' => $classroom->name,
            ] : null,
            'students' => $students->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'nis' => $s->nis])->values()->all(),
            'selected_student' => $selectedStudent ? [
                'id' => $selectedStudent->id,
                'name' => $selectedStudent->name,
                'nis' => $selectedStudent->nis,
            ] : null,
            'month' => $month,
            'year' => $year,
            'month_name' => Carbon::createFromDate($year, $month, 1)->locale('id')->translatedFormat('F Y'),
            'aspect_filter' => $aspectFilter,
            'school_days' => $schoolDays,
            'journals_by_date' => $journalsByDate,
            'stats' => [
                'filled_days' => $filledDays,
                'total_days' => $totalSchoolDays,
                'attendance_percent' => 100,
                'dominant_level' => 'BSH/BSB',
            ],
            'journals' => $journals->map(fn ($j) => $this->summary($j, true))->values()->all(),
        ]);
    }

    public function store(Request $r, JournalService $s)
    {
        $data = $r->validate([
            'student_id' => 'required',
            'classroom_id' => 'required',
            'journal_date' => 'required|date',
            'activity_summary' => 'nullable|string',
            'assessments' => 'nullable|array',
            'id' => 'nullable|integer',
        ]);

        $journal = $s->saveDraft($data, $r->user()->teacher);

        if ($r->wantsJson()) {
            return response()->json([
                'status' => 'ok',
                'journal_id' => $journal->id,
                'saved_at' => now()->format('H.i'),
            ]);
        }

        return back()->with('saved_at', now()->format('H.i'));
    }

    public function finalize(DailyJournal $journal, Request $r, JournalService $s)
    {
        $data = $r->validate([
            'activity_summary' => 'nullable|string',
            'assessments' => 'required|array',
        ]);

        $finalized = $s->finalize($journal, $data, $r->user()->teacher);

        if ($r->wantsJson()) {
            return response()->json([
                'status' => 'final',
                'journal_id' => $finalized->id,
                'saved_at' => now()->format('H.i'),
            ]);
        }

        return back();
    }

    private function summary(DailyJournal $journal, bool $withAssessments = false): array
    {
        $summary = [
            'id' => $journal->id,
            'student' => $journal->student ? ['id' => $journal->student->id, 'name' => $journal->student->name] : null,
            'journal_date' => $journal->journal_date?->toDateString(),
            'activity_summary' => $journal->activity_summary,
            'status' => $journal->status?->value,
            'finalized_at' => $journal->finalized_at?->toISOString(),
        ];
        if ($withAssessments) {
            $summary['assessments'] = $journal->assessments->map(fn ($assessment) => [
                'id' => $assessment->id,
                'aspect' => $assessment->aspect?->value,
                'level' => $assessment->level?->value,
                'note' => $assessment->note,
            ])->values()->all();
        }

        return $summary;
    }
}
