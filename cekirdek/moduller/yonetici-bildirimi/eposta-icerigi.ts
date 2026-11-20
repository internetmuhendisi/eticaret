// Yönetici bildirimi e-postalarının içeriği (kart 0241, karar 0154; taslak: planlar/tasarim-yonu/siparis-ve-hesap.html).
// Veri olay anında kuyruğa yazılmıştır (veri.ts); burada yalnız sitenin dili ve biçimiyle bloklara çevrilir. E-posta
// kısa tutulur, ayrıntı paneldedir: müşterinin yalnız kısaltılmış adı, adresinden yalnız il ve ilçe.
//
// Bu dosya saf kalır (veritabanı ve vitrin yok): e-posta şablonu (cekirdek/moduller/eposta/sablon.ts) onu içe aktarır.
import { adresYazisi } from "../../bolgeler/adres-yazisi.ts";
import type { EpostaSablonu } from "../../kayitlar/eposta.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { siparisAyrintisiAdresi, siparislerAdresi } from "../../yonetim-paneli/adresler.ts";
import type { EpostaBlogu, EpostaGovdesi, IcerikBaglami, IcerikUretici } from "../eposta/sablon.ts";
import type { KisaAd, YoneticiBildirimVerisi } from "./veri.ts";

const verisi = <T>(veri: unknown, alan: string): T => {
  if (veri === null || typeof veri !== "object" || !(alan in veri)) {
    throw new Error("Yönetici bildiriminin verisi yok.");
  }
  return veri as T;
};

const kisaAd = (b: IcerikBaglami, ad: KisaAd) =>
  ad.harf === "" ? ad.ad : b.satir("eposta.yonetici.kisaAd", { ad: ad.ad, harf: ad.harf });

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
const talepNedenleri: Record<string, MetinAnahtari> = {
  "beklentiyi-karsilamadi": "vitrin.iadeTalebi.neden.beklentiyi-karsilamadi",
  "kusurlu-hasarli": "vitrin.iadeTalebi.neden.kusurlu-hasarli",
  "yanlis-urun": "vitrin.iadeTalebi.neden.yanlis-urun",
  "beden-uymadi": "vitrin.iadeTalebi.neden.beden-uymadi",
  diger: "vitrin.iadeTalebi.neden.diger",
};

const panelDugmesi = (b: IcerikBaglami, metin: MetinAnahtari, yol: string): EpostaBlogu[] =>
  b.kok === undefined
    ? []
    : [{ tur: "dugme", dugme: { metin: b.satir(metin), adres: `${b.kok}${yol}` } }];

const govde = (
  b: IcerikBaglami,
  konu: string,
  baslik: string,
  bloklar: EpostaBlogu[],
): EpostaGovdesi => ({
  konu,
  baslik,
  bloklar,
  altBilgi: [b.satir("eposta.yonetici.altBilgi")],
  ustEtiketi: b.satir("eposta.yonetici.ustEtiketi"),
});

const satir = (ad: string, deger: string) => ({ ad, altlar: [], deger });

const yeniSiparis: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["yeni-siparis"]>(veri, "numara");
  const yontem = yontemAdlari[v.odemeYontemi];
  const secenek = v.kapidaSecenegi === null ? undefined : kapidaSecenekleri[v.kapidaSecenegi];
  const toplam = b.bicim.para(v.toplam);
  return govde(
    b,
    b.satir("eposta.yonetici.yeniSiparis.konu", { numara: v.numara, toplam }),
    b.satir("eposta.yonetici.yeniSiparis.baslik", { numara: v.numara }),
    [
      {
        tur: "tablo",
        satirlar: [
          satir(
            b.satir("eposta.yonetici.musteri"),
            b.satir(v.uye ? "eposta.yonetici.uye" : "eposta.yonetici.uyeDegil", {
              ad: kisaAd(b, v.musteri),
            }),
          ),
          satir(
            b.satir("eposta.yonetici.odeme"),
            [
              yontem === undefined ? v.odemeYontemi : b.satir(yontem),
              secenek === undefined ? "" : b.satir(secenek),
            ]
              .filter((p) => p !== "")
              .join(" · "),
          ),
          satir(
            b.satir("eposta.yonetici.teslimat"),
            adresYazisi({ ...v.bolge, adres: "" }, b.bicim.ulkeAdi),
          ),
          satir(
            b.satir("eposta.yonetici.urunler"),
            b.satir("eposta.yonetici.urunSayisi", {
              adet: b.bicim.sayi(v.adet),
              kalem: b.bicim.sayi(v.kalem),
            }),
          ),
        ],
        ozet: [{ ad: b.satir("eposta.siparis.toplam"), deger: toplam, tur: "toplam" }],
      },
      ...panelDugmesi(b, "eposta.yonetici.siparisiAc", siparisAyrintisiAdresi(v.numara)),
    ],
  );
};

