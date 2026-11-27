// Ürün kopyalama (kart 0320, karar 0190; taslak: planlar/tasarim-yonu/panel-2.html, "Ürün kopyalama"). Mağaza sahibi
// benzer bir ürünü var olanın kopyasından başlatır.
//
// - Kopya taslaktır, yayın zamanı yoktur. Adı mağaza sahibinin verdiği addır; adres adı kaynağın adres adından
//   sayıyla üretilir ("kazak-2").
// - Kopyalanan: açıklamalar, kargo, stok takibi ve düşük stok eşiği, alım adetleri, vergi sınıfı, kategori, marka,
//   etiketler, ilgili ürünler (kullanıcı kararı), özellikler, ağırlık ve ölçüler, seçenekler ve birleşimler
//   (birleşimin görseli dahil), fiyatlar (indirim ve zamanıyla; başka para birimindeki fiyat kopyalanmaz; fiyat izni
//   olmayan yöneticinin kopyası fiyatsızdır, kullanıcı kararı), galeri
//   (görseller yeniden kaydedilmez, aynı dosyayı kullanır; videolar aynı bağlantıyla).
// - Kopyalanmayan: stok kodu ve barkod (tekildir, boş kalır), stok (0), yorumlar, favoriler, fiyat ve stok geçmişi,
//   vitrin sırası (karar 0185).
// - Tek işlemdir: bir adım düşerse hiçbir şey kalmaz. Her parça kendi servisinden yazılır (ürün, seçenek, galeri,
//   fiyat): kurallar ve değişiklik kaydı aynıdır; ayrıca "urun.kopyalandi" kaynağıyla kayda girer.
// - Kaynak ürün kilitten sonra okunur: kopyalanırken değişen ürünün yarı eski yarı yeni hâli kopyalanmaz.
//
// İzin kapıda denetlenir (ürün ekleme izni, urun.degistir); servis yalnız kimin yaptığını kayda yazar.
import { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { yerelZamana } from "../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import type { fiyatServisi } from "../fiyat/servis.ts";
import { urunKilidiAl } from "./kilit.ts";
import type { urunServisi } from "./servis.ts";
import { birlesimAnahtari, secenekleriOku } from "./varyant.ts";

// Kopyanın adı ürün servisinin ad kuralıyla denetlenir (urunEkle).
export const urunKopyalamaSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  ad: z.string().max(500),
});
export type UrunKopyalama = z.input<typeof urunKopyalamaSemasi>;

type Servisler = {
  // Kopyalayanın fiyatı değiştirme izni (fiyat.degistir) var mı: yoksa fiyatlar kopyalanmaz, kopya fiyatsız açılır
  // (kullanıcı kararı; görevli ürünü kopyalar, fiyat veremez, karar 0066).
  fiyatIzni: boolean;
  urun: ReturnType<typeof urunServisi>;
  fiyat: ReturnType<typeof fiyatServisi>;
  saatDilimi: string;
  paraBirimi: string;
};

