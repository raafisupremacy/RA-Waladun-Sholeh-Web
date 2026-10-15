<?php

namespace App\Http\Controllers\Kepsek;

use App\Exports\FinanceReportExport;
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

class FinanceReportController extends Controller
{
    public function index(Request $request, ReportService $reports)
    {
        $filters = $request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status']);

        $invoices = $reports->financeQuery($filters)->paginate(15)->withQueryString()->through(fn (Invoice $invoice) => [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'student' => $invoice->student ? ['id' => $invoice->student->id, 'name' => $invoice->student->name] : null,
            'classroom' => $invoice->student?->enrollments?->first()?->classroom?->display_name ?? '—',
            'status' => $invoice->status?->value,
            'due_date' => $invoice->due_date?->toDateString(),
            'due_date_formatted' => $invoice->due_date ? Carbon::parse($invoice->due_date)->locale('id')->isoFormat('D MMM Y') : '—',
            'amount' => $invoice->amount,
            'discount_amount' => $invoice->discount_amount,
            'net_amount' => $invoice->net_amount ?? ($invoice->amount - $invoice->discount_amount),
            'description' => 'SPP '.Carbon::create($invoice->period_year, $invoice->period_month, 1)->locale('id')->isoFormat('MMMM Y'),
        ]);

        return Inertia::render('Kepsek/FinanceReport', [
            'filters' => $filters,
            'school_name' => SchoolSetting::where('key', 'school_name')->value('value') ?? '',
            'totals' => $reports->financeTotals($filters),
            'monthlyReceived' => $reports->monthlyReceived($filters, 4),
            'invoices' => $invoices,
            'academicYears' => AcademicYear::latest('start_date')->get(['id', 'name'])->map->only(['id', 'name']),
            'classrooms' => Classroom::latest()->get(['id', 'name', 'level', 'academic_year_id'])->map(fn ($c) => ['id' => $c->id, 'name' => $c->display_name, 'academic_year_id' => $c->academic_year_id]),
        ]);
    }

    public function pdf(Request $request, ReportService $reports)
    {
        $filters = $request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status']);
        $schoolName = SchoolSetting::where('key', 'school_name')->value('value') ?? '';

        return Pdf::loadView('exports.finance-report', [
            'invoices' => $reports->financeQuery($filters)->get(),
            'totals' => $reports->financeTotals($filters),
            'title' => 'Laporan Keuangan Sekolah',
            'filters' => $filters,
            'school_name' => $schoolName,
        ])->setPaper('a4')->download('laporan-keuangan-kepsek.pdf');
    }

    public function excel(Request $request, ReportService $reports)
    {
        return Excel::download(
            new FinanceReportExport($reports->financeQuery($request->only(['start_date', 'end_date', 'academic_year_id', 'classroom_id', 'status']))),
            'laporan-keuangan-kepsek.xlsx'
        );
    }
}
