// Yönetici bildirimleri gerçek veritabanı ve yerel posta kutusuyla (kart 0241, karar 0154):
// - Sipariş olayları: vitrin siparişi, havale bildirimi, iade talebi, süresi dolan ve müşterinin iptali birer bildirim;
//   elle sipariş, mağazanın iptali ve öteki olaylar bildirim doğurmaz. Onay bekleyen yorum bildirim doğurur.
// - Bildirim olayla aynı işlemde kuyruğa girer (geri alınan işlemde yok), aynı olay için bir kez; kapalı bildirim
//   gitmez; alıcılar ayardaki adresler, boşsa tam yetkili rolün silinmemiş yöneticileri.
// - Kuyruğa giden veri ve e-posta müşterinin e-postasını, telefonunu, açık adresini ve soyadını taşımaz.
// - Stok: sipariş eşiği (ürünün eşiği önce) ya da sıfırı yukarıdan aşağı geçince bir kez, aynı anda iki düşürmede de;
//   elle düzeltme uyarmaz. Uyarılar tek e-postada toplanır, bir saat içinde ikinci e-posta gitmez (ertelenir).
// - Kartla ödemeye bağlı bildirimler eklenti kapalıyken gitmez ve ekranda görünmez.
// - Panelin kaydı: adreslerin ayrılması, küçük harf, sınır, geçersiz ve tekrar; görünmeyen bildirimin kayıtlı hâli
//   korunur; değişiklik kaydına adresler yazılmaz.
// - İki site ayrı kalır; e-posta gerçek posta kutusuna düşer.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { arkaPlanIsleri } from "../../../arka-plan-isleri/model.ts";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { epostaDurumu } from "../../../kayitlar/eposta.ts";
import {
  type YoneticiBildirimi,
  yoneticiBildirimSinirlari,
} from "../../../kayitlar/yonetici-bildirimi.ts";
import { siteninBicimleyicisi } from "../../../metinler/site-metni.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { tamYetkiliYoneticiAc } from "../../ekip/servis.ts";
import { type EpostaIletisi, epostaGondericisi } from "../../eposta/gonderici.ts";
import { epostaKaydiniGonder } from "../../eposta/gonderim.ts";
import { epostaKayitlari } from "../../eposta/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { siparisAyarlari } from "../../siparis/ayarlar.ts";
import { iadeServisi } from "../../siparis/iade.ts";
import { iadeTalebiServisi } from "../../siparis/iade-talebi.ts";
import { siparisler } from "../../siparis/model.ts";
import { elleSiparisSemasi } from "../../siparis/semalar.ts";
import { siparisServisi } from "../../siparis/servis.ts";
import { siparisYoneticiBildirimiYaz } from "../../siparis/yonetici-bildirimleri.ts";
import { siparisYonetimi } from "../../siparis/yonetim.ts";
import { birimStoklari } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { yorumServisi } from "../../yorum/servis.ts";
import { bildirimAcikMi, bildirimiGonder } from "../gonderim.ts";
import { stokUyarilari } from "../model.ts";
import { yoneticiBildirimiYaz } from "../servis.ts";
import { stokUyarilariniGonder } from "../stok-uyarisi.ts";

