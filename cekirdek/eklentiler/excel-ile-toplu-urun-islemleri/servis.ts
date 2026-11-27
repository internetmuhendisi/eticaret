// Excel ile toplu ürün işlemleri eklentisinin servisi (kart 0315, tarif eklentiler/excel-ile-toplu-urun-islemleri.md).
// Her işlem önce eklentinin açıklığını sorar; kapalıyken uçlar bulunamadı alır, işler hiçbir şey yapmadan biter ve
// süren iş beklemede kalır. Eklenti yeniden açılınca zamanlı tarama bekleyen işi kaldığı yerden sürdürür.
//
// - Dışa aktarma: yönetici başlatır, iş dosyayı yazar; dosya ve birimlerin o andaki değerleri kayda girer. Dosyayı
//   yalnız hazırlayan indirir (fiyat ve stok sütunları onun izniyle yazıldı).
// - İçe aktarma: yönetici dosyayı yükler, iş satırları denetler (denetim.ts), sonuç önizlemededir. Hatalı satır varken
//   uygulanmaz (karar 0185). Onaylanınca iş ürün gruplarını partilerle yazar (uygulama.ts); her grubun satırları aynı
//   işlemde "uygulandı" işaretlenir. Yöneticinin tek açık içe aktarması olur: yeni dosya öncekini vazgeçilmiş sayar.
// - Saklama: dışa aktarma ve içe aktarma kayıtları excelAyari.saklamaGun sonra silinir (kapalıyken de).
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { type ExcelIceAktarmaDurumu, excelAyari } from "../../kayitlar/eklentiler.ts";
import { yerelZamana } from "../../metinler/bicimleyici.ts";
import { yoneticininYetkileri } from "../../moduller/ekip/servis.ts";
import { siteninStokAyarlari } from "../../moduller/stok/durum.ts";
import { urunler } from "../../moduller/urun/model.ts";
import {
  type UrunPanelListesiGirdisi,
  urunPanelListesi,
} from "../../moduller/urun/panel-listesi.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { eklentiAcikMi } from "../acik.ts";
import { type DenetlenenSatir, type Gorulen, satirlariDenetle, type Yazilacak } from "./denetim.ts";
import { DosyaOkunamadi, dosyaOku, dosyaYaz, type YazilacakSatir } from "./dosya.ts";
import { type KatalogUrunu, sozlukOku, urunleriOku } from "./katalog.ts";
import { excelDisaAktarmalari, excelIceAktarmalari, excelIceAktarmaSatirlari } from "./model.ts";
import { fiyatSutunlari, type IndirilenDegerler, type Sutun, sutunlar } from "./sutunlar.ts";
import { grubuUygula } from "./uygulama.ts";

export const excelEklentisi = "excel-ile-toplu-urun-islemleri" as const;

// Ürün listesinin süzgeçleri ve sıralaması (sayfasız).
export type ListeKapsami = Omit<UrunPanelListesiGirdisi, "sayfa" | "sayfaBoyu">;

type Vt = Veritabani | VeritabaniIslemi;

// İşleri kuyruğa koyan işlevler (isler.ts verir): servis kuyruğun iş tanımlarını tanımaz, döngüsel yükleme olmasın.
export type ExcelIsleri = {
  disaAktar: (vt: Vt, kimlik: string) => Promise<unknown>;
  denetle: (vt: Vt, kimlik: string) => Promise<unknown>;
  uygula: (vt: Vt, kimlik: string) => Promise<unknown>;
};

export type DisaAktarmaDurumu = {
  kimlik: string;
  durum: "hazirlaniyor" | "hazir" | "hatali";
  urunSayisi: number;
  satirSayisi: number;
  olusturma: Date;
};

export type OnizlemeSatiri = {
  no: number;
  ad: string;
  degisiklikler: { alan: Sutun; simdi: string; yeni: string }[];
  hatalar: { kod: string; alan?: Sutun; deger?: string }[];
  uygulamaHatasi?: string;
};
export type IceAktarmaDurumu = {
  kimlik: string;
  durum: ExcelIceAktarmaDurumu;
  dosyaAdi: string;
  dosyaBoyutu: number;
  neden?: string;
  nedenAyrintisi?: string;
  satirSayisi: number;
  sayilar: { ekle: number; degistir: number; ayni: number; hatali: number };
  uygulama: {
    toplam: number;
    uygulanan: number;
    uygulanamayan: number;
    eklenen: number;
    degisen: number;
  };
  hatalilar: OnizlemeSatiri[];
  degisecekler: OnizlemeSatiri[];
  eklenecekler: OnizlemeSatiri[];
  uygulanamayanlar: OnizlemeSatiri[];
};

