/**
 * MUKHĀ BY SAJEEVA — form-service.js
 *
 * Bertanggung jawab penuh atas:
 *   • Normalisasi & validasi data sebelum dikirim
 *   • Pengiriman ke endpoint Google Apps Script
 *   • Mengembalikan Promise<Result> — tidak menyentuh UI sama sekali
 *
 * Konfigurasi endpoint dibaca dari window.MUKHA_CONFIG
 * yang didefinisikan di assets/js/mukha.config.js.
 * File ini TIDAK menyimpan URL endpoint secara hardcoded.
 */

(function () {
'use strict';

/* ─────────────────────────────────────────────────────────────
   BACA KONFIGURASI RUNTIME
   Ambil dari mukha.config.js; fallback aman jika belum dimuat.
───────────────────────────────────────────────────────────── */
function getConfig() {
  var cfg = window.MUKHA_CONFIG || {};
  return {
    endpoint   : (cfg.SHEETS_ENDPOINT   || '').trim(),
    sheetName  : (cfg.SHEET_NAME        || 'Leads Konsultasi').trim(),
    timeoutMs  : (cfg.REQUEST_TIMEOUT_MS || 15000),
    sourceTag  : (cfg.SOURCE_TAG        || 'mukha-landing-v1'),
  };
}

/* ─────────────────────────────────────────────────────────────
   NORMALISASI NOMOR WhatsApp
   Menerima berbagai format Indonesia → mengembalikan 628XXXXXXXXX
───────────────────────────────────────────────────────────── */
function normalizeWhatsApp(raw) {
  var digits = String(raw || '').replace(/\D/g, '');

  if      (digits.startsWith('628')) { /* sudah benar */ }
  else if (digits.startsWith('62'))  { /* biarkan */ }
  else if (digits.startsWith('08'))  { digits = '62' + digits.slice(1); }
  else if (digits.startsWith('8'))   { digits = '62' + digits; }
  else if (digits.startsWith('0'))   { digits = '62' + digits.slice(1); }

  return digits;
}

/* ─────────────────────────────────────────────────────────────
   VALIDASI SISI KLIEN
   Mengembalikan { valid: bool, errors: { fieldId: message } }
───────────────────────────────────────────────────────────── */
function validatePayload(raw) {
  var errors = {};

  /* 1 · Nama */
  if (!raw.nama_lengkap || raw.nama_lengkap.trim().length < 3) {
    errors['f-name'] = 'Nama lengkap minimal 3 karakter.';
  }

  /* 2 · WhatsApp */
  var wa = normalizeWhatsApp(raw.nomor_whatsapp);
  if (wa.length < 10 || wa.length > 15) {
    errors['f-wa'] = 'Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890.';
  }

  /* 3 · Lokasi */
  if (!raw.lokasi_properti || raw.lokasi_properti.trim().length < 3) {
    errors['f-lokasi'] = 'Lokasi properti wajib diisi (minimal 3 karakter).';
  }

  /* 4 · Tujuan */
  if (!raw.tujuan_utama) {
    errors['f-tujuan'] = 'Silakan pilih tujuan transformasi Anda.';
  }

  /* 5 · Luas */
  if (!raw.estimasi_luas) {
    errors['f-luas'] = 'Silakan pilih estimasi luas bangunan.';
  }

  /* 6 · Jadwal — valid & tidak di masa lampau (toleransi 30 menit) */
  if (!raw.preferensi_jadwal) {
    errors['f-jadwal'] = 'Silakan pilih preferensi jadwal konsultasi.';
  } else {
    var chosen  = new Date(raw.preferensi_jadwal);
    var minTime = new Date(Date.now() - 30 * 60 * 1000);
    if (isNaN(chosen.getTime())) {
      errors['f-jadwal'] = 'Format tanggal dan waktu tidak valid.';
    } else if (chosen < minTime) {
      errors['f-jadwal'] = 'Jadwal konsultasi tidak boleh di masa lalu.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

/* ─────────────────────────────────────────────────────────────
   BUILD PAYLOAD
   Menyusun objek bersih yang akan dikirim ke Apps Script
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
  } catch (_) {
    jadwalLokal = scheduledAt.toString();
  }

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
   SUBMIT
   Satu-satunya fungsi publik.

   @param  {object} rawFormData   — data mentah dari input form
   @returns {Promise<Result>}
     { ok: true,  data: object }          → sukses, row tercatat
     { ok: false, fieldErrors: object }   → validasi gagal
     { ok: false, devOnly: true, ... }    → endpoint belum diisi
     { ok: false, error: string }         → network / server error
───────────────────────────────────────────────────────────── */
async function submitConsultation(rawFormData) {

  var cfg = getConfig();

  /* ── 1. Validasi lokal ── */
  var validation = validatePayload(rawFormData);
  if (!validation.valid) {
    return {
      ok          : false,
      fieldErrors : validation.errors,
      error       : 'Mohon perbaiki isian di atas.',
    };
  }

  var payload = buildPayload(rawFormData, cfg.sourceTag);

  /* ── 2. Tolak jika endpoint belum dikonfigurasi ──
   *  Pastikan tidak ada sukses palsu sampai SHEETS_ENDPOINT terisi.
   */
  if (!cfg.endpoint) {
    console.info(
      '[Mukhā] Endpoint belum dikonfigurasi.\n' +
      'Isi SHEETS_ENDPOINT di assets/js/mukha.config.js.\n' +
      'Payload yang akan dikirim:', payload
    );
    return {
      ok      : false,
      devOnly : true,
      error   : 'Endpoint pengiriman belum dikonfigurasi. ' +
                'Silakan hubungi tim pengembang.',
    };
  }

  /* ── 3. Kirim ke Apps Script Web App ──
   *
   *  Google Apps Script tidak mendukung CORS preflight (OPTIONS) secara
   *  native untuk Content-Type: application/json.
   *  Solusi: kirim sebagai text/plain — Apps Script tetap membacanya
   *  melalui e.postData.contents, dan browser tidak mengirim preflight.
   *  JSON.stringify memastikan payload tetap valid JSON di server.
   */
  var controller = new AbortController();
  var timeoutId  = setTimeout(function () { controller.abort(); }, cfg.timeoutMs);

  try {
    var response = await fetch(cfg.endpoint, {
      method  : 'POST',
      headers : { 'Content-Type': 'text/plain;charset=UTF-8' },
      body    : JSON.stringify(payload),
      signal  : controller.signal,
      mode    : 'no-cors',   // Apps Script tidak mengirim CORS header dari origin null
    });

    clearTimeout(timeoutId);

    /* Dengan mode no-cors, response.type === 'opaque' — kita tidak bisa
       membaca body respons, tapi Apps Script TETAP memproses dan menulis
       ke Sheets. Kita anggap sukses selama tidak ada network error. */
    return { ok: true, data: { status: 'success', message: 'Data terkirim.' } };

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return {
        ok    : false,
        error : 'Koneksi terlalu lama. Periksa internet Anda dan coba kembali.',
      };
    }

    console.error('[Mukhā] Network error:', err);
    return {
      ok    : false,
      error : 'Gagal mengirim data. Periksa koneksi internet Anda dan coba kembali.',
    };
  }
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC API
───────────────────────────────────────────────────────────── */
window.MukhaFormService = {
  submitConsultation : submitConsultation,
  /* Ekspos juga untuk debugging/testing dari console browser */
  _normalizeWA       : normalizeWhatsApp,
  _validatePayload   : validatePayload,
  _buildPayload      : buildPayload,
  _getConfig         : getConfig,
};

})(); // tutup IIFE
