// game.js — ゲームロジック全体

// ─────────────────────────────────────────────
//  ユーティリティ
// ─────────────────────────────────────────────
function toSubHTML(f) {
  return f.replace(/([0-9]+)/g, '<sub>$1</sub>');
}
function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function showS(n) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + n).classList.add('active');
}
function showPop(text) {
  const el = document.createElement('div');
  el.className = 'bonus-pop';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ─────────────────────────────────────────────
//  問題生成
// ─────────────────────────────────────────────
let _queue = [];
function makeQueue(diff) {
  const ik = diff === 'oni' ? 'hard' : diff;
  return shuffle([...ION[ik], ...shuffle(OTHER).slice(0, 24)]);
}
function nextQ(diff) {
  if (!_queue.length) _queue = makeQueue(diff);
  return _queue.shift();
}
function genWC(q) {
  const { c, cv, a, av } = q, g = gcd(cv, av), cNc = av / g, cNa = cv / g;
  return [[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,1],[3,2],[3,3]]
    .filter(([nc, na]) => !(nc === cNc && na === cNa)).slice(0, 4)
    .map(([nc, na]) => {
      const pA = na > 1 && a.length > 2, pC = nc > 1 && c.length > 2;
      return (pC ? '(' + c + ')' + nc : c + (nc === 1 ? '' : nc))
           + (pA ? '(' + a + ')' + na : a + (na === 1 ? '' : na));
    });
}
function makeChoices(q, diff) {
  const ik = diff === 'oni' ? 'hard' : diff;
  const correct = q.ans, used = new Set([correct]);
  const d = [];
  if (q.type === 'other') {
    for (const p of shuffle(OTHER)) {
      if (!used.has(p.ans) && d.length < 3) { used.add(p.ans); d.push(p.ans); }
    }
  } else {
    const ip = ION[ik];
    for (const p of shuffle(ip.filter(p => p.c === q.c && p.ans !== correct))) {
      if (!used.has(p.ans) && d.length < 2) { used.add(p.ans); d.push(p.ans); }
    }
    for (const p of shuffle(ip.filter(p => p.a === q.a && p.ans !== correct))) {
      if (!used.has(p.ans) && d.length < 3) { used.add(p.ans); d.push(p.ans); }
    }
    if (d.length < 3) {
      for (const w of genWC(q)) {
        if (!used.has(w) && d.length < 3) { used.add(w); d.push(w); }
      }
    }
    for (const p of shuffle([...ip, ...OTHER])) {
      if (d.length >= 3) break;
      if (!used.has(p.ans)) { used.add(p.ans); d.push(p.ans); }
    }
  }
  return shuffle([correct, ...d.slice(0, 3)]);
}

// ─────────────────────────────────────────────
//  画面遷移初期化
// ─────────────────────────────────────────────
function goMode(m) { showS(m === 'solo' ? 'solo-home' : 'multi-setup'); }

// 難易度ボタン（solo）
document.querySelectorAll('[data-d]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-d]').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    S.pendingDiff = b.dataset.d;
  });
});
// 難易度ボタン（multi）
document.querySelectorAll('[data-md]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-md]').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    M.pendingDiff = b.dataset.md;
  });
});
// 時間ボタン
document.querySelectorAll('[data-t]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-t]').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    M.pendingTime = parseInt(b.dataset.t);
  });
});

// ─────────────────────────────────────────────
//  SOLO モード
// ─────────────────────────────────────────────
const SOLO_CFG = {
  easy:   { skipMax: Infinity, timeBonus: false, pts: 80  },
  normal: { skipMax: 3,        timeBonus: false, pts: 120 },
  hard:   { skipMax: 1,        timeBonus: true,  pts: 160 },
  oni:    { skipMax: 0,        timeBonus: true,  pts: 200 },
};
const SOLO_TIME = 40;

const S = { pendingDiff: 'normal' };

