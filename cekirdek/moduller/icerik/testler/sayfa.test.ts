// Sabit sayfa servisi gerçek veritabanıyla (kart 0273):
// - Ekleme: yalnız başlıkla taslak; adres adı başlıktan üretilir (sayı alır), verilen aynı adres reddedilir, silinen
//   sayfanın adresi serbest kalır; aynı anda üç eklemede adres tekrarlanmaz; sayfa sınırı.
// - Değişiklik: yalnız verilen alan değişir, açıklama null ile boşalır; ekranın gördüğü değişme anı eskiyse hiçbir şey
//   yazılmaz; aynı değer kayda girmez; değişiklik kaydına başlık, adres ve durum girer, içerik ve açıklama girmez.
// - Vitrin ve adres: yalnız yayındaki sayfa açılır (taslak ve silinmiş bulunamaz); adı değişince eski adres yenisine
//   yönlenir, silinen sayfanın adresi yönlenmez; vitrin sayfasının verisi.
// - İçerik araması: Türkçe harfsiz, büyük harfle ve ortadan; silinmiş yok, taslak var; % ve _ joker değil; blog yazısı.
// - Başlangıç sayfaları: bir kez yazılır, ikinci çağrı ve aynı anda iki çağrı yazmaz; kaydı "baslangic-sayfa".
// - Veritabanının durum denetimi kayıtla aynı; iki site birbirinin sayfasını görmez; içeriğin düz yazısı.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { sabitSayfaDurumlari, sabitSayfaSinirlari } from "../../../kayitlar/sayfa.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { kayitAdresiniCoz } from "../../gorunurluk/adres.ts";
import { bicimliMetninDuzYazisi } from "../../urun/aciklama.ts";
import { icerikAra } from "../arama.ts";
import { sabitSayfalar } from "../model.ts";
import {
  sabitSayfalariOku,
  sabitSayfaOku,
  sabitSayfaServisi,
  vitrinSabitSayfasi,
} from "../sayfa.ts";
import { sayfaBaslangiciniKur } from "../sayfa-kurulumu.ts";
import { icerikServisi } from "../servis.ts";

const { sayfaEkle, sayfaDegistir, sayfaSil } = sabitSayfaServisi;
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const acilan = await denemeSitesiAc("sayfa");
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

const kayitlar = async (vt: Veritabani, kimlik: string) =>
  (
    await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
      .orderBy(degisiklikKayitlari.zaman)
  ).map((satir) => [satir.islem, satir.eski_deger, satir.yeni_deger]);

