// Ürün ekranının fiyat ve stok bölümleri (kart 0265; taslak: planlar/tasarim-yonu/panel.html, u-fiyat, u-stok).
// Ürünün tek "Kaydet"iyle (karar 0162) ürünle aynı işlemde yazılır: uç önce seçenekleri, sonra ürünü, en son bunu
// çağırır. Fiyat yalnız fiyat servisiyle (fiyatYaz), stok yalnız stok servisiyle (stokDuzelt) değişir; bu dosya
// yalnız ekranın girdisini onlara çevirir.
//
// - Her satır bir birimdir: basit ürünün birimi ("fiyat", "stok" yerleri) ya da birleşim tablosunun satırı
//   ("birlesimler.3"); birleşim seçeneklerdeki değerlerin sırasıyla bulunur (varyantKaydi'ndeki gibi, [0, 2]).
// - Tutar sitenin para biçimiyle yazılı metindir (kargo ekranının kuralı, karar 0135), burada kuruşa çevrilir.
//   İndirimin başlangıcı ve bitişi bütün satırlar için ortaktır (karar 0157); indirimli fiyatı olmayan satıra
//   zaman yazılmaz.
// - Stok yeni miktardır, ekranın gördüğü miktarla gider: arada değiştiyse çakışma (stok-degisti), hiçbir şey
//   yazılmaz. Sebep ve not bütün satırlar için ortaktır (kullanıcı kararı: tablonun altında tek seçim).
// - Fiyat fiyat.degistir, stok stok.duzelt ister (uç izni okur, burada denetlenir); görevli fiyatı değiştiremez.
// - Hata ekranın alanının yoluyla döner: "fiyat.satisFiyati", "birlesimler.2.indirimliFiyat", "birlesimler.2.stok",
//   ortak zaman "fiyat.indirimBaslangici", sebep "stokSebebi", not "stokNotu".
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { elleStokSebepleri } from "../../kayitlar/stok.ts";
import { varyantSinirlari } from "../../kayitlar/urun.ts";
import type { Bicimleyici } from "../../metinler/bicimleyici.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt } from "../../veritabani/kimlik.ts";
import type { fiyatServisi } from "../fiyat/servis.ts";
import type { stokServisi } from "../stok/servis.ts";
import type { Sorun } from "./dogrulama.ts";
import { urunBirimleri } from "./model.ts";
import { birlesimAnahtari, secenekleriOku } from "./varyant.ts";

const tutarYazisi = z.string().trim().max(40);
const yerelZaman = z.string().max(20).nullable();

export const panelFiyatStokSemasi = z.strictObject({
  indirimBaslangici: yerelZaman.optional(),
  indirimBitisi: yerelZaman.optional(),
  sebep: z.enum(elleStokSebepleri).optional(),
  not: z.string().max(1000).optional(),
  birimler: z
    .array(
      z.strictObject({
        // Ekrandaki yeri: hatanın yolunun başı.
        yer: z.string().regex(/^(?:fiyat|stok|birlesimler\.\d{1,3})$/),
        // Birleşim satırında seçeneklerdeki değerlerin sırası; basit üründe yok.
        birlesim: z
          .array(
            z
              .int()
              .min(0)
              .max(varyantSinirlari.deger - 1),
          )
          .max(varyantSinirlari.secenek)
          .optional(),
        satisFiyati: tutarYazisi.optional(),
        // Boş metin indirimsiz demektir.
        indirimliFiyat: tutarYazisi.optional(),
        stok: z
          .strictObject({ gorulen: z.int().min(0), yeni: z.string().trim().max(20) })
          .optional(),
      }),
    )
    .max(varyantSinirlari.birlesim),
});
export type PanelFiyatStok = z.input<typeof panelFiyatStokSemasi>;

type Servisler = {
  fiyat: ReturnType<typeof fiyatServisi>;
  stok: ReturnType<typeof stokServisi>;
  bicimleyici: Bicimleyici;
};

// Bilinen hatanın alanını ekranın yoluna çevirir.
const yolla = async (yol: (alan: string) => string, is: () => Promise<unknown>) => {
  try {
    await is();
  } catch (hata) {
    if (hata instanceof BilinenHata && Array.isArray(hata.ayrinti)) {
      throw new BilinenHata(
        hata.kod,
        hata.ayrinti.map((sorun: Sorun) => ({ ...sorun, alan: yol(sorun.alan) })),
        hata.basliklar,
      );
    }
    throw hata;
  }
};

