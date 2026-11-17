// MUKHĀ BY SAJEEVA — Google Apps Script
// Salin SELURUH isi file ini ke editor Apps Script, hapus kode lama dulu.

'use strict';

var SPREADSHEET_ID = '1IvXNges0NxgyUW8lipQ_uz8og_9I5xGtTAsULjBIMXw';
var SHEET_NAME     = 'Leads Konsultasi';

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

    output.setContent(JSON.stringify({
      status: 'success',
      message: 'Data berhasil dicatat.',
      row: sheet.getLastRow(),
      timestamp: ts
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

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      service: 'Mukha Form Endpoint'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function testDoPost() {
  try {
    Logger.log('Step 1: Buka spreadsheet...');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('Step 2: Spreadsheet: ' + ss.getName());

    var sheet = ss.getSheetByName(SHEET_NAME);
    Logger.log('Step 3: Sheet: ' + sheet);

    if (!sheet) {
      Logger.log('ERROR - Sheet tidak ditemukan. Sheet yang ada:');
      ss.getSheets().forEach(function(s) {
        Logger.log('  -> ' + s.getName());
      });
      return;
    }

    var mock = {
      postData: {
        contents: JSON.stringify({
          nama_lengkap:            'Tes Integrasi',
          nomor_whatsapp:          '6281234567890',
          lokasi_properti:         'Bandung Utara',
          tujuan_utama:            'Hunian Pribadi',
          estimasi_luas:           '100 - 250 m2',
          preferensi_jadwal:       '2025-08-15T10:00:00.000Z',
          preferensi_jadwal_lokal: 'Jumat, 15 Agustus 2025 pukul 17.00',
          submitted_at:            new Date().toISOString(),
          source:                  'test'
        })
      },
      parameter: {}
    };

    Logger.log('Step 4: Jalankan doPost...');
    var result = doPost(mock);
    Logger.log('Step 5: Hasil: ' + result.getContent());

  } catch(err) {
    Logger.log('EXCEPTION: ' + err.message);
  }
}