vi.setConfig({ testTimeout: 120_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const firmaKimligi = randomUUID();
const site: Site = {
  ...klasor,
  ayarlar: {
    ...klasor.ayarlar,
    epostaGonderenAdresi: "bildirim@ornek.test",
    eklentiler: ["kartla-odeme"],
  },
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak No: 1",
      postaKodu: "06000",
    },
    odemeYontemleri: [
      { kod: "havale", acik: true },
      { kod: "kapida-odeme", acik: true },
    ],
    kapidaOdemeSecenekleri: ["nakit", "kart"],
    bankaHesaplari: [
      {
        kimlik: randomUUID(),
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
    kargoFirmalari: [{ kimlik: firmaKimligi, ad: "Deneme Kargo" }],
    musteriIptali: "kargoya-verilene-kadar",
    dusukStokEsigi: 3,
    yorumYalnizSatinAlanlar: false,
  },
};
const bicim = siteninBicimleyicisi(site.ayarlar);
const odeme = odemeServisi(site);
const yonetim = siparisYonetimi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const yonetici = (): DegisikligiYapan & { tur: "yonetici" } => ({
  tur: "yonetici",
  kimlik: randomUUID(),
});

const hazirla = async (secilen: Site = site) => {
  vi.stubEnv("SITE_ADRESI", "");
  const deneme = await denemeSitesiAc("yonetici-bildirim");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(secilen).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async (g: { ad?: string; miktar?: number; esik?: number } = {}) => {
    const urun = await urunSrv.urunEkle(vt, yonetici(), {
      ad: g.ad ?? `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
      ...(g.esik === undefined ? {} : { dusukStokEsigi: g.esik }),
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    await stok.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: g.miktar ?? 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return { urun, birim };
  };
  const musteriAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  const sahipAc = async (eposta = `sahip-${randomUUID().slice(0, 8)}@ornek.test`) => {
    await tamYetkiliYoneticiAc(vt, { eposta, sifre: "uzun-bir-sifre-123" }, yonetici());
    return eposta;
  };
  return { vt, urunAc, musteriAc, sahipAc };
};

const bilgiler = (odemeYontemi: OdemeYontemiSecimi) =>
  odemeBilgileriSemasi.parse({
    odemeYontemi,
    teslimat: {
      ad: "Deniz",
      soyad: "Yılmaz",
      telefon: "0555 123 45 67",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Gizli Sokak No: 42",
        postaKodu: "06420",
      },
    },
    fatura: { tur: "bireysel", adresAyni: true },
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
  });
const havale: OdemeYontemiSecimi = { yontem: "havale" };
const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  yontem: OdemeYontemiSecimi,
  ek: { musteri?: string; eposta?: string } = {},
) => {
  const kim: OdemeGirdisi["kim"] =
    ek.musteri === undefined
      ? {
          tur: "misafir",
          eposta: ek.eposta ?? `musteri-${randomUUID().slice(0, 8)}@ornek.test`,
          hesap: { ac: false },
        }
      : { tur: "uye", musteri: ek.musteri };
  const sonuc = await odeme.siparisVer(vt, { kim, bilgiler: bilgiler(yontem), kalemler }, 3600);
  return sonuc.siparis.numara;
};

const siparisi = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};

type BildirimIsi = { bildirim: YoneticiBildirimi; anahtar: string; veri: Record<string, unknown> };
const bildirimIsleri = async (vt: Veritabani): Promise<BildirimIsi[]> =>
  (
    await vt
      .select({ girdi: arkaPlanIsleri.girdi })
      .from(arkaPlanIsleri)
      .where(eq(arkaPlanIsleri.tur, "yonetici-bildirimi"))
      .orderBy(asc(arkaPlanIsleri.olusturulma_zamani), asc(arkaPlanIsleri.kimlik))
  ).map((satir) => satir.girdi as BildirimIsi);
const numaraninBildirimleri = async (vt: Veritabani, numara: string) =>
  (await bildirimIsleri(vt))
    .filter((is) => (is.veri as { numara?: string }).numara === numara)
    .map((is) => is.bildirim);

// Kuyruktaki bildirim işlerini sitenin kendisiyle çalıştırır (arka plan sürecinin yaptığı).
const bildirimleriCalistir = async (vt: Veritabani, secilen: Site = site) => {
  for (const is of await bildirimIsleri(vt)) await bildirimiGonder(vt, secilen, is);
};
const epostalar = (vt: Veritabani, sablon?: string) =>
  vt
    .select()
    .from(epostaKayitlari)
    .where(
      sablon === undefined
        ? like(epostaKayitlari.sablon, "yonetici-%")
        : eq(epostaKayitlari.sablon, sablon),
    )
    .orderBy(asc(epostaKayitlari.olusturulma_zamani), asc(epostaKayitlari.kimlik));
const gonder = async (vt: Veritabani, kimlik: string) => {
  let ileti: EpostaIletisi | undefined;
  await epostaKaydiniGonder(vt, kimlik, {
    site,
    gonderici: async (giden) => {
      ileti = giden;
    },
  });
  if (ileti === undefined) throw new Error("E-posta gitmedi.");
  return ileti;
};

const ertelemeler: { gecikme: number; anahtar: string }[] = [];
const stokGonder = (vt: Veritabani, secilen: Site = site) =>
  stokUyarilariniGonder(vt, secilen, async (_islem, gecikme, anahtar) => {
    ertelemeler.push({ gecikme, anahtar });
  });

describe("sipariş olayları", () => {
  it("vitrin siparişi, havale bildirimi, iade talebi, süresi dolan ve müşterinin iptali birer bildirim; elle sipariş, mağazanın iptali ve öteki olaylar doğurmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const havaleli = await ver(h.vt, [{ birim, adet: 1 }], havale);
    expect(await numaraninBildirimleri(h.vt, havaleli)).toEqual(["yeni-siparis"]);
    const { eposta } = await siparisi(h.vt, havaleli);
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta },
      {
        numara: havaleli,
        gonderen: "Deniz Yılmaz",
        hesap: site.baslangic.bankaHesaplari?.[0]?.kimlik ?? "",
        tutar: bicim.paraYazisi((await siparisi(h.vt, havaleli)).toplam),
        odemeTarihi: new Date().toISOString().slice(0, 10),
      },
    );
    expect(await numaraninBildirimleri(h.vt, havaleli)).toEqual([
      "yeni-siparis",
      "havale-bildirimi",
    ]);
    // Onay, kargo, teslim bildirim doğurmaz.
    const kim = yonetici();
    await yonetim.islemYap(h.vt, kim, {
      numara: havaleli,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yonetim.islemYap(h.vt, kim, {
      numara: havaleli,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi },
    });
    await yonetim.islemYap(h.vt, kim, {
      numara: havaleli,
      islem: "teslim-edildi",
      gorulenDurum: "kargoda",
    });
    expect(await numaraninBildirimleri(h.vt, havaleli)).toHaveLength(2);

    // İade talebi.
    const musteri = await h.musteriAc();
    const talepli = await ver(h.vt, [{ birim, adet: 2 }], kapida, { musteri });
    await yonetim.islemYap(h.vt, kim, {
      numara: talepli,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yonetim.islemYap(h.vt, kim, {
      numara: talepli,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi },
    });
    await yonetim.islemYap(h.vt, kim, {
      numara: talepli,
      islem: "teslim-edildi",
      gorulenDurum: "kargoda",
    });
    await iadeTalebiServisi(site).talepAc(
      h.vt,
      { tur: "musteri", musteri },
      { numara: talepli, kalemler: [{ sira: 0, adet: 1 }], neden: "beden-uymadi" },
    );
    expect(await numaraninBildirimleri(h.vt, talepli)).toEqual(["yeni-siparis", "iade-talebi"]);

    // Süresi dolan havale.
    const sureli = await ver(h.vt, [{ birim, adet: 1 }], havale);
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() - interval '1 second' where numara = ${sureli}`,
    );
    expect(await siparisServisi(site).havaleIptalTaramasi(h.vt)).toBe(1);
    expect(await numaraninBildirimleri(h.vt, sureli)).toEqual(["yeni-siparis", "iptal"]);

    // Müşterinin iptali.
    const musterininki = await ver(h.vt, [{ birim, adet: 1 }], kapida, { musteri });
    await iadeTalebiServisi(site).musteriIptali(
      h.vt,
      { tur: "musteri", musteri },
      { numara: musterininki, gorulenDurum: "odeme-bekleniyor" },
    );
    expect(await numaraninBildirimleri(h.vt, musterininki)).toEqual(["yeni-siparis", "iptal"]);

    // Mağazanın iptali bildirim doğurmaz.
    const magazaninki = await ver(h.vt, [{ birim, adet: 1 }], kapida);
    await iadeServisi(site).iadeYap(h.vt, yonetici(), {
      numara: magazaninki,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "stok-yok",
    });
    expect(await numaraninBildirimleri(h.vt, magazaninki)).toEqual(["yeni-siparis"]);

    // Elle sipariş bildirim doğurmaz.
    const elle = await odeme.elleSiparisVer(
      h.vt,
      randomUUID(),
      elleSiparisSemasi.parse({
        musteri: { tur: "misafir", eposta: "elle@ornek.test" },
        kalemler: [{ birim, adet: 1 }],
        bilgiler: {
          odemeYontemi: havale,
          teslimat: bilgiler(havale).teslimat,
          fatura: { tur: "bireysel", adresAyni: true },
          metinlerIletildi: true,
        },
        musteriyeEposta: true,
      }),
    );
    expect(await numaraninBildirimleri(h.vt, elle.numara)).toEqual([]);
  });

  it("onay bekleyen yorum bildirim doğurur; veri kısa adla", async () => {
    const h = await hazirla();
    await siteninServisi(site).degistir(h.vt, yonetici(), { yorumYalnizSatinAlanlar: false });
    const { urun } = await h.urunAc({ ad: "Deneme Fincanı" });
    const musteri = await h.musteriAc();
    const kimlik = await yorumServisi(site).yorumYaz(h.vt, musteri, {
      urun,
      puan: 4,
      ad: "Ayşe Kaya",
      metin: "Kahve için <b>ideal</b> boyut.",
    });
    const isler = (await bildirimIsleri(h.vt)).filter((is) => is.bildirim === "yorum");
    expect(isler).toEqual([
      {
        bildirim: "yorum",
        anahtar: `yorum:${kimlik}`,
        veri: {
          urun: "Deneme Fincanı",
          puan: 4,
          yazan: { ad: "Ayşe", harf: "K" },
          metin: "Kahve için <b>ideal</b> boyut.",
        },
      },
    ]);
    await h.sahipAc();
    await bildirimleriCalistir(h.vt);
    const [kayit] = await epostalar(h.vt, "yonetici-yorum");
    const ileti = await gonder(h.vt, kayit?.kimlik ?? "");
    expect(ileti.konu).toBe("Onay bekleyen yorum: Deneme Fincanı");
    // Yönetici e-postası üst şeridinde etiketiyle ayrılır (taslak).
    expect(ileti.html).toContain(">Yönetici bildirimi</span>");
    expect(ileti.metin).toContain("5 üzerinden 4 puan · Ayşe K.");
    expect(ileti.html).toContain("Kahve için &lt;b&gt;ideal&lt;/b&gt; boyut.");
    expect(ileti.html).not.toContain("<b>ideal</b>");
  });

  it("kuyruğa giden veri ve e-posta müşterinin e-postasını, telefonunu, açık adresini ve soyadını taşımaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const eposta = "gizli-musteri@ornek.test";
    const numara = await ver(h.vt, [{ birim, adet: 3 }], kapida, { eposta });
    const [is] = await bildirimIsleri(h.vt);
    const metin = JSON.stringify(is);
    for (const gizli of [eposta, "555", "Gizli Sokak", "06420", "Yılmaz"]) {
      expect(metin).not.toContain(gizli);
    }
    expect(is?.veri).toMatchObject({
      numara,
      musteri: { ad: "Deniz", harf: "Y" },
      uye: false,
      bolge: { ulke: "TR", il: "TR-06", ilce: "TR-06-007" },
      adet: 3,
      kalem: 1,
    });
    await h.sahipAc();
    await bildirimleriCalistir(h.vt);
    const [kayit] = await epostalar(h.vt, "yonetici-yeni-siparis");
    const ileti = await gonder(h.vt, kayit?.kimlik ?? "");
    const s = await siparisi(h.vt, numara);
    expect(ileti.konu).toBe(`Yeni sipariş: ${numara} · ${bicim.para(s.toplam)}`);
    expect(ileti.metin).toContain("Deniz Y. (üye değil)");
    expect(ileti.metin).toContain("Kapıda ödeme · Nakit");
    expect(ileti.metin).toContain("Çankaya / Ankara");
    expect(ileti.metin).toContain("3 adet, 1 kalem");
    expect(ileti.metin).toContain(`/yonetim/siparisler/ayrinti?numara=${numara}`);
    for (const gizli of [eposta, "555", "Gizli Sokak", "06420", "Yılmaz"]) {
      expect(ileti.metin).not.toContain(gizli);
      expect(ileti.html).not.toContain(gizli);
    }
  });
});

