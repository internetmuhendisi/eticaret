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
import { bolumKutuphanesi } from "../../../vitrin/bolum-kutuphanesi/kutuphane.ts";
import type { BolumTarifi } from "../../../vitrin/bolum-kutuphanesi/tarif.ts";
import {
  cizilmemeNedeniMetni,
  islevYokMetinleri,
} from "../../../yonetim-paneli/cizilmeme-nedeni.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyaSil, gorselKaydet } from "../../dosya/servis.ts";
import { kategoriler } from "../../kategori/model.ts";
import { kategoriDegistir, kategoriEkle, kategoriSil } from "../../kategori/servis.ts";
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
// Deneme kütüphanesinin yorum bölümü işlevi yazılmamış bölümü örnekler: yorum işlevi kart 0139'da yazıldı, testler
// onu kapalı sayar (gerçek işlev listesi aşağıda ayrıca ölçülür).
// Yazılmış işlevler (yorum kart 0139, blog kart 0272) testte kapalı başlar: işleve bağlı bölümün kuralı denenir.
const testinIslevleri = (): Record<Islev, boolean> => ({
  ...yazilanIslevler,
  yorum: false,
  blog: false,
});
let islevler: Record<Islev, boolean> = testinIslevleri();
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
  islevler = testinIslevleri();
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

  // Kart 0119: büyük harfle verilen kayıt ve görsel kimliği bulunur, düzene küçük harfle yazılır.
  it("büyük harfle verilen kayıt ve görsel başvurusu kaydedilir, küçük harfle yazılır", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    const marka = await markaServisi.ekle(vt, yonetici(), { ad: "Marka" });
    const urun = await urunler.urunEkle(vt, yonetici(), { ad: "Kupa", vergiSinifi: null });
    const gorsel = await gorselAc(vt);
    const kimlik = await servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: {
        baslik: "S",
        kategori: kategori.toUpperCase(),
        marka: marka.toUpperCase(),
        gorsel: gorsel.toUpperCase(),
        urunler: { tur: "elle", urunler: [urun.toUpperCase()] },
      },
    });
    const eklenen = (await servis.duzenOku(vt)).duzen["ana-sayfa"].find(
      (bolum) => bolum.kimlik === kimlik,
    );
    expect(eklenen?.degerler).toMatchObject({
      kategori,
      marka,
      gorsel,
      urunler: { tur: "elle", urunler: [urun] },
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

// Kart 0119: büyük harfle yazılmış bölüm kimliği aynı bölümdür.
describe("büyük harfli kimlik", () => {
  it("büyük harfle verilen sıralama yapılır, büyük harfle tekrarlanan bölüm reddedilir", async () => {
    const vt = await siteAc();
    const [seckiler, yorumlar] = (await anaSayfa(vt)) as [string, string];
    const { ayrinti } = await hatasi(
      servis.bolumleriSirala(vt, yonetici(), "ana-sayfa", [seckiler, seckiler.toUpperCase()]),
    );
    expect(ayrinti).toEqual([{ alan: "kimlikler", kod: "siralama-gecersiz" }]);
    await servis.bolumleriSirala(vt, yonetici(), "ana-sayfa", [
      yorumlar.toUpperCase(),
      seckiler.toUpperCase(),
    ]);
    expect(await anaSayfa(vt)).toEqual([yorumlar, seckiler]);
  });

  it("büyük harfle verilen bölüm bulunur, gizlenir ve silinir", async () => {
    const vt = await siteAc();
    const [seckiler] = (await anaSayfa(vt)) as [string];
    await servis.bolumGorunurlugu(vt, yonetici(), seckiler.toUpperCase(), false);
    await servis.bolumSil(vt, yonetici(), seckiler.toUpperCase());
    expect(await anaSayfa(vt)).not.toContain(seckiler);
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

  // Kart 0112: gerçek kütüphanenin işleve bağlı üç bölümü. Yorum kart 0139'da yazıldı, blog ve bülten yazılmadı;
  // test üçünü de kapalı sayarak başlar.
  it("yorumlar, blog ve bülten işlevleri yokken çizilmez, panel nedenini işleve göre yazar; açılınca çizilir", async () => {
    const vt = await siteAc();
    // Başlangıç düzeni boş: deneme bölümleri gerçek kütüphanede yoktur.
    const bosSite: Site = {
      ...ornekSite,
      duzenBaslangici: { "ust-kisim": [], "ana-sayfa": [], "alt-kisim": [] },
    };
    const gercek = duzenServisi(
      () => bosSite,
      () => bolumKutuphanesi,
      () => islevler,
    );
    const bolumler = [
      { tur: "musteri-yorumlari", degerler: { baslik: "Yorumlar" }, islev: "yorum" },
      { tur: "blog-yazilari", degerler: { kategori: "tarifler" }, islev: "blog" },
      { tur: "bulten-kaydi", degerler: { baslik: "Bülten" }, islev: "bulten" },
    ] as const;
    for (const { tur, degerler } of bolumler) {
      await gercek.bolumEkle(vt, yonetici(), "ana-sayfa", { tur, degerler });
    }
    const cizilenler = async () =>
      (await gercek.cizilecekBolumler(vt, "ana-sayfa"))
        .map((bolum) => bolum.tur)
        .filter((tur) => bolumler.some((bolum) => bolum.tur === tur));
    // Yorum (kart 0139) ve blog (kart 0272) yazıldı; test işlevleri kendisi verir.
    expect([yazilanIslevler.yorum, yazilanIslevler.blog, yazilanIslevler.bulten]).toEqual([
      true,
      true,
      false,
    ]);
    expect(await cizilenler()).toEqual([]);
    const panel = (await gercek.panelDuzeni(vt))["ana-sayfa"];
    for (const { tur, islev } of bolumler) {
      const satir = panel.find((oge) => oge.bolum.tur === tur);
      expect(satir).toMatchObject({ cizilir: false, neden: { tur: "islev-yok", islev } });
      if (satir?.neden === undefined) throw new Error("Neden yok.");
      expect(cizilmemeNedeniMetni(satir.neden)).toBe(islevYokMetinleri[islev]);
    }
    // Her işlev yalnız kendi bölümünü açar.
    islevler = { ...islevler, blog: true };
    expect(await cizilenler()).toEqual(["blog-yazilari"]);
    islevler = { ...islevler, yorum: true, bulten: true };
    expect(await cizilenler()).toEqual(["musteri-yorumlari", "blog-yazilari", "bulten-kaydi"]);
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

// Kart 0122, karar 0113: eski bir çekirdeğin yazdığı düzen. Kaldırılan görünüm ve alan bugünkü karşılığıyla okunur,
// bölüm vitrinde çizilir, hata kaydı düşmez; düzen bir sonraki kaydedilişinde yeni kodla yazılır.
describe("eski çekirdeğin yazdığı düzen", () => {
  const telif = randomUUID();
  const duyuru = randomUUID();
  // 0.39.0'ın kütüphanesiyle yazılmış düzen: telif satırı "ortali", duyuru şeridi "ince" görünümünde.
  const eskiDuzen = {
    "ust-kisim": [
      {
        kimlik: duyuru,
        tur: "duyuru-seridi",
        gorunum: "ince",
        gizli: false,
        degerler: { metin: "Duyuru" },
      },
    ],
    "ana-sayfa": [],
    "alt-kisim": [
      { kimlik: telif, tur: "telif-satiri", gorunum: "ortali", gizli: false, degerler: {} },
    ],
  };
  const magazaninServisi = duzenServisi(
    () => site,
    () => bolumKutuphanesi,
    () => islevler,
  );
  const duzendeHata = () =>
    izlenenler.filter((olay) => (olay.baglam as { kaynak?: string }).kaynak === "duzen");

  it("0.40.0'da kaldırılan görünümler bugünkü karşılığıyla okunur, çizilir ve hata kaydı düşmez", async () => {
    const vt = await siteAc();
    await vt.insert(duzenSurumleri).values({ sira: 1, duzen: eskiDuzen });
    const { duzen } = await magazaninServisi.duzenOku(vt);
    expect(duzen["alt-kisim"][0]).toMatchObject({ kimlik: telif, gorunum: "duz" });
    expect(duzen["ust-kisim"][0]).toMatchObject({ kimlik: duyuru, gorunum: "ortali" });
    expect(
      (await magazaninServisi.cizilecekBolumler(vt, "alt-kisim")).map((b) => b.kimlik),
    ).toEqual([telif]);
    expect(
      (await magazaninServisi.cizilecekBolumler(vt, "ust-kisim")).map((b) => b.kimlik),
    ).toEqual([duyuru]);
    expect((await magazaninServisi.panelDuzeni(vt))["alt-kisim"][0]).toMatchObject({
      cizilir: true,
    });
    expect(duzendeHata()).toEqual([]);
    // Eski sürüm de çevrilerek okunur (tema geri dönüşü önceki düzeni buradan alır).
    const ilk = await vt.transaction((islem) => magazaninServisi.islemdeSurumOku(islem, 1));
    expect(ilk?.duzen["alt-kisim"][0]?.gorunum).toBe("duz");
  });

  it("düzen bir sonraki kaydedilişinde yeni kodla yazılır, eski sürüm olduğu gibi kalır", async () => {
    const vt = await siteAc();
    await vt.insert(duzenSurumleri).values({ sira: 1, duzen: eskiDuzen });
    await magazaninServisi.bolumGorunurlugu(vt, yonetici(), duyuru, true);
    const [eski, yeni] = await surumler(vt);
    expect(eski?.duzen).toEqual(eskiDuzen);
    expect(yeni?.duzen).toMatchObject({
      "ust-kisim": [{ kimlik: duyuru, gorunum: "ortali", gizli: true }],
      "alt-kisim": [{ kimlik: telif, gorunum: "duz" }],
    });
  });

  it("eşlemesi olmayan kütüphanede aynı düzenin bölümleri çizilmez, hata kaydedilir (eski davranış)", async () => {
    const vt = await siteAc();
    await vt.insert(duzenSurumleri).values({ sira: 1, duzen: eskiDuzen });
    const { eskiKodlar: _telif, ...telifSatiri } = bolumKutuphanesi["telif-satiri"] as BolumTarifi;
    const eslemesiz = duzenServisi(
      () => site,
      () => ({ ...bolumKutuphanesi, "telif-satiri": telifSatiri }),
      () => islevler,
    );
    expect(await eslemesiz.cizilecekBolumler(vt, "alt-kisim")).toEqual([]);
    expect(duzendeHata().map((olay) => JSON.stringify(olay))).toEqual([
      expect.stringContaining(`Düzendeki bölüm çizilemiyor (gecersiz): telif-satiri ${telif}`),
    ]);
  });

  it("kaldırılan ya da adı değişen alanın değeri bugünkü alana taşınır, kaldırılan alanınki atılır", async () => {
    const vt = await siteAc();
    const kimlik = randomUUID();
    await vt.insert(duzenSurumleri).values({
      sira: 1,
      duzen: {
        "ust-kisim": [],
        "ana-sayfa": [
          {
            kimlik,
            tur: "deneme-bolumu",
            gorunum: "eski",
            gizli: false,
            degerler: { eskiBaslik: "Seçkiler", kaldirilan: "atılır", sure: "orta" },
          },
        ],
        "alt-kisim": [],
      },
    });
    const eskiKodlu = duzenServisi(
      () => site,
      () => ({
        ...denemeKutuphanesi,
        "deneme-bolumu": {
          ...denemeKutuphanesi["deneme-bolumu"],
          eskiKodlar: {
            gorunumler: { eski: "dar" },
            alanlar: { eskiBaslik: "baslik", kaldirilan: null },
            secenekler: { sure: { orta: "kisa" } },
          },
        } as BolumTarifi,
      }),
      () => islevler,
    );
    const [bolum] = await eskiKodlu.cizilecekBolumler(vt, "ana-sayfa");
    expect(bolum).toMatchObject({
      kimlik,
      gorunum: "dar",
      degerler: { baslik: "Seçkiler", sure: "kisa" },
    });
    expect(bolum?.degerler).not.toHaveProperty("kaldirilan");
    expect(duzendeHata()).toEqual([]);
  });
});

describe("aynı anda gelen işlemler", () => {
  // Kart 0125: iki kategoriye başvuran bölüm eklemesi ile o kategorilerin üstünü silen işlem aynı anda. Sıra kurulur:
  // silme üstü günceller, ilk güncellediği alt kategoride (A) tutulur; ekleme öteki alt kategoriyi (B) kilitleyip
  // A'yı bekler; A bırakılınca silme B'yi günceller. Bölüm satırları kimlik sırasıyla kilitler, silme altları sıra
  // numarasıyla günceller: B'nin kimliği küçük, sırası büyük seçilir ki iki sıra her çalışmada ters düşsün.
  it("iki kategoriye başvuran bölüm eklemesi ile üst kategoriyi silme birlikte kilitlenmez", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const ust = await kategoriEkle(vt, yonetici(), { ad: "Üst" });
    const x = await kategoriEkle(vt, yonetici(), { ad: "X", ust });
    const y = await kategoriEkle(vt, yonetici(), { ad: "Y", ust });
    const [a, b] = x > y ? [x, y] : [y, x];
    await kategoriDegistir(vt, yonetici(), a, { sira: 0 });
    await kategoriDegistir(vt, yonetici(), b, { sira: 1 });
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let tuttu: () => void = () => undefined;
    const tutuldu = new Promise<void>((coz) => {
      tuttu = coz;
    });
    const tutan = vt.transaction(async (islem) => {
      await islem.select().from(kategoriler).where(eq(kategoriler.kimlik, a)).for("update");
      tuttu();
      await tut;
    });
    await tutuldu;
    const silme = kategoriSil(vt, yonetici(), ust);
    await kilitBekleyeniGor(vt, 1);
    const ekleme = servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "S", kategori: a, urunler: { tur: "kategori", kategori: b, adet: 4 } },
    });
    await kilitBekleyeniGor(vt, 2);
    birak();
    await tutan;
    const sonuclar = await Promise.allSettled([silme, ekleme]);
    const hatalar = sonuclar.flatMap((sonuc) =>
      sonuc.status === "rejected" ? [String((sonuc.reason as Error).cause ?? sonuc.reason)] : [],
    );
    expect(hatalar.filter((hata) => hata.includes("deadlock"))).toEqual([]);
    // Ekleme silmenin bitmesini bekler; A ve B silinmedi, en üste çıktı: bölüm ikisine de bağlanır.
    expect(hatalar).toEqual([]);
    const eklenen = (await servis.duzenOku(vt)).duzen["ana-sayfa"].find(
      (bolum) => bolum.kimlik === (sonuclar[1] as PromiseFulfilledResult<string>).value,
    );
    expect(eklenen?.degerler).toMatchObject({ kategori: a, urunler: { kategori: b } });
  });

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

// Kart 0142 (karar 0080): düzenin önceki hâline tek adımda dönülür. Dönüş yeni bir sürümdür; art arda dönüş son
// iki hâl arasında gidip gelir.
describe("önceki hâline dönüş (kart 0142)", () => {
  it("son değişiklik geri alınır, yeni sürüm ve kayıt yazılır; ikinci dönüş değişikliği geri getirir", async () => {
    const vt = await siteAc();
    const ilk = await servis.duzenOku(vt);
    const kimlik = await servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "Yeni" },
    });
    const eklenmis = await servis.duzenOku(vt);
    expect(await servis.oncekiHaleDon(vt, yonetici(), 2)).toBe(3);
    const donulen = await servis.panelDuzenDurumu(vt);
    expect(donulen.sira).toBe(3);
    expect((await servis.duzenOku(vt)).duzen).toEqual(ilk.duzen);
    expect(donulen.alanlar["ana-sayfa"].map((satir) => satir.bolum.kimlik)).not.toContain(kimlik);
    const kayit = (await kayitlar(vt)).at(-1);
    expect(kayit).toMatchObject({
      islem: "duzen.onceki-hale-donuldu",
      kim_turu: "yonetici",
      eski_deger: { sira: 2 },
      yeni_deger: { geriDonulenSira: 1 },
    });
    expect(await servis.oncekiHaleDon(vt, yonetici(), 3)).toBe(4);
    expect((await servis.duzenOku(vt)).duzen).toEqual(eklenmis.duzen);
    expect(await surumler(vt)).toHaveLength(4);
  });

  it("yalnız başlangıç düzeni varken dönülmez, hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    expect(await hatasi(servis.oncekiHaleDon(vt, yonetici(), 1))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "sira", kod: "onceki-surum-yok" }],
    });
    expect(await surumler(vt)).toHaveLength(1);
    expect(await kayitlar(vt)).toHaveLength(1);
  });

  // Bağımsız kontrolün bulgusu: dönüş her zaman son sürüme göreydi. Silmenin "Geri al"ı arada yazılan başka bir
  // değişikliği, düğmeye ikinci basış da ilk dönüşü geri alıyordu. Çağıran gördüğü son sürümü verir; arada başka
  // sürüm yazıldıysa hiçbir şey yazılmaz.
  it("çağıranın gördüğü sürüm son değilse dönülmez: arada yazılan değişiklik ve ikinci basış", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const silinen = await servis.bolumEkle(vt, yonetici(), "ust-kisim", {
      tur: "deneme-seridi",
      degerler: { metin: "Silinecek" },
    });
    const silmeSirasi = await servis.bolumSil(vt, yonetici(), silinen);
    expect(silmeSirasi).toBe(3);
    // Arada başka bir değişiklik: silmenin "Geri al"ı onu geri almaz.
    await servis.bolumEkle(vt, yonetici(), "ust-kisim", {
      tur: "deneme-seridi",
      degerler: { metin: "Sonra eklenen" },
    });
    expect(await hatasi(servis.oncekiHaleDon(vt, yonetici(), silmeSirasi))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "son", kod: "duzen-degisti" }],
    });
    expect(await surumler(vt)).toHaveLength(4);
    // Aynı sürümü görerek iki kez basılır: ilki döner, ikincisi hiçbir şey yazmaz.
    const ikiBasis = await Promise.allSettled([
      servis.oncekiHaleDon(vt, yonetici(), 4),
      servis.oncekiHaleDon(vt, yonetici(), 4),
    ]);
    expect(ikiBasis.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    expect(await surumler(vt)).toHaveLength(5);
    const ust = (await servis.duzenOku(vt)).duzen["ust-kisim"].map(
      (bolum) => bolum.degerler["metin"],
    );
    expect(ust).not.toContain("Sonra eklenen");
    expect(ust).not.toContain("Silinecek");
  });

  // Bağımsız kontrolün bulgusu: tema değişikliğinin yazdığı düzen sürümü düzen ekranından geri alınsaydı yeni
  // temaya eski temanın düzeni konurdu (tema ve düzen yalnız tema servisi üzerinden birlikte değişir, karar 0091).
  it("son değişiklik tema değişikliğinden geldiyse dönülmez", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    await servis.bolumEkle(vt, yonetici(), "ust-kisim", {
      tur: "deneme-seridi",
      degerler: { metin: "Birinci" },
    });
    for (const islemAdi of ["duzen.tema-degisti", "duzen.geri-donuldu"] as const) {
      const sira = await vt.transaction(async (islem) => {
        const son = await servis.islemdekiDuzen(islem);
        const duzen = structuredClone(son.duzen);
        duzen["ust-kisim"].reverse();
        duzen["ust-kisim"].push({
          kimlik: randomUUID(),
          tur: "deneme-seridi",
          gorunum: "duz",
          gizli: false,
          degerler: { metin: islemAdi },
        });
        return (
          await servis.islemdeDuzenYaz(islem, yonetici(), son, duzen, {
            islem: islemAdi,
            eski: {},
            yeni: {},
          })
        ).sira;
      });
      expect(await hatasi(servis.oncekiHaleDon(vt, yonetici(), sira)), islemAdi).toEqual({
        kod: "is-kurali",
        ayrinti: [{ alan: "sira", kod: "tema-degisikligi" }],
      });
    }
    expect(await surumler(vt)).toHaveLength(4);
    // Tema değişikliğinden sonra yapılan bölüm değişikliği yine geri alınır: yalnız son sürümün kaydına bakılır.
    await servis.bolumEkle(vt, yonetici(), "ust-kisim", {
      tur: "deneme-seridi",
      degerler: { metin: "Sonraki" },
    });
    expect(await servis.oncekiHaleDon(vt, yonetici(), 5)).toBe(6);
  });

  it("önceki hâlin başvurduğu kayıt sonradan silindiyse dönülmez, hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim" });
    const gorsel = await gorselAc(vt);
    const bolum = await servis.bolumEkle(vt, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "S", kategori, gorsel },
    });
    const sira = await servis.bolumSil(vt, yonetici(), bolum);
    await kategoriSil(vt, yonetici(), kategori);
    expect(await hatasi(servis.oncekiHaleDon(vt, yonetici(), sira))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "sira", kod: "surum-kullanilamaz" }],
    });
    expect(await surumler(vt)).toHaveLength(3);
    // Görsel silinince de dönülmez (kategori yerine yalnız görsele başvuran bölümle).
    const vt2 = await siteAc();
    await servis.duzenOku(vt2);
    const gorsel2 = await gorselAc(vt2);
    const bolum2 = await servis.bolumEkle(vt2, yonetici(), "ana-sayfa", {
      tur: "deneme-bolumu",
      degerler: { baslik: "S", gorsel: gorsel2 },
    });
    const sira2 = await servis.bolumSil(vt2, yonetici(), bolum2);
    await dosyaSil(vt2, gorsel2);
    expect((await hatasi(servis.oncekiHaleDon(vt2, yonetici(), sira2))).ayrinti).toEqual([
      { alan: "sira", kod: "surum-kullanilamaz" },
    ]);
  });

  // Hedef kilit alındıktan sonra okunur. Dönüş kilidi beklerken yazılan değişiklik, çağıranın gördüğü sürümü
  // eskitir: dönüş hiçbir şey yazmaz (hedef kilitten önce okunsaydı aradaki değişiklik sessizce silinirdi).
  it("kilidi beklerken yazılan değişiklikten sonra dönülmez, aradaki değişiklik korunur", async () => {
    const vt = await siteAc();
    await servis.duzenOku(vt);
    const birinci = await servis.bolumEkle(vt, yonetici(), "ust-kisim", {
      tur: "deneme-seridi",
      degerler: { metin: "Birinci" },
    });
    let birak: () => void = () => undefined;
    const tut = new Promise<void>((coz) => {
      birak = coz;
    });
    let tuttu: () => void = () => undefined;
    const tutuldu = new Promise<void>((coz) => {
      tuttu = coz;
    });
    let ikinci = "";
    const tutan = vt.transaction(async (islem) => {
      const son = await servis.islemdekiDuzen(islem);
      tuttu();
      await tut;
      const duzen = structuredClone(son.duzen);
      ikinci = randomUUID();
      duzen["ust-kisim"].push({
        kimlik: ikinci,
        tur: "deneme-seridi",
        gorunum: "duz",
        gizli: false,
        degerler: { metin: "İkinci" },
      });
      await servis.islemdeDuzenYaz(islem, yonetici(), son, duzen, {
        islem: "duzen.bolum-eklendi",
        eski: {},
        yeni: {},
      });
    });
    await tutuldu;
    const donus = servis.oncekiHaleDon(vt, yonetici(), 2);
    await kilitBekleyeniGor(vt, 1);
    birak();
    await tutan;
    expect((await hatasi(donus)).kod).toBe("cakisma");
    const ust = (await servis.duzenOku(vt)).duzen["ust-kisim"].map((bolum) => bolum.kimlik);
    expect(ust).toContain(birinci);
    expect(ust).toContain(ikinci);
  });
});
