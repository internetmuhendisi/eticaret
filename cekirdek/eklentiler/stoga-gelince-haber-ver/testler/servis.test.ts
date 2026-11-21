// Stoğa gelince haber ver eklentisi gerçek veritabanı ve gerçek yerel posta kutusuyla (kart 0144, karar 0117):
// - Talep yalnız sayfası açılan ürünün tükenmiş, takibi açık birimine yazılır; aynı e-posta aynı birime bir kez.
// - Eklenti kapalıyken talep yazılmaz, e-posta gitmez; talepler silinmez.
// - Stoğu sıfırdan yukarı çıkan birim (elle düzeltme ve artırma) bekleyen talebi varsa gönderim işi alır, aynı
//   işlemde; işlem geri alınınca iş de girmez.
// - Her bekleyen talep sahibine bir e-posta gider; aynı anda iki stok girişinde ve iki gönderimde de bir kez.
//   E-posta gidince adres talepten silinir. Gönderim sırasında stok biterse kalan talepler bekler.
// - E-posta gerçek posta kutusuna ürünün adı, seçimi ve ürün sayfasının seçimli bağlantısıyla düşer.
// - Saklama süresi dolan talep silinir; panel sayıları doğru; veritabanının denetimleri kayıtla aynı; iki site ayrı.
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { arkaPlanIsleri } from "../../../arka-plan-isleri/model.ts";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { stokBildirimiAyari, stokBildirimiDurumlari } from "../../../kayitlar/eklentiler.ts";
import { epostaGondericisi } from "../../../moduller/eposta/gonderici.ts";
import { epostaKaydiniGonder } from "../../../moduller/eposta/gonderim.ts";
import { epostaKayitlari } from "../../../moduller/eposta/model.ts";
import { siteninFiyatServisi } from "../../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../../moduller/magaza-ayarlari/servis.ts";
import { stokServisi } from "../../../moduller/stok/servis.ts";
import { urunServisi } from "../../../moduller/urun/servis.ts";
import { donusenBirimiSil } from "../../../moduller/urun/testler/donusen-birim.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { secimdenSorgu } from "../../../vitrin/urun-sayfasi/secim.ts";
import { urunSayfasiVerisi } from "../../../vitrin/urun-sayfasi/veri.ts";
import { stokBildirimiGonderIsi, stokBildirimiTaramasiIsi } from "../isler.ts";
import { stokBildirimiTalepleri } from "../model.ts";
import { stokBildirimiFormuSemasi } from "../semalar.ts";
import { birimBilgileri, stokBildirimiServisi } from "../servis.ts";

vi.setConfig({ testTimeout: 60_000 });

const okunan = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
);
// Deneme sitesinde eklenti açıktır ve e-postanın gönderen adresi vardır (ornek-siteler/gecerli/ayarlar.json).
const site: Site = okunan;
const kapali: Site = { ...site, ayarlar: { ...site.ayarlar, eklentiler: [] } };
const { epostaGonderenAdresi: _gonderen, ...gonderensizAyarlar } = site.ayarlar;
const gonderensiz: Site = { ...site, ayarlar: gonderensizAyarlar };
const servis = stokBildirimiServisi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const stok = stokServisi();
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const { POSTA_KUTUSU_PORTU: kutuPortu, POSTA_SMTP_PORTU: smtpPortu } = process.env;
const kutu = `http://127.0.0.1:${kutuPortu}`;
const eposta = () => `haber-${randomBytes(6).toString("hex")}@ornek.test`;

