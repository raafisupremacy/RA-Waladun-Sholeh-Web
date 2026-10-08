<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Teacher;
use App\Services\AccountProvisioningService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Teacher::class);
        $query = Teacher::with(['user', 'classrooms' => fn ($q) => $q->whereHas('academicYear', fn ($y) => $y->where('is_active', true))]);
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('nip', 'like', "%{$search}%")
                ->orWhereHas('classrooms', fn ($c) => $c->where('name', 'like', "%{$search}%"))
            );
        }

        $activeYear = Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))->first()?->academicYear;

        return Inertia::render('Admin/Teachers', [
            'teachers' => $query->orderBy('name')->paginate(12)->withQueryString()->through(fn ($t) => [
                'id' => $t->id, 'name' => $t->name, 'nip' => $t->nip, 'phone' => $t->phone,
                'email' => $t->user->email, 'is_active' => $t->user->is_active, 'classroom' => $t->classrooms->first()?->name,
                'account_status' => ! $t->user->is_active ? 'nonaktif' : ($t->user->must_change_password ? 'belum_masuk' : 'aktif'),
            ]),
            'classrooms' => Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))->orderBy('name')->get(['id', 'name'])->toArray(),
            'filters' => $request->only('search'),
            'academicYear' => $activeYear?->name,
        ]);
    }

    public function reset(Request $r, Teacher $teacher, AccountProvisioningService $service)
    {
        $this->authorize('update', $teacher);
        $service->resetPassword($teacher->user, $r->user());

        return back();
    }
}
