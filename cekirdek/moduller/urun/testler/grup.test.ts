// Marka ve etiket gerçek veritabanıyla (kart 0078, karar 0064). İkisi aynı servisi kullandığı için her
// senaryo ikisinde de denenir: ekleme ve okuma, ad ve adres adı tekilliği, ürüne bağlama (marka tekil,
// etiket çoklu), silme kuralı (bağlantılar kalkar, ürün bozulmaz), grubun ürünlerinin tek sorguyla
// gelmesi, açık duran silmeyle yarış, bozuk kimlik, değişiklik kaydı ve iki sitenin ayrı kalması. Markanın
// logosu (kart 0111) en sonda.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyaSil, gorselKaydet } from "../../dosya/servis.ts";
import { etiketler, urunEtiketleri } from "../../etiket/model.ts";
import { etiketServisi } from "../../etiket/servis.ts";
import { markalar, urunMarkalari } from "../../marka/model.ts";
import { markaServisi } from "../../marka/servis.ts";
import type { UrunGirdisi } from "../semalar.ts";
import { urunServisi } from "../servis.ts";
import type { VitrinSecenekleri } from "../vitrin.ts";

// Stokla ilgisi olmayan vitrin testleri: tükenen ürün gösterilir (kart 0083).
const goster: VitrinSecenekleri = { tukenenUrun: "goster" };

const urunSrv = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("grup");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const urunEkle = (vt: Veritabani, ek: Partial<UrunGirdisi> = {}) =>
  urunSrv.urunEkle(vt, yonetici(), { ad: "Deneme ürünü", vergiSinifi: null, ...ek });

// Her grubun ürüne bağlanma biçimi: marka tek kimlik, etiket liste.
const gruplar = [
  {
    ad: "marka",
    servis: markaServisi,
    tablo: markalar,
    baglanti: urunMarkalari,
    aciklama: true,
    bagla: (gruplar: string[]): Partial<UrunGirdisi> => ({ marka: gruplar[0] ?? null }),
    oku: async (vt: Veritabani, urun: string) => {
      const marka = (await urunSrv.urunuOku(vt, urun))?.marka;
      return marka === null || marka === undefined ? [] : [marka];
    },
    alan: "marka",
    gecersiz: "marka-gecersiz",
  },
  {
    ad: "etiket",
    servis: etiketServisi,
    tablo: etiketler,
    baglanti: urunEtiketleri,
    aciklama: false,
    bagla: (gruplar: string[]): Partial<UrunGirdisi> => ({ etiketler: gruplar }),
    oku: async (vt: Veritabani, urun: string) =>
      (await urunSrv.urunuOku(vt, urun))?.etiketler ?? [],
    alan: "etiketler",
    gecersiz: "etiket-gecersiz",
  },
] as const;

