// Ürün galerisi gerçek veritabanı ve gerçek klasörle (kart 0087, karar 0073): görselin bütün boyutlarının
// üretilmesi ve büyük görselin küçülmesi, sıra ve ana görsel, birleşimin kendi görseli, video bağlantısı
// ve sitenin video ayarı, galeriye bağlanamayan görseller, silinen öğenin galeriden düşüp dosyasının
// kalması, veritabanının denetimleri ve tetikleyicileri, açık duran yazmalarla yarışlar, değişiklik kaydı,
// tek sorguyla okuma ve iki sitenin ayrı kalması.
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, asc, eq, like, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import {
  galeriOgeTurleri,
  galeriSinirlari,
  gorselBoyutAdlari,
  gorselBoyutlari,
} from "../../../kayitlar/gorsel.ts";
import { videoSiteAdlari } from "../../../kayitlar/video-siteleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyaBoyutlari, dosyalar } from "../../dosya/model.ts";
import {
  dosyaKaydet,
  dosyaOku,
  dosyaSil,
  gorselBoyutlariniOku,
  gorselKaydet,
} from "../../dosya/servis.ts";
import { anaGorseller, birimGorseli, urunGalerileri } from "../galeri.ts";
import { urunBirimleri, urunGalerisi } from "../model.ts";
import { urunServisi } from "../servis.ts";
import { oynaticiAdresi, videoAdresiniCoz } from "../video.ts";
import { donusenBirimiSil } from "./donusen-birim.ts";

// Görseller ve boyutları gerçekten yeniden kodlanır: yüklü kontrol hattında bir test birkaç saniye
// sürebilir.
vi.setConfig({ testTimeout: 60_000 });

