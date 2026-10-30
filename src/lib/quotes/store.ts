import { promises as fs } from "fs";
import path from "path";
import type { Quote } from "./model";

// Quote storage. Two backends:
//  - Supabase (when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set): table `quotes`
//    with columns id text primary key, data jsonb, created_at timestamptz, status text.
//  - Local JSON file (dev / single-box demo): data/quotes.json
// The rest of the app only sees getQuote / saveQuote / listQuotes.

interface Store {
  get(id: string): Promise<Quote | null>;
  save(q: Quote): Promise<void>;
  list(limit?: number): Promise<Quote[]>;
}

// ---------------------------------------------------------------- Supabase
function supabaseStore(url: string, key: string): Store {
  const base = `${url.replace(/\/$/, "")}/rest/v1/quotes`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  return {
    async get(id) {
      const r = await fetch(`${base}?id=eq.${encodeURIComponent(id)}&select=data`, { headers, cache: "no-store" });
      if (!r.ok) throw new Error(`supabase get ${r.status}`);
      const rows = (await r.json()) as Array<{ data: Quote }>;
      return rows[0]?.data ?? null;
    },
    async save(q) {
      const r = await fetch(base, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ id: q.id, data: q, status: q.status, created_at: q.createdAt }),
      });
      if (!r.ok) throw new Error(`supabase save ${r.status}: ${await r.text()}`);
    },
    async list(limit = 100) {
      const r = await fetch(`${base}?select=data&order=created_at.desc&limit=${limit}`, { headers, cache: "no-store" });
      if (!r.ok) throw new Error(`supabase list ${r.status}`);
      const rows = (await r.json()) as Array<{ data: Quote }>;
      return rows.map((x) => x.data);
    },
  };
}

// ---------------------------------------------------------------- JSON file
function fileStore(): Store {
  const file = path.join(process.cwd(), "data", "quotes.json");
  let lock: Promise<unknown> = Promise.resolve();
  async function readAll(): Promise<Record<string, Quote>> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      return {};
    }
  }
  async function writeAll(all: Record<string, Quote>) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(all, null, 2));
  }
  return {
    async get(id) {
      return (await readAll())[id] ?? null;
    },
    async save(q) {
      const run = async () => {
        const all = await readAll();
        all[q.id] = q;
        await writeAll(all);
      };
      lock = lock.then(run, run);
      await lock;
    },
    async list(limit = 100) {
      return Object.values(await readAll())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  };
}

// ---------------------------------------------------------------- memory (last resort, e.g. read-only FS)
function memoryStore(): Store {
  const g = globalThis as unknown as { __quotes?: Map<string, Quote> };
  g.__quotes ??= new Map();
  const m = g.__quotes;
  return {
    async get(id) { return m.get(id) ?? null; },
    async save(q) { m.set(q.id, q); },
    async list(limit = 100) {
      return [...m.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    },
  };
}

let store: Store | null = null;
export function getStore(): Store {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) store = supabaseStore(url, key);
  else if (process.env.VERCEL) store = memoryStore();
  else store = fileStore();
  return store;
}

export const getQuote = (id: string) => getStore().get(id);
export const saveQuote = (q: Quote) => getStore().save(q);
export const listQuotes = (limit?: number) => getStore().list(limit);
