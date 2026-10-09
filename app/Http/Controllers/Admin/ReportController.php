<?php

namespace App\Http\Controllers\Admin;

use App\Exports\FinanceReportExport;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Invoice;
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
        $classrooms = Classroom::latest()->get(['id', 'name', 'academic_year_id'])->map->only(['id', 'name', 'academic_year_id']);

        if ($tab === 'tunggakan') {
            $overdueList = $reports->overdueStudents(30, $filters['academic_year_id'] ?? null);
            $totalOverdue = array_sum(array_column($overdueList, 'amount'));

            return Inertia::render('Admin/Reports', [
                'tab' => 'tunggakan',
                'filters' => $filters,
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
            'classroom' => $invoice->student?->enrollments?->first()?->classroom?->name ?? '—',
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

        if ($tab === 'tunggakan') {
            $overdueList = $reports->overdueStudents(30, $filters['academic_year_id'] ?? null);
            $totalOverdue = array_sum(array_column($overdueList, 'amount'));

            return Pdf::loadView('exports.finance-report', [
                'tab' => 'tunggakan',
                'title' => 'Laporan Tunggakan SPP (>30 Hari)',
                'overdueList' => $overdueList,
                'totalOverdue' => $totalOverdue,
                'filters' => $filters,
            ])->setPaper('a4')->download('laporan-tunggakan-spp.pdf');
        }

        if ($tab === 'ringkasan_kelas') {
            $classSummary = $reports->classSummaryReport($filters['academic_year_id'] ?? null);

            return Pdf::loadView('exports.finance-report', [
                'tab' => 'ringkasan_kelas',
                'title' => 'Laporan Ringkasan Penerimaan SPP per Kelas',
                'classSummary' => $classSummary,
                'filters' => $filters,
            ])->setPaper('a4')->download('laporan-ringkasan-kelas.pdf');
        }

        return Pdf::loadView('exports.finance-report', [
            'tab' => 'rekap',
            'title' => 'Laporan Rekap Penerimaan SPP',
            'invoices' => $reports->financeQuery($filters)->get(),
            'totals' => $reports->financeTotals($filters),
            'filters' => $filters,
        ])->setPaper('a4')->download('laporan-rekap-spp.pdf');
    }

    public function excel(Request $request, ReportService $reports)
    {
        $filters = $request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status', 'tab']);
        $tab = $request->input('tab', 'rekap');

        return Excel::download(
            new FinanceReportExport($reports->financeQuery($filters)),
            "laporan-admin-{$tab}.xlsx"
        );
    }
}
