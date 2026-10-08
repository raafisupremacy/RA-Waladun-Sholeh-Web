<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['email' => ['required', 'string', 'email'], 'password' => ['required', 'string']];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();
        $user = User::where('email', $this->string('email'))->first();
        if (! $user || ! $user->is_active || ! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());
            throw ValidationException::withMessages(['email' => 'Email atau kata sandi tidak sesuai.']);
        } RateLimiter::clear($this->throttleKey());
        $user->forceFill(['last_login_at' => now()])->save();
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        } event(new Lockout($this));
        $seconds = RateLimiter::availableIn($this->throttleKey());
        throw ValidationException::withMessages(['email' => 'Terlalu banyak percobaan. Coba lagi dalam '.ceil($seconds / 60).' menit.']);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
