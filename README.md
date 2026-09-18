# Paskibra SMKN 5 Jakarta

<img src="public/logo-paskibra.png" alt="Logo Paskibra SMKN 5 Jakarta" width="112" />

Aplikasi untuk mengelola anggota, latihan, absensi QR, penilaian, dan perkembangan anggota Paskibra. Dibangun sebagai **Progressive Web App (PWA)** yang dapat dipasang ke layar utama HP melalui browser.

Antarmuka berbahasa Indonesia, mengutamakan penggunaan di HP, dan menyediakan tema terang/gelap. Login menggunakan akun pelatih atau anggota melalui Supabase Auth. Tidak tersedia mode demo atau pendaftaran mandiri.

## Fitur pelatih

- **Beranda:** ringkasan latihan hari ini dengan total anggota aktif, hadir (termasuk terlambat), izin (termasuk sakit), serta belum absen atau alpa setelah sesi ditutup. Jika ada beberapa latihan, pilih sesi untuk melihat hitungannya; tombol detail membuka absensi sesi tersebut.
- **Anggota:** tambah akun, impor CSV, cari berdasarkan nama/NIS/kelas, ubah data, aktifkan/nonaktifkan anggota, dan reset kata sandi. Foto anggota tampil dalam daftar, bersama dua diagram donat perkembangan periode terpilih (kehadiran dan nilai) serta total poin.
- **Latihan dan absensi:** buat jadwal, tentukan lokasi serta waktu absensi, generate QR, unduh PNG atau bagikan QR, lihat rekap, dan kelola izin/sakit/koreksi dengan alasan.
- **Penilaian:** atur kriteria, cari anggota, lalu isi nilai lewat slider atau kolom angka **0–100**.
- **Kompetensi:** buat katalog keterampilan dan catat tingkat penguasaan, tanggal, serta catatan anggota.
- **Pengumuman:** simpan draf, terbitkan, ubah, dan arsipkan informasi.
- **Ranking dan penghargaan:** lihat peringkat, sahkan hasil bulanan, buka kembali hasil dengan alasan, dan catat prestasi.
- **Laporan:** ekspor CSV dan cetak/simpan PDF melalui browser.
- **Pengaturan:** atur identitas sekolah, zona waktu, aturan poin, serta lihat audit perubahan.
- **Profil:** ubah nama dan unggah/ganti/hapus foto pelatih.

Navigasi bawah pelatih: **Beranda · Anggota · Absensi · Nilai · Profil**. Menu pengelolaan tambahan tersedia melalui Profil.

## Fitur anggota

- **Beranda:** ringkasan kehadiran, donat persentase nilai, total poin, jadwal, dan menu cepat.
- **Absensi:** scan QR latihan, lihat hasil berupa nama, status, dan jam absensi; buka riwayat serta rekap kehadiran.
- **Nilai:** rincian tiap latihan berisi tanggal, kehadiran, jam absensi jika tersedia, poin absensi, nilai setiap kriteria, subtotal penilaian, total poin latihan, dan catatan pelatih.
- **Grafik:** diagram donat persentase akumulasi nilai dan grafik perkembangan pada bulan terpilih.
- **Jadwal, kompetensi, dan pengumuman:** lihat jadwal latihan, catatan penguasaan pribadi, serta pengumuman yang diterbitkan.
- **Ranking dan penghargaan:** lihat peringkat serta hasil yang tersedia tanpa membuka rincian pribadi anggota lain.
- **Profil:** lihat data diri, unggah/ganti/hapus foto, dan buka **Info Pelatih** yang hanya menampilkan nama serta foto pelatih aktif.

Navigasi bawah anggota: **Beranda · Absensi · Nilai · Jadwal · Profil**. Tombol **Keluar akun** berada langsung setelah menu **Penghargaan**, sebelum bagian pemasangan PWA dan Tentang aplikasi.

## Absensi QR

1. Pelatih membuat latihan dan mengatur waktu buka, batas tepat waktu, serta waktu tutup absensi.
2. Pelatih membuka QR latihan untuk ditampilkan di tempat latihan, diunduh, atau dibagikan.
3. Anggota login, membuka pemindai, dan mengizinkan kamera untuk membaca QR.
4. Server memeriksa QR, sesi latihan, waktu, dan keanggotaan, lalu mencatat hadir atau terlambat.
5. Anggota menerima hasil berupa nama dan jam absensi; pelatih melihat catatan pada rekap.

