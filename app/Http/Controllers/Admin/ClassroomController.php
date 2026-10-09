<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterDataRequest;
use App\Models\AcademicYear;
use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Teacher;
use App\Services\MasterDataService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ClassroomController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', Classroom::class);

        return Inertia::render('Admin/Classrooms', [
            'classrooms' => Classroom::with(['academicYear', 'homeroomTeacher', 'teachers',
                'enrollments' => fn ($q) => $q->where('status', 'aktif')->whereHas('student', fn ($s) => $s->where('status', 'aktif'))->with('student'),
            ])->whereHas('academicYear', fn ($q) => $q->where('is_active', true))->orderBy('name')->get()->map(fn ($c) => [
                'id' => $c->id, 'name' => $c->name, 'age_range' => $c->age_range, 'year' => $c->academicYear->name,
                'teacher_id' => $c->homeroom_teacher_id, 'teacher' => $c->homeroomTeacher?->name,
                'teachers' => $c->teachers->map(fn ($t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'role' => $t->pivot->role ?? ($t->id === $c->homeroom_teacher_id ? 'wali_kelas' : 'pendamping'),
                ])->values()->all(),
                'students' => $c->enrollments->map(fn ($e) => $e->student->only('id', 'name', 'nis'))->sortBy('name')->values()->all(),
            ])->all(),
            'teachers' => Teacher::whereHas('user', fn ($q) => $q->where('is_active', true))->orderBy('name')->get(['id', 'name'])->toArray(),
        ]);
    }

    public function store(MasterDataRequest $r)
    {
        $this->authorize('create', Classroom::class);
        $data = $r->validated();
        $activeYear = AcademicYear::where('is_active', true)->firstOrFail();

        $exists = Classroom::where('academic_year_id', $activeYear->id)
            ->where('name', $data['name'])
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages(['name' => 'Nama kelas sudah digunakan pada tahun ajaran ini.']);
        }

        $teacherId = ! empty($data['teacher_id']) ? (int) $data['teacher_id'] : null;

        $classroom = DB::transaction(function () use ($data, $activeYear, $teacherId, $r) {
            $classroom = Classroom::create([
                'academic_year_id' => $activeYear->id,
                'name' => $data['name'],
                'age_range' => $data['age_range'],
                'homeroom_teacher_id' => $teacherId,
            ]);

            AuditLog::create([
                'user_id' => $r->user()->id,
                'action' => 'classroom_created',
                'entity_type' => 'Classroom',
                'entity_id' => $classroom->id,
                'new_values' => $classroom->getAttributes(),
            ]);

            return $classroom;
        });

        return back()->with('success', "Kelas {$classroom->name} berhasil ditambahkan.");
    }

    public function move(MasterDataRequest $r, Classroom $classroom, MasterDataService $service)
    {
        $this->authorize('update', $classroom);
        $service->moveStudents($r->validated('student_ids'), $classroom, $r->user());

        return back()->with('success', 'Siswa berhasil dipindahkan.');
    }

    public function replaceTeacher(MasterDataRequest $r, Classroom $classroom, MasterDataService $service)
    {
        $this->authorize('update', $classroom);
        $data = $r->validated();
        $service->replaceHomeroom($classroom, Teacher::findOrFail($data['teacher_id']), $r->user());

        return back()->with('success', 'Wali kelas berhasil diganti.');
    }
}
