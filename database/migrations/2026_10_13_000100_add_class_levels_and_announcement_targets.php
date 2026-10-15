<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('classrooms', function (Blueprint $table) {
            $table->enum('level', ['A', 'B'])->nullable()->after('name');
        });
        DB::table('classrooms')->whereIn('name', ['Kelompok A', 'A', 'A-1', 'A-2'])->update(['level' => 'A']);
        DB::table('classrooms')->whereIn('name', ['Kelompok B', 'B', 'B-1', 'B-2'])->update(['level' => 'B']);

        Schema::table('announcements', function (Blueprint $table) {
            $table->enum('target_level', ['A', 'B'])->nullable()->after('classroom_id');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', fn (Blueprint $table) => $table->dropColumn('target_level'));
        Schema::table('classrooms', fn (Blueprint $table) => $table->dropColumn('level'));
    }
};
