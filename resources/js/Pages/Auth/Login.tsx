import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

type Props = { canResetPassword?: boolean; status?: string; appName?: string; schoolSettings?: Record<string, string>; schoolName?: string };
export default function Login({ status, canResetPassword }: Props) {
    const page = usePage() as unknown as { props: Props };
    const schoolName = page.props.schoolName || page.props.schoolSettings?.school_name || '';
    const appName = page.props.appName || '';
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const submit: FormEventHandler = (event) => { event.preventDefault(); post(route('login'), { onFinish: () => reset('password') }); };
    const hasError = Boolean(errors.email || errors.password);
    return <GuestLayout><Head title="Masuk" /><div className="login-heading"><div className="login-icon" aria-hidden="true"><LockKeyhole size={24} strokeWidth={2} /></div><h1>Masuk ke {appName}</h1><p>{schoolName}</p></div>{hasError && <div className="auth-alert" role="alert">Email atau kata sandi tidak sesuai.</div>}{status && <p className="form-status">{status}</p>}<form onSubmit={submit} className="auth-form"><div><InputLabel htmlFor="email" value="Email" /><TextInput id="email" type="email" name="email" value={data.email} className={hasError ? 'input-error' : ''} autoComplete="username" inputMode="email" placeholder="nama@sekolah.sch.id" onChange={e => setData('email', e.target.value)} /><InputError message={errors.email} /></div><div><InputLabel htmlFor="password" value="Kata sandi" /><div className="password-field"><TextInput id="password" type={showPassword ? 'text' : 'password'} name="password" value={data.password} className={hasError ? 'input-error' : ''} autoComplete="current-password" placeholder="Masukkan kata sandi" onChange={e => setData('password', e.target.value)} /><button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Sembunyikan' : 'Lihat'}</button></div><InputError message={errors.password} /></div><PrimaryButton disabled={processing}>{processing ? 'Memverifikasi…' : 'Masuk'}</PrimaryButton>{canResetPassword && <Link href={route('password.request')} className="auth-link">Lupa kata sandi?</Link>}</form><p className="login-support">Akun dibuat oleh Tata Usaha. Belum punya akun? <a href="mailto:tatausaha@sekolah.sch.id">Hubungi sekolah</a>.</p></GuestLayout>;
}
