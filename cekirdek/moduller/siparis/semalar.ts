// Panelin sipariş uçlarının ve formlarının şemaları (kart 0234–0236; .claude/rules/formlar.md). Vitrinin havale
// bildirimi ve sipariş numarası şemaları havale-bildirimi-semalari.ts'tedir: bu dosya ödeme adımının adres ve fatura
// şemalarını içe aktarır, vitrin formuna alınırsa tarayıcıya gereksiz kod taşır (kart 0248).
import { z } from "zod";
import { panelSayfaBoylari, suzgecDegerSiniri } from "../../kayitlar/liste.ts";
import { kapidaOdemeSecenekleri, siparisOdemeYontemleri } from "../../kayitlar/odeme.ts";
import { sepetSinirlari } from "../../kayitlar/sepet.ts";
import {
  iadeKargosuOdeyenler,
  iadeNedenleri,
  iadeSinirlari,
  iadeTalebiSinirlari,
  iadeTalebiSuresiSinirlari,
  iadeTurleri,
  musteriIptaliSecenekleri,
  siparisDisaAktarmaDuzenleri,
  siparisDurumlari,
  siparisListesiSiralamalari,
  siparisNotTurleri,
  siparisSinirlari,
  siparisTopluIslemleri,
} from "../../kayitlar/siparis.ts";
import { yoneticiBildirimleri } from "../../kayitlar/yonetici-bildirimi.ts";
import { takvimGunuMu } from "../../metinler/bicimleyici.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { kayitDegeriYasakMi, kayitMetniHatasi } from "../degisiklik-kaydi/deger.ts";
import {
  faturaSemasi,
  faturaVergiDenetimi,
  odemeNotuSemasi,
  teslimatSemasi,
} from "../odeme/semalar.ts";
import { epostaSemasi } from "../oturum/semalar.ts";
import { sepetKalemiSemasi } from "../sepet/semalar.ts";
import { bosIseYok, siparisNumarasiSemasi } from "./havale-bildirimi-semalari.ts";

// Panelin sipariş uçları (kart 0234). Liste: servisin girdisi (kart 0258): durum ya da bekleyen iade talebi süzgeci,
// ödeme yöntemleri, aranan metin (numara, ad ya da e-posta), sıralama, sayfa ve sayfa başına satır. Panelin adresi ve
// liste ucu bu girdiyi liste tanımından kurar (cekirdek/yonetim-paneli/siparisler/liste-tanimi.ts). İşlem: ekranın
// gördüğü durumla gelir; arada durum değiştiyse servis "cakisma" verir. Kargo işleminde firma listedeki kimliktir,
// takip numarası isteğe bağlıdır.
export const siparisListesiSemasi = z.strictObject({
  durum: z.enum(siparisDurumlari).optional(),
  // Yalnız bakılması gerekenler (kart 0267): bildirilmiş havalesi ödeme bekleyen, bekleyen iade talebi olan, sonucu
  // beklenen iadesi olan, onaylanmış ve iadesi yapılmamış talebi olan ya da son iadesi başarısız olan siparişler.
  bakilacak: z.literal(true).optional(),
  odeme: z.array(z.enum(siparisOdemeYontemleri)).min(1).optional(),
  // Oluşturulduğu gün, sitenin saat dilimiyle (kart 0267): iki uç da dahil, boş uç sınırsız.
  tarih: z
    .strictObject({
      baslangic: z.string().refine(takvimGunuMu).nullable(),
      bitis: z.string().refine(takvimGunuMu).nullable(),
    })
    .refine(
      ({ baslangic, bitis }) =>
        (baslangic !== null || bitis !== null) &&
        (baslangic === null || bitis === null || baslangic <= bitis),
    )
    .optional(),
  // Kargoya verildiği andaki firma adı (kart 0267): firma listesi sonradan değişse de siparişin adıyla süzülür.
  kargo: z
    .array(z.string().trim().min(1).max(siparisSinirlari.kargoFirmasiAdEnCok))
    .min(1)
    .max(suzgecDegerSiniri)
    .optional(),
  ara: z.preprocess(bosIseYok, z.string().trim().max(siparisSinirlari.aramaEnCok).optional()),
  siralama: z.enum(siparisListesiSiralamalari).default(siparisListesiSiralamalari[0]),
  sayfa: z.coerce.number().int().min(1).max(10_000).default(1),
  sayfaBoyu: z.literal(panelSayfaBoylari).default(panelSayfaBoylari[0]),
});
export type SiparisListesiGirdisi = z.output<typeof siparisListesiSemasi>;

