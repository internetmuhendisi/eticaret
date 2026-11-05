"use client";
// Hata izleme aracının tarayıcıda bağlanması (kart 0022, karar 0036). Kök düzen bu parçayı
// sitenin hata izleme bilgisiyle çizer; ekranda bir şey göstermez. Bağlanınca:
// - bölüm sınırının, sayfa ve kök hata ekranının yakaladığı hatalar (istemciHatasiniKaydet),
// - hiçbir sınırın yakalamadığı tarayıcı hataları ve karşılanmamış söz (Promise) hataları
// araca gider. Yalnız sayfanın yolu bağlam olarak eklenir; adresin sorgu kısmı (doğrulama
// bağlantısındaki anahtar gibi) eklenmez. Gönderilen her şey maskelenir (hata-izleme-araci.ts).
//
// Araç sayfanın ömrü boyunca bir kez bağlanır ve parça kaldırılınca çözülmez: kök düzen
// bozulunca Next.js onu (bu parçayla birlikte) kaldırıp kök hata ekranını çizer, o ekranın
// hatası da araca gitmelidir (bağımsız kontrol buldu: çözülseydi yalnız konsola yazılırdı). Sayfa başına
// sınır da böylece yeniden çizimle sıfırlanmaz.
import { useEffect } from "react";
import { type HataIzlemeBilgisi, hataIzlemeAraciKur } from "./hata-izleme-araci";
import { istemciHataIzlemeAraciniBagla, istemciHatasiniKaydet } from "./istemci-hata-katmani";

// Bir sayfa açılışında araca giden en çok olay: döngüye giren bir hata ziyaretçinin
// bağlantısını doldurmaz.
export const sayfaBasinaEnCokOlay = 10;

let bagli = false;
// Tarayıcı olaylarının dinleyicileri bir kez eklenir; hatayı o an bağlı olan araca verirler.
let dinleniyor = false;

const bagla = (bilgi: HataIzlemeBilgisi): void => {
  if (bagli) return;
  const gonder = hataIzlemeAraciKur(bilgi, {
    kaynak: "tarayici",
    enCokOlay: sayfaBasinaEnCokOlay,
  });
  if (gonder === undefined) return;
  bagli = true;
  istemciHataIzlemeAraciniBagla((hata) => gonder(hata, { yol: window.location.pathname }, "hata"));
  if (dinleniyor) return;
  dinleniyor = true;
  window.addEventListener("error", (olay) => istemciHatasiniKaydet(olay.error ?? olay.message));
  window.addEventListener("unhandledrejection", (olay) => istemciHatasiniKaydet(olay.reason));
};

// Testler her denemeden sonra bağlantıyı sıfırlar; uygulama bunu çağırmaz.
export const baglantiyiSifirla = (): void => {
  bagli = false;
  istemciHataIzlemeAraciniBagla(undefined);
};

export function HataIzlemeBaglantisi({ bilgi }: { bilgi: HataIzlemeBilgisi }) {
  useEffect(() => bagla(bilgi), [bilgi]);
  return null;
}
