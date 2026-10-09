<?php

namespace App\Services;

use App\Enums\AnnouncementStatus;
use App\Enums\InvoiceStatus;
use App\Enums\JournalStatus;
use App\Models\AcademicYear;
use App\Models\AnecdotalNote;
use App\Models\Announcement;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Invoice;
use App\Models\JournalAssessment;
use App\Models\Payment;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function tuitionSummary(int $month, int $year, ?int $academicYearId = null): array
    {
        $query = Invoice::query()->where('period_month', $month)->where('period_year', $year);
        if ($academicYearId) {
            $query->where('academic_year_id', $academicYearId);
        }

        $rows = $query->select(['status', DB::raw('COUNT(*) as invoice_count'), DB::raw('SUM(amount - discount_amount) as total_amount')])->groupBy('status')->get();
        $composition = ['lunas' => ['count' => 0, 'amount' => 0], 'menunggu_verifikasi' => ['count' => 0, 'amount' => 0], 'belum_bayar' => ['count' => 0, 'amount' => 0]];
        foreach ($rows as $row) {
            $key = $row->status instanceof InvoiceStatus ? $row->status->value : $row->status;
            $key = $key === InvoiceStatus::Rejected->value ? InvoiceStatus::Unpaid->value : $key;
            if (isset($composition[$key])) {
                $composition[$key]['count'] += (int) $row->invoice_count;
                $composition[$key]['amount'] += (int) $row->total_amount;
            }
        }
        $total = array_sum(array_column($composition, 'count'));
        $paid = $composition['lunas']['count'];

        return ['month' => $month, 'year' => $year, 'total_invoices' => $total, 'paid_percentage' => $total ? round($paid / $total * 100, 1) : 0, 'target_amount' => array_sum(array_column($composition, 'amount')), 'composition' => $composition];
    }

    public function activeStudentTrend(?int $academicYearId, int $months = 4, ?Carbon $asOf = null): array
    {
        $asOf ??= now();
        $points = [];
        for ($offset = $months - 1; $offset >= 0; $offset--) {
            $date = $asOf->copy()->startOfMonth()->subMonths($offset);
            $query = Student::query()->where('students.status', 'aktif')->whereDate('students.created_at', '<=', $date->copy()->endOfMonth());
            if ($academicYearId) {
                $query->whereHas('enrollments', fn ($enrollment) => $enrollment->where('academic_year_id', $academicYearId));
            }
            $points[] = ['label' => $date->locale('id')->isoFormat('MMM'), 'period' => $date->format('Y-m'), 'total' => $query->count()];
        }

        return $points;
    }

    public function journalCompletion(int $month, int $year, ?int $academicYearId = null): array
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $schoolDays = $this->schoolDays($start, $end);

        $rosters = DB::table('enrollments')
            ->join('classrooms', 'classrooms.id', '=', 'enrollments.classroom_id')
            ->join('students', 'students.id', '=', 'enrollments.student_id')
            ->where('enrollments.status', 'aktif')
            ->where('students.status', 'aktif')
            ->when($academicYearId, fn ($query) => $query->where('enrollments.academic_year_id', $academicYearId))
            ->select('classrooms.homeroom_teacher_id as teacher_id', 'classrooms.name as classroom_name', DB::raw('COUNT(DISTINCT enrollments.student_id) as student_count'))
            ->groupBy('classrooms.homeroom_teacher_id', 'classrooms.name')
            ->get()
            ->keyBy('teacher_id');

        $filled = DailyJournal::query()
            ->where('status', JournalStatus::Final->value)
            ->whereBetween('journal_date', [$start->toDateString(), $end->toDateString()])
            ->when($academicYearId, fn ($query) => $query->whereHas('classroom', fn ($classroom) => $classroom->where('academic_year_id', $academicYearId)))
            ->select('teacher_id', DB::raw('COUNT(*) as total_journals'), DB::raw('COUNT(DISTINCT journal_date) as journal_days'))
            ->groupBy('teacher_id')
            ->get()
            ->keyBy('teacher_id');

        $teachers = Teacher::query()->whereIn('id', $rosters->keys())->get(['id', 'name'])->keyBy('id');

        return $rosters->map(function ($roster, $teacherId) use ($filled, $teachers, $schoolDays) {
            $students = (int) $roster->student_count;
            $totalJournals = (int) ($filled->get($teacherId)->total_journals ?? 0);
            $journalDays = (int) ($filled->get($teacherId)->journal_days ?? 0);
            $effectiveDays = $journalDays > 0 ? $journalDays : max(1, $schoolDays);
            $avgDailyFilled = $effectiveDays > 0 ? (int) round($totalJournals / $effectiveDays) : 0;
            $percentage = $students > 0 ? round(($avgDailyFilled / $students) * 100, 1) : 0;

            return [
                'teacher_id' => (int) $teacherId,
                'teacher_name' => $teachers->get($teacherId)?->name ?? 'Belum ditentukan',
                'classroom_name' => $roster->classroom_name ?? '',
                'filled' => $avgDailyFilled,
                'possible' => $students,
                'percentage' => $percentage,
            ];
        })->values()->all();
    }

    public function overdueStudents(int $days = 30, ?int $academicYearId = null): array
    {
        $cutoff = now()->subDays($days)->toDateString();
        $rows = Invoice::query()
            ->where('status', InvoiceStatus::Unpaid->value)
            ->whereDate('due_date', '<', $cutoff)
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->select('student_id', DB::raw('SUM(amount - discount_amount) as outstanding_amount'), DB::raw('COUNT(*) as invoice_count'), DB::raw('MIN(due_date) as oldest_due_date'))
            ->groupBy('student_id')
            ->orderByDesc('outstanding_amount')
            ->get();

        $students = Student::query()->with(['enrollments.classroom'])->whereIn('id', $rows->pluck('student_id'))->get()->keyBy('id');

        $unpaidInvoices = Invoice::query()
            ->whereIn('student_id', $rows->pluck('student_id'))
            ->where('status', InvoiceStatus::Unpaid->value)
            ->whereDate('due_date', '<', $cutoff)
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->orderBy('period_year')
            ->orderBy('period_month')
            ->get(['student_id', 'period_month', 'period_year'])
            ->groupBy('student_id');

        return $rows->map(function ($row) use ($students, $unpaidInvoices) {
            $months = ($unpaidInvoices->get($row->student_id) ?? collect())->map(function ($inv) {
                return Carbon::create($inv->period_year, $inv->period_month, 1)->locale('id')->isoFormat('MMMM Y');
            })->unique()->implode(', ');

            return [
                'student_id' => (int) $row->student_id,
                'student_name' => $students->get($row->student_id)?->name ?? '—',
                'classroom' => $students->get($row->student_id)?->enrollments->first()?->classroom?->name ?? '—',
                'months' => $months ?: 'Bulan tertunggak',
                'amount' => (int) $row->outstanding_amount,
                'invoice_count' => (int) $row->invoice_count,
                'oldest_due_date' => $row->oldest_due_date,
                'status' => 'Menunggak >30 hari',
            ];
        })->all();
    }

    public function financeQuery(array $filters): Builder
    {
        return Invoice::query()->with(['student', 'student.enrollments.classroom'])->when($filters['start_date'] ?? null, fn ($query, $date) => $query->whereDate('due_date', '>=', $date))->when($filters['end_date'] ?? null, fn ($query, $date) => $query->whereDate('due_date', '<=', $date))->when($filters['academic_year_id'] ?? null, fn ($query, $id) => $query->where('academic_year_id', $id))->when($filters['classroom_id'] ?? null, function ($query, $id) use ($filters) {
            $query->whereHas('student.enrollments', fn ($enrollment) => $enrollment->where('classroom_id', $id)->when($filters['academic_year_id'] ?? null, fn ($year) => $year->where('academic_year_id', $filters['academic_year_id'])));
        })->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))->latest('due_date');
    }

    public function financeTotals(array $filters): array
    {
        $row = (clone $this->financeQuery($filters))->reorder()->toBase()->selectRaw("SUM(CASE WHEN status = 'lunas' THEN amount - discount_amount ELSE 0 END) as received, SUM(CASE WHEN status != 'lunas' THEN amount - discount_amount ELSE 0 END) as unreceived, COUNT(*) as invoice_count")->first();

        return ['received' => (int) ($row->received ?? 0), 'unreceived' => (int) ($row->unreceived ?? 0), 'invoice_count' => (int) ($row->invoice_count ?? 0)];
    }

    public function monthlyReceived(array $filters = [], int $months = 4): array
    {
        $end = isset($filters['end_date']) ? Carbon::parse($filters['end_date'])->endOfMonth() : now()->endOfMonth();
        $start = $end->copy()->startOfMonth()->subMonths($months - 1);
        $rows = CashLedgerEntry::query()->whereBetween('entry_date', [$start->toDateString(), $end->toDateString()])->get(['entry_date', 'amount_in'])->groupBy(fn ($entry) => Carbon::parse($entry->entry_date)->format('Y-m'))->map(fn ($items) => $items->sum('amount_in'));

        return collect(range(0, $months - 1))->map(function ($offset) use ($start, $rows) {
            $date = $start->copy()->addMonths($offset);

            return ['label' => $date->locale('id')->isoFormat('MMM'), 'period' => $date->format('Y-m'), 'total' => (int) ($rows[$date->format('Y-m')] ?? 0)];
        })->all();
    }

    public function adminDashboard(): array
    {
        $month = now()->month;
        $year = now()->year;
        $activeAnnouncementsCount = Announcement::where('status', AnnouncementStatus::Published->value)->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))->count();

        $activeAnnouncements = Announcement::where('status', AnnouncementStatus::Published->value)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderByDesc('is_pinned')
            ->latest('published_at')
            ->limit(2)
            ->get(['id', 'title', 'published_at'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'date' => $a->published_at ? Carbon::parse($a->published_at)->locale('id')->isoFormat('D MMM Y') : '',
            ])
            ->all();

        $recent = Payment::with('invoice.student')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn ($payment) => [
                'id' => $payment->id,
                'student' => $payment->invoice?->student?->name ?? '—',
                'month' => $payment->invoice?->period_month,
                'year' => $payment->invoice?->period_year,
                'month_label' => $payment->invoice?->period_month && $payment->invoice?->period_year
                    ? Carbon::create($payment->invoice->period_year, $payment->invoice->period_month, 1)->locale('id')->isoFormat('MMM Y')
                    : '—',
                'amount' => (int) ($payment->invoice?->net_amount ?? $payment->amount_transferred ?? 0),
                'status' => $payment->status instanceof \BackedEnum ? $payment->status->value : $payment->status,
                'uploaded_at' => $payment->created_at ? Carbon::parse($payment->created_at)->locale('id')->isoFormat('HH:mm [WIB]') : '—',
                'invoice_id' => $payment->invoice_id,
            ])
            ->all();

        $classBreakdown = Classroom::withCount(['enrollments' => fn ($q) => $q->where('status', 'aktif')->whereHas('student', fn ($s) => $s->where('status', 'aktif'))])
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => "{$c->name} {$c->enrollments_count}")
            ->implode(' · ');

        $latestPending = Payment::where('status', 'menunggu')->latest()->first();
        $latestPendingText = $latestPending
            ? 'Terakhir masuk '.Carbon::parse($latestPending->created_at)->locale('id')->diffForHumans()
            : 'Tidak ada pembayaran menunggu';

        $txCount = (int) CashLedgerEntry::whereMonth('entry_date', $month)->whereYear('entry_date', $year)->count();

        return [
            'metrics' => [
                'active_students' => Student::where('status', 'aktif')->count(),
                'students_breakdown' => $classBreakdown,
                'pending_payments' => Payment::where('status', 'menunggu')->count(),
                'latest_pending_text' => $latestPendingText,
                'unpaid_invoices' => Invoice::where('period_month', $month)->where('period_year', $year)->where('status', 'belum_bayar')->count(),
                'received_this_month' => (int) CashLedgerEntry::whereMonth('entry_date', $month)->whereYear('entry_date', $year)->sum('amount_in'),
                'transactions_count' => $txCount,
                'active_announcements' => $activeAnnouncementsCount,
                'announcements' => $activeAnnouncements,
            ],
            'recent_payments' => $recent,
        ];
    }

    public function studentReport(Student $student, AcademicYear $academicYear, ?string $period = 'semester_1'): array
    {
        $enrollment = $student->enrollments()->with(['classroom.homeroomTeacher'])->where('academic_year_id', $academicYear->id)->first();

        $startDate = Carbon::parse($academicYear->start_date);
        $endDate = Carbon::parse($academicYear->end_date);

        $periodLabel = 'Semester 1 (Juli – Des '.$startDate->year.')';
        if ($period === 'semester_1') {
            $startDate = $startDate->copy()->startOfDay();
            $endDate = $startDate->copy()->addMonths(5)->endOfMonth();
            $periodLabel = 'Semester 1 (Juli – Des '.$startDate->year.')';
        } elseif ($period === 'semester_2') {
            $startDate = $endDate->copy()->subMonths(5)->startOfMonth();
            $endDate = $endDate->copy()->endOfDay();
            $periodLabel = 'Semester 2 (Jan – Jun '.$endDate->year.')';
        }

        $assessmentRows = JournalAssessment::query()
            ->whereHas('dailyJournal', fn ($journal) => $journal->where('student_id', $student->id)->where('status', JournalStatus::Final->value)->whereBetween('journal_date', [$startDate->toDateString(), $endDate->toDateString()]))
            ->select('aspect', 'level', DB::raw('COUNT(*) as total'))
            ->groupBy('aspect', 'level')
            ->get();

        $notes = JournalAssessment::query()
            ->with('dailyJournal')
            ->whereHas('dailyJournal', fn ($journal) => $journal->where('student_id', $student->id)->where('status', JournalStatus::Final->value)->whereBetween('journal_date', [$startDate->toDateString(), $endDate->toDateString()]))
            ->whereNotNull('note')
            ->where('note', '!=', '')
            ->latest('id')
            ->get(['aspect', 'note', 'daily_journal_id']);

        $assessments = collect();
        foreach ($assessmentRows as $row) {
            $aspect = $row->aspect instanceof \BackedEnum ? $row->aspect->value : $row->aspect;
            $level = $row->level instanceof \BackedEnum ? $row->level->value : $row->level;
            $current = $assessments->get($aspect, []);
            $current[$level] = (int) $row->total;
            $assessments->put($aspect, $current);
        }

        $anecdotes = AnecdotalNote::query()
            ->where('student_id', $student->id)
            ->whereBetween('noted_at', [$startDate->toDateString(), $endDate->toDateString()])
            ->latest('noted_at')
            ->limit(3)
            ->get(['noted_at', 'observed_behavior', 'interpretation'])
            ->map(fn ($note) => [
                'date' => $note->noted_at ? Carbon::parse($note->noted_at)->locale('id')->isoFormat('D MMM Y') : '',
                'text' => trim($note->observed_behavior.' '.$note->interpretation),
            ])
            ->all();

        $principalUser = User::whereHas('roles', fn ($query) => $query->where('name', 'kepala_sekolah'))->first();
        $principalTeacher = $principalUser ? Teacher::where('user_id', $principalUser->id)->first() : null;
        $teacher = $enrollment?->classroom?->homeroomTeacher;

        $schoolSettings = DB::table('school_settings')->pluck('value', 'key');
        $schoolName = $schoolSettings->get('school_name', config('app.name', 'TK Tunas Harapan'));

        return [
            'school_name' => $schoolName,
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'nis' => $student->nis,
                'gender' => $student->gender?->value ?? $student->gender,
            ],
            'academic_year' => [
                'id' => $academicYear->id,
                'name' => $academicYear->name,
                'start_date' => $academicYear->start_date?->toDateString(),
                'end_date' => $academicYear->end_date?->toDateString(),
            ],
            'period' => $period,
            'period_label' => $periodLabel,
            'classroom' => $enrollment?->classroom?->name ?? '—',
            'classroom_age' => $enrollment?->classroom?->age_range ?? 'Usia 4–5 Tahun',
            'teacher' => $teacher?->name ?? 'Wali Kelas',
            'teacher_nip' => $teacher?->nip ?? 'NIP. —',
            'principal' => $principalUser?->name ?? 'Ibu Dra. Hartini',
            'principal_nip' => $principalTeacher?->nip ?? 'NIP. 197406121998032001',
            'city_date' => 'Jakarta, '.now()->locale('id')->isoFormat('D MMMM Y'),
            'assessments' => $assessments,
            'narratives' => $notes->groupBy(fn ($note) => $note->aspect instanceof \BackedEnum ? $note->aspect->value : $note->aspect)->map(fn ($items) => $items->pluck('note')->take(2)->values())->all(),
            'anecdotes' => $anecdotes,
            'is_complete' => $assessments->isNotEmpty(),
        ];
    }

    public function classSummaryReport(?int $academicYearId = null): array
    {
        $classrooms = Classroom::with(['homeroomTeacher', 'enrollments' => fn ($q) => $q->where('status', 'aktif')])
            ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->get();

        $rows = [];
        $totalStudents = 0;
        $totalPaid = 0;
        $totalUnpaid = 0;
        $totalReceived = 0;
        $totalOutstanding = 0;

        foreach ($classrooms as $classroom) {
            $studentIds = $classroom->enrollments->pluck('student_id');
            $studentCount = $studentIds->count();
            $totalStudents += $studentCount;

            $invoices = Invoice::whereIn('student_id', $studentIds)
                ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId))
                ->get();

            $paidInvoices = $invoices->where('status', InvoiceStatus::Paid);
            $unpaidInvoices = $invoices->where('status', '!=', InvoiceStatus::Paid);

            $paidCount = $paidInvoices->count();
            $unpaidCount = $unpaidInvoices->count();
            $received = $paidInvoices->sum(fn ($i) => $i->amount - $i->discount_amount);
            $outstanding = $unpaidInvoices->sum(fn ($i) => $i->amount - $i->discount_amount);

            $totalPaid += $paidCount;
            $totalUnpaid += $unpaidCount;
            $totalReceived += $received;
            $totalOutstanding += $outstanding;

            $totalInv = $paidCount + $unpaidCount;
            $pct = $totalInv > 0 ? round(($paidCount / $totalInv) * 100, 1) : 0;

            $rows[] = [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'teacher_name' => $classroom->homeroomTeacher?->name ?? 'Belum ditentukan',
                'student_count' => $studentCount,
                'paid_count' => $paidCount,
                'unpaid_count' => $unpaidCount,
                'received_amount' => (int) $received,
                'outstanding_amount' => (int) $outstanding,
                'achievement_percentage' => $pct,
            ];
        }

        return [
            'classes' => $rows,
            'totals' => [
                'student_count' => $totalStudents,
                'paid_count' => $totalPaid,
                'unpaid_count' => $totalUnpaid,
                'received_amount' => (int) $totalReceived,
                'outstanding_amount' => (int) $totalOutstanding,
                'achievement_percentage' => ($totalPaid + $totalUnpaid) > 0 ? round(($totalPaid / ($totalPaid + $totalUnpaid)) * 100, 1) : 0,
            ],
        ];
    }

    private function schoolDays(Carbon $start, Carbon $end): int
    {
        return collect(CarbonPeriod::create($start, $end))->filter(fn (Carbon $date) => $date->isWeekday())->count();
    }
}
