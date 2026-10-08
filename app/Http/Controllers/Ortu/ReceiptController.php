<?php

namespace App\Http\Controllers\Ortu;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReceiptController extends Controller
{
    public function download(Invoice $invoice, Request $request)
    {
        $this->authorize('view', $invoice);
        abort_unless($invoice->status->value === 'lunas', 404);

        return Pdf::loadView('exports.receipt', ['invoice' => $invoice->load('student', 'cashLedgerEntry')])->download($invoice->invoice_number.'-kuitansi.pdf');
    }
}
