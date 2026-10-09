<?php

use App\Http\Controllers\Admin\AdminDataController;
use App\Http\Controllers\Admin\AnnouncementController;
use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\CashLedgerController;
use App\Http\Controllers\Admin\ClassroomController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\GuardianController;
use App\Http\Controllers\Admin\InvoiceController as AdminInvoiceController;
use App\Http\Controllers\Admin\PaymentQueueController;
use App\Http\Controllers\Admin\PaymentVerificationController;
use App\Http\Controllers\Admin\ReportController as AdminReportController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Guru\AnecdotalNoteController;
use App\Http\Controllers\Guru\JournalController;
use App\Http\Controllers\Kepsek\DashboardController as KepsekDashboardController;
use App\Http\Controllers\Kepsek\FinanceReportController as KepsekFinanceReportController;
use App\Http\Controllers\Kepsek\StudentReportController as KepsekStudentReportController;
use App\Http\Controllers\Ortu\DashboardController as OrtuDashboardController;
use App\Http\Controllers\Ortu\DevelopmentController;
use App\Http\Controllers\Ortu\InvoiceController;
use App\Http\Controllers\Ortu\PaymentProofController;
use App\Http\Controllers\Ortu\ProfileController as OrtuProfileController;
use App\Http\Controllers\Ortu\ReceiptController;
use App\Http\Controllers\Ortu\StudentReportController as OrtuStudentReportController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (! auth()->check()) {
        return redirect()->route('login');
    }
    foreach (['admin' => '/admin', 'guru' => '/guru', 'kepala_sekolah' => '/kepsek', 'orang_tua' => '/ortu'] as $role => $path) {
        if (auth()->user()->hasRole($role)) {
            return redirect($path);
        }
    }

    return redirect('/dashboard');
});

if (app()->environment('local')) {
    Route::get('/styleguide', function () {
        return Inertia::render('Styleguide', [
            'appName' => config('app.name'),
            'schoolName' => '',
        ]);
    })->name('styleguide');
}

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'password.changed', 'role:admin|guru|kepala_sekolah|orang_tua'])->name('dashboard');

foreach ([
    'admin' => 'admin',
    'guru' => 'guru',
    'kepsek' => 'kepala_sekolah',
    'ortu' => 'orang_tua',
] as $prefix => $role) {
    $handler = match ($prefix) {
        'admin' => [DashboardController::class, 'index'],
        'guru' => [App\Http\Controllers\Guru\DashboardController::class, 'index'],
        'ortu' => [OrtuDashboardController::class, 'index'],
        'kepsek' => [KepsekDashboardController::class, 'index'],
        default => fn () => Inertia::render('Role/Placeholder', ['role' => $role]),
    };
    Route::get("/{$prefix}", $handler)
        ->middleware(['auth', 'password.changed', "role:{$role}"])->name("{$prefix}.home");
}

require __DIR__.'/auth.php';