const servis = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void> | void)[] = [];
const siteAc = async () => {
  const site = await denemeSitesiAc("galeri");
  const klasor = mkdtempSync(join(tmpdir(), "galeri-"));
  temizlenecekler.push(site.sil, () => rmSync(klasor, { recursive: true, force: true }));
  return { vt: site.vt, klasor };
};
afterEach(async () => {
  vi.restoreAllMocks();
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
const dogrulama = (alan: string, kod: string) => ({ kod: "dogrulama", ayrinti: [{ alan, kod }] });

// Veritabanının reddettiği yazmanın hata kodu (23514 denetim, 23503 bağ, 23505 tekillik).
const veritabaniHatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (hata === undefined) throw new Error("Veritabanı yazmayı reddetmeliydi.");
  const kaynak = (hata as { cause?: unknown }).cause ?? hata;
  return (kaynak as { code?: string }).code;
};

// Bir işi kendi işleminde yapıp işlemi açık tutar; birak() çağrılınca işlem kaydedilir.
const acikIslem = async (vt: Veritabani, is: (islem: VeritabaniIslemi) => Promise<unknown>) => {
  let birak: () => void = () => undefined;
  const tut = new Promise<void>((coz) => {
    birak = coz;
  });
  let yazdi: () => void = () => undefined;
  const yazildi = new Promise<void>((coz) => {
    yazdi = coz;
  });
  const bitti = vt.transaction(async (islem) => {
    await is(islem);
    yazdi();
    await tut;
  });
  await Promise.race([yazildi, bitti]);
  return { birak: () => birak(), bitti };
};

const renkli = (genislik: number, yukseklik: number, bicim: "png" | "jpeg" = "png") =>
  sharp({
    create: {
      width: genislik,
      height: yukseklik,
      channels: 3,
      background: { r: 40, g: 90, b: 160 },
    },
  })
    .toFormat(bicim)
    .toBuffer();

const urunEkle = (vt: Veritabani) =>
  servis.urunEkle(vt, yonetici(), {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: null,
    durum: "yayinda",
  });

// Boyutlarıyla kaydedilmiş bir görsel.
const gorsel = async (vt: Veritabani, klasor: string, genislik = 400, yukseklik = 300) => {
  const sonuc = await gorselKaydet(vt, await renkli(genislik, yukseklik), klasor);
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc;
};

const gorselEkle = async (vt: Veritabani, klasor: string, urun: string, metin = "Görsel") =>
  servis.galeriyeGorselEkle(vt, yonetici(), urun, {
    dosya: (await gorsel(vt, klasor)).dosya.kimlik,
    alternatifMetin: metin,
  });

const videoEkle = (vt: Veritabani, urun: string, metin = "Video") =>
  servis.galeriyeVideoEkle(vt, yonetici(), urun, {
    adres: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    alternatifMetin: metin,
  });

const galerisi = async (vt: Veritabani, urun: string) =>
  (await servis.urunuOku(vt, urun))?.galeri ?? [];

describe("görselin boyutları", () => {
  it("büyük görselin bütün boyutları üretilir, her biri en uzun kenarıyla küçülür; özgün görsel kalır", async () => {
    const { vt, klasor } = await siteAc();
    const sonuc = await gorsel(vt, klasor, 3000, 2000);
    expect(sonuc.dosya).toMatchObject({ tur: "png", genislik: 3000, yukseklik: 2000 });
    for (const ad of gorselBoyutAdlari) {
      const kenar = gorselBoyutlari[ad];
      expect(sonuc.boyutlar[ad], ad).toMatchObject({
        tur: "webp",
        genislik: kenar,
        yukseklik: Math.round((kenar * 2000) / 3000),
      });
      const okunan = await dosyaOku(vt, sonuc.boyutlar[ad].kimlik, klasor);
      const bilgi = await sharp(okunan?.icerik).metadata();
      expect({ bicim: bilgi.format, genislik: bilgi.width }).toEqual({
        bicim: "webp",
        genislik: kenar,
      });
    }
    // Boyutlar özgün görselden hafiftir.
    expect(sonuc.boyutlar.kucuk.boyut).toBeLessThan(sonuc.boyutlar.tam.boyut);
    expect(readdirSync(klasor)).toHaveLength(1 + gorselBoyutAdlari.length);
    const satirlar = await vt
      .select()
      .from(dosyaBoyutlari)
      .where(eq(dosyaBoyutlari.kaynak_kimligi, sonuc.dosya.kimlik));
    expect(satirlar.map((s) => s.boyut).toSorted()).toEqual([...gorselBoyutAdlari].toSorted());
  });

  it("dikey görselde de en uzun kenar sınırlanır", async () => {
    const { vt, klasor } = await siteAc();
    const sonuc = await gorsel(vt, klasor, 1000, 2000);
    expect(sonuc.boyutlar.orta).toMatchObject({ genislik: 240, yukseklik: 480 });
  });

  it("küçük görsel büyütülmez", async () => {
    const { vt, klasor } = await siteAc();
    const sonuc = await gorsel(vt, klasor, 200, 100);
    expect(sonuc.boyutlar.kucuk).toMatchObject({ genislik: 160, yukseklik: 80 });
    for (const ad of ["orta", "buyuk", "tam"] as const) {
      expect(sonuc.boyutlar[ad], ad).toMatchObject({ genislik: 200, yukseklik: 100 });
    }
  });

  it("gömülü konum ve cihaz bilgisi boyutlarda da yok", async () => {
    const { vt, klasor } = await siteAc();
    const konumlu = await sharp(await renkli(400, 300, "jpeg"))
      .withExif({ IFD0: { Artist: "yazar-izi-0087", Make: "cihaz-izi-0087" } })
      .jpeg()
      .toBuffer();
    const sonuc = await gorselKaydet(vt, konumlu, klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    for (const dosya of [sonuc.dosya, ...Object.values(sonuc.boyutlar)]) {
      const icerik = (await dosyaOku(vt, dosya.kimlik, klasor))?.icerik;
      expect(icerik?.includes("yazar-izi-0087")).toBe(false);
      expect((await sharp(icerik).metadata()).exif).toBeUndefined();
    }
  });

  it("reddedilen dosyanın ne kaydı ne boyutu kalır; klasöre yazılamazsa hiçbiri kalmaz", async () => {
    const { vt, klasor } = await siteAc();
    const gif = await sharp({
      create: { width: 20, height: 20, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .gif()
      .toBuffer();
    expect(await gorselKaydet(vt, gif, klasor)).toEqual({ tamam: false, hata: "tur-izinsiz" });
    expect(await gorselKaydet(vt, Buffer.alloc(0), klasor)).toEqual({ tamam: false, hata: "bos" });
    await expect(gorselKaydet(vt, await renkli(50, 50), join(klasor, "yok"))).rejects.toThrow();
    expect(await vt.select().from(dosyalar)).toEqual([]);
    expect(await vt.select().from(dosyaBoyutlari)).toEqual([]);
    expect(readdirSync(klasor)).toEqual([]);
  });

  it("bir işlemin içinde çağrılmaz", async () => {
    const { vt, klasor } = await siteAc();
    const icerik = await renkli(50, 50);
    await expect(
      vt.transaction(async (islem) => gorselKaydet(islem as unknown as Veritabani, icerik, klasor)),
    ).rejects.toThrow("işleminin içinde");
  });
});

describe("galeri ve ana görsel", () => {
  it("öğeler eklendikleri sırayla gelir; ana görsel ilk görseldir, video ana görsel olmaz", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    expect(await galerisi(vt, urun)).toEqual([]);
    expect((await anaGorseller(vt, [urun])).has(urun)).toBe(false);
    const video = await videoEkle(vt, urun);
    const bir = await gorselEkle(vt, klasor, urun, "Önden");
    const iki = await gorselEkle(vt, klasor, urun, "Yandan");
    const galeri = await galerisi(vt, urun);
    expect(galeri.map((o) => [o.kimlik, o.tur, o.sira])).toEqual([
      [video, "video", 0],
      [bir, "gorsel", 1],
      [iki, "gorsel", 2],
    ]);
    expect(galeri[1]).toMatchObject({ alternatifMetin: "Önden" });
    expect((await anaGorseller(vt, [urun])).get(urun)?.kimlik).toBe(bir);
    const okunan = await servis.urunuOku(vt, urun);
    if (okunan === undefined) throw new Error("Ürün okunamadı.");
    expect(birimGorseli(okunan, okunan.birimler[0]?.kimlik ?? "")?.kimlik).toBe(bir);
  });

  it("sıra değişince ana görsel değişir; sıra verilen öğe yerine girer", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const bir = await gorselEkle(vt, klasor, urun);
    const iki = await gorselEkle(vt, klasor, urun);
    const uc = await gorselEkle(vt, klasor, urun);
    await servis.galeriyiSirala(vt, yonetici(), urun, { ogeler: [uc, bir, iki] });
    expect((await galerisi(vt, urun)).map((o) => o.kimlik)).toEqual([uc, bir, iki]);
    expect((await anaGorseller(vt, [urun])).get(urun)?.kimlik).toBe(uc);
    // Sırası verilen yeni öğe o sıraya girer; eşit sırada önce eklenen önce gelir.
    const dort = await servis.galeriyeGorselEkle(vt, yonetici(), urun, {
      dosya: (await gorsel(vt, klasor)).dosya.kimlik,
      alternatifMetin: "Dört",
      sira: 0,
    });
    expect((await galerisi(vt, urun)).map((o) => o.kimlik)).toEqual([uc, dort, bir, iki]);
    // Sıralama numaraları yeniden düzene sokar.
    await servis.galeriyiSirala(vt, yonetici(), urun, { ogeler: [uc, dort, bir, iki] });
    expect((await galerisi(vt, urun)).map((o) => o.sira)).toEqual([0, 1, 2, 3]);
  });

  it("sıralamada eksik, fazla, tekrarlı ya da başka ürünün öğesi reddedilir, hiçbir şey değişmez", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const bir = await gorselEkle(vt, klasor, urun);
    const iki = await gorselEkle(vt, klasor, urun);
    const baska = await gorselEkle(vt, klasor, await urunEkle(vt));
    const cakisma = { kod: "cakisma", ayrinti: [{ alan: "ogeler", kod: "galeri-sira-gecersiz" }] };
    const sirala = (ogeler: string[]) => servis.galeriyiSirala(vt, yonetici(), urun, { ogeler });
    expect(await hatasi(sirala([iki]))).toEqual(cakisma);
    expect(await hatasi(sirala([iki, bir, baska]))).toEqual(cakisma);
    expect(await hatasi(sirala([iki, baska]))).toEqual(cakisma);
    expect(await hatasi(sirala([iki, iki]))).toEqual(dogrulama("ogeler", "galeri-sira-gecersiz"));
    expect((await galerisi(vt, urun)).map((o) => o.kimlik)).toEqual([bir, iki]);
  });

  // Kart 0119: büyük harfle yazılmış kimlikler aynı öğelerdir.
  it("büyük harfle verilen sıralama yapılır, büyük harfle tekrarlanan öğe reddedilir", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const bir = await gorselEkle(vt, klasor, urun);
    const iki = await gorselEkle(vt, klasor, urun);
    const sirala = (ogeler: string[]) => servis.galeriyiSirala(vt, yonetici(), urun, { ogeler });
    await sirala([iki.toUpperCase(), bir.toUpperCase()]);
    expect((await galerisi(vt, urun)).map((o) => o.kimlik)).toEqual([iki, bir]);
    expect(await hatasi(sirala([bir, bir.toUpperCase()]))).toEqual(
      dogrulama("ogeler", "galeri-sira-gecersiz"),
    );
    expect((await galerisi(vt, urun)).map((o) => o.kimlik)).toEqual([iki, bir]);
  });

  it("alternatif metin zorunlu, sınırlı ve değiştirilebilir", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const { dosya } = await gorsel(vt, klasor);
    const ekle = (alternatifMetin: string) =>
      servis.galeriyeGorselEkle(vt, yonetici(), urun, { dosya: dosya.kimlik, alternatifMetin });
    expect((await hatasi(ekle(""))).kod).toBe("dogrulama");
    expect((await hatasi(ekle("   "))).kod).toBe("dogrulama");
    expect((await hatasi(ekle("a".repeat(galeriSinirlari.alternatifMetin + 1)))).kod).toBe(
      "dogrulama",
    );
    const oge = await ekle("Eski metin");
    await servis.galeriOgesiDegistir(vt, yonetici(), oge, { alternatifMetin: "Yeni metin" });
    expect((await galerisi(vt, urun))[0]?.alternatifMetin).toBe("Yeni metin");
    // Veritabanı boş metni de reddeder.
    expect(
      await veritabaniHatasi(
        vt.update(urunGalerisi).set({ alternatif_metin: " " }).where(eq(urunGalerisi.kimlik, oge)),
      ),
    ).toBe("23514");
  });

  it("aynı işlemde aynı sırayla eklenenler eklendikleri sırayla gelir", async () => {
    const { vt } = await siteAc();
    const urun = await urunEkle(vt);
    const eklenenler = await vt.transaction(async (islem) => {
      const kimlikler: string[] = [];
      for (let i = 0; i < 5; i++) {
        kimlikler.push(
          await servis.galeriyeVideoEkle(islem, yonetici(), urun, {
            adres: "https://youtu.be/aqz-KE-bpKQ",
            alternatifMetin: `Video ${i}`,
            sira: 0,
          }),
        );
      }
      return kimlikler;
    });
    expect((await galerisi(vt, urun)).map((o) => o.kimlik)).toEqual(eklenenler);
  });

  it("dosyası silinmiş görsel galeriden düşer: okunmaz, sıralamaya ve sınıra sayılmaz, seçilemez, öğesi silinebilir", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const kalan = await gorselEkle(vt, klasor, urun, "Kalan");
    const dosyasi = (await gorsel(vt, klasor)).dosya.kimlik;
    const giden = await servis.galeriyeGorselEkle(vt, yonetici(), urun, {
      dosya: dosyasi,
      alternatifMetin: "Giden",
    });
    await servis.galeriyiSirala(vt, yonetici(), urun, { ogeler: [giden, kalan] });
    await dosyaSil(vt, dosyasi);
    expect((await galerisi(vt, urun)).map((o) => o.kimlik)).toEqual([kalan]);
    expect((await anaGorseller(vt, [urun])).get(urun)?.kimlik).toBe(kalan);
    // Kaynağı silinmiş görselin boyutları da okunmaz.
    expect(await gorselBoyutlariniOku(vt, [dosyasi])).toEqual(new Map());
    await servis.galeriyiSirala(vt, yonetici(), urun, { ogeler: [kalan] });
    // Bir birleşim onu seçemez.
    await servis.secenekEkle(vt, yonetici(), urun, { ad: "Renk", degerler: ["Mavi"] });
    await donusenBirimiSil(servis, vt, urun);
    const deger = (await servis.urunuOku(vt, urun))?.secenekler[0]?.degerler[0]?.kimlik ?? "";
    const birim = await servis.birlesimEkle(vt, yonetici(), urun, { degerler: [deger] });
    expect(await hatasi(servis.birlesimDegistir(vt, yonetici(), birim, { gorsel: giden }))).toEqual(
      dogrulama("gorsel", "birim-gorseli-gecersiz"),
    );
    // Satırı kalır, yönetici öğeyi silebilir.
    await servis.galeriOgesiSil(vt, yonetici(), giden);
  });

  it("galeri sınırı aşılmaz", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    for (let i = 0; i < galeriSinirlari.oge; i++) await videoEkle(vt, urun);
    const sinir = { kod: "is-kurali", ayrinti: [{ alan: "galeri", kod: "galeri-siniri" }] };
    expect(await hatasi(videoEkle(vt, urun))).toEqual(sinir);
    expect(await hatasi(gorselEkle(vt, klasor, urun))).toEqual(sinir);
    // Silinen öğe sınıra sayılmaz.
    const [ilk] = await galerisi(vt, urun);
    await servis.galeriOgesiSil(vt, yonetici(), ilk?.kimlik ?? "");
    await videoEkle(vt, urun);
  });
});

