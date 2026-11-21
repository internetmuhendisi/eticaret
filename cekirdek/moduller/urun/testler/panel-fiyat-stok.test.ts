// Ürün ekranının fiyat ve stok bölümlerinin servisi gerçek veritabanıyla (kart 0265): basit ürünün fiyatı sitenin para
// biçimiyle okunur ve indirimiyle yazılır; okunamayan ve boş tutar alanın yoluyla döner; birleşimlerin fiyatı ve stoğu
// değer sıralarıyla bulunur, ortak indirim zamanı yalnız indirimli satıra yazılır; stok görülen miktarla, arada
// değiştiyse çakışma ve hiçbir şey yazılmaz; ortak sebep ve "Diğer"de zorunlu not; fiyat ve stok izni ayrı denetlenir;
// ekranın gördüğü birleşim yoksa "varyant-degisti". Fiyat geçmişi yazanı tutar, birden çok birimin geçmişi tek listede
// birimiyle ve sayfa sayfa gelir; stok geçmişi de; sepette ayrılan miktar süresi dolmamış ayırmaların toplamıdır.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { bicimleyiciOlustur } from "../../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { fiyatServisi } from "../../fiyat/servis.ts";
import { odemeOturumlari } from "../../odeme/model.ts";
import { birimStoklari } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { type PanelFiyatStok, panelFiyatStokYaz } from "../panel-fiyat-stok.ts";
import { urunServisi } from "../servis.ts";

const servis = urunServisi(() => "Europe/Istanbul");
const fiyat = fiyatServisi(() => ({ saatDilimi: "Europe/Istanbul", paraBirimi: "XTS" }));
const stok = stokServisi();
const bicimleyici = bicimleyiciOlustur({
  dil: "tr",
  saatDilimi: "Europe/Istanbul",
  para: { paraBirimi: "XTS", simgeYeri: "sonda", simgeBoslugu: true, ondalikSayisi: 2 },
  sayi: { binlikAyirici: ".", ondalikAyirici: "," },
});
const kim: DegisikligiYapan = { tur: "yonetici", kimlik: randomUUID() };
const tamYetki = { fiyat: true, stok: true };

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("panel-fiyat-stok");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const yaz = (vt: Veritabani, urun: string, girdi: PanelFiyatStok, izinler = tamYetki) =>
  vt.transaction((islem) =>
    panelFiyatStokYaz(islem, kim, urun, girdi, { fiyat, stok, bicimleyici }, izinler),
  );

