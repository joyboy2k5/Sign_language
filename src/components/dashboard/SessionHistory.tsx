import { useEffect, useState } from "react";
import { db } from "@/lib/db/localDb";
import type { Translation } from "@/lib/db/types";

interface SessionHistoryProps {
  refreshKey: number;
  onSelect: (text: string) => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function SessionHistory({ refreshKey, onSelect }: SessionHistoryProps) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    db.translations.search(query).then((r) => {
      if (!alive) return;
      setRows(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [query, refreshKey]);

  const handleDelete = async (id: string) => {
    await db.translations.delete(id);
    const r = await db.translations.search(query);
    setRows(r);
  };

  const handleReset = async () => {
    if (!window.confirm("Wipe all stored translations?")) return;
    await db.translations.clear();
    setRows([]);
  };

  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          session.history
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
        >
          reset
        </button>
      </div>

      <div className="border-b border-border p-2">
        <div className="flex items-center gap-2 rounded-sm border border-border bg-card px-2">
          <span className="font-mono text-[10px] text-muted-foreground">$</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="grep translations…"
            className="w-full bg-transparent py-1.5 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-3 font-mono text-[11px] text-muted-foreground">
            // querying local db…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="p-3 font-mono text-[11px] text-muted-foreground">
            // no records. completed sentences will appear here.
          </div>
        )}
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li
              key={r.id}
              className="group cursor-pointer px-3 py-2 transition hover:bg-muted"
              onClick={() => onSelect(r.text)}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {fmtDate(r.created_at)} · {fmtTime(r.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                    {(r.confidence * 100).toFixed(1)}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(r.id);
                    }}
                    className="font-mono text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    aria-label="delete record"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="font-mono text-xs leading-snug text-foreground">{r.text}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                sid:{r.session_id.slice(0, 8)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
