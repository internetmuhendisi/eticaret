// Tema değişikliği ve düzen geçmişi gerçek veritabanıyla (kart 0113, karar 0091): düzenin iki yolu (yeni
// temanın düzenini uygulamak, düzeni korumak), içeriğin yerinde kalması, görünümü olmayan bölümün
// varsayılana düşmesi, tema kodu değişen geri dönüşte düzenin ve ayarların aynen gelmesi, yalnız ayar
// değişikliğinde düzene dokunulmaması, yarıda kalan değişikliğin hiçbir şey bırakmaması, değişiklik kaydı,
// "temayı değiştirebilir" kapalıyken red ve aynı anda gelen işlemler.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { ornekRenk } from "../../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import { denemeKutuphanesi } from "../../../katalog/deneme-bolumu/tarif.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Tema } from "../../../temalar/temalar.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import type { BaslangicDuzeni, Duzen } from "../../../vitrin/bolum-kutuphanesi/duzen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyalar } from "../../dosya/model.ts";
import { gorselKaydet } from "../../dosya/servis.ts";
import { duzenSurumleri } from "../../duzen/model.ts";
import { duzenServisi } from "../../duzen/servis.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriEkle } from "../../kategori/servis.ts";
import { menuler } from "../../menu/model.ts";
import { menuEkle } from "../../menu/servis.ts";
import { urunler as urunTablosu } from "../../urun/model.ts";
import { urunServisi } from "../../urun/servis.ts";
import { temaSurumleri } from "../model.ts";
import { temaServisi } from "../servis.ts";

const ornekSite = siteKlasorunuOku(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "ayar-semasi",
    "testler",
    "ornek-siteler",
    "tema-ozel-ve-hazir",
  ),
);
const hazir = ornekSite.temalar.find((tema) => tema.kod === "canli-carsi");
if (hazir === undefined) throw new Error("Örnek sitede canlı çarşı yok.");

// İki tema, iki farklı başlangıç düzeniyle (deneme bölümleri).
const duzenA: BaslangicDuzeni = {
  "ust-kisim": [{ tur: "deneme-seridi", gizli: false, degerler: { metin: "A duyurusu" } }],
  "ana-sayfa": [
    { tur: "deneme-bolumu", gizli: false, degerler: { baslik: "A seçkileri" } },
    { tur: "deneme-yorumlari", gizli: false, degerler: { baslik: "A yorumları" } },
  ],
  "alt-kisim": [],
};
const duzenB: BaslangicDuzeni = {
  "ust-kisim": [],
  "ana-sayfa": [
    { tur: "deneme-bolumu", gorunum: "dar", gizli: false, degerler: { baslik: "B vitrini" } },
    { tur: "deneme-bolumu", gizli: false, degerler: { baslik: "B ikinci" } },
  ],
  "alt-kisim": [{ tur: "deneme-seridi", gizli: false, degerler: { metin: "B alt" } }],
};
const tema = (kod: string, baslangicDuzeni: BaslangicDuzeni): Tema => ({
  ...hazir,
  kod,
  ad: { metin: kod },
  tanim: { ...hazir.tanim, baslangicDuzeni },
});
const site: Site = {
  ...ornekSite,
  ayarlar: { ...ornekSite.ayarlar, temaDegistirilebilir: true },
  temalar: [tema("tema-a", duzenA), tema("tema-b", duzenB)],
  temaBaslangici: { tema: "tema-a", ayarlar: { renkler: {}, koyuTema: false } },
  duzenBaslangici: duzenA,
};
const kapali: Site = { ...site, ayarlar: { ...site.ayarlar, temaDegistirilebilir: false } };

const servisi = (s: Site) =>
  temaServisi(
    () => s,
    () => denemeKutuphanesi,
  );
