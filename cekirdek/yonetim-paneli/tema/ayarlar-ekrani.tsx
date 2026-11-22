"use client";
// Tema ayarları ekranı (kart 0260, karar 0168; panel taslağı, karar 0157): vitrinin geçerli temasının mağaza sahibine
// açtığı değerler. Bölümler: Logo (hemen yüklenir, kart 0094), Renkler, Yazı tipi, Köşeler ve düğmeler, Görünüm
// (vitrinde koyu tema, masaüstünde filtrenin yeri). Logodan sonraki bölümler tek formdur: "Kaydet ve yayınla" temanın
// yeni sürümünü yazar, değişiklik hemen vitrindedir; "Önceki hâline dön" komut çubuğundadır.
//
// Panelde önizleme yoktur (karar 0080, 0168): seçenek kartlarında küçük sabit örnekler ve temanın demosu vardır.
// Okunmayan renk kaydedilmez: sunucu en yakın okunur tonu önerir, öneri alanın altında tek basışla seçilir. Renk
// kayıttan önce ekranda ölçülmez (tema tanımı tarayıcıya gitmez, karar 0129).
//
// "Mağaza sahibi temayı değiştirebilir" kapalıysa ya da yöneticinin tema.degistir izni yoksa ekran yalnız gösterir.
// Logonun izni ayrıdır (magaza-ayarlari.degistir).
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { RenkAlani } from "../../../bilesenler/parcalar/renk-alani";
import { SecenekGrubu, type SecenekGrubuOgesi } from "../../../bilesenler/parcalar/secenek-grubu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  type DugmeBicimiSecenegi,
  type KoseSecenegi,
  type MagazaRengi,
  type UrunFiltresiGorunumu,
  urunFiltresiGorunumleri,
} from "../../kayitlar/tema";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { temaAdresi } from "../adresler";
import { EylemBaglantisi, EylemDugmesi } from "../eylem-dugmesi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import { useSunucuFormu } from "../sunucu-formu";
import {
  type SecimGrubu,
  type TemaAyarlariFormu,
  type TemaAyarlariVerisi,
  temaAyarlariFormu,
  temaAyarlariGirdisi,
  yaziTipiAdi,
} from "./ayarlar-formu";
import { temaAyariAlanHatasi, temaHatasiMetni, temaUclari } from "./hatalar";
import { LogoBolumu } from "./logo-bolumu";

const renkAdlari: Record<MagazaRengi, MetinAnahtari> = {
  birincil: "yonetim.temaAyarlari.renk.birincil",
  indirim: "yonetim.temaAyarlari.renk.indirim",
  afis: "yonetim.temaAyarlari.renk.afis",
  "alt-kisim": "yonetim.temaAyarlari.renk.altKisim",
};
const renkAciklamalari: Record<MagazaRengi, MetinAnahtari> = {
  birincil: "yonetim.temaAyarlari.renkAciklamasi.birincil",
  indirim: "yonetim.temaAyarlari.renkAciklamasi.indirim",
  afis: "yonetim.temaAyarlari.renkAciklamasi.afis",
  "alt-kisim": "yonetim.temaAyarlari.renkAciklamasi.altKisim",
};
const koseAdlari: Record<KoseSecenegi, MetinAnahtari> = {
  keskin: "yonetim.temaAyarlari.kose.keskin",
  orta: "yonetim.temaAyarlari.kose.orta",
  yumusak: "yonetim.temaAyarlari.kose.yumusak",
  yuvarlak: "yonetim.temaAyarlari.kose.yuvarlak",
};
const dugmeAdlari: Record<DugmeBicimiSecenegi, MetinAnahtari> = {
  hap: "yonetim.temaAyarlari.dugme.hap",
  yumusak: "yonetim.temaAyarlari.dugme.yumusak",
  koseli: "yonetim.temaAyarlari.dugme.koseli",
};
const filtreAdlari: Record<UrunFiltresiGorunumu, MetinAnahtari> = {
  solda: "yonetim.tema.liste.solda",
  ustte: "yonetim.tema.liste.ustte",
};

// Komut çubuğu: temanın sayfasına dönüş ve "Önceki hâline dön". Tek sürümde dönülecek hâl yoktur.
export function TemaAyarlariEylemleri({
  sira,
  degistirebilir,
}: {
  sira: number;
  degistirebilir: boolean;
}) {
  const islem = usePanelIslemi(temaHatasiMetni);
  // Süren geri dönüş: aynı düğmeye ikinci basış dikkate alınmaz.
  const donuluyor = useRef(false);
  return (
    <>
      <EylemBaglantisi eylem="tema-degistir" href={temaAdresi} />
      {degistirebilir && sira >= 2 ? (
        <EylemDugmesi
          eylem="onceki-hale-don"
          onClick={() => {
            if (donuluyor.current) return;
            donuluyor.current = true;
            void islem(temaUclari.geriDon, { son: sira }, "yonetim.tema.geriDonuldu").finally(
              () => {
                donuluyor.current = false;
              },
            );
          }}
        />
      ) : null}
    </>
  );
}