Kamera hanya membaca QR, tanpa mengambil foto absensi atau meminta GPS/latitude/longitude. Scan ulang tidak menggandakan catatan. QR bertanda tangan digital, berlaku sampai sesi tutup, dan tidak berlaku setelah versi latihan berubah.

Absensi memerlukan koneksi internet. QR dapat diteruskan kepada orang lain sehingga sistem tidak membuktikan lokasi fisik pemindai. Sesi kedaluwarsa diproses saat API data dibaca atau transaksi berikutnya berjalan, termasuk pencatatan alpa bagi anggota yang belum absen.

## Penilaian dan perhitungan poin

Setiap kriteria numerik memakai nilai bulat **0–100** dengan bobot yang sama. Pelatih dapat menambah kriteria; kriteria yang sudah memiliki nilai tidak dapat dihapus.

```text
Subtotal penilaian = jumlah nilai seluruh kriteria pada latihan
Total poin latihan = poin absensi + subtotal penilaian
Persentase grafik = total penilaian bulanan ÷ maksimum penilaian bulanan × 100%
```

Contoh: poin hadir 10 dan enam kriteria masing-masing 80 menghasilkan subtotal **480**, total poin latihan **490**, serta persentase penilaian **80%**.

- Poin hadir/terlambat mengikuti aturan periode yang ditetapkan pelatih.
- Ranking mengakumulasi poin absensi dan penilaian. Poin absensi tidak masuk ke persentase donat.
- Donat menghitung kriteria dari catatan hadir/terlambat pada latihan yang tidak dibatalkan.
- Ringkasan pada menu **Anggota** menghitung kehadiran dari sesi yang sudah dibuka, nilai dari kriteria yang sudah diisi, serta total poin dibandingkan dengan potensi poin dari sesi yang dihadiri. Sesi mendatang tidak menurunkan persentase kehadiran.
- Nilai **0** berarti sudah dinilai; **kosong** berarti belum dinilai. Komponen kosong tetap masuk nilai maksimum, dan hasil ditandai sementara.
- Penilaian belum lengkap menghalangi pengesahan bulan. Bulan yang telah disahkan harus dibuka kembali sebelum diubah.
- Poin yang sama menghasilkan peringkat yang sama, misalnya 1, 2, 2, 4.
- Kompetensi kualitatif dan catatan prestasi lomba tidak menambah poin ranking.
- Periode lama dengan skala keaktifan/keterampilan tetap memakai aturan aslinya.

## Foto profil dan identitas visual

Foto menerima JPG, PNG, atau WebP maksimal **2 MB**. Gambar dipotong persegi, dikonversi menjadi JPEG 512 × 512 tanpa metadata asli, dan disimpan di bucket privat `avatars`. API memeriksa sesi serta hak akses sebelum mengirim foto; pelatih dapat melihat foto anggota pada daftar anggota.

| Aset | Pemakaian |
| --- | --- |
| `public/logo-paskibra.png` | Sumber ikon PWA dan Apple Touch Icon |
| `public/logo-paskibra-round.png` | Logo identitas pada login dan header |
| `public/logo-login.png` | Latar samar yang menempel ke bawah halaman login |
| `public/logo-dashboard.png` | Latar kutipan di footer Profil anggota/pelatih saja |

Kutipan **“Satu langkah disiplin, seribu langkah menuju prestasi”** berada di tengah atas gambar profil. Gambar tetap samar, tidak menghalangi interaksi, dan bagian bawahnya menempel ke tepi navigasi HP.

Buat ulang ikon 192, 512, maskable 512, dan Apple Touch 180 dengan:

```powershell
node scripts/generate-icons.mjs
```

Jika mengganti ikon, naikkan versi cache pada `public/sw.js` sebelum deploy ulang.

## Menjalankan lokal

Prasyarat: **Node.js 24.x**, npm, dan proyek Supabase.

### 1. Instal dependensi

Jalankan dari folder proyek:

```powershell
npm ci
```

### 2. Isi environment

