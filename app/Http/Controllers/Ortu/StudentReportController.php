<?php

namespace App\Http\Controllers\Ortu;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Student;
use App\Services\ParentStudentContext;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class StudentReportController extends Controller
{
    public function pdf(Request $request, Student $student, ParentStudentContext $context, ReportService $reports)
    {
        abort_unless($context->students($request->user())->contains('id', $student->id), 403);
        $year = AcademicYear::where('is_active', true)->firstOrFail();
        $period = $request->input('period', 'semester_1');

        return Pdf::loadView('exports.student-report', [
            'report' => $reports->studentReport($student, $year, $period),
        ])->setPaper('a4')->download('rapor-'.$student->nis.'.pdf');
    }
}
