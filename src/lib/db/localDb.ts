import type { Session, Translation } from "./types";

const STORAGE_KEY = "lucidtalk.db.v1";

interface DbShape {
  sessions: Session[];
  translations: Translation[];
}

const empty: DbShape = { sessions: [], translations: [] };

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function read(): DbShape {
  if (typeof window === "undefined") return { ...empty };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], translations: [] };
    const parsed = JSON.parse(raw) as DbShape;
    return {
      sessions: parsed.sessions ?? [],
      translations: parsed.translations ?? [],
    };
  } catch {
    return { sessions: [], translations: [] };
  }
}

function write(data: DbShape): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Simulated async latency to mirror a real DB call.
function delay<T>(value: T, ms = 40): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

export const db = {
  ping(): Promise<boolean> {
    return delay(true, 80);
  },
  sessions: {
    async create(): Promise<Session> {
      const data = read();
      const session: Session = {
        id: uid(),
        started_at: new Date().toISOString(),
        ended_at: null,
      };
      data.sessions.unshift(session);
      write(data);
      return delay(session);
    },
    async list(): Promise<Session[]> {
      return delay(read().sessions);
    },
  },
  translations: {
    async insert(input: {
      session_id: string;
      text: string;
      confidence: number;
    }): Promise<Translation> {
      const data = read();
      const row: Translation = {
        id: uid(),
        session_id: input.session_id,
        text: input.text,
        confidence: input.confidence,
        created_at: new Date().toISOString(),
      };
      data.translations.unshift(row);
      write(data);
      return delay(row);
    },
    async list(): Promise<Translation[]> {
      return delay(read().translations);
    },
    async search(q: string): Promise<Translation[]> {
      const needle = q.trim().toLowerCase();
      const rows = read().translations;
      if (!needle) return delay(rows);
      return delay(rows.filter((r) => r.text.toLowerCase().includes(needle)));
    },
    async delete(id: string): Promise<void> {
      const data = read();
      data.translations = data.translations.filter((r) => r.id !== id);
      write(data);
      return delay(undefined);
    },
    async clear(): Promise<void> {
      write({ sessions: [], translations: [] });
      return delay(undefined);
    },
  },
};
