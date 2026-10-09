<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Perkembangan Anak - {{ $report['student']['name'] }}</title>
    <style>
        @page {
            margin: 18mm 18mm 18mm 18mm;
            size: a4 portrait;
        }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10pt;
            line-height: 1.45;
            color: #1D1D1F;
        }
        .header {
            text-align: center;
            margin-bottom: 12px;
        }
        .school-name {
            font-size: 10pt;
            font-weight: 500;
            letter-spacing: 1px;
            color: #6E6E73;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .title {
            font-size: 14pt;
            font-weight: bold;
            color: #1D1D1F;
            margin: 2px 0;
        }
        .subtitle {
            font-size: 9.5pt;
            color: #6E6E73;
        }
        .divider {
            border-top: 1px solid #E5E5EA;
            margin: 10px 0;
        }
        .identity-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        .identity-table td {
            padding: 3px 0;
            font-size: 9.5pt;
            vertical-align: top;
            border: none;
        }
        .label {
            color: #6E6E73;
            width: 90px;
        }
        .aspect-box {
            margin-bottom: 11px;
        }
        .aspect-title {
            font-size: 10pt;
            font-weight: bold;
            color: #1D1D1F;
            margin-bottom: 2px;
        }
        .aspect-badge {
            display: inline-block;
            background-color: #F5F5F7;
            color: #48484A;
            font-size: 8.5pt;
            padding: 2px 7px;
            border-radius: 4px;
            margin-bottom: 3px;
        }
        .aspect-narrative {
            font-size: 9pt;
            color: #1D1D1F;
            text-align: justify;
            margin: 0;
        }
        .anecdote-title {
            font-size: 10pt;
            font-weight: bold;
            color: #1D1D1F;
            margin-bottom: 5px;
        }
        .anecdote-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .anecdote-item {
            font-size: 9pt;
            margin-bottom: 4px;
            line-height: 1.35;
        }
        .anecdote-date {
            font-weight: bold;
            color: #6E6E73;
        }
        .sign-table {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
        }
        .sign-table td {
            width: 50%;
            text-align: center;
            vertical-align: top;
            font-size: 9.5pt;
            border: none;
        }
        .sign-name {
            font-weight: bold;
            text-decoration: underline;
        }
        .sign-nip {
            font-size: 8.5pt;
            color: #6E6E73;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="school-name">{{ $report['school_name'] ?? 'TK TUNAS HARAPAN' }}</div>
        <div class="title">Laporan Perkembangan Anak</div>
        <div class="subtitle">Tahun Ajaran {{ $report['academic_year']['name'] ?? '2026/2027' }}</div>
    </div>

    <div class="divider"></div>

    <table class="identity-table">
        <tr>
            <td class="label">Nama Siswa</td>
            <td style="font-weight: bold;">: {{ $report['student']['name'] }}</td>
            <td class="label" style="width: 70px;">NIS</td>
            <td>: {{ $report['student']['nis'] }}</td>
        </tr>
        <tr>
            <td class="label">Kelompok</td>
            <td>: {{ $report['classroom'] }} ({{ $report['classroom_age'] ?? 'Usia 4–5 Tahun' }})</td>
            <td class="label" style="width: 70px;">Periode</td>
            <td>: {{ $report['period_label'] ?? 'Semester 1' }}</td>
        </tr>
    </table>

    <div class="divider"></div>

    @php
        $aspectDefinitions = [
            'nilai_agama_moral' => [
                'title' => '1. Nilai Agama dan Moral',
                'default' => 'Aisyah terbiasa berdoa sebelum dan sesudah kegiatan dengan khidmat. Mulai mandiri dalam membedakan perilaku baik dan peduli terhadap teman.',
            ],
            'fisik_motorik' => [
                'title' => '2. Fisik Motorik',
                'default' => 'Keterampilan motorik halus berkembang sangat baik saat menggunting dan meronce. Mampu melakukan gerakan fisik lokomotor dengan seimbang.',
            ],
            'kognitif' => [
                'title' => '3. Kognitif',
                'default' => 'Menunjukkan rasa ingin tahu tinggi dalam eksplorasi sains sederhana. Mampu mengelompokkan benda berdasarkan bentuk dan warna secara konsisten.',
            ],
            'bahasa' => [
                'title' => '4. Bahasa',
                'default' => 'Mampu menyampaikan ide dan bercerita kembali dengan kalimat terstruktur. Menyimak cerita guru dengan penuh perhatian hingga selesai.',
            ],
            'sosial_emosional' => [
                'title' => '5. Sosial Emosional',
                'default' => 'Sangat ramah, mudah berbagi alat bermain, dan mampu mengantre giliran dengan tertib bersama teman sekelas.',
            ],
        ];
    @endphp

    @foreach($aspectDefinitions as $key => $info)
        @php
            $counts = $report['assessments'][$key] ?? [];
            $bsh = $counts['BSH'] ?? 0;
            $bsb = $counts['BSB'] ?? 0;
            $mb = $counts['MB'] ?? 0;
            $bb = $counts['BB'] ?? 0;
            $narrative = !empty($report['narratives'][$key]) ? implode(' ', $report['narratives'][$key]) : $info['default'];
        @endphp
        <div class="aspect-box">
            <div class="aspect-title">{{ $info['title'] }}</div>
            <div>
                <span class="aspect-badge">BSH {{ $bsh }} hari · BSB {{ $bsb }} hari · MB {{ $mb }} hari{{ $bb > 0 ? " · BB {$bb} hari" : '' }}</span>
            </div>
            <p class="aspect-narrative">{{ $narrative }}</p>
        </div>
    @endforeach

    <div class="divider"></div>

    <div style="margin-bottom: 8px;">
        <div class="anecdote-title">Catatan Anekdot Terpilih</div>
        @if(!empty($report['anecdotes']))
            <ul class="anecdote-list">
                @foreach($report['anecdotes'] as $note)
                    <li class="anecdote-item">
                        <span class="anecdote-date">{{ $note['date'] }}:</span>
                        <span>{{ $note['text'] }}</span>
                    </li>
                @endforeach
            </ul>
        @else
            <p class="aspect-narrative" style="color: #6E6E73; font-style: italic;">Belum ada catatan anekdot khusus pada periode ini.</p>
        @endif
    </div>

    <table class="sign-table">
        <tr>
            <td>
                Mengetahui,<br>
                Wali Kelas,
                <br><br><br><br>
                <span class="sign-name">{{ $report['teacher'] ?? 'Wali Kelas' }}</span><br>
                <span class="sign-nip">{{ $report['teacher_nip'] ?? 'NIP. —' }}</span>
            </td>
            <td>
                {{ $report['city_date'] ?? 'Jakarta' }}<br>
                Kepala Sekolah,
                <br><br><br><br>
                <span class="sign-name">{{ $report['principal'] ?? 'Kepala Sekolah' }}</span><br>
                <span class="sign-nip">{{ $report['principal_nip'] ?? 'NIP. —' }}</span>
            </td>
        </tr>
    </table>
</body>
</html>
