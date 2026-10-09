<?php

namespace App\Services;

use App\Enums\AssessmentLevel;
use App\Enums\JournalAspect;
use App\Enums\JournalStatus;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\JournalAssessment;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JournalService
{
    public function saveDraft(array $data, $teacher): DailyJournal
    {
        $this->ownsClassroom((int) $data['classroom_id'], $teacher);
        $this->ownsStudent((int) $data['student_id'], (int) $data['classroom_id']);

        return DB::transaction(function () use ($data, $teacher) {
            $journal = DailyJournal::query()->where('student_id', $data['student_id'])->whereDate('journal_date', $data['journal_date'])->lockForUpdate()->first();
            if (! empty($data['id']) && (! $journal || $journal->id !== (int) $data['id'])) {
                abort(403);
            }
            if ($journal) {
                abort_unless($journal->teacher_id === $teacher->id, 403);
                if ($journal->status === JournalStatus::Final && $this->locked($journal)) {
                    throw ValidationException::withMessages(['journal' => 'Jurnal sudah disimpan dan terkunci.']);
                }
            } else {
                $journal = new DailyJournal(['student_id' => $data['student_id'], 'classroom_id' => $data['classroom_id'], 'teacher_id' => $teacher->id, 'journal_date' => $data['journal_date']]);
            }
            $journal->fill(['activity_summary' => $data['activity_summary'] ?? '', 'status' => $journal->exists ? $journal->status : JournalStatus::Draft]);
            $journal->save();
            $this->assess($journal, $data['assessments'] ?? []);

            return $journal->fresh('assessments');
        });
    }

    public function finalize(DailyJournal $journal, array $data, $teacher): DailyJournal
    {
        if ($journal->teacher_id !== $teacher->id || ! $this->ownsClassroom($journal->classroom_id, $teacher)) {
            abort(403);
        }
        $this->ownsStudent($journal->student_id, $journal->classroom_id);
        if ($journal->status === JournalStatus::Final && $this->locked($journal)) {
            throw ValidationException::withMessages(['journal' => 'Jurnal sudah disimpan dan terkunci.']);
        }$aspects = array_column(JournalAspect::cases(), 'value');
        $assessments = $data['assessments'] ?? [];
        if (count(array_diff($aspects, array_keys($assessments))) || collect($aspects)->contains(fn ($aspect) => blank($assessments[$aspect] ?? null))) {
            throw ValidationException::withMessages(['assessments' => 'Kelima aspek wajib diisi.']);
        }

        return DB::transaction(function () use ($journal, $data) {
            $journal->update(['activity_summary' => $data['activity_summary'] ?? $journal->activity_summary, 'status' => JournalStatus::Final, 'finalized_at' => now()]);
            $this->assess($journal, $data['assessments']);

            return $journal->fresh('assessments');
        });
    }

    private function ownsClassroom(int $classroomId, $teacher): bool
    {
        return Classroom::whereKey($classroomId)
            ->where(fn ($q) => $q->where('homeroom_teacher_id', $teacher->id)->orWhereHas('teachers', fn ($t) => $t->where('teachers.id', $teacher->id)))
            ->whereHas('academicYear', fn ($q) => $q->where('is_active', true))
            ->exists() ?: abort(403);
    }

    private function ownsStudent(int $studentId, int $classroomId): void
    {
        abort_unless(Student::whereKey($studentId)->whereHas('enrollments', fn ($q) => $q->where('classroom_id', $classroomId)->where('status', 'aktif')->whereHas('academicYear', fn ($y) => $y->where('is_active', true)))->exists(), 403);
    }

    private function locked(DailyJournal $journal): bool
    {
        return $journal->journal_date->endOfDay()->addDays(config('skms.journal_edit_days', 1))->isPast();
    }

    private function owned($id, $teacher): ?DailyJournal
    {
        if (! $id) {
            return null;
        }$journal = DailyJournal::findOrFail($id);
        abort_if($journal->teacher_id !== $teacher->id, 403);

        return $journal;
    }

    private function assess($journal, array $assessments): void
    {
        foreach ($assessments as $aspect => $values) {
            $aspectEnum = JournalAspect::tryFrom((string) $aspect);
            $level = is_array($values) ? ($values['level'] ?? null) : $values;
            $levelEnum = AssessmentLevel::tryFrom((string) $level);
            if (! $aspectEnum || ! $levelEnum) {
                throw ValidationException::withMessages(['assessments' => 'Aspek dan tingkat perkembangan tidak valid.']);
            }
            JournalAssessment::updateOrCreate(['daily_journal_id' => $journal->id, 'aspect' => $aspectEnum->value], ['level' => $levelEnum->value, 'note' => is_array($values) ? ($values['note'] ?? null) : null]);
        }
    }
}
