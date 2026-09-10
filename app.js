/* app.js — UI giải cầu lông nội bộ 2026 */
(() => {
const D = window.TOURNAMENT_DATA;
const KEY = "aph-badminton-2026-results";
const KEY_KO = "aph-badminton-2026-ko";
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------- state ---------------- */
let results = {};
let koResults = {};
try { results = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { results = {}; }
try { koResults = JSON.parse(localStorage.getItem(KEY_KO) || "{}"); } catch (e) { koResults = {}; }
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(results));
    localStorage.setItem(KEY_KO, JSON.stringify(koResults));
  } catch (e) { toast("Không lưu được (bộ nhớ trình duyệt bị chặn)"); }
};
/* ghi 1 trận: lưu máy + đẩy lên server (nếu có cấu hình) */
function putGroup(id, a, b) { results[id] = { a, b, at: Date.now() }; save(); Sync.upsert(id, { a, b }); }
function delGroup(id) { delete results[id]; save(); Sync.remove(id); }
function putKOsets(id, sets) { koResults[id] = { sets, at: Date.now() }; save(); Sync.upsert(id, { sets }); }
function delKOsets(id) { delete koResults[id]; save(); Sync.remove(id); }

/* ---------- quyền nhập điểm ---------- */
let canEdit = false;
try { canEdit = sessionStorage.getItem("aph-edit") === "1"; } catch (e) { }
function askEdit() {
  const pw = prompt("Nhập mật khẩu để được phép sửa kết quả:");
  if (pw === null) return false;
  if (pw === (window.EDIT_PASSWORD || "")) {
    canEdit = true;
    try { sessionStorage.setItem("aph-edit", "1"); } catch (e) { }
    renderLock(); render(); toast("Đã mở quyền nhập điểm");
    return true;
  }
  toast("Mật khẩu không đúng");
  return false;
}
function renderLock() {
  const b = $("#btnLock");
  b.textContent = canEdit ? "🔓" : "🔒";
  b.title = canEdit ? "Đang có quyền nhập điểm — bấm để khoá lại" : "Bấm để nhập mật khẩu và được sửa kết quả";
}
$("#btnLock").onclick = () => {
  if (!canEdit) { askEdit(); return; }
  canEdit = false;
  try { sessionStorage.removeItem("aph-edit"); } catch (e) { }
  renderLock(); render(); toast("Đã khoá — chỉ xem");
};

let cat = RULES.CATS[0];
let tab = "groups";
let mFilter = "all";   // all | todo | done | A/B/C/D

/* ---------------- helpers ---------------- */
const T = code => D.teams[code] || { code, players: "?", cat: "", grp: "" };
const groupsOf = c => Object.keys(D.groups).filter(k => k.startsWith(c + "|")).map(k => k.split("|")[1]).sort();
const teamsOf = (c, g) => D.groups[c + "|" + g] || [];
const matchesOf = (c, g) => D.matches.filter(m => m.cat === c && (!g || m.grp === g));
const koOf = c => (D.knockout || []).filter(k => k.cat === c);
const koResolved = c => RULES.resolveKO(c, koOf(c), groupsData(c), results, koResults);

function groupsData(c) {
  return groupsOf(c).map(g => ({ grp: g, teams: teamsOf(c, g), matches: matchesOf(c, g) }));
}
function standingsOf(c, g) {
  return RULES.standings(teamsOf(c, g), matchesOf(c, g), results);
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2200);
}
const diffTxt = d => `<span class="diff ${d > 0 ? "pos" : d < 0 ? "neg" : ""}">${d > 0 ? "+" : ""}${d}</span>`;

/* ---------------- header + chips ---------------- */
$("#ttl").textContent = D.meta.shortTitle || D.meta.title;
$("#sub").textContent = `${D.meta.region} · ${D.meta.date}`;
function renderChips() {
  const bar = $("#catbar"); bar.innerHTML = "";
  RULES.CATS.forEach(c => {
    const n = matchesOf(c).length, dn = matchesOf(c).filter(m => results[m.id]).length;
    const nt = Object.values(D.teams).filter(t => t.cat === c).length;
    const b = el("button", "chip" + (c === cat ? " on" : ""),
      `${esc(c)} <span style="opacity:.7">· ${nt} đôi · ${dn}/${n} trận</span>`);
    b.onclick = () => { cat = c; mFilter = "all"; renderChips(); render(); };
    bar.appendChild(b);
  });
}

/* ================= VIEW: BẢNG ĐẤU ================= */
function viewGroups() {
  const v = el("div");
  const cfg = RULES.ADVANCE[cat] || {};
  (cfg.notes || []).forEach(n => v.appendChild(el("div", "note", `<span>⚠️</span><div>${esc(n)}</div>`)));

  groupsData(cat).forEach(g => {
    const st = standingsOf(cat, g.grp);
    const card = el("div", "card");
    const h = el("div", "card-h", `<h3>Bảng ${g.grp}</h3>
      <span class="badge mu">${g.teams.length} đội</span>
      <span class="badge ${st.complete ? "ok" : ""}">${st.playedN}/${st.total} trận</span>`);
    card.appendChild(h);
    const b = el("div", "card-b");
    st.rows.forEach(r => {
      const t = T(r.code);
      b.appendChild(el("div", "team",
        `<span class="pos ${r.pos === 1 ? "p1" : r.pos === 2 ? "p2" : ""}">${r.pos}</span>
         <span class="code">${esc(r.code)}</span>
         <span class="pl">${esc(t.players)}</span>`));
    });
    const pr = el("div", "prog", `<i style="width:${st.total ? st.playedN / st.total * 100 : 0}%"></i>`);
    b.appendChild(pr);
    card.appendChild(b);
    v.appendChild(card);
  });
  return v;
}