function startSolo() {
  clearInterval(S.iv);
  _queue = [];
  S.diff  = S.pendingDiff || 'normal';
  S.name  = (document.getElementById('solo-name').value.trim() || 'プレイヤー').slice(0, 10);
  S.cfg   = SOLO_CFG[S.diff];
  S.score = 0; S.correct = 0; S.answered = 0;
  S.combo = 0; S.maxCombo = 0;
  S.skips = S.cfg.skipMax;
  S.wrongs = [];
  S.timeLeft = SOLO_TIME;
  S.qAnswered = false;
  showS('solo-game');
  updateSoloSkipUI();
  soloLoadQ();
  soloStartTimer();
}

function soloStartTimer() {
  clearInterval(S.iv);
  S.iv = setInterval(() => {
    S.timeLeft = Math.max(0, S.timeLeft - 0.1);
    soloUpdateTimer();
    if (S.timeLeft <= 0) { clearInterval(S.iv); soloFinish(); }
  }, 100);
}

function soloUpdateTimer() {
  const t = S.timeLeft, el = document.getElementById('sg-timer');
  el.textContent = Math.ceil(t);
  el.className = 'stat-value';
  if (t <= 5) el.classList.add('timer-danger');
  else if (t <= 10) el.classList.add('timer-warn');
  const pct = t / SOLO_TIME * 100;
  const bar = document.getElementById('sg-prog');
  bar.style.width = pct + '%';
  bar.className = 'progress-fill' + (t <= 5 ? ' prog-danger' : t <= 10 ? ' prog-warn' : '');
}

function updateSoloSkipUI() {
  const btn = document.getElementById('sg-skip-btn');
  const sl = S.skips;
  if (S.cfg.skipMax === 0) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  if (sl === Infinity) { btn.textContent = 'スキップ'; btn.disabled = false; }
  else if (sl > 0) { btn.textContent = `スキップ（残${sl}）`; btn.disabled = false; }
  else { btn.textContent = 'スキップ不可'; btn.disabled = true; }
}

function soloLoadQ() {
  S.qAnswered = false;
  const q = nextQ(S.diff);
  S.currentQ = q;
  document.getElementById('sg-name').textContent = q.name;
  document.getElementById('sg-bonus').textContent = '';
  const box = document.getElementById('sg-choices');
  box.innerHTML = '';
  makeChoices(q, S.diff).forEach(ch => {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.innerHTML = toSubHTML(ch);
    b.dataset.ans = ch;
    b.onclick = () => soloPick(b, ch, q);
    box.appendChild(b);
  });
}

function soloPick(btn, chosen, q) {
  if (S.qAnswered) return;
  S.qAnswered = true;
  S.answered++;
  const ok = chosen === q.ans;
  document.querySelectorAll('#sg-choices .choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.ans === q.ans) b.classList.add(ok ? 'correct' : 'reveal');
  });
  if (ok) {
    btn.classList.add('correct');
    S.correct++; S.combo++;
    if (S.combo > S.maxCombo) S.maxCombo = S.combo;
    S.score += S.cfg.pts + Math.min(S.combo - 1, 8) * 10;
    if (S.cfg.timeBonus && S.combo >= 5) {
      const t = S.timeLeft;
      const bonus = t >= 30 ? 2.0 : t >= 15 ? 1.5 : 1.0;
      S.timeLeft = Math.min(SOLO_TIME, S.timeLeft + bonus);
      showPop('+' + bonus.toFixed(1) + 's');
      document.getElementById('sg-bonus').textContent = `🔥 コンボ${S.combo}連！ +${bonus.toFixed(1)}秒`;
    }
  } else {
    btn.classList.add('wrong');
    S.combo = 0;
    S.wrongs.push({ q, chosen });
  }
  document.getElementById('sg-score').textContent = S.score;
  document.getElementById('sg-cor').textContent   = S.correct;
  document.getElementById('sg-combo').textContent  = S.combo;
  setTimeout(() => soloLoadQ(), 700);
}

