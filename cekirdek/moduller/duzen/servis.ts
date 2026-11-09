// Sitenin düzenini okuyan ve değiştiren tek yol (kart 0106, karar 0081).
//
// - Düzen sürüm sürüm saklanır (model.ts), son sürüm geçerlidir. Sitenin hiç sürümü yoksa ilk okumada
//   başlangıç düzeniyle (site klasöründeki baslangic/duzen.json ya da başlangıç temasının düzeni) bir kez
//   yazılır; her bölüme yeni bir kimlik verilir.
// - Bölüm işlemleri: ekleme, alan değerlerini ve görünümü değiştirme, gizleme ve gösterme, bir alandaki
//   bölümleri sıralama, silme. Her işlem bütün düzeni yeni sürüm olarak yazar ve değişiklik kaydına girer,
//   ikisi aynı veritabanı işleminde. Yazmalar düzen kilidini alır: aynı anda gelen iki işlem sırayla çalışır,
//   biri ötekini ezmez.
// - Eklenen ya da değişen bölüm bölüm kütüphanesinin kurallarından geçer (tür, alan, görünüm, değerler) ve
//   başvurduğu kayıtların (görsel, kategori, marka, etiket, ürün; menü koduyla, kart 0108) var ve silinmemiş
//   olduğu denetlenir.
//   Başvurulan satırlar paylaşımlı kilitlenir: aynı anda silinen kayda bağlanılmaz.
// - Vitrin yalnız görünür, türü kütüphanede olan, değerleri geçerli ve bağlı olduğu işlevi yazılmış bölümleri
//   çizer. Panel her bölümün çizilip çizilmediğini ve nedenini görür.
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar.
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, desc, inArray, isNull, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type DegisikligiYapan, sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import { type Islev, yazilanIslevler } from "../../kayitlar/islevler.ts";
import { type DuzenAlani, duzenAlanlari } from "../../kayitlar/tema.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimlikMi } from "../../veritabani/turler.ts";
import {
  alandakiEnCokBolum,
  type BolumKutuphanesi,
  type BolumOrnegi,
  baslangictanDuzen,
  bolumuDenetle,
  type Duzen,
  type DuzenSorunu,
  duzenSemasi,
  duzenSorunlari,
} from "../../vitrin/bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import {
  type BolumBaglari,
  type BolumDegerleri,
  bolumBaglari,
} from "../../vitrin/bolum-kutuphanesi/tarif.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { gorselHazirMi } from "../dosya/servis.ts";
import { etiketler } from "../etiket/model.ts";
import { kategoriler } from "../kategori/model.ts";
import { markalar } from "../marka/model.ts";
import { menuler } from "../menu/model.ts";
import { urunler } from "../urun/model.ts";
import { duzenSurumleri } from "./model.ts";

// Başlangıç düzenini yazan, değişiklik kaydında "kim" olarak görünür.
export const duzenBaslangicYazari = sistemIslemi("baslangic-duzeni");

export const duzenServisHatalari = ["siralama-gecersiz", "alan-dolu"] as const;

// Bölümün vitrinde çizilmeme nedeni: panel bunu gösterir.
export type CizilmemeNedeni =
  | { tur: "gizli" }
  | { tur: "islev-yok"; islev: Islev }
  | { tur: "tanimsiz" }
  | { tur: "gecersiz" };

export type DuzenDurumu = {
  kimlik: string;
  sira: number;
  duzen: Duzen;
};

export type BolumGirdisi = {
  tur: string;
  gorunum?: string;
  gizli?: boolean;
  degerler: BolumDegerleri;
};

type Sorun = { alan: string; kod: string };
const dogrulama = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const sorunlariCevir = (sorunlar: DuzenSorunu[], onEk: string[] = []): Sorun[] =>
  sorunlar.map(({ yer, kod }) => ({ alan: [...onEk, ...yer].join("."), kod }));