Route::middleware(['auth', 'password.changed', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/pengumuman', [AnnouncementController::class, 'index'])->name('admin.announcements');
    Route::get('/pengumuman/create', [AnnouncementController::class, 'create'])->name('admin.announcements.create');
    Route::post('/pengumuman', [AnnouncementController::class, 'store'])->name('admin.announcements.store');
    Route::get('/pengumuman/{announcement}/edit', [AnnouncementController::class, 'edit'])->name('admin.announcements.edit');
    Route::put('/pengumuman/{announcement}', [AnnouncementController::class, 'update'])->name('admin.announcements.update');
    Route::delete('/pengumuman/{announcement}', [AnnouncementController::class, 'destroy'])->name('admin.announcements.destroy');
    Route::get('/siswa', [AdminDataController::class, 'students'])->name('admin.students');
    Route::get('/siswa/create', [AdminDataController::class, 'createStudent'])->name('admin.students.create');
    Route::post('/siswa/{student}/nonaktifkan', [AdminDataController::class, 'deactivateStudent'])->name('admin.students.deactivate');
    Route::post('/siswa', [AdminDataController::class, 'storeStudent'])->name('admin.students.store');
    Route::put('/siswa/{student}', [AdminDataController::class, 'updateStudent'])->name('admin.students.update');
    Route::post('/siswa/{student}/pindah', [AdminDataController::class, 'moveStudent'])->name('admin.students.move');
    Route::post('/guru', [AdminDataController::class, 'storeTeacher'])->name('admin.teachers.store');
    Route::get('/guru', [TeacherController::class, 'index'])->name('admin.teachers');
    Route::post('/guru/{teacher}/kelas', [TeacherController::class, 'assignClass'])->name('admin.teachers.assign-class');
    Route::post('/guru/{teacher}/reset-kata-sandi', [TeacherController::class, 'reset'])->name('admin.teachers.reset');
    Route::post('/orang-tua', [AdminDataController::class, 'storeGuardian'])->name('admin.guardians.store');
    Route::get('/orang-tua', [GuardianController::class, 'index'])->name('admin.guardians');
    Route::post('/orang-tua/{guardian}/reset-kata-sandi', [GuardianController::class, 'reset'])->name('admin.guardians.reset');
    Route::get('/tagihan', [AdminInvoiceController::class, 'index'])->name('admin.invoices');
    Route::post('/tagihan/preview', [AdminInvoiceController::class, 'preview'])->name('admin.invoices.preview');
    Route::post('/tagihan/generate', [AdminInvoiceController::class, 'generate'])->name('admin.invoices.generate.v2');
    Route::patch('/tagihan/{invoice}/nominal', [AdminInvoiceController::class, 'update'])->name('admin.invoices.update');
    Route::post('/verifikasi/{payment}/setujui', [PaymentVerificationController::class, 'approve'])->name('admin.payments.approve');
    Route::post('/verifikasi/{payment}/tolak', [PaymentVerificationController::class, 'reject'])->name('admin.payments.reject');
    Route::get('/verifikasi', [PaymentQueueController::class, 'index'])->name('admin.payments.index');
    Route::get('/verifikasi/{payment}/bukti', [PaymentQueueController::class, 'proof'])->name('admin.payments.proof');
    Route::post('/kelas/{classroom}/siswa', [ClassroomController::class, 'move'])->name('admin.classrooms.move');
    Route::post('/kelas/{classroom}/wali', [ClassroomController::class, 'replaceTeacher'])->name('admin.classrooms.teacher');
    Route::post('/kelas', [ClassroomController::class, 'store'])->name('admin.classrooms.store');
    Route::get('/kelas', [ClassroomController::class, 'index'])->name('admin.classrooms');
    Route::get('/laporan', [AdminReportController::class, 'index'])->name('admin.reports');
    Route::get('/laporan/pdf', [AdminReportController::class, 'pdf'])->name('admin.reports.pdf');
    Route::get('/laporan/excel', [AdminReportController::class, 'excel'])->name('admin.reports.excel');
    Route::get('/audit-log', [AuditLogController::class, 'index'])->name('admin.audit-logs');
});

Route::middleware(['auth', 'password.changed', 'role:admin|kepala_sekolah'])->prefix('admin')->group(function () {
    Route::get('/buku-kas', [CashLedgerController::class, 'index'])->name('admin.cash-ledger');
    Route::get('/buku-kas/pdf', [CashLedgerController::class, 'pdf'])->name('admin.cash-ledger.pdf');
    Route::get('/buku-kas/excel', [CashLedgerController::class, 'excel'])->name('admin.cash-ledger.excel');
});

Route::middleware(['auth', 'password.changed', 'role:kepala_sekolah'])->prefix('kepsek')->group(function () {
    Route::get('/laporan-keuangan', [KepsekFinanceReportController::class, 'index'])->name('principal.finance');
    Route::get('/laporan-keuangan/pdf', [KepsekFinanceReportController::class, 'pdf'])->name('principal.finance.pdf');
    Route::get('/laporan-keuangan/excel', [KepsekFinanceReportController::class, 'excel'])->name('principal.finance.excel');
    Route::get('/laporan-evaluasi', [KepsekStudentReportController::class, 'index'])->name('principal.student-report');
    Route::get('/laporan-evaluasi/pdf', [KepsekStudentReportController::class, 'pdf'])->name('principal.student-report.pdf');
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

Route::middleware(['auth', 'password.changed'])->group(function () {
    Route::get('/anekdot/{note}/foto', [AnecdotalNoteController::class, 'photo'])->name('anecdotes.photo');
});

Route::middleware(['auth', 'password.changed', 'role:orang_tua'])->prefix('ortu')->group(function () {
    Route::get('/profil', [OrtuProfileController::class, 'index'])->name('ortu.profile');
    Route::get('/tagihan', [InvoiceController::class, 'index'])->name('ortu.invoices');
    Route::get('/tagihan/{invoice}', [InvoiceController::class, 'show'])->name('ortu.invoices.show');
    Route::get('/perkembangan', [DevelopmentController::class, 'index'])->name('ortu.development');
    Route::get('/perkembangan/{student}/laporan', [OrtuStudentReportController::class, 'pdf'])->name('ortu.student-report.pdf');
    Route::post('/tagihan/{invoice}/bukti', [InvoiceController::class, 'upload'])->name('ortu.invoices.upload');
    Route::get('/pembayaran/{payment}/bukti', [PaymentProofController::class, 'download'])->name('ortu.payments.proof');
    Route::get('/tagihan/{invoice}/kuitansi', [ReceiptController::class, 'download'])->name('ortu.invoices.receipt');
});
