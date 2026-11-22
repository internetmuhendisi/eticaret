// Tarayıcıdan kapıya giden her istek (kart 0065, karar 0139). Kapının zarflı yanıtları önbelleğe alınmaz
// (`no-store`): tarayıcı böyle bir yanıtın gövdesini kendiliğinden indirmez, okunmayan gövde (ör. yalnız
// durum koduna bakılan 401) isteği hiç bitmemiş bırakır ve bağlantıyı tutar. Bu işlev gövdeyi her zaman
// sonuna kadar okur; dönen yanıt aynı durum, başlık ve gövdeyi taşır. Doğrudan `fetch` denetimde hatadır.

const govdesizDurumlar = new Set([101, 204, 205, 304]);

export const kapiyaIstek = async (adres: string, istek?: RequestInit): Promise<Response> => {
  const yanit = await fetch(adres, istek);
  const govde = await yanit.arrayBuffer();
  return new Response(govdesizDurumlar.has(yanit.status) ? null : govde, {
    status: yanit.status,
    statusText: yanit.statusText,
    headers: yanit.headers,
  });
};

// Dosya yükleme (kart 0094, karar 0165): gövde dosyanın kendisidir. fetch yüklemenin ilerlemesini vermez; yükleme
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
