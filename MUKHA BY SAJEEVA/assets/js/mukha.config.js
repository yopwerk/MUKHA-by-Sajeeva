/**
 * MUKHĀ BY SAJEEVA — mukha.config.js
 *
 * File konfigurasi runtime untuk landing page.
 * Semua nilai yang bersifat environment-specific disimpan di sini
 * sehingga form-service.js tidak pernah mengandung credential.
 *
 * ─────────────────────────────────────────────────────────────
 * CARA MENGISI ENDPOINT:
 *
 *   1. Selesaikan langkah deploy Apps Script (lihat docs/google-apps-script.js)
 *   2. Salin URL Web App yang diberikan Google (format:
 *      https://script.google.com/macros/s/AKfy.../exec)
 *   3. Tempelkan URL tersebut sebagai nilai SHEETS_ENDPOINT di bawah.
 *   4. Simpan file — tidak ada build step yang diperlukan.
 *
 * ─────────────────────────────────────────────────────────────
 * CATATAN KEAMANAN:
 *
 *   • URL Apps Script bukan credential rahasia — ia adalah endpoint
 *     publik yang dilindungi oleh validasi payload di sisi server.
 *   • Jangan simpan API key, service account key, atau OAuth token
 *     di file ini atau file JS manapun yang dimuat di browser.
 *   • Jika Anda menggunakan Git, tambahkan file ini ke .gitignore
 *     apabila URL endpoint tidak ingin dipublikasikan di repository.
 * ─────────────────────────────────────────────────────────────
 */

window.MUKHA_CONFIG = {

  /**
   * URL Google Apps Script Web App deployment.
   * Satu endpoint yang sama handle POST (submit) dan GET (slots/busy).
   * @type {string}
   */
  SHEETS_ENDPOINT: 'https://script.google.com/macros/s/AKfycbyzMt-mFoD8WUceLX5iN9w6eX2yoNISE573CM9jxef_ei_8G-vIW-HXIqxHu5u2bn4Dtw/exec',

  /**
   * Nama sheet (tab) di dalam Google Spreadsheet yang menjadi target.
   * @type {string}
   */
  SHEET_NAME: 'Leads Konsultasi',

  /**
   * Timeout permintaan HTTP dalam milidetik.
   * @type {number}
   */
  REQUEST_TIMEOUT_MS: 15000,

  /**
   * Source tag yang ditulis ke kolom Source di Sheets.
   * @type {string}
   */
  SOURCE_TAG: 'mukha-landing-v1',

  /**
   * Berapa hari ke depan yang ditampilkan di calendar picker.
   * @type {number}
   */
  CALENDAR_DAYS_AHEAD: 400,

};
