/* =======================================================================
   rules.js — Engine tính điểm / xếp hạng theo ĐIỀU LỆ GIẢI CẦU LÔNG 2026
   -----------------------------------------------------------------------
   Vòng bảng: vòng tròn 1 lượt, mỗi trận 01 séc chạm 25 (cách biệt tối
   thiểu 2 điểm, ai chạm 31 trước thì thắng). Thắng 1 điểm / Thua 0 điểm.
   Thứ tự xét hạng khi bằng điểm:
     (1) Đối đầu trực tiếp -> (2) Hiệu số điểm (toàn vòng bảng) -> (3) Bốc thăm
   ======================================================================= */

const RULES = (() => {

  /* --- Cấu hình suất đi tiếp — Khu vực HÀ NỘI (theo mục II & III điều lệ) --- */
  const ADVANCE = {
    "ĐÔI NAM": {
      stage: "Bán kết",
      takeWinners: "all",              // 4 bảng -> 4 nhất bảng vào bán kết
      bestSeconds: 0,
      notes: ["4 bảng — chỉ lấy đội Nhất mỗi bảng vào Bán kết."]
    },
    "ĐÔI NỮ": {
      stage: "Bán kết",
      takeWinners: "all",              // 3 nhất bảng
      bestSeconds: 1,                  // + 1 đội Nhì xuất sắc nhất
      secondPool: "all",
      // Bảng B nhiều đội hơn -> bỏ thành tích trận Nhì bảng B vs đội cuối bảng B
      excludeVsLast: [{ grp: "B" }],
      notes: [
        "Chỉ có 3 bảng nên lấy thêm 01 đội Nhì xuất sắc nhất vào Bán kết.",
        "Bảng B có nhiều đội hơn: KHÔNG tính thành tích trận của đội Nhì bảng B với đội cuối bảng B khi so sánh Nhì xuất sắc."
      ]
    },
    "ĐÔI NAM NỮ": {
      stage: "Bán kết",
      takeWinners: "all",
      bestSeconds: 1,
      secondPool: ["A", "B", "C"],     // nhì xuất sắc nhất của 3 bảng còn lại
      playoff: { winnerOfGroup: "D" },  // play-off: Nhất bảng D vs Nhì XS nhất (A,B,C)
      notes: [
        "Bảng D ít đội hơn: tổ chức 01 trận play-off giữa Nhất bảng D và đội Nhì xuất sắc nhất của 3 bảng A, B, C — đội thắng play-off vào Bán kết (gặp Nhất bảng C)."
      ]
    }
  };

  const CATS = ["ĐÔI NAM", "ĐÔI NAM NỮ", "ĐÔI NỮ"];

  /* ---------------- Hợp lệ tỷ số 1 séc chạm 25 ---------------- */
  function validateSet(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) return "Nhập số nguyên cho cả hai đội.";
    if (a < 0 || b < 0) return "Điểm không được âm.";
    if (a > 31 || b > 31) return "Điểm tối đa là 31.";
    if (a === b) return "Một séc không thể hoà.";
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (hi === 31) return lo === 30 ? null : "Chạm 31 chỉ xảy ra ở tỷ số 31-30.";
    if (hi < 25) return "Đội thắng phải đạt tối thiểu 25 điểm.";
    if (hi - lo < 2) return "Phải cách biệt tối thiểu 2 điểm (trừ tỷ số 31-30).";
    if (lo > 29) return "Tỷ số không hợp lệ.";
    return null;
  }

  /* ---------------- Tính bảng xếp hạng 1 bảng ---------------- */
  // matches: mảng trận của đúng bảng đó; results: {matchId:{a,b}}
  // opts.exclude: Set các matchId bị loại khỏi thống kê
  function standings(teamCodes, matches, results, opts = {}) {
    teamCodes = teamCodes || [];
    matches = matches || [];
    const excl = opts.exclude || new Set();
    const S = {};
    teamCodes.forEach(c => S[c] = {
      code: c, played: 0, win: 0, loss: 0, pts: 0, pf: 0, pa: 0, diff: 0, excluded: 0
    });

    const done = [];
    matches.forEach(m => {
      const r = results[m.id];
      if (!r) return;
      if (excl.has(m.id)) {
        if (S[m.t1]) S[m.t1].excluded++;
        if (S[m.t2]) S[m.t2].excluded++;
        return;
      }
      if (!S[m.t1] || !S[m.t2]) return;
      done.push({ m, r });
      const A = S[m.t1], B = S[m.t2];
      A.played++; B.played++;
      A.pf += r.a; A.pa += r.b; B.pf += r.b; B.pa += r.a;
      if (r.a > r.b) { A.win++; A.pts++; B.loss++; } else { B.win++; B.pts++; A.loss++; }
    });
    Object.values(S).forEach(s => s.diff = s.pf - s.pa);

    /* --- head-to-head trong cụm bằng điểm --- */
    function h2h(cluster) {
      const set = new Set(cluster);
      const mini = {};
      cluster.forEach(c => mini[c] = { pts: 0, diff: 0, n: 0 });
      done.forEach(({ m, r }) => {
        if (!set.has(m.t1) || !set.has(m.t2)) return;
        mini[m.t1].n++; mini[m.t2].n++;
        mini[m.t1].diff += r.a - r.b; mini[m.t2].diff += r.b - r.a;
        if (r.a > r.b) mini[m.t1].pts++; else mini[m.t2].pts++;
      });
      return mini;
    }

    let rows = Object.values(S);
    // sắp xếp sơ bộ theo điểm
    rows.sort((x, y) => y.pts - x.pts);

    const out = [];
    let i = 0;
    while (i < rows.length) {
      let j = i;
      while (j + 1 < rows.length && rows[j + 1].pts === rows[i].pts) j++;
      const cluster = rows.slice(i, j + 1);
      if (cluster.length === 1) {
        cluster[0].tieBy = null;
        out.push(cluster[0]);
      } else {
        const mini = h2h(cluster.map(c => c.code));
        cluster.sort((x, y) =>
          (mini[y.code].pts - mini[x.code].pts) ||
          (mini[y.code].diff - mini[x.code].diff) ||
          (y.diff - x.diff) ||
          (y.pf - x.pf)
        );
        cluster.forEach((c, k) => {
          const p = cluster[k - 1], n = cluster[k + 1];
          const same = o => o && mini[o.code].pts === mini[c.code].pts &&
            mini[o.code].diff === mini[c.code].diff && o.diff === c.diff && o.pf === c.pf;
          c.tieBy = (same(p) || same(n)) ? "Bốc thăm" : "Đối đầu trực tiếp → hiệu số điểm";
          c.h2hPts = mini[c.code].pts; c.h2hDiff = mini[c.code].diff;
          out.push(c);
        });
      }
      i = j + 1;
    }
    out.forEach((r, k) => r.pos = k + 1);

    const total = matches.length;
    const playedN = matches.filter(m => results[m.id]).length;
    return { rows: out, total, playedN, complete: playedN === total };
  }

  /* -------- Bảng nhiều đội: xác định trận (Nhì) vs (đội cuối) cần loại -------- */
  function exclusionFor(cat, grp, teamCodes, matches, results) {
    const cfg = ADVANCE[cat];
    if (!cfg || !cfg.excludeVsLast) return { ids: new Set(), info: null };
    if (!cfg.excludeVsLast.some(e => e.grp === grp)) return { ids: new Set(), info: null };
    const base = standings(teamCodes, matches, results);
    if (base.rows.length < 3) return { ids: new Set(), info: null };
    const second = base.rows[1].code;
    const last = base.rows[base.rows.length - 1].code;
    const m = matches.find(x =>
      (x.t1 === second && x.t2 === last) || (x.t2 === second && x.t1 === last));
    if (!m) return { ids: new Set(), info: null };
    return {
      ids: new Set([m.id]),
      info: { matchId: m.id, second, last, complete: base.complete }
    };
  }

  /* ---------------- Nhì xuất sắc nhất ---------------- */
  // groupsData: [{grp, teams, matches}]
  function bestSeconds(cat, groupsData, results) {
    const cfg = ADVANCE[cat] || {};
    if (!cfg.bestSeconds) return null;
    const pool = cfg.secondPool === "all" || !cfg.secondPool
      ? groupsData.map(g => g.grp) : cfg.secondPool;

    const cands = [];
    let allComplete = true;
    groupsData.forEach(g => {
      if (!pool.includes(g.grp)) return;
      const ex = exclusionFor(cat, g.grp, g.teams, g.matches, results);
      const raw = standings(g.teams, g.matches, results);
      const adj = standings(g.teams, g.matches, results, { exclude: ex.ids });
      if (!raw.complete) allComplete = false;
      const secondCode = raw.rows[1] && raw.rows[1].code;
      if (!secondCode) return;
      const a = adj.rows.find(r => r.code === secondCode);
      cands.push({
        grp: g.grp, code: secondCode,
        pts: a.pts, played: a.played, pf: a.pf, pa: a.pa, diff: a.diff,
        winRate: a.played ? a.win / a.played : 0,
        excludedMatch: ex.info, complete: raw.complete
      });
    });

    // So sánh: Điểm -> Hiệu số điểm -> Điểm ghi được -> Bốc thăm
    cands.sort((x, y) => (y.pts - x.pts) || (y.diff - x.diff) || (y.pf - x.pf));
    cands.forEach((c, k) => {
      const t = o => o && o.pts === c.pts && o.diff === c.diff && o.pf === c.pf;
      c.needDraw = t(cands[k - 1]) || t(cands[k + 1]);
      c.rank = k + 1;
    });
    return { pool, cands, allComplete, take: cfg.bestSeconds };
  }

  /* ================= VÒNG LOẠI TRỰC TIẾP ================= */
  /* Bán kết & Chung kết: 03 séc thắng 02, mỗi séc chạm 21.
     Hoà 20-20 đánh lợi thế đến khi cách 2 điểm, tối đa chạm 31. */
  function validateKOSet(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) return "Nhập số nguyên cho cả hai đội.";
    if (a < 0 || b < 0) return "Điểm không được âm.";
    if (a > 31 || b > 31) return "Điểm tối đa là 31.";
    if (a === b) return "Một séc không thể hoà.";
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (hi === 31) return lo === 30 ? null : "Chạm 31 chỉ xảy ra ở tỷ số 31-30.";
    if (hi < 21) return "Đội thắng séc phải đạt tối thiểu 21 điểm.";
    if (hi === 21) return lo <= 19 ? null : "21 điểm chỉ thắng khi đối thủ ≤ 19.";
    return hi - lo === 2 ? null : "Sau 20-20 phải thắng đúng cách biệt 2 điểm (hoặc 31-30).";
  }

  // sets: [[a,b], ...] -> 1 | 2 | 0 (chưa xong)
  function koWinnerIdx(sets) {
    let w1 = 0, w2 = 0;
    (sets || []).forEach(([a, b]) => {
      if (!Number.isInteger(a) || !Number.isInteger(b)) return;
      if (a > b) w1++; else if (b > a) w2++;
    });
    return w1 >= 2 ? 1 : w2 >= 2 ? 2 : 0;
  }
  function koSetWins(sets) {
    let w1 = 0, w2 = 0;
    (sets || []).forEach(([a, b]) => { if (a > b) w1++; else if (b > a) w2++; });
    return [w1, w2];
  }

  /* Điền đội vào sơ đồ KO từ BXH vòng bảng + kết quả KO đã có.
     ko: mảng trận KO của 1 nội dung; groupsData: [{grp,teams,matches}] */
  function resolveKO(cat, ko, groupsData, results, koResults) {
    const stand = {}, complete = {};
    groupsData.forEach(g => {
      const st = standings(g.teams, g.matches, results);
      stand[g.grp] = st; complete[g.grp] = st.complete;
    });
    const allGroupsDone = groupsData.every(g => complete[g.grp]);
    const bs = bestSeconds(cat, groupsData, results);

    const out = ko.map(k => ({ ...k, sets: (koResults[k.id] || {}).sets || [], t1: null, t2: null }));
    const bySid = {};
    out.forEach(k => bySid[k.sid] = k);

    function resolve(slot) {
      if (!slot) return { code: null, label: "?", ready: false };
      if (slot.t === "w") {
        const st = stand[slot.grp];
        const c = st && st.rows[0] && st.rows[0].code;
        return { code: complete[slot.grp] ? c : null, label: slot.label, ready: !!complete[slot.grp], prov: c };
      }
      if (slot.t === "r2") {
        const st = stand[slot.grp];
        const c = st && st.rows[1] && st.rows[1].code;
        return { code: complete[slot.grp] ? c : null, label: slot.label, ready: !!complete[slot.grp], prov: c };
      }
      if (slot.t === "bs") {
        const c = bs && bs.cands[0] && bs.cands[0].code;
        const ready = !!(bs && bs.allComplete && c);
        return { code: ready ? c : null, label: slot.label, ready, prov: c };
      }
      if (slot.t === "m") {
        const src = bySid[slot.ref];
        if (!src) return { code: null, label: slot.label, ready: false };
        const w = koWinnerIdx(src.sets);
        const code = w === 1 ? src.t1 : w === 2 ? src.t2 : null;
        return { code, label: slot.label, ready: !!code };
      }
      return { code: null, label: slot.label, ready: false };
    }

    // giải theo thứ tự Play-off -> Bán kết -> Chung kết (mảng ko đã sắp sẵn)
    out.forEach(k => {
      const a = resolve(k.s1), b = resolve(k.s2);
      k.t1 = a.code; k.t2 = b.code;
      k.l1 = a.label; k.l2 = b.label;
      k.p1 = a.prov || null; k.p2 = b.prov || null;
      k.ready = a.ready && b.ready;
      const w = koWinnerIdx(k.sets);
      k.winner = w === 1 ? k.t1 : w === 2 ? k.t2 : null;
      k.setWins = koSetWins(k.sets);
    });
    return { rounds: out, allGroupsDone };
  }

  return {
    ADVANCE, CATS, validateSet, standings, exclusionFor, bestSeconds,
    validateKOSet, koWinnerIdx, koSetWins, resolveKO
  };
})();