function soloSkip() {
  if (S.qAnswered) return;
  if (S.cfg.skipMax !== Infinity && S.skips <= 0) return;
  if (S.cfg.skipMax !== Infinity) S.skips--;
  S.qAnswered = true;
  updateSoloSkipUI();
  document.querySelectorAll('#sg-choices .choice-btn').forEach(b => b.disabled = true);
  document.getElementById('sg-bonus').textContent = 'スキップ';
  setTimeout(() => soloLoadQ(), 400);
}

function soloEnd() { clearInterval(S.iv); soloFinish(); }

function soloFinish() {
  clearInterval(S.iv);
  const rate = S.answered > 0 ? Math.round(S.correct / S.answered * 100) : 0;
  let medal = '🥉', title = 'もう少し！', sub = '';
  if (S.correct >= 15 && rate >= 85) { medal = '🏆'; title = '完璧！'; sub = '化学式マスター！'; }
  else if (rate >= 75) { medal = '🥇'; title = 'すばらしい！'; }
  else if (rate >= 55) { medal = '🥈'; title = 'まあまあ！'; }
  document.getElementById('sr-medal').textContent  = medal;
  document.getElementById('sr-title').textContent  = title;
  document.getElementById('sr-sub').textContent    = sub;
  document.getElementById('sr-score').textContent  = S.score.toLocaleString();
  document.getElementById('sr-cor').textContent    = S.correct + '問';
  document.getElementById('sr-rate').textContent   = S.answered > 0 ? rate + '%' : '-%';
  document.getElementById('sr-mc').textContent     = S.maxCombo;

  const wl = document.getElementById('sr-wrongs');
  if (S.wrongs.length > 0) {
    let h = `<div class="wrong-list"><div class="wrong-list-title">間違えた問題（${S.wrongs.length}問）</div>`;
    S.wrongs.slice(0, 8).forEach(w => {
      h += `<div class="wrong-row">
        <span class="wrong-name">${w.q.name}</span>
        <span class="wrong-given">${toSubHTML(w.chosen)}</span>
        <span class="wrong-arrow">→</span>
        <span class="wrong-ans">${toSubHTML(w.q.ans)}</span>
      </div>`;
    });
    if (S.wrongs.length > 8) h += `<div style="font-size:12px;color:var(--text3);margin-top:4px;">他 ${S.wrongs.length - 8} 問</div>`;
    h += '</div>';
    wl.innerHTML = h;
  } else { wl.innerHTML = ''; }
  showS('solo-result');
}

// ─────────────────────────────────────────────
//  2人対戦モード（Firebase Realtime Database）
// ─────────────────────────────────────────────
const MAX_HP = 20;
const MULTI_SKIP = { easy: Infinity, normal: 3, hard: 1, oni: 0 };

const M = { pendingDiff: 'normal', pendingTime: 90 };

function genRoomId() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

// Firebase ヘルパー（firebase-init.js で window._fb にセット済み）
function fb() { return window._fb; }
function roomRef(roomId) { return fb().ref(fb().db, 'rooms/' + roomId); }

async function createRoom() {
  const name = (document.getElementById('multi-name').value.trim() || 'プレイヤー1').slice(0, 10);
  const roomId = genRoomId();
  M.roomId = roomId; M.role = 'host'; M.myName = name;
  M.diff = M.pendingDiff; M.timeLimit = M.pendingTime;

  const data = {
    host: name, diff: M.diff, timeLimit: M.timeLimit,
    state: 'waiting',
    hostHP: MAX_HP, guestHP: MAX_HP,
    pendingToHost: 0, pendingToGuest: 0,
    pendTimeHost: 0,  pendTimeGuest: 0,
    gameStart: 0,
    hostReady: false, guestReady: false,
  };
  await fb().set(roomRef(roomId), data);

  document.getElementById('wait-room-id').textContent = roomId;
  showS('multi-wait');

  // リアルタイムリスナーで相手の参加を待つ
  M.waitUnsub = fb().onValue(roomRef(roomId), snap => {
    const d = snap.val();
    if (!d) return;
    if (d.state === 'matched') {
      M.waitUnsub();
      M.guestName = d.guest;
      showReadyScreen(d);
    }
  });
}