const basitUrun = async (vt: Veritabani) => {
  const urun = await servis.urunEkle(vt, kim, { ad: "Termos", vergiSinifi: null });
  const birim = (await servis.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  return { urun, birim };
};

// Beden (S, M), dört birim değil iki birleşim: S ve M.
const secenekliUrun = async (vt: Veritabani) => {
  const urun = await servis.urunEkle(vt, kim, { ad: "Tişört", vergiSinifi: null });
  await servis.varyantlariKaydet(
    vt,
    kim,
    urun,
    { secenekler: [{ ad: "Beden", degerler: [{ ad: "S" }, { ad: "M" }] }], birlesimler: [] },
    { silebilir: true },
  );
  const okunan = await servis.urunuOku(vt, urun);
  const [s, m] = okunan?.birimler.filter((b) => !b.silindi).map((b) => b.kimlik) ?? [];
  return { urun, s: s ?? "", m: m ?? "" };
};

describe("fiyat", () => {
  it("basit ürünün fiyatı sitenin biçimiyle okunur, indirimiyle ve sitenin saatiyle yazılır; geçmiş yazanı tutar", async () => {
    const vt = await siteAc();
    const { urun, birim } = await basitUrun(vt);
    await yaz(vt, urun, {
      indirimBaslangici: "2026-12-01T00:00",
      indirimBitisi: null,
      birimler: [
        { yer: "fiyat", satisFiyati: "1.249,90", indirimliFiyat: "999", ortakZaman: true },
      ],
    });
    expect(await fiyat.fiyatOku(vt, birim)).toMatchObject({
      satisFiyati: 124990,
      indirimliFiyat: 99900,
      indirimBaslangici: new Date("2026-11-30T21:00:00Z"),
      indirimBitisi: null,
    });
    const [satir] = await fiyat.panelFiyatGecmisi(vt, [birim]);
    expect(satir).toMatchObject({ birim, satisFiyati: 124990, kim });
  });

  it("okunamayan ve boş tutar alanın yoluyla döner, hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    const { urun, birim } = await basitUrun(vt);
    expect(
      await hatasi(yaz(vt, urun, { birimler: [{ yer: "fiyat", satisFiyati: "on beş" }] })),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "fiyat.satisFiyati", kod: "tutar-okunamadi" }],
    });
    expect(
      await hatasi(yaz(vt, urun, { birimler: [{ yer: "fiyat", satisFiyati: "  " }] })),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "fiyat.satisFiyati", kod: "too_small" }] });
    // Fiyat servisinin kuralı da alanın yoluyla: indirimli fiyat satıştan büyük olamaz.
    expect(
      await hatasi(
        yaz(vt, urun, {
          birimler: [{ yer: "fiyat", satisFiyati: "10", indirimliFiyat: "20" }],
        }),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "fiyat.indirimliFiyat", kod: "indirim-buyuk" }],
    });
    expect(await fiyat.fiyatOku(vt, birim)).toBeUndefined();
  });

  it("birleşimin fiyatı değer sırasıyla bulunur; ortak indirim zamanı yalnız indirimli satıra yazılır", async () => {
    const vt = await siteAc();
    const { urun, s, m } = await secenekliUrun(vt);
    await yaz(vt, urun, {
      indirimBaslangici: null,
      indirimBitisi: "2026-12-08T00:00",
      birimler: [
        { yer: "birlesimler.0", birlesim: [0], satisFiyati: "100", indirimliFiyat: "" },
        {
          yer: "birlesimler.1",
          birlesim: [1],
          satisFiyati: "120",
          indirimliFiyat: "90",
          ortakZaman: true,
        },
      ],
    });
    expect(await fiyat.fiyatOku(vt, s)).toMatchObject({ satisFiyati: 10000, indirimBitisi: null });
    expect(await fiyat.fiyatOku(vt, m)).toMatchObject({
      satisFiyati: 12000,
      indirimliFiyat: 9000,
      indirimBitisi: new Date("2026-12-07T21:00:00Z"),
    });
    // Ortak zamanın hatası ortak alanda.
    expect(
      await hatasi(
        yaz(vt, urun, {
          indirimBaslangici: "2026-12-10T00:00",
          indirimBitisi: "2026-12-01T00:00",
          birimler: [
            {
              yer: "birlesimler.1",
              birlesim: [1],
              satisFiyati: "120",
              indirimliFiyat: "90",
              ortakZaman: true,
            },
          ],
        }),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "fiyat.indirimBitisi", kod: "indirim-sirasi" }],
    });
  });

  it("ekranın gördüğü birleşim yoksa ya da seçenekli üründe basit satır gelirse varyant-degisti", async () => {
    const vt = await siteAc();
    const { urun } = await secenekliUrun(vt);
    expect(
      await hatasi(
        yaz(vt, urun, { birimler: [{ yer: "birlesimler.4", birlesim: [4], satisFiyati: "1" }] }),
      ),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "birlesimler.4", kod: "varyant-degisti" }] });
    expect(await hatasi(yaz(vt, urun, { birimler: [{ yer: "fiyat", satisFiyati: "1" }] }))).toEqual(
      { kod: "cakisma", ayrinti: [{ alan: "fiyat", kod: "varyant-degisti" }] },
    );
  });
});

