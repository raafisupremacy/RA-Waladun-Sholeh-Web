<?php

namespace App\Http\Middleware;

use App\Models\SchoolSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                ] : null,
            ],
            'appName' => config('app.name'),
            'temporaryAccount' => function () use ($request) {
                $encrypted = $request->session()->pull('provisioned_account');

                return $encrypted ? json_decode(Crypt::decryptString($encrypted), true) : null;
            },
            'flash' => ['success' => fn () => $request->session()->get('success')],
            'schoolName' => fn () => Schema::hasTable('school_settings') ? SchoolSetting::where('key', 'school_name')->value('value') : '',
            'schoolSettings' => function () use ($user) {
                if (! $user || ! $user->hasAnyRole(['admin', 'orang_tua']) || ! Schema::hasTable('school_settings')) {
                    return [];
                }

                return SchoolSetting::query()->whereIn('key', [
                    'school_name', 'school_address', 'school_phone', 'bank_name',
                    'bank_account_number', 'bank_account_holder', 'default_spp_amount',
                ])->pluck('value', 'key')->all();
            },
        ];
    }
}
