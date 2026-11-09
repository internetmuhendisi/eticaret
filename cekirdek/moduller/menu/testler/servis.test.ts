// Menü servisi gerçek veritabanıyla (kart 0107, karar 0082): her hedef türüne bağlanma, silinen ya da
// açılmayan hedefin vitrinde görünmeyip panelde işaretlenmesi, sıralama, derinlik sınırı (serviste ve
// veritabanında), kategori menüsünün ağaçla aynı olması, değişiklik kaydı, aynı anda gelen yazmalar ve iki
// sitenin ayrı kalması.
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import {
  kullanilabilirMenuHedefleri,
  menuHedefTurleri,
  menuSinirlari,
  menuTurleri,
} from "../../../kayitlar/menu.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriDegistir, kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { urunServisi, urunuOku } from "../../urun/servis.ts";
import { menuler, menuOgeleri } from "../model.ts";
import { ogeGirdisi } from "../semalar.ts";
import {
  type MenuDali,
  menuDegistir,
  menuEkle,
  menuSil,
  ogeDegistir,
  ogeEkle,
  ogeleriSirala,
  ogeSil,
  panelMenusu,
  vitrinMenusu,
} from "../servis.ts";

const urunler = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("menu");
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

// Veritabanının reddettiği doğrudan yazı: hatanın kısıt adı ya da iletisi döner.
const veritabaniReddi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (hata === undefined) throw new Error("Veritabanı reddetmeliydi.");
  const neden = (hata as { cause?: { constraint?: string; message?: string } }).cause;
  return neden?.constraint ?? neden?.message ?? String(hata);
};

let sayac = 0;
const urun = (vt: Veritabani, ek: Record<string, unknown> = {}) => {
  sayac += 1;
  return urunler.urunEkle(vt, yonetici(), {
    ad: `Ürün ${sayac}`,
    vergiSinifi: null,
    durum: "yayinda",
    ...ek,
  });
};

const elleMenu = (vt: Veritabani, kod = "ana-menu") =>
  menuEkle(vt, yonetici(), { kod, ad: "Ana menü", tur: "elle" });

// Vitrin ağacını kısaltır: [metin, hedef özeti, altlar].
type Ozet = [string, string, Ozet[]];
const ozet = (dallar: MenuDali[] | undefined): Ozet[] =>
  (dallar ?? []).map((dal) => [
    dal.metin,
    dal.hedef.tur === "adres"
      ? `adres ${dal.hedef.adres}${dal.hedef.yeniSekme ? " yeni" : ""}`
      : dal.hedef.tur === "baslik"
        ? "baslik"
        : `${dal.hedef.tur} ${dal.hedef.adresAdi}`,
    ozet(dal.altlar),
  ]);

const kayitlar = async (vt: Veritabani) =>
  vt.select().from(degisiklikKayitlari).orderBy(asc(degisiklikKayitlari.zaman));

