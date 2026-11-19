/**
 * MUKHĀ BY SAJEEVA — form-service.js
 *
 * Bertanggung jawab penuh atas:
 *   • Normalisasi & validasi data sebelum dikirim
 *   • Pengiriman ke endpoint Google Apps Script
 *   • Fetch available slots dari Google Calendar (via Apps Script)
 *   • Mengembalikan Promise<Result> — tidak menyentuh UI sama sekali
 */

(function () {
'use strict';

function getConfig() {
  var cfg = window.MUKHA_CONFIG || {};
  return {
    endpoint      : (cfg.SHEETS_ENDPOINT    || '').trim(),
    sheetName     : (cfg.SHEET_NAME         || 'Leads Konsultasi').trim(),
    timeoutMs     : (cfg.REQUEST_TIMEOUT_MS  || 15000),
    sourceTag     : (cfg.SOURCE_TAG         || 'mukha-landing-v1'),
    daysAhead     : (cfg.CALENDAR_DAYS_AHEAD || 14),
  };
}

/* ─────────────────────────────────────────────────────────────
   NORMALISASI NOMOR WhatsApp
───────────────────────────────────────────────────────────── */
function normalizeWhatsApp(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  if      (digits.startsWith('628')) { /* ok */ }
  else if (digits.startsWith('62'))  { /* ok */ }
  else if (digits.startsWith('08'))  { digits = '62' + digits.slice(1); }
  else if (digits.startsWith('8'))   { digits = '62' + digits; }
  else if (digits.startsWith('0'))   { digits = '62' + digits.slice(1); }
  return digits;
}

/* ─────────────────────────────────────────────────────────────
   VALIDASI
───────────────────────────────────────────────────────────── */
function validatePayload(raw) {
  var errors = {};

  if (!raw.nama_lengkap || raw.nama_lengkap.trim().length < 3)
    errors['f-name'] = 'Nama lengkap minimal 3 karakter.';

  var wa = normalizeWhatsApp(raw.nomor_whatsapp);
  if (wa.length < 10 || wa.length > 15)
    errors['f-wa'] = 'Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890.';

  if (!raw.lokasi_properti || raw.lokasi_properti.trim().length < 3)
    errors['f-lokasi'] = 'Lokasi properti wajib diisi (minimal 3 karakter).';

  if (!raw.tujuan_utama)
    errors['f-tujuan'] = 'Silakan pilih tujuan transformasi Anda.';

  if (!raw.estimasi_luas)
    errors['f-luas'] = 'Silakan pilih estimasi luas bangunan.';

  if (!raw.preferensi_jadwal) {
    errors['f-jadwal'] = 'Silakan pilih slot jadwal konsultasi.';
  } else {
    var chosen  = new Date(raw.preferensi_jadwal);
    var minTime = new Date(Date.now() - 30 * 60 * 1000);
    if (isNaN(chosen.getTime()))
      errors['f-jadwal'] = 'Format tanggal dan waktu tidak valid.';
    else if (chosen < minTime)
      errors['f-jadwal'] = 'Jadwal konsultasi tidak boleh di masa lalu.';
  }

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

/* ─────────────────────────────────────────────────────────────
   BUILD PAYLOAD
───────────────────────────────────────────────────────────── */
function buildPayload(raw, sourceTag) {
  var wa          = normalizeWhatsApp(raw.nomor_whatsapp);
  var scheduledAt = new Date(raw.preferensi_jadwal);

  var jadwalLokal = '';
  try {
    jadwalLokal = scheduledAt.toLocaleString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch (_) { jadwalLokal = scheduledAt.toString(); }

  return {
    nama_lengkap            : raw.nama_lengkap.trim(),
    nomor_whatsapp          : wa,
    lokasi_properti         : raw.lokasi_properti.trim(),
    tujuan_utama            : raw.tujuan_utama,
    estimasi_luas           : raw.estimasi_luas,
    preferensi_jadwal       : scheduledAt.toISOString(),
    preferensi_jadwal_lokal : jadwalLokal,
    submitted_at            : new Date().toISOString(),
    source                  : sourceTag,
  };
}

/* ─────────────────────────────────────────────────────────────
   FETCH AVAILABLE SLOTS dari Google Calendar (via Apps Script)
   @param  {string} dateStr — YYYY-MM-DD
   @returns {Promise<Array>} — array { isoTime, label, status }
───────────────────────────────────────────────────────────── */
async function fetchSlots(dateStr) {
  var cfg = getConfig();
  if (!cfg.endpoint) return [];

  var url = cfg.endpoint + '?action=slots&date=' + encodeURIComponent(dateStr);

  try {
    var res  = await fetch(url, { method: 'GET' });
    var json = await res.json();
    if (json.status === 'ok' && Array.isArray(json.slots)) return json.slots;
    return [];
  } catch (err) {
    console.warn('[Mukhā] fetchSlots error:', err);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   FETCH BUSY DATES dalam rentang
   @param  {string} fromStr — YYYY-MM-DD
   @param  {string} toStr   — YYYY-MM-DD
   @returns {Promise<Array<string>>} — array tanggal busy
───────────────────────────────────────────────────────────── */
async function fetchBusyDates(fromStr, toStr) {
  var cfg = getConfig();
  if (!cfg.endpoint) return [];

  var url = cfg.endpoint +
    '?action=busy&from=' + encodeURIComponent(fromStr) +
    '&to=' + encodeURIComponent(toStr);

  try {
    var res  = await fetch(url, { method: 'GET' });
    var json = await res.json();
    if (json.status === 'ok' && Array.isArray(json.busyDates)) return json.busyDates;
    return [];
  } catch (err) {
    console.warn('[Mukhā] fetchBusyDates error:', err);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   SUBMIT FORM
───────────────────────────────────────────────────────────── */
async function submitConsultation(rawFormData) {
  var cfg = getConfig();

  var validation = validatePayload(rawFormData);
  if (!validation.valid) {
    return { ok: false, fieldErrors: validation.errors, error: 'Mohon perbaiki isian di atas.' };
  }

  var payload = buildPayload(rawFormData, cfg.sourceTag);

  if (!cfg.endpoint) {
    console.info('[Mukhā] Endpoint belum dikonfigurasi.\nPayload:', payload);
    return { ok: false, devOnly: true, error: 'Endpoint pengiriman belum dikonfigurasi.' };
  }

  var controller = new AbortController();
  var timeoutId  = setTimeout(function () { controller.abort(); }, cfg.timeoutMs);

  try {
    await fetch(cfg.endpoint, {
      method  : 'POST',
      headers : { 'Content-Type': 'text/plain;charset=UTF-8' },
      body    : JSON.stringify(payload),
      signal  : controller.signal,
      mode    : 'no-cors',
    });

    clearTimeout(timeoutId);
    return { ok: true, data: { status: 'success', message: 'Data terkirim.' } };

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return { ok: false, error: 'Koneksi terlalu lama. Periksa internet Anda dan coba kembali.' };
    }

    console.error('[Mukhā] Network error:', err);
    return { ok: false, error: 'Gagal mengirim data. Periksa koneksi internet Anda.' };
  }
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────── */
window.MukhaFormService = {
  submitConsultation : submitConsultation,
  fetchSlots         : fetchSlots,
  fetchBusyDates     : fetchBusyDates,
  _normalizeWA       : normalizeWhatsApp,
  _validatePayload   : validatePayload,
  _buildPayload      : buildPayload,
  _getConfig         : getConfig,
};

})();
