# PRD Aplikasi Absensi dan Poin Paskibra

Versi: 1.1  
Tanggal: 15 September 2026  
Status: PRD versi awal untuk acuan pengembangan. Detail operasional pada bagian 8 menjadi default implementasi yang dapat ditinjau saat perencanaan teknis.

## 1. Ringkasan

Aplikasi web untuk satu ekstrakurikuler Paskibra di satu SMK. Anggota melakukan absensi mandiri dengan foto kamera, lokasi, dan timestamp. Sistem menerima absensi otomatis jika memenuhi radius dan waktu sesi, tanpa pengesahan pelatih. Pelatih sekaligus admin mengatur sesi dan memberi poin keaktifan serta keterampilan. Anggota melihat perkembangan pribadi dan ranking bulanan untuk memotivasi partisipasi. Setiap bulan, pelatih mengesahkan penerima gelar Anggota Terbaik Bulanan.

Poin digunakan untuk motivasi dan penghargaan, bukan nilai rapor. Angka dan bobot pada draf awal tidak berlaku; pelatih menentukan besaran poin.

## 2. Tujuan dan ukuran keberhasilan

- Memusatkan absensi, penilaian, dan rekap anggota.
- Menunjukkan sumber poin secara jelas kepada anggota bersangkutan.
- Menghasilkan ranking dan calon pemenang tanpa perhitungan manual.
- Memungkinkan koreksi tanpa menghilangkan riwayat perubahan.

Target uji coba: anggota dapat menyelesaikan absensi dalam maksimal 1 menit setelah izin kamera dan lokasi tersedia pada koneksi memadai; seluruh skenario validasi dan perhitungan pada bagian penerimaan sesuai hasil yang diharapkan. Target ini merupakan kriteria pengujian, bukan klaim performa yang sudah terbukti.

## 3. Pengguna dan hak akses

| Pengguna | Hak akses |
|---|---|
| Pelatih sekaligus admin | Mengelola akun, anggota, latihan, absensi, konfigurasi poin, penilaian, laporan, dan pengesahan bulanan |
| Anggota | Mengirim absensi foto dan lokasi, melihat rincian hasil sendiri, nama dan poin bulanan anggota lain, ranking, serta riwayat pemenang |

Rincian absensi, nilai per komponen, dan catatan pelatih milik anggota lain tidak dapat diakses siswa. Ranking tidak tersedia secara publik. Pendaftaran mandiri tidak tersedia.

## 4. Cakupan MVP

### 4.1 Anggota dan akun

- Pelatih menambah anggota secara manual atau melalui CSV.
- Data minimum: nomor induk, nama, kelas, status keanggotaan, tanggal bergabung, dan akun login.
- Impor memvalidasi kolom wajib dan nomor induk ganda, serta menunjukkan baris yang gagal.
- Pelatih dapat menonaktifkan akun dan membantu pengaturan ulang kata sandi.
- Penonaktifan anggota mempertahankan riwayatnya.

### 4.2 Latihan

- Pelatih membuat latihan dengan tanggal, waktu, lokasi, dan materi.
- Pelatih menentukan titik koordinat latihan, radius yang diizinkan dalam meter, jam buka absensi, batas tepat waktu, dan jam tutup. Urutan waktu harus valid: buka ≤ batas tepat waktu ≤ tutup.
- Konfigurasi radius dan waktu disimpan bersama sesi. Perubahan dicatat dan tidak mengubah validasi absensi yang sudah diterima secara diam-diam.
- Daftar peserta mengikuti keanggotaan yang berlaku pada tanggal latihan.
- Latihan memiliki status draf, selesai, atau dibatalkan.
- Latihan dibatalkan tidak menyumbang poin dan tetap memiliki riwayat.

### 4.3 Absensi