const servis = servisi(site);
const duzen = duzenServisi(
  () => site,
  () => denemeKutuphanesi,
);
const urunler = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void> | void)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("tema-degisikligi");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const gorselAc = async (vt: Veritabani) => {
  const klasor = mkdtempSync(join(tmpdir(), "tema-degisikligi-"));
  temizlenecekler.push(() => rmSync(klasor, { recursive: true, force: true }));
  const icerik = await sharp({
    create: { width: 200, height: 100, channels: 3, background: { r: 40, g: 90, b: 160 } },
  })
    .png()
    .toBuffer();
  const sonuc = await gorselKaydet(vt, icerik, klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};

const temaSurumleriniOku = (vt: Veritabani) =>
  vt.select().from(temaSurumleri).orderBy(asc(temaSurumleri.sira));
const duzenSurumleriniOku = (vt: Veritabani) =>
  vt.select().from(duzenSurumleri).orderBy(asc(duzenSurumleri.sira));
const butunKayitlar = (vt: Veritabani) =>
  vt.select().from(degisiklikKayitlari).orderBy(asc(degisiklikKayitlari.zaman));
const gecerliDuzen = async (vt: Veritabani): Promise<Duzen> => (await duzen.duzenOku(vt)).duzen;
const ozet = (d: Duzen) =>
  Object.fromEntries(
    Object.entries(d).map(([alan, bolumler]) => [
      alan,
      bolumler.map(({ tur, gorunum, gizli, degerler }) => ({ tur, gorunum, gizli, degerler })),
    ]),
  );

// Mağaza sahibinin içeriği: görsel, kategori, seçilmiş ürün ve menü; A temasının seçkiler bölümüne
// konmuş, şerit gizlenmiş.
const icerikKur = async (vt: Veritabani) => {
  const gorsel = await gorselAc(vt);
  const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
  const urun = await urunler.urunEkle(vt, yonetici(), { ad: "Kupa", vergiSinifi: null });
  await menuEkle(vt, yonetici(), { kod: "ana-menu", ad: "Ana menü", tur: "elle" });
  const ilk = await gecerliDuzen(vt);
  const [seckiler] = ilk["ana-sayfa"];
  const [serit] = ilk["ust-kisim"];
  if (seckiler === undefined || serit === undefined) throw new Error("Başlangıç düzeni eksik.");
  const degerler = {
    baslik: "Mağazanın seçkileri",
    gorsel,
    kategori,
    urunler: { tur: "elle", urunler: [urun] },
  };
  await duzen.bolumDegistir(vt, yonetici(), seckiler.kimlik, { degerler });
  await duzen.bolumGorunurlugu(vt, yonetici(), serit.kimlik, true);
  return { gorsel, kategori, urun, seckiler: seckiler.kimlik, serit: serit.kimlik };
};

// İçerik tablolarının bütün satırları: tema değişikliği bunlara dokunmaz.
const icerikTablolari = async (vt: Veritabani) => ({
  dosyalar: await vt.select().from(dosyalar).orderBy(asc(dosyalar.kimlik)),
  kategoriler: await vt.select().from(kategoriler).orderBy(asc(kategoriler.kimlik)),
  urunler: await vt.select().from(urunTablosu).orderBy(asc(urunTablosu.kimlik)),
  menuler: await vt.select().from(menuler).orderBy(asc(menuler.kimlik)),
});

describe("yeni temanın düzenini uygulamak", () => {
  it("aynı türün içeriği taşınır, karşılığı olmayan eski bölüm gizli eklenir, içerik silinmez", async () => {
    const vt = await siteAc();
    const icerik = await icerikKur(vt);
    const once = await gecerliDuzen(vt);
    const tablolar = await icerikTablolari(vt);
    const [yorumlar] = once["ana-sayfa"].filter((bolum) => bolum.tur === "deneme-yorumlari");
    if (yorumlar === undefined) throw new Error("Yorum bölümü yok.");

    const yeni = await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "uygula",
    });
    expect(yeni.tema).toBe("tema-b");
    const sonra = await gecerliDuzen(vt);

    // Ana sayfa: B'nin ilk bölümü A'nın seçkilerini taşır (kimlik, değerler, görünürlük), görünümü B'nin;
    // ikincisi B'nin kendi bölümü; A'nın yorum bölümü gizli olarak sonda.
    const [birinci, ikinci, ucuncu, ...fazla] = sonra["ana-sayfa"];
    expect(fazla).toEqual([]);
    expect(birinci).toEqual({
      kimlik: icerik.seckiler,
      tur: "deneme-bolumu",
      gorunum: "dar",
      gizli: false,
      degerler: once["ana-sayfa"][0]?.degerler,
    });
    expect(birinci?.degerler).toMatchObject({
      gorsel: icerik.gorsel,
      kategori: icerik.kategori,
      urunler: { tur: "elle", urunler: [icerik.urun] },
    });
    expect(ikinci).toMatchObject({
      tur: "deneme-bolumu",
      gorunum: "genis",
      gizli: false,
      degerler: { baslik: "B ikinci" },
    });
    expect(once["ana-sayfa"].map((bolum) => bolum.kimlik)).not.toContain(ikinci?.kimlik);
    expect(ucuncu).toEqual({ ...yorumlar, gizli: true });
    // Üst kısım: B'de şerit yok, A'nın (zaten gizli) şeridi gizli olarak kalır. Alt kısım B'nin.
    expect(sonra["ust-kisim"]).toEqual(once["ust-kisim"].map((b) => ({ ...b, gizli: true })));
    expect(ozet(sonra)["alt-kisim"]).toEqual([
      { tur: "deneme-seridi", gorunum: "duz", gizli: false, degerler: { metin: "B alt" } },
    ]);
    // İçerik tablolarının hiçbir satırı değişmedi.
    expect(await icerikTablolari(vt)).toEqual(tablolar);

    // Tema ve düzen birer sürüm, kayıtlar aynı işlemde.
    const temalar = await temaSurumleriniOku(vt);
    const duzenler = await duzenSurumleriniOku(vt);
    expect(temalar.at(-1)).toMatchObject({ sira: 2, tema: "tema-b", onceki_duzen_sira: 3 });
    expect(duzenler.map((d) => d.sira)).toEqual([1, 2, 3, 4]);
    const kayitlar = await butunKayitlar(vt);
    const temaKaydi = kayitlar.find((k) => k.islem === "tema.yayinlandi");
    const duzenKaydi = kayitlar.find((k) => k.islem === "duzen.tema-degisti");
    expect(temaKaydi).toMatchObject({
      kayit_kimligi: yeni.kimlik,
      eski_deger: { tema: "tema-a" },
      yeni_deger: { tema: "tema-b", duzen: "uygula" },
    });
    expect(duzenKaydi).toMatchObject({
      kayit_kimligi: duzenler.at(-1)?.kimlik,
      eski_deger: { tema: "tema-a", sira: 3, temaSurumu: 1 },
      yeni_deger: {
        tema: "tema-b",
        yol: "uygula",
        sira: 4,
        temaSurumu: 2,
        tasinan: [icerik.seckiler],
        gizlenen: [icerik.serit, yorumlar.kimlik],
        disaridaKalan: [],
      },
    });
    expect(duzenKaydi?.zaman).toEqual(temaKaydi?.zaman);
  });

  it("alan sınırına sığmayan eski bölüm yalnız geçmişte kalır, kayda girer", async () => {
    const vt = await siteAc();
    // A'nın ana sayfasında 50 bölüm: seçkiler ve 49 yorum bölümü. B iki deneme bölümü getirir: biri
    // seçkileri taşır, öteki yenidir. 49 yorum bölümü sırasıyla gizli eklenir: 48'i sığar, en sondaki sığmaz.
    await duzen.duzenOku(vt);
    for (let i = 0; i < 48; i += 1) {
      await duzen.bolumEkle(vt, yonetici(), "ana-sayfa", {
        tur: "deneme-yorumlari",
        degerler: { baslik: `Ek ${i}` },
      });
    }
    const once = await gecerliDuzen(vt);
    expect(once["ana-sayfa"]).toHaveLength(50);
    const yorumlar = once["ana-sayfa"].find((bolum) => bolum.tur === "deneme-yorumlari");
    const sonEk = once["ana-sayfa"].at(-1);
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "uygula",
    });
    const sonra = await gecerliDuzen(vt);
    expect(sonra["ana-sayfa"]).toHaveLength(50);
    expect(sonra["ana-sayfa"].map((b) => b.kimlik)).not.toContain(sonEk?.kimlik);
    expect(sonra["ana-sayfa"][2]).toEqual({ ...yorumlar, gizli: true });
    expect(sonra["ana-sayfa"].filter((b) => !b.gizli)).toHaveLength(2);
    const kayit = (await butunKayitlar(vt)).find((k) => k.islem === "duzen.tema-degisti");
    expect(kayit?.yeni_deger).toMatchObject({ disaridaKalan: [sonEk?.kimlik] });
    // Geri dönüşle bütün hâli gelir.
    await servis.oncekiSurumeDon(vt, yonetici());
    expect(await gecerliDuzen(vt)).toEqual(once);
  });
});

