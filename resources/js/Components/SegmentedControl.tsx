export default function SegmentedControl({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
    return <div className="segmented-control" role="tablist">{options.map((option) => <button key={option} type="button" className={option === value ? 'is-active' : ''} onClick={() => onChange(option)}>{option}</button>)}</div>;
}
