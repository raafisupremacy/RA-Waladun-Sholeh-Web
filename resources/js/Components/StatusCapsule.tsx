type Status = 'lunas' | 'menunggu_verifikasi' | 'belum_bayar' | 'ditolak' | string;

const labels: Record<string, string> = {
    lunas: 'Lunas',
    menunggu_verifikasi: 'Menunggu Verifikasi',
    belum_bayar: 'Belum Bayar',
    ditolak: 'Ditolak',
    aktif: 'Aktif',
    nonaktif: 'Nonaktif',
    belum_pernah_masuk: 'Belum pernah masuk',
    sudah_diisi: 'Sudah diisi',
    belum_diisi: 'Belum diisi',
    BB: 'BB',
    MB: 'MB',
    BSH: 'BSH',
    BSB: 'BSB',
};

export default function StatusCapsule({ status, label }: { status: Status; label?: string }) {
    return <span className={`status status-${String(status).toLowerCase()}`}>{label ?? labels[status] ?? status}</span>;
}
