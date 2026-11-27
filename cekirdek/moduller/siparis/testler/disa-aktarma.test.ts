// Siparişlerin dışa aktarması gerçek veritabanıyla (kart 0316, karar 0185):
// - Listenin süzgeçleri dosyaya listenin verdiği siparişleri, listenin sırasıyla verir; seçilenler seçimin sırasıyla.
// - Tutarlar siparişin saklanan değerleridir, sitenin biçimiyle sayı olarak (kupon, iki oranlı vergi dahil); vergi
//   sütunları kapsamda geçen oranlardır.
// - Her ürün bir satır düzeninde siparişin sütunları her kalemde tekrarlanır, kalemin değerleri eklenir.
// - Kişisel bilgisi silinmiş siparişte kişisel sütunlar boştur; il, ilçe ve tutarlar kalır.
// - Formüle benzeyen metin etkisiz yazılır.
// - Kapsam boşsa ya da sınırı aşıyorsa başlamaz; iş dosyayı bir kez yazar.
// - Dosyayı yalnız isteyen indirir; indirme değişiklik kaydına kişisel veri olmadan girer.
// - Saklama süresi dolan kayıt silinir, yenisi kalır. İki site ayrı kalır. Veritabanının denetimleri kayıtla aynıdır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import {
  siparisDisaAktarmaAyari,
  siparisDisaAktarmaDurumlari,
  siparisDisaAktarmaDuzenleri,
} from "../../../kayitlar/siparis.ts";
import { siteninBicimleyicisi } from "../../../metinler/site-metni.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import {
  type SiparisDisaAktarmaGirdisi,
  type SiparisListesiSuzgecleri,
  siparisDisaAktarmaServisi,
} from "../disa-aktarma.ts";
import { siparisDisaAktarmalari, siparisKalemleri, siparisler } from "../model.ts";
import { siparisYonetimi } from "../yonetim.ts";

