<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AccountProvisioningService
{
    public function createTeacher(array $data, User $actor): array
    {
        return $this->teacher($data, $actor);
    }

    public function createGuardian(array $data, User $actor): array
    {
        return $this->guardian($data, $actor);
    }

    public function teacher(array $data, User $actor): array
    {
        Gate::forUser($actor)->authorize('create', Teacher::class);

        return DB::transaction(function () use ($data, $actor) {
            $password = Str::random(10).random_int(10, 99);
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $password, 'must_change_password' => true, 'is_active' => true]);
            $user->assignRole('guru');
            $profile = Teacher::create(['user_id' => $user->id, 'name' => $data['name'], 'nip' => $data['nip'], 'phone' => $data['phone']]);
            if (! empty($data['classroom_id'])) {
                app(MasterDataService::class)->replaceHomeroom(Classroom::findOrFail($data['classroom_id']), $profile, $actor);
            }
            $this->audit($actor, 'account_created', 'Teacher', $profile->id, ['user_id' => $user->id]);
            $this->flashAccount($user, $password);

            return compact('user', 'profile', 'password');
        });
    }

    public function guardian(array $data, User $actor): array
    {
        Gate::forUser($actor)->authorize('create', Guardian::class);

        return DB::transaction(function () use ($data, $actor) {
            $password = Str::random(10).random_int(10, 99);
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $password, 'must_change_password' => true, 'is_active' => true]);
            $user->assignRole('orang_tua');
            $profile = Guardian::create(['user_id' => $user->id, 'name' => $data['name'], 'phone' => $data['phone'], 'address' => $data['address']]);
            $this->audit($actor, 'account_created', 'Guardian', $profile->id, ['user_id' => $user->id]);
            $this->flashAccount($user, $password);

            return compact('user', 'profile', 'password');
        });
    }

    public function student(array $data, User $actor): Student
    {
        Gate::forUser($actor)->authorize('create', Student::class);

        return DB::transaction(function () use ($data, $actor) {
            $class = Classroom::whereHas('academicYear', fn ($q) => $q->where('is_active', true))->findOrFail($data['classroom_id']);
            if (empty($data['guardian_id']) && empty($data['guardian_email'])) {
                throw ValidationException::withMessages(['guardian_id' => 'Setiap siswa wajib memiliki orang tua atau wali.']);
            }
            $student = Student::create(collect($data)->only(['nis', 'name', 'birth_date', 'gender', 'entry_year', 'status'])->all() + ['status' => 'aktif']);
            Enrollment::create(['student_id' => $student->id, 'classroom_id' => $class->id, 'academic_year_id' => $class->academic_year_id, 'status' => 'aktif']);
            if (! empty($data['guardian_id'])) {
                $student->guardians()->attach($data['guardian_id'], ['relationship' => $data['relationship'] ?? 'wali', 'is_primary' => true]);
            } elseif (! empty($data['guardian_email'])) {
                $guardian = $this->guardian(['name' => $data['guardian_name'], 'email' => $data['guardian_email'], 'phone' => $data['guardian_phone'], 'address' => $data['guardian_address']], $actor)['profile'];
                $student->guardians()->attach($guardian->id, ['relationship' => $data['relationship'] ?? 'wali', 'is_primary' => true]);
            }
            $this->audit($actor, 'student_created', 'Student', $student->id);

            return $student;
        });
    }

    public function resetPassword(User $user, User $actor): string
    {
        abort_unless($actor->hasRole('admin'), 403);
        $password = Str::random(10).random_int(10, 99);
        DB::transaction(function () use ($user, $actor, $password) {
            $user->forceFill(['password' => $password, 'must_change_password' => true, 'remember_token' => Str::random(60)])->save();
            $this->audit($actor, 'password_reset', 'User', $user->id);
        });
        $this->flashAccount($user, $password);

        return $password;
    }

    private function flashAccount(User $user, string $password): void
    {
        session()->flash('provisioned_account', Crypt::encryptString(json_encode([
            'name' => $user->name, 'email' => $user->email, 'password' => $password,
        ], JSON_THROW_ON_ERROR)));
    }

    private function audit(User $actor, string $action, string $type, int $id, ?array $new = null): void
    {
        AuditLog::create(['user_id' => $actor->id, 'action' => $action, 'entity_type' => $type, 'entity_id' => $id, 'new_values' => $new]);
    }
}
