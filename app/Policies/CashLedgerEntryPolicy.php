<?php

namespace App\Policies;

use App\Models\User;

class CashLedgerEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'kepala_sekolah']);
    }
}