describe("düzeni korumak", () => {
  it("düzen aynen kalır, yalnız tema değişir", async () => {
    const vt = await siteAc();
    await icerikKur(vt);
    const once = await duzen.duzenOku(vt);
    const tablolar = await icerikTablolari(vt);
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "koru",
    });
    expect(await duzen.duzenOku(vt)).toEqual(once);
    expect(await icerikTablolari(vt)).toEqual(tablolar);
    expect((await temaSurumleriniOku(vt)).at(-1)).toMatchObject({
      tema: "tema-b",
      onceki_duzen_sira: once.sira,
    });
    // Düzen değişmediği için düzen sürümü ve kaydı yazılmaz.
    expect((await butunKayitlar(vt)).map((k) => k.islem)).not.toContain("duzen.tema-degisti");
  });

  it("görünümü olmayan bölüm varsayılan görünüme düşer, silinmez; tanımsız türe dokunulmaz", async () => {
    const vt = await siteAc();
    const ilk = await gecerliDuzen(vt);
    const eskiGorunumlu = { ...ilk["ana-sayfa"][0], gorunum: "eski-gorunum" };
    const tanimsiz = {
      kimlik: randomUUID(),
      tur: "kaldirilan-bolum",
      gorunum: "duz",
      gizli: false,
      degerler: { baslik: "Eski" },
    };
    const bozuk = {
      ...ilk,
      "ana-sayfa": [eskiGorunumlu, ilk["ana-sayfa"][1], tanimsiz],
    };
    // Çekirdek güncellemesinden kalmış düzen: başka yoldan yazılır.
    await vt.insert(duzenSurumleri).values({ sira: 2, duzen: bozuk });
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "koru",
    });
    const sonra = await gecerliDuzen(vt);
    expect(sonra["ana-sayfa"]).toEqual([
      { ...eskiGorunumlu, gorunum: "genis" },
      ilk["ana-sayfa"][1],
      tanimsiz,
    ]);
    expect(sonra["ust-kisim"]).toEqual(ilk["ust-kisim"]);
    const kayit = (await butunKayitlar(vt)).find((k) => k.islem === "duzen.tema-degisti");
    expect(kayit?.yeni_deger).toMatchObject({
      yol: "koru",
      varsayilanaDusen: [eskiGorunumlu.kimlik],
    });
  });
});

