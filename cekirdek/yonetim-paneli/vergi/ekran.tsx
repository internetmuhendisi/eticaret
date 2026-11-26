"use client";
// Vergi ekranı (kart 0322; taslak kart 0311, karar 0185): solda genel ayarlar, sağda vergi sınıfları. Genel ayarlar tek
// formdur (kargonun vergi sınıfı dahil), kaydedilince hemen yayınlanır. Fiyat girişi yalnız gösterilir: değişmesi kayıtlı
// fiyatların çevrilmesini ister (kart 0326). Değiştirme izni olmayan yönetici alanları okur, düğmeleri görmez.
import { useMemo } from "react";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import type { VergiAyarlari } from "../../moduller/vergi/ayarlar";
import { fiyatGirisleri, vergiAdresleri, vergiYuvarlamalari } from "../../moduller/vergi/semalar";
import { fiyatEkMetniTurleri } from "../../moduller/vergi/uc-semalari";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { type KodMetinleri, kodluAlanHatalari } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import { VergiSiniflari } from "./siniflar";
import type { VergiEkraniVerisi } from "./veri";

type AyarFormu = Omit<VergiAyarlari, "fiyatGirisi">;
const formAlanlari = [
  "vergiAcik",
  "vergiAdi",
  "fiyatGosterimi",
  "fiyatEkMetniTuru",
  "fiyatEkMetni",
  "vergiAdresi",
  "vergiYuvarlama",
  "kargoSinifi",
] as const satisfies readonly (keyof AyarFormu)[];

// Servisin kodları; şemanın kendi kodları (boş zorunlu alan, çok uzun yazı) ortak eşlemeden gelir.
const alanHatasiMetni: KodMetinleri = {
  "ad-bicimi": "yonetim.vergi.hata.ad-bicimi",
  "sinif-silinmis": "yonetim.vergi.hata.sinif-silinmis",
  gecersiz: "yonetim.vergi.ekMetinGecersiz",
};
const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki" ? "yonetim.vergi.yetkiHatasi" : "yonetim.vergi.genelHata";

// Radix seçim kutusunun değeri boş olamaz: "kargo vergisiz" bu değerle gösterilir.
const vergisiz = "vergisiz";

export function VergiEkrani({ veri, izinli }: { veri: VergiEkraniVerisi; izinli: boolean }) {
  return (
    <div className="grid items-start gap-6 masaustu:grid-cols-5">
      <div className="min-w-0 masaustu:col-span-3">
        <GenelAyarlar veri={veri} izinli={izinli} />
      </div>
      <div className="min-w-0 masaustu:col-span-2">
        <VergiSiniflari veri={veri} izinli={izinli} />
      </div>
    </div>
  );
}

