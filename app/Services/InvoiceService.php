<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InvoiceService
{
    private function eligibleStudents(int $academicYearId)
    {
        return Student::where('status', 'aktif')->whereHas('enrollments', fn ($q) => $q->where('academic_year_id', $academicYearId)->where('status', 'aktif'));
    }

    public function preview(int $month, int $year, int $academicYearId): array
    {
        $students = $this->eligibleStudents($academicYearId);
        $total = (clone $students)->count();
        $skipped = $students->whereHas('invoices', fn ($q) => $q->where('period_month', $month)->where('period_year', $year))->count();

        return ['created' => $total - $skipped, 'skipped' => $skipped];
    }

    public function generate(int $month, int $year, int $academicYearId, ?int $amount = null, ?string $dueDate = null, ?User $actor = null): array
    {
        $amount ??= (int) SchoolSetting::where('key', 'default_spp_amount')->value('value');
        $students = $this->eligibleStudents($academicYearId)->get();
        $lockKey = sprintf('invoice-generate-%04d-%02d', $year, $month);

        try {
            return Cache::lock($lockKey, 15)->block(10, function () use ($students, $month, $year, $academicYearId, $amount, $dueDate, $actor) {
                $attempts = 0;
                $maxAttempts = 3;

                while ($attempts < $maxAttempts) {
                    $attempts++;
                    try {
                        return DB::transaction(function () use ($students, $month, $year, $academicYearId, $amount, $dueDate, $actor) {
                            $created = 0;
                            $skipped = 0;
                            $seq = $this->nextSequenceNumber($year, $month);

                            foreach ($students as $student) {
                                if (Invoice::where(['student_id' => $student->id, 'period_month' => $month, 'period_year' => $year])->exists()) {
                                    $skipped++;

                                    continue;
                                }

                                Invoice::create([
                                    'invoice_number' => sprintf('INV-%04d-%02d-%03d', $year, $month, $seq++),
                                    'student_id' => $student->id,
                                    'academic_year_id' => $academicYearId,
                                    'period_month' => $month,
                                    'period_year' => $year,
                                    'amount' => $amount,
                                    'discount_amount' => 0,
                                    'due_date' => $dueDate ? Carbon::parse($dueDate)->toDateString() : sprintf('%04d-%02d-10', $year, $month),
                                    'status' => InvoiceStatus::Unpaid,
                                ]);
                                $created++;
                            }

                            if ($actor && $created > 0) {
                                AuditLog::create([
                                    'user_id' => $actor->id,
                                    'action' => 'invoices_generated',
                                    'entity_type' => 'AcademicYear',
                                    'entity_id' => $academicYearId,
                                    'new_values' => compact('month', 'year', 'amount', 'created', 'skipped'),
                                ]);
                            }

                            return compact('created', 'skipped');
                        });
                    } catch (QueryException $e) {
                        if ($this->isDuplicateKeyException($e) && $attempts < $maxAttempts) {
                            continue;
                        }
                        throw new RuntimeException("Gagal membuat tagihan untuk periode {$month}/{$year} setelah {$attempts} kali percobaan: ".$e->getMessage(), 0, $e);
                    }
                }

                throw new RuntimeException("Gagal membuat tagihan untuk periode {$month}/{$year} setelah 3 kali percobaan.");
            });
        } catch (LockTimeoutException $e) {
            throw new RuntimeException("Gagal memperoleh kunci pembuatan tagihan untuk periode {$month}/{$year}. Proses lain sedang berjalan.", 0, $e);
        }
    }

    private function nextSequenceNumber(int $year, int $month): int
    {
        $numbers = Invoice::where('period_year', $year)
            ->where('period_month', $month)
            ->pluck('invoice_number');

        $max = 0;
        foreach ($numbers as $num) {
            if (preg_match('/^INV-\d{4}-\d{2}-(\d+)$/', (string) $num, $matches)) {
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

    public function updateAmount(Invoice $invoice, int $amount, int $discount = 0, ?User $actor = null): Invoice
    {
        return DB::transaction(function () use ($invoice, $amount, $discount, $actor) {
            $invoice = Invoice::lockForUpdate()->findOrFail($invoice->id);
            abort_if($invoice->status === InvoiceStatus::Paid, 422, 'Tagihan lunas tidak dapat diubah.');
            abort_if($amount < 0 || $discount < 0 || $discount > $amount, 422, 'Nominal tidak valid.');
            $old = $invoice->only('amount', 'discount_amount');
            $invoice->update(['amount' => $amount, 'discount_amount' => $discount]);
            if ($actor) {
                AuditLog::create(['user_id' => $actor->id, 'action' => 'invoice_amount_updated', 'entity_type' => 'Invoice', 'entity_id' => $invoice->id, 'old_values' => $old, 'new_values' => $invoice->only('amount', 'discount_amount')]);
            }

            return $invoice->fresh();
        });
    }
}
