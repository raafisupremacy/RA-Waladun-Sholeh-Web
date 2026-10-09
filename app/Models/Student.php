<?php

namespace App\Models;

use App\Enums\Gender;
use App\Enums\StudentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $fillable = ['nis', 'name', 'birth_date', 'gender', 'entry_year', 'status'];

    protected $casts = ['birth_date' => 'date', 'gender' => Gender::class, 'status' => StudentStatus::class];

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class)->withPivot(['relationship', 'is_primary'])->withTimestamps();
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function dailyJournals(): HasMany
    {
        return $this->hasMany(DailyJournal::class);
    }

    public function anecdotalNotes(): HasMany
    {
        return $this->hasMany(AnecdotalNote::class);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->hasAnyRole(['admin', 'kepala_sekolah'])) {
            return $query;
        } if ($user->hasRole('orang_tua')) {
            return $query->whereHas('guardians', fn ($q) => $q->where('user_id', $user->id));
        } if ($user->hasRole('guru')) {
            return $query->whereHas('enrollments', fn ($q) => $q->where('status', 'aktif')->whereHas('classroom', fn ($c) => $c->where(fn ($cq) => $cq->where('homeroom_teacher_id', $user->teacher?->id)->orWhereHas('teachers', fn ($tq) => $tq->where('teachers.id', $user->teacher?->id)))->whereHas('academicYear', fn ($y) => $y->where('is_active', true))));
        }

        return $query->whereKey(-1);
    }
}