describe("tek işlem, tek bildirim, açıklık ve alıcılar", () => {
  it("geri alınan işlemde bildirim kuyruğa girmez; aynı olayın ikinci bildirimi ve e-postası yazılmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], havale);
    const { kimlik } = await siparisi(h.vt, numara);
    await expect(
      h.vt.transaction(async (islem) => {
        await siparisYoneticiBildirimiYaz(islem, {
          siparis: kimlik,
          bildirim: "iptal",
          anahtar: "deneme:geri-al",
          neden: "musteri-iptali",
        });
        throw new Error("geri al");
      }),
    ).rejects.toThrow("geri al");
    expect(await numaraninBildirimleri(h.vt, numara)).toEqual(["yeni-siparis"]);

    const veri = { numara, neden: "musteri-iptali" as const, toplam: 1 };
    await yoneticiBildirimiYaz(h.vt, { bildirim: "iptal", anahtar: "deneme:tek", veri });
    await yoneticiBildirimiYaz(h.vt, { bildirim: "iptal", anahtar: "deneme:tek", veri });
    await Promise.all(
      [1, 2, 3].map(() =>
        yoneticiBildirimiYaz(h.vt, { bildirim: "iptal", anahtar: "deneme:ayni-anda", veri }),
      ),
    );
    expect(await numaraninBildirimleri(h.vt, numara)).toEqual(["yeni-siparis", "iptal", "iptal"]);
    const alici = await h.sahipAc();
    const is = { bildirim: "iptal" as const, anahtar: "deneme:tek", veri };
    expect(await bildirimiGonder(h.vt, site, is)).toBe(1);
    expect(await bildirimiGonder(h.vt, site, is)).toBe(1);
    expect((await epostalar(h.vt, "yonetici-iptal")).filter((k) => k.alici === alici)).toHaveLength(
      1,
    );
  });

  it("kapalı bildirim gitmez; alıcılar ayardaki adresler, boşsa tam yetkili rolün silinmemiş yöneticileri", async () => {
    const h = await hazirla();
    const birinci = await h.sahipAc("birinci-sahip@ornek.test");
    const ikinci = await h.sahipAc("ikinci-sahip@ornek.test");
    const silinen = await h.sahipAc("silinen-sahip@ornek.test");
    await h.vt.execute(
      sql`update yoneticiler set silinme_zamani = now() where eposta = ${silinen}`,
    );
    // Rolsüz yönetici alıcı değildir.
    await hesapAc(h.vt, "yonetici", { eposta: "rolsuz@ornek.test", sifre: "uzun-bir-sifre-123" });
    const is = (anahtar: string) => ({
      bildirim: "iptal" as const,
      anahtar,
      veri: { numara: "DEN-1", neden: "musteri-iptali", toplam: 1 },
    });
    expect(await bildirimiGonder(h.vt, site, is("a"))).toBe(2);
    expect((await epostalar(h.vt)).map((k) => k.alici).sort()).toEqual([birinci, ikinci]);

    const ayarlar = siparisAyarlari(site);
    await ayarlar.yoneticiBildirimleriniKaydet(h.vt, yonetici(), {
      alicilar: " Muhasebe@Ornek.test;  depo@ornek.test ",
      kapalilar: [],
    });
    expect(await bildirimiGonder(h.vt, site, is("b"))).toBe(2);
    expect(
      (await epostalar(h.vt))
        .filter((k) => k.olay_anahtari?.startsWith("b:"))
        .map((k) => k.alici)
        .sort(),
    ).toEqual(["depo@ornek.test", "muhasebe@ornek.test"]);

    // Uzun adres (ayar 254 harfe izin verir) tekrar anahtarını sınırın üstüne taşırmaz (bağımsız kontrolün bulgusu).
    const uzun = `uzun@${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(60)}.test`;
    await ayarlar.yoneticiBildirimleriniKaydet(h.vt, yonetici(), {
      alicilar: uzun,
      kapalilar: [],
    });
    expect(await bildirimiGonder(h.vt, site, is("uzun"))).toBe(1);
    expect((await epostalar(h.vt)).map((k) => k.alici)).toContain(uzun);

    await ayarlar.yoneticiBildirimleriniKaydet(h.vt, yonetici(), {
      alicilar: "depo@ornek.test",
      kapalilar: ["iptal"],
    });
    expect(await bildirimiGonder(h.vt, site, is("c"))).toBe(0);
    expect((await epostalar(h.vt)).filter((k) => k.olay_anahtari?.startsWith("c:"))).toEqual([]);
  });

  it("kartla ödemeye bağlı bildirimler eklenti kapalıyken gitmez, görünmez ve kaydedilemez; görünmeyenin kayıtlı hâli korunur", async () => {
    const eklentisiz: Site = { ...site, ayarlar: { ...site.ayarlar, eklentiler: [] } };
    const h = await hazirla(eklentisiz);
    await h.sahipAc();
    const ayarlar = { kapaliYoneticiBildirimleri: [] };
    expect(bildirimAcikMi(eklentisiz, ayarlar, "bekleyen-iade")).toBe(false);
    expect(bildirimAcikMi(eklentisiz, ayarlar, "kartla-odeme-uyusmazligi")).toBe(false);
    expect(bildirimAcikMi(site, ayarlar, "bekleyen-iade")).toBe(true);
    expect(
      await bildirimiGonder(h.vt, eklentisiz, {
        bildirim: "bekleyen-iade",
        anahtar: "x",
        veri: { numara: "DEN-1", neden: "raporda-yok" },
      }),
    ).toBe(0);
    expect(siparisAyarlari(eklentisiz).gorunenBildirimler()).not.toContain("bekleyen-iade");
    expect(siparisAyarlari(site).gorunenBildirimler()).toContain("bekleyen-iade");
    // Eklenti açıkken kapatılan, eklenti kapalıyken kaydedilen ayarda korunur.
    await siparisAyarlari(site).yoneticiBildirimleriniKaydet(h.vt, yonetici(), {
      alicilar: "",
      kapalilar: ["bekleyen-iade", "stok"],
    });
    await expect(
      siparisAyarlari(eklentisiz).yoneticiBildirimleriniKaydet(h.vt, yonetici(), {
        alicilar: "",
        kapalilar: ["bekleyen-iade"],
      }),
    ).rejects.toMatchObject({
      kod: "dogrulama",
      ayrinti: [{ alan: "kapalilar", kod: "bildirim-yok" }],
    });
    const sonuc = await siparisAyarlari(eklentisiz).yoneticiBildirimleriniKaydet(h.vt, yonetici(), {
      alicilar: "",
      kapalilar: [],
    });
    expect(sonuc.kapaliYoneticiBildirimleri).toEqual(["bekleyen-iade"]);
  });

  it("panelin kaydı: sınır, geçersiz adres ve tekrar alanın koduyla, hiçbir şey yazılmaz; değişiklik kaydına adres yazılmaz", async () => {
    const h = await hazirla();
    const ayarlar = siparisAyarlari(site);
    const hata = async (alicilar: string) => {
      try {
        await ayarlar.yoneticiBildirimleriniKaydet(h.vt, yonetici(), { alicilar, kapalilar: [] });
      } catch (yakalanan) {
        if (yakalanan instanceof BilinenHata) return yakalanan.ayrinti;
        throw yakalanan;
      }
      throw new Error("Hata bekleniyordu.");
    };
    const altiAdres = Array.from(
      { length: yoneticiBildirimSinirlari.aliciEnCok + 1 },
      (_, i) => `a${i}@ornek.test`,
    ).join(", ");
    expect(await hata(altiAdres)).toEqual([{ alan: "alicilar", kod: "alici-siniri" }]);
    expect(await hata("a@ornek.test, değil-bir-adres")).toEqual([
      { alan: "alicilar", kod: "eposta-gecersiz" },
    ]);
    expect(await hata("a@ornek.test, A@ornek.test")).toEqual([
      { alan: "alicilar", kod: "alici-tekrari" },
    ]);
    expect((await ayarlar.oku(h.vt)).yoneticiBildirimAlicilari).toEqual([]);
    const kim = yonetici();
    const sonuc = await ayarlar.yoneticiBildirimleriniKaydet(h.vt, kim, {
      alicilar: "Sahip@Ornek.test",
      kapalilar: ["yorum"],
    });
    expect(sonuc).toMatchObject({
      yoneticiBildirimAlicilari: ["sahip@ornek.test"],
      kapaliYoneticiBildirimleri: ["yorum"],
    });
    const kayitlar = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kim_kimligi, kim.kimlik));
    expect(kayitlar.length).toBeGreaterThan(0);
    expect(JSON.stringify(kayitlar)).not.toContain("sahip@ornek.test");
  });
});