describe("hedefler", () => {
  it("öğe her hedef türüne bağlanır; boş metin bağlı kaydın adını alır, ad değişince menü de değişir", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim", adresAdi: "giyim" });
    const marka = await markaServisi.ekle(vt, yonetici(), { ad: "Örnek", adresAdi: "ornek" });
    const urunKimligi = await urun(vt, { ad: "Kupa", adresAdi: "kupa" });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "kategori", kimlik: kategori } });
    await ogeEkle(vt, yonetici(), menu, {
      metin: "Markamız",
      hedef: { tur: "marka", kimlik: marka },
    });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "urun", kimlik: urunKimligi } });
    await ogeEkle(vt, yonetici(), menu, {
      metin: "Sözleşme",
      hedef: { tur: "adres", adres: "/yasal/uyelik-sozlesmesi" },
    });
    await ogeEkle(vt, yonetici(), menu, {
      metin: "Yardım",
      hedef: { tur: "adres", adres: "https://yardim.example/sss", yeniSekme: true },
    });
    const baslik = await ogeEkle(vt, yonetici(), menu, {
      metin: "Kampanyalar",
      hedef: { tur: "baslik" },
    });
    await ogeEkle(vt, yonetici(), menu, {
      hedef: { tur: "kategori", kimlik: kategori },
      ust: baslik,
    });
    expect(ozet(await vitrinMenusu(vt, "ana-menu"))).toEqual([
      ["Giyim", "kategori giyim", []],
      ["Markamız", "marka ornek", []],
      ["Kupa", "urun kupa", []],
      ["Sözleşme", "adres /yasal/uyelik-sozlesmesi", []],
      ["Yardım", "adres https://yardim.example/sss yeni", []],
      ["Kampanyalar", "baslik", [["Giyim", "kategori giyim", []]]],
    ]);
    await kategoriDegistir(vt, yonetici(), kategori, { ad: "Kadın Giyim", adresAdi: "kadin" });
    const sonra = ozet(await vitrinMenusu(vt, "ana-menu"));
    expect(sonra[0]).toEqual(["Kadın Giyim", "kategori kadin", []]);
    expect(sonra[5]).toEqual(["Kampanyalar", "baslik", [["Kadın Giyim", "kategori kadin", []]]]);
    expect(await vitrinMenusu(vt, "olmayan")).toBeUndefined();
  });

  it("sayfa hedefi bugün seçilemez; olmayan, silinmiş ve bozuk kimlikli hedef reddedilir", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    expect(kullanilabilirMenuHedefleri.sayfa).toBe(false);
    // Panel aynı şemayı kullanır: hata ekranda da aynı koddur.
    const sema = ogeGirdisi.safeParse({ hedef: { tur: "sayfa", kimlik: randomUUID() } });
    expect(sema.error?.issues.map((sorun) => [sorun.path.join("."), sorun.message])).toEqual([
      ["hedef.tur", "hedef-kullanilamaz"],
    ]);
    expect(
      await hatasi(
        ogeEkle(vt, yonetici(), menu, { hedef: { tur: "sayfa", kimlik: randomUUID() } }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "hedef.tur", kod: "hedef-kullanilamaz" }] });
    const silinen = await kategoriEkle(vt, yonetici(), { ad: "Eski" });
    await kategoriSil(vt, yonetici(), silinen);
    const silinenUrun = await urun(vt);
    await urunler.urunSil(vt, yonetici(), silinenUrun);
    for (const hedef of [
      { tur: "kategori", kimlik: silinen },
      { tur: "kategori", kimlik: randomUUID() },
      { tur: "marka", kimlik: randomUUID() },
      { tur: "urun", kimlik: silinenUrun },
    ] as const) {
      expect(await hatasi(ogeEkle(vt, yonetici(), menu, { hedef }))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "hedef.kimlik", kod: "hedef-yok" }],
      });
    }
    expect(
      (await hatasi(ogeEkle(vt, yonetici(), menu, { hedef: { tur: "kategori", kimlik: "1" } })))
        .kod,
    ).toBe("dogrulama");
    expect(await vt.select().from(menuOgeleri)).toEqual([]);
  });

  it("adres kuralı bölümlerdekiyle aynı; adres ve başlığın metni zorunlu", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    for (const adres of [
      "javascript:alert(1)",
      "http://site.example",
      "//site.example",
      "https://kullanici:sifre@site.example",
      "https://site.example:8443",
      "/sayfa\u0000",
    ]) {
      const sonuc = await hatasi(
        ogeEkle(vt, yonetici(), menu, { metin: "A", hedef: { tur: "adres", adres } }),
      );
      expect(sonuc.kod, adres).toBe("dogrulama");
      expect(sonuc.ayrinti, adres).toContainEqual({
        alan: "hedef.adres",
        kod: "baglanti-gecersiz",
      });
    }
    // Kaydın e-posta sandığı adres kodla reddedilir, kayıtta beklenmeyen hataya dönmez.
    expect(
      await hatasi(
        ogeEkle(vt, yonetici(), menu, {
          metin: "A",
          hedef: { tur: "adres", adres: "https://www.tiktok.com/@magaza" },
        }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "hedef.adres", kod: "kayda-uygun-degil" }] });
    expect(
      await hatasi(ogeEkle(vt, yonetici(), menu, { hedef: { tur: "adres", adres: "/a" } })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "metin", kod: "metin-gerekli" }] });
    expect(await hatasi(ogeEkle(vt, yonetici(), menu, { hedef: { tur: "baslik" } }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "metin", kod: "metin-gerekli" }],
    });
    expect(
      await hatasi(ogeEkle(vt, yonetici(), menu, { metin: "a\u0007b", hedef: { tur: "baslik" } })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "metin", kod: "denetim-karakteri" }] });
    // Değişiklikte birleşmiş öğeye bakılır: adresin metni boşaltılamaz.
    const oge = await ogeEkle(vt, yonetici(), menu, {
      metin: "A",
      hedef: { tur: "adres", adres: "/a" },
    });
    expect(await hatasi(ogeDegistir(vt, yonetici(), oge, { metin: null }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "metin", kod: "metin-gerekli" }],
    });
  });
});

