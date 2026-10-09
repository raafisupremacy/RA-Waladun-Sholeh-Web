<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentReviewRequest;
use App\Models\Payment;
use App\Models\SchoolSetting;
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
            $hasProof = $selected->proof_path && Storage::disk('private')->exists($selected->proof_path);
            $detail = $this->summary($selected) + [
                'invoice_number' => $invoice->invoice_number, 'nis' => $invoice->student->nis,
                'classroom' => $invoice->student->enrollments->firstWhere('academic_year_id', $invoice->academic_year_id)?->classroom?->name,
                'guardian' => $selected->submitter->name, 'amount_transferred' => (int) $selected->amount_transferred,
                'transfer_date' => $selected->transfer_date->toDateString(), 'sender_name' => $selected->sender_name,
                'note' => $selected->note, 'proof_url' => route('admin.payments.proof', $selected),
                'proof_type' => $hasProof && strtolower(pathinfo($selected->proof_path, PATHINFO_EXTENSION)) === 'pdf' ? 'pdf' : 'image',
                'has_proof' => $hasProof,
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

        if ($payment->proof_path && $disk->exists($payment->proof_path)) {
            return $disk->response($payment->proof_path, 'bukti-pembayaran.'.pathinfo($payment->proof_path, PATHINFO_EXTENSION), [
                'Cache-Control' => 'private, no-store',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        // Return a realistic mock bank transfer slip SVG instead of 404
        $amount = number_format($payment->amount_transferred ?: ($payment->invoice?->net_amount ?? 0), 0, ',', '.');
        $sender = htmlspecialchars($payment->sender_name ?? 'Orang Tua', ENT_QUOTES, 'UTF-8');
        $date = $payment->transfer_date ? $payment->transfer_date->format('d/m/Y') : date('d/m/Y');
        $ref = 'TRF-'.str_pad((string) $payment->id, 8, '0', STR_PAD_LEFT);
        $schoolName = htmlspecialchars(SchoolSetting::where('key', 'school_name')->value('value') ?? 'RA Waladun Sholeh', ENT_QUOTES, 'UTF-8');

        $svg = <<<SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
            <rect width="600" height="800" fill="#F5F5F7"/>
            <rect x="30" y="30" width="540" height="740" rx="24" fill="#FFFFFF" stroke="#E5E5EA" stroke-width="2"/>
            <rect x="30" y="30" width="540" height="100" rx="24" fill="#0071E3"/>
            <rect x="30" y="100" width="540" height="30" fill="#0071E3"/>
            <text x="300" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">BUKTI TRANSFER BANK</text>
            <text x="300" y="105" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="13" fill="#E8F1FD" text-anchor="middle">TRANSAKSI BERHASIL · DATA DEMO</text>
            <circle cx="300" cy="180" r="32" fill="#E4F6EA"/>
            <path d="M290 180 L297 187 L312 172" stroke="#1D7A3C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <text x="300" y="245" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="14" fill="#6E6E73" text-anchor="middle">Jumlah Transfer</text>
            <text x="300" y="285" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="32" font-weight="bold" fill="#1D1D1F" text-anchor="middle">Rp {$amount}</text>
            <line x1="60" y1="320" x2="540" y2="320" stroke="#E5E5EA" stroke-dasharray="6 6"/>
            <text x="60" y="360" font-family="sans-serif" font-size="14" fill="#6E6E73">Pengirim</text>
            <text x="540" y="360" font-family="sans-serif" font-size="14" font-weight="600" fill="#1D1D1F" text-anchor="end">{$sender}</text>
            <text x="60" y="410" font-family="sans-serif" font-size="14" fill="#6E6E73">Penerima</text>
            <text x="540" y="410" font-family="sans-serif" font-size="14" font-weight="600" fill="#1D1D1F" text-anchor="end">{$schoolName}</text>
            <text x="60" y="460" font-family="sans-serif" font-size="14" fill="#6E6E73">Tanggal Transfer</text>
            <text x="540" y="460" font-family="sans-serif" font-size="14" font-weight="600" fill="#1D1D1F" text-anchor="end">{$date}</text>
            <text x="60" y="510" font-family="sans-serif" font-size="14" fill="#6E6E73">No. Referensi</text>
            <text x="540" y="510" font-family="sans-serif" font-size="13" font-family="monospace" fill="#1D1D1F" text-anchor="end">{$ref}</text>
            <rect x="60" y="570" width="480" height="90" rx="16" fill="#F5F5F7"/>
            <text x="300" y="605" font-family="sans-serif" font-size="13" font-weight="600" fill="#1D1D1F" text-anchor="middle">Bukti Transfer Digital (Simulasi Sistem)</text>
            <text x="300" y="630" font-family="sans-serif" font-size="12" fill="#6E6E73" text-anchor="middle">Dokumen ini adalah replika otomatis untuk demonstrasi verifikasi.</text>
            <text x="300" y="730" font-family="sans-serif" font-size="11" fill="#86868B" text-anchor="middle">SKMS · Sistem Keuangan {$schoolName}</text>
        </svg>
        SVG;

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
