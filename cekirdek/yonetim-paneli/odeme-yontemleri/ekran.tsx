"use client";
// Ödeme yöntemleri ekranı (kart 0214, karar 0141; kart 0211'in taslağı): müşterinin ödeme adımında gördüğü yöntemler
// ve sırası. Satırlar sürüklenerek, klavyeyle ya da yukarı ve aşağı al düğmeleriyle sıralanır; anahtar yöntemi açar
// ya da kapatır; kapıda ödemenin seçenekleri (nakit, kart) satırın içindedir. Altta havalenin kartı: ödenmeyen
// siparişin iptal süresi ve banka hesaplarına bağlantı. Hepsi birlikte "Kaydet" ile kaydedilir, hemen yayınlanır.
// Hiç açık yöntem kalmazsa kaydedilmez. Değiştirme izni olmayan yönetici (görevli) yalnız görür: anahtarlar ve
// seçenekler kapalıdır, liste sıralanmaz, düğmeler yoktur.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { YanPencereAltCubugu } from "../../../bilesenler/parcalar/yan-pencere";
import {
  type KapidaOdemeSecenegi,
  kapidaOdemeSecenekleri,
  type OdemeYontemi,
} from "../../kayitlar/odeme";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { doldur } from "../../moduller/eposta/sablon";
import type { YontemAyari } from "../../moduller/odeme/yontemler";
import { panelAdresi } from "../adresler";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import type { OdemeYontemleriEkraniVerisi, OdemeYontemleriFormu } from "./veri";

export const yontemAdlari: Record<OdemeYontemi, MetinAnahtari> = {
  havale: "ortak.odemeYontemi.havale",
  "kapida-odeme": "ortak.odemeYontemi.kapidaOdeme",
  kart: "ortak.odemeYontemi.kartla",
};
const yontemAciklamalari: Record<OdemeYontemi, MetinAnahtari> = {
  havale: "yonetim.odemeYontemleri.havaleAciklamasi",
  "kapida-odeme": "yonetim.odemeYontemleri.kapidaAciklamasi",
  kart: "yonetim.odemeYontemleri.kartAciklamasi",
};
export const secenekAdlari: Record<KapidaOdemeSecenegi, MetinAnahtari> = {
  nakit: "ortak.odemeYontemi.nakit",
  kart: "ortak.odemeYontemi.kart",
};

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.odemeYontemleri.hata.yetki"
    : "yonetim.odemeYontemleri.hata.genel";

// Alanın koduna göre metin; alanı formda olmayan kod formun üstünde yazılır.
const alanHatalari: Record<
  string,
  { alan: "yontemler" | "secenekler" | "sure"; metin: MetinAnahtari }
> = {
  "en-az-bir-yontem": { alan: "yontemler", metin: "yonetim.odemeYontemleri.hata.enAzBir" },
  "secenek-gerekli": { alan: "secenekler", metin: "yonetim.odemeYontemleri.hata.secenekGerekli" },
  "gun-gecersiz": { alan: "sure", metin: "yonetim.odemeYontemleri.hata.gunGecersiz" },
};

