export default function EmptyState({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return <div className="empty-state"><p>{children}</p>{action}</div>;
}
