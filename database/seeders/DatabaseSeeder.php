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
use App\Models\AnecdotalNote;
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
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['admin', 'guru', 'kepala_sekolah', 'orang_tua'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $settings = [
            'school_name' => 'RA Waladun Sholeh', 'school_address' => '[ISI: alamat sekolah]', 'school_phone' => '[ISI: nomor telepon]',
            'bank_name' => '[ISI: nama bank]', 'bank_account_number' => '[ISI: nomor rekening]', 'bank_account_holder' => '[ISI: nama pemilik rekening]', 'default_spp_amount' => '350000',
        ];
        foreach ($settings as $key => $value) {
            SchoolSetting::create(['key' => $key, 'value' => $value]);
        }

        if (! in_array(config('app.env'), ['local', 'testing'], true)) {
            $password = Str::random(32);
            $admin = User::firstOrCreate(['email' => 'admin@skms.test'], [
                'name' => 'Admin Tata Usaha',
                'password' => Hash::make($password),
                'must_change_password' => true,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $admin->assignRole('admin');
            $this->command?->line("Akun admin dibuat: {$admin->email} / {$password}");

            return;
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

        // Tagihan Agustus 2026 (periode 8): 75 lunas, 3 belum bayar (76..78)
        foreach ($students as $index => $student) {
            $number = $index + 1;
            $discount = in_array($number, [1, 65], true) ? 50000 : 0;
            $netAmount = $amount - $discount;
            $status = $number <= 75 ? InvoiceStatus::Paid : InvoiceStatus::Unpaid;
            $invoice = Invoice::create([
                'invoice_number' => sprintf('INV-2026-08-%03d', $number),
                'student_id' => $student->id,
                'academic_year_id' => $activeYear->id,
                'period_month' => 8,
                'period_year' => 2026,
                'amount' => $amount,
                'discount_amount' => $discount,
                'due_date' => '2026-08-10',
                'status' => $status,
            ]);

            if ($status === InvoiceStatus::Paid) {
                $payment = Payment::create([
                    'invoice_id' => $invoice->id,
                    'submitted_by' => $guardians[$index < 64 ? $index : $index - 64]->user_id,
                    'proof_path' => "payments/demo-aug-{$number}.pdf",
                    'amount_transferred' => $netAmount,
                    'transfer_date' => '2026-08-07',
                    'sender_name' => 'Orang Tua',
                    'status' => PaymentStatus::Approved,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => '2026-08-08',
                ]);
                $invoice->update(['paid_at' => '2026-08-08', 'verified_by' => $admin->id, 'verified_at' => '2026-08-08']);
                CashLedgerEntry::create([
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'entry_date' => '2026-08-08',
                    'description' => "Pembayaran SPP {$student->name}",
                    'amount_in' => $netAmount,
                    'receipt_number' => sprintf('KWT/2026/08/%03d', $number),
                ]);
            }
        }

        // Tagihan September 2026 (periode 9): 69 lunas, 3 ditolak (64..66), 6 belum bayar (73..78)
        $rejectionReasons = [
            64 => 'Nominal transfer tidak sesuai dengan tagihan SPP',
            65 => 'Bukti transfer buram dan tidak terbaca',
            66 => 'Bukan bukti transfer SPP (struk belanja)',
        ];
        foreach ($students as $index => $student) {
            $number = $index + 1;
            $discount = in_array($number, [1, 65], true) ? 50000 : 0;
            $netAmount = $amount - $discount;

            if ($number >= 73) {
                $status = InvoiceStatus::Unpaid;
            } elseif ($number >= 64 && $number <= 66) {
                $status = InvoiceStatus::Rejected;
            } else {
                $status = InvoiceStatus::Paid;
            }

            $invoice = Invoice::create([
                'invoice_number' => sprintf('INV-2026-09-%03d', $number),
                'student_id' => $student->id,
                'academic_year_id' => $activeYear->id,
                'period_month' => 9,
                'period_year' => 2026,
                'amount' => $amount,
                'discount_amount' => $discount,
                'due_date' => '2026-09-10',
                'status' => $status,
            ]);

            if ($status === InvoiceStatus::Paid) {
                $payment = Payment::create([
                    'invoice_id' => $invoice->id,
                    'submitted_by' => $guardians[$index < 64 ? $index : $index - 64]->user_id,
                    'proof_path' => "payments/demo-sep-{$number}.pdf",
                    'amount_transferred' => $netAmount,
                    'transfer_date' => '2026-09-07',
                    'sender_name' => 'Orang Tua',
                    'status' => PaymentStatus::Approved,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => '2026-09-08',
                ]);
                $invoice->update(['paid_at' => '2026-09-08', 'verified_by' => $admin->id, 'verified_at' => '2026-09-08']);
                CashLedgerEntry::create([
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'entry_date' => '2026-09-08',
                    'description' => "Pembayaran SPP {$student->name}",
                    'amount_in' => $netAmount,
                    'receipt_number' => sprintf('KWT/2026/09/%03d', $number),
                ]);
            } elseif ($status === InvoiceStatus::Rejected) {
                Payment::create([
                    'invoice_id' => $invoice->id,
                    'submitted_by' => $guardians[$index < 64 ? $index : $index - 64]->user_id,
                    'proof_path' => "payments/demo-sep-{$number}.pdf",
                    'amount_transferred' => $netAmount,
                    'transfer_date' => '2026-09-08',
                    'sender_name' => 'Orang Tua',
                    'status' => PaymentStatus::Rejected,
                    'rejection_reason' => $rejectionReasons[$number] ?? 'Bukti pembayaran tidak sesuai',
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => '2026-09-09',
                ]);
            }
        }

        // Tagihan Oktober 2026 (periode 10): 63 lunas, 9 menunggu verifikasi (64..72), 6 belum bayar (73..78)
        foreach ($students as $index => $student) {
            $number = $index + 1;
            $discount = in_array($number, [1, 65], true) ? 50000 : 0;
            $netAmount = $amount - $discount;
            $status = $number <= 63 ? InvoiceStatus::Paid : ($number <= 72 ? InvoiceStatus::Pending : InvoiceStatus::Unpaid);
            $invoice = Invoice::create([
                'invoice_number' => sprintf('INV-2026-10-%03d', $number),
                'student_id' => $student->id,
                'academic_year_id' => $activeYear->id,
                'period_month' => 10,
                'period_year' => 2026,
                'amount' => $amount,
                'discount_amount' => $discount,
                'due_date' => '2026-10-10',
                'status' => $status,
            ]);

            if ($status === InvoiceStatus::Paid) {
                $payment = Payment::create([
                    'invoice_id' => $invoice->id,
                    'submitted_by' => $guardians[$index < 64 ? $index : $index - 64]->user_id,
                    'proof_path' => "payments/demo-oct-{$number}.pdf",
                    'amount_transferred' => $netAmount,
                    'transfer_date' => '2026-10-08',
                    'sender_name' => 'Orang Tua',
                    'status' => PaymentStatus::Approved,
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => '2026-10-09',
                ]);
                $invoice->update(['paid_at' => '2026-10-09', 'verified_by' => $admin->id, 'verified_at' => '2026-10-09']);
                CashLedgerEntry::create([
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'entry_date' => '2026-10-09',
                    'description' => "Pembayaran SPP {$student->name}",
                    'amount_in' => $netAmount,
                    'receipt_number' => sprintf('KWT/2026/10/%03d', $number),
                ]);
            } elseif ($status === InvoiceStatus::Pending) {
                Payment::create([
                    'invoice_id' => $invoice->id,
                    'submitted_by' => $guardians[$index < 64 ? $index : $index - 64]->user_id,
                    'proof_path' => "payments/demo-oct-{$number}.pdf",
                    'amount_transferred' => $netAmount,
                    'transfer_date' => '2026-10-08',
                    'sender_name' => 'Orang Tua',
                    'status' => PaymentStatus::Pending,
                ]);
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

        // Catatan anekdot (12 catatan realistis: 6 di Kelompok A oleh Guru Demo, 6 di Kelompok B oleh Guru 2)
        $anecdotesData = [
            // Kelompok A (Guru Demo)
            [
                'student_id' => $students[0]->id,
                'teacher_id' => $demoTeacher->id,
                'noted_at' => '2026-10-02 09:30:00',
                'observed_behavior' => 'Membantu merapikan balok kayu mainan milik temannya tanpa diminta setelah selesai bermain bersama.',
                'interpretation' => 'Menunjukkan kepedulian sosial, empati, dan kesadaran lingkungan bermain yang sangat baik.',
                'follow_up' => 'Berikan apresiasi verbal di hadapan teman-teman untuk memperkuat perilaku prososial.',
            ],
            [
                'student_id' => $students[1]->id,
                'teacher_id' => $demoTeacher->id,
                'noted_at' => '2026-10-03 10:15:00',
                'observed_behavior' => 'Mampu menyebutkan urutan rukun Islam dan menghafal doa sebelum makan secara mandiri.',
                'interpretation' => 'Perkembangan nilai agama dan moral berkembang sesuai harapan.',
                'follow_up' => 'Lanjutkan pembiasaan doa harian dan beri kesempatan memimpin doa di kelas.',
            ],
            [
                'student_id' => $students[2]->id,
                'teacher_id' => $demoTeacher->id,
                'noted_at' => '2026-10-04 09:00:00',
                'observed_behavior' => 'Menggunting kertas mengikuti garis lurus dengan stabil dan memegang gunting dengan posisi benar.',
                'interpretation' => 'Keterampilan motorik halus tangan kanan berkembang sangat baik.',
                'follow_up' => 'Tingkatkan latihan menggunting bentuk melengkung dan zigzag.',
            ],
            [
                'student_id' => $students[3]->id,
                'teacher_id' => $demoTeacher->id,
                'noted_at' => '2026-10-05 10:30:00',
                'observed_behavior' => 'Sempat menangis saat ditinggal orang tua di gerbang sekolah, namun mereda setelah diajak menyusun puzzle.',
                'interpretation' => 'Masih membutuhkan transisi kelekatan emosional di awal kedatangan pagi.',
                'follow_up' => 'Sambut di gerbang dengan sapaan hangat dan alihkan perhatian ke mainan favoritnya.',
            ],
            [
                'student_id' => $students[4]->id,
                'teacher_id' => $demoTeacher->id,
                'noted_at' => '2026-10-08 09:45:00',
                'observed_behavior' => 'Menceritakan kembali dongeng fabel dengan kosakata runtut dan ekspresi wajah yang hidup.',
                'interpretation' => 'Kemampuan bahasa ekspresif dan kepercayaan diri di depan kelas sangat menonjol.',
                'follow_up' => 'Dorong untuk menjadi narator sederhana saat kegiatan bermain peran.',
            ],
            [
                'student_id' => $students[5]->id,
                'teacher_id' => $demoTeacher->id,
                'noted_at' => '2026-10-09 10:00:00',
                'observed_behavior' => 'Mengelompokkan kancing berwarna berdasarkan ukuran besar dan kecil secara tepat.',
                'interpretation' => 'Pemahaman konsep klasifikasi kognitif berkembang sesuai harapan.',
                'follow_up' => 'Kenalkan klasifikasi dua kriteria bertahap (warna dan ukuran sekaligus).',
            ],
            // Kelompok B (Guru 2)
            [
                'student_id' => $students[39]->id,
                'teacher_id' => $teachers[1]->id,
                'noted_at' => '2026-10-02 09:15:00',
                'observed_behavior' => 'Berbagi bekal biskuit dengan teman sebangku yang lupa membawa makanan ringan.',
                'interpretation' => 'Menunjukkan sikap kemurahan hati dan kepekaan sosial emosional yang tinggi.',
                'follow_up' => 'Dukung interaksi positif saat istirahat dan beri apresiasi langsung.',
            ],
            [
                'student_id' => $students[40]->id,
                'teacher_id' => $teachers[1]->id,
                'noted_at' => '2026-10-03 10:00:00',
                'observed_behavior' => 'Berani mengajukan pertanyaan mengenai proses terjadinya hujan saat sesi sains sederhana.',
                'interpretation' => 'Rasa ingin tahu kognitif sangat aktif dan daya kritis berkembang baik.',
                'follow_up' => 'Fasilitasi dengan buku bergambar ensiklopedia anak di pojok baca.',
            ],
            [
                'student_id' => $students[41]->id,
                'teacher_id' => $teachers[1]->id,
                'noted_at' => '2026-10-04 09:30:00',
                'observed_behavior' => 'Melompat dengan satu kaki bergantian melewati 5 rintangan simpai tanpa terjatuh.',
                'interpretation' => 'Keseimbangan dan koordinasi motorik kasar berkembang sangat baik.',
                'follow_up' => 'Libatkan dalam permainan ketangkasan estafet tim di halaman sekolah.',
            ],
            [
                'student_id' => $students[42]->id,
                'teacher_id' => $teachers[1]->id,
                'noted_at' => '2026-10-05 10:15:00',
                'observed_behavior' => 'Menuliskan huruf vokal namanya sendiri pada kertas gambar dengan proporsi yang cukup rapi.',
                'interpretation' => 'Pra-keaksaraan dan kontrol pensil motorik halus telah matang.',
                'follow_up' => 'Berikan variasi media menulis seperti pasir warna atau papan tulis mini.',
            ],
            [
                'student_id' => $students[43]->id,
                'teacher_id' => $teachers[1]->id,
                'noted_at' => '2026-10-08 09:00:00',
                'observed_behavior' => 'Mengantre giliran mencuci tangan dengan sabun secara tertib tanpa mendahului teman.',
                'interpretation' => 'Kedisiplinan dan kepatuhan terhadap aturan sosial kelas sangat baik.',
                'follow_up' => 'Pertahankan pembiasaan budaya antre positif ini dalam kegiatan sehari-hari.',
            ],
            [
                'student_id' => $students[44]->id,
                'teacher_id' => $teachers[1]->id,
                'noted_at' => '2026-10-09 10:30:00',
                'observed_behavior' => 'Menyusun balok kayu menjadi replika gedung bertingkat dengan keseimbangan simetris.',
                'interpretation' => 'Kemampuan spasial dan konsentrasi kerja mandiri sangat tekun.',
                'follow_up' => 'Ajak berkolaborasi dengan teman untuk membangun proyek kota sederhana.',
            ],
        ];

        foreach ($anecdotesData as $note) {
            AnecdotalNote::create($note);
        }

        // Pengumuman: 6 data (pinned, draft, expired, target kelompok A, target kelompok B, target semua)
        $announcementsData = [
            [
                'created_by' => $admin->id,
                'classroom_id' => null,
                'title' => 'Pertemuan wali murid semester ganjil',
                'body' => 'Diberitahukan kepada seluruh orang tua/wali murid bahwa pertemuan tatap muka akan dilaksanakan pada hari Sabtu pekan kedua.',
                'is_pinned' => true,
                'status' => AnnouncementStatus::Published,
                'published_at' => '2026-10-01',
                'expires_at' => null,
            ],
            [
                'created_by' => $admin->id,
                'classroom_id' => null,
                'title' => 'Pemberitahuan libur cuti bersama',
                'body' => 'Kegiatan belajar mengajar ditiadakan berkenaan dengan peringatan hari besar keagamaan nasional.',
                'is_pinned' => false,
                'status' => AnnouncementStatus::Published,
                'published_at' => '2026-10-05',
                'expires_at' => null,
            ],
            [
                'created_by' => $admin->id,
                'classroom_id' => $classA->id,
                'title' => 'Kegiatan mewarnai dan prakarya Kelompok A',
                'body' => 'Dimohon membawa krayon dan perlengkapan prakarya untuk latihan motorik halus hari Kamis.',
                'is_pinned' => false,
                'status' => AnnouncementStatus::Published,
                'published_at' => '2026-10-06',
                'expires_at' => null,
            ],
            [
                'created_by' => $admin->id,
                'classroom_id' => $classB->id,
                'title' => 'Persiapan pentas seni mini Kelompok B',
                'body' => 'Anak-anak diharapkan membawa pakaian adat atau busana bertema Nusantara untuk gladi bersih.',
                'is_pinned' => false,
                'status' => AnnouncementStatus::Published,
                'published_at' => '2026-10-07',
                'expires_at' => null,
            ],
            [
                'created_by' => $admin->id,
                'classroom_id' => null,
                'title' => 'Pengambilan seragam tahun ajaran baru',
                'body' => 'Jadwal pengambilan paket seragam dan buku panduan di ruang Tata Usaha telah selesai.',
                'is_pinned' => false,
                'status' => AnnouncementStatus::Published,
                'published_at' => '2026-08-01',
                'expires_at' => '2026-08-15',
            ],
            [
                'created_by' => $admin->id,
                'classroom_id' => null,
                'title' => 'Rencana studi wisata semester depan',
                'body' => 'Rancangan destinasi edukasi ke kebun binatang dan peternakan terpadu masih dalam tahap peninjauan yayasan.',
                'is_pinned' => false,
                'status' => AnnouncementStatus::Draft,
                'published_at' => null,
                'expires_at' => null,
            ],
        ];

        foreach ($announcementsData as $item) {
            Announcement::create($item);
        }
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
