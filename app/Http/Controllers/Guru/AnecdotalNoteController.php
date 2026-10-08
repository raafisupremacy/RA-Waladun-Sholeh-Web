<?php

namespace App\Http\Controllers\Guru;

use App\Http\Controllers\Controller;
use App\Models\AnecdotalNote;
use App\Models\Classroom;
use App\Models\Student;
use App\Services\AnecdotalNoteService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AnecdotalNoteController extends Controller
{
    public function index(Request $r)
    {
        $teacher = $r->user()->teacher;
        $classroom = Classroom::where('homeroom_teacher_id', $teacher?->id)
            ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->first();

        $students = Student::query()
            ->whereHas('enrollments', fn ($q) => $q->where('classroom_id', $classroom?->id)
                ->where('status', 'aktif')
                ->whereHas('academicYear', fn ($y) => $y->where('is_active', true)))
            ->where('status', 'aktif')
            ->withCount('anecdotalNotes')
            ->orderBy('name')
            ->get();

        $selectedStudentId = (int) ($r->integer('student_id') ?: ($students->first()?->id ?? 0));
        $selectedStudent = $students->firstWhere('id', $selectedStudentId);

        $notesQuery = AnecdotalNote::with('student')
            ->where('teacher_id', $teacher?->id)
            ->where('student_id', $selectedStudentId)
            ->latest('noted_at');

        $notes = $notesQuery->get()->map(function (AnecdotalNote $note) {
            return [
                'id' => $note->id,
                'student_id' => $note->student_id,
                'noted_at' => $note->noted_at?->toISOString(),
                'noted_at_formatted' => $note->noted_at ? Carbon::parse($note->noted_at)->locale('id')->translatedFormat('d M Y · H.i').' WIB' : '',
                'date_only' => $note->noted_at?->toDateString(),
                'time_only' => $note->noted_at?->format('H:i'),
                'observed_behavior' => $note->observed_behavior,
                'interpretation' => $note->interpretation,
                'follow_up' => $note->follow_up,
                'has_photo' => ! empty($note->photo_path),
                'photo_url' => ! empty($note->photo_path) ? route('anecdotes.photo', $note->id) : null,
            ];
        })->values()->all();

        // Calculate student age string if birth_date exists
        $studentAge = '5 Tahun';
        if ($selectedStudent && $selectedStudent->birth_date) {
            $diff = Carbon::parse($selectedStudent->birth_date)->diff(now());
            $studentAge = "{$diff->y} Tahun {$diff->m} Bulan";
        }

        return Inertia::render('Guru/AnecdotalNotes', [
            'classroom' => $classroom ? [
                'id' => $classroom->id,
                'name' => $classroom->name,
            ] : null,
            'students' => $students->map(function ($s) {
                $nameParts = preg_split('/\s+/', trim($s->name));
                $initials = count($nameParts) >= 2
                    ? mb_strtoupper(mb_substr($nameParts[0], 0, 1).mb_substr($nameParts[1], 0, 1))
                    : mb_strtoupper(mb_substr($s->name, 0, 2));

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'nis' => $s->nis,
                    'initials' => $initials,
                    'notes_count' => $s->anecdotal_notes_count,
                ];
            })->values()->all(),
            'selected_student' => $selectedStudent ? [
                'id' => $selectedStudent->id,
                'name' => $selectedStudent->name,
                'nis' => $selectedStudent->nis,
                'age' => $studentAge,
                'homeroom_teacher' => $teacher?->name ?? 'Wali Kelas',
            ] : null,
            'notes' => [
                'data' => $notes,
            ],
        ]);
    }

    public function store(Request $r, AnecdotalNoteService $service)
    {
        $data = $r->validate([
            'student_id' => 'required|exists:students,id',
            'noted_at' => 'required|date',
            'observed_behavior' => 'required|string',
            'interpretation' => 'required|string',
            'follow_up' => 'nullable|string',
            'photo' => 'nullable|image|max:5120',
        ]);

        abort_unless(Student::visibleTo($r->user())->whereKey($data['student_id'])->exists(), 403);
        $payload = collect($data)->except('photo')->all();
        $payload['follow_up'] = $payload['follow_up'] ?? '';
        $service->create($payload, $r->user(), $r->file('photo'));

        return back();
    }

    public function update(AnecdotalNote $note, Request $r, AnecdotalNoteService $service)
    {
        $data = $r->validate([
            'noted_at' => 'required|date',
            'observed_behavior' => 'required|string',
            'interpretation' => 'required|string',
            'follow_up' => 'nullable|string',
            'photo' => 'nullable|image|max:5120',
        ]);

        $payload = collect($data)->except('photo')->all();
        $payload['follow_up'] = $payload['follow_up'] ?? '';
        $service->update($note, $payload, $r->user(), $r->file('photo'));

        return back();
    }

    public function photo(AnecdotalNote $note)
    {
        $this->authorize('view', $note);
        abort_unless($note->photo_path && Storage::disk('private')->exists($note->photo_path), 404);

        return Storage::disk('private')->response($note->photo_path, null, ['X-Content-Type-Options' => 'nosniff']);
    }
}