/* ================= VIEW: NHẬP KẾT QUẢ ================= */
function viewMatches() {
  const v = el("div");
  const fl = el("div", "filters");
  const opts = [["all", "Tất cả"], ["todo", "Chưa có KQ"], ["done", "Đã xong"]]
    .concat(groupsOf(cat).map(g => [g, "Bảng " + g]));
  opts.forEach(([k, lbl]) => {
    const b = el("button", "f" + (mFilter === k ? " on" : ""), esc(lbl));
    b.onclick = () => { mFilter = k; render(); };
    fl.appendChild(b);
  });
  v.appendChild(fl);

  let ms = matchesOf(cat);
  if (mFilter === "todo") ms = ms.filter(m => !results[m.id]);
  else if (mFilter === "done") ms = ms.filter(m => results[m.id]);
  else if (mFilter !== "all") ms = ms.filter(m => m.grp === mFilter);

  if (!ms.length) { v.appendChild(el("div", "empty", "Không có trận nào.")); return v; }

  // gom theo bảng
  const byG = {};
  ms.forEach(m => (byG[m.grp] = byG[m.grp] || []).push(m));
  Object.keys(byG).sort().forEach(g => {
    const card = el("div", "card");
    const dn = byG[g].filter(m => results[m.id]).length;
    card.appendChild(el("div", "card-h",
      `<h3>Bảng ${g}</h3><span class="badge ${dn === byG[g].length ? "ok" : ""}">${dn}/${byG[g].length}</span>`));
    byG[g].forEach(m => card.appendChild(matchRow(m)));
    v.appendChild(card);
  });
  return v;
}

