// Müşteriye giden sipariş e-postalarının içeriği (kart 0240, karar 0153). Veri olay anında, siparişin değişikliğiyle
// aynı işlemde yazılır (epostalar.ts): tutarlar kuruş, anlar ISO yazısıdır. Burada yalnız gönderimde sitenin dili ve
// biçimiyle bloklara çevrilir; tutar ve vergi yeniden hesaplanmaz, siparişin saklanan değerleridir.
//
// Bu dosya saf kalır (veritabanı ve vitrin yok): e-posta şablonu (cekirdek/moduller/eposta/sablon.ts) onu içe aktarır.
import { adresYazisi } from "../../bolgeler/adres-yazisi.ts";
import { ibanYazisi } from "../../bolgeler/iban-yazisi.ts";
import type { EpostaSablonu } from "../../kayitlar/eposta.ts";
import type {
  IadeKargosuOdeyen,
  MusteriIadeNedeni,
  SiparisGecmisiNedeni,
} from "../../kayitlar/siparis.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import {
  hesapSiparisiAdresi,
  siparisTakibiAdresi,
  vitrinAdresleri,
} from "../../vitrin/adresler.ts";
import type {
  EpostaBlogu,
  EpostaGovdesi,
  IcerikBaglami,
  IcerikUretici,
  OzetSatiri,
} from "../eposta/sablon.ts";
import type { Teslimat } from "../odeme/semalar.ts";
import type { VergiDokumu } from "./model.ts";

export type SiparisEpostaKalemi = {
  ad: string;
  secim: { secenek: string; deger: string }[];
  adet: number;
  // Satırın (ya da iade edilen adedin) tutarı; talepte yoktur.
  tutar?: number;
};

export type SiparisEpostaTutarlari = {
  adet: number;
  kargoTuru: string;
  gosterim: string;
  araToplam: number;
  kargoTutari: number;
  vergiToplami: number;
  toplam: number;
  vergiDokumu: VergiDokumu;
};

export type SiparisEpostaIadesi = {
  tutar: number;
  // Para nereden döner (siparis_iadeleri.yontem): kuruluş, elle ya da yok (tutar 0).
  yontem: string;
  kargoTutari: number;
  vergiDokumu: VergiDokumu;
};

export type SiparisEpostaVerisi = {
  numara: string;
  // Teslimattaki ad: "Merhaba Deniz".
  ad: string;
  // Üyenin e-postası hesaptaki ayrıntıya, üye olmayanınki takip sayfasına bağlanır.
  uye: boolean;
  kalemler: SiparisEpostaKalemi[];
  tutarlar?: SiparisEpostaTutarlari;
  teslimat?: Teslimat;
  odeme?: {
    yontem: string;
    kapidaSecenegi: string | null;
    // Havalenin son ödeme anı (ISO) ve mağazanın o anki banka hesapları.
    sonZaman?: string;
    hesaplar?: { banka: string; sahip: string; iban: string }[];
  };
  kargo?: { firma: string; takipNumarasi: string | null; takipAdresi: string | null };
  iptalNedeni?: Extract<
    SiparisGecmisiNedeni,
    "havale-suresi-doldu" | "musteri-iptali" | "yonetici-iptali"
  >;
  iade?: SiparisEpostaIadesi;
  not?: string;
  talep?: {
    neden: MusteriIadeNedeni;
    retAciklamasi?: string;
    iadeKargosu?: IadeKargosuOdeyen;
  };
  // Teslim edilen siparişte iade talebinin son anı (ISO); yalnız teslim e-postasında.
  iadeSonu?: string;
  // Faturanın numarası, tarihi (günün öğlesi, ISO: sitenin saat diliminde aynı gün) ve dosyası var mı (kart 0268).
  fatura?: { numara: string; tarih: string; dosya: boolean };
};