export const excelServisi = (site: Site, isler: ExcelIsleri) => {
  const acikMi = () => eklentiAcikMi(site, excelEklentisi);
  const acik = () => {
    if (!acikMi()) throw new BilinenHata("bulunamadi");
  };
  const yapan = (yonetici: string): DegisikligiYapan => ({ tur: "yonetici", kimlik: yonetici });

  // ——— Dışa aktarma ———

  // Kapsam: ürün listesinin süzgeçleri (uç listenin adresinden çözer; sayfa yok sayılır) ya da null (bütün ürünler).
  // Sütunlar hazırlayanın izniyle.
  const disaAktarmaBaslat = async (
    vt: Veritabani,
    yonetici: string,
    girdi: { kapsam: ListeKapsami | null; fiyat: boolean; stok: boolean },
  ): Promise<string> => {
    acik();
    return vt.transaction(async (islem) => {
      const [satir] = await islem
        .insert(excelDisaAktarmalari)
        .values({
          yonetici_kimligi: yonetici,
          durum: "hazirlaniyor",
          kapsam: girdi.kapsam,
          fiyat_sutunlari: girdi.fiyat,
          stok_sutunu: girdi.stok,
        })
        .returning({ kimlik: excelDisaAktarmalari.kimlik });
      if (satir === undefined) throw new Error("Dışa aktarma yazılamadı.");
      await isler.disaAktar(islem, satir.kimlik);
      return satir.kimlik;
    });
  };

  // Kapsamın ürünleri: listenin sırasıyla (süzgeçli) ya da ada göre (bütün ürünler).
  const kapsaminUrunleri = async (
    vt: Veritabani,
    kapsam: ListeKapsami | null,
  ): Promise<string[]> => {
    if (kapsam === null) {
      const satirlar = await vt
        .select({ kimlik: urunler.kimlik })
        .from(urunler)
        .where(isNull(urunler.silinme_zamani))
        .orderBy(asc(urunler.ad), asc(urunler.kimlik));
      return satirlar.map((s) => s.kimlik);
    }
    const stokAyarlari = await siteninStokAyarlari(vt, site);
    const ayarlar = {
      paraBirimi: stokAyarlari.paraBirimi,
      dusukStokEsigi: stokAyarlari.dusukStokEsigi,
      an: new Date(),
      dil: site.ayarlar.dil,
    };
    const kimlikler: string[] = [];
    for (let sayfa = 1; ; sayfa += 1) {
      const liste = await urunPanelListesi(vt, { ...kapsam, sayfa, sayfaBoyu: 100 }, ayarlar);
      kimlikler.push(...liste.satirlar.map((s) => s.kimlik));
      if (sayfa >= liste.sayfaSayisi) break;
    }
    return kimlikler;
  };

  // Dışa aktarma işi: dosyayı yazar. Kilitli satırda çalışır: aynı dışa aktarma iki kez yazılmaz.
  const disaAktarmayiHazirla = async (vt: Veritabani, kimlik: string): Promise<void> => {
    if (!acikMi()) return;
    await vt.transaction(async (islem) => {
      const [kayit] = await islem
        .select()
        .from(excelDisaAktarmalari)
        .where(eq(excelDisaAktarmalari.kimlik, kimlik))
        .for("update", { skipLocked: true });
      if (kayit === undefined || kayit.durum !== "hazirlaniyor") return;
      const kimlikler = await kapsaminUrunleri(vt, kayit.kapsam as ListeKapsami | null);
      const sozluk = await sozlukOku(islem);
      const yazilacak: Sutun[] = sutunlar.filter(
        (s) =>
          (kayit.fiyat_sutunlari || !(fiyatSutunlari as readonly Sutun[]).includes(s)) &&
          (kayit.stok_sutunu || s !== "stok"),
      );
      const degerler: IndirilenDegerler = { urunler: {}, birimler: {} };
      const satirlar: YazilacakSatir[] = [];
      for (let i = 0; i < kimlikler.length; i += 500) {
        for (const urun of await urunleriOku(islem, site, sozluk, kimlikler.slice(i, i + 500))) {
          degerler.urunler[urun.kimlik] = urun.duz;
          for (const birim of urun.birimler) {
            degerler.birimler[birim.kimlik] = Object.fromEntries(
              Object.entries(birim.duz).filter(([alan]) => yazilacak.includes(alan as Sutun)),
            );
            satirlar.push(
              dosyaSatiri(urun, birim, yazilacak, site.ayarlar.paraBicimi.ondalikSayisi),
            );
          }
        }
      }
      const dosya = await dosyaYaz({
        sutunlar: yazilacak,
        satirlar,
        kimlik: kayit.kimlik,
        tarih: yerelZamana(new Date(), site.ayarlar.saatDilimi).replace("T", " "),
      });
      await islem
        .update(excelDisaAktarmalari)
        .set({
          durum: "hazir",
          dosya,
          degerler,
          urun_sayisi: kimlikler.length,
          satir_sayisi: satirlar.length,
          bitis_zamani: sql`now()`,
        })
        .where(eq(excelDisaAktarmalari.kimlik, kimlik));
    });
  };

  // İşin son denemesi de düşünce dışa aktarma hatalı olur (isler.ts, sonHata).
  const disaAktarmaHatali = async (vt: Vt, kimlik: string): Promise<void> => {
    await vt
      .update(excelDisaAktarmalari)
      .set({ durum: "hatali", bitis_zamani: sql`now()` })
      .where(
        and(
          eq(excelDisaAktarmalari.kimlik, kimlik),
          eq(excelDisaAktarmalari.durum, "hazirlaniyor"),
        ),
      );
  };

  const disaAktarmaDurumu = async (
    vt: Vt,
    yonetici: string,
    kimlik?: string,
  ): Promise<DisaAktarmaDurumu | null> => {
    acik();
    if (kimlik !== undefined && !kimlikMi(kimlik)) return null;
    const [kayit] = await vt
      .select({
        kimlik: excelDisaAktarmalari.kimlik,
        durum: excelDisaAktarmalari.durum,
        urunSayisi: excelDisaAktarmalari.urun_sayisi,
        satirSayisi: excelDisaAktarmalari.satir_sayisi,
        olusturma: excelDisaAktarmalari.olusturma_zamani,
      })
      .from(excelDisaAktarmalari)
      .where(
        and(
          eq(excelDisaAktarmalari.yonetici_kimligi, yonetici),
          kimlik === undefined ? undefined : eq(excelDisaAktarmalari.kimlik, kimligiDuzelt(kimlik)),
        ),
      )
      .orderBy(desc(excelDisaAktarmalari.olusturma_zamani))
      .limit(1);
    return kayit === undefined
      ? null
      : { ...kayit, durum: kayit.durum as DisaAktarmaDurumu["durum"] };
  };

  const disaAktarmaDosyasi = async (
    vt: Vt,
    yonetici: string,
    kimlik: string,
  ): Promise<{ dosya: Buffer; olusturma: Date }> => {
    acik();
    if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
    const [kayit] = await vt
      .select({
        dosya: excelDisaAktarmalari.dosya,
        olusturma: excelDisaAktarmalari.olusturma_zamani,
      })
      .from(excelDisaAktarmalari)
      .where(
        and(
          eq(excelDisaAktarmalari.kimlik, kimligiDuzelt(kimlik)),
          eq(excelDisaAktarmalari.yonetici_kimligi, yonetici),
          eq(excelDisaAktarmalari.durum, "hazir"),
        ),
      );
    if (kayit?.dosya === undefined || kayit.dosya === null) throw new BilinenHata("bulunamadi");
    return { dosya: kayit.dosya, olusturma: kayit.olusturma };
  };

  // ——— İçe aktarma ———

  const iceAktarmaYukle = async (
    vt: Veritabani,
    yonetici: string,
    girdi: { dosya: Uint8Array; ad: string },
  ): Promise<string> => {
    acik();
    if (girdi.dosya.byteLength > excelAyari.enCokBayt)
      throw new BilinenHata("dogrulama", [{ alan: "dosya", kod: "excel-cok-buyuk" }]);
    const yetkiler = await yoneticininYetkileri(vt, yonetici);
    return vt.transaction(async (islem) => {
      // Yöneticinin açık içe aktarması (denetleniyor, önizleme) vazgeçilmiş sayılır.
      await islem
        .update(excelIceAktarmalari)
        .set({
          durum: "vazgecildi",
          dosya: null,
          bitis_zamani: sql`now()`,
          guncellenme_zamani: sql`now()`,
        })
        .where(
          and(
            eq(excelIceAktarmalari.yonetici_kimligi, yonetici),
            inArray(excelIceAktarmalari.durum, ["denetleniyor", "onizleme"]),
          ),
        );
      const [satir] = await islem
        .insert(excelIceAktarmalari)
        .values({
          yonetici_kimligi: yonetici,
          durum: "denetleniyor",
          dosya_adi: girdi.ad.slice(0, 200),
          dosya_boyutu: girdi.dosya.byteLength,
          dosya: Buffer.from(girdi.dosya),
          fiyat_izni: yetkiler("fiyat.degistir"),
          stok_izni: yetkiler("stok.duzelt"),
        })
        .returning({ kimlik: excelIceAktarmalari.kimlik });
      if (satir === undefined) throw new Error("İçe aktarma yazılamadı.");
      await isler.denetle(islem, satir.kimlik);
      return satir.kimlik;
    });
  };

  // Denetim işi: satırları denetler, sonucu yazar, durum önizleme olur. Kilitli satırda çalışır.
  const iceAktarmayiDenetle = async (vt: Veritabani, kimlik: string): Promise<void> => {
    if (!acikMi()) return;
    await vt.transaction(async (islem) => {
      const [kayit] = await islem
        .select()
        .from(excelIceAktarmalari)
        .where(eq(excelIceAktarmalari.kimlik, kimlik))
        .for("update", { skipLocked: true });
      if (kayit === undefined || kayit.durum !== "denetleniyor" || kayit.dosya === null) return;
      let okunan: Awaited<ReturnType<typeof dosyaOku>>;
      try {
        okunan = await dosyaOku(kayit.dosya, site.ayarlar.excelSatirSiniri);
      } catch (hata) {
        if (!(hata instanceof DosyaOkunamadi)) throw hata;
        await islem
          .update(excelIceAktarmalari)
          .set({
            durum: "okunamadi",
            neden: hata.ayrinti === undefined ? hata.kod : `${hata.kod}:${hata.ayrinti}`,
            dosya: null,
            bitis_zamani: sql`now()`,
            guncellenme_zamani: sql`now()`,
          })
          .where(eq(excelIceAktarmalari.kimlik, kimlik));
        return;
      }
      const indirilen = await indirilenDegerler(islem, okunan.disaAktarma);
      const vergiSinifi =
        (await siteninVergiServisi(site).tabloyuOku(islem)).find((s) => !s.silindi)?.kimlik ?? null;
      const satirlar = await satirlariDenetle(islem, {
        site,
        sozluk: await sozlukOku(islem),
        dosya: okunan,
        indirilen,
        izinler: { fiyat: kayit.fiyat_izni, stok: kayit.stok_izni },
        vergiSinifi,
      });
      for (let i = 0; i < satirlar.length; i += 500) {
        await islem
          .insert(excelIceAktarmaSatirlari)
          .values(satirlar.slice(i, i + 500).map((satir) => satirKaydi(kimlik, satir)));
      }
      await islem
        .update(excelIceAktarmalari)
        .set({
          durum: "onizleme",
          satir_sayisi: satirlar.length,
          disa_aktarma_kimligi: indirilen === null ? null : okunan.disaAktarma,
          guncellenme_zamani: sql`now()`,
        })
        .where(eq(excelIceAktarmalari.kimlik, kimlik));
    });
  };

  // Dosyanın "Bilgi" sayfasındaki dışa aktarmanın indirildiği andaki değerleri (kaydı silinmediyse).
  const indirilenDegerler = async (
    vt: Vt,
    kimlik: string | null,
  ): Promise<IndirilenDegerler | null> => {
    if (kimlik === null || !kimlikMi(kimlik)) return null;
    const [kayit] = await vt
      .select({ degerler: excelDisaAktarmalari.degerler })
      .from(excelDisaAktarmalari)
      .where(
        and(
          eq(excelDisaAktarmalari.kimlik, kimligiDuzelt(kimlik)),
          eq(excelDisaAktarmalari.durum, "hazir"),
        ),
      );
    return (kayit?.degerler as IndirilenDegerler | undefined) ?? null;
  };

  const yoneticininIsi = async (vt: Vt, yonetici: string, kimlik: string) => {
    if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
    const [kayit] = await vt
      .select()
      .from(excelIceAktarmalari)
      .where(
        and(
          eq(excelIceAktarmalari.kimlik, kimligiDuzelt(kimlik)),
          eq(excelIceAktarmalari.yonetici_kimligi, yonetici),
        ),
      );
    if (kayit === undefined) throw new BilinenHata("bulunamadi");
    return kayit;
  };

  // Yöneticinin içe aktarmasının durumu ve önizlemesi; kimlik verilmezse son içe aktarması (bitmiş ya da vazgeçilmiş
  // olsa da). Önizlemede her listeden en çok excelAyari.onizlemeSatiri satır gelir.
  const iceAktarmaDurumu = async (
    vt: Vt,
    yonetici: string,
    kimlik?: string,
  ): Promise<IceAktarmaDurumu | null> => {
    acik();
    let kayit: typeof excelIceAktarmalari.$inferSelect | undefined;
    if (kimlik === undefined) {
      [kayit] = await vt
        .select()
        .from(excelIceAktarmalari)
        .where(eq(excelIceAktarmalari.yonetici_kimligi, yonetici))
        .orderBy(desc(excelIceAktarmalari.olusturma_zamani))
        .limit(1);
      if (kayit === undefined) return null;
    } else {
      kayit = await yoneticininIsi(vt, yonetici, kimlik);
    }
    const sayimlar = await vt
      .select({
        sonuc: excelIceAktarmaSatirlari.sonuc,
        adet: sql<number>`count(*)`.mapWith(Number),
        uygulanan:
          sql<number>`count(*) filter (where ${excelIceAktarmaSatirlari.uygulandi} and ${excelIceAktarmaSatirlari.uygulama_hatasi} is null and ${excelIceAktarmaSatirlari.sonuc} in ('ekle', 'degistir'))`.mapWith(
            Number,
          ),
        uygulanamayan:
          sql<number>`count(*) filter (where ${excelIceAktarmaSatirlari.uygulama_hatasi} is not null)`.mapWith(
            Number,
          ),
      })
      .from(excelIceAktarmaSatirlari)
      .where(eq(excelIceAktarmaSatirlari.is_kimligi, kayit.kimlik))
      .groupBy(excelIceAktarmaSatirlari.sonuc);
    const sayilar = { ekle: 0, degistir: 0, ayni: 0, hatali: 0 };
    let uygulanan = 0;
    let uygulanamayan = 0;
    let eklenen = 0;
    let degisen = 0;
    for (const s of sayimlar) {
      sayilar[s.sonuc as keyof typeof sayilar] = s.adet;
      uygulanan += s.uygulanan;
      uygulanamayan += s.uygulanamayan;
      if (s.sonuc === "ekle") eklenen += s.uygulanan;
      if (s.sonuc === "degistir") degisen += s.uygulanan;
    }
    const liste = async (kosul: ReturnType<typeof eq>): Promise<OnizlemeSatiri[]> =>
      (
        await vt
          .select({
            no: excelIceAktarmaSatirlari.satir_no,
            ad: excelIceAktarmaSatirlari.ad,
            degisiklikler: excelIceAktarmaSatirlari.degisiklikler,
            hatalar: excelIceAktarmaSatirlari.hatalar,
            uygulamaHatasi: excelIceAktarmaSatirlari.uygulama_hatasi,
          })
          .from(excelIceAktarmaSatirlari)
          .where(and(eq(excelIceAktarmaSatirlari.is_kimligi, kayit.kimlik), kosul))
          .orderBy(asc(excelIceAktarmaSatirlari.satir_no))
          .limit(excelAyari.onizlemeSatiri)
      ).map((s) => ({
        no: s.no,
        ad: s.ad,
        degisiklikler: s.degisiklikler as OnizlemeSatiri["degisiklikler"],
        hatalar: s.hatalar as OnizlemeSatiri["hatalar"],
        ...(s.uygulamaHatasi === null ? {} : { uygulamaHatasi: s.uygulamaHatasi }),
      }));
    const [hatalilar, degisecekler, eklenecekler, uygulanamayanlar] = await Promise.all([
      liste(eq(excelIceAktarmaSatirlari.sonuc, "hatali")),
      liste(eq(excelIceAktarmaSatirlari.sonuc, "degistir")),
      liste(eq(excelIceAktarmaSatirlari.sonuc, "ekle")),
      liste(sql`${excelIceAktarmaSatirlari.uygulama_hatasi} is not null` as ReturnType<typeof eq>),
    ]);
    const [neden, nedenAyrintisi] = (kayit.neden ?? "").split(":");
    return {
      kimlik: kayit.kimlik,
      durum: kayit.durum as ExcelIceAktarmaDurumu,
      dosyaAdi: kayit.dosya_adi,
      dosyaBoyutu: kayit.dosya_boyutu,
      ...(neden === undefined || neden === "" ? {} : { neden }),
      ...(nedenAyrintisi === undefined ? {} : { nedenAyrintisi }),
      satirSayisi: kayit.satir_sayisi,
      sayilar,
      uygulama: {
        toplam: sayilar.ekle + sayilar.degistir,
        uygulanan,
        uygulanamayan,
        eklenen,
        degisen,
      },
      hatalilar,
      degisecekler,
      eklenecekler,
      uygulanamayanlar,
    };
  };

  // Önizlemenin onayı: hatalı satır yoksa ve değişecek ya da eklenecek satır varsa iş uygulanmaya başlar.
  const uygula = async (vt: Veritabani, yonetici: string, kimlik: string): Promise<void> => {
    acik();
    await vt.transaction(async (islem) => {
      const kayit = await yoneticininIsi(islem, yonetici, kimlik);
      const [kilitli] = await islem
        .select({ durum: excelIceAktarmalari.durum })
        .from(excelIceAktarmalari)
        .where(eq(excelIceAktarmalari.kimlik, kayit.kimlik))
        .for("update");
      if (kilitli?.durum !== "onizleme")
        throw new BilinenHata("cakisma", [{ alan: "durum", kod: "excel-onizlemede-degil" }]);
      const [sayim] = await islem
        .select({
          hatali:
            sql<number>`count(*) filter (where ${excelIceAktarmaSatirlari.sonuc} = 'hatali')`.mapWith(
              Number,
            ),
          yazilacak:
            sql<number>`count(*) filter (where ${excelIceAktarmaSatirlari.sonuc} in ('ekle', 'degistir'))`.mapWith(
              Number,
            ),
        })
        .from(excelIceAktarmaSatirlari)
        .where(eq(excelIceAktarmaSatirlari.is_kimligi, kayit.kimlik));
      if ((sayim?.hatali ?? 0) > 0)
        throw new BilinenHata("is-kurali", [{ alan: "dosya", kod: "excel-hatali-satir" }]);
      if ((sayim?.yazilacak ?? 0) === 0)
        throw new BilinenHata("is-kurali", [{ alan: "dosya", kod: "excel-degisiklik-yok" }]);
      await islem
        .update(excelIceAktarmalari)
        .set({ durum: "uygulaniyor", guncellenme_zamani: sql`now()` })
        .where(eq(excelIceAktarmalari.kimlik, kayit.kimlik));
      await isler.uygula(islem, kayit.kimlik);
    });
  };

  const vazgec = async (vt: Veritabani, yonetici: string, kimlik: string): Promise<void> => {
    acik();
    const kayit = await yoneticininIsi(vt, yonetici, kimlik);
    const guncellenen = await vt
      .update(excelIceAktarmalari)
      .set({
        durum: "vazgecildi",
        dosya: null,
        bitis_zamani: sql`now()`,
        guncellenme_zamani: sql`now()`,
      })
      .where(
        and(
          eq(excelIceAktarmalari.kimlik, kayit.kimlik),
          inArray(excelIceAktarmalari.durum, ["denetleniyor", "onizleme"]),
        ),
      )
      .returning({ kimlik: excelIceAktarmalari.kimlik });
    if (guncellenen.length === 0)
      throw new BilinenHata("cakisma", [{ alan: "durum", kod: "excel-onizlemede-degil" }]);
  };

  // Uygulama işi: en çok excelAyari.parti ürün grubu yazar; kalan varsa sonraki parti kuyruğa girer. Her grup kendi
  // işlemindedir; grubun satırları aynı işlemde "uygulandı" işaretlenir. Bilinen hata (servisin kuralı, önizlemeden
  // sonra değişen değer) grubu "uygulanamadı" yapar, ötekiler sürer.
  const uygulamaPartisi = async (vt: Veritabani, kimlik: string): Promise<boolean> => {
    if (!acikMi()) return false;
    const [kayit] = await vt
      .select()
      .from(excelIceAktarmalari)
      .where(eq(excelIceAktarmalari.kimlik, kimlik));
    if (kayit === undefined || kayit.durum !== "uygulaniyor") return false;
    const yetkiler = await yoneticininYetkileri(vt, kayit.yonetici_kimligi);
    const sozluk = await sozlukOku(vt);
    const gruplar = await vt
      .select({
        grup: excelIceAktarmaSatirlari.grup,
        ilk: sql<number>`min(${excelIceAktarmaSatirlari.satir_no})`,
      })
      .from(excelIceAktarmaSatirlari)
      .where(
        and(
          eq(excelIceAktarmaSatirlari.is_kimligi, kimlik),
          eq(excelIceAktarmaSatirlari.uygulandi, false),
          inArray(excelIceAktarmaSatirlari.sonuc, ["ekle", "degistir"]),
        ),
      )
      .groupBy(excelIceAktarmaSatirlari.grup)
      .orderBy(sql`min(${excelIceAktarmaSatirlari.satir_no})`)
      .limit(excelAyari.parti);
    for (const { grup } of gruplar) {
      const isaretle = (islem: VeritabaniIslemi, hata: string | null) =>
        islem
          .update(excelIceAktarmaSatirlari)
          .set({ uygulandi: true, uygulama_hatasi: hata })
          .where(
            and(
              eq(excelIceAktarmaSatirlari.is_kimligi, kimlik),
              eq(excelIceAktarmaSatirlari.grup, grup),
              eq(excelIceAktarmaSatirlari.uygulandi, false),
              inArray(excelIceAktarmaSatirlari.sonuc, ["ekle", "degistir"]),
            ),
          );
      try {
        await vt.transaction(async (islem) => {
          // Grubun satırları kilitlenir: aynı anda iki iş aynı grubu yazmaz.
          const satirlar = await islem
            .select()
            .from(excelIceAktarmaSatirlari)
            .where(
              and(
                eq(excelIceAktarmaSatirlari.is_kimligi, kimlik),
                eq(excelIceAktarmaSatirlari.grup, grup),
                eq(excelIceAktarmaSatirlari.uygulandi, false),
              ),
            )
            .orderBy(asc(excelIceAktarmaSatirlari.satir_no))
            .for("update", { skipLocked: true });
          const yazilacaklar = satirlar.filter(
            (s) => (s.sonuc === "ekle" || s.sonuc === "degistir") && s.yazilacak !== null,
          );
          if (yazilacaklar.length === 0) return;
          // Yükleyenin bugünkü izni: fiyatı ya da stoğu değiştiren satır izin ister.
          const fiyatli = yazilacaklar.some(
            (s) => (s.yazilacak as Yazilacak).alanlar.fiyat !== undefined,
          );
          const stoklu = yazilacaklar.some(
            (s) => (s.yazilacak as Yazilacak).alanlar.stok !== undefined,
          );
          if (
            !yetkiler("urun.degistir") ||
            (fiyatli && !yetkiler("fiyat.degistir")) ||
            (stoklu && !yetkiler("stok.duzelt"))
          ) {
            throw new BilinenHata("yetki");
          }
          await grubuUygula(
            islem,
            site,
            sozluk,
            yapan(kayit.yonetici_kimligi),
            yazilacaklar.map((s) => ({
              no: s.satir_no,
              yazilacak: s.yazilacak as Yazilacak,
              gorulen: s.gorulen as Gorulen | null,
            })),
          );
          await isaretle(islem, null);
        });
      } catch (hata) {
        if (!(hata instanceof BilinenHata)) throw hata;
        const ilkSorun = Array.isArray(hata.ayrinti)
          ? (hata.ayrinti[0] as { kod?: unknown } | undefined)
          : undefined;
        const kod = typeof ilkSorun?.kod === "string" ? ilkSorun.kod : hata.kod;
        await vt.transaction((islem) => isaretle(islem, kod));
      }
    }
    const [kalan] = await vt
      .select({ adet: sql<number>`count(*)`.mapWith(Number) })
      .from(excelIceAktarmaSatirlari)
      .where(
        and(
          eq(excelIceAktarmaSatirlari.is_kimligi, kimlik),
          eq(excelIceAktarmaSatirlari.uygulandi, false),
          inArray(excelIceAktarmaSatirlari.sonuc, ["ekle", "degistir"]),
        ),
      );
    if ((kalan?.adet ?? 0) > 0) {
      await vt
        .update(excelIceAktarmalari)
        .set({ guncellenme_zamani: sql`now()` })
        .where(eq(excelIceAktarmalari.kimlik, kimlik));
      return true;
    }
    await vt
      .update(excelIceAktarmalari)
      .set({
        durum: "bitti",
        dosya: null,
        bitis_zamani: sql`now()`,
        guncellenme_zamani: sql`now()`,
      })
      .where(
        and(eq(excelIceAktarmalari.kimlik, kimlik), eq(excelIceAktarmalari.durum, "uygulaniyor")),
      );
    return false;
  };

  // Denetimin son denemesi de düşünce dosya okunamadı sayılır.
  const denetimHatali = async (vt: Vt, kimlik: string): Promise<void> => {
    await vt
      .update(excelIceAktarmalari)
      .set({
        durum: "okunamadi",
        neden: "excel-dosyasi-degil",
        dosya: null,
        bitis_zamani: sql`now()`,
      })
      .where(
        and(eq(excelIceAktarmalari.kimlik, kimlik), eq(excelIceAktarmalari.durum, "denetleniyor")),
      );
  };

  // Zamanlı tarama: uzun süredir ilerlemeyen işler (eklenti kapalıydı, iş son denemesini bitirmeden süreç durdu)
  // yeniden kuyruğa girer. İşler kilitle çalıştığı için aynı iş iki kez yazmaz.
  const takilanlariSurdur = async (vt: Veritabani): Promise<number> => {
    if (!acikMi()) return 0;
    const esik = sql`now() - make_interval(mins => ${excelAyari.taramaDakika})`;
    const disa = await vt
      .select({ kimlik: excelDisaAktarmalari.kimlik })
      .from(excelDisaAktarmalari)
      .where(
        and(
          eq(excelDisaAktarmalari.durum, "hazirlaniyor"),
          lt(excelDisaAktarmalari.olusturma_zamani, esik),
        ),
      );
    const ice = await vt
      .select({ kimlik: excelIceAktarmalari.kimlik, durum: excelIceAktarmalari.durum })
      .from(excelIceAktarmalari)
      .where(
        and(
          inArray(excelIceAktarmalari.durum, ["denetleniyor", "uygulaniyor"]),
          lt(excelIceAktarmalari.guncellenme_zamani, esik),
        ),
      );
    for (const { kimlik } of disa) await isler.disaAktar(vt, kimlik);
    for (const { kimlik, durum } of ice) {
      await (durum === "denetleniyor" ? isler.denetle(vt, kimlik) : isler.uygula(vt, kimlik));
      await vt
        .update(excelIceAktarmalari)
        .set({ guncellenme_zamani: sql`now()` })
        .where(eq(excelIceAktarmalari.kimlik, kimlik));
    }
    return disa.length + ice.length;
  };

  // Saklama süresi dolan kayıtlar silinir (eklenti kapalıyken de).
  const eskileriSil = async (vt: Veritabani): Promise<number> => {
    const esik = sql`now() - make_interval(days => ${excelAyari.saklamaGun})`;
    const disa = await vt
      .delete(excelDisaAktarmalari)
      .where(lt(excelDisaAktarmalari.olusturma_zamani, esik))
      .returning({ kimlik: excelDisaAktarmalari.kimlik });
    const ice = await vt
      .delete(excelIceAktarmalari)
      .where(lt(excelIceAktarmalari.olusturma_zamani, esik))
      .returning({ kimlik: excelIceAktarmalari.kimlik });
    return disa.length + ice.length;
  };

  return {
    disaAktarmaBaslat,
    disaAktarmayiHazirla,
    disaAktarmaHatali,
    disaAktarmaDurumu,
    disaAktarmaDosyasi,
    iceAktarmaYukle,
    iceAktarmayiDenetle,
    denetimHatali,
    iceAktarmaDurumu,
    uygula,
    vazgec,
    uygulamaPartisi,
    takilanlariSurdur,
    eskileriSil,
  };
};

