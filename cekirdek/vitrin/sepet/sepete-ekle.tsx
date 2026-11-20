"use client";
// Sepete ekleme (kart 0212, karar 0132 ve 0135): ürün sayfasının adet seçicisi ve "Sepete ekle" düğmesi, ürün kartının
// sepet düğmesi. Eklenince ne olacağı mağaza sahibinin ayarıdır (sepeteEkleyince): sepet penceresi açılır, kısa
// bildirim çıkar ya da sepet sayfasına gidilir.
//
// - Ürün sayfasında seçili birim (useSeciliBirim) satılabilirse düğme açıktır; seçim eksikse ya da birim satılamıyorsa
//   kapalıdır, nedeni yazar. Adet ürünün alım sınırları içindedir; stok sınırını sepet hesabı uygular.
// - Kartta basit ürünün düğmesi bir adet ekler. Seçenekli üründe düğme ürün sayfasını açan bağlantıdır ("Seçenekleri
//   gör"): renk ve beden seçilmeden sepete eklenmez (karar 0132).
import { useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { AdetSecici } from "../../../bilesenler/parcalar/adet-secici";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { Ipucu } from "../../../bilesenler/parcalar/ipucu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { sepetSinirlari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";
import { vitrinAdresleri } from "../adresler";
import { useSeciliBirim } from "../urun-sayfasi/secili-birim";
import {
  type EklemeSonucu,
  pencereyiAc,
  type SepetAyarlari,
  sepeteEkle,
  useSepetAyarlari,
} from "./durum";

type Metin = ReturnType<typeof useMetin>;

// Sepet sayfasına tam sayfa geçişle gidilir: sayfa sepeti açılışta sunucudan hesaplatır, yönlendirici gerekmez (kart,
// yönlendiricinin olmadığı yerlerde de çizilir: katalog, testler).
const sepeteGit = () => window.location.assign(vitrinAdresleri.sepet);

// Ekledikten sonra: ayara göre pencere, bildirim ya da sepet sayfası. Sınır aşılırsa uyarı.
const eklendiktenSonra = (
  sonuc: EklemeSonucu,
  ayarlar: SepetAyarlari,
  urunAdi: string,
  metin: Metin,
) => {
  if (sonuc === "sinir") {
    bildirimGoster(
      "uyari",
      doldur(metin("vitrin.sepet.sinir"), { sinir: String(sepetSinirlari.kalemEnCok) }),
    );
    return;
  }
  if (sonuc === "adet-siniri") {
    bildirimGoster(
      "uyari",
      doldur(metin("vitrin.sepet.adetSiniri"), { sayi: String(sepetSinirlari.adetEnCok) }),
    );
    return;
  }
  if (ayarlar.sepeteEkleyince === "yan-pencere") pencereyiAc(urunAdi);
  else if (ayarlar.sepeteEkleyince === "sepet-sayfasi") sepeteGit();
  else {
    bildirimGoster("basari", doldur(metin("vitrin.sepet.eklendi"), { urun: urunAdi }), {
      etiket: metin("vitrin.sepet.sepeteGit"),
      tikla: sepeteGit,
    });
  }
};

// Ürün sayfasının satın alma satırı: adet ve "Sepete ekle". birimler: satılabilir birimlerin gösterilen birim fiyatı.
export function SepeteEkleAlani({
  urunAdi,
  birimler,
  enAz,
  enCok,
  children,
}: {
  urunAdi: string;
  birimler: Readonly<Record<string, number>>;
  enAz: number;
  enCok: number;
  // Düğmenin yanındaki öteki eylemler (favori).
  children?: React.ReactNode;
}) {
  const metin = useMetin();
  const ayarlar = useSepetAyarlari();
  const birim = useSeciliBirim();
  const [adet, setAdet] = useState(enAz);
  const tutar = birim === undefined ? undefined : birimler[birim];
  const alinabilir = birim !== undefined && tutar !== undefined;
  const ust = Math.min(enCok, sepetSinirlari.adetEnCok);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdetSecici
        deger={adet}
        enAz={enAz}
        enCok={ust}
        onDegerDegisti={setAdet}
        etiketler={{
          grup: metin("vitrin.sepet.adet"),
          azalt: doldur(metin("vitrin.sepet.azalt"), { urun: urunAdi }),
          artir: doldur(metin("vitrin.sepet.artir"), { urun: urunAdi }),
        }}
      />
      <Dugme
        className="min-w-0 flex-1"
        disabled={!alinabilir}
        onClick={() => {
          if (birim === undefined || tutar === undefined) return;
          eklendiktenSonra(sepeteEkle(ayarlar, birim, adet, tutar), ayarlar, urunAdi, metin);
        }}
      >
        <Ikon ad="sepet" />
        {metin("vitrin.sepet.sepeteEkle")}
      </Dugme>
      {children}
    </div>
  );
}

// Ürün kartının sepet düğmesi. birim: basit ürünün satılabilir birimi ve gösterilen fiyatı; yoksa (seçenekli ürün)
// ürün sayfasını açan bağlantıdır.
export function KartSepetDugmesi({
  urunAdi,
  adres,
  birim,
  className,
}: {
  urunAdi: string;
  adres: string;
  birim?: { kimlik: string; tutar: number };
  className?: string;
}) {
  const metin = useMetin();
  const ayarlar = useSepetAyarlari();
  if (birim === undefined) {
    const etiket = doldur(metin("vitrin.sepet.secenekleriGor"), { urun: urunAdi });
    return (
      <Ipucu metin={etiket}>
        <Baglanti
          href={adres}
          gorunum="cerceveli"
          aria-label={etiket}
          className={sinif("size-11 px-0", className)}
        >
          <Ikon ad="sonraki" />
        </Baglanti>
      </Ipucu>
    );
  }
  return (
    <IkonDugmesi
      ikon="sepet"
      etiket={doldur(metin("vitrin.urunKarti.sepeteEkle"), { urun: urunAdi })}
      tur="cerceveli"
      className={className}
      onClick={() =>
        eklendiktenSonra(sepeteEkle(ayarlar, birim.kimlik, 1, birim.tutar), ayarlar, urunAdi, metin)
      }
    />
  );
}