describe("tema kodu değişmeyince", () => {
  it("yalnız ayar değişikliği ve geri dönüşü düzene dokunmaz, düzen yolu yok sayılır", async () => {
    const vt = await siteAc();
    await icerikKur(vt);
    const once = await duzen.duzenOku(vt);
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-a",
      ayarlar: { renkler: {}, koyuTema: true },
      duzen: "uygula",
    });
    await servis.oncekiSurumeDon(vt, yonetici());
    expect(await duzen.duzenOku(vt)).toEqual(once);
    expect((await temaSurumleriniOku(vt)).map((s) => s.tema)).toEqual([
      "tema-a",
      "tema-a",
      "tema-a",
    ]);
  });

  it("tema değişiyor ama yol verilmemişse reddedilir, hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    expect(
      await hatasi(
        servis.temayiYayinla(vt, yonetici(), { tema: "tema-b", ayarlar: { renkler: {} } }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "duzen", kod: "duzen-yolu-gerekli" }] });
    expect(await temaSurumleriniOku(vt)).toEqual([]);
    expect(await duzenSurumleriniOku(vt)).toEqual([]);
    expect(await butunKayitlar(vt)).toEqual([]);
  });
});

describe("geri dönüş", () => {
  it("önceki düzeni ve tema ayarlarını aynen getirir; sonradan yapılan düzen değişiklikleri geçmişte kalır", async () => {
    const vt = await siteAc();
    await icerikKur(vt);
    // A temasında ayarlar da değişmiş olsun.
    const aAyarlari = await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-a",
      ayarlar: { renkler: { birincil: ornekRenk.turuncu }, koyuTema: true },
    });
    const aDuzeni = await gecerliDuzen(vt);
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "uygula",
    });
    // B temasında düzen değişikliği.
    const eklenen = await duzen.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "B'de eklendi" },
    });
    const bDuzeni = await gecerliDuzen(vt);

    const donus = await servis.oncekiSurumeDon(vt, yonetici());
    expect(donus).toMatchObject({ tema: "tema-a", geriDonulenSira: aAyarlari.sira });
    expect(donus.ayarlar).toEqual(aAyarlari.ayarlar);
    expect(await gecerliDuzen(vt)).toEqual(aDuzeni);
    const kayit = (await butunKayitlar(vt)).find((k) => k.islem === "duzen.geri-donuldu");
    expect(kayit).toMatchObject({
      eski_deger: { tema: "tema-b", temaSurumu: 3 },
      yeni_deger: { tema: "tema-a", temaSurumu: 4 },
    });
    // B'de eklenen bölüm geçmişte duruyor.
    const gecmis = await duzenSurumleriniOku(vt);
    expect(JSON.stringify(gecmis.map((s) => s.duzen))).toContain(eklenen);

    // Art arda ikinci geri dönüş B'yi, B'nin son düzeniyle getirir.
    const ileri = await servis.oncekiSurumeDon(vt, yonetici());
    expect(ileri.tema).toBe("tema-b");
    expect(await gecerliDuzen(vt)).toEqual(bDuzeni);

    // Sırası verilen dönüş: başlangıç sürümü (tema A, ilk ayarlar), o sürüm geçerliyken düzenin son hâli.
    const baslangica = await servis.oncekiSurumeDon(vt, yonetici(), 1);
    expect(baslangica).toMatchObject({ tema: "tema-a", geriDonulenSira: 1 });
    expect(baslangica.ayarlar).toEqual({ renkler: {}, koyuTema: false });
    expect(await gecerliDuzen(vt)).toEqual(aDuzeni);
  });

  it("daha eski bir sürüme sırasıyla dönülünce o sürüm geçerliyken düzenin son hâli gelir", async () => {
    const vt = await siteAc();
    await icerikKur(vt);
    // Sürüm 1 (A) geçerliyken düzenin son hâli.
    const birinciDuzen = await gecerliDuzen(vt);
    const degistir = (kod: "tema-a" | "tema-b", duzenYolu: "uygula" | "koru") =>
      servis.temayiYayinla(vt, yonetici(), {
        tema: kod,
        ayarlar: { renkler: {} },
        duzen: duzenYolu,
      });
    await degistir("tema-b", "uygula");
    await duzen.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "B'de eklendi" },
    });
    await degistir("tema-a", "uygula");
    const ucuncuDuzen = await gecerliDuzen(vt);
    await degistir("tema-b", "koru");
    expect(ucuncuDuzen).not.toEqual(birinciDuzen);
    const donus = await servis.oncekiSurumeDon(vt, yonetici(), 1);
    expect(donus).toMatchObject({ sira: 5, tema: "tema-a", geriDonulenSira: 1 });
    expect(await gecerliDuzen(vt)).toEqual(birinciDuzen);
  });

  it("arada tema değiştiyse teması bugünküyle aynı eski sürüme dönüş de düzeni getirir", async () => {
    const vt = await siteAc();
    await icerikKur(vt);
    const birinciDuzen = await gecerliDuzen(vt);
    const degistir = (kod: "tema-a" | "tema-b") =>
      servis.temayiYayinla(vt, yonetici(), {
        tema: kod,
        ayarlar: { renkler: {} },
        duzen: "uygula",
      });
    await degistir("tema-b");
    await duzen.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "B'de eklendi" },
    });
    await degistir("tema-a");
    expect(await gecerliDuzen(vt)).not.toEqual(birinciDuzen);
    // Bugünkü tema da dönülen sürümün teması da A.
    const donus = await servis.oncekiSurumeDon(vt, yonetici(), 1);
    expect(donus).toMatchObject({ sira: 4, tema: "tema-a", geriDonulenSira: 1 });
    expect(await gecerliDuzen(vt)).toEqual(birinciDuzen);
    // Tema, ayarlar ve düzen aynı kalan dönüş hiçbir şey yazmaz.
    const temalar = await temaSurumleriniOku(vt);
    const duzenler = await duzenSurumleriniOku(vt);
    expect((await servis.oncekiSurumeDon(vt, yonetici(), 1)).sira).toBe(4);
    expect(await temaSurumleriniOku(vt)).toEqual(temalar);
    expect(await duzenSurumleriniOku(vt)).toEqual(duzenler);
  });

  it("kart 0113'ten önceki sürüme dönüşte düzen bilinmez: düzen korunur", async () => {
    const vt = await siteAc();
    await servis.temaDurumu(vt);
    const once = await duzen.duzenOku(vt);
    // Önceki düzeni saklamayan eski sürüm.
    await vt.insert(temaSurumleri).values({ sira: 2, tema: "tema-b", ayarlar: { renkler: {} } });
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {}, koyuTema: true },
    });
    await servis.oncekiSurumeDon(vt, yonetici(), 1);
    expect(await duzen.duzenOku(vt)).toEqual(once);
    expect((await temaSurumleriniOku(vt)).at(-1)?.tema).toBe("tema-a");
  });
});

