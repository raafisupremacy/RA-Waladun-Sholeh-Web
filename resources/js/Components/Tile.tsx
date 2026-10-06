export default function Tile({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
    return <section className={`tile ${className}`}><h3>{title}</h3>{children}</section>;
}
