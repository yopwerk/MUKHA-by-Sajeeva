# Panduan Integrasi Google Sheets — Mukhā by Sajeeva

Panduan ini mencakup seluruh langkah dari membuat Spreadsheet hingga memverifikasi data masuk secara real-time. Ikuti urutannya.

---

## Arsitektur

```
Browser (index.html)
  └── mukha.config.js      ← tempat satu-satunya Anda mengisi URL endpoint
  └── form-service.js      ← validasi, normalisasi, kirim via fetch()
        │
        │  POST (JSON sebagai text/plain)
        ▼
  Google Apps Script Web App   ← docs/google-apps-script.js
        │
        │  appendRow()
        ▼
  Google Sheets — tab "Leads Konsultasi"
```

**Tidak ada credential yang disimpan di kode UI.** `form-service.js` hanya membaca `window.MUKHA_CONFIG.SHEETS_ENDPOINT` dari `mukha.config.js`.

---

## Langkah 1 — Buat Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com) dan buat Spreadsheet baru.
2. Beri nama file: **Mukhā — Leads Konsultasi** (atau nama lain sesuai preferensi).
3. Klik dua kali pada tab **Sheet1** di bagian bawah, ubah namanya menjadi:
   ```
   Leads Konsultasi
   ```
   > Nama ini harus sama persis dengan nilai `SHEET_NAME` di `mukha.config.js`.

4. Isi baris pertama (header) sebagai berikut:

   | A | B | C | D | E | F | G | H |
   |---|---|---|---|---|---|---|---|
   | Timestamp | Nama Lengkap | Nomor WhatsApp | Lokasi Properti | Tujuan Utama | Estimasi Luas | Preferensi Jadwal | Status Follow-up |

5. Bekukan baris pertama: **View → Freeze → 1 row** agar header tidak ikut ter-scroll.