async function joinRoom() {
  const name  = (document.getElementById('join-name').value.trim() || 'プレイヤー2').slice(0, 10);
  const rid   = document.getElementById('join-room-id').value.trim().toUpperCase();
  const errEl = document.getElementById('join-error');
  errEl.textContent = '';
  if (rid.length !== 6) { errEl.textContent = '6桁のIDを入力してください'; return; }

  const snap = await fb().get(roomRef(rid));
  if (!snap.exists()) { errEl.textContent = 'ルームが見つかりません'; return; }
  const d = snap.val();
  if (d.state !== 'waiting') { errEl.textContent = 'このルームはすでに開始しています'; return; }

  M.roomId = rid; M.role = 'guest'; M.myName = name;
  M.diff = d.diff; M.timeLimit = d.timeLimit; M.hostName = d.host;

  await fb().update(roomRef(rid), {
    guest: name, state: 'matched',
  });
  const snap2 = await fb().get(roomRef(rid));
  M.guestName = name;
  showReadyScreen(snap2.val());
}

async function cancelRoom() {
  if (M.waitUnsub) M.waitUnsub();
  await fb().remove(roomRef(M.roomId));
  showS('multi-top');
}

function showReadyScreen(roomData) {
  if (M.waitUnsub) M.waitUnsub();
  const oppName = M.role === 'host' ? (roomData.guest || '相手') : roomData.host;
  M.oppName = oppName;
  document.getElementById('ready-my-name').textContent  = M.myName;
  document.getElementById('ready-opp-name').textContent = oppName;
  document.getElementById('ready-my-status').textContent  = '⏳';
  document.getElementById('ready-opp-status').textContent = '⏳';
  document.getElementById('ready-msg').textContent = '準備ができたらReadyを押してください';
  document.getElementById('ready-btn').style.display = '';
  document.getElementById('ready-countdown').style.display = 'none';
  document.getElementById('ready-btn').disabled = false;
  showS('multi-ready');

  // リスナーでお互いのReady状態を監視
  M.readyUnsub = fb().onValue(roomRef(M.roomId), snap => {
    const d = snap.val();
    if (!d) return;
    const myReadyKey  = M.role === 'host' ? 'hostReady' : 'guestReady';
    const oppReadyKey = M.role === 'host' ? 'guestReady' : 'hostReady';
    document.getElementById('ready-my-status').textContent  = d[myReadyKey]  ? '✅' : '⏳';
    document.getElementById('ready-opp-status').textContent = d[oppReadyKey] ? '✅' : '⏳';
    if (d.hostReady && d.guestReady && d.state === 'matched') {
      if (M.role === 'host') {
        // ホストだけgameStartを書き込む
        fb().update(roomRef(M.roomId), { state: 'countdown', gameStart: Date.now() + 4000 });
      }
    }
    if (d.state === 'countdown' && !M.countingDown) {
      M.countingDown = true;
      if (M.readyUnsub) M.readyUnsub();
      startCountdown(d);
    }
  });
}

async function pressReady() {
  document.getElementById('ready-btn').disabled = true;
  document.getElementById('ready-msg').textContent = '相手の準備を待っています…';
  const myReadyKey = M.role === 'host' ? 'hostReady' : 'guestReady';
  await fb().update(roomRef(M.roomId), { [myReadyKey]: true });
}

function startCountdown(roomData) {
  document.getElementById('ready-btn').style.display = 'none';
  document.getElementById('ready-countdown').style.display = 'block';
  document.getElementById('ready-msg').textContent = '';
  const nums = ['3', '2', '1', 'Go!'];
  let i = 0;
  const el = document.getElementById('countdown-num');
  el.textContent = nums[0];
  const iv = setInterval(() => {
    i++;
    if (i < nums.length) {
      el.textContent = nums[i];
      el.style.animation = 'none';
      void el.offsetWidth; // reflow
      el.style.animation = 'countPop 0.8s ease';
    } else {
      clearInterval(iv);
      M.countingDown = false;
      startMultiGame(roomData);
    }
  }, 900);
}

