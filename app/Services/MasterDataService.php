<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Guardian;
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

                $oldHomeroom = $classroom->homeroom_teacher_id;
                $currentCount = $classroom->teachers()
                    ->where('teachers.id', '!=', $teacher->id)
                    ->when($shouldBeHomeroom && $oldHomeroom, fn ($q) => $q->where('teachers.id', '!=', $oldHomeroom))
                    ->count();
                if ($currentCount >= 3) {
                    throw ValidationException::withMessages(['classroom_id' => 'Kelas ini sudah mencapai batas maksimal 3 guru.']);
                }

                $classroom->teachers()->syncWithoutDetaching([
                    $teacher->id => ['role' => $effectiveRole],
                ]);

                if ($shouldBeHomeroom) {
                    $classroom->update(['homeroom_teacher_id' => $teacher->id]);
                    if ($oldHomeroom && $oldHomeroom !== $teacher->id) {
                        $classroom->teachers()->detach($oldHomeroom);
                    }
                }

                AuditLog::create([
                    'user_id' => $actor->id,
                    'action' => 'teacher_classroom_assigned',
                    'entity_type' => 'Teacher',
                    'entity_id' => $teacher->id,
                    'new_values' => [
                        'classroom_id' => $classroom->id,
                        'classroom_name' => $classroom->display_name,
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

            $oldHomeroomId = $classroom->homeroom_teacher_id;
            $currentCount = $classroom->teachers()
                ->where('teachers.id', '!=', $teacher->id)
                ->when($oldHomeroomId, fn ($q) => $q->where('teachers.id', '!=', $oldHomeroomId))
                ->count();
            if ($currentCount >= 3) {
                throw ValidationException::withMessages(['teacher_id' => 'Kelas ini sudah mencapai batas maksimal 3 guru.']);
            }

            $old = $classroom->getAttributes();

            $classroom->update(['homeroom_teacher_id' => $teacher->id]);
            $classroom->teachers()->syncWithoutDetaching([
                $teacher->id => ['role' => 'wali_kelas'],
            ]);

            if ($oldHomeroomId && $oldHomeroomId !== $teacher->id) {
                $classroom->teachers()->detach($oldHomeroomId);
            }

            AuditLog::create(['user_id' => $actor->id, 'action' => 'homeroom_changed', 'entity_type' => 'Classroom', 'entity_id' => $classroom->id, 'old_values' => $old, 'new_values' => $classroom->fresh()->getAttributes()]);

            return $classroom->fresh();
        });
    }

    public function deactivate(Student|Teacher|User $record, User $actor): void
    {
        abort_unless($actor->hasRole('admin'), 403);
        DB::transaction(function () use ($record, $actor) {
            $old = $record instanceof Teacher ? $record->user->only(['is_active']) : $record->getAttributes();
            if ($record instanceof Student) {
                $record->update(['status' => 'nonaktif']);
            } elseif ($record instanceof Teacher) {
                $record->user->update(['is_active' => false]);
                foreach ($record->classrooms()->get() as $classroom) {
                    $record->classrooms()->detach($classroom->id);
                    if ($classroom->homeroom_teacher_id === $record->id) {
                        $classroom->update(['homeroom_teacher_id' => null]);
                    }
                }
            } else {
                $record->update(['is_active' => false]);
            }
            $entityType = $record instanceof User ? ($record->teacher ? 'Teacher' : ($record->guardian ? 'Guardian' : 'User')) : class_basename($record);
            $entityId = $record instanceof User ? ($record->teacher?->id ?? $record->guardian?->id ?? $record->id) : $record->id;
            AuditLog::create(['user_id' => $actor->id, 'action' => 'deactivated', 'entity_type' => $entityType, 'entity_id' => $entityId, 'old_values' => $old, 'new_values' => $record instanceof Teacher ? $record->user->fresh()->only(['is_active']) : $record->fresh()->getAttributes()]);
        });
    }

    public function activate(User $record, User $actor): void
    {
        abort_unless($actor->hasRole('admin'), 403);
        $old = $record->only(['is_active']);
        $record->update(['is_active' => true]);
        $entityType = $record->teacher ? 'Teacher' : ($record->guardian ? 'Guardian' : 'User');
        $entityId = $record->teacher?->id ?? $record->guardian?->id ?? $record->id;
        AuditLog::create(['user_id' => $actor->id, 'action' => 'activated', 'entity_type' => $entityType, 'entity_id' => $entityId, 'old_values' => $old, 'new_values' => $record->fresh()->only(['is_active'])]);
    }

    public function updateTeacher(Teacher $teacher, array $data, User $actor): void
    {
        Gate::forUser($actor)->authorize('update', $teacher);
        DB::transaction(function () use ($teacher, $data, $actor) {
            $old = ['profile' => $teacher->getAttributes(), 'user' => $teacher->user->only(['name', 'email'])];
            $teacher->update(['name' => $data['name'], 'nip' => $data['nip'], 'phone' => $data['phone']]);
            $teacher->user->update(['name' => $data['name'], 'email' => $data['email']]);
            AuditLog::create(['user_id' => $actor->id, 'action' => 'teacher_updated', 'entity_type' => 'Teacher', 'entity_id' => $teacher->id, 'old_values' => $old, 'new_values' => ['profile' => $teacher->fresh()->getAttributes(), 'user' => $teacher->user->fresh()->only(['name', 'email'])]]);
        });
    }

    public function updateGuardian(Guardian $guardian, array $data, User $actor): void
    {
        Gate::forUser($actor)->authorize('update', $guardian);
        DB::transaction(function () use ($guardian, $data, $actor) {
            $old = ['profile' => $guardian->getAttributes(), 'user' => $guardian->user->only(['name', 'email'])];
            $guardian->update(['name' => $data['name'], 'phone' => $data['phone'], 'address' => $data['address']]);
            $guardian->user->update(['name' => $data['name'], 'email' => $data['email']]);
            AuditLog::create(['user_id' => $actor->id, 'action' => 'guardian_updated', 'entity_type' => 'Guardian', 'entity_id' => $guardian->id, 'old_values' => $old, 'new_values' => ['profile' => $guardian->fresh()->getAttributes(), 'user' => $guardian->user->fresh()->only(['name', 'email'])]]);
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