describe("bağımsız kontrolün bulguları", () => {
  it("ekranın gördüğü birim kimliği tutmazsa (sıra değişmiş) satır başka birime yazılmaz: varyant-degisti", async () => {
    const vt = await siteAc();
    const { urun, s, m } = await secenekliUrun(vt);
    // Ekran M'yi ikinci sırada görmüş; sunucuda ikinci sıradaki S'nin kimliği değil.
    expect(
      await hatasi(
        yaz(vt, urun, {
          birimler: [{ yer: "birlesimler.1", birlesim: [1], birim: s, satisFiyati: "10" }],
        }),
      ),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "birlesimler.1", kod: "varyant-degisti" }] });
    expect(await fiyat.fiyatOku(vt, s)).toBeUndefined();
    expect(await fiyat.fiyatOku(vt, m)).toBeUndefined();
    // Doğru kimlikle yazılır; basit üründe de.
    await yaz(vt, urun, {
      birimler: [{ yer: "birlesimler.1", birlesim: [1], birim: m, satisFiyati: "10" }],
    });
    expect((await fiyat.fiyatOku(vt, m))?.satisFiyati).toBe(1000);
    const basit = await basitUrun(vt);
    expect(
      await hatasi(
        yaz(vt, basit.urun, { birimler: [{ yer: "fiyat", birim: s, satisFiyati: "10" }] }),
      ),
    ).toMatchObject({ kod: "cakisma" });
  });

  it("ortak zaman istenmeyen satırda birimin kendi indirim zamanı kalır, istenen satır ortak zamanı alır", async () => {
    const vt = await siteAc();
    const { urun, s, m } = await secenekliUrun(vt);
    await fiyat.fiyatYaz(vt, kim, s, {
      satisFiyati: 10000,
      indirimliFiyat: 8000,
      indirimBitisi: "2030-01-05T10:30",
    });
    await fiyat.fiyatYaz(vt, kim, m, { satisFiyati: 10000, indirimliFiyat: 8000 });
    await yaz(vt, urun, {
      indirimBaslangici: null,
      indirimBitisi: "2030-02-01T00:00",
      birimler: [
        { yer: "birlesimler.0", birlesim: [0], satisFiyati: "110", indirimliFiyat: "80" },
        {
          yer: "birlesimler.1",
          birlesim: [1],
          satisFiyati: "100",
          indirimliFiyat: "70",
          ortakZaman: true,
        },
      ],
    });
    expect(await fiyat.fiyatOku(vt, s)).toMatchObject({
      satisFiyati: 11000,
      indirimBitisi: new Date("2030-01-05T07:30:00Z"),
    });
    expect((await fiyat.fiyatOku(vt, m))?.indirimBitisi).toEqual(new Date("2030-01-31T21:00:00Z"));
  });

  it("birleşimlerin stoğu birim kimliği sırasıyla kilitlenir: aynı birimleri kilitleyen siparişle kilitlenmez", async () => {
    const vt = await siteAc();
    const { urun, s, m } = await secenekliUrun(vt);
    for (const birim of [s, m]) {
      await stok.stokDuzelt(vt, kim, birim, { gorulenMiktar: 0, yeniMiktar: 5, sebep: "sayim" });
    }
    const [kucuk, buyuk] = [s, m].sort();
    const sira = (birim: string | undefined) => (birim === s ? 0 : 1);
    // Tablo büyük kimlikli birimi önce verir; sipariş (stokDus gibi) küçükten büyüğe kilitler.
    const girdi: PanelFiyatStok = {
      sebep: "sayim",
      birimler: [buyuk, kucuk].map((birim) => ({
        yer: `birlesimler.${sira(birim)}`,
        birlesim: [sira(birim)],
        stok: { gorulen: 5, yeni: "7" },
      })),
    };
    let alindi = () => {};
    const kilit = new Promise<void>((bitti) => {
      alindi = bitti;
    });
    const siparis = vt.transaction(async (islem) => {
      await islem
        .select()
        .from(birimStoklari)
        .where(eq(birimStoklari.birim_kimligi, kucuk ?? ""))
        .for("update");
      alindi();
      // Panel küçüğü bekler (eski sırada büyüğü alıp küçüğü beklerdi; sipariş büyüğü isteyince kilitlenirdi).
      await kilitBekleyeniGor(vt);
      await islem
        .select()
        .from(birimStoklari)
        .where(eq(birimStoklari.birim_kimligi, buyuk ?? ""))
        .for("update");
    });
    await Promise.race([kilit, siparis]);
    const panel = yaz(vt, urun, girdi);
    await siparis;
    await panel;
    const stoklar = await stok.stoklariOku(vt, [s, m]);
    expect([stoklar.get(s)?.miktar, stoklar.get(m)?.miktar]).toEqual([7, 7]);
  });
});