describe("yarıda kalan değişiklik", () => {
  // Düzen sürümü yazılamaz: tema sürümü ve kaydı yazıldıktan sonra olur.
  const duzenYazilamasin = async (vt: Veritabani) => {
    await vt.execute(sql`create function duzen_yazilamasin() returns trigger language plpgsql as $$
      begin raise exception 'deneme: düzen yazılamadı'; end $$`);
    await vt.execute(sql`create trigger duzen_yazilamasin before insert on duzen_surumleri
      for each row execute function duzen_yazilamasin()`);
  };

  it("tema değişikliği ve geri dönüş hiçbir şey bırakmaz", async () => {
    const vt = await siteAc();
    await icerikKur(vt);
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "uygula",
    });
    const temalar = await temaSurumleriniOku(vt);
    const duzenler = await duzenSurumleriniOku(vt);
    const kayitlar = await butunKayitlar(vt);
    await duzenYazilamasin(vt);
    await expect(
      servis.temayiYayinla(vt, yonetici(), {
        tema: "tema-a",
        ayarlar: { renkler: {} },
        duzen: "uygula",
      }),
    ).rejects.toThrow();
    await expect(servis.oncekiSurumeDon(vt, yonetici())).rejects.toThrow();
    expect(await temaSurumleriniOku(vt)).toEqual(temalar);
    expect(await duzenSurumleriniOku(vt)).toEqual(duzenler);
    expect(await butunKayitlar(vt)).toEqual(kayitlar);
  });
});

