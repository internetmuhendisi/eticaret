// Sipariş ayarları (kart 0234): kargo firmaları listesi. Liste mağaza ayarıdır (kargoFirmalari) ve yalnız bu işlevle
// değişir (kendiIsleviyle). Ekran bütün listeyi gördüğü kimliklerle (onceki) ve yeni hâliyle verir. Liste kilidin
// içinde okunur: arada eklenen ya da silinen firma varsa "cakisma" döner, hiçbir şey yazılmaz. Yeni firmaya kimlik
// burada verilir. Takip adresi şifreli bağlantıdır ve takip numarasının yerini tam bir kez taşır.
//
// İptal ve iade (kart 0239): müşterinin kendi iptali, iade talebi süresi ve iade kargosunu kim öder. Üçü birlikte
// kaydedilir (iptalVeIadeAyarlariniKaydet); aynı değer değişiklik kaydına girmez (mağaza ayarı servisi).
import { randomUUID } from "node:crypto";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { takipAdresiGecerliMi } from "../../kayitlar/siparis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari, siteninServisi } from "../magaza-ayarlari/servis.ts";
import type { IptalVeIadeAyarlari, KargoFirmalariGirdisi } from "./semalar.ts";

export type KargoFirmasi = { kimlik: string; ad: string; takipAdresi?: string | undefined };

export const siparisAyarlari = (site: Site) => {
  const oku = async (
    vt: Veritabani,
  ): Promise<{ kargoFirmalari: KargoFirmasi[] } & IptalVeIadeAyarlari> => {
    const { kargoFirmalari, musteriIptali, iadeTalebiSuresi, iadeKargosu } =
      await siteninMagazaAyarlari(vt, site);
    return { kargoFirmalari, musteriIptali, iadeTalebiSuresi, iadeKargosu };
  };

  const iptalVeIadeAyarlariniKaydet = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: IptalVeIadeAyarlari,
  ) => {
    await siteninServisi(site).degistir(vt, kim, girdi, { kendiIslevi: true });
    return oku(vt);
  };

  const kargoFirmalariniKaydet = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: KargoFirmalariGirdisi,
  ) => {
    const hatalar: { alan: string; kod: string }[] = [];
    girdi.firmalar.forEach((firma, sira) => {
      if (firma.takipAdresi !== undefined && !takipAdresiGecerliMi(firma.takipAdresi)) {
        hatalar.push({ alan: `firmalar.${sira}.takipAdresi`, kod: "takip-adresi-gecersiz" });
      }
    });
    if (hatalar.length > 0) throw new BilinenHata("dogrulama", hatalar);
    await siteninServisi(site).degistir(
      vt,
      kim,
      (bugunku) => {
        const kayitli = bugunku.kargoFirmalari.map((firma) => firma.kimlik);
        if (
          kayitli.length !== girdi.onceki.length ||
          kayitli.some((kimlik, sira) => girdi.onceki[sira] !== kimlik)
        ) {
          throw new BilinenHata("cakisma", [{ alan: "firmalar", kod: "liste-degisti" }]);
        }
        // Yalnız kayıtlı firmanın kimliği korunur; başka kimlik yeni firma sayılır.
        const bilinen = new Set(kayitli);
        return {
          kargoFirmalari: girdi.firmalar.map((firma) => ({
            kimlik:
              firma.kimlik !== undefined && bilinen.has(firma.kimlik) ? firma.kimlik : randomUUID(),
            ad: firma.ad,
            ...(firma.takipAdresi === undefined ? {} : { takipAdresi: firma.takipAdresi }),
          })),
        };
      },
      { kendiIslevi: true },
    );
    return oku(vt);
  };

  return { oku, kargoFirmalariniKaydet, iptalVeIadeAyarlariniKaydet };
};
