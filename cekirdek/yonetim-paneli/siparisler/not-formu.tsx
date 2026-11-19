"use client";
// Siparişe not ekleme formu (kart 0234): iç not yalnız panelde, müşteriye not müşterinin sipariş ayrıntısında görünür.
// Not değiştirilemez; eklenince sayfa yenilenir ve geçmişin en üstünde görünür. Boş not sunucuya gitmeden söylenir.
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { type SiparisNotTuru, siparisNotTurleri, siparisSinirlari } from "../../kayitlar/siparis";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";

const turAdlari: Record<SiparisNotTuru, MetinAnahtari> = {
  ic: "yonetim.siparis.notlar.ic",
  musteri: "yonetim.siparis.notlar.musteri",
};

const hataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki" ? "yonetim.siparis.notlar.yetki" : "yonetim.siparis.notlar.genel";

export function NotFormu({ numara }: { numara: string }) {
  const metin = useMetin();
  const islem = usePanelIslemi(hataMetni);
  const [tur, setTur] = useState<SiparisNotTuru>("ic");
  const [yazi, setYazi] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const gonderiliyor = useRef(false);
  const ekle = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    if (yazi.trim() === "") {
      setHata(metin("yonetim.siparis.notlar.gerekli"));
      document.querySelector<HTMLTextAreaElement>('[name="siparis-notu"]')?.focus();
      return;
    }
    gonderiliyor.current = true;
    const sonuc = await islem(
      "siparis-notu",
      { numara, tur, metin: yazi },
      "yonetim.siparis.notlar.eklendi",
      {
        formda: true,
      },
    );
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      setYazi("");
      setHata(null);
      return;
    }
    setHata(metin(sonuc.kod === "dogrulama" ? "yonetim.siparis.notlar.uzun" : hataMetni(sonuc)));
  };
  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={ekle}
      className="flex flex-col gap-3"
    >
      <FormAlani
        etiket={metin("yonetim.siparis.notlar.etiket")}
        {...(hata === null ? {} : { hata })}
      >
        {(alan) => (
          <UzunMetinAlani
            {...alan}
            name="siparis-notu"
            maxLength={siparisSinirlari.notEnCok}
            value={yazi}
            onChange={(olay) => setYazi(olay.target.value)}
          />
        )}
      </FormAlani>
      <SecenekGrubu
        baslik={metin("yonetim.siparis.notlar.tur")}
        etiket={metin("yonetim.siparis.notlar.tur")}
        ogeler={siparisNotTurleri.map((deger) => ({ deger, ad: metin(turAdlari[deger]) }))}
        deger={tur}
        onDegerDegisti={(deger) => setTur(deger as SiparisNotTuru)}
        secilemezEki=""
      />
      <GonderDugmesi tur="sade" className="w-fit">
        {metin("yonetim.siparis.notlar.kaydet")}
      </GonderDugmesi>
    </Form>
  );
}
