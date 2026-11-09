"use client";
// Vitrinde müşterinin hesap alanı (kart 0033). Oturum uçtan sorulur: sayfa çizerken okunursa oturum kapanır
// (karar 0039). Cevap gelene kadar boş kalır: girişli müşteri bir an "Giriş yap" görmesin.
import { useEffect, useState } from "react";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { hataKodlari } from "../kayitlar/kapi";
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
      // Yalnız oturum yoksa girişsiz görünür. Sunucu hatasında ve ağ hatasında alan boş kalır: girişli müşteri
      // oturumu kapanmış sanmasın.
      let sonuc: Durum = { tur: "bilinmiyor" };
      try {
        const yanit = await fetch(hesabimUcu, { cache: "no-store" });
        if (yanit.ok) {
          const { veri } = (await yanit.json()) as { veri: { eposta: string } };
          sonuc = { tur: "girisli", eposta: veri.eposta };
        } else if (yanit.status === hataKodlari["oturum-yok"]) {
          sonuc = { tur: "girissiz" };
        }
      } catch {
        // Alan boş kalır.
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
          <Baglanti href={vitrinAdresleri.giris}>{metin("vitrin.hesap.giris")}</Baglanti>
          <Baglanti href={vitrinAdresleri.kayit}>{metin("vitrin.hesap.kayit")}</Baglanti>
        </>
      ) : (
        <>
          {cikisHatasi ? <Uyari tur="tehlike">{metin("vitrin.hesap.cikisHata")}</Uyari> : null}
          <span className={stil.eposta}>{durum.eposta}</span>
          <Dugme onClick={cik}>{metin("vitrin.hesap.cikis")}</Dugme>
        </>
      )}
    </nav>
  );
}
