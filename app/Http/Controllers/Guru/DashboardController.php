<?php

namespace App\Http\Controllers\Guru;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $r)
    {
        $teacher = $r->user()->teacher;
        $classroom = Classroom::where(fn ($q) => $q->where('homeroom_teacher_id', $teacher?->id)->orWhereHas('teachers', fn ($t) => $t->where('teachers.id', $teacher?->id)))
            ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->with('academicYear')
            ->first();

        $rawDate = $r->input('date') ?: today()->toDateString();
        $dateFormatted = Carbon::parse($rawDate)->locale('id')->translatedFormat('l, j M Y');

        if (! $classroom) {
            return Inertia::render('Guru/Dashboard', [
                'classroom' => null,
                'date' => $dateFormatted,
                'raw_date' => $rawDate,
                'filled' => 0,
                'total' => 0,
                'progress_percentage' => 0,
                'students' => [],
            ]);
        }

        $students = Student::query()
            ->whereHas('enrollments', fn ($q) => $q->where('classroom_id', $classroom->id)
                ->where('status', 'aktif')
                ->whereHas('academicYear', fn ($y) => $y->where('is_active', true)))
            ->where('status', 'aktif')
            ->orderBy('name')
            ->get();

        $journals = DailyJournal::where('classroom_id', $classroom->id)
            ->whereDate('journal_date', $rawDate)
            ->get()
            ->keyBy('student_id');

        $studentItems = $students->map(function (Student $s) use ($journals) {
            $journal = $journals->get($s->id);
            $isFilled = $journal !== null;
            $nameParts = preg_split('/\s+/', trim($s->name));
            $initials = count($nameParts) >= 2
                ? mb_strtoupper(mb_substr($nameParts[0], 0, 1).mb_substr($nameParts[1], 0, 1))
                : mb_strtoupper(mb_substr($s->name, 0, 2));

            return [
                'id' => $s->id,
                'name' => $s->name,
                'nis' => $s->nis,
                'initials' => $initials,
                'is_filled' => $isFilled,
                'status' => $isFilled ? 'sudah_diisi' : 'belum_diisi',
                'status_label' => $isFilled ? 'Sudah diisi' : 'Belum diisi',
                'journal_id' => $journal?->id,
                'journal_status' => $journal?->status?->value,
            ];
        })->values()->all();

        $totalCount = count($studentItems);
        $filledCount = count(array_filter($studentItems, fn ($s) => $s['is_filled']));
        $progressPercentage = $totalCount > 0 ? (int) round(($filledCount / $totalCount) * 100) : 0;

        return Inertia::render('Guru/Dashboard', [
            'classroom' => [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'academic_year' => ($classroom->academicYear?->name ?? '2026/2027').' · Semester Ganjil',
            ],
            'date' => $dateFormatted,
            'raw_date' => $rawDate,
            'filled' => $filledCount,
            'total' => $totalCount,
            'progress_percentage' => $progressPercentage,
            'students' => $studentItems,
        ]);
    }
}
