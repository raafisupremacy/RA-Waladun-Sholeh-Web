<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ClassSummaryExport;
use App\Exports\FinanceReportExport;
use App\Exports\OverdueReportExport;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Invoice;
use App\Models\SchoolSetting;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function index(Request $request, ReportService $reports)
    {
        $tab = $request->input('tab', 'rekap');
        $filters = $request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status', 'tab']);
        $filters['tab'] = $tab;

        $academicYears = AcademicYear::latest('start_date')->get(['id', 'name'])->map->only(['id', 'name']);
        $classrooms = Classroom::latest()->get(['id', 'name', 'level', 'academic_year_id'])->map(fn ($c) => ['id' => $c->id, 'name' => $c->display_name, 'academic_year_id' => $c->academic_year_id]);

        if ($tab === 'tunggakan') {
            $overdueList = $reports->overdueStudents(30, $filters['academic_year_id'] ?? null, $filters);
            $totalOverdue = array_sum(array_column($overdueList, 'amount'));

            return Inertia::render('Admin/Reports', [
                'tab' => 'tunggakan',
                'filters' => $filters,
                'school_name' => SchoolSetting::where('key', 'school_name')->value('value') ?? '',
                'overdueList' => $overdueList,
                'totalOverdue' => $totalOverdue,
                'academicYears' => $academicYears,
                'classrooms' => $classrooms,
            ]);
        }

        if ($tab === 'ringkasan_kelas') {
            $classSummary = $reports->classSummaryReport($filters['academic_year_id'] ?? null);

            return Inertia::render('Admin/Reports', [
                'tab' => 'ringkasan_kelas',
                'filters' => $filters,
                'school_name' => SchoolSetting::where('key', 'school_name')->value('value') ?? '',
                'classSummary' => $classSummary,
                'academicYears' => $academicYears,
                'classrooms' => $classrooms,
            ]);
        }

        $invoices = $reports->financeQuery($filters)->paginate(15)->withQueryString()->through(fn (Invoice $invoice) => [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'student' => $invoice->student ? [
                'id' => $invoice->student->id,
                'name' => $invoice->student->name,
                'nis' => $invoice->student->nis,
            ] : null,
            'classroom' => $invoice->student?->enrollments?->first()?->classroom?->display_name ?? '—',
            'status' => $invoice->status?->value,
            'due_date' => $invoice->due_date?->toDateString(),
            'due_date_formatted' => $invoice->due_date ? Carbon::parse($invoice->due_date)->locale('id')->isoFormat('D MMM Y') : '—',
            'amount' => $invoice->amount,
            'discount_amount' => $invoice->discount_amount,
            'net_amount' => $invoice->net_amount ?? ($invoice->amount - $invoice->discount_amount),
            'description' => 'SPP '.Carbon::create($invoice->period_year, $invoice->period_month, 1)->locale('id')->isoFormat('MMMM Y'),
        ]);

        return Inertia::render('Admin/Reports', [
            'tab' => 'rekap',
            'filters' => $filters,
            'school_name' => SchoolSetting::where('key', 'school_name')->value('value') ?? '',
            'totals' => $reports->financeTotals($filters),
            'invoices' => $invoices,
            'academicYears' => $academicYears,
            'classrooms' => $classrooms,
        ]);
    }

    public function pdf(Request $request, ReportService $reports)
    {
        $tab = $request->input('tab', 'rekap');
        $filters = $request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status', 'tab']);
        $schoolName = SchoolSetting::where('key', 'school_name')->value('value') ?? '';

        if ($tab === 'tunggakan') {
            $overdueList = $reports->overdueStudents(30, $filters['academic_year_id'] ?? null, $filters);
            $totalOverdue = array_sum(array_column($overdueList, 'amount'));

            return Pdf::loadView('exports.finance-report', [
                'tab' => 'tunggakan',
                'title' => 'Laporan Tunggakan SPP (>30 Hari)',
                'overdueList' => $overdueList,
                'totalOverdue' => $totalOverdue,
                'filters' => $filters,
                'school_name' => $schoolName,
            ])->setPaper('a4')->download('laporan-tunggakan-spp.pdf');
        }

        if ($tab === 'ringkasan_kelas') {
            $classSummary = $reports->classSummaryReport($filters['academic_year_id'] ?? null);

            return Pdf::loadView('exports.finance-report', [
                'tab' => 'ringkasan_kelas',
                'title' => 'Laporan Ringkasan Penerimaan SPP per Kelas',
                'classSummary' => $classSummary,
                'filters' => $filters,
                'school_name' => $schoolName,
            ])->setPaper('a4')->download('laporan-ringkasan-kelas.pdf');
        }

        return Pdf::loadView('exports.finance-report', [
            'tab' => 'rekap',
            'title' => 'Laporan Rekap Penerimaan SPP',
            'invoices' => $reports->financeQuery($filters)->get(),
            'totals' => $reports->financeTotals($filters),
            'filters' => $filters,
            'school_name' => $schoolName,
        ])->setPaper('a4')->download('laporan-rekap-spp.pdf');
    }

    public function excel(Request $request, ReportService $reports)
    {
        $filters = $request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status', 'tab']);
        $tab = $request->input('tab', 'rekap');

        $export = match ($tab) {
            'ringkasan_kelas' => new ClassSummaryExport($reports->classSummaryReport($filters['academic_year_id'] ?? null)),
            'tunggakan' => new OverdueReportExport($reports->overdueStudents(30, $filters['academic_year_id'] ?? null, $filters)),
            default => new FinanceReportExport($reports->financeQuery($filters)),
        };

        return Excel::download($export, "laporan-admin-{$tab}.xlsx");
    }
}