function matchRow(m) {
  const r = results[m.id];
  const w1 = r && r.a > r.b, w2 = r && r.b > r.a;
  const b = el("button", "m");
  b.innerHTML =
    `<div class="m-meta">${m.no ? `<b>#${m.no}</b>` : `<b>—</b>`}${m.time ? esc(m.time.split(" - ")[0]) : "chưa có giờ"}${m.court ? "<br>" + esc(m.court) : ""}</div>
     <div class="m-body">
       <div class="m-side ${w1 ? "win" : ""}"><span class="c">${esc(m.t1)}</span><span class="n">${esc(T(m.t1).players)}</span></div>
       <div class="m-side ${w2 ? "win" : ""}"><span class="c">${esc(m.t2)}</span><span class="n">${esc(T(m.t2).players)}</span></div>
     </div>
     <div class="m-sc">${r
      ? `<b class="${w1 ? "w" : "lo"}">${r.a}</b><b class="${w2 ? "w" : "lo"}">${r.b}</b>`
      : `<span class="todo">${canEdit ? "Nhập" : "—"}</span>`}</div>`;
  b.onclick = () => openScore(m);
  return b;
}

/* ---------- modal nhập tỷ số ---------- */
let curM = null;
function openScore(m) {
  if (!canEdit && !askEdit()) return;
  curM = m;
  const r = results[m.id] || {};
  $("#scBody").innerHTML =
    `<h3>Nhập kết quả</h3>
     <p class="muted small">${esc(m.cat)} · Bảng ${esc(m.grp)}${m.no ? " · Trận #" + m.no : ""}${m.time ? " · " + esc(m.time) : ""}${m.court ? " · " + esc(m.court) : ""}</p>
     <p class="muted small">Vòng bảng: 01 séc chạm 25, cách biệt tối thiểu 2 điểm, chạm 31 là thắng.</p>
     <div class="sc-team"><div class="c">${esc(m.t1)}</div><div class="n">${esc(T(m.t1).players)}</div></div>
     <div class="sc-in">
       <input id="sa" type="number" inputmode="numeric" min="0" max="31" placeholder="0" value="${r.a ?? ""}">
       <span class="vs">–</span>
       <input id="sb" type="number" inputmode="numeric" min="0" max="31" placeholder="0" value="${r.b ?? ""}">
     </div>
     <div class="sc-team"><div class="c">${esc(m.t2)}</div><div class="n">${esc(T(m.t2).players)}</div></div>
     <div class="quick">
       <button data-q="25,0">25-0 (bỏ trận)</button>
       <button data-q="25,20">25-20</button><button data-q="25,23">25-23</button>
       <button data-q="27,25">27-25</button><button data-q="31,30">31-30</button>
       <button data-q="swap">⇄ Đảo</button>
     </div>
     <div class="err" id="scErr"></div>
     <div class="stack">
       <button class="btn pri" id="scSave">Lưu kết quả</button>
       ${results[m.id] ? '<button class="btn danger" id="scDel">Xoá kết quả trận này</button>' : ""}
     </div>`;
  $("#scoreModal").hidden = false;
  $("#scBody").querySelectorAll(".quick button").forEach(btn => btn.onclick = () => {
    const q = btn.dataset.q;
    if (q === "swap") { const a = $("#sa").value; $("#sa").value = $("#sb").value; $("#sb").value = a; }
    else { const [x, y] = q.split(","); $("#sa").value = x; $("#sb").value = y; }
  });
  $("#scSave").onclick = () => {
    const a = parseInt($("#sa").value, 10), b = parseInt($("#sb").value, 10);
    const err = RULES.validateSet(a, b);
    if (err) { $("#scErr").textContent = err; return; }
    const mm = curM;
    putGroup(mm.id, a, b);
    closeScore(); renderChips(); render();
    toast(`Đã lưu ${mm.t1} ${a}–${b} ${mm.t2}`);
  };
  if ($("#scDel")) $("#scDel").onclick = () => {
    delGroup(curM.id); closeScore(); renderChips(); render(); toast("Đã xoá kết quả");
  };
  setTimeout(() => $("#sa").focus(), 60);
}
function closeScore() { $("#scoreModal").hidden = true; curM = null; curK = null; }
$("#scClose").onclick = closeScore;
$("#scoreModal").onclick = e => { if (e.target.id === "scoreModal") closeScore(); };

/* ================= VIEW: XẾP HẠNG ================= */
function viewRank() {
  const v = el("div");
  const cfg = RULES.ADVANCE[cat] || {};
  v.appendChild(el("div", "note info",
    `<span>ℓ</span><div><b>Xét hạng:</b> Điểm (Thắng 1 / Thua 0) → Đối đầu trực tiếp → Hiệu số điểm → Bốc thăm.
     <br><b>Suất đi tiếp:</b> Nhất mỗi bảng vào ${esc(cfg.stage || "vòng sau")}${cfg.bestSeconds ? " + " + cfg.bestSeconds + " đội Nhì xuất sắc nhất" : ""}.</div>`));

  groupsData(cat).forEach(g => {
    const st = standingsOf(cat, g.grp);
    const ex = RULES.exclusionFor(cat, g.grp, g.teams, g.matches, results);
    const card = el("div", "card");
    card.appendChild(el("div", "card-h",
      `<h3>Bảng ${g.grp}</h3><span class="badge ${st.complete ? "ok" : "warn"}">${st.complete ? "Đã đủ trận" : st.playedN + "/" + st.total + " trận"}</span>`));
    const tw = el("div", "tw");
    let rows = st.rows.map(r => {
      const q = r.pos === 1 ? "q1" : (r.pos === 2 && cfg.bestSeconds) ? "q2" : "";
      return `<tr class="${q}">
        <td><span class="pos ${r.pos === 1 ? "p1" : r.pos === 2 ? "p2" : ""}">${r.pos}</span></td>
        <td class="l"><b>${esc(r.code)}</b><div class="muted small" style="max-width:180px;white-space:normal">${esc(T(r.code).players)}</div></td>
        <td>${r.played}</td><td><b>${r.win}</b></td><td>${r.loss}</td>
        <td>${r.pf}</td><td>${r.pa}</td><td>${diffTxt(r.diff)}</td><td><b>${r.pts}</b></td></tr>`;
    }).join("");
    tw.innerHTML = `<table><thead><tr><th>#</th><th class="l">Đội</th><th>Tr</th><th>T</th><th>Th</th>
      <th>Đg</th><th>Đm</th><th>+/−</th><th>Điểm</th></tr></thead><tbody>${rows}</tbody></table>`;
    card.appendChild(tw);
    const tied = st.rows.filter(r => r.tieBy);
    const b = el("div", "card-b");
    let html = "";
    if (tied.length) html += `<p class="muted small">⚖️ Có đội bằng điểm — đã xét theo ${esc([...new Set(tied.map(t => t.tieBy))].join(" / "))}.</p>`;
    if (ex.info) html += `<p class="muted small">🚫 Bảng nhiều đội: trận <b>${esc(ex.info.second)}</b> vs <b>${esc(ex.info.last)}</b> (Nhì vs đội cuối bảng) <b>không được tính</b> khi so sánh Nhì xuất sắc — bảng trên vẫn hiển thị thành tích đầy đủ.</p>`;
    if (!st.complete) html += `<p class="muted small">⏳ Còn ${st.total - st.playedN} trận chưa nhập — thứ hạng còn thay đổi.</p>`;
    if (html) { b.innerHTML = html; card.appendChild(b); }
    const eb = el("button", "explain-btn", "🔍 Xem diễn giải cách xếp hạng bảng " + g.grp);
    eb.onclick = () => openInfo(explainGroupHTML(cat, g.grp));
    card.appendChild(eb);
    v.appendChild(card);
  });
  return v;
}

/* ================= VIEW: NHÌ XUẤT SẮC ================= */
function viewSecond() {
  const v = el("div");
  const cfg = RULES.ADVANCE[cat] || {};
  if (!cfg.bestSeconds) {
    v.appendChild(el("div", "note info", `<span>ℓ</span><div>Nội dung <b>${esc(cat)}</b> có đủ ${groupsOf(cat).length} bảng — chỉ lấy đội <b>Nhất bảng</b> vào ${esc(cfg.stage)}, không cần xét Nhì xuất sắc.</div>`));
    v.appendChild(winnersCard());
    return v;
  }
  const bs = RULES.bestSeconds(cat, groupsData(cat), results);
  (cfg.notes || []).forEach(n => v.appendChild(el("div", "note", `<span>⚠️</span><div>${esc(n)}</div>`)));

  const card = el("div", "card");
  card.appendChild(el("div", "card-h",
    `<h3>So sánh đội Nhì bảng ${bs.pool.join(", ")}</h3>
     <span class="badge ${bs.allComplete ? "ok" : "warn"}">${bs.allComplete ? "Đủ trận" : "Tạm tính"}</span>`));
  const tw = el("div", "tw");
  tw.innerHTML = `<table><thead><tr><th>#</th><th class="l">Đội Nhì</th><th>Bảng</th><th>Tr</th>
    <th>Điểm</th><th>Đg</th><th>Đm</th><th>+/−</th></tr></thead><tbody>${
    bs.cands.map(c => `<tr class="${c.rank <= bs.take ? "q1" : ""}">
      <td><span class="pos ${c.rank === 1 ? "p1" : ""}">${c.rank}</span></td>
      <td class="l"><b>${esc(c.code)}</b>${c.excludedMatch ? ' <span class="badge warn">đã trừ 1 trận</span>' : ""}
        <div class="muted small" style="max-width:170px;white-space:normal">${esc(T(c.code).players)}</div></td>
      <td>${esc(c.grp)}</td><td>${c.played}</td><td><b>${c.pts}</b></td>
      <td>${c.pf}</td><td>${c.pa}</td><td>${diffTxt(c.diff)}</td></tr>`).join("")}</tbody></table>`;
  card.appendChild(tw);
  const b = el("div", "card-b");
  const top = bs.cands[0];
  let html = "";
  if (!bs.cands.length) html = `<p class="muted small">Chưa xác định được đội Nhì — cần nhập thêm kết quả.</p>`;
  else {
    html += `<p><b>Nhì xuất sắc nhất${bs.allComplete ? "" : " (tạm tính)"}: <span style="color:var(--ok)">${esc(top.code)}</span></b> — bảng ${esc(top.grp)}, ${top.pts} điểm, hiệu số ${top.diff > 0 ? "+" : ""}${top.diff}.</p>`;
    if (top.needDraw) html += `<p class="muted small">⚖️ Bằng nhau hoàn toàn với đội khác — theo điều lệ phải <b>bốc thăm</b>.</p>`;
    if (top.excludedMatch) html += `<p class="muted small">Đã loại thành tích trận ${esc(top.excludedMatch.second)} vs ${esc(top.excludedMatch.last)} theo quy định bảng nhiều đội.</p>`;
    if (!bs.allComplete) html += `<p class="muted small">⏳ Chưa đủ kết quả vòng bảng — số liệu sẽ thay đổi.</p>`;
    if (cfg.playoff) {
      const wD = standingsOf(cat, cfg.playoff.winnerOfGroup).rows[0];
      html += `<p style="margin-top:10px"><b>🎾 Play-off chọn suất cuối vào ${esc(cfg.stage)}:</b><br>
        Nhất bảng ${esc(cfg.playoff.winnerOfGroup)} <b>${wD ? esc(wD.code) : "?"}</b>
        &nbsp;vs&nbsp; Nhì XS nhất <b>${esc(top.code)}</b> (bảng ${esc(top.grp)})</p>`;
    }
  }
  b.innerHTML = html; card.appendChild(b);
  if (bs.cands.length) {
    const eb = el("button", "explain-btn", "🔍 Xem diễn giải chi tiết (trận bị trừ, chỉ số cụ thể)");
    eb.onclick = () => openInfo(explainSecondHTML(cat));
    card.appendChild(eb);
  }
  v.appendChild(card);
  v.appendChild(winnersCard());
  return v;
}

function winnersCard() {
  const cfg = RULES.ADVANCE[cat] || {};
  const card = el("div", "card");
  card.appendChild(el("div", "card-h", `<h3>Suất vào ${esc(cfg.stage || "vòng sau")}</h3>`));
  const b = el("div", "card-b");
  groupsOf(cat).forEach(g => {
    const st = standingsOf(cat, g);
    const w = st.rows[0];
    b.appendChild(el("div", "team",
      `<span class="pos p1">1</span><span class="code">${w ? esc(w.code) : "?"}</span>
       <span class="pl">${w ? esc(T(w.code).players) : "—"}<div class="muted small">Nhất bảng ${g}${st.complete ? "" : " (tạm tính)"}</div></span>`));
  });
  card.appendChild(b);
  return card;
}

/* ================= VIEW: LOẠI TRỰC TIẾP ================= */
function viewKO() {
  const v = el("div");
  const ko = koOf(cat);
  if (!ko.length) { v.appendChild(el("div", "empty", "Nội dung này chưa có lịch vòng loại trực tiếp.")); return v; }
  const R = koResolved(cat);
  v.appendChild(el("div", "note info",
    `<span>ℓ</span><div><b>Bán kết & Chung kết:</b> 03 séc thắng 02, mỗi séc chạm 21 (hoà 20-20 đánh lợi thế đến cách biệt 2 điểm, tối đa 31).
     ${R.allGroupsDone ? "" : "<br>⏳ Vòng bảng chưa xong — các ô còn hiện đội <b>tạm tính</b> và chưa cho nhập điểm."}</div>`));

  const byR = {};
  R.rounds.forEach(k => (byR[k.round] = byR[k.round] || []).push(k));
  ["Play-off", "Bán kết", "Chung kết"].forEach(rn => {
    if (!byR[rn]) return;
    const card = el("div", "card");
    const dn = byR[rn].filter(k => k.winner).length;
    card.appendChild(el("div", "card-h",
      `<h3>${esc(rn)}</h3><span class="badge ${dn === byR[rn].length ? "ok" : ""}">${dn}/${byR[rn].length}</span>`));
    byR[rn].forEach(k => card.appendChild(koRow(k)));
    v.appendChild(card);
  });

  // vô địch
  const ck = R.rounds.find(k => k.round === "Chung kết");
  if (ck) {
    const card = el("div", "card");
    card.appendChild(el("div", "card-h", `<h3>Kết quả chung cuộc</h3>`));
    const b = el("div", "card-b");
    const runner = ck.winner ? (ck.winner === ck.t1 ? ck.t2 : ck.t1) : null;
    b.innerHTML = ck.winner
      ? `<div class="team"><span class="pos p1">🥇</span><span class="code">${esc(ck.winner)}</span>
           <span class="pl">${esc(T(ck.winner).players)}<div class="muted small">Vô địch ${esc(cat)}</div></span></div>
         <div class="team"><span class="pos p2">🥈</span><span class="code">${esc(runner)}</span>
           <span class="pl">${esc(T(runner).players)}<div class="muted small">Á quân</div></span></div>`
      : `<p class="muted small">Chưa có kết quả chung kết.</p>`;
    card.appendChild(b);
    v.appendChild(card);
  }
  return v;
}

function koSide(k, side) {
  const code = side === 1 ? k.t1 : k.t2;
  const prov = side === 1 ? k.p1 : k.p2;
  const lbl = side === 1 ? k.l1 : k.l2;
  const win = k.winner && k.winner === code;
  if (code) return `<div class="m-side ${win ? "win" : ""}"><span class="c">${esc(code)}</span>
      <span class="n">${esc(T(code).players)}</span></div>`;
  return `<div class="m-side"><span class="c" style="color:var(--mu)">${esc(lbl)}</span>
      <span class="n muted">${prov ? "tạm tính: " + esc(prov) : "chờ kết quả"}</span></div>`;
}
function koRow(k) {
  const b = el("button", "m");
  const [w1, w2] = k.setWins;
  const scores = k.sets.length
    ? `<b class="${k.winner === k.t1 ? "w" : "lo"}">${w1}</b><b class="${k.winner === k.t2 ? "w" : "lo"}">${w2}</b>`
    : (k.ready ? `<span class="todo">Nhập</span>` : `<span class="muted small">chờ</span>`);
  b.innerHTML =
    `<div class="m-meta"><b>${k.sid}</b>${esc((k.time || "").split(" - ")[0])}${k.court ? "<br>" + esc(k.court) : ""}</div>
     <div class="m-body">${koSide(k, 1)}${koSide(k, 2)}
       ${k.sets.length ? `<div class="muted small" style="margin-top:3px">${k.sets.map(s => s[0] + "-" + s[1]).join(" · ")}</div>` : ""}
     </div>
     <div class="m-sc">${scores}</div>`;
  b.onclick = () => k.ready ? openKO(k) : toast("Chưa xác định được 2 đội — cần xong vòng trước");
  return b;
}

/* ---------- modal nhập KO (3 séc 21) ---------- */
let curK = null;
function openKO(k) {
  if (!canEdit && !askEdit()) return;
  curK = k;
  const s = k.sets || [];
  const row = i => `<div class="sc-in" style="margin:4px 0">
      <span class="vs" style="min-width:42px">Séc ${i + 1}</span>
      <input id="k${i}a" type="number" inputmode="numeric" min="0" max="31" placeholder="–" value="${s[i] ? s[i][0] : ""}" style="font-size:20px;padding:10px">
      <span class="vs">–</span>
      <input id="k${i}b" type="number" inputmode="numeric" min="0" max="31" placeholder="–" value="${s[i] ? s[i][1] : ""}" style="font-size:20px;padding:10px">
    </div>`;
  $("#scBody").innerHTML =
    `<h3>${esc(k.round)} — ${esc(k.sid)}</h3>
     <p class="muted small">${esc(k.cat)}${k.time ? " · " + esc(k.time) : ""}${k.court ? " · " + esc(k.court) : ""}
       <br>03 séc thắng 02, mỗi séc chạm 21 (20-20 đánh lợi thế, tối đa 31-30). Séc 3 chỉ nhập khi cần.</p>
     <div class="sc-team"><div class="c">${esc(k.t1)}</div><div class="n">${esc(T(k.t1).players)}</div></div>
     <div class="sc-team" style="padding-top:0"><div class="c">${esc(k.t2)}</div><div class="n">${esc(T(k.t2).players)}</div></div>
     ${row(0)}${row(1)}${row(2)}
     <div class="err" id="scErr"></div>
     <div class="stack">
       <button class="btn pri" id="koSave">Lưu kết quả</button>
       ${s.length ? '<button class="btn danger" id="koDel">Xoá kết quả trận này</button>' : ""}
     </div>`;
  $("#scoreModal").hidden = false;
  $("#koSave").onclick = () => {
    const sets = [];
    for (let i = 0; i < 3; i++) {
      const a = parseInt($(`#k${i}a`).value, 10), b = parseInt($(`#k${i}b`).value, 10);
      const empty = Number.isNaN(a) && Number.isNaN(b);
      if (empty) continue;
      const err = RULES.validateKOSet(a, b);
      if (err) { $("#scErr").textContent = `Séc ${i + 1}: ` + err; return; }
      sets.push([a, b]);
    }
    if (sets.length < 2) { $("#scErr").textContent = "Cần nhập tối thiểu 2 séc."; return; }
    if (!RULES.koWinnerIdx(sets)) { $("#scErr").textContent = "Chưa có đội thắng 2 séc — kiểm tra lại."; return; }
    const [x, y] = RULES.koSetWins(sets);
    if (Math.min(x, y) > 1 || Math.max(x, y) > 2) { $("#scErr").textContent = "Tỷ số séc không hợp lệ (tối đa 2-1)."; return; }
    if (sets.length === 3 && (x === 2 && y === 0 || y === 2 && x === 0)) {
      $("#scErr").textContent = "Đã thắng 2-0 thì không có séc 3."; return;
    }
    const kk = curK;
    putKOsets(kk.id, sets);
    closeScore(); render();
    toast(`Đã lưu ${kk.round}: ${kk.t1} ${x}–${y} ${kk.t2}`);
  };
  if ($("#koDel")) $("#koDel").onclick = () => {
    delKOsets(curK.id); closeScore(); render(); toast("Đã xoá kết quả");
  };
  setTimeout(() => $("#k0a").focus(), 60);
}

