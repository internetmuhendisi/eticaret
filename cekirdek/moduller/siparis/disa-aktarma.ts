// Siparişlerin dışa aktarması (kart 0316, karar 0185, plan planlar/siparisleri-disa-aktarma.md). Yalnız bu servisle.
//
// Kurallar:
// - Kapsam listenin süzgeçleridir (siparisYonetimi.listeninSiparisleri: liste ve dosya aynı koşulu kullanır) ya da
//   seçilen siparişlerin numaraları. Arama kapsamda yoktur: aranan metin adrese yazılmaz (kişisel bilgi, karar 0145).
// - Başlatma kaydı ve işi aynı işlemde yazar. Kapsam boşsa "siparis-yok", sınırı aşıyorsa "cok-fazla-siparis".
// - İş dosyayı kilitli satırda bir kez yazar; siparişler partilerle okunur (siparisDisaAktarmaAyari.partiBoyu).
// - Tutarlar siparişin saklanan değerleridir (yeniden hesaplanmaz), sitenin biçimiyle sayı olarak yazılır.
// - Kişisel bilgisi silinmiş siparişte kişisel sütunlar boştur; il, ilçe, ülke ve tutarlar kalır (temizlik.ts).
// - Dosyayı yalnız isteyen indirir; her indirme değişiklik kaydına girer (kişisel veri çıkışı): kapsam, düzen, sayı.
// - Kayıt ve dosya saklamaSaat dolunca silinir (eskileriSil, saatlik iş).
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { adresYazisi } from "../../bolgeler/adres-yazisi.ts";
import { ilAdi, ilceAdi } from "../../bolgeler/bolgeler.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import {
  type SiparisDisaAktarmaDurumu,
  type SiparisDisaAktarmaDuzeni,
  type SiparisDurumu,
  type SiparisListesiSiralamasi,
  siparisDisaAktarmaAyari,
} from "../../kayitlar/siparis.ts";
import { yerelZamana } from "../../metinler/bicimleyici.ts";
import { type CsvHucresi, csvYazici, metinHucresi, sayiHucresi } from "../../metinler/csv.ts";
import { type MetinAnahtari, metinOkuyucu } from "../../metinler/metin.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { durumMetni, odemeYazisi } from "../../yonetim-paneli/siparisler/metinler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import {
  type SiparisDisaAktarmaKapsami,
  type SiparisKalemi,
  siparisDisaAktarmalari,
  siparisKalemleri,
  siparisler,
} from "./model.ts";
import type { SiparisListesiGirdisi } from "./semalar.ts";
import { siparisYonetimi } from "./yonetim.ts";

type Vt = Veritabani | VeritabaniIslemi;

// Listenin süzgeçleri: servisin liste girdisi, sayfa ve arama olmadan.
export type SiparisListesiSuzgecleri = Omit<
  SiparisListesiGirdisi,
  "ara" | "sayfa" | "sayfaBoyu" | "siralama"
> & { siralama: SiparisListesiSiralamasi };

export type SiparisDisaAktarmaGirdisi = {
  kapsam:
    | { tur: "liste"; suzgecler: SiparisListesiSuzgecleri }
    | { tur: "secili"; numaralar: string[] };
  duzen: SiparisDisaAktarmaDuzeni;
};

export type SiparisDisaAktarmaBilgisi = {
  kimlik: string;
  durum: SiparisDisaAktarmaDurumu;
  duzen: SiparisDisaAktarmaDuzeni;
  siparisSayisi: number;
  indirildi: boolean;
};

// İşi kuyruğa koyan (isler.ts verir; testler kendi çağırır).
export type SiparisDisaAktarmaIsleri = {
  hazirla: (vt: VeritabaniIslemi, kimlik: string) => Promise<unknown>;
};

const sutunMetni = (ad: string) => `yonetim.siparisDisaAktarma.sutun.${ad}` as MetinAnahtari;

