// Müşteriye giden sipariş e-postasının yazımı (kart 0240, karar 0153). Olay anında, siparişin değişikliğiyle aynı
// işlemde çağrılır: değişiklik geri alınırsa e-posta da yazılmaz. Veri siparişin saklanan değerleridir (tutar, vergi
// dökümü, kalemler, teslimat), gönderimde yalnız biçimlenir (eposta-icerigi.ts). Anahtar olayın kalıcı kaydının
// kimliğidir (geçmiş satırı, not): aynı olay için ikinci e-posta yazılmaz.
//
// Kişisel bilgisi silinmiş siparişe e-posta yazılmaz (adresi yoktur). Arka plan süreci de yükler (iptal.ts):
// içe aktarmalar uzantılıdır, vitrin bağımlılığı yoktur.
import { asc, eq, sql } from "drizzle-orm";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import type { EpostaSablonu } from "../../kayitlar/eposta.ts";
import type {
  IadeKargosuOdeyen,
  MusteriIadeNedeni,
  SiparisGecmisiNedeni,
} from "../../kayitlar/siparis.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { epostaGirdisi } from "../eposta/semalar.ts";
import { epostaGonder } from "../eposta/servis.ts";
import type { SiparisEpostaKalemi, SiparisEpostaVerisi } from "./eposta-icerigi.ts";
import { siparisIadeleri, siparisIadeTalepleri, siparisKalemleri, siparisler } from "./model.ts";

// Olayın e-postaya kendi verisi: siparişte olmayan ama olay anında bilinenler.
export type SiparisEpostaEki = {
  // Havaleli siparişin e-postasında mağazanın o anki banka hesapları.
  bankaHesaplari?: readonly { banka: string; sahip: string; iban: string }[];
  // İptal ve iade e-postasının iadesi (siparis_iadeleri), talep e-postalarının talebi.
  iade?: string;
  talep?: string;
  // Onaylanan talepte iade kargosunu kim öder (site ayarı).
  iadeKargosu?: IadeKargosuOdeyen;
  // Teslimde iade talebinin süresi (gün, site ayarı): son an veritabanının saatiyle hesaplanır.
  iadeTalebiSuresi?: number;
  // Müşteriye notun metni.
  not?: string;
  // Faturanın numarası, tarihi (günün öğlesi, ISO) ve dosyası var mı (kart 0268).
  fatura?: { numara: string; tarih: string; dosya: boolean };
};

const iptalNedenleri = ["havale-suresi-doldu", "musteri-iptali", "yonetici-iptali"] as const;