// Toplu işlem (kart 0258): ekranın gördüğü siparişler ve durumları; en çok bir sayfa, her numara bir kez.
export const siparisTopluIslemiSemasi = z.strictObject({
  islem: z.enum(siparisTopluIslemleri),
  siparisler: z
    .array(
      z.strictObject({ numara: siparisNumarasiSemasi, gorulenDurum: z.enum(siparisDurumlari) }),
    )
    .min(1)
    .max(Math.max(...panelSayfaBoylari))
    .refine((liste) => new Set(liste.map(({ numara }) => numara)).size === liste.length, "tekrar"),
});

export const siparisAyrintisiSemasi = z.strictObject({ numara: siparisNumarasiSemasi });

export const takipNumarasiSemasi = z
  .string()
  .trim()
  .max(siparisSinirlari.takipNumarasiEnCok)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, "takip-numarasi-bicimi");

export const kargoBilgisiSemasi = z.strictObject({
  firma: kimlikSemasi,
  takipNumarasi: z.preprocess(bosIseYok, takipNumarasiSemasi.optional()),
});
export type KargoBilgisi = z.output<typeof kargoBilgisiSemasi>;

// Yönetim izniyle yapılan işlemler; havale onayı kendi ucundan, kendi izniyle gelir (siparisIslemleri).
const yonetimIslemleri = [
  "hazirlamaya-al",
  "kargoya-ver",
  "kargo-duzelt",
  "teslim-edildi",
] as const;

export const siparisIslemiSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  islem: z.enum(yonetimIslemleri),
  gorulenDurum: z.enum(siparisDurumlari),
  kargo: kargoBilgisiSemasi.optional(),
});
export type SiparisIslemiGirdisi = z.output<typeof siparisIslemiSemasi>;

export const havaleOnayiSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  gorulenDurum: z.enum(siparisDurumlari),
});

export const siparisNotuSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  tur: z.enum(siparisNotTurleri),
  metin: duzMetinSemasi(siparisSinirlari.notEnCok),
});
export type SiparisNotuGirdisi = z.output<typeof siparisNotuSemasi>;

// Siparişin faturası (kart 0268, karar 0170). Ekran gördüğü faturayı (gorulen; yoksa null) gönderir: arada başkası
// değiştirdiyse servis "cakisma" verir. Numara ve tarih zorunlu, dosya isteğe bağlıdır (önce fatura-yukle ucuyla
// kaydedilir, kimliğiyle gelir). Numara değişiklik kaydına girer: harf, rakam, boşluk, nokta, tire ve eğik çizgi.
// eposta: müşteriye "Faturanız hazır" e-postası (kullanıcı kararı, varsayılan işaretli).
const faturaNumarasiSemasi = z
  .string()
  .trim()
  .min(1)
  .max(siparisSinirlari.faturaNumarasiEnCok)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} ./-]*$/u)
  .transform((deger) => deger.normalize("NFC"));
const gorulenFaturaSemasi = z
  .strictObject({
    numara: z.string(),
    tarih: z.string(),
    dosya: kimlikSemasi.nullable(),
  })
  .nullable();
export const siparisFaturasiSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  gorulen: gorulenFaturaSemasi,
  fatura: z.strictObject({
    numara: faturaNumarasiSemasi,
    tarih: z.string().refine(takvimGunuMu),
    dosya: kimlikSemasi.nullable(),
  }),
  eposta: z.boolean(),
});
export type SiparisFaturasiGirdisi = z.output<typeof siparisFaturasiSemasi>;
export const siparisFaturasiKaldirSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  gorulen: gorulenFaturaSemasi.unwrap(),
});
export type SiparisFaturasiKaldirGirdisi = z.output<typeof siparisFaturasiKaldirSemasi>;

// Sipariş ayarlarının kargo firmaları bölümü: ekran bütün listeyi gördüğü hâliyle (onceki) ve yeni hâliyle verir;
// yeni firmanın kimliği yoktur, servis verir. Arada liste değiştiyse "cakisma".
// Firma adı değişiklik kaydına girer: kayda yazılamayan değer (e-posta gibi) ve denetim karakteri alanın hatasıdır.
export const kargoFirmasiAdiSemasi = duzMetinSemasi(siparisSinirlari.kargoFirmasiAdEnCok).refine(
  (ad) => !kayitDegeriYasakMi(ad),
  kayitMetniHatasi,
);

const firmaGirdisi = z.strictObject({
  kimlik: kimlikSemasi.optional(),
  ad: kargoFirmasiAdiSemasi,
  takipAdresi: z.preprocess(
    bosIseYok,
    z.string().trim().max(siparisSinirlari.takipAdresiEnCok).optional(),
  ),
});
export type KargoFirmasiGirdisi = z.output<typeof firmaGirdisi>;

