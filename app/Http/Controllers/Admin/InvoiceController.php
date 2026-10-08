<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\InvoiceRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(InvoiceRequest $request)
    {
        $this->authorize('viewAny', Invoice::class);
        $filters = $request->validated();
        $query = Invoice::with('student.enrollments.classroom');
        foreach (['month' => 'period_month', 'year' => 'period_year', 'status' => 'status', 'academic_year_id' => 'academic_year_id'] as $key => $column) {
            $query->when($filters[$key] ?? null, fn ($q, $value) => $q->where($column, $value));
        }
        $query->when($filters['classroom_id'] ?? null, fn ($q, $id) => $q->whereHas('student.enrollments', fn ($enrollment) => $enrollment->where('classroom_id', $id)->whereColumn('enrollments.academic_year_id', 'invoices.academic_year_id')));

        return Inertia::render('Admin/Invoices', [
            'invoices' => $query->orderByDesc('period_year')->orderByDesc('period_month')->orderBy('id')->paginate(10)->withQueryString()->through(fn ($invoice) => [
                'id' => $invoice->id, 'invoice_number' => $invoice->invoice_number,
                'student' => $invoice->student->name, 'nis' => $invoice->student->nis,
                'classroom' => $invoice->student->enrollments->firstWhere('academic_year_id', $invoice->academic_year_id)?->classroom?->name,
                'month' => $invoice->period_month, 'year' => $invoice->period_year,
                'amount' => (int) $invoice->amount, 'discount_amount' => (int) $invoice->discount_amount,
                'net_amount' => $invoice->net_amount, 'due_date' => $invoice->due_date->toDateString(), 'status' => $invoice->status->value,
                'overdue_days' => $invoice->status->value !== 'lunas' ? max(0, (int) $invoice->due_date->diffInDays(today(), false)) : 0,
            ]),
            'academicYears' => AcademicYear::orderByDesc('start_date')->get()->map->only(['id', 'name', 'is_active']),
            'classrooms' => Classroom::orderBy('name')->get(['id', 'name', 'academic_year_id'])->toArray(),
            'filters' => $filters, 'currentPeriod' => ['month' => now()->month, 'year' => now()->year],
        ]);
    }

    public function preview(InvoiceRequest $request, InvoiceService $service)
    {
        $this->authorize('create', Invoice::class);
        $data = $request->validated();

        return response()->json($service->preview($data['month'], $data['year'], $data['academic_year_id']));
    }

    public function generate(InvoiceRequest $request, InvoiceService $service)
    {
        $this->authorize('create', Invoice::class);
        $data = $request->validated();
        $result = $service->generate($data['month'], $data['year'], $data['academic_year_id'], $data['amount'] ?? null, $data['due_date'] ?? null, $request->user());

        return back()->with('success', $result['created'].' tagihan dibuat, '.$result['skipped'].' siswa dilewati.');
    }

    public function update(InvoiceRequest $request, Invoice $invoice, InvoiceService $service)
    {
        $this->authorize('update', $invoice);
        $service->updateAmount($invoice, $invoice->amount, $invoice->amount - $request->validated('net_amount'), $request->user());

        return back()->with('success', 'Nominal tagihan diperbarui.');
    }
}
