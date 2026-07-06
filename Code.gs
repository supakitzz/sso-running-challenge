// ═══════════════════════════════════════════════════════════════
//  SSO Running Challenge — Google Apps Script API
//  Paste this code in: Extensions → Apps Script → Code.gs
//  Then Deploy → New deployment → Web app → Anyone can access
// ═══════════════════════════════════════════════════════════════

const SPREADSHEET_ID = '1q6-j_DQGN1zdtv8WA0OZYvJfkTN3_eUFc8fiTm9mae4';

// Month tab naming convention used in this sheet
const MONTH_TAB_NAMES = {
  0:  'Jan',   1:  'Feb',   2:  'Mar',
  3:  'Apr',   4:  'May',   5:  'Jun',
  6:  'July',  7:  'Aug',   8:  'Sep',
  9:  'Oct',  10:  'Nov',  11:  'Dec'
};

// ── ENTRY POINT ──────────────────────────────────────────────
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const now = new Date();
    const payload = {
      updated:      now.toISOString(),
      runners:      readAllSummary(ss),
      currentMonth: readCurrentMonth(ss, now),
      allTabs:      ss.getSheets().map(s => s.getName())
    };
    return respond(payload);
  } catch (err) {
    return respond({ error: err.toString() });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── ALL SUMMARY ───────────────────────────────────────────────
function readAllSummary(ss) {
  const sheet = ss.getSheetByName('All Summary');
  if (!sheet) return [];

  const raw = sheet.getDataRange().getValues();

  // Find header row: contains "Name" and month labels
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    if (String(raw[i][0]).trim() === 'Name' || String(raw[i][1]).trim() === 'Name') {
      headerIdx = i; break;
    }
  }

  // Map header columns → month label (skip blank/year/Summary cols)
  const header = raw[headerIdx];
  const monthColMap = []; // [{col, label}]
  const SKIP = new Set(['Name','','Summary']);
  for (let c = 0; c < header.length; c++) {
    const lbl = String(header[c]).trim();
    if (!lbl || SKIP.has(lbl) || /^\d{4}$/.test(lbl)) continue;
    monthColMap.push({ col: c, label: lbl });
  }

  const runners = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    const nameRaw = String(row[0]).trim();
    if (!nameRaw || nameRaw === 'Name') continue;

    const team = (nameRaw.match(/-(Stream|SSO|CGC)$/i) || [])[1] || 'Other';
    const name = nameRaw.replace(/-(Stream|SSO|CGC)$/i, '').trim();

    const monthly = {};
    for (const { col, label } of monthColMap) {
      const v = row[col];
      if (v === '' || v === null || v === undefined) continue;
      const km = parseFloat(String(v).replace(/,/g, ''));
      if (!isNaN(km) && km > 0) monthly[label] = km;
    }

    // Total = last numeric cell in row
    let total = 0;
    for (let c = row.length - 1; c >= 0; c--) {
      const n = parseFloat(String(row[c]).replace(/,/g, ''));
      if (!isNaN(n) && n > 0) { total = n; break; }
    }

    if (total > 0 || Object.keys(monthly).length > 0) {
      runners.push({ name, fullName: nameRaw, team: team.toUpperCase(), monthly, total });
    }
  }

  return runners.sort((a, b) => b.total - a.total);
}

// ── CURRENT MONTH ─────────────────────────────────────────────
function readCurrentMonth(ss, now) {
  const m  = now.getMonth();
  const y  = now.getFullYear();
  const sy = String(y).slice(2); // "26"

  // Try tab name variations
  const base = MONTH_TAB_NAMES[m];
  const candidates = [base + y, base + sy, base.slice(0,3) + y, base.slice(0,3) + sy];

  let sheet = null, foundName = null;
  for (const c of candidates) {
    sheet = ss.getSheetByName(c);
    if (sheet) { foundName = c; break; }
  }
  if (!sheet) return { error: 'Current month tab not found', tried: candidates };

  const raw = sheet.getDataRange().getValues();
  return parseMonthSheet(raw, foundName, now);
}

// ── MONTH SHEET PARSER ────────────────────────────────────────
function parseMonthSheet(raw, tabName, now) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const result = { tab: tabName, daysInMonth, today: now.getDate(), runners: [] };

  // Find "No." header row
  let noRow = -1, noCol = 0;
  for (let r = 0; r < Math.min(raw.length, 15); r++) {
    for (let c = 0; c < Math.min(raw[r].length, 4); c++) {
      if (String(raw[r][c]).trim() === 'No.' || String(raw[r][c]).trim() === 'No') {
        noRow = r; noCol = c; break;
      }
    }
    if (noRow !== -1) break;
  }

  if (noRow === -1) return parseChampionView(raw, result);

  // Skip header + day-label rows until we hit row starting with "1"
  let dataRow = noRow + 1;
  while (dataRow < raw.length) {
    const v = String(raw[dataRow][noCol]).trim();
    if (/^\d+$/.test(v) && parseInt(v) <= 200) break;
    dataRow++;
  }

  // Col offsets relative to noCol
  // No | Runner | Champion | MinKM | KM | % | Time | day1 day2 ...
  for (let r = dataRow; r < raw.length; r++) {
    const row = raw[r];
    const no = parseInt(String(row[noCol]).trim());
    if (isNaN(no) || no <= 0) continue;

    const runner  = cleanName(String(row[noCol + 1] || '').trim());
    const champ   = String(row[noCol + 2] || '').trim();
    const minKm   = parseFloat(row[noCol + 3]) || 0;
    const km      = parseFloat(String(row[noCol + 4] || '').replace(/,/g, '')) || 0;
    const pctRaw  = parseFloat(String(row[noCol + 5] || '').replace('%', '')) || 0;
    const pct     = pctRaw || (minKm > 0 ? Math.round(km / minKm * 10000) / 100 : 0);
    const timeStr = String(row[noCol + 6] || '').trim();

    // Daily KM (cols after timeStr)
    const daily = {};
    for (let c = noCol + 7; c < row.length; c++) {
      const v = parseFloat(row[c]);
      if (!isNaN(v) && v > 0) daily[c - (noCol + 6)] = v;
    }

    result.runners.push({
      no, runner, rawRunner: String(row[noCol + 1] || ''),
      champion: champ, minKm, km,
      pct: Math.round(pct * 100) / 100,
      timeStr, daily,
      passed: minKm > 0 && km >= minKm
    });
  }

  return result;
}

function parseChampionView(raw, result) {
  // Fallback: Champion | MinKM | KM | % | Time
  for (let r = 0; r < raw.length; r++) {
    const row = raw[r];
    const champ = String(row[0] || '').trim();
    if (!champ || /champion|min|no\.|runner/i.test(champ)) continue;
    const minKm = parseFloat(row[1]) || 0;
    const km    = parseFloat(String(row[2] || '').replace(/,/g, '')) || 0;
    const pct   = parseFloat(String(row[3] || '').replace('%', '')) || (minKm > 0 ? km / minKm * 100 : 0);
    if (km > 0 && minKm > 0) {
      result.runners.push({
        no: r, runner: champ, champion: champ, minKm, km,
        pct: Math.round(pct * 100) / 100,
        timeStr: String(row[4] || ''), daily: {}, passed: km >= minKm
      });
    }
  }
  return result;
}

// ── HELPERS ───────────────────────────────────────────────────
function cleanName(raw) {
  if (!raw) return '';
  return raw
    .replace(/\s*Strava\s*/gi, '')
    .replace(/@[^\s]+/g, '')
    .trim();
}