// Ürünün silinmemiş birimleri: basit birim (değersiz) ve birleşimler, değerlerinin seçeneklerdeki sırasıyla.
const birimleriBul = async (islem: VeritabaniIslemi, urun: string) => {
  const secenekler = (await secenekleriOku(islem, [urun], { silinmisler: false })).get(urun) ?? [];
  const birimler = await islem
    .select({ kimlik: urunBirimleri.kimlik, birlesim: urunBirimleri.birlesim })
    .from(urunBirimleri)
    .where(and(eq(urunBirimleri.urun_kimligi, urun), isNull(urunBirimleri.silinme_zamani)));
  const yollar = new Map<string, string>();
  const anahtarla = new Map(birimler.map((b) => [b.birlesim, b.kimlik]));
  const ozdes = secenekler.map((s) => s.degerler.map((d) => d.kimlik));
  const kur = (yol: number[], i: number) => {
    if (i === ozdes.length) {
      const anahtar = birlesimAnahtari(yol.map((j, k) => ozdes[k]?.[j] ?? ""));
      const birim = anahtarla.get(anahtar);
      if (birim !== undefined) yollar.set(yol.join(","), birim);
      return;
    }
    for (const j of (ozdes[i] ?? []).keys()) kur([...yol, j], i + 1);
  };
  if (ozdes.length > 0) kur([], 0);
  // Basit ürünün birimi boş anahtarlıdır (değeri yoktur); seçenekli üründe basit birim yoktur.
  const basit = ozdes.length === 0 ? anahtarla.get("") : undefined;
  return { yollar, basit };
};

export const panelFiyatStokYaz = async (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  urunGirdisi: string,
  ham: PanelFiyatStok,
  servisler: Servisler,
  izinler: { fiyat: boolean; stok: boolean },
): Promise<void> => {
  const sonuc = panelFiyatStokSemasi.safeParse(ham);
  if (!sonuc.success) {
    throw new BilinenHata(
      "dogrulama",
      sonuc.error.issues.map((s) => ({ alan: s.path.join("."), kod: s.code })),
    );
  }
  const girdi = sonuc.data;
  const urun = kimligiDuzelt(urunGirdisi);
  const fiyatVar =
    girdi.birimler.some((b) => b.satisFiyati !== undefined || b.indirimliFiyat !== undefined) ||
    girdi.indirimBaslangici !== undefined ||
    girdi.indirimBitisi !== undefined;
  const stokVar = girdi.birimler.some((b) => b.stok !== undefined);
  if (fiyatVar && !izinler.fiyat) {
    throw new BilinenHata("yetki", [{ alan: "fiyat", kod: "fiyat-yetkisi" }]);
  }
  if (stokVar && !izinler.stok) {
    throw new BilinenHata("yetki", [{ alan: "stok", kod: "stok-yetkisi" }]);
  }
  if (girdi.birimler.length === 0) return;
  const { yollar, basit } = await birimleriBul(islem, urun);
  const tutar = (yer: string, alan: string, yazi: string): number => {
    // Boş satış fiyatı: kayıtlı fiyat kaldırılamaz, alan doldurulur (zorunlu alanın kodu).
    if (yazi.trim() === "") {
      throw new BilinenHata("dogrulama", [{ alan: `${yer}.${alan}`, kod: "too_small" }]);
    }
    const okunan = servisler.bicimleyici.paraOku(yazi);
    if (okunan === undefined) {
      throw new BilinenHata("dogrulama", [{ alan: `${yer}.${alan}`, kod: "tutar-okunamadi" }]);
    }
    return okunan;
  };
  for (const satir of girdi.birimler) {
    const birim = satir.birlesim === undefined ? basit : yollar.get(satir.birlesim.join(","));
    // Ekranın gördüğü birleşim ya da basit birim artık yok (seçenekler bu arada değişmiş).
    if (birim === undefined) {
      throw new BilinenHata("cakisma", [{ alan: satir.yer, kod: "varyant-degisti" }]);
    }
    if (satir.satisFiyati !== undefined) {
      const indirimli =
        satir.indirimliFiyat === undefined || satir.indirimliFiyat === ""
          ? null
          : tutar(satir.yer, "indirimliFiyat", satir.indirimliFiyat);
      const satis = tutar(satir.yer, "satisFiyati", satir.satisFiyati);
      await yolla(
        (alan) =>
          alan === "indirimBaslangici" || alan === "indirimBitisi"
            ? `fiyat.${alan}`
            : `${satir.yer}.${alan}`,
        () =>
          servisler.fiyat.fiyatYaz(islem, kim, birim, {
            satisFiyati: satis,
            indirimliFiyat: indirimli,
            indirimBaslangici: indirimli === null ? null : (girdi.indirimBaslangici ?? null),
            indirimBitisi: indirimli === null ? null : (girdi.indirimBitisi ?? null),
          }),
      );
    }
  }
  // Stok en son: stok satırının kilidinden sonra ürünün işlem kilidi alınmaz (karar 0068).
  for (const satir of girdi.birimler) {
    if (satir.stok === undefined) continue;
    const birim = satir.birlesim === undefined ? basit : yollar.get(satir.birlesim.join(","));
    if (birim === undefined) {
      throw new BilinenHata("cakisma", [{ alan: satir.yer, kod: "varyant-degisti" }]);
    }
    const yeni = /^\d{1,10}$/.test(satir.stok.yeni) ? Number(satir.stok.yeni) : Number.NaN;
    await yolla(
      (alan) =>
        alan === "sebep" ? "stokSebebi" : alan === "not" ? "stokNotu" : `${satir.yer}.stok`,
      () =>
        servisler.stok.stokDuzelt(islem, kim, birim, {
          yeniMiktar: yeni,
          gorulenMiktar: satir.stok?.gorulen ?? 0,
          sebep: girdi.sebep ?? "sayim",
          ...(girdi.not === undefined || girdi.not.trim() === "" ? {} : { not: girdi.not }),
        }),
    );
  }
};
