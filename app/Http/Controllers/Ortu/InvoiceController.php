<?php

namespace App\Http\Controllers\Ortu;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Invoice;
use App\Services\ParentStudentContext;
use App\Services\PaymentVerificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $r, ParentStudentContext $context)
    {
        $r->validate(['academic_year_id' => 'nullable|integer|exists:academic_years,id', 'student_id' => 'nullable|integer']);
        $students = $context->students($r->user());
        $student = $context->resolve($r);
        $years = AcademicYear::query()->orderByDesc('is_active')->orderByDesc('start_date')->get(['id', 'name', 'is_active']);
        $yearId = $r->integer('academic_year_id') ?: $years->firstWhere('is_active', true)?->id;
        $query = Invoice::with('student.enrollments.classroom', 'payments')->where('student_id', $student?->id ?? 0);
        if ($yearId) {
            $query->where('academic_year_id', $yearId);
        }
        $unpaidCount = (clone $query)->whereIn('status', ['belum_bayar', 'menunggu_verifikasi', 'ditolak'])->count();
        $invoices = $query->orderByDesc('period_year')->orderByDesc('period_month')->paginate(20)->withQueryString()->through(fn (Invoice $invoice) => $this->summary($invoice));

        return Inertia::render('Ortu/Invoices', [
            'invoices' => $invoices,
            'students' => $students->map(fn ($item) => $this->studentSummary($item))->values(),
            'activeStudentId' => $student?->id,
            'academicYears' => $years,
            'selectedAcademicYearId' => $yearId,
            'unpaidCount' => $unpaidCount,
        ]);
    }

    public function show(Invoice $invoice, Request $r)
    {
        $this->authorize('view', $invoice);

        $invoice->load('student.enrollments.classroom.academicYear', 'payments', 'cashLedgerEntry', 'verifier');
        $latestPayment = $invoice->payments->sortByDesc('id')->first();

        return Inertia::render('Ortu/InvoiceDetail', ['invoice' => array_merge($this->summary($invoice), [
            'student' => $this->studentSummary($invoice->student),
            'payments' => $invoice->payments->map(fn ($payment) => [
                'status' => $payment->status?->value,
                'amount_transferred' => $payment->amount_transferred,
                'transfer_date' => $payment->transfer_date?->toDateString(),
                'sender_name' => $payment->sender_name,
                'rejection_reason' => $payment->rejection_reason,
                'submitted_at' => $payment->created_at?->toISOString(),
                'proof_url' => $payment->proof_path ? route('ortu.payments.proof', $payment) : null,
            ])->values()->all(),
            'latest_payment' => $latestPayment ? [
                'status' => $latestPayment->status?->value,
                'submitted_at' => $latestPayment->created_at?->toISOString(),
                'transfer_date' => $latestPayment->transfer_date?->toDateString(),
                'rejection_reason' => $latestPayment->rejection_reason,
                'reviewed_at' => $latestPayment->reviewed_at?->toISOString(),
                'proof_type' => strtolower(pathinfo($latestPayment->proof_path, PATHINFO_EXTENSION)) === 'pdf' ? 'pdf' : 'image',
                'proof_url' => $latestPayment->proof_path ? route('ortu.payments.proof', $latestPayment) : null,
            ] : null,
            'verifier_name' => $invoice->verifier?->name,
            'cash_ledger_entry' => $invoice->cashLedgerEntry ? [
                'receipt_number' => $invoice->cashLedgerEntry->receipt_number,
                'entry_date' => $invoice->cashLedgerEntry->entry_date?->toDateString(),
                'amount_in' => $invoice->cashLedgerEntry->amount_in,
            ] : null,
        ])]);
    }

    public function upload(Invoice $invoice, Request $request, PaymentVerificationService $service)
    {
        $this->authorize('uploadProof', $invoice);
        $data = $request->validate([
            'proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'amount_transferred' => 'nullable|integer|min:0',
            'transfer_date' => 'nullable|date',
            'sender_name' => 'nullable|string|max:150',
            'note' => 'nullable|string|max:2000',
        ]);
        $service->submitProof($invoice, $request->user(), $data['proof'], $data);

        return back();
    }

    private function summary(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'student' => $invoice->student ? ['id' => $invoice->student->id, 'name' => $invoice->student->name, 'nis' => $invoice->student->nis] : null,
            'period_month' => $invoice->period_month,
            'period_year' => $invoice->period_year,
            'amount' => $invoice->amount,
            'discount_amount' => $invoice->discount_amount,
            'net_amount' => $invoice->net_amount,
            'due_date' => $invoice->due_date?->toDateString(),
            'status' => $invoice->status?->value,
            'paid_at' => $invoice->paid_at?->toISOString(),
            'verified_at' => $invoice->verified_at?->toISOString(),
            'rejection_reason' => $invoice->status?->value === 'ditolak' ? $invoice->payments->sortByDesc('id')->first()?->rejection_reason : null,
        ];
    }

    private function studentSummary($student): array
    {
        $enrollment = $student?->enrollments->first(fn ($item) => $item->status?->value === 'aktif' || $item->status === 'aktif');

        return [
            'id' => $student->id,
            'name' => $student->name,
            'nis' => $student->nis,
            'classroom' => $enrollment?->classroom?->name,
        ];
    }
}
