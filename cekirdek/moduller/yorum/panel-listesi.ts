// Panelin yorum listesi (kart 0277, karar 0174): onay bekleyen, yayındaki ve reddedilen yorumlar; arama, süzgeç,
// sıralama, sayfa ve durum sayıları sunucuda.
//
// - Silinmiş ürünün yorumu listede, sayılarda ve menüdeki sayıda yoktur: hiçbir yerde görünmez, karar beklemez.
// - Arama: ürünün adı ya da yorumun kısaltılmış adı; harf kuralı aramanınkidir (aramaAnahtari: Türkçe harfsiz, büyük
//   küçük harf ayrımsız). Aranan metin alanın herhangi bir yerinde geçebilir (strpos: % ve _ joker değildir).
// - Süzgeçler: durum (sekme, tek değer) ve puan (birden çok). Durum sayıları puana ve aramaya uyar, duruma uymaz.
// - Sıralama: en yeni, en eski, puan artan ve azalan (eşitlikte en yeni önce).
// - Satırın "vitrinde" bilgisi ürünün sayfasının şu an açılıp açılmadığıdır (vitrinKosulu, sayfa yeri).
// - Toplu karar: her yorum tekil kararla (yorumServisi.karar) aynı yoldan, kendi işleminde; birinin hatası ötekileri
//   durdurmaz (TopluSonuc).
import { and, asc, count, desc, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { PanelSayfaBoyu, TopluSonuc } from "../../kayitlar/liste.ts";
import {
  type YorumDurumu,
  type YorumPanelSiralamasi,
  type YorumTopluIslemi,
  yorumDurumlari,
  yorumTopluIslemleri,
} from "../../kayitlar/yorum.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt } from "../../veritabani/kimlik.ts";
import { urunler } from "../urun/model.ts";
import { vitrinKosulu } from "../urun/vitrin.ts";
import { yorumlar } from "./model.ts";
import { yorumServisi } from "./servis.ts";

export type YorumPanelListesiGirdisi = {
  ara?: string;
  durum?: YorumDurumu | undefined;
  puan?: readonly number[];
  siralama: YorumPanelSiralamasi;
  sayfa: number;
  sayfaBoyu: PanelSayfaBoyu;
};

export type YorumPanelSatiri = {
  kimlik: string;
  puan: number;
  baslik: string | null;
  metin: string;
  ad: string;
  dogrulanmisAlici: boolean;
  durum: YorumDurumu;
  anaSayfada: boolean;
  zaman: Date;
  urun: { kimlik: string; ad: string; adresAdi: string; vitrinde: boolean };
};

export type YorumPanelListesi = {
  satirlar: YorumPanelSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  sayfaBoyu: number;
  // Durumların sayıları, puana ve aramaya uyan yorumlarda (durum süzgecine bakılmaz).
  durumSayilari: Record<YorumDurumu, number>;
};

// Yorumu listede görünen satırlar: ürünü silinmemiş.
const urunuVar = isNull(urunler.silinme_zamani);

const aramaKosulu = (aranan: string): SQL => sql`(
  strpos(${aramaAnahtariSql(urunler.ad)}, ${aranan}) > 0
  or strpos(${aramaAnahtariSql(yorumlar.ad)}, ${aranan}) > 0
)`;

export const yorumPanelListesi = async (
  vt: Veritabani | VeritabaniIslemi,
  girdi: YorumPanelListesiGirdisi,
  { an = new Date() }: { an?: Date } = {},
): Promise<YorumPanelListesi> => {
  const aranan = aramaAnahtari(girdi.ara ?? "");
  const puanlar = [...new Set(girdi.puan ?? [])];
  // Durum dışındaki koşullar: sayılar durum süzgecine bakmaz.
  const ortak = and(
    urunuVar,
    aranan === "" ? undefined : aramaKosulu(aranan),
    puanlar.length === 0 ? undefined : inArray(yorumlar.puan, puanlar),
  );
  const sayilar = await vt
    .select({ durum: yorumlar.durum, sayi: count() })
    .from(yorumlar)
    .innerJoin(urunler, eq(urunler.kimlik, yorumlar.urun_kimligi))
    .where(ortak)
    .groupBy(yorumlar.durum);
  const durumSayilari = Object.fromEntries(yorumDurumlari.map((durum) => [durum, 0])) as Record<
    YorumDurumu,
    number
  >;
  for (const satir of sayilar) durumSayilari[satir.durum as YorumDurumu] = satir.sayi;
  const toplam =
    girdi.durum === undefined
      ? Object.values(durumSayilari).reduce((a, b) => a + b, 0)
      : durumSayilari[girdi.durum];

  const boyut = girdi.sayfaBoyu;
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / boyut));
  const sayfa = Math.min(Math.max(1, Math.trunc(girdi.sayfa) || 1), sayfaSayisi);
  const zaman = yorumlar.olusturma_zamani;
  const sira: SQL[] = {
    "en-yeni": [desc(zaman)],
    "en-eski": [asc(zaman)],
    "puan-artan": [asc(yorumlar.puan), desc(zaman)],
    "puan-azalan": [desc(yorumlar.puan), desc(zaman)],
  }[girdi.siralama];
  const satirlar = await vt
    .select({
      kimlik: yorumlar.kimlik,
      puan: yorumlar.puan,
      baslik: yorumlar.baslik,
      metin: yorumlar.metin,
      ad: yorumlar.ad,
      dogrulanmisAlici: yorumlar.dogrulanmis_alici,
      durum: yorumlar.durum,
      anaSayfada: yorumlar.ana_sayfada,
      zaman,
      urunKimligi: urunler.kimlik,
      urunAdi: urunler.ad,
      adresAdi: urunler.adres_adi,
      vitrinde: sql<boolean>`(${vitrinKosulu("sayfa", { an, tukenenUrun: "goster" })})`,
    })
    .from(yorumlar)
    .innerJoin(urunler, eq(urunler.kimlik, yorumlar.urun_kimligi))
    .where(and(ortak, girdi.durum === undefined ? undefined : eq(yorumlar.durum, girdi.durum)))
    .orderBy(...sira, asc(yorumlar.kimlik))
    .limit(boyut)
    .offset((sayfa - 1) * boyut);
  return {
    satirlar: satirlar.map(({ urunKimligi, urunAdi, adresAdi, vitrinde, durum, ...satir }) => ({
      ...satir,
      durum: durum as YorumDurumu,
      urun: { kimlik: urunKimligi, ad: urunAdi, adresAdi, vitrinde },
    })),
    toplam,
    sayfa,
    sayfaSayisi,
    sayfaBoyu: boyut,
    durumSayilari,
  };
};

