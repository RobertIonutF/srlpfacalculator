interface ProgressBarProps {
  value: number;
  max: number;
  color: string;
  label: string;
  amount: string;
}

export function ProgressBar({ value, max, color, label, amount }: ProgressBarProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-white font-medium font-mono-nums text-sm">{amount}</span>
      </div>
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full progress-bar"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