- Status: belum absen, hadir, terlambat, izin, sakit, dan alpa.
- Anggota wajib mengambil foto langsung dari kamera dalam alur absensi; pilihan unggah galeri tidak disediakan.
- Anggota wajib mengizinkan pengambilan lokasi perangkat saat absen. Tidak ada pelacakan lokasi terus-menerus.
- Foto menampilkan timestamp tanggal, jam, zona waktu, serta koordinat. Data waktu, koordinat, akurasi lokasi, dan jarak juga disimpan terpisah agar dapat diperiksa.
- Waktu penerimaan server menjadi acuan status, bukan jam yang diatur pada perangkat siswa. Foto diberi timestamp berdasarkan waktu penerimaan tersebut.
- Server memvalidasi keanggotaan, sesi aktif, foto tersedia, lokasi tersedia, jarak dalam radius, waktu sesi, dan ketiadaan absensi ganda sebelum menerima absensi.
- Waktu penerimaan dari jam buka sampai batas tepat waktu (inklusif) menghasilkan hadir; setelah batas tepat waktu sampai jam tutup (inklusif) menghasilkan terlambat. Di luar jendela waktu ditolak.
- Jarak sama dengan atau kurang dari radius diterima. Di luar radius ditolak. Lokasi diambil ulang pada alur pengiriman, bukan memakai koordinat dari absensi sebelumnya.
- Absensi yang lolos validasi langsung tercatat dan menambah poin kehadiran tanpa pengesahan pelatih atau menunggu nilai keaktifan/keterampilan.
- Foto/lokasi tidak tersedia, izin ditolak, atau pengiriman gagal: absensi tidak dicatat berhasil; tampilkan penyebab dan tindakan coba lagi. Foto dan lokasi wajib tidak dapat dilewati.
- Setelah sesi berakhir, anggota yang belum absen dan tidak berstatus izin/sakit menjadi alpa. Pelatih mengelola izin/sakit dan koreksi dengan alasan tercatat.
- Satu anggota hanya memiliki satu absensi per latihan.
- Izin, sakit, dan alpa tidak mendapat poin latihan. Poin yang sudah diperoleh tidak dikurangi.
- Foto dan lokasi hanya dapat dibaca pelatih dan anggota bersangkutan; tidak disertakan dalam ranking atau ekspor umum.
- Foto dan lokasi merupakan bukti pendukung. MVP tidak mencakup pengenalan wajah atau jaminan deteksi pemalsuan lokasi.

### 4.4 Pengaturan poin

Pelatih menetapkan:

| Pengaturan | Fungsi |
|---|---|
| Poin hadir | Poin otomatis untuk hadir tepat waktu |
| Poin terlambat | Poin otomatis untuk terlambat |
| Maksimum keaktifan | Batas penilaian keterlibatan dan kerja sama |
| Maksimum keterampilan | Batas penilaian penguasaan materi latihan Paskibra |

Pelatih mengisi keaktifan dan keterampilan dalam rentang nol sampai maksimum yang ditetapkan. Kosong berarti belum dinilai, bukan nol. Prestasi lomba dicatat terpisah dan tidak menambah ranking MVP.

Konfigurasi disimpan per bulan. Setelah digunakan, perubahan besaran poin dijadwalkan untuk bulan berikutnya dan tidak menghitung ulang bulan sebelumnya. Besaran poin wajib ditetapkan sebelum penilaian pertama.

### 4.5 Perhitungan

Poin latihan = poin absensi + poin keaktifan + poin keterampilan.

Poin absensi masuk segera setelah absensi valid. Poin keaktifan/keterampilan ditambahkan setelah pelatih menyimpan penilaian. Nilai yang belum diisi ditandai belum lengkap; total berjalan hanya menjumlahkan komponen yang sudah tercatat dan bukan berarti komponen kosong bernilai nol. Kelengkapan wajib diperiksa sebelum pengesahan bulanan.

Poin bulanan = jumlah poin latihan sah dengan tanggal latihan dalam bulan tersebut.

Total poin sepanjang masa = jumlah poin latihan sah lintas bulan.

Tidak ada konversi ke nilai rapor, bobot persentase terpisah, atau ambang kehadiran 70% dari draf awal. Besaran poin komponen menentukan kontribusinya terhadap total.

Contoh ilustratif, bukan nilai bawaan: pelatih menetapkan hadir 10, terlambat 7, keaktifan maksimal 5, keterampilan maksimal 5. Anggota hadir dengan keaktifan 4 dan keterampilan 3 mendapat 17 poin.

### 4.6 Ranking bulanan

- Diurutkan berdasarkan total poin bulan yang dipilih, dari terbesar.
- Nama, kelas, poin, dan posisi ditampilkan kepada anggota.
- Poin sama memperoleh posisi sama, dengan urutan 1, 2, 2, 4.
- Ranking sebelum pengesahan berlabel sementara.
- Bulan baru memiliki perhitungan tersendiri dari nol; riwayat bulan lama tidak dihapus.
- Total sepanjang masa merupakan riwayat pencapaian dan tidak menentukan pemenang bulanan.

