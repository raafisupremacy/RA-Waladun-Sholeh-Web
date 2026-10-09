<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Teacher;
use App\Services\AccountProvisioningService;
use App\Services\MasterDataService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Teacher::class);
        $query = Teacher::with([
            'user',
            'classrooms' => fn ($q) => $q->whereHas('academicYear', fn ($y) => $y->where('is_active', true)),
        ]);
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('nip', 'like', "%{$search}%")
                ->orWhereHas('classrooms', fn ($c) => $c->where('name', 'like', "%{$search}%"))
            );
        }

        $activeYear = Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))->first()?->academicYear;

        $classrooms = Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->withCount('teachers')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'teachers_count' => $c->teachers_count,
                'max_teachers' => 3,
                'is_full' => $c->teachers_count >= 3,
            ])
            ->toArray();

        return Inertia::render('Admin/Teachers', [
            'teachers' => $query->orderBy('name')->paginate(12)->withQueryString()->through(function ($t) {
                $assignedClass = $t->classrooms->first();
                $role = $assignedClass?->pivot?->role ?? ($assignedClass && $assignedClass->homeroom_teacher_id === $t->id ? 'wali_kelas' : 'pendamping');

                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'nip' => $t->nip,
                    'phone' => $t->phone,
                    'email' => $t->user->email,
                    'is_active' => $t->user->is_active,
                    'classroom' => $assignedClass?->name,
                    'classroom_id' => $assignedClass?->id,
                    'classroom_role' => $role,
                    'account_status' => ! $t->user->is_active ? 'nonaktif' : ($t->user->must_change_password ? 'belum_masuk' : 'aktif'),
                ];
            }),
            'classrooms' => $classrooms,
            'filters' => $request->only('search'),
            'academicYear' => $activeYear?->name,
        ]);
    }

    public function assignClass(Request $request, Teacher $teacher, MasterDataService $service)
    {
        $this->authorize('update', $teacher);

        $data = $request->validate([
            'classroom_id' => 'nullable|exists:classrooms,id',
            'role' => 'nullable|string|in:wali_kelas,pendamping',
        ]);

        $classroom = ! empty($data['classroom_id']) ? Classroom::findOrFail($data['classroom_id']) : null;
        $role = $data['role'] ?? 'pendamping';

        $service->assignTeacherClassroom($teacher, $classroom, $request->user(), $role);

        $message = $classroom
            ? "Penugasan kelas untuk {$teacher->name} berhasil disimpan."
            : "Penugasan kelas untuk {$teacher->name} berhasil dilepas.";

        return back()->with('success', $message);
    }

    public function reset(Request $r, Teacher $teacher, AccountProvisioningService $service)
    {
        $this->authorize('update', $teacher);
        $service->resetPassword($teacher->user, $r->user());

        return back();
    }
}