let vt: Veritabani;
let sil: () => Promise<void>;
let vtB: Veritabani;
let silB: () => Promise<void>;
beforeAll(async () => {
  [{ vt, sil }, { vt: vtB, sil: silB }] = await Promise.all([
    denemeSitesiAc("stok-bildirimi"),
    denemeSitesiAc("stok-bildirimi-b"),
  ]);
});
afterAll(async () => {
  await Promise.all([sil(), silB()]);
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const fiyatVer = (birim: string, veritabani: Veritabani = vt) =>
  siteninFiyatServisi(site).fiyatYaz(veritabani, yonetici(), birim, { satisFiyati: 10_000 });

// Yayındaki, fiyatı olan, stoğu olmayan basit ürün ve birimi.
const tukenmisBirim = async (
  secenekler: {
    durum?: "yayinda" | "taslak" | "gizli" | "arsiv";
    takip?: boolean;
    stok?: number;
    fiyatsiz?: boolean;
    veritabani?: Veritabani;
  } = {},
) => {
  const veritabani = secenekler.veritabani ?? vt;
  const urun = await urunSrv.urunEkle(veritabani, yonetici(), {
    ad: `Kupa ${randomBytes(4).toString("hex")}`,
    vergiSinifi: null,
    durum: secenekler.durum ?? "yayinda",
    stokTakibi: secenekler.takip ?? true,
  });
  const birim = (await urunSrv.urunuOku(veritabani, urun))?.birimler[0]?.kimlik;
  if (birim === undefined) throw new Error("Birim yok.");
  if (secenekler.fiyatsiz !== true) await fiyatVer(birim, veritabani);
  if ((secenekler.stok ?? 0) > 0) await stokVer(birim, 0, secenekler.stok ?? 0, veritabani);
  return { urun, birim };
};

const stokVer = (birim: string, gorulen: number, yeni: number, veritabani: Veritabani = vt) =>
  stok.stokDuzelt(veritabani, yonetici(), birim, {
    gorulenMiktar: gorulen,
    yeniMiktar: yeni,
    sebep: "yeni-mal",
  });

const talepler = (birim: string) =>
  vt
    .select({
      eposta: stokBildirimiTalepleri.eposta,
      durum: stokBildirimiTalepleri.durum,
      gonderilme: stokBildirimiTalepleri.gonderilme_zamani,
    })
    .from(stokBildirimiTalepleri)
    .where(eq(stokBildirimiTalepleri.birim_kimligi, birim))
    .orderBy(stokBildirimiTalepleri.olusturma_zamani);

const gonderimIsleri = async (birim: string) =>
  (
    await vt
      .select({ girdi: arkaPlanIsleri.girdi })
      .from(arkaPlanIsleri)
      .where(eq(arkaPlanIsleri.tur, stokBildirimiGonderIsi.tur))
  ).filter(({ girdi }) => (girdi as { birim: string }).birim === birim);

const epostaKayitlariOku = (adresler: string[]) =>
  vt
    .select({ kimlik: epostaKayitlari.kimlik, alici: epostaKayitlari.alici })
    .from(epostaKayitlari)
    .where(
      and(inArray(epostaKayitlari.alici, adresler), eq(epostaKayitlari.sablon, "stok-bildirimi")),
    );

describe("talep", () => {
  it("tükenmiş birime yazılır; aynı e-posta ikinci kez yazılmaz ve yine başarı döner", async () => {
    const { birim } = await tukenmisBirim();
    const adres = eposta();
    await servis.talepYaz(vt, birim, adres);
    await servis.talepYaz(vt, birim, adres);
    await servis.talepYaz(vt, birim.toUpperCase(), adres);
    const ikinci = eposta();
    await servis.talepYaz(vt, birim, ikinci);
    expect(await talepler(birim)).toEqual([
      { eposta: adres, durum: "bekliyor", gonderilme: null },
      { eposta: ikinci, durum: "bekliyor", gonderilme: null },
    ]);
  });

  it("formun e-postası küçük harfe ve kırpılmış hâline çevrilir: aynı adresin büyük harflisi aynı taleptir", () => {
    expect(stokBildirimiFormuSemasi.parse({ eposta: "  Ali@Ornek.TEST " })).toEqual({
      eposta: "ali@ornek.test",
    });
  });

  it("satılabilir ve takibi kapalı birime yazılmaz (is-kurali)", async () => {
    const stokta = await tukenmisBirim({ stok: 2 });
    const takipsiz = await tukenmisBirim({ takip: false });
    for (const { birim } of [stokta, takipsiz]) {
      expect(await hatasi(servis.talepYaz(vt, birim, eposta()))).toEqual({
        kod: "is-kurali",
        ayrinti: [{ alan: "birim", kod: "talep-alinamaz" }],
      });
      expect(await talepler(birim)).toEqual([]);
    }
  });

  it("olmayan, bozuk, silinmiş, taslak ve arşivdeki ürünün birimine yazılmaz (bulunamadi); gizli ürüne yazılır", async () => {
    const silinen = await tukenmisBirim();
    await urunSrv.urunSil(vt, yonetici(), silinen.urun);
    const taslak = await tukenmisBirim({ durum: "taslak" });
    const arsiv = await tukenmisBirim({ durum: "arsiv" });
    for (const birim of [randomUUID(), "bozuk", silinen.birim, taslak.birim, arsiv.birim]) {
      expect(await hatasi(servis.talepYaz(vt, birim, eposta()))).toEqual({
        kod: "bulunamadi",
        ayrinti: undefined,
      });
    }
    const gizli = await tukenmisBirim({ durum: "gizli" });
    await servis.talepYaz(vt, gizli.birim, eposta());
    expect(await talepler(gizli.birim)).toHaveLength(1);
  });

  it("silinmiş birleşime yazılmaz (bulunamadi)", async () => {
    const urun = await urunSrv.urunEkle(vt, yonetici(), {
      ad: `Bedenli ${randomBytes(3).toString("hex")}`,
      vergiSinifi: null,
      durum: "yayinda",
    });
    await urunSrv.secenekEkle(vt, yonetici(), urun, { ad: "Beden", degerler: ["S", "M"] });
    await donusenBirimiSil(urunSrv, vt, urun);
    const degerler = (await urunSrv.urunuOku(vt, urun))?.secenekler[0]?.degerler ?? [];
    const [s, m] = degerler.map(({ kimlik }) => kimlik);
    if (s === undefined || m === undefined) throw new Error("Değer yok.");
    await urunSrv.birlesimEkle(vt, yonetici(), urun, { degerler: [s] });
    const silinen = await urunSrv.birlesimEkle(vt, yonetici(), urun, { degerler: [m] });
    await urunSrv.birlesimSil(vt, yonetici(), silinen);
    expect(await servis.talepAlinabilirBirimler(vt, [silinen])).toEqual(new Set());
    expect(await hatasi(servis.talepYaz(vt, silinen, eposta()))).toMatchObject({
      kod: "bulunamadi",
    });
  });

  it("alınabilir birimler yalnız sayfası açılan ürünün tükenmiş, takibi açık birimleridir", async () => {
    const tukenmis = await tukenmisBirim();
    const stokta = await tukenmisBirim({ stok: 1 });
    const takipsiz = await tukenmisBirim({ takip: false });
    const taslak = await tukenmisBirim({ durum: "taslak" });
    const alinabilir = await servis.talepAlinabilirBirimler(vt, [
      tukenmis.birim.toUpperCase(),
      stokta.birim,
      takipsiz.birim,
      taslak.birim,
      "bozuk",
    ]);
    expect([...alinabilir]).toEqual([tukenmis.birim]);
  });

  it("eklenti kapalıyken talep yazılmaz, alınabilir birim yoktur", async () => {
    const { birim } = await tukenmisBirim();
    const kapaliServis = stokBildirimiServisi(kapali);
    expect(await hatasi(kapaliServis.talepYaz(vt, birim, eposta()))).toEqual({
      kod: "bulunamadi",
      ayrinti: undefined,
    });
    expect(await kapaliServis.talepAlinabilirBirimler(vt, [birim])).toEqual(new Set());
    expect(await talepler(birim)).toEqual([]);
  });

  it("üye olmayanın talebi mağaza sahibinin ayarıdır (varsayılan açık)", async () => {
    expect(await servis.uyeOlmayanIzinliMi(vt)).toBe(true);
    await siteninServisi(site).degistir(vtB, yonetici(), { stokBildirimiUyeOlmayan: false });
    expect(await servis.uyeOlmayanIzinliMi(vtB)).toBe(false);
  });
});

describe("stok kancası", () => {
  it("elle düzeltmede ve artırmada stoğu sıfırdan yukarı çıkan, bekleyen talebi olan birime bir iş koyar", async () => {
    const duzeltilen = await tukenmisBirim();
    const artirilan = await tukenmisBirim();
    const talepsiz = await tukenmisBirim();
    await servis.talepYaz(vt, duzeltilen.birim, eposta());
    await servis.talepYaz(vt, artirilan.birim, eposta());
    await stokVer(duzeltilen.birim, 0, 3);
    await vt.transaction((islem) =>
      stok.stokArtir(islem, yonetici(), [{ birim: artirilan.birim, adet: 2 }], {
        sebep: "siparis-iptali",
      }),
    );
    await stokVer(talepsiz.birim, 0, 3);
    // Bütün talepleri gönderilmiş birim yeniden stoğa girince iş almaz.
    const gonderilmis = await tukenmisBirim();
    await servis.talepYaz(vt, gonderilmis.birim, eposta());
    await stokVer(gonderilmis.birim, 0, 1);
    await servis.bekleyenleriGonder(vt, gonderilmis.birim);
    await stokVer(gonderilmis.birim, 1, 0);
    const islerOnce = (await gonderimIsleri(gonderilmis.birim)).length;
    await stokVer(gonderilmis.birim, 0, 2);
    expect(await gonderimIsleri(gonderilmis.birim)).toHaveLength(islerOnce);
    // İşin girdisinde yalnız birim vardır: e-posta adresi kuyruğa girmez.
    expect(await gonderimIsleri(duzeltilen.birim)).toEqual([
      { girdi: { birim: duzeltilen.birim } },
    ]);
    expect(await gonderimIsleri(artirilan.birim)).toHaveLength(1);
    expect(await gonderimIsleri(talepsiz.birim)).toHaveLength(0);
    // Stoğu zaten olan birim artınca yeni iş girmez.
    await stokVer(duzeltilen.birim, 3, 5);
    expect(await gonderimIsleri(duzeltilen.birim)).toHaveLength(1);
  });

  it("aynı anda iki stok girişinde stoğu sıfırdan çıkaran tek giriştir: tek iş girer", async () => {
    const { birim } = await tukenmisBirim();
    await servis.talepYaz(vt, birim, eposta());
    await Promise.all(
      [1, 2].map(() =>
        vt.transaction((islem) =>
          stok.stokArtir(islem, yonetici(), [{ birim, adet: 1 }], { sebep: "siparis-iadesi" }),
        ),
      ),
    );
    expect(await gonderimIsleri(birim)).toHaveLength(1);
  });

  it("stoğu değiştiren işlem geri alınırsa iş de girmez", async () => {
    const { birim } = await tukenmisBirim();
    await servis.talepYaz(vt, birim, eposta());
    await vt
      .transaction(async (islem) => {
        await stok.stokArtir(islem, yonetici(), [{ birim, adet: 1 }], { sebep: "siparis-iadesi" });
        throw new Error("geri al");
      })
      .catch(() => undefined);
    expect(await gonderimIsleri(birim)).toHaveLength(0);
  });
});

describe("gönderim", () => {
  it("her bekleyen talebe bir e-posta kaydı; adres talepten silinir; ikinci gönderim bir şey yapmaz", async () => {
    const { birim } = await tukenmisBirim();
    const adresler = [eposta(), eposta(), eposta()];
    for (const adres of adresler) await servis.talepYaz(vt, birim, adres);
    // Stok yokken gönderilmez, talepler bekler.
    expect(await servis.bekleyenleriGonder(vt, birim)).toBe(0);
    await stokVer(birim, 0, 1);
    expect(await servis.bekleyenleriGonder(vt, birim)).toBe(3);
    expect(await servis.bekleyenleriGonder(vt, birim)).toBe(0);
    const kayitlar = await epostaKayitlariOku(adresler);
    expect(kayitlar.map(({ alici }) => alici).toSorted()).toEqual(adresler.toSorted());
    const satirlar = await talepler(birim);
    expect(satirlar.map(({ eposta: adres, durum }) => ({ adres, durum }))).toEqual(
      adresler.map(() => ({ adres: null, durum: "gonderildi" })),
    );
    expect(satirlar.every(({ gonderilme }) => gonderilme instanceof Date)).toBe(true);
    // Gönderildikten sonra aynı adres yeniden isteyebilir (stok yeniden bitince).
    await stokVer(birim, 1, 0);
    await servis.talepYaz(vt, birim, adresler[0] ?? "");
    expect((await talepler(birim)).filter(({ durum }) => durum === "bekliyor")).toHaveLength(1);
  });

  it("aynı anda iki gönderim işinde her talep bir kez gider (partiden çok talep)", async () => {
    const { birim } = await tukenmisBirim();
    const adresler = Array.from({ length: stokBildirimiAyari.parti * 2 + 7 }, eposta);
    for (const adres of adresler) await servis.talepYaz(vt, birim, adres);
    await stokVer(birim, 0, 1);
    const sayilar = await Promise.all([
      servis.bekleyenleriGonder(vt, birim),
      servis.bekleyenleriGonder(vt, birim),
    ]);
    expect(sayilar[0] + sayilar[1]).toBe(adresler.length);
    const kayitlar = await epostaKayitlariOku(adresler);
    expect(kayitlar).toHaveLength(adresler.length);
    expect(new Set(kayitlar.map(({ alici }) => alici)).size).toBe(adresler.length);
  });

  it("gönderim sırasında stok biterse kalan talepler bekler", async () => {
    const { birim } = await tukenmisBirim();
    const adresler = Array.from({ length: stokBildirimiAyari.parti + 3 }, eposta);
    for (const adres of adresler) await servis.talepYaz(vt, birim, adres);
    await stokVer(birim, 0, 1);
    // İlk parti "gönderildi" yazılırken aynı işlemde birimin stoğu biter (araya giren sipariş yerine).
    await vt.execute(sql`create function deneme_stok_bitir() returns trigger language plpgsql as $$
        begin update birim_stoklari set miktar = 0 where birim_kimligi = new.birim_kimligi; return new; end $$`);
    await vt.execute(sql`create trigger deneme_stok_bitir after update on stok_bildirimi_talepleri
        for each row execute function deneme_stok_bitir()`);
    try {
      expect(await servis.bekleyenleriGonder(vt, birim)).toBe(stokBildirimiAyari.parti);
    } finally {
      await vt.execute(sql`drop trigger deneme_stok_bitir on stok_bildirimi_talepleri`);
      await vt.execute(sql`drop function deneme_stok_bitir()`);
    }
    expect((await talepler(birim)).filter(({ durum }) => durum === "bekliyor")).toHaveLength(3);
  });

  it("ürün taslağa alınınca gönderilmez", async () => {
    const { urun, birim } = await tukenmisBirim();
    await servis.talepYaz(vt, birim, eposta());
    await stokVer(birim, 0, 2);
    await urunSrv.urunDegistir(vt, yonetici(), urun, { durum: "taslak" });
    expect(await servis.bekleyenleriGonder(vt, birim)).toBe(0);
    expect((await talepler(birim))[0]?.durum).toBe("bekliyor");
  });

  it("eklenti kapalıyken e-posta gitmez, talepler silinmez", async () => {
    const { birim } = await tukenmisBirim();
    const adres = eposta();
    await servis.talepYaz(vt, birim, adres);
    await stokVer(birim, 0, 2);
    expect(await stokBildirimiServisi(kapali).bekleyenleriGonder(vt, birim)).toBe(0);
    expect(await epostaKayitlariOku([adres])).toEqual([]);
    expect(await talepler(birim)).toEqual([{ eposta: adres, durum: "bekliyor", gonderilme: null }]);
  });

  it("gönderen adresi olmayan sitede talep alınmaz, gönderilmez, adres silinmez", async () => {
    const { birim } = await tukenmisBirim();
    const adres = eposta();
    await servis.talepYaz(vt, birim, adres);
    const gonderensizServis = stokBildirimiServisi(gonderensiz);
    expect(await gonderensizServis.talepAlinabilirBirimler(vt, [birim])).toEqual(new Set());
    expect(await hatasi(gonderensizServis.talepYaz(vt, birim, eposta()))).toMatchObject({
      kod: "bulunamadi",
    });
    await stokVer(birim, 0, 2);
    expect(await gonderensizServis.bekleyenleriGonder(vt, birim)).toBe(0);
    expect(await talepler(birim)).toEqual([{ eposta: adres, durum: "bekliyor", gonderilme: null }]);
  });

  it("fiyatsız birime stoklu olsa da talep yazılır, fiyat girilene kadar gönderilmez", async () => {
    const { birim } = await tukenmisBirim({ fiyatsiz: true, stok: 3 });
    expect(await servis.talepAlinabilirBirimler(vt, [birim])).toEqual(new Set([birim]));
    await servis.talepYaz(vt, birim, eposta());
    expect(await servis.bekleyenleriGonder(vt, birim)).toBe(0);
    expect(await servis.gonderilebilirBekleyenler(vt)).not.toContain(birim);
    await fiyatVer(birim);
    expect(await servis.talepAlinabilirBirimler(vt, [birim])).toEqual(new Set());
    expect(await servis.gonderilebilirBekleyenler(vt)).toContain(birim);
    expect(await servis.bekleyenleriGonder(vt, birim)).toBe(1);
  });

  it("tarama stoğun geldiği anda gönderilemeyenleri bulur: kapalıyken gelen stok, taslaktayken gelen stok", async () => {
    const kapaliyken = await tukenmisBirim();
    await servis.talepYaz(vt, kapaliyken.birim, eposta());
    await stokVer(kapaliyken.birim, 0, 2);
    expect(await stokBildirimiServisi(kapali).bekleyenleriGonder(vt, kapaliyken.birim)).toBe(0);
    expect(await stokBildirimiServisi(kapali).gonderilebilirBekleyenler(vt)).toEqual([]);

    const taslakken = await tukenmisBirim();
    await servis.talepYaz(vt, taslakken.birim, eposta());
    await urunSrv.urunDegistir(vt, yonetici(), taslakken.urun, { durum: "taslak" });
    await stokVer(taslakken.birim, 0, 2);
    expect(await servis.gonderilebilirBekleyenler(vt)).not.toContain(taslakken.birim);
    await urunSrv.urunDegistir(vt, yonetici(), taslakken.urun, { durum: "yayinda" });

    expect(await servis.gonderilebilirBekleyenler(vt)).toEqual(
      expect.arrayContaining([kapaliyken.birim, taslakken.birim]),
    );
    const stoksuz = await tukenmisBirim();
    await servis.talepYaz(vt, stoksuz.birim, eposta());
    expect(await servis.gonderilebilirBekleyenler(vt)).not.toContain(stoksuz.birim);
    // Taramanın işi gönderim işini koyar (stok kancasının koyduğu işler sayılmaz).
    const once = async (birim: string) => (await gonderimIsleri(birim)).length;
    const [a, b, c] = [
      await once(kapaliyken.birim),
      await once(taslakken.birim),
      await once(stoksuz.birim),
    ];
    vi.stubEnv(
      "SITE_KLASORU",
      resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
    );
    await stokBildirimiTaramasiIsi.calistir(
      {},
      { vt, isKimligi: randomUUID(), deneme: 1, sinyal: new AbortController().signal },
    );
    vi.unstubAllEnvs();
    expect(await once(kapaliyken.birim)).toBe(a + 1);
    expect(await once(taslakken.birim)).toBe(b + 1);
    expect(await once(stoksuz.birim)).toBe(c);
  });

  it("e-posta gerçek posta kutusuna ürünün adı ve seçimli sayfa bağlantısıyla düşer", async () => {
    const urun = await urunSrv.urunEkle(vt, yonetici(), {
      ad: `Tişört ${randomBytes(3).toString("hex")}`,
      vergiSinifi: null,
      durum: "yayinda",
    });
    await urunSrv.secenekEkle(vt, yonetici(), urun, { ad: "Renk", degerler: ["Beyaz", "Siyah"] });
    await donusenBirimiSil(urunSrv, vt, urun);
    await urunSrv.secenekEkle(vt, yonetici(), urun, { ad: "Beden", degerler: ["S", "M"] });
    await donusenBirimiSil(urunSrv, vt, urun);
    const okunanUrun = await urunSrv.urunuOku(vt, urun);
    const deger = Object.fromEntries(
      (okunanUrun?.secenekler ?? []).flatMap((secenek) =>
        secenek.degerler.map((d) => [d.ad, d.kimlik] as const),
      ),
    ) as Record<"Beyaz" | "Siyah" | "S" | "M", string>;
    await urunSrv.birlesimEkle(vt, yonetici(), urun, { degerler: [deger.Beyaz, deger.S] });
    const birim = await urunSrv.birlesimEkle(vt, yonetici(), urun, {
      degerler: [deger.Siyah, deger.M],
    });
    await fiyatVer(birim);
    const adres = eposta();
    await servis.talepYaz(vt, birim, adres);
    await stokVer(birim, 0, 1);
    vi.stubEnv("SITE_ADRESI", "https://magaza.ornek.test");
    try {
      await servis.bekleyenleriGonder(vt, birim);
    } finally {
      vi.unstubAllEnvs();
    }

    // Bağlantı ürün sayfasının kendi seçim adresidir: sayfa aynı birleşimi açar.
    const sayfa = await urunSayfasiVerisi(vt, site, urun);
    const sayfaBirimi = sayfa?.birimler.find((aday) => aday.kimlik === birim);
    if (sayfa === undefined || sayfaBirimi === undefined) throw new Error("Sayfa yok.");
    const beklenenAdres = `https://magaza.ornek.test/urun/${sayfa.adresAdi}${secimdenSorgu(sayfa.secenekler, sayfaBirimi.degerler)}`;
    expect((await birimBilgileri(vt, [birim])).get(birim)).toMatchObject({
      urunAdi: okunanUrun?.ad,
      secim: ["Siyah", "M"],
    });

    const [kayit] = await epostaKayitlariOku([adres]);
    if (kayit === undefined) throw new Error("Kayıt yok.");
    const gonderici = epostaGondericisi(`smtp://localhost:${smtpPortu}`);
    if (gonderici === undefined) throw new Error("Yerel posta kutusu yok.");
    await epostaKaydiniGonder(vt, kayit.kimlik, { site, gonderici });
    let mesajlar: { ID: string; Subject: string }[] = [];
    for (let i = 0; i < 50 && mesajlar.length === 0; i++) {
      const yanit = await fetch(
        `${kutu}/api/v1/search?query=${encodeURIComponent(`to:"${adres}"`)}`,
      );
      mesajlar = ((await yanit.json()) as { messages: typeof mesajlar }).messages;
      if (mesajlar.length === 0) await new Promise((coz) => setTimeout(coz, 100));
    }
    expect(mesajlar).toHaveLength(1);
    const [mesaj] = mesajlar;
    expect(mesaj?.Subject).toContain(`${okunanUrun?.ad} (Siyah, M)`);
    const icerik = (await (await fetch(`${kutu}/api/v1/message/${mesaj?.ID}`)).json()) as {
      Text: string;
    };
    expect(icerik.Text).toContain(beklenenAdres);
    expect(icerik.Text).toContain(`${okunanUrun?.ad} (Siyah, M)`);
  });
});

describe("panel ve temizlik", () => {
  it("panel bekleyen talepleri birim başına sayar, en çok bekleyen önce", async () => {
    const az = await tukenmisBirim();
    const cok = await tukenmisBirim();
    await servis.talepYaz(vt, az.birim, eposta());
    for (let i = 0; i < 3; i++) await servis.talepYaz(vt, cok.birim, eposta());
    const gonderilen = await tukenmisBirim();
    await servis.talepYaz(vt, gonderilen.birim, eposta());
    await stokVer(gonderilen.birim, 0, 1);
    await servis.bekleyenleriGonder(vt, gonderilen.birim);
    const taslak = await tukenmisBirim();
    await servis.talepYaz(vt, taslak.birim, eposta());
    await urunSrv.urunDegistir(vt, yonetici(), taslak.urun, { durum: "taslak" });
    const liste = await servis.panelListesi(vt);
    const bizim = liste.filter((satir) =>
      [az.birim, cok.birim, gonderilen.birim, taslak.birim].includes(satir.birim),
    );
    expect(bizim.map(({ birim, bekleyen }) => ({ birim, bekleyen }))).toEqual([
      { birim: cok.birim, bekleyen: 3 },
      { birim: az.birim, bekleyen: 1 },
    ]);
    const sayilar = liste.map(({ bekleyen }) => bekleyen);
    expect(sayilar).toEqual(sayilar.toSorted((a, b) => b - a));
  });

  it("panelde ürün adında arama (harf ayrımsız, joker yok) ve ilk talebi en eski önce sıralama (kart 0258)", async () => {
    const eski = await tukenmisBirim();
    const yeni = await tukenmisBirim();
    await servis.talepYaz(vt, eski.birim, eposta());
    for (let i = 0; i < 2; i++) await servis.talepYaz(vt, yeni.birim, eposta());
    const ad = (await urunSrv.urunuOku(vt, yeni.urun))?.ad ?? "";
    const bizim = (liste: { birim: string }[]) =>
      liste.map(({ birim }) => birim).filter((birim) => [eski.birim, yeni.birim].includes(birim));
    expect(bizim(await servis.panelListesi(vt))).toEqual([yeni.birim, eski.birim]);
    expect(bizim(await servis.panelListesi(vt, { siralama: "en-eski-talep" }))).toEqual([
      eski.birim,
      yeni.birim,
    ]);
    const bulunan = await servis.panelListesi(vt, { ara: ad.toLocaleUpperCase("tr") });
    expect(bulunan.map(({ birim }) => birim)).toEqual([yeni.birim]);
    expect(await servis.panelListesi(vt, { ara: "%" })).toEqual([]);
  });

  it("saklama süresi dolan talep (bekleyen de gönderilmiş de) silinir, süre ayardır; eklenti kapalıyken de", async () => {
    const { birim } = await tukenmisBirim({ veritabani: vtB });
    const bService = stokBildirimiServisi(kapali);
    const ekle = (gunOnce: number, durum: "bekliyor" | "gonderildi") =>
      vtB.insert(stokBildirimiTalepleri).values({
        birim_kimligi: birim,
        eposta: durum === "bekliyor" ? eposta() : null,
        durum,
        olusturma_zamani: sql`now() - make_interval(days => ${gunOnce})`,
        gonderilme_zamani: durum === "gonderildi" ? sql`now()` : null,
      });
    await ekle(stokBildirimiAyari.saklamaGunVarsayilan + 1, "bekliyor");
    await ekle(stokBildirimiAyari.saklamaGunVarsayilan + 1, "gonderildi");
    await ekle(stokBildirimiAyari.saklamaGunVarsayilan - 1, "bekliyor");
    await ekle(5, "bekliyor");
    expect(await bService.eskiTalepleriSil(vtB)).toBe(2);
    await siteninServisi(site).degistir(vtB, yonetici(), { stokBildirimiSaklamaGun: 10 });
    expect(await bService.eskiTalepleriSil(vtB)).toBe(1);
    const kalan = await vtB
      .select({ kimlik: stokBildirimiTalepleri.kimlik })
      .from(stokBildirimiTalepleri)
      .where(eq(stokBildirimiTalepleri.birim_kimligi, birim));
    expect(kalan).toHaveLength(1);
  });
});

describe("veritabanı", () => {
  const dogrudan = (degerler: Record<string, unknown>) =>
    vt
      .insert(stokBildirimiTalepleri)
      .values(degerler as typeof stokBildirimiTalepleri.$inferInsert)
      .then(
        () => "yazildi",
        (hata: { cause?: { constraint?: string } }) => hata.cause?.constraint,
      );

  it("durum listesi kayıtla aynı; bekleyende adres dolu, gönderilmişte boş ve gönderilme zamanı dolu", async () => {
    const { birim } = await tukenmisBirim();
    const { rows } = await vt.execute<{ tanim: string }>(
      sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'stok_bildirimi_talepleri_durum'`,
    );
    expect([...(rows[0]?.tanim ?? "").matchAll(/'([^']+)'/g)].map(([, ad]) => ad)).toEqual([
      ...stokBildirimiDurumlari,
    ]);
    expect(await dogrudan({ birim_kimligi: birim, eposta: eposta(), durum: "baska" })).toBe(
      "stok_bildirimi_talepleri_durum",
    );
    expect(await dogrudan({ birim_kimligi: birim, eposta: null, durum: "bekliyor" })).toBe(
      "stok_bildirimi_talepleri_eposta",
    );
    expect(
      await dogrudan({
        birim_kimligi: birim,
        eposta: eposta(),
        durum: "gonderildi",
        gonderilme_zamani: new Date(),
      }),
    ).toBe("stok_bildirimi_talepleri_eposta");
    expect(await dogrudan({ birim_kimligi: birim, eposta: null, durum: "gonderildi" })).toBe(
      "stok_bildirimi_talepleri_eposta",
    );
    const adres = eposta();
    expect(await dogrudan({ birim_kimligi: birim, eposta: adres, durum: "bekliyor" })).toBe(
      "yazildi",
    );
    expect(await dogrudan({ birim_kimligi: birim, eposta: adres, durum: "bekliyor" })).toBe(
      "stok_bildirimi_talepleri_bekleyen",
    );
  });

  it("iki site birbirinin talebini görmez", async () => {
    const a = await tukenmisBirim();
    const b = await tukenmisBirim({ veritabani: vtB });
    await servis.talepYaz(vt, a.birim, eposta());
    await servis.talepYaz(vtB, b.birim, eposta());
    expect(await hatasi(servis.talepYaz(vtB, a.birim, eposta()))).toMatchObject({
      kod: "bulunamadi",
    });
    const bListesi = (await servis.panelListesi(vtB)).map(({ birim }) => birim);
    expect(bListesi).toContain(b.birim);
    expect(bListesi).not.toContain(a.birim);
  });
});
