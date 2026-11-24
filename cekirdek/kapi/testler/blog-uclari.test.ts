// Blog uçları gerçek istek, veritabanı ve klasörle (kart 0272, karar 0176): mağaza sahibi kapağı yükler, yazıyı kapağı,
// kategorisi ve zamanıyla ekler, değiştirir, siler; eski ekranın değişikliği 409 alır ve hiçbir şey yazılmaz; hatalı
// alan alanın yolu ve koduyla 400 alır. Liste ucu süzer ve sayar. Kategoriler eklenir, sıralanır, silinir. Blog ayarı
// yalnız mağaza ayarı izniyle değişir. Görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi reddedilir, hiçbir şey
// değişmez. Her rolün erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { blogKategorileriniOku, blogYazisiOku } from "../../moduller/icerik/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  blogAyariUcu,
  blogKapagiYuklemeUcu,
  blogKategoriSiralamaUcu,
  blogKategorisiEklemeUcu,
  blogKategorisiSilmeUcu,
  blogListesiUcu,
  blogYazisiDegisikligiUcu,
  blogYazisiEklemeUcu,
  blogYazisiSilmeUcu,
} from "../yonetici/blog.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;
const klasor = mkdtempSync(join(tmpdir(), "blog-uclari-"));

beforeAll(async () => {
  const deneme = await denemeSitesiAc("blog-uclari");
  vt = deneme.vt;
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv("DOSYA_KLASORU", klasor);
  await baglantiyiKapat();
}, 60_000);
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
  rmSync(klasor, { recursive: true, force: true });
});

const hesap = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri") => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const eposta = `blog-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, tur, { eposta, sifre: "uzun-bir-deneme-sifresi" });
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