/* ================= DIỄN GIẢI ================= */
function openInfo(html) { $("#imBody").innerHTML = html; $("#infoModal").hidden = false; }
$("#imClose").onclick = () => $("#infoModal").hidden = true;
$("#infoModal").onclick = e => { if (e.target.id === "infoModal") $("#infoModal").hidden = true; };

// các trận của 1 đội trong bảng (đã có kết quả)
function teamMatches(cat, grp, code) {
  return matchesOf(cat, grp).filter(m => (m.t1 === code || m.t2 === code) && results[m.id])
    .map(m => {
      const r = results[m.id], home = m.t1 === code;
      const my = home ? r.a : r.b, op = home ? r.b : r.a;
      return { m, opp: home ? m.t2 : m.t1, my, op, win: my > op };
    });
}
const scTag = (a, b) => `<span class="sc ${a > b ? "ex-w" : "ex-x"}">${a}–${b}</span>`;

/* --- diễn giải 1 bảng --- */
function explainGroupHTML(cat, grp) {
  const teams = teamsOf(cat, grp), ms = matchesOf(cat, grp);
  const ex = RULES.exclusionFor(cat, grp, teams, ms, results);
  const st = RULES.standings(teams, ms, results);
  let h = `<h3>Diễn giải xếp hạng — ${esc(cat)} · Bảng ${esc(grp)}</h3>
    <p class="ex-sub">Vòng tròn 1 lượt · 01 séc chạm 25 · Thắng 1 điểm / Thua 0 điểm.
    Bằng điểm: đối đầu trực tiếp → hiệu số điểm → bốc thăm.</p>`;

  st.rows.forEach(r => {
    const list = teamMatches(cat, grp, r.code);
    h += `<div class="ex-h">${r.pos}. ${esc(r.code)} — ${esc(T(r.code).players)}</div>`;
    h += `<ul class="ex-l">` + (list.length ? list.map(x =>
      `<li>${x.win ? "✅ Thắng" : "❌ Thua"} ${esc(x.opp)} ${scTag(x.my, x.op)}
        <span class="muted">(${x.m.no ? "trận #" + x.m.no : x.m.id}${x.m.court ? ", " + esc(x.m.court) : ""})</span></li>`
    ).join("") : `<li class="muted">Chưa có trận nào có kết quả.</li>`) + `</ul>`;
    h += `<p class="ex-step">→ ${r.win} thắng / ${r.loss} thua = <b>${r.pts} điểm</b> ·
      ghi ${r.pf} – mất ${r.pa} quả · hiệu số <b>${r.diff > 0 ? "+" : ""}${r.diff}</b>${r.tieBy ? ` · phân định bằng: <b>${esc(r.tieBy)}</b>` : ""}</p>`;
  });

  // các cụm bằng điểm
  const byPts = {};
  st.rows.forEach(r => (byPts[r.pts] = byPts[r.pts] || []).push(r));
  Object.keys(byPts).sort((a, b) => b - a).forEach(pt => {
    const cl = byPts[pt];
    if (cl.length < 2) return;
    h += `<div class="ex-box info"><b>⚖️ ${cl.length} đội bằng ${pt} điểm:</b> ${cl.map(c => esc(c.code)).join(", ")}<br>`;
    const codes = new Set(cl.map(c => c.code));
    const inner = ms.filter(m => results[m.id] && codes.has(m.t1) && codes.has(m.t2));
    h += `<u>Bước 1 — đối đầu trực tiếp:</u><br>` + (inner.length ? inner.map(m => {
      const r = results[m.id];
      return `&nbsp;• ${esc(m.t1)} ${r.a}–${r.b} ${esc(m.t2)} → thắng: <b>${esc(r.a > r.b ? m.t1 : m.t2)}</b>`;
    }).join("<br>") : "&nbsp;• chưa có trận đối đầu nào");
    h += `<br>&nbsp;&nbsp;Điểm đối đầu: ${cl.map(c => `${esc(c.code)}=${c.h2hPts ?? 0}`).join(", ")}`;
    h += `<br><u>Bước 2 — hiệu số (nếu vẫn bằng):</u> ${cl.map(c => `${esc(c.code)}=${c.diff > 0 ? "+" : ""}${c.diff}`).join(", ")}`;
    h += `<br><u>Kết quả:</u> ${cl.map(c => `${c.pos}. ${esc(c.code)}`).join(" → ")}`;
    if (cl.some(c => c.tieBy === "Bốc thăm")) h += `<br><b>⚠️ Bằng nhau tuyệt đối — theo điều lệ phải BỐC THĂM.</b>`;
    h += `</div>`;
  });

  // luật trừ trận với đội cuối bảng
  if (ex.info) {
    const adj = RULES.standings(teams, ms, results, { exclude: ex.ids });
    const raw = st.rows.find(r => r.code === ex.info.second);
    const a = adj.rows.find(r => r.code === ex.info.second);
    const m = ms.find(x => x.id === ex.info.matchId);
    const r = results[ex.info.matchId];
    h += `<div class="ex-box"><b>🚫 Luật bảng nhiều đội (${esc(cat)} bảng ${esc(grp)}):</b><br>
      Đội Nhì bảng: <b>${esc(ex.info.second)}</b> (${esc(T(ex.info.second).players)})<br>
      Đội cuối bảng: <b>${esc(ex.info.last)}</b> (${esc(T(ex.info.last).players)})<br>
      Trận bị loại: ${m && m.no ? "#" + m.no : esc(ex.info.matchId)} — ${esc(m ? m.t1 : "")} ${r ? r.a + "–" + r.b : "chưa có KQ"} ${esc(m ? m.t2 : "")}<br>`;
    if (r && a && raw) {
      const mine = m.t1 === ex.info.second ? r.a : r.b, opp = m.t1 === ex.info.second ? r.b : r.a;
      h += `Với ${esc(ex.info.second)} trận này là <b>${mine > opp ? "thắng" : "thua"} ${mine}–${opp}</b>
        → khi so sánh Nhì xuất sắc phải trừ: <b>${mine > opp ? "1 điểm xếp hạng" : "0 điểm xếp hạng"}</b>,
        <b>${mine} quả ghi</b>, <b>${opp} quả mất</b>.<br>
        Chỉ số dùng để so sánh: ${raw.pts} → <b>${a.pts} điểm</b> ·
        ghi ${raw.pf} → <b>${a.pf}</b> · mất ${raw.pa} → <b>${a.pa}</b> ·
        hiệu số ${raw.diff > 0 ? "+" : ""}${raw.diff} → <b>${a.diff > 0 ? "+" : ""}${a.diff}</b>
        (số trận tính: ${raw.played} → <b>${a.played}</b>).`;
    } else {
      h += `Trận này chưa có kết quả nên chưa trừ gì.`;
    }
    h += `<br><i>Lưu ý: BXH phía trên vẫn hiển thị thành tích ĐẦY ĐỦ (dùng để xếp hạng trong bảng); việc trừ chỉ áp dụng khi so sánh đội Nhì giữa các bảng.</i></div>`;
  }
  if (!st.complete) h += `<div class="ex-box">⏳ Bảng còn ${st.total - st.playedN}/${st.total} trận chưa nhập — mọi con số trên còn thay đổi.</div>`;
  return h;
}

