# Hasil pemeriksaan

## Ilustrasi footer dan ikon — 18 September 2026

- `logo-login.png` menjadi latar samar yang menempel ke bagian paling bawah halaman login. `logo-dashboard.png` hanya muncul pada Profil anggota/pelatih, tepat di bawah tombol Keluar akun, sebagai latar kutipan “Satu langkah disiplin, seribu langkah menuju prestasi”. Kutipan berada di tengah atas gambar utuh, tanpa kartu/border tambahan. Ilustrasi dekoratif tidak menangkap sentuhan; navigasi berada di lapisan atas.
- Ikon 192/512, maskable 512, dan Apple Touch 180 dibuat dari `logo-paskibra.png` (bukan versi round). Maskable memakai ruang aman; generator tetap tersedia pada `scripts/generate-icons.mjs`. Cache worker diperbarui ke v3.
- Build dan enam tes browser login/PWA lulus, termasuk navigasi anggota, manifest, aset ikon, dan cache offline. Pemeriksaan tambahan pada login 320/390/1440 dan dashboard 320/390 tidak menemukan overflow atau tumpang tindih footer dengan menu bawah. Tema gelap dan screenshot diperiksa visual.
- Screenshot: `artifacts/login-footer-390.png`, `artifacts/dashboard-footer-390.png`, `artifacts/dashboard-footer-dark.png`.
- Revisi latar footer: build lulus; pada lebar 320/390, tinggi dokumen tetap sama saat ilustrasi ditampilkan maupun disembunyikan, tidak ada overflow horizontal, dan menu bawah tetap bisa diklik. Screenshot terbaru: `artifacts/login-background-390.png`, `artifacts/dashboard-background-390.png`.

Tanggal: 17 September 2026. Lingkungan: Windows, Node.js 24, Next.js 16.3.5, Chrome, PostgreSQL lokal melalui PGlite.

## Verifikasi implementasi

- PASS: `npm run build`, termasuk kompilasi, pemeriksaan TypeScript, halaman produksi, manifest dan endpoint API profil pelatih.
- PASS: `npm run test`, 46 pengujian dalam delapan berkas. Mencakup tanda tangan dan pembacaan QR, aturan absensi, ranking, pengesahan, privasi, transaksi, kompetensi, pengumuman, nilai 0–100, persentase akumulasi, pemrosesan foto, profil pelatih, dan migrasi SQL 001–004.
- PASS: 24 skenario browser pada build produksi lokal: 22 lulus pada putaran penuh, lalu dua tes lama disesuaikan untuk tombol tema dan pesan reset sandi tanpa simulasi; keduanya lulus saat dijalankan ulang. Seluruh pemeriksaan memakai Chrome.
- Server pengujian memakai port 3100 dengan `reuseExistingServer: false`. Uji offline sebelumnya sempat memakai server pengembangan di port 3000, sehingga worker produksi tidak aktif; uji pada server produksi khusus kemudian lulus.

## Cakupan perubahan nilai dan profil

- Rincian nilai per latihan menampilkan status hadir/terlambat, jam absensi WIB jika tersedia, poin absensi sesuai aturan periode, setiap kriteria, subtotal penilaian dan total poin latihan. Total memakai `attendanceTotal`, fungsi yang juga dipakai ranking. Nilai belum lengkap diberi keterangan total sementara. Donat tetap menghitung persentase penilaian.
- Verifikasi rincian poin: enam tes scoring dan skenario browser nilai lulus. Browser membandingkan poin absensi + jumlah nilai dengan total setiap kartu, memeriksa keterangan sementara, donat, serta overflow pada 320 piksel. Screenshot `artifacts/member-daily-points.png` diperiksa secara visual.

- Nilai bulat 0 dan 100 diterima; -1, 101, pecahan, serta kriteria asing ditolak. Seluruh nilai nol menghasilkan 0% dengan status lengkap, sedangkan nilai kosong tetap belum dinilai.
- Total 240 dari maksimum 300 menjadi 80%. Ranking menambahkan poin absensi ke total penilaian; perubahan nilai mengubah ranking.
- Nilai kosong ditandai sementara dan menghalangi pengesahan. Seluruh kriteria dari sesi hadir/terlambat yang tercatat masuk penyebut; izin dan sesi batal tidak masuk persentase.
- Pelatih menambahkan kriteria melalui UI. Nilai lama tetap tersimpan; kriteria yang sudah memiliki nilai tidak dapat dihapus.
- Pelatih memakai lima tab HP dan profil dengan menu tambahan. Pencarian nama/NIS/kelas dan hasil kosong diverifikasi; nilai yang belum disimpan bertahan saat filter berubah. Slider diuji dengan drag, Home, End, panah keyboard, angka tepat, tombol Kosongkan dan penyimpanan nilai nol. Tidak ditemukan overflow halaman pada lebar 320 dan 390 piksel.
- Rincian kriteria muncul pada tab Nilai. Donat hanya muncul pada tab Grafik. Angka donat browser dibandingkan dengan akumulasi seluruh rincian nilai yang ditampilkan.
- Ranking SQL cocok dengan perhitungan TypeScript untuk kriteria baru, skala lama, peringkat seri dan periode kosong.
- Foto profil melalui respons API pengujian: menolak tipe file yang salah, memilih gambar, pratinjau, menyimpan, tampil pada profil/beranda, lalu menghapus kembali.
- Pemrosesan server menghasilkan JPEG 512 × 512 tanpa EXIF asli; file palsu, SVG, dan ukuran di atas 2 MB ditolak. Migrasi memverifikasi bucket `avatars` privat. GET foto tanpa login mengembalikan 401.