describe("silinen ve açılmayan hedef", () => {
  it("vitrinde altlarıyla görünmez, panelde işaretlenir; görünür altı kalmayan başlık görünmez", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const giyim = await kategoriEkle(vt, yonetici(), { ad: "Giyim", adresAdi: "giyim" });
    const ev = await kategoriEkle(vt, yonetici(), { ad: "Ev", adresAdi: "ev" });
    const marka = await markaServisi.ekle(vt, yonetici(), { ad: "Örnek", adresAdi: "ornek" });
    const silinecekUrun = await urun(vt, { ad: "Kupa", adresAdi: "kupa" });
    const gizli = await urun(vt, { ad: "Gizli", adresAdi: "gizli", durum: "gizli" });
    const arsiv = await urun(vt, { ad: "Arşiv", adresAdi: "arsiv" });
    const giyimOgesi = await ogeEkle(vt, yonetici(), menu, {
      hedef: { tur: "kategori", kimlik: giyim },
    });
    await ogeEkle(vt, yonetici(), menu, {
      metin: "Alt",
      hedef: { tur: "adres", adres: "/a" },
      ust: giyimOgesi,
    });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "kategori", kimlik: ev } });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "marka", kimlik: marka } });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "urun", kimlik: silinecekUrun } });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "urun", kimlik: gizli } });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "urun", kimlik: arsiv } });
    const baslik = await ogeEkle(vt, yonetici(), menu, {
      metin: "Markalar",
      hedef: { tur: "baslik" },
    });
    await ogeEkle(vt, yonetici(), menu, {
      hedef: { tur: "marka", kimlik: marka },
      ust: baslik,
    });
    await ogeEkle(vt, yonetici(), menu, { metin: "Boş", hedef: { tur: "baslik" } });

    await kategoriSil(vt, yonetici(), giyim);
    await markaServisi.sil(vt, yonetici(), marka);
    await urunler.urunSil(vt, yonetici(), silinecekUrun);
    await urunler.urunDegistir(vt, yonetici(), arsiv, { durum: "arsiv" });

    // Gizli ürünün sayfası bağlantıyla açılır: menüde görünür.
    expect(ozet(await vitrinMenusu(vt, "ana-menu"))).toEqual([
      ["Ev", "kategori ev", []],
      ["Gizli", "urun gizli", []],
    ]);
    const panel = await panelMenusu(vt, menu);
    if (!("ogeler" in panel)) throw new Error("Elle kurulan menü beklenirdi.");
    const durumlar = (ogeler: typeof panel.ogeler): unknown[] =>
      ogeler.map((oge) => [oge.gorunenMetin, oge.durum, durumlar(oge.altlar)]);
    expect(durumlar(panel.ogeler)).toEqual([
      ["Giyim", "hedef-silindi", [["Alt", "gecerli", []]]],
      ["Ev", "gecerli", []],
      ["Örnek", "hedef-silindi", []],
      ["Kupa", "hedef-silindi", []],
      ["Gizli", "gecerli", []],
      ["Arşiv", "hedef-gorunmuyor", []],
      ["Markalar", "bos-baslik", [["Örnek", "hedef-silindi", []]]],
      ["Boş", "bos-baslik", []],
    ]);
    // Panel bağlantının kimliğini görür: hedef değiştirilerek düzeltilir.
    expect(panel.ogeler[0]?.hedef).toEqual({ tur: "kategori", kimlik: giyim });
    await ogeDegistir(vt, yonetici(), giyimOgesi, { hedef: { tur: "kategori", kimlik: ev } });
    expect(ozet(await vitrinMenusu(vt, "ana-menu"))[0]).toEqual([
      "Ev",
      "kategori ev",
      [["Alt", "adres /a", []]],
    ]);
  });

  it("zamanlanmış ürün yayın zamanından önce görünmez, zamanında görünür", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const yayin = new Date(Date.now() + 3_600_000);
    const zamanli = await urun(vt, {
      ad: "Yakında",
      durum: "zamanlanmis",
      yayinZamani: yayin.toISOString().slice(0, 16),
    });
    await ogeEkle(vt, yonetici(), menu, { hedef: { tur: "urun", kimlik: zamanli } });
    const okunan = await urunuOku(zamanli, vt);
    const an = okunan?.yayinZamani ?? yayin;
    expect(await vitrinMenusu(vt, "ana-menu", { an: new Date(an.getTime() - 1) })).toEqual([]);
    expect(ozet(await vitrinMenusu(vt, "ana-menu", { an }))[0]?.[0]).toBe("Yakında");
  });
});

