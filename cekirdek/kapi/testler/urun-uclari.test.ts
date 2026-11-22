// Ürün ekranının uçları gerçek istek ve veritabanıyla (kart 0263): mağaza sahibi ürünü adla ekler (taslak başlar),
// bütün alanlarıyla değiştirir (kategori, marka, etiket, ilgili ürün, özellik değerleri, ağırlık sitenin biriminde ve
// sayı biçiminde, yayın zamanı sitenin saatiyle), boş isteğe bağlı alanı null ile boşaltır ve siler. Okunamayan
// ağırlık ve türüne uymayan özellik değeri alanın yoluyla, adet sınırı ve kendisini ilgili seçmek alanın koduyla
// döner, hiçbir şey yazılmaz. Açıklamadaki betik ve izinsiz bağlantı vitrinde temizlenir. Görevli ekler ve
// değiştirir, silemez; rolsüz yönetici, müşteri ve girişsiz ziyaretçi üç uçta geçmez ve hiçbir şey değişmez. Her
// rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener. Seçenekler bölümü (kart 0264): mağaza sahibi yeni
// ürünü seçenekleriyle ekler ve birleşimin ağırlığı sitenin biriminde okunur; okunamayan birleşim ağırlığı ve hatalı
// seçenek ürünün değişikliğini de geri alır; görevli değer ekler, kayıtlı değeri silemez (yetki, hiçbir şey değişmez).
// Fiyat ve stok bölümleri (kart 0265): mağaza sahibi yeni ürünü fiyatı, indirimi ve başlangıç stoğuyla ekler, fiyat
// geçmişinde yazan kendisidir; görevli fiyatı değiştiremez (fiyat-yetkisi, ürünün değişikliği de yazılmaz), stoğu
// pencereyle düzeltir, eski görülen miktarla çakışma alır; birleşimlerin fiyatı ve stoğu satırlarıyla yazılır;
// rolsüz yönetici, müşteri ve girişsiz ziyaretçi stok düzeltme ve iki geçmiş ucunda geçmez.
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { etiketServisi } from "../../moduller/etiket/servis.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { kategoriEkle } from "../../moduller/kategori/servis.ts";
import { markaServisi } from "../../moduller/marka/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { ozellikServisi } from "../../moduller/ozellik/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { aciklamayiTemizle } from "../../moduller/urun/aciklama.ts";
import { urunGalerileri } from "../../moduller/urun/galeri.ts";
import { urunler } from "../../moduller/urun/model.ts";
import { siteninUrunServisi } from "../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import type {
  FiyatGecmisiGorunusu,
  GecmisSayfasi,
  StokGecmisiGorunusu,
} from "../../yonetim-paneli/urunler/fiyat-stok-verisi.ts";
import { urunEkraniVerisi } from "../../yonetim-paneli/urunler/urun-verisi.ts";
import {
  urunDegisikligiUcu,
  urunEklemeUcu,
  urunFiyatGecmisiUcu,
  urunSilmeUcu,
  urunStokDuzeltmeUcu,
  urunStokGecmisiUcu,
} from "../yonetici/urun.ts";
import { urunGorseliYuklemeUcu } from "../yonetici/urun-gorseli.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(
  join(resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler"), "gecerli"),
);
const bicim = siteninBicimleyicisi(site.ayarlar);
const servis = siteninUrunServisi(site);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();
const yapan = { tur: "yonetici", kimlik: "00000000-0000-4000-8000-000000000001" } as const;

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;
let dosyaKlasoru = "";

beforeAll(async () => {
  const acilan = await denemeSitesiAc("urun-uclari");
  vt = acilan.vt;
  sil = acilan.sil;
  vi.stubEnv("VERITABANI_ADRESI", acilan.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  // Galeri (kart 0266): yüklenen görseller bu klasöre yazılır.
  dosyaKlasoru = mkdtempSync(join(tmpdir(), "urun-uclari-"));
  vi.stubEnv("DOSYA_KLASORU", dosyaKlasoru);
  ortak[siteAnahtari] = site;
  await baglantiyiKapat();
}, 60_000);
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  rmSync(dosyaKlasoru, { recursive: true, force: true });
  await sil();
});