const yontemAdlari: Record<string, MetinAnahtari> = {
  havale: "ortak.odemeYontemi.havale",
  "kapida-odeme": "ortak.odemeYontemi.kapidaOdeme",
  kart: "ortak.odemeYontemi.kart",
  elden: "ortak.odemeYontemi.elden",
};
const kapidaSecenekleri: Record<string, MetinAnahtari> = {
  nakit: "ortak.odemeYontemi.nakit",
  kart: "ortak.odemeYontemi.kart",
};
const talepNedenleri: Record<MusteriIadeNedeni, MetinAnahtari> = {
  "beklentiyi-karsilamadi": "vitrin.iadeTalebi.neden.beklentiyi-karsilamadi",
  "kusurlu-hasarli": "vitrin.iadeTalebi.neden.kusurlu-hasarli",
  "yanlis-urun": "vitrin.iadeTalebi.neden.yanlis-urun",
  "beden-uymadi": "vitrin.iadeTalebi.neden.beden-uymadi",
  diger: "vitrin.iadeTalebi.neden.diger",
};

const verisi = (veri: unknown): SiparisEpostaVerisi => {
  const v = veri as SiparisEpostaVerisi | null | undefined;
  if (v === null || v === undefined || typeof v.numara !== "string") {
    throw new Error("Sipariş e-postasının verisi yok.");
  }
  return v;
};

const kalemAltlari = (b: IcerikBaglami, kalem: SiparisEpostaKalemi): string[] => [
  ...(kalem.secim.length === 0
    ? []
    : [
        kalem.secim
          .map(({ secenek, deger }) => b.satir("eposta.siparis.secim", { secenek, deger }))
          .join(b.satir("eposta.siparis.secimAyiraci")),
      ]),
  b.satir("eposta.siparis.adet", { adet: b.bicim.sayi(kalem.adet) }),
];

const vergiAdi = (b: IcerikBaglami, ad: string | undefined) =>
  ad ?? b.satir("eposta.siparis.vergiAdsiz");
// Oran milyonda bir birimindedir (vergi/semalar.ts).
const oranYazisi = (b: IcerikBaglami, oran: number) => b.bicim.yuzde(oran / 10_000);

// Sepet özetiyle aynı sıra (cekirdek/vitrin/sepet/sepet-gorunumu.tsx, SepetOzeti): ara toplam, kargo, hariçse
// vergiler, toplam, dahilse toplama dahil vergiler.
const siparisOzeti = (b: IcerikBaglami, t: SiparisEpostaTutarlari): OzetSatiri[] => {
  const vergiler = (anahtar: MetinAnahtari, tur: OzetSatiri["tur"]): OzetSatiri[] =>
    t.vergiDokumu.map((satir) => ({
      ad: b.satir(anahtar, { vergi: vergiAdi(b, satir.ad), oran: oranYazisi(b, satir.oran) }),
      deger: b.bicim.para(satir.vergi),
      tur,
    }));
  return [
    {
      ad: b.satir("eposta.siparis.araToplam", { sayi: b.bicim.sayi(t.adet) }),
      deger: b.bicim.para(t.araToplam),
      tur: "duz",
    },
    ...(t.kargoTuru === "yok"
      ? []
      : [
          {
            ad: b.satir("eposta.siparis.kargo"),
            deger:
              t.kargoTuru === "ucretli"
                ? b.bicim.para(t.kargoTutari)
                : b.satir("eposta.siparis.kargoUcretsiz"),
            tur: "duz" as const,
          },
        ]),
    ...(t.gosterim === "vergi-haric" ? vergiler("eposta.siparis.vergi", "duz") : []),
    { ad: b.satir("eposta.siparis.toplam"), deger: b.bicim.para(t.toplam), tur: "toplam" },
    ...(t.gosterim === "vergi-dahil" ? vergiler("eposta.siparis.vergiDahil", "vergi") : []),
  ];
};

