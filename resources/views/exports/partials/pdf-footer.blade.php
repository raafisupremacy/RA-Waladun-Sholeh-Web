<style>
    .pdf-footer { position: fixed; bottom: -8mm; left: 0; right: 0; text-align: center; border-top: .5px solid #D1D1D6; padding-top: 3mm; font-size: 8pt; color: #6E6E73; }
    .pdf-footer .page-number:after { content: counter(page) ' dari ' counter(pages); }
    tr { page-break-inside: avoid; }
</style>
<div class="pdf-footer">
    Dicetak pada {{ now()->timezone('Asia/Jakarta')->locale('id')->isoFormat('D MMMM Y, HH:mm') }} WIB oleh {{ auth()->user()?->name ?? 'Sistem' }} · {{ \App\Models\SchoolSetting::where('key', 'school_name')->value('value') ?? '' }} · {{ \App\Models\SchoolSetting::where('key', 'school_address')->value('value') ?? '' }} · Halaman <span class="page-number"></span>
</div>
