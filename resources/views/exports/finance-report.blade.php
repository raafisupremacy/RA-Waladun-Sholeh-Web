<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'Laporan Keuangan' }}</title>
    <style>
        @page {
            margin: 15mm;
            size: a4 portrait;
        }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #1D1D1F;
        }
        .header {
            text-align: center;
            margin-bottom: 14px;
        }
        .school-name {
            font-size: 9pt;
            font-weight: 500;
            color: #6E6E73;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .title {
            font-size: 14pt;
            font-weight: bold;
            color: #1D1D1F;
            margin: 3px 0;
        }
        .meta {
            font-size: 8.5pt;
            color: #6E6E73;
        }
        .summary-box {
            background-color: #F5F5F7;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 14px;
            font-size: 9pt;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
        }
        th {
            background-color: #F5F5F7;
            color: #48484A;
            font-weight: bold;
            font-size: 8.5pt;
            text-align: left;
            padding: 6px 8px;
            border-bottom: 1.5px solid #D1D1D6;
        }
        td {
            padding: 5px 8px;
            font-size: 8.5pt;
            border-bottom: 1px solid #E5E5EA;
        }
        .text-right {
            text-align: right;
        }
        .total-row td {
            font-weight: bold;
            background-color: #F5F5F7;
            border-top: 1.5px solid #1D1D1F;
            border-bottom: 1.5px solid #1D1D1F;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">TK Tunas Harapan</div>
        <div class="title">{{ $title ?? 'Laporan Keuangan Sekolah' }}</div>
        <div class="meta">Dicetak pada: {{ now()->locale('id')->isoFormat('D MMMM Y, HH:mm') }} WIB</div>
    </div>

    @if(($tab ?? 'rekap') === 'tunggakan')
        <div class="summary-box">
            <strong>Total Siswa Menunggak:</strong> {{ count($overdueList ?? []) }} siswa &nbsp;|&nbsp;
            <strong>Total Tunggakan:</strong> Rp {{ number_format($totalOverdue ?? 0, 0, ',', '.') }}
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 25%;">Nama Siswa</th>
                    <th style="width: 20%;">Kelas</th>
                    <th style="width: 25%;">Bulan Menunggak</th>
                    <th class="text-right" style="width: 15%;">Nominal</th>
                    <th style="width: 15%;">Status</th>
                </tr>
            </thead>
            <tbody>
                @forelse($overdueList ?? [] as $row)
                    <tr>
                        <td><strong>{{ $row['student_name'] }}</strong></td>
                        <td>{{ $row['classroom'] }}</td>
                        <td>{{ $row['months'] }}</td>
                        <td class="text-right">Rp {{ number_format($row['amount'], 0, ',', '.') }}</td>
                        <td style="color: #C4271B;">{{ $row['status'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" style="text-align: center; color: #8E8E93;">Tidak ada data tunggakan.</td>
                    </tr>
                @endforelse
                @if(!empty($overdueList))
                    <tr class="total-row">
                        <td colspan="3">Total Tunggakan</td>
                        <td class="text-right">Rp {{ number_format($totalOverdue ?? 0, 0, ',', '.') }}</td>
                        <td></td>
                    </tr>
                @endif
            </tbody>
        </table>

    @elseif(($tab ?? 'rekap') === 'ringkasan_kelas')
        <div class="summary-box">
            <strong>Total Siswa:</strong> {{ $classSummary['totals']['student_count'] ?? 0 }} siswa &nbsp;|&nbsp;
            <strong>Total Penerimaan:</strong> Rp {{ number_format($classSummary['totals']['received_amount'] ?? 0, 0, ',', '.') }} &nbsp;|&nbsp;
            <strong>Total Tunggakan:</strong> Rp {{ number_format($classSummary['totals']['outstanding_amount'] ?? 0, 0, ',', '.') }}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Kelas</th>
                    <th>Wali Kelas</th>
                    <th class="text-right">Siswa</th>
                    <th class="text-right">Lunas</th>
                    <th class="text-right">Belum</th>
                    <th class="text-right">Diterima</th>
                    <th class="text-right">Tunggakan</th>
                    <th class="text-right">Capaian</th>
                </tr>
            </thead>
            <tbody>
                @foreach($classSummary['classes'] ?? [] as $cls)
                    <tr>
                        <td><strong>{{ $cls['name'] }}</strong></td>
                        <td>{{ $cls['teacher_name'] }}</td>
                        <td class="text-right">{{ $cls['student_count'] }}</td>
                        <td class="text-right">{{ $cls['paid_count'] }}</td>
                        <td class="text-right">{{ $cls['unpaid_count'] }}</td>
                        <td class="text-right">Rp {{ number_format($cls['received_amount'], 0, ',', '.') }}</td>
                        <td class="text-right">Rp {{ number_format($cls['outstanding_amount'], 0, ',', '.') }}</td>
                        <td class="text-right">{{ $cls['achievement_percentage'] }}%</td>
                    </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="2">Total Keseluruhan</td>
                    <td class="text-right">{{ $classSummary['totals']['student_count'] ?? 0 }}</td>
                    <td class="text-right">{{ $classSummary['totals']['paid_count'] ?? 0 }}</td>
                    <td class="text-right">{{ $classSummary['totals']['unpaid_count'] ?? 0 }}</td>
                    <td class="text-right">Rp {{ number_format($classSummary['totals']['received_amount'] ?? 0, 0, ',', '.') }}</td>
                    <td class="text-right">Rp {{ number_format($classSummary['totals']['outstanding_amount'] ?? 0, 0, ',', '.') }}</td>
                    <td class="text-right">{{ $classSummary['totals']['achievement_percentage'] ?? 0 }}%</td>
                </tr>
            </tbody>
        </table>

    @else
        <div class="summary-box">
            <strong>Total Diterima:</strong> Rp {{ number_format($totals['received'] ?? 0, 0, ',', '.') }} &nbsp;|&nbsp;
            <strong>Belum Diterima:</strong> Rp {{ number_format($totals['unreceived'] ?? 0, 0, ',', '.') }} &nbsp;|&nbsp;
            <strong>Total Transaksi:</strong> {{ $totals['invoice_count'] ?? count($invoices ?? []) }}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Tagihan</th>
                    <th>Siswa</th>
                    <th>Status</th>
                    <th>Jatuh Tempo</th>
                    <th class="text-right">Nominal</th>
                </tr>
            </thead>
            <tbody>
                @forelse($invoices ?? [] as $invoice)
                    @php
                        $statusVal = $invoice->status instanceof \BackedEnum ? $invoice->status->value : $invoice->status;
                        $amount = $invoice->net_amount ?? ($invoice->amount - $invoice->discount_amount);
                    @endphp
                    <tr>
                        <td>{{ $invoice->invoice_number }}</td>
                        <td><strong>{{ $invoice->student?->name ?? '—' }}</strong></td>
                        <td>{{ ucfirst(str_replace('_', ' ', $statusVal)) }}</td>
                        <td>{{ $invoice->due_date?->format('d/m/Y') }}</td>
                        <td class="text-right">Rp {{ number_format($amount, 0, ',', '.') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" style="text-align: center; color: #8E8E93;">Tidak ada data tagihan.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    @endif
</body>
</html>
