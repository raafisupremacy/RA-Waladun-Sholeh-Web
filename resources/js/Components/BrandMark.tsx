import { usePage } from '@inertiajs/react';

type Props = { appName?: string; schoolName?: string };

export default function BrandMark({ appName = '', schoolName = '' }: Props) {
    const props = usePage().props as { brandAssets?: { logoUrl?: string | null } };
    const logoUrl = props.brandAssets?.logoUrl;
    return (
        <span className="brand-mark inline-flex items-center gap-2">
            {logoUrl && (
                <img
                    src={logoUrl}
                    alt={schoolName ? '' : 'Logo sekolah'}
                    style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
            )}
            <span className="brand-wordmark">{appName}</span>
            {schoolName && (
                <>
                    {' '}
                    <span className="brand-school-name">{schoolName}</span>
                </>
            )}
        </span>
    );
}
