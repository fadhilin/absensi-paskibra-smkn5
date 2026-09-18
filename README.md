# Absensi & Poin Paskibra

Aplikasi Next.js untuk pelatih dan anggota berdasarkan PRD versi 1.1 dan revisi pengguna. Tampilan berbahasa Indonesia, responsif, dan tema terang/gelap. Akses aplikasi memerlukan akun Supabase.

Versi PWA memakai desain biru-putih dengan navigasi bawah untuk anggota, riwayat absensi, poin, jadwal, dan profil. PWA dipasang dari browser; proyek ini tidak menghasilkan APK. Panduan GitHub, hosting, instalasi HP, dan perilaku offline ada di [docs/PWA-DEPLOY.md](docs/PWA-DEPLOY.md).

## Jalankan lokal

Prasyarat: Node.js 22 atau lebih baru, npm.

```powershell
npm install
npm run dev
```

Buka http://localhost:3000 dan masuk dengan akun pelatih atau anggota. Mode demo, perpindahan peran tanpa login, data contoh dan QR sementara sudah dihapus dari aplikasi. Data uji hanya berada di direktori pengujian dan tidak dimasukkan ke aplikasi browser.

## Hubungkan Supabase

1. Buat proyek Supabase pengembangan.
2. Jalankan migrasi dalam `supabase/migrations/` secara berurutan: `001_initial.sql`, `002_ranking.sql`, `003_profile_photos.sql`, lalu `004_scoring_criteria.sql` melalui SQL Editor. Untuk proyek yang sudah menjalankan 001–002, cukup lanjutkan 003–004.
3. Buka `.env.local` yang sudah disiapkan kosong (atau salin `.env.example` pada checkout baru). Isi URL, anon key, dan service role key proyek Anda. Jangan masukkan service role key ke variabel `NEXT_PUBLIC_*` atau membagikannya melalui chat.
4. Isi `ATTENDANCE_TOKEN_SECRET` dengan nilai acak kuat (minimal 32 byte). Contoh pembuat nilai lokal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. Pada Supabase Auth, nonaktifkan **Allow new users to sign up**. Aplikasi tidak menyediakan pendaftaran mandiri. Pembuatan akun melalui Admin API tetap tersedia.
6. Buat akun pelatih awal. Tambahkan `ADMIN_EMAIL`, `ADMIN_PASSWORD` (minimal 10 karakter), dan `ADMIN_NAME` sementara di `.env.local`, lalu jalankan:

```powershell
node --env-file=.env.local scripts/create-admin.mjs
```

7. Hapus tiga variabel `ADMIN_*` dari file setelah akun dibuat. Restart `npm run dev`, lalu masuk dengan akun pelatih.
8. Di **Pengaturan**, isi identitas sekolah dan zona waktu. Tentukan poin untuk bulan latihan sebelum membuat sesi. Tidak ada nilai poin, waktu sesi, atau zona waktu produksi yang diisi otomatis.
9. Tambahkan anggota manual atau gunakan template CSV dari halaman Anggota. Akun menggunakan email dan kata sandi; kata sandi dikelola Supabase Auth dan tidak disimpan di model aplikasi.

## Alur yang tersedia