vi.setConfig({ testTimeout: 90_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site: Site = {
  ...klasor,
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
  },
};
const b = siteninBicimleyicisi(site.ayarlar);
const odeme = odemeServisi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();
// İş kuyruğa girmez: test hazırlığı kendisi çağırır.
const kuyrugaGiren: string[] = [];
const servis = siparisDisaAktarmaServisi(site, {
  hazirla: async (_vt, kimlik) => {
    kuyrugaGiren.push(kimlik);
  },
});
const yonetim = siparisYonetimi(site);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const sistem = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const hazirla = async () => {
  const deneme = await denemeSitesiAc("siparis-disa-aktarma");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async (ad: string, tutar = 10_000) => {
    const urun = await urunSrv.urunEkle(vt, sistem(), {
      ad,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, sistem(), birim, { satisFiyati: tutar });
    await stok.stokDuzelt(vt, sistem(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return birim;
  };
  const yonetici = async () =>
    (
      await hesapAc(vt, "yonetici", {
        eposta: `yonetici-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  return { vt, urunAc, yonetici };
};

const ankara = {
  ulke: "TR",
  il: "TR-06",
  ilce: "TR-06-007",
  adres: "Atatürk Bulvarı No: 10",
  postaKodu: "06420",
};

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  yontem: OdemeYontemiSecimi,
  ek: { ad?: string; fatura?: object } = {},
) => {
  const sonuc = await odeme.siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta: "musteri@ornek.test", hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: yontem,
        teslimat: {
          ad: ek.ad ?? "Deniz",
          soyad: "Yılmaz",
          telefon: "0555 123 45 67",
          adres: ankara,
        },
        fatura: ek.fatura ?? { tur: "bireysel", adresAyni: true },
        onBilgilendirmeOnayi: true,
        mesafeliSatisOnayi: true,
        pazarlamaIzni: false,
      }),
      kalemler,
    },
    3600,
  );
  return sonuc.siparis.numara;
};

const havale: OdemeYontemiSecimi = { yontem: "havale" };
const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };
const tumu: SiparisListesiSuzgecleri = { siralama: "en-yeni" };

// Dosyayı hazırlar, indirir ve CSV'yi satırlara ayırır (tırnaklı hücre, ikilenmiş tırnak).
const csvOku = (dosya: Buffer): string[][] => {
  const yazi = dosya.toString("utf8");
  expect(yazi.startsWith("\ufeff")).toBe(true);
  const ayrac = b.csvAyraci();
  const satirlar: string[][] = [];
  let satir: string[] = [];
  let hucre = "";
  let tirnakta = false;
  const metin = yazi.slice(1);
  for (let i = 0; i < metin.length; i += 1) {
    const harf = metin[i];
    if (tirnakta) {
      if (harf === '"' && metin[i + 1] === '"') {
        hucre += '"';
        i += 1;
      } else if (harf === '"') tirnakta = false;
      else hucre += harf;
    } else if (harf === '"') tirnakta = true;
    else if (harf === ayrac) {
      satir.push(hucre);
      hucre = "";
    } else if (harf === "\r" && metin[i + 1] === "\n") {
      satir.push(hucre);
      satirlar.push(satir);
      satir = [];
      hucre = "";
      i += 1;
    } else hucre += harf;
  }
  return satirlar;
};

const disaAktar = async (vt: Veritabani, yonetici: string, girdi: SiparisDisaAktarmaGirdisi) => {
  const kimlik = await servis.baslat(vt, yonetici, girdi);
  expect(kuyrugaGiren).toContain(kimlik);
  await servis.hazirla(vt, kimlik);
  const { dosya } = await servis.dosya(vt, yonetici, kimlik);
  const [baslik = [], ...satirlar] = csvOku(dosya);
  const deger = (satir: string[], sutun: string) => {
    const sira = baslik.indexOf(sutun);
    if (sira < 0) throw new Error(`Sütun yok: ${sutun}`);
    return satir[sira];
  };
  return { kimlik, baslik, satirlar, deger };
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

describe("siparişlerin dışa aktarması", () => {
  it("listenin süzgeçleri listenin siparişlerini listenin sırasıyla verir; seçilenler seçimin sırasıyla", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const birim = await urunAc("Keten Gömlek");
    const ilk = await ver(vt, [{ birim, adet: 1 }], havale);
    const ikinci = await ver(vt, [{ birim, adet: 1 }], kapida);
    const ucuncu = await ver(vt, [{ birim, adet: 2 }], havale);
    const kim = await yonetici();
    const suzgec: SiparisListesiSuzgecleri = { odeme: ["havale"], siralama: "en-yeni" };
    const liste = await yonetim.liste(vt, { ...suzgec, sayfa: 1, sayfaBoyu: 25 });
    const { satirlar, deger } = await disaAktar(vt, kim, {
      kapsam: { tur: "liste", suzgecler: suzgec },
      duzen: "siparis",
    });
    const numaralar = satirlar.map((s) => deger(s, "Sipariş no"));
    expect(numaralar).toEqual(liste.satirlar.map((s) => s.numara));
    expect(numaralar).toEqual([ucuncu, ilk]);
    expect(satirlar.map((s) => deger(s, "Ödeme yöntemi"))).toEqual([
      "Havale / EFT",
      "Havale / EFT",
    ]);
    // Sıralama da listenin: en eski önce.
    const eski = await disaAktar(vt, kim, {
      kapsam: { tur: "liste", suzgecler: { ...suzgec, siralama: "en-eski" } },
      duzen: "siparis",
    });
    expect(eski.satirlar.map((s) => eski.deger(s, "Sipariş no"))).toEqual([ilk, ucuncu]);
    const secili = await disaAktar(vt, kim, {
      kapsam: { tur: "secili", numaralar: [ikinci, ilk] },
      duzen: "siparis",
    });
    expect(secili.satirlar.map((s) => secili.deger(s, "Sipariş no"))).toEqual([ikinci, ilk]);
  });

  it("tutarlar siparişin saklanan değerleridir; kupon ve iki oranlı vergi ayrı sütunlarda", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const birim = await urunAc("Yün Atkı", 12_345);
    const numara = await ver(vt, [{ birim, adet: 3 }], havale);
    // Kupon ve vergi dökümü siparişte saklanan değerlerdir (kart 0312, 0214): dışa aktarma yalnız okur. İkinci oran
    // dökümün ikinci satırıdır (adı olan ek oran).
    const [once] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
    await vt
      .update(siparisler)
      .set({
        kupon_kodu: "YAZ10",
        kupon_turu: "tutar",
        kupon_indirimi: 500,
        vergi_dokumu: [
          ...(once?.vergi_dokumu ?? []),
          { ad: "Ek", oran: 5_000, matrah: 30_000, vergi: 150 },
        ],
      })
      .where(eq(siparisler.numara, numara));
    const [siparis] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
    if (siparis === undefined) throw new Error("Sipariş yok.");
    expect(siparis.vergi_dokumu.length).toBe(2);
    const { baslik, satirlar, deger } = await disaAktar(vt, await yonetici(), {
      kapsam: { tur: "secili", numaralar: [numara] },
      duzen: "siparis",
    });
    const [satir = []] = satirlar;
    expect(deger(satir, "Ara toplam")).toBe(b.csvTutari(siparis.ara_toplam));
    expect(deger(satir, "Kargo")).toBe(b.csvTutari(siparis.kargo_tutari));
    expect(deger(satir, "Vergi toplamı")).toBe(b.csvTutari(siparis.vergi_toplami));
    expect(deger(satir, "Toplam")).toBe(b.csvTutari(siparis.toplam));
    expect(deger(satir, "Kupon kodu")).toBe("YAZ10");
    expect(deger(satir, "Kupon indirimi")).toBe(b.csvTutari(500));
    expect(deger(satir, "Para birimi")).toBe("XTS");
    // Her oran kendi sütununda, adı ve oranıyla; dökümün tutarı.
    for (const oran of siparis.vergi_dokumu) {
      const ad = `${oran.ad ?? "Vergi"} ${b.yuzde(oran.oran / 10_000)}`;
      expect(baslik).toContain(ad);
      expect(deger(satir, ad)).toBe(b.csvTutari(oran.vergi));
    }
    // Tutar binlik ayırıcısız, sitenin ondalık ayırıcısıyla.
    expect(b.csvTutari(123_456_789)).not.toMatch(/\s/);
  });

  it("her ürün bir satır: siparişin sütunları her kalemde, kalemin değerleriyle", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const gomlek = await urunAc("Keten Gömlek", 20_000);
    const atki = await urunAc("Yün Atkı", 5_000);
    const numara = await ver(
      vt,
      [
        { birim: gomlek, adet: 2 },
        { birim: atki, adet: 1 },
      ],
      havale,
    );
    const kalemler = await vt
      .select()
      .from(siparisKalemleri)
      .innerJoin(siparisler, eq(siparisler.kimlik, siparisKalemleri.siparis_kimligi))
      .where(eq(siparisler.numara, numara))
      .orderBy(siparisKalemleri.sira);
    const { satirlar, deger } = await disaAktar(vt, await yonetici(), {
      kapsam: { tur: "secili", numaralar: [numara] },
      duzen: "kalem",
    });
    expect(satirlar.length).toBe(2);
    expect(satirlar.map((s) => deger(s, "Sipariş no"))).toEqual([numara, numara]);
    expect(satirlar.map((s) => deger(s, "Ürün"))).toEqual(
      kalemler.map((k) => k.siparis_kalemleri.urun_adi),
    );
    expect(satirlar.map((s) => deger(s, "Adet"))).toEqual(["2", "1"]);
    expect(satirlar.map((s) => deger(s, "Satır tutarı"))).toEqual(
      kalemler.map((k) => b.csvTutari(k.siparis_kalemleri.tutar)),
    );
    expect(satirlar.map((s) => deger(s, "Satırın vergisi"))).toEqual(
      kalemler.map((k) => b.csvTutari(k.siparis_kalemleri.vergi)),
    );
    // Siparişin toplamı her satırda tekrarlanır.
    expect(new Set(satirlar.map((s) => deger(s, "Toplam"))).size).toBe(1);
  });

  it("kişisel bilgisi silinmiş siparişte kişisel sütunlar boş, il, ilçe ve tutarlar kalır", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const birim = await urunAc("Keten Gömlek");
    const kurumsal = {
      tur: "kurumsal",
      firma: "Deniz Ticaret",
      vergiDairesi: "Çankaya",
      vergiNumarasi: "1111111114",
      adresAyni: true,
    };
    const silinen = await ver(vt, [{ birim, adet: 1 }], havale, { fatura: kurumsal });
    const duran = await ver(vt, [{ birim, adet: 1 }], havale, { fatura: kurumsal });
    // Temizliğin işareti: alanlar dolu kalsa da dışa aktarma kişisel sütunları yazmaz.
    await vt
      .update(siparisler)
      .set({ kisisel_veri_silinme_zamani: sql`now()` })
      .where(eq(siparisler.numara, silinen));
    const { satirlar, deger } = await disaAktar(vt, await yonetici(), {
      kapsam: { tur: "secili", numaralar: [silinen, duran] },
      duzen: "siparis",
    });
    const [s1 = [], s2 = []] = satirlar;
    const kisiseller = [
      "Müşteri",
      "E-posta",
      "Telefon",
      "Teslimat adresi",
      "Posta kodu",
      "Fatura unvanı",
      "Vergi dairesi",
      "Vergi numarası",
      "Fatura adresi",
    ];
    for (const sutun of kisiseller) expect(deger(s1, sutun)).toBe("");
    expect(deger(s2, "Müşteri")).toBe("Deniz Yılmaz");
    expect(deger(s2, "E-posta")).toBe("musteri@ornek.test");
    expect(deger(s2, "Fatura unvanı")).toBe("Deniz Ticaret");
    expect(deger(s2, "Fatura adresi")).toBe("Teslimat adresiyle aynı");
    for (const s of [s1, s2]) {
      expect(deger(s, "İl")).toBe("Ankara");
      expect(deger(s, "İlçe")).not.toBe("");
      expect(deger(s, "Toplam")).not.toBe("");
    }
    // Telefon uluslararası biçimdedir; + ile başladığı için metin olarak yazılır.
    expect(deger(s2, "Telefon")).toBe("'+90 555 123 45 67");
  });

  it("formüle benzeyen metin etkisiz yazılır", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const birim = await urunAc('=HYPERLINK("http://kotu.test")');
    const numara = await ver(vt, [{ birim, adet: 1 }], havale, { ad: "@Deniz" });
    const { satirlar, deger } = await disaAktar(vt, await yonetici(), {
      kapsam: { tur: "secili", numaralar: [numara] },
      duzen: "kalem",
    });
    const [satir = []] = satirlar;
    expect(deger(satir, "Ürün")).toBe('\'=HYPERLINK("http://kotu.test")');
    expect(deger(satir, "Müşteri")).toBe("'@Deniz Yılmaz");
  });

  it("kapsam boşsa ya da sınırı aşıyorsa başlamaz; iş dosyayı bir kez yazar", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const birim = await urunAc("Keten Gömlek");
    await ver(vt, [{ birim, adet: 1 }], havale);
    await ver(vt, [{ birim, adet: 1 }], havale);
    const kim = await yonetici();
    expect(
      await hatasi(
        servis.baslat(vt, kim, {
          kapsam: { tur: "liste", suzgecler: { durum: "kargoda", siralama: "en-yeni" } },
          duzen: "siparis",
        }),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "kapsam", kod: "siparis-yok" }] });
    const ayar = siparisDisaAktarmaAyari as { enCokSiparis: number };
    const eskiSinir = ayar.enCokSiparis;
    ayar.enCokSiparis = 1;
    try {
      expect(
        await hatasi(
          servis.baslat(vt, kim, { kapsam: { tur: "liste", suzgecler: tumu }, duzen: "siparis" }),
        ),
      ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "kapsam", kod: "cok-fazla-siparis" }] });
    } finally {
      ayar.enCokSiparis = eskiSinir;
    }
    expect(await vt.select().from(siparisDisaAktarmalari)).toEqual([]);
    const kimlik = await servis.baslat(vt, kim, {
      kapsam: { tur: "liste", suzgecler: tumu },
      duzen: "siparis",
    });
    expect(await servis.durum(vt, kim)).toMatchObject({
      kimlik,
      durum: "hazirlaniyor",
      siparisSayisi: 2,
      indirildi: false,
    });
    await servis.hazirla(vt, kimlik);
    const [ilk] = await vt.select().from(siparisDisaAktarmalari);
    await servis.hazirla(vt, kimlik);
    const [ikinci] = await vt.select().from(siparisDisaAktarmalari);
    expect(ikinci?.bitis_zamani).toEqual(ilk?.bitis_zamani);
    expect(ikinci?.satir_sayisi).toBe(2);
    // Son deneme de düşen iş hatalıdır; hazır dosya hatalı olmaz.
    await servis.hatali(vt, kimlik);
    expect((await servis.durum(vt, kim))?.durum).toBe("hazir");
  });

  it("dosyayı yalnız isteyen indirir; indirme kişisel veri olmadan kayda girer", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const birim = await urunAc("Keten Gömlek");
    const numara = await ver(vt, [{ birim, adet: 1 }], havale);
    const kim = await yonetici();
    const baska = await yonetici();
    const kimlik = await servis.baslat(vt, kim, {
      kapsam: { tur: "secili", numaralar: [numara] },
      duzen: "siparis",
    });
    await servis.hazirla(vt, kimlik);
    expect(await hatasi(servis.dosya(vt, baska, kimlik))).toEqual({
      kod: "bulunamadi",
      ayrinti: undefined,
    });
    expect(await servis.durum(vt, baska, kimlik)).toBeNull();
    expect(await servis.durum(vt, baska)).toBeNull();
    expect(await hatasi(servis.dosya(vt, kim, "bozuk"))).toMatchObject({ kod: "bulunamadi" });
    await servis.dosya(vt, kim, kimlik.toUpperCase());
    await servis.dosya(vt, kim, kimlik);
    expect((await servis.durum(vt, kim))?.indirildi).toBe(true);
    const kayitlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.islem, "siparis.disa-aktarildi"));
    expect(kayitlar.length).toBe(2);
    expect(kayitlar[0]).toMatchObject({
      kayit_turu: "siparis-disa-aktarma",
      kayit_kimligi: kimlik,
      yeni_deger: { kapsam: "secili", numaralar: [numara], duzen: "siparis", siparisSayisi: 1 },
    });
    expect(JSON.stringify(kayitlar)).not.toContain("musteri@ornek.test");
  });

  it("saklama süresi dolan kayıt dosyasıyla silinir, yenisi kalır", async () => {
    const { vt, urunAc, yonetici } = await hazirla();
    const birim = await urunAc("Keten Gömlek");
    const numara = await ver(vt, [{ birim, adet: 1 }], havale);
    const kim = await yonetici();
    const girdi: SiparisDisaAktarmaGirdisi = {
      kapsam: { tur: "secili", numaralar: [numara] },
      duzen: "siparis",
    };
    const eski = await servis.baslat(vt, kim, girdi);
    const yeni = await servis.baslat(vt, kim, girdi);
    const saat = siparisDisaAktarmaAyari.saklamaSaat;
    await vt
      .update(siparisDisaAktarmalari)
      .set({ olusturma_zamani: sql`now() - make_interval(hours => ${saat}, secs => 1)` })
      .where(eq(siparisDisaAktarmalari.kimlik, eski));
    await vt
      .update(siparisDisaAktarmalari)
      .set({ olusturma_zamani: sql`now() - make_interval(hours => ${saat}, secs => -60)` })
      .where(eq(siparisDisaAktarmalari.kimlik, yeni));
    expect(await servis.eskileriSil(vt)).toBe(1);
    expect((await vt.select().from(siparisDisaAktarmalari)).map((satir) => satir.kimlik)).toEqual([
      yeni,
    ]);
  });

  it("iki site birbirinin siparişini dışa aktarmaz", async () => {
    const birinci = await hazirla();
    const ikinci = await hazirla();
    const b1 = await birinci.urunAc("Keten Gömlek");
    const b2 = await ikinci.urunAc("Yün Atkı");
    await ver(birinci.vt, [{ birim: b1, adet: 1 }], havale);
    await ver(ikinci.vt, [{ birim: b2, adet: 1 }], havale);
    await ver(ikinci.vt, [{ birim: b2, adet: 1 }], havale);
    const { satirlar, deger } = await disaAktar(birinci.vt, await birinci.yonetici(), {
      kapsam: { tur: "liste", suzgecler: tumu },
      duzen: "kalem",
    });
    expect(satirlar.map((s) => deger(s, "Ürün"))).toEqual(["Keten Gömlek"]);
  });

  it("veritabanının durum ve düzen denetimleri kayıtla aynıdır", async () => {
    const { vt } = await hazirla();
    const tanim = async (ad: string) => {
      const { rows } = await vt.execute<{ tanim: string }>(
        sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = ${ad}`,
      );
      return [...(rows[0]?.tanim ?? "").matchAll(/'([a-z-]+)'/g)].map((e) => e[1]);
    };
    expect(await tanim("siparis_disa_aktarmalari_durum")).toEqual([...siparisDisaAktarmaDurumlari]);
    expect(await tanim("siparis_disa_aktarmalari_duzen")).toEqual([...siparisDisaAktarmaDuzenleri]);
  });
});