describe("stok", () => {
  it("birleşimin stoğu görülen miktarla, ortak sebep ve notla yazılır; arada değiştiyse çakışma, hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    const { urun, s, m } = await secenekliUrun(vt);
    await yaz(vt, urun, {
      sebep: "yeni-mal",
      birimler: [
        { yer: "birlesimler.0", birlesim: [0], stok: { gorulen: 0, yeni: "6" } },
        { yer: "birlesimler.1", birlesim: [1], stok: { gorulen: 0, yeni: "4" } },
      ],
    });
    const stoklar = await stok.stoklariOku(vt, [s, m]);
    expect([stoklar.get(s)?.miktar, stoklar.get(m)?.miktar]).toEqual([6, 4]);
    expect((await stok.panelStokGecmisi(vt, [s, m])).map((g) => [g.birim, g.sebep])).toEqual([
      [m, "yeni-mal"],
      [s, "yeni-mal"],
    ]);
    // Ekran 6'yı görmüş ama arada 5 olmuş: ikinci satır da yazılmaz (tek işlem).
    await stok.stokDuzelt(vt, kim, s, { gorulenMiktar: 6, yeniMiktar: 5, sebep: "sayim" });
    expect(
      await hatasi(
        yaz(vt, urun, {
          sebep: "sayim",
          birimler: [
            { yer: "birlesimler.1", birlesim: [1], stok: { gorulen: 4, yeni: "3" } },
            { yer: "birlesimler.0", birlesim: [0], stok: { gorulen: 6, yeni: "8" } },
          ],
        }),
      ),
    ).toEqual({ kod: "cakisma", ayrinti: [{ alan: "birlesimler.0.stok", kod: "stok-degisti" }] });
    const sonra = await stok.stoklariOku(vt, [s, m]);
    expect([sonra.get(s)?.miktar, sonra.get(m)?.miktar]).toEqual([5, 4]);
  });

  it("'Diğer' notsuz, okunamayan miktar ve yeni basit ürünün başlangıç stoğu", async () => {
    const vt = await siteAc();
    const { urun, birim } = await basitUrun(vt);
    expect(
      await hatasi(
        yaz(vt, urun, {
          sebep: "diger",
          birimler: [{ yer: "stok", stok: { gorulen: 0, yeni: "3" } }],
        }),
      ),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "stokNotu", kod: "not-gerekli" }] });
    expect(
      await hatasi(
        yaz(vt, urun, {
          sebep: "sayim",
          birimler: [{ yer: "stok", stok: { gorulen: 0, yeni: "üç" } }],
        }),
      ),
    ).toMatchObject({ kod: "dogrulama", ayrinti: [{ alan: "stok.stok" }] });
    await yaz(vt, urun, {
      sebep: "yeni-mal",
      birimler: [{ yer: "stok", stok: { gorulen: 0, yeni: "3" } }],
    });
    expect((await stok.stoklariOku(vt, [birim])).get(birim)?.miktar).toBe(3);
  });
});