6. Catat **Spreadsheet ID** dari URL browser Anda:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_ADA_DI_SINI/edit
   ```

---

## Langkah 2 — Buat Apps Script

1. Di Spreadsheet, buka: **Extensions → Apps Script**
2. Editor terbuka di tab baru. Hapus semua kode default (`function myFunction() {}`).
3. Buka file `docs/google-apps-script.js` di workspace ini, **salin seluruh isinya**.
4. Tempel ke editor Apps Script.
5. Cari baris ini dan ganti dengan ID dari Langkah 1:
   ```javascript
   var SPREADSHEET_ID = 'GANTI_DENGAN_SPREADSHEET_ID_ANDA';
   ```
6. Simpan: **Ctrl+S** (atau Cmd+S di Mac). Beri nama project, misalnya: `Mukhā Form`.

---

## Langkah 3 — Verifikasi dengan Test Function

Sebelum deploy, uji di dalam editor terlebih dahulu:

1. Di dropdown fungsi (atas editor, biasanya bertuliskan `doPost`), pilih `testDoPost`.
2. Klik tombol **▶ Run**.
3. Jika diminta izin, klik **Review permissions → Allow**.
4. Buka tab **Execution log** (bawah editor). Anda harus melihat:
   ```
   testDoPost result: {"status":"success","message":"Data berhasil dicatat.",...}
   ```
5. Kembali ke Google Sheets — baris baru dengan data test harus muncul di baris 2.

> Jika berhasil, hapus baris test tersebut dari Sheets sebelum go-live.

---

## Langkah 4 — Deploy sebagai Web App

1. Klik tombol **Deploy** (pojok kanan atas) → **New deployment**.
2. Klik ikon ⚙ di sebelah "Select type" → pilih **Web app**.
3. Isi form:
   - **Description**: `Mukhā Landing Form v1`
   - **Execute as**: `Me` (akun Google Anda)
   - **Who has access**: `Anyone` ← **wajib**, agar `fetch()` dari browser bisa mengakses
4. Klik **Deploy**.
5. Jika muncul dialog otorisasi:
   - Klik **Authorize access**
   - Pilih akun Google Anda
   - Jika muncul peringatan *"Google hasn't verified this app"*:
     Klik **Advanced** → **Go to [nama project] (unsafe)** → **Allow**
6. Salin **Web App URL** yang muncul. Formatnya:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Langkah 5 — Pasang URL di mukha.config.js

Buka file `assets/js/mukha.config.js` dan isi `SHEETS_ENDPOINT`:

```javascript
window.MUKHA_CONFIG = {
  SHEETS_ENDPOINT: 'https://script.google.com/macros/s/AKfycb.../exec',
  // ... sisanya tidak perlu diubah
};
```

Simpan file. **Tidak ada build step** — perubahan langsung aktif.

---

## Langkah 6 — Verifikasi Health Check

Buka URL Web App langsung di browser (GET request):
```
https://script.google.com/macros/s/AKfycb.../exec
```

Respons yang diharapkan:
```json
{
  "status": "ok",
  "service": "Mukhā by Sajeeva — Form Endpoint",
  "version": "v1"
}
```

Jika melihat JSON ini, endpoint aktif dan siap menerima submission.

---

## Langkah 7 — Test Submission dari Halaman

1. Buka `index.html` di browser.
2. Isi formulir dengan data nyata (bukan test, agar format sesuai).
3. Klik **Konfirmasi Jadwal Konsultasi**.
4. Pastikan:
   - Loading spinner muncul selama proses
   - Modal **"Jadwal Konsultasi Anda Tercatat."** muncul setelah sukses
   - Baris baru muncul di Google Sheets dalam beberapa detik
5. Periksa kolom **Status Follow-up** — harus terisi `New Lead` secara otomatis.

Untuk test dari browser console (tanpa isi form manual):

```javascript
// Buka DevTools → Console, lalu jalankan:
MukhaFormService.submitConsultation({
  nama_lengkap:      'Tes Integrasi',
  nomor_whatsapp:    '081234567890',
  lokasi_properti:   'Jakarta Selatan',
  tujuan_utama:      'Hunian Pribadi',
  estimasi_luas:     '100 – 250 m²',
  preferensi_jadwal: new Date(Date.now() + 86400000).toISOString(), // besok
}).then(console.log);
```

Respons sukses yang diharapkan:
```json
{
  "ok": true,
  "data": {
    "status": "success",
    "message": "Data berhasil dicatat.",
    "row": 2,
    "timestamp": "15/08/2025 10:30:00"
  }
}
```

---

## Troubleshooting

| Gejala | Kemungkinan Penyebab | Solusi |
|--------|---------------------|--------|
| Modal error "Endpoint belum dikonfigurasi" | `SHEETS_ENDPOINT` masih kosong | Isi URL di `mukha.config.js` |
| `fetch` error di console: *Failed to fetch* | CORS atau URL salah | Pastikan URL diakhiri `/exec`, bukan `/dev` |
| Data tidak masuk Sheets tapi tidak ada error | Sheet name salah | Periksa nama tab di Sheets vs `SHEET_NAME` di config |
| Error 401 / 403 | Deployment belum diset ke "Anyone" | Deploy ulang dengan akses "Anyone" |
| Apps Script error di Execution log | Spreadsheet ID salah | Periksa ID di kode Apps Script |
| Duplikasi data saat reload | Double submission | Sudah ditangani (`data-submitting` guard) — pastikan tidak reload manual saat loading |

---

## Deploy Ulang setelah Edit Kode Apps Script

Setiap perubahan kode **memerlukan deployment baru**:

1. Buka editor Apps Script
2. **Deploy → Manage deployments**
3. Edit deployment yang ada
4. Di dropdown versi, pilih **New version**
5. Klik **Deploy**

URL tidak berubah — `mukha.config.js` tidak perlu diupdate.

---

## Keamanan

- URL Web App Apps Script **bukan credential rahasia** — ia adalah endpoint publik.
  Perlindungan dilakukan melalui validasi payload di server (`doPost`).
- Untuk keamanan tambahan di masa depan: tambahkan domain Anda ke `ALLOWED_ORIGINS`
  di `google-apps-script.js` dan kirimkan header `Origin` custom dari `form-service.js`.
- Jangan pernah simpan Service Account key, OAuth client secret, atau token apapun
  di file yang dimuat browser.
