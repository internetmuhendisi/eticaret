// Raporların testlerinin ortak hazırlığı (kart 0317, 0318): vergi-dolu deneme sitesi (ikinci oran %8 "İndirimli"),
// ürün açma, sipariş verme (üye olmayan ya da üye), havale onayıyla ödeme ve ödeme anı, teslim, iadenin tamamlanma anı.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { iadeServisi } from "../../siparis/iade.ts";
import { siparisIadeleri, siparisler } from "../../siparis/model.ts";
import { siparisYonetimi } from "../../siparis/yonetim.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";

export const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
export const firmaKimligi = randomUUID();
export const site: Site = {
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
    kapidaOdemeSecenekleri: ["nakit"],
    bankaHesaplari: [
      {
        kimlik: randomUUID(),
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
    kargoFirmalari: [{ kimlik: firmaKimligi, ad: "Deneme Kargo" }],
  },
};
export const tz = site.ayarlar.saatDilimi;
export const iade = iadeServisi(site);
export const yonetim = siparisYonetimi(site);
export const urunSrv = urunServisi(() => tz);
export const yapan = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

export const hazirla = async (ad = "rapor-satis") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const vergi = siteninVergiServisi(site);
  const genel = (await vergi.tabloyuOku(vt)).find((s) => s.ad === "Genel")?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  // İkinci oran: oran oran vergi.
  const indirimli = await vergi.sinifEkle(vt, yapan(), { ad: "İndirimli" });
  await vergi.oranEkle(vt, yapan(), indirimli, { ulke: "TR", oran: "8" });
  const urunAc = async ({ fiyat = 10_000, sinif = genel } = {}) => {
    const urun = await urunSrv.urunEkle(vt, yapan(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: sinif,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(site).fiyatYaz(vt, yapan(), birim, { satisFiyati: fiyat });
    await stokServisi().stokDuzelt(vt, yapan(), birim, {
      yeniMiktar: 500,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return birim;
  };
  // "Beden" seçenekli ürün: basit birim S birleşimi olur (karar 0163), M eklenir; ikisinin fiyatı ve stoğu.
  const varyantliUrunAc = async (ad: string, fiyatlar: { S: number; M: number }) => {
    const urun = await urunSrv.urunEkle(vt, yapan(), {
      ad,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
    });
    await urunSrv.secenekEkle(vt, yapan(), urun, { ad: "Beden", degerler: ["S", "M"] });
    const okunan = await urunSrv.urunuOku(vt, urun);
    const deger = (ad: string) =>
      okunan?.secenekler[0]?.degerler.find((d) => d.ad === ad)?.kimlik ?? "";
    await urunSrv.birlesimEkle(vt, yapan(), urun, { degerler: [deger("M")] });
    const birimler = (await urunSrv.urunuOku(vt, urun))?.birimler ?? [];
    const birim = (ad: "S" | "M") => {
      const bulunan = birimler.find((b) => b.degerler?.includes(deger(ad)));
      if (bulunan === undefined) throw new Error(`Birleşim yok: ${ad}`);
      return bulunan.kimlik;
    };
    const sonuc = { urun, S: birim("S"), M: birim("M") };
    for (const ad of ["S", "M"] as const) {
      await siteninFiyatServisi(site).fiyatYaz(vt, yapan(), sonuc[ad], {
        satisFiyati: fiyatlar[ad],
      });
      await stokServisi().stokDuzelt(vt, yapan(), sonuc[ad], {
        yeniMiktar: 500,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return sonuc;
  };
  const uyeAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  return { vt, urunAc, genel, indirimli, varyantliUrunAc, uyeAc };
};

export const havale: OdemeYontemiSecimi = { yontem: "havale" };
export const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };

// Üye olmayan müşteri ya da (musteri verilince) üye; kupon verilince kuponla.
export const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  yontem: OdemeYontemiSecimi = havale,
  { musteri, kupon }: { musteri?: string; kupon?: string } = {},
) =>
  (
    await odemeServisi(site).siparisVer(
      vt,
      {
        kim:
          musteri === undefined
            ? { tur: "misafir", eposta: "misafir@ornek.test", hesap: { ac: false } }
            : { tur: "uye", musteri },
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: yontem,
          teslimat: {
            ad: "Deniz",
            soyad: "Yılmaz",
            telefon: "0555 123 45 67",
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
        }),
        kalemler,
        ...(kupon === undefined ? {} : { kupon }),
      },
      3600,
    )
  ).siparis.numara;

export const oku = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};

// Havalenin onayı ödemeyi alır; ödeme anı teste göre yazılır.
export const ode = async (vt: Veritabani, numara: string, an: Date) => {
  await yonetim.islemYap(vt, yapan(), {
    numara,
    islem: "havale-onayla",
    gorulenDurum: "odeme-bekleniyor",
  });
  await vt.update(siparisler).set({ odeme_zamani: an }).where(eq(siparisler.numara, numara));
  return oku(vt, numara);
};

// Ödenmiş siparişi teslim eder (kısmi iade teslim edilmiş siparişte yapılır).
export const teslimEt = async (vt: Veritabani, numara: string) => {
  await yonetim.islemYap(vt, yapan(), {
    numara,
    islem: "kargoya-ver",
    gorulenDurum: "hazirlaniyor",
    kargo: { firma: firmaKimligi },
  });
  await yonetim.islemYap(vt, yapan(), {
    numara,
    islem: "teslim-edildi",
    gorulenDurum: "kargoda",
  });
};

// Siparişin son iadesinin tamamlanma anı teste göre yazılır.
export const iadeAni = async (vt: Veritabani, numara: string, an: Date) => {
  const siparis = await oku(vt, numara);
  await vt
    .update(siparisIadeleri)
    .set({ sonuc_zamani: an })
    .where(eq(siparisIadeleri.siparis_kimligi, siparis.kimlik));
};

export const gun = (gunu: string) => ({ baslangic: gunu, bitis: gunu });
export const ms = (an: Date, fark: number) => new Date(an.getTime() + fark);
