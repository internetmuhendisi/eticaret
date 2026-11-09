// Düzen servisi gerçek veritabanıyla (kart 0106, karar 0081): başlangıç düzeninin bir kez ve yeni kimliklerle
// yazılması, aynı türden iki bölümün eklenip sıralanması ve birinin gizlenmesi, şemaya uymayan ya da olmayan
// kayda başvuran değerin kaydedilmemesi, işleve bağlı bölümün işlev yokken çizilmeyip açılınca çizilmesi,
// değişiklik kaydı, aynı anda gelen işlemler ve sürümlerin değiştirilemezliği.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { hataIzlemeAraciniBagla, type IzlenenHata } from "../../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import { denemeKutuphanesi } from "../../../katalog/deneme-bolumu/tarif.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { type Islev, yazilanIslevler } from "../../../kayitlar/islevler.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import type { BaslangicDuzeni } from "../../../vitrin/bolum-kutuphanesi/duzen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyaSil, gorselKaydet } from "../../dosya/servis.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
import { markaServisi } from "../../marka/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { duzenSurumleri } from "../model.ts";
import { duzenBaslangicYazari, duzenServisi } from "../servis.ts";

const ornekSite = siteKlasorunuOku(
  join(import.meta.dirname, "..", "..", "..", "ayar-semasi", "testler", "ornek-siteler", "gecerli"),
);

const baslangicDuzeni: BaslangicDuzeni = {
  "ust-kisim": [{ tur: "deneme-seridi", gizli: false, degerler: { metin: "Duyuru" } }],
  "ana-sayfa": [
    { tur: "deneme-bolumu", gizli: false, degerler: { baslik: "Seçkiler" } },
    { tur: "deneme-yorumlari", gizli: false, degerler: {} },
  ],
  "alt-kisim": [],
};
const site: Site = { ...ornekSite, duzenBaslangici: baslangicDuzeni };

// İşlevler testte açılıp kapanır.
let islevler: Record<Islev, boolean> = { ...yazilanIslevler };
const servis = duzenServisi(
  () => site,
  () => denemeKutuphanesi,
  () => islevler,
);
const urunler = urunServisi(() => "Europe/Istanbul");

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const izlenenler: IzlenenHata[] = [];
hataIzlemeAraciniBagla((olay) => izlenenler.push(olay));

const temizlenecekler: (() => Promise<void> | void)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("duzen");
  temizlenecekler.push(acilan.sil);
  return acilan.vt;
};
afterEach(async () => {
  izlenenler.length = 0;
  islevler = { ...yazilanIslevler };
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti as { alan: string; kod: string }[] };
};

const surumler = (vt: Veritabani) =>
  vt.select().from(duzenSurumleri).orderBy(asc(duzenSurumleri.sira));
const kayitlar = async (vt: Veritabani) =>
  (
    await vt
      .select({ kayit: degisiklikKayitlari })
      .from(degisiklikKayitlari)
      .innerJoin(duzenSurumleri, eq(duzenSurumleri.kimlik, degisiklikKayitlari.kayit_kimligi))
      .orderBy(asc(duzenSurumleri.sira))
  ).map((satir) => satir.kayit);