Jika belum ada, salin `.env.example` menjadi `.env.local`. Jangan menimpa konfigurasi yang sudah terisi.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ATTENDANCE_TOKEN_SECRET=
```

| Variabel | Isi |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key proyek Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key, hanya digunakan server |
| `ATTENDANCE_TOKEN_SECRET` | Secret acak untuk tanda tangan QR |

Buat secret menggunakan 32 byte acak:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salin hasilnya ke `ATTENDANCE_TOKEN_SECRET`. Jangan commit `.env.local`, dan jangan menambahkan awalan `NEXT_PUBLIC_` ke service role key atau secret QR.

### 3. Siapkan Supabase

Untuk **proyek Supabase baru**, jalankan SQL melalui SQL Editor secara berurutan:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_ranking.sql`
3. `supabase/migrations/003_profile_photos.sql`
4. `supabase/migrations/004_scoring_criteria.sql`

Migrasi 003 menyiapkan penyimpanan foto profil; 004 memperbarui penilaian dan ranking. **Jika 001–004 sudah dijalankan pada proyek yang sama, tidak perlu menjalankannya ulang saat deploy.** Akun, data, dan foto yang sudah tersimpan tetap digunakan.

Nonaktifkan pendaftaran publik di pengaturan Supabase Auth. Akun anggota dibuat oleh pelatih melalui aplikasi.

### 4. Buat akun pelatih pertama

Lakukan hanya jika belum ada akun pelatih. Tambahkan sementara ke `.env.local`:

```dotenv
ADMIN_EMAIL=pelatih@example.com
ADMIN_PASSWORD=ganti-dengan-kata-sandi-kuat
ADMIN_NAME=Nama Pelatih
```

Ganti contoh dengan data akun. Kata sandi minimal 10 karakter. Kemudian jalankan:

```powershell
node --env-file=.env.local scripts/create-admin.mjs
```

Hapus variabel `ADMIN_*` setelah akun dibuat. Variabel tersebut tidak diperlukan untuk menjalankan aplikasi atau deploy ke Vercel.

### 5. Ganti email atau kata sandi akun pelatih

Untuk mengganti email atau kata sandi akun pelatih yang sudah ada, **jangan hapus akunnya**. Menghapus akun dapat terhalang oleh relasi profil dan akan memutus akses ke data yang terhubung. Tambahkan sementara ke `.env.local`:

```dotenv
CURRENT_ADMIN_EMAIL=email-lama@example.com
NEW_ADMIN_EMAIL=email-baru@example.com
NEW_ADMIN_PASSWORD=kata-sandi-baru-minimal-10-karakter
```

Untuk mengganti kata sandi saja, cukup isi `CURRENT_ADMIN_EMAIL` dan `NEW_ADMIN_PASSWORD`; hilangkan baris `NEW_ADMIN_EMAIL`. Untuk mengganti email saja, isi `CURRENT_ADMIN_EMAIL` dan `NEW_ADMIN_EMAIL`.

Kemudian jalankan:

```powershell
node --env-file=.env.local scripts/change-admin-email.mjs
```

Perintah ini mempertahankan ID akun, nama pelatih, foto, dan seluruh data sekolah. Email diganti langsung dan diverifikasi. Hapus ketiga variabel `CURRENT_ADMIN_EMAIL`, `NEW_ADMIN_EMAIL`, dan `NEW_ADMIN_PASSWORD` setelah selesai.

### 6. Jalankan aplikasi

```powershell
npm run dev
```

Buka `http://localhost:3000` atau port yang ditampilkan terminal. Restart server setelah mengubah `.env.local`.

Login sebagai pelatih, buka **Profil → Pengaturan sekolah**, isi identitas dan zona waktu, lalu tentukan aturan poin/kriteria periode latihan. Tambahkan akun anggota melalui menu Anggota atau impor CSV.

Untuk menjalankan build produksi lokal:

```powershell
npm run build
npm run start
```

## Deployment melalui GitHub dan Vercel