export const siparisEpostasiYaz = async (
  islem: VeritabaniIslemi,
  g: {
    siparis: string;
    sablon: EpostaSablonu;
    olayAnahtari: string;
    neden?: SiparisGecmisiNedeni;
    ek?: SiparisEpostaEki;
  },
): Promise<void> => {
  const ek = g.ek ?? {};
  const [siparis] = await islem
    .select({
      kayit: siparisler,
      iadeSonu:
        ek.iadeTalebiSuresi === undefined
          ? sql<null>`null`
          : sql<
              string | null
            >`to_char((${siparisler.teslim_zamani} + make_interval(days => ${ek.iadeTalebiSuresi})) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
    })
    .from(siparisler)
    .where(eq(siparisler.kimlik, g.siparis));
  if (siparis === undefined) throw new Error("E-postanın siparişi yok.");
  const s = siparis.kayit;
  if (s.kisisel_veri_silinme_zamani !== null) return;
  // E-posta siparişin değişikliğini düşürmez: adres e-posta şemasından geçmiyorsa (şemayı atlayan yol) e-posta yazılmaz,
  // hata kaydedilir, değişiklik yazılır.
  if (!epostaGirdisi.shape.kime.safeParse(s.eposta).success) {
    hatayiKaydet(new Error("Sipariş e-postasının adresi geçersiz."), {
      kaynak: "siparis-epostasi",
      sablon: g.sablon,
      siparis: s.kimlik,
    });
    return;
  }
  const kalemler = await islem
    .select()
    .from(siparisKalemleri)
    .where(eq(siparisKalemleri.siparis_kimligi, s.kimlik))
    .orderBy(asc(siparisKalemleri.sira));
  const kalemVerisi = (sira: number, adet: number, tutar?: number): SiparisEpostaKalemi[] => {
    const kalem = kalemler.find((k) => k.sira === sira);
    return kalem === undefined
      ? []
      : [
          {
            ad: kalem.urun_adi,
            secim: kalem.secim,
            adet,
            ...(tutar === undefined ? {} : { tutar }),
          },
        ];
  };
  const veri: SiparisEpostaVerisi = {
    numara: s.numara,
    ad: s.teslimat.ad,
    uye: s.musteri_kimligi !== null,
    kalemler: kalemler.flatMap((k) => kalemVerisi(k.sira, k.adet, k.tutar)),
    tutarlar: {
      adet: kalemler.reduce((toplam, k) => toplam + k.adet, 0),
      kargoTuru: s.kargo_turu,
      gosterim: s.gosterim,
      araToplam: s.ara_toplam,
      kargoTutari: s.kargo_tutari,
      vergiToplami: s.vergi_toplami,
      toplam: s.toplam,
      vergiDokumu: s.vergi_dokumu,
      ...(s.kupon_kodu === null || s.kupon_turu === null
        ? {}
        : { kupon: { kod: s.kupon_kodu, tur: s.kupon_turu, indirim: s.kupon_indirimi } }),
    },
    teslimat: s.teslimat,
    odeme: {
      yontem: s.odeme_yontemi,
      kapidaSecenegi: s.kapida_secenegi,
      ...(s.odeme_son_zamani === null ? {} : { sonZaman: s.odeme_son_zamani.toISOString() }),
      ...(ek.bankaHesaplari === undefined
        ? {}
        : {
            hesaplar: ek.bankaHesaplari.map(({ banka, sahip, iban }) => ({ banka, sahip, iban })),
          }),
    },
    ...(s.kargo_firmasi === null
      ? {}
      : {
          kargo: {
            firma: s.kargo_firmasi,
            takipNumarasi: s.takip_numarasi,
            takipAdresi: s.takip_adresi,
          },
        }),
    ...(g.neden !== undefined && (iptalNedenleri as readonly string[]).includes(g.neden)
      ? { iptalNedeni: g.neden as (typeof iptalNedenleri)[number] }
      : {}),
    ...(siparis.iadeSonu === null ? {} : { iadeSonu: siparis.iadeSonu }),
    ...(ek.not === undefined ? {} : { not: ek.not }),
    ...(ek.fatura === undefined ? {} : { fatura: ek.fatura }),
  };
  if (ek.iade !== undefined) {
    const [iade] = await islem
      .select()
      .from(siparisIadeleri)
      .where(eq(siparisIadeleri.kimlik, ek.iade));
    if (iade === undefined) throw new Error("E-postanın iadesi yok.");
    veri.iade = {
      tutar: iade.tutar,
      yontem: iade.yontem,
      kargoTutari: iade.kargo_tutari,
      vergiDokumu: iade.vergi_dokumu,
    };
    // İade e-postası yalnız iade edilen kalemleri, iade edilen tutarlarıyla gösterir; iptal bütün siparişi.
    if (iade.tur === "iade") {
      veri.kalemler = iade.kalemler.flatMap((k) => kalemVerisi(k.sira, k.adet, k.tutar));
      delete veri.tutarlar;
    }
  }
  if (ek.talep !== undefined) {
    const [talep] = await islem
      .select()
      .from(siparisIadeTalepleri)
      .where(eq(siparisIadeTalepleri.kimlik, ek.talep));
    if (talep === undefined) throw new Error("E-postanın talebi yok.");
    veri.kalemler = talep.kalemler.flatMap((k) => kalemVerisi(k.sira, k.adet));
    delete veri.tutarlar;
    veri.talep = {
      neden: talep.neden as MusteriIadeNedeni,
      ...(talep.ret_aciklamasi === null ? {} : { retAciklamasi: talep.ret_aciklamasi }),
      ...(ek.iadeKargosu === undefined ? {} : { iadeKargosu: ek.iadeKargosu }),
    };
  }
  await epostaGonder(islem, {
    kime: s.eposta,
    sablon: g.sablon,
    veri: veri as unknown as Record<string, unknown>,
    olayAnahtari: g.olayAnahtari,
  });
};
