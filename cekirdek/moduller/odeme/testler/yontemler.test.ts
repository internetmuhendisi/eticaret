// Ödeme yöntemleri ve banka hesapları (kart 0214, karar 0141):
// - Müşterinin gördüğü yöntemler ayarın sırasıyla; kapalı yöntem yok, havale banka hesabı olmadan yok, kapıda ödeme
//   her açık seçeneğiyle ayrı satır; listede olmayan yöntem kapalı ve sonda.
// - Gerçek veritabanıyla: varsayılanlar, kaydetme ve değişiklik kaydı, en az bir açık yöntem, gün sınırı, genel ayar
//   değiştirmeyle değişmemesi; hesap ekleme (IBAN boşluksuz saklanır), IBAN hataları, aynı numara, hesap sınırı,
//   değiştirme, silme, olmayan hesap, sıralama ve eksik, fazla ya da tekrarlı sıralama.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { bankaHesabiSinirlari } from "../../../kayitlar/odeme.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { magazaAyarlari } from "../../magaza-ayarlari/model.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { kullanilabilirYontemler, odemeYontemiServisi } from "../yontemler.ts";

vi.setConfig({ testTimeout: 60_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const site: Site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const servis = odemeYontemiServisi(site);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});
const hazirla = async () => {
  const deneme = await denemeSitesiAc("yontem");
  temizlenecekler.push(deneme.sil);
  return deneme.vt;
};

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

const hesap = { kimlik: randomUUID(), banka: "B", sahip: "S", iban: "TR420001000000000000000001" };

describe("müşterinin gördüğü yöntemler", () => {
  it("ayarın sırasıyla, yalnız açık ve kullanılabilir olanlar", () => {
    expect(
      kullanilabilirYontemler(site, {
        odemeYontemleri: [
          { kod: "kapida-odeme", acik: true },
          { kod: "havale", acik: true },
        ],
        kapidaOdemeSecenekleri: ["kart", "nakit"],
        bankaHesaplari: [hesap],
      }),
    ).toEqual([
      { yontem: "kapida-odeme", secenek: "kart" },
      { yontem: "kapida-odeme", secenek: "nakit" },
      { yontem: "havale" },
    ]);
    // Banka hesabı yoksa havale yoktur; kapalı kapıda ödeme yoktur.
    expect(
      kullanilabilirYontemler(site, {
        odemeYontemleri: [
          { kod: "havale", acik: true },
          { kod: "kapida-odeme", acik: false },
        ],
        kapidaOdemeSecenekleri: ["nakit"],
        bankaHesaplari: [],
      }),
    ).toEqual([]);
    // Listede olmayan yöntem kapalıdır.
    expect(
      kullanilabilirYontemler(site, {
        odemeYontemleri: [{ kod: "havale", acik: true }],
        kapidaOdemeSecenekleri: ["nakit"],
        bankaHesaplari: [hesap],
      }),
    ).toEqual([{ yontem: "havale" }]);
  });
});

