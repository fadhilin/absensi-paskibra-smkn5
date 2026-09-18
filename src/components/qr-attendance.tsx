"use client";
import { useEffect, useRef, useState } from "react";
import type { Attendance, Training } from "@/lib/types";

export type QrReceipt = { name: string; attendance: Attendance };
export function TrainingQr({
  session,
  timezone,
}: {
  session: Training;
  timezone: string;
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setBusy(true);
    setImage("");
    setError("");
    (async () => {
      try {
        const response = await fetch(
          `/api/attendance?session=${encodeURIComponent(session.id)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setImage(result.image);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "QR gagal dibuat.");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [session.id, session.version, session.closes_at, attempt]);
  const filename = `qr-latihan-${session.date}-${session.id}.png`;
  function download() {
    const link = document.createElement("a");
    link.href = image;
    link.download = filename;
    link.click();
  }
  async function share() {
    setError("");
    setMessage("");
    setSharing(true);
    try {
      const bytes = Uint8Array.from(atob(image.split(",")[1]), (c) =>
        c.charCodeAt(0),
      );
      const file = new File([bytes], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Absensi ${session.title}`,
          text: `Scan melalui menu Absensi aplikasi Paskibra untuk ${session.title}, ${session.date}.`,
        });
        setMessage("QR dibagikan melalui perangkat Anda.");
      } else {
        download();
        setMessage(
          "QR diunduh. Lampirkan gambar ini melalui WhatsApp atau aplikasi pesan Anda.",
        );
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(
          "QR belum berhasil dibagikan. Gunakan Unduh QR untuk mengirim gambar secara manual.",
        );
    } finally {
      setSharing(false);
    }
  }
  return (
    <div className="training-qr">
      <h3>{session.title}</h3>
      <p>
        {session.date} · {session.location}
      </p>
      {busy && <p role="status">Membuat QR latihan...</p>}
      {image && (
        <>
          <img
            className="training-qr-image"
            src={image}
            alt={`QR absensi ${session.title}`}
          />
          <p>
            Anggota masuk ke aplikasi, pilih latihan, lalu tekan{" "}
            <strong>Scan QR absensi</strong>.
          </p>
          <div className="actions">
            <button onClick={download}>Unduh QR</button>
            <button className="secondary" disabled={sharing} onClick={share}>
              {sharing ? "Membagikan..." : "Bagikan QR"}
            </button>
          </div>
        </>
      )}
      <small>
        Absensi dibuka{" "}
        {new Date(session.opens_at).toLocaleString("id-ID", {
          timeZone: timezone,
        })}{" "}
        sampai{" "}
        {new Date(session.closes_at).toLocaleString("id-ID", {
          timeZone: timezone,
        })}
        . QR berubah jika latihan diedit.
      </small>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!busy && !image && (
        <button className="secondary" onClick={() => setAttempt(attempt + 1)}>
          Coba buat QR lagi
        </button>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </div>
  );
}

export function QrScanner({
  session,
  timezone,
  onScan,
  onDone,
}: {
  session: Training;
  timezone: string;
  onScan(token: string): Promise<QrReceipt>;
  onDone(): void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(false);
  const generation = useRef(0);
  const [opening, setOpening] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<QrReceipt | null>(null);
  function stop() {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (alive.current) {
      setReady(false);
      setOpening(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    const visibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive.current = false;
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  async function start() {
    stop();
    const run = generation.current;
    setError("");
    setOpening(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Pemindai QR memerlukan HTTPS atau localhost.");
      const jsQR = (await import("jsqr")).default;
      const incoming = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (!alive.current || run !== generation.current) {
        incoming.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = incoming;
      if (!video.current) {
        stop();
        return;
      }
      video.current.srcObject = incoming;
      await video.current.play();
      if (!alive.current || run !== generation.current) return;
      setReady(true);
      setOpening(false);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Pemindai tidak didukung browser ini.");
      const read = () => {
        if (!alive.current || run !== generation.current) return;
        try {
          const frame = video.current;
          if (frame?.videoWidth && frame.readyState >= 2) {
            canvas.width = Math.min(960, frame.videoWidth);
            canvas.height = Math.round(
              (frame.videoHeight * canvas.width) / frame.videoWidth,
            );
            context.drawImage(frame, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            const decoded = jsQR(pixels.data, pixels.width, pixels.height, {
              inversionAttempts: "dontInvert",
            });
            if (decoded) {
              stop();
              setBusy(true);
              onScan(decoded.data)
                .then((result) => {
                  if (alive.current) setReceipt(result);
                })
                .catch((e) => {
                  if (alive.current)
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Absensi gagal disimpan. Coba scan ulang.",
                    );
                })
                .finally(() => {
                  if (alive.current) setBusy(false);
                });
              return;
            }
          }
          timer.current = setTimeout(read, 180);
        } catch {
          stop();
          setError(
            "QR belum bisa dibaca. Buka pemindai kembali dan arahkan ke kode pelatih.",
          );
        }
      };
      read();
    } catch (e) {
      if (alive.current && run === generation.current) {
        stop();
        setError(
          e instanceof DOMException
            ? "Kamera tidak dapat dibuka. Izinkan akses kamera lalu coba lagi."
            : e instanceof Error
              ? e.message
              : "Pemindai QR gagal dibuka.",
        );
      }
    } finally {
      if (alive.current && run === generation.current) setOpening(false);
    }
  }
  if (receipt)
    return (
      <div className="qr-receipt" role="status">
        <h3>Absensi berhasil tercatat</h3>
        <dl>
          <div>
            <dt>Nama</dt>
            <dd>{receipt.name}</dd>
          </div>
          <div>
            <dt>Latihan</dt>
            <dd>{session.title}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{receipt.attendance.status}</dd>
          </div>
          <div>
            <dt>Jam absensi</dt>
            <dd>
              {new Date(
                receipt.attendance.qr_checkin!.received_at,
              ).toLocaleString("id-ID", { timeZone: timezone, hour12: false })}
            </dd>
          </div>
        </dl>
        <button onClick={onDone}>Selesai</button>
      </div>
    );
  return (
    <div className="qr-scanner">
      <h3>{session.title}</h3>
      <p>
        Arahkan kamera ke QR yang diberikan pelatih. Absensi tercatat otomatis
        setelah QR valid terbaca.
      </p>
      <div className="qr-video">
        <video ref={video} playsInline muted />
        {!ready && (
          <span>{busy ? "Mencatat absensi..." : "Pemindai belum dibuka"}</span>
        )}
      </div>
      <div className="actions">
        <button onClick={start} disabled={opening || busy || ready}>
          {opening ? "Membuka pemindai..." : "Buka pemindai QR"}
        </button>
        {ready && (
          <button className="secondary" onClick={stop}>
            Hentikan pemindai
          </button>
        )}
      </div>
      <small>
        Kamera hanya membaca QR. Foto dan lokasi tidak dikirim. Jam absensi
        dicatat oleh server.
      </small>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