describe("sıralama ve derinlik", () => {
  it("yeni öğe kardeşlerin sonuna gelir; sıralama kardeşlerin hepsini ister ve kayda girer", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const ekle = (metin: string, ust: string | null = null) =>
      ogeEkle(vt, yonetici(), menu, { metin, hedef: { tur: "adres", adres: `/${metin}` }, ust });
    const a = await ekle("a");
    const b = await ekle("b");
    const c = await ekle("c");
    const a1 = await ekle("a1", a);
    const a2 = await ekle("a2", a);
    const metinler = async () =>
      ozet(await vitrinMenusu(vt, "ana-menu")).map(([metin, , altlar]) => [
        metin,
        altlar.map(([alt]) => alt),
      ]);
    expect(await metinler()).toEqual([
      ["a", ["a1", "a2"]],
      ["b", []],
      ["c", []],
    ]);
    await ogeleriSirala(vt, yonetici(), menu, null, [c, a, b]);
    await ogeleriSirala(vt, yonetici(), menu, a, [a2, a1]);
    expect(await metinler()).toEqual([
      ["c", []],
      ["a", ["a2", "a1"]],
      ["b", []],
    ]);
    for (const yanlis of [
      [c, a],
      [c, a, b, b],
      [c, a, a1],
      [c, a, b, randomUUID()],
    ]) {
      expect(await hatasi(ogeleriSirala(vt, yonetici(), menu, null, yanlis))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "kimlikler", kod: "siralama-gecersiz" }],
      });
    }
    // Aynı sıra kayda girmez.
    const once = (await kayitlar(vt)).length;
    await ogeleriSirala(vt, yonetici(), menu, null, [c, a, b]);
    expect(await kayitlar(vt)).toHaveLength(once);
    const siralama = (await kayitlar(vt)).filter((k) => k.islem === "menu-ogesi.siralandi");
    expect(
      siralama.map((k) => [k.kayit_turu, k.kayit_kimligi, k.eski_deger, k.yeni_deger]),
    ).toEqual([
      ["menu", menu, { sira: [a, b, c] }, { sira: [c, a, b] }],
      ["menu", menu, { ust: a, sira: [a1, a2] }, { ust: a, sira: [a2, a1] }],
    ]);
    // Verilen sıra yerini alır; taşınan öğe yeni kardeşlerin sonuna gelir.
    await ogeDegistir(vt, yonetici(), b, { ust: a });
    expect(await metinler()).toEqual([
      ["c", []],
      ["a", ["a2", "a1", "b"]],
    ]);
  });

  it("derinlik sınırı tutar: alt öğenin altı olmaz, altı olan öğe başka öğenin altına taşınamaz", async () => {
    const vt = await siteAc();
    expect(menuSinirlari.derinlik).toBe(2);
    const menu = await elleMenu(vt);
    const oteki = await elleMenu(vt, "oteki");
    const ekle = (metin: string, ust: string | null = null, hangi = menu) =>
      ogeEkle(vt, yonetici(), hangi, { metin, hedef: { tur: "adres", adres: `/${metin}` }, ust });
    const a = await ekle("a");
    const a1 = await ekle("a1", a);
    const b = await ekle("b");
    const derinlik = { kod: "is-kurali", ayrinti: [{ alan: "ust", kod: "derinlik" }] };
    expect(await hatasi(ekle("a11", a1))).toEqual(derinlik);
    expect(await hatasi(ogeDegistir(vt, yonetici(), a, { ust: b }))).toEqual(derinlik);
    expect(await hatasi(ogeDegistir(vt, yonetici(), b, { ust: a1 }))).toEqual(derinlik);
    expect(await hatasi(ogeDegistir(vt, yonetici(), a, { ust: a1 }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "ust", kod: "ust-gecersiz" }],
    });
    // Başka menünün öğesi, silinmiş öğe ve olmayan öğe üst olamaz.
    const baskasi = await ekle("x", null, oteki);
    const silinen = await ekle("s");
    await ogeSil(vt, yonetici(), silinen);
    for (const ust of [baskasi, silinen, randomUUID()]) {
      expect(await hatasi(ekle("y", ust))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "ust", kod: "ust-gecersiz" }],
      });
    }
    // Alt öğe üste çıkabilir, sonra altı olmayan öğe bir alta inebilir.
    await ogeDegistir(vt, yonetici(), a1, { ust: null });
    await ogeDegistir(vt, yonetici(), b, { ust: a1 });
    expect(
      ozet(await vitrinMenusu(vt, "ana-menu")).map(([metin, , altlar]) => [metin, altlar.length]),
    ).toEqual([
      ["a", 0],
      ["a1", 1],
    ]);
  });

  it("veritabanı da derinliği, döngüyü, menüyü ve hedefi denetler; listeleri kayıtla aynıdır", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const oteki = await elleMenu(vt, "oteki");
    const agac = await menuEkle(vt, yonetici(), { kod: "agac", ad: "Ağaç", tur: "kategori-agaci" });
    const satir = (ek: Partial<typeof menuOgeleri.$inferInsert>) => ({
      menu_kimligi: menu,
      hedef_turu: "baslik",
      metin: "a",
      ...ek,
    });
    const [a] = await vt.insert(menuOgeleri).values(satir({})).returning();
    if (a === undefined) throw new Error("Satır yazılmadı.");
    const [a1] = await vt
      .insert(menuOgeleri)
      .values(satir({ ust_kimligi: a.kimlik }))
      .returning();
    if (a1 === undefined) throw new Error("Satır yazılmadı.");
    expect(
      await veritabaniReddi(vt.insert(menuOgeleri).values(satir({ ust_kimligi: a1.kimlik }))),
    ).toMatch(/derinligi asildi/);
    expect(
      await veritabaniReddi(
        vt
          .update(menuOgeleri)
          .set({ ust_kimligi: a1.kimlik })
          .where(eq(menuOgeleri.kimlik, a.kimlik)),
      ),
    ).toMatch(/kendi altina|derinligi/);
    expect(
      await veritabaniReddi(
        vt.insert(menuOgeleri).values(satir({ menu_kimligi: oteki, ust_kimligi: a.kimlik })),
      ),
    ).toMatch(/ayni menude/);
    expect(
      await veritabaniReddi(vt.insert(menuOgeleri).values(satir({ menu_kimligi: agac }))),
    ).toMatch(/elle kurulan menude/);
    // Hedef türü listesi kayıtla aynı: kullanılabilen her tür yazılır, sayfa ve tanımsız tür yazılmaz.
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "K" });
    const marka = await markaServisi.ekle(vt, yonetici(), { ad: "M" });
    const urunKimligi = await urun(vt);
    const alanlar = {
      kategori: { kategori_kimligi: kategori },
      marka: { marka_kimligi: marka },
      urun: { urun_kimligi: urunKimligi },
      sayfa: {},
      adres: { adres: "/a" },
      baslik: {},
    } as const;
    for (const tur of menuHedefTurleri) {
      const yaz = vt.insert(menuOgeleri).values(satir({ hedef_turu: tur, ...alanlar[tur] }));
      if (kullanilabilirMenuHedefleri[tur]) await yaz;
      else expect(await veritabaniReddi(yaz), tur).toBe("menu_ogeleri_hedef");
    }
    for (const yanlis of [
      satir({ hedef_turu: "baska" }),
      satir({ hedef_turu: "kategori" }),
      satir({ hedef_turu: "baslik", kategori_kimligi: kategori }),
      satir({ hedef_turu: "adres", adres: "/a", metin: null }),
      satir({ hedef_turu: "baslik", yeni_sekme: true }),
    ]) {
      expect(await veritabaniReddi(vt.insert(menuOgeleri).values(yanlis))).toBe(
        "menu_ogeleri_hedef",
      );
    }
    // Menü türü listesi kayıtla aynı.
    for (const tur of menuTurleri) {
      await vt.insert(menuler).values({ kod: `tur-${tur}`, ad: "T", tur });
    }
    expect(
      await veritabaniReddi(vt.insert(menuler).values({ kod: "x", ad: "T", tur: "baska" })),
    ).toBe("menuler_tur");
  });
});