/* --- diễn giải Nhì xuất sắc --- */
function explainSecondHTML(cat) {
  const cfg = RULES.ADVANCE[cat] || {};
  const bs = RULES.bestSeconds(cat, groupsData(cat), results);
  let h = `<h3>Diễn giải "Nhì xuất sắc nhất" — ${esc(cat)}</h3>
    <p class="ex-sub">Lấy ${cfg.bestSeconds} đội · so sánh giữa các bảng ${bs.pool.join(", ")}<br>
    Tiêu chí lần lượt: <b>Điểm → Hiệu số điểm → Điểm ghi được → Bốc thăm</b>.</p>`;
  (cfg.notes || []).forEach(n => h += `<div class="ex-box">${esc(n)}</div>`);

  bs.cands.forEach(c => {
    const gm = matchesOf(cat, c.grp);
    const exIds = c.excludedMatch ? new Set([c.excludedMatch.matchId]) : new Set();
    h += `<div class="ex-h">Nhì bảng ${esc(c.grp)}: ${esc(c.code)} — ${esc(T(c.code).players)}</div>`;
    const list = teamMatches(cat, c.grp, c.code);
    h += `<ul class="ex-l">` + list.map(x => {
      const cut = exIds.has(x.m.id);
      return `<li class="${cut ? "excl" : ""}">${cut ? "🚫 KHÔNG TÍNH — " : ""}${x.win ? "✅ Thắng" : "❌ Thua"}
        ${esc(x.opp)} ${scTag(x.my, x.op)} <span class="muted">(${x.m.no ? "#" + x.m.no : x.m.id})</span></li>`;
    }).join("") + `</ul>`;
    if (c.excludedMatch) {
      h += `<div class="ex-box">Bảng ${esc(c.grp)} nhiều đội hơn → bỏ trận với <b>đội cuối bảng ${esc(c.excludedMatch.last)}</b>
        (${esc(T(c.excludedMatch.last).players)}).</div>`;
    }
    h += `<p class="ex-step">→ Chỉ số dùng để so sánh: <b>${c.pts} điểm</b> sau ${c.played} trận ·
      ghi ${c.pf} – mất ${c.pa} · hiệu số <b>${c.diff > 0 ? "+" : ""}${c.diff}</b></p>`;
  });

  h += `<div class="ex-h">So sánh</div>`;
  h += `<p class="ex-step"><u>Bước 1 — Điểm:</u> ${bs.cands.map(c => `${esc(c.code)}=${c.pts}`).join(" · ")}</p>`;
  h += `<p class="ex-step"><u>Bước 2 — Hiệu số:</u> ${bs.cands.map(c => `${esc(c.code)}=${c.diff > 0 ? "+" : ""}${c.diff}`).join(" · ")}</p>`;
  h += `<p class="ex-step"><u>Bước 3 — Điểm ghi:</u> ${bs.cands.map(c => `${esc(c.code)}=${c.pf}`).join(" · ")}</p>`;
  const top = bs.cands[0];
  if (top) {
    h += `<div class="ex-box ${bs.allComplete ? "ok" : ""}"><b>Kết luận${bs.allComplete ? "" : " (tạm tính)"}:</b>
      ${esc(top.code)} — ${esc(T(top.code).players)} (bảng ${esc(top.grp)}) là Nhì xuất sắc nhất.
      ${top.needDraw ? "<br><b>⚠️ Bằng tuyệt đối với đội khác — phải BỐC THĂM.</b>" : ""}
      ${cfg.playoff ? `<br>→ Vào <b>play-off</b> gặp Nhất bảng ${esc(cfg.playoff.winnerOfGroup)}.` : `<br>→ Vào thẳng <b>${esc(cfg.stage)}</b>.`}</div>`;
  }
  if (!bs.allComplete) h += `<div class="ex-box">⏳ Chưa xong hết vòng bảng — kết luận còn thay đổi.</div>`;
  return h;
}

