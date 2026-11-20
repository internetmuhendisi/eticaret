// Müşteriye giden sipariş e-postaları gerçek veritabanı ve yerel posta kutusuyla (kart 0240, karar 0153):
// - Her olay bir kez bir e-posta: sipariş alındı (havale, kapıda, elle), havale onaylandı, kargoya verildi, teslim
//   edildi, iptal (süre doldu, mağaza, müşteri), tam ve kısmi iade, müşteriye not, iade talebi alındı, onaylandı,
//   reddedildi. Hazırlamaya alma, kargo düzeltme, havale bildirimi ve iç not göndermez.
// - E-posta değişiklikle aynı işlemde yazılır: işlem geri alınırsa e-posta da yok. Aynı olayın ikinci e-postası
//   yazılmaz (sırayla ve aynı anda).
// - İçerik siparişin saklanan değerleriyle: tutarlar, oran oran vergi, kalemler, banka hesapları, kargo, iade tutarı ve
//   vergisi; HTML kaçırılır; üye olmayanın bağlantısı takip sayfasıdır, e-posta adrese yazılmaz.
// - Elle siparişte e-posta seçimdir; kişisel bilgisi silinmiş siparişe e-posta yazılmaz; gönderen adresi olmayan
//   sitede gitmez; iki site ayrı kalır; e-posta gerçek posta kutusuna düşer.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, asc, eq, like, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { arkaPlanIsleri } from "../../../arka-plan-isleri/model.ts";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { epostaDurumu, epostaSablonlari } from "../../../kayitlar/eposta.ts";
import {
  iadeTalebiSuresiSinirlari,
  siparisGecmisiEpostalari,
  siparisGecmisiNedenleri,
} from "../../../kayitlar/siparis.ts";
import { siteninBicimleyicisi } from "../../../metinler/site-metni.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { type EpostaIletisi, epostaGondericisi } from "../../eposta/gonderici.ts";
import { epostaKaydiniGonder } from "../../eposta/gonderim.ts";
import { epostaKayitlari } from "../../eposta/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { siparisEpostaIcerikleri } from "../eposta-icerigi.ts";
import { siparisEpostasiYaz } from "../epostalar.ts";
import { gecmiseYaz } from "../gecmis.ts";
import { iadeServisi } from "../iade.ts";
import { iadeTalebiServisi } from "../iade-talebi.ts";
import { siparisIadeleri, siparisler } from "../model.ts";
import { elleSiparisSemasi } from "../semalar.ts";
import { siparisServisi } from "../servis.ts";
import { kisiselVeriTemizligi } from "../temizlik.ts";
import { siparisYonetimi } from "../yonetim.ts";

