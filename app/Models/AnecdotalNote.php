<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnecdotalNote extends Model
{
    use HasFactory;

    protected $fillable = ['student_id', 'teacher_id', 'noted_at', 'observed_behavior', 'interpretation', 'follow_up', 'photo_path'];

    protected $casts = ['noted_at' => 'datetime'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }
}