function startMultiGame(roomData) {
  if (M.waitUnsub) M.waitUnsub();
  _queue = [];
  M.myHP = MAX_HP; M.oppHP = MAX_HP;
  M.myCombo = 0; M.myMaxCombo = 0; M.myCorrect = 0; M.myAnswered = 0;
  M.skipsLeft = MULTI_SKIP[M.diff];
  M.outPend = 0; M.outFireTime = 0;
  M.inPend  = 0; M.inFireTime  = 0;
  M.incomingPendFireTime = 0;
  M.ended = false; M.qAnswered = false;
  M.gameStart = roomData.gameStart || Date.now();
  const oppName = M.oppName || (M.role === 'host' ? (roomData.guest || '相手') : roomData.host);
  M.oppName = oppName;
  document.getElementById('mg-my-name').textContent  = M.myName;
  document.getElementById('mg-opp-name').textContent = oppName;
  updateMultiHPUI();
  updateMultiSkipUI();
  showS('multi-game');
  multiLoadQ();

  // ゲームタイマー
  if (M.timeLimit > 0) {
    M.gameIv = setInterval(() => tickMultiTimer(), 200);
  } else {
    document.getElementById('mg-timer').textContent = '∞';
  }

  // Firebase リアルタイムリスナーで相手状態を受信
  M.gameUnsub = fb().onValue(roomRef(M.roomId), snap => {
    if (M.ended) return;
    const d = snap.val();
    if (!d) return;

    // 相手HP反映
    const oppHPKey = M.role === 'host' ? 'guestHP' : 'hostHP';
    if (d[oppHPKey] !== undefined) M.oppHP = d[oppHPKey];

    // 相手→自分へのpendingダメージ
    const pendKey      = M.role === 'host' ? 'pendingToHost'  : 'pendingToGuest';
    const pendTimeKey  = M.role === 'host' ? 'pendTimeHost'   : 'pendTimeGuest';
    if (d[pendKey] && d[pendTimeKey] && d[pendTimeKey] !== M.incomingPendFireTime) {
      M.incomingPendFireTime = d[pendTimeKey];
      M.inPend = d[pendKey];
      scheduleSettlement();
    } else if (d[pendKey] && d[pendTimeKey] === M.incomingPendFireTime) {
      M.inPend = d[pendKey];
    }

    updateMultiHPUI();
    updatePendingUI();

    if (M.oppHP <= 0 && !M.ended) { M.ended = true; endMultiGame('win'); }
    if (M.myHP  <= 0 && !M.ended) { M.ended = true; endMultiGame('lose'); }
    if (d.state === 'ended' && !M.ended) {
      M.ended = true;
      endMultiGame(M.myHP > M.oppHP ? 'win' : M.myHP < M.oppHP ? 'lose' : 'draw');
    }
  });
}

function tickMultiTimer() {
  const elapsed = (Date.now() - M.gameStart) / 1000;
  const left = Math.max(0, M.timeLimit - elapsed);
  const el = document.getElementById('mg-timer');
  el.textContent = Math.ceil(left);
  el.className = 'stat-value';
  if (left <= 10) el.classList.add('timer-danger');
  else if (left <= 20) el.classList.add('timer-warn');
  const pct = left / M.timeLimit * 100;
  const bar = document.getElementById('mg-prog');
  bar.style.width = pct + '%';
  bar.className = 'progress-fill' + (left <= 10 ? ' prog-danger' : left <= 20 ? ' prog-warn' : '');
  if (left <= 0) { clearInterval(M.gameIv); timeUpMulti(); }
}

function timeUpMulti() {
  if (M.ended) return;
  M.ended = true;
  const result = M.myHP > M.oppHP ? 'win' : M.myHP < M.oppHP ? 'lose' : 'draw';
  endMultiGame(result, '時間切れ');
}

