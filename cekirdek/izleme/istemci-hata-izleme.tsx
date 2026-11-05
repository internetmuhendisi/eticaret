"use client";
// Hata izleme aracının tarayıcıda bağlanması (kart 0022, karar 0036). Kök düzen bu parçayı
// sitenin hata izleme bilgisiyle bir kez çizer; ekranda bir şey göstermez. Bağlanınca:
// - bölüm sınırının, sayfa ve kök hata ekranının yakaladığı hatalar (istemciHatasiniKaydet),
// - hiçbir sınırın yakalamadığı tarayıcı hataları ve karşılanmamış söz (Promise) hataları
// araca gider. Yalnız sayfanın yolu bağlam olarak eklenir; adresin sorgu kısmı (doğrulama
// bağlantısındaki anahtar gibi) eklenmez. Gönderilen her şey maskelenir (hata-izleme-araci.ts).
import { useEffect } from "react";
import { type HataIzlemeBilgisi, hataIzlemeAraciKur } from "./hata-izleme-araci";
import { istemciHataIzlemeAraciniBagla, istemciHatasiniKaydet } from "./istemci-hata-katmani";

// Bir sayfa açılışında araca giden en çok olay: döngüye giren bir hata ziyaretçinin
// bağlantısını doldurmaz.
const sayfaBasinaEnCokOlay = 10;

export function HataIzlemeBaglantisi({ bilgi }: { bilgi: HataIzlemeBilgisi }) {
  useEffect(() => {
    const gonder = hataIzlemeAraciKur(bilgi, {
      kaynak: "tarayici",
      enCokOlay: sayfaBasinaEnCokOlay,
    });
    if (gonder === undefined) return;
    istemciHataIzlemeAraciniBagla((hata) =>
      gonder(hata, { yol: window.location.pathname }, "hata"),
    );
    const hataOlayi = (olay: ErrorEvent) => istemciHatasiniKaydet(olay.error ?? olay.message);
    const sozHatasi = (olay: PromiseRejectionEvent) => istemciHatasiniKaydet(olay.reason);
    window.addEventListener("error", hataOlayi);
    window.addEventListener("unhandledrejection", sozHatasi);
    return () => {
      window.removeEventListener("error", hataOlayi);
      window.removeEventListener("unhandledrejection", sozHatasi);
      istemciHataIzlemeAraciniBagla(undefined);
    };
  }, [bilgi]);
  return null;
}
