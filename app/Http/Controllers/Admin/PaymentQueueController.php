<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentReviewRequest;
use App\Models\Payment;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PaymentQueueController extends Controller
{
    public function index(PaymentReviewRequest $request)
    {
        $this->authorize('viewAny', Payment::class);
        $query = Payment::with('invoice.student')->where('status', 'menunggu')->orderBy('created_at')->orderBy('id');
        $payments = (clone $query)->paginate(10)->withQueryString();
        $selected = $request->filled('payment')
            ? (clone $query)->whereKey($request->integer('payment'))->first()
            : $payments->first();
        $detail = null;
        if ($selected) {
            $this->authorize('view', $selected);
            $selected->load('submitter', 'invoice.student.enrollments.classroom');
            $invoice = $selected->invoice;
            $detail = $this->summary($selected) + [
                'invoice_number' => $invoice->invoice_number, 'nis' => $invoice->student->nis,
                'classroom' => $invoice->student->enrollments->firstWhere('academic_year_id', $invoice->academic_year_id)?->classroom?->name,
                'guardian' => $selected->submitter->name, 'amount_transferred' => (int) $selected->amount_transferred,
                'transfer_date' => $selected->transfer_date->toDateString(), 'sender_name' => $selected->sender_name,
                'note' => $selected->note, 'proof_url' => route('admin.payments.proof', $selected),
                'proof_type' => strtolower(pathinfo($selected->proof_path, PATHINFO_EXTENSION)) === 'pdf' ? 'pdf' : 'image',
            ];
        }

        return Inertia::render('Admin/PaymentVerification', ['payments' => $payments->through(fn ($payment) => $this->summary($payment)), 'selected' => $detail, 'detailOpen' => $request->filled('payment')]);
    }

    private function summary(Payment $payment): array
    {
        return ['id' => $payment->id, 'student' => $payment->invoice->student->name,
            'month' => $payment->invoice->period_month, 'year' => $payment->invoice->period_year,
            'invoice_amount' => $payment->invoice->net_amount, 'submitted_at' => $payment->created_at->locale('id')->diffForHumans()];
    }

    public function proof(Payment $payment)
    {
        $this->authorize('view', $payment);
        $disk = Storage::disk('private');
        abort_unless($disk->exists($payment->proof_path), 404, 'Bukti pembayaran belum tersedia.');

        return $disk->response($payment->proof_path, 'bukti-pembayaran.'.pathinfo($payment->proof_path, PATHINFO_EXTENSION), ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
