<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = ['invoice_number', 'student_id', 'academic_year_id', 'period_month', 'period_year', 'amount', 'discount_amount', 'due_date', 'status', 'paid_at', 'verified_by', 'verified_at'];

    protected $casts = ['status' => InvoiceStatus::class, 'due_date' => 'date', 'paid_at' => 'datetime', 'verified_at' => 'datetime'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function cashLedgerEntry(): HasOne
    {
        return $this->hasOne(CashLedgerEntry::class);
    }

    public function getNetAmountAttribute(): int
    {
        return $this->amount - $this->discount_amount;
    }
}