describe("izinler", () => {
  it("fiyat fiyat.degistir, stok stok.duzelt ister; izinsiz hiçbir şey yazılmaz", async () => {
    const vt = await siteAc();
    const { urun, birim } = await basitUrun(vt);
    expect(
      await hatasi(
        yaz(
          vt,
          urun,
          { birimler: [{ yer: "fiyat", satisFiyati: "10" }] },
          { fiyat: false, stok: true },
        ),
      ),
    ).toEqual({ kod: "yetki", ayrinti: [{ alan: "fiyat", kod: "fiyat-yetkisi" }] });
    expect(
      await hatasi(
        yaz(
          vt,
          urun,
          { sebep: "sayim", birimler: [{ yer: "stok", stok: { gorulen: 0, yeni: "2" } }] },
          { fiyat: true, stok: false },
        ),
      ),
    ).toEqual({ kod: "yetki", ayrinti: [{ alan: "stok", kod: "stok-yetkisi" }] });
    // Yalnız indirim zamanı da fiyattır.
    expect(
      await hatasi(
        yaz(
          vt,
          urun,
          { indirimBitisi: "2026-12-01T00:00", birimler: [] },
          { fiyat: false, stok: true },
        ),
      ),
    ).toMatchObject({ kod: "yetki" });
    expect(await fiyat.fiyatOku(vt, birim)).toBeUndefined();
    expect((await stok.stoklariOku(vt, [birim])).get(birim)?.miktar ?? 0).toBe(0);
  });
});

describe("geçmiş ve ayrılan", () => {
  it("birimlerin geçmişi tek listede en yeni önce, sayfa sayfa; ayrılan yalnız süresi dolmamış ayırmalar", async () => {
    const vt = await siteAc();
    const { urun, s, m } = await secenekliUrun(vt);
    for (const [i, birim] of [s, m, s].entries()) {
      await fiyat.fiyatYaz(vt, kim, birim, { satisFiyati: 1000 + i });
    }
    const ilk = await fiyat.panelFiyatGecmisi(vt, [s, m], { sinir: 2 });
    expect(ilk.map((g) => [g.birim, g.satisFiyati])).toEqual([
      [s, 1002],
      [m, 1001],
    ]);
    const ikinci = await fiyat.panelFiyatGecmisi(vt, [s, m], { sinir: 2, sonra: ilk[1]?.kimlik });
    expect(ikinci.map((g) => g.satisFiyati)).toEqual([1000]);
    // Başka ürünün birimi listeye karışmaz.
    const baska = await basitUrun(vt);
    await fiyat.fiyatYaz(vt, kim, baska.birim, { satisFiyati: 5 });
    expect((await fiyat.panelFiyatGecmisi(vt, [s, m])).length).toBe(3);

    await stok.stokDuzelt(vt, kim, s, { gorulenMiktar: 0, yeniMiktar: 5, sebep: "sayim" });
    const gelecek = new Date(Date.now() + 15 * 60_000);
    const gecmis = new Date(Date.now() - 60_000);
    // Ayırma ödeme oturumuna bağlıdır; sepetin içeriği bu sayım için önemsizdir.
    const ayir = (adet: number, bitis: Date) =>
      vt.transaction(async (islem) => {
        const [oturum] = await islem
          .insert(odemeOturumlari)
          .values({
            eposta: "ayirma@ornek.test",
            teslimat: {} as never,
            fatura: {} as never,
            kalemler: [{ birim: s, adet }],
            toplam: 0,
            para_birimi: "XTS",
            onaylar: [],
            bitis_zamani: gelecek,
          })
          .returning({ kimlik: odemeOturumlari.kimlik });
        await stok.stokAyir(islem, oturum?.kimlik ?? "", [{ birim: s, adet }], bitis);
      });
    await ayir(2, gelecek);
    await ayir(1, gecmis);
    expect(await stok.ayrilanMiktarlar(vt, [s, m])).toEqual(new Map([[s, 2]]));
    expect(urun).toBeDefined();
  });
});