describe.each(gruplar)("$ad", (g) => {
  const ekle = (vt: Veritabani, ad: string) => g.servis.ekle(vt, yonetici(), { ad });

  it("alanlar yazılır ve okunur, adres adı addan üretilir", async () => {
    const vt = await siteAc();
    const kimlik = await ekle(vt, "Örnek Grup");
    expect(await g.servis.oku(kimlik, vt)).toEqual({
      kimlik,
      ad: "Örnek Grup",
      adresAdi: "ornek-grup",
      silindi: false,
    });
    const ikinci = await ekle(vt, "Örnek grup 2");
    expect((await g.servis.hepsiniOku(vt)).map((grup) => grup.kimlik)).toEqual([kimlik, ikinci]);
  });

  it("açıklama yalnız markada girilir", async () => {
    const vt = await siteAc();
    const sonuc = g.servis.ekle(vt, yonetici(), { ad: "Açıklamalı", aciklama: "Uzun metin" });
    if (g.aciklama) {
      expect((await g.servis.oku(await sonuc, vt))?.aciklama).toBe("Uzun metin");
    } else {
      expect(await hatasi(sonuc)).toMatchObject({ kod: "dogrulama" });
    }
  });

  it("aynı ad (harf ayrımsız) ve aynı adres adı reddedilir, üretilen adres adı sayı alır", async () => {
    const vt = await siteAc();
    const bir = await ekle(vt, "Şık");
    const adBeklenen = { kod: "cakisma", ayrinti: [{ alan: "ad", kod: "ad-tekrar" }] };
    expect(await hatasi(ekle(vt, "ŞIK"))).toEqual(adBeklenen);
    const iki = await g.servis.ekle(vt, yonetici(), { ad: "Sik" });
    expect((await g.servis.oku(iki, vt))?.adresAdi).toBe("sik-2");
    expect(await hatasi(g.servis.degistir(vt, yonetici(), iki, { ad: "şık" }))).toEqual(adBeklenen);
    expect(await hatasi(g.servis.degistir(vt, yonetici(), iki, { adresAdi: "sik" }))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "adresAdi", kod: "adres-adi-tekrar" }],
    });
    // Kendi adının yazılışını değiştirmek tekrar sayılmaz.
    await g.servis.degistir(vt, yonetici(), bir, { ad: "ŞIK" });
    expect((await g.servis.oku(bir, vt))?.ad).toBe("ŞIK");
  });

  // Kart 0078 kontrolü: ad karşılaştırması yalnız veritabanında yapılır. JavaScript "ΟΔΟΣ" adını
  // "οδος", veritabanı "οδοσ" yapar; uygulamanın kendi anahtarıyla denetimi atlamak 500 hatasına
  // dönüyordu.
  it("adın yalnız harf büyüklüğü değişse de tekillik veritabanında aranır", async () => {
    const vt = await siteAc();
    const bir = await ekle(vt, "οδος");
    await ekle(vt, "οδοσ");
    expect(await hatasi(g.servis.degistir(vt, yonetici(), bir, { ad: "ΟΔΟΣ" }))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "ad", kod: "ad-tekrar" }],
    });
  });

  it("aynı görünen iki yazılış (birleşik ve ayrık Ş) aynı addır", async () => {
    const vt = await siteAc();
    await ekle(vt, "Şık");
    expect(await hatasi(ekle(vt, "S\u0327ık"))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "ad", kod: "ad-tekrar" }],
    });
  });

  it("veritabanı da aynı adı reddeder", async () => {
    const vt = await siteAc();
    await ekle(vt, "Tekil");
    await expect(
      vt.insert(g.tablo).values({ ad: "tekil", adres_adi: "baska-adres" }),
    ).rejects.toThrow();
  });

  it("ürüne bağlanır; silinmiş ve olmayan grup reddedilir", async () => {
    const vt = await siteAc();
    const a = await ekle(vt, "A");
    const b = await ekle(vt, "B");
    const silinen = await ekle(vt, "Silinen");
    await g.servis.sil(vt, yonetici(), silinen);
    const gecersiz = { kod: "dogrulama", ayrinti: [{ alan: g.alan, kod: g.gecersiz }] };
    expect(await hatasi(urunEkle(vt, g.bagla([silinen])))).toEqual(gecersiz);
    expect(await hatasi(urunEkle(vt, g.bagla([randomUUID()])))).toEqual(gecersiz);
    const urun = await urunEkle(vt, g.bagla([a]));
    expect(await g.oku(vt, urun)).toEqual([a]);
    await urunSrv.urunDegistir(vt, yonetici(), urun, g.bagla([b]));
    expect(await g.oku(vt, urun)).toEqual([b]);
    await urunSrv.urunDegistir(vt, yonetici(), urun, g.bagla([]));
    expect(await g.oku(vt, urun)).toEqual([]);
  });

  it("silinen grup ürünlerden kalkar; ürünün kendisi ve öteki bilgileri değişmez", async () => {
    const vt = await siteAc();
    const grup = await ekle(vt, "Silinecek");
    const urun = await urunEkle(vt, { ad: "Kalan ürün", durum: "yayinda", ...g.bagla([grup]) });
    const once = await urunSrv.urunuOku(vt, urun);
    await g.servis.sil(vt, yonetici(), grup);
    const sonra = await urunSrv.urunuOku(vt, urun);
    expect(await g.oku(vt, urun)).toEqual([]);
    expect({ ...sonra, marka: null, etiketler: [] }).toEqual({
      ...once,
      marka: null,
      etiketler: [],
    });
    expect((await g.servis.oku(grup, vt))?.silindi).toBe(true);
    expect((await g.servis.hepsiniOku(vt)).map((x) => x.kimlik)).not.toContain(grup);
    expect(await hatasi(g.servis.degistir(vt, yonetici(), grup, { ad: "x y" }))).toMatchObject({
      kod: "bulunamadi",
    });
    // Silinen grubun adı ve adres adı yeniden kullanılabilir.
    const yeni = await ekle(vt, "Silinecek");
    expect((await g.servis.oku(yeni, vt))?.adresAdi).toBe("silinecek");
  });

  it("grubun ürünleri tek sorguyla, sayfa ve toplamla gelir; vitrin süzgeci ve silinmiş ürün", async () => {
    const vt = await siteAc();
    const grup = await ekle(vt, "Liste");
    const baska = await ekle(vt, "Başka");
    const yayinda = await urunEkle(vt, { ad: "Yayında", durum: "yayinda", ...g.bagla([grup]) });
    const taslak = await urunEkle(vt, { ad: "Taslak", ...g.bagla([grup]) });
    const silinen = await urunEkle(vt, { ad: "Silinen", durum: "yayinda", ...g.bagla([grup]) });
    await urunEkle(vt, { ad: "Başkasında", durum: "yayinda", ...g.bagla([baska]) });
    await urunSrv.urunSil(vt, yonetici(), silinen);
    const sorgu = vi.spyOn(vt.$client, "query");
    expect(await g.servis.urunleri(vt, grup)).toEqual({ urunler: [taslak, yayinda], toplam: 2 });
    expect(sorgu).toHaveBeenCalledTimes(1);
    expect(await g.servis.urunleri(vt, grup, { vitrin: { yer: "liste", ...goster } })).toEqual({
      urunler: [yayinda],
      toplam: 1,
    });
    expect(await g.servis.urunleri(vt, grup, { boyut: 1, sayfa: 2 })).toEqual({
      urunler: [yayinda],
      toplam: 2,
    });
    await g.servis.sil(vt, yonetici(), grup);
    expect(await g.servis.urunleri(vt, grup)).toEqual({ urunler: [], toplam: 0 });
    // İkinci ağ: bağlantısı kalmış ama silinmiş işaretli grubun ürünü de gelmez (silmeyi atlayan yazı).
    await vt.update(g.tablo).set({ silinme_zamani: sql`now()` }).where(eq(g.tablo.kimlik, baska));
    expect(await g.servis.urunleri(vt, baska)).toEqual({ urunler: [], toplam: 0 });
  });

  // Sıra bilerek kurulur: silme işlemi grubu işaretleyip bağlantılarını kaldırır ve açık bekler, ürün
  // değişikliği tam o sırada gelir (kart 0077'deki yarışın aynısı).
  const acikSilme = async (vt: Veritabani, grup: string) => {
    let hazir: () => void = () => undefined;
    const isaretlendi = new Promise<void>((coz) => {
      hazir = coz;
    });
    const bitti = vt.transaction(async (islem) => {
      await islem
        .update(g.tablo)
        .set({ silinme_zamani: sql`now()` })
        .where(eq(g.tablo.kimlik, grup));
      await islem.delete(g.baglanti).where(eq(g.baglanti.grup_kimligi, grup));
      hazir();
      await islem.execute(sql`select pg_sleep(0.3)`);
    });
    await isaretlendi;
    // Söz nesne içinde döner: async işlevden doğrudan dönen söz beklenirdi, yarış kurulmazdı.
    return { bitti };
  };
  const urunDegisiklikleri = (vt: Veritabani) =>
    vt.select().from(degisiklikKayitlari).where(eq(degisiklikKayitlari.islem, "urun.degisti"));

  it("açık duran silmenin grubuna ürün bağlanamaz", async () => {
    const vt = await siteAc();
    const grup = await ekle(vt, "Silinecek");
    const urun = await urunEkle(vt);
    const silme = await acikSilme(vt, grup);
    const sonuc = await hatasi(urunSrv.urunDegistir(vt, yonetici(), urun, g.bagla([grup])));
    await silme.bitti;
    expect(sonuc).toEqual({ kod: "dogrulama", ayrinti: [{ alan: g.alan, kod: g.gecersiz }] });
    expect(await vt.select().from(g.baglanti)).toEqual([]);
    expect(await urunDegisiklikleri(vt)).toEqual([]);
  });

  it("açık duran silmenin kaldırdığı bağlantı ürünün kaydına bağlıymış gibi girmez", async () => {
    const vt = await siteAc();
    const grup = await ekle(vt, "Silinecek");
    const urun = await urunEkle(vt, { ad: "Önce", ...g.bagla([grup]) });
    const silme = await acikSilme(vt, grup);
    // Ürün değişikliği silmeyi bekler, bağlantıyı kalkmış okur: aynı grubu yeniden vermek yeni bağlantı
    // sayılır ve reddedilir. Kilitsiz okusa grup hâlâ bağlı görünür, değişiklik sessizce geçerdi.
    const sonuc = await hatasi(
      urunSrv.urunDegistir(vt, yonetici(), urun, { ad: "Sonra", ...g.bagla([grup]) }),
    );
    await silme.bitti;
    expect(sonuc).toEqual({ kod: "dogrulama", ayrinti: [{ alan: g.alan, kod: g.gecersiz }] });
    expect(await g.oku(vt, urun)).toEqual([]);
    expect(await urunDegisiklikleri(vt)).toEqual([]);
  });

  it("kimlik biçiminde olmayan metin bulunamadı sayılır", async () => {
    const vt = await siteAc();
    for (const bozuk of ["abc", ""]) {
      expect(await g.servis.oku(bozuk, vt)).toBeUndefined();
      expect(await g.servis.urunleri(vt, bozuk)).toEqual({ urunler: [], toplam: 0 });
      expect(await hatasi(g.servis.degistir(vt, yonetici(), bozuk, { ad: "x y" }))).toMatchObject({
        kod: "bulunamadi",
      });
      expect(await hatasi(g.servis.sil(vt, yonetici(), bozuk))).toMatchObject({
        kod: "bulunamadi",
      });
    }
  });

  it("ekleme, değişiklik ve silme kayda girer; silme kalkan ürünleri listeler", async () => {
    const vt = await siteAc();
    const kim = yonetici();
    const kimKimligi = kim.tur === "yonetici" ? kim.kimlik : "";
    const grup = await g.servis.ekle(vt, kim, { ad: "Kayıtlı" });
    await g.servis.degistir(vt, kim, grup, { ad: "Kayıtlı" });
    await g.servis.degistir(vt, kim, grup, { ad: "Yeni ad" });
    const urun = await urunEkle(vt, g.bagla([grup]));
    await g.servis.sil(vt, kim, grup);
    const satirlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, grup))
      .orderBy(degisiklikKayitlari.zaman);
    expect(
      satirlar.map((s) => [s.islem, s.kayit_turu, s.kim_kimligi, s.eski_deger, s.yeni_deger]),
    ).toEqual([
      [`${g.ad}.eklendi`, g.ad, kimKimligi, null, { ad: "Kayıtlı", adresAdi: "kayitli" }],
      [`${g.ad}.degisti`, g.ad, kimKimligi, { ad: "Kayıtlı" }, { ad: "Yeni ad" }],
      [
        `${g.ad}.silindi`,
        g.ad,
        kimKimligi,
        { ad: "Yeni ad", adresAdi: "kayitli", urunler: [urun] },
        null,
      ],
    ]);
  });

  it("iki site birbirinin grubunu ve bağlantısını görmez", async () => {
    const [a, b] = await Promise.all([siteAc(), siteAc()]);
    const grup = await ekle(a, "Ortak");
    await urunEkle(a, g.bagla([grup]));
    expect(await g.servis.oku(grup, b)).toBeUndefined();
    expect(await g.servis.hepsiniOku(b)).toEqual([]);
    expect(await g.servis.urunleri(b, grup)).toEqual({ urunler: [], toplam: 0 });
    expect(await hatasi(urunEkle(b, g.bagla([grup])))).toMatchObject({ kod: "dogrulama" });
    expect((await g.servis.oku(await ekle(b, "Ortak"), b))?.adresAdi).toBe("ortak");
  });
});

