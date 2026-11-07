"use client";
// Vitrinde müşterinin hesap alanı (kart 0033). Oturum uçtan sorulur: sayfa çizerken okunursa oturum kapanır
// (karar 0039). Cevap gelene kadar boş kalır: girişli müşteri bir an "Giriş yap" görmesin.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dugme } from "../../bilesenler/form/dugme";
import { Uyari } from "../../bilesenler/form/uyari";
import { useMetin } from "../metinler/istemci-metni";
import { vitrinAdresleri } from "./adresler";
import { stil } from "./stil";

const hesabimUcu = "/kapi/musteri/hesabim";
const cikisUcu = "/kapi/herkese-acik/musteri-cikis";

type Durum = { tur: "bilinmiyor" } | { tur: "girissiz" } | { tur: "girisli"; eposta: string };

export function HesapAlani() {
  const metin = useMetin();
  const [durum, setDurum] = useState<Durum>({ tur: "bilinmiyor" });
  const [cikisHatasi, setCikisHatasi] = useState(false);

  useEffect(() => {
    // İstek iptal edilmez: yanıtı yenilenen oturum anahtarını taşıyabilir, tarayıcıya ulaşmazsa eski anahtarla
    // kalınır ve oturum kapanır (karar 0039). Bileşen kapandıysa yalnız sonucu yok sayılır.
    let acik = true;
    const sor = async () => {
      let sonuc: Durum = { tur: "girissiz" };
      try {
        const yanit = await fetch(hesabimUcu);
        if (yanit.ok) {
          const { veri } = (await yanit.json()) as { veri: { eposta: string } };
          sonuc = { tur: "girisli", eposta: veri.eposta };
        }
      } catch {
        // Ağ hatasında da girişsiz görünür: müşteri giriş sayfasına ulaşabilsin.
      }
      if (acik) setDurum(sonuc);
    };
    void sor();
    return () => {
      acik = false;
    };
  }, []);

  const cik = async () => {
    setCikisHatasi(false);
    try {
      const yanit = await fetch(cikisUcu, { method: "POST" });
      if (yanit.ok) {
        window.location.assign(vitrinAdresleri.anasayfa);
        return;
      }
    } catch {
      // Aşağıdaki uyarı gösterilir.
    }
    setCikisHatasi(true);
  };

  if (durum.tur === "bilinmiyor") return null;
  return (
    <nav className={stil.hesapAlani}>
      {durum.tur === "girissiz" ? (
        <>
          <Link className={stil.baglanti} href={vitrinAdresleri.giris}>
            {metin("vitrin.hesap.giris")}
          </Link>
          <Link className={stil.baglanti} href={vitrinAdresleri.kayit}>
            {metin("vitrin.hesap.kayit")}
          </Link>
        </>
      ) : (
        <>
          {cikisHatasi ? <Uyari>{metin("vitrin.hesap.cikisHata")}</Uyari> : null}
          <span className={stil.eposta}>{durum.eposta}</span>
          <Dugme onClick={cik}>{metin("vitrin.hesap.cikis")}</Dugme>
        </>
      )}
    </nav>
  );
}
