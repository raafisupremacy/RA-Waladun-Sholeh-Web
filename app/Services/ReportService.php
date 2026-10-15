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
            $query = Student::query()->where('students.status', 'aktif');
            $query->whereHas('enrollments', fn ($enrollment) => $enrollment
                ->where('status', 'aktif')
                ->whereDate('created_at', '<=', $date->copy()->endOfMonth())
                ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId)));
            $points[] = ['label' => $date->locale('id')->isoFormat('MMM'), 'period' => $date->format('Y-m'), 'total' => $query->count()];
        }

        return $points;
    }

    public function journalCompletion(int $month, int $year, ?int $academicYearId = null): array
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $dates = app(SchoolCalendarService::class)->schoolDays($start, $end)->map->toDateString();
        $schoolDays = $dates->count();

        $rosters = DB::table('enrollments')
            ->join('classrooms', 'classrooms.id', '=', 'enrollments.classroom_id')
            ->join('students', 'students.id', '=', 'enrollments.student_id')
            ->where('enrollments.status', 'aktif')
            ->where('students.status', 'aktif')
            ->when($academicYearId, fn ($query) => $query->where('enrollments.academic_year_id', $academicYearId))
            ->select('classrooms.id as classroom_id', 'classrooms.homeroom_teacher_id as teacher_id', 'classrooms.name as classroom_name', DB::raw('COUNT(DISTINCT enrollments.student_id) as student_count'))
            ->groupBy('classrooms.id', 'classrooms.homeroom_teacher_id', 'classrooms.name')
            ->get()
            ->keyBy('classroom_id');

        $activePairs = DB::table('enrollments')
            ->where('status', 'aktif')
            ->whereIn('classroom_id', $rosters->keys()->all())
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId))
            ->get(['classroom_id', 'student_id'])
            ->mapWithKeys(fn ($row) => ["{$row->classroom_id}:{$row->student_id}" => true]);
        $filled = DailyJournal::query()
            ->where('status', JournalStatus::Final->value)
            ->whereBetween('journal_date', [$start->toDateString(), $end->toDateString()])
            ->whereHas('student', fn ($student) => $student->where('status', 'aktif'))
            ->whereIn('classroom_id', $rosters->keys()->all())
            ->get(['classroom_id', 'student_id', 'journal_date'])
            ->filter(fn ($journal) => $dates->contains($journal->journal_date->toDateString()) && $activePairs->has("{$journal->classroom_id}:{$journal->student_id}"))
            ->groupBy('classroom_id')
            ->map(fn ($journals) => (object) ['total_journals' => $journals->count()]);

        $teachers = Teacher::query()->whereIn('id', $rosters->pluck('teacher_id')->filter()->unique())->get(['id', 'name'])->keyBy('id');

        return $rosters->map(function ($roster, $classroomId) use ($filled, $teachers, $schoolDays) {
            $students = (int) $roster->student_count;
            $totalJournals = (int) ($filled->get($classroomId)->total_journals ?? 0);
            $possible = $schoolDays * $students;
            $percentage = $possible > 0 ? min(100, round(($totalJournals / $possible) * 100, 1)) : 0;

            return [
                'classroom_id' => (int) $classroomId,
                'teacher_id' => $roster->teacher_id ? (int) $roster->teacher_id : null,
                'teacher_name' => $teachers->get($roster->teacher_id)?->name ?? 'Belum ditentukan',
                'classroom_name' => str_starts_with($roster->classroom_name, 'Kelompok ') ? $roster->classroom_name : 'Kelompok '.$roster->classroom_name,
                'filled' => $totalJournals,
                'possible' => $possible,
                'percentage' => $percentage,
            ];
        })->values()->all();
    }

    public function overdueQuery(int $days = 30, ?int $academicYearId = null, array $filters = []): Builder
    {
        return $this->financeQuery($filters)->reorder()
            ->whereIn('status', [InvoiceStatus::Unpaid->value, InvoiceStatus::Rejected->value])
            ->whereDate('due_date', '<', now('Asia/Jakarta')->startOfDay()->subDays($days)->toDateString())
            ->when($academicYearId, fn ($query) => $query->where('academic_year_id', $academicYearId));
    }

    public function overdueStudents(int $days = 30, ?int $academicYearId = null, array $filters = []): array
    {
        $rows = $this->overdueQuery($days, $academicYearId, $filters)
            ->select('student_id', DB::raw('SUM(amount - discount_amount) as outstanding_amount'), DB::raw('COUNT(*) as invoice_count'), DB::raw('MIN(due_date) as oldest_due_date'))
            ->groupBy('student_id')
            ->orderByDesc('outstanding_amount')
            ->get();

        $students = Student::query()->with(['enrollments' => fn ($q) => $q->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId))->with('classroom')])->whereIn('id', $rows->pluck('student_id'))->get()->keyBy('id');

        $unpaidInvoices = $this->overdueQuery($days, $academicYearId, $filters)
            ->whereIn('student_id', $rows->pluck('student_id'))
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
                'classroom' => $students->get($row->student_id)?->enrollments->first()?->classroom?->display_name ?? '—',
                'months' => $months ?: 'Bulan tertunggak',
                'amount' => (int) $row->outstanding_amount,
                'invoice_count' => (int) $row->invoice_count,
                'oldest_due_date' => $row->oldest_due_date,
                'late_days' => (int) Carbon::parse($row->oldest_due_date, 'Asia/Jakarta')->startOfDay()->diffInDays(now('Asia/Jakarta')->startOfDay()),
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
        $end = isset($filters['end_date']) ? Carbon::parse($filters['end_date'], 'Asia/Jakarta')->endOfDay() : now('Asia/Jakarta')->endOfDay();
        $start = $end->copy()->startOfMonth()->subMonths($months - 1);
        $query = CashLedgerEntry::query()
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->when($filters['academic_year_id'] ?? null, fn ($q, $id) => $q->whereHas('invoice', fn ($invoice) => $invoice->where('academic_year_id', $id)))
            ->when($filters['classroom_id'] ?? null, fn ($q, $id) => $q->whereHas('invoice.student.enrollments', fn ($enrollment) => $enrollment->where('classroom_id', $id)->when($filters['academic_year_id'] ?? null, fn ($year) => $year->where('academic_year_id', $filters['academic_year_id']))));
        if (! empty($filters['start_date'])) {
            $query->whereDate('entry_date', '>=', Carbon::parse($filters['start_date'], 'Asia/Jakarta')->toDateString());
        }
        $period = DB::connection()->getDriverName() === 'mysql' ? "DATE_FORMAT(entry_date, '%Y-%m')" : "strftime('%Y-%m', entry_date)";
        $rows = $query->selectRaw("{$period} as period, SUM(amount_in) as total")
            ->groupByRaw($period)->pluck('total', 'period');

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
            ->map(fn ($c) => "{$c->display_name} {$c->enrollments_count}")
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

        $startDate = Carbon::parse($academicYear->start_date, 'Asia/Jakarta')->startOfDay();
        $endDate = Carbon::parse($academicYear->end_date, 'Asia/Jakarta')->endOfDay();

        $periodLabel = 'Semester 1 (Juli – Des '.$startDate->year.')';
        if ($period === 'semester_1') {
            $startDate = $startDate->copy()->startOfDay();
            $endDate = $startDate->copy()->addMonths(5)->endOfMonth()->endOfDay();
            $periodLabel = 'Semester 1 (Juli – Des '.$startDate->year.')';
        } elseif ($period === 'semester_2') {
            $startDate = $endDate->copy()->subMonths(5)->startOfMonth()->startOfDay();
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
            ->whereBetween('noted_at', [$startDate, $endDate])
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
        $schoolName = $schoolSettings->get('school_name', '');

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
            'classroom' => $enrollment?->classroom?->display_name ?? '—',
            'classroom_age' => $enrollment?->classroom?->age_range ?? 'Usia 4–5 Tahun',
            'teacher' => $teacher?->name ?? 'Wali Kelas',
            'teacher_nip' => $teacher?->nip ?? 'NIP. —',
            'principal' => $principalUser?->name ?? 'Kepala Sekolah',
            'principal_nip' => $principalTeacher?->nip ?? 'NIP. —',
            'city_date' => 'Jakarta, '.now()->locale('id')->isoFormat('D MMMM Y'),
            'assessments' => $assessments,
            'narratives' => $notes->groupBy(fn ($note) => $note->aspect instanceof \BackedEnum ? $note->aspect->value : $note->aspect)->map(fn ($items) => $items->pluck('note')->take(2)->values()->all())->all(),
            'anecdotes' => $anecdotes,
            'is_complete' => $assessments->isNotEmpty(),
        ];
    }

    public function classSummaryReport(?int $academicYearId = null): array
    {
        $cutoff = now('Asia/Jakarta')->subDays(30)->startOfDay()->toDateString();
        $rows = DB::table('classrooms')
            ->leftJoin('teachers', 'teachers.id', '=', 'classrooms.homeroom_teacher_id')
            ->leftJoin('enrollments', fn ($join) => $join->on('enrollments.classroom_id', '=', 'classrooms.id')->where('enrollments.status', 'aktif'))
            ->leftJoin('students', fn ($join) => $join->on('students.id', '=', 'enrollments.student_id')->where('students.status', 'aktif'))
            ->leftJoin('invoices', function ($join) use ($academicYearId) {
                $join->on('invoices.student_id', '=', 'students.id');
                if ($academicYearId) {
                    $join->where('invoices.academic_year_id', $academicYearId);
                }
            })
            ->when($academicYearId, fn ($query) => $query->where('classrooms.academic_year_id', $academicYearId))
            ->select([
                'classrooms.id', 'classrooms.name', 'teachers.name as teacher_name',
                DB::raw('COUNT(DISTINCT enrollments.student_id) as student_count'),
                DB::raw("SUM(CASE WHEN invoices.status = 'lunas' THEN 1 ELSE 0 END) as paid_count"),
                DB::raw("SUM(CASE WHEN invoices.id IS NOT NULL AND invoices.status <> 'lunas' THEN 1 ELSE 0 END) as unpaid_count"),
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw("SUM(CASE WHEN invoices.status = 'menunggu_verifikasi' THEN 1 ELSE 0 END) as pending_count"),
                DB::raw("SUM(CASE WHEN invoices.status IN ('belum_bayar', 'ditolak') AND invoices.due_date < '{$cutoff}' THEN 1 ELSE 0 END) as overdue_count"),
                DB::raw("COALESCE(SUM(CASE WHEN invoices.status = 'lunas' THEN invoices.amount - invoices.discount_amount ELSE 0 END), 0) as received_amount"),
                DB::raw("COALESCE(SUM(CASE WHEN invoices.id IS NOT NULL AND invoices.status <> 'lunas' THEN invoices.amount - invoices.discount_amount ELSE 0 END), 0) as outstanding_amount"),
            ])
            ->groupBy('classrooms.id', 'classrooms.name', 'teachers.name')
            ->orderBy('classrooms.name')
            ->get()
            ->map(function ($row) {
                $paid = (int) $row->paid_count;
                $unpaid = (int) $row->unpaid_count;

                return [
                    'id' => (int) $row->id,
                    'name' => str_starts_with($row->name, 'Kelompok ') ? $row->name : 'Kelompok '.$row->name,
                    'teacher_name' => $row->teacher_name ?? 'Belum ditentukan',
                    'student_count' => (int) $row->student_count,
                    'paid_count' => $paid,
                    'unpaid_count' => $unpaid,
                    'invoice_count' => (int) $row->invoice_count,
                    'pending_count' => (int) $row->pending_count,
                    'overdue_count' => (int) $row->overdue_count,
                    'received_amount' => (int) $row->received_amount,
                    'outstanding_amount' => (int) $row->outstanding_amount,
                    'achievement_percentage' => ($paid + $unpaid) > 0 ? round(($paid / ($paid + $unpaid)) * 100, 1) : 0,
                ];
            })->all();

        $totalStudents = array_sum(array_column($rows, 'student_count'));
        $totalPaid = array_sum(array_column($rows, 'paid_count'));
        $totalUnpaid = array_sum(array_column($rows, 'unpaid_count'));
        $totalPending = array_sum(array_column($rows, 'pending_count'));
        $totalOverdue = array_sum(array_column($rows, 'overdue_count'));
        $totalReceived = array_sum(array_column($rows, 'received_amount'));
        $totalOutstanding = array_sum(array_column($rows, 'outstanding_amount'));

        return [
            'classes' => $rows,
            'totals' => [
                'student_count' => $totalStudents,
                'paid_count' => $totalPaid,
                'unpaid_count' => $totalUnpaid,
                'invoice_count' => $totalPaid + $totalUnpaid,
                'pending_count' => $totalPending,
                'overdue_count' => $totalOverdue,
                'received_amount' => (int) $totalReceived,
                'outstanding_amount' => (int) $totalOutstanding,
                'achievement_percentage' => ($totalPaid + $totalUnpaid) > 0 ? round(($totalPaid / ($totalPaid + $totalUnpaid)) * 100, 1) : 0,
            ],
        ];
    }
}
