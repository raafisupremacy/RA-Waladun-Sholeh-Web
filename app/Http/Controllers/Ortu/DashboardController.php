<?php

namespace App\Http\Controllers\Ortu;

use App\Enums\AnnouncementStatus;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\DailyJournal;
use App\Models\Invoice;
use App\Services\ParentStudentContext;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request, ParentStudentContext $context)
    {
        $students = $context->students($request->user());
        $student = $context->resolve($request);
        $classroomIds = $student?->enrollments->pluck('classroom_id')->filter() ?? collect();
        $invoice = $student ? Invoice::where('student_id', $student->id)->latest('due_date')->first() : null;
        $journal = $student ? DailyJournal::with('assessments')->where('student_id', $student->id)->where('status', 'final')->latest('journal_date')->first() : null;
        $announcements = Announcement::where('status', AnnouncementStatus::Published->value)
            ->whereNotNull('published_at')->where('published_at', '<=', now())
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn ($query) => $query->whereNull('classroom_id')->orWhereIn('classroom_id', $classroomIds))
            ->orderByDesc('is_pinned')->latest('published_at')->limit(5)->get()
            ->map(fn ($item) => ['id' => $item->id, 'title' => $item->title, 'body' => $item->body, 'is_pinned' => (bool) $item->is_pinned, 'published_at' => $item->published_at?->toDateString()])->values();

        return Inertia::render('Ortu/Dashboard', [
            'students' => $students->map(fn ($item) => ['id' => $item->id, 'name' => $item->name, 'nis' => $item->nis, 'classroom' => $item->enrollments->first()?->classroom?->name])->values(),
            'activeStudentId' => $student?->id,
            'invoice' => $invoice ? ['id' => $invoice->id, 'invoice_number' => $invoice->invoice_number, 'status' => $invoice->status->value, 'amount' => $invoice->amount, 'discount_amount' => $invoice->discount_amount, 'net_amount' => $invoice->net_amount, 'due_date' => $invoice->due_date?->toDateString(), 'paid_at' => $invoice->paid_at?->toISOString()] : null,
            'journal' => $journal ? ['id' => $journal->id, 'journal_date' => $journal->journal_date?->toDateString(), 'assessments' => $journal->assessments->map(fn ($item) => ['aspect' => $item->aspect->value, 'level' => $item->level->value, 'note' => $item->note])->values()] : null,
            'announcements' => $announcements,
        ]);
    }
}
