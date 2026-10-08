<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class ChangePasswordController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Auth/ChangePassword');
    }

    public function update(Request $request): RedirectResponse
    {
        $rules = ['password' => ['required', 'string', 'min:8', 'regex:/[0-9]/', 'confirmed']];
        if ($request->user()->must_change_password) {
            $rules['current_password'] = ['required', 'current_password'];
        }
        $data = $request->validate($rules);
        $request->user()->forceFill(['password' => Hash::make($data['password']), 'must_change_password' => false])->save();

        return redirect()->intended($this->home($request->user()));
    }

    private function home($user): string
    {
        foreach (['admin' => 'admin', 'guru' => 'guru', 'kepala_sekolah' => 'kepsek', 'orang_tua' => 'ortu'] as $role => $path) {
            if ($user->hasRole($role)) {
                return "/{$path}";
            }
        }

        return '/dashboard';
    }
}