const kalemTablosu = (
  b: IcerikBaglami,
  kalemler: SiparisEpostaKalemi[],
  ozet: OzetSatiri[],
): EpostaBlogu => ({
  tur: "tablo",
  satirlar: kalemler.map((kalem) => ({
    ad: kalem.ad,
    altlar: kalemAltlari(b, kalem),
    deger: kalem.tutar === undefined ? "" : b.bicim.para(kalem.tutar),
  })),
  ozet,
});

// İadenin özeti: kargo iade edildiyse kargo, iade tutarı ve oran oran içindeki vergi.
const iadeOzeti = (b: IcerikBaglami, iade: SiparisEpostaIadesi): OzetSatiri[] => [
  ...(iade.kargoTutari > 0
    ? [
        {
          ad: b.satir("eposta.siparis.kargo"),
          deger: b.bicim.para(iade.kargoTutari),
          tur: "duz" as const,
        },
      ]
    : []),
  { ad: b.satir("eposta.siparis.iadeTutari"), deger: b.bicim.para(iade.tutar), tur: "toplam" },
  ...iade.vergiDokumu.map((satir) => ({
    ad: b.satir("eposta.siparis.iadeVergisi", {
      vergi: vergiAdi(b, satir.ad),
      oran: oranYazisi(b, satir.oran),
    }),
    deger: b.bicim.para(satir.vergi),
    tur: "vergi" as const,
  })),
];

const teslimatBilgisi = (b: IcerikBaglami, t: Teslimat | undefined): EpostaBlogu[] =>
  t === undefined
    ? []
    : [
        {
          tur: "bilgi",
          baslik: b.satir("eposta.siparis.teslimatAdresi"),
          satirlar: [
            [`${t.ad} ${t.soyad}`.trim(), t.telefon]
              .filter((p) => p !== undefined && p !== "")
              .join(" · "),
            adresYazisi(t.adres, b.bicim.ulkeAdi),
          ],
        },
      ];

// Üye hesaptaki ayrıntıya, üye olmayan takip sayfasına (numara dolu; e-posta adrese yazılmaz, bağlantı siparişi
// açmaz, kart 0240 kullanıcı kararı).
const siparisDugmesi = (b: IcerikBaglami, v: SiparisEpostaVerisi): EpostaBlogu[] =>
  b.kok === undefined
    ? []
    : [
        {
          tur: "dugme",
          dugme: v.uye
            ? {
                metin: b.satir("eposta.siparis.goruntule"),
                adres: `${b.kok}${hesapSiparisiAdresi(v.numara)}`,
              }
            : {
                metin: b.satir("eposta.siparis.takipEt"),
                adres: `${b.kok}${siparisTakibiAdresi(v.numara)}`,
              },
        },
      ];

const merhaba = (
  b: IcerikBaglami,
  v: SiparisEpostaVerisi,
  anahtar: MetinAnahtari,
  ek: Record<string, string> = {},
) => b.satir(anahtar, { ad: v.ad, numara: v.numara, ...ek });

const altBilgi = (b: IcerikBaglami): string[] => [
  ...(b.satici.unvan === undefined
    ? []
    : [[b.satici.unvan, b.satici.adres].filter((p) => p !== undefined && p !== "").join(" · ")]),
  b.satici.telefon === undefined
    ? b.satir("eposta.siparis.soru")
    : b.satir("eposta.siparis.soruTelefonla", { telefon: b.satici.telefon }),
  b.satir("eposta.siparis.neden"),
];

const govde = (
  b: IcerikBaglami,
  konu: MetinAnahtari,
  baslik: MetinAnahtari,
  v: SiparisEpostaVerisi,
  bloklar: EpostaBlogu[],
): EpostaGovdesi => ({
  konu: b.satir(konu, { numara: v.numara }),
  baslik: b.satir(baslik, { numara: v.numara }),
  bloklar,
  altBilgi: altBilgi(b),
});

const tumKalemler = (b: IcerikBaglami, v: SiparisEpostaVerisi): EpostaBlogu[] =>
  v.tutarlar === undefined ? [] : [kalemTablosu(b, v.kalemler, siparisOzeti(b, v.tutarlar))];

