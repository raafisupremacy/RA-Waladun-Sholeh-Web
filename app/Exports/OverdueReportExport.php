<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class OverdueReportExport implements FromArray, WithHeadings
{
    public function __construct(private array $rows) {}

    public function headings(): array
    {
        return ['Siswa', 'Kelas', 'Bulan menunggak', 'Hari terlambat', 'Nominal'];
    }

    public function array(): array
    {
        $rows = collect($this->rows)->map(fn ($row) => [
            $row['student_name'], $row['classroom'], $row['months'], $row['late_days'], $row['amount'],
        ])->all();
        $rows[] = ['Total', '', '', '', collect($this->rows)->sum('amount')];

        return $rows;
    }
}
