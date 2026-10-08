<?php

namespace App\Http\Controllers\Admin;

use App\Exports\CashLedgerExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\LedgerRequest;
use App\Models\CashLedgerEntry;
use App\Services\CashLedgerService;
use Barryvdh\DomPDF\Facade\Pdf;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class CashLedgerController extends Controller
{
    public function index(LedgerRequest $request, CashLedgerService $service)
    {
        $this->authorize('viewAny', CashLedgerEntry::class);
        $filters = $request->validated();

        return Inertia::render('Admin/CashLedger', [
            'entries' => $service->query($filters)->paginate(10)->withQueryString()->through(fn ($entry) => $service->row($entry)),
            'summary' => $service->summary($filters), 'filters' => $filters,
            'isPrincipal' => $request->user()->hasRole('kepala_sekolah'),
        ]);
    }

    public function pdf(LedgerRequest $request, CashLedgerService $service)
    {
        $this->authorize('viewAny', CashLedgerEntry::class);
        $filters = $request->validated();

        return Pdf::loadView('exports.cash-ledger', ['entries' => $service->query($filters)->get(), 'summary' => $service->summary($filters), 'filters' => $filters])->setPaper('a4', 'landscape')->download('buku-kas.pdf');
    }

    public function excel(LedgerRequest $request)
    {
        $this->authorize('viewAny', CashLedgerEntry::class);

        return Excel::download(new CashLedgerExport($request->validated()), 'buku-kas.xlsx');
    }
}
