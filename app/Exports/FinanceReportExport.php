<?php

namespace App\Exports;

use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class FinanceReportExport implements FromQuery, WithHeadings, WithMapping
{
    public function __construct(private Builder $builder) {}

    public function query()
    {
        return $this->builder;
    }

    public function headings(): array
    {
        return ['Nomor tagihan', 'Siswa', 'Status', 'Jatuh tempo', 'Nominal'];
    }

    public function map($invoice): array
    {
        $status = $invoice->status instanceof \BackedEnum ? $invoice->status->value : $invoice->status;
        $net = $invoice->net_amount ?? ($invoice->amount - $invoice->discount_amount);

        return [
            $invoice->invoice_number,
            $invoice->student?->name ?? '—',
            ucfirst(str_replace('_', ' ', $status)),
            $invoice->due_date?->format('Y-m-d') ?? '—',
            $net,
        ];
    }
}
