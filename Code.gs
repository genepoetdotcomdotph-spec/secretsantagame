/**
 * Monito · Monita — Christmas gift draw (Google Apps Script back end)
 * ---------------------------------------------------------------
 * One Google Sheet holds every group. Tabs (made by setup()):
 *   Groups   code | name | budget | hostKey | locked | created
 *   Members  code | nameKey | name | pinHash | token | wish1 | wish2 | wish3 | drew | drewAt | joined
 *   Pairs    code | giverKey | receiverKey
 *
 * Deploy:  Deploy → New deployment → Web app
 *          Execute as: Me   ·   Who has access: Anyone
 * Then paste the /exec link into API_URL in index.html.
 */

const MIN_PEOPLE = 3;
const PIN_TRIES  = 8;          // wrong PIN attempts allowed per 10 minutes
const SALT       = 'mm-2026';  // change to any random text before you deploy

/* ============================ entry points ============================ */

function doGet() {
  return ContentService.createTextOutput('Monito · Monita back end is running.');
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = ACTIONS[req.action];
    if (!fn) throw new Error('Unknown action');
    if (WRITES.indexOf(req.action) >= 0) {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try { out = fn(req); } finally { lock.releaseLock(); }
    } else {
      out = fn(req);
    }
  } catch (err) {
    out = { ok: false, error: err.message || String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor (▶ Run → setup) to create the tabs. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const make = (name, head) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  };
  make('Groups',  ['code', 'name', 'budget', 'hostKey', 'locked', 'created']);
  make('Members', ['code', 'nameKey', 'name', 'pinHash', 'token', 'wish1', 'wish2', 'wish3', 'drew', 'drewAt', 'joined']);
  make('Pairs',   ['code', 'giverKey', 'receiverKey']);
  // all cells as plain text so codes/PINs never get reformatted
  ['Groups', 'Members', 'Pairs'].forEach(n => ss.getSheetByName(n).getRange('A:K').setNumberFormat('@'));
}

/* ============================ actions ============================ */

const WRITES = ['createGroup', 'join', 'wishes', 'draw', 'lock', 'resetDraw', 'remove', 'resetPin'];

