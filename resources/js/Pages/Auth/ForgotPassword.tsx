import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Lupa kata sandi" />

            <div className="password-heading">
                <h1>Lupa kata sandi</h1>
                <p>Masukkan email akun Anda untuk menerima tautan pengaturan kata sandi.</p>
            </div>

            {status && (
                <div className="form-status">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="auth-form">
                <div>
                    <label htmlFor="email" className="input-label">Email</label>
                    <TextInput id="email" type="email" name="email" value={data.email} placeholder="nama@sekolah.sch.id" onChange={(e) => setData('email', e.target.value)} />
                </div>

                <InputError message={errors.email} className="mt-2" />

                <PrimaryButton disabled={processing}>Kirim tautan</PrimaryButton>
            </form>
        </GuestLayout>
    );
}
