# Operasional & pemulihan

## Pencadangan

Database dan objek bucket harus dicadangkan terpisah. Backup database tidak otomatis menyertakan file foto.

1. Jadwalkan backup PostgreSQL melalui fitur proyek Supabase atau `pg_dump` yang mencakup `public.school_state`, `public.profiles`, dan data Auth sesuai prosedur Supabase. Simpan schema dan nomor migrasi bersama backup.
2. Salin seluruh objek bucket `avatars` dan bukti lama di `attendance` ke lokasi cadangan privat yang dienkripsi. Pertahankan path objek agar referensi tetap cocok. Absensi QR baru berada di database dan tidak membuat file di Storage.
3. Catat waktu snapshot, jumlah anggota, jumlah absensi, versi/revision aggregate, serta daftar path dan checksum foto. Hentikan sementara mutasi selama snapshot konsisten dibuat atau gunakan snapshot yang diselaraskan.
4. Simpan kunci dan akses cadangan terpisah dari repositori. Batasi akses hanya pada pengelola sekolah.

## Uji pemulihan sebelum produksi

1. Gunakan proyek uji kosong, bukan produksi. Pulihkan database dan Auth, lalu objek Storage pada path asli.
2. Konfigurasikan environment proyek uji. Masuk sebagai pelatih dan satu anggota uji.
3. Bandingkan jumlah anggota, sesi, absensi, revision, hasil ranking, pemenang, dan versi audit dengan manifest backup.
4. Cocokkan nama, waktu server dan versi sesi pada sampel absensi QR. Untuk bukti foto lama, cocokkan checksum serta metadata tersimpan. Pastikan bukti anggota lain ditolak dan foto profil berhasil dibuka oleh pemiliknya.
5. Catat durasi, hasil, tanggal, penguji, dan penyimpangan. Jangan mengklaim berhasil sebelum pengujian ini dilakukan pada layanan nyata.

## Rekonsiliasi kegagalan parsial

Storage dan Supabase Auth berada di luar transaksi aggregate. Endpoint membersihkan file/akun yang dipastikan belum direferensikan ketika commit gagal. Jika hasil commit tidak dapat dipastikan akibat gangguan jaringan, objek dipertahankan agar bukti sah tidak terhapus.

- Bandingkan objek bucket dengan `attendance[].evidence.path`; inspeksi objek tidak direferensikan yang lebih tua dari 24 jam sebelum penghapusan.
- Untuk bucket `avatars`, bandingkan dengan `members[].photo_path` dan `trainers[].photo_path`. Penggantian/penghapusan foto membersihkan objek lama setelah commit dipastikan. Jika jaringan terputus dan commit belum pasti, objek dipertahankan; periksa referensi terbaru dan audit sebelum membersihkan objek yatim. Jangan menghapus foto yang masih direferensikan anggota atau pelatih.
- Bandingkan akun/profil anggota dengan `members[].id`; akun yatim tidak memperoleh akses karena pemeriksaan keanggotaan server. Periksa audit sebelum menghapus.
- Jangan menghapus bukti yang direferensikan oleh absensi, termasuk latihan batal atau status yang dikoreksi.
- Penambahan anggota dan Auth dilakukan per baris. Saat impor sebagian gagal, kirim ulang hanya baris gagal; NIS unik mencegah duplikasi.

## Retensi & jadwal

Sekolah menentukan durasi retensi foto profil, bukti foto/lokasi lama, catatan QR, audit, frekuensi backup, dan penanggung jawab. Penghapusan otomatis belum diaktifkan karena masa simpan belum ditentukan. Sebelum menghapus bukti kedaluwarsa, tentukan bagaimana riwayat koreksi yang mewajibkan bukti akan ditangani.

## Kunci QR

`ATTENDANCE_TOKEN_SECRET` dipakai server untuk menandatangani QR. Mengganti nilai ini membatalkan seluruh QR yang sudah dibagikan; setelah restart/deploy, pelatih perlu membuat dan membagikan ulang QR latihan yang masih terbuka. Mengubah latihan juga membatalkan QR versi sebelumnya. Simpan rahasia ini hanya di environment server.

## Batas penggunaan

- Satu sekolah dan satu ekstrakurikuler. Aggregate JSONB memerlukan evaluasi ukuran dan latensi secara berkala.
- Sesi tutup diproses pada permintaan aplikasi berikutnya; tidak ada pelacakan lokasi terus-menerus.
- Poin dan aturan historis dipertahankan; periode disahkan harus dibuka kembali sebelum perubahan.
- Jangan masukkan data siswa asli pada pengujian otomatis. Data contoh hanya digunakan oleh fixture pengujian, bukan fitur aplikasi.
