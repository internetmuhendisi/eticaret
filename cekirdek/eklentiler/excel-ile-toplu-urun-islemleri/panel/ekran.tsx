"use client";
// "Excel ile içe ve dışa aktar" ekranı (kart 0315, taslak planlar/tasarim-yonu/panel-2.html "Excel (eklenti)"):
// - Dışa aktar: bütün ürünler ya da Ürünler listesinin süzgeçleri; dosya arka planda hazırlanır, hazır olunca indirme
//   bağlantısı görünür.
// - İçe aktar: dosya seçilince yüklenir, arka planda denetlenir; önizlemede sayılar, hatalı satırlar ve değişecekler.
//   Hatalı satır varken "Uygula" kapalıdır (aria-disabled) ve nedeni bağlıdır. Uygulama arka planda sürer; ilerleme
//   çubuğu ve sonuç görünür.
// İş sürerken sayfa iki saniyede bir yenilenir; veri sunucuda biçimlenir (veri.ts).
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { DosyaYukleme } from "../../../../bilesenler/parcalar/dosya-yukleme";
import { Dugme } from "../../../../bilesenler/parcalar/dugme";
import { IlerlemeCubugu } from "../../../../bilesenler/parcalar/ilerleme-cubugu";
import {
  Kart,
  KartAciklamasi,
  KartBasligi,
  KartIcerigi,
  KartUstu,
} from "../../../../bilesenler/parcalar/kart";
import { SecenekGrubu } from "../../../../bilesenler/parcalar/secenek-grubu";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../../bilesenler/parcalar/tablo";
import { Uyari } from "../../../../bilesenler/parcalar/uyari";
import { YukleniyorGostergesi } from "../../../../bilesenler/parcalar/yukleniyor";
import { doldur } from "../../../metinler/doldur";
import { usePanelMetni } from "../../../metinler/panel-metni";
import { urunlerAdresi } from "../../../yonetim-paneli/adresler";
import { dosyaHatasiMetni, useDosyaYuklemesi } from "../../../yonetim-paneli/dosya-yuklemesi";
import { panelIkonu } from "../../../yonetim-paneli/panel-ikon";
import { usePanelIslemi } from "../../../yonetim-paneli/panel-islemi";
import type { ExcelEkraniVerisi } from "./veri";

