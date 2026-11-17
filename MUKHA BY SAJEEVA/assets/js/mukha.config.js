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
   * Kosongkan string ('') selama development; isi setelah deploy.
   *
   * @type {string}
   */
  SHEETS_ENDPOINT: 'https://script.google.com/macros/s/AKfycbwc9cYkfniqOIuDLa94cgkp9BCIwyb74URJ4LEgtuZOGYg3sLBmeF46c4ctRnIU92q_eg/exec',

  /**
   * Nama sheet (tab) di dalam Google Spreadsheet yang menjadi target.
   * Harus sama persis (case-sensitive) dengan nama tab di Sheets.
   *
   * @type {string}
   */
  SHEET_NAME: 'Leads Konsultasi',

  /**
   * Timeout permintaan HTTP dalam milidetik.
   * Naikkan jika koneksi server lambat; turunkan untuk UX lebih cepat.
   *
   * @type {number}
   */
  REQUEST_TIMEOUT_MS: 15000,

  /**
   * Source tag yang ditulis ke kolom Source di Sheets.
   * Berguna untuk membedakan leads dari halaman atau campaign berbeda.
   *
   * @type {string}
   */
  SOURCE_TAG: 'mukha-landing-v1',

};
