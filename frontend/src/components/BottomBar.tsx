import { useI18n } from "../i18n";
import { Dots, PillButton } from "./ui";

export type BarItem<T extends string> = { id: T; label: string };

/**
 * Bottom menu bar: a grid of black pill buttons and page dots, like the game's
 * Back / Continue row. On pushed screens it shows a single Back button instead.
 */
export function BottomBar<T extends string>({
  items,
  active,
  onChange,
  onBack,
}: {
  items: BarItem<T>[];
  active: T;
  onChange: (id: T) => void;
  onBack?: () => void;
}) {
  const { t } = useI18n();
  const index = Math.max(0, items.findIndex((i) => i.id === active));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-b from-black/70 to-black pb-[max(env(safe-area-inset-bottom),6px)] pt-2.5 backdrop-blur-sm">
      <div className="mx-auto max-w-xl px-3">
        {onBack ? (
          <div className="flex justify-end">
            <PillButton className="w-1/3" onClick={onBack}>
              {t.back}
            </PillButton>
          </div>
        ) : (
          <div className={`grid gap-2 ${items.length > 3 ? "grid-cols-2" : "grid-cols-3"}`}>
            {items.map((item) => (
              <PillButton key={item.id} active={item.id === active} className="truncate px-2" onClick={() => onChange(item.id)}>
                {item.label}
              </PillButton>
            ))}
          </div>
        )}
        <div className="mt-2">
          <Dots count={items.length} active={onBack ? -1 : index} />
        </div>
      </div>
    </nav>
  );
}