// Dosyanın bir satırı: ürünün ortak bilgileri ve birimin bilgileri; tutar ve stok sayı hücresidir.
const dosyaSatiri = (
  urun: KatalogUrunu,
  birim: KatalogUrunu["birimler"][number],
  yazilacak: readonly Sutun[],
  ondalikSayisi: number,
): YazilacakSatir => {
  const tutar = (duz: string) => (duz === "" ? null : Number(duz) / 10 ** ondalikSayisi);
  const satir: YazilacakSatir = {
    urunKodu: urun.adresAdi,
    ad: urun.duz.ad,
    secenekler: birim.seceneklerYazisi,
    stokKodu: birim.duz.stokKodu,
    barkod: birim.duz.barkod,
    satisFiyati: tutar(birim.duz.satisFiyati),
    indirimliFiyat: tutar(birim.duz.indirimliFiyat),
    indirimBaslangici: birim.duz.indirimBaslangici,
    indirimBitisi: birim.duz.indirimBitisi,
    stok: Number(birim.duz.stok),
    durum: urun.duz.durum,
    kategoriler: urun.duz.kategoriler,
    marka: urun.duz.marka,
    etiketler: urun.duz.etiketler,
    ozellikler: urun.duz.ozellikler,
  };
  return Object.fromEntries(
    Object.entries(satir).filter(([alan]) => yazilacak.includes(alan as Sutun)),
  );
};

const satirKaydi = (is: string, satir: DenetlenenSatir) => ({
  is_kimligi: is,
  satir_no: satir.no,
  grup: satir.grup,
  sonuc: satir.sonuc,
  urun_kimligi: satir.urunKimligi,
  birim_kimligi: satir.birimKimligi,
  ad: satir.ad.slice(0, 500),
  degisiklikler: satir.degisiklikler,
  hatalar: satir.hatalar,
  gorulen: satir.gorulen,
  yazilacak: satir.yazilacak,
});