const siparisAlindi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  const odeme = v.odeme;
  const toplam = v.tutarlar === undefined ? "" : b.bicim.para(v.tutarlar.toplam);
  const ilk: EpostaBlogu[] = [];
  if (odeme?.yontem === "havale") {
    ilk.push({ tur: "paragraf", metin: merhaba(b, v, "eposta.siparisAlindi.havale") });
    ilk.push({
      tur: "kutu",
      vurgu: true,
      satirlar: [
        ...(odeme.sonZaman === undefined
          ? []
          : [
              {
                metin: b.satir("eposta.siparisAlindi.sonZaman", {
                  zaman: b.bicim.tarihSaat(new Date(odeme.sonZaman)),
                }),
                kalin: true,
              },
            ]),
        {
          metin: b.satir("eposta.siparisAlindi.havaleTalimati", {
            tutar: toplam,
            numara: v.numara,
          }),
        },
        ...(odeme.hesaplar ?? []).flatMap((hesap) => [
          { metin: hesap.banka, kalin: true },
          { metin: hesap.sahip, soluk: true },
          { metin: "", kod: ibanYazisi(hesap.iban) },
        ]),
      ],
      ...(b.kok === undefined
        ? {}
        : {
            dugme: {
              metin: b.satir("eposta.siparisAlindi.bildir"),
              adres: `${b.kok}${vitrinAdresleri.havaleBildirimi}?${new URLSearchParams({ siparis: v.numara })}`,
              birincil: true,
            },
          }),
    });
  } else if (odeme?.yontem === "kapida-odeme") {
    const secenek = kapidaSecenekleri[odeme.kapidaSecenegi ?? ""];
    ilk.push({
      tur: "paragraf",
      metin: merhaba(b, v, "eposta.siparisAlindi.kapida", {
        secenek: secenek === undefined ? "" : b.satir(secenek),
      }),
    });
  } else {
    ilk.push({ tur: "paragraf", metin: merhaba(b, v, "eposta.siparisAlindi.odendi") });
  }
  const yontem = yontemAdlari[odeme?.yontem ?? ""];
  return govde(b, "eposta.siparisAlindi.konu", "eposta.siparisAlindi.baslik", v, [
    ...ilk,
    ...tumKalemler(b, v),
    ...(yontem === undefined
      ? []
      : [
          {
            tur: "bilgi" as const,
            baslik: b.satir("eposta.siparis.odemeYontemi"),
            satirlar: [b.satir(yontem)],
          },
        ]),
    ...teslimatBilgisi(b, v.teslimat),
    ...siparisDugmesi(b, v),
  ]);
};

const havaleOnaylandi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  return govde(b, "eposta.havaleOnaylandi.konu", "eposta.havaleOnaylandi.baslik", v, [
    {
      tur: "paragraf",
      metin: merhaba(b, v, "eposta.havaleOnaylandi.govde", {
        tutar: v.tutarlar === undefined ? "" : b.bicim.para(v.tutarlar.toplam),
      }),
    },
    ...siparisDugmesi(b, v),
  ]);
};

const kargoyaVerildi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  const k = v.kargo;
  return govde(b, "eposta.kargoyaVerildi.konu", "eposta.kargoyaVerildi.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.kargoyaVerildi.govde") },
    ...(k === undefined
      ? []
      : [
          {
            tur: "kutu" as const,
            satirlar: [
              { metin: k.firma, kalin: true },
              ...(k.takipNumarasi === null
                ? []
                : [
                    {
                      metin: b.satir("eposta.kargoyaVerildi.takipNo"),
                      kod: k.takipNumarasi,
                    },
                  ]),
            ],
            ...(k.takipAdresi === null
              ? {}
              : {
                  dugme: { metin: b.satir("eposta.kargoyaVerildi.takipEt"), adres: k.takipAdresi },
                }),
          },
        ]),
    ...tumKalemler(b, v),
    ...teslimatBilgisi(b, v.teslimat),
    ...siparisDugmesi(b, v),
  ]);
};

