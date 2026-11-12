"use client";
// Favori düğmesi ve favori sayısı (kart 0140, karar 0110; Canlı Çarşı taslağı). Ürün kartı, ürün sayfası ve üst
// kısım bunları kullanır; durum tek yerdendir (favori-durumu.ts).
//
// - Düğme basılı/basılı değil durumunu ekran okuyucuya söyler (aria-pressed); adı da duruma göre "Favorilere
//   ekle" ya da "Favorilerden çıkar"dır ve ürünün adını taşır (taslak). Basılıyken kalp dolu ve indirim
//   rengindedir.
// - Sonuç bildirimle verilir. Favoriler sayfasında çıkarılan ürünün bildiriminde "Geri al" vardır (kullanıcı
//   kararı): ürün listedeki eski yerine döner.
import { createContext, useContext, useEffect } from "react";
import { BildirimAlani, bildirimGoster } from "../../bilesenler/parcalar/bildirim";
import { IkonDugmesi } from "../../bilesenler/parcalar/dugme";
import { sinif } from "../../bilesenler/parcalar/sinif";
import { useMetin } from "../metinler/istemci-metni";
import { doldur } from "../moduller/eposta/sablon";
import { kimligiDuzelt } from "../veritabani/kimlik";
import {
  type FavoriSonucu,
  favoriDegistir,
  sigmayanGosterildi,
  useFavoriAyarlari,
  useFavoriler,
} from "./favori-durumu";

// Düğmenin ürününü taşıyan öznitelik: favoriler sayfası çıkarılan kartın yerine odağı bununla taşır.
export const favoriUrunIsareti = "data-favori-urun";

// Favoriler sayfasının listesi bunu açar: çıkarılan ürün geri alınabilir.
export const FavoriSayfasiBaglami = createContext(false);

export function FavoriDugmesi({
  urun,
  urunAdi,
  tur = "sade",
  className,
}: {
  urun: string;
  urunAdi: string;
  tur?: "sade" | "cerceveli";
  className?: string;
}) {
  const metin = useMetin();
  const ayarlar = useFavoriAyarlari();
  const durum = useFavoriler();
  const sayfada = useContext(FavoriSayfasiBaglami);
  const kimlik = kimligiDuzelt(urun);
  const favoride = durum.tur === "hazir" && durum.urunler.includes(kimlik);

  const bildir = (sonuc: FavoriSonucu, eskiSira: number) => {
    const ad = { urun: urunAdi };
    if (sonuc === "eklendi") bildirimGoster("basari", doldur(metin("vitrin.favori.eklendi"), ad));
    else if (sonuc === "cikarildi") {
      bildirimGoster(
        "bilgi",
        doldur(metin("vitrin.favori.cikarildi"), ad),
        sayfada
          ? {
              etiket: metin("vitrin.favori.geriAl"),
              tikla: () => {
                void favoriDegistir(ayarlar, kimlik, true, eskiSira).then((geri) => {
                  if (geri !== "eklendi") bildir(geri, eskiSira);
                });
              },
            }
          : undefined,
      );
    } else if (sonuc === "sinir") {
      bildirimGoster(
        "uyari",
        doldur(metin("vitrin.favori.sinir"), { sinir: String(ayarlar.sinir) }),
      );
    } else if (sonuc === "urun-yok") bildirimGoster("uyari", metin("vitrin.favori.urunYok"));
    else bildirimGoster("tehlike", metin("vitrin.favori.hata"));
  };

  return (
    <IkonDugmesi
      ikon="favori"
      etiket={doldur(
        metin(favoride ? "vitrin.urunKarti.favoridenCikar" : "vitrin.urunKarti.favoriyeEkle"),
        { urun: urunAdi },
      )}
      tur={tur}
      aria-pressed={favoride}
      {...{ [favoriUrunIsareti]: kimlik }}
      className={sinif("aria-pressed:text-indirim aria-pressed:*:fill-current", className)}
      onClick={() => {
        const eskiSira = durum.tur === "hazir" ? durum.urunler.indexOf(kimlik) : -1;
        void favoriDegistir(ayarlar, kimlik, !favoride).then((sonuc) => bildir(sonuc, eskiSira));
      }}
    />
  );
}

// Üst kısımdaki favori simgesinin sayısı: sıfırsa görünmez. Katalogun örnek kipinde bağlamın örnek sayısıdır.
export function FavoriSayisi({ ornekSayi, className }: { ornekSayi?: number; className: string }) {
  const metin = useMetin();
  const { kip } = useFavoriAyarlari();
  const durum = useFavoriler();
  const sayi =
    kip === "ornek" ? (ornekSayi ?? 0) : durum.tur === "hazir" ? durum.urunler.length : 0;
  if (sayi === 0) return null;
  return (
    <>
      <span className="sr-only">{doldur(metin("vitrin.favori.sayi"), { sayi: String(sayi) })}</span>
      <span aria-hidden="true" className={className}>
        {sayi}
      </span>
    </>
  );
}

// Vitrinin bildirim alanı ve birleşmede sınıra sığmayan favorilerin uyarısı (bir kez).
export function VitrinBildirimleri() {
  const metin = useMetin();
  const ayarlar = useFavoriAyarlari();
  const durum = useFavoriler();
  const sigmayan = durum.tur === "hazir" ? durum.sigmayan : 0;
  useEffect(() => {
    if (sigmayan === 0) return;
    bildirimGoster(
      "uyari",
      doldur(metin("vitrin.favori.sigmayan"), {
        sayi: String(sigmayan),
        sinir: String(ayarlar.sinir),
      }),
    );
    sigmayanGosterildi();
  }, [sigmayan, metin, ayarlar.sinir]);
  return (
    <BildirimAlani
      alanEtiketi={metin("ortak.parca.bildirimler")}
      kapatEtiketi={metin("ortak.parca.bildirimiKapat")}
    />
  );
}