const gorselAc = async (vt: Veritabani) => {
  const klasor = mkdtempSync(join(tmpdir(), "duzen-"));
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

const anaSayfa = async (vt: Veritabani) =>
  (await servis.duzenOku(vt)).duzen["ana-sayfa"].map((bolum) => bolum.kimlik);

describe("başlangıç düzeni", () => {
  it("ilk okumada bir kez, yeni kimliklerle ve görünüm varsayılanıyla yazılır, kayda sistem olarak girer", async () => {
    const vt = await siteAc();
    const ilk = await servis.duzenOku(vt);
    expect(ilk.sira).toBe(1);
    const [seckiler, yorumlar] = ilk.duzen["ana-sayfa"];
    expect(seckiler).toMatchObject({
      tur: "deneme-bolumu",
      gorunum: "genis",
      gizli: false,
      degerler: { baslik: "Seçkiler", maddeler: [] },
    });
    expect(seckiler?.kimlik).toMatch(/^[0-9a-f-]{36}$/);
    expect(seckiler?.kimlik).not.toBe(yorumlar?.kimlik);
    await servis.duzenOku(vt);
    expect(await surumler(vt)).toHaveLength(1);
    const [kayit, ...fazla] = await kayitlar(vt);
    expect(fazla).toEqual([]);
    expect(kayit).toMatchObject({
      islem: "duzen.baslangic",
      kim_turu: "sistem",
      kim_adi: duzenBaslangicYazari.tur === "sistem" ? duzenBaslangicYazari.ad : "",
    });
  });

  it("aynı anda sekiz okumada tek sürüm", async () => {
    const vt = await siteAc();
    const sonuclar = await Promise.all(Array.from({ length: 8 }, () => servis.duzenOku(vt)));
    expect(new Set(sonuclar.map((durum) => durum.kimlik)).size).toBe(1);
    expect(await surumler(vt)).toHaveLength(1);
  });
});

describe("aynı türden birden çok bölüm (kart 0106)", () => {
  it("iki bölüm eklenir, sıralanır ve biri gizlenir; her işlem bir sürüm ve bir kayıttır", async () => {
    const vt = await siteAc();
    const [seckiler, yorumlar] = await anaSayfa(vt);
    const kim = yonetici();
    const ikinci = await servis.bolumEkle(vt, kim, "ana-sayfa", {
      tur: "deneme-bolumu",
      gorunum: "dar",
      degerler: { baslik: "Yeniler", maddeler: [{ metin: "Ücretsiz kargo" }] },
    });
    expect(await anaSayfa(vt)).toEqual([seckiler, yorumlar, ikinci]);
    // Başa ekleme.
    const ucuncu = await servis.bolumEkle(
      vt,
      kim,
      "ana-sayfa",
      { tur: "deneme-bolumu", degerler: { baslik: "İndirimler" } },
      0,
    );
    expect(await anaSayfa(vt)).toEqual([ucuncu, seckiler, yorumlar, ikinci]);
    await servis.bolumleriSirala(vt, kim, "ana-sayfa", [
      ikinci,
      seckiler,
      ucuncu,
      yorumlar,
    ] as string[]);
    expect(await anaSayfa(vt)).toEqual([ikinci, seckiler, ucuncu, yorumlar]);
    await servis.bolumGorunurlugu(vt, kim, seckiler as string, true);
    const { duzen } = await servis.duzenOku(vt);
    expect(duzen["ana-sayfa"].map((bolum) => [bolum.tur, bolum.gizli])).toEqual([
      ["deneme-bolumu", false],
      ["deneme-bolumu", true],
      ["deneme-bolumu", false],
      ["deneme-yorumlari", false],
    ]);
    // Gizli bölüm vitrinde yoktur, öteki aynı türden bölümler vardır.
    expect((await servis.cizilecekBolumler(vt, "ana-sayfa")).map((bolum) => bolum.kimlik)).toEqual([
      ikinci,
      ucuncu,
    ]);
    expect((await kayitlar(vt)).map((kayit) => kayit.islem)).toEqual([
      "duzen.baslangic",
      "duzen.bolum-eklendi",
      "duzen.bolum-eklendi",
      "duzen.bolumler-siralandi",
      "duzen.bolum-gizlendi",
    ]);
    const eklenme = (await kayitlar(vt))[1];
    expect(eklenme).toMatchObject({
      kim_kimligi: kim.tur === "yonetici" ? kim.kimlik : "",
      eski_deger: null,
      yeni_deger: {
        alan: "ana-sayfa",
        kimlik: ikinci,
        tur: "deneme-bolumu",
        gorunum: "dar",
        degerler: { baslik: "Yeniler", maddeler: [{ metin: "Ücretsiz kargo" }] },
      },
    });
    // Gösterilir; aynı görünürlük ikinci kez yazılmaz.
    await servis.bolumGorunurlugu(vt, kim, seckiler as string, false);
    await servis.bolumGorunurlugu(vt, kim, seckiler as string, false);
    expect(await surumler(vt)).toHaveLength(6);
  });

  it("değer ve görünüm değişir, silinir; aynı değer ikinci kez yazılmaz", async () => {
    const vt = await siteAc();
    const [seckiler] = (await anaSayfa(vt)) as [string];
    await servis.bolumDegistir(vt, yonetici(), seckiler, {
      gorunum: "dar",
      degerler: { baslik: "Haftanın seçkisi", zemin: "kutu-2" },
    });
    const [bolum] = (await servis.duzenOku(vt)).duzen["ana-sayfa"];
    expect(bolum).toMatchObject({
      gorunum: "dar",
      degerler: { baslik: "Haftanın seçkisi", zemin: "kutu-2", maddeler: [] },
    });
    await servis.bolumDegistir(vt, yonetici(), seckiler, {
      degerler: { baslik: "Haftanın seçkisi", zemin: "kutu-2" },
    });
    expect(await surumler(vt)).toHaveLength(2);
    await servis.bolumSil(vt, yonetici(), seckiler);
    expect(await anaSayfa(vt)).not.toContain(seckiler);
    const son = (await kayitlar(vt)).at(-1);
    expect(son).toMatchObject({
      islem: "duzen.bolum-silindi",
      eski_deger: { kimlik: seckiler, tur: "deneme-bolumu", sira: 0 },
      yeni_deger: null,
    });
  });
});

describe("şemaya uymayan değer kaydedilmez (kart 0106)", () => {
  const gecersizler: [string, Record<string, unknown>, string][] = [
    ["zorunlu alan boş", {}, "degerler.baslik"],
    ["uzun başlık", { baslik: "a".repeat(81) }, "degerler.baslik"],
    ["bilinmeyen alan", { baslik: "Seçkiler", fazla: 1 }, "degerler"],
    [
      "javascript bağlantısı",
      { baslik: "S", baglanti: { adres: "javascript:alert(1)" } },
      "degerler.baglanti.adres",
    ],
    [
      "http bağlantısı",
      { baslik: "S", baglanti: { adres: "http://ornek.test/" } },
      "degerler.baglanti.adres",
    ],
    [
      "iki eğik çizgili adres",
      { baslik: "S", baglanti: { adres: "//ornek.test/" } },
      "degerler.baglanti.adres",
    ],
    ["olmayan gün", { baslik: "S", bitis: "2026-02-30T10:00" }, "degerler.bitis"],
    ["saatsiz tarih", { baslik: "S", bitis: "2026-02-10" }, "degerler.bitis"],
    ["tarifte olmayan renk", { baslik: "S", zemin: "tehlike" }, "degerler.zemin"],
    [
      "fazla liste öğesi",
      { baslik: "S", maddeler: Array(4).fill({ metin: "Madde" }) },
      "degerler.maddeler",
    ],
    [
      "liste öğesinde boş zorunlu alan",
      { baslik: "S", maddeler: [{}] },
      "degerler.maddeler.0.metin",
    ],
    ["kayda yazılamayan metin", { baslik: "kisi@ornek.test" }, "degerler.baslik"],
    [
      "sınırı aşan ürün adedi",
      { baslik: "S", urunler: { tur: "yeni", adet: 9 } },
      "degerler.urunler.adet",
    ],
    [
      "aynı ürün iki kez",
      {
        baslik: "S",
        urunler: { tur: "elle", urunler: Array(2).fill("8d8f4bb1-7d6c-4f3a-9a52-0c5f3d1e2b7a") },
      },
      "degerler.urunler.urunler",
    ],
    ["bozuk kimlik", { baslik: "S", kategori: "kategori-1" }, "degerler.kategori"],
    // Bağımsız kontrolün bulguları: kaydın e-posta sandığı adres ve denetim karakteri.
    [
      "@ içeren adres",
      { baslik: "S", baglanti: { adres: "https://www.tiktok.com/@magaza" } },
      "degerler.baglanti.adres",
    ],
    [
      "denetim karakterli adres",
      { baslik: "S", baglanti: { adres: "/a\u0000b" } },
      "degerler.baglanti.adres",
    ],
    ["denetim karakterli metin", { baslik: "S\u0000" }, "degerler.baslik"],
    ["denetim karakterli uzun metin", { baslik: "S", aciklama: "a\u0007b" }, "degerler.aciklama"],
  ];
  it.each(gecersizler)("%s eklenmez ve değişmez", async (_, degerler, alan) => {
    const vt = await siteAc();
    const [seckiler] = (await anaSayfa(vt)) as [string];
    const ekleme = await hatasi(
      servis.bolumEkle(vt, yonetici(), "ana-sayfa", { tur: "deneme-bolumu", degerler }),
    );
    expect(ekleme.kod).toBe("dogrulama");
    expect(ekleme.ayrinti.map((sorun) => sorun.alan)).toContain(alan);
    const degisiklik = await hatasi(servis.bolumDegistir(vt, yonetici(), seckiler, { degerler }));
    expect(degisiklik.ayrinti.map((sorun) => sorun.alan)).toContain(alan);
    expect(await surumler(vt)).toHaveLength(1);
  });

  it("tanımsız tür, uygun olmayan alan ve tanımsız görünüm eklenmez", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const durumlar: [Parameters<typeof servis.bolumEkle>[2], string, string][] = [
      ["ana-sayfa", "olmayan", "bolum-tanimsiz"],
      ["ust-kisim", "deneme-bolumu", "bolum-alani-uygun-degil"],
    ];
    for (const [alan, tur, kod] of durumlar) {
      const { ayrinti } = await hatasi(
        servis.bolumEkle(vt, yonetici(), alan, { tur, degerler: { baslik: "S" } }),
      );
      expect(ayrinti.map((sorun) => sorun.kod)).toContain(kod);
    }
    const { ayrinti } = await hatasi(
      servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
        tur: "deneme-bolumu",
        gorunum: "capraz",
        degerler: { baslik: "S" },
      }),
    );
    expect(ayrinti).toContainEqual({ alan: "gorunum", kod: "gorunum-tanimsiz" });
    expect(await surumler(vt)).toHaveLength(1);
  });

  it("olmayan, silinmiş ya da başka sitenin kaydına başvuran değer kaydedilmez, var olan kaydedilir", async () => {
    const vt = await siteAc();
    const baskaSite = await siteAc();
    await servis.duzenOku(vt);
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    const silinen = await kategoriEkle(vt, yonetici(), { ad: "Eski" });
    await kategoriSil(vt, yonetici(), silinen);
    const baskasininKategorisi = await kategoriEkle(baskaSite, yonetici(), { ad: "Başka" });
    const marka = await markaServisi.ekle(vt, yonetici(), { ad: "Marka" });
    const urun = await urunler.urunEkle(vt, yonetici(), { ad: "Kupa", vergiSinifi: null });
    const gorsel = await gorselAc(vt);
    const silinenGorsel = await gorselAc(vt);
    await dosyaSil(vt, silinenGorsel);
    for (const [degerler, kod] of [
      [{ kategori: randomUUID() }, "kayit-yok"],
      [{ kategori: silinen }, "kayit-yok"],
      [{ kategori: baskasininKategorisi }, "kayit-yok"],
      [{ urunler: { tur: "kategori", kategori: silinen, adet: 4 } }, "kayit-yok"],
      [{ urunler: { tur: "elle", urunler: [urun, randomUUID()] } }, "kayit-yok"],
      [{ gorsel: randomUUID() }, "gorsel-gecersiz"],
      [{ gorsel: silinenGorsel }, "gorsel-gecersiz"],
    ] as const) {
      const { ayrinti } = await hatasi(
        servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
          tur: "deneme-bolumu",
          degerler: { baslik: "S", ...degerler },
        }),
      );
      expect(
        ayrinti.map((sorun) => sorun.kod),
        JSON.stringify(degerler),
      ).toEqual([kod]);
    }
    expect(await surumler(vt)).toHaveLength(1);
    const kimlik = await servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: {
        baslik: "S",
        kategori,
        marka,
        gorsel,
        urunler: { tur: "elle", urunler: [urun] },
        baglanti: { adres: "/kategori/giyim" },
      },
    });
    const eklenen = (await servis.duzenOku(vt)).duzen["ana-sayfa"].find(
      (bolum) => bolum.kimlik === kimlik,
    );
    expect(eklenen?.degerler).toMatchObject({
      kategori,
      marka,
      gorsel,
      baglanti: { adres: "/kategori/giyim", yeniSekme: false },
    });
  });

  it("hata başvuran alanın yoluyla döner", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const urun = await urunler.urunEkle(vt, yonetici(), { ad: "Kupa", vergiSinifi: null });
    const { ayrinti } = await hatasi(
      servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
        tur: "deneme-bolumu",
        degerler: {
          baslik: "S",
          kategori: randomUUID(),
          urunler: { tur: "elle", urunler: [urun, randomUUID()] },
        },
      }),
    );
    expect(ayrinti).toEqual([
      { alan: "degerler.kategori", kod: "kayit-yok" },
      { alan: "degerler.urunler.urunler.1", kod: "kayit-yok" },
    ]);
  });

  it("aynı anda silinen kategoriye bağlanılmaz: silme bitene kadar beklenir, sonra reddedilir", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    // Silme açık duran bir işlemde: satırı kilitli, henüz kaydedilmedi.
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
      servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
        tur: "deneme-bolumu",
        degerler: { baslik: "S", kategori },
      }),
    );
    await kilitBekleyeniGor(vt);
    birak();
    await silme;
    expect((await ekleme).ayrinti).toEqual([{ alan: "degerler.kategori", kod: "kayit-yok" }]);
    expect(await surumler(vt)).toHaveLength(1);
  });

  it("sonradan silinen kayda başvuran bölüm alanı düzeltilmeden değişmez, gizlenip silinebilir", async () => {
    const vt = await siteAc();
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    const kimlik = await servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "S", kategori },
    });
    await kategoriSil(vt, yonetici(), kategori);
    expect(
      (await hatasi(servis.bolumDegistir(vt, yonetici(), kimlik, { gorunum: "dar" }))).ayrinti,
    ).toEqual([{ alan: "degerler.kategori", kod: "kayit-yok" }]);
    // Alan boşaltılınca değişiklik kaydedilir; gizleme ve silme değerlere bakmaz.
    await servis.bolumGorunurlugu(vt, yonetici(), kimlik, true);
    await servis.bolumDegistir(vt, yonetici(), kimlik, {
      gorunum: "dar",
      degerler: { baslik: "S" },
    });
    await servis.bolumSil(vt, yonetici(), kimlik);
    expect(await anaSayfa(vt)).not.toContain(kimlik);
  });

  it("olmayan bölüm ve bozuk kimlik bulunamadı; eksik ya da fazla sıralama reddedilir", async () => {
    const vt = await siteAc();
    const [seckiler, yorumlar] = (await anaSayfa(vt)) as [string, string];
    for (const kimlik of [randomUUID(), "bozuk"]) {
      expect((await hatasi(servis.bolumSil(vt, yonetici(), kimlik))).kod).toBe("bulunamadi");
      expect((await hatasi(servis.bolumGorunurlugu(vt, yonetici(), kimlik, true))).kod).toBe(
        "bulunamadi",
      );
    }
    for (const sira of [[seckiler], [seckiler, yorumlar, randomUUID()], [seckiler, seckiler]]) {
      const { ayrinti } = await hatasi(servis.bolumleriSirala(vt, yonetici(), "ana-sayfa", sira));
      expect(ayrinti).toEqual([{ alan: "kimlikler", kod: "siralama-gecersiz" }]);
    }
    expect(await surumler(vt)).toHaveLength(1);
  });
});