const duzenKilidiAl = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('duzen'))`);

const alanlar = {
  kimlik: duzenSurumleri.kimlik,
  sira: duzenSurumleri.sira,
  duzen: duzenSurumleri.duzen,
};

type Satir = { kimlik: string; sira: number; duzen: unknown };

// Kayıtlı düzenin biçimi. Biçime uymuyorsa hata verir: bir veri değişikliğiyle düzeltilmeli. Değerler burada
// kütüphaneye göre denetlenmez (kütüphaneden çıkan tür düzeni okunmaz yapmasın).
const durum = (satir: Satir): DuzenDurumu => {
  const sonuc = duzenSemasi.safeParse(satir.duzen);
  if (!sonuc.success) {
    throw new Error(
      `Düzen sürümü biçime uymuyor: sıra ${satir.sira}. Bir veri değişikliğiyle düzeltilmeli.`,
    );
  }
  return { kimlik: satir.kimlik, sira: satir.sira, duzen: sonuc.data };
};

// Bölümün değişiklik kaydındaki hâli.
const bolumKaydi = (bolum: BolumOrnegi, alan: DuzenAlani) => ({
  alan,
  kimlik: bolum.kimlik,
  tur: bolum.tur,
  gorunum: bolum.gorunum,
  gizli: bolum.gizli,
  degerler: JSON.parse(JSON.stringify(bolum.degerler)) as Record<string, unknown>,
});

const bolumuBul = (duzen: Duzen, kimlik: string) => {
  for (const alan of duzenAlanlari) {
    const sira = duzen[alan].findIndex((bolum) => bolum.kimlik === kimlik);
    const bolum = duzen[alan][sira];
    if (bolum !== undefined) return { alan, sira, bolum };
  }
  return undefined;
};

// Başvurulan kayıtların var ve silinmemiş olduğu, aynı işlemde paylaşımlı kilitlenerek. Görsel boyutlarıyla
// hazır olmalı (galerideki kuralın aynısı).
const baglariDenetle = async (islem: VeritabaniIslemi, baglar: BolumBaglari): Promise<Sorun[]> => {
  const sorunlar: Sorun[] = [];
  const eksik = (yollar: string[] | undefined, kod: string) => {
    for (const yol of yollar ?? []) sorunlar.push({ alan: `degerler.${yol}`, kod });
  };
  const tablolar = [
    ["kategori", kategoriler],
    ["marka", markalar],
    ["etiket", etiketler],
    ["urun", urunler],
  ] as const;
  for (const [tur, tablo] of tablolar) {
    const kimlikler = [...baglar[tur].keys()];
    if (kimlikler.length === 0) continue;
    const bulunan = await islem
      .select({ kimlik: tablo.kimlik })
      .from(tablo)
      .where(and(inArray(tablo.kimlik, kimlikler.filter(kimlikMi)), isNull(tablo.silinme_zamani)))
      .for("share");
    const varolan = new Set(bulunan.map((satir) => satir.kimlik));
    for (const kimlik of kimlikler) {
      if (!varolan.has(kimlik)) eksik(baglar[tur].get(kimlik), "kayit-yok");
    }
  }
  // Menü koduyla başvurulur (kart 0108): kod silinmemiş bir menünün olmalı. Menü satırı paylaşımlı kilitlenir,
  // aynı anda silinen menüye bağlanılmaz. Kilit sırası: düzen, menü satırı; menü servisi düzen kilidini almaz.
  const menuKodlari = [...baglar.menu.keys()];
  if (menuKodlari.length > 0) {
    const bulunan = await islem
      .select({ kod: menuler.kod })
      .from(menuler)
      .where(and(inArray(menuler.kod, menuKodlari), isNull(menuler.silinme_zamani)))
      .for("share");
    const varolan = new Set(bulunan.map((satir) => satir.kod));
    for (const kod of menuKodlari) {
      if (!varolan.has(kod)) eksik(baglar.menu.get(kod), "kayit-yok");
    }
  }
  for (const [gorsel, yollar] of baglar.gorsel) {
    if ((await gorselHazirMi(islem, gorsel)) !== "hazir") eksik(yollar, "gorsel-gecersiz");
  }
  return sorunlar;
};

export const duzenServisi = (
  site: () => Site,
  kutuphane: () => BolumKutuphanesi = () => bolumKutuphanesi,
  islevler: () => Readonly<Record<Islev, boolean>> = () => yazilanIslevler,
) => {
  const sonSatir = async (vt: Veritabani | VeritabaniIslemi): Promise<Satir | undefined> => {
    const [satir] = await vt
      .select(alanlar)
      .from(duzenSurumleri)
      .orderBy(desc(duzenSurumleri.sira))
      .limit(1);
    return satir;
  };

  // Kilit alınmış işlemin içinde: sürüm yoksa başlangıç düzenini yazar ve son satırı döndürür.
  const baslangicliSon = async (islem: VeritabaniIslemi): Promise<Satir> => {
    const son = await sonSatir(islem);
    if (son !== undefined) return son;
    const duzen = baslangictanDuzen(site().duzenBaslangici, kutuphane(), randomUUID);
    const denenen = duzenSorunlari(duzen, kutuphane());
    if ("sorunlar" in denenen) {
      throw new Error(
        `Başlangıç düzeni bölüm kütüphanesine uymuyor: ${sorunlariCevir(denenen.sorunlar)
          .map((s) => `${s.alan} ${s.kod}`)
          .join(", ")}.`,
      );
    }
    const [yazilan] = await islem
      .insert(duzenSurumleri)
      .values({ sira: 1, duzen: denenen.duzen })
      .returning(alanlar);
    if (yazilan === undefined) throw new Error("Başlangıç düzeni yazılamadı.");
    await degisikligiKaydet(islem, {
      kim: duzenBaslangicYazari,
      islem: "duzen.baslangic",
      kayit: { tur: "duzen-surumu", kimlik: yazilan.kimlik },
      eski: null,
      yeni: {
        bolumler: duzenAlanlari.flatMap((alan) =>
          denenen.duzen[alan].map((bolum) => bolumKaydi(bolum, alan)),
        ),
      },
    });
    return yazilan;
  };

  // Geçerli düzen. Sürüm yoksa başlangıç düzeni bir kez yazılır.
  const duzenOku = async (vt: Veritabani): Promise<DuzenDurumu> => {
    const son = await sonSatir(vt);
    if (son !== undefined) return durum(son);
    return durum(
      await vt.transaction(async (islem) => {
        await duzenKilidiAl(islem);
        return baslangicliSon(islem);
      }),
    );
  };

  // Bölümü kütüphaneye ve veritabanına göre denetler; geçerse değerleri şemadan geçmiş hâliyle döndürür.
  const bolumuHazirla = async (
    islem: VeritabaniIslemi,
    alan: DuzenAlani,
    bolum: { tur: string; gorunum: string; degerler: unknown },
  ): Promise<BolumDegerleri> => {
    const sonuc = bolumuDenetle(kutuphane(), alan, bolum, [], { baslangic: false });
    if ("sorunlar" in sonuc) throw dogrulama(sorunlariCevir(sonuc.sorunlar));
    const tarif = kutuphane()[bolum.tur];
    if (tarif === undefined) throw dogrulama([{ alan: "tur", kod: "bolum-tanimsiz" }]);
    const sorunlar = await baglariDenetle(islem, bolumBaglari(tarif, sonuc.degerler));
    if (sorunlar.length > 0) throw dogrulama(sorunlar);
    return sonuc.degerler;
  };

  // Bir işlemi kilit altında son düzene uygular ve yeni sürüm olarak yazar. degistir yeni düzeni ve kaydın
  // değerlerini döndürür; düzen değişmediyse undefined döndürür ve hiçbir şey yazılmaz.
  const degistir = async <T>(
    vt: Veritabani,
    kim: DegisikligiYapan,
    degistir: (
      duzen: Duzen,
      islem: VeritabaniIslemi,
    ) => Promise<
      | {
          duzen: Duzen;
          islem: Parameters<typeof degisikligiKaydet>[1]["islem"];
          eski: Record<string, unknown> | null;
          yeni: Record<string, unknown> | null;
          sonuc: T;
        }
      | { degismedi: T }
    >,
  ): Promise<T> =>
    vt.transaction(async (islem) => {
      await duzenKilidiAl(islem);
      const son = durum(await baslangicliSon(islem));
      const sonuc = await degistir(structuredClone(son.duzen), islem);
      if ("degismedi" in sonuc) return sonuc.degismedi;
      // Yazılan düzen okunacak biçimde olmalı: biçimi bozuk bir sürüm her okumayı düşürürdü ve sürümler
      // değiştirilemez.
      if (!duzenSemasi.safeParse(sonuc.duzen).success) {
        throw new Error("Yazılacak düzen biçime uymuyor; sürüm yazılmadı.");
      }
      const [yazilan] = await islem
        .insert(duzenSurumleri)
        .values({ sira: son.sira + 1, duzen: sonuc.duzen })
        .returning(alanlar);
      if (yazilan === undefined) throw new Error("Düzen sürümü yazılamadı.");
      await degisikligiKaydet(islem, {
        kim,
        islem: sonuc.islem,
        kayit: { tur: "duzen-surumu", kimlik: yazilan.kimlik },
        eski: sonuc.eski,
        yeni: sonuc.yeni,
      });
      return sonuc.sonuc;
    });

  const bolumunuBul = (duzen: Duzen, kimlik: string) => {
    const bulunan = kimlikMi(kimlik) ? bolumuBul(duzen, kimlik) : undefined;
    if (bulunan === undefined) throw new BilinenHata("bulunamadi");
    return bulunan;
  };

  // Alana yeni bölüm ekler; sıra verilmezse sona. Yeni bölümün kimliğini döndürür.
  const bolumEkle = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    alan: DuzenAlani,
    girdi: BolumGirdisi,
    sira?: number,
  ): Promise<string> => {
    if (!(duzenAlanlari as readonly string[]).includes(alan)) {
      throw dogrulama([{ alan: "alan", kod: "invalid_value" }]);
    }
    return degistir(vt, kim, async (duzen, islem) => {
      if (duzen[alan].length >= alandakiEnCokBolum)
        throw dogrulama([{ alan: "alan", kod: "alan-dolu" }]);
      const tarif = Object.hasOwn(kutuphane(), girdi.tur) ? kutuphane()[girdi.tur] : undefined;
      const bolum: BolumOrnegi = {
        kimlik: randomUUID(),
        tur: girdi.tur,
        gorunum: girdi.gorunum ?? tarif?.gorunumler[0].kod ?? "",
        gizli: girdi.gizli ?? false,
        degerler: {},
      };
      bolum.degerler = await bolumuHazirla(islem, alan, { ...bolum, degerler: girdi.degerler });
      const yer =
        sira === undefined || !Number.isSafeInteger(sira)
          ? duzen[alan].length
          : Math.min(Math.max(0, sira), duzen[alan].length);
      duzen[alan].splice(yer, 0, bolum);
      return {
        duzen,
        islem: "duzen.bolum-eklendi",
        eski: null,
        yeni: { ...bolumKaydi(bolum, alan), sira: yer },
        sonuc: bolum.kimlik,
      };
    });
  };

  // Bölümün değerlerini ve görünümünü değiştirir. Değerler bütün olarak verilir.
  const bolumDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlik: string,
    girdi: { gorunum?: string; degerler?: BolumDegerleri },
  ): Promise<void> =>
    degistir(vt, kim, async (duzen, islem) => {
      const { alan, sira, bolum } = bolumunuBul(duzen, kimlik);
      const yeni: BolumOrnegi = {
        ...bolum,
        gorunum: girdi.gorunum ?? bolum.gorunum,
        degerler: girdi.degerler ?? bolum.degerler,
      };
      yeni.degerler = await bolumuHazirla(islem, alan, yeni);
      // Alanların sırası karşılaştırmaya girmez: veritabanı nesnenin anahtarlarını kendi sırasıyla saklar.
      if (isDeepStrictEqual(bolumKaydi(yeni, alan), bolumKaydi(bolum, alan))) {
        return { degismedi: undefined };
      }
      duzen[alan][sira] = yeni;
      return {
        duzen,
        islem: "duzen.bolum-degisti",
        eski: bolumKaydi(bolum, alan),
        yeni: bolumKaydi(yeni, alan),
        sonuc: undefined,
      };
    });

  // Bölümü gizler ya da gösterir. Değerlerine bakılmaz: bölüm yalnız görünürlüğü değişir.
  const bolumGorunurlugu = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kimlik: string,
    gizli: boolean,
  ): Promise<void> =>
    degistir(vt, kim, async (duzen) => {
      const { alan, sira, bolum } = bolumunuBul(duzen, kimlik);
      if (bolum.gizli === gizli) return { degismedi: undefined };
      duzen[alan][sira] = { ...bolum, gizli };
      return {
        duzen,
        islem: gizli ? "duzen.bolum-gizlendi" : "duzen.bolum-gosterildi",
        eski: { alan, kimlik, tur: bolum.tur, gizli: bolum.gizli },
        yeni: { alan, kimlik, tur: bolum.tur, gizli },
        sonuc: undefined,
      };
    });

  // Bir alandaki bölümlerin yeni sırası: alandaki bütün bölümlerin kimlikleri, her biri bir kez.
  const bolumleriSirala = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    alan: DuzenAlani,
    kimlikler: readonly string[],
  ): Promise<void> => {
    if (!(duzenAlanlari as readonly string[]).includes(alan)) {
      throw dogrulama([{ alan: "alan", kod: "invalid_value" }]);
    }
    return degistir(vt, kim, async (duzen) => {
      const eski = duzen[alan].map((bolum) => bolum.kimlik);
      const ayniKume =
        kimlikler.length === eski.length &&
        new Set(kimlikler).size === kimlikler.length &&
        kimlikler.every((kimlik) => eski.includes(kimlik));
      if (!ayniKume) throw dogrulama([{ alan: "kimlikler", kod: "siralama-gecersiz" }]);
      if (kimlikler.every((kimlik, sira) => eski[sira] === kimlik)) return { degismedi: undefined };
      const bolumler = new Map(duzen[alan].map((bolum) => [bolum.kimlik, bolum]));
      duzen[alan] = kimlikler.map((kimlik) => bolumler.get(kimlik) as BolumOrnegi);
      return {
        duzen,
        islem: "duzen.bolumler-siralandi",
        eski: { alan, sira: eski },
        yeni: { alan, sira: [...kimlikler] },
        sonuc: undefined,
      };
    });
  };

  const bolumSil = async (vt: Veritabani, kim: DegisikligiYapan, kimlik: string): Promise<void> =>
    degistir(vt, kim, async (duzen) => {
      const { alan, sira, bolum } = bolumunuBul(duzen, kimlik);
      duzen[alan].splice(sira, 1);
      return {
        duzen,
        islem: "duzen.bolum-silindi",
        eski: { ...bolumKaydi(bolum, alan), sira },
        yeni: null,
        sonuc: undefined,
      };
    });

  // Bölümün vitrinde çizilip çizilmeyeceği; çizilmeyecekse nedeni.
  const cizilmemeNedeni = (alan: DuzenAlani, bolum: BolumOrnegi): CizilmemeNedeni | undefined => {
    if (bolum.gizli) return { tur: "gizli" };
    const tarif = Object.hasOwn(kutuphane(), bolum.tur) ? kutuphane()[bolum.tur] : undefined;
    if (tarif === undefined) return { tur: "tanimsiz" };
    if ("sorunlar" in bolumuDenetle(kutuphane(), alan, bolum, [], { baslangic: false })) {
      return { tur: "gecersiz" };
    }
    if (tarif.islev !== undefined && !islevler()[tarif.islev]) {
      return { tur: "islev-yok", islev: tarif.islev };
    }
    return undefined;
  };

  // Panelin düzen ekranı: her alandaki bölümler sırasıyla ve vitrinde çizilmeme nedenleriyle.
  const panelDuzeni = async (vt: Veritabani) => {
    const { duzen } = await duzenOku(vt);
    return Object.fromEntries(
      duzenAlanlari.map((alan) => [
        alan,
        duzen[alan].map((bolum) => {
          const neden = cizilmemeNedeni(alan, bolum);
          return { bolum, cizilir: neden === undefined, ...(neden === undefined ? {} : { neden }) };
        }),
      ]),
    ) as Record<DuzenAlani, { bolum: BolumOrnegi; cizilir: boolean; neden?: CizilmemeNedeni }[]>;
  };

  // Vitrinin çizeceği bölümler, sırasıyla. Türü kütüphaneden çıkmış ya da değerleri artık geçersiz bölüm
  // vitrini düşürmez: çizilmez ve hata süreç başına bir kez kaydedilir.
  const cizilecekBolumler = async (vt: Veritabani, alan: DuzenAlani): Promise<BolumOrnegi[]> => {
    const { duzen } = await duzenOku(vt);
    return duzen[alan].filter((bolum) => {
      const neden = cizilmemeNedeni(alan, bolum);
      if (neden?.tur === "tanimsiz" || neden?.tur === "gecersiz") {
        birKezKaydet(
          `${neden.tur}:${bolum.kimlik}`,
          `Düzendeki bölüm çizilemiyor (${neden.tur}): ${bolum.tur} ${bolum.kimlik}.`,
        );
      }
      return neden === undefined;
    });
  };

  // Vitrinde çizilen bölümlerin başvurduğu görseller (kart 0110): vitrin görseli ucu yalnız bunları ve
  // kategorilerin görsellerini verir. Gizli, geçersiz ya da işlevi yazılmamış bölümün görseli yoktur. Düzen
  // bir kez okunur.
  const vitrindekiGorseller = async (vt: Veritabani): Promise<Set<string>> => {
    const { duzen } = await duzenOku(vt);
    const gorseller = new Set<string>();
    for (const alan of duzenAlanlari) {
      for (const bolum of duzen[alan]) {
        if (cizilmemeNedeni(alan, bolum) !== undefined) continue;
        const tarif = kutuphane()[bolum.tur];
        if (tarif === undefined) continue;
        for (const gorsel of bolumBaglari(tarif, bolum.degerler).gorsel.keys())
          gorseller.add(gorsel);
      }
    }
    return gorseller;
  };

  return {
    duzenOku,
    vitrindekiGorseller,
    bolumEkle,
    bolumDegistir,
    bolumGorunurlugu,
    bolumleriSirala,
    bolumSil,
    panelDuzeni,
    cizilecekBolumler,
  };
};

// Vitrinin her isteğinde tekrarlanan sorun süreç başına bir kez kaydedilir.
const kaydedilenSorunlar = new Set<string>();
const birKezKaydet = (anahtar: string, ileti: string): void => {
  if (kaydedilenSorunlar.has(anahtar)) return;
  kaydedilenSorunlar.add(anahtar);
  hatayiKaydet(new Error(ileti), { kaynak: "duzen" });
};
