# Absensi melalui QR

## Pelatih

1. Buka **Absensi / Latihan & absensi**, lalu buat latihan. Isi tanggal, materi, nama lokasi, waktu buka, batas tepat waktu, dan waktu tutup. Latitude, longitude dan radius tidak diperlukan.
2. Simpan latihan, lalu tekan **Generate QR** pada kartu latihan tersebut. QR boleh dibuat sebelum waktu buka.
3. Tampilkan QR di lokasi latihan, tekan **Unduh QR** untuk menyimpan PNG, atau **Bagikan QR** untuk membuka menu berbagi perangkat. Jika browser belum mendukung berbagi berkas, gambar otomatis diunduh agar dapat dilampirkan ke pesan.
4. Tekan **Lihat absensi**. Nama, status dan jam scan muncul pada rekap. Pada akun produksi, rekap diperbarui setiap 10 detik selama halaman terlihat; tersedia juga **Muat ulang absensi**.

## Anggota

1. Login, buka tab **Absensi**, pilih latihan dan tekan **Scan QR absensi**.
2. Tekan **Buka pemindai QR**, izinkan kamera, lalu arahkan ke QR pelatih. Kamera membaca kode secara lokal; tidak ada foto atau lokasi yang dikirim.
3. QR valid langsung mencatat absensi. Layar hasil menampilkan nama, latihan, status, dan jam absensi. Tekan **Selesai** untuk melihat riwayat.

Tampilkan QR di layar lain atau pada cetakan agar dapat dipindai. Kode dibaca melalui pemindai di aplikasi setelah login.

## Ketentuan

- Server menentukan jam absensi. Scan hingga batas tepat waktu berstatus hadir; sesudahnya sampai waktu tutup berstatus terlambat.
- Scan sebelum waktu buka, setelah tutup, dari anggota tidak aktif, atau untuk latihan yang dibatalkan ditolak.
- QR berlaku untuk satu latihan dan versinya. Jika latihan diubah, buat dan bagikan QR terbaru. Periode yang sudah disahkan tidak menerima absensi baru.
- Scan berulang pada sesi yang sama mempertahankan catatan pertama beserta jam aslinya. Izin/sakit atau koreksi manual tidak ditimpa oleh scan.
- Absensi memerlukan koneksi internet. Jika pengiriman terganggu, scan ulang selama sesi masih terbuka; aplikasi tidak menyimpan antrean absensi offline.
- QR dapat diteruskan kepada orang lain. Tanpa pemeriksaan lokasi, kepemilikan QR tidak membuktikan kehadiran fisik; pelatih mengawasi pemindaian di tempat latihan.
- Semua QR dibuat oleh server untuk latihan dari akun pelatih. Aplikasi memerlukan login; tidak ada alur QR contoh atau absensi sementara.

## Penyimpanan dan konfigurasi

Gunakan migrasi 001–004 yang sudah tersedia. Revisi QR tidak memerlukan migrasi SQL tambahan: catatan `qr_checkin` berada dalam aggregate `school_state`. `ATTENDANCE_TOKEN_SECRET` pada `.env.local` atau environment hosting tetap wajib diisi dengan nilai acak kuat; jangan disertakan ke GitHub.

Absensi QR baru tidak menggunakan Storage. Bucket privat `avatars` tetap digunakan untuk foto profil. Bucket `attendance` dan endpoint bukti lama dipertahankan agar riwayat sebelum revisi QR tetap dapat dibuka.

QR ditandatangani HMAC di server, dibuat menggunakan [node-qrcode](https://github.com/soldair/node-qrcode), dan dibaca dari bingkai kamera menggunakan [jsQR](https://github.com/cozmo/jsQR).
