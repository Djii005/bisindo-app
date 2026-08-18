TUTORIAL MENYALAKAN SERVER DAN FRONTEND BISINDO
================================================

1. Persiapan awal
-----------------
- Pastikan Node.js dan npm sudah terinstall.
- Buka terminal di folder project:
  C:\Users\Adji\Documents\Moneymaking\projectbisindo_test

2. Install dependency frontend
------------------------------
Jalankan perintah ini di root project:

npm install

3. Install dependency backend
-----------------------------
Masuk ke folder server:

cd server
npm install

Setelah selesai, kembali ke root project:

cd ..

4. Jalankan backend server
--------------------------
Buka terminal pertama, lalu jalankan:

cd C:\Users\Adji\Documents\Moneymaking\projectbisindo_test\server
npm run dev

Backend akan berjalan di:
http://localhost:3001

5. Jalankan frontend
--------------------
Buka terminal kedua, lalu jalankan:

cd C:\Users\Adji\Documents\Moneymaking\projectbisindo_test
npm run dev

Frontend akan berjalan di:
http://localhost:5173

6. Buka website
---------------
Gunakan browser dan buka:

http://localhost:5173

Penting:
- Gunakan localhost, jangan 127.0.0.1
- Backend proyek ini mengizinkan origin http://localhost:5173

7. Jika fitur AI / halaman latihan belum jalan
----------------------------------------------
Kalau model ML belum muncul atau aset AI belum siap, jalankan:

cd C:\Users\Adji\Documents\Moneymaking\projectbisindo_test
npm run ml:export:web

Perintah ini akan menyiapkan file model browser ke folder public\ml-model.

8. Urutan paling aman saat menyalakan project
---------------------------------------------
1. Nyalakan backend dulu
2. Nyalakan frontend
3. Buka http://localhost:5173
4. Login / register
5. Masuk ke halaman Latihan

9. Jika terjadi error
---------------------
- Jika frontend tidak bisa login atau register:
  cek apakah backend di port 3001 masih hidup

- Jika halaman latihan error:
  jalankan lagi npm run ml:export:web

- Jika port 5173 atau 3001 sudah dipakai aplikasi lain:
  matikan aplikasi yang memakai port tersebut, lalu jalankan ulang

10. Cara mematikan project
--------------------------
Di masing-masing terminal, tekan:

Ctrl + C

Selesai.