### 4.7 Penghargaan dan pengesahan

Alur bulan: berjalan → menunggu pengesahan → disahkan.

- Sistem menghitung calon pemenang dari ranking.
- Pelatih memeriksa absensi dan penilaian yang belum lengkap.
- Pelatih memilih Sahkan hasil bulanan setelah bulan berakhir dan data lengkap.
- Anggota dengan poin tertinggi memperoleh gelar Anggota Terbaik Bulan [nama bulan dan tahun].
- Jika poin tertinggi sama, semua anggota tersebut menjadi pemenang bersama.
- Riwayat pemenang dapat dilihat kembali. Hadiah fisik dikelola di luar aplikasi.

### 4.8 Koreksi

- Pelatih dapat memperbaiki absensi atau nilai dengan alasan yang tercatat.
- Koreksi menjadi hadir/terlambat harus tetap memiliki bukti foto kamera dan lokasi dari pengiriman absensi yang valid; pelatih tidak dapat membuat kehadiran tanpa bukti wajib. Bukti asli dipertahankan dan tidak ditimpa koreksi.
- Bulan disahkan harus dibuka kembali sebelum dikoreksi.
- Pembukaan kembali mengubah hasil menjadi menunggu pengesahan ulang.
- Perhitungan poin, total sepanjang masa, ranking, dan calon pemenang diperbarui.
- Pelatih mengesahkan ulang hasil; riwayat pengesahan dan pemenang sebelumnya tetap dapat ditelusuri oleh pelatih.
- Koreksi data tidak mengubah aturan poin historis.

### 4.9 Laporan

- Rekap bulanan berisi jumlah hadir, terlambat, izin, sakit, alpa, poin per komponen, total, ranking, dan pemenang.
- Pelatih dapat membuka rincian per anggota dan latihan.
- Ekspor CSV dan tampilan cetak untuk disimpan sebagai PDF.
- Laporan mencantumkan periode, waktu pembuatan, dan status sementara/disahkan.

## 5. Halaman

| Halaman | Kebutuhan utama |
|---|---|
| Login | Masuk akun pelatih atau anggota |
| Dashboard pelatih | Latihan, data belum lengkap, ringkasan bulan, calon pemenang |
| Anggota | Tambah, impor, ubah, nonaktifkan, kelola akun |
| Latihan dan absensi pelatih | Atur radius dan waktu sesi, pantau absensi otomatis, lihat bukti dan riwayat koreksi |
| Absen siswa | Pilih sesi, ambil foto kamera, ambil lokasi, lihat jarak, kirim, lihat status dan poin |
| Penilaian | Isi keaktifan dan keterampilan, lihat batas poin |
| Pengaturan poin | Aturan bulan berjalan dan aturan bulan berikutnya |
| Ranking | Pilih bulan, lihat posisi dan status pengesahan |
| Dashboard anggota | Poin pribadi, rincian absensi/nilai sendiri, posisi bulanan |
| Penghargaan | Pemenang dan riwayat bulanan |
| Laporan | Rekap, ekspor, cetak |

## 6. Model data

- Akun: identitas login, peran, status.
- Anggota: nomor induk, nama, kelas, tanggal keanggotaan.
- Latihan: tanggal, waktu, zona waktu, lokasi pusat, radius, jam buka, batas tepat waktu, jam tutup, materi, status, versi konfigurasi.
- Absensi: anggota, latihan, status, foto bertimestamp, waktu penerimaan server, koordinat, akurasi lokasi, jarak ke titik latihan, hasil validasi, versi konfigurasi sesi.
- Aturan poin bulanan: periode, poin status, batas komponen.
- Penilaian latihan: anggota, latihan, nilai komponen, pencatat, status finalisasi.
- Hasil bulanan: periode, poin anggota, ranking, status dan versi pengesahan.
- Penghargaan: periode, penerima, versi hasil.
- Prestasi: anggota, kegiatan, tanggal, keterangan; tanpa pengaruh poin.
- Riwayat perubahan: pelaku, waktu, alasan, nilai sebelum/sesudah.

## 7. Kebutuhan kualitas