## Cakupan browser lainnya

Navigasi pelatih dan anggota, tambah/ubah/nonaktifkan anggota, impor/template CSV, sesi latihan tanpa koordinat/radius, izin/koreksi/pembatalan, penilaian, prestasi, laporan, pengesahan/buka kembali, privasi rincian anggota, kamera QR simulasi, kompetensi, pengumuman draf/terbit/arsip, tema terang/gelap, periode kosong dan keluar akun.

## Cakupan QR

- QR produksi bertanda tangan diperiksa terhadap kunci berbeda, kedaluwarsa, format salah, perubahan versi latihan, pembatalan, peran dan keanggotaan. PNG hasil generator dibaca kembali oleh decoder menjadi token asli.
- Jam buka, batas tepat waktu dan tutup diuji. Scan ulang mempertahankan catatan pertama; izin manual tidak ditimpa. Penanganan alpa otomatis pada batas waktu, poin dan pembatasan data anggota juga diperiksa.
- Browser memakai gambar QR sebagai bingkai video kamera simulasi. Pembacaan tetap melalui decoder QR yang dipakai aplikasi. Izin kamera ditolak mendapat pesan; kamera dihentikan setelah pemindaian atau ditutup.
- Unduhan PNG dan pilihan unduhan pengganti berbagi diuji. Pemanggilan menu berbagi berkas diperiksa dengan simulasi Web Share API; pengiriman ke WhatsApp atau aplikasi lain pada HP fisik belum diuji.
- API absensi tanpa login menolak permintaan. GPS tidak dipanggil dan Permissions Policy menonaktifkan geolocation.

PWA: manifest/ikon/header worker, prompt instalasi simulasi, banner koneksi, fallback offline dan pemulihan koneksi. Cache Storage hanya berisi halaman offline dan ikon; data akun/API/foto tidak disimpan di cache worker.

## Pemeriksaan antislop

- Hard Gate / PASS pada alur lokal: navigasi dan tindakan berfungsi; status loading/error/kosong tersedia; aplikasi mewajibkan akun dan tidak menyediakan mode demo. Browser memeriksa overflow pada lebar 320 dan 390 piksel. Kontrol native, fokus terlihat, skip link dan Escape dialog tersedia.
- Kontras / PASS untuk pasangan utama yang dihitung: teks utama/putih 15,53:1; teks sekunder/latar terang 5,83:1; biru/latar biru muda 6,42:1; putih/header biru 7,15:1; teks biru terang/latar biru gelap 7,29:1; teks tombol gelap/latar biru terang 8,81:1; hijau/latar hijau muda 6,21:1.
- Purpose Gate / PASS: alasan warna, font, spasi, ikon, panel, donat dan navigasi tercatat pada `DESIGN.md`. Donat menunjukkan rasio nilai; ikon mengikuti fungsi menu referensi.
- Liveliness / PASS: ENERGY 2 / RHYTHM 2 / MOTION 1. Arah biru-putih berasal dari referensi pengguna; hierarki memprioritaskan identitas, tindakan latihan dan hasil penilaian.
- Craftsmanship / PASS pada cakupan lokal: build, 46 unit/database dan 24 skenario browser lulus. Screenshot terang/gelap, rincian nilai, donat, foto profil, layout pelatih, QR, hasil absensi dan Info Pelatih diperiksa secara visual.

Screenshot utama: `artifacts/pwa-grafik.png`, `pwa-grafik-akumulasi.png`, `pwa-grafik-dark.png`, `pwa-nilai.png`, `pwa-profil-foto.png`, serta lima layar anggota lainnya. Gambar P dalam uji unggah adalah ikon aplikasi sebagai berkas uji, bukan foto identitas siswa.

Screenshot pelatih: `artifacts/trainer-beranda.png`, `trainer-penilaian.png`, `trainer-penilaian-320.png`, `trainer-slider-320.png`, `trainer-slider-dark.png`, dan `trainer-profil-dark.png`.

Screenshot QR: `artifacts/trainer-qr.png` dan `artifacts/member-qr-receipt.png`, keduanya pada lebar 390 piksel.

## Batas verifikasi

