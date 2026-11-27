// Panelin içindeki bildirimler (kart 0280, karar 0198). Yönetici bildirimi olayla aynı işlemde yazılırken
// (yoneticiBildirimiYaz) o olayın iznine sahip her silinmemiş yöneticiye bir satır yazılır. Panel bildirimi her zaman
// açıktır: e-postanın açık-kapalı ayarı ve alıcı adresleri onu etkilemez (karar 0185). Satır kişisel veri taşımaz:
// ilgili kaydın kimliği ve kişisel olmayan özet; metin okunurken kayıttan kurulur (sipariş kişisel bilgisi silinince
// adı da görünmez). Okurken ve okundu yaparken izin yeniden sorulur: izni sonradan alınan yönetici o bildirimleri
// görmez. Arka plan süreci de yükler (temizlik): içe aktarmalar uzantılıdır.
import { and, count, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import {
  panelBildirimSinirlari,
  type StokUyarisiTuru,
  type YoneticiBildirimi,
  yoneticiBildirimleri,
  yoneticiBildirimTanimlari,
} from "../../kayitlar/yonetici-bildirimi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/kimlik.ts";
import { izniOlanYoneticiler, type YoneticiYetkileri } from "../ekip/servis.ts";
import { siparisler } from "../siparis/model.ts";
import { urunler } from "../urun/model.ts";
import { yorumlar } from "../yorum/model.ts";
import { panelBildirimleri } from "./model.ts";
import { birimBilgileri } from "./stok-uyarisi.ts";

// Satırın kişisel olmayan özeti: bildirimin türüne göre.
export type PanelBildirimOzeti = {
  "yeni-siparis": Record<string, never>;
  "havale-bildirimi": { tutar: number };
  "iade-talebi": { adet: number };
  iptal: { neden: "havale-suresi-doldu" | "musteri-iptali" };
  stok: { tur: StokUyarisiTuru; miktar: number };
  yorum: { puan: number };
  "kartla-odeme-uyusmazligi": { gun: string; sayi: number };
  "bekleyen-iade": { neden: "raporda-yok" | "kismi-red" };
};

// İlgili kaydı sipariş olan bildirimler.
const siparisBildirimleri = new Set<YoneticiBildirimi>([
  "yeni-siparis",
  "havale-bildirimi",
  "iade-talebi",
  "iptal",
  "bekleyen-iade",
]);

// Olayla aynı işlemde: iznine sahip her yöneticiye bir satır. Aynı olay bir yöneticiye ikinci kez yazılmaz.
export const panelBildirimiYaz = async <B extends YoneticiBildirimi>(
  islem: Veritabani | VeritabaniIslemi,
  g: { bildirim: B; anahtar: string; kayit: string | null; ozet: PanelBildirimOzeti[B] },
): Promise<void> => {
  const alicilar = await izniOlanYoneticiler(islem, yoneticiBildirimTanimlari[g.bildirim].izin);
  if (alicilar.length === 0) return;
  await islem
    .insert(panelBildirimleri)
    .values(
      alicilar.map((yonetici) => ({
        yonetici_kimligi: yonetici,
        bildirim: g.bildirim,
        anahtar: g.anahtar,
        kayit_kimligi: g.kayit,
        ozet: g.ozet,
      })),
    )
    .onConflictDoNothing({
      target: [panelBildirimleri.yonetici_kimligi, panelBildirimleri.anahtar],
    });
};

// Yöneticinin görebildiği bildirim türleri: iznine göre.
export const gorulebilenBildirimler = (yetkili: YoneticiYetkileri): YoneticiBildirimi[] =>
  yoneticiBildirimleri.filter((b) => yetkili(yoneticiBildirimTanimlari[b].izin));

const yoneticininBildirimleri = (yonetici: string, turler: YoneticiBildirimi[]) =>
  and(
    eq(panelBildirimleri.yonetici_kimligi, yonetici),
    inArray(panelBildirimleri.bildirim, turler),
  );

export const okunmamisSayisi = async (
  vt: Veritabani,
  yonetici: string,
  yetkili: YoneticiYetkileri,
): Promise<number> => {
  const turler = gorulebilenBildirimler(yetkili);
  if (turler.length === 0) return 0;
  const [satir] = await vt
    .select({ sayi: count() })
    .from(panelBildirimleri)
    .where(and(yoneticininBildirimleri(yonetici, turler), isNull(panelBildirimleri.okunma_zamani)));
  return satir?.sayi ?? 0;
};

// İlgili kaydın okunurken bulunan bilgisi. Kayıt bulunamazsa yoktur (satır yine görünür).
export type PanelBildirimKaydi =
  | {
      tur: "siparis";
      numara: string;
      ad: string;
      soyad: string;
      toplam: number;
      paraBirimi: string;
      odemeYontemi: string;
    }
  | { tur: "yorum"; urunAdi: string }
  | { tur: "birim"; urun: string; urunAdi: string; secim: string[] };

export type PanelBildirimSatiri = {
  [B in YoneticiBildirimi]: {
    kimlik: string;
    bildirim: B;
    an: Date;
    okundu: boolean;
    ozet: PanelBildirimOzeti[B];
    kayit: PanelBildirimKaydi | null;
  };
}[YoneticiBildirimi];

// En yeni bildirimler (okunmuşlar da) ve okunmamış sayısı. İlgili kayıtlar türüne göre birer sorguyla gelir.
export const panelBildirimleriniOku = async (
  vt: Veritabani,
  yonetici: string,
  yetkili: YoneticiYetkileri,
): Promise<{ okunmamis: number; satirlar: PanelBildirimSatiri[] }> => {
  const turler = gorulebilenBildirimler(yetkili);
  if (turler.length === 0) return { okunmamis: 0, satirlar: [] };
  const [okunmamis, satirlar] = await Promise.all([
    okunmamisSayisi(vt, yonetici, yetkili),
    vt
      .select()
      .from(panelBildirimleri)
      .where(yoneticininBildirimleri(yonetici, turler))
      .orderBy(desc(panelBildirimleri.olusturma_zamani), desc(panelBildirimleri.kimlik))
      .limit(panelBildirimSinirlari.liste),
  ]);
  const kayitlari = (secici: (b: YoneticiBildirimi) => boolean) => [
    ...new Set(
      satirlar.flatMap((s) =>
        s.kayit_kimligi !== null && secici(s.bildirim as YoneticiBildirimi)
          ? [s.kayit_kimligi]
          : [],
      ),
    ),
  ];
  const siparisKimlikleri = kayitlari((b) => siparisBildirimleri.has(b));
  const yorumKimlikleri = kayitlari((b) => b === "yorum");
  const birimKimlikleri = kayitlari((b) => b === "stok");
  const [siparisSatirlari, yorumSatirlari, birimler] = await Promise.all([
    siparisKimlikleri.length === 0
      ? []
      : vt
          .select({
            kimlik: siparisler.kimlik,
            numara: siparisler.numara,
            teslimat: siparisler.teslimat,
            toplam: siparisler.toplam,
            paraBirimi: siparisler.para_birimi,
            odemeYontemi: siparisler.odeme_yontemi,
          })
          .from(siparisler)
          .where(inArray(siparisler.kimlik, siparisKimlikleri)),
    yorumKimlikleri.length === 0
      ? []
      : vt
          .select({ kimlik: yorumlar.kimlik, urunAdi: urunler.ad })
          .from(yorumlar)
          .innerJoin(urunler, eq(urunler.kimlik, yorumlar.urun_kimligi))
          .where(inArray(yorumlar.kimlik, yorumKimlikleri)),
    birimBilgileri(vt, birimKimlikleri),
  ]);
  const kaydi = (bildirim: YoneticiBildirimi, kimlik: string | null): PanelBildirimKaydi | null => {
    if (kimlik === null) return null;
    if (siparisBildirimleri.has(bildirim)) {
      const s = siparisSatirlari.find((satir) => satir.kimlik === kimlik);
      return s === undefined
        ? null
        : {
            tur: "siparis",
            numara: s.numara,
            ad: s.teslimat.ad,
            soyad: s.teslimat.soyad,
            toplam: s.toplam,
            paraBirimi: s.paraBirimi,
            odemeYontemi: s.odemeYontemi,
          };
    }
    if (bildirim === "yorum") {
      const y = yorumSatirlari.find((satir) => satir.kimlik === kimlik);
      return y === undefined ? null : { tur: "yorum", urunAdi: y.urunAdi };
    }
    const b = birimler.get(kimlik);
    return b === undefined ? null : { tur: "birim", urun: b.urun, urunAdi: b.ad, secim: b.secim };
  };
  return {
    okunmamis,
    satirlar: satirlar.map(
      (s) =>
        ({
          kimlik: s.kimlik,
          bildirim: s.bildirim,
          an: s.olusturma_zamani,
          okundu: s.okunma_zamani !== null,
          ozet: s.ozet,
          kayit: kaydi(s.bildirim as YoneticiBildirimi, s.kayit_kimligi),
        }) as PanelBildirimSatiri,
    ),
  };
};

// Bir bildirimi ya da görebildiği bütün okunmamışları okundu yapar; okundu yapılan sayıyı döner. Yalnız yöneticinin
// kendi satırları değişir; okunmuş satırın okunma anı değişmez (saklama süresi ilk okunduğu andan sayılır).
export const okunduYap = async (
  vt: Veritabani,
  yonetici: string,
  yetkili: YoneticiYetkileri,
  hedef: { kimlik: string } | { hepsi: true },
): Promise<number> => {
  const turler = gorulebilenBildirimler(yetkili);
  if (turler.length === 0) return 0;
  if ("kimlik" in hedef && !kimlikMi(hedef.kimlik)) return 0;
  const satirlar = await vt
    .update(panelBildirimleri)
    .set({ okunma_zamani: sql`now()` })
    .where(
      and(
        yoneticininBildirimleri(yonetici, turler),
        isNull(panelBildirimleri.okunma_zamani),
        "kimlik" in hedef ? eq(panelBildirimleri.kimlik, hedef.kimlik) : undefined,
      ),
    )
    .returning({ kimlik: panelBildirimleri.kimlik });
  return satirlar.length;
};

// Okunduğu andan saklama süresi geçen bildirimleri siler; silinen sayıyı döner. Okunmamış bildirim silinmez.
export const okunanBildirimleriTemizle = async (vt: Veritabani, gun: number): Promise<number> => {
  const silinen = await vt
    .delete(panelBildirimleri)
    .where(
      and(
        isNotNull(panelBildirimleri.okunma_zamani),
        lt(panelBildirimleri.okunma_zamani, sql`now() - make_interval(days => ${gun})`),
      ),
    )
    .returning({ kimlik: panelBildirimleri.kimlik });
  return silinen.length;
};
