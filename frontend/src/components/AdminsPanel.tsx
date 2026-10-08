import { useState } from "react";
import { useAddAdmin, useAdmins, useMyProfile, useRemoveAdmin } from "../api/client";
import { displayName } from "../format";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";
import { ErrorBox, Loader, PillButton } from "./ui";

/** List of admins with add-by-username and remove. */
export function AdminsPanel() {
  const { t } = useI18n();
  const admins = useAdmins();
  const me = useMyProfile();
  const add = useAddAdmin();
  const remove = useRemoveAdmin();
  const [username, setUsername] = useState("");

  if (admins.isPending) return <Loader />;
  if (admins.isError) return <ErrorBox error={admins.error} />;

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs italic text-steel">{t.adminHint}</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!username.trim()) return;
          add.mutate(username, { onSuccess: () => (haptic.success(), setUsername("")), onError: () => haptic.error() });
        }}
      >
        <input
          className="field flex-1"
          placeholder={t.adminUsernamePlaceholder}
          autoCapitalize="off"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <PillButton type="submit" disabled={add.isPending || !username.trim()}>
          {t.addAdmin}
        </PillButton>
      </form>
      {(add.error || remove.error) && <ErrorBox error={add.error ?? remove.error} />}

      <div className="strip divide-y divide-white/10">
        {admins.data.map((a, i) => {
          const name = a.user ? displayName(a.user) : `@${a.username}`;
          const isMe = a.user != null && a.user.id === me.data?.user.id;
          return (
            <div key={a.id ?? `cfg-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="label-white truncate text-xl normal-case leading-tight">{name}</div>
                <div className="truncate text-xs text-steel">
                  {a.username && a.user && `@${a.username} · `}
                  {a.fromConfig ? t.adminFromConfig : !a.user ? t.adminNotJoined : ""}
                </div>
              </div>
              {!a.fromConfig && a.id != null && !isMe && (
                <PillButton
                  variant="danger"
                  className="shrink-0 text-base"
                  disabled={remove.isPending}
                  onClick={() => confirm(t.confirmRemoveAdmin(name)) && remove.mutate(a.id!)}
                >
                  {t.removeAdmin}
                </PillButton>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