const istek = (yol: string, oturum: string | undefined, govde?: unknown) =>
  new Request(`http://magaza.ornek.test/kapi/yonetici/${yol}`, {
    method: govde === undefined ? "GET" : "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });

const dosyaIstegi = (oturum: string | undefined, icerik: Uint8Array) =>
  new Request("http://magaza.ornek.test/kapi/yonetici/blog-kapagi-yukle", {
    method: "POST",
    headers: {
      "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
      ...(oturum === undefined ? {} : { cookie: oturum }),
    },
    body: icerik,
    duplex: "half",
  } as RequestInit);

const veri = async <T>(yanit: Response): Promise<T> => ((await yanit.json()) as { veri: T }).veri;

describe("blog uçları", () => {
  it("mağaza sahibi kapağı yükler, yazıyı ekler, değiştirir ve siler; liste süzer", async () => {
    const sahip = await hesap("magaza-sahibi");
    const kategori = await veri<{ kimlik: string }>(
      await blogKategorisiEklemeUcu(
        istek("blog-kategorisi-ekle", sahip, { kategori: { ad: "Rehber" } }),
      ),
    );
    const png = await sharp({
      create: { width: 400, height: 250, channels: 3, background: { r: 10, g: 90, b: 160 } },
    })
      .png()
      .toBuffer();
    const yukleme = await blogKapagiYuklemeUcu(dosyaIstegi(sahip, png));
    expect(yukleme.status).toBe(200);
    const kapak = await veri<{ dosya: string; genislik: number }>(yukleme);
    expect(kapak.genislik).toBe(400);
    // Görsel olmayan dosya alanın koduyla reddedilir.
    const metinDosyasi = await blogKapagiYuklemeUcu(
      dosyaIstegi(sahip, new TextEncoder().encode("görsel değil")),
    );
    expect(metinDosyasi.status).toBe(400);
    const ekleme = await blogYazisiEklemeUcu(
      istek("blog-yazisi-ekle", sahip, {
        yazi: {
          baslik: "Uçtan yazı",
          ozet: "Özet",
          icerik: "<p>İçerik</p>",
          kapak: { dosya: kapak.dosya, metin: "Mavi kapak" },
          kategori: kategori.kimlik,
          durum: "zamanlanmis",
          yayinZamani: "2031-01-01T09:00",
        },
      }),
    );
    expect(ekleme.status).toBe(200);
    const { kimlik } = await veri<{ kimlik: string }>(ekleme);
    const yazi = await blogYazisiOku(vt, kimlik);
    expect(yazi).toMatchObject({
      adresAdi: "uctan-yazi",
      durum: "zamanlanmis",
      kategori: kategori.kimlik,
      kapak: { dosya: kapak.dosya, metin: "Mavi kapak" },
    });
    expect(yazi?.yayinZamani?.toISOString()).toBe("2031-01-01T06:00:00.000Z");
    const gorulen = yazi?.guncellenmeZamani.toISOString() ?? "";
    const degisiklik = await blogYazisiDegisikligiUcu(
      istek("blog-yazisi-degistir", sahip, {
        kimlik,
        gorulen,
        yazi: { durum: "yayinda", kapak: null, kategori: null },
      }),
    );
    expect(degisiklik.status).toBe(200);
    const yeniGorulen = (await veri<{ gorulen: string }>(degisiklik)).gorulen;
    expect(await blogYazisiOku(vt, kimlik)).toMatchObject({
      durum: "yayinda",
      kapak: null,
      kategori: null,
    });
    // Eski ekranın değişikliği 409 alır, hiçbir şey yazılmaz.
    const eski = await blogYazisiDegisikligiUcu(
      istek("blog-yazisi-degistir", sahip, { kimlik, gorulen, yazi: { baslik: "Ezilmemeli" } }),
    );
    expect(eski.status).toBe(409);
    expect((await blogYazisiOku(vt, kimlik))?.baslik).toBe("Uçtan yazı");
    // Hatalı alan yolu ve koduyla.
    const hatali = await blogYazisiDegisikligiUcu(
      istek("blog-yazisi-degistir", sahip, {
        kimlik,
        gorulen: yeniGorulen,
        yazi: { adresAdi: "Büyük Harf", durum: "zamanlanmis" },
      }),
    );
    expect(hatali.status).toBe(400);
    expect(await hatali.json()).toMatchObject({
      hata: { kod: "dogrulama", ayrinti: [{ alan: "adresAdi", kod: "adres-adi-bicimi" }] },
    });
    // Liste: arama ve durum sekmesi, sayılar.
    const liste = await veri<{
      satirlar: { kimlik: string }[];
      sekmeSayilari: Record<string, number>;
    }>(await blogListesiUcu(istek("blog-yazilari?durum=yayinda&ara=UCTAN", sahip)));
    expect(liste.satirlar.map((s) => s.kimlik)).toEqual([kimlik]);
    expect(liste.sekmeSayilari).toMatchObject({ yayinda: 1, "": 1 });
    const silme = await blogYazisiSilmeUcu(istek("blog-yazisi-sil", sahip, { kimlik }));
    expect(silme.status).toBe(200);
    expect(await blogYazisiOku(vt, kimlik)).toBeNull();
    expect((await blogYazisiSilmeUcu(istek("blog-yazisi-sil", sahip, { kimlik }))).status).toBe(
      404,
    );
  });

  it("kategoriler sıralanır ve silinir; eksik sıralama 409", async () => {
    const sahip = await hesap("magaza-sahibi");
    const ekle = async (ad: string) =>
      (
        await veri<{ kimlik: string }>(
          await blogKategorisiEklemeUcu(istek("blog-kategorisi-ekle", sahip, { kategori: { ad } })),
        )
      ).kimlik;
    const a = await ekle("Sıra A");
    const b = await ekle("Sıra B");
    const hepsi = (await blogKategorileriniOku(vt)).map((k) => k.kimlik);
    const yeni = [...hepsi.filter((k) => k !== a && k !== b), b, a];
    expect(
      (await blogKategoriSiralamaUcu(istek("blog-kategorileri-sirala", sahip, { kimlikler: [a] })))
        .status,
    ).toBe(409);
    expect(
      (await blogKategoriSiralamaUcu(istek("blog-kategorileri-sirala", sahip, { kimlikler: yeni })))
        .status,
    ).toBe(200);
    expect((await blogKategorileriniOku(vt)).map((k) => k.kimlik).slice(-2)).toEqual([b, a]);
    expect(
      (await blogKategorisiSilmeUcu(istek("blog-kategorisi-sil", sahip, { kimlik: a }))).status,
    ).toBe(200);
    expect((await blogKategorileriniOku(vt)).map((k) => k.kimlik)).not.toContain(a);
  });

  it("blog ayarı mağaza sahibiyle değişir; görevli, rolsüz, müşteri ve girişsiz reddedilir, hiçbir şey değişmez", async () => {
    const sahip = await hesap("magaza-sahibi");
    expect((await blogAyariUcu(istek("blog-ayari", sahip, { blogAcik: true }))).status).toBe(200);
    expect(await siteninServisi(site).tekOku(vt, "blogAcik")).toBe(true);
    const onceYazilar = (await blogListesiUcu(istek("blog-yazilari", sahip))).status;
    expect(onceYazilar).toBe(200);
    const kisiler = [
      { oturum: await hesap("gorevli"), kod: 403 },
      { oturum: await hesap("rolsuz"), kod: 403 },
      { oturum: await hesap("musteri"), kod: 401 },
      { oturum: undefined, kod: 401 },
    ];
    const kategoriSayisi = (await blogKategorileriniOku(vt)).length;
    for (const { oturum, kod } of kisiler) {
      expect((await blogAyariUcu(istek("blog-ayari", oturum, { blogAcik: false }))).status).toBe(
        kod,
      );
      expect(
        (
          await blogYazisiEklemeUcu(
            istek("blog-yazisi-ekle", oturum, { yazi: { baslik: "Yetkisiz" } }),
          )
        ).status,
      ).toBe(kod);
      expect(
        (
          await blogKategorisiEklemeUcu(
            istek("blog-kategorisi-ekle", oturum, { kategori: { ad: "Yetkisiz" } }),
          )
        ).status,
      ).toBe(kod);
      expect((await blogListesiUcu(istek("blog-yazilari", oturum))).status).toBe(kod);
    }
    expect(await siteninServisi(site).tekOku(vt, "blogAcik")).toBe(true);
    expect((await blogKategorileriniOku(vt)).length).toBe(kategoriSayisi);
  });
});
