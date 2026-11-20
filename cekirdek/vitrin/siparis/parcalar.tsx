// Siparişin müşteriye gösterilen ortak parçaları (kart 0214, 0238): sipariş alındı sayfası, Siparişlerim, sipariş
// ayrıntısı ve sipariş takibi aynı yazılışları buradan alır. Tutarlar siparişin saklanan değerleridir, yeniden
// hesaplanmaz.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { adresYazisi } from "../../bolgeler/adres-yazisi";
import { ibanYazisi } from "../../bolgeler/iban-yazisi";
import type { KapidaOdemeSecenegi } from "../../kayitlar/odeme";
import { type SiparisDurumu, siparisDurumTanimlari } from "../../kayitlar/siparis";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin, type siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import type { Fatura, Teslimat } from "../../moduller/odeme/semalar";
import type { VergiDokumu } from "../../moduller/siparis/model";
import { vitrinAdresleri } from "../adresler";
import type { SepetGorunumu } from "../sepet/veri";
import { IbanKopyala } from "./iban-kopyala";

type Bicim = ReturnType<typeof siteninBicimleyicisi>;

// Kayıttaki her durumun metni (tür kontrolü eksik olanı yakalar); rozetin türü kayıttan.
const durumlar: Record<SiparisDurumu, MetinAnahtari> = {
  "odeme-bekleniyor": "ortak.siparisDurumu.odeme-bekleniyor",
  hazirlaniyor: "ortak.siparisDurumu.hazirlaniyor",
  kargoda: "ortak.siparisDurumu.kargoda",
  "teslim-edildi": "ortak.siparisDurumu.teslim-edildi",
  "kismi-iade": "ortak.siparisDurumu.kismi-iade",
  "iade-edildi": "ortak.siparisDurumu.iade-edildi",
  iptal: "ortak.siparisDurumu.iptal",
};
export const durumYazisi = (durum: SiparisDurumu): string => metin(durumlar[durum]);

export function SiparisDurumRozeti({ durum }: { durum: SiparisDurumu }) {
  return <Rozet tur={siparisDurumTanimlari[durum].rozet}>{durumYazisi(durum)}</Rozet>;
}

const secenekAdlari: Record<KapidaOdemeSecenegi, MetinAnahtari> = {
  nakit: "vitrin.odeme.yontem.nakit",
  kart: "vitrin.odeme.yontem.kart",
};

// Ödeme yöntemi: "Havale / EFT", "Kartla ödeme", "Kapıda ödeme · nakit", "Elden".
export const odemeYontemiYazisi = (yontem: string, kapidaSecenegi: string | null): string =>
  yontem === "havale"
    ? metin("ortak.odemeYontemi.havale")
    : yontem === "kart"
      ? metin("ortak.odemeYontemi.kartla")
      : yontem === "elden"
        ? metin("ortak.odemeYontemi.elden")
        : doldur(metin("vitrin.odeme.yontem.kapida"), {
            // Kapıda ödemede seçenek veritabanında zorunludur (siparisler_odeme_yontemi denetimi).
            secenek: metin(secenekAdlari[kapidaSecenegi as KapidaOdemeSecenegi]),
          });

// Posta adresinin tek satırı: açık adres, posta kodu, ilçe / il, ülke (adresYazisi). Takipte açık adres boştur.
export const adresSatiri = (bicim: Bicim, adres: Teslimat["adres"]): string =>
  adresYazisi(adres, bicim.ulkeAdi);

// Teslimatın kişi satırı: ad soyad · telefon (boş olan yazılmaz).
export const kisiSatiri = (teslimat: Teslimat): string =>
  [`${teslimat.ad} ${teslimat.soyad}`.trim(), teslimat.telefon]
    .filter((parca) => parca !== undefined && parca !== "")
    .join(" · ");

