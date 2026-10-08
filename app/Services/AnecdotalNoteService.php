<?php

namespace App\Services;

use App\Models\AnecdotalNote;
use App\Models\AuditLog;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\UploadedFile;

class AnecdotalNoteService
{
    public function create(array $data, User $teacher, ?UploadedFile $photo = null): AnecdotalNote
    {
        abort_unless($teacher->teacher, 403);
        abort_unless(Student::whereKey($data['student_id'])->whereHas('enrollments', function ($query) use ($teacher) {
            $query->where('status', 'aktif')
                ->whereHas('classroom', fn ($classroom) => $classroom->where('homeroom_teacher_id', $teacher->teacher->id))
                ->whereHas('academicYear', fn ($year) => $year->where('is_active', true));
        })->exists(), 403);

        $path = $photo?->store('anecdotes', 'private');
        $note = AnecdotalNote::create($data + ['teacher_id' => $teacher->teacher->id, 'photo_path' => $path]);
        AuditLog::create(['user_id' => $teacher->id, 'action' => 'anecdotal_note_created', 'entity_type' => 'AnecdotalNote', 'entity_id' => $note->id]);

        return $note;
    }

    public function update(AnecdotalNote $note, array $data, User $teacher, ?UploadedFile $photo = null): AnecdotalNote
    {
        abort_unless($note->teacher_id === $teacher->teacher?->id, 403);
        abort_unless(Student::whereKey($note->student_id)->whereHas('enrollments', function ($query) use ($teacher) {
            $query->where('status', 'aktif')
                ->whereHas('classroom', fn ($classroom) => $classroom->where('homeroom_teacher_id', $teacher->teacher?->id))
                ->whereHas('academicYear', fn ($year) => $year->where('is_active', true));
        })->exists(), 403);

        if ($photo) {
            $data['photo_path'] = $photo->store('anecdotes', 'private');
        }

        $old = $note->getAttributes();
        $note->update($data);
        AuditLog::create(['user_id' => $teacher->id, 'action' => 'anecdotal_note_updated', 'entity_type' => 'AnecdotalNote', 'entity_id' => $note->id, 'old_values' => $old, 'new_values' => $note->fresh()->getAttributes()]);

        return $note->fresh();
    }
}