describe("marka tekildir", () => {
  it("bir ürünün en çok bir markası olur; değişiklik ürünün kaydına girer", async () => {
    const vt = await siteAc();
    const a = await markaServisi.ekle(vt, yonetici(), { ad: "A" });
    const b = await markaServisi.ekle(vt, yonetici(), { ad: "B" });
    const urun = await urunEkle(vt, { marka: a });
    await expect(
      vt.insert(urunMarkalari).values({ urun_kimligi: urun, grup_kimligi: b }),
    ).rejects.toThrow();
    await urunSrv.urunDegistir(vt, yonetici(), urun, { marka: b });
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, urun))
      .orderBy(degisiklikKayitlari.zaman);
    expect(kayitlar.map((s) => [s.islem, s.eski_deger, s.yeni_deger])).toEqual([
      ["urun.eklendi", null, expect.objectContaining({ marka: a })],
      ["urun.degisti", { marka: a }, { marka: b }],
    ]);
  });

  // Kart 0119: büyük harfle yazılmış aynı kimlik tekrar sayılır, beklenmeyen hata vermez.
  it("aynı etiket büyük harfle ikinci kez verilemez; büyük harfli marka küçük harfle yazılır", async () => {
    const vt = await siteAc();
    const e = await etiketServisi.ekle(vt, yonetici(), { ad: "E" });
    expect(await hatasi(urunEkle(vt, { etiketler: [e, e.toUpperCase()] }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "etiketler", kod: "etiket-tekrar" }],
    });
    const m = await markaServisi.ekle(vt, yonetici(), { ad: "M" });
    const urun = await urunEkle(vt, { marka: m.toUpperCase(), etiketler: [e.toUpperCase()] });
    expect(await urunSrv.urunuOku(vt, urun)).toMatchObject({ marka: m, etiketler: [e] });
  });

  it("aynı etiket ve marka büyük harfle yeniden verilince değişiklik yazılmaz", async () => {
    const vt = await siteAc();
    const e = await etiketServisi.ekle(vt, yonetici(), { ad: "E" });
    const m = await markaServisi.ekle(vt, yonetici(), { ad: "M" });
    const urun = await urunEkle(vt, { marka: m, etiketler: [e] });
    const sayi = async () =>
      (
        await vt
          .select()
          .from(degisiklikKayitlari)
          .where(eq(degisiklikKayitlari.kayit_kimligi, urun))
      ).length;
    const once = await sayi();
    await urunSrv.urunDegistir(vt, yonetici(), urun, {
      marka: m.toUpperCase(),
      etiketler: [e.toUpperCase()],
    });
    expect(await sayi()).toBe(once);
    expect(await urunSrv.urunuOku(vt, urun)).toMatchObject({ marka: m, etiketler: [e] });
  });

  it("aynı etiket iki kez verilemez", async () => {
    const vt = await siteAc();
    const e = await etiketServisi.ekle(vt, yonetici(), { ad: "E" });
    expect(await hatasi(urunEkle(vt, { etiketler: [e, e] }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "etiketler", kod: "etiket-tekrar" }],
    });
  });
});

