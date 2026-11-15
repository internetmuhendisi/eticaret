// Tema ekranının verisi (kart 0148), sunucuda: geçerli tema sürümü, sitenin kullanabileceği temalar ve her birinin
// demo bağlantısı, masaüstünde filtrenin bugünkü yeri, temanın değiştirilip değiştirilemeyeceği. Tema yalnız tema
// servisiyle okunur; değişiklikler kapıdaki tema uçlarından gider.
//
// Her temanın yayında gönderilecek ayarları burada kurulur: yeni temanın kabul etmediği renk ve seçenek atılır,
// temaya bağlı olmayan ayarlar (koyu tema, filtrenin yeri) kalır (yeniTemaninAyarlari). Böylece tarayıcı tema
// tanımını taşımaz.

import { calisanSite } from "../../ayar-semasi/calisan-site";
import { temaDemosuBaglantisi } from "../../ayar-semasi/tema-demosu-adresi";
import type { UrunFiltresiGorunumu } from "../../kayitlar/tema";
import { urunFiltresiGorunumleri } from "../../kayitlar/tema";
import {
  siteninGecerliTemasi,
  siteninTemaServisi,
  temaDegistirilebilirMi,
} from "../../moduller/tema/servis";
import {
  parcaGorunumleriniKur,
  type TemaAyarlari,
  yeniTemaninAyarlari,
} from "../../temalar/ayarlar";
import type { TemaKaynagi } from "../../temalar/temalar";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { temaninAdi } from "../../vitrin/tema-demosu-seridi";

export type EkranTemasi = {
  kod: string;
  ad: string;
  kaynak: TemaKaynagi;
  // Kayıtlı (geçerli) tema mı.
  secili: boolean;
  // Demodaki adresi: siteye özel temanın ve demo adresi verilmemiş ortamın bağlantısı yoktur.
  demo?: string;
  // Bu temaya geçerken gönderilecek ayarlar.
  ayarlar: TemaAyarlari;
};

export type TemaEkraniVerisi = {
  // Geçerli sürümün sırası: "Önceki hâline dön" bunu ekranın gördüğü son sürüm olarak gönderir.
  sira: number;
  temalar: EkranTemasi[];
  // Masaüstünde filtrenin bugün vitrinde çizilen yeri.
  filtreYeri: UrunFiltresiGorunumu;
  // "Mağaza sahibi temayı değiştirebilir" (altyapı sahibinin ayarı).
  degistirilebilir: boolean;
};

export const temaEkraniVerisi = async (): Promise<TemaEkraniVerisi> => {
  const vt = siteninVeritabani();
  const servis = siteninTemaServisi();
  const durum = await servis.temaDurumu(vt);
  const gecerli = await siteninGecerliTemasi(vt);
  const gorunen = parcaGorunumleriniKur(gecerli.tema.tanim, gecerli.ayarlar)["urun-filtresi"];
  const filtreYeri =
    urunFiltresiGorunumleri.find((yer) => yer === gorunen) ?? urunFiltresiGorunumleri[0];
  return {
    sira: durum.sira,
    temalar: calisanSite().temalar.map((tema) => {
      const demo = tema.kaynak === "cekirdek" ? temaDemosuBaglantisi(tema.kod) : undefined;
      return {
        kod: tema.kod,
        ad: temaninAdi(tema),
        kaynak: tema.kaynak,
        secili: tema.kod === durum.tema,
        ...(demo === undefined ? {} : { demo }),
        ayarlar: yeniTemaninAyarlari(tema.tanim, durum.ayarlar),
      };
    }),
    filtreYeri,
    degistirilebilir: temaDegistirilebilirMi(),
  };
};
