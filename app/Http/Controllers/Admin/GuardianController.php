<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Guardian;
use App\Services\AccountProvisioningService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GuardianController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Guardian::class);
        $activeYearId = AcademicYear::where('is_active', true)->value('id');
        $query = Guardian::with([
            'user',
            'students.enrollments' => fn ($q) => $q->where('academic_year_id', $activeYearId)->with('classroom'),
        ]);

        if ($request->status === 'aktif') {
            $query->whereHas('user', fn ($q) => $q->where('is_active', true)->where('must_change_password', false));
        } elseif ($request->status === 'belum_masuk') {
            $query->whereHas('user', fn ($q) => $q->where('is_active', true)->where('must_change_password', true));
        } elseif ($request->status === 'nonaktif') {
            $query->whereHas('user', fn ($q) => $q->where('is_active', false));
        }

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$search}%"))
                ->orWhereHas('students', fn ($s) => $s->where('name', 'like', "%{$search}%"))
            );
        }

        $activeYear = AcademicYear::where('is_active', true)->first();

        return Inertia::render('Admin/Guardians', [
            'guardians' => $query->orderBy('name')->paginate(12)->withQueryString()->through(fn ($g) => [
                'id' => $g->id, 'name' => $g->name, 'phone' => $g->phone,
                'email' => $g->user->email, 'is_active' => $g->user->is_active,
                'account_status' => ! $g->user->is_active ? 'nonaktif' : ($g->user->must_change_password ? 'belum_masuk' : 'aktif'),
                'students' => $g->students->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'classroom' => $s->enrollments->first()?->classroom?->name,
                ])->all(),
            ]),
            'filters' => $request->only('status', 'search'),
            'academicYear' => $activeYear?->name,
        ]);
    }

    public function reset(Request $r, Guardian $guardian, AccountProvisioningService $service)
    {
        $this->authorize('update', $guardian);
        $service->resetPassword($guardian->user, $r->user());

        return back();
    }
}
