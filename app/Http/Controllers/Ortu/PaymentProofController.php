<?php

namespace App\Http\Controllers\Ortu;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentProofController extends Controller
{
    public function download(Payment $payment, Request $request)
    {
        $this->authorize('view', $payment->invoice);
        abort_unless($payment->invoice->student->guardians()->where('user_id', $request->user()->id)->exists(), 403);

        abort_unless(Storage::disk('private')->exists($payment->proof_path), 404);

        if ($request->boolean('preview')) {
            return Storage::disk('private')->response($payment->proof_path, null, ['X-Content-Type-Options' => 'nosniff']);
        }

        return Storage::disk('private')->download($payment->proof_path);
    }
}
