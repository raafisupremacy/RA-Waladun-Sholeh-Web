<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'guru', 'kepala_sekolah', 'orang_tua']);
    }

    public function view(User $user, Student $student): bool
    {
        return Student::visibleTo($user)->whereKey($student->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function update(User $user, Student $student): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, Student $student): bool
    {
        return false;
    }
}
