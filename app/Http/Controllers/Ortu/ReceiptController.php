<?php

namespace App\Http\Controllers\Ortu;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\SchoolSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReceiptController extends Controller
{
    public function download(Invoice $invoice, Request $request)
    {
        $this->authorize('view', $invoice);
        abort_unless($invoice->status->value === 'lunas', 404);

        return Pdf::loadView('exports.receipt', [
            'invoice' => $invoice->load('student', 'cashLedgerEntry'),
            'school_name' => SchoolSetting::where('key', 'school_name')->value('value') ?? '',
        ])->download($invoice->invoice_number.'-kuitansi.pdf');
    }
}