function multiLoadQ() {
  M.qAnswered = false;
  const q = nextQ(M.diff);
  M.currentQ = q;
  document.getElementById('mg-name').textContent = q.name;
  document.getElementById('mg-bonus').textContent = '';
  const box = document.getElementById('mg-choices');
  box.innerHTML = '';
  makeChoices(q, M.diff).forEach(ch => {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.innerHTML = toSubHTML(ch);
    b.dataset.ans = ch;
    b.onclick = () => multiPick(b, ch, q);
    box.appendChild(b);
  });
}

function multiPick(btn, chosen, q) {
  if (M.qAnswered || M.ended) return;
  M.qAnswered = true; M.myAnswered++;
  const ok = chosen === q.ans;
  document.querySelectorAll('#mg-choices .choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.ans === q.ans) b.classList.add(ok ? 'correct' : 'reveal');
  });
  if (ok) {
    btn.classList.add('correct');
    M.myCorrect++; M.myCombo++;
    if (M.myCombo > M.myMaxCombo) M.myMaxCombo = M.myCombo;
    // 連続正答ダメージ
    const dmg = M.myCombo >= 11 ? 5 : M.myCombo >= 5 ? 3 : M.myCombo >= 3 ? 2 : 0;
    if (dmg > 0) addOutgoingDamage(dmg);
  } else {
    btn.classList.add('wrong');
    M.myCombo = 0;
    addSelfDamage(3); // 不正解で自分に-3
  }
  document.getElementById('mg-cor').textContent   = M.myCorrect;
  document.getElementById('mg-combo').textContent = M.myCombo;
  setTimeout(() => multiLoadQ(), 700);
}

function multiSkip() {
  if (M.qAnswered || M.ended) return;
  if (MULTI_SKIP[M.diff] !== Infinity && M.skipsLeft <= 0) return;
  if (MULTI_SKIP[M.diff] !== Infinity) M.skipsLeft--;
  M.qAnswered = true;
  updateMultiSkipUI();
  document.querySelectorAll('#mg-choices .choice-btn').forEach(b => b.disabled = true);
  document.getElementById('mg-bonus').textContent = 'スキップ';
  setTimeout(() => multiLoadQ(), 400);
}

async function multiSurrender() {
  if (M.ended) return;
  M.ended = true;
  clearInterval(M.gameIv);
  if (M.gameUnsub) M.gameUnsub();
  clearTimeout(M.settleTimeout);
  await fb().update(roomRef(M.roomId), { state: 'ended' });
  endMultiGame('lose', '降参');
}

// ─── ダメージキューシステム ───────────────────

// 自分→相手ダメージを蓄積
function addOutgoingDamage(dmg) {
  if (!M.outFireTime) M.outFireTime = Date.now();
  M.outPend += dmg;
  scheduleSettlement();
  updatePendingUI();
  pushPendingToFirebase();
}

// 相手→自分ダメージ（不正解）を蓄積
function addSelfDamage(dmg) {
  if (!M.inFireTime) M.inFireTime = Date.now();
  M.inPend += dmg;
  scheduleSettlement();
  updatePendingUI();
}

function scheduleSettlement() {
  clearTimeout(M.settleTimeout);
  M.settleTimeout = setTimeout(() => settleAll(), 5000);
}

function settleAll() {
  const out = M.outPend || 0; // 自分→相手（正）
  const inc = M.inPend  || 0; // 相手→自分（正）
  const net = inc - out;      // 正=自分が受ける, 負=相手が受ける

  if (net > 0) {
    M.myHP = Math.max(0, M.myHP - Math.round(net));
    showPop('-' + Math.round(net) + ' HP');
  } else if (net < 0) {
    M.oppHP = Math.max(0, M.oppHP - Math.round(-net));
    showPop('⚔ -' + Math.round(-net) + ' 相手HP');
  } else if (out > 0 || inc > 0) {
    showPop('⚡ 相殺！');
  }

  M.outPend = 0; M.outFireTime = 0;
  M.inPend  = 0; M.inFireTime  = 0;
  M.incomingPendFireTime = 0;

  updateMultiHPUI();
  updatePendingUI();
  pushHPToFirebase();

  if (!M.ended) {
    if (M.myHP  <= 0) { M.ended = true; endMultiGame('lose'); }
    if (M.oppHP <= 0) { M.ended = true; endMultiGame('win'); }
  }
}

