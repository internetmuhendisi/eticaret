"use client";
// Ürün ekranının seçenekler bölümü (kart 0264, karar 0163; taslak: planlar/tasarim-yonu/panel.html, u-secenek). Ürünün
// formunun parçasıdır, "Kaydet" ürünle birlikte kaydeder (karar 0162).
//
// - Seçenek (Beden) ve değerleri (S, M) eklenir, adı değişir, sıralanır, çıkarılır. Taslağın değer "çipleri" yerine
//   sıralanabilir satırlar: kart değerlerin sıralanmasını ister.
// - Birleşimler bütün değerlerin birleşimidir, kendiliğinden kurulur (varyant-formu.ts); tabloda her birleşimin
//   görseli (ürünün galerisinden), stok kodu, barkodu ve ağırlığı. Fiyat ve stok sütunları kart 0265'tedir.
// - Kayıtlı değeri ya da seçeneği çıkarmak birleşimleri siler: onay penceresi kaç birleşimin silineceğini söyler,
//   yalnız silme izni olana görünür (urun.sil; uç da denetler). Yeni eklenen satır sorulmadan çıkar.
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import {
  Pencere,
  PencereAciklamasi,
  PencereBasligi,
  PencereIcerigi,
  PencereTetikleyici,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { SiralanabilirListe } from "../../../bilesenler/parcalar/siralanabilir-liste";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { varyantSinirlari } from "../../kayitlar/urun";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { AlanKabi, PanelAlani, usePanelFormuBaglami } from "../form/panel-formu";
import { panelGorseliAdresi } from "../gorsel-secimi";
import type { UrunEkraniVerisi } from "./urun-verisi";
import {
  type BirlesimFormu,
  type BirlesimSatiri,
  birlesimleriBudar,
  silinecekBirlesimSayisi,
  type VaryantDegeriFormu,
  type VaryantFormu,
  type VaryantSecenegiFormu,
} from "./varyant-formu";

const yeniAnahtar = () => `yeni-${crypto.randomUUID()}`;

type Cikarma =
  | { tur: "deger"; secenek: VaryantSecenegiFormu; deger: VaryantDegeriFormu; sayi: number }
  | { tur: "secenek"; secenek: VaryantSecenegiFormu; sayi: number };

export function SeceneklerBolumu({
  varyant,
  bilinen,
  satirlar,
  degistir,
  izinli,
  silebilir,
  agirlikBirimi,
  galeri,
}: {
  varyant: VaryantFormu;
  bilinen: VaryantFormu;
  satirlar: readonly BirlesimSatiri[];
  degistir: (yeni: VaryantFormu) => void;
  izinli: boolean;
  silebilir: boolean;
  agirlikBirimi: string;
  galeri: UrunEkraniVerisi["galeriGorselleri"];
}) {
  const metin = usePanelMetni();
  const { hata } = usePanelFormuBaglami();
  const [cikarma, setCikarma] = useState<Cikarma | null>(null);
  // Eklenen ya da çıkarılan satırdan sonra odaklanacak öğe (data-odak değeri).
  const odaklanacak = useRef<string | null>(null);
  useEffect(() => {
    if (odaklanacak.current === null) return;
    const oge = document.querySelector<HTMLElement>(
      `[data-odak="${odaklanacak.current}"] input, [data-odak="${odaklanacak.current}"]:is(button), span[data-odak="${odaklanacak.current}"] button:not(:disabled)`,
    );
    if (oge !== null) {
      oge.focus();
      odaklanacak.current = null;
    }
  });

  const { secenekler } = varyant;
  const secenekAdi = (secenek: VaryantSecenegiFormu) =>
    secenek.ad.trim() === ""
      ? doldur(metin("yonetim.urunEkrani.secenek.sira"), {
          sira: String(secenekler.indexOf(secenek) + 1),
        })
      : secenek.ad;
  const degerAdi = (secenek: VaryantSecenegiFormu, deger: VaryantDegeriFormu) =>
    deger.ad.trim() === ""
      ? doldur(metin("yonetim.urunEkrani.secenek.degerSirasi"), {
          sira: String(secenek.degerler.indexOf(deger) + 1),
        })
      : deger.ad;
  const seceneginiDegistir = (secenek: VaryantSecenegiFormu, yeni: Partial<VaryantSecenegiFormu>) =>
    degistir({
      ...varyant,
      secenekler: secenekler.map((s) => (s === secenek ? { ...s, ...yeni } : s)),
    });

  const secenekEkle = () => {
    const deger = { anahtar: yeniAnahtar(), ad: "" };
    const secenek = { anahtar: yeniAnahtar(), ad: "", degerler: [deger] };
    odaklanacak.current = `secenek-${secenek.anahtar}`;
    degistir({ ...varyant, secenekler: [...secenekler, secenek] });
  };
  const degerEkle = (secenek: VaryantSecenegiFormu) => {
    const deger = { anahtar: yeniAnahtar(), ad: "" };
    odaklanacak.current = `deger-${deger.anahtar}`;
    seceneginiDegistir(secenek, { degerler: [...secenek.degerler, deger] });
  };
  // Çıkarılan değerin yerine odak sonrakine, yoksa öncekine geçer.
  const degeriCikar = (secenek: VaryantSecenegiFormu, deger: VaryantDegeriFormu) => {
    const sira = secenek.degerler.indexOf(deger);
    const komsu = secenek.degerler[sira + 1] ?? secenek.degerler[sira - 1];
    odaklanacak.current =
      komsu === undefined ? `deger-ekle-${secenek.anahtar}` : `deger-${komsu.anahtar}`;
    degistir({
      secenekler: secenekler.map((s) =>
        s === secenek ? { ...s, degerler: s.degerler.filter((d) => d !== deger) } : s,
      ),
      birlesimler: birlesimleriBudar(varyant.birlesimler, [deger.anahtar]),
    });
  };
  const secenegiCikar = (secenek: VaryantSecenegiFormu) => {
    const sira = secenekler.indexOf(secenek);
    const komsu = secenekler[sira + 1] ?? secenekler[sira - 1];
    odaklanacak.current = komsu === undefined ? "secenek-ekle" : `secenek-${komsu.anahtar}`;
    degistir({
      secenekler: secenekler.filter((s) => s !== secenek),
      birlesimler: birlesimleriBudar(
        varyant.birlesimler,
        secenek.degerler.map((d) => d.anahtar),
      ),
    });
  };
  // Kayıtlı ve birleşimi olan değer ya da seçenek önce sorulur.
  const degeriSor = (secenek: VaryantSecenegiFormu, deger: VaryantDegeriFormu) => {
    const sayi = deger.kimlik === undefined ? 0 : silinecekBirlesimSayisi(bilinen, deger.anahtar);
    if (sayi === 0) degeriCikar(secenek, deger);
    else setCikarma({ tur: "deger", secenek, deger, sayi });
  };
  const secenegiSor = (secenek: VaryantSecenegiFormu) => {
    const sayi =
      secenek.kimlik === undefined
        ? 0
        : secenek.degerler.reduce((t, d) => t + silinecekBirlesimSayisi(bilinen, d.anahtar), 0);
    if (sayi === 0) secenegiCikar(secenek);
    else setCikarma({ tur: "secenek", secenek, sayi });
  };
  const cikarilabilir = (kayitli: boolean) => izinli && (silebilir || !kayitli);

  const degerSatiri = (secenek: VaryantSecenegiFormu, deger: VaryantDegeriFormu) => {
    const i = secenekler.indexOf(secenek);
    const j = secenek.degerler.indexOf(deger);
    return (
      <div data-odak={`deger-${deger.anahtar}`} className="flex min-w-0 flex-1 items-start gap-2">
        {/* Değerin adı ekran okuyucu adıdır: görünen etiket her satırda tekrarlanmaz (taslağın kısa satırları). */}
        <EtiketsizAlan
          ad={`secenekler.${i}.degerler.${j}`}
          etiket={doldur(metin("yonetim.urunEkrani.secenek.deger"), {
            secenek: secenekAdi(secenek),
            sira: String(j + 1),
          })}
          deger={deger.ad}
          zorunlu
          disabled={!izinli}
          degistir={(ad) =>
            seceneginiDegistir(secenek, {
              degerler: secenek.degerler.map((d) => (d === deger ? { ...d, ad } : d)),
            })
          }
          className="min-w-0 flex-1"
        />
        {/* Seçeneğin son değeri çıkarılmaz: seçenek silinir. */}
        {secenek.degerler.length > 1 && cikarilabilir(deger.kimlik !== undefined) ? (
          <IkonDugmesi
            ikon="kapat"
            etiket={doldur(metin("yonetim.urunEkrani.secenek.degerKaldir"), {
              secenek: secenekAdi(secenek),
              deger: degerAdi(secenek, deger),
            })}
            onClick={() => degeriSor(secenek, deger)}
          />
        ) : null}
      </div>
    );
  };

  // Seçenek bir yer yukarı ya da aşağı: odak aynı düğmede kalır, düğme kapandıysa (ilk ya da son sıra) ötekinde.
  const secenegiTasi = (secenek: VaryantSecenegiFormu, yon: -1 | 1) => {
    const i = secenekler.indexOf(secenek);
    const yeni = [...secenekler];
    yeni.splice(i, 1);
    yeni.splice(i + yon, 0, secenek);
    const sinirda = i + yon === 0 || i + yon === secenekler.length - 1;
    const kalan = (yon === -1) === !sinirda ? "yukari" : "asagi";
    odaklanacak.current = `secenek-${kalan}-${secenek.anahtar}`;
    degistir({ ...varyant, secenekler: yeni });
  };
  const sirala = siralamaMetinleri(metin);

  // Seçenekler ayrı kartlardır, sırası kartın başlığındaki yukarı ve aşağı al düğmeleriyle değişir: değerlerin
  // sıralanabilir listesi iç içe girintiye düşmez, telefonda değerin alanı daralmaz (taslakla karşılaştırma).
  const secenekSatiri = (secenek: VaryantSecenegiFormu) => {
    const i = secenekler.indexOf(secenek);
    return (
      <li
        key={secenek.anahtar}
        className="flex min-w-0 flex-col gap-3 rounded-orta border border-kenar p-3"
      >
        <div data-odak={`secenek-${secenek.anahtar}`} className="flex items-end gap-1">
          <div className="min-w-0 flex-1">
            <PanelAlani
              ad={`secenekler.${i}.ad`}
              etiket={doldur(metin("yonetim.urunEkrani.secenek.ad"), { sira: String(i + 1) })}
              zorunlu
            >
              {(alan) => (
                <GirisAlani
                  {...alan}
                  autoComplete="off"
                  value={secenek.ad}
                  disabled={!izinli}
                  onChange={(olay) => seceneginiDegistir(secenek, { ad: olay.target.value })}
                />
              )}
            </PanelAlani>
          </div>
          {izinli && secenekler.length > 1 ? (
            <>
              <span data-odak={`secenek-yukari-${secenek.anahtar}`} className="flex">
                <IkonDugmesi
                  ikon="yukari-al"
                  etiket={sirala.yukari(secenekAdi(secenek))}
                  disabled={i === 0}
                  onClick={() => secenegiTasi(secenek, -1)}
                />
              </span>
              <span data-odak={`secenek-asagi-${secenek.anahtar}`} className="flex">
                <IkonDugmesi
                  ikon="asagi-al"
                  etiket={sirala.asagi(secenekAdi(secenek))}
                  disabled={i === secenekler.length - 1}
                  onClick={() => secenegiTasi(secenek, 1)}
                />
              </span>
            </>
          ) : null}
          {cikarilabilir(secenek.kimlik !== undefined) ? (
            <IkonDugmesi
              ikon="sil"
              etiket={doldur(metin("yonetim.urunEkrani.secenek.sil"), { ad: secenekAdi(secenek) })}
              onClick={() => secenegiSor(secenek)}
            />
          ) : null}
        </div>
        <SiraliListe
          ogeler={secenek.degerler}
          anahtar={(d) => d.anahtar}
          ad={(d) => degerAdi(secenek, d)}
          etiket={doldur(metin("yonetim.urunEkrani.secenek.degerler"), {
            ad: secenekAdi(secenek),
          })}
          siralanabilir={izinli}
          siralaninca={(yeni) => seceneginiDegistir(secenek, { degerler: yeni })}
          satir={(d) => degerSatiri(secenek, d)}
        />
        {izinli ? (
          <Dugme
            tur="sade"
            className="self-start"
            data-odak={`deger-ekle-${secenek.anahtar}`}
            disabled={secenek.degerler.length >= varyantSinirlari.deger}
            onClick={() => degerEkle(secenek)}
          >
            <Ikon ad="ekle" />
            {doldur(metin("yonetim.urunEkrani.secenek.degerEkle"), { ad: secenekAdi(secenek) })}
          </Dugme>
        ) : null}
      </li>
    );
  };

  const sonSecenek = cikarma?.tur === "secenek" && secenekler.length === 1;
  return (
    <>
      <AlanKabi ad="secenekler" etiket={metin("yonetim.urunEkrani.bolum.secenekler")}>
        <div className="flex flex-col gap-4">
          {hata("secenekler") === undefined ? null : (
            <Uyari tur="tehlike">{hata("secenekler")}</Uyari>
          )}
          {secenekler.length === 0 ? (
            <p className="text-kucuk">{metin("yonetim.urunEkrani.secenek.yok")}</p>
          ) : (
            <ol
              aria-label={metin("yonetim.urunEkrani.secenek.liste")}
              className="m-0 flex list-none flex-col gap-3 p-0"
            >
              {secenekler.map(secenekSatiri)}
            </ol>
          )}
          {izinli ? (
            secenekler.length >= varyantSinirlari.secenek ? (
              <p className="text-kucuk text-soluk-yazi">
                {doldur(metin("yonetim.urun.hata.secenek-siniri"), {
                  sinir: String(varyantSinirlari.secenek),
                })}
              </p>
            ) : (
              <Dugme
                tur="cerceveli"
                className="self-start"
                data-odak="secenek-ekle"
                onClick={secenekEkle}
              >
                <Ikon ad="ekle" />
                {metin("yonetim.urunEkrani.secenek.ekle")}
              </Dugme>
            )
          ) : null}
          <p className="text-kucuk text-soluk-yazi">
            {metin(
              bilinen.secenekler.length === 0
                ? "yonetim.urunEkrani.secenek.ekleAciklamasi"
                : "yonetim.urunEkrani.secenek.ekleVaryantli",
            )}
          </p>
        </div>
      </AlanKabi>
      {satirlar.length === 0 ? null : (
        <BirlesimTablosu
          varyant={varyant}
          satirlar={satirlar}
          degistir={degistir}
          izinli={izinli}
          agirlikBirimi={agirlikBirimi}
          galeri={galeri}
          birlesimAdi={(satir) =>
            satir.degerler
              .map((deger) => {
                const secenek = secenekler.find((s) => s.degerler.includes(deger));
                return secenek === undefined ? deger.ad : degerAdi(secenek, deger);
              })
              .join(" / ")
          }
        />
      )}
      <OnayPenceresi
        acik={cikarma !== null}
        acikDegisince={(acik) => {
          if (!acik) setCikarma(null);
        }}
        baslik={
          cikarma === null
            ? ""
            : cikarma.tur === "deger"
              ? doldur(metin("yonetim.urunEkrani.secenek.cikarOnay.degerBaslik"), {
                  ad: degerAdi(cikarma.secenek, cikarma.deger),
                })
              : doldur(metin("yonetim.urunEkrani.secenek.cikarOnay.secenekBaslik"), {
                  ad: secenekAdi(cikarma.secenek),
                })
        }
        aciklama={
          cikarma === null
            ? ""
            : doldur(
                metin(
                  sonSecenek
                    ? "yonetim.urunEkrani.secenek.cikarOnay.aciklamaSon"
                    : "yonetim.urunEkrani.secenek.cikarOnay.aciklama",
                ),
                { sayi: String(cikarma.sayi) },
              )
        }
        onayEtiketi={metin(
          cikarma?.tur === "secenek"
            ? "yonetim.urunEkrani.secenek.cikarOnay.secenekOnay"
            : "yonetim.urunEkrani.secenek.cikarOnay.degerOnay",
        )}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={() => {
          if (cikarma === null) return;
          if (cikarma.tur === "deger") degeriCikar(cikarma.secenek, cikarma.deger);
          else secenegiCikar(cikarma.secenek);
        }}
        tur="tehlike"
      />
    </>
  );
}

// Değiştirme izni olan sıralar (sürükleme, klavye, yukarı ve aşağı al); olmayan yalnız okur.
function SiraliListe<T>({
  ogeler,
  anahtar,
  ad,
  etiket,
  siralanabilir,
  siralaninca,
  satir,
}: {
  ogeler: readonly T[];
  anahtar: (oge: T) => string;
  ad: (oge: T) => string;
  etiket: string;
  siralanabilir: boolean;
  siralaninca: (yeni: T[]) => void;
  satir: (oge: T) => ReactNode;
}) {
  const metin = usePanelMetni();
  if (siralanabilir) {
    return (
      <SiralanabilirListe
        ogeler={ogeler}
        anahtar={anahtar}
        ad={ad}
        etiket={etiket}
        metinler={siralamaMetinleri(metin)}
        siralaninca={siralaninca}
        hizalama="ust"
        className="rounded-orta border border-kenar"
        satir={(oge) => satir(oge)}
      />
    );
  }
  return (
    <ol
      aria-label={etiket}
      className="m-0 flex list-none flex-col rounded-orta border border-kenar p-0"
    >
      {ogeler.map((oge) => (
        <li key={anahtar(oge)} className="flex border-b border-kenar p-3 last:border-b-0">
          {satir(oge)}
        </li>
      ))}
    </ol>
  );
}

function BirlesimTablosu({
  varyant,
  satirlar,
  degistir,
  izinli,
  agirlikBirimi,
  galeri,
  birlesimAdi,
}: {
  varyant: VaryantFormu;
  satirlar: readonly BirlesimSatiri[];
  degistir: (yeni: VaryantFormu) => void;
  izinli: boolean;
  agirlikBirimi: string;
  galeri: UrunEkraniVerisi["galeriGorselleri"];
  birlesimAdi: (satir: BirlesimSatiri) => string;
}) {
  const metin = usePanelMetni();
  const alaniDegistir = (satir: BirlesimSatiri, yeni: Partial<BirlesimFormu>) =>
    degistir({
      ...varyant,
      birlesimler: { ...varyant.birlesimler, [satir.anahtar]: { ...satir.alanlar, ...yeni } },
    });
  const hucre = (
    satir: BirlesimSatiri,
    k: number,
    alan: "stokKodu" | "barkod" | "agirlik",
    etiket: string,
  ) => (
    <EtiketsizAlan
      ad={`birlesimler.${k}.${alan}`}
      etiket={doldur(metin("yonetim.urunEkrani.secenek.hucre"), {
        alan: etiket,
        birlesim: birlesimAdi(satir),
      })}
      deger={satir.alanlar[alan]}
      disabled={!izinli}
      degistir={(deger) => alaniDegistir(satir, { [alan]: deger })}
      // Tablo içeriği kadar geniştir, telefonda kendi kabında kayar (taslak); sütunun genişliği alanın harf sayısıdır.
      boyut={alan === "stokKodu" ? 16 : alan === "barkod" ? 13 : 6}
      {...(alan === "agirlik" ? { inputMode: "decimal" as const } : {})}
    />
  );
  const agirlikEtiketi = doldur(metin("yonetim.urunEkrani.secenek.sutun.agirlik"), {
    birim: agirlikBirimi,
  });
  return (
    // min-w-0: içerik kadar geniş tablo kartı genişletmez, kendi kabında kayar (telefonda yana kayma olmaz).
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-kucuk font-kalin">
        {doldur(metin("yonetim.urunEkrani.secenek.birlesimler"), {
          sayi: String(satirlar.length),
        })}
      </h3>
      <div className="min-w-0 overflow-x-auto">
        <Tablo className="w-max min-w-full">
          <TabloBasligi className="sr-only">
            {metin("yonetim.urunEkrani.secenek.birlesimTablosu")}
          </TabloBasligi>
          <TabloUstu>
            <TabloSatiri className="text-kucuk text-soluk-yazi">
              <TabloBasHucresi scope="col" className="pr-2 pb-2 text-left font-kalin">
                {metin("yonetim.urunEkrani.secenek.sutun.gorsel")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="px-2 pb-2 text-left font-kalin">
                {metin("yonetim.urunEkrani.secenek.sutun.birlesim")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="px-2 pb-2 text-left font-kalin">
                {metin("yonetim.urunEkrani.stokKodu")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="px-2 pb-2 text-left font-kalin">
                {metin("yonetim.urunEkrani.barkod")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="pb-2 pl-2 text-left font-kalin">
                {agirlikEtiketi}
              </TabloBasHucresi>
            </TabloSatiri>
          </TabloUstu>
          <TabloGovdesi>
            {satirlar.map((satir, k) => (
              <TabloSatiri key={satir.anahtar} className="last:border-b-0">
                <TabloHucresi className="py-2 pr-2 align-top">
                  <BirlesimGorseli
                    ad={birlesimAdi(satir)}
                    alan={`birlesimler.${k}.gorsel`}
                    secili={satir.alanlar.gorsel}
                    galeri={galeri}
                    izinli={izinli}
                    sec={(gorsel) => alaniDegistir(satir, { gorsel })}
                  />
                </TabloHucresi>
                <TabloHucresi className="px-2 py-2 align-top font-kalin whitespace-nowrap">
                  <span className="flex min-h-11 items-center">{birlesimAdi(satir)}</span>
                </TabloHucresi>
                <TabloHucresi className="px-2 py-2 align-top">
                  {hucre(satir, k, "stokKodu", metin("yonetim.urunEkrani.stokKodu"))}
                </TabloHucresi>
                <TabloHucresi className="px-2 py-2 align-top">
                  {hucre(satir, k, "barkod", metin("yonetim.urunEkrani.barkod"))}
                </TabloHucresi>
                <TabloHucresi className="py-2 pl-2 align-top">
                  {hucre(satir, k, "agirlik", agirlikEtiketi)}
                </TabloHucresi>
              </TabloSatiri>
            ))}
          </TabloGovdesi>
        </Tablo>
      </div>
      <p className="text-kucuk text-soluk-yazi">
        {metin("yonetim.urunEkrani.secenek.birlesimlerAciklamasi")}
      </p>
    </div>
  );
}

// Birleşimin görseli: ürünün galerisindeki görsellerden biri ya da hiçbiri (ana görsel gösterilir). Düğme küçük
// önizlemeyi gösterir, basınca galeri pencerede açılır; seçince pencere kapanır, odak düğmeye döner.
function BirlesimGorseli({
  ad,
  alan,
  secili,
  galeri,
  izinli,
  sec,
}: {
  ad: string;
  alan: string;
  secili: string | null;
  galeri: UrunEkraniVerisi["galeriGorselleri"];
  izinli: boolean;
  sec: (gorsel: string | null) => void;
}) {
  const metin = usePanelMetni();
  const { hata } = usePanelFormuBaglami();
  const [acik, setAcik] = useState(false);
  const gorsel = galeri.find((oge) => oge.kimlik === secili);
  const metni = hata(alan);
  return (
    <AlanKabi ad={alan} etiket={doldur(metin("yonetim.urunEkrani.secenek.gorselSec"), { ad })}>
      <Pencere open={acik} onOpenChange={setAcik}>
        <PencereTetikleyici asChild>
          <Dugme
            tur="cerceveli"
            className="size-11 p-0"
            disabled={!izinli}
            aria-label={doldur(
              metin(
                gorsel === undefined
                  ? "yonetim.urunEkrani.secenek.gorselSec"
                  : "yonetim.urunEkrani.secenek.gorselSecili",
              ),
              { ad, gorsel: gorsel?.ad ?? "" },
            )}
            aria-invalid={metni === undefined ? undefined : true}
          >
            {gorsel === undefined ? (
              <Ikon ad="gorsel" />
            ) : (
              // biome-ignore lint/performance/noImgElement: panelin küçük önizlemesi, boyutu uçtan gelir.
              <img
                src={panelGorseliAdresi(gorsel.dosya)}
                alt=""
                className="size-full rounded-kucuk object-cover"
              />
            )}
          </Dugme>
        </PencereTetikleyici>
        <PencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} genislik="orta">
          <PencereUstu>
            <PencereBasligi>
              {doldur(metin("yonetim.urunEkrani.secenek.gorselPencere.baslik"), { ad })}
            </PencereBasligi>
            <PencereAciklamasi>
              {metin("yonetim.urunEkrani.secenek.gorselPencere.aciklama")}
            </PencereAciklamasi>
          </PencereUstu>
          {galeri.length === 0 ? (
            <p>{metin("yonetim.urunEkrani.secenek.gorselPencere.bos")}</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 tablet:grid-cols-5">
              <li>
                <Dugme
                  tur="sade"
                  aria-pressed={secili === null}
                  className="flex aspect-square h-auto w-full flex-col p-1 text-kucuk aria-pressed:ring-2 aria-pressed:ring-yazi"
                  onClick={() => {
                    sec(null);
                    setAcik(false);
                  }}
                >
                  <Ikon ad="gorsel" />
                  {metin("yonetim.urunEkrani.secenek.gorselPencere.anaGorsel")}
                </Dugme>
              </li>
              {galeri.map((oge) => (
                <li key={oge.kimlik}>
                  <Dugme
                    tur="sade"
                    aria-label={oge.ad}
                    aria-pressed={oge.kimlik === secili}
                    className="h-auto w-full p-1 aria-pressed:ring-2 aria-pressed:ring-yazi"
                    onClick={() => {
                      sec(oge.kimlik);
                      setAcik(false);
                    }}
                  >
                    {/* biome-ignore lint/performance/noImgElement: panelin küçük önizlemesi. */}
                    <img
                      src={panelGorseliAdresi(oge.dosya)}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full rounded-kucuk bg-yuzey object-cover"
                    />
                  </Dugme>
                </li>
              ))}
            </ul>
          )}
        </PencereIcerigi>
      </Pencere>
      {metni === undefined ? null : (
        <span className="mt-1 block text-kucuk font-kalin text-tehlike-yazi">{metni}</span>
      )}
    </AlanKabi>
  );
}

// Görünen etiketi olmayan giriş alanı (birleşim tablosunun hücresi, seçeneğin değeri): adı ekran okuyucuya, hatası
// alanın altına; hata özeti ve odak ortak form yapısından (AlanKabi, tek girişi odaklanır).
function EtiketsizAlan({
  ad,
  etiket,
  deger,
  degistir,
  disabled,
  zorunlu,
  boyut,
  inputMode,
  className,
}: {
  ad: string;
  etiket: string;
  deger: string;
  degistir: (deger: string) => void;
  disabled: boolean;
  zorunlu?: boolean;
  boyut?: number;
  inputMode?: "decimal";
  className?: string;
}) {
  const { hata } = usePanelFormuBaglami();
  const metni = hata(ad);
  const hataKimligi = `${ad}-hata`;
  return (
    <AlanKabi ad={ad} etiket={etiket} {...(className === undefined ? {} : { className })}>
      <GirisAlani
        aria-label={etiket}
        autoComplete="off"
        value={deger}
        disabled={disabled}
        {...(zorunlu === true ? { "aria-required": true } : {})}
        {...(boyut === undefined ? {} : { size: boyut })}
        {...(inputMode === undefined ? {} : { inputMode })}
        aria-invalid={metni === undefined ? undefined : true}
        aria-describedby={metni === undefined ? undefined : hataKimligi}
        onChange={(olay) => degistir(olay.target.value)}
        // Boyutu verilmeyen alan kabını doldurur (değer satırı); verilen harf sayısı kadardır (tablo hücresi).
        {...(boyut === undefined ? { className: "w-full" } : {})}
      />
      {metni === undefined ? null : (
        <span id={hataKimligi} className="mt-1 block text-kucuk font-kalin text-tehlike-yazi">
          {metni}
        </span>
      )}
    </AlanKabi>
  );
}
