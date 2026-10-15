<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ClassSummaryExport implements FromArray, WithHeadings
{
    public function __construct(private array $summary) {}

    public function headings(): array
    {
        return ['Kelas', 'Wali kelas', 'Jumlah siswa', 'Jumlah tagihan', 'Total tagihan', 'Diterima', 'Belum diterima', 'Menunggu verifikasi', 'Menunggak', 'Persentase lunas'];
    }

    public function array(): array
    {
        $rows = collect($this->summary['classes'])->map(fn ($row) => [
            $row['name'], $row['teacher_name'], $row['student_count'], $row['invoice_count'],
            $row['received_amount'] + $row['outstanding_amount'], $row['received_amount'],
            $row['outstanding_amount'], $row['pending_count'], $row['overdue_count'], $row['achievement_percentage'].'%',
        ])->all();
        $total = $this->summary['totals'];
        $rows[] = ['Total', '', $total['student_count'], $total['invoice_count'], $total['received_amount'] + $total['outstanding_amount'], $total['received_amount'], $total['outstanding_amount'], $total['pending_count'], $total['overdue_count'], $total['achievement_percentage'].'%'];

        return $rows;
    }
}