export const kargoFirmalariSemasi = z.strictObject({
  onceki: z.array(kimlikSemasi).max(siparisSinirlari.kargoFirmasiEnCok),
  firmalar: z.array(firmaGirdisi).max(siparisSinirlari.kargoFirmasiEnCok),
});
export type KargoFirmalariGirdisi = z.output<typeof kargoFirmalariSemasi>;

export const kargoFirmalariDurumuSemasi = z.strictObject({});

// İptal ve iade (kart 0235, karar 0147). Ekran ürünleri sırasıyla ve adediyle, kargonun iade edilip edilmeyeceğini ve
// isterse elle tutarı (sitenin para biçimiyle yazı, servis kuruşa çevirir) gönderir; tutarı servis hesaplar. İptalde
// ürün seçilmez: bütün ürünler ve kargo iptale girer.
export const siparisIadesiSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  tur: z.enum(iadeTurleri),
  gorulenDurum: z.enum(siparisDurumlari),
  kalemler: z
    .array(
      z.strictObject({
        sira: z.number().int().min(0),
        adet: z.number().int().min(0).max(1_000_000),
      }),
    )
    .max(1000)
    .refine((kalemler) => new Set(kalemler.map((kalem) => kalem.sira)).size === kalemler.length, {
      message: "kalem-tekrar",
    })
    .default([]),
  kargo: z.boolean().default(false),
  tutar: z.preprocess(bosIseYok, z.string().trim().max(40).optional()),
  stogaKoy: z.boolean(),
  neden: z.enum(iadeNedenleri),
  aciklama: z.preprocess(bosIseYok, duzMetinSemasi(iadeSinirlari.aciklamaEnCok).optional()),
  // Onaylanan iade talebinden yapılan iade (kart 0239).
  talep: kimlikSemasi.optional(),
});
export type SiparisIadesiGirdisi = z.output<typeof siparisIadesiSemasi>;

// Müşterinin iade talebine mağazanın kararı (kart 0239): onay ya da müşteriye açıklamayla ret.
export const iadeTalebiKarariSemasi = z.discriminatedUnion("karar", [
  z.strictObject({
    numara: siparisNumarasiSemasi,
    talep: kimlikSemasi,
    karar: z.literal("onayla"),
  }),
  z.strictObject({
    numara: siparisNumarasiSemasi,
    talep: kimlikSemasi,
    karar: z.literal("reddet"),
    retAciklamasi: duzMetinSemasi(iadeTalebiSinirlari.retAciklamasiEnCok),
  }),
]);
export type IadeTalebiKarari = z.output<typeof iadeTalebiKarariSemasi>;

// Sipariş ayarlarının "İptal ve iade" bölümü (kart 0239).
export const iptalVeIadeAyarlariSemasi = z.strictObject({
  musteriIptali: z.enum(musteriIptaliSecenekleri),
  iadeTalebiSuresi: z.coerce
    .number()
    .int()
    .min(iadeTalebiSuresiSinirlari.enAz)
    .max(iadeTalebiSuresiSinirlari.enCok),
  iadeKargosu: z.enum(iadeKargosuOdeyenler),
});
export type IptalVeIadeAyarlari = z.output<typeof iptalVeIadeAyarlariSemasi>;

// Sipariş ayarlarının "Sipariş fişi" bölümü (kart 0270): fişte fiyatlar.
export const fisAyarlariSemasi = z.strictObject({ fisteFiyatlar: z.boolean() });
export type FisAyarlari = z.output<typeof fisAyarlariSemasi>;

// Sipariş ayarlarının "Yönetici bildirimleri" bölümü (kart 0241): alıcılar ekranın yazdığı hâliyle (virgülle ayrılmış),
// sunucuda ayrılıp doğrulanır (siparisAyarlari.yoneticiBildirimleriniKaydet); kapalı bildirimler ekranda görünenlerden.
export const yoneticiBildirimAyarlariSemasi = z.strictObject({
  alicilar: z.string().max(2000),
  kapalilar: z
    .array(z.enum(yoneticiBildirimleri))
    .max(yoneticiBildirimleri.length)
    .refine((liste) => new Set(liste).size === liste.length, "tekrar"),
});
export type YoneticiBildirimAyarlariGirdisi = z.output<typeof yoneticiBildirimAyarlariSemasi>;

// Bekleyen (kuruluşun yanıtını bekleyen) iadeyi yeniden dener.
export const iadeYenidenDenemeSemasi = z.strictObject({ numara: siparisNumarasiSemasi });