const havaleBildirimi: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["havale-bildirimi"]>(veri, "numara");
  const tutar = b.bicim.para(v.tutar);
  return govde(
    b,
    b.satir("eposta.yonetici.havale.konu", { numara: v.numara, tutar }),
    b.satir("eposta.yonetici.havale.baslik"),
    [
      { tur: "paragraf", metin: b.satir("eposta.yonetici.havale.govde", { numara: v.numara }) },
      {
        tur: "tablo",
        satirlar: [
          satir(b.satir("eposta.yonetici.havale.gonderen"), kisaAd(b, v.gonderen)),
          satir(b.satir("eposta.yonetici.havale.hesap"), v.banka),
          // Müşterinin yazdığı gün (sitenin takviminde YYYY-AA-GG); gün ortası her saat diliminde aynı gündür.
          satir(
            b.satir("eposta.yonetici.havale.tarih"),
            b.bicim.tarih(new Date(`${v.odemeTarihi}T12:00:00Z`)),
          ),
        ],
        ozet: [{ ad: b.satir("eposta.yonetici.havale.tutar"), deger: tutar, tur: "toplam" }],
      },
      ...panelDugmesi(b, "eposta.yonetici.havale.dugme", siparisAyrintisiAdresi(v.numara)),
    ],
  );
};

const iadeTalebi: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["iade-talebi"]>(veri, "numara");
  const neden = talepNedenleri[v.neden];
  return govde(
    b,
    b.satir("eposta.yonetici.iadeTalebi.konu", { numara: v.numara }),
    b.satir("eposta.yonetici.iadeTalebi.baslik"),
    [
      { tur: "paragraf", metin: b.satir("eposta.yonetici.iadeTalebi.govde", { numara: v.numara }) },
      {
        tur: "tablo",
        satirlar: [
          ...v.kalemler.map((kalem) => ({
            ad: kalem.ad,
            altlar: kalem.secim.length === 0 ? [] : [kalem.secim.join(", ")],
            deger: b.satir("eposta.siparis.adet", { adet: b.bicim.sayi(kalem.adet) }),
          })),
          ...(neden === undefined
            ? []
            : [satir(b.satir("eposta.yonetici.iadeTalebi.neden"), b.satir(neden))]),
          ...(v.teslim === null
            ? []
            : [
                satir(
                  b.satir("eposta.yonetici.iadeTalebi.teslim"),
                  b.bicim.uzunTarih(new Date(v.teslim)),
                ),
              ]),
        ],
        ozet: [],
      },
      ...panelDugmesi(b, "eposta.yonetici.iadeTalebi.dugme", siparisAyrintisiAdresi(v.numara)),
    ],
  );
};

const iptal: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["iptal"]>(veri, "numara");
  return govde(
    b,
    b.satir("eposta.yonetici.iptal.konu", { numara: v.numara }),
    b.satir("eposta.yonetici.iptal.baslik"),
    [
      {
        tur: "paragraf",
        metin: b.satir(
          v.neden === "havale-suresi-doldu"
            ? "eposta.yonetici.iptal.sureDoldu"
            : "eposta.yonetici.iptal.musteri",
          { numara: v.numara, toplam: b.bicim.para(v.toplam) },
        ),
      },
      ...panelDugmesi(b, "eposta.yonetici.siparisiAc", siparisAyrintisiAdresi(v.numara)),
    ],
  );
};

