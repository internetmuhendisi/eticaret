"use client";
// Sipariş ayarlarının "İptal ve iade" bölümü (kart 0239, karar 0151; kart 0233'ün taslağı): müşterinin kendi iptali
// (hayır, ödeme beklenirken, kargoya verilene kadar), iade talebi süresi (teslimden sonra gün) ve iade kargosunu kim
// öder. Üçü birlikte "Kaydet" ile kaydedilir, hemen yayınlanır; değişen her ayar değişiklik kaydına girer. Değiştirme
// izni olmayan yönetici okur, düğmeleri görmez. Sunucu doğrular; süre geçersizse alanın altında yazar.
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import {
  type IadeKargosuOdeyen,
  iadeKargosuOdeyenler,
  iadeTalebiSuresiSinirlari,
  type MusteriIptaliSecenegi,
  musteriIptaliSecenekleri,
} from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";

export type IptalVeIadeFormu = {
  musteriIptali: MusteriIptaliSecenegi;
  iadeTalebiSuresi: string;
  iadeKargosu: IadeKargosuOdeyen;
};

const iptalAdlari: Record<MusteriIptaliSecenegi, MetinAnahtari> = {
  kapali: "yonetim.siparisAyarlari.iptal.kapali",
  "odeme-bekleniyor": "yonetim.siparisAyarlari.iptal.odeme-bekleniyor",
  "kargoya-verilene-kadar": "yonetim.siparisAyarlari.iptal.kargoya-verilene-kadar",
};
const kargoAdlari: Record<IadeKargosuOdeyen, MetinAnahtari> = {
  magaza: "yonetim.siparisAyarlari.iadeKargosu.magaza",
  musteri: "yonetim.siparisAyarlari.iadeKargosu.musteri",
};

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.siparisAyarlari.hata.yetki"
    : "yonetim.siparisAyarlari.hata.genel";

export function IptalVeIadeAyarlari({
  baslangic,
  izinli,
}: {
  baslangic: IptalVeIadeFormu;
  izinli: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu(baslangic);
  // Ortak form yapısı (kart 0259): hata, özet, odak, çıkarken soru.
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const sinirlar = {
    enAz: String(iadeTalebiSuresiSinirlari.enAz),
    enCok: String(iadeTalebiSuresiSinirlari.enCok),
  };

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem("iptal-ve-iade-ayarlari", gonderilen, "yonetim.siparisAyarlari.iptalKaydedildi", {
        formda: true,
      }),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    if (
      sonuc.kod === "dogrulama" &&
      sonuc.ayrinti.some(({ alan }) => alan === "iadeTalebiSuresi")
    ) {
      pf.hatalariGoster({
        iadeTalebiSuresi: doldur(metin("yonetim.siparisAyarlari.sure.hata"), sinirlar),
      });
      return false;
    }
    pf.hatalariGoster({}, [metin(genelHataMetni(sonuc))]);
    return false;
  };

  return (
    <section aria-labelledby="iptal-ve-iade" className="max-w-metin">
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <Kart className="gap-5 p-4 tablet:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="iptal-ve-iade" className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("yonetim.siparisAyarlari.iptalVeIade")}
            </h2>
            <p className="text-kucuk text-soluk-yazi">
              {metin("yonetim.siparisAyarlari.iptalVeIadeAciklamasi")}
            </p>
          </div>
          <AlanKabi ad="musteriIptali" etiket={metin("yonetim.siparisAyarlari.iptal.baslik")}>
            <SecenekGrubu
              baslik={metin("yonetim.siparisAyarlari.iptal.baslik")}
              etiket={metin("yonetim.siparisAyarlari.iptal.baslik")}
              ogeler={musteriIptaliSecenekleri.map((deger) => ({
                deger,
                ad: metin(iptalAdlari[deger]),
                ...(izinli ? {} : { secilemez: true }),
              }))}
              deger={form.musteriIptali}
              onDegerDegisti={(deger) => {
                if (izinli)
                  setForm((onceki) => ({
                    ...onceki,
                    musteriIptali: deger as MusteriIptaliSecenegi,
                  }));
              }}
              secilemezEki=""
            />
          </AlanKabi>
          <p className="-mt-3 text-kucuk text-soluk-yazi">
            {metin("yonetim.siparisAyarlari.iptal.aciklama")}
          </p>
          {/* Taslaktaki gibi: süre ve iade kargosu bilgisayarda yan yana. */}
          <div className="grid gap-5 tablet:grid-cols-2">
            <PanelAlani
              ad="iadeTalebiSuresi"
              etiket={metin("yonetim.siparisAyarlari.sure.ad")}
              aciklama={doldur(metin("yonetim.siparisAyarlari.sure.aciklama"), sinirlar)}
              zorunlu
            >
              {(baglanti) => (
                <GirisAlani
                  {...baglanti}
                  name="iadeTalebiSuresi"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.iadeTalebiSuresi}
                  disabled={!izinli}
                  onChange={(olay) => {
                    const deger = olay.target.value;
                    setForm((onceki) => ({ ...onceki, iadeTalebiSuresi: deger }));
                    pf.alaniTemizle("iadeTalebiSuresi");
                  }}
                />
              )}
            </PanelAlani>
            <AlanKabi
              ad="iadeKargosu"
              etiket={metin("yonetim.siparisAyarlari.iadeKargosu.baslik")}
              className="flex flex-col gap-2"
            >
              <SecenekGrubu
                baslik={metin("yonetim.siparisAyarlari.iadeKargosu.baslik")}
                etiket={metin("yonetim.siparisAyarlari.iadeKargosu.baslik")}
                ogeler={iadeKargosuOdeyenler.map((deger) => ({
                  deger,
                  ad: metin(kargoAdlari[deger]),
                  ...(izinli ? {} : { secilemez: true }),
                }))}
                deger={form.iadeKargosu}
                onDegerDegisti={(deger) => {
                  if (izinli)
                    setForm((onceki) => ({ ...onceki, iadeKargosu: deger as IadeKargosuOdeyen }));
                }}
                secilemezEki=""
              />
              <p className="text-kucuk text-soluk-yazi">
                {metin("yonetim.siparisAyarlari.iadeKargosu.aciklama")}
              </p>
            </AlanKabi>
          </div>
          {izinli ? (
            <KaydetCubugu
              sayfada
              durumYazisi
              degisiklikGerekli
              kaydetEtiketi={metin("yonetim.siparisAyarlari.kaydet")}
              vazgec={() => {
                vazgec();
                pf.temizle();
              }}
            />
          ) : null}
        </Kart>
      </PanelFormu>
    </section>
  );
}
