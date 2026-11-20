"use client";
// Sipariş ayarlarının "Yönetici bildirimleri" bölümü (kart 0241, karar 0154; kart 0233'ün taslağı): bildirimlerin
// gideceği adresler (virgülle, en çok 5; boşsa mağaza sahibi rolündeki yöneticiler) ve her bildirimin anahtarı.
// Birlikte "Kaydet" ile kaydedilir; değişiklik kaydına girer (adreslerin değeri yazılmaz). Değiştirme izni olmayan
// yönetici okur, düğmeleri görmez. Adresler sunucuda doğrulanır; hata alanın altında yazar.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { YanPencereAltCubugu } from "../../../bilesenler/parcalar/yan-pencere";
import {
  type YoneticiBildirimi,
  yoneticiBildirimSinirlari,
} from "../../kayitlar/yonetici-bildirimi";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";

export type YoneticiBildirimleriFormu = { alicilar: string; kapalilar: YoneticiBildirimi[] };

const bildirimAdlari: Record<YoneticiBildirimi, MetinAnahtari> = {
  "yeni-siparis": "yonetim.siparisAyarlari.bildirim.yeni-siparis",
  "havale-bildirimi": "yonetim.siparisAyarlari.bildirim.havale-bildirimi",
  "iade-talebi": "yonetim.siparisAyarlari.bildirim.iade-talebi",
  iptal: "yonetim.siparisAyarlari.bildirim.iptal",
  stok: "yonetim.siparisAyarlari.bildirim.stok",
  yorum: "yonetim.siparisAyarlari.bildirim.yorum",
  "kartla-odeme-uyusmazligi": "yonetim.siparisAyarlari.bildirim.kartla-odeme-uyusmazligi",
  "bekleyen-iade": "yonetim.siparisAyarlari.bildirim.bekleyen-iade",
};
const aliciHatalari: Record<string, MetinAnahtari> = {
  "alici-siniri": "yonetim.siparisAyarlari.alicilar.hata.sinir",
  "eposta-gecersiz": "yonetim.siparisAyarlari.alicilar.hata.eposta",
  "alici-tekrari": "yonetim.siparisAyarlari.alicilar.hata.tekrar",
};

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.siparisAyarlari.hata.yetki"
    : "yonetim.siparisAyarlari.hata.genel";

export function YoneticiBildirimleriAyarlari({
  baslangic,
  gorunenler,
  izinli,
}: {
  baslangic: YoneticiBildirimleriFormu;
  gorunenler: YoneticiBildirimi[];
  izinli: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu(baslangic);
  const [aliciHatasi, setAliciHatasi] = useState<MetinAnahtari | null>(null);
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
      "yonetici-bildirim-ayarlari",
      gonderilen,
      "yonetim.siparisAyarlari.bildirimlerKaydedildi",
      { formda: true },
    );
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      setAliciHatasi(null);
      setGenelHata(null);
      return;
    }
    const alan =
      sonuc.kod === "dogrulama"
        ? sonuc.ayrinti.find(({ alan: ad }) => ad === "alicilar")
        : undefined;
    if (alan !== undefined) {
      setAliciHatasi(aliciHatalari[alan.kod] ?? "yonetim.siparisAyarlari.alicilar.hata.eposta");
      setGenelHata(null);
      document.querySelector<HTMLInputElement>('[name="alicilar"]')?.focus();
      return;
    }
    setGenelHata(genelHataMetni(sonuc));
  };

  const degistir = (bildirim: YoneticiBildirimi, acik: boolean) =>
    setForm((onceki) => ({
      ...onceki,
      kapalilar: acik
        ? onceki.kapalilar.filter((kapali) => kapali !== bildirim)
        : [...onceki.kapalilar, bildirim],
    }));

  return (
    <section aria-labelledby="yonetici-bildirimleri" className="max-w-metin">
      <Form
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
        onSubmit={gonder}
      >
        <Kart className="gap-5 p-4 tablet:p-6">
          <div className="flex flex-col gap-1">
            <h2
              id="yonetici-bildirimleri"
              className="font-baslik text-baslik-4 font-baslik-kalinligi"
            >
              {metin("yonetim.siparisAyarlari.bildirimler")}
            </h2>
            <p className="text-kucuk text-soluk-yazi">
              {metin("yonetim.siparisAyarlari.bildirimlerAciklamasi")}
            </p>
          </div>
          {genelHata === null ? null : (
            <div ref={uyariRef} tabIndex={-1}>
              <Uyari tur="tehlike">{metin(genelHata)}</Uyari>
            </div>
          )}
          <FormAlani
            etiket={metin("yonetim.siparisAyarlari.alicilar.ad")}
            aciklama={doldur(metin("yonetim.siparisAyarlari.alicilar.aciklama"), {
              sayi: String(yoneticiBildirimSinirlari.aliciEnCok),
            })}
            {...(aliciHatasi === null
              ? {}
              : {
                  hata: doldur(metin(aliciHatasi), {
                    sayi: String(yoneticiBildirimSinirlari.aliciEnCok),
                  }),
                })}
          >
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                name="alicilar"
                inputMode="email"
                autoComplete="off"
                value={form.alicilar}
                disabled={!izinli}
                onChange={(olay) => {
                  const deger = olay.target.value;
                  setForm((onceki) => ({ ...onceki, alicilar: deger }));
                  setAliciHatasi(null);
                }}
              />
            )}
          </FormAlani>
          <ul className="flex flex-col divide-y divide-kenar">
            {gorunenler.map((bildirim) => (
              <li
                key={bildirim}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span>{metin(bildirimAdlari[bildirim])}</span>
                <Anahtar
                  etiket={metin(bildirimAdlari[bildirim])}
                  acikYazisi={metin("yonetim.siparisAyarlari.acik")}
                  kapaliYazisi={metin("yonetim.siparisAyarlari.kapali")}
                  checked={!form.kapalilar.includes(bildirim)}
                  disabled={!izinli}
                  onCheckedChange={(acik) => degistir(bildirim, acik)}
                />
              </li>
            ))}
          </ul>
          {izinli ? (
            <YanPencereAltCubugu className="bottom-0 mx-0 px-0">
              <Dugme
                tur="sade"
                disabled={!degisti}
                onClick={() => {
                  vazgec();
                  setAliciHatasi(null);
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
