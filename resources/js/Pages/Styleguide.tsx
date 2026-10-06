import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import BottomSheet from '@/Components/BottomSheet';
import BigNumber from '@/Components/BigNumber';
import ConfirmDialog from '@/Components/ConfirmDialog';
import EmptyState from '@/Components/EmptyState';
import ProgressSteps from '@/Components/ProgressSteps';
import ResponsiveTable from '@/Components/ResponsiveTable';
import SegmentedControl from '@/Components/SegmentedControl';
import StatusCapsule from '@/Components/StatusCapsule';
import Tile from '@/Components/Tile';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Checkbox from '@/Components/Checkbox';

type PreviewProps = { appName?: string; schoolName?: string; schoolSettings?: Record<string, string> };
type Person = { id: number; name: string; detail: string; status: string };
const rows: Person[] = [{ id: 1, name: 'Contoh siswa', detail: 'Kelompok A', status: 'lunas' }, { id: 2, name: 'Contoh siswa lain', detail: 'Kelompok B', status: 'menunggu_verifikasi' }];

function Showcase() {
    const [segment, setSegment] = useState('Semua');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    return <div className="styleguide-content">
        <div className="styleguide-intro"><p className="eyebrow">Fondasi M0</p><h1>Komponen SKMS</h1><p>Pratinjau bersama untuk tiga lebar layar yang ditetapkan desain.</p></div>
        <div className="component-grid">
            <Tile title="Fondasi formulir"><div className="styleguide-form"><InputLabel htmlFor="styleguide-email" value="Email" /><TextInput id="styleguide-email" type="email" placeholder="nama@sekolah.sch.id" /><InputError message="Email atau kata sandi tidak sesuai." /><label className="checkbox-row"><Checkbox /> Ingat pilihan ini</label></div></Tile>
            <Tile title="Varian tombol"><div className="action-stack"><PrimaryButton type="button">Utama</PrimaryButton><SecondaryButton type="button">Sekunder</SecondaryButton><DangerButton type="button">Destruktif</DangerButton><a href="#" className="auth-link">Tautan biru</a></div></Tile>
            <Tile title="Status"><div className="capsule-stack"><StatusCapsule status="lunas" /><StatusCapsule status="menunggu_verifikasi" /><StatusCapsule status="belum_bayar" /><StatusCapsule status="ditolak" /></div></Tile>
            <Tile title="Angka utama"><BigNumber label="pembayaran menunggu">9</BigNumber></Tile>
            <Tile title="Progress"><ProgressSteps steps={['Diajukan', 'Verifikasi', 'Selesai']} current={1} /></Tile>
            <Tile title="Segmented control"><SegmentedControl options={['Semua', 'Belum diisi', 'Sudah diisi']} value={segment} onChange={setSegment} /></Tile>
            <Tile title="Aksi"><div className="action-stack"><button type="button" className="button-primary" onClick={() => setDialogOpen(true)}>Buka dialog</button><button type="button" className="button-secondary" onClick={() => setSheetOpen(true)}>Buka bottom sheet</button></div></Tile>
            <Tile title="Empty state"><EmptyState>Belum ada data untuk ditampilkan.</EmptyState></Tile>
        </div>
        <Tile title="Responsive table"><ResponsiveTable rows={rows} columns={[{ key: 'name', label: 'Nama' }, { key: 'detail', label: 'Kelas' }, { key: 'status', label: 'Status', render: (value) => <StatusCapsule status={String(value)} /> }]} /></Tile>
        <BottomSheet open={sheetOpen} title="Menu contoh" onClose={() => setSheetOpen(false)}><p>Konten sheet mengikuti pola navigasi mobile.</p><button type="button" className="button-primary" onClick={() => setSheetOpen(false)}>Selesai</button></BottomSheet>
        <ConfirmDialog open={dialogOpen} title="Konfirmasi contoh" description="Perubahan ini belum terhubung ke data." onCancel={() => setDialogOpen(false)} onConfirm={() => setDialogOpen(false)} />
    </div>;
}

export default function Styleguide() {
    const { appName = '', schoolName = '', schoolSettings } = usePage().props as PreviewProps;
    return <AdminLayout appName={appName || import.meta.env.VITE_APP_NAME || ''} schoolName={schoolName || schoolSettings?.school_name}><div className="styleguide-shell"><Showcase /><div className="preview-grid">{[390, 834, 1440].map((width) => <div className="preview-frame" key={width} style={{ maxWidth: `${width}px` }}><span className="preview-label">{width}px</span><Showcase /></div>)}</div></div></AdminLayout>;
}
