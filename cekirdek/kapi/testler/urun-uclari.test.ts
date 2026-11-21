// Ürün ekranının uçları gerçek istek ve veritabanıyla (kart 0263): mağaza sahibi ürünü adla ekler (taslak başlar),
// bütün alanlarıyla değiştirir (kategori, marka, etiket, ilgili ürün, özellik değerleri, ağırlık sitenin biriminde ve
// sayı biçiminde, yayın zamanı sitenin saatiyle), boş isteğe bağlı alanı null ile boşaltır ve siler. Okunamayan
// ağırlık ve türüne uymayan özellik değeri alanın yoluyla, adet sınırı ve kendisini ilgili seçmek alanın koduyla
// döner, hiçbir şey yazılmaz. Açıklamadaki betik ve izinsiz bağlantı vitrinde temizlenir. Görevli ekler ve
// değiştirir, silemez; rolsüz yönetici, müşteri ve girişsiz ziyaretçi üç uçta geçmez ve hiçbir şey değişmez. Her
// rolün her uçtaki erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { etiketServisi } from "../../moduller/etiket/servis.ts";
import { kategoriEkle } from "../../moduller/kategori/servis.ts";
import { markaServisi } from "../../moduller/marka/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { ozellikServisi } from "../../moduller/ozellik/servis.ts";
import { aciklamayiTemizle } from "../../moduller/urun/aciklama.ts";
import { urunler } from "../../moduller/urun/model.ts";
import { siteninUrunServisi } from "../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { urunEkraniVerisi } from "../../yonetim-paneli/urunler/urun-verisi.ts";
import { urunDegisikligiUcu, urunEklemeUcu, urunSilmeUcu } from "../yonetici/urun.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(
  join(resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler"), "gecerli"),
);
const bicim = siteninBicimleyicisi(site.ayarlar);
const servis = siteninUrunServisi(site);
const yapan = { tur: "yonetici", kimlik: "00000000-0000-4000-8000-000000000001" } as const;

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const acilan = await denemeSitesiAc("urun-uclari");
  vt = acilan.vt;
  sil = acilan.sil;
  vi.stubEnv("VERITABANI_ADRESI", acilan.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  ortak[siteAnahtari] = site;
  await baglantiyiKapat();
}, 60_000);
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
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
