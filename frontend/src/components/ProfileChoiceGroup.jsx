export default function ProfileChoiceGroup({ options, value, onPick, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onPick(option.key)}
          aria-pressed={value === option.key}
          className={`pill px-3 py-1.5 text-xs font-semibold transition ${
            value === option.key
              ? "bg-glow text-plum"
              : "bg-white/10 text-petal hover:bg-white/20"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