describe("işleve bağlı bölüm (kart 0106)", () => {
  it("işlev yokken düzende durur ama çizilmez, panel nedenini görür; işlev açılınca çizilir", async () => {
    const vt = await siteAc();
    const [, yorumlar] = (await anaSayfa(vt)) as [string, string];
    expect((await servis.cizilecekBolumler(vt, "ana-sayfa")).map((bolum) => bolum.tur)).toEqual([
      "deneme-bolumu",
    ]);
    const panel = await servis.panelDuzeni(vt);
    expect(panel["ana-sayfa"].find((satir) => satir.bolum.kimlik === yorumlar)).toMatchObject({
      cizilir: false,
      neden: { tur: "islev-yok", islev: "yorum" },
    });
    // İşlevi olmayan bölüm yine de eklenebilir.
    await servis.bolumEkle(vt, yonetici(), "ana-sayfa", { tur: "deneme-yorumlari", degerler: {} });
    islevler = { ...islevler, yorum: true };
    expect((await servis.cizilecekBolumler(vt, "ana-sayfa")).map((bolum) => bolum.tur)).toEqual([
      "deneme-bolumu",
      "deneme-yorumlari",
      "deneme-yorumlari",
    ]);
    expect((await servis.panelDuzeni(vt))["ana-sayfa"].every((satir) => satir.cizilir)).toBe(true);
  });

  it("türü kütüphaneden çıkan bölüm vitrini düşürmez: çizilmez, hata süreç başına bir kez kaydedilir", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const { "deneme-yorumlari": _, ...kalan } = denemeKutuphanesi;
    const daralmis = duzenServisi(
      () => site,
      () => kalan,
      () => islevler,
    );
    expect((await daralmis.cizilecekBolumler(vt, "ana-sayfa")).map((bolum) => bolum.tur)).toEqual([
      "deneme-bolumu",
    ]);
    await daralmis.cizilecekBolumler(vt, "ana-sayfa");
    expect(
      izlenenler.filter((olay) => (olay.baglam as { kaynak?: string }).kaynak === "duzen"),
    ).toHaveLength(1);
    expect((await daralmis.panelDuzeni(vt))["ana-sayfa"][1]).toMatchObject({
      cizilir: false,
      neden: { tur: "tanimsiz" },
    });
  });
});