1. Push kode proyek ke repository GitHub. Sertakan `package.json`, `package-lock.json`, `src`, `public`, dan konfigurasi proyek. `.gitignore` mengecualikan environment lokal, dependensi, build, serta hasil pengujian.
2. Di Vercel, pilih **Add New → Project**, lalu impor repository.
3. Pilih **Next.js**, Root Directory yang memuat `package.json` (`./` jika di akar repository), dan Node.js **24.x**.
4. Isi Install Command dengan `npm ci`, Build Command dengan `npm run build`, dan biarkan Output Directory mengikuti default Next.js.
5. Tambahkan empat environment aplikasi untuk **Production**, menggunakan nilai dari `.env.local` atau proyek Supabase tujuan. Masukkan nilainya tanpa tanda kutip. Tombol **Add** pada integrasi Supabase opsional tidak perlu digunakan jika environment diisi manual.
6. Klik **Deploy**, tunggu status **Ready**, lalu buka domain HTTPS yang diberikan.
7. Uji login kedua peran, foto profil, nilai, dan scan QR melalui HP. Jika memakai Supabase yang sama, gunakan akun yang sudah ada.

Untuk mengirim pembaruan dari repository lokal yang sudah terhubung:

```powershell
git add .
git commit -m "Perbarui aplikasi Paskibra"
git push
```

Push ke branch produksi yang terhubung memicu deployment baru. Setelah mengubah environment Vercel, pilih **Redeploy**. Folder `.github/workflows` bersifat opsional untuk GitHub Actions dan tidak diperlukan oleh deployment Vercel.

Aplikasi membutuhkan server Next.js untuk API. GitHub Pages tidak dapat menjalankan keseluruhan aplikasi ini.

## Memasang PWA di HP

- **Android:** buka domain HTTPS di browser, lalu pilih opsi instalasi aplikasi atau tambahkan ke layar utama jika tersedia.
- **iPhone/iPad:** buka di Safari, lalu pilih **Bagikan → Tambahkan ke Layar Utama**.
- Jalankan dari ikon Paskibra. PWA tidak memerlukan berkas APK.

Login menyediakan **Ingat saya**. Jika dicentang, cookie sesi diberi masa berlaku 30 hari dan diperbarui saat token diperbarui; jika tidak, cookie mengikuti sesi browser. Validitas akses tetap mengikuti sesi Supabase dan status akun. Fitur ini tidak menyimpan kata sandi.

Service worker hanya menyimpan halaman offline dan ikon publik. Data akun, absensi, nilai, serta foto tetap memerlukan internet. Tidak ada antrean absensi offline. Service worker aktif pada build produksi, bukan `npm run dev`.

## Teknologi dan penyimpanan

- Next.js App Router, React, TypeScript, dan Tailwind CSS.
- Supabase Auth untuk akun, PostgreSQL untuk data, dan Storage privat untuk foto.
- Sharp untuk pemrosesan foto, Zod untuk validasi, serta QRCode/jsQR untuk QR.
- Vitest dan PGlite untuk pengujian logika/database; Playwright untuk browser.

Data sekolah disimpan dalam satu dokumen JSONB di `school_state`: anggota, latihan, absensi, aturan, hasil bulanan, prestasi, kompetensi, pengumuman, profil pelatih, dan audit. Identitas autentikasi berada di `profiles`/Supabase Auth. Berkas foto disimpan terpisah di Storage.

Perubahan memakai pemeriksaan revision dan retry untuk menangani pembaruan serentak. Ranking produksi dihitung melalui fungsi SQL. Anggota menerima data pribadi sendiri serta informasi yang dibagikan melalui API, bukan akses langsung ke seluruh dokumen sekolah. Penyimpanan satu dokumen perlu dievaluasi kembali jika volume data atau jumlah pengguna tumbuh besar.

## Pemeriksaan dan pemeliharaan

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Jalankan build sebelum tes browser. Playwright menggunakan Chrome yang terpasang dan server produksi di port **3100**; pastikan port tersedia. Pengujian browser memakai respons API terisolasi, sedangkan pengujian database lokal memakai PGlite. Tetap periksa login, foto, instalasi PWA, serta scan/bagikan QR pada HP yang akan digunakan.

Cadangkan database dan objek Storage secara terpisah; backup database tidak otomatis mencakup berkas foto. Pertahankan path objek agar referensinya sesuai, dan periksa referensi foto anggota/pelatih sebelum membersihkan objek yang tidak digunakan.
