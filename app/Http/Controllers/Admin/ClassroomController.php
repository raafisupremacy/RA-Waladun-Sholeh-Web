<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterDataRequest;
use App\Models\Classroom;
use App\Models\Teacher;
use App\Services\MasterDataService;
use Inertia\Inertia;

class ClassroomController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', Classroom::class);

        return Inertia::render('Admin/Classrooms', [
            'classrooms' => Classroom::with(['academicYear', 'homeroomTeacher',
                'enrollments' => fn ($q) => $q->where('status', 'aktif')->whereHas('student', fn ($s) => $s->where('status', 'aktif'))->with('student'),
            ])->whereHas('academicYear', fn ($q) => $q->where('is_active', true))->orderBy('name')->get()->map(fn ($c) => [
                'id' => $c->id, 'name' => $c->name, 'age_range' => $c->age_range, 'year' => $c->academicYear->name,
                'teacher_id' => $c->homeroom_teacher_id, 'teacher' => $c->homeroomTeacher?->name,
                'students' => $c->enrollments->map(fn ($e) => $e->student->only('id', 'name', 'nis'))->sortBy('name')->values()->all(),
            ])->all(),
            'teachers' => Teacher::whereHas('user', fn ($q) => $q->where('is_active', true))->orderBy('name')->get(['id', 'name'])->toArray(),
        ]);
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
