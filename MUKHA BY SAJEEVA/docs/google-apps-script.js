// MUKHĀ BY SAJEEVA — Google Apps Script
// Salin SELURUH isi file ini ke editor Apps Script, hapus kode lama dulu.
// Setelah update, lakukan DEPLOY BARU (New deployment) agar perubahan aktif.

'use strict';

var SPREADSHEET_ID  = '1IvXNges0NxgyUW8lipQ_uz8og_9I5xGtTAsULjBIMXw';
var SHEET_NAME      = 'Leads Konsultasi';

// ── CALENDAR CONFIG ────────────────────────────────────────
// Ganti dengan Calendar ID Anda (biasanya email Google Anda)
// Buka Google Calendar → Settings → nama kalender → "Calendar ID"
var CALENDAR_ID     = 'primary'; // atau 'nama@gmail.com'

// Slot konsultasi: jam berapa saja yang tersedia
var SLOT_HOURS      = [9, 10, 11, 13, 14, 15, 16]; // 09.00, 10.00, dst
var SLOT_DURATION   = 60; // durasi per sesi (menit)
var DAYS_AHEAD      = 14; // tampilkan berapa hari ke depan


// ══════════════════════════════════════════════════════════════
//  doGet — handle GET request
//  Digunakan untuk:
//    1. Ping (tanpa param)
//    2. Ambil available slots: ?action=slots&date=YYYY-MM-DD
//    3. Ambil busy dates dalam range: ?action=busy&from=YYYY-MM-DD&to=YYYY-MM-DD
// ══════════════════════════════════════════════════════════════
function doGet(e) {
  var output = ContentService
    .createTextOutput()
    .setMimeType(ContentService.MimeType.JSON);

  // CORS header workaround — Apps Script tidak support header custom,
  // tapi kita bisa set via HtmlService jika perlu. Untuk mode=no-cors cukup ini.

  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || '';

  try {
    if (action === 'slots') {
      // Kembalikan slot kosong untuk satu tanggal tertentu
      var dateStr = params.date || ''; // format: YYYY-MM-DD
      if (!dateStr) throw new Error('Parameter date diperlukan (YYYY-MM-DD)');
      var slots = getAvailableSlots(dateStr);
      output.setContent(JSON.stringify({ status: 'ok', date: dateStr, slots: slots }));

    } else if (action === 'busy') {
      // Kembalikan tanggal-tanggal yang fully booked dalam rentang
      var fromStr = params.from || '';
      var toStr   = params.to   || '';
      if (!fromStr || !toStr) throw new Error('Parameter from dan to diperlukan');
      var busyDates = getBusyDates(fromStr, toStr);
      output.setContent(JSON.stringify({ status: 'ok', busyDates: busyDates }));

    } else {
      // Ping / health check
      output.setContent(JSON.stringify({ status: 'ok', service: 'Mukha Form + Calendar Endpoint' }));
    }

  } catch (err) {
    Logger.log('doGet error: ' + err.message);
    output.setContent(JSON.stringify({ status: 'error', message: err.message }));
  }

  return output;
}


// ══════════════════════════════════════════════════════════════
//  doPost — handle form submission
//  Menerima data form, catat ke Sheets, buat event di Calendar
// ══════════════════════════════════════════════════════════════
function doPost(e) {
  var output = ContentService
    .createTextOutput()
    .setMimeType(ContentService.MimeType.JSON);

  try {
    var raw = JSON.parse(e.postData.contents);

    var required = [
      'nama_lengkap','nomor_whatsapp','lokasi_properti',
      'tujuan_utama','estimasi_luas','preferensi_jadwal'
    ];

    for (var i = 0; i < required.length; i++) {
      if (!raw[required[i]] || String(raw[required[i]]).trim() === '') {
        output.setContent(JSON.stringify({
          status: 'error',
          message: 'Field kosong: ' + required[i]
        }));
        return output;
      }
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      output.setContent(JSON.stringify({
        status: 'error',
        message: 'Sheet tidak ditemukan: ' + SHEET_NAME
      }));
      return output;
    }

    var ts = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'dd/MM/yyyy HH:mm:ss'
    );

    var jadwal = raw.preferensi_jadwal_lokal || raw.preferensi_jadwal || '';

    // ── Catat ke Google Sheets ────────────────────────────
    sheet.appendRow([
      ts,
      raw.nama_lengkap.trim(),
      raw.nomor_whatsapp,
      raw.lokasi_properti.trim(),
      raw.tujuan_utama,
      raw.estimasi_luas,
      jadwal,
      'New Lead'
    ]);

    // ── Buat event di Google Calendar ─────────────────────
    var calendarEventId = '';
    try {
      calendarEventId = createCalendarEvent(raw);
    } catch (calErr) {
      // Jangan gagalkan submission kalau Calendar error
      Logger.log('Calendar error (non-fatal): ' + calErr.message);
    }

    output.setContent(JSON.stringify({
      status: 'success',
      message: 'Data berhasil dicatat.',
      row: sheet.getLastRow(),
      timestamp: ts,
      calendarEventId: calendarEventId
    }));

  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    output.setContent(JSON.stringify({
      status: 'error',
      message: err.message
    }));
  }

  return output;
}


