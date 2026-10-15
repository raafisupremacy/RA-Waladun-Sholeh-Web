<?php

namespace App\Models;

use App\Enums\AnnouncementStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = ['created_by', 'classroom_id', 'target_level', 'title', 'body', 'is_pinned', 'status', 'published_at', 'expires_at'];

    protected $casts = ['is_pinned' => 'boolean', 'status' => AnnouncementStatus::class, 'published_at' => 'datetime', 'expires_at' => 'datetime'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function scopeVisibleToStudent($query, Student $student)
    {
        $classroomIds = $student->enrollments()
            ->where('status', 'aktif')
            ->whereHas('academicYear', fn ($year) => $year->where('is_active', true))
            ->pluck('classroom_id');

        $levels = $student->enrollments()->where('status', 'aktif')->whereHas('academicYear', fn ($year) => $year->where('is_active', true))->with('classroom')->get()->pluck('classroom.level')->filter()->map(fn ($level) => $level instanceof \BackedEnum ? $level->value : $level);

        return $query->where('status', AnnouncementStatus::Published->value)
            ->whereNotNull('published_at')->where('published_at', '<=', now())
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn ($query) => $query->where(fn ($q) => $q->whereNull('classroom_id')->whereNull('target_level'))->orWhereIn('classroom_id', $classroomIds)->orWhereIn('target_level', $levels));
    }
}
