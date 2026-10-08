<?php

namespace App\Services;

use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;

class ParentStudentContext
{
    public function students(User $user)
    {
        return $user->guardian?->students()
            ->where('students.status', 'aktif')
            ->with(['enrollments' => fn ($query) => $query
                ->where('status', 'aktif')
                ->whereHas('academicYear', fn ($year) => $year->where('is_active', true))
                ->with('classroom')])
            ->orderBy('students.name')
            ->get() ?? collect();
    }

    public function resolve(Request $request): ?Student
    {
        $students = $this->students($request->user());
        $requested = $request->integer('student_id');

        if ($requested && ! $students->contains('id', $requested)) {
            abort(403);
        }

        $id = $requested ?: $request->session()->get('active_student_id');
        $student = $students->firstWhere('id', $id) ?: $students->first();

        if ($student) {
            $request->session()->put('active_student_id', $student->id);
        }

        return $student;
    }
}