describe("kategori menüsü", () => {
  it("kategori ağacıyla aynıdır: kardeş sırasıyla, derinlik sınırına kadar; ağaç değişince değişir", async () => {
    const vt = await siteAc();
    const menu = await menuEkle(vt, yonetici(), {
      kod: "kategori-menusu",
      ad: "Kategoriler",
      tur: "kategori-agaci",
    });
    const giyim = await kategoriEkle(vt, yonetici(), { ad: "Giyim", adresAdi: "giyim", sira: 1 });
    const ev = await kategoriEkle(vt, yonetici(), { ad: "Ev", adresAdi: "ev", sira: 0 });
    const kadin = await kategoriEkle(vt, yonetici(), {
      ad: "Kadın",
      adresAdi: "kadin",
      ust: giyim,
    });
    await kategoriEkle(vt, yonetici(), { ad: "Erkek", adresAdi: "erkek", ust: giyim, sira: 0 });
    await kategoriEkle(vt, yonetici(), { ad: "Elbise", adresAdi: "elbise", ust: kadin });
    expect(ozet(await vitrinMenusu(vt, "kategori-menusu"))).toEqual([
      ["Ev", "kategori ev", []],
      [
        "Giyim",
        "kategori giyim",
        [
          ["Erkek", "kategori erkek", []],
          ["Kadın", "kategori kadin", []],
        ],
      ],
    ]);
    // Silinen kategorinin altı bir üste çıkar: menü de öyle gösterir. Sırası eşit kardeşler ağaçta olduğu
    // gibi ada göre dizilir (kategorileriOku).
    await kategoriSil(vt, yonetici(), giyim);
    await kategoriDegistir(vt, yonetici(), ev, { ad: "Ev ve Yaşam" });
    expect(ozet(await vitrinMenusu(vt, "kategori-menusu"))).toEqual([
      ["Erkek", "kategori erkek", []],
      ["Ev ve Yaşam", "kategori ev", []],
      ["Kadın", "kategori kadin", [["Elbise", "kategori elbise", []]]],
    ]);
    const panel = await panelMenusu(vt, menu);
    expect("kategoriAgaci" in panel && ozet(panel.kategoriAgaci)).toEqual(
      ozet(await vitrinMenusu(vt, "kategori-menusu")),
    );
    expect(
      await hatasi(ogeEkle(vt, yonetici(), menu, { metin: "a", hedef: { tur: "baslik" } })),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "menu", kod: "kategori-menusu" }] });
  });
});

