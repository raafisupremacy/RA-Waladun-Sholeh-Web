<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, HasRoles, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'must_change_password', 'is_active', 'last_login_at'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed', 'must_change_password' => 'boolean', 'is_active' => 'boolean', 'last_login_at' => 'datetime'];
    }

    public function teacher(): HasOne
    {
        return $this->hasOne(Teacher::class);
    }

    public function guardian(): HasOne
    {
        return $this->hasOne(Guardian::class);
    }

    public function submittedPayments(): HasMany
    {
        return $this->hasMany(Payment::class, 'submitted_by');
    }

    public function reviewedPayments(): HasMany
    {
        return $this->hasMany(Payment::class, 'reviewed_by');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}