- Login: centang **Ingat saya** untuk cookie sesi selama 30 hari, diperbarui ketika token diperbarui. Tanpa centang, cookie memakai sesi browser. Token disimpan sebagai cookie HttpOnly; password tidak disimpan aplikasi. Keluar akun menghapus cookie sesi dan pilihan tersebut. Masa sesi juga mengikuti validitas akun dan kebijakan Supabase.
- Anggota: tambah, CSV dengan laporan baris gagal, cari, ubah, nonaktif/aktif, reset kata sandi. Riwayat masa aktif dipertahankan.
- Latihan: tanggal, materi, nama lokasi, buka/batas tepat waktu/tutup, perubahan versi dan pembatalan beralasan. Tidak memerlukan koordinat atau radius.
- Absensi: pelatih membuat QR latihan, mengunduh PNG atau membagikannya melalui menu berbagi perangkat. Anggota login dan memindai QR melalui aplikasi; nama dan jam penerimaan server tampil setelah berhasil. Kamera hanya membaca QR, tanpa foto absensi atau GPS. QR bertanda tangan digital, berlaku sampai sesi tutup, dan tidak berlaku setelah latihan diubah. Pengiriman ulang tidak menggandakan absensi. Panduan lengkap: [docs/ABSENSI-QR.md](docs/ABSENSI-QR.md).
- Izin/sakit/koreksi oleh pelatih, catatan scan dan bukti lama dipertahankan. Koreksi menjadi hadir/terlambat memerlukan catatan scan QR atau bukti lama yang valid.
- Penilaian: pelatih mencari anggota berdasarkan nama, NIS, atau kelas, lalu menggeser slider 0–100 untuk setiap kriteria. Kolom angka tersinkron untuk nilai tepat; tombol Kosongkan mengembalikan status belum dinilai. Nol adalah nilai sah dan berbeda dari kosong. Akumulasi semua kriteria ditambah poin absensi menentukan ranking. Koreksi memerlukan alasan.
- Layout pelatih memakai header, ikon, kartu ringkasan dan menu cepat yang sama dengan anggota. Di HP tersedia tab Beranda, Anggota, Absensi, Nilai, Profil; menu tambahan tersedia dari Profil tanpa tombol hamburger.
- Tab **Nilai** menampilkan rincian kriteria dan catatan pelatih. Tab **Grafik** menampilkan donat akumulasi nilai bulanan: total nilai ÷ maksimum seluruh kriteria dari sesi hadir/terlambat yang tercatat × 100%. Contoh 480/600 = 80%. Nilai yang belum diisi ikut dalam maksimum dan hasil diberi label sementara; poin absensi ditambahkan terpisah pada ranking.
- Profil anggota: pilih foto JPG/PNG/WebP maksimal 2 MB, pratinjau, simpan, dan hapus. Foto dipotong persegi, dikonversi menjadi JPEG 512 × 512 tanpa metadata asli, lalu disimpan di bucket privat `avatars`. Pemilik dapat membuka fotonya sendiri; pelatih dapat melihat foto di daftar anggota melalui endpoint privat tanpa cache.
- Profil pelatih: edit nama, unggah/ganti/hapus foto dengan ketentuan yang sama. Anggota membuka **Profil → Info Pelatih** untuk melihat nama dan foto pelatih aktif. Informasi ini tidak memuat email atau data login. Pelatih hanya dapat mengubah profilnya sendiri. Nama dan referensi foto pelatih disimpan pada `school_state.trainers`; daftar akun aktif tetap mengikuti tabel `profiles`. Tidak memerlukan migrasi SQL tambahan setelah 001–004.
- Ranking kompetisi (1, 2, 2, 4), total sepanjang masa, pengesahan bulanan, pemenang bersama, buka kembali, dan versi penghargaan.
- Laporan CSV dan cetak/PDF, prestasi lomba tanpa pengaruh ranking, audit perubahan.
- Kompetensi: pelatih membuat katalog keterampilan, mencatat tingkat penguasaan (perlu latihan, berkembang, menguasai), tanggal dan catatan per anggota. Perubahan wajib beralasan dan diaudit. Anggota melihat catatannya sendiri; hasil ini tidak memengaruhi ranking.
- Pengumuman: pelatih menyimpan draf, menerbitkan, mengubah, dan mengarsipkan informasi. Anggota hanya melihat yang diterbitkan. Lonceng pada header membuka daftar pengumuman, tanpa push notification.
- PWA: manifest dan ikon instalasi, bantuan pemasangan, fallback offline, tab bawah anggota, ringkasan absensi dan grafik poin. Server tetap diperlukan untuk data akun serta pengiriman absensi.

Sesi kedaluwarsa diproses secara idempoten saat API data dibaca atau ada transaksi berikutnya. Tidak memerlukan scheduler, tetapi perubahan menjadi alpa baru tersimpan saat permintaan tersebut terjadi.

## Keputusan implementasi penyimpanan

Stack mengikuti PRD: Next.js App Router, React, TypeScript, Tailwind, Supabase Auth/PostgreSQL/Storage, Sharp, Zod, Vitest, Playwright.

