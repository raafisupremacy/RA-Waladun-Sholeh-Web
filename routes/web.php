<?php

use App\Http\Controllers\Admin\AdminDataController;
use App\Http\Controllers\Admin\CashLedgerController;
use App\Http\Controllers\Admin\ClassroomController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\GuardianController;
use App\Http\Controllers\Admin\PaymentQueueController;
use App\Http\Controllers\Admin\PaymentVerificationController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Guru\AnecdotalNoteController;
use App\Http\Controllers\Guru\JournalController;
use App\Http\Controllers\Ortu\DevelopmentController;
use App\Http\Controllers\Ortu\InvoiceController;
use App\Http\Controllers\Ortu\PaymentProofController;
use App\Http\Controllers\Ortu\ReceiptController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => false,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/styleguide', function () {
    return Inertia::render('Styleguide', [
        'appName' => config('app.name'),
        'schoolName' => '',
    ]);
})->name('styleguide');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'password.changed'])->name('dashboard');

foreach ([
    'admin' => 'admin',
    'guru' => 'guru',
    'kepsek' => 'kepala_sekolah',
    'ortu' => 'orang_tua',
] as $prefix => $role) {
    $handler = match ($prefix) {
        'admin' => [DashboardController::class, 'index'],
        'guru' => [App\Http\Controllers\Guru\DashboardController::class, 'index'],
        default => fn () => Inertia::render('Role/Placeholder', ['role' => $role]),
    };
    Route::get("/{$prefix}", $handler)
        ->middleware(['auth', 'password.changed', "role:{$role}"])->name("{$prefix}.home");
}

Route::middleware(['auth', 'password.changed'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

Route::middleware(['auth', 'password.changed', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/siswa', [AdminDataController::class, 'students'])->name('admin.students');
    Route::get('/siswa/create', [AdminDataController::class, 'createStudent'])->name('admin.students.create');
    Route::post('/siswa/{student}/nonaktifkan', [AdminDataController::class, 'deactivateStudent'])->name('admin.students.deactivate');
    Route::post('/siswa', [AdminDataController::class, 'storeStudent'])->name('admin.students.store');
    Route::post('/siswa/{student}/pindah', [AdminDataController::class, 'moveStudent'])->name('admin.students.move');
    Route::post('/guru', [AdminDataController::class, 'storeTeacher'])->name('admin.teachers.store');
    Route::get('/guru', [TeacherController::class, 'index'])->name('admin.teachers');
    Route::post('/guru/{teacher}/reset-kata-sandi', [TeacherController::class, 'reset'])->name('admin.teachers.reset');
    Route::post('/orang-tua', [AdminDataController::class, 'storeGuardian'])->name('admin.guardians.store');
    Route::get('/orang-tua', [GuardianController::class, 'index'])->name('admin.guardians');
    Route::post('/orang-tua/{guardian}/reset-kata-sandi', [GuardianController::class, 'reset'])->name('admin.guardians.reset');
    Route::post('/tagihan/generate', [AdminDataController::class, 'generateInvoices'])->name('admin.invoices.generate');
    Route::post('/verifikasi/{payment}/setujui', [PaymentVerificationController::class, 'approve'])->name('admin.payments.approve');
    Route::post('/verifikasi/{payment}/tolak', [PaymentVerificationController::class, 'reject'])->name('admin.payments.reject');
    Route::get('/verifikasi', [PaymentQueueController::class, 'index'])->name('admin.payments.index');
    Route::get('/buku-kas', [CashLedgerController::class, 'index'])->name('admin.cash-ledger');
    Route::get('/buku-kas/pdf', [CashLedgerController::class, 'pdf'])->name('admin.cash-ledger.pdf');
    Route::get('/buku-kas/excel', [CashLedgerController::class, 'excel'])->name('admin.cash-ledger.excel');
    Route::post('/kelas/{classroom}/siswa', [ClassroomController::class, 'move'])->name('admin.classrooms.move');
    Route::post('/kelas/{classroom}/wali', [ClassroomController::class, 'replaceTeacher'])->name('admin.classrooms.teacher');
    Route::get('/kelas', [ClassroomController::class, 'index'])->name('admin.classrooms');
});

Route::middleware(['auth', 'password.changed', 'role:guru'])->prefix('guru')->group(function () {
    Route::get('/jurnal', [JournalController::class, 'index'])->name('guru.journals');
    Route::get('/jurnal/{student}', [JournalController::class, 'show'])->name('guru.journals.show');
    Route::get('/riwayat', [JournalController::class, 'history'])->name('guru.journals.history');
    Route::post('/jurnal', [JournalController::class, 'store'])->name('guru.journals.store');
    Route::post('/jurnal/{journal}/final', [JournalController::class, 'finalize'])->name('guru.journals.finalize');
    Route::get('/anekdot', [AnecdotalNoteController::class, 'index'])->name('guru.anecdotes');
    Route::post('/anekdot', [AnecdotalNoteController::class, 'store'])->name('guru.anecdotes.store');
    Route::put('/anekdot/{note}', [AnecdotalNoteController::class, 'update'])->name('guru.anecdotes.update');
});

Route::middleware(['auth', 'password.changed', 'role:orang_tua'])->prefix('ortu')->group(function () {
    Route::get('/tagihan', [InvoiceController::class, 'index'])->name('ortu.invoices');
    Route::get('/tagihan/{invoice}', [InvoiceController::class, 'show'])->name('ortu.invoices.show');
    Route::get('/perkembangan', [DevelopmentController::class, 'index'])->name('ortu.development');
    Route::post('/tagihan/{invoice}/bukti', [InvoiceController::class, 'upload'])->name('ortu.invoices.upload');
    Route::get('/pembayaran/{payment}/bukti', [PaymentProofController::class, 'download'])->name('ortu.payments.proof');
    Route::get('/tagihan/{invoice}/kuitansi', [ReceiptController::class, 'download'])->name('ortu.invoices.receipt');
});
