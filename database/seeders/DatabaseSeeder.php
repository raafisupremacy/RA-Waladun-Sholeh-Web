<?php

namespace Database\Seeders;

use App\Enums\AnnouncementStatus;
use App\Enums\AssessmentLevel;
use App\Enums\Gender;
use App\Enums\InvoiceStatus;
use App\Enums\JournalAspect;
use App\Enums\JournalStatus;
use App\Enums\PaymentStatus;
use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\CashLedgerEntry;
use App\Models\Classroom;
use App\Models\DailyJournal;
use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\JournalAssessment;
use App\Models\Payment;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $settings = [
            'school_name' => 'TK Tunas Harapan', 'school_address' => '[ISI: alamat sekolah]', 'school_phone' => '[ISI: nomor telepon]',
            'bank_name' => '[ISI: nama bank]', 'bank_account_number' => '[ISI: nomor rekening]', 'bank_account_holder' => '[ISI: nama pemilik rekening]', 'default_spp_amount' => '350000',
        ];
        foreach ($settings as $key => $value) {
            SchoolSetting::create(['key' => $key, 'value' => $value]);
        }

        $activeYear = AcademicYear::create(['name' => '2026/2027', 'start_date' => '2026-07-01', 'end_date' => '2027-06-30', 'is_active' => true]);
        AcademicYear::create(['name' => '2025/2026', 'start_date' => '2025-07-01', 'end_date' => '2026-06-30', 'is_active' => false]);
        $admin = $this->user('admin@skms.test', 'Admin Tata Usaha', 'admin', false);
        $principal = $this->user('kepsek@skms.test', 'Kepala Sekolah', 'kepala_sekolah', false);
        $demoTeacherUser = $this->user('guru@skms.test', 'Guru Demo', 'guru', false);
        $demoTeacher = Teacher::create(['user_id' => $demoTeacherUser->id, 'name' => 'Guru Demo', 'nip' => 'NIP-DEMO-001', 'phone' => '081200000001']);
        $teachers = collect([$demoTeacher]);
        for ($i = 2; $i <= 12; $i++) {
            $u = $this->user("guru{$i}@skms.test", "Guru {$i}", 'guru', true);
            $teachers->push(Teacher::create(['user_id' => $u->id, 'name' => "Guru {$i}", 'nip' => sprintf('NIP-DEMO-%03d', $i), 'phone' => sprintf('081200000%02d', $i)]));
        }
        $classA = Classroom::create(['academic_year_id' => $activeYear->id, 'homeroom_teacher_id' => $demoTeacher->id, 'name' => 'Kelompok A', 'age_range' => '4–5 tahun']);
        $classB = Classroom::create(['academic_year_id' => $activeYear->id, 'homeroom_teacher_id' => $teachers[1]->id, 'name' => 'Kelompok B', 'age_range' => '5–6 tahun']);

        $guardians = collect();
        $demoGuardianUser = $this->user('ortu@skms.test', 'Orang Tua Demo', 'orang_tua', false);
        $guardians->push(Guardian::create(['user_id' => $demoGuardianUser->id, 'name' => 'Orang Tua Demo', 'phone' => '081300000001', 'address' => '[ISI: alamat orang tua]']));
        for ($i = 2; $i <= 64; $i++) {
            $u = $this->user("ortu{$i}@skms.test", "Orang Tua {$i}", 'orang_tua', true);
            $guardians->push(Guardian::create(['user_id' => $u->id, 'name' => "Orang Tua {$i}", 'phone' => sprintf('081300000%02d', $i), 'address' => '[ISI: alamat orang tua]']));
        }
        $students = collect();
        for ($i = 1; $i <= 78; $i++) {
            $student = Student::create(['nis' => sprintf('2425-%03d', $i), 'name' => $this->studentName($i), 'birth_date' => sprintf('2021-%02d-%02d', (($i - 1) % 12) + 1, (($i - 1) % 27) + 1), 'gender' => $i % 2 ? Gender::Male->value : Gender::Female->value, 'entry_year' => 2025, 'status' => 'aktif']);
            $students->push($student);
            $classroom = $i <= 39 ? $classA : $classB;
            Enrollment::create(['student_id' => $student->id, 'classroom_id' => $classroom->id, 'academic_year_id' => $activeYear->id, 'status' => 'aktif']);
            $guardian = $guardians[$i <= 64 ? $i - 1 : $i - 65];
            $student->guardians()->attach($guardian->id, ['relationship' => $i % 2 ? 'ibu' : 'ayah', 'is_primary' => true]);
        }

        $amount = 350000;
        foreach ($students as $index => $student) {
            $number = $index + 1;
            $status = $number <= 63 ? InvoiceStatus::Paid : ($number <= 72 ? InvoiceStatus::Pending : InvoiceStatus::Unpaid);
            $invoice = Invoice::create(['invoice_number' => sprintf('INV-2026-10-%03d', $number), 'student_id' => $student->id, 'academic_year_id' => $activeYear->id, 'period_month' => 10, 'period_year' => 2026, 'amount' => $amount, 'discount_amount' => 0, 'due_date' => '2026-10-10', 'status' => $status]);
            if ($status === InvoiceStatus::Paid) {
                $payment = Payment::create(['invoice_id' => $invoice->id, 'submitted_by' => $guardians[$index < 64 ? $index : $index - 64]->user_id, 'proof_path' => "payments/demo-{$number}.pdf", 'amount_transferred' => $amount, 'transfer_date' => '2026-10-08', 'sender_name' => 'Orang Tua', 'status' => PaymentStatus::Approved, 'reviewed_by' => $admin->id, 'reviewed_at' => '2026-10-09']);
                $invoice->update(['paid_at' => '2026-10-09', 'verified_by' => $admin->id, 'verified_at' => '2026-10-09']);
                CashLedgerEntry::create(['invoice_id' => $invoice->id, 'payment_id' => $payment->id, 'entry_date' => '2026-10-09', 'description' => "Pembayaran SPP {$student->name}", 'amount_in' => $amount, 'receipt_number' => sprintf('KWT/2026/10/%03d', $number)]);
            } elseif ($status === InvoiceStatus::Pending) {
                Payment::create(['invoice_id' => $invoice->id, 'submitted_by' => $guardians[$index < 64 ? $index : $index - 64]->user_id, 'proof_path' => "payments/demo-{$number}.pdf", 'amount_transferred' => $amount, 'transfer_date' => '2026-10-08', 'sender_name' => 'Orang Tua', 'status' => PaymentStatus::Pending]);
            }
        }

        $schoolDays = collect(range(1, 31))->map(fn ($day) => sprintf('2026-10-%02d', $day))->filter(fn ($date) => date('N', strtotime($date)) <= 5)->values()->take(17);
        $aspects = array_column(JournalAspect::cases(), 'value');
        foreach ($schoolDays as $dayIndex => $date) {
            foreach ($students as $index => $student) {
                $limit = $index < 39 ? 0.92 : 0.74;
                if ((($index * 17 + $dayIndex) % 100) / 100 >= $limit) {
                    continue;
                }
                $enrollment = $student->enrollments()->first();
                $journal = DailyJournal::create(['student_id' => $student->id, 'classroom_id' => $enrollment->classroom_id, 'teacher_id' => $enrollment->classroom_id === $classA->id ? $demoTeacher->id : $teachers[1]->id, 'journal_date' => $date, 'activity_summary' => 'Kegiatan belajar dan bermain', 'status' => JournalStatus::Final, 'finalized_at' => $date.' 15:00:00']);
                foreach ($aspects as $aspect) {
                    JournalAssessment::create(['daily_journal_id' => $journal->id, 'aspect' => $aspect, 'level' => AssessmentLevel::BSH, 'note' => null]);
                }
            }
        }
        Announcement::create(['created_by' => $admin->id, 'title' => 'Pertemuan wali murid', 'body' => 'Informasi pertemuan wali murid bulan ini.', 'is_pinned' => true, 'status' => AnnouncementStatus::Published, 'published_at' => '2026-10-01']);
    }

    private function user(string $email, string $name, string $role, bool $mustChange): User
    {
        $user = User::create(['name' => $name, 'email' => $email, 'password' => Hash::make('password'), 'must_change_password' => $mustChange, 'is_active' => true, 'email_verified_at' => now()]);
        $user->assignRole($role);

        return $user;
    }

    private function studentName(int $index): string
    {
        return ['Aisyah Putri Ramadhani', 'Muhammad Fadhil', 'Kevin Santoso', 'Ni Luh Ayu', 'Zahra Nabila'][$index - 1] ?? "Siswa Demo {$index}";
    }
}
