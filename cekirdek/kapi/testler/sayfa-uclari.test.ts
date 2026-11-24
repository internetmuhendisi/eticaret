// Sabit sayfa uçları gerçek istek ve veritabanıyla (kart 0273): mağaza sahibi sayfayı ekler, değiştirir ve siler; eski
// ekranın değişikliği 409 alır ve hiçbir şey yazılmaz; hatalı alan alanın yolu ve koduyla 400 alır. Menünün içerik
// araması sayfayı ve blog yazısını bulur, öğe sayfaya bağlanır. Görevli, rolsüz yönetici, müşteri ve girişsiz ziyaretçi
// reddedilir, hiçbir şey değişmez. Her rolün erişimini ayrıca rol-uc-erisimi.test.ts dener.
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { sabitSayfalariOku, sabitSayfaOku } from "../../moduller/icerik/sayfa.ts";
import { icerikServisi } from "../../moduller/icerik/servis.ts";
import { menuEkle } from "../../moduller/menu/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { ogeEklemeUcu } from "../yonetici/menu.ts";
import {
  icerikAramaUcu,
  sayfaDegisikligiUcu,
  sayfaEklemeUcu,
  sayfaSilmeUcu,
} from "../yonetici/sayfa.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const site = siteKlasorunuOku(join(ornekler, "gecerli"));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