describe('"Mağaza sahibi temayı değiştirebilir" kapalı', () => {
  it("tema değişikliği ve geri dönüş reddedilir, düzen değişmez", async () => {
    const vt = await siteAc();
    await servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "uygula",
    });
    const temalar = await temaSurumleriniOku(vt);
    const duzenler = await duzenSurumleriniOku(vt);
    const kapaliServis = servisi(kapali);
    const red = { kod: "is-kurali", ayrinti: [{ alan: "tema", kod: "tema-degistirilemez" }] };
    for (const yol of ["uygula", "koru"] as const) {
      expect(
        await hatasi(
          kapaliServis.temayiYayinla(vt, yonetici(), {
            tema: "tema-a",
            ayarlar: { renkler: {} },
            duzen: yol,
          }),
        ),
      ).toEqual(red);
    }
    expect(await hatasi(kapaliServis.oncekiSurumeDon(vt, yonetici()))).toEqual(red);
    expect(await temaSurumleriniOku(vt)).toEqual(temalar);
    expect(await duzenSurumleriniOku(vt)).toEqual(duzenler);
  });
});

describe("aynı anda", () => {
  it("tema değişikliği açık duran düzen işlemini bekler, onun yazdığı düzene uygulanır", async () => {
    const vt = await siteAc();
    await servis.temaDurumu(vt);
    const ilk = await duzen.duzenOku(vt);
    const eklenen = randomUUID();
    let birak = () => {};
    const bekle = new Promise<void>((cozul) => {
      birak = cozul;
    });
    // Düzen servisinin bir işlemi gibi: düzen kilidini alır, yeni sürümü yazar, bitmeden bekler.
    const acik = vt.transaction(async (islem) => {
      await islem.execute(sql`select pg_advisory_xact_lock(hashtext('duzen'))`);
      const yeni: Duzen = {
        ...ilk.duzen,
        "ana-sayfa": [
          ...ilk.duzen["ana-sayfa"],
          {
            kimlik: eklenen,
            tur: "deneme-bolumu",
            gorunum: "genis",
            gizli: false,
            degerler: { baslik: "Açık duran" },
          },
        ],
      };
      await islem.insert(duzenSurumleri).values({ sira: ilk.sira + 1, duzen: yeni });
      await bekle;
    });
    const degisiklik = servis.temayiYayinla(vt, yonetici(), {
      tema: "tema-b",
      ayarlar: { renkler: {} },
      duzen: "uygula",
    });
    try {
      await kilitBekleyeniGor(vt);
    } finally {
      birak();
    }
    await acik;
    await degisiklik;
    const sonra = await gecerliDuzen(vt);
    // A'nın iki deneme bölümü B'nin iki deneme bölümüne taşındı: açık duran işlemin eklediği de.
    expect(sonra["ana-sayfa"].map((bolum) => bolum.kimlik)).toContain(eklenen);
    expect((await temaSurumleriniOku(vt)).at(-1)?.onceki_duzen_sira).toBe(ilk.sira + 1);
  });

  it("tema değişikliği ile bölüm ekleme birbirini ezmez: eklenen bölüm her sırada düzende kalır", async () => {
    for (let deneme = 0; deneme < 3; deneme += 1) {
      const vt = await siteAc();
      await duzen.duzenOku(vt);
      const [, eklenen] = await Promise.all([
        servis.temayiYayinla(vt, yonetici(), {
          tema: "tema-b",
          ayarlar: { renkler: {} },
          duzen: "uygula",
        }),
        duzen.bolumEkle(vt, yonetici(), "ana-sayfa", {
          tur: "deneme-bolumu",
          degerler: { baslik: "Aynı anda" },
        }),
      ]);
      const sonra = await gecerliDuzen(vt);
      expect(sonra["ana-sayfa"].map((b) => b.kimlik)).toContain(eklenen);
      const duzenler = await duzenSurumleriniOku(vt);
      expect(duzenler.map((d) => d.sira)).toEqual(duzenler.map((_d, i) => i + 1));
    }
  });

  it("aynı anda gelen değişiklikler sırayla yazılır; her tema sürümü kendinden önceki düzeni saklar", async () => {
    const vt = await siteAc();
    await servis.temaDurumu(vt);
    await duzen.duzenOku(vt);
    // Her yayının ayarı farklı: hiçbiri son sürümle aynı kalıp atlanmaz.
    await Promise.all(
      (["tema-b", "tema-a", "tema-b", "tema-a"] as const).map((kod, i) =>
        servis.temayiYayinla(vt, yonetici(), {
          tema: kod,
          ayarlar: { renkler: { birincil: ornekRenk.turuncular[i] ?? ornekRenk.turuncu } },
          duzen: "uygula",
        }),
      ),
    );
    const temalar = await temaSurumleriniOku(vt);
    expect(temalar.map((t) => t.sira)).toEqual([1, 2, 3, 4, 5]);
    // Tema kodunu değiştiren her sürüm bir düzen sürümü yazdı ve kendinden hemen önceki düzeni sakladı.
    const duzenKayitlari = (await butunKayitlar(vt)).filter(
      (k) => k.islem === "duzen.tema-degisti",
    );
    const degisenler = temalar.filter((t, i) => i > 0 && temalar[i - 1]?.tema !== t.tema);
    expect(degisenler.length).toBeGreaterThan(0);
    expect(duzenKayitlari).toHaveLength(degisenler.length);
    for (const temaSurumu of degisenler) {
      const kayit = duzenKayitlari.find(
        (k) => (k.yeni_deger as { temaSurumu: number }).temaSurumu === temaSurumu.sira,
      );
      expect(kayit?.eski_deger).toMatchObject({ sira: temaSurumu.onceki_duzen_sira });
    }
    // Son düzen, son tema değişikliğinin yazdığı düzendir.
    const sonDuzen = await duzen.duzenOku(vt);
    const sonKayit = duzenKayitlari.find(
      (k) => (k.yeni_deger as { temaSurumu: number }).temaSurumu === degisenler.at(-1)?.sira,
    );
    expect(sonKayit?.yeni_deger).toMatchObject({ sira: sonDuzen.sira });
  });
});

describe("sürümün sakladığı düzen", () => {
  it("veritabanı sıfır ve eksi sırayı reddeder", async () => {
    const vt = await siteAc();
    for (const sira of [0, -1]) {
      await expect(
        vt
          .insert(temaSurumleri)
          .values({ sira: 1, tema: "tema-a", ayarlar: {}, onceki_duzen_sira: sira }),
      ).rejects.toThrow();
    }
    expect(await vt.select().from(temaSurumleri).where(eq(temaSurumleri.sira, 1))).toEqual([]);
  });
});