describe("menüler", () => {
  it("kod tekildir ve biçimlidir; silinen menünün öğeleri silinir, kodu serbest kalır", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    expect(await hatasi(elleMenu(vt))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kod", kod: "kod-tekrar" }],
    });
    expect(
      await hatasi(menuEkle(vt, yonetici(), { kod: "Ana Menü", ad: "A", tur: "elle" })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "kod", kod: "kod-bicimi" }] });
    const a = await ogeEkle(vt, yonetici(), menu, { metin: "a", hedef: { tur: "baslik" } });
    await ogeEkle(vt, yonetici(), menu, { metin: "a1", hedef: { tur: "baslik" }, ust: a });
    await menuDegistir(vt, yonetici(), menu, { ad: "Üst menü" });
    await menuSil(vt, yonetici(), menu);
    expect(await vitrinMenusu(vt, "ana-menu")).toBeUndefined();
    expect(
      (await vt.select().from(menuOgeleri)).every((satir) => satir.silinme_zamani !== null),
    ).toBe(true);
    expect(
      await hatasi(ogeEkle(vt, yonetici(), menu, { metin: "b", hedef: { tur: "baslik" } })),
    ).toEqual({ kod: "bulunamadi", ayrinti: undefined });
    const yeni = await elleMenu(vt);
    expect(yeni).not.toBe(menu);
    expect(await vitrinMenusu(vt, "ana-menu")).toEqual([]);
    for (const is of [
      () => menuSil(vt, yonetici(), "bozuk"),
      () => panelMenusu(vt, randomUUID()),
      () => ogeSil(vt, yonetici(), "bozuk"),
      () => ogeDegistir(vt, yonetici(), randomUUID(), { metin: "x" }),
    ]) {
      expect((await hatasi(is())).kod).toBe("bulunamadi");
    }
  });

  it("öğe ve menü sayısının sınırı tutar", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    for (let sira = 0; sira < menuSinirlari.ogeSayisi; sira += 1) {
      await ogeEkle(vt, yonetici(), menu, { metin: `${sira}`, hedef: { tur: "baslik" } });
    }
    expect(
      await hatasi(ogeEkle(vt, yonetici(), menu, { metin: "x", hedef: { tur: "baslik" } })),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "menu", kod: "menu-dolu" }] });
    for (let sira = 1; sira < menuSinirlari.menuSayisi; sira += 1) await elleMenu(vt, `m${sira}`);
    expect(await hatasi(elleMenu(vt, "son"))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "menu", kod: "menu-sayisi" }],
    });
  });

  it("silinen öğenin altları da silinir; her işlem değişiklik kaydına girer", async () => {
    const vt = await siteAc();
    const kim = yonetici();
    const menu = await menuEkle(vt, kim, { kod: "ana-menu", ad: "Ana menü", tur: "elle" });
    const kategori = await kategoriEkle(vt, kim, { ad: "Giyim" });
    const a = await ogeEkle(vt, kim, menu, { hedef: { tur: "kategori", kimlik: kategori } });
    const a1 = await ogeEkle(vt, kim, menu, {
      metin: "Yardım",
      hedef: { tur: "adres", adres: "https://yardim.example", yeniSekme: true },
      ust: a,
    });
    await ogeDegistir(vt, kim, a, { metin: "Giysi" });
    // Aynı kalan değişiklik kayda girmez.
    await ogeDegistir(vt, kim, a, { metin: "Giysi", hedef: { tur: "kategori", kimlik: kategori } });
    await ogeSil(vt, kim, a);
    expect(await vitrinMenusu(vt, "ana-menu")).toEqual([]);
    // Alt öğe de silinmiş işaretlenir: yalnız vitrinde gizlenmez.
    const [altSatir] = await vt.select().from(menuOgeleri).where(eq(menuOgeleri.kimlik, a1));
    expect(altSatir?.silinme_zamani).not.toBeNull();
    const menununKayitlari = (await kayitlar(vt)).filter((k) => k.islem.startsWith("menu"));
    expect(
      menununKayitlari.map((k) => [
        k.islem,
        k.kayit_turu,
        k.kayit_kimligi,
        k.eski_deger,
        k.yeni_deger,
      ]),
    ).toEqual([
      ["menu.eklendi", "menu", menu, null, { kod: "ana-menu", ad: "Ana menü", tur: "elle" }],
      [
        "menu-ogesi.eklendi",
        "menu-ogesi",
        a,
        null,
        { menu, hedef: { tur: "kategori", kimlik: kategori }, sira: 0 },
      ],
      [
        "menu-ogesi.eklendi",
        "menu-ogesi",
        a1,
        null,
        {
          menu,
          metin: "Yardım",
          hedef: { tur: "adres", adres: "https://yardim.example", yeniSekme: true },
          ust: a,
          sira: 0,
        },
      ],
      ["menu-ogesi.degisti", "menu-ogesi", a, { metin: null }, { metin: "Giysi" }],
      [
        "menu-ogesi.silindi",
        "menu-ogesi",
        a,
        {
          menu,
          metin: "Giysi",
          hedef: { tur: "kategori", kimlik: kategori },
          sira: 0,
          altlar: [a1],
        },
        null,
      ],
    ]);
    expect(
      menununKayitlari.every((k) => k.kim_kimligi === (kim as { kimlik: string }).kimlik),
    ).toBe(true);
  });
});