describe("ekleme ve değişiklik", () => {
  it("yalnız başlıkla taslak eklenir; adres başlıktan üretilir, tekrarı reddedilir, silinenin adresi serbest kalır", async () => {
    const vt = await siteAc();
    const { kimlik } = await sayfaEkle(vt, yonetici(), { baslik: "Hakkımızda" });
    expect(await sabitSayfaOku(vt, kimlik)).toMatchObject({
      baslik: "Hakkımızda",
      adresAdi: "hakkimizda",
      icerik: "",
      aciklama: null,
      durum: "taslak",
    });
    const ikinci = await sayfaEkle(vt, yonetici(), { baslik: "Hakkımızda" });
    expect((await sabitSayfaOku(vt, ikinci.kimlik))?.adresAdi).toBe("hakkimizda-2");
    expect(
      await hatasi(sayfaEkle(vt, yonetici(), { baslik: "Başka", adresAdi: "hakkimizda" })),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "adresAdi", kod: "adres-adi-tekrar" }] });
    expect(
      await hatasi(sayfaDegistir(vt, yonetici(), ikinci.kimlik, { adresAdi: "hakkimizda" })),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "adresAdi", kod: "adres-adi-tekrar" }] });
    expect(
      (await hatasi(sayfaEkle(vt, yonetici(), { baslik: "X", adresAdi: "Büyük Harf" }))).ayrinti,
    ).toEqual([{ alan: "adresAdi", kod: "adres-adi-bicimi" }]);
    await sayfaSil(vt, yonetici(), kimlik);
    const yeni = await sayfaEkle(vt, yonetici(), { baslik: "Yeni", adresAdi: "hakkimizda" });
    expect((await sabitSayfaOku(vt, yeni.kimlik))?.adresAdi).toBe("hakkimizda");
    expect(await sabitSayfaOku(vt, kimlik)).toBeNull();
    expect((await sabitSayfalariOku(vt)).map((s) => s.adresAdi)).toEqual([
      "hakkimizda-2",
      "hakkimizda",
    ]);
  });

  it("aynı anda üç ekleme aynı adresi iki kez yazmaz; sayfa sınırı tutar", async () => {
    const vt = await siteAc();
    const sonuclar = await Promise.allSettled(
      [1, 2, 3].map(() => sayfaEkle(vt, yonetici(), { baslik: "SSS", adresAdi: "sss" })),
    );
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    // Kaybedenler işlem kilidinde bekleyip adresi kullanılıyor görür: bilinen çakışma. Kilit olmasa tekil indeksin
    // ham hatasıyla düşerlerdi (beklenmeyen hata, ekranda genel metin).
    for (const sonuc of sonuclar) {
      if (sonuc.status === "rejected") {
        expect(sonuc.reason).toBeInstanceOf(BilinenHata);
        expect((sonuc.reason as BilinenHata).ayrinti).toEqual([
          { alan: "adresAdi", kod: "adres-adi-tekrar" },
        ]);
      }
    }
    expect(await vt.select().from(sabitSayfalar)).toHaveLength(1);
    // Adressiz eklemede de üretilen adres tekrarlanmaz: üçü de yazılır, adresler ayrıdır.
    const uretilen = await Promise.all(
      [1, 2, 3].map(() => sayfaEkle(vt, yonetici(), { baslik: "Kargo" })),
    );
    const adresler = await Promise.all(
      uretilen.map(async ({ kimlik }) => (await sabitSayfaOku(vt, kimlik))?.adresAdi),
    );
    expect(new Set(adresler).size).toBe(3);
    for (let sira = 4; sira < sabitSayfaSinirlari.sayfaSayisi; sira += 1) {
      await sayfaEkle(vt, yonetici(), { baslik: `Sayfa ${sira}` });
    }
    expect(await hatasi(sayfaEkle(vt, yonetici(), { baslik: "Fazla" }))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "sayfa", kod: "sayfa-siniri" }],
    });
  });

  it("yalnız verilen alan değişir; eski görülen anda hiçbir şey yazılmaz; kayda içerik ve açıklama girmez", async () => {
    const vt = await siteAc();
    const kim = yonetici();
    const { kimlik } = await sayfaEkle(vt, kim, {
      baslik: "İletişim",
      icerik: "<p>Bize yazın.</p>",
      aciklama: "Bize ulaşın",
    });
    const ilk = await sabitSayfaOku(vt, kimlik);
    if (ilk === null) throw new Error("Sayfa yok.");
    const sonra = await sayfaDegistir(
      vt,
      kim,
      kimlik.toUpperCase(),
      { durum: "yayinda", aciklama: null },
      ilk.guncellenmeZamani,
    );
    expect(sonra).toMatchObject({
      baslik: "İletişim",
      icerik: "<p>Bize yazın.</p>",
      aciklama: null,
      durum: "yayinda",
    });
    // Ekranın gördüğü an eskidi: çakışma, sayfa değişmez.
    expect(
      await hatasi(sayfaDegistir(vt, kim, kimlik, { baslik: "Başka" }, ilk.guncellenmeZamani)),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "sayfa", kod: "sayfa-degisti" }] });
    expect((await sabitSayfaOku(vt, kimlik))?.baslik).toBe("İletişim");
    // Aynı değer kayda girmez; yalnız içerik değişince satır yazılır, içerik yazmaz.
    await sayfaDegistir(vt, kim, kimlik, { durum: "yayinda" });
    await sayfaDegistir(vt, kim, kimlik, { icerik: "<p>Yeni</p>" });
    expect(await kayitlar(vt, kimlik)).toEqual([
      ["sabit-sayfa.eklendi", null, { baslik: "İletişim", adresAdi: "iletisim", durum: "taslak" }],
      ["sabit-sayfa.degisti", { durum: "taslak" }, { durum: "yayinda" }],
      ["sabit-sayfa.degisti", {}, {}],
    ]);
    await sayfaSil(vt, kim, kimlik);
    expect((await kayitlar(vt, kimlik)).at(-1)).toEqual([
      "sabit-sayfa.silindi",
      { baslik: "İletişim", adresAdi: "iletisim", durum: "yayinda" },
      null,
    ]);
    expect((await hatasi(sayfaSil(vt, kim, kimlik))).kod).toBe("bulunamadi");
    expect((await hatasi(sayfaDegistir(vt, kim, randomUUID(), { baslik: "X" }))).kod).toBe(
      "bulunamadi",
    );
  });
});