const cerez = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri" | "girissiz") => {
  if (kisi === "girissiz") return undefined;
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(vt, tur, {
    eposta: `urun${sayac}-${randomBytes(3).toString("hex")}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  if (kisi === "magaza-sahibi" || kisi === "gorevli") {
    const [rol] = await vt
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi));
    if (rol === undefined) throw new Error(`${kisi} rolü yok.`);
    await vt
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return oturumCerezi(vt, tur, hesapKimligi);
};

const istek = (yol: string, oturum: string | undefined, govde: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    body: JSON.stringify(govde),
  });

const veri = async <T>(yanit: Response): Promise<T> => {
  const zarf = (await yanit.json()) as { basarili: boolean; veri: T };
  expect(zarf.basarili, JSON.stringify(zarf)).toBe(true);
  return zarf.veri;
};
const hata = async (yanit: Response) =>
  ((await yanit.json()) as { hata: { kod: string; ayrinti?: unknown } }).hata;
const benzersiz = () => randomBytes(3).toString("hex");

const ekle = async (oturum: string | undefined, urun: Record<string, unknown>) =>
  (await veri<{ kimlik: string }>(await urunEklemeUcu(istek("urun-ekle", oturum, { urun }))))
    .kimlik;

describe("ürün uçları", () => {
  it("mağaza sahibi adla ekler (taslak), bütün alanlarıyla değiştirir, boşaltır ve siler", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = await ekle(sahip, { ad: `Kupa ${benzersiz()}`, vergiSinifi: null });
    const yeni = await servis.urunuOku(vt, kimlik);
    expect(yeni).toMatchObject({ durum: "taslak", enAzAdet: 1, kategoriler: [], marka: null });

    const kategori = await kategoriEkle(vt, yapan, { ad: `Kupalar ${benzersiz()}` });
    const marka = await markaServisi.ekle(vt, yapan, { ad: `Marka ${benzersiz()}` });
    const etiket = await etiketServisi.ekle(vt, yapan, { ad: `Etiket ${benzersiz()}` });
    const ilgili = await servis.urunEkle(vt, yapan, {
      ad: `İlgili ${benzersiz()}`,
      vergiSinifi: null,
    });
    const hacim = await ozellikServisi.ekle(vt, yapan, {
      ad: `Hacim ${benzersiz()}`,
      tur: "sayi",
      birim: "ml",
    });
    const yikanir = await ozellikServisi.ekle(vt, yapan, {
      ad: `Yıkanır ${benzersiz()}`,
      tur: "evet-hayir",
    });
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", sahip, {
          kimlik,
          urun: {
            kisaAciklama: "Seramik kupa.",
            uzunAciklama: "<p>Elde <strong>yapılmış</strong>.</p>",
            kategoriler: [kategori],
            marka,
            etiketler: [etiket],
            ilgiliUrunler: [ilgili],
            stokKodu: `KUPA-${benzersiz()}`,
            agirlik: bicim.sayi(0.35, 2),
            enAzAdet: 2,
            enCokAdet: 6,
            durum: "zamanlanmis",
            yayinZamani: "2099-01-02T09:30",
            ozellikler: [
              { ozellik: hacim, deger: bicim.sayi(350.5, 1) },
              { ozellik: yikanir, deger: true },
            ],
          },
        }),
      ),
    );
    const degisen = await servis.urunuOku(vt, kimlik);
    expect(degisen).toMatchObject({
      kisaAciklama: "Seramik kupa.",
      kategoriler: [kategori],
      marka,
      etiketler: [etiket],
      ilgiliUrunler: [ilgili],
      enAzAdet: 2,
      enCokAdet: 6,
      durum: "zamanlanmis",
    });
    expect(degisen?.birimler[0]?.agirlikGram).toBe(350);
    // Yayın zamanı sitenin saat dilimindeki yerel zamandır.
    expect(degisen?.yayinZamani).toEqual(
      yerelZamandan("2099-01-02T09:30", site.ayarlar.saatDilimi),
    );
    expect(degisen?.ozellikler).toEqual(
      expect.arrayContaining([
        { ozellik: hacim, deger: 350.5 },
        { ozellik: yikanir, deger: true },
      ]),
    );

    // Boşaltma: null isteğe bağlı alanı boşaltır, boş liste bağlantıları kaldırır.
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", sahip, {
          kimlik,
          urun: {
            kisaAciklama: null,
            agirlik: "",
            enCokAdet: null,
            kategoriler: [],
            marka: null,
            ozellikler: [],
            durum: "yayinda",
            yayinZamani: null,
          },
        }),
      ),
    );
    const bos = await servis.urunuOku(vt, kimlik);
    expect(bos?.kisaAciklama).toBeUndefined();
    expect(bos?.enCokAdet).toBeUndefined();
    expect(bos?.birimler[0]?.agirlikGram).toBeUndefined();
    expect(bos).toMatchObject({ kategoriler: [], marka: null, ozellikler: [], durum: "yayinda" });

    await veri(await urunSilmeUcu(istek("urun-sil", sahip, { kimlik })));
    expect((await servis.urunuOku(vt, kimlik))?.silindi).toBe(true);
    // Silinen ürün yeniden silinmez, değişmez.
    const yeniden = await urunSilmeUcu(istek("urun-sil", sahip, { kimlik }));
    expect(yeniden.status).toBe(404);
  });

  it("reddedilen girdi alanın yolu ve koduyla döner, hiçbir şey yazılmaz", async () => {
    const sahip = await cerez("magaza-sahibi");
    const ad = `Termos ${benzersiz()}`;
    const kimlik = await ekle(sahip, { ad, vergiSinifi: null });
    const liste = await ozellikServisi.ekle(vt, yapan, {
      ad: `Renk ${benzersiz()}`,
      tur: "liste",
      secenekler: ["Mavi"],
    });
    const sayi = await ozellikServisi.ekle(vt, yapan, { ad: `Sayı ${benzersiz()}`, tur: "sayi" });
    const once = await servis.urunuOku(vt, kimlik);
    const reddet = async (urun: Record<string, unknown>, beklenen: unknown) => {
      const yanit = await urunDegisikligiUcu(istek("urun-degistir", sahip, { kimlik, urun }));
      expect(yanit.status, JSON.stringify(urun)).toBeGreaterThanOrEqual(400);
      expect(await hata(yanit)).toMatchObject({ ayrinti: beklenen });
    };
    await reddet({ agirlik: "1,2,3" }, [{ alan: "agirlik", kod: "agirlik-bicimi" }]);
    await reddet({ ozellikler: [{ ozellik: sayi, deger: "on iki" }] }, [
      { alan: "ozellikler.0.deger", kod: "ozellik-deger-gecersiz" },
    ]);
    // Liste türüne metin: seçenek kimliği değil.
    await reddet({ ozellikler: [{ ozellik: liste, deger: "Mavi" }] }, [
      expect.objectContaining({ alan: "ozellikler.0.deger" }),
    ]);
    await reddet({ enAzAdet: 5, enCokAdet: 2 }, [{ alan: "enCokAdet", kod: "adet-siniri" }]);
    await reddet({ ilgiliUrunler: [kimlik] }, [expect.objectContaining({ kod: "ilgili-kendisi" })]);
    await reddet({ durum: "zamanlanmis" }, [{ alan: "yayinZamani", kod: "yayin-zamani-gerekli" }]);
    // Ekran zamanlanmış durumda boş zamanı null gönderir: aynı kod.
    await reddet({ durum: "zamanlanmis", yayinZamani: null }, [
      { alan: "yayinZamani", kod: "yayin-zamani-gerekli" },
    ]);
    await reddet({ ad: "" }, [expect.objectContaining({ alan: "ad" })]);
    // Ağırlık okunamazken öteki alanlar da yazılmaz.
    await reddet({ ad: "Değişmemeli", agirlik: "x" }, [{ alan: "agirlik", kod: "agirlik-bicimi" }]);
    const sonra = await servis.urunuOku(vt, kimlik);
    expect(sonra).toEqual(once);

    // Yeni üründe de: okunamayan ağırlıkla ürün açılmaz.
    const acilmamali = `Açılmamalı ${benzersiz()}`;
    const yanit = await urunEklemeUcu(
      istek("urun-ekle", sahip, { urun: { ad: acilmamali, vergiSinifi: null, agirlik: "a" } }),
    );
    expect(yanit.status).toBe(400);
    expect(
      await vt.select({ kimlik: urunler.kimlik }).from(urunler).where(eq(urunler.ad, acilmamali)),
    ).toEqual([]);
  });

  it("açıklamadaki betik ve izinsiz bağlantı vitrinde görünmez", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = await ekle(sahip, {
      ad: `Açıklama ${benzersiz()}`,
      vergiSinifi: null,
      uzunAciklama:
        '<p>Merhaba<script>alert(1)</script> <a href="javascript:alert(1)">tıkla</a> <a href="/kategori/x">git</a></p>',
    });
    const urun = await servis.urunuOku(vt, kimlik);
    const vitrinde = aciklamayiTemizle(urun?.uzunAciklama) ?? "";
    expect(vitrinde).not.toContain("script");
    expect(vitrinde).not.toContain("javascript:");
    expect(vitrinde).toContain('href="/kategori/x"');
  });

  it("ekranın verisi: silinmiş vergi sınıfı işaretli görünür, düz metin açıklama paragraflara çevrilir", async () => {
    const vergi = siteninVergiServisi(site);
    const sinif = await vergi.sinifEkle(vt, yapan, { ad: `Eski sınıf ${benzersiz()}` });
    const kimlik = await servis.urunEkle(vt, yapan, {
      ad: `Eski ${benzersiz()}`,
      vergiSinifi: sinif,
      uzunAciklama: "Birinci paragraf.\n\nİkinci paragraf.",
    });
    await vergi.sinifSil(vt, yapan, sinif);
    const sahip = (izin: string) => izin !== "";
    const ekran = await urunEkraniVerisi(kimlik, sahip);
    expect(ekran?.form.vergiSinifi).toBe(sinif);
    expect(ekran?.vergiSiniflari.find((s) => s.kimlik === sinif)).toMatchObject({ silindi: true });
    expect(ekran?.form.uzunAciklama).toBe("<p>Birinci paragraf.</p><p>İkinci paragraf.</p>");
    // Yeni ürünün sınıfı silinmiş sınıf olamaz; silinmiş sınıf yeni üründe listelenmez.
    const yeni = await urunEkraniVerisi(undefined, sahip);
    expect(yeni?.vergiSiniflari.some((s) => s.kimlik === sinif)).toBe(false);
    expect(yeni?.form.vergiSinifi).not.toBe(sinif);
    // Silinmiş ürünün ekranı yoktur.
    await servis.urunSil(vt, yapan, kimlik);
    expect(await urunEkraniVerisi(kimlik, sahip)).toBeUndefined();
  });

  it("görevli ekler ve değiştirir, silemez; rolsüz, müşteri ve girişsiz geçmez, hiçbir şey değişmez", async () => {
    const gorevli = await cerez("gorevli");
    const kimlik = await ekle(gorevli, { ad: `Görevli ${benzersiz()}`, vergiSinifi: null });
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", gorevli, { kimlik, urun: { kisaAciklama: "Görevli yazdı." } }),
      ),
    );
    const silme = await urunSilmeUcu(istek("urun-sil", gorevli, { kimlik }));
    expect(silme.status).toBe(403);
    const once = await servis.urunuOku(vt, kimlik);
    for (const kisi of ["rolsuz", "musteri", "girissiz"] as const) {
      const oturum = await cerez(kisi);
      const beklenen = kisi === "rolsuz" ? 403 : 401;
      const ad = `Yetkisiz ${benzersiz()}`;
      for (const yanit of [
        await urunEklemeUcu(istek("urun-ekle", oturum, { urun: { ad, vergiSinifi: null } })),
        await urunDegisikligiUcu(istek("urun-degistir", oturum, { kimlik, urun: { ad } })),
        await urunSilmeUcu(istek("urun-sil", oturum, { kimlik })),
      ]) {
        expect(yanit.status, kisi).toBe(beklenen);
      }
      expect(await vt.select().from(urunler).where(eq(urunler.ad, ad))).toEqual([]);
    }
    expect(await servis.urunuOku(vt, kimlik)).toEqual(once);
  });
});

describe("seçenekler bölümü (kart 0264)", () => {
  // Her çağrı kendi stok koduyla: stok kodu bütün ürünlerde tekildir.
  const ikiDeger = () => ({
    secenekler: [{ ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] }],
    birlesimler: [
      { degerler: [0], stokKodu: `S-${benzersiz()}`, agirlik: bicim.sayi(0.4, 1) },
      { degerler: [1], agirlik: "" },
    ],
  });
  const canli = async (kimlik: string) =>
    (await servis.urunuOku(vt, kimlik))?.birimler.filter((b) => !b.silindi) ?? [];

  it("mağaza sahibi yeni ürünü seçenekleriyle ekler; birleşimin ağırlığı sitenin biriminde okunur", async () => {
    const sahip = await cerez("magaza-sahibi");
    const girdi = ikiDeger();
    const { kimlik } = await veri<{ kimlik: string }>(
      await urunEklemeUcu(
        istek("urun-ekle", sahip, {
          urun: { ad: `Seçenekli ${benzersiz()}`, vergiSinifi: null },
          varyant: girdi,
        }),
      ),
    );
    const okunan = await servis.urunuOku(vt, kimlik);
    expect(okunan?.tur).toBe("varyantli");
    expect((await canli(kimlik)).map((b) => [b.stokKodu, b.agirlikGram])).toEqual([
      [girdi.birlesimler[0]?.stokKodu, 400],
      [undefined, undefined],
    ]);
  });

  it("okunamayan birleşim ağırlığı ve hatalı seçenek yerin yoluyla döner, ürünün değişikliği de yazılmaz", async () => {
    const sahip = await cerez("magaza-sahibi");
    const ad = `Geri alınan ${benzersiz()}`;
    const kimlik = await ekle(sahip, { ad, vergiSinifi: null });
    for (const [varyant, ayrinti] of [
      [
        { ...ikiDeger(), birlesimler: [{ degerler: [1], agirlik: "çok" }] },
        [{ alan: "birlesimler.0.agirlik", kod: "agirlik-bicimi" }],
      ],
      [
        {
          secenekler: [{ ad: "Beden", degerler: [{ ad: "S" }, { ad: "s" }] }],
          birlesimler: [],
        },
        [{ alan: "secenekler.0.degerler.1", kod: "deger-ad-tekrar" }],
      ],
    ] as const) {
      const yanit = await urunDegisikligiUcu(
        istek("urun-degistir", sahip, { kimlik, urun: { ad: `${ad} yeni` }, varyant }),
      );
      expect(yanit.status).not.toBe(200);
      expect((await hata(yanit)).ayrinti).toEqual(ayrinti);
      const okunan = await servis.urunuOku(vt, kimlik);
      expect([okunan?.ad, okunan?.tur]).toEqual([ad, "basit"]);
    }
  });

  it("görevli değer ekler, kayıtlı değeri silemez: yetki ve hiçbir şey değişmez", async () => {
    const sahip = await cerez("magaza-sahibi");
    const gorevli = await cerez("gorevli");
    const kimlik = await ekle(sahip, { ad: `Görevli seçenek ${benzersiz()}`, vergiSinifi: null });
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", sahip, { kimlik, urun: {}, varyant: ikiDeger() }),
      ),
    );
    const secenek = (await servis.urunuOku(vt, kimlik))?.secenekler[0];
    if (secenek === undefined) throw new Error("Seçenek yok.");
    const kayitli = secenek.degerler.map((d) => ({ kimlik: d.kimlik, ad: d.ad }));
    // Ekleme serbest.
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", gorevli, {
          kimlik,
          urun: {},
          varyant: {
            secenekler: [
              { kimlik: secenek.kimlik, ad: "Beden", degerler: [...kayitli, { ad: "L" }] },
            ],
            birlesimler: [],
          },
        }),
      ),
    );
    expect(await canli(kimlik)).toHaveLength(3);
    const once = await servis.urunuOku(vt, kimlik);
    const silme = await urunDegisikligiUcu(
      istek("urun-degistir", gorevli, {
        kimlik,
        urun: {},
        varyant: {
          secenekler: [{ kimlik: secenek.kimlik, ad: "Beden", degerler: kayitli.slice(0, 1) }],
          birlesimler: [],
        },
      }),
    );
    expect(silme.status).toBe(403);
    expect(await hata(silme)).toEqual({
      kod: "yetki",
      ayrinti: [{ alan: "secenekler", kod: "varyant-silme-yetkisi" }],
    });
    expect(await servis.urunuOku(vt, kimlik)).toEqual(once);
  });

  it("son seçenek kaldırılırken aynı kayıtta yazılan stok kodu yeni basit birime yazılır (bağımsız kontrolün bulgusu)", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = await ekle(sahip, { ad: `Basite dönen ${benzersiz()}`, vergiSinifi: null });
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", sahip, { kimlik, urun: {}, varyant: ikiDeger() }),
      ),
    );
    const stokKodu = `BASIT-${benzersiz()}`;
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", sahip, {
          kimlik,
          urun: { stokKodu, agirlik: bicim.sayi(1.5, 1) },
          varyant: { secenekler: [], birlesimler: [] },
        }),
      ),
    );
    const okunan = await servis.urunuOku(vt, kimlik);
    expect(okunan?.tur).toBe("basit");
    expect((await canli(kimlik)).map((b) => [b.stokKodu, b.agirlikGram])).toEqual([
      [stokKodu, 1500],
    ]);
  });
});

describe("fiyat ve stok bölümleri (kart 0265)", () => {
  const tutar = (sayi: number) => bicim.sayi(sayi, 2);
  const basitBirim = async (kimlik: string) =>
    (await servis.urunuOku(vt, kimlik))?.birimler.find((b) => !b.silindi)?.kimlik ?? "";
  const stoku = async (birim: string) =>
    (await stok.stoklariOku(vt, [birim])).get(birim)?.miktar ?? 0;

  it("mağaza sahibi yeni ürünü fiyatı, indirimi ve başlangıç stoğuyla ekler; geçmişte yazan kendisidir", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = (
      await veri<{ kimlik: string }>(
        await urunEklemeUcu(
          istek("urun-ekle", sahip, {
            urun: { ad: `Fiyatlı ${benzersiz()}`, vergiSinifi: null },
            fiyatStok: {
              indirimBaslangici: null,
              indirimBitisi: "2030-01-01T00:00",
              sebep: "yeni-mal",
              birimler: [
                {
                  yer: "fiyat",
                  satisFiyati: tutar(1249.9),
                  indirimliFiyat: tutar(999),
                  ortakZaman: true,
                },
                { yer: "stok", stok: { gorulen: 0, yeni: "7" } },
              ],
            },
          }),
        ),
      )
    ).kimlik;
    const birim = await basitBirim(kimlik);
    expect(await fiyat.fiyatOku(vt, birim)).toMatchObject({
      satisFiyati: 124990,
      indirimliFiyat: 99900,
      indirimBitisi: yerelZamandan("2030-01-01T00:00", site.ayarlar.saatDilimi),
    });
    expect(await stoku(birim)).toBe(7);
    const gecmis = await veri<GecmisSayfasi<FiyatGecmisiGorunusu>>(
      await urunFiyatGecmisiUcu(istek("urun-fiyat-gecmisi", sahip, { kimlik })),
    );
    expect(gecmis.satirlar).toHaveLength(1);
    expect(gecmis.satirlar[0]?.yazan).toMatchObject({ tur: "yonetici" });
    const stokGecmisi = await veri<GecmisSayfasi<StokGecmisiGorunusu>>(
      await urunStokGecmisiUcu(istek("urun-stok-gecmisi", sahip, { kimlik })),
    );
    expect(stokGecmisi.satirlar.map((s) => [s.sebep, s.degisim, s.sonra])).toEqual([
      ["yeni-mal", 7, 7],
    ]);
  });

  it("görevli fiyatı değiştiremez (ürünün değişikliği de yazılmaz), stoğu düzeltir; eski görülen miktar çakışır", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = await ekle(sahip, { ad: `Görevli fiyat ${benzersiz()}`, vergiSinifi: null });
    const birim = await basitBirim(kimlik);
    const gorevli = await cerez("gorevli");
    const red = await urunDegisikligiUcu(
      istek("urun-degistir", gorevli, {
        kimlik,
        urun: { kisaAciklama: "Görevli yazdı." },
        fiyatStok: { birimler: [{ yer: "fiyat", satisFiyati: tutar(10) }] },
      }),
    );
    expect(red.status).toBe(403);
    expect(await hata(red)).toMatchObject({
      kod: "yetki",
      ayrinti: [{ alan: "fiyat", kod: "fiyat-yetkisi" }],
    });
    expect((await servis.urunuOku(vt, kimlik))?.kisaAciklama ?? null).toBeNull();
    expect(await fiyat.fiyatOku(vt, birim)).toBeUndefined();

    const duzelt = (gorulenMiktar: number, yeniMiktar: number) =>
      urunStokDuzeltmeUcu(
        istek("urun-stok-duzelt", gorevli, {
          birim,
          duzeltme: { gorulenMiktar, yeniMiktar, sebep: "sayim" },
        }),
      );
    await veri(await duzelt(0, 5));
    const cakisma = await duzelt(0, 9);
    expect(cakisma.status).toBe(409);
    expect(await hata(cakisma)).toMatchObject({ kod: "cakisma" });
    expect(await stoku(birim)).toBe(5);
    // "Diğer" notsuz alanın koduyla döner.
    expect(
      await hata(
        await urunStokDuzeltmeUcu(
          istek("urun-stok-duzelt", gorevli, {
            birim,
            duzeltme: { gorulenMiktar: 5, yeniMiktar: 6, sebep: "diger" },
          }),
        ),
      ),
    ).toMatchObject({ kod: "dogrulama", ayrinti: [{ alan: "not", kod: "not-gerekli" }] });
  });

  it("birleşimlerin fiyatı ve stoğu satırlarıyla yazılır, ortak sebeple", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = await ekle(sahip, { ad: `Birleşimli ${benzersiz()}`, vergiSinifi: null });
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", sahip, {
          kimlik,
          urun: {},
          varyant: {
            secenekler: [{ ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] }],
            birlesimler: [{ degerler: [0] }, { degerler: [1] }],
          },
          fiyatStok: {
            sebep: "sayim",
            birimler: [
              {
                yer: "birlesimler.0",
                birlesim: [0],
                satisFiyati: tutar(100),
                stok: { gorulen: 0, yeni: "3" },
              },
              {
                yer: "birlesimler.1",
                birlesim: [1],
                satisFiyati: tutar(120),
                stok: { gorulen: 0, yeni: "4" },
              },
            ],
          },
        }),
      ),
    );
    const birimler = (await servis.urunuOku(vt, kimlik))?.birimler.filter((b) => !b.silindi) ?? [];
    const sonuc = await Promise.all(
      birimler.map(async (b) => [
        (await fiyat.fiyatOku(vt, b.kimlik))?.satisFiyati,
        await stoku(b.kimlik),
      ]),
    );
    expect(sonuc).toEqual([
      [10000, 3],
      [12000, 4],
    ]);
  });

  it("rolsüz, müşteri ve girişsiz stok düzeltme ve iki geçmiş ucunda geçmez, stok değişmez", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = await ekle(sahip, { ad: `Yetkisiz stok ${benzersiz()}`, vergiSinifi: null });
    const birim = await basitBirim(kimlik);
    for (const kisi of ["rolsuz", "musteri", "girissiz"] as const) {
      const oturum = await cerez(kisi);
      const beklenen = kisi === "rolsuz" ? 403 : 401;
      for (const yanit of [
        await urunStokDuzeltmeUcu(
          istek("urun-stok-duzelt", oturum, {
            birim,
            duzeltme: { gorulenMiktar: 0, yeniMiktar: 3, sebep: "sayim" },
          }),
        ),
        await urunFiyatGecmisiUcu(istek("urun-fiyat-gecmisi", oturum, { kimlik })),
        await urunStokGecmisiUcu(istek("urun-stok-gecmisi", oturum, { kimlik })),
      ]) {
        expect(yanit.status, kisi).toBe(beklenen);
      }
    }
    expect(await stoku(birim)).toBe(0);
  });
});

describe("galeri (kart 0266)", () => {
  const yukle = (oturum: string | undefined, govde: Uint8Array) =>
    urunGorseliYuklemeUcu(
      new Request("http://magaza.ornek.test/kapi/yonetici/urun-gorseli-yukle", {
        method: "POST",
        headers: {
          "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
          ...(oturum === undefined ? {} : { cookie: oturum }),
        },
        body: Buffer.from(govde),
      }),
    );
  const png = (genislik = 300) =>
    sharp({
      create: { width: genislik, height: 200, channels: 3, background: { r: 30, g: 60, b: 90 } },
    })
      .png()
      .toBuffer();
  const galerisi = async (urun: string) =>
    ((await urunGalerileri(vt, [urun])).get(urun) ?? []).map((oge) => ({
      kimlik: oge.kimlik,
      tur: oge.tur,
      alternatifMetin: oge.alternatifMetin,
    }));

  it("mağaza sahibi görsel yükler, ürünü galerisiyle ekler, sıralar, metni değiştirir, siler; eski ekran çakışır", async () => {
    const sahip = await cerez("magaza-sahibi");
    const yuklenen = await veri<{ dosya: string; genislik: number; yukseklik: number }>(
      await yukle(sahip, await png(640)),
    );
    expect(yuklenen).toMatchObject({ genislik: 640, yukseklik: 200 });
    const ikinci = await veri<{ dosya: string }>(await yukle(sahip, await png()));
    const kimlik = (
      await veri<{ kimlik: string }>(
        await urunEklemeUcu(
          istek("urun-ekle", sahip, {
            urun: { ad: `Galerili ${benzersiz()}`, vergiSinifi: null },
            galeri: {
              gorulen: [],
              ogeler: [
                { dosya: yuklenen.dosya, alternatifMetin: "Ön" },
                { video: "https://youtu.be/dQw4w9WgXcQ", alternatifMetin: "Tanıtım" },
                { dosya: ikinci.dosya, alternatifMetin: "Arka" },
              ],
            },
          }),
        ),
      )
    ).kimlik;
    const ilk = await galerisi(kimlik);
    expect(ilk.map((oge) => oge.alternatifMetin)).toEqual(["Ön", "Tanıtım", "Arka"]);
    const [on, tanitim, arka] = ilk;
    // Ekranın verisi: öğeler sırasıyla, görsel dosyası ve özgün ölçüsüyle (küçük görsel uyarısı), video sitesiyle.
    const ekran = await urunEkraniVerisi(kimlik, (izin: string) => izin !== "");
    expect(ekran?.form.galeri).toEqual([
      {
        anahtar: on?.kimlik,
        kimlik: on?.kimlik,
        tur: "gorsel",
        alternatifMetin: "Ön",
        dosya: yuklenen.dosya,
        genislik: 640,
        yukseklik: 200,
      },
      {
        anahtar: tanitim?.kimlik,
        kimlik: tanitim?.kimlik,
        tur: "video",
        alternatifMetin: "Tanıtım",
        site: "youtube",
        videoKimligi: "dQw4w9WgXcQ",
      },
      expect.objectContaining({ kimlik: arka?.kimlik, dosya: ikinci.dosya }),
    ]);
    expect(ekran?.galeriGorselleri.map((g) => g.kimlik)).toEqual([on?.kimlik, arka?.kimlik]);
    await veri(
      await urunDegisikligiUcu(
        istek("urun-degistir", sahip, {
          kimlik,
          urun: {},
          galeri: {
            gorulen: ilk.map((oge) => oge.kimlik),
            ogeler: [
              { kimlik: arka?.kimlik, alternatifMetin: "Arka, yakın" },
              { kimlik: on?.kimlik, alternatifMetin: "Ön" },
            ],
          },
        }),
      ),
    );
    expect(await galerisi(kimlik)).toEqual([
      { kimlik: arka?.kimlik, tur: "gorsel", alternatifMetin: "Arka, yakın" },
      { kimlik: on?.kimlik, tur: "gorsel", alternatifMetin: "Ön" },
    ]);
    // Eski ekran (videoyu hâlâ görüyor) çakışır; ürünün adı da yazılmaz.
    const eski = await urunDegisikligiUcu(
      istek("urun-degistir", sahip, {
        kimlik,
        urun: { ad: "Yazılmamalı" },
        galeri: {
          gorulen: ilk.map((oge) => oge.kimlik),
          ogeler: [{ kimlik: tanitim?.kimlik, alternatifMetin: "Tanıtım" }],
        },
      }),
    );
    expect(eski.status).toBe(409);
    expect(await hata(eski)).toMatchObject({
      kod: "cakisma",
      ayrinti: [{ alan: "galeri", kod: "galeri-degisti" }],
    });
    const [satir] = await vt
      .select({ ad: urunler.ad })
      .from(urunler)
      .where(eq(urunler.kimlik, kimlik));
    expect(satir?.ad).not.toBe("Yazılmamalı");
  });

  it("boş alternatif metin öğenin yoluyla döner, ürünün değişikliği de yazılmaz", async () => {
    const sahip = await cerez("magaza-sahibi");
    const kimlik = await ekle(sahip, { ad: `Metinsiz ${benzersiz()}`, vergiSinifi: null });
    const { dosya } = await veri<{ dosya: string }>(await yukle(sahip, await png()));
    const yanit = await urunDegisikligiUcu(
      istek("urun-degistir", sahip, {
        kimlik,
        urun: { ad: "Yazılmamalı" },
        galeri: { gorulen: [], ogeler: [{ dosya, alternatifMetin: "" }] },
      }),
    );
    expect(yanit.status).toBe(400);
    expect(await hata(yanit)).toMatchObject({
      kod: "dogrulama",
      ayrinti: [{ alan: "galeri.ogeler.0.alternatifMetin" }],
    });
    expect(await galerisi(kimlik)).toEqual([]);
    const [satir] = await vt
      .select({ ad: urunler.ad })
      .from(urunler)
      .where(eq(urunler.kimlik, kimlik));
    expect(satir?.ad).not.toBe("Yazılmamalı");
  });

  it("yükleme: görsel olmayan dosya alanın koduyla döner; görevli yükler; rolsüz, müşteri ve girişsiz geçmez", async () => {
    const sahip = await cerez("magaza-sahibi");
    const svg = await yukle(
      sahip,
      new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"),
    );
    expect(svg.status).toBe(400);
    expect(await hata(svg)).toMatchObject({ ayrinti: [{ alan: "dosya", kod: "tur-izinsiz" }] });
    expect((await yukle(await cerez("gorevli"), await png())).status).toBe(200);
    for (const [kisi, durum] of [
      ["rolsuz", 403],
      ["musteri", 401],
      ["girissiz", 401],
    ] as const) {
      expect((await yukle(await cerez(kisi), await png())).status, kisi).toBe(durum);
    }
    // Galeride olmayan dosya kimliği bağlanamaz.
    const kimlik = await ekle(sahip, { ad: `Olmayan ${benzersiz()}`, vergiSinifi: null });
    const olmayan = await urunDegisikligiUcu(
      istek("urun-degistir", sahip, {
        kimlik,
        urun: {},
        galeri: { gorulen: [], ogeler: [{ dosya: randomUUID(), alternatifMetin: "X" }] },
      }),
    );
    expect(await hata(olmayan)).toMatchObject({
      ayrinti: [{ alan: "galeri.ogeler.0.dosya", kod: "galeri-gorsel-gecersiz" }],
    });
  });
});
