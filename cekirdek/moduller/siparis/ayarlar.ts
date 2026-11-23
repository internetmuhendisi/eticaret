// Sipariş ayarları (kart 0234): kargo firmaları listesi. Liste mağaza ayarıdır (kargoFirmalari) ve yalnız bu işlevle
// değişir (kendiIsleviyle). Ekran bütün listeyi gördüğü kimliklerle (onceki) ve yeni hâliyle verir. Liste kilidin
// içinde okunur: arada eklenen ya da silinen firma varsa "cakisma" döner, hiçbir şey yazılmaz. Yeni firmaya kimlik
// burada verilir. Takip adresi şifreli bağlantıdır ve takip numarasının yerini tam bir kez taşır.
//
// Yönetici bildirimleri (kart 0241): alıcılar ve kapalı bildirimler birlikte kaydedilir (yoneticiBildirimleriniKaydet).
//
// İptal ve iade (kart 0239): müşterinin kendi iptali, iade talebi süresi ve iade kargosunu kim öder. Üçü birlikte
// kaydedilir (iptalVeIadeAyarlariniKaydet); aynı değer değişiklik kaydına girmez (mağaza ayarı servisi).
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { eklentiAcikMi } from "../../eklentiler/acik.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { takipAdresiGecerliMi } from "../../kayitlar/siparis.ts";
import {
  type YoneticiBildirimi,
  yoneticiBildirimleri,
  yoneticiBildirimSinirlari,
  yoneticiBildirimTanimlari,
} from "../../kayitlar/yonetici-bildirimi.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari, siteninServisi } from "../magaza-ayarlari/servis.ts";
import type {
  FisAyarlari,
  IptalVeIadeAyarlari,
  KargoFirmalariGirdisi,
  YoneticiBildirimAyarlariGirdisi,
} from "./semalar.ts";

export type KargoFirmasi = { kimlik: string; ad: string; takipAdresi?: string | undefined };

export const siparisAyarlari = (site: Site) => {
  const oku = async (
    vt: Veritabani,
  ): Promise<
    { kargoFirmalari: KargoFirmasi[] } & IptalVeIadeAyarlari &
      FisAyarlari & {
        yoneticiBildirimAlicilari: string[];
        kapaliYoneticiBildirimleri: YoneticiBildirimi[];
      }
  > => {
    const {
      kargoFirmalari,
      musteriIptali,
      iadeTalebiSuresi,
      iadeKargosu,
      yoneticiBildirimAlicilari,
      kapaliYoneticiBildirimleri,
      fisteFiyatlar,
    } = await siteninMagazaAyarlari(vt, site);
    return {
      fisteFiyatlar,
      kargoFirmalari,
      musteriIptali,
      iadeTalebiSuresi,
      iadeKargosu,
      yoneticiBildirimAlicilari,
      kapaliYoneticiBildirimleri,
    };
  };

  // Sitede görünen bildirimler: eklentiye bağlı olan yalnız eklenti açıkken (kart 0241).
  const gorunenBildirimler = (): YoneticiBildirimi[] =>
    yoneticiBildirimleri.filter((bildirim) => {
      const { eklenti } = yoneticiBildirimTanimlari[bildirim];
      return eklenti === null || eklentiAcikMi(site, eklenti);
    });

  // Yönetici bildirimleri (kart 0241, karar 0154): alıcılar virgül, noktalı virgül ya da boşlukla ayrılır, küçük harfe
  // çevrilir; en çok 5, her biri e-posta, tekrar yok. Hata alanın koduyla döner, hiçbir şey yazılmaz. Kapalı
  // bildirimler ekranın gördükleri arasından gelir; ekranda görünmeyenin (kapalı eklenti) kayıtlı hâli korunur.
  const yoneticiBildirimleriniKaydet = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: YoneticiBildirimAyarlariGirdisi,
  ) => {
    const alicilar = girdi.alicilar
      .split(/[\s,;]+/u)
      .map((adres) => adres.trim().toLowerCase())
      .filter((adres) => adres !== "");
    const kod =
      alicilar.length > yoneticiBildirimSinirlari.aliciEnCok
        ? "alici-siniri"
        : alicilar.some((adres) => !z.email().max(254).safeParse(adres).success)
          ? "eposta-gecersiz"
          : new Set(alicilar).size !== alicilar.length
            ? "alici-tekrari"
            : undefined;
    if (kod !== undefined) throw new BilinenHata("dogrulama", [{ alan: "alicilar", kod }]);
    const gorunen = new Set(gorunenBildirimler());
    if (girdi.kapalilar.some((bildirim) => !gorunen.has(bildirim))) {
      throw new BilinenHata("dogrulama", [{ alan: "kapalilar", kod: "bildirim-yok" }]);
    }
    await siteninServisi(site).degistir(
      vt,
      kim,
      (bugunku) => ({
        yoneticiBildirimAlicilari: alicilar,
        kapaliYoneticiBildirimleri: yoneticiBildirimleri.filter((bildirim) =>
          gorunen.has(bildirim)
            ? girdi.kapalilar.includes(bildirim)
            : bugunku.kapaliYoneticiBildirimleri.includes(bildirim),
        ),
      }),
      { kendiIslevi: true },
    );
    return oku(vt);
  };

  const iptalVeIadeAyarlariniKaydet = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: IptalVeIadeAyarlari,
  ) => {
    await siteninServisi(site).degistir(vt, kim, girdi, { kendiIslevi: true });
    return oku(vt);
  };

  // Sipariş fişi (kart 0270): fişte fiyatlar. Değişirse değişiklik kaydına girer, aynı değer girmez.
  const fisAyarlariniKaydet = async (vt: Veritabani, kim: DegisikligiYapan, girdi: FisAyarlari) => {
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

  return {
    oku,
    kargoFirmalariniKaydet,
    iptalVeIadeAyarlariniKaydet,
    fisAyarlariniKaydet,
    gorunenBildirimler,
    yoneticiBildirimleriniKaydet,
  };
};
