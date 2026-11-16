// Small key-value store on Cloudflare D1 (free SQLite database).
// It offers the same calls the rest of the code uses: get, getWithMetadata,
// setJSON with "only if new" / "only if unchanged" conditions, delete and list.
// The conditional writes are what stop two buyers holding the same work.
//
// The D1 database is bound to the site as "DB" (see SETUP-FOR-ARTIST.md).
// The table is created automatically the first time it is used.

let ready = null;

function db() {
  const d = globalThis.__D1__;
  if (!d) throw new Error("The D1 database is not connected: add a D1 binding called DB in Cloudflare Pages settings.");
  return d;
}

async function ensureTable() {
  if (!ready) {
    ready = db()
      .prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, etag INTEGER NOT NULL)")
      .run()
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const newEtag = () => Math.floor(Math.random() * 2 ** 31) + 1;

export function d1Store(namespace) {
  const full = (key) => `${namespace}/${key}`;
  return {
    async getWithMetadata(key) {
      await ensureTable();
      const row = await db().prepare("SELECT v, etag FROM kv WHERE k = ?").bind(full(key)).first();
      return row ? { data: JSON.parse(row.v), etag: String(row.etag) } : null;
    },
    async get(key) {
      const r = await this.getWithMetadata(key);
      return r ? r.data : null;
    },
    async setJSON(key, value, opts = {}) {
      await ensureTable();
      const etag = newEtag();
      const v = JSON.stringify(value);
      let res;
      if (opts.onlyIfNew) {
        res = await db().prepare("INSERT INTO kv (k, v, etag) VALUES (?, ?, ?) ON CONFLICT(k) DO NOTHING").bind(full(key), v, etag).run();
      } else if (opts.onlyIfMatch) {
        res = await db().prepare("UPDATE kv SET v = ?, etag = ? WHERE k = ? AND etag = ?").bind(v, etag, full(key), Number(opts.onlyIfMatch)).run();
      } else {
        res = await db().prepare("INSERT INTO kv (k, v, etag) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, etag = excluded.etag").bind(full(key), v, etag).run();
      }
      const changed = (res.meta?.changes ?? 0) > 0;
      return { modified: changed, etag: changed ? String(etag) : undefined };
    },
    async delete(key) {
      await ensureTable();
      await db().prepare("DELETE FROM kv WHERE k = ?").bind(full(key)).run();
    },
    async list({ prefix = "" } = {}) {
      await ensureTable();
      const start = full(prefix);
      // keys in [start, start + U+FFFF): a prefix match without LIKE escaping
      const { results } = await db().prepare("SELECT k FROM kv WHERE k >= ? AND k < ? ORDER BY k").bind(start, start + "￿").all();
      return { blobs: results.map((r) => ({ key: r.k.slice(namespace.length + 1) })) };
    },
  };
}

/** Store for original-work holds and sales. */
export function store() {
  if (globalThis.__TEST_STORE__) return globalThis.__TEST_STORE__;
  return d1Store("sales");
}
