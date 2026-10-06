import { Link } from '@inertiajs/react';
export type PageData<T> = { data: T[]; current_page: number; last_page: number; total: number; from: number | null; to: number | null; prev_page_url: string | null; next_page_url: string | null };
export default function Pagination({ page }: { page: Omit<PageData<unknown>, 'data'> }) {
    return <nav className="pagination" aria-label="Halaman daftar"><p>Menampilkan {page.from ?? 0}–{page.to ?? 0} dari {page.total}</p><div className="flex items-center gap-3">{page.prev_page_url && <Link className="button-secondary" href={page.prev_page_url} preserveScroll>Sebelumnya</Link>}<span>{page.current_page} / {page.last_page}</span>{page.next_page_url && <Link className="button-secondary" href={page.next_page_url} preserveScroll>Berikutnya</Link>}</div></nav>;
}
