// Kuponlu ödeme ve sipariş testlerinin ortak hazırlığı (kart 0312'den taşındı, kart 0313): vergi dahil girişli deneme
// sitesi (Genel yüzde 18), kargo 59,00; ürün, kupon ve sipariş açan yardımcılar. Her test kendi veritabanını açar,
// testten sonra silinir.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { iadeServisi } from "../../siparis/iade.ts";
import { siparisKalemleri, siparisler } from "../../siparis/model.ts";
import { siparisYonetimi } from "../../siparis/yonetim.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { kuponKullanimlari } from "../model.ts";
import { kuponServisi } from "../servis.ts";

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
export const firmaKimligi = randomUUID();
export const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
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
export const yapan = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
export const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
export const odeme = odemeServisi(site);
export const iade = iadeServisi(site);
export const yonetim = siparisYonetimi(site);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

export const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

export const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };
export const bilgiler = (yontem: OdemeYontemiSecimi = kapida) =>
  odemeBilgileriSemasi.parse({
    odemeYontemi: yontem,
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

export const hazirla = async (ad = "kuponsiparis") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  await siteninServisi(site).degistir(vt, yapan(), { kargoUcreti: 5_900 });
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (sinif) => sinif.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async (satis = 11_800) => {
    const urun = await urunSrv.urunEkle(vt, yapan(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(site).fiyatYaz(vt, yapan(), birim, { satisFiyati: satis });
    await stokServisi().stokDuzelt(vt, yapan(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return birim;
  };
  const kuponAc = (girdi: Partial<Parameters<ReturnType<typeof kuponServisi>["ekle"]>[2]> = {}) =>
    vt.transaction((islem) =>
      kuponServisi(site).ekle(islem, yapan(), {
        kod: "YUZDE10",
        tur: "yuzde",
        deger: 10,
        kapsam: "hepsi",
        ...girdi,
      }),
    );
  const ver = async (
    kalemler: { birim: string; adet: number }[],
    kupon: string | undefined,
    eposta = "misafir@ornek.test",
  ) =>
    (
      await odeme.siparisVer(
        vt,
        {
          kim: { tur: "misafir", eposta, hesap: { ac: false } },
          bilgiler: bilgiler(),
          kalemler,
          kupon,
        },
        3600,
      )
    ).siparis.numara;
  const oku = async (numara: string) => {
    const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
    if (satir === undefined) throw new Error("Sipariş yok.");
    const kalemler = await vt
      .select()
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, satir.kimlik))
      .orderBy(siparisKalemleri.sira);
    return { ...satir, kalemler };
  };
  const kullanimlar = () => vt.select().from(kuponKullanimlari);
  const teslimEt = async (numara: string) => {
    await yonetim.islemYap(vt, yapan(), {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
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
  return { vt, urunAc, kuponAc, ver, oku, kullanimlar, teslimEt };
};