function GenelAyarlar({ veri, izinli }: { veri: VergiEkraniVerisi; izinli: boolean }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  const { fiyatGirisi } = veri.ayarlar;
  // Formun başlangıcı veri değişmedikçe aynı nesnedir: her çizimde yeni nesne formu baştan kurdurur.
  const baslangic = useMemo(() => {
    const { fiyatGirisi: _giris, ...form } = veri.ayarlar;
    return form;
  }, [veri.ayarlar]);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<AyarFormu>(baslangic);
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const degistir = <A extends keyof AyarFormu>(alan: A, deger: AyarFormu[A]) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem("vergi-ayarlari", gonderilen, "yonetim.vergi.kaydedildi", { formda: true }),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    const alanlar = Object.fromEntries(
      Object.entries(kodluAlanHatalari(alanHatasiMetni, sonuc, formAlanlari)).map(
        ([alan, anahtar]) => [alan, metin(anahtar)],
      ),
    );
    pf.hatalariGoster(
      alanlar,
      Object.keys(alanlar).length > 0 ? [] : [metin(genelHataMetni(sonuc))],
    );
    return false;
  };

  const secenekler = <D extends string>(
    alan: "fiyatGosterimi" | "fiyatEkMetniTuru",
    etiket: string,
    degerler: readonly D[],
    ad: (deger: D) => string,
    aciklama?: string,
  ) => (
    <AlanKabi ad={alan} etiket={etiket}>
      <SecenekGrubu
        baslik={etiket}
        etiket={etiket}
        ogeler={degerler.map((deger) => ({
          deger,
          ad: ad(deger),
        }))}
        deger={form[alan]}
        onDegerDegisti={(deger) => {
          if (izinli) degistir(alan, deger as AyarFormu[typeof alan]);
        }}
        secilemezEki=""
        {...(aciklama === undefined ? {} : { aciklama })}
        {...(pf.hata(alan) === undefined ? {} : { hata: pf.hata(alan) ?? "" })}
      />
    </AlanKabi>
  );

  const secim = <D extends string>(
    alan: "vergiAdresi" | "vergiYuvarlama",
    etiket: string,
    degerler: readonly D[],
    ad: (deger: D) => string,
    aciklama?: string,
  ) => (
    <PanelAlani ad={alan} etiket={etiket} {...(aciklama === undefined ? {} : { aciklama })} zorunlu>
      {(baglanti) => (
        <SecimKutusu
          value={form[alan]}
          disabled={!izinli}
          onValueChange={(deger) => degistir(alan, deger as AyarFormu[typeof alan])}
        >
          <SecimTetikleyici {...baglanti} className="tablet:max-w-form">
            <SecimDegeri />
          </SecimTetikleyici>
          <SecimListesi>
            {degerler.map((deger) => (
              <SecimOgesi key={deger} value={deger}>
                {ad(deger)}
              </SecimOgesi>
            ))}
          </SecimListesi>
        </SecimKutusu>
      )}
    </PanelAlani>
  );

  return (
    <PanelFormu
      durum={pf}
      gonder={async () => {
        await kaydet();
      }}
    >
      <Kart className="flex flex-col gap-5 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.vergi.genel")}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-kalin">{metin("yonetim.vergi.vergiAcik")}</span>
            <span className="text-kucuk text-soluk-yazi">
              {metin("yonetim.vergi.vergiAcikAciklamasi")}
            </span>
          </div>
          <Anahtar
            etiket={metin("yonetim.vergi.vergiAcik")}
            acikYazisi={metin("yonetim.siparisAyarlari.acik")}
            kapaliYazisi={metin("yonetim.siparisAyarlari.kapali")}
            checked={form.vergiAcik}
            disabled={!izinli}
            onCheckedChange={(acik) => degistir("vergiAcik", acik)}
          />
        </div>
        <PanelAlani
          ad="vergiAdi"
          etiket={metin("yonetim.vergi.vergiAdi")}
          aciklama={metin("yonetim.vergi.vergiAdiAciklamasi")}
          zorunlu={false}
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              autoComplete="off"
              value={form.vergiAdi}
              disabled={!izinli}
              onChange={(olay) => degistir("vergiAdi", olay.target.value)}
              className="tablet:max-w-form"
            />
          )}
        </PanelAlani>
        <div className="flex flex-col gap-1">
          <span className="text-kucuk font-kalin">{metin("yonetim.vergi.fiyatGirisi")}</span>
          <span>{metin(`yonetim.vergi.fiyatGirisiDeger.${fiyatGirisi}`)}</span>
          <span className="text-kucuk text-soluk-yazi">
            {metin("yonetim.vergi.fiyatGirisiAciklamasi")}
          </span>
        </div>
        {secenekler(
          "fiyatGosterimi",
          metin("yonetim.vergi.fiyatGosterimi"),
          fiyatGirisleri,
          (deger) => metin(`yonetim.vergi.fiyatGirisiDeger.${deger}`),
          metin("yonetim.vergi.fiyatGosterimiAciklamasi"),
        )}
        {secenekler(
          "fiyatEkMetniTuru",
          metin("yonetim.vergi.fiyatEkMetni"),
          fiyatEkMetniTurleri,
          (deger) =>
            doldur(metin(`yonetim.vergi.fiyatEkMetniTuru.${deger}`), {
              ornek: veri.otomatikEkMetin,
            }),
        )}
        {form.fiyatEkMetniTuru === "kendi" ? (
          <PanelAlani ad="fiyatEkMetni" etiket={metin("yonetim.vergi.fiyatEkMetniAlani")} zorunlu>
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                required
                autoComplete="off"
                value={form.fiyatEkMetni}
                disabled={!izinli}
                onChange={(olay) => degistir("fiyatEkMetni", olay.target.value)}
                className="tablet:max-w-form"
              />
            )}
          </PanelAlani>
        ) : null}
        <div className="grid gap-5 tablet:grid-cols-2">
          {secim(
            "vergiAdresi",
            metin("yonetim.vergi.vergiAdresi"),
            vergiAdresleri,
            (deger) => metin(`yonetim.vergi.vergiAdresiDeger.${deger}`),
            metin("yonetim.vergi.vergiAdresiAciklamasi"),
          )}
          {secim(
            "vergiYuvarlama",
            metin("yonetim.vergi.vergiYuvarlama"),
            vergiYuvarlamalari,
            (deger) => metin(`yonetim.vergi.vergiYuvarlamaDeger.${deger}`),
          )}
          <PanelAlani
            ad="kargoSinifi"
            etiket={metin("yonetim.vergi.kargoSinifi")}
            aciklama={metin("yonetim.vergi.kargoSinifiAciklamasi")}
            zorunlu={false}
          >
            {(baglanti) => (
              <SecimKutusu
                value={form.kargoSinifi ?? vergisiz}
                disabled={!izinli}
                onValueChange={(deger) =>
                  degistir("kargoSinifi", deger === vergisiz ? null : deger)
                }
              >
                <SecimTetikleyici {...baglanti} className="tablet:max-w-form">
                  <SecimDegeri />
                </SecimTetikleyici>
                <SecimListesi>
                  <SecimOgesi value={vergisiz}>{metin("yonetim.vergi.kargoVergisiz")}</SecimOgesi>
                  {veri.silinmisKargoSinifi === null ? null : (
                    <SecimOgesi value={veri.silinmisKargoSinifi.kimlik}>
                      {doldur(metin("yonetim.vergi.silinmisSinif"), {
                        ad: veri.silinmisKargoSinifi.ad,
                      })}
                    </SecimOgesi>
                  )}
                  {veri.siniflar.map((sinif) => (
                    <SecimOgesi key={sinif.kimlik} value={sinif.kimlik}>
                      {sinif.ad}
                    </SecimOgesi>
                  ))}
                </SecimListesi>
              </SecimKutusu>
            )}
          </PanelAlani>
        </div>
        {izinli ? (
          <KaydetCubugu
            sayfada
            durumYazisi
            degisiklikGerekli
            kaydetEtiketi={metin("yonetim.vergi.kaydet")}
            vazgec={() => {
              vazgec();
              pf.temizle();
            }}
          />
        ) : null}
      </Kart>
    </PanelFormu>
  );
}