vi.setConfig({ testTimeout: 90_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const firmaKimligi = randomUUID();
const site: Site = {
  ...klasor,
  ayarlar: { ...klasor.ayarlar, epostaGonderenAdresi: "siparis@ornek.test" },
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
    iletisimTelefonu: "+90 312 000 00 00",
    saticiBilgileri: { ulke: "TR", isletmeTuru: "sirket", unvan: "Deneme Ticaret A.Ş." },
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
    kargoFirmalari: [
      {
        kimlik: firmaKimligi,
        ad: "Deneme Kargo",
        takipAdresi: "https://takip.deneme-kargo.test/sorgu/{takip}",
      },
    ],
    musteriIptali: "kargoya-verilene-kadar",
  },
};
const kok = "https://deneme.example";
const bicim = siteninBicimleyicisi(site.ayarlar);
const odeme = odemeServisi(site);
const yonetim = siparisYonetimi(site);
const iade = iadeServisi(site);
const talepSrv = iadeTalebiServisi(site);
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

const hazirla = async () => {
  vi.stubEnv("SITE_ADRESI", "");
  const deneme = await denemeSitesiAc("siparis-eposta");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async (ad = `Ürün ${randomUUID().slice(0, 8)}`) => {
    const urun = await urunSrv.urunEkle(vt, yonetici(), {
      ad,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 12_345 });
    await stok.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return birim;
  };
  const musteriAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  return { vt, urunAc, musteriAc };
};

const bilgiler = (odemeYontemi: OdemeYontemiSecimi) =>
  odemeBilgileriSemasi.parse({
    odemeYontemi,
    teslimat: {
      ad: "Deniz",
      soyad: "Yılmaz",
      telefon: "0555 000 00 00",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Atatürk Bulvarı No: 10",
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

const yeniAdres = () => `musteri-${randomUUID().slice(0, 8)}@ornek.test`;

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  yontem: OdemeYontemiSecimi,
  ek: { musteri?: string; eposta?: string } = {},
) => {
  const kim: OdemeGirdisi["kim"] =
    ek.musteri === undefined
      ? { tur: "misafir", eposta: ek.eposta ?? yeniAdres(), hesap: { ac: false } }
      : { tur: "uye", musteri: ek.musteri };
  const sonuc = await odeme.siparisVer(vt, { kim, bilgiler: bilgiler(yontem), kalemler }, 3600);
  return sonuc.siparis.numara;
};

const siparisi = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};

// Bir siparişin e-postaları yazılma sırasıyla (alıcı siparişin e-postasıdır, her siparişte ayrı).
const epostalari = async (vt: Veritabani, numara: string) => {
  const { eposta } = await siparisi(vt, numara);
  return vt
    .select()
    .from(epostaKayitlari)
    .where(eq(epostaKayitlari.alici, eposta))
    .orderBy(asc(epostaKayitlari.olusturulma_zamani), asc(epostaKayitlari.kimlik));
};
const sablonlari = async (vt: Veritabani, numara: string) =>
  (await epostalari(vt, numara)).map((kayit) => kayit.sablon);

// Kaydı gönderir, giden iletiyi döner (gönderici yakalanır).
const gonder = async (vt: Veritabani, kimlik: string, secilen: Site = site) => {
  let ileti: EpostaIletisi | undefined;
  await epostaKaydiniGonder(vt, kimlik, {
    site: secilen,
    gonderici: async (giden) => {
      ileti = giden;
    },
  });
  return ileti;
};
const sonEposta = async (vt: Veritabani, numara: string, sablon: string) => {
  const kayit = (await epostalari(vt, numara)).filter((k) => k.sablon === sablon).at(-1);
  if (kayit === undefined) throw new Error(`${sablon} e-postası yok.`);
  const ileti = await gonder(vt, kayit.kimlik);
  if (ileti === undefined) throw new Error("E-posta gitmedi.");
  return ileti;
};

const ilerlet = async (vt: Veritabani, numara: string, kadar: "kargoda" | "teslim-edildi") => {
  const kim = yonetici();
  await yonetim.islemYap(vt, kim, {
    numara,
    islem: "hazirlamaya-al",
    gorulenDurum: "odeme-bekleniyor",
  });
  await yonetim.islemYap(vt, kim, {
    numara,
    islem: "kargoya-ver",
    gorulenDurum: "hazirlaniyor",
    kargo: { firma: firmaKimligi, takipNumarasi: "TK123" },
  });
  if (kadar === "teslim-edildi") {
    await yonetim.islemYap(vt, kim, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
  }
};

describe("kayıt", () => {
  it("e-posta gönderen her geçmiş nedeninin şablonu kayıtta ve içeriği var", () => {
    for (const neden of siparisGecmisiNedenleri) {
      const eposta = siparisGecmisiEpostalari[neden];
      if (eposta === null) continue;
      const sablonlar =
        eposta === "iade" ? (["siparis-iadesi", "siparis-kismi-iadesi"] as const) : [eposta];
      for (const sablon of sablonlar) {
        expect(epostaSablonlari).toContain(sablon);
        expect(siparisEpostaIcerikleri).toHaveProperty(sablon);
      }
    }
    expect(siparisEpostaIcerikleri).toHaveProperty("musteriye-not");
  });
});

describe("olaylar", () => {
  it("havaleli siparişin her olayı bir e-posta; hazırlama, kargo düzeltme, bildirim ve iç not göndermez", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], havale);
    expect(await sablonlari(h.vt, numara)).toEqual(["siparis-alindi"]);
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta: (await siparisi(h.vt, numara)).eposta },
      {
        numara,
        gonderen: "Deniz Yılmaz",
        hesap: site.baslangic.bankaHesaplari?.[0]?.kimlik ?? "",
        tutar: bicim.paraYazisi((await siparisi(h.vt, numara)).toplam),
        odemeTarihi: new Date().toISOString().slice(0, 10),
      },
    );
    const kim = yonetici();
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi, takipNumarasi: "TK1" },
    });
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargo-duzelt",
      gorulenDurum: "kargoda",
      kargo: { firma: firmaKimligi, takipNumarasi: "TK2" },
    });
    await yonetim.islemYap(h.vt, kim, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
    await yonetim.notEkle(h.vt, kim, { numara, tur: "ic", metin: "İç not" });
    await yonetim.notEkle(h.vt, kim, {
      numara,
      tur: "musteri",
      metin: "Hediye paketiyle gönderdik.",
    });
    expect(await sablonlari(h.vt, numara)).toEqual([
      "siparis-alindi",
      "havale-onaylandi",
      "kargoya-verildi",
      "teslim-edildi",
      "musteriye-not",
    ]);
    // Her e-posta kuyruğa bir iş olarak girer.
    const kayitlar = await epostalari(h.vt, numara);
    const isler = await h.vt
      .select({ girdi: arkaPlanIsleri.girdi })
      .from(arkaPlanIsleri)
      .where(eq(arkaPlanIsleri.tur, "eposta-gonder"));
    for (const kayit of kayitlar) {
      expect(
        isler.filter((is) => (is.girdi as { kayitKimligi: string }).kayitKimligi === kayit.kimlik),
      ).toHaveLength(1);
    }
  });

  it("kapıda ödemede hazırlamaya alma göndermez; teslim e-postası iade talebinin son gününü söyler", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], kapida);
    await ilerlet(h.vt, numara, "teslim-edildi");
    expect(await sablonlari(h.vt, numara)).toEqual([
      "siparis-alindi",
      "kargoya-verildi",
      "teslim-edildi",
    ]);
    const [son] = (
      await h.vt.execute<{ son: string }>(
        sql`select (teslim_zamani + make_interval(days => ${iadeTalebiSuresiSinirlari.varsayilan})) as son from siparisler where numara = ${numara}`,
      )
    ).rows;
    const ileti = await sonEposta(h.vt, numara, "teslim-edildi");
    expect(ileti.metin).toContain(bicim.uzunTarih(new Date(String(son?.son))));
    const alindi = await sonEposta(h.vt, numara, "siparis-alindi");
    expect(alindi.metin).toContain("teslimatta kuryeye yapacaksınız: Nakit");
  });

  it("süresi dolan, mağazanın ve müşterinin iptali iptal e-postası, nedeniyle", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const sureli = await ver(h.vt, [{ birim, adet: 1 }], havale);
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() - interval '1 second' where numara = ${sureli}`,
    );
    expect(await siparisServisi(site).havaleIptalTaramasi(h.vt)).toBe(1);
    expect(await sablonlari(h.vt, sureli)).toEqual(["siparis-alindi", "siparis-iptali"]);
    expect((await sonEposta(h.vt, sureli, "siparis-iptali")).metin).toContain(
      "ödeme süresi içinde ödenmediği için",
    );

    // Ödemesi alınmış havalenin mağaza iptali: para elle döner.
    const odenmis = await ver(h.vt, [{ birim, adet: 1 }], havale);
    await yonetim.islemYap(h.vt, yonetici(), {
      numara: odenmis,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    await iade.iadeYap(h.vt, yonetici(), {
      numara: odenmis,
      tur: "iptal",
      gorulenDurum: "hazirlaniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "stok-yok",
    });
    const magazaIptali = await sonEposta(h.vt, odenmis, "siparis-iptali");
    expect(magazaIptali.metin).toContain("mağaza tarafından iptal edildi");
    expect(magazaIptali.metin).toContain(
      `${bicim.para((await siparisi(h.vt, odenmis)).toplam)} size geri gönderilecek`,
    );

    const musteri = await h.musteriAc();
    const musterininki = await ver(h.vt, [{ birim, adet: 1 }], kapida, { musteri });
    await talepSrv.musteriIptali(
      h.vt,
      { tur: "musteri", musteri },
      { numara: musterininki, gorulenDurum: "odeme-bekleniyor" },
    );
    expect((await sonEposta(h.vt, musterininki, "siparis-iptali")).metin).toContain(
      "isteğiniz üzerine iptal edildi",
    );
  });

  it("kısmi ve tam iade: iade edilen ürünler, iade tutarı ve vergisi iade kaydıyla aynı", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], kapida);
    await ilerlet(h.vt, numara, "teslim-edildi");
    await iade.iadeYap(h.vt, yonetici(), {
      numara,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "beden-uymadi",
    });
    await iade.iadeYap(h.vt, yonetici(), {
      numara,
      tur: "iade",
      gorulenDurum: "kismi-iade",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: true,
      stogaKoy: true,
      neden: "beden-uymadi",
    });
    expect((await sablonlari(h.vt, numara)).slice(-2)).toEqual([
      "siparis-kismi-iadesi",
      "siparis-iadesi",
    ]);
    const iadeler = await h.vt
      .select()
      .from(siparisIadeleri)
      .where(eq(siparisIadeleri.siparis_kimligi, (await siparisi(h.vt, numara)).kimlik))
      .orderBy(asc(siparisIadeleri.olusturma_zamani));
    for (const [sablon, satir] of [
      ["siparis-kismi-iadesi", iadeler[0]],
      ["siparis-iadesi", iadeler[1]],
    ] as const) {
      if (satir === undefined) throw new Error("İade yok.");
      const { metin } = await sonEposta(h.vt, numara, sablon);
      expect(metin).toContain(`İade tutarı: ${bicim.para(satir.tutar)}`);
      for (const vergi of satir.vergi_dokumu) {
        expect(metin).toContain(bicim.para(vergi.vergi));
      }
      expect(metin).toContain("1 adet");
    }
  });

  it("iade talebi alındı, onaylandı (iade kargosu) ve reddedildi (açıklamasıyla)", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const musteri = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], kapida, { musteri });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const birinci = await talepSrv.talepAc(
      h.vt,
      { tur: "musteri", musteri },
      { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "kusurlu-hasarli" },
    );
    await talepSrv.kararVer(h.vt, yonetici(), { numara, talep: birinci.talep, karar: "onayla" });
    const ikinci = await talepSrv.talepAc(
      h.vt,
      { tur: "musteri", musteri },
      { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "diger" },
    );
    await talepSrv.kararVer(h.vt, yonetici(), {
      numara,
      talep: ikinci.talep,
      karar: "reddet",
      retAciklamasi: "Ürün <kullanılmış> geldi.",
    });
    expect((await sablonlari(h.vt, numara)).slice(-4)).toEqual([
      "iade-talebi-alindi",
      "iade-talebi-onaylandi",
      "iade-talebi-alindi",
      "iade-talebi-reddedildi",
    ]);
    const alindi = (await epostalari(h.vt, numara)).find((k) => k.sablon === "iade-talebi-alindi");
    const alindiIletisi = await gonder(h.vt, alindi?.kimlik ?? "");
    expect(alindiIletisi?.metin).toContain("Kusurlu ya da hasarlı");
    const onay = await sonEposta(h.vt, numara, "iade-talebi-onaylandi");
    expect(onay.metin).toContain("İade kargosunun ücretini mağaza öder.");
    expect(onay.metin).toContain("Deneme Ticaret A.Ş.");
    const ret = await sonEposta(h.vt, numara, "iade-talebi-reddedildi");
    expect(ret.metin).toContain("Ürün <kullanılmış> geldi.");
    expect(ret.html).toContain("Ürün &lt;kullanılmış&gt; geldi.");
    expect(ret.html).not.toContain("<kullanılmış>");
  });

  it("elle siparişte e-posta seçimdir", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const elle = (musteriyeEposta: boolean, eposta: string) =>
      odeme.elleSiparisVer(
        h.vt,
        randomUUID(),
        elleSiparisSemasi.parse({
          musteri: { tur: "misafir", eposta },
          kalemler: [{ birim, adet: 1 }],
          bilgiler: {
            odemeYontemi: havale,
            teslimat: bilgiler(havale).teslimat,
            fatura: { tur: "bireysel", adresAyni: true },
            metinlerIletildi: true,
          },
          musteriyeEposta,
        }),
      );
    const gonderilen = await elle(true, yeniAdres());
    const gonderilmeyen = await elle(false, yeniAdres());
    expect(await sablonlari(h.vt, gonderilen.numara)).toEqual(["siparis-alindi"]);
    expect(await sablonlari(h.vt, gonderilmeyen.numara)).toEqual([]);
    // Sonraki olaylar elle siparişte de e-posta gönderir.
    await yonetim.islemYap(h.vt, yonetici(), {
      numara: gonderilmeyen.numara,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    expect(await sablonlari(h.vt, gonderilmeyen.numara)).toEqual(["havale-onaylandi"]);
  });
});

describe("tek işlem ve tek e-posta", () => {
  it("geri alınan değişiklikte e-posta yazılmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], havale);
    const { kimlik } = await siparisi(h.vt, numara);
    await expect(
      h.vt.transaction(async (islem) => {
        await gecmiseYaz(islem, {
          siparis: kimlik,
          onceki: "odeme-bekleniyor",
          sonraki: "hazirlaniyor",
          neden: "havale-onaylandi",
          kim: yonetici(),
        });
        expect(
          await islem
            .select()
            .from(epostaKayitlari)
            .where(eq(epostaKayitlari.sablon, "havale-onaylandi")),
        ).toHaveLength(1);
        throw new Error("geri al");
      }),
    ).rejects.toThrow("geri al");
    expect(await sablonlari(h.vt, numara)).toEqual(["siparis-alindi"]);
    // Kuyrukta da iş kalmaz.
    const isler = await h.vt
      .select()
      .from(arkaPlanIsleri)
      .where(eq(arkaPlanIsleri.tur, "eposta-gonder"));
    expect(isler).toHaveLength(1);
  });

  it("aynı olayın ikinci e-postası sırayla da aynı anda da yazılmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], havale);
    const { kimlik } = await siparisi(h.vt, numara);
    const yaz = (olayAnahtari: string) =>
      h.vt.transaction((islem) =>
        siparisEpostasiYaz(islem, {
          siparis: kimlik,
          sablon: "havale-onaylandi",
          olayAnahtari,
        }),
      );
    await yaz("deneme:sirayla");
    await yaz("deneme:sirayla");
    await Promise.all([yaz("deneme:ayni-anda"), yaz("deneme:ayni-anda"), yaz("deneme:ayni-anda")]);
    const kayitlar = await h.vt
      .select()
      .from(epostaKayitlari)
      .where(like(epostaKayitlari.olay_anahtari, "deneme:%"));
    expect(kayitlar).toHaveLength(2);
    const isler = await h.vt
      .select()
      .from(arkaPlanIsleri)
      .where(
        and(
          eq(arkaPlanIsleri.tur, "eposta-gonder"),
          like(arkaPlanIsleri.tekillik_anahtari, "eposta:deneme:%"),
        ),
      );
    expect(isler).toHaveLength(2);
  });
});

describe("içerik", () => {
  it("sipariş alındı: tutarlar, oran oran vergi, banka hesapları, son ödeme zamanı ve takip bağlantısı siparişle aynı", async () => {
    const h = await hazirla();
    const birim = await h.urunAc("Kupa <b>Kalın</b> & Ş");
    const numara = await ver(h.vt, [{ birim, adet: 3 }], havale);
    const s = await siparisi(h.vt, numara);
    const { konu, metin, html } = await sonEposta(h.vt, numara, "siparis-alindi");
    expect(konu).toBe(`Siparişiniz alındı: ${numara}`);
    expect(metin).toContain(`Ara toplam (3 ürün): ${bicim.para(s.ara_toplam)}`);
    expect(metin).toContain(`Toplam: ${bicim.para(s.toplam)}`);
    expect(s.vergi_dokumu.length).toBeGreaterThan(0);
    for (const satir of s.vergi_dokumu) {
      expect(metin).toContain(
        `Toplama dahil ${satir.ad ?? "Vergi"} (${bicim.yuzde(satir.oran / 10_000)}): ${bicim.para(satir.vergi)}`,
      );
    }
    expect(metin).toContain("TR42 0001 0000 0000 0000 0000 01");
    expect(metin).toContain(
      `Son ödeme zamanı: ${bicim.tarihSaat(s.odeme_son_zamani ?? new Date())}`,
    );
    expect(metin).toContain(`Açıklamaya ${numara} yazın`);
    expect(metin).toContain(`${kok}/havale-bildirimi?siparis=${numara}`);
    // Üye olmayanın bağlantısı takip sayfasıdır; e-posta adrese yazılmaz.
    expect(metin).toContain(`${kok}/siparis-takibi?siparis=${numara}`);
    expect(html).not.toContain(encodeURIComponent(s.eposta));
    expect(metin).not.toContain(`?eposta=`);
    // Ürün adı kaçırılır.
    expect(html).toContain("Kupa &lt;b&gt;Kalın&lt;/b&gt; &amp; Ş");
    expect(html).not.toContain("<b>Kalın</b>");
    // Alt bilgi satıcının unvanı, adresi ve telefonuyla.
    expect(metin).toContain("Deneme Ticaret A.Ş. · Deneme Sokak No: 1");
    expect(metin).toContain("+90 312 000 00 00");
    // Teslimat adresi.
    expect(metin).toContain("Atatürk Bulvarı No: 10");
  });

  it("üyenin bağlantısı hesaptaki ayrıntı; kargo e-postası firma, takip numarası ve takip adresiyle", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const musteri = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], kapida, { musteri });
    await ilerlet(h.vt, numara, "kargoda");
    const { metin } = await sonEposta(h.vt, numara, "kargoya-verildi");
    expect(metin).toContain("Deneme Kargo");
    expect(metin).toContain("Takip no: TK123");
    expect(metin).toContain("https://takip.deneme-kargo.test/sorgu/TK123");
    expect(metin).toContain(`${kok}/hesabim/siparislerim/${numara}`);
    expect(metin).not.toContain("siparis-takibi");
  });

  it("müşteriye notun metni kaçırılır; kişisel bilgisi silinmiş siparişe e-posta yazılmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], kapida);
    await yonetim.notEkle(h.vt, yonetici(), {
      numara,
      tur: "musteri",
      metin: "<script>alert(1)</script> Teşekkürler",
    });
    const { html, metin } = await sonEposta(h.vt, numara, "musteriye-not");
    expect(metin).toContain("<script>alert(1)</script> Teşekkürler");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");

    const eski = await ver(h.vt, [{ birim, adet: 1 }], kapida);
    const { eposta } = await siparisi(h.vt, eski);
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${site.ayarlar.kisiselVeriSaklamaYili}, days => 1) where numara = ${eski}`,
    );
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    await yonetim.notEkle(h.vt, yonetici(), { numara: eski, tur: "musteri", metin: "Not" });
    // Not yazılır, e-postası yazılmaz: yalnız ilk siparişin notu.
    const notlar = await h.vt
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.sablon, "musteriye-not"));
    expect(notlar.map((k) => k.alici)).not.toContain(eposta);
    expect(notlar).toHaveLength(1);
  });

  it("gönderen adresi olmayan sitede gitmez, veri silinir; gerçek posta kutusuna düşer", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], kapida);
    const [kayit] = await epostalari(h.vt, numara);
    if (kayit === undefined) throw new Error("E-posta yok.");
    expect(kayit.veri).not.toBeNull();
    const adressiz: Site = {
      ...site,
      ayarlar: { ...site.ayarlar, epostaGonderenAdresi: undefined },
    };
    expect(await gonder(h.vt, kayit.kimlik, adressiz)).toBeUndefined();
    const [sonra] = await h.vt
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.kimlik, kayit.kimlik));
    expect(sonra?.durum).toBe(epostaDurumu.gonderilmedi);
    expect(sonra?.veri).toBeNull();

    // Gerçek yerel posta kutusu.
    const { POSTA_KUTUSU_PORTU: kutuPortu, POSTA_SMTP_PORTU: smtpPortu } = process.env;
    const gercek = epostaGondericisi(`smtp://localhost:${smtpPortu}`);
    if (gercek === undefined) throw new Error("Yerel posta kutusu yok.");
    const ikinci = await ver(h.vt, [{ birim, adet: 1 }], havale);
    const [ilk] = await epostalari(h.vt, ikinci);
    await epostaKaydiniGonder(h.vt, ilk?.kimlik ?? "", { site, gonderici: gercek });
    const { eposta } = await siparisi(h.vt, ikinci);
    const yanit = await fetch(
      `http://127.0.0.1:${kutuPortu}/api/v1/search?query=${encodeURIComponent(`to:"${eposta}"`)}`,
    );
    const { messages } = (await yanit.json()) as { messages: { Subject: string }[] };
    expect(messages.map((m) => m.Subject)).toEqual([`Siparişiniz alındı: ${ikinci}`]);
    const [gonderilen] = await h.vt
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.kimlik, ilk?.kimlik ?? ""));
    expect(gonderilen?.durum).toBe(epostaDurumu.gonderildi);
    expect(gonderilen?.veri).toBeNull();
  });

  it("iki site birbirinin e-postasını görmez", async () => {
    const a = await hazirla();
    const b = await hazirla();
    const birim = await a.urunAc();
    const eposta = yeniAdres();
    await ver(a.vt, [{ birim, adet: 1 }], kapida, { eposta });
    expect(
      await a.vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.alici, eposta)),
    ).toHaveLength(1);
    expect(await b.vt.select().from(epostaKayitlari)).toHaveLength(0);
  });
});