describe("galeriye bağlanamayan görseller", () => {
  it("olmayan, silinmiş, boyutu eksik ve kendisi boyut olan dosya; aynı görsel iki kez", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const ekle = (dosya: string) =>
      servis.galeriyeGorselEkle(vt, yonetici(), urun, { dosya, alternatifMetin: "Görsel" });
    expect(await hatasi(ekle(randomUUID()))).toEqual(dogrulama("dosya", "galeri-gorsel-gecersiz"));
    const silinen = await gorsel(vt, klasor);
    await dosyaSil(vt, silinen.dosya.kimlik);
    expect(await hatasi(ekle(silinen.dosya.kimlik))).toEqual(
      dogrulama("dosya", "galeri-gorsel-gecersiz"),
    );
    const boyutsuz = await dosyaKaydet(vt, await renkli(100, 100), klasor);
    if (!boyutsuz.tamam) throw new Error(boyutsuz.hata);
    expect(await hatasi(ekle(boyutsuz.dosya.kimlik))).toEqual(
      dogrulama("dosya", "galeri-boyut-eksik"),
    );
    const tam = await gorsel(vt, klasor);
    expect(await hatasi(ekle(tam.boyutlar.orta.kimlik))).toEqual(
      dogrulama("dosya", "galeri-gorsel-gecersiz"),
    );
    // Bir boyutu silinmiş görsel de eksik sayılır.
    const eksik = await gorsel(vt, klasor);
    await dosyaSil(vt, eksik.boyutlar.kucuk.kimlik);
    expect(await hatasi(ekle(eksik.dosya.kimlik))).toEqual(
      dogrulama("dosya", "galeri-boyut-eksik"),
    );
    await ekle(tam.dosya.kimlik);
    expect(await hatasi(ekle(tam.dosya.kimlik))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "dosya", kod: "galeri-gorsel-tekrar" }],
    });
    // Veritabanındaki kısmi tekil indeks ikinci ağdır.
    expect(
      await veritabaniHatasi(
        vt.insert(urunGalerisi).values({
          urun_kimligi: urun,
          tur: "gorsel",
          dosya_kimligi: tam.dosya.kimlik,
          alternatif_metin: "Tekrar",
        }),
      ),
    ).toBe("23505");
    // Aynı görsel başka bir ürünün galerisine girebilir.
    await servis.galeriyeGorselEkle(vt, yonetici(), await urunEkle(vt), {
      dosya: tam.dosya.kimlik,
      alternatifMetin: "Görsel",
    });
    expect(await galerisi(vt, urun)).toHaveLength(1);
  });

  it("silinmiş, olmayan ve bozuk kimlikli ürün bulunamadı sayılır", async () => {
    const { vt, klasor } = await siteAc();
    const silinen = await urunEkle(vt);
    await servis.urunSil(vt, yonetici(), silinen);
    const { dosya } = await gorsel(vt, klasor);
    for (const urun of [silinen, randomUUID(), "bozuk"]) {
      expect(
        await hatasi(
          servis.galeriyeGorselEkle(vt, yonetici(), urun, {
            dosya: dosya.kimlik,
            alternatifMetin: "Görsel",
          }),
        ),
      ).toEqual({ kod: "bulunamadi", ayrinti: undefined });
      expect((await hatasi(videoEkle(vt, urun))).kod).toBe("bulunamadi");
    }
    for (const oge of [randomUUID(), "bozuk"]) {
      expect((await hatasi(servis.galeriOgesiSil(vt, yonetici(), oge))).kod).toBe("bulunamadi");
      expect(
        (await hatasi(servis.galeriOgesiDegistir(vt, yonetici(), oge, { alternatifMetin: "x" })))
          .kod,
      ).toBe("bulunamadi");
    }
  });

  it("açık duran dosya silmesi bitmeden görsel bağlanmaz, sonra silinmiş görülür", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const { dosya } = await gorsel(vt, klasor);
    const silme = await acikIslem(vt, (islem) =>
      islem
        .update(dosyalar)
        .set({ silinme_zamani: new Date() })
        .where(eq(dosyalar.kimlik, dosya.kimlik)),
    );
    const ekleme = hatasi(
      servis.galeriyeGorselEkle(vt, yonetici(), urun, {
        dosya: dosya.kimlik,
        alternatifMetin: "Görsel",
      }),
    );
    await kilitBekleyeniGor(vt);
    silme.birak();
    await silme.bitti;
    expect(await ekleme).toEqual(dogrulama("dosya", "galeri-gorsel-gecersiz"));
  });
});

