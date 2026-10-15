<?php

namespace App\Models;

use App\Enums\ClassLevel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classroom extends Model
{
    use HasFactory;

    protected $fillable = ['academic_year_id', 'homeroom_teacher_id', 'name', 'level', 'age_range'];

    protected $casts = ['level' => ClassLevel::class];

    public function getDisplayNameAttribute(): string
    {
        return str_starts_with($this->name, 'Kelompok ') ? $this->name : 'Kelompok '.$this->name;
    }

    public function getAgeRangeAttribute($value): string
    {
        return $this->level?->value === 'B' ? '5–6 tahun' : ($this->level?->value === 'A' ? '4–5 tahun' : $value);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function homeroomTeacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'homeroom_teacher_id');
    }

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(Teacher::class, 'classroom_teacher')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class);
    }
}
