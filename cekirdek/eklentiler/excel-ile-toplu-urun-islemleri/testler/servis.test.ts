// Excel ile toplu ürün işlemleri gerçek veritabanıyla (kart 0315, tarif eklentiler/excel-ile-toplu-urun-islemleri.md):
// - Dışa aktarılan dosya değiştirilmeden yüklenince hiçbir şey değişmez; arada stok düşmüş olsa da.
// - Fiyat, indirim, stok ve ortak bilgilerdeki değişiklik önizlemede doğru görünür, uygulanınca servislerle yazılır:
//   fiyat ve stok geçmişi ("Excel ile içe aktarma"), değişiklik kaydı.
// - Yeni ürün (kodsuz basit, kodlu seçenekli) ve var olan ürüne yeni birleşim eklenir; yeni ürün taslaktır; var olan
//   ürüne yeni seçenek eklenmez.
// - Boş hücre değiştirmez, "-" boşaltır; dosyada olmayan ürün değişmez.
// - Hatalar: olmayan kategori, marka, etiket; okunamayan tutar; boşaltılamayan alan; seçenek uyuşmazlığı; aynı birleşim
//   iki satırda; zamanlanmış durum; izni olmayanın fiyat ve stok satırı; iki yanda değişen hücre. Hatalı satır varken
//   uygulanmaz.
// - Önizlemeden sonra sitede değişen grup uygulanmaz, ötekiler uygulanır; aynı parti iki kez çalışsa da aynı satır iki
//   kez yazılmaz.
// - Dosya: .xlsx olmayan, sıkıştırma bombası, satır sınırı, eksik sütun; formüle benzeyen ad metin olarak yazılır.
// - Kapalı eklentide servis bulunamadı verir, işler bir şey yapmaz; temizlik; veritabanı denetimleri kayıtla aynı; iki
//   site ayrı kalır.
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { strFromU8, unzipSync, zipSync } from "fflate";
import readXlsxFile from "read-excel-file/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import {
  excelDisaAktarmaDurumlari,
  excelIceAktarmaDurumlari,
  excelSatirSonuclari,
} from "../../../kayitlar/eklentiler.ts";
import { degisiklikKayitlari } from "../../../moduller/degisiklik-kaydi/model.ts";
import { roller, yoneticiRolleri } from "../../../moduller/ekip/model.ts";
import { etiketServisi } from "../../../moduller/etiket/servis.ts";
import { fiyatGecmisi } from "../../../moduller/fiyat/model.ts";
import { siteninFiyatServisi } from "../../../moduller/fiyat/servis.ts";
import { kategoriEkle } from "../../../moduller/kategori/servis.ts";
import { markaServisi } from "../../../moduller/marka/servis.ts";
import { hesapAc } from "../../../moduller/oturum/servis.ts";
import { ozellikServisi } from "../../../moduller/ozellik/servis.ts";
import { stokGecmisi } from "../../../moduller/stok/model.ts";
import { stokServisi } from "../../../moduller/stok/servis.ts";
import { urunServisi } from "../../../moduller/urun/servis.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { excelDisaAktarmalari, excelIceAktarmalari, excelIceAktarmaSatirlari } from "../model.ts";
import { type ExcelIsleri, excelServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 120_000 });

const okunan = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
// Deneme sitesinde eklenti açıktır (ornek-siteler/gecerli/ayarlar.json).
const site: Site = okunan;
const kapali: Site = { ...site, ayarlar: { ...site.ayarlar, eklentiler: [] } };
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");

// İşler kuyruğa girmez, test sırayla çalıştırır.
const bekleyenler: { tur: keyof ExcelIsleri; kimlik: string }[] = [];
const isler: ExcelIsleri = {
  disaAktar: async (_vt, kimlik) => bekleyenler.push({ tur: "disaAktar", kimlik }),
  denetle: async (_vt, kimlik) => bekleyenler.push({ tur: "denetle", kimlik }),
  uygula: async (_vt, kimlik) => bekleyenler.push({ tur: "uygula", kimlik }),
};
const servis = excelServisi(site, isler);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyatSrv = siteninFiyatServisi(site);
const stokSrv = stokServisi();
const ek = () => randomBytes(3).toString("hex");

let vt: Veritabani;
let sil: () => Promise<void>;
let vtB: Veritabani;
let silB: () => Promise<void>;
beforeAll(async () => {
  [{ vt, sil }, { vt: vtB, sil: silB }] = await Promise.all([
    denemeSitesiAc("excel-eklentisi"),
    denemeSitesiAc("excel-eklentisi-b"),
  ]);
});
beforeEach(() => {
  ortak[siteAnahtari] = site;
  bekleyenler.length = 0;
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await Promise.all([sil(), silB()]);
});