const ACTIONS = {

  createGroup(r) {
    const name = clean(r.name).slice(0, 40);
    if (name.length < 2) return fail('Please type a group name');
    const budget = Math.round(Number(r.budget));
    if (!(budget > 0)) return fail('Please enter a gift budget');
    const groups = sheet('Groups');
    const codes = col(groups, 1);
    let code;
    do { code = rnd(4) + '-' + rnd(4); } while (codes.indexOf(code) >= 0);
    const hostKey = rnd(20, 'abcdefghijkmnpqrstuvwxyz23456789');
    groups.appendRow([code, safe(name), budget, hostKey, 'no', new Date().toISOString()]);
    return { ok: true, code: code, hostKey: hostKey, budget: budget, name: name };
  },

  groupInfo(r) {
    const g = group(r.g); if (!g) return fail('notfound');
    return Object.assign({ ok: true }, pub(g, members(g.code)));
  },

  join(r) {
    const g = group(r.g); if (!g) return fail('notfound');
    if (g.locked) return fail('Sign-ups are closed — the host has locked this draw');
    const name = clean(r.name);
    if (name.length < 2) return fail('Please type a secret name (at least 2 letters)');
    if (!/^\d{4}$/.test(String(r.pin))) return fail('Your PIN needs exactly 4 digits');
    const ms = members(g.code);
    if (ms.some(m => m.nameKey === key(name))) return fail('That secret name is taken — try another, or sign in if it’s you');
    const m = { code: g.code, nameKey: key(name), name: name, pinHash: hashPin(g.code, r.pin),
                token: rnd(24, 'abcdefghijkmnpqrstuvwxyz23456789'), wishes: null, drew: false, drewAt: '', joined: new Date().toISOString() };
    sheet('Members').appendRow(toRow(m));
    ms.push(m);
    return session(g, m, ms);
  },

  login(r) {
    const g = group(r.g); if (!g) return fail('notfound');
    const k = key(r.name), cache = CacheService.getScriptCache(), ck = 'pin:' + g.code + ':' + k;
    const tries = Number(cache.get(ck) || 0);
    if (tries >= PIN_TRIES) return fail('Too many wrong tries — please wait 10 minutes or ask your host to reset your PIN');
    const ms = members(g.code), m = ms.filter(x => x.nameKey === k)[0];
    if (!m || m.pinHash !== hashPin(g.code, r.pin)) { cache.put(ck, String(tries + 1), 600); return fail('That secret name and PIN don’t match'); }
    cache.remove(ck);
    return session(g, m, ms);
  },

  me(r) {
    const g = group(r.g); if (!g) return fail('notfound');
    const ms = members(g.code), m = ms.filter(x => x.token && x.token === r.token)[0];
    if (!m) return fail('signedout');
    return session(g, m, ms);
  },

  wishes(r) {
    const g = group(r.g); if (!g) return fail('notfound');
    const ms = members(g.code), m = ms.filter(x => x.token && x.token === r.token)[0];
    if (!m) return fail('signedout');
    if (m.wishes) return fail('Your wishes are already sealed');
    const w = (r.wishes || []).map(x => clean(x).slice(0, 80));
    if (w.length !== 3 || w.some(x => !x)) return fail('Please fill in all three wishes');
    m.wishes = w; save(m);
    return session(g, m, ms);
  },

  draw(r) {
    const g = group(r.g); if (!g) return fail('notfound');
    if (!g.locked) return fail('The draw isn’t open yet');
    const ms = members(g.code), m = ms.filter(x => x.token && x.token === r.token)[0];
    if (!m) return fail('signedout');
    if (!m.drew) { m.drew = true; m.drewAt = new Date().toISOString(); save(m); }
    return session(g, m, ms);
  },

  /* ---------- host only ---------- */

  host(r) {
    const g = hostGroup(r); if (!g) return fail('notfound');
    const ms = members(g.code).sort((a, b) => a.joined < b.joined ? -1 : 1);
    return Object.assign({ ok: true }, pub(g, ms), { members: ms.map(m => ({ name: m.name, ready: !!m.wishes, drew: m.drew })) });
  },

  lock(r) {
    const g = hostGroup(r); if (!g) return fail('notfound');
    if (g.locked) return ACTIONS.host(r);
    const ms = members(g.code), ready = ms.filter(m => m.wishes);
    if (ready.length < MIN_PEOPLE) return fail('At least ' + MIN_PEOPLE + ' people with sealed wishes are needed');
    // drop anyone who never sealed wishes
    ms.filter(m => !m.wishes).sort((a, b) => b._row - a._row).forEach(m => deleteRow('Members', m._row));
    // one big gift loop: shuffle, then each person gives to the next
    const ks = ready.map(m => m.nameKey);
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = ks[i]; ks[i] = ks[j]; ks[j] = t; }
    clearPairs(g.code);
    const pairs = sheet('Pairs');
    pairs.getRange(pairs.getLastRow() + 1, 1, ks.length, 3).setValues(ks.map((k, i) => [g.code, k, ks[(i + 1) % ks.length]]));
    sheet('Groups').getRange(g._row, 5).setValue('yes');
    return ACTIONS.host(r);
  },

  resetDraw(r) {
    const g = hostGroup(r); if (!g) return fail('notfound');
    clearPairs(g.code);
    members(g.code).forEach(m => { if (m.drew) { m.drew = false; m.drewAt = ''; save(m); } });
    sheet('Groups').getRange(g._row, 5).setValue('no');
    return ACTIONS.host(r);
  },

  remove(r) {
    const g = hostGroup(r); if (!g) return fail('notfound');
    if (g.locked) return fail('Reset the draw before removing anyone');
    const m = members(g.code).filter(x => x.nameKey === key(r.name))[0];
    if (m) deleteRow('Members', m._row);
    return ACTIONS.host(r);
  },

  resetPin(r) {
    const g = hostGroup(r); if (!g) return fail('notfound');
    if (!/^\d{4}$/.test(String(r.pin))) return fail('The new PIN needs exactly 4 digits');
    const m = members(g.code).filter(x => x.nameKey === key(r.name))[0];
    if (!m) return fail('Not found');
    m.pinHash = hashPin(g.code, r.pin);
    m.token = rnd(24, 'abcdefghijkmnpqrstuvwxyz23456789');   // signs them out everywhere
    save(m);
    CacheService.getScriptCache().remove('pin:' + g.code + ':' + m.nameKey);
    return ACTIONS.host(r);
  }
};