describe("vitrin ve adres", () => {
  it("yalnız yayındaki sayfa açılır; eski adres yönlenir; silinen sayfanın adresi yönlenmez", async () => {
    const vt = await siteAc();
    const { kimlik } = await sayfaEkle(vt, yonetici(), {
      baslik: "Kargo",
      icerik: "<p>Teslimat</p>",
    });
    expect(await kayitAdresiniCoz(vt, "sayfa", "kargo")).toEqual({ sonuc: "yok" });
    expect(await vitrinSabitSayfasi(vt, kimlik)).toBeNull();
    await sayfaDegistir(vt, yonetici(), kimlik, { durum: "yayinda", aciklama: "Kargo bilgisi" });
    expect(await kayitAdresiniCoz(vt, "sayfa", "kargo")).toEqual({
      sonuc: "kayit",
      kayit: { kimlik, ad: "Kargo", adresAdi: "kargo", aciklama: "Kargo bilgisi" },
    });
    expect(await vitrinSabitSayfasi(vt, kimlik)).toEqual({
      kimlik,
      baslik: "Kargo",
      adresAdi: "kargo",
      icerik: "<p>Teslimat</p>",
    });
    await sayfaDegistir(vt, yonetici(), kimlik, { adresAdi: "kargo-ve-teslimat" });
    expect(await kayitAdresiniCoz(vt, "sayfa", "kargo")).toEqual({
      sonuc: "yonlendir",
      adresAdi: "kargo-ve-teslimat",
    });
    // Taslağa alınan sayfanın eski adresi de yönlenmez.
    await sayfaDegistir(vt, yonetici(), kimlik, { durum: "taslak" });
    expect(await kayitAdresiniCoz(vt, "sayfa", "kargo")).toEqual({ sonuc: "yok" });
    await sayfaDegistir(vt, yonetici(), kimlik, { durum: "yayinda" });
    await sayfaSil(vt, yonetici(), kimlik);
    expect(await kayitAdresiniCoz(vt, "sayfa", "kargo-ve-teslimat")).toEqual({ sonuc: "yok" });
    expect(await kayitAdresiniCoz(vt, "sayfa", "kargo")).toEqual({ sonuc: "yok" });
  });

  it("içeriğin düz yazısı: etiketler düşer, paragraflar boşlukla ayrılır, kaçırılmış harfler çevrilir", () => {
    expect(
      bicimliMetninDuzYazisi("<h3>Biz</h3><p>Kahve &amp; çay</p><ul><li>bir</li><li>iki</li></ul>"),
    ).toBe("Biz Kahve & çay bir iki");
    expect(bicimliMetninDuzYazisi("<p>a<br>b</p>")).toBe("a b");
    expect(bicimliMetninDuzYazisi("<p>&lt;b&gt; yazı</p>")).toBe("<b> yazı");
    expect(bicimliMetninDuzYazisi("")).toBe("");
  });
});