- Web responsif, dapat digunakan di browser HP dan komputer.
- Pemeriksaan hak akses berlaku di server untuk setiap pembacaan dan perubahan data.
- Kata sandi disimpan menggunakan hash; pelatih tidak dapat melihat kata sandi siswa.
- Klik simpan berulang tidak membuat absensi atau poin ganda.
- Penyimpanan gagal menampilkan pesan jelas dan mempertahankan isian untuk dicoba kembali.
- Perubahan nilai memperbarui data turunan secara konsisten.
- Pencadangan rutin serta prosedur pemulihan diuji sebelum penggunaan sekolah.

## 8. Default operasional

Detail berikut melengkapi keputusan wawancara sebagai default implementasi. Besaran poin, radius, jam sesi, dan zona waktu diisi pelatih saat penyiapan; dokumen tidak menetapkan angka tetap untuk pengaturan tersebut.

1. Poin berupa bilangan bulat nonnegatif. Poin terlambat tidak melebihi poin hadir; poin hadir lebih besar daripada maksimum masing-masing komponen lain agar kehadiran menjadi komponen terbesar.
2. Keaktifan dan keterampilan dinilai untuk anggota hadir/terlambat. Anggota izin, sakit, atau alpa mendapat nol untuk latihan tersebut.
3. Poin kehadiran otomatis langsung masuk ranking sementara; komponen penilaian menyusul setelah diisi pelatih. Dashboard pelatih menandai penilaian belum lengkap dan menghalangi pengesahan bulanan sampai lengkap.
4. Periode berdasarkan bulan kalender dan tanggal latihan dalam zona waktu sekolah, bukan tanggal nilai dimasukkan. Zona waktu dipilih pelatih saat penyiapan.
5. Jika tidak ada latihan sah atau semua anggota mendapat nol, tidak ada pemenang bulan itu. Pelatih dapat menutup bulan dengan keterangan tidak ada penghargaan.
6. Anggota yang bergabung di tengah bulan mendapat poin sejak bergabung tanpa tambahan kompensasi. Riwayat anggota yang keluar tetap ada; poin sahnya tetap tercakup pada bulan terkait.
7. MVP memerlukan koneksi internet. QR, aplikasi Android/iOS khusus, pengajuan izin siswa, dan notifikasi otomatis berada di luar cakupan.

## 9. Kriteria penerimaan

- Pelatih dapat membuat akun dan mengimpor anggota; duplikasi nomor induk ditolak.
- Anggota dapat mengirim absensi sendiri tetapi tidak dapat memberi nilai, mengubah absensi yang sudah diterima, atau membaca rincian pribadi anggota lain.
- Tanpa foto kamera atau lokasi, pengiriman ditolak dan tidak menambah poin.
- Lokasi dalam radius dan waktu sesi valid menghasilkan absensi otomatis tanpa persetujuan pelatih.
- Jarak tepat pada radius diterima; jarak lebih besar ditolak. Waktu sebelum buka atau setelah tutup ditolak; tepat pada batas tepat waktu berstatus hadir, setelahnya terlambat.
- Timestamp foto sesuai waktu penerimaan yang tersimpan beserta zona waktu dan koordinat. Perubahan jam perangkat tidak mengubah penentuan status oleh server.
- Klik kirim ulang dan percobaan absensi kedua tidak menghasilkan absensi atau poin ganda.
- Gagal unggah foto tidak meninggalkan absensi sukses atau poin; anggota dapat mencoba ulang selama sesi masih dibuka.
- Besaran poin dapat diatur pelatih; nilai melebihi batas ditolak dan nilai kosong dibedakan dari nol.
- Dengan contoh 10 + 4 + 3, poin latihan adalah 17.
- Izin/sakit/alpa tidak menambah poin latihan dan tidak mengurangi poin terdahulu.
- Latihan batal tidak masuk ranking. Absensi valid langsung menambah poin walaupun keaktifan/keterampilan belum dinilai; hasil bulanan tetap belum dapat disahkan jika penilaian belum lengkap.
- Poin latihan Januari yang dimasukkan Februari tetap masuk Januari; bulan disahkan harus dibuka kembali untuk perubahan.
- Perubahan konfigurasi Februari tidak memengaruhi poin Januari.
- Anggota dengan poin 50, 40, 40, 20 memperoleh ranking 1, 2, 2, 4; dua anggota dengan poin tertinggi sama menjadi pemenang bersama.
- Bulan baru menampilkan poin bulan tersebut dari nol tanpa menghapus total sepanjang masa.
- Data belum lengkap menghalangi pengesahan bulanan.
- Koreksi hasil disahkan memerlukan alasan dan pengesahan ulang, serta memperbarui poin dan pemenang dengan jejak perubahan.
- Bulan tanpa poin positif tidak menghasilkan pemenang.
- Ekspor sesuai data periode yang dipilih dan mencantumkan status hasil.