describe("ödeme yöntemi ayarları", () => {
  it("varsayılanlar, kaydetme ve değişiklik kaydı; listede olmayan yöntem sonda ve kapalı", async () => {
    const vt = await hazirla();
    expect(await servis.oku(vt)).toEqual({
      yontemler: [
        { kod: "havale", acik: true },
        { kod: "kapida-odeme", acik: false },
      ],
      kapidaOdemeSecenekleri: ["nakit"],
      havaleIptalSuresi: 3,
      bankaHesaplari: [],
    });
    const kim = yonetici();
    const sonuc = await servis.yontemleriDegistir(vt, kim, {
      yontemler: [
        { kod: "kapida-odeme", acik: true },
        { kod: "havale", acik: false },
      ],
      kapidaOdemeSecenekleri: ["kart", "nakit"],
      havaleIptalSuresi: "7",
    });
    expect(sonuc.yontemler).toEqual([
      { kod: "kapida-odeme", acik: true },
      { kod: "havale", acik: false },
    ]);
    expect(sonuc.havaleIptalSuresi).toBe(7);
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.islem, "magaza-ayari.degisti"));
    expect(kayitlar).toHaveLength(3);
    // Aynısı yeniden kayda girmez.
    await servis.yontemleriDegistir(vt, kim, {
      yontemler: sonuc.yontemler,
      kapidaOdemeSecenekleri: ["kart", "nakit"],
      havaleIptalSuresi: "7",
    });
    expect(
      await vt
        .select()
        .from(degisiklikKayitlari)
        .where(eq(degisiklikKayitlari.islem, "magaza-ayari.degisti")),
    ).toHaveLength(3);
    // Kayıtlı ayarda eksik yöntem sonda ve kapalı okunur.
    await siteninServisi(site).degistir(
      vt,
      kim,
      { odemeYontemleri: [{ kod: "kapida-odeme", acik: true }] },
      { kendiIslevi: true },
    );
    expect((await servis.oku(vt)).yontemler).toEqual([
      { kod: "kapida-odeme", acik: true },
      { kod: "havale", acik: false },
    ]);
  });

  // Kart 0224, karar 0144: sıra tek başına, hemen kaydedilir.
  it("yalnız sıra: açık-kapalı, seçenekler ve süre kalır; görünmeyen yöntem sonda; eksik, fazla, tekrarlı liste çakışma", async () => {
    const vt = await hazirla();
    const kim = yonetici();
    const kayitSayisi = async () =>
      (
        await vt
          .select()
          .from(degisiklikKayitlari)
          .where(eq(degisiklikKayitlari.islem, "magaza-ayari.degisti"))
      ).length;
    const once = await servis.oku(vt);
    const sonuc = await servis.yontemleriSirala(vt, kim, ["kapida-odeme", "havale"]);
    expect(sonuc).toEqual({
      ...once,
      yontemler: [
        { kod: "kapida-odeme", acik: false },
        { kod: "havale", acik: true },
      ],
    });
    expect(await kayitSayisi()).toBe(1);
    // Aynı sıra kayda girmez.
    await servis.yontemleriSirala(vt, kim, ["kapida-odeme", "havale"]);
    expect(await kayitSayisi()).toBe(1);
    // Sitede görünmeyen (eklentisi olmayan) yöntemin kayıtlı satırı sona korunur.
    await siteninServisi(site).degistir(
      vt,
      kim,
      {
        odemeYontemleri: [
          { kod: "kart", acik: true },
          { kod: "havale", acik: true },
          { kod: "kapida-odeme", acik: false },
        ],
      },
      { kendiIslevi: true },
    );
    await servis.yontemleriSirala(vt, kim, ["kapida-odeme", "havale"]);
    expect((await siteninServisi(site).oku(vt)).odemeYontemleri).toEqual([
      { kod: "kapida-odeme", acik: false },
      { kod: "havale", acik: true },
      { kod: "kart", acik: true },
    ]);
    const sayi = await kayitSayisi();
    for (const sira of [
      ["havale"],
      ["havale", "havale"],
      ["havale", "kapida-odeme", "havale"],
      ["havale", "kart"],
      ["kart", "havale", "kapida-odeme"],
    ] as const) {
      expect(await hatasi(servis.yontemleriSirala(vt, kim, [...sira]))).toEqual({
        kod: "cakisma",
        ayrinti: [{ alan: "sira", kod: "liste-degisti" }],
      });
    }
    expect(await kayitSayisi()).toBe(sayi);
  });

  // Bağımsız kontrolün bulgusu: sıralama ayarı kilidin dışında okuyup bütün listeyi yazarsa, aynı anda kaydedilen
  // açık-kapalı değişikliğini geri alır. Açık duran bir işlem ayar satırlarını kilitler ve açık-kapalıyı değiştirir;
  // sıralama kilitte beklerken işlem kaydedilir.
  it("aynı anda kaydedilen açık-kapalı değişikliği sıralamayla geri alınmaz (sıra kurularak)", async () => {
    const vt = await hazirla();
    const kim = yonetici();
    await servis.oku(vt);
    let birak = () => {};
    const kapi = new Promise<void>((bitti) => {
      birak = bitti;
    });
    let kilitlendi = () => {};
    const kilitAlindi = new Promise<void>((bitti) => {
      kilitlendi = bitti;
    });
    const acikIslem = vt.transaction(async (islem) => {
      await islem.select().from(magazaAyarlari).for("update");
      kilitlendi();
      await kapi;
      await islem
        .update(magazaAyarlari)
        .set({
          deger: [
            { kod: "havale", acik: false },
            { kod: "kapida-odeme", acik: true },
          ],
        })
        .where(eq(magazaAyarlari.anahtar, "odemeYontemleri"));
    });
    await kilitAlindi;
    const siralama = servis.yontemleriSirala(vt, kim, ["kapida-odeme", "havale"]);
    await kilitBekleyeniGor(vt);
    birak();
    await acikIslem;
    expect((await siralama).yontemler).toEqual([
      { kod: "kapida-odeme", acik: true },
      { kod: "havale", acik: false },
    ]);
  });

  it("en az bir açık yöntem ve gün sınırı; genel ayar değiştirme bu ayarları değiştiremez", async () => {
    const vt = await hazirla();
    const hata = await hatasi(
      servis.yontemleriDegistir(vt, yonetici(), {
        yontemler: [
          { kod: "havale", acik: false },
          { kod: "kapida-odeme", acik: false },
        ],
        kapidaOdemeSecenekleri: ["nakit"],
        havaleIptalSuresi: "31",
      }),
    );
    expect(hata).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "yontemler", kod: "en-az-bir-yontem" },
        { alan: "havaleIptalSuresi", kod: "gun-gecersiz" },
      ],
    });
    for (const gun of ["0", "üç", "1.5", "-1"]) {
      expect(
        (
          await hatasi(
            servis.yontemleriDegistir(vt, yonetici(), {
              yontemler: [
                { kod: "havale", acik: false },
                { kod: "kapida-odeme", acik: true },
              ],
              kapidaOdemeSecenekleri: ["nakit"],
              havaleIptalSuresi: gun,
            }),
          )
        ).ayrinti,
      ).toEqual([{ alan: "havaleIptalSuresi", kod: "gun-gecersiz" }]);
    }
    for (const ayar of [
      { odemeYontemleri: [] },
      { kapidaOdemeSecenekleri: ["kart" as const] },
      { havaleIptalSuresi: 5 },
      { bankaHesaplari: [] },
    ]) {
      await expect(siteninServisi(site).degistir(vt, yonetici(), ayar)).rejects.toThrow(
        /kendi işleviyle/,
      );
    }
    expect((await servis.oku(vt)).havaleIptalSuresi).toBe(3);
  });
});