Verifikasi mencakup kode, PostgreSQL lokal dengan stub Auth/Storage, dan alur Chrome memakai API pengujian terisolasi. Data fixture hanya berada di berkas pengujian, tidak masuk ke aplikasi. Pada pemeriksaan koneksi 17 September 2026, login pelatih melalui API lokal ke Supabase nyata berhasil (HTTP 200), lalu dashboard membaca data dan peran admin (HTTP 200). Nilai kredensial tidak dicatat dalam hasil pemeriksaan. Unggah dan akses silang foto dengan akun Supabase asli, perangkat Android/iPhone fisik, instalasi PWA nyata, beban serentak, deployment GitHub/hosting dan pemulihan layanan nyata belum diuji.

## Profil pelatih dan penghapusan demo

Perbaikan foto pada daftar anggota: avatar mengambil foto anggota melalui endpoint privat dengan parameter `member`; hanya akun pelatih yang boleh meminta foto melalui parameter ini. Ukuran avatar tetap 36 piksel, potongan gambar mengikuti lingkaran, dan anggota tanpa foto memakai inisial. Versi URL mengikuti waktu perubahan foto agar penggantian foto tidak tertahan cache.

Verifikasi perbaikan: build dan empat skenario browser nilai/profil lulus. Skenario anggota kini memeriksa foto tampil di daftar pelatih setelah unggah dan kembali menjadi inisial setelah dihapus. Pembacaan foto anggota yang sudah tersimpan di Supabase nyata menghasilkan HTTP 200 (`image/jpeg`). Pemeriksaan tidak mengubah data atau foto akun nyata. Screenshot: `artifacts/trainer-member-photo.png`.

- Tidak ada tombol masuk demo, pergantian peran, state contoh, atau jalur penyimpanan simulasi dalam `src`.
- Pelatih dapat mengubah nama, memilih dan menyimpan foto, memuat ulang, serta menghapus foto. Anggota melihat hasilnya melalui Profil → Info Pelatih, hanya nama dan foto, tanpa kontrol edit atau perkenalan.
- Unit test memeriksa perubahan hanya pada profil sendiri, penolakan perubahan oleh anggota, penyaringan pelatih aktif, dan penyembunyian lokasi berkas privat. Endpoint profil/foto menolak pengguna tanpa sesi.
- Uji browser foto menggunakan respons Storage pengujian; tidak mengubah foto akun nyata. Layout Info Pelatih diperiksa pada 320 piksel tanpa overflow horizontal. Screenshot: `artifacts/trainer-profile-edit.png`, `artifacts/member-trainer-info.png`.
- Tidak ada migrasi tambahan. Profil pelatih tersimpan pada agregat `school_state`; foto memakai bucket privat `avatars` dari migrasi 003.

Perbaikan login: respons 401 dari API data berarti konfigurasi sudah tersedia tetapi sesi belum ada. UI kini mengaktifkan formulir login pada kondisi ini. Sebelumnya status konfigurasi tetap false sehingga tombol Masuk nonaktif. Preview produksi dibangun ulang untuk memuat environment terbaru.

Verifikasi perbaikan login: build lulus; dua skenario browser terarah lulus (konfigurasi siap/formulir aktif dengan pesan kredensial salah, serta konfigurasi kosong/formulir nonaktif). Pengujian ini menggunakan respons simulasi tanpa menyimpan kredensial nyata dalam trace.

Revisi tampilan login berikutnya: tag `br` yang membungkus teks sekolah menyebabkan error render di server pengembangan dan sudah diperbaiki. Login akun pelatih nyata hingga dashboard berhasil diperiksa melalui browser pada localhost:3000 tanpa error JavaScript. Susunan awal kemudian diubah menjadi logo, judul sekolah dan form dalam satu kolom sesuai permintaan pengguna. Build dan dua tes login lulus kembali; pada lebar 320, 390 dan 1440 piksel, jarak identitas ke form 24 piksel, tidak ada overflow horizontal, dan logo berhasil dimuat. Screenshot: `artifacts/login-new-320.png`, `login-new-390.png`, dan `login-new-1440.png`.

Revisi Ingat saya dan header: build dan dua tes login terarah lulus. Pengujian tambahan terhadap akun nyata memverifikasi cookie sesi tanpa centang, cookie 30 hari dengan centang, HttpOnly/Secure/SameSite, pembaruan token yang mempertahankan pilihan, serta logout yang menghapus ketiga cookie. Password dan nilai token tidak dicatat. Header pada lebar 320/390 menampilkan logo 40 × 40 di dalam batas header tanpa overflow, tombol Menu tidak ada, dan Pengaturan sekolah tetap tersedia melalui Profil. Screenshot: `artifacts/header-mobile-320.png`, `header-mobile-390.png`, `login-remember.png`.

Jalankan migrasi 003 dan 004 jika proyek sudah memakai migrasi 001–002. Panduan konfigurasi ada di `README.md`, pemasangan/deployment di `docs/PWA-DEPLOY.md`, dan backup/rekonsiliasi objek di `docs/OPERATIONS.md`.