describe("video", () => {
  it.each([
    ["https://www.youtube.com/watch?v=aqz-KE-bpKQ", "youtube"],
    ["https://youtube.com/watch?v=aqz-KE-bpKQ&t=30s", "youtube"],
    ["https://m.youtube.com/watch?v=aqz-KE-bpKQ", "youtube"],
    ["https://youtu.be/aqz-KE-bpKQ?si=abc", "youtube"],
    ["https://www.youtube.com/embed/aqz-KE-bpKQ", "youtube"],
    ["https://www.youtube.com/shorts/aqz-KE-bpKQ", "youtube"],
    ["https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ", "youtube"],
    ["  http://WWW.YOUTUBE.COM/watch?v=aqz-KE-bpKQ  ", "youtube"],
    ["https://vimeo.com/1084537", "vimeo"],
    ["https://player.vimeo.com/video/1084537", "vimeo"],
  ])("%s tanınır", (adres, site) => {
    const video = videoAdresiniCoz(adres);
    expect(video?.site).toBe(site);
    expect(video?.kimlik).toBe(site === "youtube" ? "aqz-KE-bpKQ" : "1084537");
  });

  it.each([
    "https://www.youtube.com.kotu.example/watch?v=aqz-KE-bpKQ",
    "https://kotu.example/watch?v=aqz-KE-bpKQ",
    "https://www.youtube.com/watch?v=kisa",
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ%22%3E",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/channel/aqz-KE-bpKQ",
    "https://kullanici:sifre@www.youtube.com/watch?v=aqz-KE-bpKQ",
    "https://www.youtube.com:8443/watch?v=aqz-KE-bpKQ",
    "javascript:alert(1)//youtube.com/watch?v=aqz-KE-bpKQ",
    "ftp://youtube.com/watch?v=aqz-KE-bpKQ",
    "https://vimeo.com/1084537/abcdef1234",
    "https://vimeo.com/abc",
    "https://player.vimeo.com/video/1084537?h=abcdef1234",
    "https://vimeo.com/1084537?h=abcdef1234",
    "youtube.com/watch?v=aqz-KE-bpKQ",
    "",
    `https://www.youtube.com/watch?v=aqz-KE-bpKQ&x=${"a".repeat(500)}`,
  ])("%s reddedilir", (adres) => {
    expect(videoAdresiniCoz(adres)).toBeUndefined();
  });

  it("bağlantının kendisi değil site ve kimlik saklanır; oynatıcı çerezsiz adrestir", async () => {
    const { vt } = await siteAc();
    const urun = await urunEkle(vt);
    const youtube = await servis.galeriyeVideoEkle(vt, yonetici(), urun, {
      adres: "https://youtu.be/aqz-KE-bpKQ?si=izleme-kodu",
      alternatifMetin: "Tanıtım",
    });
    const vimeo = await servis.galeriyeVideoEkle(vt, yonetici(), urun, {
      adres: "https://vimeo.com/1084537",
      alternatifMetin: "Kullanım",
    });
    const [satir] = await vt.select().from(urunGalerisi).where(eq(urunGalerisi.kimlik, youtube));
    expect(satir).toMatchObject({ video_sitesi: "youtube", video_kimligi: "aqz-KE-bpKQ" });
    expect(JSON.stringify(satir)).not.toContain("izleme-kodu");
    expect(await galerisi(vt, urun)).toEqual([
      {
        kimlik: youtube,
        tur: "video",
        site: "youtube",
        videoKimligi: "aqz-KE-bpKQ",
        oynatici: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
        alternatifMetin: "Tanıtım",
        sira: 0,
      },
      {
        kimlik: vimeo,
        tur: "video",
        site: "vimeo",
        videoKimligi: "1084537",
        oynatici: "https://player.vimeo.com/video/1084537?dnt=1",
        alternatifMetin: "Kullanım",
        sira: 1,
      },
    ]);
    expect(oynaticiAdresi({ site: "youtube", kimlik: "aqz-KE-bpKQ" })).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\//,
    );
  });

  it("tanınmayan bağlantı ve sitede kabul edilmeyen video sitesi reddedilir; boş liste videoyu kapatır", async () => {
    const { vt } = await siteAc();
    const urun = await urunEkle(vt);
    const ekle = (srv: ReturnType<typeof urunServisi>, adres: string) =>
      srv.galeriyeVideoEkle(vt, yonetici(), urun, { adres, alternatifMetin: "Video" });
    expect(await hatasi(ekle(servis, "https://kotu.example/video/1"))).toEqual(
      dogrulama("adres", "video-adresi-gecersiz"),
    );
    const yalnizYoutube = urunServisi(
      () => "Europe/Istanbul",
      () => ["youtube"],
    );
    expect(await hatasi(ekle(yalnizYoutube, "https://vimeo.com/1084537"))).toEqual(
      dogrulama("adres", "video-sitesi-izinsiz"),
    );
    await ekle(yalnizYoutube, "https://youtu.be/aqz-KE-bpKQ");
    const kapali = urunServisi(
      () => "Europe/Istanbul",
      () => [],
    );
    expect(await hatasi(ekle(kapali, "https://youtu.be/aqz-KE-bpKQ"))).toEqual(
      dogrulama("adres", "video-sitesi-izinsiz"),
    );
    expect(await galerisi(vt, urun)).toHaveLength(1);
  });
});

