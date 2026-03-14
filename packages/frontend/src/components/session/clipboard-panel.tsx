import { getTranslations } from 'next-intl/server';

export async function ClipboardPanel({ isHost = false }: { isHost?: boolean }) {
  const t = await getTranslations('session');

  return (
    <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
      {isHost ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Snippet composer will appear here — Phase 3
          </p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('waitingForSpeaker')}
          </p>
        </div>
      )}
    </div>
  );
}