// Siparişin sütunları (her iki düzende) ve kalemin ek sütunları; vergi sütunları ara toplamdan sonra, oran oran.
const siparisSutunlariOnce = [
  "numara",
  "tarih",
  "durum",
  "odeme",
  "musteri",
  "eposta",
  "telefon",
  "adres",
  "ilce",
  "il",
  "postaKodu",
  "ulke",
  "faturaTuru",
  "faturaUnvani",
  "vergiDairesi",
  "vergiNumarasi",
  "faturaAdresi",
  "araToplam",
  "kuponKodu",
  "kuponIndirimi",
  "kargo",
] as const;
const siparisSutunlariSonra = [
  "vergiToplami",
  "toplam",
  "paraBirimi",
  "kargoFirmasi",
  "takipNumarasi",
  "faturaNumarasi",
  "faturaTarihi",
] as const;
const kalemSutunlari = [
  "urun",
  "secim",
  "stokKodu",
  "adet",
  "birimFiyat",
  "satirTutari",
  "kuponPayi",
  "vergisiz",
  "kalemVergisi",
] as const;

// Vergi sütunu: oranın adı ve oranı (milyonda bir); aynı ad ve oran tek sütundur.
const vergiAnahtari = (satir: { ad?: string | undefined; oran: number }) =>
  `${satir.ad ?? ""}\u0000${satir.oran}`;