describe("müşterinin kullanabileceği yöntem", () => {
  it("hesabı olmayan havale tek açık yöntem olarak kaydedilmez; son hesap yalnız başka yöntem açıkken silinir", async () => {
    const vt = await hazirla();
    const kim = yonetici();
    const yalnizHavale = {
      yontemler: [
        { kod: "havale" as const, acik: true },
        { kod: "kapida-odeme" as const, acik: false },
      ],
      kapidaOdemeSecenekleri: ["nakit" as const],
      havaleIptalSuresi: "3",
    };
    expect(await hatasi(servis.yontemleriDegistir(vt, kim, yalnizHavale))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "yontemler", kod: "en-az-bir-yontem" }],
    });
    const { bankaHesaplari } = await servis.hesapEkle(vt, kim, {
      banka: "B",
      sahip: "S",
      iban: "TR420001000000000000000001",
    });
    await servis.yontemleriDegistir(vt, kim, yalnizHavale);
    const [tek] = bankaHesaplari;
    if (tek === undefined) throw new Error("Hesap yok.");
    expect(await hatasi(servis.hesapSil(vt, kim, tek.kimlik))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "hesaplar", kod: "son-yontem" }],
    });
    expect((await servis.oku(vt)).bankaHesaplari).toHaveLength(1);
    await servis.yontemleriDegistir(vt, kim, {
      ...yalnizHavale,
      yontemler: [
        { kod: "havale", acik: true },
        { kod: "kapida-odeme", acik: true },
      ],
    });
    expect((await servis.hesapSil(vt, kim, tek.kimlik)).bankaHesaplari).toEqual([]);
  });
});

