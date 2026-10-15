<?php

use App\Http\Middleware\EnsureActiveAccount;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Session\TokenMismatchException;
use Inertia\Inertia;
use Spatie\Permission\Middleware\RoleMiddleware;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            EnsureActiveAccount::class,
            EnsurePasswordChanged::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
        $middleware->alias(['password.changed' => EnsurePasswordChanged::class, 'role' => RoleMiddleware::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (TokenMismatchException $exception, $request) {
            $message = 'Sesi Anda berakhir. Muat ulang halaman lalu coba lagi.';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 419);
            }

            return Inertia::render('Errors/419', ['message' => $message])
                ->toResponse($request)
                ->setStatusCode(419);
        });

        $exceptions->render(function (HttpException $exception, $request) {
            if ($exception->getStatusCode() === 419) {
                $message = 'Sesi Anda berakhir. Muat ulang halaman lalu coba lagi.';

                if ($request->expectsJson()) {
                    return response()->json(['message' => $message], 419);
                }

                return Inertia::render('Errors/419', ['message' => $message])
                    ->toResponse($request)
                    ->setStatusCode(419);
            }

            if ($request->expectsJson()) {
                return null;
            }

            $status = $exception->getStatusCode();
            $page = in_array($status, [403, 404, 500], true) ? "Errors/{$status}" : 'Errors/500';

            return Inertia::render($page)->toResponse($request)->setStatusCode($status);
        });
    })->create();