export function OdemeYontemleriEkrani({
  veri,
  izinli,
}: {
  veri: OdemeYontemleriEkraniVerisi;
  izinli: boolean;
}) {
  const metin = useMetin();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<OdemeYontemleriFormu>(
    veri.form,
  );
  const [hatalar, setHatalar] = useState<
    Partial<Record<"yontemler" | "secenekler" | "sure", MetinAnahtari>>
  >({});
  const [genelHata, setGenelHata] = useState<MetinAnahtari | null>(null);
  const gonderiliyor = useRef(false);
  const uyariRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!degisti) return;
    const uyar = (olay: BeforeUnloadEvent) => olay.preventDefault();
    window.addEventListener("beforeunload", uyar);
    return () => window.removeEventListener("beforeunload", uyar);
  }, [degisti]);

  useEffect(() => {
    if (genelHata !== null || hatalar.yontemler !== undefined) uyariRef.current?.focus();
  }, [genelHata, hatalar.yontemler]);

  const yontemiDegistir = (kod: OdemeYontemi, acik: boolean) =>
    setForm((onceki) => ({
      ...onceki,
      yontemler: onceki.yontemler.map((yontem) =>
        yontem.kod === kod ? { ...yontem, acik } : yontem,
      ),
    }));
  const secenegiDegistir = (secenek: KapidaOdemeSecenegi, secili: boolean) =>
    setForm((onceki) => ({
      ...onceki,
      // Seçenekler kayıttaki sırayla tutulur.
      kapidaOdemeSecenekleri: kapidaOdemeSecenekleri.filter((ad) =>
        ad === secenek ? secili : onceki.kapidaOdemeSecenekleri.includes(ad),
      ),
    }));

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    gonderiliyor.current = true;
    const gonderilen = form;
    const sonuc = await islem(
      "odeme-yontemleri",
      gonderilen,
      "yonetim.odemeYontemleri.kaydedildi",
      {
        formda: true,
      },
    );
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      setHatalar({});
      setGenelHata(null);
      return;
    }
    const yeni: typeof hatalar = {};
    for (const { kod } of sonuc.ayrinti) {
      const hata = alanHatalari[kod];
      if (hata !== undefined) yeni[hata.alan] = hata.metin;
    }
    setHatalar(yeni);
    setGenelHata(Object.keys(yeni).length > 0 ? null : genelHataMetni(sonuc));
    if (yeni.sure !== undefined && yeni.yontemler === undefined) {
      document.querySelector<HTMLInputElement>('[name="havaleIptalSuresi"]')?.focus();
    }
  };

  const adi = (yontem: YontemAyari) => metin(yontemAdlari[yontem.kod]);
  const satir = (yontem: YontemAyari) => (
    <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 font-kalin">
          {adi(yontem)}
          {yontem.acik ? null : (
            <Rozet tur="ikincil">{metin("yonetim.odemeYontemleri.vitrindeYok")}</Rozet>
          )}
        </span>
        <span className="text-kucuk text-soluk-yazi">
          {yontem.kod === "havale"
            ? doldur(metin(yontemAciklamalari.havale), { gun: form.havaleIptalSuresi })
            : metin(yontemAciklamalari[yontem.kod])}
        </span>
        {yontem.kod === "kapida-odeme" ? (
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="sr-only">{metin("yonetim.odemeYontemleri.secenekler")}</legend>
            <div className="flex flex-wrap gap-x-4">
              {kapidaOdemeSecenekleri.map((secenek) => (
                <OnayKutusu
                  key={secenek}
                  etiket={metin(secenekAdlari[secenek])}
                  checked={form.kapidaOdemeSecenekleri.includes(secenek)}
                  disabled={!izinli}
                  onCheckedChange={(deger) => secenegiDegistir(secenek, deger === true)}
                />
              ))}
            </div>
            {hatalar.secenekler === undefined ? null : (
              <span className="font-kalin text-tehlike-yazi">{metin(hatalar.secenekler)}</span>
            )}
          </fieldset>
        ) : null}
      </div>
      <Anahtar
        etiket={doldur(metin("yonetim.odemeYontemleri.vitrindeAcik"), { ad: adi(yontem) })}
        acikYazisi={metin("yonetim.odemeYontemleri.acik")}
        kapaliYazisi={metin("yonetim.odemeYontemleri.kapali")}
        checked={yontem.acik}
        disabled={!izinli}
        onCheckedChange={(acik) => yontemiDegistir(yontem.kod, acik)}
      />
    </div>
  );

  const havaleAcik = form.yontemler.some((yontem) => yontem.kod === "havale" && yontem.acik);
  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex max-w-metin flex-col gap-5"
    >
      <div ref={uyariRef} tabIndex={-1} className="flex flex-col gap-3 empty:hidden">
        {genelHata === null ? null : <Uyari tur="tehlike">{metin(genelHata)}</Uyari>}
        {hatalar.yontemler === undefined ? null : (
          <Uyari tur="tehlike">{metin(hatalar.yontemler)}</Uyari>
        )}
        {havaleAcik && veri.bankaHesabiSayisi === 0 ? (
          <Uyari tur="uyari">{metin("yonetim.odemeYontemleri.hesapYok")}</Uyari>
        ) : null}
      </div>
      {izinli ? (
        <SiralanabilirListe
          ogeler={form.yontemler}
          anahtar={(yontem) => yontem.kod}
          ad={adi}
          etiket={metin("yonetim.sayfa.odemeYontemleri.ad")}
          metinler={siralamaMetinleri(metin)}
          siralaninca={(yeni) => setForm((onceki) => ({ ...onceki, yontemler: yeni }))}
          hizalama="ust"
          satir={satir}
        />
      ) : (
        <ol aria-label={metin("yonetim.sayfa.odemeYontemleri.ad")} className="flex flex-col gap-2">
          {form.yontemler.map((yontem) => (
            <li
              key={yontem.kod}
              className="flex rounded-orta border border-kenar bg-zemin px-4 py-3"
            >
              {satir(yontem)}
            </li>
          ))}
        </ol>
      )}
      <Kart className="flex flex-col gap-4 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("ortak.odemeYontemi.havale")}
        </h2>
        <FormAlani
          etiket={metin("yonetim.odemeYontemleri.iptalSuresi")}
          aciklama={metin("yonetim.odemeYontemleri.iptalSuresiAciklamasi")}
          {...(hatalar.sure === undefined ? {} : { hata: metin(hatalar.sure) })}
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              name="havaleIptalSuresi"
              inputMode="numeric"
              autoComplete="off"
              value={form.havaleIptalSuresi}
              disabled={!izinli}
              onChange={(olay) => {
                const deger = olay.target.value;
                setForm((onceki) => ({ ...onceki, havaleIptalSuresi: deger }));
              }}
              className="tablet:max-w-form"
            />
          )}
        </FormAlani>
        <Baglanti href={`${panelAdresi}/banka-hesaplari`} className="self-start">
          {doldur(metin("yonetim.odemeYontemleri.hesaplaraGit"), {
            sayi: String(veri.bankaHesabiSayisi),
          })}
        </Baglanti>
      </Kart>
      {izinli ? (
        <YanPencereAltCubugu className="bottom-0 mx-0 px-0">
          <Dugme
            tur="sade"
            disabled={!degisti}
            onClick={() => {
              vazgec();
              setHatalar({});
              setGenelHata(null);
            }}
          >
            {metin("ortak.islem.vazgec")}
          </Dugme>
          <GonderDugmesi>{metin("yonetim.odemeYontemleri.kaydet")}</GonderDugmesi>
        </YanPencereAltCubugu>
      ) : null}
    </Form>
  );
}
