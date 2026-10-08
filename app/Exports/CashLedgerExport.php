<?php

namespace App\Exports;

use App\Services\CashLedgerService;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStrictNullComparison;

class CashLedgerExport implements FromCollection, WithHeadings, WithStrictNullComparison
{
    public function __construct(private array $filters = []) {}

    public function collection()
    {
        $service = app(CashLedgerService::class);
        $rows = $service->query($this->filters)->get()->map(fn ($row) => [Carbon::parse($row->entry_date)->locale('id')->translatedFormat('d M Y'), $row->description, $row->invoice_number, $row->classroom, (int) $row->amount_in, (int) $row->running_balance]);
        $totals = $service->summary($this->filters);
        $rows->push(['', 'Total penerimaan periode ini', '', '', $totals['total'], $totals['closing_balance']]);

        return $rows;
    }

    public function headings(): array
    {
        return ['Tanggal', 'Keterangan', 'No. tagihan', 'Kelas', 'Masuk (Rp)', 'Saldo berjalan (Rp)'];
    }
}