/* ================= trạng thái đồng bộ ================= */
function renderSync() {
  const bar = $("#syncbar");
  if (!Sync.enabled) {
    bar.className = "syncbar mu";
    bar.innerHTML = `<span class="dot"></span>Chế độ máy lẻ — kết quả chỉ lưu trên thiết bị này`;
    bar.hidden = false; return;
  }
  const st = Sync.status, q = Sync.pending;
  const map = {
    connecting: ["mu", "Đang kết nối máy chủ…"],
    online: ["ok", `Đang đồng bộ chung${q ? ` · còn ${q} thay đổi chờ đẩy` : ""}`],
    offline: ["warn", `Mất mạng — đã lưu tạm${q ? ` ${q} thay đổi` : ""}, sẽ tự đẩy khi có mạng`],
    error: ["bad", `Không kết nối được máy chủ${q ? ` · ${q} thay đổi chờ` : ""}`],
    local: ["mu", "Chế độ máy lẻ"]
  };
  const [cls, txt] = map[st] || map.connecting;
  bar.className = "syncbar " + cls;
  bar.innerHTML = `<span class="dot"></span>${txt}<button id="syncNow">Tải lại</button>`;
  bar.hidden = false;
  const b = $("#syncNow");
  if (b) b.onclick = () => { Sync.pull().then(() => { Sync.flush(); toast("Đã tải lại từ máy chủ"); }); };
}