// Panelden elle sipariş (kart 0236, karar 0148). Müşteri ya hesabıyla seçilir (kimlik) ya da üye olmayan müşterinin
// e-postası yazılır. Teslimat, fatura ve not ödeme adımının şemasıyladır. Ödeme havale, kapıda ödemenin seçeneği ya da
// "elden" (ödeme alındı); kartla ödeme panelden alınmaz. Ön bilgilendirme formu ve mesafeli satış sözleşmesinin
// müşteriye iletildiği yöneticinin zorunlu beyanıdır (kullanıcı kararı). Tutar yoktur; görülen toplam yalnız
// karşılaştırılır.
export const elleSiparisOdemesiSemasi = z.discriminatedUnion("yontem", [
  z.strictObject({ yontem: z.literal("havale") }),
  z.strictObject({ yontem: z.literal("kapida-odeme"), secenek: z.enum(kapidaOdemeSecenekleri) }),
  z.strictObject({ yontem: z.literal("elden") }),
]);
export type ElleSiparisOdemesi = z.output<typeof elleSiparisOdemesiSemasi>;

export const elleSiparisSemasi = z.strictObject({
  musteri: z.discriminatedUnion("tur", [
    z.strictObject({ tur: z.literal("uye"), kimlik: kimlikSemasi }),
    z.strictObject({ tur: z.literal("misafir"), eposta: epostaSemasi }),
  ]),
  kalemler: z.array(sepetKalemiSemasi).min(1).max(sepetSinirlari.kalemEnCok),
  bilgiler: z
    .strictObject({
      odemeYontemi: elleSiparisOdemesiSemasi,
      teslimat: teslimatSemasi,
      fatura: faturaSemasi,
      not: odemeNotuSemasi,
      metinlerIletildi: z.literal(true),
    })
    .superRefine(faturaVergiDenetimi),
  gorulenToplam: z.int().min(0).optional(),
  // Müşteriye sipariş e-postası gitsin mi (kart 0240, kullanıcı kararı: panelde varsayılan işaretli).
  musteriyeEposta: z.boolean(),
});
export type ElleSiparisGirdisi = z.output<typeof elleSiparisSemasi>;

// Elle siparişin ürün ve müşteri araması (panelin arama kutuları). Müşteri araması en az 3 harf ister: e-postalar ve son
// teslimat harf harf denenerek toplanmasın (bağımsız kontrolün bulgusu).
export const elleSiparisAramaSemasi = z.strictObject({ ara: z.string().trim().min(1).max(100) });
export const elleSiparisMusteriAramaSiniri = 3;
export const elleSiparisMusteriAramasiSemasi = z.strictObject({
  ara: z.string().trim().min(elleSiparisMusteriAramaSiniri).max(100),
});

// Siparişin teslimat ve fatura bilgilerinin düzeltmesi (kart 0269, karar 0180): ödeme adımının şemalarıyla (il ve ilçe
// tutarlı, telefon biçimi, kurumsal faturanın vergi numarası faturanın ülkesinin kuralıyla). surum: ekranın gördüğü
// durum ve bilgilerin özeti (adresSurumu); arada değiştiyse "cakisma". eposta: müşteriye "Teslimat bilgileriniz
// güncellendi" e-postası.
export const siparisAdresiSemasi = z
  .strictObject({
    numara: siparisNumarasiSemasi,
    surum: z.string().min(1).max(100),
    teslimat: teslimatSemasi,
    fatura: faturaSemasi,
    eposta: z.boolean(),
  })
  .superRefine(faturaVergiDenetimi);
export type SiparisAdresiGirdisi = z.output<typeof siparisAdresiSemasi>;

// Siparişleri dışa aktarma (kart 0316): listenin adresinin sorgusu (süzgeçler; arama ve sayfa yok sayılır) ya da seçilen
// siparişlerin numaraları (en çok bir sayfa, her numara bir kez), satır düzeni.
export const siparisDisaAktarmaSemasi = z.strictObject({
  kapsam: z.discriminatedUnion("tur", [
    z.strictObject({ tur: z.literal("liste"), sorgu: z.string().max(2000) }),
    z.strictObject({
      tur: z.literal("secili"),
      numaralar: z
        .array(siparisNumarasiSemasi)
        .min(1)
        .max(Math.max(...panelSayfaBoylari))
        .refine((liste) => new Set(liste).size === liste.length, "tekrar"),
    }),
  ]),
  duzen: z.enum(siparisDisaAktarmaDuzenleri),
});
export const siparisDisaAktarmaKimligiSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const siparisDisaAktarmaDurumSemasi = z.strictObject({ kimlik: kimlikSemasi.optional() });
