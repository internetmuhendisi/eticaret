// Uygulamanın ortak hata katmanına bağlandığı yer (kart 0014, karar 0025).
// Açılışta sunucunun konsolu günlüğe, yakalanmamış süreç hataları ölümcül seviyeye bağlanır.
// Next.js'in sunucuda yakaladığı istek hataları (sayfa, sunucu bileşeni, sunucu eylemi) hata
// katmanına gider. Kapı uçlarının hatası uç tanımında yakalanır, buraya gelmez. İstek başlıkları
// kayda girmez; çerez ve oturum anahtarı taşırlar. Günlük süreç çıktısına yazar; yalnız Node.js
// çalışma ortamında vardır.
import type { Instrumentation } from "next";

const nodeOrtamiMi = () => {
  const { NEXT_RUNTIME: calismaOrtami } = process.env;
  return calismaOrtami === "nodejs";
};

export const register = async () => {
  if (!nodeOrtamiMi()) return;
  const { konsoluGunlugeBagla } = await import("../izleme/konsol");
  const { surecHatalariniBagla } = await import("../izleme/hata-katmani");
  konsoluGunlugeBagla();
  surecHatalariniBagla();
};

export const onRequestError: Instrumentation.onRequestError = async (hata, istek, baglam) => {
  if (!nodeOrtamiMi()) return;
  const { hatayiKaydet } = await import("../izleme/hata-katmani");
  hatayiKaydet(hata, {
    kaynak: "next",
    yontem: istek.method,
    yol: istek.path,
    rota: baglam.routePath,
    rotaTuru: baglam.routeType,
    ...(baglam.renderSource === undefined ? {} : { cizimKaynagi: baglam.renderSource }),
  });
};
