// Minimal typings for https://telegram.org/js/telegram-web-app.js (loaded in index.html).
type Haptic = {
  impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
  notificationOccurred(type: "error" | "success" | "warning"): void;
  selectionChanged(): void;
};

type BackButton = {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
};

type WebApp = {
  initData: string;
  initDataUnsafe?: { user?: { language_code?: string } };
  platform: string;
  version: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(v: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  disableVerticalSwipes?(): void;
  HapticFeedback: Haptic;
  BackButton: BackButton;
};

declare global {
  interface Window {
    Telegram?: { WebApp: WebApp };
  }
}

const webApp = window.Telegram?.WebApp;

/** True when opened inside Telegram (outside Telegram initData is empty). */
export const insideTelegram = Boolean(webApp?.initData);

export function initTelegram() {
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
  if (webApp.isVersionAtLeast("6.1")) {
    webApp.setHeaderColor("#05070a");
    webApp.setBackgroundColor("#05070a");
  }
  if (webApp.isVersionAtLeast("7.7")) webApp.disableVerticalSwipes?.();
}

/**
 * Value for `Authorization: tma <initData>`. Outside Telegram, dev and preview builds fall back to
 * "dev", which the backend only accepts when started with DEV_AUTH=true.
 */
export function authToken(): string | null {
  if (insideTelegram) return webApp!.initData;
  return import.meta.env.DEV || import.meta.env.VITE_DEV_AUTH === "true" ? "dev" : null;
}

/** The Telegram user's app language, e.g. "ru" or "en". */
export const telegramLanguage = (): string | undefined => webApp?.initDataUnsafe?.user?.language_code;

const canHaptic = () => insideTelegram && webApp!.isVersionAtLeast("6.1");

export const haptic = {
  tap: () => canHaptic() && webApp!.HapticFeedback.impactOccurred("light"),
  heavy: () => canHaptic() && webApp!.HapticFeedback.impactOccurred("heavy"),
  success: () => canHaptic() && webApp!.HapticFeedback.notificationOccurred("success"),
  error: () => canHaptic() && webApp!.HapticFeedback.notificationOccurred("error"),
  select: () => canHaptic() && webApp!.HapticFeedback.selectionChanged(),
};

/** Shows Telegram's native back button while `handler` is set. */
export function bindBackButton(handler: (() => void) | null) {
  if (!webApp || !webApp.isVersionAtLeast("6.1")) return () => {};
  if (!handler) {
    webApp.BackButton.hide();
    return () => {};
  }
  webApp.BackButton.onClick(handler);
  webApp.BackButton.show();
  return () => {
    webApp.BackButton.offClick(handler);
    webApp.BackButton.hide();
  };
}