describe("aynı anda", () => {
  it("aynı anda altı ekleme sırayla yazılır: sıralar tekrarsız", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    await Promise.all(
      Array.from({ length: 6 }, (_, sira) =>
        ogeEkle(vt, yonetici(), menu, { metin: `${sira}`, hedef: { tur: "baslik" } }),
      ),
    );
    const siralar = (await vt.select({ sira: menuOgeleri.sira }).from(menuOgeleri)).map(
      (satir) => satir.sira,
    );
    expect(siralar.toSorted()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("aynı anda silinen kategoriye bağlanılmaz: silme bitene kadar beklenir, sonra reddedilir", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let yazdi: () => void = () => undefined;
    const yazildi = new Promise<void>((coz) => {
      yazdi = coz;
    });
    const silme = vt.transaction(async (islem) => {
      await islem
        .update(kategoriler)
        .set({ silinme_zamani: sql`now()` })
        .where(eq(kategoriler.kimlik, kategori));
      yazdi();
      await tut;
    });
    await yazildi;
    const ekleme = hatasi(
      ogeEkle(vt, yonetici(), menu, { hedef: { tur: "kategori", kimlik: kategori } }),
    );
    await kilitBekleyeniGor(vt);
    birak();
    await silme;
    expect((await ekleme).ayrinti).toEqual([{ alan: "hedef.kimlik", kod: "hedef-yok" }]);
    expect(await vt.select().from(menuOgeleri)).toEqual([]);
  });

  it("aynı anda iki ters taşıma döngü kurmaz: ikincisi kilitte bekler, sonra reddedilir", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const a = await ogeEkle(vt, yonetici(), menu, { metin: "a", hedef: { tur: "baslik" } });
    const b = await ogeEkle(vt, yonetici(), menu, { metin: "b", hedef: { tur: "baslik" } });
    // Birinci taşıma doğrudan yazıyla, açık duran işlemde: tetikleyici kilidi aldı.
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let yazdi: () => void = () => undefined;
    const yazildi = new Promise<void>((coz) => {
      yazdi = coz;
    });
    const birinci = vt.transaction(async (islem) => {
      await islem
        .update(menuOgeleri)
        .set({ ust_kimligi: b })
        .where(and(eq(menuOgeleri.kimlik, a)));
      yazdi();
      await tut;
    });
    await yazildi;
    const ikinci = hatasi(ogeDegistir(vt, yonetici(), b, { ust: a }));
    await kilitBekleyeniGor(vt);
    birak();
    await birinci;
    expect(await ikinci).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "ust", kod: "ust-gecersiz" }],
    });
  });
});

describe("iki site", () => {
  it("bir sitenin menüsü ve kaydı ötekinde görünmez, ötekinin kaydına bağlanılamaz", async () => {
    const birinci = await siteAc();
    const ikinci = await siteAc();
    const menu = await elleMenu(birinci);
    const kategori = await kategoriEkle(birinci, yonetici(), { ad: "Giyim", adresAdi: "giyim" });
    await ogeEkle(birinci, yonetici(), menu, { hedef: { tur: "kategori", kimlik: kategori } });
    expect(await vitrinMenusu(ikinci, "ana-menu")).toBeUndefined();
    expect((await hatasi(panelMenusu(ikinci, menu))).kod).toBe("bulunamadi");
    const oteki = await elleMenu(ikinci);
    expect(
      await hatasi(
        ogeEkle(ikinci, yonetici(), oteki, { hedef: { tur: "kategori", kimlik: kategori } }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "hedef.kimlik", kod: "hedef-yok" }] });
    expect(ozet(await vitrinMenusu(birinci, "ana-menu"))).toEqual([
      ["Giyim", "kategori giyim", []],
    ]);
  });
});