describe("stok uyarısı", () => {
  it("sipariş eşiği ve sıfırı yukarıdan aşağı geçince bir kez; ürünün eşiği önce gelir; elle düzeltme uyarmaz", async () => {
    const h = await hazirla();
    // Sitenin eşiği 3: 5 → 3 düşük, 3 → 2 yok, 2 → 0 tükendi.
    const { birim } = await h.urunAc({ miktar: 5 });
    await ver(h.vt, [{ birim, adet: 2 }], kapida);
    await ver(h.vt, [{ birim, adet: 1 }], kapida);
    await ver(h.vt, [{ birim, adet: 2 }], kapida);
    // Ürünün kendi eşiği 10: 12 → 10 düşük (sitenin eşiği 3 değil).
    const kendi = await h.urunAc({ miktar: 12, esik: 10 });
    await ver(h.vt, [{ birim: kendi.birim, adet: 2 }], kapida);
    // Elle düzeltme eşiği geçse de uyarmaz.
    const elle = await h.urunAc({ miktar: 9 });
    await stok.stokDuzelt(h.vt, yonetici(), elle.birim, {
      yeniMiktar: 0,
      gorulenMiktar: 9,
      sebep: "sayim",
    });
    const satirlar = await h.vt
      .select({
        birim: stokUyarilari.birim_kimligi,
        tur: stokUyarilari.tur,
        miktar: stokUyarilari.miktar,
      })
      .from(stokUyarilari)
      .orderBy(asc(stokUyarilari.olusturma_zamani));
    expect(satirlar).toEqual([
      { birim, tur: "dusuk", miktar: 3 },
      { birim, tur: "tukendi", miktar: 0 },
      { birim: kendi.birim, tur: "dusuk", miktar: 10 },
    ]);
    // Her uyarıyla gönderim işi kuyruğa girer.
    const isler = await h.vt
      .select()
      .from(arkaPlanIsleri)
      .where(eq(arkaPlanIsleri.tur, "yonetici-stok-uyarisi"));
    expect(isler).toHaveLength(3);
  });

  it("aynı anda iki düşürmede eşik bir kez uyarır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc({ miktar: 4 });
    await Promise.all([
      ver(h.vt, [{ birim, adet: 1 }], kapida),
      ver(h.vt, [{ birim, adet: 1 }], kapida),
    ]);
    const [stokSatiri] = await h.vt
      .select()
      .from(birimStoklari)
      .where(eq(birimStoklari.birim_kimligi, birim));
    expect(stokSatiri?.miktar).toBe(2);
    expect(
      await h.vt.select().from(stokUyarilari).where(eq(stokUyarilari.birim_kimligi, birim)),
    ).toMatchObject([{ tur: "dusuk", miktar: 3 }]);
  });

  it("uyarılar tek e-postada toplanır; bir saat içinde ikinci e-posta gitmez, ertelenir; kapalıyken işlenir, gitmez", async () => {
    const h = await hazirla();
    const alici = await h.sahipAc();
    const a = await h.urunAc({ ad: "Deneme Ceketi", miktar: 1 });
    const b = await h.urunAc({ ad: "Deneme Şişesi", miktar: 4 });
    await ver(h.vt, [{ birim: a.birim, adet: 1 }], kapida);
    await ver(h.vt, [{ birim: b.birim, adet: 1 }], kapida);
    ertelemeler.length = 0;
    expect(await stokGonder(h.vt)).toBe(2);
    const ilk = await epostalar(h.vt, "yonetici-stok");
    expect(ilk.map((k) => k.alici)).toEqual([alici]);
    const ileti = await gonder(h.vt, ilk[0]?.kimlik ?? "");
    expect(ileti.konu).toBe("Stok uyarısı: 2 ürün");
    expect(ileti.metin).toContain("Deneme Ceketi");
    expect(ileti.metin).toContain("Tükendi");
    expect(ileti.metin).toContain("3 adet kaldı");
    // Bekleyen yokken iş bir şey yapmaz.
    expect(await stokGonder(h.vt)).toBe(0);

    // Bir saat dolmadan gelen uyarı ertelenir, e-posta gitmez.
    await ver(h.vt, [{ birim: b.birim, adet: 3 }], kapida);
    expect(await stokGonder(h.vt)).toBe(0);
    expect(await epostalar(h.vt, "yonetici-stok")).toHaveLength(1);
    expect(ertelemeler).toHaveLength(1);
    // Kalan süre (bir saatin altında) ve saat farkı payı kadar ertelenir.
    const { stokAraligiSaniye: aralik, stokErtelemePayiSaniye: pay } = yoneticiBildirimSinirlari;
    expect(ertelemeler[0]?.gecikme).toBeGreaterThan(aralik - 60 + pay);
    expect(ertelemeler[0]?.gecikme).toBeLessThanOrEqual(aralik + pay);
    // Bir saat geçince gider.
    await h.vt.execute(
      sql`update stok_uyarilari set gonderim_zamani = gonderim_zamani - make_interval(secs => ${yoneticiBildirimSinirlari.stokAraligiSaniye + 1}) where gonderim_zamani is not null`,
    );
    expect(await stokGonder(h.vt)).toBe(1);
    expect(await epostalar(h.vt, "yonetici-stok")).toHaveLength(2);

    // Kapalıyken bekleyenler işlenir, e-posta gitmez.
    await siparisAyarlari(site).yoneticiBildirimleriniKaydet(h.vt, yonetici(), {
      alicilar: "",
      kapalilar: ["stok"],
    });
    const c = await h.urunAc({ miktar: 1 });
    await ver(h.vt, [{ birim: c.birim, adet: 1 }], kapida);
    expect(await stokGonder(h.vt)).toBe(0);
    expect(await epostalar(h.vt, "yonetici-stok")).toHaveLength(2);
    expect(
      await h.vt
        .select()
        .from(stokUyarilari)
        .where(and(eq(stokUyarilari.birim_kimligi, c.birim))),
    ).toMatchObject([{ gonderim_zamani: null }]);
    const [islenmis] = await h.vt
      .select()
      .from(stokUyarilari)
      .where(eq(stokUyarilari.birim_kimligi, c.birim));
    expect(islenmis?.islenme_zamani).not.toBeNull();
  });
});

