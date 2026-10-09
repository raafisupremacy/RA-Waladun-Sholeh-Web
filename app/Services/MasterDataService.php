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

    public function assignTeacherClassroom(Teacher $teacher, ?Classroom $classroom, User $actor, string $role = 'pendamping'): void
    {
        Gate::forUser($actor)->authorize('update', $teacher);

        DB::transaction(function () use ($teacher, $classroom, $actor, $role) {
            $teacher = Teacher::whereKey($teacher->id)->lockForUpdate()->firstOrFail();

            if ($classroom) {
                if (! $classroom->academicYear->is_active) {
                    throw ValidationException::withMessages(['classroom_id' => 'Pilih kelas pada tahun ajaran aktif.']);
                }
                if (! $teacher->user->is_active) {
                    throw ValidationException::withMessages(['classroom_id' => 'Pilih guru yang berstatus aktif.']);
                }

                $currentCount = $classroom->teachers()->where('teachers.id', '!=', $teacher->id)->count();
                if ($currentCount >= 3) {
                    throw ValidationException::withMessages(['classroom_id' => 'Kelas ini sudah mencapai batas maksimal 3 guru.']);
                }
            }

            // Remove teacher from any existing classrooms in the active academic year
            $activeClassrooms = $teacher->classrooms()
                ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
                ->get();

            foreach ($activeClassrooms as $oldClass) {
                $teacher->classrooms()->detach($oldClass->id);
                if ($oldClass->homeroom_teacher_id === $teacher->id) {
                    $nextTeacher = $oldClass->teachers()->first();
                    $oldClass->update(['homeroom_teacher_id' => $nextTeacher?->id]);
                    if ($nextTeacher) {
                        $oldClass->teachers()->updateExistingPivot($nextTeacher->id, ['role' => 'wali_kelas']);
                    }
                }
            }

            // Clear direct homeroom reference if set on any other classroom
            Classroom::where('homeroom_teacher_id', $teacher->id)
                ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
                ->when($classroom, fn ($q) => $q->where('id', '!=', $classroom->id))
                ->update(['homeroom_teacher_id' => null]);

            if ($classroom) {
                $shouldBeHomeroom = $role === 'wali_kelas' || $classroom->homeroom_teacher_id === null;
                $effectiveRole = $shouldBeHomeroom ? 'wali_kelas' : $role;

                $classroom->teachers()->syncWithoutDetaching([
                    $teacher->id => ['role' => $effectiveRole],
                ]);

                if ($shouldBeHomeroom) {
                    $oldHomeroom = $classroom->homeroom_teacher_id;
                    $classroom->update(['homeroom_teacher_id' => $teacher->id]);
                    if ($oldHomeroom && $oldHomeroom !== $teacher->id) {
                        $classroom->teachers()->updateExistingPivot($oldHomeroom, ['role' => 'pendamping']);
                    }
                }

                AuditLog::create([
                    'user_id' => $actor->id,
                    'action' => 'teacher_classroom_assigned',
                    'entity_type' => 'Teacher',
                    'entity_id' => $teacher->id,
                    'new_values' => [
                        'classroom_id' => $classroom->id,
                        'classroom_name' => $classroom->name,
                        'role' => $effectiveRole,
                    ],
                ]);
            } else {
                AuditLog::create([
                    'user_id' => $actor->id,
                    'action' => 'teacher_classroom_unassigned',
                    'entity_type' => 'Teacher',
                    'entity_id' => $teacher->id,
                ]);
            }
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
            $isAlreadyHomeroom = Classroom::where('homeroom_teacher_id', $teacher->id)
                ->where('academic_year_id', $classroom->academic_year_id)
                ->where('id', '!=', $classroom->id)
                ->exists();

            if ($isAlreadyHomeroom || $teacher->classrooms()->where('classrooms.academic_year_id', $classroom->academic_year_id)->where('classrooms.id', '!=', $classroom->id)->exists()) {
                throw ValidationException::withMessages(['teacher_id' => 'Guru sudah menjadi wali kelas lain pada tahun ajaran ini.']);
            }

            $currentCount = $classroom->teachers()->where('teachers.id', '!=', $teacher->id)->count();
            if ($currentCount >= 3) {
                throw ValidationException::withMessages(['teacher_id' => 'Kelas ini sudah mencapai batas maksimal 3 guru.']);
            }

            $old = $classroom->getAttributes();
            $oldHomeroomId = $classroom->homeroom_teacher_id;

            $classroom->update(['homeroom_teacher_id' => $teacher->id]);
            $classroom->teachers()->syncWithoutDetaching([
                $teacher->id => ['role' => 'wali_kelas'],
            ]);

            if ($oldHomeroomId && $oldHomeroomId !== $teacher->id) {
                $classroom->teachers()->updateExistingPivot($oldHomeroomId, ['role' => 'pendamping']);
            }

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
