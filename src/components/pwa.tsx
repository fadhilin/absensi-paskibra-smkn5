"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const PwaContext = createContext({
  installed: false,
  ios: false,
  available: false,
  install: async () => {},
  message: "",
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const detect = () =>
      setInstalled(
        display.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const connection = () => setOnline(navigator.onLine);
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
    };
    detect();
    connection();
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    display.addEventListener("change", detect);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    if (
      "serviceWorker" in navigator &&
      window.isSecureContext &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          setMessage(
            "Dukungan offline belum siap. Muat ulang saat koneksi stabil.",
          );
        });
    }
    return () => {
      display.removeEventListener("change", detect);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Permintaan instalasi diterima browser."
          : "Instalasi dibatalkan. Anda tetap dapat memakai aplikasi di browser.",
      );
    } catch {
      setMessage("Instalasi belum berhasil. Coba melalui menu browser.");
    } finally {
      setPrompt(null);
    }
  }
  return (
    <PwaContext.Provider
      value={{ installed, ios, available: !!prompt, install, message }}
    >
      {!online && (
        <div className="connection-notice" role="status">
          Anda sedang offline. Sambungkan internet sebelum mengirim absensi atau
          menyimpan perubahan.
        </div>
      )}
      {children}
    </PwaContext.Provider>
  );
}

export function InstallPanel() {
  const { installed, ios, available, install, message } =
    useContext(PwaContext);
  return (
    <section className="install-panel" aria-label="Pasang aplikasi">
      <strong>
        {installed ? "Paskibra sudah terpasang" : "Paskibra di layar utama"}
      </strong>
      {installed ? (
        <p>
          Buka langsung dari ikon Paskibra. Internet diperlukan untuk absensi
          dan data terbaru.
        </p>
      ) : available ? (
        <>
          <p>Pasang untuk membuka aplikasi langsung dari layar utama HP.</p>
          <button onClick={install} type="button">
            Pasang aplikasi
          </button>
        </>
      ) : (
        <p>
          {ios
            ? "Di Safari, buka menu Bagikan, lalu pilih Tambahkan ke Layar Utama."
            : "Buka menu browser, lalu pilih Instal aplikasi atau Tambahkan ke layar utama jika tersedia."}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
