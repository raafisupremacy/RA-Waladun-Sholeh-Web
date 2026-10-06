<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false)->index();
            $table->timestamps();
        });
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('nip')->unique();
            $table->string('phone');
            $table->timestamps();
        });
        Schema::create('guardians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('phone');
            $table->text('address');
            $table->timestamps();
        });
        Schema::create('classrooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained()->restrictOnDelete();
            $table->foreignId('homeroom_teacher_id')->nullable()->constrained('teachers')->restrictOnDelete();
            $table->string('name');
            $table->string('age_range');
            $table->timestamps();
            $table->unique(['academic_year_id', 'name']);
            $table->unique(['academic_year_id', 'homeroom_teacher_id']);
        });
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('nis')->unique();
            $table->string('name');
            $table->date('birth_date');
            $table->enum('gender', ['L', 'P']);
            $table->unsignedSmallInteger('entry_year');
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif')->index();
            $table->timestamps();
        });
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('classroom_id')->constrained()->restrictOnDelete();
            $table->foreignId('academic_year_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['aktif', 'pindah', 'selesai'])->default('aktif')->index();
            $table->timestamps();
            $table->unique(['student_id', 'academic_year_id']);
        });
        Schema::create('guardian_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guardian_id')->constrained()->restrictOnDelete();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->enum('relationship', ['ayah', 'ibu', 'wali']);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->unique(['guardian_id', 'student_id']);
        });
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('academic_year_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('period_month');
            $table->unsignedSmallInteger('period_year');
            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->date('due_date');
            $table->enum('status', ['belum_bayar', 'menunggu_verifikasi', 'lunas', 'ditolak'])->default('belum_bayar')->index();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'period_month', 'period_year']);
            $table->index('due_date');
        });
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->restrictOnDelete();
            $table->foreignId('submitted_by')->constrained('users')->restrictOnDelete();
            $table->string('proof_path');
            $table->unsignedBigInteger('amount_transferred');
            $table->date('transfer_date');
            $table->string('sender_name');
            $table->text('note')->nullable();
            $table->enum('status', ['menunggu', 'disetujui', 'ditolak'])->default('menunggu')->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
        Schema::create('cash_ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('payment_id')->constrained()->restrictOnDelete();
            $table->date('entry_date');
            $table->string('description');
            $table->unsignedBigInteger('amount_in');
            $table->timestamps();
        });
        Schema::create('daily_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('classroom_id')->constrained()->restrictOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->restrictOnDelete();
            $table->date('journal_date');
            $table->string('activity_summary');
            $table->enum('status', ['draf', 'final'])->default('draf')->index();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'journal_date']);
        });
        Schema::create('journal_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_journal_id')->constrained()->restrictOnDelete();
            $table->enum('aspect', ['nilai_agama_moral', 'fisik_motorik', 'kognitif', 'bahasa', 'sosial_emosional']);
            $table->enum('level', ['BB', 'MB', 'BSH', 'BSB']);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->unique(['daily_journal_id', 'aspect']);
        });
        Schema::create('anecdotal_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->restrictOnDelete();
            $table->dateTime('noted_at');
            $table->text('observed_behavior');
            $table->text('interpretation');
            $table->text('follow_up');
            $table->string('photo_path')->nullable();
            $table->timestamps();
        });
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('classroom_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('title');
            $table->text('body');
            $table->boolean('is_pinned')->default(false);
            $table->enum('status', ['draf', 'terbit'])->default('draf')->index();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('action');
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        foreach (['audit_logs', 'announcements', 'anecdotal_notes', 'journal_assessments', 'daily_journals', 'cash_ledger_entries', 'payments', 'invoices', 'guardian_student', 'enrollments', 'students', 'classrooms', 'guardians', 'teachers', 'academic_years', 'school_settings'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