## 10. Batas pengembangan

MVP tidak mencakup nilai rapor, banyak sekolah, banyak ekstrakurikuler, absensi QR, akun orang tua, hadiah otomatis, sertifikat otomatis, poin negatif, dan integrasi sistem sekolah. Dokumen ini menyelesaikan tahap PRD beserta pilihan arsitektur awal; pengembangan aplikasi merupakan tahap berikutnya.

## 11. Tech stack dan arsitektur awal

### 11.1 Pilihan teknologi

Pengguna belum memiliki preferensi teknologi atau hosting dan menyerahkan pemilihan awal. Stack yang dipilih untuk MVP:

| Bagian | Teknologi | Penggunaan |
|---|---|---|
| Aplikasi web | Next.js App Router, React, TypeScript | Halaman pelatih dan anggota dalam satu proyek |
| Tampilan | Tailwind CSS | Tata letak responsif untuk HP dan komputer |
| API aplikasi | Next.js Route Handlers, runtime Node.js | Validasi absensi, perubahan nilai, pengelolaan akun, ekspor |
| Database | PostgreSQL melalui Supabase | Anggota, sesi, absensi, poin, ranking, dan audit |
| Autentikasi | Supabase Auth | Akun dan sesi login; pendaftaran publik dinonaktifkan |
| Penyimpanan foto | Supabase Storage dengan bucket privat | Bukti absensi yang hanya dapat diakses pihak berhak |
| Kamera dan lokasi | Browser MediaDevices dan Geolocation API | Foto kamera dan lokasi saat pengiriman |
| Timestamp foto | Sharp pada server | Menambahkan waktu server dan koordinat pada gambar |
| Validasi input | Zod | Validasi payload dan konfigurasi pelatih di server |
| Pengujian | Vitest dan Playwright | Uji perhitungan, hak akses, serta alur absensi |
| Hosting awal | Vercel untuk Next.js; Supabase untuk data | Mengurangi pekerjaan administrasi server pada MVP |

Versi stabil yang kompatibel ditetapkan dan dikunci dalam lockfile saat implementasi. Pemilihan layanan ini tidak berarti akun, langganan, atau deployment sudah dibuat.

