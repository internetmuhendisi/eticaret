// Sitenin temasını ve tema ayarlarını okuyan ve değiştiren tek yol (kart 0105, .claude/rules/tasarim-sistemi.md).
//
// - Tema ve ayarları sürüm sürüm saklanır (model.ts). Son sürüm geçerlidir. Sitenin hiç sürümü yoksa ilk
//   okumada başlangıç değeriyle (site klasöründeki baslangic/tema.json) bir kez yazılır.
// - Mağaza sahibi yalnız sitenin kullanabileceği temalardan birini seçer (site.temalar, altyapı sahibinin
//   "temalar" ayarı). Başka bir sitenin özel teması bu listeye hiçbir yoldan girmez.
// - Ayarlar temanın açtığı değerlerle sınırlıdır; renk açık temada okunur değilse kaydedilmez ve okunur
//   en yakın ton öneri olarak döner (cekirdek/temalar/ayarlar.ts).
// - "Mağaza sahibi temayı değiştirebilir" ayarı kapalıysa ne tema ne tema ayarı değişir, önceki sürüme de
//   dönülmez (kullanıcı kararı).
// - Panelde canlı önizleme ve taslak yoktur (karar 0080): değişiklik doğrudan yeni sürüm olarak yayınlanır,
//   önceki sürüme tek adımda dönülür. Dönüş, eski sürümün kopyasını yeni sürüm olarak yazar.
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045). Yazmalar tema kilidini alır:
//   aynı anda gelen iki yayın sırayla yazılır.
// - Tema kodu değişince düzenin yolu seçilir (kart 0113, karar 0091): yeni temanın düzenini uygulamak ya da
//   düzeni korumak (cekirdek/moduller/duzen/gecis.ts). Tema ve düzen sürümü aynı işlemde yazılır; kilit
//   sırası tema, düzen. Her tema sürümü, yazılmadan hemen önce geçerli olan düzen sürümünü saklar. Tema
//   kodu değişen geri dönüş, dönülen sürüm geçerliyken düzenin son hâlini (bir sonraki sürümün sakladığı
//   düzen) yeni düzen sürümü olarak getirir; sonradan yapılan düzen değişiklikleri geçmişte kalır
//   (kullanıcı kararı). Yalnız ayar değişikliğinde ve geri dönüşünde düzene dokunulmaz.
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar.
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { desc, eq, gt, sql } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type DegisikligiYapan, sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  sorunluAyarlariAt,
  type TemaAyarlari,
  temaAyariSorunlari,
  temaAyarlariSemasi,
} from "../../temalar/ayarlar.ts";
import type { Tema } from "../../temalar/temalar.ts";
import {
  siteninVeritabani,
  type Veritabani,
  type VeritabaniIslemi,
} from "../../veritabani/baglanti.ts";
import type { BolumKutuphanesi, Duzen } from "../../vitrin/bolum-kutuphanesi/duzen.ts";
import { bolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { duzeniKoru, temaDuzeniniUygula } from "../duzen/gecis.ts";
import { type DuzenDurumu, duzenServisi } from "../duzen/servis.ts";
import { temaSurumleri } from "./model.ts";
import { type TemaYayiniGirdisi, temaYayiniSemasi } from "./semalar.ts";

// Başlangıç sürümünü yazan, değişiklik kaydında "kim" olarak görünür.
export const temaBaslangicYazari = sistemIslemi("baslangic-temasi");

// Bir sayfada okunan sürüm sayısının üst sınırı (.claude/rules/veritabani.md).
export const temaSurumuSayfasi = 50;

export const temaHatalari = [
  "tema-kullanilamaz",
  "tema-degistirilemez",
  "surum-gecersiz",
  "surum-kullanilamaz",
  "duzen-yolu-gerekli",
  "tema-degisti",
] as const;

export type TemaSurumu = {
  kimlik: string;
  sira: number;
  tema: string;
  ayarlar: TemaAyarlari;
  geriDonulenSira: number | null;
  oncekiDuzenSira: number | null;
  zaman: Date;
};

export type TemaGirdisi = TemaYayiniGirdisi;

const alanlar = {
  kimlik: temaSurumleri.kimlik,
  sira: temaSurumleri.sira,
  tema: temaSurumleri.tema,
  ayarlar: temaSurumleri.ayarlar,
  geriDonulenSira: temaSurumleri.geri_donulen_sira,
  oncekiDuzenSira: temaSurumleri.onceki_duzen_sira,
  zaman: temaSurumleri.zaman,
};

type Satir = Omit<TemaSurumu, "ayarlar"> & { ayarlar: unknown };

// Veritabanındaki ayarlar şemadan geçer. Uymuyorsa (çekirdek şemayı daraltmış ama veri dönüştürülmemiş)
// hata verir: sessizce başka bir değer gösterilmez.
const surum = (satir: Satir): TemaSurumu => {
  const ayarlar = temaAyarlariSemasi.safeParse(satir.ayarlar);
  if (!ayarlar.success) {
    throw new Error(
      `Tema sürümünün ayarları şemaya uymuyor: sıra ${satir.sira}. Bir veri değişikliğiyle düzeltilmeli.`,
    );
  }
  return { ...satir, ayarlar: ayarlar.data };
};

const kayitDegeri = (s: { tema: string; ayarlar: TemaAyarlari }) => ({
  tema: s.tema,
  ayarlar: JSON.parse(JSON.stringify(s.ayarlar)) as Record<string, unknown>,
});

const ayni = (a: { tema: string; ayarlar: unknown }, b: { tema: string; ayarlar: unknown }) =>
  a.tema === b.tema &&
  isDeepStrictEqual(JSON.parse(JSON.stringify(a.ayarlar)), JSON.parse(JSON.stringify(b.ayarlar)));

const ayniDuzen = (a: Duzen, b: Duzen) =>
  isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));

