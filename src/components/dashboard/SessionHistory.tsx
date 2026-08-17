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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleExportJSON = () => {
    if (rows.length === 0) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lucidtalk-translations-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const header = "id,session_id,created_at,confidence,text\n";
    const body = rows
      .map(
        (r) =>
          `"${r.id}","${r.session_id}","${r.created_at}",${(r.confidence * 100).toFixed(1)},"${r.text.replace(/"/g, '""')}"`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lucidtalk-translations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyItem = async (r: Translation) => {
    try {
      await navigator.clipboard.writeText(r.text);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            session.history
          </span>
          <span className="rounded bg-card px-1 font-mono text-[9px] text-muted-foreground">
            {rows.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportJSON}
                title="Export JSON"
                className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                JSON
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={handleExportCSV}
                title="Export CSV"
                className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                CSV
              </button>
              <span className="text-border">|</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
          >
            reset
          </button>
        </div>
      </div>

      {/* Search Input */}
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

      {/* Rows */}
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
              className="group cursor-pointer px-3 py-2.5 transition hover:bg-muted/70"
              onClick={() => onSelect(r.text)}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {fmtDate(r.created_at)} · {fmtTime(r.created_at)}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary font-semibold">
                    {(r.confidence * 100).toFixed(1)}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCopyItem(r);
                    }}
                    className="font-mono text-[9px] text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-foreground"
                    title="Copy translation"
                  >
                    {copiedId === r.id ? "✓" : "⎘"}
                  </button>
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
              <p className="font-mono text-xs leading-snug text-foreground font-medium">{r.text}</p>
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