const teslimEdildi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  return govde(b, "eposta.teslimEdildi.konu", "eposta.teslimEdildi.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.teslimEdildi.govde") },
    ...siparisDugmesi(b, v),
    ...(v.iadeSonu === undefined
      ? []
      : [
          {
            tur: "paragraf" as const,
            soluk: true,
            metin: b.satir("eposta.teslimEdildi.iade", {
              tarih: b.bicim.uzunTarih(new Date(v.iadeSonu)),
            }),
          },
        ]),
  ]);
};

// Paranın nasıl döndüğü: kuruluş (kartla ödeme) karta, elle mağaza gönderir; tutar yoksa söylenmez.
const paraDonusu = (b: IcerikBaglami, iade: SiparisEpostaIadesi | undefined): EpostaBlogu[] =>
  iade === undefined || iade.tutar === 0
    ? []
    : [
        {
          tur: "paragraf",
          metin: b.satir(iade.yontem === "kurulus" ? "eposta.iade.karta" : "eposta.iade.elle", {
            tutar: b.bicim.para(iade.tutar),
          }),
        },
      ];

const siparisIptali: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  const neden: MetinAnahtari =
    v.iptalNedeni === "havale-suresi-doldu"
      ? "eposta.siparisIptali.sureDoldu"
      : v.iptalNedeni === "musteri-iptali"
        ? "eposta.siparisIptali.musteri"
        : "eposta.siparisIptali.magaza";
  return govde(b, "eposta.siparisIptali.konu", "eposta.siparisIptali.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, neden) },
    ...paraDonusu(b, v.iade),
    ...tumKalemler(b, v),
    ...(b.kok === undefined
      ? []
      : [
          {
            tur: "dugme" as const,
            dugme: {
              metin: b.satir("eposta.siparisIptali.alisveris"),
              adres: `${b.kok}${vitrinAdresleri.anasayfa}`,
            },
          },
        ]),
  ]);
};

const iadeIcerigi =
  (kismi: boolean): IcerikUretici =>
  (veri, b) => {
    const v = verisi(veri);
    const iade = v.iade;
    const onek = kismi ? "eposta.kismiIade" : "eposta.tamIade";
    return govde(b, `${onek}.konu` as MetinAnahtari, `${onek}.baslik` as MetinAnahtari, v, [
      { tur: "paragraf", metin: merhaba(b, v, `${onek}.govde` as MetinAnahtari) },
      ...paraDonusu(b, iade),
      ...(iade === undefined ? [] : [kalemTablosu(b, v.kalemler, iadeOzeti(b, iade))]),
      ...siparisDugmesi(b, v),
    ]);
  };

const musteriyeNot: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  return govde(b, "eposta.musteriyeNot.konu", "eposta.musteriyeNot.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.musteriyeNot.govde") },
    { tur: "kutu", satirlar: [{ metin: v.not ?? "" }] },
    ...siparisDugmesi(b, v),
  ]);
};

// Faturanız hazır (kart 0268): numara ve tarih; dosya varsa siparişin sayfasından indirileceği.
const faturaHazir: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  if (v.fatura === undefined) throw new Error("Fatura e-postasının faturası yok.");
  return govde(b, "eposta.faturaHazir.konu", "eposta.faturaHazir.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.faturaHazir.govde") },
    {
      tur: "bilgi",
      baslik: b.satir("eposta.faturaHazir.bilgi"),
      satirlar: [
        b.satir("eposta.faturaHazir.numara", { numara: v.fatura.numara }),
        b.satir("eposta.faturaHazir.tarih", {
          tarih: b.bicim.uzunTarih(new Date(v.fatura.tarih)),
        }),
      ],
    },
    ...(v.fatura.dosya
      ? [{ tur: "paragraf" as const, metin: b.satir("eposta.faturaHazir.indir") }]
      : []),
    ...siparisDugmesi(b, v),
  ]);
};