/* áp dữ liệu từ máy chủ vào bộ nhớ */
function applyRows(rows, mode) {
  if (mode === "full") { results = {}; koResults = {}; }
  rows.forEach(r => {
    const id = r.match_id;
    if (mode === "delete") { delete results[id]; delete koResults[id]; return; }
    if (r.sets) koResults[id] = { sets: r.sets, at: Date.parse(r.updated_at || "") || Date.now() };
    else if (r.a != null && r.b != null) results[id] = { a: r.a, b: r.b, at: Date.parse(r.updated_at || "") || Date.now() };
  });
  save();
}

/* ================= render ================= */
function render() {
  const v = $("#view"); v.innerHTML = "";
  v.appendChild(tab === "groups" ? viewGroups() : tab === "matches" ? viewMatches()
    : tab === "rank" ? viewRank() : tab === "second" ? viewSecond() : viewKO());
  window.scrollTo({ top: 0 });
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  t.classList.add("active"); tab = t.dataset.tab; render();
});

/* ================= data modal ================= */
function rowsForExport() {
  const out = [["STT", "Mã trận", "Thời gian", "Sân", "Nội dung", "Bảng", "Mã đội 1", "Đội 1", "Điểm 1", "Điểm 2", "Mã đội 2", "Đội 2", "Thắng", "Chi tiết séc"]];
  D.matches.forEach(m => {
    const r = results[m.id];
    out.push([m.no ?? "", m.id, m.time, m.court, m.cat, m.grp, m.t1, T(m.t1).players,
      r ? r.a : "", r ? r.b : "", m.t2, T(m.t2).players, r ? (r.a > r.b ? m.t1 : m.t2) : ""]);
  });
  (D.knockout || []).forEach(k => {
    const R = koResolved(k.cat).rounds.find(x => x.id === k.id) || k;
    const r = koResults[k.id];
    out.push([k.no ?? "", k.sid, k.time, k.court, k.cat, k.round,
      R.t1 || R.l1, R.t1 ? T(R.t1).players : "", R.setWins ? R.setWins[0] : "",
      R.setWins ? R.setWins[1] : "", R.t2 || R.l2, R.t2 ? T(R.t2).players : "",
      R.winner || ""].concat(r ? [r.sets.map(x => x[0] + "-" + x[1]).join(" ")] : []));
  });
  return out;
}
function dl(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
$("#btnData").onclick = () => {
  const n = Object.keys(results).length, nk = Object.keys(koResults).length;
  $("#dmStat").textContent = `Đã nhập ${n}/${D.matches.length} trận vòng bảng · ${nk}/${(D.knockout || []).length} trận loại trực tiếp.`;
  $("#dataModal").hidden = false;
};
$("#dmClose").onclick = () => $("#dataModal").hidden = true;
$("#dataModal").onclick = e => { if (e.target.id === "dataModal") $("#dataModal").hidden = true; };
$("#btnCopyTSV").onclick = async () => {
  const tsv = rowsForExport().map(r => r.join("\t")).join("\n");
  try { await navigator.clipboard.writeText(tsv); toast("Đã copy — dán trực tiếp vào Google Sheet"); }
  catch (e) { dl("ket-qua.tsv", tsv, "text/tab-separated-values"); toast("Đã tải file TSV"); }
};
$("#btnCSV").onclick = () => {
  const csv = rowsForExport().map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  dl(`ket-qua-cau-long-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
};
$("#btnJSON").onclick = () => dl(`sao-luu-cau-long-${Date.now()}.json`,
  JSON.stringify({ results, ko: koResults }, null, 1), "application/json");
$("#fileJSON").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const o = JSON.parse(rd.result);
      if (typeof o !== "object" || Array.isArray(o)) throw 0;
      results = o.results && o.ko ? o.results : o;
      koResults = o.results && o.ko ? o.ko : koResults;
      save();
      if (Sync.enabled) {
        if (!canEdit && !askEdit()) { toast("Đã nạp vào máy này, chưa đẩy lên máy chủ"); }
        else {
          Object.entries(results).forEach(([id, r]) => Sync.upsert(id, { a: r.a, b: r.b }));
          Object.entries(koResults).forEach(([id, r]) => Sync.upsert(id, { sets: r.sets }));
          toast("Đã nạp và đẩy lên máy chủ");
        }
      }
      renderChips(); renderSync(); render();
      $("#dataModal").hidden = true; toast("Đã nạp sao lưu");
    } catch (err) { toast("File JSON không hợp lệ"); }
  };
  rd.readAsText(f); e.target.value = "";
};
$("#btnReset").onclick = () => {
  const shared = Sync.enabled;
  const msg = shared
    ? "XOÁ TOÀN BỘ kết quả trên MÁY CHỦ — tất cả 3 máy sẽ mất hết dữ liệu đã nhập. Chắc chắn?"
    : "Xoá toàn bộ kết quả đã nhập trên thiết bị này?";
  if (!confirm(msg)) return;
  if (shared) {
    if (!canEdit && !askEdit()) return;
    if (!confirm("Xác nhận lần 2: xoá hết kết quả của cả giải?")) return;
    Object.keys(results).forEach(id => Sync.remove(id));
    Object.keys(koResults).forEach(id => Sync.remove(id));
  }
  results = {}; koResults = {}; save(); renderChips(); renderSync(); render();
  $("#dataModal").hidden = true; toast("Đã xoá");
};

renderLock(); renderChips(); renderSync(); render();

Sync.onStatus(() => renderSync());
Sync.onRemote((rows, mode) => {
  applyRows(rows, mode);
  renderChips(); renderSync(); render();
  if (mode !== "full") toast("Có kết quả mới từ máy khác");
});
Sync.init().then(res => {
  if (Sync.enabled && res && res.rows) { applyRows(res.rows, "full"); renderChips(); render(); }
  renderSync();
});
})();