function Bolum({
  kimlik,
  baslik,
  aciklama,
  children,
}: {
  kimlik: string;
  baslik: string;
  aciklama?: string;
  children: ReactNode;
}) {
  return (
    <Kart role="group" aria-labelledby={kimlik} className="flex flex-col gap-5 p-4 tablet:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={kimlik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {baslik}
        </h2>
        {aciklama === undefined ? null : <p className="text-kucuk text-soluk-yazi">{aciklama}</p>}
      </div>
      {children}
    </Kart>
  );
}

export function TemaAyarlariEkrani({
  veri,
  izinli,
  logoIzni,
}: {
  veri: TemaAyarlariVerisi;
  // Yöneticinin tema.degistir izni (sunucudan).
  izinli: boolean;
  // Yöneticinin magaza-ayarlari.degistir izni (sunucudan).
  logoIzni: boolean;
}) {
  const metin = usePanelMetni();
  const degistirebilir = izinli && veri.degistirilebilir;
  const islem = usePanelIslemi(temaHatasiMetni);
  // Kayıttan sonra sayfa yenilenir; arada yazılan değer ezilmez (kart 0223). Form sunucunun verisini nesnesiyle
  // tanır: yalnız veri değişince yeniden kurulur.
  const baslangic = useMemo(() => temaAyarlariFormu(veri), [veri]);
  const { form, setForm, degisti, kaydedildi, vazgec } =
    useSunucuFormu<TemaAyarlariFormu>(baslangic);
  const pf = usePanelFormu({ degisti: degistirebilir && degisti, kaydet: () => kaydet() });
  // Okunmayan rengin sunucunun önerdiği tonu: alanın yoluna göre.
  const [oneriler, setOneriler] = useState<Partial<Record<string, string>>>({});

  const degistir = <Alan extends keyof TemaAyarlariFormu>(
    alan: Alan,
    deger: TemaAyarlariFormu[Alan],
  ) => setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const rengiDegistir = (ad: MagazaRengi, deger: string) => {
    setForm((onceki) => ({ ...onceki, renkler: { ...onceki.renkler, [ad]: deger } }));
    pf.alaniTemizle(`renkler.${ad}`);
    setOneriler((onceki) => ({ ...onceki, [`renkler.${ad}`]: undefined }));
  };

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem(
        temaUclari.yayinla,
        temaAyarlariGirdisi(gonderilen, veri),
        "yonetim.temaAyarlari.kaydedildi",
        { formda: true },
      ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      setOneriler({});
      pf.temizle();
      return true;
    }
    const alanlar: Record<string, string> = {};
    const yeniOneriler: Record<string, string> = {};
    for (const sorun of sonuc.ayrinti) {
      const alan = sorun.alan.replace(/^ayarlar\./, "");
      const anahtar = temaAyariAlanHatasi(sorun.kod, sorun.oneri !== undefined);
      if (anahtar === undefined || !alanVarMi(alan)) continue;
      alanlar[alan] ??= metin(anahtar);
      if (sorun.oneri !== undefined) yeniOneriler[alan] = sorun.oneri;
    }
    setOneriler(yeniOneriler);
    pf.hatalariGoster(
      alanlar,
      Object.keys(alanlar).length > 0 ? [] : [metin(temaHatasiMetni(sonuc))],
    );
    return false;
  };

  const alanVarMi = (alan: string): boolean =>
    veri.renkler.some(({ ad }) => alan === `renkler.${ad}`) ||
    ["yaziTipi", "kose", "dugmeBicimi", "koyuTema", "urunFiltresi"].includes(alan);

  // Seçenek grubunun öğeleri: temanın kendi değeri hiçbir seçeneğe eşit değilse başta "Temanın kendi".
  const ogeler = <Kod extends string, Ek>(
    grup: SecimGrubu<Kod, Ek>,
    ad: (secenek: { kod: Kod } & Ek) => string,
    ornek: (ek: Ek) => ReactNode,
  ): SecenekGrubuOgesi[] => [
    ...(grup.eslesen === undefined
      ? [
          {
            deger: "",
            ad: metin("yonetim.temaAyarlari.temaninKendi"),
            ornek: ornek(grup.temaninKendi),
            ...(degistirebilir ? {} : { secilemez: true }),
          },
        ]
      : []),
    ...grup.secenekler.map((secenek) => ({
      deger: secenek.kod,
      ad: ad(secenek),
      ornek: ornek(secenek),
      ...(degistirebilir ? {} : { secilemez: true }),
    })),
  ];

  const secimGrubu = (
    alan: "yaziTipi" | "kose" | "dugmeBicimi",
    etiket: string,
    liste: SecenekGrubuOgesi[],
  ) => {
    const hata = pf.hata(alan);
    return (
      <AlanKabi ad={alan} etiket={etiket}>
        <SecenekGrubu
          baslik={etiket}
          etiket={etiket}
          gorunum="ornekli"
          ogeler={liste}
          deger={form[alan]}
          onDegerDegisti={(deger) => {
            if (!degistirebilir) return;
            degistir(alan, deger);
            pf.alaniTemizle(alan);
          }}
          secilemezEki=""
          {...(hata === undefined ? {} : { hata })}
        />
      </AlanKabi>
    );
  };

  const yaziTipiOrnegi = ({ baslik }: { baslik: string }) => (
    // Örneğin yazı tipi temanın değeridir; yazı tipleri sitede barındırılır (karar 0080).
    <span className="text-baslik-3" style={{ fontFamily: baslik }}>
      {metin("yonetim.temaAyarlari.ornekYazi")}
    </span>
  );
  const koseOrnegi = ({ orta }: { orta: string }) => (
    <span className="h-6 w-11 border-2 border-yazi bg-yuzey" style={{ borderRadius: orta }} />
  );
  const dugmeOrnegi = ({ deger }: { deger: string }) => (
    <span
      className="inline-flex h-8 items-center bg-birincil px-3 text-kucuk font-kalin text-birincil-ustu"
      style={{ borderRadius: deger }}
    >
      {metin("yonetim.temaAyarlari.ornekDugme")}
    </span>
  );

  return (
    <div className="flex max-w-metin flex-col gap-6">
      {veri.degistirilebilir ? null : <Uyari tur="bilgi">{metin("yonetim.tema.kapali")}</Uyari>}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-soluk-yazi">
        <span>
          {doldur(metin("yonetim.temaAyarlari.giris"), { tema: veri.tema.ad })}{" "}
          {doldur(metin("yonetim.temaAyarlari.sonYayin"), { zaman: veri.sonYayin })}
        </span>
        {veri.tema.demo === undefined ? null : (
          <Baglanti
            gorunum="cerceveli"
            href={veri.tema.demo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={doldur(metin("yonetim.tema.demoyuGezEtiketi"), { ad: veri.tema.ad })}
          >
            {metin("yonetim.tema.demoyuGez")}
            <Ikon ad="yeni-sekme" />
          </Baglanti>
        )}
      </p>
      <LogoBolumu
        logo={veri.logo}
        enCokDosyaBoyutu={veri.enCokDosyaBoyutu}
        dosyaTurleri={veri.dosyaTurleri}
        degistirebilir={logoIzni}
      />
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
        className="flex flex-col gap-6"
      >
        {veri.renkler.length === 0 ? null : (
          <Bolum
            kimlik="tema-ayarlari-renkler"
            baslik={metin("yonetim.temaAyarlari.renkler")}
            aciklama={metin("yonetim.temaAyarlari.renklerAciklamasi")}
          >
            {veri.renkler.map(({ ad }) => {
              const alan = `renkler.${ad}`;
              const oneri = oneriler[alan];
              const etiket = metin(renkAdlari[ad]);
              return (
                <div key={ad} className="flex flex-col gap-2">
                  <PanelAlani ad={alan} etiket={etiket} aciklama={metin(renkAciklamalari[ad])}>
                    {(baglanti) => (
                      <RenkAlani
                        {...baglanti}
                        name={alan}
                        value={form.renkler[ad] ?? ""}
                        disabled={!degistirebilir}
                        onDegerDegisti={(deger) => rengiDegistir(ad, deger)}
                        seciciEtiketi={doldur(metin("yonetim.temaAyarlari.renkSecici"), {
                          ad: etiket,
                        })}
                        className="tablet:max-w-form"
                      />
                    )}
                  </PanelAlani>
                  {oneri === undefined ? null : (
                    <div className="flex flex-wrap items-center gap-3 rounded-orta bg-yuzey p-3">
                      <span
                        aria-hidden="true"
                        className="size-6 shrink-0 rounded-kucuk border border-alan-kenari"
                        style={{ backgroundColor: oneri }}
                      />
                      <span className="text-kucuk">
                        {doldur(metin("yonetim.temaAyarlari.oneri"), { renk: oneri })}
                      </span>
                      <Dugme
                        tur="sade"
                        className="ml-auto"
                        aria-label={doldur(metin("yonetim.temaAyarlari.oneriKullanEtiketi"), {
                          ad: etiket,
                          renk: oneri,
                        })}
                        onClick={() => {
                          rengiDegistir(ad, oneri);
                          document
                            .querySelector<HTMLInputElement>(`input[name="${alan}"]`)
                            ?.focus();
                        }}
                      >
                        {metin("yonetim.temaAyarlari.oneriKullan")}
                      </Dugme>
                    </div>
                  )}
                </div>
              );
            })}
          </Bolum>
        )}
        {veri.yaziTipleri.secenekler.length === 0 ? null : (
          <Bolum
            kimlik="tema-ayarlari-yazi-tipi"
            baslik={metin("yonetim.temaAyarlari.yaziTipi")}
            aciklama={metin("yonetim.temaAyarlari.yaziTipiAciklamasi")}
          >
            {secimGrubu(
              "yaziTipi",
              metin("yonetim.temaAyarlari.yaziTipi"),
              ogeler(
                veri.yaziTipleri,
                ({ baslik, govde }) =>
                  yaziTipiAdi(baslik) === yaziTipiAdi(govde)
                    ? yaziTipiAdi(baslik)
                    : doldur(metin("yonetim.temaAyarlari.yaziTipiCifti"), {
                        baslik: yaziTipiAdi(baslik),
                        govde: yaziTipiAdi(govde),
                      }),
                yaziTipiOrnegi,
              ),
            )}
          </Bolum>
        )}
        {veri.koseler.secenekler.length === 0 &&
        veri.dugmeBicimleri.secenekler.length === 0 ? null : (
          <Bolum kimlik="tema-ayarlari-kose" baslik={metin("yonetim.temaAyarlari.koseVeDugme")}>
            {veri.koseler.secenekler.length === 0
              ? null
              : secimGrubu(
                  "kose",
                  metin("yonetim.temaAyarlari.koseler"),
                  ogeler(veri.koseler, ({ kod }) => metin(koseAdlari[kod]), koseOrnegi),
                )}
            {veri.dugmeBicimleri.secenekler.length === 0
              ? null
              : secimGrubu(
                  "dugmeBicimi",
                  metin("yonetim.temaAyarlari.dugmeBicimi"),
                  ogeler(veri.dugmeBicimleri, ({ kod }) => metin(dugmeAdlari[kod]), dugmeOrnegi),
                )}
          </Bolum>
        )}
        <Bolum kimlik="tema-ayarlari-gorunum" baslik={metin("yonetim.temaAyarlari.gorunum")}>
          <AlanKabi ad="koyuTema" etiket={metin("yonetim.temaAyarlari.koyuTema")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span id="tema-ayarlari-koyu-tema" className="font-kalin">
                  {metin("yonetim.temaAyarlari.koyuTema")}
                </span>
                <span className="text-kucuk text-soluk-yazi">
                  {metin("yonetim.temaAyarlari.koyuTemaAciklamasi")}
                </span>
              </div>
              <Anahtar
                data-hata-odagi
                etiket={metin("yonetim.temaAyarlari.koyuTema")}
                acikYazisi={metin("yonetim.temaAyarlari.acik")}
                kapaliYazisi={metin("yonetim.temaAyarlari.kapali")}
                checked={form.koyuTema}
                disabled={!degistirebilir}
                onCheckedChange={(acik) => degistir("koyuTema", acik)}
              />
            </div>
          </AlanKabi>
          <AlanKabi ad="urunFiltresi" etiket={metin("yonetim.tema.liste.filtreYeri")}>
            <SecenekGrubu
              baslik={metin("yonetim.tema.liste.filtreYeri")}
              etiket={metin("yonetim.tema.liste.filtreYeri")}
              ogeler={urunFiltresiGorunumleri.map((deger) => ({
                deger,
                ad: metin(filtreAdlari[deger]),
                ...(degistirebilir ? {} : { secilemez: true }),
              }))}
              deger={form.urunFiltresi}
              onDegerDegisti={(yeni) => {
                if (degistirebilir) degistir("urunFiltresi", yeni as UrunFiltresiGorunumu);
              }}
              secilemezEki=""
              aciklama={metin("yonetim.tema.liste.filtreAciklamasi")}
            />
          </AlanKabi>
        </Bolum>
        {degistirebilir ? (
          <KaydetCubugu
            sayfada
            durumYazisi
            degisiklikGerekli
            kaydetEtiketi={metin("yonetim.temaAyarlari.kaydet")}
            vazgec={() => {
              vazgec();
              setOneriler({});
              pf.temizle();
            }}
          />
        ) : null}
      </PanelFormu>
    </div>
  );
}
