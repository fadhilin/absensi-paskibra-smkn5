# PWA dan deployment melalui GitHub

Aplikasi memakai Next.js dengan API server, Supabase, dan Sharp. GitHub menyimpan kode; hosting Next.js menjalankan aplikasi. GitHub Pages tidak menjalankan API server pada proyek ini.

Alur impor repository mengikuti [dokumentasi integrasi GitHub Vercel](https://vercel.com/docs/git/vercel-for-github). Workflow pengujian mengikuti [panduan CI Playwright](https://playwright.dev/docs/ci-intro).

## Dari folder lokal ke hosting

1. Buat repository GitHub untuk proyek, lalu unggah kode dari folder ini. `.gitignore` sudah mengecualikan `.env.local`, `node_modules`, hasil build, dan hasil tes. `.env.example` berisi nama variabel tanpa nilai rahasia dan boleh masuk repository.
2. Di Vercel, pilih Add New → Project dan impor repository tersebut. Framework Preset: Next.js; Root Directory: folder yang memuat `package.json` (`./` jika kode berada di akar repository); Node.js: 24.x; instalasi: `npm ci`; build: `npm run build`; Output Directory: default Next.js. Gunakan deployment server Next.js, bukan static export.
3. Isi variabel berikut di pengaturan environment hosting, menggunakan nilai dari proyek Supabase yang dituju:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (hanya server)
   - `ATTENDANCE_TOKEN_SECRET` (hanya server, minimal 32 byte acak)
4. Jika memakai proyek Supabase yang sudah menjalankan 001–004, tidak perlu menjalankan ulang SQL maupun membuat ulang akun. Untuk proyek Supabase baru, jalankan migrasi 001–004 secara berurutan dan buat akun pelatih awal sesuai README. Migrasi 003 menyiapkan bucket foto profil privat; 004 memperbarui ranking SQL untuk seluruh kriteria, termasuk nilai 0–100. Variabel `ADMIN_*` hanya untuk skrip pembuatan akun awal; tidak diperlukan untuk menjalankan aplikasi di hosting.
5. Deploy dan gunakan URL HTTPS. Jika mengubah variabel `NEXT_PUBLIC_*`, lakukan build/deploy ulang karena nilainya dapat dimasukkan saat build.
6. Buka URL produksi di HP dan lakukan pengujian di bawah. Jangan menggunakan data sekolah nyata di deployment preview sebelum akses dan penyimpanannya diverifikasi.

Tidak ada repository atau hosting yang dibuat otomatis oleh perubahan ini. Saat repository tujuan tersedia, kode dapat dipush dan hosting dihubungkan. `.env.local` tidak dikirim ke GitHub. Jangan meletakkan kunci server dalam kode, issue, atau README.

## Memasang di HP

- Android: buka URL HTTPS di browser yang mendukung PWA. Gunakan tombol **Pasang aplikasi** jika browser menyediakannya, atau opsi instalasi pada menu browser.
- iPhone/iPad: buka di Safari, gunakan **Bagikan > Tambahkan ke Layar Utama**. Ketersediaan dan teks menu bergantung versi browser.
- Jalankan melalui ikon Paskibra. Manifest meminta mode `standalone`; tidak ada file APK atau proses Play Store.

Ikon aplikasi sudah memakai `public/logo-paskibra.png`. Untuk membuat ulang ukuran ikon, jalankan `node scripts/generate-icons.mjs`, naikkan versi cache pada `public/sw.js`, lalu deploy ulang. Identitas sekolah di dalam aplikasi mengikuti Pengaturan.

## Koneksi dan pembaruan

- Service worker aktif pada build produksi melalui HTTPS (atau localhost untuk tes). Mode `npm run dev` tidak mendaftarkan worker baru.
- Cache hanya menyimpan `offline.html` dan ikon. Login, API, foto, signed URL, nilai, serta halaman akun tidak disimpan di Cache Storage.
- Saat aplikasi sudah terbuka dan koneksi terputus, banner memberi tahu pengguna. Navigasi ulang saat offline menampilkan halaman sambungan ulang. Tidak ada antrean absensi offline atau pengiriman otomatis di belakang layar.
- Absensi memerlukan kamera untuk membaca QR, koneksi, dan validasi server pada saat pengiriman. Tidak meminta lokasi atau mengunggah foto absensi. Sesudah tersambung, scan ulang QR selama sesi masih terbuka; pengiriman ulang tidak menggandakan catatan.
- Halaman aplikasi selalu diminta dari jaringan saat dibuka ulang. Perubahan aplikasi terlihat setelah muat ulang. Worker diperiksa kembali tanpa cache HTTP saat pendaftaran; naikkan nama cache pada `public/sw.js` jika isi halaman offline atau ikon berubah.

## Verifikasi sebelum dipakai

1. Buka `/manifest.webmanifest`, `/sw.js`, dan ikon dari domain produksi; pastikan respons berhasil.
2. Pasang lewat browser di Android dan Safari iPhone nyata; periksa ikon, judul, navigasi bawah, dan area aman layar.
3. Masuk sebagai pelatih, buat latihan, lalu generate, unduh dan bagikan QR. Masuk sebagai anggota dan scan QR dengan kamera HP; periksa nama, jam server dan rekap pelatih. Uji juga unggah dan akses foto profil secara terpisah.
4. Matikan koneksi, muat ulang, periksa halaman offline. Hidupkan koneksi dan tekan **Coba lagi**.
5. Keluar akun dan periksa bahwa akun lain tidak menerima data anggota sebelumnya.
6. Deploy pembaruan, buka ulang aplikasi terpasang, lalu verifikasi versi baru dan fallback offline.

Workflow `.github/workflows/ci.yml` memeriksa tipe, unit/database, build, dan browser tanpa kredensial Supabase produksi. Pengujian lokal/simulasi tidak membuktikan instalasi pada HP nyata atau integrasi Supabase produksi.
