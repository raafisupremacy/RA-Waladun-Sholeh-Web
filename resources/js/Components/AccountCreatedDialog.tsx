import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Account = { name: string; email: string; password: string };

export default function AccountCreatedDialog() {
    const props = usePage().props as { temporaryAccount?: Account | null; appName?: string; schoolName?: string };
    const [account, setAccount] = useState<Account | null>(null);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [copiedPassword, setCopiedPassword] = useState(false);

    useEffect(() => {
        if (props.temporaryAccount) {
            setAccount(props.temporaryAccount);
            setCopiedEmail(false);
            setCopiedPassword(false);
        }
    }, [props.temporaryAccount]);

    useEffect(() => {
        if (!account) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [account]);

    if (!account) return null;

    async function copyEmail() {
        if (!account) return;
        try {
            await navigator.clipboard.writeText(account.email);
            setCopiedEmail(true);
            setTimeout(() => setCopiedEmail(false), 2000);
        } catch {
            // ignore
        }
    }

    async function copyPassword() {
        if (!account) return;
        try {
            await navigator.clipboard.writeText(account.password);
            setCopiedPassword(true);
            setTimeout(() => setCopiedPassword(false), 2000);
        } catch {
            // ignore
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 text-left border border-stone-100 animate-in fade-in zoom-in-95 duration-150 max-h-[calc(100dvh-32px)] flex flex-col overflow-y-auto overscroll-contain my-auto">
                <div>
                    <h2 id="account-modal-title" className="text-2xl font-bold text-stone-900 tracking-tight">Akun berhasil dibuat</h2>
                    <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                        Akun untuk {account.name} telah berhasil didaftarkan ke dalam sistem.
                    </p>
                </div>

                <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-stone-200/60 divide-y divide-stone-200/70 account-card">
                    <div className="pb-3.5">
                        <span className="block text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Email</span>
                        <div className="flex items-center justify-between mt-1 gap-2">
                            <span className="text-[15px] font-medium text-stone-900 break-all">{account.email}</span>
                            <button
                                type="button"
                                onClick={copyEmail}
                                className="text-sm font-semibold text-[#0071E3] hover:underline shrink-0"
                            >
                                {copiedEmail ? 'Disalin' : 'Salin'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-3.5">
                        <span className="block text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Kata sandi sementara</span>
                        <div className="flex items-center justify-between mt-1 gap-2">
                            <span className="font-mono text-base font-bold text-stone-900 tracking-wider account-password">{account.password}</span>
                            <button
                                type="button"
                                onClick={copyPassword}
                                className="text-sm font-semibold text-[#0071E3] hover:underline shrink-0"
                            >
                                {copiedPassword ? 'Disalin' : 'Salin'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Kata sandi ini hanya ditampilkan sekali.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-all duration-150 active:scale-[0.98]"
                    >
                        Cetak kartu akun
                    </button>
                    <button
                        type="button"
                        onClick={() => setAccount(null)}
                        className="px-6 py-2.5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-all duration-150 active:scale-[0.98]"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
