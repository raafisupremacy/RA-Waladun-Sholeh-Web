<?php

namespace App\Models;

use App\Enums\AssessmentLevel;
use App\Enums\JournalAspect;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalAssessment extends Model
{
    use HasFactory;

    protected $fillable = ['daily_journal_id', 'aspect', 'level', 'note'];

    protected $casts = ['aspect' => JournalAspect::class, 'level' => AssessmentLevel::class];

    public function dailyJournal(): BelongsTo
    {
        return $this->belongsTo(DailyJournal::class);
    }
}
