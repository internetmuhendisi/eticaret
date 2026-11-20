"use client";
// Üst satırın Hesabım öğesi (kart 0131). Girişsiz müşteride ve durum bilinmezken sunucunun çizdiği bağlantıdır
// (giriş sayfası); girişli müşteride aynı görünüşte bir düğme, e-postayı, hesabın sayfalarını (kart 0237) ve
// "Çıkış yap"ı gösteren bir menü açar.
// Oturum ortak durumdan gelir (hesap-durumu.ts): sayfada tek istek gider. Tarayıcıda çizilir: menünün tetikleyicisi
// özelliklerini düğmeye ancak burada verebilir (vitrin kuralı, menu-dugmesi.tsx ile aynı).
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Ikon } from "../../../../bilesenler/ikonlar/ikon";
import {
  AcilirMenu,
  AcilirMenuAyraci,
  AcilirMenuBasligi,
  AcilirMenuIcerigi,
  AcilirMenuOgesi,
  AcilirMenuTetikleyici,
} from "../../../../bilesenler/parcalar/acilir-menu";
import { Dugme } from "../../../../bilesenler/parcalar/dugme";
import { Uyari } from "../../../../bilesenler/parcalar/uyari";
import { useMetin } from "../../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../../metinler/metin";
import { vitrinAdresleri } from "../../adresler";
import { cikisYap, useHesapDurumu } from "../../hesap-durumu";

// Menüdeki hesap sayfaları (Hesabım çerçevesinin menüsüyle aynı sıra).
const hesapSayfalari: readonly { adres: string; ad: MetinAnahtari }[] = [
  { adres: vitrinAdresleri.hesapSiparisleri, ad: "vitrin.hesap.siparisler.baslik" },
  { adres: vitrinAdresleri.hesapAdresleri, ad: "vitrin.hesap.adresler.baslik" },
  { adres: vitrinAdresleri.hesapFavorileri, ad: "vitrin.favori.baslik" },
  { adres: vitrinAdresleri.hesapBilgileri, ad: "vitrin.hesap.bilgiler.baslik" },
];

export function HesapMenusu({
  baglanti,
  etiket,
  className,
  sorulur,
}: {
  // Girişsiz ve bilinmeyen durumda görünen bağlantı (sunucuda çizilir).
  baglanti: ReactNode;
  etiket: string;
  // Bağlantıyla aynı sınıflar: düğme aynı yerde aynı görünüşte durur.
  className: string;
  // Bağlamın müşteri oturumu "sorulur" ise; katalogda istek gitmez.
  sorulur: boolean;
}) {
  const metin = useMetin();
  const durum = useHesapDurumu(sorulur);
  const [cikisHatasi, setCikisHatasi] = useState(false);
  if (durum.tur !== "girisli") return baglanti;
  return (
    <AcilirMenu onOpenChange={() => setCikisHatasi(false)}>
      <AcilirMenuTetikleyici asChild>
        <Dugme tur="sade" className={className}>
          <Ikon ad="hesap" className="size-5" />
          <span className="sr-only masaustu:not-sr-only">{etiket}</span>
        </Dugme>
      </AcilirMenuTetikleyici>
      <AcilirMenuIcerigi align="end" className="max-w-form">
        <AcilirMenuBasligi className="wrap-anywhere">{durum.eposta}</AcilirMenuBasligi>
        <AcilirMenuAyraci />
        {hesapSayfalari.map((sayfa) => (
          <AcilirMenuOgesi key={sayfa.adres} asChild>
            <Link href={sayfa.adres} className="no-underline">
              {metin(sayfa.ad)}
            </Link>
          </AcilirMenuOgesi>
        ))}
        <AcilirMenuAyraci />
        {cikisHatasi ? (
          <Uyari tur="tehlike" className="m-1">
            {metin("vitrin.hesap.cikisHata")}
          </Uyari>
        ) : null}
        <AcilirMenuOgesi
          onSelect={(olay) => {
            // Menü çıkış sürerken açık kalır: olmazsa uyarı menünün içinde görünür.
            olay.preventDefault();
            setCikisHatasi(false);
            void cikisYap().then((oldu) => setCikisHatasi(!oldu));
          }}
        >
          {metin("vitrin.hesap.cikis")}
        </AcilirMenuOgesi>
      </AcilirMenuIcerigi>
    </AcilirMenu>
  );
}
