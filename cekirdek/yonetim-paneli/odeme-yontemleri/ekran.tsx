"use client";
// Ödeme yöntemleri ekranı (kart 0214, karar 0141; kart 0211'in taslağı): müşterinin ödeme adımında gördüğü yöntemler
// ve sırası. Satırlar sürüklenerek, klavyeyle ya da yukarı ve aşağı al düğmeleriyle sıralanır; anahtar yöntemi açar
// ya da kapatır; kapıda ödemenin seçenekleri (nakit, kart) satırın içindedir. Altta havalenin kartı: ödenmeyen
// siparişin iptal süresi ve banka hesaplarına bağlantı. Sıra taşınır taşınmaz kendi ucuyla kaydedilir (kart 0224, karar
// 0144: "Kaydet"e basmadan çıkan mağaza sahibinin sırası kayboluyordu); anahtarlar, seçenekler ve süre birlikte
// "Kaydet" ile kaydedilir, hemen yayınlanır. Sıralama ekrandaki kaydedilmemiş değişikliği birlikte kaydetmez.
// Hiç açık yöntem kalmazsa kaydedilmez. Değiştirme izni olmayan yönetici (görevli) yalnız görür: anahtarlar ve
// seçenekler kapalıdır, liste sıralanmaz, düğmeler yoktur.
import { useEffect, useRef, useState } from "react";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  type KapidaOdemeSecenegi,
  kapidaOdemeSecenekleri,
  type OdemeYontemi,
} from "../../kayitlar/odeme";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import type { YontemAyari } from "../../moduller/odeme/yontemler";
import { panelAdresi } from "../adresler";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { type KodMetinleri, kodluAlanHatalari } from "../kodlu-form";
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

// Yöntemleri verilen kod sırasıyla dizer; her yöntem kendi açık-kapalı bilgisini korur.
const siraylaDiz = (yontemler: YontemAyari[], sira: OdemeYontemi[]): YontemAyari[] =>
  sira.flatMap((kod) => yontemler.filter((yontem) => yontem.kod === kod));

// Sıralamanın çakışması (sitedeki yöntemler arada değişti): sayfa kendiliğinden yenilenir, metin bunu söyler.
const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.odemeYontemleri.hata.yetki"
    : hata.kod === "cakisma"
      ? "yonetim.odemeYontemleri.hata.listeDegisti"
      : "yonetim.odemeYontemleri.hata.genel";

// Servisin koduna göre metin; alanı formda olmayan kod formun başındaki özette yazılır.
const alanHatalari: Record<string, { alan: "yontemler" | "sure"; metin: MetinAnahtari }> = {
  "en-az-bir-yontem": { alan: "yontemler", metin: "yonetim.odemeYontemleri.hata.enAzBir" },
  "gun-gecersiz": { alan: "sure", metin: "yonetim.odemeYontemleri.hata.gunGecersiz" },
};

// Uç şemasının hataları (kart 0284): kapı yalnız zod'un kodunu döndürür, şemanın kendi iletisi ("secenek-gerekli")
// gelmez. Boş seçenek listesi too_small'dur; şemanın alanı formun alanına çevrilir.
const semaAlanlari: Readonly<Record<string, "sure" | "secenekler">> = {
  havaleIptalSuresi: "sure",
  kapidaOdemeSecenekleri: "secenekler",
};
const semaAlani = (alan: string): string => semaAlanlari[alan.split(".")[0] ?? ""] ?? alan;
const secenekMetinleri: KodMetinleri = { too_small: "yonetim.odemeYontemleri.hata.secenekGerekli" };

