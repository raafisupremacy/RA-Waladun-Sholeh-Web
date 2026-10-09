<?php

namespace App\Http\Controllers\Ortu;

use App\Http\Controllers\Controller;
use App\Services\ParentStudentContext;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index(Request $request, ParentStudentContext $context)
    {
        $guardian = $request->user()->guardian;

        return Inertia::render('Ortu/Profile', [
            'guardian' => ['name' => $guardian?->name ?? $request->user()->name, 'email' => $request->user()->email, 'phone' => $guardian?->phone],
            'students' => $context->students($request->user())->map(fn ($student) => ['id' => $student->id, 'name' => $student->name, 'nis' => $student->nis, 'classroom' => $student->enrollments->first()?->classroom?->name, 'status' => $student->status->value])->values(),
        ]);
    }
}
