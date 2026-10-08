import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";

type Variant = "default" | "danger";

/** Black pill with a light rim, like the Back / Continue buttons. */
export function PillButton({
  variant = "default",
  active = false,
  className = "",
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; active?: boolean }) {
  return (
    <button
      {...rest}
      data-active={active}
      onClick={(e) => {
        haptic.tap();
        onClick?.(e);
      }}
      className={`pill px-4 py-1.5 text-lg leading-tight ${variant === "danger" ? "!text-danger" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function CircleArrow({ dir, onClick, size = 34, label }: { dir: "left" | "right"; onClick: () => void; size?: number; label?: string }) {
  return (
    <button
      aria-label={label ?? (dir === "left" ? "Previous" : "Next")}
      onClick={() => {
        haptic.select();
        onClick();
      }}
      className="circle-arrow shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {dir === "left" ? <path d="M19 12H5M11 5l-7 7 7 7" /> : <path d="M5 12h14M13 5l7 7-7 7" />}
      </svg>
    </button>
  );
}

/** "◀ My Cars ▶" style switcher used in headers. */
export function Switcher({ label, onPrev, onNext }: { label: ReactNode; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <CircleArrow dir="left" size={28} onClick={onPrev} />
      <span className="label-white min-w-0 truncate text-center text-lg normal-case">{label}</span>
      <CircleArrow dir="right" size={28} onClick={onNext} />
    </div>
  );
}

/** Lime italic screen title on a dark strip, with the thin slider bar underneath. */
export function ScreenHeader({
  title,
  right,
  progress,
  children,
}: {
  title: ReactNode;
  right?: ReactNode;
  progress?: number;
  children?: ReactNode;
}) {
  return (
    <div className="strip px-3 pb-2.5 pt-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="title-lime truncate text-[2rem] leading-none">{title}</h1>
        {right}
      </div>
      <SliderBar value={progress} />
      {children}
    </div>
  );
}

export function SliderBar({ value }: { value?: number }) {
  return (
    <div className="relative mt-2 h-2.5 rounded-full bg-[#7d7f86]/70 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]">
      {value != null && (
        <motion.span
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_4px_white]"
          animate={{ left: `${Math.min(97, Math.max(3, value * 100))}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-1.5 mt-5 flex items-end justify-between px-1">
      <h2 className="title-lime text-2xl leading-none">{children}</h2>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  innerClassName = "p-3",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={`strip ${className} ${innerClassName}`}
    >
      {children}
    </motion.div>
  );
}

/** White italic label over a thin green bar ending in a white knob. */
export function StatBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="min-w-0 flex-1">
      <div className="label-white truncate text-[17px] leading-none">{label}</div>
      <div className="relative mt-1.5 h-[7px] rounded-full bg-black/60">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-b from-[#a5ec5a] to-bar"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#d8d8d8] bg-white"
          initial={{ left: 0 }}
          animate={{ left: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/** "Visual Rating 3.62 ★" with the vertical green gauge. Value is 0..10. */
export function VisualRating({ value }: { value: number }) {
  const { t } = useI18n();
  const pct = Math.max(0, Math.min(1, value / 10)) * 100;
  return (
    <div className="flex items-start gap-2">
      <div className="text-right">
        <div className="title-lime text-lg leading-none">{t.visualRating}</div>
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <span className="label-white text-[28px] leading-none">{value.toFixed(2)}</span>
          <svg viewBox="0 0 24 24" className="h-7 w-7 drop-shadow-[0_2px_2px_rgb(0_0_0/0.8)]">
            <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z" fill="#fff" />
          </svg>
        </div>
      </div>
      <div className="relative mt-1 h-24 w-[7px] rounded-full bg-black/60">
        <motion.div
          className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-bar to-[#a5ec5a]"
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.span
          className="absolute left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-[#d8d8d8] bg-white"
          initial={{ bottom: 0 }}
          animate={{ bottom: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-white mb-1 block text-sm tracking-wide text-steel">{label}</span>
      {children}
    </label>
  );
}

export function Loader({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <motion.img
        src="/brand/emblem-white.png"
        alt=""
        className="w-28"
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      />
      <div className="relative h-[7px] w-44 overflow-hidden rounded-full bg-black/60">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full bg-bar"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
        />
      </div>
      <span className="title-lime text-xl">{label ?? t.loading}…</span>
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const { t } = useI18n();
  return (
    <div className="strip border border-danger/50 p-3 text-sm text-[#ffb3b3]">
      {error instanceof Error ? error.message : t.somethingWrong}
    </div>
  );
}

export function StatusBadge({ status }: { status: "pending" | "verified" | "rejected" }) {
  const { t } = useI18n();
  const styles = {
    verified: "text-lime border-lime/60",
    pending: "text-hazard border-hazard/60",
    rejected: "text-danger border-danger/60",
  }[status];
  const label = t.status[status];
  return <span className={`rounded border px-1.5 font-display text-sm italic ${styles}`}>{label}</span>;
}

/** Club sticker for empty states. */
export function EmptyEmblem() {
  return <img src="/brand/emblem-sticker.png" alt="" className="mx-auto w-32 opacity-80" />;
}

/** Pagination dots shown at the bottom of the game's menus. */
export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === active ? "bg-white" : "bg-white/35"}`} />
      ))}
    </div>
  );
}