**Penyimpanan domain tahap ini menggunakan satu aggregate JSONB sekolah**, bukan tabel terpisah per entitas. Identitas login berada di tabel `profiles` dan `auth.users`. Struktur anggota, sesi, absensi, aturan, hasil, prestasi, dan audit tetap terpisah dalam aggregate. Keputusan ini menyederhanakan transaksi koreksi dan snapshot hasil untuk satu sekolah; seluruh mutasi memakai revision compare-and-swap dan retry. Trigger PostgreSQL menolak pasangan absensi, NIS, dan periode aturan ganda. Ranking produksi dihitung dengan agregasi SQL dan `RANK()`.

Konsekuensi: setiap perubahan membaca/menulis aggregate sekolah. Pendekatan ini perlu dinormalisasi dan diuji beban sebelum skala data besar. Foto disimpan terpisah di bucket privat, bukan di JSONB. Siswa tidak memiliki akses langsung ke aggregate; semua pembacaan melewati proyeksi server yang hanya memberikan data pribadi sendiri dan kolom publik ranking.

Kompetensi dan pengumuman disimpan sebagai koleksi tambahan dalam aggregate yang sama. Data lama tanpa koleksi ini dibaca sebagai daftar kosong; tidak memerlukan migrasi SQL tambahan. Penilaian kompetensi menyimpan hasil terbaru per pasangan anggota/kompetensi, dengan riwayat perubahan dalam audit pelatih.

Ketentuan numerik baru mengikuti revisi pengguna pada 16–17 September 2026, menggantikan skala awal untuk periode baru. Setiap kriteria berbobot sama dan bernilai 0–100. Kriteria yang sudah memiliki nilai, termasuk nol, tidak dapat dihapus. Menambah kriteria membuat data sebelumnya belum lengkap sampai nilai tambahannya diisi. Bulan disahkan harus dibuka kembali sebelum perubahan. Periode lama yang sudah memakai nilai keaktifan/keterampilan dipertahankan pada skala aslinya dan tidak dikonversi diam-diam; gunakan periode baru untuk ketentuan 0–100. Perubahan minimum dari 1 menjadi 0 tidak memerlukan migrasi SQL tambahan.

## Pengujian

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Jalankan build sebelum `test:e2e`: Playwright menjalankan server produksi khusus pada port 3100 dan menggunakan Chrome yang terpasang (`channel: 'chrome'`). Port terpisah mencegah pengujian PWA memakai server pengembangan di port 3000. Jika menggunakan Chromium bawaan Playwright, hapus opsi channel dan jalankan `npx playwright install chromium`. Screenshot hasil uji ada di `artifacts/`. Skrip dev/build memakai Webpack; cache Turbopack lama dipisahkan saat pemeriksaan di Windows.

Unit tests mencakup tanda tangan QR, gambar QR yang benar-benar dibaca kembali, batas waktu, duplikasi absensi, poin, nilai kosong, ranking seri, perubahan bulan, pembatalan, pengesahan ulang, privasi, keanggotaan, dan CSV. Pengujian PostgreSQL lokal memakai PGlite dengan stub schema Auth/Storage untuk memeriksa migrasi, transaksi, ranking SQL, dan RLS. Ini tidak menggantikan pengujian Supabase Auth/Storage sungguhan.

## Sebelum penggunaan sekolah

- Konfigurasi dan uji Supabase pengembangan, termasuk login kedua peran, unggah foto nyata, signed URL, retry, penonaktifan akun, dan akses silang.
- Uji pemindaian, unduh dan berbagi QR melalui HTTPS pada Android dan iPhone nyata. QR dapat diteruskan kepada orang lain; tanpa GPS, sistem tidak membuktikan lokasi fisik pemindai.
- Jalankan prosedur backup dan pemulihan dalam `docs/OPERATIONS.md`, tetapkan masa simpan foto, lalu uji beban sesuai jumlah anggota.
- Deploy Next.js ke Vercel dan isi environment server; jangan gunakan service key pada browser. Domain produksi wajib HTTPS.

Koneksi Supabase lokal, login pelatih dan pembacaan dashboard berhasil diuji pada 17 September 2026. Proyek belum dideploy dan belum menjalani uji perangkat sekolah atau pemulihan layanan nyata.

Hasil pemeriksaan build, perhitungan, database, dan alur browser dicatat di `docs/QA.md`.
