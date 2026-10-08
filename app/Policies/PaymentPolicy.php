<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function view(User $user, Payment $payment): bool
    {
        return $user->hasRole('admin') || ($user->hasRole('orang_tua') && $payment->invoice?->student?->guardians()->where('user_id', $user->id)->exists());
    }

    public function approve(User $user, Payment $payment): bool
    {
        return $user->hasRole('admin');
    }

    public function reject(User $user, Payment $payment): bool
    {
        return $user->hasRole('admin');
    }
}
