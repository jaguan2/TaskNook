import { Flame, Sparkles } from "lucide-react";
import { currentLoginStreak, levelForXP, XP_RULES } from "../lib/progression";

export default function LevelCard({ progression }) {
  const level = levelForXP(progression.studyXP + progression.bonusXP);
  const streak = currentLoginStreak(progression);
  return (
    <section aria-label="Your level" className="space-y-3 rounded-2xl border border-glow/20 bg-glow/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-cream">
          <Sparkles size={19} className="text-glow" aria-hidden="true" />Level {level.level}
        </h3>
        <span className="text-xs text-petal/70">{level.totalXP.toLocaleString()} total XP</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-petal/80">
          <span>{level.earned} / {level.required} XP</span>
          <span>Level {level.level + 1} in {level.remaining} XP</span>
        </div>
        <div role="progressbar" aria-label="Experience toward the next level" aria-valuemin={0}
          aria-valuemax={level.required} aria-valuenow={level.earned}
          aria-valuetext={`${level.earned} of ${level.required} XP toward level ${level.level + 1}`}
          className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-glow" style={{ width: `${level.earned / level.required * 100}%` }} />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-petal/70">
        <Flame size={13} className="text-amber" aria-hidden="true" />
        {streak} {streak === 1 ? "day" : "days"} login streak
        <span className="text-petal/50">· best {progression.bestStreak}</span>
      </p>
      <details className="text-xs text-petal/70">
        <summary className="cursor-pointer text-petal/80 hover:text-cream">How to earn XP</summary>
        <dl className="mt-2 space-y-1.5 leading-relaxed">
          <div><dt className="inline text-cream">Studying: </dt><dd className="inline">{XP_RULES.studyMinute} XP per saved focus minute, including your study history.</dd></div>
          <div><dt className="inline text-cream">Challenges: </dt><dd className="inline">{XP_RULES.challenge} XP on completion. Daily goals reward once a day; ongoing goals reward once.</dd></div>
          <div><dt className="inline text-cream">Neighbours: </dt><dd className="inline">{XP_RULES.neighbour} XP for chatting or visiting, once per neighbour each day.</dd></div>
          <div><dt className="inline text-cream">Daily check-in: </dt><dd className="inline">{XP_RULES.login} XP, plus 1 per additional streak day up to {XP_RULES.loginStreakMaxBonus} extra XP.</dd></div>
        </dl>
        <p className="mt-2 text-petal/60">Each next level takes 50 more XP. Your earned levels stay with you.</p>
      </details>
    </section>
  );
}