export const siparisDisaAktarmaServisi = (site: Site, isler: SiparisDisaAktarmaIsleri) => {
  const yonetim = siparisYonetimi(site);
  const ayar = siparisDisaAktarmaAyari;

  const baslat = async (
    vt: Veritabani,
    yonetici: string,
    girdi: SiparisDisaAktarmaGirdisi,
  ): Promise<string> => {
    const sayi =
      girdi.kapsam.tur === "liste"
        ? (await yonetim.listeninSiparisleri(vt, girdi.kapsam.suzgecler, ayar.enCokSiparis)).toplam
        : (
            await vt
              .select({ kimlik: siparisler.kimlik })
              .from(siparisler)
              .where(inArray(siparisler.numara, girdi.kapsam.numaralar))
          ).length;
    if (sayi === 0) throw new BilinenHata("is-kurali", [{ alan: "kapsam", kod: "siparis-yok" }]);
    if (sayi > ayar.enCokSiparis) {
      throw new BilinenHata("is-kurali", [{ alan: "kapsam", kod: "cok-fazla-siparis" }]);
    }
    const kapsam: SiparisDisaAktarmaKapsami =
      girdi.kapsam.tur === "liste"
        ? { tur: "liste", suzgecler: girdi.kapsam.suzgecler }
        : { tur: "secili", numaralar: girdi.kapsam.numaralar };
    return vt.transaction(async (islem) => {
      const [satir] = await islem
        .insert(siparisDisaAktarmalari)
        .values({
          yonetici_kimligi: yonetici,
          durum: "hazirlaniyor",
          duzen: girdi.duzen,
          kapsam,
          siparis_sayisi: sayi,
        })
        .returning({ kimlik: siparisDisaAktarmalari.kimlik });
      if (satir === undefined) throw new Error("Dışa aktarma yazılamadı.");
      await isler.hazirla(islem, satir.kimlik);
      return satir.kimlik;
    });
  };

  // Kapsamın siparişleri: listenin sırasıyla ya da seçimin sırasıyla.
  const kapsaminSiparisleri = async (
    vt: Vt,
    kapsam: SiparisDisaAktarmaKapsami,
  ): Promise<string[]> => {
    if (kapsam.tur === "liste") {
      const { kimlikler } = await yonetim.listeninSiparisleri(
        vt as Veritabani,
        kapsam.suzgecler as SiparisListesiSuzgecleri,
        ayar.enCokSiparis,
      );
      return kimlikler;
    }
    const satirlar = await vt
      .select({ kimlik: siparisler.kimlik, numara: siparisler.numara })
      .from(siparisler)
      .where(inArray(siparisler.numara, kapsam.numaralar));
    const sira = new Map(kapsam.numaralar.map((numara, i) => [numara, i]));
    return satirlar
      .toSorted((a, b) => (sira.get(a.numara) ?? 0) - (sira.get(b.numara) ?? 0))
      .map((satir) => satir.kimlik);
  };

  // İş: dosyayı yazar. Kilitli satırda çalışır, aynı dışa aktarma iki kez yazılmaz.
  const hazirla = async (vt: Veritabani, kimlik: string): Promise<void> => {
    await vt.transaction(async (islem) => {
      const [kayit] = await islem
        .select()
        .from(siparisDisaAktarmalari)
        .where(eq(siparisDisaAktarmalari.kimlik, kimlik))
        .for("update", { skipLocked: true });
      if (kayit === undefined || kayit.durum !== "hazirlaniyor") return;
      const kimlikler = await kapsaminSiparisleri(islem, kayit.kapsam);
      const b = siteninBicimleyicisi(site.ayarlar);
      const metin = metinOkuyucu(site.ayarlar.dil);
      const kalemli = kayit.duzen === "kalem";

      // Vergi sütunları: kapsamdaki siparişlerde geçen oranlar, ad ve oran sırasıyla.
      const oranlar = new Map<string, { ad?: string | undefined; oran: number }>();
      for (let i = 0; i < kimlikler.length; i += ayar.partiBoyu) {
        const dokumler = await islem
          .select({ dokum: siparisler.vergi_dokumu })
          .from(siparisler)
          .where(inArray(siparisler.kimlik, kimlikler.slice(i, i + ayar.partiBoyu)));
        for (const { dokum } of dokumler) {
          for (const satir of dokum) oranlar.set(vergiAnahtari(satir), satir);
        }
      }
      const vergiSutunlari = [...oranlar.values()].toSorted(
        (a, c) => b.adKarsilastir(a.ad ?? "", c.ad ?? "") || a.oran - c.oran,
      );

      const yazici = csvYazici(b.csvAyraci());
      yazici.satir(
        [
          ...siparisSutunlariOnce.map((ad) => metin(sutunMetni(ad))),
          ...vergiSutunlari.map(
            (satir) =>
              `${satir.ad ?? metin("yonetim.siparisDisaAktarma.sutun.vergi")} ${b.yuzde(satir.oran / 10_000)}`,
          ),
          ...siparisSutunlariSonra.map((ad) => metin(sutunMetni(ad))),
          ...(kalemli ? kalemSutunlari.map((ad) => metin(sutunMetni(ad))) : []),
        ].map(metinHucresi),
      );

      const tutar = (deger: number) => sayiHucresi(b.csvTutari(deger));
      let satirSayisi = 0;
      for (let i = 0; i < kimlikler.length; i += ayar.partiBoyu) {
        const parti = kimlikler.slice(i, i + ayar.partiBoyu);
        const okunan = await islem
          .select()
          .from(siparisler)
          .where(inArray(siparisler.kimlik, parti));
        const sira = new Map(parti.map((k, j) => [k, j]));
        okunan.sort((a, c) => (sira.get(a.kimlik) ?? 0) - (sira.get(c.kimlik) ?? 0));
        const kalemler = new Map<string, SiparisKalemi[]>();
        if (kalemli) {
          const satirlar = await islem
            .select()
            .from(siparisKalemleri)
            .where(inArray(siparisKalemleri.siparis_kimligi, parti))
            .orderBy(asc(siparisKalemleri.siparis_kimligi), asc(siparisKalemleri.sira));
          for (const kalem of satirlar) {
            kalemler.set(kalem.siparis_kimligi, [
              ...(kalemler.get(kalem.siparis_kimligi) ?? []),
              kalem,
            ]);
          }
        }
        for (const siparis of okunan) {
          const silindi = siparis.kisisel_veri_silinme_zamani !== null;
          const kisisel = (deger: string | null | undefined) => metinHucresi(silindi ? "" : deger);
          const { teslimat, fatura } = siparis;
          const vergiler = new Map(siparis.vergi_dokumu.map((s) => [vergiAnahtari(s), s.vergi]));
          const kuponIndirimi =
            siparis.kupon_turu === "ucretsiz-kargo"
              ? siparis.kupon_kargo_indirimi
              : siparis.kupon_indirimi;
          const faturaAdresi =
            fatura.adresAyni || fatura.adres === undefined
              ? metin("yonetim.siparisDisaAktarma.teslimatAdresiyleAyni")
              : adresYazisi(fatura.adres, b.ulkeAdi);
          const siparisHucreleri: CsvHucresi[] = [
            metinHucresi(siparis.numara),
            metinHucresi(
              yerelZamana(siparis.olusturma_zamani, site.ayarlar.saatDilimi).replace("T", " "),
            ),
            metinHucresi(metin(durumMetni(siparis.durum as SiparisDurumu))),
            metinHucresi(odemeYazisi(metin, siparis.odeme_yontemi, siparis.kapida_secenegi)),
            kisisel(`${teslimat.ad ?? ""} ${teslimat.soyad ?? ""}`.trim()),
            kisisel(siparis.eposta),
            kisisel(teslimat.telefon),
            kisisel(teslimat.adres.adres),
            metinHucresi(teslimat.adres.ilce === undefined ? "" : ilceAdi(teslimat.adres.ilce)),
            metinHucresi(teslimat.adres.il === undefined ? "" : ilAdi(teslimat.adres.il)),
            kisisel(teslimat.adres.postaKodu),
            metinHucresi(b.ulkeAdi(teslimat.adres.ulke)),
            metinHucresi(metin(`yonetim.siparisDisaAktarma.faturaTuru.${fatura.tur}`)),
            kisisel(fatura.tur === "kurumsal" ? fatura.firma : ""),
            kisisel(fatura.tur === "kurumsal" ? fatura.vergiDairesi : ""),
            kisisel(fatura.tur === "kurumsal" ? fatura.vergiNumarasi : ""),
            kisisel(faturaAdresi),
            tutar(siparis.ara_toplam),
            metinHucresi(siparis.kupon_kodu),
            tutar(kuponIndirimi),
            tutar(siparis.kargo_tutari),
            ...vergiSutunlari.map((oran) => tutar(vergiler.get(vergiAnahtari(oran)) ?? 0)),
            tutar(siparis.vergi_toplami),
            tutar(siparis.toplam),
            metinHucresi(siparis.para_birimi),
            metinHucresi(siparis.kargo_firmasi),
            metinHucresi(siparis.takip_numarasi),
            metinHucresi(siparis.fatura_numarasi),
            metinHucresi(siparis.fatura_tarihi),
          ];
          if (!kalemli) {
            yazici.satir(siparisHucreleri);
            satirSayisi += 1;
            continue;
          }
          for (const kalem of kalemler.get(siparis.kimlik) ?? []) {
            yazici.satir([
              ...siparisHucreleri,
              metinHucresi(kalem.urun_adi),
              metinHucresi(
                kalem.secim.map(({ secenek, deger }) => `${secenek}: ${deger}`).join(" · "),
              ),
              metinHucresi(kalem.stok_kodu),
              sayiHucresi(String(kalem.adet)),
              tutar(kalem.birim_tutari),
              tutar(kalem.tutar),
              tutar(kalem.indirim),
              tutar(kalem.vergisiz),
              tutar(kalem.vergi),
            ]);
            satirSayisi += 1;
          }
        }
      }
      await islem
        .update(siparisDisaAktarmalari)
        .set({
          durum: "hazir",
          dosya: yazici.dosya(),
          siparis_sayisi: kimlikler.length,
          satir_sayisi: satirSayisi,
          bitis_zamani: sql`now()`,
        })
        .where(eq(siparisDisaAktarmalari.kimlik, kimlik));
    });
  };

  // İşin son denemesi de düşünce dışa aktarma hatalı olur (isler.ts, sonHata).
  const hatali = async (vt: Vt, kimlik: string): Promise<void> => {
    await vt
      .update(siparisDisaAktarmalari)
      .set({ durum: "hatali", bitis_zamani: sql`now()` })
      .where(
        and(
          eq(siparisDisaAktarmalari.kimlik, kimlik),
          eq(siparisDisaAktarmalari.durum, "hazirlaniyor"),
        ),
      );
  };

  // Yöneticinin dışa aktarması: kimlikle ya da (kimliksiz) sonuncusu. Başkasınınki yoktur.
  const durum = async (
    vt: Vt,
    yonetici: string,
    kimlik?: string,
  ): Promise<SiparisDisaAktarmaBilgisi | null> => {
    if (kimlik !== undefined && !kimlikMi(kimlik)) return null;
    const [kayit] = await vt
      .select({
        kimlik: siparisDisaAktarmalari.kimlik,
        durum: siparisDisaAktarmalari.durum,
        duzen: siparisDisaAktarmalari.duzen,
        siparisSayisi: siparisDisaAktarmalari.siparis_sayisi,
        indirme: siparisDisaAktarmalari.indirme_zamani,
      })
      .from(siparisDisaAktarmalari)
      .where(
        and(
          eq(siparisDisaAktarmalari.yonetici_kimligi, yonetici),
          kimlik === undefined
            ? undefined
            : eq(siparisDisaAktarmalari.kimlik, kimligiDuzelt(kimlik)),
        ),
      )
      .orderBy(desc(siparisDisaAktarmalari.olusturma_zamani))
      .limit(1);
    if (kayit === undefined) return null;
    const { indirme, ...bilgi } = kayit;
    return {
      ...bilgi,
      durum: bilgi.durum as SiparisDisaAktarmaDurumu,
      duzen: bilgi.duzen as SiparisDisaAktarmaDuzeni,
      indirildi: indirme !== null,
    };
  };

  // Hazır dosya, yalnız isteyene. Her indirme değişiklik kaydına girer (dosyayla aynı işlemde).
  const dosya = async (
    vt: Veritabani,
    yonetici: string,
    kimlik: string,
  ): Promise<{ dosya: Buffer; olusturma: Date }> => {
    if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
    return vt.transaction(async (islem) => {
      const [kayit] = await islem
        .select()
        .from(siparisDisaAktarmalari)
        .where(
          and(
            eq(siparisDisaAktarmalari.kimlik, kimligiDuzelt(kimlik)),
            eq(siparisDisaAktarmalari.yonetici_kimligi, yonetici),
            eq(siparisDisaAktarmalari.durum, "hazir"),
          ),
        );
      if (kayit === undefined || kayit.dosya === null) throw new BilinenHata("bulunamadi");
      await islem
        .update(siparisDisaAktarmalari)
        .set({ indirme_zamani: sql`coalesce(${siparisDisaAktarmalari.indirme_zamani}, now())` })
        .where(eq(siparisDisaAktarmalari.kimlik, kayit.kimlik));
      await degisikligiKaydet(islem, {
        kim: { tur: "yonetici", kimlik: yonetici },
        islem: "siparis.disa-aktarildi",
        kayit: { tur: "siparis-disa-aktarma", kimlik: kayit.kimlik },
        eski: null,
        yeni: {
          kapsam: kayit.kapsam.tur,
          ...(kayit.kapsam.tur === "liste"
            ? { suzgecler: kayit.kapsam.suzgecler }
            : { numaralar: kayit.kapsam.numaralar }),
          duzen: kayit.duzen,
          siparisSayisi: kayit.siparis_sayisi,
        },
      });
      return { dosya: kayit.dosya, olusturma: kayit.olusturma_zamani };
    });
  };

  // Saklama süresi dolan kayıtlar dosyalarıyla silinir.
  const eskileriSil = async (vt: Vt): Promise<number> => {
    const silinen = await vt
      .delete(siparisDisaAktarmalari)
      .where(
        lt(
          siparisDisaAktarmalari.olusturma_zamani,
          sql`now() - make_interval(hours => ${ayar.saklamaSaat})`,
        ),
      )
      .returning({ kimlik: siparisDisaAktarmalari.kimlik });
    return silinen.length;
  };

  return { baslat, hazirla, hatali, durum, dosya, eskileriSil };
};
