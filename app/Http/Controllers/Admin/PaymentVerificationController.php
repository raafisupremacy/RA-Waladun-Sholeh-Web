<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentReviewRequest;
use App\Models\Payment;
use App\Services\PaymentVerificationService;

class PaymentVerificationController extends Controller
{
    public function approve(Payment $payment, PaymentReviewRequest $r, PaymentVerificationService $s)
    {
        $this->authorize('approve', $payment);
        $s->approve($payment, $r->user());

        return redirect()->route('admin.payments.index')->with('success', 'Verifikasi pembayaran disimpan.');
    }

    public function reject(Payment $payment, PaymentReviewRequest $r, PaymentVerificationService $s)
    {
        $this->authorize('reject', $payment);
        $s->reject($payment, $r->user(), $r->validated('rejection_reason'));

        return redirect()->route('admin.payments.index')->with('success', 'Verifikasi pembayaran disimpan.');
    }
}
