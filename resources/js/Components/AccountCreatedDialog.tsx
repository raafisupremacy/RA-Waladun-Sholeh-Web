import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet';

type Account = { name: string; email: string; password: string };
export default function AccountCreatedDialog() {
    const props = usePage().props as { temporaryAccount?: Account | null; appName?: string };
    const [account, setAccount] = useState<Account | null>(null);
    const [message, setMessage] = useState('');
    useEffect(() => {
        if (props.temporaryAccount) {
            setAccount(props.temporaryAccount);
            setMessage('');
        }
    }, [props.temporaryAccount]);
    async function copy() {
        if (!account) return;
        try {
            await navigator.clipboard.writeText('Email: ' + account.email + '\nKata sandi sementara: ' + account.password);
            setMessage('Detail akun disalin.');
        } catch {
            setMessage('Tidak bisa menyalin otomatis. Silakan pilih dan salin teks akun.');
        }
    }
    return <BottomSheet open={!!account} title="Akun berhasil dibuat" onClose={() => setAccount(null)}>
        {account && <><div className="account-card"><h3>{props.appName} · Kartu akun</h3><p>{account.name}</p><dl><dt>Email</dt><dd>{account.email}</dd><dt>Kata sandi sementara</dt><dd className="account-password">{account.password}</dd></dl><p>Wajib mengganti kata sandi saat pertama kali masuk.</p></div><p className="caption mt-4">Kata sandi hanya ditampilkan sekali. Simpan atau cetak sebelum menutup dialog.</p><p role="status">{message}</p><div className="dialog-actions"><button className="button-secondary" onClick={() => window.print()}>Cetak kartu akun</button><button className="button-primary" onClick={copy}>Salin</button></div></>}
    </BottomSheet>;
}
