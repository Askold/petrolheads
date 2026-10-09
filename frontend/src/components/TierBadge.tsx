import type { TierInfo, TierKey } from "../api/types";
import { useI18n } from "../i18n";

/** Seconds with milliseconds, e.g. 46123 → "46.123". */
const secs = (ms: number) => (ms / 1000).toFixed(3);

/** The tier name styled as its sticker (matte / holographic / gold / red chrome). */
export function TierBadge({ tier, size = "md" }: { tier: TierKey; size?: "sm" | "md" }) {
  const { t } = useI18n();
  return (
    <span className={`sticker sticker-${tier} ${size === "sm" ? "!px-2 !py-0 text-[11px]" : "text-base"}`}>
      {tier === "member" ? <span className="mix-blend-difference text-white">{t.tierName[tier]}</span> : t.tierName[tier]}
    </span>
  );
}

/** Profile block: status sticker, what sticker it earns, best home-track lap and the gap to the next tier. */
export function TierCard({ info }: { info: TierInfo }) {
  const { t } = useI18n();
  const gap = info.bestMs != null && info.nextTierMaxMs != null ? info.bestMs - info.nextTierMaxMs : null;

  return (
    <div className="strip space-y-1 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="title-lime text-xl">{t.tierLabel}</span>
        <TierBadge tier={info.tier} />
      </div>
      <div className="text-xs italic text-white/80">{t.tierSticker[info.tier]}</div>
      <div className="text-xs text-steel">
        {info.bestMs != null ? t.tierBest(secs(info.bestMs), info.trackName) : t.tierNoLap(info.trackName)}
      </div>
      {info.nextTier && info.nextTierMaxMs != null ? (
        <div className="text-xs text-lime">
          {gap != null
            ? t.tierToNext(secs(gap), t.tierName[info.nextTier])
            : t.tierNeedLap(secs(info.nextTierMaxMs), t.tierName[info.nextTier])}
        </div>
      ) : (
        <div className="text-xs text-lime">{t.tierTop}</div>
      )}
    </div>
  );
}