const stok: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["stok"]>(veri, "uyarilar");
  return govde(
    b,
    b.satir("eposta.yonetici.stok.konu", { sayi: b.bicim.sayi(v.uyarilar.length) }),
    b.satir("eposta.yonetici.stok.baslik"),
    [
      {
        tur: "tablo",
        satirlar: v.uyarilar.map((uyari) => ({
          ad: uyari.ad,
          altlar: [
            ...(uyari.secim.length === 0 ? [] : [uyari.secim.join(", ")]),
            ...(uyari.stokKodu === null
              ? []
              : [b.satir("eposta.yonetici.stok.stokKodu", { kod: uyari.stokKodu })]),
          ],
          deger:
            uyari.tur === "tukendi"
              ? b.satir("eposta.yonetici.stok.tukendi")
              : b.satir("eposta.yonetici.stok.kaldi", { adet: b.bicim.sayi(uyari.miktar) }),
        })),
        ozet: [],
      },
      { tur: "paragraf", soluk: true, metin: b.satir("eposta.yonetici.stok.not") },
    ],
  );
};

const yorum: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["yorum"]>(veri, "urun");
  return govde(
    b,
    b.satir("eposta.yonetici.yorum.konu", { urun: v.urun }),
    b.satir("eposta.yonetici.yorum.baslik"),
    [
      { tur: "paragraf", metin: b.satir("eposta.yonetici.yorum.govde", { urun: v.urun }) },
      {
        tur: "kutu",
        satirlar: [
          {
            metin: b.satir("eposta.yonetici.yorum.puan", {
              puan: b.bicim.sayi(v.puan),
              ad: kisaAd(b, v.yazan),
            }),
            kalin: true,
          },
          { metin: v.metin },
        ],
      },
    ],
  );
};

const kartlaUyusmazlik: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["kartla-odeme-uyusmazligi"]>(veri, "gun");
  const tarih = b.bicim.uzunTarih(new Date(`${v.gun}T12:00:00Z`));
  return govde(
    b,
    b.satir("eposta.yonetici.uyusmazlik.konu", { tarih }),
    b.satir("eposta.yonetici.uyusmazlik.baslik"),
    [
      {
        tur: "paragraf",
        metin: b.satir("eposta.yonetici.uyusmazlik.govde", { tarih, sayi: b.bicim.sayi(v.sayi) }),
      },
      ...panelDugmesi(b, "eposta.yonetici.siparisleriAc", siparislerAdresi),
    ],
  );
};

const bekleyenIade: IcerikUretici = (veri, b) => {
  const v = verisi<YoneticiBildirimVerisi["bekleyen-iade"]>(veri, "numara");
  return govde(
    b,
    b.satir("eposta.yonetici.bekleyenIade.konu", { numara: v.numara }),
    b.satir("eposta.yonetici.bekleyenIade.baslik"),
    [
      {
        tur: "paragraf",
        metin: b.satir(
          v.neden === "raporda-yok"
            ? "eposta.yonetici.bekleyenIade.rapordaYok"
            : "eposta.yonetici.bekleyenIade.kismiRed",
          { numara: v.numara },
        ),
      },
      ...panelDugmesi(b, "eposta.yonetici.siparisiAc", siparisAyrintisiAdresi(v.numara)),
    ],
  );
};

export const yoneticiEpostaIcerikleri = {
  "yonetici-yeni-siparis": yeniSiparis,
  "yonetici-havale-bildirimi": havaleBildirimi,
  "yonetici-iade-talebi": iadeTalebi,
  "yonetici-iptal": iptal,
  "yonetici-stok": stok,
  "yonetici-yorum": yorum,
  "yonetici-kartla-odeme-uyusmazligi": kartlaUyusmazlik,
  "yonetici-bekleyen-iade": bekleyenIade,
} as const satisfies Partial<Record<EpostaSablonu, IcerikUretici>>;
