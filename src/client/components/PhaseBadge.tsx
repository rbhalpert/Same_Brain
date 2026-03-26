export function PhaseBadge({ phase }: { phase: string }) {
  return <span className="phase-badge">{phase.replace("_", " ")}</span>;
}