export function OdemeYontemleriEkrani({
  veri,
  izinli,
}: {
  veri: OdemeYontemleriEkraniVerisi;
  izinli: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec, bilinen } =
    useSunucuFormu<OdemeYontemleriFormu>(veri.form);
  // Ortak form yapısı (kart 0259): hata, özet, odak, çıkarken soru.
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });

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

  // Ekranın istekleri (sıralamalar ve "Kaydet") sırayla gider (bağımsız kontrolün bulgusu): birbirini beklemeyen
  // istekler sunucuya ters sırada ulaşıp son sırayı ya da kaydedilen anahtarı geri alabiliyordu. İstek sırası
  // gelince formun o anki hâlini okur; bunun için form ve bilinen hâl her çizimde ref'e yazılır.
  const kuyruk = useRef<Promise<unknown>>(Promise.resolve());
  const [bekleyen, setBekleyen] = useState(0);
  const sirayla = <Sonuc,>(is: () => Promise<Sonuc>): Promise<Sonuc> => {
    setBekleyen((sayi) => sayi + 1);
    const sonuc = kuyruk.current.then(is).finally(() => setBekleyen((sayi) => sayi - 1));
    kuyruk.current = sonuc.catch(() => undefined);
    return sonuc;
  };
  const formRef = useRef(form);
  const bilinenRef = useRef(bilinen);
  useEffect(() => {
    formRef.current = form;
    bilinenRef.current = bilinen;
  });

  // Sıralama (kart 0224): ekran yeni sırayı hemen gösterir, uç yalnız sırayı yazar. Başarıda bilinen hâlin sırası
  // değişir (anahtarlar kayıtlı hâliyle kalır); son sıralama düşerse ekran sunucuda olduğu bilinen sıraya döner.
  const sonSiralama = useRef(0);
  const sirala = (yeni: YontemAyari[]) => {
    const sira = yeni.map((yontem) => yontem.kod);
    setForm((onceki) => ({ ...onceki, yontemler: siraylaDiz(onceki.yontemler, sira) }));
    const bu = ++sonSiralama.current;
    void sirayla(() =>
      islem("odeme-yontemleri-sirala", { sira }, "yonetim.odemeYontemleri.siralandi"),
    ).then((sonuc) => {
      if (sonuc.tamam) {
        kaydedildi((onceki) => ({ ...onceki, yontemler: siraylaDiz(onceki.yontemler, sira) }));
      } else if (bu === sonSiralama.current) {
        const bilinenSira = bilinenRef.current.yontemler.map((yontem) => yontem.kod);
        setForm((onceki) => ({ ...onceki, yontemler: siraylaDiz(onceki.yontemler, bilinenSira) }));
      }
    });
  };

  const kaydet = async (): Promise<boolean> => {
    const sonucu = await pf.isle(() =>
      sirayla(async () => {
        const gonderilen = formRef.current;
        const sonuc = await islem(
          "odeme-yontemleri",
          gonderilen,
          "yonetim.odemeYontemleri.kaydedildi",
          {
            formda: true,
          },
        );
        return { gonderilen, sonuc };
      }),
    );
    if (sonucu === undefined) return false;
    const { gonderilen, sonuc } = sonucu;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    const yeni: Record<string, string> = {};
    for (const { kod } of sonuc.ayrinti) {
      const hata = alanHatalari[kod];
      if (hata !== undefined) yeni[hata.alan] = metin(hata.metin);
    }
    // Uç şemasının kodu ortak eşlemeden (boş süre "zorunlu", boş seçenek listesi kendi metniyle).
    const semaHatalari = {
      ...kodluAlanHatalari({}, sonuc, ["sure"], semaAlani),
      ...kodluAlanHatalari(secenekMetinleri, sonuc, ["secenekler"], semaAlani),
    };
    for (const [alan, anahtar] of Object.entries(semaHatalari)) yeni[alan] ??= metin(anahtar);
    pf.hatalariGoster(yeni, Object.keys(yeni).length > 0 ? [] : [metin(genelHataMetni(sonuc))]);
    return false;
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
          <AlanKabi ad="secenekler" etiket={metin("yonetim.odemeYontemleri.secenekler")}>
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
              {pf.hata("secenekler") === undefined ? null : (
                <span className="font-kalin text-tehlike-yazi">{pf.hata("secenekler")}</span>
              )}
            </fieldset>
          </AlanKabi>
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
    <PanelFormu
      durum={pf}
      gonder={async () => {
        await kaydet();
      }}
      className="max-w-metin"
    >
      {havaleAcik && veri.bankaHesabiSayisi === 0 ? (
        <Uyari tur="uyari">{metin("yonetim.odemeYontemleri.hesapYok")}</Uyari>
      ) : null}
      <AlanKabi
        ad="yontemler"
        etiket={metin("yonetim.sayfa.odemeYontemleri.ad")}
        className="flex flex-col gap-2"
      >
        {pf.hata("yontemler") === undefined ? null : (
          // Listenin hatası listenin üstünde, odak alabilir: tek hatada odak buraya gelir.
          <p tabIndex={-1} data-hata-odagi="" className="font-kalin text-tehlike-yazi">
            {pf.hata("yontemler")}
          </p>
        )}
        {izinli ? (
          <SiralanabilirListe
            ogeler={form.yontemler}
            anahtar={(yontem) => yontem.kod}
            ad={adi}
            etiket={metin("yonetim.sayfa.odemeYontemleri.ad")}
            metinler={siralamaMetinleri(metin)}
            siralaninca={sirala}
            hizalama="ust"
            satir={satir}
          />
        ) : (
          <ol
            aria-label={metin("yonetim.sayfa.odemeYontemleri.ad")}
            className="flex flex-col gap-2"
          >
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
      </AlanKabi>
      <Kart className="flex flex-col gap-4 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("ortak.odemeYontemi.havale")}
        </h2>
        <PanelAlani
          ad="sure"
          etiket={metin("yonetim.odemeYontemleri.iptalSuresi")}
          aciklama={metin("yonetim.odemeYontemleri.iptalSuresiAciklamasi")}
          zorunlu
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
        </PanelAlani>
        <Baglanti href={`${panelAdresi}/banka-hesaplari`} className="self-start">
          {doldur(metin("yonetim.odemeYontemleri.hesaplaraGit"), {
            sayi: String(veri.bankaHesabiSayisi),
          })}
        </Baglanti>
      </Kart>
      {izinli ? (
        <KaydetCubugu
          sayfada
          durumYazisi
          degisiklikGerekli
          kaydetEtiketi={metin("yonetim.odemeYontemleri.kaydet")}
          // İstek sürerken Vazgeç kapalıdır: geri alınan sıra arkadan kaydedilen sırayla ayrışırdı.
          vazgecKapali={bekleyen > 0}
          vazgec={() => {
            vazgec();
            pf.temizle();
          }}
        />
      ) : null}
    </PanelFormu>
  );
}
