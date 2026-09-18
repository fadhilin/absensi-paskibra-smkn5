"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading">
      <h1>Halaman gagal dimuat</h1>
      <p>Coba muat ulang. Data yang tersimpan tetap tersedia.</p>
      <button onClick={reset}>Coba lagi</button>
    </main>
  );
}
