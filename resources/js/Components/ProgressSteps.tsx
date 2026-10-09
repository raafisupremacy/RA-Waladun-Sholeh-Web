import { Check } from 'lucide-react';

type StepState = 'complete' | 'current' | 'upcoming';

// Dots joined by a thin line (DESIGN.md section 8): completed steps show a check, the
// current step is ringed, later steps are empty. Reaching the final step means the flow
// is finished, so every step is shown as complete (mockup 20C).
export default function ProgressSteps({ steps, current = 0 }: { steps: string[]; current?: number }) {
    const last = steps.length - 1;
    const state = (index: number): StepState => {
        if (index < current || current >= last) return 'complete';
        return index === current ? 'current' : 'upcoming';
    };

    return <ol className="progress-steps" aria-label="Kemajuan">
        {steps.map((step, index) => {
            const own = state(index);
            const linked = own === 'complete' && index < last && state(index + 1) === 'complete';
            return <li key={step} className={`is-${own}${linked ? ' is-linked' : ''}`} aria-current={own === 'current' ? 'step' : undefined}>
                <span aria-hidden="true">{own === 'complete' && <Check size={14} strokeWidth={3} />}</span>{step}
            </li>;
        })}
    </ol>;
}
