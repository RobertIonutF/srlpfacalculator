interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}

export function ToggleSwitch({ enabled, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        {description && <p className="text-slate-500 text-xs">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`toggle-switch ${enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
      >
        <span className={`toggle-switch-thumb ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

