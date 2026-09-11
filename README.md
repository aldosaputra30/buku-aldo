# Buku Kas — Catatan Pengeluaran

Aplikasi web sederhana untuk mencatat pengeluaran & pemasukan harian.
Tidak butuh backend maupun database — semua data disimpan di **localStorage**
(cache) di browser/perangkat masing-masing pengguna.

## Fitur
- Catat pengeluaran & pemasukan, per kategori
- Ringkasan total masuk/keluar/sisa per bulan, navigasi antar bulan
- Rincian pengeluaran per kategori
- Edit & hapus catatan
- Ekspor/impor data sebagai file `.json` (untuk backup/pindah perangkat,
  karena data localStorage tidak otomatis sinkron antar perangkat)
- Bisa **di-install di Android** (Progressive Web App) supaya muncul
  seperti aplikasi biasa di layar utama & bisa dipakai offline

## Menjalankan secara lokal
Cukup buka `index.html` langsung di browser, atau jalankan server statis
sederhana (disarankan supaya service worker & manifest berfungsi normal):

```bash
python3 -m http.server 8000
```

lalu buka `http://localhost:8000`.

## Deploy ke GitHub Pages
1. Buat repository baru di GitHub, misalnya `buku-kas`.
2. Upload semua file di folder ini (`index.html`, `style.css`, `app.js`,
   `manifest.json`, `sw.js`, folder `icons/`) ke repository tersebut — bisa
   lewat web GitHub (Add file → Upload files) atau lewat git:

   ```bash
   git init
   git add .
   git commit -m "Buku kas app"
   git branch -M main
   git remote add origin https://github.com/USERNAME/buku-kas.git
   git push -u origin main
   ```

3. Di repository GitHub, buka **Settings → Pages**.
4. Pada **Source**, pilih branch `main` dan folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit, GitHub akan memberi URL seperti:
   `https://USERNAME.github.io/buku-kas/`
6. Buka URL tersebut dari HP Android (Chrome) — data akan otomatis tersimpan
   di penyimpanan lokal browser tiap kali kamu menambah catatan.

## Install sebagai aplikasi di Android
1. Buka URL GitHub Pages di atas menggunakan **Chrome** di Android.
2. Ketuk menu titik tiga (⋮) di pojok kanan atas.
3. Pilih **"Tambahkan ke layar Utama"** / **"Install aplikasi"**.
4. Ikon "Buku Kas" akan muncul di home screen dan bisa dibuka seperti
   aplikasi biasa (tanpa address bar browser).

## Catatan penting soal penyimpanan
Karena datanya disimpan di **localStorage milik browser**, perlu diingat:
- Data **tidak tersinkron** antar perangkat atau antar browser berbeda
  (mis. Chrome vs Firefox) — masing-masing punya cache sendiri.
- Jika kamu membersihkan data/cache browser secara manual, catatan bisa
  ikut terhapus. Gunakan tombol **"Ekspor data"** secara berkala untuk
  membuat backup file `.json`, dan **"Impor data"** untuk memulihkannya.
- Karena tidak ada backend, aplikasi ini murni berjalan di sisi
  perangkat pengguna masing-masing — cocok untuk pemakaian pribadi.

## Struktur file
```
├── index.html      # struktur halaman
├── style.css        # tampilan (tema "buku kas" gelap)
├── app.js           # logika: simpan/baca localStorage, render UI
├── manifest.json    # konfigurasi PWA (biar bisa di-install)
├── sw.js            # service worker (dukungan offline)
└── icons/           # ikon aplikasi
```
