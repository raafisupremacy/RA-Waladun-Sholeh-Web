<?php

namespace App\Policies;

use App\Models\DailyJournal;
use App\Models\Student;
use App\Models\User;

class DailyJournalPolicy
{
    public function view(User $user, DailyJournal $journal): bool
    {
        if ($user->hasAnyRole(['admin', 'kepala_sekolah'])) {
            return true;
        }

        return $journal->student && Student::visibleTo($user)->whereKey($journal->student_id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasRole('guru');
    }

    public function update(User $user, DailyJournal $journal): bool
    {
        return $user->hasRole('guru') && $journal->teacher_id === $user->teacher?->id && ($journal->status->value === 'draf' || ! $journal->finalized_at || ! $journal->journal_date->endOfDay()->addDays(config('skms.journal_edit_days', 1))->isPast());
    }
}
