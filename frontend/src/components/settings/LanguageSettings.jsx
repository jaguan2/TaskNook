import { Check, Languages } from "lucide-react";
import { LANGUAGES } from "../../i18n";
import { useI18n } from "../../i18n/I18nProvider";

export default function LanguageSettings() {
  const { language, setLanguage, t } = useI18n();

  return (
    <section className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-cream">
        <Languages size={15} className="text-petal/70" /> {t("language.title")}
      </p>
      <p className="text-xs text-petal/60">{t("language.description")}</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("language.title")}>
        {LANGUAGES.map((option) => {
          const selected = language === option.key;
          return (
            <label
              key={option.key}
              lang={option.locale}
              className={`flex min-h-10 cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus-within:ring-2 focus-within:ring-glow/60 ${
                selected
                  ? "border-glow/60 bg-glow text-plum"
                  : "border-white/10 bg-white/5 text-petal hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <input
                type="radio"
                name="tasknook-language"
                value={option.key}
                checked={selected}
                onChange={() => setLanguage(option.key)}
                className="sr-only"
              />
              <span>{option.label}</span>
              {selected && <Check size={14} aria-hidden="true" />}
            </label>
          );
        })}
      </div>
      <p className="rounded-lg bg-white/5 px-2.5 py-2 text-[11px] leading-relaxed text-petal/60">
        {t("language.note")}
      </p>
    </section>
  );
}
