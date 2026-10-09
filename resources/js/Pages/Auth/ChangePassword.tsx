import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

export default function ChangePassword() {
    const { data, setData, put, processing, errors } = useForm({ current_password: '', password: '', password_confirmation: '' });
    const [visible, setVisible] = useState<Record<string, boolean>>({});
    const meetsLength = data.password.length >= 8;
    const hasNumber = useMemo(() => /\d/.test(data.password), [data.password]);
    const toggle = (field: string) => setVisible(current => ({ ...current, [field]: !current[field] }));
    const passwordField = (id: string, label: string, value: string, onChange: (value: string) => void, placeholder: string, autoComplete: string) => <div className="password-form-field"><InputLabel htmlFor={id} value={label} /><div className="password-field"><TextInput id={id} type={visible[id] ? 'text' : 'password'} value={value} autoComplete={autoComplete} placeholder={placeholder} onChange={e => onChange(e.target.value)} /><button type="button" className="password-icon-toggle" aria-label={`${visible[id] ? 'Sembunyikan' : 'Tampilkan'} ${label.toLowerCase()}`} onClick={() => toggle(id)}>{visible[id] ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>;
    const submit: FormEventHandler = (event) => { event.preventDefault(); put(route('password.change.update')); };
    return <GuestLayout showFooter><Head title="Ganti kata sandi" /><div className="password-heading"><h1>Ganti kata sandi</h1><p>Kata sandi sementara dari sekolah perlu diganti sebelum Anda melanjutkan.</p></div><form onSubmit={submit} className="auth-form password-form">{passwordField('current_password', 'Kata sandi sementara', data.current_password, value => setData('current_password', value), '••••••••', 'current-password')}{passwordField('password', 'Kata sandi baru', data.password, value => setData('password', value), '••••••••••', 'new-password')}<ul className="password-rules" aria-label="Syarat kata sandi"><li className={meetsLength ? 'is-met' : ''}><span>{meetsLength ? <Check size={12} strokeWidth={3} /> : ''}</span>Minimal 8 karakter</li><li className={hasNumber ? 'is-met' : ''}><span>{hasNumber ? <Check size={12} strokeWidth={3} /> : ''}</span>Ada angka</li></ul>{passwordField('password_confirmation', 'Konfirmasi kata sandi', data.password_confirmation, value => setData('password_confirmation', value), 'Ulangi kata sandi baru', 'new-password')}<InputError message={errors.current_password} /><InputError message={errors.password} /><InputError message={errors.password_confirmation} /><PrimaryButton disabled={processing}>Simpan dan lanjut</PrimaryButton><p className="help-copy">Butuh bantuan? <a href="mailto:tatausaha@sekolah.sch.id">Hubungi Tata Usaha</a></p></form></GuestLayout>;
}