const yenilemeAraligi = 2000;
const xlsxKabul = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function ExcelEkrani({ veri }: { veri: ExcelEkraniVerisi }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const islem = usePanelIslemi(() => "eklenti.excel.ekran.islemHatasi");
  const [kapsam, setKapsam] = useState<"hepsi" | "liste">(
    veri.listeSorgusu === null ? "hepsi" : "liste",
  );
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const { yukleme, yukle, iptalEt } = useDosyaYuklemesi(veri.enCokBayt);
  const [dosyaHatasi, setDosyaHatasi] = useState<string | undefined>(undefined);
  const kimlik = useId();
  const sinirKimligi = `${kimlik}-sinir`;
  const dosyaHataKimligi = `${kimlik}-hata`;
  const uygulaNedenKimligi = `${kimlik}-neden`;

  const ice = veri.iceAktarma;
  const suruyor =
    veri.disaAktarma?.durum === "hazirlaniyor" ||
    ice?.durum === "denetleniyor" ||
    ice?.durum === "uygulaniyor";
  useEffect(() => {
    if (!suruyor) return;
    const zamanlayici = setInterval(() => router.refresh(), yenilemeAraligi);
    return () => clearInterval(zamanlayici);
  }, [suruyor, router]);

  const disaAktar = async () => {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    try {
      await islem(
        "urunler-excel-disa-aktar",
        kapsam === "liste" && veri.listeSorgusu !== null ? { sorgu: veri.listeSorgusu } : {},
        "eklenti.excel.ekran.hazirlaniyor",
      );
    } finally {
      setGonderiliyor(false);
    }
  };

  const dosyaSecildi = async (dosya: File) => {
    setDosyaHatasi(undefined);
    const sonuc = await yukle(
      `urunler-excel-yukle?${new URLSearchParams({ ad: dosya.name })}`,
      dosya,
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      router.refresh();
      return;
    }
    if (sonuc.kod === "iptal") return;
    setDosyaHatasi(doldur(metin(dosyaHatasiMetni(sonuc)), { boyut: veri.sinirYazisi }));
  };

  const uygulanabilir =
    ice !== null && ice.durum === "onizleme" && ice.hataliSayisi === 0 && ice.yazilacakSayisi > 0;
  const uygula = async () => {
    if (ice === null || !uygulanabilir || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      await islem(
        "urunler-excel-uygula",
        { kimlik: ice.kimlik },
        "eklenti.excel.ekran.uygulaniyor",
      );
    } finally {
      setGonderiliyor(false);
    }
  };
  const vazgec = async () => {
    if (ice === null || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      await islem("urunler-excel-vazgec", { kimlik: ice.kimlik }, "eklenti.excel.ekran.vazgecildi");
    } finally {
      setGonderiliyor(false);
    }
  };

  const dosyaSecimi = (
    <div className="flex flex-col gap-2">
      <DosyaYukleme
        secEtiketi={metin(
          ice === null || ice.durum === "bitti" || ice.durum === "vazgecildi"
            ? "eklenti.excel.ekran.dosyaSec"
            : "eklenti.excel.ekran.baskaDosya",
        )}
        ikon={panelIkonu("yukle")}
        tur="cerceveli"
        kabul={xlsxKabul}
        onSecildi={([dosya]) => {
          if (dosya !== undefined) void dosyaSecildi(dosya);
        }}
        yukleme={yukleme}
        ilerlemeEtiketi={doldur(metin("yonetim.dosya.ilerleme"), {
          ad: metin("eklenti.excel.ekran.dosya"),
        })}
        iptalEtiketi={metin("yonetim.dosya.iptal")}
        onIptal={iptalEt}
        aria-describedby={
          dosyaHatasi === undefined ? sinirKimligi : `${sinirKimligi} ${dosyaHataKimligi}`
        }
        {...(dosyaHatasi === undefined ? {} : { "aria-invalid": true })}
      />
      <p id={sinirKimligi} className="m-0 text-kucuk text-soluk-yazi">
        {veri.sinirYazisi}
      </p>
      {dosyaHatasi === undefined ? null : (
        <p id={dosyaHataKimligi} className="m-0 text-kucuk text-tehlike-yazi">
          {dosyaHatasi}
        </p>
      )}
    </div>
  );

  const onizlemede = ice !== null && ice.durum === "onizleme";
  const uygulanirken = ice !== null && ice.durum === "uygulaniyor";
  const bitti = ice !== null && ice.durum === "bitti";

  return (
    <div className="flex flex-col gap-6">
      {onizlemede || uygulanirken || bitti ? null : (
        <div className="grid items-start gap-6 masaustu:grid-cols-2">
          <Kart role="region" aria-labelledby={`${kimlik}-disa`}>
            <KartUstu>
              <KartBasligi duzey={2} id={`${kimlik}-disa`}>
                {metin("eklenti.excel.ekran.disaAktar")}
              </KartBasligi>
              <KartAciklamasi>{metin("eklenti.excel.ekran.disaAciklama")}</KartAciklamasi>
            </KartUstu>
            <KartIcerigi className="flex flex-col gap-4">
              {veri.listeSorgusu === null ? null : (
                <SecenekGrubu
                  baslik={metin("eklenti.excel.ekran.hangiUrunler")}
                  etiket={metin("eklenti.excel.ekran.hangiUrunler")}
                  ogeler={[
                    { deger: "hepsi", ad: metin("eklenti.excel.ekran.butunUrunler") },
                    { deger: "liste", ad: metin("eklenti.excel.ekran.listedekiler") },
                  ]}
                  deger={kapsam}
                  onDegerDegisti={(deger) => setKapsam(deger as "hepsi" | "liste")}
                  secilemezEki=""
                />
              )}
              <p className="m-0 text-kucuk text-soluk-yazi">{veri.sutunYazisi}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Dugme
                  tur="cerceveli"
                  aria-disabled={gonderiliyor || veri.disaAktarma?.durum === "hazirlaniyor"}
                  onClick={() => void disaAktar()}
                >
                  {metin("eklenti.excel.ekran.hazirla")}
                </Dugme>
                {veri.disaAktarma?.durum === "hazirlaniyor" ? (
                  <YukleniyorGostergesi etiket={veri.disaAktarma.yazi} />
                ) : null}
              </div>
              {veri.disaAktarma === null || veri.disaAktarma.durum === "hazirlaniyor" ? null : (
                <div role="status" className="flex flex-col gap-2">
                  <p className="m-0">{veri.disaAktarma.yazi}</p>
                  {veri.disaAktarma.indirmeAdresi === null ? null : (
                    <Baglanti
                      href={veri.disaAktarma.indirmeAdresi}
                      prefetch={false}
                      download
                      gorunum="birincil"
                      className="self-start"
                    >
                      {metin("eklenti.excel.ekran.indir")}
                    </Baglanti>
                  )}
                </div>
              )}
            </KartIcerigi>
          </Kart>
          <Kart role="region" aria-labelledby={`${kimlik}-ice`}>
            <KartUstu>
              <KartBasligi duzey={2} id={`${kimlik}-ice`}>
                {metin("eklenti.excel.ekran.iceAktar")}
              </KartBasligi>
              <KartAciklamasi>{metin("eklenti.excel.ekran.iceAciklama")}</KartAciklamasi>
            </KartUstu>
            <KartIcerigi className="flex flex-col gap-3">
              {veri.iceAktarabilir ? (
                <>
                  {ice?.durum === "denetleniyor" ? (
                    <YukleniyorGostergesi etiket={metin("eklenti.excel.ekran.denetleniyor")} />
                  ) : null}
                  {ice?.durum === "okunamadi" && ice.okunamadi !== undefined ? (
                    <Uyari tur="tehlike" baslik={metin("eklenti.excel.ekran.okunamadiBaslik")}>
                      {ice.okunamadi}
                    </Uyari>
                  ) : null}
                  {dosyaSecimi}
                </>
              ) : (
                <p className="m-0 text-soluk-yazi">{metin("eklenti.excel.ekran.izinYok")}</p>
              )}
            </KartIcerigi>
          </Kart>
        </div>
      )}

      {ice !== null && (onizlemede || uygulanirken || bitti) ? (
        <>
          <Kart className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-kalin">{ice.dosyaAdi}</span>
              <span className="text-kucuk text-soluk-yazi">{ice.dosyaYazisi}</span>
            </span>
          </Kart>
          {onizlemede ? (
            <ul
              className="m-0 grid list-none grid-cols-2 gap-3 p-0 tablet:grid-cols-4"
              aria-label={metin("eklenti.excel.ekran.onizleme")}
            >
              {(
                [
                  ["degisecek", ice.sayilar.degistir],
                  ["eklenecek", ice.sayilar.ekle],
                  ["degismeyecek", ice.sayilar.ayni],
                  ["hatali", ice.sayilar.hatali],
                ] as const
              ).map(([ad, sayi]) => (
                <li key={ad}>
                  <Kart className="flex flex-col gap-1 p-4">
                    <span className="text-kucuk text-soluk-yazi">
                      {metin(`eklenti.excel.ekran.${ad}`)}
                    </span>
                    <strong className="text-baslik-3">{sayi}</strong>
                  </Kart>
                </li>
              ))}
            </ul>
          ) : null}
          {onizlemede && ice.hatalilar.length > 0 ? (
            <Kart
              role="region"
              aria-labelledby={`${kimlik}-hatali`}
              className="border-2 border-tehlike"
            >
              <KartUstu>
                <KartBasligi duzey={2} id={`${kimlik}-hatali`}>
                  {doldur(metin("eklenti.excel.ekran.hatalilarBaslik"), {
                    sayi: ice.sayilar.hatali,
                  })}
                </KartBasligi>
              </KartUstu>
              <KartIcerigi>
                <SatirTablosu
                  baslik={doldur(metin("eklenti.excel.ekran.hatalilarBaslik"), {
                    sayi: ice.sayilar.hatali,
                  })}
                  sutunlar={[
                    metin("eklenti.excel.ekran.sutunSatir"),
                    metin("eklenti.excel.ekran.sutunUrun"),
                    metin("eklenti.excel.ekran.sutunSorun"),
                  ]}
                  satirlar={ice.hatalilar.map((h) => [h.satir, h.ad, h.sorun])}
                />
                {ice.hatalilarFazla === undefined ? null : (
                  <p className="m-0 mt-2 text-kucuk text-soluk-yazi">{ice.hatalilarFazla}</p>
                )}
              </KartIcerigi>
            </Kart>
          ) : null}
          {onizlemede && ice.degisecekler.length > 0 ? (
            <Kart role="region" aria-labelledby={`${kimlik}-degisen`}>
              <KartUstu>
                <KartBasligi duzey={2} id={`${kimlik}-degisen`}>
                  {metin("eklenti.excel.ekran.degiseceklerBaslik")}
                </KartBasligi>
              </KartUstu>
              <KartIcerigi>
                <SatirTablosu
                  baslik={metin("eklenti.excel.ekran.degiseceklerBaslik")}
                  sutunlar={[
                    metin("eklenti.excel.ekran.sutunUrun"),
                    metin("eklenti.excel.ekran.sutunAlan"),
                    metin("eklenti.excel.ekran.sutunSimdi"),
                    metin("eklenti.excel.ekran.sutunYeni"),
                  ]}
                  satirlar={ice.degisecekler.map((d) => [d.ad, d.alan, d.simdi, d.yeni])}
                />
                {ice.degiseceklerFazla === undefined ? null : (
                  <p className="m-0 mt-2 text-kucuk text-soluk-yazi">{ice.degiseceklerFazla}</p>
                )}
              </KartIcerigi>
            </Kart>
          ) : null}
          {onizlemede && ice.eklenecekler.length > 0 ? (
            <Kart role="region" aria-labelledby={`${kimlik}-eklenen`}>
              <KartUstu>
                <KartBasligi duzey={2} id={`${kimlik}-eklenen`}>
                  {metin("eklenti.excel.ekran.eklenecekBaslik")}
                </KartBasligi>
              </KartUstu>
              <KartIcerigi>
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
                  {ice.eklenecekler.map((ad, i) => (
                    // Aynı ad iki satırda olabilir (iki birleşim): sıra anahtara girer.
                    // biome-ignore lint/suspicious/noArrayIndexKey: satırlar sunucunun sırasıyla gelir, yer değiştirmez.
                    <li key={`${i}-${ad}`}>{ad}</li>
                  ))}
                </ul>
              </KartIcerigi>
            </Kart>
          ) : null}
          {onizlemede ? (
            <div className="flex flex-wrap items-center gap-3">
              <Dugme
                aria-disabled={!uygulanabilir || gonderiliyor}
                {...(uygulanabilir ? {} : { "aria-describedby": uygulaNedenKimligi })}
                onClick={() => void uygula()}
              >
                {ice.uygulaYazisi}
              </Dugme>
              <Dugme tur="sade" aria-disabled={gonderiliyor} onClick={() => void vazgec()}>
                {metin("eklenti.excel.ekran.vazgec")}
              </Dugme>
              {uygulanabilir ? null : (
                <p id={uygulaNedenKimligi} className="m-0 text-kucuk text-tehlike-yazi">
                  {metin(
                    ice.hataliSayisi > 0
                      ? "eklenti.excel.ekran.uygulaHatali"
                      : "eklenti.excel.ekran.uygulaDegisiklikYok",
                  )}
                </p>
              )}
            </div>
          ) : null}
          {onizlemede && veri.iceAktarabilir ? dosyaSecimi : null}
          {uygulanirken ? (
            <Kart role="region" aria-labelledby={`${kimlik}-uygulaniyor`} className="p-4">
              <KartBasligi duzey={2} id={`${kimlik}-uygulaniyor`}>
                {metin("eklenti.excel.ekran.uygulaniyor")}
              </KartBasligi>
              <div className="mt-3 flex flex-col gap-2">
                <IlerlemeCubugu
                  oran={
                    ice.ilerleme.toplam === 0 ? 0 : ice.ilerleme.uygulanan / ice.ilerleme.toplam
                  }
                  etiket={metin("eklenti.excel.ekran.ilerlemeEtiketi")}
                />
                <p className="m-0 text-kucuk text-soluk-yazi">{ice.ilerleme.yazi}</p>
              </div>
            </Kart>
          ) : null}
          {bitti ? (
            <>
              <Uyari tur="basari">{metin("eklenti.excel.ekran.bitti")}</Uyari>
              <ul
                className="m-0 grid list-none grid-cols-3 gap-3 p-0"
                aria-label={metin("eklenti.excel.ekran.uygulandi")}
              >
                {(
                  [
                    ["degisecek", ice.sonuc.degisti],
                    ["eklenecek", ice.sonuc.eklendi],
                    ["uygulanamadi", ice.sonuc.uygulanamadi],
                  ] as const
                ).map(([ad, sayi]) => (
                  <li key={ad}>
                    <Kart className="flex flex-col gap-1 p-4">
                      <span className="text-kucuk text-soluk-yazi">
                        {metin(`eklenti.excel.ekran.${ad}`)}
                      </span>
                      <strong className="text-baslik-3">{sayi}</strong>
                    </Kart>
                  </li>
                ))}
              </ul>
              {ice.uygulanamayanlar.length > 0 ? (
                <Kart role="region" aria-labelledby={`${kimlik}-uygulanamayan`}>
                  <KartUstu>
                    <KartBasligi duzey={2} id={`${kimlik}-uygulanamayan`}>
                      {metin("eklenti.excel.ekran.uygulanamayanlarBaslik")}
                    </KartBasligi>
                  </KartUstu>
                  <KartIcerigi>
                    <SatirTablosu
                      baslik={metin("eklenti.excel.ekran.uygulanamayanlarBaslik")}
                      sutunlar={[
                        metin("eklenti.excel.ekran.sutunSatir"),
                        metin("eklenti.excel.ekran.sutunUrun"),
                        metin("eklenti.excel.ekran.sutunSorun"),
                      ]}
                      satirlar={ice.uygulanamayanlar.map((h) => [h.satir, h.ad, h.sorun])}
                    />
                  </KartIcerigi>
                </Kart>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Baglanti href={urunlerAdresi} gorunum="cerceveli">
                  {metin("eklenti.excel.ekran.urunlereDon")}
                </Baglanti>
                {veri.iceAktarabilir ? dosyaSecimi : null}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// Önizlemenin küçük tablosu: telefonda kendi kabında kayar, klavyeyle de kaydırılır (adlı bölge).
function SatirTablosu({
  baslik,
  sutunlar,
  satirlar,
}: {
  baslik: string;
  sutunlar: string[];
  satirlar: string[][];
}) {
  return (
    <section
      aria-label={baslik}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılan bölge odak almalıdır (WCAG 2.1.1).
      tabIndex={0}
      className="relative min-w-0 overflow-x-auto"
    >
      <Tablo>
        <TabloBasligi className="sr-only">{baslik}</TabloBasligi>
        <TabloUstu>
          <TabloSatiri>
            {sutunlar.map((sutun) => (
              <TabloBasHucresi key={sutun} scope="col">
                {sutun}
              </TabloBasHucresi>
            ))}
          </TabloSatiri>
        </TabloUstu>
        <TabloGovdesi>
          {satirlar.map((satir, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: satırlar sunucunun sırasıyla gelir, yer değiştirmez.
            <TabloSatiri key={i}>
              {satir.map((hucre, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: sütunlar sabittir.
                <TabloHucresi key={j}>{hucre}</TabloHucresi>
              ))}
            </TabloSatiri>
          ))}
        </TabloGovdesi>
      </Tablo>
    </section>
  );
}
