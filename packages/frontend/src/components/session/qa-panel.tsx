export function QAPanel({ isHost = false }: { isHost?: boolean }) {
  void isHost; // isHost reserved for Phase 3 host controls

  return (
    <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">No questions yet</p>
      </div>
    </div>
  );
}