describe("e-posta ve siteler", () => {
  it("havale bildirimi ve iade talebi e-postası; gerçek posta kutusuna düşer", async () => {
    const h = await hazirla();
    const alici = `sahip-${randomUUID().slice(0, 8)}@ornek.test`;
    await h.sahipAc(alici);
    const { birim } = await h.urunAc({ ad: "Deneme Şişesi" });
    const numara = await ver(h.vt, [{ birim, adet: 1 }], havale);
    const { eposta, toplam } = await siparisi(h.vt, numara);
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta },
      {
        numara,
        gonderen: "Deniz Yılmaz",
        hesap: site.baslangic.bankaHesaplari?.[0]?.kimlik ?? "",
        tutar: bicim.paraYazisi(toplam),
        odemeTarihi: "2026-11-19",
      },
    );
    await bildirimleriCalistir(h.vt);
    const [kayit] = await epostalar(h.vt, "yonetici-havale-bildirimi");
    const gercek = epostaGondericisi(`smtp://localhost:${process.env["POSTA_SMTP_PORTU"]}`);
    if (gercek === undefined) throw new Error("Yerel posta kutusu yok.");
    await epostaKaydiniGonder(h.vt, kayit?.kimlik ?? "", { site, gonderici: gercek });
    const yanit = await fetch(
      `http://127.0.0.1:${process.env["POSTA_KUTUSU_PORTU"]}/api/v1/search?query=${encodeURIComponent(`to:"${alici}"`)}`,
    );
    const { messages } = (await yanit.json()) as { messages: { Subject: string; ID: string }[] };
    expect(messages.map((m) => m.Subject)).toContain(
      `Havale bildirimi: ${numara} · ${bicim.para(toplam)}`,
    );
    const [gonderilen] = await h.vt
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.kimlik, kayit?.kimlik ?? ""));
    expect(gonderilen?.durum).toBe(epostaDurumu.gonderildi);
  });

  it("iki site birbirinin bildirimini görmez", async () => {
    const a = await hazirla();
    const b = await hazirla();
    const { birim } = await a.urunAc();
    await ver(a.vt, [{ birim, adet: 1 }], kapida);
    expect(await bildirimIsleri(a.vt)).toHaveLength(1);
    expect(await bildirimIsleri(b.vt)).toHaveLength(0);
    expect(
      await b.vt
        .select()
        .from(arkaPlanIsleri)
        .where(inArray(arkaPlanIsleri.tur, ["yonetici-bildirimi", "yonetici-stok-uyarisi"])),
    ).toHaveLength(0);
  });
});
