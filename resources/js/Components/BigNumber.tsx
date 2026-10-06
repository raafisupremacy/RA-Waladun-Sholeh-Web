export default function BigNumber({ children, label }: { children: React.ReactNode; label?: string }) {
    return <div><div className="big-number">{children}</div>{label && <div className="caption">{label}</div>}</div>;
}