describe("banka hesapları", () => {
  it("ekleme, IBAN hataları, aynı numara, değiştirme, silme ve sıralama", async () => {
    const vt = await hazirla();
    const kim = yonetici();
    const bir = await servis.hesapEkle(vt, kim, {
      banka: " Deneme Bankası ",
      sahip: "Deneme Ticaret",
      iban: "tr42 0001 0000 0000 0000 0000 01",
    });
    expect(bir.bankaHesaplari).toMatchObject([
      { banka: "Deneme Bankası", sahip: "Deneme Ticaret", iban: "TR420001000000000000000001" },
    ]);
    for (const [iban, kod] of [
      ["TR42000100000000000000001", "iban-uzunluk"],
      ["TR430001000000000000000001", "iban-kontrol"],
      ["ZZ420001000000000000000001", "iban-ulke"],
      ["IBAN", "iban-bicimi"],
      ["TR42 0001 0000 0000 0000 0000 01", "iban-ayni"],
    ] as const) {
      expect(await hatasi(servis.hesapEkle(vt, kim, { banka: "B", sahip: "S", iban }))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "iban", kod }],
      });
    }
    const iki = await servis.hesapEkle(vt, kim, {
      banka: "İkinci",
      sahip: "Deneme Ticaret",
      iban: "TR370002000000000000000002",
    });
    const [ilk, ikinci] = iki.bankaHesaplari;
    if (ilk === undefined || ikinci === undefined) throw new Error("Hesap yok.");
    // Değiştirme: kendi numarası "aynı" sayılmaz, başkasınınki sayılır.
    await servis.hesapDegistir(vt, kim, ilk.kimlik.toUpperCase(), {
      banka: "Yeni ad",
      sahip: "Deneme Ticaret",
      iban: ilk.iban,
    });
    expect(
      (
        await hatasi(
          servis.hesapDegistir(vt, kim, ilk.kimlik, { banka: "X", sahip: "S", iban: ikinci.iban }),
        )
      ).ayrinti,
    ).toEqual([{ alan: "iban", kod: "iban-ayni" }]);
    expect(
      (
        await hatasi(
          servis.hesapDegistir(vt, kim, randomUUID(), { banka: "X", sahip: "S", iban: ilk.iban }),
        )
      ).kod,
    ).toBe("bulunamadi");
    // Sıralama bütün listeyi ister.
    const sirali = await servis.hesaplariSirala(vt, kim, [ikinci.kimlik, ilk.kimlik.toUpperCase()]);
    expect(sirali.bankaHesaplari.map((h) => h.banka)).toEqual(["İkinci", "Yeni ad"]);
    for (const sira of [
      [ilk.kimlik],
      [ilk.kimlik, ikinci.kimlik, randomUUID()],
      [ilk.kimlik, ilk.kimlik],
    ]) {
      expect(await hatasi(servis.hesaplariSirala(vt, kim, sira))).toEqual({
        kod: "cakisma",
        ayrinti: [{ alan: "sira", kod: "liste-degisti" }],
      });
    }
    const silindi = await servis.hesapSil(vt, kim, ikinci.kimlik);
    expect(silindi.bankaHesaplari.map((h) => h.banka)).toEqual(["Yeni ad"]);
    expect((await hatasi(servis.hesapSil(vt, kim, ikinci.kimlik))).kod).toBe("bulunamadi");
  });

  it("hesap sınırı", async () => {
    const vt = await hazirla();
    const kim = yonetici();
    // Sınıra kadar geçerli numaralar: kontrol hanesi hesaplanır.
    const numara = (sira: number) => {
      const govde = `0003${String(sira).padStart(18, "0")}`;
      for (let kontrol = 2; kontrol < 100; kontrol++) {
        const aday = `TR${String(kontrol).padStart(2, "0")}${govde}`;
        const duzen = `${aday.slice(4)}2927${aday.slice(2, 4)}`;
        if (BigInt(duzen) % 97n === 1n) return aday;
      }
      throw new Error("Numara bulunamadı.");
    };
    for (let sira = 0; sira < bankaHesabiSinirlari.enCok; sira++) {
      await servis.hesapEkle(vt, kim, { banka: `B${sira}`, sahip: "S", iban: numara(sira) });
    }
    expect(
      await hatasi(servis.hesapEkle(vt, kim, { banka: "Fazla", sahip: "S", iban: numara(99) })),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "hesaplar", kod: "hesap-siniri" }] });
  });
});
