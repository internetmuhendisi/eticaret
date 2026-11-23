// Tarayıcıdan kapıya dosya yükleme (kart 0094, karar 0165). Yalnız panel yükler: bu işlev vitrinin bütün formlarının
// kullandığı istemci.ts'ten ayrıdır, vitrinin tarayıcı koduna gitmez (kart 0295, karar 0172).
import { govdesizDurumlar } from "./istemci.ts";

// Gövde dosyanın kendisidir. fetch yüklemenin ilerlemesini vermez; yükleme
// XMLHttpRequest ile gider, ilerleme (0–1) bildirilir, sinyal iptal eder (AbortError ile reddedilir). Yanıt tam
// okunmuş olarak kapiyaIstek'inki gibi döner. Ağ hatası TypeError ile reddedilir.
export const kapiyaYukle = (
  adres: string,
  dosya: Blob,
  { ilerleme, sinyal }: { ilerleme?: (oran: number) => void; sinyal?: AbortSignal } = {},
): Promise<Response> =>
  new Promise((coz, reddet) => {
    const istek = new XMLHttpRequest();
    istek.open("POST", adres);
    istek.responseType = "arraybuffer";
    istek.setRequestHeader("content-type", "application/octet-stream");
    istek.upload.onprogress = (olay) => {
      if (olay.lengthComputable && olay.total > 0) ilerleme?.(olay.loaded / olay.total);
    };
    istek.onload = () => {
      const basliklar = new Headers();
      for (const satir of istek
        .getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/)) {
        const ayrac = satir.indexOf(":");
        if (ayrac > 0)
          basliklar.append(satir.slice(0, ayrac).trim(), satir.slice(ayrac + 1).trim());
      }
      coz(
        new Response(govdesizDurumlar.has(istek.status) ? null : (istek.response as ArrayBuffer), {
          status: istek.status,
          statusText: istek.statusText,
          headers: basliklar,
        }),
      );
    };
    istek.onerror = () => reddet(new TypeError("Ağ hatası"));
    istek.onabort = () => reddet(new DOMException("Yükleme iptal edildi", "AbortError"));
    if (sinyal?.aborted === true) {
      reddet(new DOMException("Yükleme iptal edildi", "AbortError"));
      return;
    }
    sinyal?.addEventListener("abort", () => istek.abort(), { once: true });
    istek.send(dosya);
  });