describe("aynı anda gelen işlemler", () => {
  it("aynı anda altı ekleme sırayla yazılır, hiçbiri ötekini ezmez", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const eklenenler = await Promise.all(
      Array.from({ length: 6 }, (_, sira) =>
        servis.bolumEkle(vt, yonetici(), "ust-kisim", {
          tur: "deneme-seridi",
          degerler: { metin: `Duyuru ${sira}` },
        }),
      ),
    );
    const { duzen, sira } = await servis.duzenOku(vt);
    expect(sira).toBe(7);
    expect(duzen["ust-kisim"].map((bolum) => bolum.kimlik)).toEqual(
      expect.arrayContaining(eklenenler),
    );
    expect(duzen["ust-kisim"]).toHaveLength(7);
  });
});

describe("alanın sınırı", () => {
  it("bir alanda en çok 50 bölüm olur, fazlası alan-dolu ile reddedilir", async () => {
    const vt = await siteAc();
    // Başlangıç düzeninde üst kısımda bir bölüm var.
    for (let sira = 1; sira < 50; sira += 1) {
      await servis.bolumEkle(vt, yonetici(), "ust-kisim", {
        tur: "deneme-seridi",
        degerler: { metin: `Duyuru ${sira}` },
      });
    }
    expect((await servis.duzenOku(vt)).duzen["ust-kisim"]).toHaveLength(50);
    expect(
      await hatasi(
        servis.bolumEkle(vt, yonetici(), "ust-kisim", {
          tur: "deneme-seridi",
          degerler: { metin: "Fazla" },
        }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "alan", kod: "alan-dolu" }] });
  });
});

describe("sürümler değiştirilemez", () => {
  it("güncelleme, silme ve boşaltma veritabanında reddedilir", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    await expect(vt.execute(sql`update duzen_surumleri set duzen = '{}'`)).rejects.toThrow();
    await expect(vt.execute(sql`delete from duzen_surumleri`)).rejects.toThrow();
    await expect(vt.execute(sql`truncate duzen_surumleri`)).rejects.toThrow();
    expect(await surumler(vt)).toHaveLength(1);
  });
});
