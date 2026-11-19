// Giriş, kayıt ve şifre sayfalarının düzeni (kart 0237; Canlı Çarşı taslağı siparis-ve-hesap.html): sayfa yolu, formun
// kartı ve isteğe bağlı yan kart (hesabın yararları). Telefonda yan kart formun altındadır, tablette ve masaüstünde
// yanındadır. Formların davranışı kartlar 0033 ve 0034'tedir, burada yalnız yerleşim vardır.
import type { ReactNode } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { vitrinAdresleri } from "../adresler";

export function GirisDuzeni({
  baslik,
  adres,
  yan,
  children,
}: {
  baslik: string;
  // Sayfanın kendi adresi (sayfa yolunun son adımı).
  adres: string;
  yan?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: baslik, adres },
        ]}
      />
      <div
        className={sinif(
          "grid grid-cols-1 items-start gap-4 tablet:gap-6",
          yan === undefined ? "mx-auto w-full max-w-form" : "tablet:grid-cols-2",
        )}
      >
        <Kart className="flex flex-col gap-4 p-5 tablet:p-6">
          <SayfaBasligi baslik={baslik} />
          {children}
        </Kart>
        {yan}
      </div>
    </main>
  );
}

// Hesabın yararları (taslak): yalnız bugün gerçekten olan işler yazılır. Sipariş takibi ve iade talebi kartlar 0238 ve
// 0239 ile eklenir.
const yararlar: readonly MetinAnahtari[] = [
  "vitrin.hesap.yararlar.adres",
  "vitrin.hesap.yararlar.favori",
];

export function HesapYararlari({
  baslik,
  kayitAdresi,
}: {
  baslik: string;
  // Giriş sayfasında "Hesap oluştur" bağlantısı (dönüş adresini taşır); kayıt sayfasında yoktur.
  kayitAdresi?: string;
}) {
  return (
    <Kart className="flex flex-col gap-4 bg-yuzey p-5 tablet:p-6">
      <h2 className="font-baslik text-buyuk font-baslik-kalinligi">{baslik}</h2>
      <ul className="flex flex-col gap-2">
        {yararlar.map((anahtar) => (
          <li key={anahtar} className="flex items-start gap-2">
            <Ikon ad="onay" className="mt-1 text-basari-yazi" />
            {metin(anahtar)}
          </li>
        ))}
      </ul>
      {kayitAdresi === undefined ? null : (
        <Baglanti href={kayitAdresi} gorunum="cerceveli" className="self-start">
          {metin("vitrin.hesap.yararlar.hesapOlustur")}
        </Baglanti>
      )}
    </Kart>
  );
}
