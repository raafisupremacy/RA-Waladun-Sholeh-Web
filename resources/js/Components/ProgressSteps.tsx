export default function ProgressSteps({ steps, current = 0 }: { steps: string[]; current?: number }) {
    return <ol className="progress-steps" aria-label="Kemajuan">
        {steps.map((step, index) => <li key={step} className={index <= current ? 'is-complete' : ''}><span>{index + 1}</span>{step}</li>)}
    </ol>;
}