describe("birleşimin görseli", () => {
  // İki renkli bir ürün: iki birleşim ve üç görsel.
  const varyantliUrun = async (vt: Veritabani, klasor: string) => {
    const urun = await urunEkle(vt);
    await servis.secenekEkle(vt, yonetici(), urun, { ad: "Renk", degerler: ["Mavi", "Kırmızı"] });
    await donusenBirimiSil(servis, vt, urun);
    const degerler = (await servis.urunuOku(vt, urun))?.secenekler[0]?.degerler ?? [];
    const ana = await gorselEkle(vt, klasor, urun, "Ana");
    const mavi = await gorselEkle(vt, klasor, urun, "Mavi");
    const kirmizi = await gorselEkle(vt, klasor, urun, "Kırmızı");
    const maviBirim = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [degerler[0]?.kimlik ?? ""],
      gorsel: mavi,
    });
    const kirmiziBirim = await servis.birlesimEkle(vt, yonetici(), urun, {
      degerler: [degerler[1]?.kimlik ?? ""],
    });
    return { urun, ana, mavi, kirmizi, maviBirim, kirmiziBirim };
  };
  const gosterilen = async (vt: Veritabani, urun: string, birim: string) => {
    const okunan = await servis.urunuOku(vt, urun);
    if (okunan === undefined) throw new Error("Ürün okunamadı.");
    return birimGorseli(okunan, birim)?.kimlik;
  };

  it("birleşim kendi görselini gösterir, seçmeyen ana görseli; seçim değişir ve kaldırılır", async () => {
    const { vt, klasor } = await siteAc();
    const v = await varyantliUrun(vt, klasor);
    expect(await gosterilen(vt, v.urun, v.maviBirim)).toBe(v.mavi);
    expect(await gosterilen(vt, v.urun, v.kirmiziBirim)).toBe(v.ana);
    await servis.birlesimDegistir(vt, yonetici(), v.kirmiziBirim, { gorsel: v.kirmizi });
    expect(await gosterilen(vt, v.urun, v.kirmiziBirim)).toBe(v.kirmizi);
    // Sıra değişince seçim aynı kalır, ana görsel değişir.
    await servis.galeriyiSirala(vt, yonetici(), v.urun, { ogeler: [v.mavi, v.ana, v.kirmizi] });
    expect(await gosterilen(vt, v.urun, v.kirmiziBirim)).toBe(v.kirmizi);
    await servis.birlesimDegistir(vt, yonetici(), v.kirmiziBirim, { gorsel: null });
    expect(await gosterilen(vt, v.urun, v.kirmiziBirim)).toBe(v.mavi);
    const birimler = (await servis.urunuOku(vt, v.urun))?.birimler ?? [];
    expect(birimler.find((b) => b.kimlik === v.maviBirim)?.gorsel).toBe(v.mavi);
    expect(birimler.find((b) => b.kimlik === v.kirmiziBirim)?.gorsel).toBeUndefined();
  });

  it("başka ürünün öğesi, video, silinmiş ve olmayan öğe seçilemez; serviste ve veritabanında", async () => {
    const { vt, klasor } = await siteAc();
    const v = await varyantliUrun(vt, klasor);
    const baska = await gorselEkle(vt, klasor, await urunEkle(vt));
    const video = await videoEkle(vt, v.urun);
    const silinen = await gorselEkle(vt, klasor, v.urun);
    await servis.galeriOgesiSil(vt, yonetici(), silinen);
    const hata = dogrulama("gorsel", "birim-gorseli-gecersiz");
    for (const gorsel of [baska, video, silinen, randomUUID()]) {
      expect(
        await hatasi(servis.birlesimDegistir(vt, yonetici(), v.kirmiziBirim, { gorsel })),
        gorsel,
      ).toEqual(hata);
    }
    const degerler = (await servis.urunuOku(vt, v.urun))?.secenekler[0]?.degerler ?? [];
    await servis.birlesimSil(vt, yonetici(), v.kirmiziBirim);
    expect(
      await hatasi(
        servis.birlesimEkle(vt, yonetici(), v.urun, {
          degerler: [degerler[1]?.kimlik ?? ""],
          gorsel: baska,
        }),
      ),
    ).toEqual(hata);
    const dogrudan = (gorsel: string) =>
      veritabaniHatasi(
        vt
          .update(urunBirimleri)
          .set({ gorsel_kimligi: gorsel })
          .where(eq(urunBirimleri.kimlik, v.maviBirim)),
      );
    // Başka ürünün öğesi ürünle öğenin ikilisine bağlı bağla, video ve silinmiş öğe tetikleyiciyle
    // reddedilir.
    expect(await dogrudan(baska)).toBe("23503");
    expect(await dogrudan(video)).toBe("23514");
    expect(await dogrudan(silinen)).toBe("23514");
  });

  it("öğe silinince onu seçmiş birleşimin görseli boşalır, ana görsele düşer ve kayda girer; dosya kalır", async () => {
    const { vt, klasor } = await siteAc();
    const v = await varyantliUrun(vt, klasor);
    const maviDosya = (await galerisi(vt, v.urun)).find((o) => o.kimlik === v.mavi);
    await servis.galeriOgesiSil(vt, yonetici(), v.mavi);
    expect((await galerisi(vt, v.urun)).map((o) => o.kimlik)).toEqual([v.ana, v.kirmizi]);
    expect(await gosterilen(vt, v.urun, v.maviBirim)).toBe(v.ana);
    const [birim] = await vt
      .select({ gorsel: urunBirimleri.gorsel_kimligi })
      .from(urunBirimleri)
      .where(eq(urunBirimleri.kimlik, v.maviBirim));
    expect(birim?.gorsel).toBeNull();
    const kayit = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, v.maviBirim),
          eq(degisiklikKayitlari.islem, "urun-birimi.degisti"),
        ),
      );
    expect(kayit.map((k) => [k.eski_deger, k.yeni_deger])).toEqual([[{ gorsel: v.mavi }, {}]]);
    // Siparişlerin bağlı kalabileceği dosya ve boyutları silinmez.
    if (maviDosya?.tur !== "gorsel") throw new Error("Görsel beklenirdi.");
    expect(await dosyaOku(vt, maviDosya.dosya, klasor)).toBeDefined();
    expect(await dosyaOku(vt, maviDosya.boyutlar.kucuk?.kimlik ?? "", klasor)).toBeDefined();
    // Silinen görsel galeriye yeniden eklenebilir.
    await servis.galeriyeGorselEkle(vt, yonetici(), v.urun, {
      dosya: maviDosya.dosya,
      alternatifMetin: "Mavi yeniden",
    });
  });

  it("veritabanı bir birimin seçtiği öğenin silinmesini ve videoya dönmesini reddeder", async () => {
    const { vt, klasor } = await siteAc();
    const v = await varyantliUrun(vt, klasor);
    const dogrudan = (deger: Partial<typeof urunGalerisi.$inferInsert>) =>
      veritabaniHatasi(vt.update(urunGalerisi).set(deger).where(eq(urunGalerisi.kimlik, v.mavi)));
    expect(await dogrudan({ silinme_zamani: new Date() })).toBe("23514");
    expect(
      await dogrudan({
        tur: "video",
        dosya_kimligi: null,
        video_sitesi: "youtube",
        video_kimligi: "aqz-KE-bpKQ",
      }),
    ).toBe("23514");
    // Seçilmiş öğe READ COMMITTED dışındaki işlemde hiç silinemez: eski görüntü aynı anda kaydedilen
    // seçimi görmezdi. Silme dışındaki değişiklik o işlemde de olur.
    const tekrarlanabilir = (deger: Partial<typeof urunGalerisi.$inferInsert>, oge: string) =>
      vt.transaction(
        async (islem) => {
          await islem.update(urunGalerisi).set(deger).where(eq(urunGalerisi.kimlik, oge));
        },
        { isolationLevel: "repeatable read" },
      );
    expect(await veritabaniHatasi(tekrarlanabilir({ silinme_zamani: new Date() }, v.ana))).toBe(
      "40001",
    );
    await tekrarlanabilir({ alternatif_metin: "Yeni" }, v.mavi);
    // Silinmiş birimin seçimi silmeyi engellemez.
    await servis.birlesimSil(vt, yonetici(), v.maviBirim);
    await vt
      .update(urunGalerisi)
      .set({ silinme_zamani: new Date() })
      .where(eq(urunGalerisi.kimlik, v.mavi));
  });

  it("açık duran öğe silmesi bitmeden birim o öğeyi seçemez (tetikleyici öğeyi kilitler)", async () => {
    const { vt, klasor } = await siteAc();
    const v = await varyantliUrun(vt, klasor);
    const silme = await acikIslem(vt, (islem) =>
      islem
        .update(urunGalerisi)
        .set({ silinme_zamani: new Date() })
        .where(eq(urunGalerisi.kimlik, v.kirmizi)),
    );
    const secim = veritabaniHatasi(
      vt
        .update(urunBirimleri)
        .set({ gorsel_kimligi: v.kirmizi })
        .where(eq(urunBirimleri.kimlik, v.kirmiziBirim)),
    );
    await kilitBekleyeniGor(vt);
    silme.birak();
    await silme.bitti;
    expect(await secim).toBe("23514");
  });

  it("açık duran seçim bitmeden öğe silinemez, sonra seçim görülür", async () => {
    const { vt, klasor } = await siteAc();
    const v = await varyantliUrun(vt, klasor);
    const secim = await acikIslem(vt, (islem) =>
      islem
        .update(urunBirimleri)
        .set({ gorsel_kimligi: v.kirmizi })
        .where(eq(urunBirimleri.kimlik, v.kirmiziBirim)),
    );
    const silme = veritabaniHatasi(
      vt
        .update(urunGalerisi)
        .set({ silinme_zamani: new Date() })
        .where(eq(urunGalerisi.kimlik, v.kirmizi)),
    );
    await kilitBekleyeniGor(vt);
    secim.birak();
    await secim.bitti;
    expect(await silme).toBe("23514");
  });

  it("aynı anda servisle silme ve seçim: tutarlı biter (seçim ya galeride ya boş)", async () => {
    const { vt, klasor } = await siteAc();
    for (let deneme = 0; deneme < 3; deneme++) {
      const v = await varyantliUrun(vt, klasor);
      const sonuclar = await Promise.allSettled([
        servis.galeriOgesiSil(vt, yonetici(), v.kirmizi),
        servis.birlesimDegistir(vt, yonetici(), v.kirmiziBirim, { gorsel: v.kirmizi }),
      ]);
      expect(sonuclar[0]?.status).toBe("fulfilled");
      const [birim] = await vt
        .select({ gorsel: urunBirimleri.gorsel_kimligi })
        .from(urunBirimleri)
        .where(eq(urunBirimleri.kimlik, v.kirmiziBirim));
      expect(birim?.gorsel).toBeNull();
    }
  });
});

