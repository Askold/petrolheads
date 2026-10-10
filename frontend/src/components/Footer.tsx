import { useI18n } from "../i18n";
import { openTelegramLink } from "../telegram";

const FEEDBACK_USERNAME = "sealonoff";

/** Last line of every screen: who to write to about the app. */
export function Footer() {
  const { t } = useI18n();
  const url = `https://t.me/${FEEDBACK_USERNAME}`;
  return (
    <p className="mt-6 text-center text-xs italic text-steel">
      {t.feedback}:{" "}
      <a
        href={url}
        onClick={(e) => {
          e.preventDefault();
          openTelegramLink(url);
        }}
        className="text-lime underline-offset-2 hover:underline"
      >
        @{FEEDBACK_USERNAME}
      </a>
    </p>
  );
}
