// Yüklenen dosyanın satırlarının denetimi (kart 0315). Her satır sitenin şimdiki hâliyle ve (dosya buradan
// indirildiyse) indirildiği andaki değerlerle karşılaştırılır; sonuç eklenecek, değişecek, değişmeyecek ya da
// hatalıdır. Hiçbir şey yazılmaz: yazılacak hâl satırla saklanır, uygulama (uygulama.ts) onu yazar.
//
// Kurallar (tarif ve karar 0185):
// - Boş hücre alanı değiştirmez; "-" boşaltır (yalnız boşalabilen alanda).
// - Hücre indirildiği andaki değere eşitse alan değişmez (site arada değişmiş olsa da). Hem dosyada hem sitede
//   değişmiş alan hatalıdır: arada satılan ürünün eski stoğu geri yazılmaz (kullanıcı kararı).
// - Ürün kodu ürünü tanır (adres adı ya da eski adresi); birleşimi ürün kodu ile seçenekler tanır. Kodu sitede olmayan
//   satır yeni ürün, var olan üründe yeni seçenek değeri yeni birleşimdir. Var olan ürüne yeni seçenek eklenmez.
// - Dosyada olmayan ürün değişmez (kullanıcı kararı). Sitede olmayan kategori, marka, etiket hatalıdır (kullanıcı
//   kararı). Durumu boş yeni ürün taslaktır (kullanıcı kararı).
// - Fiyatı değiştiren satır fiyat.degistir, stoğu değiştiren satır stok.duzelt izni ister.
import { and, inArray, isNull, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { ozellikSinirlari } from "../../kayitlar/ozellik.ts";
import type { UrunDurumu } from "../../kayitlar/urun.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import { yerelZamana, yerelZamandan } from "../../metinler/bicimleyici.ts";
import { metin as metinOku, siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { fiyatGirdisi } from "../../moduller/fiyat/semalar.ts";
import { barkoduDogrula } from "../../moduller/urun/barkod.ts";
import { urunBirimleri } from "../../moduller/urun/model.ts";
import { urunDegisikligi } from "../../moduller/urun/semalar.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import type { OkunanDosya, OkunanHucre, OkunanSatir } from "./dosya.ts";
import {
  adlaBul,
  durumAdi,
  durumBul,
  type KatalogBirimi,
  kurusYazisi,
  type Sozluk,
  urunKodlariniBul,
  urunleriOku,
} from "./katalog.ts";
import {
  adDegerAyir,
  type BirimSutunu,
  birimAnahtari,
  bosalabilenSutunlar,
  type DuzBirim,
  type DuzOrtak,
  fiyatSutunlari,
  hucreMetni,
  type IndirilenDegerler,
  listeYazisi,
  listeyiAyir,
  type OrtakSutun,
  ortakSutunlar,
  type Sutun,
  secenekAnahtari,
  silmeIsareti,
} from "./sutunlar.ts";

type Vt = Veritabani | VeritabaniIslemi;

export type SatirHatasi = { kod: string; alan?: Sutun; deger?: string };
export type Degisiklik = { alan: Sutun; simdi: string; yeni: string };

// Ürünün yazılacak ortak bilgileri (yalnız değişenler) ve yeni üründe hepsi.
export type YazilacakOrtak = {
  ad?: string;
  durum?: UrunDurumu;
  kategoriler?: string[];
  marka?: string | null;
  etiketler?: string[];
  ozellikler?: { ozellik: string; deger: string | number | boolean }[];
};
export type YazilacakFiyat = {
  satisFiyati: number;
  indirimliFiyat: number | null;
  indirimBaslangici: string | null;
  indirimBitisi: string | null;
};
export type YazilacakBirim = {
  stokKodu?: string | null;
  barkod?: string | null;
  fiyat?: YazilacakFiyat;
  stok?: number;
};
// Satırın yazılacak hâli. Ürünün ortak bilgileri grubun her satırında aynıdır; uygulama ilk satırınkini yazar.
export type Yazilacak = {
  urun:
    | { tur: "var"; kimlik: string }
    | { tur: "yeni"; kod: string | null; vergiSinifi: string | null };
  // Yeni üründe seçeneklerin adları ve değerleri, dosyanın sırasıyla.
  secenekler: { ad: string; degerler: string[] }[];
  ortak: YazilacakOrtak;
  birim:
    | { tur: "var"; kimlik: string; basit: boolean }
    | { tur: "yeni"; degerler: { secenek: string; deger: string }[] };
  alanlar: YazilacakBirim;
};
// Önizlemede okunan şimdiki değerler: uygulamada değişmişse grup uygulanmaz.
export type Gorulen = { ortak: DuzOrtak; birim: Required<DuzBirim> | null; stok: number | null };

export type DenetlenenSatir = {
  no: number;
  grup: string;
  sonuc: "ekle" | "degistir" | "ayni" | "hatali";
  urunKimligi: string | null;
  birimKimligi: string | null;
  ad: string;
  degisiklikler: Degisiklik[];
  hatalar: SatirHatasi[];
  gorulen: Gorulen | null;
  yazilacak: Yazilacak | null;
};

export type DenetimGirdisi = {
  site: Site;
  sozluk: Sozluk;
  dosya: OkunanDosya;
  // İndirildiği andaki değerler (dosya buradan indirildiyse ve kaydı duruyorsa).
  indirilen: IndirilenDegerler | null;
  izinler: { fiyat: boolean; stok: boolean };
  // Yeni ürünün vergi sınıfı: panelin yeni ürününkiyle aynı, silinmemiş ilk sınıf.
  vergiSinifi: string | null;
};

// Okunan hücrenin metni; sayı ve tarih hücresi de metne çevrilir (kod, ad).
const metinHucresi = (hucre: OkunanHucre | undefined): string | undefined => {
  if (hucre === undefined) return undefined;
  if (hucre instanceof Date) return excelTarihi(hucre);
  return hucreMetni(String(hucre));
};

// Excel'in tarih hücresi saat dilimsizdir: okuyucu onu UTC olarak verir. Yazılan duvar saati geri kurulur.
const excelTarihi = (an: Date): string => yerelZamana(an, "UTC").replace("T", " ");

// Hücrenin anlamı: yok (boş, değiştirme), sil ("-") ya da değer.
type Hucre = { tur: "yok" } | { tur: "sil" } | { tur: "deger"; deger: OkunanHucre };
const hucre = (satir: OkunanSatir, sutun: Sutun): Hucre => {
  const deger = satir.hucreler[sutun];
  if (deger === undefined) return { tur: "yok" };
  if (typeof deger === "string" && hucreMetni(deger) === silmeIsareti) return { tur: "sil" };
  return { tur: "deger", deger };
};

// Sütunun okunmuş düz değeri ve yazılacak değeri; okunamazsa hata.
type Okunan<T> = { duz: string; deger: T } | { hata: SatirHatasi };

export const satirlariDenetle = async (
  vt: Vt,
  girdi: DenetimGirdisi,
): Promise<DenetlenenSatir[]> => {
  const { site, sozluk, dosya, indirilen, izinler } = girdi;
  const b = siteninBicimleyicisi(site.ayarlar);
  const dil = site.ayarlar.dil;
  const saatDilimi = site.ayarlar.saatDilimi;

  // Satırların ürün kodları ve grupları.
  const kodlar = dosya.satirlar.map((satir) =>
    (metinHucresi(satir.hucreler.urunKodu) ?? "").toLocaleLowerCase("tr"),
  );
  const kimlikler = await urunKodlariniBul(
    vt,
    kodlar.filter((kod) => kod !== ""),
  );
  // Satır indirildiği andaki ürüne bağlanır: ürün kodu sonradan başka ürüne geçmiş ya da ürün silinmiş olabilir.
  const hedefler = new Map<string, string>();
  for (const kod of new Set(kodlar)) {
    if (kod === "") continue;
    const kimlik = indirilen?.kodlar?.[kod] ?? kimlikler.get(kod);
    if (kimlik !== undefined) hedefler.set(kod, kimlik);
  }
  const katalog = new Map(
    (await urunleriOku(vt, site, sozluk, [...new Set(hedefler.values())])).map((u) => [
      u.kimlik,
      u,
    ]),
  );

  // ——— Hücrelerin okunması ———
  const tutarOku = (h: OkunanHucre, alan: Sutun): Okunan<number> => {
    const kurus =
      typeof h === "number"
        ? Number.isFinite(h)
          ? Math.round(h * 10 ** site.ayarlar.paraBicimi.ondalikSayisi)
          : undefined
        : typeof h === "string"
          ? b.paraOku(hucreMetni(h))
          : undefined;
    if (kurus === undefined || kurus < 0 || !Number.isSafeInteger(kurus)) {
      return { hata: { kod: "tutar-okunamadi", alan, deger: String(h) } };
    }
    return { duz: kurusYazisi(kurus), deger: kurus };
  };
  const zamanOku = (h: OkunanHucre, alan: Sutun): Okunan<string> => {
    const yazi = h instanceof Date ? excelTarihi(h) : hucreMetni(String(h));
    const yerel = yazi.replace(" ", "T");
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(yerel) ||
      yerelZamandan(yerel, saatDilimi) === undefined
    ) {
      return { hata: { kod: "zaman-okunamadi", alan, deger: yazi } };
    }
    return { duz: yazi, deger: yerel };
  };
  const stokOku = (h: OkunanHucre): Okunan<number> => {
    const sayi =
      typeof h === "number" ? h : typeof h === "string" ? Number(hucreMetni(h)) : Number.NaN;
    if (!Number.isInteger(sayi) || sayi < 0 || sayi > 1_000_000_000) {
      return { hata: { kod: "stok-okunamadi", alan: "stok", deger: String(h) } };
    }
    return { duz: String(sayi), deger: sayi };
  };

  // Ortak bir sütunun okunması: düz değer ve yazılacak değer.
  const ortakOku = (sutun: OrtakSutun, h: Hucre): Okunan<YazilacakOrtak[OrtakSutun]> | null => {
    if (h.tur === "yok") return null;
    if (h.tur === "sil") {
      if (!bosalabilenSutunlar.includes(sutun))
        return { hata: { kod: "bosaltilamaz", alan: sutun } };
      return { duz: "", deger: sutun === "marka" ? null : [] };
    }
    const yazi = metinHucresi(h.deger) ?? "";
    switch (sutun) {
      case "ad": {
        // Ürün servisinin ad kuralı (uzunluk, kayda yazılamayan metin): önizlemede yakalanır.
        const sorun = urunKuralSorunu({ ad: yazi });
        if (sorun !== undefined) return { hata: { kod: sorun, alan: sutun } };
        return { duz: yazi, deger: yazi };
      }
      case "durum": {
        const durum = durumBul(yazi);
        if (durum === undefined) return { hata: { kod: "durum-yok", alan: sutun, deger: yazi } };
        return { duz: durumAdi(durum), deger: durum };
      }
      case "kategoriler":
      case "etiketler": {
        const liste = sutun === "kategoriler" ? sozluk.kategoriler : sozluk.etiketler;
        const bulunanlar = [];
        for (const ad of listeyiAyir(yazi)) {
          const kayit = adlaBul(liste, ad);
          if (kayit === undefined) {
            return {
              hata: {
                kod: sutun === "kategoriler" ? "kategori-yok" : "etiket-yok",
                alan: sutun,
                deger: ad,
              },
            };
          }
          bulunanlar.push(kayit);
        }
        return {
          duz: listeYazisi(
            bulunanlar.map((k) => k.ad),
            dil,
          ),
          deger: [...new Set(bulunanlar.map((k) => k.kimlik))],
        };
      }
      case "marka": {
        const kayit = adlaBul(sozluk.markalar, yazi);
        if (kayit === undefined) return { hata: { kod: "marka-yok", alan: sutun, deger: yazi } };
        return { duz: kayit.ad, deger: kayit.kimlik };
      }
      case "ozellikler": {
        const degerler: { ozellik: string; deger: string | number | boolean }[] = [];
        const yazilar: string[] = [];
        for (const oge of listeyiAyir(yazi)) {
          const ayrik = adDegerAyir(oge);
          if (ayrik === undefined)
            return { hata: { kod: "ozellik-okunamadi", alan: sutun, deger: oge } };
          const ozellik = adlaBul(sozluk.ozellikler, ayrik.ad);
          const tanim = sozluk.ozellikler.find((o) => o.kimlik === ozellik?.kimlik);
          if (tanim === undefined)
            return { hata: { kod: "ozellik-yok", alan: sutun, deger: ayrik.ad } };
          if (degerler.some((d) => d.ozellik === tanim.kimlik)) {
            return { hata: { kod: "ozellik-tekrar", alan: sutun, deger: tanim.ad } };
          }
          let deger: string | number | boolean | undefined;
          let gosterim = ayrik.deger;
          if (tanim.tur === "metin") {
            deger = ayrik.deger.length <= ozellikSinirlari.metin ? ayrik.deger : undefined;
          } else if (tanim.tur === "sayi") {
            deger = b.sayiOku(ayrik.deger, ozellikSinirlari.ondalik, true);
            if (deger !== undefined)
              gosterim = b.sayi(deger, String(deger).split(".")[1]?.length ?? 0);
          } else if (tanim.tur === "evet-hayir") {
            const evet = durumsuzAnahtar(ayrik.deger);
            deger =
              evet === durumsuzAnahtar(sozlukMetni.evet())
                ? true
                : evet === durumsuzAnahtar(sozlukMetni.hayir())
                  ? false
                  : undefined;
            if (deger !== undefined) gosterim = deger ? sozlukMetni.evet() : sozlukMetni.hayir();
          } else {
            const secenek = adlaBul(tanim.secenekler, ayrik.deger);
            deger = secenek?.kimlik;
            if (secenek !== undefined) gosterim = secenek.ad;
          }
          if (deger === undefined) {
            return { hata: { kod: "ozellik-deger-gecersiz", alan: sutun, deger: oge } };
          }
          degerler.push({ ozellik: tanim.kimlik, deger });
          yazilar.push(`${tanim.ad}: ${gosterim}`);
        }
        return { duz: listeYazisi(yazilar, dil), deger: degerler };
      }
    }
  };

  const birimOku = (sutun: BirimSutunu, h: Hucre): Okunan<string | number | null> | null => {
    if (h.tur === "yok") return null;
    if (h.tur === "sil") {
      if (!bosalabilenSutunlar.includes(sutun))
        return { hata: { kod: "bosaltilamaz", alan: sutun } };
      return { duz: "", deger: null };
    }
    switch (sutun) {
      case "stokKodu": {
        const yazi = metinHucresi(h.deger) ?? "";
        const sorun = urunKuralSorunu({ stokKodu: yazi });
        if (sorun !== undefined) return { hata: { kod: sorun, alan: sutun } };
        return { duz: yazi, deger: yazi };
      }
      case "barkod": {
        const yazi = metinHucresi(typeof h.deger === "number" ? String(h.deger) : h.deger) ?? "";
        const temiz = barkoduDogrula(yazi);
        if (temiz === undefined)
          return { hata: { kod: "barkod-gecersiz", alan: sutun, deger: yazi } };
        return { duz: temiz, deger: temiz };
      }
      case "satisFiyati":
      case "indirimliFiyat":
        return tutarOku(h.deger, sutun);
      case "indirimBaslangici":
      case "indirimBitisi":
        return zamanOku(h.deger, sutun);
      case "stok":
        return stokOku(h.deger);
    }
  };

  // Bir hücre indirildiği andaki yazısıyla aynı mı: ad aranmadan, düz yazıyla (harf ve liste sırası ayırmaz).
  // Sitede adı değişen ya da silinen kategori, marka, etiket ve özellik dokunulmamış hücreyi hatalı yapmaz.
  const hamAnahtar = (sutun: OrtakSutun, yazi: string): string =>
    sutun === "kategoriler" || sutun === "etiketler" || sutun === "ozellikler"
      ? listeYazisi(
          listeyiAyir(yazi).map((oge) => oge.toLocaleLowerCase("tr")),
          dil,
        )
      : durumsuzAnahtar(hucreMetni(yazi));
  const ayniKalmis = (sutun: OrtakSutun, h: Hucre, indirildigi: string | undefined): boolean => {
    if (indirildigi === undefined || h.tur === "yok") return false;
    const yazi = h.tur === "sil" ? "" : (metinHucresi(h.deger) ?? "");
    return hamAnahtar(sutun, yazi) === hamAnahtar(sutun, indirildigi);
  };
  // Satırın hiçbir dolu hücresi indirildiği andan değişmemiş mi.
  const dokunulmamis = (
    satir: OkunanSatir,
    urunDuz: DuzOrtak | undefined,
    birimDuz: DuzBirim | undefined,
  ): boolean => {
    for (const sutun of ortakSutunlar) {
      const h = hucre(satir, sutun);
      if (h.tur === "yok") continue;
      if (!ayniKalmis(sutun, h, urunDuz?.[sutun])) return false;
    }
    for (const sutun of ["stokKodu", "barkod", ...fiyatSutunlari, "stok"] as const) {
      const okunan = birimOku(sutun, hucre(satir, sutun));
      if (okunan === null) continue;
      if (birimDuz === undefined || "hata" in okunan) return false;
      if (okunan.duz !== (birimDuz[sutun] ?? "")) return false;
    }
    return true;
  };

  // ——— Gruplar ———
  const gruplar = new Map<string, OkunanSatir[]>();
  dosya.satirlar.forEach((satir, i) => {
    const kod = kodlar[i] ?? "";
    const grup = kod === "" ? `#${satir.no}` : kod;
    gruplar.set(grup, [...(gruplar.get(grup) ?? []), satir]);
  });

  // Dosyadaki stok kodlarının sitedeki sahipleri (başka birimin kodunu alan satır hatalıdır).
  const stokKoduSahipleri = await stokKoduSahipleriniOku(
    vt,
    dosya.satirlar.flatMap((satir) => {
      const h = hucre(satir, "stokKodu");
      return h.tur === "deger" ? [(metinHucresi(h.deger) ?? "").toLocaleLowerCase("tr")] : [];
    }),
  );
  const dosyadakiStokKodlari = new Map<string, number[]>();

  const sonuclar: DenetlenenSatir[] = [];
  for (const [grup, satirlar] of gruplar) {
    const kimlik = grup.startsWith("#") ? undefined : hedefler.get(grup);
    const urun = kimlik === undefined ? undefined : katalog.get(kimlik);
    const kodsuz = grup.startsWith("#");

    // İndirildikten sonra sitede silinen ürün: dokunulmamış satır bir şey yapmaz, değiştirilmiş satır hatalıdır
    // (ürün yeniden açılmaz).
    const indirilenUrun = kimlik === undefined ? undefined : indirilen?.urunler[kimlik];
    if (kimlik !== undefined && urun === undefined && indirilenUrun !== undefined) {
      for (const satir of satirlar) {
        const yazi = metinHucresi(satir.hucreler.secenekler) ?? "";
        const ogeler = listeyiAyir(yazi).map(adDegerAyir);
        const birimKimligi = ogeler.some((oge) => oge === undefined)
          ? undefined
          : indirilen?.anahtarlar?.[
              birimAnahtari(kimlik, secenekAnahtari(ogeler as { ad: string; deger: string }[]))
            ];
        const ayni = dokunulmamis(
          satir,
          indirilenUrun,
          birimKimligi === undefined ? undefined : indirilen?.birimler[birimKimligi],
        );
        sonuclar.push({
          no: satir.no,
          grup,
          sonuc: ayni ? "ayni" : "hatali",
          urunKimligi: null,
          birimKimligi: null,
          ad: [indirilenUrun.ad, yazi].filter((parca) => parca !== "").join(" · "),
          degisiklikler: [],
          hatalar: ayni ? [] : [{ kod: "sitede-silindi", alan: "urunKodu" }],
          gorulen: null,
          yazilacak: null,
        });
      }
      continue;
    }

    // Ortak bilgiler: satırlar arasında çelişmemeli; boş hücre çelişmez.
    const ortakHatalari = new Map<number, SatirHatasi[]>();
    const ortakDegerler = new Map<OrtakSutun, { duz: string; deger: YazilacakOrtak[OrtakSutun] }>();
    for (const sutun of ortakSutunlar) {
      for (const satir of satirlar) {
        const h = hucre(satir, sutun);
        // İndirildiği andaki yazısıyla aynı hücre değişmez; ad aranmaz.
        if (urun !== undefined && ayniKalmis(sutun, h, indirilen?.urunler[urun.kimlik]?.[sutun]))
          continue;
        const okunan = ortakOku(sutun, h);
        if (okunan === null) continue;
        if ("hata" in okunan) {
          ortakHatalari.set(satir.no, [...(ortakHatalari.get(satir.no) ?? []), okunan.hata]);
          continue;
        }
        const onceki = ortakDegerler.get(sutun);
        if (onceki !== undefined && onceki.duz !== okunan.duz) {
          ortakHatalari.set(satir.no, [
            ...(ortakHatalari.get(satir.no) ?? []),
            { kod: "ortak-celisiyor", alan: sutun },
          ]);
          continue;
        }
        ortakDegerler.set(sutun, okunan);
      }
    }

    // Seçenekler: her satırda "Ad: değer" listesi.
    const satirSecenekleri = new Map<number, { ad: string; deger: string }[] | SatirHatasi>();
    for (const satir of satirlar) {
      const yazi = metinHucresi(satir.hucreler.secenekler) ?? "";
      const ogeler = listeyiAyir(yazi).map(adDegerAyir);
      if (ogeler.some((oge) => oge === undefined)) {
        satirSecenekleri.set(satir.no, {
          kod: "secenekler-okunamadi",
          alan: "secenekler",
          deger: yazi,
        });
      } else {
        satirSecenekleri.set(satir.no, ogeler as { ad: string; deger: string }[]);
      }
    }

    // Ürünün yazılacak ortak bilgileri ve değişiklikleri.
    const ortak: YazilacakOrtak = {};
    const ortakDegisiklikleri: Degisiklik[] = [];
    const grupHatalari: SatirHatasi[] = [];
    for (const [sutun, okunan] of ortakDegerler) {
      if (urun === undefined) {
        (ortak as Record<string, unknown>)[sutun] = okunan.deger;
        continue;
      }
      const simdi = urun.duz[sutun];
      const indirildigi = indirilen?.urunler[urun.kimlik]?.[sutun];
      const karar = alanKarari(okunan.duz, simdi, indirildigi);
      if (karar === "celiski") grupHatalari.push({ kod: "sitede-degisti", alan: sutun });
      if (karar !== "degistir") continue;
      if (sutun === "durum" && (okunan.deger === "zamanlanmis" || urun.durum === "zamanlanmis")) {
        // Zamanlanmış durumun yayın zamanı dosyada yoktur: panelden seçilir.
        if (okunan.deger === "zamanlanmis") {
          grupHatalari.push({ kod: "zamanlanmis-dosyadan-secilmez", alan: sutun });
          continue;
        }
      }
      (ortak as Record<string, unknown>)[sutun] = okunan.deger;
      ortakDegisiklikleri.push({ alan: sutun, simdi, yeni: okunan.duz });
    }
    if (urun === undefined) {
      if (ortak.ad === undefined) grupHatalari.push({ kod: "ad-gerekli", alan: "ad" });
      if (ortak.durum === "zamanlanmis")
        grupHatalari.push({ kod: "zamanlanmis-dosyadan-secilmez", alan: "durum" });
      if (!kodsuz && (!adresAdiKalibi.test(grup) || grup.length > adresAdiUzunlugu)) {
        grupHatalari.push({ kod: "urun-kodu-bicimi", alan: "urunKodu", deger: grup });
      }
    }

    // Seçeneklerin adları: grubun her satırında aynı adlar aynı sırayla.
    const ilkSecenekler = satirlar.map((s) => satirSecenekleri.get(s.no)).find(Array.isArray);
    const secenekAdlari = (ilkSecenekler ?? []).map((s) => s.ad.toLocaleLowerCase("tr"));
    const urunSecenekAdlari = urun?.secenekler.map((s) => s.ad.toLocaleLowerCase("tr"));
    const yeniSecenekler: { ad: string; degerler: string[] }[] = [];
    const gorulenBirimler = new Set<string>();
    const gorulenAnahtarlar = new Set<string>();

    for (const satir of satirlar) {
      const hatalar: SatirHatasi[] = [...(ortakHatalari.get(satir.no) ?? []), ...grupHatalari];
      const secenekler = satirSecenekleri.get(satir.no);
      let birim: KatalogBirimi | undefined;
      let yeniDegerler: { secenek: string; deger: string }[] | undefined;
      let silinenBirim: string | undefined;
      if (secenekler !== undefined && !Array.isArray(secenekler)) {
        hatalar.push(secenekler);
      } else {
        const liste = secenekler ?? [];
        const adlar = liste.map((s) => s.ad.toLocaleLowerCase("tr"));
        if (liste.length === 0 && (urunSecenekAdlari?.length ?? 0) > 0) {
          // Seçenekli ürünün satırı hangi birleşim olduğunu söylemeli.
          hatalar.push({ kod: "secenek-gerekli", alan: "secenekler" });
        } else if (adlar.join("\u0000") !== secenekAdlari.join("\u0000")) {
          hatalar.push({ kod: "secenekler-uyusmuyor", alan: "secenekler" });
        } else if (new Set(adlar).size !== adlar.length) {
          hatalar.push({ kod: "secenek-tekrar", alan: "secenekler" });
        } else if (urun !== undefined) {
          if (
            urunSecenekAdlari !== undefined &&
            adlar.join("\u0000") !== urunSecenekAdlari.join("\u0000")
          ) {
            // Var olan ürünün seçenekleri dosyadan değişmez (yeni seçenek panelden eklenir).
            hatalar.push({
              kod: liste.length === 0 ? "secenek-gerekli" : "yeni-secenek",
              alan: "secenekler",
            });
          } else {
            const anahtar = secenekAnahtari(liste);
            birim = urun.birimler.find((b2) => b2.secenekAnahtari === anahtar);
            const indirilenBirim = indirilen?.anahtarlar?.[birimAnahtari(urun.kimlik, anahtar)];
            if (birim === undefined && indirilenBirim !== undefined) {
              // İndirildikten sonra sitede silinen (ya da değeri yeniden adlandırılan) birleşim yeniden açılmaz.
              silinenBirim = indirilenBirim;
            } else if (birim === undefined) {
              if (liste.length === 0) hatalar.push({ kod: "secenek-gerekli", alan: "secenekler" });
              else yeniDegerler = liste.map((s) => ({ secenek: s.ad, deger: s.deger }));
            }
          }
        } else {
          if (liste.length === 0 && satirlar.length > 1)
            hatalar.push({ kod: "birlesim-tekrar", alan: "secenekler" });
          yeniDegerler = liste.map((s) => ({ secenek: s.ad, deger: s.deger }));
          liste.forEach((s, i) => {
            const secenek = yeniSecenekler[i] ?? { ad: s.ad, degerler: [] };
            yeniSecenekler[i] = secenek;
            if (
              !secenek.degerler.some(
                (d) => d.toLocaleLowerCase("tr") === s.deger.toLocaleLowerCase("tr"),
              )
            ) {
              secenek.degerler.push(s.deger);
            }
          });
        }
        const anahtar = secenekAnahtari(liste);
        if (
          birim !== undefined ? gorulenBirimler.has(birim.kimlik) : gorulenAnahtarlar.has(anahtar)
        ) {
          hatalar.push({ kod: "birlesim-tekrar", alan: "secenekler" });
        }
        if (birim !== undefined) gorulenBirimler.add(birim.kimlik);
        gorulenAnahtarlar.add(anahtar);
      }

      if (silinenBirim !== undefined && urun !== undefined) {
        const ayni = dokunulmamis(
          satir,
          indirilen?.urunler[urun.kimlik],
          indirilen?.birimler[silinenBirim],
        );
        const tumu: SatirHatasi[] = ayni
          ? hatalar
          : [...hatalar, { kod: "sitede-silindi", alan: "secenekler" }];
        sonuclar.push({
          no: satir.no,
          grup,
          sonuc: tumu.length > 0 ? "hatali" : "ayni",
          urunKimligi: urun.kimlik,
          birimKimligi: null,
          ad: [urun.duz.ad, metinHucresi(satir.hucreler.secenekler) ?? ""]
            .filter((parca) => parca !== "")
            .join(" · "),
          degisiklikler: [],
          hatalar: tekrarsiz(tumu),
          gorulen: null,
          yazilacak: null,
        });
        continue;
      }

      // Birimin alanları.
      const alanlar: YazilacakBirim = {};
      const degisiklikler: Degisiklik[] = [...ortakDegisiklikleri];
      const okunanFiyat: Partial<Record<BirimSutunu, string | number | null>> = {};
      for (const sutun of ["stokKodu", "barkod", ...fiyatSutunlari, "stok"] as const) {
        const okunan = birimOku(sutun, hucre(satir, sutun));
        if (okunan === null) continue;
        if ("hata" in okunan) {
          hatalar.push(okunan.hata);
          continue;
        }
        const simdi = birim?.duz[sutun] ?? "";
        const indirildigi =
          birim === undefined ? undefined : indirilen?.birimler[birim.kimlik]?.[sutun];
        const karar =
          birim === undefined
            ? okunan.duz === ""
              ? "ayni"
              : "degistir"
            : alanKarari(okunan.duz, simdi, indirildigi);
        if (karar === "celiski") hatalar.push({ kod: "sitede-degisti", alan: sutun });
        if (karar !== "degistir") continue;
        degisiklikler.push({
          alan: sutun,
          simdi: gosterim(sutun, simdi),
          yeni: gosterim(sutun, okunan.duz),
        });
        if (sutun === "stokKodu" || sutun === "barkod") {
          alanlar[sutun] = okunan.deger as string | null;
          if (sutun === "stokKodu" && typeof okunan.deger === "string") {
            const anahtar2 = okunan.deger.toLocaleLowerCase("tr");
            const sahip = stokKoduSahipleri.get(anahtar2);
            if (sahip !== undefined && sahip !== birim?.kimlik)
              hatalar.push({ kod: "stok-kodu-kullaniliyor", alan: sutun, deger: okunan.deger });
            dosyadakiStokKodlari.set(anahtar2, [
              ...(dosyadakiStokKodlari.get(anahtar2) ?? []),
              satir.no,
            ]);
          }
        } else if (sutun === "stok") {
          alanlar.stok = okunan.deger as number;
          if (!izinler.stok) hatalar.push({ kod: "stok-yetkisi", alan: sutun });
        } else {
          okunanFiyat[sutun] = okunan.deger;
          if (!izinler.fiyat) hatalar.push({ kod: "fiyat-yetkisi", alan: sutun });
        }
      }
      // Fiyatın yeni hâli: şimdiki fiyat ve değişen alanlar; fiyat servisinin kuralıyla denetlenir.
      if (Object.keys(okunanFiyat).length > 0) {
        const simdiki = (sutun: (typeof fiyatSutunlari)[number]): string | number | null => {
          const duz = birim?.duz[sutun] ?? "";
          if (duz === "") return null;
          return sutun === "satisFiyati" || sutun === "indirimliFiyat"
            ? Number(duz)
            : duz.replace(" ", "T");
        };
        const al = (sutun: (typeof fiyatSutunlari)[number]) =>
          sutun in okunanFiyat ? (okunanFiyat[sutun] ?? null) : simdiki(sutun);
        const satis = al("satisFiyati");
        if (satis === null) {
          hatalar.push({ kod: "satis-fiyati-gerekli", alan: "satisFiyati" });
        } else {
          const fiyat = {
            satisFiyati: satis as number,
            indirimliFiyat: al("indirimliFiyat") as number | null,
            indirimBaslangici: al("indirimBaslangici") as string | null,
            indirimBitisi: al("indirimBitisi") as string | null,
          };
          const sonuc = fiyatGirdisi.safeParse(fiyat);
          if (!sonuc.success) {
            for (const sorun of sonuc.error.issues) {
              const alan = String(sorun.path[0] ?? "satisFiyati") as Sutun;
              hatalar.push({ kod: sorun.message, alan });
            }
          } else if (
            fiyat.indirimBaslangici !== null &&
            fiyat.indirimBitisi !== null &&
            fiyat.indirimBaslangici >= fiyat.indirimBitisi
          ) {
            hatalar.push({ kod: "indirim-sirasi", alan: "indirimBitisi" });
          } else {
            alanlar.fiyat = fiyat;
          }
        }
      }

      const secenekYazisi =
        birim?.seceneklerYazisi ??
        (yeniDegerler ?? []).map((d) => `${d.secenek}: ${d.deger}`).join("; ");
      const ad = [ortak.ad ?? urun?.duz.ad ?? metinHucresi(satir.hucreler.ad) ?? "", secenekYazisi]
        .filter((parca) => parca !== "")
        .join(" · ");
      const yeni = urun === undefined || birim === undefined;
      const hatali = hatalar.length > 0;
      sonuclar.push({
        no: satir.no,
        grup,
        sonuc: hatali ? "hatali" : yeni ? "ekle" : degisiklikler.length > 0 ? "degistir" : "ayni",
        urunKimligi: urun?.kimlik ?? null,
        birimKimligi: birim?.kimlik ?? null,
        ad,
        degisiklikler: yeni ? [] : degisiklikler,
        hatalar: tekrarsiz(hatalar),
        gorulen:
          urun === undefined
            ? null
            : { ortak: urun.duz, birim: birim?.duz ?? null, stok: birim?.stok ?? null },
        yazilacak: hatali
          ? null
          : {
              urun:
                urun === undefined
                  ? { tur: "yeni", kod: kodsuz ? null : grup, vergiSinifi: girdi.vergiSinifi }
                  : { tur: "var", kimlik: urun.kimlik },
              secenekler: urun === undefined ? yeniSecenekler : [],
              ortak: urun === undefined ? { durum: "taslak", ...ortak } : ortak,
              birim:
                birim !== undefined
                  ? {
                      tur: "var",
                      kimlik: birim.kimlik,
                      basit: (urun?.secenekler.length ?? 0) === 0,
                    }
                  : { tur: "yeni", degerler: yeniDegerler ?? [] },
              alanlar,
            },
      });
    }
  }

  // Dosyada iki satırın aynı stok kodu.
  for (const satirNolari of dosyadakiStokKodlari.values()) {
    if (satirNolari.length < 2) continue;
    for (const satir of sonuclar.filter((s) => satirNolari.includes(s.no))) {
      satir.hatalar.push({ kod: "stok-kodu-tekrar", alan: "stokKodu" });
      satir.sonuc = "hatali";
      satir.yazilacak = null;
    }
  }
  // Hatalı satırı olan grup bütünüyle hatalı sayılmaz ama uygulanmaz: dosyada hatalı satır varken hiçbir şey
  // uygulanmaz (karar 0185).
  return sonuclar.toSorted((a, c) => a.no - c.no);

  function gosterim(sutun: Sutun, duz: string): string {
    if (duz === "") return "";
    if (sutun === "satisFiyati" || sutun === "indirimliFiyat") return b.para(Number(duz));
    return duz;
  }
};

const sozlukMetni = {
  evet: () => metinOku("eklenti.excel.evet"),
  hayir: () => metinOku("eklenti.excel.hayir"),
};
const durumsuzAnahtar = (yazi: string) => yazi.normalize("NFC").toLocaleLowerCase("tr");

// Ürün değişikliği şemasının ilk sorununun kodu (ad ve stok kodu ürün servisinin kuralıyla denetlenir).
const urunKuralSorunu = (girdi: { ad?: string; stokKodu?: string }): string | undefined => {
  const sonuc = urunDegisikligi.safeParse(girdi);
  return sonuc.success ? undefined : (sonuc.error.issues[0]?.message ?? "kayda-uygun-degil");
};

const tekrarsiz = (hatalar: SatirHatasi[]): SatirHatasi[] => {
  const goruldu = new Set<string>();
  return hatalar.filter((h) => {
    const anahtar = `${h.kod}\u0000${h.alan ?? ""}\u0000${h.deger ?? ""}`;
    if (goruldu.has(anahtar)) return false;
    goruldu.add(anahtar);
    return true;
  });
};

// Bir alanın kararı: dosyadaki değer, sitedeki şimdiki değer ve (varsa) indirildiği andaki değer.
// - Dosya indirildiği andaki değere eşitse değişmez (site arada değişmiş olsa da).
// - İndirildiği andaki değer yoksa (elle hazırlanmış ya da eski dosya) dosya şimdikinden farklıysa yazılır.
// - Dosya değişmiş ve site de indirildiğinden beri değişmişse çelişkidir; ikisi aynı yere değiştiyse değişmez.
export const alanKarari = (
  dosya: string,
  simdi: string,
  indirildigi: string | undefined,
): "ayni" | "degistir" | "celiski" => {
  if (dosya === simdi) return "ayni";
  if (indirildigi === undefined) return "degistir";
  if (dosya === indirildigi) return "ayni";
  return simdi === indirildigi ? "degistir" : "celiski";
};

// Stok kodlarının sitedeki birimi (silinmemiş birim, harf ayrımsız).
const stokKoduSahipleriniOku = async (vt: Vt, kodlar: string[]): Promise<Map<string, string>> => {
  const sonuc = new Map<string, string>();
  const liste = [...new Set(kodlar.filter((k) => k !== ""))];
  if (liste.length === 0) return sonuc;
  const satirlar = await vt
    .select({ kod: sql<string>`lower(${urunBirimleri.stok_kodu})`, kimlik: urunBirimleri.kimlik })
    .from(urunBirimleri)
    .where(
      and(
        isNull(urunBirimleri.silinme_zamani),
        inArray(sql`lower(${urunBirimleri.stok_kodu})`, liste),
      ),
    );
  for (const { kod, kimlik } of satirlar) sonuc.set(kod, kimlik);
  return sonuc;
};