export const faturaSatiri = (bicim: Bicim, fatura: Fatura): string => {
  const tur =
    fatura.tur === "kurumsal"
      ? doldur(metin("vitrin.siparisAlindi.kurumsal"), {
          firma: fatura.firma,
          vergiDairesi: fatura.vergiDairesi,
          vergiNumarasi: fatura.vergiNumarasi,
        })
      : metin("vitrin.siparisAlindi.bireysel");
  return fatura.adres === undefined
    ? `${tur} · ${metin("vitrin.siparisAlindi.teslimatAdresiyle")}`
    : `${tur} · ${adresSatiri(bicim, fatura.adres)}`;
};

// Sepet özetinin (SepetOzeti) siparişin saklanan tutarlarından görünüşü.
export const siparisTutarlari = (
  bicim: Bicim,
  siparis: {
    adet: number;
    kargoTuru: "yok" | "ucretsiz" | "ucretli";
    gosterim: "vergi-dahil" | "vergi-haric" | "yok";
    vergiDokumu: VergiDokumu;
    araToplam: number;
    kargoTutari: number;
    vergiToplami: number;
    toplam: number;
  },
): Pick<SepetGorunumu, "adet" | "kargo" | "gosterim" | "vergiDokumu" | "yazili"> => ({
  adet: siparis.adet,
  kargo: siparis.kargoTuru,
  gosterim: siparis.gosterim,
  vergiDokumu: siparis.vergiDokumu.map((satir) => ({
    ...(satir.ad === undefined ? {} : { ad: satir.ad }),
    // Oran milyonda bir birimindedir (vergi/semalar.ts).
    oran: bicim.yuzde(satir.oran / 10_000),
    yazili: bicim.para(satir.vergi),
  })),
  yazili: {
    araToplam: bicim.para(siparis.araToplam),
    ...(siparis.kargoTuru === "ucretli" ? { kargo: bicim.para(siparis.kargoTutari) } : {}),
    vergi: bicim.para(siparis.vergiToplami),
    toplam: bicim.para(siparis.toplam),
  },
});

// Ödeme bekleyen havalenin kutusu: son ödeme anı, tutar, açıklamaya yazılacak numara, mağazanın banka hesapları
// (IBAN'ı kopyala) ve "Ödemeyi yaptım, bildir".
export function HavaleOdemeKarti({
  bicim,
  numara,
  toplam,
  sonZaman,
  hesaplar,
}: {
  bicim: Bicim;
  numara: string;
  toplam: number;
  sonZaman: Date | null;
  hesaplar: readonly { kimlik: string; banka: string; sahip: string; iban: string }[];
}) {
  return (
    <Kart
      aria-labelledby="havale-basligi"
      className="flex flex-col gap-4 border-2 border-birincil p-4 tablet:p-6"
    >
      <h2 id="havale-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {doldur(metin("vitrin.siparisAlindi.havaleBasligi"), {
          zaman: sonZaman === null ? "" : bicim.tarihSaat(sonZaman),
        })}
      </h2>
      <p>
        {doldur(metin("vitrin.siparisAlindi.havaleAciklamasi"), {
          toplam: bicim.para(toplam),
          numara,
        })}
      </p>
      <ul className="flex flex-col gap-2">
        {hesaplar.map((hesap) => (
          <li key={hesap.kimlik} className="flex flex-col gap-1 rounded-orta bg-yuzey px-4 py-3">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-kalin">{hesap.banka}</span>
              <IbanKopyala iban={hesap.iban} banka={hesap.banka} />
            </span>
            <span className="text-kucuk text-soluk-yazi">
              {doldur(metin("vitrin.siparisAlindi.hesapSahibi"), { sahip: hesap.sahip })}
            </span>
            <span className="font-kalin break-all">{ibanYazisi(hesap.iban)}</span>
          </li>
        ))}
      </ul>
      <Baglanti
        href={`${vitrinAdresleri.havaleBildirimi}?siparis=${encodeURIComponent(numara)}`}
        gorunum="ikincil"
        className="self-start"
      >
        {metin("vitrin.siparisAlindi.bildir")}
      </Baglanti>
    </Kart>
  );
}
