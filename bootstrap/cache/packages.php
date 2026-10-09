<?php

return [
    'barryvdh/laravel-dompdf' => [
        'aliases' => [
            'PDF' => 'Barryvdh\\DomPDF\\Facade\\Pdf',
            'Pdf' => 'Barryvdh\\DomPDF\\Facade\\Pdf',
        ],
        'providers' => [
            0 => 'Barryvdh\\DomPDF\\ServiceProvider',
        ],
    ],
    'inertiajs/inertia-laravel' => [
        'providers' => [
            0 => 'Inertia\\ServiceProvider',
        ],
    ],
    'laravel/breeze' => [
        'providers' => [
            0 => 'Laravel\\Breeze\\BreezeServiceProvider',
        ],
    ],
    'laravel/pail' => [
        'providers' => [
            0 => 'Laravel\\Pail\\PailServiceProvider',
        ],
    ],
    'laravel/sail' => [
        'providers' => [
            0 => 'Laravel\\Sail\\SailServiceProvider',
        ],
    ],
    'laravel/sanctum' => [
        'providers' => [
            0 => 'Laravel\\Sanctum\\SanctumServiceProvider',
        ],
    ],
    'laravel/tinker' => [
        'providers' => [
            0 => 'Laravel\\Tinker\\TinkerServiceProvider',
        ],
    ],
    'maatwebsite/excel' => [
        'aliases' => [
            'Excel' => 'Maatwebsite\\Excel\\Facades\\Excel',
        ],
        'providers' => [
            0 => 'Maatwebsite\\Excel\\ExcelServiceProvider',
        ],
    ],
    'nesbot/carbon' => [
        'providers' => [
            0 => 'Carbon\\Laravel\\ServiceProvider',
        ],
    ],
    'nunomaduro/collision' => [
        'providers' => [
            0 => 'NunoMaduro\\Collision\\Adapters\\Laravel\\CollisionServiceProvider',
        ],
    ],
    'nunomaduro/termwind' => [
        'providers' => [
            0 => 'Termwind\\Laravel\\TermwindServiceProvider',
        ],
    ],
    'spatie/laravel-permission' => [
        'providers' => [
            0 => 'Spatie\\Permission\\PermissionServiceProvider',
        ],
    ],
    'tightenco/ziggy' => [
        'providers' => [
            0 => 'Tighten\\Ziggy\\ZiggyServiceProvider',
        ],
    ],
];
