<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Active = 'aktif';
    case Transferred = 'pindah';
    case Completed = 'selesai';
}
