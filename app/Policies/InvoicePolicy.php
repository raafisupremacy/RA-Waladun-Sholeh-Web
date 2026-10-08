<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function view(User $user, Invoice $invoice): bool
    {
        if ($user->hasAnyRole(['admin', 'kepala_sekolah'])) {
            return true;
        }

        return $user->hasRole('orang_tua') && $user->guardian?->students()->whereKey($invoice->student_id)->exists();
    }

    public function uploadProof(User $user, Invoice $invoice): bool
    {
        return $user->hasRole('orang_tua') && $this->view($user, $invoice);
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return $user->hasRole('admin') && $invoice->status->value !== 'lunas';
    }
}