async function pushPendingToFirebase() {
  const pendKey     = M.role === 'host' ? 'pendingToGuest' : 'pendingToHost';
  const pendTimeKey = M.role === 'host' ? 'pendTimeGuest'  : 'pendTimeHost';
  await fb().update(roomRef(M.roomId), {
    [pendKey]:     M.outPend,
    [pendTimeKey]: M.outFireTime || Date.now(),
  });
}

async function pushHPToFirebase() {
  const myHPKey  = M.role === 'host' ? 'hostHP'  : 'guestHP';
  const oppHPKey = M.role === 'host' ? 'guestHP' : 'hostHP';
  await fb().update(roomRef(M.roomId), {
    [myHPKey]:  M.myHP,
    [oppHPKey]: M.oppHP,
  });
}

function updateMultiHPUI() {
  document.getElementById('mg-my-hp').textContent       = Math.max(0, M.myHP);
  document.getElementById('mg-opp-hp').textContent      = Math.max(0, M.oppHP);
  document.getElementById('mg-my-hp-bar').style.width   = Math.max(0, M.myHP)  / MAX_HP * 100 + '%';
  document.getElementById('mg-opp-hp-bar').style.width  = Math.max(0, M.oppHP) / MAX_HP * 100 + '%';
}

function updatePendingUI() {
  const el  = document.getElementById('mg-dmg-pending');
  const out = M.outPend || 0;
  const inc = M.inPend  || 0;
  const net = inc - out;
  if (out === 0 && inc === 0) { el.textContent = '－'; el.className = 'dmg-pending neutral'; return; }
  if (net < 0)      { el.textContent = `⚔ 相手に ${-net} ダメージ蓄積中…`; el.className = 'dmg-pending to-opp'; }
  else if (net > 0) { el.textContent = `💥 自分に ${net} ダメージ蓄積中…`;   el.className = 'dmg-pending to-me'; }
  else              { el.textContent = '⚡ ダメージ相殺！';                  el.className = 'dmg-pending cancel'; }
}

function updateMultiSkipUI() {
  const btn = document.getElementById('mg-skip-btn');
  const sl  = M.skipsLeft;
  if (MULTI_SKIP[M.diff] === 0) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  if (sl === Infinity)  { btn.textContent = 'スキップ'; btn.disabled = false; }
  else if (sl > 0)      { btn.textContent = `スキップ（残${sl}）`; btn.disabled = false; }
  else                  { btn.textContent = 'スキップ不可'; btn.disabled = true; }
}

function endMultiGame(result, reason = '') {
  clearInterval(M.gameIv);
  if (M.gameUnsub) M.gameUnsub();
  clearTimeout(M.settleTimeout);

  const rate = M.myAnswered > 0 ? Math.round(M.myCorrect / M.myAnswered * 100) : 0;
  let medal, title;
  if      (result === 'win')  { medal = '🏆'; title = '勝利！'; }
  else if (result === 'lose') { medal = '💀'; title = '敗北…'; }
  else                         { medal = '🤝'; title = '引き分け！'; }

  document.getElementById('mr-medal').textContent = medal;
  document.getElementById('mr-title').textContent = title;
  document.getElementById('mr-sub').textContent   = reason;
  document.getElementById('mr-cor').textContent   = M.myCorrect + '問';
  document.getElementById('mr-rate').textContent  = rate + '%';
  document.getElementById('mr-mc').textContent    = M.myMaxCombo;
  showS('multi-result');
}