describe("bağımsız kontrolün bulguları", () => {
  it("büyük harfle yazılmış kimlik aynı kimliktir: aynı üst taşıma sayılmaz, kendi altına taşınamaz", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const ekle = (metin: string, ust: string | null = null) =>
      ogeEkle(vt, yonetici(), menu, { metin, hedef: { tur: "adres", adres: `/${metin}` }, ust });
    const a = await ekle("a");
    const a1 = await ekle("a1", a);
    await ekle("a2", a);
    const once = (await kayitlar(vt)).length;
    await ogeDegistir(vt, yonetici(), a1, { ust: a.toUpperCase() });
    expect(await kayitlar(vt)).toHaveLength(once);
    const [satir] = await vt.select().from(menuOgeleri).where(eq(menuOgeleri.kimlik, a1));
    expect([satir?.ust_kimligi, satir?.sira]).toEqual([a, 0]);
    expect(await hatasi(ogeDegistir(vt, yonetici(), a1, { ust: a1.toUpperCase() }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "ust", kod: "ust-gecersiz" }],
    });
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    const oge = await ogeEkle(vt, yonetici(), menu, {
      hedef: { tur: "kategori", kimlik: kategori.toUpperCase() },
    });
    const panel = await panelMenusu(vt, menu);
    expect("ogeler" in panel && panel.ogeler.find((o) => o.kimlik === oge)?.hedef).toEqual({
      tur: "kategori",
      kimlik: kategori,
    });
    // Sıralamada büyük harfle verilen kimlikler de aynı kardeşlerdir.
    const [b1, b2] = [a1, (await vitrinMenusu(vt, "ana-menu"))?.[0]?.altlar[1]?.kimlik ?? ""];
    await ogeleriSirala(vt, yonetici(), menu, a.toUpperCase(), [
      b2.toUpperCase(),
      b1.toUpperCase(),
    ]);
    expect((await vitrinMenusu(vt, "ana-menu"))?.[0]?.altlar.map((dal) => dal.metin)).toEqual([
      "a2",
      "a1",
    ]);
    const son = (await kayitlar(vt)).at(-1);
    expect(son?.yeni_deger).toEqual({ ust: a, sira: [b2, b1] });
  });

  it("silinmiş satırla doğrudan kurulmuş döngü servisi sonsuza döndürmez", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const a = await ogeEkle(vt, yonetici(), menu, { metin: "a", hedef: { tur: "baslik" } });
    const c = await ogeEkle(vt, yonetici(), menu, { metin: "c", hedef: { tur: "baslik" }, ust: a });
    await vt
      .update(menuOgeleri)
      .set({ silinme_zamani: sql`now()` })
      .where(eq(menuOgeleri.kimlik, a));
    await vt.update(menuOgeleri).set({ ust_kimligi: c }).where(eq(menuOgeleri.kimlik, a));
    const sonuc = await hatasi(
      ogeEkle(vt, yonetici(), menu, { metin: "x", hedef: { tur: "baslik" }, ust: c }),
    );
    expect(sonuc).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "ust", kod: "derinlik" }] });
  }, 15_000);

  it("veritabanı öğenin menüsünü, menünün kodunu ve türünü değiştirmez", async () => {
    const vt = await siteAc();
    const menu = await elleMenu(vt);
    const oteki = await elleMenu(vt, "oteki");
    const a = await ogeEkle(vt, yonetici(), menu, { metin: "a", hedef: { tur: "baslik" } });
    await ogeEkle(vt, yonetici(), menu, { metin: "a1", hedef: { tur: "baslik" }, ust: a });
    expect(
      await veritabaniReddi(
        vt.update(menuOgeleri).set({ menu_kimligi: oteki }).where(eq(menuOgeleri.kimlik, a)),
      ),
    ).toMatch(/menusu degismez/);
    for (const deger of [{ tur: "kategori-agaci" }, { kod: "yeni-kod" }]) {
      expect(
        await veritabaniReddi(vt.update(menuler).set(deger).where(eq(menuler.kimlik, menu))),
      ).toMatch(/kodu ve turu degismez/);
    }
    // Ad değişebilir.
    await vt.update(menuler).set({ ad: "Yeni ad" }).where(eq(menuler.kimlik, menu));
  });
});