Next.js menyediakan Route Handlers untuk endpoint server dalam proyek aplikasi. Supabase menyediakan PostgreSQL dan kebijakan akses per baris untuk membatasi data berdasarkan pengguna. Sumber: [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Supabase PostgreSQL](https://supabase.com/docs/guides/database/overview), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 11.2 Alur teknis absensi

1. Anggota login dan membuka sesi. Server menerbitkan token pengiriman singkat yang terikat ke anggota dan latihan untuk mencegah penggunaan ulang permintaan yang sama.
2. Browser mengambil foto kamera dan lokasi terbaru. Foto dikompresi menjadi JPEG dengan batas unggahan 2 MB; server memeriksa ukuran, format aktual, dan kemampuan dekode gambar.
3. Browser mengirim foto, lokasi, akurasi lokasi, identitas sesi, dan token melalui HTTPS. Anggota tidak mengirim nilai poin atau status hadir yang dipercaya server.
4. Server mencatat waktu penerimaan, memeriksa pengguna, token, keanggotaan, jam sesi, dan jarak koordinat terhadap pusat latihan menggunakan perhitungan Haversine.
5. Server menambahkan timestamp waktu penerimaan beserta zona waktu dan koordinat melalui Sharp, lalu menyimpan bukti ke bucket privat dengan identitas objek unik.
6. Transaksi database membuat absensi dan poin kehadiran tepat satu kali. Kendala unik pada pasangan anggota dan latihan mencegah duplikasi; validasi status sesi diperiksa kembali saat transaksi.
7. Jika penyimpanan bukti atau transaksi gagal, permintaan tidak dianggap berhasil. Objek yang terunggah tanpa catatan absensi dibersihkan; retry tidak menambah poin kedua kali.
8. Respons sukses menampilkan status hadir/terlambat, waktu, dan poin; ranking sementara mengambil hasil terbaru.

Foto dikirim sebagai multipart, bukan base64. Batas 2 MB dipilih agar payload beserta metadata berada di bawah batas request Vercel Functions yang saat pemeriksaan dokumentasi adalah 4,5 MB. Batas provider harus diperiksa lagi saat deployment. Sumber: [Vercel Functions Limits](https://vercel.com/docs/functions/limitations).

### 11.3 Login, hak akses, dan bukti

- Login awal menggunakan email dan kata sandi. Pelatih membuat akun melalui endpoint admin; email menjadi data akun wajib. Kebutuhan login khusus NIS dapat ditinjau sebelum implementasi apabila anggota tidak memiliki email.
- Peran pelatih disimpan dalam data yang hanya dapat diubah server; anggota tidak dapat mempromosikan peran sendiri.
- Terapkan RLS pada tabel privat dan kebijakan Storage. Endpoint ranking hanya mengembalikan nama, kelas, posisi, dan total poin, tanpa membuka tabel absensi pribadi.
- Kunci administratif Supabase hanya tersedia di server. Semua endpoint administratif tetap memeriksa peran sebelum memakai akses tersebut.
- Foto diberikan melalui URL bertanda tangan dengan masa berlaku singkat setelah pemeriksaan hak akses; bucket tidak dibuka untuk publik. Sumber: [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control).
- Kamera dan lokasi digunakan melalui HTTPS di produksi. Izin ditolak atau perangkat tidak mendukung menghasilkan pesan yang dapat ditindaklanjuti, tanpa opsi melewati bukti wajib.
- Browser tidak menjamin keaslian koordinat maupun identitas orang dalam foto. Validasi radius memeriksa koordinat yang diterima; MVP tidak mengklaim perlindungan penuh terhadap GPS palsu, kamera virtual, atau perangkat yang dimodifikasi.

### 11.4 Poin dan konsistensi data

- Simpan perolehan poin per sumber, bukan total yang bebas diedit. Poin absensi dan penilaian memiliki identitas sumber unik.
- Gunakan transaksi untuk koreksi absensi, poin, dan audit agar tidak ada hasil sebagian.
- Ranking dihitung dengan agregasi PostgreSQL dan RANK berdasarkan poin bulanan. Tidak memerlukan Redis atau layanan ranking terpisah pada MVP.
- Pengesahan bulanan menyimpan versi hasil dan penerima penghargaan dalam transaksi; pembukaan kembali mempertahankan versi historis.
- Periode disimpan eksplisit sesuai zona waktu sekolah. Timestamp disimpan dalam UTC dan ditampilkan dalam zona waktu sekolah.

### 11.5 Operasional dan pengujian

- Pisahkan lingkungan pengembangan/uji dan produksi; jangan memakai foto siswa asli untuk pengujian otomatis.
- Uji unit mencakup batas waktu, radius, perhitungan poin, ikatan ranking, dan pergantian bulan. Uji integrasi mencakup transaksi, retry, RLS, serta koreksi hasil.
- Uji alur browser menggunakan kamera/lokasi simulasi, lalu uji perangkat Android dan iPhone nyata sebelum peluncuran untuk memeriksa izin dan unggahan.
- Log mencatat identitas permintaan dan alasan gagal tanpa mencetak kata sandi, token, foto, atau koordinat siswa.
- Cadangkan database dan objek foto secara terpisah; uji pemulihan keduanya. Tentukan masa simpan bukti dan jadwal penghapusan sebelum penggunaan data siswa nyata.
- Kebutuhan biaya meliputi hosting, database, penyimpanan/transfer foto, domain, serta email akun. Paket dan biaya ditentukan setelah jumlah anggota, frekuensi latihan, dan masa simpan foto diketahui; PRD tidak menjanjikan operasi produksi gratis.

Perkiraan penyimpanan: jumlah anggota × latihan per bulan × rata-rata ukuran foto × bulan penyimpanan. Contoh perencanaan: 100 anggota × 8 latihan × 0,5 MB × 12 bulan ≈ 4,8 GB, belum termasuk cadangan dan pertumbuhan.
