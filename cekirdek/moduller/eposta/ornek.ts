// Panelin önizlemesi ve deneme e-postası için örnek sipariş (kart 0279, karar 0197). Gerçek sipariş ve müşteri
// okunmaz (kişisel veri panelde dolaşmasın): ad, ürünler ve kargo metin dosyasının örnekleridir, numara sitenin ilk
// sipariş numarası, ülke sitenin ilk satış ülkesi, ödeme yöntemi birimin hâlidir. Tutarlar yalnız örnektir, hiçbir
// fiyata, vergiye ya da kurala bağlı değildir; vergi dökümü boştur.
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import type { EpostaSablonu } from "../../kayitlar/eposta.ts";
import { sifreSifirlamaAyari } from "../../kayitlar/oturum.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import type { SiparisEpostaVerisi } from "../siparis/eposta-icerigi.ts";
import { type EpostaMetinBirimKodu, epostaMetinBirimleri } from "./metin-birimleri.ts";

const ornekTutarlar = { birinci: 34_990, ikinci: 12_000, kargo: 4_990 } as const;
const birGunMs = 86_400_000;

export const ornekEposta = (
  site: Pick<Site, "ayarlar">,
  kod: EpostaMetinBirimKodu,
  // Sitenin kök adresi ve fiyat gösterimi (mağaza ayarı).
  g: { kok: string | undefined; gosterim: string },
): { sablon: EpostaSablonu; veri?: SiparisEpostaVerisi; degiskenler: Record<string, string> } => {
  const birim = epostaMetinBirimleri[kod];
  const oku = metinOkuyucu(site.ayarlar.dil);
  if (birim.grup === "hesap") {
    return {
      sablon: birim.sablon,
      degiskenler: {
        dakika: String(sifreSifirlamaAyari.gecerlilikSaniye / 60),
        ...(g.kok === undefined ? {} : { baglanti: g.kok }),
      },
    };
  }
  const { ayarlar } = site;
  const kalemler = [
    {
      ad: oku("yonetim.epostalar.ornek.urun"),
      secim: [
        {
          secenek: oku("yonetim.epostalar.ornek.secenek"),
          deger: oku("yonetim.epostalar.ornek.deger"),
        },
      ],
      adet: 1,
      tutar: ornekTutarlar.birinci,
    },
    { ad: oku("yonetim.epostalar.ornek.urun2"), secim: [], adet: 2, tutar: ornekTutarlar.ikinci },
  ];
  const araToplam = ornekTutarlar.birinci + ornekTutarlar.ikinci;
  const simdi = Date.now();
  const yontem =
    kod === "siparis-alindi-havale"
      ? "havale"
      : kod === "siparis-alindi-kapida"
        ? "kapida-odeme"
        : "kart";
  const veri: SiparisEpostaVerisi = {
    numara: `${ayarlar.siparisOneki}-${ayarlar.siparisBaslangici}`,
    ad: oku("yonetim.epostalar.ornek.ad"),
    uye: false,
    kalemler,
    tutarlar: {
      adet: 3,
      kargoTuru: "ucretli",
      gosterim: g.gosterim,
      araToplam,
      kargoTutari: ornekTutarlar.kargo,
      vergiToplami: 0,
      toplam: araToplam + ornekTutarlar.kargo,
      vergiDokumu: [],
    },
    teslimat: {
      ad: oku("yonetim.epostalar.ornek.ad"),
      soyad: oku("yonetim.epostalar.ornek.soyad"),
      telefon: undefined,
      adres: { ulke: ayarlar.satisUlkeleri[0] ?? "", adres: oku("yonetim.epostalar.ornek.adres") },
    },
    odeme: {
      yontem,
      kapidaSecenegi: yontem === "kapida-odeme" ? "nakit" : null,
      ...(yontem === "havale"
        ? {
            sonZaman: new Date(simdi + 3 * birGunMs).toISOString(),
            hesaplar: [
              {
                banka: oku("yonetim.epostalar.ornek.banka"),
                sahip: oku("yonetim.epostalar.ornek.hesapSahibi"),
                iban: oku("yonetim.epostalar.ornek.iban"),
              },
            ],
          }
        : {}),
    },
    kargo: {
      firma: oku("yonetim.epostalar.ornek.firma"),
      takipNumarasi: oku("yonetim.epostalar.ornek.takipNo"),
      takipAdresi: null,
    },
    ...(kod.startsWith("siparis-iptali-")
      ? {
          iptalNedeni:
            kod === "siparis-iptali-sure-doldu"
              ? ("havale-suresi-doldu" as const)
              : kod === "siparis-iptali-musteri"
                ? ("musteri-iptali" as const)
                : ("yonetici-iptali" as const),
        }
      : {}),
    ...(kod === "siparis-iadesi" || kod === "siparis-kismi-iadesi"
      ? {
          iade: {
            tutar: ornekTutarlar.ikinci,
            yontem: "elle",
            kargoTutari: 0,
            vergiDokumu: [],
          },
          kalemler: [kalemler[1] ?? kalemler[0]].filter((k) => k !== undefined),
        }
      : {}),
    ...(kod === "teslim-edildi" ? { iadeSonu: new Date(simdi + 14 * birGunMs).toISOString() } : {}),
    ...(kod === "musteriye-not" ? { not: oku("yonetim.epostalar.ornek.not") } : {}),
    ...(kod.startsWith("iade-talebi-")
      ? {
          talep: {
            neden: "beden-uymadi" as const,
            ...(kod === "iade-talebi-reddedildi"
              ? { retAciklamasi: oku("yonetim.epostalar.ornek.ret") }
              : {}),
            iadeKargosu: "magaza" as const,
          },
        }
      : {}),
    ...(kod === "fatura-hazir"
      ? {
          fatura: {
            numara: oku("yonetim.epostalar.ornek.fatura"),
            tarih: new Date(simdi).toISOString(),
            dosya: true,
          },
        }
      : {}),
  };
  // Talep ve iade e-postaları tutar özeti taşımaz.
  if (
    kod.startsWith("iade-talebi-") ||
    kod === "siparis-iadesi" ||
    kod === "siparis-kismi-iadesi"
  ) {
    delete veri.tutarlar;
  }
  return { sablon: birim.sablon, veri, degiskenler: {} };
};
