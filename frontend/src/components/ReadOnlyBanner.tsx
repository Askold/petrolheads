import { useCanEdit, useMeta } from "../api/client";
import { useI18n } from "../i18n";

/** Shown to people outside the club group: the app is browse-only for them. */
export function ReadOnlyBanner() {
  const { t } = useI18n();
  const meta = useMeta();
  const canEdit = useCanEdit();
  if (!meta.data || canEdit) return null;
  return (
    <div className="strip border border-lime/40 px-3 py-2.5">
      <div className="title-lime text-lg leading-tight">{t.readOnlyTitle}</div>
      <p className="text-sm text-white/85">{t.readOnlyText}</p>
      {meta.data.groupInviteUrl && (
        <a href={meta.data.groupInviteUrl} target="_blank" rel="noreferrer" className="pill mt-2 inline-block px-4 py-1 text-base">
          {t.joinGroup}
        </a>
      )}
    </div>
  );
}