const temaKilidiAl = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('tema'))`);

const dogrulama = (sorunlar: { alan: string; kod: string; oneri?: string }[]) =>
  new BilinenHata("dogrulama", sorunlar);

// Vitrinin her isteğinde tekrarlanan sorun süreç başına bir kez kaydedilir: hata izleme aracı aynı olayla
// dolmasın.
const kaydedilenSorunlar = new Set<string>();
const birKezKaydet = (anahtar: string, ileti: string): void => {
  if (kaydedilenSorunlar.has(anahtar)) return;
  kaydedilenSorunlar.add(anahtar);
  hatayiKaydet(new Error(ileti), { kaynak: "tema" });
};

// Tema sürümüyle birlikte yazılacak düzen: yeni düzen ve kaydının değerleri.
type DuzenDegisikligi = {
  duzen: Duzen;
  islem: "duzen.tema-degisti" | "duzen.geri-donuldu";
  eski: Record<string, unknown>;
  yeni: Record<string, unknown>;
};

type Hedef = {
  tema: string;
  ayarlar: TemaAyarlari;
  geriDonulenSira: number | null;
  // Tema kaydına eklenecek değerler (düzenin yolu).
  kayitEki?: Record<string, unknown>;
  duzen?: DuzenDegisikligi;
};

export const temaServisi = (
  site: () => Site,
  kutuphane: () => BolumKutuphanesi = () => bolumKutuphanesi,
) => {
  const duzen = duzenServisi(site, kutuphane);
  const temayiBul = (kod: string): Tema | undefined =>
    site().temalar.find((tema) => tema.kod === kod);

  const sonSatir = async (vt: Veritabani | VeritabaniIslemi): Promise<Satir | undefined> => {
    const [satir] = await vt
      .select(alanlar)
      .from(temaSurumleri)
      .orderBy(desc(temaSurumleri.sira))
      .limit(1);
    return satir;
  };

  // Kilit alınmış işlemin içinde: sürüm yoksa başlangıç sürümünü yazar ve son satırı döndürür.
  const baslangicliSon = async (islem: VeritabaniIslemi): Promise<Satir> => {
    const son = await sonSatir(islem);
    if (son !== undefined) return son;
    const { tema, ayarlar } = site().temaBaslangici;
    const [yazilan] = await islem
      .insert(temaSurumleri)
      .values({ sira: 1, tema, ayarlar: kayitDegeri({ tema, ayarlar }).ayarlar })
      .returning(alanlar);
    if (yazilan === undefined) throw new Error("Başlangıç tema sürümü yazılamadı.");
    await degisikligiKaydet(islem, {
      kim: temaBaslangicYazari,
      islem: "tema.baslangic",
      kayit: { tur: "tema-surumu", kimlik: yazilan.kimlik },
      eski: null,
      yeni: kayitDegeri({ tema, ayarlar }),
    });
    return yazilan;
  };

  // Geçerli sürüm. Sürüm yoksa başlangıç değeri bir kez yazılır.
  const temaDurumu = async (vt: Veritabani): Promise<TemaSurumu> => {
    const son = await sonSatir(vt);
    if (son !== undefined) return surum(son);
    return surum(
      await vt.transaction(async (islem) => {
        await temaKilidiAl(islem);
        return baslangicliSon(islem);
      }),
    );
  };

  // Vitrinin çizdiği tema ve ayarlar. Kayıtlı tema artık bu sitede kullanılamıyorsa (altyapı sahibi
  // listeden çıkardı) vitrin düşmez: başlangıç teması çizilir. Ayarlardan temaya uymayan (açılmamış renk,
  // olmayan seçenek) yalnız o ayar atılır, temanın kendi değeri çizilir; geçerli seçimler kalır. Kontrastı
  // sonradan yetersiz kalan renk burada atılmaz, birleşim onun okunur tonunu kullanır. Aynı sorun her
  // istekte tekrarlanır: hata süreç başına bir kez kaydedilir.
  const gecerliTema = async (vt: Veritabani): Promise<{ tema: Tema; ayarlar: TemaAyarlari }> => {
    const durum = await temaDurumu(vt);
    const tema = temayiBul(durum.tema);
    if (tema === undefined) {
      birKezKaydet(
        `kullanilamaz:${durum.tema}`,
        `Kayıtlı tema bu sitede kullanılamıyor: ${durum.tema}.`,
      );
      const { tema: baslangic, ayarlar } = site().temaBaslangici;
      const yedek = temayiBul(baslangic);
      if (yedek === undefined) throw new Error("Sitenin başlangıç teması kullanılamıyor.");
      return { tema: yedek, ayarlar };
    }
    const sorunlar = temaAyariSorunlari(tema.tanim, durum.ayarlar).filter(
      (sorun) => sorun.kod !== "kontrast-yetersiz",
    );
    if (sorunlar.length === 0) return { tema, ayarlar: durum.ayarlar };
    const alanlar = sorunlar.map((sorun) => sorun.alan);
    birKezKaydet(
      `uymuyor:${tema.kod}:${alanlar.join(",")}`,
      `Kayıtlı tema ayarları temaya uymuyor: ${alanlar.join(", ")}.`,
    );
    return { tema, ayarlar: sorunluAyarlariAt(durum.ayarlar, sorunlar) };
  };

  const degistirilebilirMi = () => {
    if (!site().ayarlar.temaDegistirilebilir) {
      throw new BilinenHata("is-kurali", [{ alan: "tema", kod: "tema-degistirilemez" }]);
    }
  };

  // Sürümü yazar; son sürümle aynıysa yazmaz ve son sürümü döndürür. Hedef bir düzen değişikliği taşıyorsa
  // düzen sürümü de aynı işlemde yazılır; tema sürümü yazılmadan önceki düzenin sırasını saklar.
  const surumYaz = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    hedef: (son: Satir, islem: VeritabaniIslemi, sonDuzen: DuzenDurumu) => Promise<Hedef>,
  ): Promise<TemaSurumu> =>
    surum(
      await vt.transaction(async (islem) => {
        await temaKilidiAl(islem);
        const son = await baslangicliSon(islem);
        const sonDuzen = await duzen.islemdekiDuzen(islem);
        const yeni = await hedef(son, islem, sonDuzen);
        // Tema ve ayarlar aynı, düzen de değişmiyorsa hiçbir şey yazılmaz. Düzen geri geliyorsa (A, B, A'dan
        // ilk A'ya dönüş) tema sürümü de yazılır: düzeni saklama zinciri kopmasın.
        if (
          ayni(son, yeni) &&
          (yeni.duzen === undefined || ayniDuzen(sonDuzen.duzen, yeni.duzen.duzen))
        ) {
          return son;
        }
        const [yazilan] = await islem
          .insert(temaSurumleri)
          .values({
            sira: son.sira + 1,
            tema: yeni.tema,
            ayarlar: kayitDegeri(yeni).ayarlar,
            geri_donulen_sira: yeni.geriDonulenSira,
            onceki_duzen_sira: sonDuzen.sira,
          })
          .returning(alanlar);
        if (yazilan === undefined) throw new Error("Tema sürümü yazılamadı.");
        await degisikligiKaydet(islem, {
          kim,
          islem: yeni.geriDonulenSira === null ? "tema.yayinlandi" : "tema.geri-donuldu",
          kayit: { tur: "tema-surumu", kimlik: yazilan.kimlik },
          eski: kayitDegeri(surum(son)),
          yeni: {
            ...kayitDegeri(yeni),
            ...(yeni.geriDonulenSira === null ? {} : { geriDonulenSira: yeni.geriDonulenSira }),
            ...yeni.kayitEki,
          },
        });
        if (yeni.duzen !== undefined) {
          await duzen.islemdeDuzenYaz(islem, kim, sonDuzen, yeni.duzen.duzen, {
            islem: yeni.duzen.islem,
            eski: { ...yeni.duzen.eski, temaSurumu: son.sira },
            yeni: { ...yeni.duzen.yeni, temaSurumu: yazilan.sira },
          });
        }
        return yazilan;
      }),
    );

  // Temayı ve ayarlarını yeni sürüm olarak yayınlar. Bütün sorunlar birlikte döner.
  const temayiYayinla = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: TemaGirdisi,
  ): Promise<TemaSurumu> => {
    degistirilebilirMi();
    const sonuc = temaYayiniSemasi.safeParse(girdi);
    if (!sonuc.success) {
      throw dogrulama(
        sonuc.error.issues.map((sorun) => ({ alan: sorun.path.join("."), kod: sorun.code })),
      );
    }
    const tema = temayiBul(sonuc.data.tema);
    if (tema === undefined) throw dogrulama([{ alan: "tema", kod: "tema-kullanilamaz" }]);
    const sorunlar = temaAyariSorunlari(tema.tanim, sonuc.data.ayarlar);
    if (sorunlar.length > 0) {
      throw dogrulama(sorunlar.map((sorun) => ({ ...sorun, alan: `ayarlar.${sorun.alan}` })));
    }
    const yol = sonuc.data.duzen;
    // Tema kodu kilit alındıktan sonra karşılaştırılır: aynı anda yazılan bir yayına göre kaymaz.
    return surumYaz(vt, kim, async (son, _islem, sonDuzen) => {
      const yeni = { tema: tema.kod, ayarlar: sonuc.data.ayarlar, geriDonulenSira: null };
      if (son.tema === tema.kod) return yeni;
      if (yol === undefined) throw dogrulama([{ alan: "duzen", kod: "duzen-yolu-gerekli" }]);
      const gecis =
        yol === "koru"
          ? duzeniKoru(sonDuzen.duzen, kutuphane())
          : temaDuzeniniUygula(sonDuzen.duzen, tema.tanim.baslangicDuzeni, kutuphane(), randomUUID);
      return {
        ...yeni,
        kayitEki: { duzen: yol },
        duzen: {
          duzen: gecis.duzen,
          islem: "duzen.tema-degisti",
          eski: { tema: son.tema },
          yeni: {
            tema: tema.kod,
            yol,
            tasinan: gecis.tasinan,
            gizlenen: gecis.gizlenen,
            disaridaKalan: gecis.disaridaKalan,
            varsayilanaDusen: gecis.varsayilanaDusen,
          },
        },
      };
    });
  };

  // Önceki bir sürüme döner: o sürüm yeni sürüm olarak yazılır. Sıra verilmezse son sürümden bir önceki:
  // "son değişikliği geri al". Art arda çağrılırsa son iki sürüm arasında gidip gelir; daha eskisine sırası
  // verilerek dönülür. Dönülen sürüm şimdikiyle aynıysa hiçbir şey yazılmaz, son sürüm döner. Dönülen
  // sürümün teması bugün kullanılabilir ve ayarları bugünkü kurallardan geçmeli.
  // beklenenSon: ekranın gördüğü son sürümün sırası (kart 0148, karar 0115'teki kural). Verilirse ve son sürüm o
  // değilse (arada başka bir değişiklik, aynı düğmeye ikinci basış) hiçbir şey yazılmaz.
  const oncekiSurumeDon = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    sira?: number,
    beklenenSon?: number,
  ): Promise<TemaSurumu> => {
    degistirilebilirMi();
    if (sira !== undefined && (!Number.isSafeInteger(sira) || sira < 1)) {
      throw dogrulama([{ alan: "sira", kod: "surum-gecersiz" }]);
    }
    // Hedef kilit alındıktan sonra okunur: "bir önceki" aynı anda yazılan bir yayına göre kaymaz.
    return surumYaz(vt, kim, async (son, islem, sonDuzen) => {
      if (beklenenSon !== undefined && son.sira !== beklenenSon) {
        throw new BilinenHata("cakisma", [{ alan: "son", kod: "tema-degisti" }]);
      }
      const aranan = sira ?? son.sira - 1;
      const [hedef] =
        aranan >= 1 && aranan < son.sira
          ? await islem.select(alanlar).from(temaSurumleri).where(eq(temaSurumleri.sira, aranan))
          : [];
      if (hedef === undefined) throw dogrulama([{ alan: "sira", kod: "surum-gecersiz" }]);
      const eski = surum(hedef);
      const tema = temayiBul(eski.tema);
      // Dönülen sürüm bugünkü kurallardan geçmeli, okunurluk dahil: okunmayan renk geri dönüşle de
      // kaydedilmez.
      if (tema === undefined || temaAyariSorunlari(tema.tanim, eski.ayarlar).length > 0) {
        throw new BilinenHata("is-kurali", [{ alan: "sira", kod: "surum-kullanilamaz" }]);
      }
      const sonuc = { tema: eski.tema, ayarlar: eski.ayarlar, geriDonulenSira: eski.sira };
      // Dönülen sürümden bu yana tema hiç değişmediyse düzene dokunulmaz (yalnız ayar geri dönüşü). Arada
      // tema değiştiyse, dönülen sürümün teması bugünküyle aynı olsa da düzen geri gelir (A, B, A'dan
      // ilk A'ya dönüş; kart 0113 bağımsız kontrolü).
      const aradakiTemalar = await islem
        .selectDistinct({ tema: temaSurumleri.tema })
        .from(temaSurumleri)
        .where(gt(temaSurumleri.sira, eski.sira));
      if (aradakiTemalar.every((satir) => satir.tema === eski.tema)) return sonuc;
      // Dönülen sürüm geçerliyken düzenin son hâli, ondan sonraki sürümün yazılmadan önce sakladığı
      // düzendir (kullanıcı kararı). Kart 0113'ten önceki sürümde bu bilinmez: düzen korunur.
      const [sonraki] = await islem
        .select({ oncekiDuzenSira: temaSurumleri.onceki_duzen_sira })
        .from(temaSurumleri)
        .where(eq(temaSurumleri.sira, eski.sira + 1));
      const duzenSira = sonraki?.oncekiDuzenSira ?? null;
      const getirilen =
        duzenSira === null ? undefined : await duzen.islemdeSurumOku(islem, duzenSira);
      if (duzenSira !== null && getirilen === undefined) {
        throw new Error(`Tema sürümünün sakladığı düzen sürümü yok: sıra ${duzenSira}.`);
      }
      const gecis = duzeniKoru(getirilen?.duzen ?? sonDuzen.duzen, kutuphane());
      return {
        ...sonuc,
        duzen: {
          duzen: gecis.duzen,
          islem: getirilen === undefined ? "duzen.tema-degisti" : "duzen.geri-donuldu",
          eski: { tema: son.tema },
          yeni: {
            tema: eski.tema,
            ...(getirilen === undefined ? { yol: "koru" } : { geriDonulenSira: getirilen.sira }),
            varsayilanaDusen: gecis.varsayilanaDusen,
          },
        },
      };
    });
  };

  // Sürümler, en yeniden eskiye, sayfa sayfa.
  const temaSurumleriniOku = async (vt: Veritabani, sayfa = 0): Promise<TemaSurumu[]> => {
    await temaDurumu(vt);
    const satirlar = await vt
      .select(alanlar)
      .from(temaSurumleri)
      .orderBy(desc(temaSurumleri.sira))
      .limit(temaSurumuSayfasi)
      .offset(Math.max(0, Math.trunc(sayfa)) * temaSurumuSayfasi);
    return satirlar.map(surum);
  };

  // Panelin tema seçme ekranının listesi: sitenin kullanabileceği temalar, sırasıyla.
  const kullanilabilirTemalar = (): Pick<Tema, "kod" | "kaynak" | "ad">[] =>
    site().temalar.map(({ kod, kaynak, ad }) => ({ kod, kaynak, ad }));

  return {
    temaDurumu,
    gecerliTema,
    temayiYayinla,
    oncekiSurumeDon,
    temaSurumleriniOku,
    kullanilabilirTemalar,
  };
};

const calisanSiteninServisi = temaServisi(calisanSite);

// Çalışan sitenin tema servisi: uçlar bunu kullanır.
export const siteninTemaServisi = () => calisanSiteninServisi;
export const temaDegistirilebilirMi = () => calisanSite().ayarlar.temaDegistirilebilir;

export const siteninGecerliTemasi = (vt: Veritabani = siteninVeritabani()) =>
  calisanSiteninServisi.gecerliTema(vt);
