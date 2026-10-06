<?php

namespace App\Models;

use App\Enums\JournalStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyJournal extends Model
{
    use HasFactory;

    protected $fillable = ['student_id', 'classroom_id', 'teacher_id', 'journal_date', 'activity_summary', 'status', 'finalized_at'];

    protected $casts = ['status' => JournalStatus::class, 'journal_date' => 'date', 'finalized_at' => 'datetime'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(JournalAssessment::class);
    }
}
