<?php

namespace Tests\Feature;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

class RouteProtectionTest extends TestCase
{
    public function test_every_non_public_route_has_auth_and_role_prefixes_are_protected(): void
    {
        $public = [
            '/', 'up', 'sanctum/csrf-cookie', 'login', 'forgot-password', 'reset-password', 'reset-password/{token}', 'styleguide',
        ];

        foreach (RouteFacade::getRoutes() as $route) {
            /** @var Route $route */
            $uri = $route->uri();
            $middleware = $route->gatherMiddleware();
            $isPublic = in_array($uri, $public, true)
                || ($uri === 'styleguide' && app()->environment('local'))
                || str_starts_with($uri, 'reset-password/');

            if (! $isPublic) {
                $this->assertTrue($this->hasMiddleware($middleware, 'auth'), "Route {$route->methods()[0]} {$uri} tidak memiliki auth.");
            }

            foreach ([
                'admin' => ['admin', 'kepala_sekolah'],
                'guru' => ['guru'],
                'kepsek' => ['kepala_sekolah'],
                'ortu' => ['orang_tua'],
            ] as $prefix => $roles) {
                if (! str_starts_with($uri, $prefix.'/') && $uri !== $prefix) {
                    continue;
                }

                $roleMiddleware = collect($middleware)->first(fn ($item) => str_starts_with((string) $item, 'role:'));
                $this->assertNotNull($roleMiddleware, "Route {$route->methods()[0]} {$uri} tidak memiliki role middleware.");
                $this->assertTrue(collect($roles)->contains(fn ($role) => str_contains((string) $roleMiddleware, $role)), "Route {$route->methods()[0]} {$uri} memiliki role middleware yang tidak sesuai.");
            }
        }
    }

    private function hasMiddleware(array $middleware, string $expected): bool
    {
        return collect($middleware)->contains(fn ($item) => $item === $expected || str_contains((string) $item, 'Authenticate'));
    }
}
