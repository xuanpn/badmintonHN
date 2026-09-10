/* ============================================================
   sync.js — đồng bộ kết quả qua Supabase (nhiều máy nhập chung)
   ------------------------------------------------------------
   Bảng dữ liệu (xem SQL trong README):
     event      text   -- "hanoi-2026"
     match_id   text   -- "M001" (vòng bảng) hoặc "ĐÔI NAM|BK1" (loại trực tiếp)
     a, b       int    -- tỷ số 1 séc của vòng bảng
     sets       jsonb  -- [[21,15],[19,21],[21,18]] của vòng loại trực tiếp
   Không cấu hình -> chế độ "local": mọi thứ vẫn chạy, chỉ lưu máy này.
   ============================================================ */
const Sync = (() => {
  const cfg = window.SUPABASE || {};
  const enabled = !!(cfg.url && cfg.anonKey);
  const TABLE = cfg.table || "results";
  const EVENT = cfg.event || "default";

  let client = null;
  let status = enabled ? "connecting" : "local"; // local|connecting|online|offline|error
  const onStatus = [];
  const onRemote = [];
  let queue = [];                                 // ghi chưa đẩy lên được
  try { queue = JSON.parse(localStorage.getItem("aph-sync-queue") || "[]"); } catch (e) { queue = []; }
  const saveQueue = () => { try { localStorage.setItem("aph-sync-queue", JSON.stringify(queue)); } catch (e) { } };

  function setStatus(s) { status = s; onStatus.forEach(f => { try { f(s); } catch (e) { } }); }

  /* ---------- khởi tạo ---------- */
  async function init() {
    if (!enabled) { setStatus("local"); return { rows: [] }; }
    if (!window.supabase || !window.supabase.createClient) {
      console.warn("[sync] không tải được supabase-js");
      setStatus("error"); return { rows: [] };
    }
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      realtime: { params: { eventsPerSecond: 5 } }
    });
    const res = await pull();
    subscribe();
    flush();
    window.addEventListener("online", () => { pull().then(() => flush()); });
    window.addEventListener("offline", () => setStatus("offline"));
    // đối chiếu lại mỗi 60s cho chắc (nếu realtime bị chặn)
    setInterval(() => { if (status !== "offline") pull(); }, 60000);
    return res;
  }

  /* ---------- đọc toàn bộ ---------- */
  async function pull() {
    if (!client) return { rows: [] };
    try {
      const { data, error } = await client.from(TABLE).select("*").eq("event", EVENT);
      if (error) throw error;
      setStatus("online");
      onRemote.forEach(f => { try { f(data || [], "full"); } catch (e) { } });
      return { rows: data || [] };
    } catch (e) {
      console.warn("[sync] pull lỗi:", e.message || e);
      setStatus(navigator.onLine ? "error" : "offline");
      return { rows: [] };
    }
  }

  /* ---------- nghe thay đổi realtime ---------- */
  function subscribe() {
    if (!client) return;
    client.channel("results-" + EVENT)
      .on("postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `event=eq.${EVENT}` },
        payload => {
          const row = payload.eventType === "DELETE" ? payload.old : payload.new;
          if (!row) return;
          onRemote.forEach(f => {
            try { f([row], payload.eventType === "DELETE" ? "delete" : "upsert"); } catch (e) { }
          });
        })
      .subscribe(st => { if (st === "SUBSCRIBED") setStatus("online"); });
  }

  /* ---------- ghi ---------- */
  function upsert(matchId, payload) {          // payload: {a,b} hoặc {sets}
    const row = Object.assign({ event: EVENT, match_id: matchId, a: null, b: null, sets: null,
      updated_at: new Date().toISOString() }, payload);
    return send({ op: "upsert", row });
  }
  function remove(matchId) {
    return send({ op: "delete", row: { event: EVENT, match_id: matchId } });
  }

  async function send(job) {
    if (!enabled) return true;
    if (!client || !navigator.onLine) { queue.push(job); saveQueue(); setStatus("offline"); return false; }
    try {
      if (job.op === "upsert") {
        const { error } = await client.from(TABLE).upsert(job.row, { onConflict: "event,match_id" });
        if (error) throw error;
      } else {
        const { error } = await client.from(TABLE).delete()
          .eq("event", job.row.event).eq("match_id", job.row.match_id);
        if (error) throw error;
      }
      setStatus("online");
      return true;
    } catch (e) {
      console.warn("[sync] ghi lỗi:", e.message || e);
      queue.push(job); saveQueue();
      setStatus(navigator.onLine ? "error" : "offline");
      return false;
    }
  }

  /* ---------- đẩy hàng đợi ---------- */
  let flushing = false;
  async function flush() {
    if (flushing || !client || !queue.length) return;
    flushing = true;
    const pending = queue.slice(); queue = []; saveQueue();
    for (const job of pending) {
      const ok = await send(job);
      if (!ok) break;                            // send() đã đẩy lại vào queue
    }
    flushing = false;
  }
  setInterval(flush, 15000);

  return {
    enabled, EVENT, TABLE,
    init, pull, upsert, remove, flush,
    get status() { return status; },
    get pending() { return queue.length; },
    onStatus: f => onStatus.push(f),
    onRemote: f => onRemote.push(f)
  };
})();
