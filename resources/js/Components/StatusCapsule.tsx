type Status = 'lunas' | 'menunggu_verifikasi' | 'belum_bayar' | 'ditolak' | string;

const labels: Record<string, string> = {
    lunas: 'Lunas',
    menunggu_verifikasi: 'Menunggu Verifikasi',
    belum_bayar: 'Belum Bayar',
    ditolak: 'Ditolak',
    aktif: 'Aktif',
    nonaktif: 'Nonaktif',
};

export default function StatusCapsule({ status, label }: { status: Status; label?: string }) {
    return <span className={`status status-${status}`}>{label ?? labels[status] ?? status}</span>;
}