// Marka logosu (kart 0111, karar 0088): hazır bir görsel olmalı (kategori görseliyle aynı kural), kaldırılabilir,
// her değişikliği kayda girer; etikette logo girilmez.
describe("marka logosu", () => {
  const klasorler: string[] = [];
  afterEach(() => {
    for (const klasor of klasorler.splice(0)) rmSync(klasor, { recursive: true, force: true });
  });
  const gorselAc = async (vt: Veritabani) => {
    const klasor = mkdtempSync(join(tmpdir(), "marka-logosu-"));
    klasorler.push(klasor);
    const icerik = await sharp({
      create: { width: 600, height: 200, channels: 3, background: { r: 20, g: 20, b: 20 } },
    })
      .png()
      .toBuffer();
    const sonuc = await gorselKaydet(vt, icerik, klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    return sonuc;
  };
  const logoHatasi = { kod: "dogrulama", ayrinti: [{ alan: "logo", kod: "gorsel-gecersiz" }] };

  it("logo kaydedilir, okunur, değişir ve kaldırılır; her değişiklik kayda girer", async () => {
    const vt = await siteAc();
    const [ilk, ikinci] = [await gorselAc(vt), await gorselAc(vt)];
    const marka = await markaServisi.ekle(vt, yonetici(), {
      ad: "Logolu",
      logo: ilk.dosya.kimlik.toUpperCase(),
    });
    expect((await markaServisi.oku(marka, vt))?.logo).toBe(ilk.dosya.kimlik);
    await markaServisi.degistir(vt, yonetici(), marka, { logo: ikinci.dosya.kimlik });
    expect((await markaServisi.oku(marka, vt))?.logo).toBe(ikinci.dosya.kimlik);
    await markaServisi.degistir(vt, yonetici(), marka, { logo: null });
    expect(await markaServisi.oku(marka, vt)).not.toHaveProperty("logo");
    const kayitlar = await vt
      .select({
        islem: degisiklikKayitlari.islem,
        eski: degisiklikKayitlari.eski_deger,
        yeni: degisiklikKayitlari.yeni_deger,
      })
      .from(degisiklikKayitlari)
      .where(sql`${degisiklikKayitlari.kayit_kimligi} = ${marka}`)
      .orderBy(degisiklikKayitlari.zaman);
    expect(kayitlar).toEqual([
      expect.objectContaining({
        islem: "marka.eklendi",
        yeni: expect.objectContaining({ logo: ilk.dosya.kimlik }),
      }),
      {
        islem: "marka.degisti",
        eski: { logo: ilk.dosya.kimlik },
        yeni: { logo: ikinci.dosya.kimlik },
      },
      { islem: "marka.degisti", eski: { logo: ikinci.dosya.kimlik }, yeni: { logo: null } },
    ]);
  });

  it("hazır olmayan görsel logo olamaz: olmayan, silinmiş, kendisi boyut olan dosya", async () => {
    const vt = await siteAc();
    const gorsel = await gorselAc(vt);
    const silinen = await gorselAc(vt);
    await dosyaSil(vt, silinen.dosya.kimlik);
    for (const logo of [randomUUID(), silinen.dosya.kimlik, gorsel.boyutlar.orta.kimlik]) {
      expect(await hatasi(markaServisi.ekle(vt, yonetici(), { ad: "Hatalı", logo }))).toEqual(
        logoHatasi,
      );
    }
    const marka = await markaServisi.ekle(vt, yonetici(), { ad: "Marka" });
    expect(
      await hatasi(markaServisi.degistir(vt, yonetici(), marka, { logo: silinen.dosya.kimlik })),
    ).toEqual(logoHatasi);
    expect(await markaServisi.oku(marka, vt)).not.toHaveProperty("logo");
    expect(
      await hatasi(markaServisi.ekle(vt, yonetici(), { ad: "Bozuk", logo: "bozuk" })),
    ).toMatchObject({ kod: "dogrulama" });
  });

  it("logosu sonradan silinen marka, logo değişmedikçe değişebilir", async () => {
    const vt = await siteAc();
    const gorsel = await gorselAc(vt);
    const marka = await markaServisi.ekle(vt, yonetici(), {
      ad: "Eski",
      logo: gorsel.dosya.kimlik,
    });
    await dosyaSil(vt, gorsel.dosya.kimlik);
    await markaServisi.degistir(vt, yonetici(), marka, { ad: "Yeni" });
    expect(await markaServisi.oku(marka, vt)).toMatchObject({
      ad: "Yeni",
      logo: gorsel.dosya.kimlik,
    });
  });

  it("etikette logo girilmez", async () => {
    const vt = await siteAc();
    const gorsel = await gorselAc(vt);
    expect(
      await hatasi(etiketServisi.ekle(vt, yonetici(), { ad: "Etiket", logo: gorsel.dosya.kimlik })),
    ).toMatchObject({ kod: "dogrulama" });
  });
});
