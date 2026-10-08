<?php

namespace App\Providers;

use App\Models\AnecdotalNote;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\Teacher;
use App\Policies\AnecdotalNotePolicy;
use App\Policies\CashLedgerEntryPolicy;
use App\Policies\DailyJournalPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\MasterDataPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\StudentPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        foreach ([Teacher::class, Guardian::class, Classroom::class] as $model) {
            Gate::policy($model, MasterDataPolicy::class);
        }
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(Payment::class, PaymentPolicy::class);
        Gate::policy(Student::class, StudentPolicy::class);
        Gate::policy(DailyJournal::class, DailyJournalPolicy::class);
        Gate::policy(AnecdotalNote::class, AnecdotalNotePolicy::class);
        Gate::policy(CashLedgerEntry::class, CashLedgerEntryPolicy::class);
    }
}
