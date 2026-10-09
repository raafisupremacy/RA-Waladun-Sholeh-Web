<?php

namespace App\Http\Controllers\Kepsek;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Student;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentReportController extends Controller
{
    public function index(Request $request, ReportService $reports)
    {
        $year = AcademicYear::find($request->integer('academic_year_id')) ?? AcademicYear::where('is_active', true)->first();
        if (! $year) {
            $year = AcademicYear::latest('start_date')->first();
        }

        $academicYears = AcademicYear::latest('start_date')->get(['id', 'name']);
        $classrooms = Classroom::when($year, fn ($q) => $q->where('academic_year_id', $year->id))->orderBy('name')->get(['id', 'name']);

        $classroomId = $request->integer('classroom_id') ?: $classrooms->first()?->id;

        $students = Student::where('status', 'aktif')
            ->when($classroomId, fn ($q) => $q->whereHas('enrollments', fn ($e) => $e->where('classroom_id', $classroomId)))
            ->orderBy('name')
            ->get(['id', 'name', 'nis']);

        $studentId = $request->integer('student_id') ?: $students->first()?->id;
        $student = $studentId ? Student::find($studentId) : null;
        $period = $request->input('period', 'semester_1');

        $report = ($student && $year) ? $reports->studentReport($student, $year, $period) : null;

        return Inertia::render('Kepsek/StudentReport', [
            'academicYears' => $academicYears,
            'academicYearId' => $year?->id,
            'classrooms' => $classrooms,
            'classroomId' => $classroomId,
            'students' => $students,
            'studentId' => $studentId,
            'period' => $period,
            'report' => $report,
        ]);
    }

    public function pdf(Request $request, ReportService $reports)
    {
        $year = AcademicYear::find($request->integer('academic_year_id')) ?? AcademicYear::where('is_active', true)->firstOrFail();
        $student = Student::findOrFail($request->integer('student_id'));
        $period = $request->input('period', 'semester_1');

        return Pdf::loadView('exports.student-report', [
            'report' => $reports->studentReport($student, $year, $period),
        ])->setPaper('a4')->download('rapor-'.$student->nis.'.pdf');
    }
}
