<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class MasterDataService
{
    public function moveStudent(Student $student, Classroom $target, User $actor): Enrollment
    {
        Gate::forUser($actor)->authorize('update', $student);
        if (! $target->academicYear->is_active || $student->status->value !== 'aktif') {
            throw ValidationException::withMessages(['student_ids' => 'Pilih siswa aktif dan kelas pada tahun ajaran aktif.']);
        }

        return DB::transaction(function () use ($student, $target, $actor) {
            $active = $student->enrollments()->where('academic_year_id', $target->academic_year_id)->where('status', 'aktif')->firstOrFail();
            $old = $active->getAttributes();
            $active->update(['classroom_id' => $target->id]);
            AuditLog::create(['user_id' => $actor->id, 'action' => 'student_moved', 'entity_type' => 'Enrollment', 'entity_id' => $active->id, 'old_values' => $old, 'new_values' => $active->fresh()->getAttributes()]);

            return $active->fresh();
        });
    }

    public function replaceHomeroom(Classroom $classroom, Teacher $teacher, User $actor): Classroom
    {
        Gate::forUser($actor)->authorize('update', $classroom);

        return DB::transaction(function () use ($classroom, $teacher, $actor) {
            $teacher = Teacher::whereKey($teacher->id)->lockForUpdate()->firstOrFail();
            if (! $classroom->academicYear->is_active || ! $teacher->user->is_active) {
                throw ValidationException::withMessages(['teacher_id' => 'Pilih guru aktif dan kelas pada tahun ajaran aktif.']);
            }
            if ($teacher->classrooms()->where('academic_year_id', $classroom->academic_year_id)->where('id', '!=', $classroom->id)->exists()) {
                throw ValidationException::withMessages(['teacher_id' => 'Guru sudah menjadi wali kelas lain pada tahun ajaran ini.']);
            }
            $old = $classroom->getAttributes();
            $classroom->update(['homeroom_teacher_id' => $teacher->id]);
            AuditLog::create(['user_id' => $actor->id, 'action' => 'homeroom_changed', 'entity_type' => 'Classroom', 'entity_id' => $classroom->id, 'old_values' => $old, 'new_values' => $classroom->fresh()->getAttributes()]);

            return $classroom->fresh();
        });
    }

    public function deactivate(Student|Teacher|User $record, User $actor): void
    {
        abort_unless($actor->hasRole('admin'), 403);
        DB::transaction(function () use ($record, $actor) {
            if ($record instanceof Student) {
                $record->update(['status' => 'nonaktif']);
            } elseif ($record instanceof Teacher) {
                $record->user->update(['is_active' => false]);
            } else {
                $record->update(['is_active' => false]);
            }
            AuditLog::create(['user_id' => $actor->id, 'action' => 'deactivated', 'entity_type' => class_basename($record), 'entity_id' => $record->id]);
        });
    }

    public function moveStudents(array $ids, Classroom $target, User $actor): void
    {
        DB::transaction(function () use ($ids, $target, $actor) {
            foreach ($ids as $id) {
                $this->moveStudent(Student::findOrFail($id), $target, $actor);
            }
        });
    }
}