describe("içerik araması", () => {
  it("Türkçe harfsiz, büyük harfle ve ortadan bulur; silinmiş yok, taslak var; joker yok; blog yazısı da", async () => {
    const vt = await siteAc();
    await sayfaEkle(vt, yonetici(), { baslik: "Sıkça sorulan sorular" });
    await sayfaEkle(vt, yonetici(), { baslik: "İade %50_koşulları", durum: "yayinda" });
    const { kimlik: silinen } = await sayfaEkle(vt, yonetici(), { baslik: "Sorular eski" });
    await sayfaSil(vt, yonetici(), silinen);
    const adlar = async (aranan: string, tur: "sayfa" | "blog-yazisi" = "sayfa") =>
      (await icerikAra(vt, tur, aranan)).kayitlar.map((kayit) => kayit.ad);
    expect(await adlar("SORULAN")).toEqual(["Sıkça sorulan sorular"]);
    expect(await adlar("sikca")).toEqual(["Sıkça sorulan sorular"]);
    expect(await adlar("sorular")).toEqual(["Sıkça sorulan sorular"]);
    expect(await adlar("iade")).toEqual(["İade %50_koşulları"]);
    expect(await adlar("%")).toEqual(["İade %50_koşulları"]);
    expect(await adlar("_")).toEqual(["İade %50_koşulları"]);
    expect(await adlar("a%e")).toEqual([]);
    expect((await adlar("")).length).toBe(2);
    await icerikServisi(() => "Europe/Istanbul").yaziEkle(vt, yonetici(), {
      baslik: "Kış rehberi",
    });
    expect(await adlar("kis", "blog-yazisi")).toEqual(["Kış rehberi"]);
    expect(await adlar("kis")).toEqual([]);
    expect((await icerikAra(vt, "sayfa", "sikca")).kayitlar[0]?.adresAdi).toBe(
      "sikca-sorulan-sorular",
    );
  });
});

describe("başlangıç sayfaları", () => {
  const ornekSite = siteKlasorunuOku(
    join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "ayar-semasi",
      "testler",
      "ornek-siteler",
      "gecerli",
    ),
  );
  const site: Site = {
    ...ornekSite,
    sayfaBaslangici: [
      { baslik: "Hakkımızda", adresAdi: "hakkimizda", icerik: "<p>Biz</p>", durum: "yayinda" },
      { baslik: "SSS", adresAdi: "sss", icerik: "", aciklama: "Sorular", durum: "taslak" },
    ],
  };

  it("bir kez yazılır; ikinci çağrı ve aynı anda iki çağrı yazmaz; dosya boşsa yazılmaz", async () => {
    const vt = await siteAc();
    expect(await sayfaBaslangiciniKur(vt, { ...site, sayfaBaslangici: [] })).toBe(false);
    const sonuclar = await Promise.all([
      sayfaBaslangiciniKur(vt, site),
      sayfaBaslangiciniKur(vt, site),
    ]);
    expect(sonuclar.filter(Boolean)).toHaveLength(1);
    expect(await sayfaBaslangiciniKur(vt, site)).toBe(false);
    const sayfalar = await vt.select().from(sabitSayfalar).orderBy(sabitSayfalar.adres_adi);
    expect(sayfalar.map((s) => [s.adres_adi, s.durum, s.aciklama])).toEqual([
      ["hakkimizda", "yayinda", null],
      ["sss", "taslak", "Sorular"],
    ]);
    const [kayit] = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.islem, "sabit-sayfa.eklendi"));
    expect(kayit?.kim_turu).toBe("sistem");
    expect(kayit?.kim_adi).toBe("baslangic-sayfa");
    // Silinen sayfa geri gelmez: sitede sayfa satırı varsa dosya kullanılmaz.
    for (const sayfa of sayfalar) await sayfaSil(vt, yonetici(), sayfa.kimlik);
    expect(await sayfaBaslangiciniKur(vt, site)).toBe(false);
  });
});

describe("veritabanı ve iki site", () => {
  it("durum denetimi kayıtla aynı; iki site birbirinin sayfasını görmez", async () => {
    const vt = await siteAc();
    for (const durum of sabitSayfaDurumlari) {
      await vt.insert(sabitSayfalar).values({ baslik: durum, adres_adi: durum, durum });
    }
    await expect(
      vt.insert(sabitSayfalar).values({ baslik: "b", adres_adi: "b", durum: "zamanlanmis" }),
    ).rejects.toMatchObject({ cause: { constraint: "sabit_sayfalar_durum" } });
    await expect(
      vt.insert(sabitSayfalar).values({ baslik: "c", adres_adi: "yayinda", durum: "taslak" }),
    ).rejects.toMatchObject({ cause: { constraint: "sabit_sayfalar_adres_adi" } });
    const oteki = await siteAc();
    expect(await sabitSayfalariOku(oteki)).toEqual([]);
    expect(await kayitAdresiniCoz(oteki, "sayfa", "yayinda")).toEqual({ sonuc: "yok" });
  });
});