// ══════════════════════════════════════════════════════════════
//  createCalendarEvent
//  Membuat event konsultasi di Google Calendar
// ══════════════════════════════════════════════════════════════
function createCalendarEvent(raw) {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) {
    // Fallback ke default calendar
    calendar = CalendarApp.getDefaultCalendar();
  }

  var startTime = new Date(raw.preferensi_jadwal);
  var endTime   = new Date(startTime.getTime() + SLOT_DURATION * 60 * 1000);

  var title       = 'Konsultasi Mukhā — ' + raw.nama_lengkap.trim();
  var description =
    'Klien       : ' + raw.nama_lengkap.trim() + '\n' +
    'WhatsApp    : ' + raw.nomor_whatsapp + '\n' +
    'Lokasi      : ' + raw.lokasi_properti.trim() + '\n' +
    'Tujuan      : ' + raw.tujuan_utama + '\n' +
    'Luas        : ' + raw.estimasi_luas + '\n' +
    'Submitted   : ' + (raw.submitted_at || '') + '\n' +
    'Source      : ' + (raw.source || '') + '\n';

  var event = calendar.createEvent(title, startTime, endTime, {
    description : description,
    location    : raw.lokasi_properti.trim(),
  });

  return event.getId();
}


// ══════════════════════════════════════════════════════════════
//  getAvailableSlots
//  Untuk satu tanggal (YYYY-MM-DD), kembalikan array slot jam
//  dengan status 'available' atau 'booked'
// ══════════════════════════════════════════════════════════════
function getAvailableSlots(dateStr) {
  var tz       = Session.getScriptTimeZone();
  var parts    = dateStr.split('-');
  var year     = parseInt(parts[0]);
  var month    = parseInt(parts[1]) - 1; // 0-indexed
  var day      = parseInt(parts[2]);

  // Ambil semua event pada hari itu
  var dayStart = new Date(year, month, day, 0, 0, 0);
  var dayEnd   = new Date(year, month, day, 23, 59, 59);

  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) calendar = CalendarApp.getDefaultCalendar();

  var events   = calendar.getEvents(dayStart, dayEnd);

  // Kumpulkan range waktu yang sudah terisi
  var busyRanges = events.map(function(ev) {
    return { start: ev.getStartTime().getTime(), end: ev.getEndTime().getTime() };
  });

  // Bangun slot list
  var slots = SLOT_HOURS.map(function(hour) {
    var slotStart = new Date(year, month, day, hour, 0, 0).getTime();
    var slotEnd   = slotStart + SLOT_DURATION * 60 * 1000;

    var isBusy = busyRanges.some(function(r) {
      // Overlap check
      return slotStart < r.end && slotEnd > r.start;
    });

    // Format jam untuk display
    var h    = String(hour).padStart(2, '0');
    var hEnd = String(hour + Math.floor(SLOT_DURATION / 60)).padStart(2, '0');

    return {
      isoTime  : new Date(slotStart).toISOString(), // untuk dikirim ke server
      label    : h + '.00 – ' + hEnd + '.00',
      status   : isBusy ? 'booked' : 'available',
    };
  });

  return slots;
}


// ══════════════════════════════════════════════════════════════
//  getBusyDates
//  Dalam rentang fromStr–toStr (YYYY-MM-DD), kembalikan
//  array tanggal yang SEMUA slotnya sudah penuh
// ══════════════════════════════════════════════════════════════
function getBusyDates(fromStr, toStr) {
  var fromParts = fromStr.split('-');
  var toParts   = toStr.split('-');
  var from      = new Date(parseInt(fromParts[0]), parseInt(fromParts[1])-1, parseInt(fromParts[2]));
  var to        = new Date(parseInt(toParts[0]),   parseInt(toParts[1])-1,   parseInt(toParts[2]), 23, 59);

  var calendar  = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) calendar = CalendarApp.getDefaultCalendar();

  var events    = calendar.getEvents(from, to);

  // Kelompokkan event per tanggal
  var eventsByDate = {};
  events.forEach(function(ev) {
    var d   = Utilities.formatDate(ev.getStartTime(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push({ start: ev.getStartTime().getTime(), end: ev.getEndTime().getTime() });
  });

  // Cek tiap tanggal: apakah semua slot penuh?
  var busyDates = [];
  var cursor    = new Date(from);
  while (cursor <= to) {
    var dateKey = Utilities.formatDate(cursor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var dayEvents = eventsByDate[dateKey] || [];

    // Hitung berapa slot yang busy
    var busyCount = SLOT_HOURS.filter(function(hour) {
      var parts2 = dateKey.split('-');
      var sStart = new Date(parseInt(parts2[0]), parseInt(parts2[1])-1, parseInt(parts2[2]), hour, 0, 0).getTime();
      var sEnd   = sStart + SLOT_DURATION * 60 * 1000;
      return dayEvents.some(function(r) { return sStart < r.end && sEnd > r.start; });
    }).length;

    if (busyCount >= SLOT_HOURS.length) {
      busyDates.push(dateKey);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return busyDates;
}


// ══════════════════════════════════════════════════════════════
//  TEST FUNCTIONS — jalankan manual dari Apps Script editor
// ══════════════════════════════════════════════════════════════
function testGetSlots() {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var slots = getAvailableSlots(today);
  Logger.log('Slots for ' + today + ':');
  slots.forEach(function(s) { Logger.log(s.label + ' — ' + s.status); });
}

function testDoPost() {
  try {
    var mock = {
      postData: {
        contents: JSON.stringify({
          nama_lengkap            : 'Tes Integrasi',
          nomor_whatsapp          : '6281234567890',
          lokasi_properti         : 'Bandung Utara',
          tujuan_utama            : 'Hunian Pribadi',
          estimasi_luas           : '100 - 250 m2',
          preferensi_jadwal       : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          preferensi_jadwal_lokal : 'Test slot',
          submitted_at            : new Date().toISOString(),
          source                  : 'test'
        })
      },
      parameter: {}
    };

    var result = doPost(mock);
    Logger.log('Hasil: ' + result.getContent());
  } catch(err) {
    Logger.log('EXCEPTION: ' + err.message);
  }
}