// Panel menüsündeki sayı: onay bekleyen yorumlar (ürünü silinmemiş).
export const onayBekleyenYorumSayisi = async (
  vt: Veritabani | VeritabaniIslemi,
): Promise<number> => {
  const [satir] = await vt
    .select({ sayi: count() })
    .from(yorumlar)
    .innerJoin(urunler, eq(urunler.kimlik, yorumlar.urun_kimligi))
    .where(and(urunuVar, eq(yorumlar.durum, "onay-bekliyor")));
  return satir?.sayi ?? 0;
};

// Toplu karar: her yorum tekil kararla aynı yoldan, kendi işleminde. İşlenemeyen yorum nedeninin koduyla döner.
export const yorumTopluKarar = async (
  vt: Veritabani,
  site: Site,
  kim: DegisikligiYapan,
  girdi: { islem: YorumTopluIslemi; yorumlar: readonly string[] },
): Promise<TopluSonuc> => {
  const sonuc: TopluSonuc = { islenen: [], islenemeyen: [] };
  const { durum } = yorumTopluIslemleri[girdi.islem];
  const servis = yorumServisi(site);
  for (const kimlik of new Set(girdi.yorumlar.map(kimligiDuzelt))) {
    try {
      await servis.karar(vt, kim, kimlik, durum);
      sonuc.islenen.push(kimlik);
    } catch (hata) {
      if (hata instanceof BilinenHata) {
        const ayrinti = Array.isArray(hata.ayrinti)
          ? (hata.ayrinti[0] as { kod?: unknown } | undefined)
          : undefined;
        sonuc.islenemeyen.push({
          anahtar: kimlik,
          kod: typeof ayrinti?.kod === "string" ? ayrinti.kod : hata.kod,
        });
      } else {
        hatayiKaydet(hata, { islem: "yorum-toplu-karar" });
        sonuc.islenemeyen.push({ anahtar: kimlik, kod: "beklenmeyen" });
      }
    }
  }
  return sonuc;
};
