<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CashLedgerService
{
    public function query(array $filters)
    {
        // Calculate balances before filtering/pagination, including opening entries.
        $balances = DB::table('cash_ledger_entries')->select('*')->selectRaw('SUM(amount_in) OVER (ORDER BY entry_date, id ROWS UNBOUNDED PRECEDING) AS running_balance');

        return DB::query()->fromSub($balances, 'ledger')
            ->join('invoices', 'invoices.id', '=', 'ledger.invoice_id')
            ->leftJoin('enrollments', fn ($join) => $join->on('enrollments.student_id', '=', 'invoices.student_id')->on('enrollments.academic_year_id', '=', 'invoices.academic_year_id'))
            ->leftJoin('classrooms', 'classrooms.id', '=', 'enrollments.classroom_id')
            ->select('ledger.*', 'invoices.invoice_number', 'classrooms.name as classroom')
            ->when($filters['start_date'] ?? null, fn ($q, $date) => $q->where('ledger.entry_date', '>=', $date))
            ->when($filters['end_date'] ?? null, fn ($q, $date) => $q->where('ledger.entry_date', '<=', $date))
            ->orderByDesc('ledger.entry_date')->orderByDesc('ledger.id');
    }

    public function summary(array $filters): array
    {
        $query = DB::table('cash_ledger_entries')
            ->when($filters['start_date'] ?? null, fn ($q, $date) => $q->where('entry_date', '>=', $date))
            ->when($filters['end_date'] ?? null, fn ($q, $date) => $q->where('entry_date', '<=', $date));
        $totals = $query->selectRaw('COUNT(*) AS total_count, COALESCE(SUM(amount_in), 0) AS total')->first();
        $opening = ! empty($filters['start_date']) ? (int) DB::table('cash_ledger_entries')->where('entry_date', '<', $filters['start_date'])->sum('amount_in') : 0;

        return ['total' => (int) $totals->total, 'count' => (int) $totals->total_count, 'opening_balance' => $opening, 'closing_balance' => $opening + (int) $totals->total];
    }

    public function row(object $entry): array
    {
        return ['id' => $entry->id, 'entry_date' => $entry->entry_date, 'description' => $entry->description, 'invoice_number' => $entry->invoice_number,
            'classroom' => $entry->classroom, 'amount_in' => (int) $entry->amount_in, 'running_balance' => (int) $entry->running_balance];
    }
}
