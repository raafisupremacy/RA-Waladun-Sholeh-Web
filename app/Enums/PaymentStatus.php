<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'menunggu';
    case Approved = 'disetujui';
    case Rejected = 'ditolak';
}