describe("veritabanı", () => {
  it("tür ve video sitesi denetimleri kayıtlarla aynı", async () => {
    const { vt } = await siteAc();
    const tanim = async (ad: string) =>
      (
        (
          await vt.execute(
            sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = ${ad}`,
          )
        ).rows[0] as { tanim: string } | undefined
      )?.tanim ?? "";
    const tirnaklilar = (metin: string) => [...metin.matchAll(/'([a-z-]+)'/g)].map((e) => e[1]);
    expect(tirnaklilar(await tanim("urun_galerisi_tur")).toSorted()).toEqual(
      [...galeriOgeTurleri].toSorted(),
    );
    const video = await tanim("urun_galerisi_video");
    const siteler = tirnaklilar(video.slice(video.indexOf("video_sitesi = ANY")));
    expect(siteler.toSorted()).toEqual([...videoSiteAdlari].toSorted());
  });

  it("türüne uymayan satır, tanınmayan site ve dosyasız görsel reddedilir", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const { dosya } = await gorsel(vt, klasor);
    const yaz = (deger: Partial<typeof urunGalerisi.$inferInsert>) =>
      veritabaniHatasi(
        vt.insert(urunGalerisi).values({
          urun_kimligi: urun,
          tur: "gorsel",
          alternatif_metin: "x",
          ...deger,
        }),
      );
    expect(await yaz({})).toBe("23514");
    expect(await yaz({ tur: "ses", dosya_kimligi: dosya.kimlik })).toBe("23514");
    expect(await yaz({ tur: "video", video_sitesi: "kotu", video_kimligi: "1" })).toBe("23514");
    expect(await yaz({ tur: "video", video_sitesi: "vimeo" })).toBe("23514");
    expect(
      await yaz({ dosya_kimligi: dosya.kimlik, video_sitesi: "vimeo", video_kimligi: "1" }),
    ).toBe("23514");
    expect(await yaz({ dosya_kimligi: randomUUID() })).toBe("23503");
  });
});

describe("kayıt, okuma ve ayrım", () => {
  it("ekleme, değişiklik, sıralama ve silme değişiklik kaydına girer; aynı kalan değişiklik girmez", async () => {
    const { vt, klasor } = await siteAc();
    const urun = await urunEkle(vt);
    const { dosya } = await gorsel(vt, klasor);
    const bir = await servis.galeriyeGorselEkle(vt, yonetici(), urun, {
      dosya: dosya.kimlik,
      alternatifMetin: "Bir",
    });
    const iki = await videoEkle(vt, urun, "İki");
    await servis.galeriOgesiDegistir(vt, yonetici(), bir, { alternatifMetin: "Bir" });
    await servis.galeriOgesiDegistir(vt, yonetici(), bir, { alternatifMetin: "Birinci" });
    await servis.galeriyiSirala(vt, yonetici(), urun, { ogeler: [bir, iki] });
    await servis.galeriyiSirala(vt, yonetici(), urun, { ogeler: [iki, bir] });
    await servis.galeriOgesiSil(vt, yonetici(), iki);
    const satirlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(like(degisiklikKayitlari.islem, "urun-galerisi.%"))
      .orderBy(asc(degisiklikKayitlari.zaman), asc(degisiklikKayitlari.islem));
    expect(
      satirlar.map((s) => [s.islem, s.kayit_turu, s.kayit_kimligi, s.eski_deger, s.yeni_deger]),
    ).toEqual([
      [
        "urun-galerisi.eklendi",
        "urun-galeri-ogesi",
        bir,
        null,
        { urun, tur: "gorsel", dosya: dosya.kimlik, alternatifMetin: "Bir", sira: 0 },
      ],
      [
        "urun-galerisi.eklendi",
        "urun-galeri-ogesi",
        iki,
        null,
        {
          urun,
          tur: "video",
          site: "youtube",
          videoKimligi: "aqz-KE-bpKQ",
          alternatifMetin: "İki",
          sira: 1,
        },
      ],
      [
        "urun-galerisi.degisti",
        "urun-galeri-ogesi",
        bir,
        { alternatifMetin: "Bir" },
        { alternatifMetin: "Birinci" },
      ],
      ["urun-galerisi.siralandi", "urun", urun, { galeri: [bir, iki] }, { galeri: [iki, bir] }],
      [
        "urun-galerisi.silindi",
        "urun-galeri-ogesi",
        iki,
        {
          urun,
          tur: "video",
          site: "youtube",
          videoKimligi: "aqz-KE-bpKQ",
          alternatifMetin: "İki",
          sira: 0,
        },
        null,
      ],
    ]);
  });

  it("kayıt düşerse galeri değişikliği geri alınır", async () => {
    const { vt } = await siteAc();
    const urun = await urunEkle(vt);
    await expect(
      vt.transaction(async (islem) => {
        await servis.galeriyeVideoEkle(islem, yonetici(), urun, {
          adres: "https://youtu.be/aqz-KE-bpKQ",
          alternatifMetin: "Video",
        });
        throw new Error("düştü");
      }),
    ).rejects.toThrow("düştü");
    expect(await galerisi(vt, urun)).toEqual([]);
    expect(
      await vt
        .select()
        .from(degisiklikKayitlari)
        .where(like(degisiklikKayitlari.islem, "urun-galerisi.%")),
    ).toEqual([]);
  });

  it("galeriler ve ana görseller ürün sayısıyla artmayan iki sorguyla gelir", async () => {
    const { vt, klasor } = await siteAc();
    const urunler: string[] = [];
    for (let i = 0; i < 4; i++) {
      const urun = await urunEkle(vt);
      urunler.push(urun);
      await videoEkle(vt, urun);
      await gorselEkle(vt, klasor, urun);
      await gorselEkle(vt, klasor, urun);
    }
    const sorgu = vi.spyOn(vt.$client, "query");
    const analar = await anaGorseller(vt, urunler);
    expect(sorgu).toHaveBeenCalledTimes(2);
    expect(analar.size).toBe(4);
    for (const urun of urunler) {
      const ana = analar.get(urun);
      expect(ana?.tur).toBe("gorsel");
      expect(Object.keys(ana?.boyutlar ?? {}).toSorted()).toEqual(
        [...gorselBoyutAdlari].toSorted(),
      );
    }
    sorgu.mockClear();
    const galeriler = await urunGalerileri(vt, urunler);
    expect(sorgu).toHaveBeenCalledTimes(2);
    expect([...galeriler.values()].map((g) => g.length)).toEqual([3, 3, 3, 3]);
    sorgu.mockClear();
    expect(await urunGalerileri(vt, ["bozuk"])).toEqual(new Map());
    expect(sorgu).not.toHaveBeenCalled();
  });

  it("iki site birbirinin galerisini görmez", async () => {
    const a = await siteAc();
    const b = await siteAc();
    const urun = await urunEkle(a.vt);
    await gorselEkle(a.vt, a.klasor, urun);
    expect(await urunGalerileri(b.vt, [urun])).toEqual(new Map());
    expect(await b.vt.select().from(urunGalerisi)).toEqual([]);
    expect(await b.vt.select().from(dosyalar)).toEqual([]);
    expect(existsSync(b.klasor) && readdirSync(b.klasor)).toEqual([]);
  });
});