// Kart 0269: teslimat ya da fatura bilgileri düzeltildi. Teslimat bloğu e-postanın yazıldığı andaki (düzeltilmiş)
// adresi gösterir; fatura bilgisi kişisel ve kurumsal bilgi taşıdığı için e-postaya yazılmaz, siparişin sayfasındadır.
const adresGuncellendi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  return govde(b, "eposta.adresGuncellendi.konu", "eposta.adresGuncellendi.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.adresGuncellendi.govde") },
    ...teslimatBilgisi(b, v.teslimat),
    { tur: "paragraf", metin: b.satir("eposta.adresGuncellendi.uyari"), soluk: true },
    ...siparisDugmesi(b, v),
  ]);
};

const talepKalemleri = (b: IcerikBaglami, v: SiparisEpostaVerisi): EpostaBlogu =>
  kalemTablosu(b, v.kalemler, []);

const talepAlindi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  const neden = v.talep === undefined ? undefined : talepNedenleri[v.talep.neden];
  return govde(b, "eposta.talepAlindi.konu", "eposta.talepAlindi.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.talepAlindi.govde") },
    talepKalemleri(b, v),
    ...(neden === undefined
      ? []
      : [
          {
            tur: "bilgi" as const,
            baslik: b.satir("eposta.talepAlindi.neden"),
            satirlar: [b.satir(neden)],
          },
        ]),
    ...siparisDugmesi(b, v),
  ]);
};

const talepOnaylandi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  const magaza = v.talep?.iadeKargosu !== "musteri";
  return govde(b, "eposta.talepOnaylandi.konu", "eposta.talepOnaylandi.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.talepOnaylandi.govde") },
    talepKalemleri(b, v),
    {
      tur: "kutu",
      vurgu: true,
      satirlar: [
        { metin: b.satir("eposta.talepOnaylandi.nasil"), kalin: true },
        {
          metin: b.satir(
            magaza ? "eposta.talepOnaylandi.kargoMagazada" : "eposta.talepOnaylandi.kargoMusteride",
          ),
        },
        ...(b.satici.unvan === undefined && b.satici.adres === undefined
          ? []
          : [
              {
                metin: [b.satici.unvan, b.satici.adres]
                  .filter((p) => p !== undefined && p !== "")
                  .join(" · "),
                soluk: true,
              },
            ]),
      ],
    },
    { tur: "paragraf", metin: b.satir("eposta.talepOnaylandi.sonra") },
    ...siparisDugmesi(b, v),
  ]);
};

const talepReddedildi: IcerikUretici = (veri, b) => {
  const v = verisi(veri);
  return govde(b, "eposta.talepReddedildi.konu", "eposta.talepReddedildi.baslik", v, [
    { tur: "paragraf", metin: merhaba(b, v, "eposta.talepReddedildi.govde") },
    {
      tur: "kutu",
      satirlar: [
        { metin: b.satir("eposta.talepReddedildi.aciklama"), kalin: true },
        { metin: v.talep?.retAciklamasi ?? "" },
      ],
    },
    { tur: "paragraf", metin: b.satir("eposta.talepReddedildi.soru") },
    ...siparisDugmesi(b, v),
  ]);
};

export const siparisEpostaIcerikleri = {
  "siparis-alindi": siparisAlindi,
  "havale-onaylandi": havaleOnaylandi,
  "kargoya-verildi": kargoyaVerildi,
  "teslim-edildi": teslimEdildi,
  "siparis-iptali": siparisIptali,
  "siparis-iadesi": iadeIcerigi(false),
  "siparis-kismi-iadesi": iadeIcerigi(true),
  "musteriye-not": musteriyeNot,
  "iade-talebi-alindi": talepAlindi,
  "iade-talebi-onaylandi": talepOnaylandi,
  "iade-talebi-reddedildi": talepReddedildi,
  "fatura-hazir": faturaHazir,
  "adres-guncellendi": adresGuncellendi,
} as const satisfies Partial<Record<EpostaSablonu, IcerikUretici>>;
