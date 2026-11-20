"use client";
// Sipariş ayarlarının "İptal ve iade" bölümü (kart 0239, karar 0151; kart 0233'ün taslağı): müşterinin kendi iptali
// (hayır, ödeme beklenirken, kargoya verilene kadar), iade talebi süresi (teslimden sonra gün) ve iade kargosunu kim
// öder. Üçü birlikte "Kaydet" ile kaydedilir, hemen yayınlanır; değişen her ayar değişiklik kaydına girer. Değiştirme
// izni olmayan yönetici okur, düğmeleri görmez. Sunucu doğrular; süre geçersizse alanın altında yazar.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { YanPencereAltCubugu } from "../../../bilesenler/parcalar/yan-pencere";
import {
  type IadeKargosuOdeyen,
  iadeKargosuOdeyenler,
  iadeTalebiSuresiSinirlari,
  type MusteriIptaliSecenegi,
  musteriIptaliSecenekleri,
} from "../../kayitlar/siparis";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { doldur } from "../../moduller/eposta/sablon";
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
  const metin = useMetin();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu(baslangic);
  const [sureHatasi, setSureHatasi] = useState(false);
  const [genelHata, setGenelHata] = useState<MetinAnahtari | null>(null);
  const gonderiliyor = useRef(false);
  const uyariRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (genelHata !== null) uyariRef.current?.focus();
  }, [genelHata]);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    gonderiliyor.current = true;
    const gonderilen = form;
    const sonuc = await islem(
      "iptal-ve-iade-ayarlari",
      gonderilen,
      "yonetim.siparisAyarlari.iptalKaydedildi",
      { formda: true },
    );
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      setSureHatasi(false);
      setGenelHata(null);
      return;
    }
    if (
      sonuc.kod === "dogrulama" &&
      sonuc.ayrinti.some(({ alan }) => alan === "iadeTalebiSuresi")
    ) {
      setSureHatasi(true);
      setGenelHata(null);
      document.querySelector<HTMLInputElement>('[name="iadeTalebiSuresi"]')?.focus();
      return;
    }
    setGenelHata(genelHataMetni(sonuc));
  };

  return (
    <section aria-labelledby="iptal-ve-iade" className="max-w-metin">
      <Form
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
        onSubmit={gonder}
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
          {genelHata === null ? null : (
            <div ref={uyariRef} tabIndex={-1}>
              <Uyari tur="tehlike">{metin(genelHata)}</Uyari>
            </div>
          )}
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
          <p className="-mt-3 text-kucuk text-soluk-yazi">
            {metin("yonetim.siparisAyarlari.iptal.aciklama")}
          </p>
          <FormAlani
            etiket={metin("yonetim.siparisAyarlari.sure.ad")}
            aciklama={doldur(metin("yonetim.siparisAyarlari.sure.aciklama"), {
              enAz: String(iadeTalebiSuresiSinirlari.enAz),
              enCok: String(iadeTalebiSuresiSinirlari.enCok),
            })}
            {...(sureHatasi
              ? {
                  hata: doldur(metin("yonetim.siparisAyarlari.sure.hata"), {
                    enAz: String(iadeTalebiSuresiSinirlari.enAz),
                    enCok: String(iadeTalebiSuresiSinirlari.enCok),
                  }),
                }
              : {})}
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
                  setSureHatasi(false);
                }}
                className="tablet:max-w-form"
              />
            )}
          </FormAlani>
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
          <p className="-mt-3 text-kucuk text-soluk-yazi">
            {metin("yonetim.siparisAyarlari.iadeKargosu.aciklama")}
          </p>
          {izinli ? (
            <YanPencereAltCubugu className="bottom-0 mx-0 px-0">
              <Dugme
                tur="sade"
                disabled={!degisti}
                onClick={() => {
                  vazgec();
                  setSureHatasi(false);
                  setGenelHata(null);
                }}
              >
                {metin("ortak.islem.vazgec")}
              </Dugme>
              <GonderDugmesi>{metin("yonetim.siparisAyarlari.kaydet")}</GonderDugmesi>
            </YanPencereAltCubugu>
          ) : null}
        </Kart>
      </Form>
    </section>
  );
}