/* ============================ helpers ============================ */

function fail(msg) { return { ok: false, error: msg }; }
function sheet(n) { const s = SpreadsheetApp.getActive().getSheetByName(n); if (!s) throw new Error('Run setup() first'); return s; }
function col(sh, c) { const n = sh.getLastRow() - 1; return n > 0 ? sh.getRange(2, c, n, 1).getValues().map(r => String(r[0])) : []; }
function rnd(n, abc) { abc = abc || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < n; i++) s += abc.charAt(Math.floor(Math.random() * abc.length)); return s; }
function clean(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' '); }
function key(s) { return clean(s).toLowerCase(); }
function hashPin(code, pin) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + ':' + code + ':' + String(pin));
  return Utilities.base64Encode(b);
}

function group(code) {
  code = String(code || '').toUpperCase(); if (!code) return null;
  const sh = sheet('Groups'), n = sh.getLastRow() - 1; if (n < 1) return null;
  const v = sh.getRange(2, 1, n, 6).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === code)
    return { code: code, name: String(v[i][1]), budget: Number(v[i][2]), hostKey: String(v[i][3]), locked: String(v[i][4]) === 'yes', _row: i + 2 };
  return null;
}
function hostGroup(r) { const g = group(r.g); return g && r.key && g.hostKey === String(r.key) ? g : null; }

function members(code) {
  const sh = sheet('Members'), n = sh.getLastRow() - 1; if (n < 1) return [];
  return sh.getRange(2, 1, n, 11).getValues().map((v, i) => ({
    code: String(v[0]), nameKey: String(v[1]), name: String(v[2]), pinHash: String(v[3]), token: String(v[4]),
    wishes: v[5] ? [String(v[5]), String(v[6]), String(v[7])] : null,
    drew: String(v[8]) === 'yes', drewAt: String(v[9]), joined: String(v[10]), _row: i + 2
  })).filter(m => m.code === code);
}
function safe(v) { v = String(v == null ? '' : v); return /^[=+\-@]/.test(v) ? "'" + v : v; }   // stop text being read as a formula
function toRow(m) {
  const w = m.wishes || ['', '', ''];
  return [m.code, safe(m.nameKey), safe(m.name), m.pinHash, m.token, safe(w[0]), safe(w[1]), safe(w[2]), m.drew ? 'yes' : 'no', m.drewAt || '', m.joined];
}
function save(m) { sheet('Members').getRange(m._row, 1, 1, 11).setValues([toRow(m)]); }
function deleteRow(n, row) { sheet(n).deleteRow(row); }
function clearPairs(code) {
  const sh = sheet('Pairs'), n = sh.getLastRow() - 1; if (n < 1) return;
  const v = sh.getRange(2, 1, n, 1).getValues();
  for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === code) sh.deleteRow(i + 2);
}
function receiverOf(code, giverKey) {
  const sh = sheet('Pairs'), n = sh.getLastRow() - 1; if (n < 1) return null;
  const v = sh.getRange(2, 1, n, 3).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === code && String(v[i][1]) === giverKey) return String(v[i][2]);
  return null;
}

function pub(g, ms) {
  return { group: g.name, budget: g.budget, locked: g.locked, joined: ms.length, drawn: ms.filter(m => m.drew).length };
}
function session(g, m, ms) {
  const out = Object.assign({ ok: true, token: m.token, name: m.name, wishes: m.wishes }, pub(g, ms));
  out.roster = ms.map(x => x.name);
  if (m.drew) {
    const rk = receiverOf(g.code, m.nameKey), r = ms.filter(x => x.nameKey === rk)[0];
    if (r) { out.drew = r.name; out.drewWishes = r.wishes; }
  }
  return out;
}
