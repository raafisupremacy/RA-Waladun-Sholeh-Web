<?php

namespace App\Http\Controllers\Kepsek;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Inertia\Inertia;

class StudentController extends Controller
{
    public function show(Student $student)
    {
        $this->authorize('view', $student);
        $student->load(['guardians.user', 'enrollments.classroom.academicYear', 'invoices']);

        return Inertia::render('Kepsek/StudentShow', [
            'student' => [
                'id' => $student->id, 'name' => $student->name, 'nis' => $student->nis,
                'birth_date' => $student->birth_date?->toDateString(), 'gender' => $student->gender?->value, 'status' => $student->status?->value,
                'guardians' => $student->guardians->map(fn ($guardian) => ['name' => $guardian->name, 'phone' => $guardian->phone, 'email' => $guardian->user?->email, 'relationship' => $guardian->pivot?->relationship])->values(),
                'enrollments' => $student->enrollments->map(fn ($enrollment) => ['id' => $enrollment->id, 'classroom' => $enrollment->classroom?->display_name, 'academic_year' => $enrollment->academicYear?->name, 'status' => $enrollment->status?->value])->values(),
                'invoices' => $student->invoices->sortByDesc(fn ($invoice) => [$invoice->period_year, $invoice->period_month])->map(fn ($invoice) => ['id' => $invoice->id, 'invoice_number' => $invoice->invoice_number, 'period_month' => $invoice->period_month, 'period_year' => $invoice->period_year, 'amount' => $invoice->net_amount, 'status' => $invoice->status?->value])->values(),
            ],
        ]);
    }
}