export const urunKopyala = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  ham: UrunKopyalama,
  servisler: Servisler,
): Promise<string> => {
  const sonuc = urunKopyalamaSemasi.safeParse(ham);
  if (!sonuc.success) {
    throw new BilinenHata(
      "dogrulama",
      sonuc.error.issues.map((s) => ({ alan: s.path.join("."), kod: s.code })),
    );
  }
  const girdi = sonuc.data;
  const { urun: urunSrv, fiyat: fiyatSrv } = servisler;
  return vt.transaction(async (islem) => {
    await urunKilidiAl(islem);
    const kaynak = await urunSrv.urunuOku(islem, girdi.kimlik);
    if (kaynak === undefined || kaynak.silindi) throw new BilinenHata("bulunamadi");
    const birimler = kaynak.birimler.filter((birim) => !birim.silindi);
    const secenekler = kaynak.secenekler
      .filter((secenek) => !secenek.silindi)
      .map((secenek) => ({
        ...secenek,
        degerler: secenek.degerler.filter((deger) => !deger.silindi),
      }));
    const basit = secenekler.length === 0 ? birimler[0] : undefined;
    const olcu = (birim: (typeof birimler)[number] | undefined) => ({
      ...(birim?.agirlikGram === undefined ? {} : { agirlikGram: birim.agirlikGram }),
      ...(birim?.enMm === undefined ? {} : { enMm: birim.enMm }),
      ...(birim?.boyMm === undefined ? {} : { boyMm: birim.boyMm }),
      ...(birim?.yukseklikMm === undefined ? {} : { yukseklikMm: birim.yukseklikMm }),
    });
    const kopya = await urunSrv.urunEkle(islem, kim, {
      ad: girdi.ad,
      adresAdi: await urunSrv.bosAdresAdiBul(islem, kaynak.adresAdi, kaynak.kimlik),
      durum: "taslak",
      ...(kaynak.kisaAciklama === undefined ? {} : { kisaAciklama: kaynak.kisaAciklama }),
      ...(kaynak.uzunAciklama === undefined ? {} : { uzunAciklama: kaynak.uzunAciklama }),
      kargoGerekmez: kaynak.kargoGerekmez,
      stokTakibi: kaynak.stokTakibi,
      ...(kaynak.dusukStokEsigi === undefined ? {} : { dusukStokEsigi: kaynak.dusukStokEsigi }),
      enAzAdet: kaynak.enAzAdet,
      ...(kaynak.enCokAdet === undefined ? {} : { enCokAdet: kaynak.enCokAdet }),
      vergiSinifi: kaynak.vergiSinifi,
      kategoriler: kaynak.kategoriler,
      etiketler: kaynak.etiketler,
      marka: kaynak.marka,
      ilgiliUrunler: kaynak.ilgiliUrunler,
      ozellikler: kaynak.ozellikler,
      ...olcu(basit),
    });

    // Galeri: aynı sırayla; birleşimin görseli yeni öğesine eşlenir.
    const ogeler = new Map<string, string>();
    for (const oge of kaynak.galeri) {
      ogeler.set(
        oge.kimlik,
        oge.tur === "gorsel"
          ? await urunSrv.galeriyeGorselEkle(islem, kim, kopya, {
              dosya: oge.dosya,
              alternatifMetin: oge.alternatifMetin,
            })
          : await urunSrv.galeriyeVideoEkle(islem, kim, kopya, {
              adres: oge.oynatici,
              alternatifMetin: oge.alternatifMetin,
            }),
      );
    }

    // Kaynağın biriminden kopyanın birimine.
    const birimEslesmesi = new Map<string, string>();
    const ilkBirim = (await urunSrv.urunuOku(islem, kopya))?.birimler[0]?.kimlik;
    if (ilkBirim === undefined) throw new Error("Kopyanın birimi okunamadı.");
    if (basit !== undefined) birimEslesmesi.set(basit.kimlik, ilkBirim);
    if (secenekler.length > 0) {
      for (const secenek of secenekler) {
        await urunSrv.secenekEkle(islem, kim, kopya, {
          ad: secenek.ad,
          degerler: secenek.degerler.map((deger) => deger.ad),
        });
      }
      // Kaynağın değerinden kopyanın değerine: seçeneklerin ve değerlerin sırasıyla.
      const yeniSecenekler = (await secenekleriOku(islem, [kopya], { silinmisler: false })).get(
        kopya,
      );
      const degerEslesmesi = new Map<string, string>();
      secenekler.forEach((secenek, i) => {
        secenek.degerler.forEach((deger, j) => {
          const yeni = yeniSecenekler?.[i]?.degerler[j];
          if (yeni === undefined) throw new Error("Kopyanın seçenek değeri okunamadı.");
          degerEslesmesi.set(deger.kimlik, yeni.kimlik);
        });
      });
      // Var olan birim ilk değerlerin birleşimidir (karar 0163): kaynakta o birleşim varsa onun alanlarını alır,
      // yoksa silinir.
      const ilkAnahtar = birlesimAnahtari(
        (yeniSecenekler ?? []).map((secenek) => secenek.degerler[0]?.kimlik ?? ""),
      );
      const yeniDegerleri = (birim: (typeof birimler)[number]) =>
        birim.degerler.map((deger) => {
          const yeni = degerEslesmesi.get(deger);
          if (yeni === undefined) throw new Error("Birleşimin değeri kopyalanmadı.");
          return yeni;
        });
      // Kaynakta ilk birleşim yoksa var olan birim eklemelerden önce silinir: birleşim sınırı ara adımda aşılmasın
      // (bağımsız kontrolün bulgusu).
      const ilkVar = birimler.some(
        (birim) => birlesimAnahtari(yeniDegerleri(birim)) === ilkAnahtar,
      );
      if (!ilkVar) await urunSrv.birlesimSil(islem, kim, ilkBirim);
      let ilkKullanildi = false;
      for (const birim of birimler) {
        const degerler = yeniDegerleri(birim);
        const gorsel = birim.gorsel === undefined ? undefined : ogeler.get(birim.gorsel);
        const alanlar = { ...olcu(birim), ...(gorsel === undefined ? {} : { gorsel }) };
        if (ilkVar && !ilkKullanildi && birlesimAnahtari(degerler) === ilkAnahtar) {
          await urunSrv.birlesimDegistir(islem, kim, ilkBirim, alanlar);
          birimEslesmesi.set(birim.kimlik, ilkBirim);
          ilkKullanildi = true;
        } else {
          birimEslesmesi.set(
            birim.kimlik,
            await urunSrv.birlesimEkle(islem, kim, kopya, { ...alanlar, degerler }),
          );
        }
      }
    }

    // Fiyatlar: indirim ve zamanıyla; başka para birimindeki fiyat kopyalanmaz (sitenin para birimiyle yazılırdı).
    const fiyatlar = servisler.fiyatIzni
      ? await fiyatSrv.fiyatlariOku(islem, [...birimEslesmesi.keys()])
      : new Map();
    const yerel = (an: Date | null) => (an === null ? null : yerelZamana(an, servisler.saatDilimi));
    for (const [eski, yeni] of birimEslesmesi) {
      const fiyat = fiyatlar.get(eski);
      if (fiyat === undefined || fiyat.paraBirimi !== servisler.paraBirimi) continue;
      await fiyatSrv.fiyatYaz(islem, kim, yeni, {
        satisFiyati: fiyat.satisFiyati,
        indirimliFiyat: fiyat.indirimliFiyat,
        indirimBaslangici: fiyat.indirimliFiyat === null ? null : yerel(fiyat.indirimBaslangici),
        indirimBitisi: fiyat.indirimliFiyat === null ? null : yerel(fiyat.indirimBitisi),
      });
    }

    await degisikligiKaydet(islem, {
      kim,
      islem: "urun.kopyalandi",
      kayit: { tur: "urun", kimlik: kopya },
      eski: null,
      yeni: { kaynak: kaynak.kimlik },
    });
    return kopya;
  });
};
