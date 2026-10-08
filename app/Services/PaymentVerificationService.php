<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\AuditLog;
use App\Models\CashLedgerEntry;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentVerificationService
{
    public function submitProof(Invoice $invoice, User $guardian, UploadedFile $file, array $data = []): Payment
    {
        if (! $guardian->hasRole('orang_tua') || ! $guardian->guardian?->students()->whereKey($invoice->student_id)->exists()) {
            abort(403);
        }

        return DB::transaction(function () use ($invoice, $guardian, $file, $data) {
            $lockedInvoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
            if (! in_array($lockedInvoice->status, [InvoiceStatus::Unpaid, InvoiceStatus::Rejected], true)) {
                throw ValidationException::withMessages(['invoice' => 'Tagihan tidak dapat menerima bukti.']);
            }
            if ($lockedInvoice->payments()->where('status', PaymentStatus::Pending->value)->exists()) {
                throw ValidationException::withMessages(['invoice' => 'Bukti pembayaran sedang menunggu verifikasi.']);
            }

            $path = $file->store('payments', 'private');
            $payment = Payment::create([
                'invoice_id' => $lockedInvoice->id,
                'submitted_by' => $guardian->id,
                'proof_path' => $path,
                'amount_transferred' => $data['amount_transferred'] ?? $lockedInvoice->net_amount,
                'transfer_date' => $data['transfer_date'] ?? now()->toDateString(),
                'sender_name' => $data['sender_name'] ?? $guardian->name,
                'note' => $data['note'] ?? null,
                'status' => PaymentStatus::Pending,
            ]);
            $lockedInvoice->update(['status' => InvoiceStatus::Pending]);
            AuditLog::create(['user_id' => $guardian->id, 'action' => 'payment_submitted', 'entity_type' => 'Payment', 'entity_id' => $payment->id, 'new_values' => ['status' => PaymentStatus::Pending->value]]);
            AuditLog::create(['user_id' => $guardian->id, 'action' => 'invoice_status_changed', 'entity_type' => 'Invoice', 'entity_id' => $lockedInvoice->id, 'new_values' => ['status' => InvoiceStatus::Pending->value]]);

            return $payment->fresh();
        });
    }

    public function approve(Payment $payment, User $admin): Payment
    {
        if (! $admin->hasRole('admin')) {
            abort(403);
        }

        $now = now();
        $lockKey = sprintf('receipt-%04d-%02d', $now->year, $now->month);

        try {
            return Cache::lock($lockKey, 15)->block(10, function () use ($payment, $admin, $now) {
                $attempts = 0;
                $maxAttempts = 3;

                while ($attempts < $maxAttempts) {
                    $attempts++;
                    try {
                        return DB::transaction(function () use ($payment, $admin, $now) {
                            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
                            $invoice = Invoice::query()->lockForUpdate()->findOrFail($lockedPayment->invoice_id);

                            if ($lockedPayment->status !== PaymentStatus::Pending || $invoice->status !== InvoiceStatus::Pending) {
                                throw ValidationException::withMessages(['payment' => 'Pembayaran tidak dapat disetujui.']);
                            }

                            $seq = $this->nextReceiptSequence($now);
                            $receiptNumber = sprintf('KWT/%04d/%02d/%03d', $now->year, $now->month, $seq);

                            $lockedPayment->update(['status' => PaymentStatus::Approved, 'reviewed_by' => $admin->id, 'reviewed_at' => $now]);
                            $invoice->update(['status' => InvoiceStatus::Paid, 'paid_at' => $now, 'verified_by' => $admin->id, 'verified_at' => $now]);
                            CashLedgerEntry::create([
                                'invoice_id' => $invoice->id,
                                'payment_id' => $lockedPayment->id,
                                'entry_date' => $now->toDateString(),
                                'description' => 'Pembayaran SPP '.$invoice->student->name,
                                'amount_in' => $invoice->net_amount,
                                'receipt_number' => $receiptNumber,
                            ]);
                            AuditLog::create([
                                'user_id' => $admin->id,
                                'action' => 'payment_approved',
                                'entity_type' => 'Invoice',
                                'entity_id' => $invoice->id,
                                'new_values' => ['status' => 'lunas', 'receipt_number' => $receiptNumber],
                            ]);

                            return $lockedPayment->fresh();
                        });
                    } catch (QueryException $e) {
                        if ($this->isDuplicateKeyException($e) && $attempts < $maxAttempts) {
                            continue;
                        }
                        throw new \RuntimeException("Gagal menerbitkan kuitansi setelah {$attempts} kali percobaan: ".$e->getMessage(), 0, $e);
                    }
                }

                throw new \RuntimeException('Gagal menerbitkan kuitansi setelah 3 kali percobaan.');
            });
        } catch (LockTimeoutException $e) {
            throw new \RuntimeException("Gagal memperoleh kunci pencatatan kuitansi untuk periode {$now->format('Y-m')}. Proses verifikasi lain sedang berjalan.", 0, $e);
        }
    }

    public function reject(Payment $payment, User $admin, string $reason): Payment
    {
        return DB::transaction(function () use ($payment, $admin, $reason) {
            if (! $admin->hasRole('admin')) {
                abort(403);
            }
            if (blank(trim($reason))) {
                throw ValidationException::withMessages(['reason' => 'Alasan penolakan wajib diisi.']);
            }
            $lockedPayment = Payment::query()->findOrFail($payment->id);
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($lockedPayment->invoice_id);
            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($lockedPayment->status !== PaymentStatus::Pending || $invoice->status !== InvoiceStatus::Pending) {
                throw ValidationException::withMessages(['payment' => 'Pembayaran tidak dapat ditolak.']);
            }
            $lockedPayment->update(['status' => PaymentStatus::Rejected, 'reviewed_by' => $admin->id, 'reviewed_at' => now(), 'rejection_reason' => trim($reason)]);
            $invoice->update(['status' => InvoiceStatus::Rejected]);
            AuditLog::create(['user_id' => $admin->id, 'action' => 'payment_rejected', 'entity_type' => 'Invoice', 'entity_id' => $invoice->id, 'new_values' => ['status' => 'ditolak', 'reason' => trim($reason)]]);

            return $lockedPayment->fresh();
        });
    }

    private function nextReceiptSequence($date): int
    {
        $receipts = CashLedgerEntry::whereYear('entry_date', $date->year)
            ->whereMonth('entry_date', $date->month)
            ->pluck('receipt_number');

        $max = 0;
        foreach ($receipts as $num) {
            if (preg_match('/^KWT\/\d{4}\/\d{2}\/(\d+)$/', (string) $num, $matches)) {
                $val = (int) $matches[1];
                if ($val > $max) {
                    $max = $val;
                }
            }
        }

        return $max + 1;
    }

    private function isDuplicateKeyException(QueryException $e): bool
    {
        return $e->getCode() === '23000'
            || str_contains($e->getMessage(), 'UNIQUE')
            || str_contains($e->getMessage(), 'Duplicate entry');
    }
}
