<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    case Unpaid = 'belum_bayar';
    case Pending = 'menunggu_verifikasi';
    case Paid = 'lunas';
    case Rejected = 'ditolak';
}
