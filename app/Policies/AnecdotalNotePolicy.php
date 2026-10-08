<?php

namespace App\Policies;

use App\Models\AnecdotalNote;
use App\Models\Student;
use App\Models\User;

class AnecdotalNotePolicy
{
    public function view(User $user, AnecdotalNote $note): bool
    {
        if ($user->hasAnyRole(['admin', 'kepala_sekolah'])) {
            return true;
        }

        return $note->student && Student::visibleTo($user)->whereKey($note->student_id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasRole('guru');
    }

    public function update(User $user, AnecdotalNote $note): bool
    {
        return $user->hasRole('guru')
            && $note->teacher_id === $user->teacher?->id
            && Student::visibleTo($user)->whereKey($note->student_id)->exists();
    }

    public function delete(User $user, AnecdotalNote $note): bool
    {
        return $this->update($user, $note);
    }
}
