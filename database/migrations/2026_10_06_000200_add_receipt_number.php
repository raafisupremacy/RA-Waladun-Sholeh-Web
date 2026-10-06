<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_ledger_entries', function (Blueprint $table) {
            $table->string('receipt_number')->unique()->after('amount_in');
        });
    }

    public function down(): void
    {
        Schema::table('cash_ledger_entries', fn (Blueprint $table) => $table->dropUnique(['receipt_number']));
        Schema::table('cash_ledger_entries', fn (Blueprint $table) => $table->dropColumn('receipt_number'));
    }
};