// Bekleyen işleri sırayla çalıştırır (uygulama partileri bitene kadar).
const isleriCalistir = async (veritabani: Veritabani = vt, s = servis) => {
  while (bekleyenler.length > 0) {
    const is = bekleyenler.shift();
    if (is === undefined) break;
    if (is.tur === "disaAktar") await s.disaAktarmayiHazirla(veritabani, is.kimlik);
    else if (is.tur === "denetle") await s.iceAktarmayiDenetle(veritabani, is.kimlik);
    else if (await s.uygulamaPartisi(veritabani, is.kimlik)) bekleyenler.push(is);
  }
};

const yoneticiAc = async (rol: "magaza-sahibi" | "gorevli" = "magaza-sahibi", veritabani = vt) => {
  const { hesapKimligi } = await hesapAc(veritabani, "yonetici", {
    eposta: `excel-${ek()}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  const [r] = await veritabani
    .select({ kimlik: roller.kimlik })
    .from(roller)
    .where(eq(roller.kod, rol));
  if (r === undefined) throw new Error("Rol yok.");
  await veritabani
    .insert(yoneticiRolleri)
    .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: r.kimlik });
  return hesapKimligi;
};
const sistem = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (y: unknown) => y,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

// Testin kendi kataloğu: kategori, marka, etiket, özellik; basit ve seçenekli ürün, fiyatı ve stoğuyla.
const katalogKur = async (veritabani: Veritabani = vt) => {
  const e = ek();
  const kategori = await kategoriEkle(veritabani, sistem(), { ad: `Giyim ${e}` });
  const altKategori = await kategoriEkle(veritabani, sistem(), { ad: `Kadın ${e}`, ust: kategori });
  const marka = await markaServisi.ekle(veritabani, sistem(), { ad: `Marka ${e}` });
  const marka2 = await markaServisi.ekle(veritabani, sistem(), { ad: `Öteki ${e}` });
  const etiket = await etiketServisi.ekle(veritabani, sistem(), { ad: `Yeni ${e}` });
  const kumas = await ozellikServisi.ekle(veritabani, sistem(), {
    ad: `Kumaş ${e}`,
    tur: "liste",
    secenekler: ["Pamuk", "Keten"],
  });
  const kumasTanimi = (await ozellikServisi.hepsiniOku(veritabani)).find((o) => o.kimlik === kumas);
  const pamuk = kumasTanimi?.secenekler.find((s) => s.ad === "Pamuk")?.kimlik ?? "";
  const basit = await urunSrv.urunEkle(veritabani, sistem(), {
    ad: `Kupa ${e}`,
    adresAdi: `kupa-${e}`,
    vergiSinifi: null,
    durum: "yayinda",
    stokKodu: `KUPA-${e}`.toUpperCase(),
    kategoriler: [altKategori],
    marka,
    etiketler: [etiket],
    ozellikler: [{ ozellik: kumas, deger: pamuk }],
  });
  const basitBirim = (await urunSrv.urunuOku(veritabani, basit))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(site).fiyatYaz(veritabani, sistem(), basitBirim, {
    satisFiyati: 12_990,
  });
  await stokSrv.stokDuzelt(veritabani, sistem(), basitBirim, {
    yeniMiktar: 10,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const tisort = await urunSrv.urunEkle(veritabani, sistem(), {
    ad: `Tişört ${e}`,
    adresAdi: `tisort-${e}`,
    vergiSinifi: null,
    durum: "yayinda",
  });
  await urunSrv.secenekEkle(veritabani, sistem(), tisort, {
    ad: "Renk",
    degerler: ["Beyaz", "Siyah"],
  });
  const secenekler = (await urunSrv.urunuOku(veritabani, tisort))?.secenekler ?? [];
  const siyah = secenekler[0]?.degerler.find((d) => d.ad === "Siyah")?.kimlik ?? "";
  await urunSrv.birlesimEkle(veritabani, sistem(), tisort, { degerler: [siyah] });
  const birimler = ((await urunSrv.urunuOku(veritabani, tisort))?.birimler ?? []).filter(
    (b) => !b.silindi,
  );
  for (const [i, birim] of birimler.entries()) {
    await siteninFiyatServisi(site).fiyatYaz(veritabani, sistem(), birim.kimlik, {
      satisFiyati: 19_990 + i * 1000,
    });
    await stokSrv.stokDuzelt(veritabani, sistem(), birim.kimlik, {
      yeniMiktar: 5,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
  }
  return {
    e,
    kategori,
    altKategori,
    marka,
    marka2,
    etiket,
    kumas,
    basit,
    basitBirim,
    tisort,
    birimler,
  };
};

// Yalnız testin ürünlerini taşıyan dışa aktarma: listenin aramasıyla (kapsam).
const disaAktar = async (yonetici: string, ara: string, s = servis, veritabani = vt) => {
  const kimlik = await s.disaAktarmaBaslat(veritabani, yonetici, {
    kapsam: { ara, siralama: "ad-artan" },
    fiyat: true,
    stok: true,
  });
  await isleriCalistir(veritabani, s);
  return { kimlik, ...(await s.disaAktarmaDosyasi(veritabani, yonetici, kimlik)) };
};

type Satirlar = (string | number | boolean | Date | null)[][];
// Dosyanın Ürünler sayfasını değiştirir, Bilgi sayfasını korur.
const dosyayiDegistir = async (dosya: Buffer, degistir: (satirlar: Satirlar) => Satirlar) => {
  const sayfalar = await readXlsxFile(dosya);
  return writeXlsxFile(
    sayfalar.map((sayfa, i) => ({
      sheet: sayfa.sheet,
      data: (i === 0 ? degistir(sayfa.data as Satirlar) : (sayfa.data as Satirlar)).map((satir) =>
        satir.map((h) =>
          h === null
            ? null
            : typeof h === "number"
              ? { value: h, type: Number }
              : { value: String(h), type: String },
        ),
      ),
    })),
  ).toBuffer();
};
const sutun = (satirlar: Satirlar, baslik: string) => satirlar[0]?.indexOf(baslik) ?? -1;
const hucreYaz = (
  satirlar: Satirlar,
  satirKosulu: (s: Satirlar[number]) => boolean,
  baslik: string,
  deger: string | number | null,
) => {
  const yer = sutun(satirlar, baslik);
  if (yer < 0) throw new Error(`Sütun yok: ${baslik}`);
  return satirlar.map((s, i) =>
    i > 0 && satirKosulu(s) ? s.map((h, j) => (j === yer ? deger : h)) : s,
  );
};
const koduyla = (kod: string) => (s: Satirlar[number]) => s[0] === kod;

const yukleVeDenetle = async (yonetici: string, dosya: Buffer, s = servis, veritabani = vt) => {
  const kimlik = await s.iceAktarmaYukle(veritabani, yonetici, { dosya, ad: "urunler.xlsx" });
  await isleriCalistir(veritabani, s);
  const durum = await s.iceAktarmaDurumu(veritabani, yonetici, kimlik);
  if (durum === null) throw new Error("Durum yok.");
  return durum;
};

const hataKodlari = (durum: Awaited<ReturnType<typeof yukleVeDenetle>>) =>
  durum.hatalilar.flatMap((s) => s.hatalar.map((h) => h.kod));

describe("dışa aktarma ve değiştirilmeden geri yükleme", () => {
  it("dosya her birim bir satır; değiştirilmeden yüklenince hiçbir şey değişmez, arada stok düşmüş olsa da", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    const satirlar = (await readXlsxFile(dosya))[0]?.data as Satirlar;
    // Başlık ve üç birim: basit ürün ve iki birleşim.
    expect(satirlar.length).toBe(4);
    const basitSatiri = satirlar.find((s) => s[0] === `kupa-${k.e}`);
    expect(basitSatiri).toBeDefined();
    expect(basitSatiri?.[sutun(satirlar, "Satış fiyatı")]).toBe(129.9);
    expect(basitSatiri?.[sutun(satirlar, "Stok")]).toBe(10);
    expect(basitSatiri?.[sutun(satirlar, "Kategoriler")]).toBe(`Giyim ${k.e} › Kadın ${k.e}`);
    expect(basitSatiri?.[sutun(satirlar, "Özellikler")]).toBe(`Kumaş ${k.e}: Pamuk`);
    expect(basitSatiri?.[sutun(satirlar, "Durum")]).toBe("Yayında");
    expect(
      satirlar.filter((s) => s[0] === `tisort-${k.e}`).map((s) => s[sutun(satirlar, "Seçenekler")]),
    ).toEqual(["Renk: Beyaz", "Renk: Siyah"]);
    // Arada sipariş gibi stok düşer.
    await stokSrv.stokDuzelt(vt, sistem(), k.basitBirim, {
      yeniMiktar: 7,
      gorulenMiktar: 10,
      sebep: "sayim",
    });
    const durum = await yukleVeDenetle(yonetici, dosya);
    expect(durum.durum).toBe("onizleme");
    expect(durum.sayilar).toEqual({ ekle: 0, degistir: 0, ayni: 3, hatali: 0 });
    expect((await hatasi(servis.uygula(vt, yonetici, durum.kimlik))).ayrinti).toEqual([
      { alan: "dosya", kod: "excel-degisiklik-yok" },
    ]);
    const stok = await stokSrv.stoklariOku(vt, [k.basitBirim]);
    expect(stok.get(k.basitBirim)?.miktar).toBe(7);
  });

  it("formüle benzeyen ad metin hücresidir, dosyada formül yoktur", async () => {
    const yonetici = await yoneticiAc();
    const e = ek();
    await urunSrv.urunEkle(vt, sistem(), {
      ad: `=HYPERLINK("x") ${e}`,
      adresAdi: `formul-${e}`,
      vergiSinifi: null,
    });
    const { dosya } = await disaAktar(yonetici, e);
    const xml = Object.entries(unzipSync(new Uint8Array(dosya)))
      .filter(([ad]) => ad.startsWith("xl/"))
      .map(([, icerik]) => strFromU8(icerik))
      .join("");
    expect(xml).not.toContain("<f>");
    expect(xml).not.toContain("<f ");
    const satirlar = (await readXlsxFile(dosya))[0]?.data as Satirlar;
    expect(satirlar[1]?.[1]).toBe(`=HYPERLINK("x") ${e}`);
  });

  it("dosyayı yalnız hazırlayan indirir; fiyat izni olmayanın dosyasında fiyat sütunu yoktur", async () => {
    const sahip = await yoneticiAc();
    const baska = await yoneticiAc();
    const k = await katalogKur();
    const { kimlik } = await disaAktar(sahip, k.e);
    expect((await hatasi(servis.disaAktarmaDosyasi(vt, baska, kimlik))).kod).toBe("bulunamadi");
    const sinirli = await servis.disaAktarmaBaslat(vt, baska, {
      kapsam: { ara: k.e, siralama: "ad-artan" },
      fiyat: false,
      stok: false,
    });
    await isleriCalistir();
    const { dosya } = await servis.disaAktarmaDosyasi(vt, baska, sinirli);
    const sayfa = (await readXlsxFile(dosya))[0];
    const baslik = (sayfa?.data as Satirlar | undefined)?.[0];
    expect(baslik).not.toContain("Satış fiyatı");
    expect(baslik).not.toContain("Stok");
    expect(baslik).toContain("Stok kodu");
  });
});

describe("değişiklik ve uygulama", () => {
  it("fiyat, stok, ad, kategori ve marka değişir; boş hücre değiştirmez, - markayı kaldırır; geçmişler ve kayıt", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    const degisen = await dosyayiDegistir(dosya, (s) => {
      let t = hucreYaz(s, koduyla(`kupa-${k.e}`), "Satış fiyatı", 149.9);
      t = hucreYaz(t, koduyla(`kupa-${k.e}`), "Stok", 25);
      t = hucreYaz(t, koduyla(`kupa-${k.e}`), "Ad", `Büyük Kupa ${k.e}`);
      t = hucreYaz(
        t,
        koduyla(`kupa-${k.e}`),
        "Kategoriler",
        `Giyim ${k.e}; giyim ${k.e} › KADIN ${k.e}`,
      );
      t = hucreYaz(t, koduyla(`kupa-${k.e}`), "Marka", "-");
      // Boş hücre: etiket değişmez.
      t = hucreYaz(t, koduyla(`kupa-${k.e}`), "Etiketler", null);
      return t;
    });
    const durum = await yukleVeDenetle(yonetici, degisen);
    expect(durum.sayilar).toEqual({ ekle: 0, degistir: 1, ayni: 2, hatali: 0 });
    const alanlar = durum.degisecekler[0]?.degisiklikler.map((d) => d.alan).sort();
    expect(alanlar).toEqual(["ad", "kategoriler", "marka", "satisFiyati", "stok"]);
    await servis.uygula(vt, yonetici, durum.kimlik);
    await isleriCalistir();
    const son = await servis.iceAktarmaDurumu(vt, yonetici, durum.kimlik);
    expect(son?.durum).toBe("bitti");
    expect(son?.uygulama).toEqual({ toplam: 1, uygulanan: 1, uygulanamayan: 0 });
    const urun = await urunSrv.urunuOku(vt, k.basit);
    expect(urun?.ad).toBe(`Büyük Kupa ${k.e}`);
    expect(urun?.kategoriler.sort()).toEqual([k.kategori, k.altKategori].sort());
    expect(urun?.marka).toBeNull();
    expect(urun?.etiketler).toEqual([k.etiket]);
    expect((await fiyatSrv.fiyatOku(vt, k.basitBirim))?.satisFiyati).toBe(14_990);
    const stokSatiri = await vt
      .select({ sebep: stokGecmisi.sebep, sonraki: stokGecmisi.sonraki_miktar })
      .from(stokGecmisi)
      .where(eq(stokGecmisi.birim_kimligi, k.basitBirim));
    expect(stokSatiri).toContainEqual({ sebep: "excel-ice-aktarma", sonraki: 25 });
    const fiyatSatirlari = await vt
      .select()
      .from(fiyatGecmisi)
      .where(eq(fiyatGecmisi.birim_kimligi, k.basitBirim));
    expect(fiyatSatirlari.some((f) => f.satis_fiyati === 14_990)).toBe(true);
    const kayitlar = await vt
      .select({ islem: degisiklikKayitlari.islem })
      .from(degisiklikKayitlari)
      .where(sql`${degisiklikKayitlari.kim_kimligi} = ${yonetici}`);
    expect(kayitlar.map((r) => r.islem)).toEqual(
      expect.arrayContaining(["urun.degisti", "fiyat.degisti", "stok.duzeltildi"]),
    );
  });

  it("yeni ürünler (kodsuz basit, kodlu seçenekli) ve var olan ürüne yeni birleşim eklenir; yeni ürün taslaktır", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    const degisen = await dosyayiDegistir(dosya, (s) => [
      ...s,
      [
        null,
        `Bardak ${k.e}`,
        null,
        `BRD-${k.e}`.toUpperCase(),
        null,
        59.9,
        null,
        null,
        null,
        8,
        null,
        null,
        `Marka ${k.e}`,
        null,
        null,
      ],
      [
        `gomlek-${k.e}`,
        `Gömlek ${k.e}`,
        "Beden: S; Renk: Mavi",
        null,
        null,
        300,
        null,
        null,
        null,
        3,
        null,
        null,
        null,
        null,
        null,
      ],
      [
        `gomlek-${k.e}`,
        `Gömlek ${k.e}`,
        "Beden: M; Renk: Mavi",
        null,
        null,
        300,
        null,
        null,
        null,
        4,
        null,
        null,
        null,
        null,
        null,
      ],
      [
        `tisort-${k.e}`,
        null,
        "Renk: Kırmızı",
        null,
        null,
        210,
        null,
        null,
        null,
        2,
        null,
        null,
        null,
        null,
        null,
      ],
    ]);
    const durum = await yukleVeDenetle(yonetici, degisen);
    expect(durum.hatalilar).toEqual([]);
    expect(durum.sayilar.ekle).toBe(4);
    await servis.uygula(vt, yonetici, durum.kimlik);
    await isleriCalistir();
    expect((await servis.iceAktarmaDurumu(vt, yonetici, durum.kimlik))?.uygulama.uygulanan).toBe(4);
    const tisort = await urunSrv.urunuOku(vt, k.tisort);
    expect(tisort?.secenekler[0]?.degerler.filter((d) => !d.silindi).map((d) => d.ad)).toEqual([
      "Beyaz",
      "Siyah",
      "Kırmızı",
    ]);
    expect(tisort?.birimler.filter((b) => !b.silindi)).toHaveLength(3);
    const gomlekSatiri = await vt.execute<{ kimlik: string; durum: string }>(
      sql`select kimlik, durum from urunler where adres_adi = ${`gomlek-${k.e}`}`,
    );
    const gomlek = await urunSrv.urunuOku(vt, gomlekSatiri.rows[0]?.kimlik ?? "");
    expect(gomlek?.durum).toBe("taslak");
    expect(gomlek?.secenekler.map((s) => s.ad)).toEqual(["Beden", "Renk"]);
    const gomlekBirimleri = (gomlek?.birimler ?? []).filter((b) => !b.silindi);
    expect(gomlekBirimleri).toHaveLength(2);
    const stoklar = await stokSrv.stoklariOku(
      vt,
      gomlekBirimleri.map((b) => b.kimlik),
    );
    expect([...stoklar.values()].map((s) => s.miktar).sort()).toEqual([3, 4]);
    const bardak = await vt.execute<{ kimlik: string }>(
      sql`select kimlik from urunler where ad = ${`Bardak ${k.e}`}`,
    );
    const bardakUrunu = await urunSrv.urunuOku(vt, bardak.rows[0]?.kimlik ?? "");
    expect(bardakUrunu?.durum).toBe("taslak");
    expect(bardakUrunu?.marka).toBe(k.marka);
    expect(bardakUrunu?.birimler[0]?.stokKodu).toBe(`BRD-${k.e}`.toUpperCase());
  });

  it("önizlemeden sonra sitede değişen grup uygulanmaz, öteki uygulanır; parti ikinci kez bir şey yazmaz", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    const degisen = await dosyayiDegistir(dosya, (s) => {
      let t = hucreYaz(s, koduyla(`kupa-${k.e}`), "Stok", 40);
      t = hucreYaz(t, koduyla(`tisort-${k.e}`), "Stok", 9);
      return t;
    });
    const durum = await yukleVeDenetle(yonetici, degisen);
    expect(durum.sayilar.degistir).toBe(3);
    // Önizlemeden sonra kupanın stoğu değişir.
    await stokSrv.stokDuzelt(vt, sistem(), k.basitBirim, {
      yeniMiktar: 6,
      gorulenMiktar: 10,
      sebep: "sayim",
    });
    await servis.uygula(vt, yonetici, durum.kimlik);
    await isleriCalistir();
    // İkinci kez çalışan parti bir şey yazmaz.
    await vt
      .update(excelIceAktarmalari)
      .set({ durum: "uygulaniyor" })
      .where(eq(excelIceAktarmalari.kimlik, durum.kimlik));
    await servis.uygulamaPartisi(vt, durum.kimlik);
    const son = await servis.iceAktarmaDurumu(vt, yonetici, durum.kimlik);
    expect(son?.uygulama).toEqual({ toplam: 3, uygulanan: 2, uygulanamayan: 1 });
    expect(son?.uygulanamayanlar[0]?.uygulamaHatasi).toBe("sitede-degisti");
    expect((await stokSrv.stoklariOku(vt, [k.basitBirim])).get(k.basitBirim)?.miktar).toBe(6);
    const tisortStoklari = await stokSrv.stoklariOku(
      vt,
      k.birimler.map((b) => b.kimlik),
    );
    expect([...tisortStoklari.values()].map((s) => s.miktar)).toEqual([9, 9]);
    const gecmis = await vt
      .select()
      .from(stokGecmisi)
      .where(
        and(
          eq(stokGecmisi.sebep, "excel-ice-aktarma"),
          eq(stokGecmisi.birim_kimligi, k.birimler[0]?.kimlik ?? ""),
        ),
      );
    expect(gecmis).toHaveLength(1);
  });
});

describe("hatalı satırlar", () => {
  it("olmayan kategori, marka ve etiket; okunamayan tutar; boşaltılamayan ad; zamanlanmış durum; hatalı dosya uygulanmaz", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    const degisen = await dosyayiDegistir(dosya, (s) => {
      let t = hucreYaz(s, koduyla(`kupa-${k.e}`), "Kategoriler", `Bahçe ${k.e}`);
      t = hucreYaz(t, koduyla(`kupa-${k.e}`), "Marka", `Yok ${k.e}`);
      t = hucreYaz(t, koduyla(`kupa-${k.e}`), "Etiketler", `Yok ${k.e}`);
      t = hucreYaz(t, koduyla(`kupa-${k.e}`), "Satış fiyatı", "12,5,0");
      t = hucreYaz(t, (r) => r[0] === `tisort-${k.e}` && r[2] === "Renk: Beyaz", "Ad", "-");
      // Ortak bilgi grubun her satırında aynı yazılır; tek satırda farklı yazılan çelişkidir (aşağıdaki test).
      t = hucreYaz(t, koduyla(`tisort-${k.e}`), "Durum", "Zamanlanmış");
      return t;
    });
    const durum = await yukleVeDenetle(yonetici, degisen);
    expect(hataKodlari(durum)).toEqual(
      expect.arrayContaining([
        "kategori-yok",
        "marka-yok",
        "etiket-yok",
        "tutar-okunamadi",
        "bosaltilamaz",
        "zamanlanmis-dosyadan-secilmez",
      ]),
    );
    expect(
      durum.hatalilar.find((h) => h.hatalar.some((x) => x.kod === "kategori-yok"))?.hatalar,
    ).toContainEqual({
      kod: "kategori-yok",
      alan: "kategoriler",
      deger: `Bahçe ${k.e}`,
    });
    expect((await hatasi(servis.uygula(vt, yonetici, durum.kimlik))).ayrinti).toEqual([
      { alan: "dosya", kod: "excel-hatali-satir" },
    ]);
  });

  it("var olan ürüne yeni seçenek, seçenekli ürünün seçeneksiz satırı, aynı birleşim iki satırda, çelişen ortak bilgi, aynı stok kodu", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    const degisen = await dosyayiDegistir(dosya, (s) => {
      let t = hucreYaz(s, koduyla(`kupa-${k.e}`), "Seçenekler", "Malzeme: Cam");
      t = hucreYaz(
        t,
        (r) => r[0] === `tisort-${k.e}` && r[2] === "Renk: Siyah",
        "Ad",
        `Başka ad ${k.e}`,
      );
      t = [
        ...t,
        [
          `tisort-${k.e}`,
          null,
          "Renk: Beyaz",
          null,
          null,
          null,
          null,
          null,
          null,
          1,
          null,
          null,
          null,
          null,
          null,
        ],
        [
          `tisort-${k.e}`,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          1,
          null,
          null,
          null,
          null,
          null,
        ],
        [
          null,
          `Yeni ${k.e}`,
          null,
          `KUPA-${k.e}`.toUpperCase(),
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      ];
      return t;
    });
    const durum = await yukleVeDenetle(yonetici, degisen);
    expect(hataKodlari(durum)).toEqual(
      expect.arrayContaining([
        "yeni-secenek",
        "ortak-celisiyor",
        "birlesim-tekrar",
        "secenek-gerekli",
        "stok-kodu-kullaniliyor",
      ]),
    );
  });

  it("iki yanda değişen hücre hatalıdır; yalnız sitede değişen alan dokunulmaz", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    await stokSrv.stokDuzelt(vt, sistem(), k.basitBirim, {
      yeniMiktar: 3,
      gorulenMiktar: 10,
      sebep: "sayim",
    });
    await fiyatSrv.fiyatYaz(vt, sistem(), k.birimler[0]?.kimlik ?? "", { satisFiyati: 50_000 });
    const degisen = await dosyayiDegistir(dosya, (s) =>
      hucreYaz(s, koduyla(`kupa-${k.e}`), "Stok", 30),
    );
    const durum = await yukleVeDenetle(yonetici, degisen);
    expect(durum.hatalilar).toHaveLength(1);
    expect(durum.hatalilar[0]?.hatalar).toEqual([{ kod: "sitede-degisti", alan: "stok" }]);
    // Tişörtün fiyatı yalnız sitede değişti: satır değişmeyecek sayılır.
    expect(durum.sayilar.ayni).toBe(2);
  });

  it("fiyat ve stok izni olmayanın satırı hatalıdır", async () => {
    const sahip = await yoneticiAc();
    const gorevli = await yoneticiAc("gorevli");
    const k = await katalogKur();
    const { dosya } = await disaAktar(sahip, k.e);
    const degisen = await dosyayiDegistir(dosya, (s) => {
      let t = hucreYaz(s, koduyla(`kupa-${k.e}`), "Satış fiyatı", 1);
      t = hucreYaz(t, (r) => r[0] === `tisort-${k.e}` && r[2] === "Renk: Beyaz", "Stok", 99);
      return t;
    });
    const durum = await yukleVeDenetle(gorevli, degisen);
    expect(hataKodlari(durum)).toEqual(expect.arrayContaining(["fiyat-yetkisi"]));
    // Görevlinin stok izni vardır: stok satırı hatasızdır.
    expect(hataKodlari(durum)).not.toContain("stok-yetkisi");
  });
});

describe("dosya", () => {
  it(".xlsx olmayan, bozuk, eksik sütunlu, satır sınırını aşan ve sıkıştırma bombası dosya okunamadı olur", async () => {
    const yonetici = await yoneticiAc();
    const okunamadi = async (dosya: Buffer, s = servis) => {
      const durum = await yukleVeDenetle(yonetici, dosya, s);
      expect(durum.durum).toBe("okunamadi");
      return durum.neden;
    };
    expect(await okunamadi(Buffer.from("ad;fiyat\nkupa;10"))).toBe("excel-dosyasi-degil");
    expect(await okunamadi(Buffer.from(zipSync({ "a.txt": new Uint8Array(3) })))).toBe(
      "excel-dosyasi-degil",
    );
    const eksik = await writeXlsxFile([
      [{ value: "Ad", type: String }],
      [{ value: "Kupa", type: String }],
    ]).toBuffer();
    expect(await okunamadi(eksik)).toBe("excel-sutun-eksik");
    const bomba = Buffer.from(
      zipSync(
        { "xl/workbook.xml": new Uint8Array(1), "xl/a.bin": new Uint8Array(101 * 1024 * 1024) },
        { level: 9 },
      ),
    );
    expect(bomba.byteLength).toBeLessThan(1024 * 1024);
    expect(await okunamadi(bomba)).toBe("excel-cok-buyuk");
    const kucukSinir = excelServisi(
      { ...site, ayarlar: { ...site.ayarlar, excelSatirSiniri: 100 } },
      isler,
    );
    const satirlar = [
      [
        { value: "Ürün kodu", type: String },
        { value: "Ad", type: String },
      ],
      ...Array.from({ length: 101 }, (_, i) => [null, { value: `Ürün ${i}`, type: String }]),
    ];
    expect(await okunamadi(await writeXlsxFile(satirlar).toBuffer(), kucukSinir)).toBe(
      "excel-satir-siniri",
    );
  });
});

describe("kapalı eklenti, temizlik, denetimler, iki site", () => {
  it("kapalıyken servis bulunamadı verir, işler bir şey yapmaz", async () => {
    const yonetici = await yoneticiAc();
    const kapaliServis = excelServisi(kapali, isler);
    expect(
      (
        await hatasi(
          kapaliServis.disaAktarmaBaslat(vt, yonetici, { kapsam: null, fiyat: true, stok: true }),
        )
      ).kod,
    ).toBe("bulunamadi");
    expect(
      (
        await hatasi(
          kapaliServis.iceAktarmaYukle(vt, yonetici, { dosya: Buffer.from("x"), ad: "a.xlsx" }),
        )
      ).kod,
    ).toBe("bulunamadi");
    expect((await hatasi(kapaliServis.iceAktarmaDurumu(vt, yonetici))).kod).toBe("bulunamadi");
    // Açıkken başlatılan iş eklenti kapanınca beklemede kalır.
    const kimlik = await servis.disaAktarmaBaslat(vt, yonetici, {
      kapsam: null,
      fiyat: true,
      stok: true,
    });
    bekleyenler.length = 0;
    await kapaliServis.disaAktarmayiHazirla(vt, kimlik);
    expect(await kapaliServis.takilanlariSurdur(vt)).toBe(0);
    const [kayit] = await vt
      .select()
      .from(excelDisaAktarmalari)
      .where(eq(excelDisaAktarmalari.kimlik, kimlik));
    expect(kayit?.durum).toBe("hazirlaniyor");
  });

  it("saklama süresi dolan kayıtlar silinir; yenisi kalır", async () => {
    const yonetici = await yoneticiAc();
    const eski = await servis.disaAktarmaBaslat(vt, yonetici, {
      kapsam: null,
      fiyat: true,
      stok: true,
    });
    const yeni = await servis.disaAktarmaBaslat(vt, yonetici, {
      kapsam: null,
      fiyat: true,
      stok: true,
    });
    await vt
      .update(excelDisaAktarmalari)
      .set({ olusturma_zamani: sql`now() - interval '31 days'` })
      .where(eq(excelDisaAktarmalari.kimlik, eski));
    await servis.eskileriSil(vt);
    const kalan = await vt
      .select({ kimlik: excelDisaAktarmalari.kimlik })
      .from(excelDisaAktarmalari);
    expect(kalan.map((k) => k.kimlik)).toContain(yeni);
    expect(kalan.map((k) => k.kimlik)).not.toContain(eski);
  });

  it("veritabanının durum denetimleri kayıtla aynıdır", async () => {
    const tanim = async (ad: string) =>
      (
        await vt.execute<{ tanim: string }>(
          sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = ${ad}`,
        )
      ).rows[0]?.tanim ?? "";
    const degerler = (metin: string) => [...metin.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(degerler(await tanim("excel_disa_aktarmalari_durum"))).toEqual([
      ...excelDisaAktarmaDurumlari,
    ]);
    expect(degerler(await tanim("excel_ice_aktarmalari_durum"))).toEqual([
      ...excelIceAktarmaDurumlari,
    ]);
    expect(degerler(await tanim("excel_ice_aktarma_satirlari_sonuc"))).toEqual([
      ...excelSatirSonuclari,
    ]);
  });

  it("iki site ayrı kalır: bir sitenin dosyası öteki sitede ürün bulmaz, yeni ürün açar", async () => {
    const yonetici = await yoneticiAc();
    const k = await katalogKur();
    const { dosya } = await disaAktar(yonetici, k.e);
    const yoneticiB = await yoneticiAc("magaza-sahibi", vtB);
    const durum = await yukleVeDenetle(yoneticiB, dosya, servis, vtB);
    // B sitesinde ürün kodları yoktur: satırlar yeni ürün olur ya da (kategori, marka olmadığı için) hatalıdır.
    expect(durum.sayilar.degistir + durum.sayilar.ayni).toBe(0);
    expect(hataKodlari(durum)).toEqual(expect.arrayContaining(["kategori-yok", "marka-yok"]));
    const tablolar = await vtB
      .select()
      .from(excelIceAktarmaSatirlari)
      .where(eq(excelIceAktarmaSatirlari.is_kimligi, durum.kimlik));
    expect(tablolar.every((s) => s.urun_kimligi === null)).toBe(true);
  });
});
