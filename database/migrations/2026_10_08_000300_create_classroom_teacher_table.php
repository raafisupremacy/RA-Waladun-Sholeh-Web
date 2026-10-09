<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classroom_teacher', function (Blueprint $table) {
            $table->id();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('pendamping');
            $table->timestamps();

            $table->unique(['classroom_id', 'teacher_id']);
        });

        // Migrate existing homeroom teachers into the pivot table
        if (Schema::hasTable('classrooms')) {
            $existing = DB::table('classrooms')
                ->whereNotNull('homeroom_teacher_id')
                ->get(['id', 'homeroom_teacher_id']);

            foreach ($existing as $row) {
                DB::table('classroom_teacher')->insertOrIgnore([
                    'classroom_id' => $row->id,
                    'teacher_id' => $row->homeroom_teacher_id,
                    'role' => 'wali_kelas',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('classroom_teacher');
    }
};