beforeAll(async () => {
  const deneme = await denemeSitesiAc("sayfa-uclari");
  vt = deneme.vt;
  sil = deneme.sil;
  vi.stubEnv("VERITABANI_ADRESI", deneme.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
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
});

const hesap = async (kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri") => {
  sayac += 1;
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const eposta = `sayfa-ucu${sayac}-${randomBytes(3).toString("hex")}@ornek.test`;
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

const veri = async <T>(yanit: Response): Promise<T> => ((await yanit.json()) as { veri: T }).veri;

describe("sabit sayfa uçları", () => {
  it("mağaza sahibi sayfayı ekler, değiştirir ve siler; eski ekran 409; hatalı alan 400", async () => {
    const sahip = await hesap("magaza-sahibi");
    const ekleme = await sayfaEklemeUcu(
      istek("sayfa-ekle", sahip, {
        sayfa: { baslik: "Uçtan sayfa", icerik: "<p>İçerik</p>", aciklama: "Kısa" },
      }),
    );
    expect(ekleme.status).toBe(200);
    const { kimlik } = await veri<{ kimlik: string }>(ekleme);
    const sayfa = await sabitSayfaOku(vt, kimlik);
    expect(sayfa).toMatchObject({ adresAdi: "uctan-sayfa", durum: "taslak", aciklama: "Kısa" });
    const gorulen = sayfa?.guncellenmeZamani.toISOString() ?? "";
    const degisiklik = await sayfaDegisikligiUcu(
      istek("sayfa-degistir", sahip, {
        kimlik,
        gorulen,
        sayfa: { durum: "yayinda", aciklama: null },
      }),
    );
    expect(degisiklik.status).toBe(200);
    const yeniGorulen = (await veri<{ gorulen: string }>(degisiklik)).gorulen;
    expect(await sabitSayfaOku(vt, kimlik)).toMatchObject({ durum: "yayinda", aciklama: null });
    const eski = await sayfaDegisikligiUcu(
      istek("sayfa-degistir", sahip, { kimlik, gorulen, sayfa: { baslik: "Ezilmemeli" } }),
    );
    expect(eski.status).toBe(409);
    expect((await sabitSayfaOku(vt, kimlik))?.baslik).toBe("Uçtan sayfa");
    const hatali = await sayfaDegisikligiUcu(
      istek("sayfa-degistir", sahip, {
        kimlik,
        gorulen: yeniGorulen,
        sayfa: { adresAdi: "Büyük Harf", baslik: "" },
      }),
    );
    expect(hatali.status).toBe(400);
    expect(await hatali.json()).toMatchObject({
      hata: {
        kod: "dogrulama",
        ayrinti: expect.arrayContaining([{ alan: "adresAdi", kod: "adres-adi-bicimi" }]),
      },
    });
    // Tanımsız alan uçta da reddedilir (servisin sıkı şeması).
    expect(
      (
        await sayfaDegisikligiUcu(
          istek("sayfa-degistir", sahip, { kimlik, gorulen: yeniGorulen, sayfa: { kapak: null } }),
        )
      ).status,
    ).toBe(400);
    const silme = await sayfaSilmeUcu(istek("sayfa-sil", sahip, { kimlik }));
    expect(silme.status).toBe(200);
    expect(await sabitSayfaOku(vt, kimlik)).toBeNull();
    expect((await sayfaSilmeUcu(istek("sayfa-sil", sahip, { kimlik }))).status).toBe(404);
  });

  it("içerik araması sayfayı ve blog yazısını bulur; öğe sayfaya bağlanır; katalog türü kabul edilmez", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { kimlik } = await veri<{ kimlik: string }>(
      await sayfaEklemeUcu(istek("sayfa-ekle", sahip, { sayfa: { baslik: "Arama Sayfası" } })),
    );
    await icerikServisi(() => "Europe/Istanbul").yaziEkle(
      vt,
      { tur: "yonetici", kimlik: crypto.randomUUID() },
      { baslik: "Arama yazısı" },
    );
    const bulunan = await veri<{ kayitlar: { kimlik: string; ad: string; adresAdi: string }[] }>(
      await icerikAramaUcu(istek("icerik-ara?tur=sayfa&ara=ARAMA%20SAYFASI", sahip)),
    );
    expect(bulunan.kayitlar).toEqual([{ kimlik, ad: "Arama Sayfası", adresAdi: "arama-sayfasi" }]);
    const yazilar = await veri<{ kayitlar: { ad: string }[] }>(
      await icerikAramaUcu(istek("icerik-ara?tur=blog-yazisi&ara=arama", sahip)),
    );
    expect(yazilar.kayitlar.map((k) => k.ad)).toEqual(["Arama yazısı"]);
    expect((await icerikAramaUcu(istek("icerik-ara?tur=urun&ara=a", sahip))).status).toBe(400);
    const menu = await menuEkle(
      vt,
      { tur: "yonetici", kimlik: crypto.randomUUID() },
      { kod: `alt-${sayac}`, ad: "Alt", tur: "elle" },
    );
    const oge = await ogeEklemeUcu(
      istek("menu-ogesi-ekle", sahip, { menu, oge: { hedef: { tur: "sayfa", kimlik } } }),
    );
    expect(oge.status).toBe(200);
  });

  it("görevli, rolsüz, müşteri ve girişsiz reddedilir; hiçbir şey değişmez", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { kimlik } = await veri<{ kimlik: string }>(
      await sayfaEklemeUcu(istek("sayfa-ekle", sahip, { sayfa: { baslik: "Korunan" } })),
    );
    const onceki = await sabitSayfaOku(vt, kimlik);
    const kisiler = [
      { oturum: await hesap("gorevli"), kod: 403 },
      { oturum: await hesap("rolsuz"), kod: 403 },
      { oturum: await hesap("musteri"), kod: 401 },
      { oturum: undefined, kod: 401 },
    ];
    const sayi = (await sabitSayfalariOku(vt)).length;
    for (const { oturum, kod } of kisiler) {
      expect(
        (await sayfaEklemeUcu(istek("sayfa-ekle", oturum, { sayfa: { baslik: "Yetkisiz" } })))
          .status,
      ).toBe(kod);
      expect(
        (
          await sayfaDegisikligiUcu(
            istek("sayfa-degistir", oturum, {
              kimlik,
              gorulen: onceki?.guncellenmeZamani.toISOString(),
              sayfa: { baslik: "Yetkisiz" },
            }),
          )
        ).status,
      ).toBe(kod);
      expect((await sayfaSilmeUcu(istek("sayfa-sil", oturum, { kimlik }))).status).toBe(kod);
      expect((await icerikAramaUcu(istek("icerik-ara?tur=sayfa", oturum))).status).toBe(kod);
    }
    expect((await sabitSayfalariOku(vt)).length).toBe(sayi);
    expect(await sabitSayfaOku(vt, kimlik)).toEqual(onceki);
  });
});
