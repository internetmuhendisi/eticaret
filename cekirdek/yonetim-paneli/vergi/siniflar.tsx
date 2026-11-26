"use client";
// Vergi sınıfları (kart 0322; blog kategorilerinin kalıbı, kart 0272): kısa liste elle sıralanır (taşınır taşınmaz
// kaydedilir), her satırda düzenle ve sil. Yan pencerede sınıfın adı ve oranları: oran pencerenin içinde eklenir,
// düzenlenir ve onayla silinir. Sınıf silme onayı kaç ürünün bağlı olduğunu söyler; ürünler silinmiş sınıfın oranlarıyla
// vergilenmeye devam eder (karar 0060). Her değişiklik hemen yayınlanır, verisi sunucudan yeniden okunur.
import { useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { useCizimdenSonraOdak } from "../../../bilesenler/parcalar/cizimden-sonra-odak";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart, KartBasligi, KartUstu } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
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
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { YukleniyorGostergesi } from "../../../bilesenler/parcalar/yukleniyor";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siralamaMetinleri } from "../../metinler/siralama-metinleri";
import { vergiHataMetinleri } from "../../moduller/vergi/semalar";
import { panelEylemleri } from "../eylemler";
import { KaydetCubugu, PanelAlani, PanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { kodluHataMetni, useKodluForm } from "../kodlu-form";
import { panelIkonu } from "../panel-ikon";
import { usePanelIslemi } from "../panel-islemi";
import type { VergiEkraniVerisi, VergiOraniSatiri, VergiSinifiSatiri } from "./veri";

const hataMetni = kodluHataMetni(vergiHataMetinleri);
// Oran formunun bölge ve posta kodu hataları da kendi metniyle (servisin bölge kuralı, bolgeler.ts).
const oranHataMetinleri = {
  ...vergiHataMetinleri,
  "posta-kodu-bicimi": "yonetim.vergi.hata.postaKodu",
  "ulke-yok": "yonetim.vergi.hata.bolge",
  "il-yok": "yonetim.vergi.hata.bolge",
  "il-baska-ulkenin": "yonetim.vergi.hata.bolge",
} as const;

// Sınıf penceresindeki "Oran ekle" düğmesi: oran işlemlerinden sonra odak ona döner.
const ekleDugmesi = () => document.querySelector<HTMLElement>("[data-vergi-orani-ekle]");

type Pencere = { tur: "ekle" } | { tur: "duzenle"; kimlik: string } | null;

export function VergiSiniflari({ veri, izinli }: { veri: VergiEkraniVerisi; izinli: boolean }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const { siniflar } = veri;
  const [pencere, setPencere] = useState<Pencere>(null);
  const [onay, setOnay] = useState<VergiSinifiSatiri | null>(null);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  // Pencerede iki form olabilir (sınıfın adı, oran): biri kaydedilmemişse kapatırken sorulur.
  const degisenler = useRef({ sinif: false, oran: false });
  const formDegisti = (form: "sinif" | "oran") => (degisti: boolean) => {
    degisenler.current[form] = degisti;
    degisince(degisenler.current.sinif || degisenler.current.oran);
  };
  // Yeni sınıf eklenince pencere sayfa yenilenene kadar bekler; sınıf gelince odak "Oran ekle"ye geçer. Ortak odak
  // kancası burada kullanılmaz: bekleme sırasında pencere odağı kendi kabına alır, kanca bunu kullanıcının odağı
  // taşıması sayıp isteği bırakırdı.
  const oranaOdak = useRef(false);
  // Sıralama hemen gösterilir, kayıt arkadan; kaydedilemezse sunucunun sırasına dönülür.
  const [yerel, setYerel] = useState<VergiSinifiSatiri[] | null>(null);
  const sonSiralama = useRef(0);
  const anahtar = siniflar.map((s) => `${s.kimlik}:${s.ad}`).join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: sunucunun listesi değişince yerel sıra bırakılır.
  useEffect(() => setYerel(null), [anahtar]);
  const liste = yerel ?? siniflar;
  // Sayfa yenilenince odaklanacak satır (kimliği; "" ise "ekle" düğmesi): silinen satır kalkar, odak kaybolmasın.
  const odaklanacak = useRef<string | null>(null);
  const silindi = useRef(false);
  useEffect(() => {
    const hedef = odaklanacak.current;
    if (hedef === null || siniflar === undefined) return;
    const oge =
      hedef === ""
        ? document.querySelector<HTMLElement>("[data-vergi-sinifi-ekle]")
        : document.querySelector<HTMLElement>(
            `[data-vergi-sinifi="${hedef}"] button[data-duzenle]`,
          );
    if (oge === null) return;
    odaklanacak.current = null;
    oge.focus();
  }, [siniflar]);

  const duzenlenen =
    pencere?.tur === "duzenle" ? siniflar.find((s) => s.kimlik === pencere.kimlik) : undefined;
  useEffect(() => {
    if (!oranaOdak.current || duzenlenen === undefined) return;
    oranaOdak.current = false;
    ekleDugmesi()?.focus();
  }, [duzenlenen]);
  const ekleAdi = doldur(metin(panelEylemleri.ekle.ad), { ne: metin("yonetim.vergi.sinifTek") });
  const satir = (sinif: VergiSinifiSatiri) => {
    const sira = liste.findIndex((s) => s.kimlik === sinif.kimlik);
    return (
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2"
        data-vergi-sinifi={sinif.kimlik}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
          <span className="font-kalin">{sinif.ad}</span>
          <span className="text-kucuk text-soluk-yazi">
            {doldur(
              metin(sinif.kargo ? "yonetim.vergi.sinifOzetiKargo" : "yonetim.vergi.sinifOzeti"),
              {
                oranlar:
                  sinif.oranlar.length === 0
                    ? metin("yonetim.vergi.oransiz")
                    : sinif.oranlar.length === 1
                      ? (sinif.oranlar[0]?.ozet ?? "")
                      : doldur(metin("yonetim.vergi.oranSayisi"), {
                          sayi: String(sinif.oranlar.length),
                        }),
                urunler: doldur(metin("yonetim.vergi.urunSayisi"), {
                  sayi: String(sinif.urunSayisi),
                }),
              },
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          <IkonDugmesi
            ikon={izinli ? "duzenle" : panelIkonu("goster")}
            data-duzenle=""
            etiket={doldur(metin("yonetim.vergi.sinifDuzenle"), { ad: sinif.ad })}
            onClick={() => setPencere({ tur: "duzenle", kimlik: sinif.kimlik })}
          />
          {izinli ? (
            <IkonDugmesi
              ikon="sil"
              etiket={doldur(metin("yonetim.vergi.sinifSil"), { ad: sinif.ad })}
              onClick={() => {
                odaklanacak.current = (liste[sira + 1] ?? liste[sira - 1])?.kimlik ?? "";
                setOnay(sinif);
              }}
            />
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section aria-labelledby="vergi-siniflari">
      <Kart>
        <KartUstu className="items-center">
          <div className="flex min-w-0 flex-col gap-1">
            <KartBasligi duzey={2} id="vergi-siniflari">
              {metin("yonetim.vergi.siniflar")}
            </KartBasligi>
            <span className="text-kucuk text-soluk-yazi">
              {metin("yonetim.vergi.siniflarAciklamasi")}
            </span>
          </div>
          {izinli && liste.length > 0 ? (
            <Dugme
              tur="cerceveli"
              data-vergi-sinifi-ekle=""
              onClick={() => setPencere({ tur: "ekle" })}
            >
              <Ikon ad={panelEylemleri.ekle.ikon} />
              {ekleAdi}
            </Dugme>
          ) : null}
        </KartUstu>
        {liste.length === 0 ? (
          <BosHal
            ikon={panelIkonu("vergi")}
            duzey={3}
            baslik={metin("yonetim.vergi.sinifBos.baslik")}
            aciklama={metin("yonetim.vergi.sinifBos.aciklama")}
          >
            {izinli ? (
              <Dugme
                tur="birincil"
                data-vergi-sinifi-ekle=""
                onClick={() => setPencere({ tur: "ekle" })}
              >
                {ekleAdi}
              </Dugme>
            ) : null}
          </BosHal>
        ) : izinli ? (
          <SiralanabilirListe
            ogeler={liste}
            anahtar={(sinif) => sinif.kimlik}
            ad={(sinif) => sinif.ad}
            etiket={metin("yonetim.vergi.siniflar")}
            metinler={siralamaMetinleri(metin)}
            siralaninca={(yeni) => {
              setYerel(yeni);
              sonSiralama.current += 1;
              const bu = sonSiralama.current;
              void islem(
                "vergi-siniflari-sirala",
                { kimlikler: yeni.map((sinif) => sinif.kimlik) },
                "yonetim.vergi.siniflarSiralandi",
              ).then((sonuc) => {
                if (!sonuc.tamam && bu === sonSiralama.current) setYerel(null);
              });
            }}
            satir={satir}
          />
        ) : (
          <ol
            aria-label={metin("yonetim.vergi.siniflar")}
            className="m-0 flex list-none flex-col gap-2 p-0"
          >
            {liste.map((sinif) => (
              <li
                key={sinif.kimlik}
                className="flex rounded-orta border border-kenar bg-zemin px-4 py-3"
              >
                {satir(sinif)}
              </li>
            ))}
          </ol>
        )}
        <YanPencere
          open={pencere !== null}
          onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
        >
          {pencere === null ? null : (
            <YanPencereIcerigi
              kapatEtiketi={metin("ortak.parca.kapat")}
              className="tablet:max-w-metin"
            >
              <YanPencereUstu>
                <YanPencereBasligi>
                  {duzenlenen === undefined
                    ? metin("yonetim.vergi.sinifForm.yeni")
                    : metin("yonetim.vergi.sinifForm.duzenle")}
                </YanPencereBasligi>
                <YanPencereAciklamasi>
                  {duzenlenen === undefined
                    ? metin("yonetim.vergi.sinifForm.yeniAciklama")
                    : duzenlenen.ad}
                </YanPencereAciklamasi>
              </YanPencereUstu>
              {soru}
              {pencere.tur === "duzenle" && duzenlenen === undefined ? (
                <YukleniyorGostergesi etiket={metin("ortak.parca.yukleniyor")} />
              ) : izinli ? (
                <SinifFormu
                  key={duzenlenen?.kimlik ?? "yeni"}
                  {...(duzenlenen === undefined ? {} : { sinif: duzenlenen })}
                  islem={islem}
                  kapat={(yeniKimlik) => {
                    if (duzenlenen !== undefined) odaklanacak.current = duzenlenen.kimlik;
                    // Yeni sınıf eklenince pencere onun oranlarına geçer: oransız sınıf vergi uygulamaz. Sayfa
                    // yenilenene kadar pencere bekler, sonra odak "Oran ekle"ye geçer.
                    if (yeniKimlik !== undefined) {
                      formDegisti("sinif")(false);
                      oranaOdak.current = true;
                      setPencere({ tur: "duzenle", kimlik: yeniKimlik });
                    } else kapat();
                  }}
                  vazgec={kapatmayiIste}
                  degisince={formDegisti("sinif")}
                />
              ) : null}
              {duzenlenen === undefined ? null : (
                <Oranlar
                  sinif={duzenlenen}
                  veri={veri}
                  izinli={izinli}
                  islem={islem}
                  degisince={formDegisti("oran")}
                />
              )}
            </YanPencereIcerigi>
          )}
        </YanPencere>
        <OnayPenceresi
          acik={onay !== null}
          acikDegisince={(acik) => {
            if (acik) return;
            if (!silindi.current) odaklanacak.current = null;
            silindi.current = false;
            setOnay(null);
          }}
          baslik={doldur(metin("yonetim.vergi.sinifSilOnay.baslik"), { ad: onay?.ad ?? "" })}
          aciklama={[
            onay === null || onay.urunSayisi === 0
              ? metin("yonetim.vergi.sinifSilOnay.urunsuz")
              : doldur(metin("yonetim.vergi.sinifSilOnay.urunler"), {
                  sayi: String(onay.urunSayisi),
                }),
            onay?.kargo === true ? metin("yonetim.vergi.sinifSilOnay.kargo") : "",
          ]
            .filter((cumle) => cumle !== "")
            .join(" ")}
          onayEtiketi={metin("yonetim.vergi.sil")}
          vazgecEtiketi={metin("ortak.islem.vazgec")}
          onayla={async () => {
            if (onay === null) return;
            const sonuc = await islem(
              "vergi-sinifi-sil",
              { kimlik: onay.kimlik },
              "yonetim.vergi.sinifSilindi",
            );
            if (!sonuc.tamam) odaklanacak.current = null;
            silindi.current = sonuc.tamam;
          }}
        />
      </Kart>
    </section>
  );
}

function SinifFormu({
  sinif,
  islem,
  kapat,
  vazgec,
  degisince,
}: {
  sinif?: VergiSinifiSatiri;
  islem: ReturnType<typeof usePanelIslemi>;
  kapat: (yeniKimlik?: string) => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const [ad, setAd] = useState(sinif?.ad ?? "");
  const [degisti, setDegisti] = useState(false);
  const { pf, kaydet } = useKodluForm(vergiHataMetinleri, ["ad"], degisti, (alan) =>
    alan.replace(/^sinif\./, ""),
  );
  let eklenen: string | undefined;
  const gonder = () => {
    void kaydet(
      async () => {
        if (sinif !== undefined) {
          return islem(
            "vergi-sinifi-degistir",
            { kimlik: sinif.kimlik, sinif: { ad } },
            "yonetim.vergi.sinifKaydedildi",
            { formda: true },
          );
        }
        const sonuc = await islem<{ kimlik: string }>(
          "vergi-sinifi-ekle",
          { sinif: { ad } },
          "yonetim.vergi.sinifEklendi",
          { formda: true },
        );
        if (sonuc.tamam) eklenen = sonuc.veri.kimlik;
        return sonuc;
      },
      () => {
        setDegisti(false);
        degisince(false);
        kapat(eklenen);
      },
    );
  };
  return (
    <PanelFormu durum={pf} gonder={gonder}>
      <PanelAlani ad="ad" etiket={metin("yonetim.vergi.sinifForm.ad")} zorunlu>
        {(alan) => (
          <GirisAlani
            {...alan}
            required
            value={ad}
            onChange={(olay) => {
              setAd(olay.target.value);
              setDegisti(true);
              degisince(true);
            }}
          />
        )}
      </PanelAlani>
      <KaydetCubugu vazgec={vazgec} kaydetEtiketi={metin("ortak.islem.kaydet")} />
    </PanelFormu>
  );
}

type OranPenceresi = { tur: "ekle" } | { tur: "duzenle"; oran: VergiOraniSatiri } | null;

function Oranlar({
  sinif,
  veri,
  izinli,
  islem,
  degisince,
}: {
  sinif: VergiSinifiSatiri;
  veri: VergiEkraniVerisi;
  izinli: boolean;
  islem: ReturnType<typeof usePanelIslemi>;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  // Form kapanınca ve oran silinince odak "Oran ekle"ye geçer (silinen satır sayfa yenilenince kalkar).
  const odakla = useCizimdenSonraOdak();
  // Silinen oranın satırı sayfa yenilenince kalkar: o zaman odak "Oran ekle"ye geçer (onay penceresi odağı kalkacak
  // satırın Sil düğmesine vermişti; ortak odak kancası bunu kullanıcının odağı taşıması sayardı).
  const silinenOran = useRef<string | null>(null);
  useEffect(() => {
    const silinen = silinenOran.current;
    if (silinen === null || sinif.oranlar.some((oran) => oran.kimlik === silinen)) return;
    silinenOran.current = null;
    ekleDugmesi()?.focus();
  }, [sinif.oranlar]);
  const [form, setForm] = useState<OranPenceresi>(null);
  const [onay, setOnay] = useState<VergiOraniSatiri | null>(null);
  const veriVergiAdi = veri.ayarlar.vergiAdi;
  return (
    <section
      aria-labelledby="vergi-oranlari"
      className="flex flex-col gap-3 border-t border-kenar pt-4"
    >
      <div className="flex flex-col gap-1">
        <h3 id="vergi-oranlari" className="text-govde font-kalin">
          {metin("yonetim.vergi.oranlar")}
        </h3>
        <p className="text-kucuk text-soluk-yazi">{metin("yonetim.vergi.oranlarAciklamasi")}</p>
      </div>
      {sinif.oranlar.length === 0 ? (
        <p className="text-kucuk">{metin("yonetim.vergi.oranBos")}</p>
      ) : (
        <section
          aria-label={metin("yonetim.vergi.oranTablosu")}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: kayan tablonun kabı klavyeyle kaydırılır (WCAG 2.1.1).
          tabIndex={0}
          className="relative min-w-0 overflow-x-auto rounded-orta border border-kenar"
        >
          <Tablo className="min-w-full">
            <TabloBasligi className="sr-only">{metin("yonetim.vergi.oranTablosu")}</TabloBasligi>
            <TabloUstu>
              <TabloSatiri>
                {(
                  [
                    "yonetim.vergi.oranForm.ulke",
                    "yonetim.vergi.oranForm.il",
                    "yonetim.vergi.oranForm.postaKodu",
                    "yonetim.vergi.oranForm.oran",
                    "yonetim.vergi.oranForm.ad",
                  ] as const
                ).map((anahtar) => (
                  <TabloBasHucresi
                    key={anahtar}
                    scope="col"
                    className="px-3 py-2 text-left text-kucuk text-soluk-yazi"
                  >
                    {metin(anahtar)}
                  </TabloBasHucresi>
                ))}
                {izinli ? (
                  <TabloBasHucresi scope="col" className="px-3 py-2">
                    <span className="sr-only">{metin("yonetim.vergi.islem")}</span>
                  </TabloBasHucresi>
                ) : null}
              </TabloSatiri>
            </TabloUstu>
            <TabloGovdesi>
              {sinif.oranlar.map((oran) => (
                <TabloSatiri key={oran.kimlik} data-vergi-orani={oran.kimlik}>
                  <TabloBasHucresi scope="row" className="px-3 py-2 text-left font-normal">
                    {oran.ulkeAdi}
                  </TabloBasHucresi>
                  <TabloHucresi className="px-3 py-2">
                    {oran.ilAdi ?? metin("yonetim.vergi.hepsi")}
                  </TabloHucresi>
                  <TabloHucresi className="px-3 py-2">
                    {oran.postaKodu ?? metin("yonetim.vergi.hepsi")}
                  </TabloHucresi>
                  <TabloHucresi className="px-3 py-2 whitespace-nowrap">
                    {doldur(metin("yonetim.vergi.oranYuzdesi"), { oran: oran.oranYazisi })}
                  </TabloHucresi>
                  <TabloHucresi
                    className={oran.ad === "" ? "px-3 py-2 text-soluk-yazi" : "px-3 py-2"}
                  >
                    {oran.ad === "" ? veriVergiAdi : oran.ad}
                  </TabloHucresi>
                  {izinli ? (
                    <TabloHucresi className="px-1 py-1">
                      <span className="flex justify-end">
                        <IkonDugmesi
                          ikon="duzenle"
                          data-duzenle=""
                          etiket={doldur(metin("yonetim.vergi.oranDuzenle"), { ozet: oran.ozet })}
                          onClick={() => setForm({ tur: "duzenle", oran })}
                        />
                        <IkonDugmesi
                          ikon="sil"
                          etiket={doldur(metin("yonetim.vergi.oranSil"), { ozet: oran.ozet })}
                          onClick={() => setOnay(oran)}
                        />
                      </span>
                    </TabloHucresi>
                  ) : null}
                </TabloSatiri>
              ))}
            </TabloGovdesi>
          </Tablo>
        </section>
      )}
      {izinli && form === null ? (
        <Dugme
          tur="cerceveli"
          className="self-start"
          data-vergi-orani-ekle=""
          onClick={() => setForm({ tur: "ekle" })}
        >
          <Ikon ad={panelEylemleri.ekle.ikon} />
          {metin("yonetim.vergi.oranEkle")}
        </Dugme>
      ) : null}
      {izinli && form !== null ? (
        <OranFormu
          key={form.tur === "duzenle" ? form.oran.kimlik : "yeni"}
          sinif={sinif}
          {...(form.tur === "duzenle" ? { oran: form.oran } : {})}
          veri={veri}
          islem={islem}
          degisince={degisince}
          bitti={() => {
            degisince(false);
            setForm(null);
            odakla(ekleDugmesi);
          }}
        />
      ) : null}
      <OnayPenceresi
        acik={onay !== null}
        acikDegisince={(acik) => (acik ? undefined : setOnay(null))}
        baslik={metin("yonetim.vergi.oranSilOnay.baslik")}
        aciklama={onay?.ozet ?? ""}
        onayEtiketi={metin("yonetim.vergi.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          if (onay === null) return;
          const silinen = onay.kimlik;
          const sonuc = await islem(
            "vergi-orani-sil",
            { kimlik: silinen },
            "yonetim.vergi.oranSilindi",
          );
          if (sonuc.tamam) silinenOran.current = silinen;
        }}
      />
    </section>
  );
}

const butunIller = "butun-iller";

function OranFormu({
  sinif,
  oran,
  veri,
  islem,
  bitti,
  degisince,
}: {
  sinif: VergiSinifiSatiri;
  oran?: VergiOraniSatiri;
  veri: VergiEkraniVerisi;
  islem: ReturnType<typeof usePanelIslemi>;
  bitti: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const ilkUlke = oran?.ulke ?? veri.ulkeler[0]?.kod ?? "";
  const [alanlar, setAlanlar] = useState({
    ulke: ilkUlke,
    il: oran?.il ?? "",
    postaKodu: oran?.postaKodu ?? "",
    oran: oran?.oranYazisi ?? "",
    ad: oran?.ad ?? "",
  });
  const [degisti, setDegisti] = useState(false);
  const { pf, kaydet } = useKodluForm(
    oranHataMetinleri,
    ["ulke", "il", "postaKodu", "oran", "ad"],
    degisti,
    (alan) => alan.replace(/^oran\./, ""),
  );
  const degistir = (alan: keyof typeof alanlar, deger: string) => {
    setAlanlar((onceki) => ({ ...onceki, [alan]: deger, ...(alan === "ulke" ? { il: "" } : {}) }));
    setDegisti(true);
    degisince(true);
  };
  const iller = veri.ulkeler.find((ulke) => ulke.kod === alanlar.ulke)?.iller ?? [];
  const gonder = () => {
    const bos = (deger: string) => (deger.trim() === "" ? undefined : deger.trim());
    void kaydet(
      () =>
        oran === undefined
          ? islem(
              "vergi-orani-ekle",
              {
                sinif: sinif.kimlik,
                oran: {
                  ulke: alanlar.ulke,
                  oran: alanlar.oran,
                  ...(bos(alanlar.il) === undefined ? {} : { il: alanlar.il }),
                  ...(bos(alanlar.postaKodu) === undefined
                    ? {}
                    : { postaKodu: alanlar.postaKodu.trim() }),
                  ...(bos(alanlar.ad) === undefined ? {} : { ad: alanlar.ad.trim() }),
                },
              },
              "yonetim.vergi.oranEklendi",
              { formda: true },
            )
          : islem(
              "vergi-orani-degistir",
              {
                kimlik: oran.kimlik,
                oran: {
                  ulke: alanlar.ulke,
                  oran: alanlar.oran,
                  il: bos(alanlar.il) ?? null,
                  postaKodu: bos(alanlar.postaKodu) ?? null,
                  ad: bos(alanlar.ad) ?? null,
                },
              },
              "yonetim.vergi.oranKaydedildi",
              { formda: true },
            ),
      bitti,
    );
  };
  return (
    <PanelFormu durum={pf} gonder={gonder} className="rounded-orta border border-kenar p-4">
      <h4 className="text-govde font-kalin">
        {metin(
          oran === undefined ? "yonetim.vergi.oranForm.yeni" : "yonetim.vergi.oranForm.duzenle",
        )}
      </h4>
      <PanelAlani ad="ulke" etiket={metin("yonetim.vergi.oranForm.ulke")} zorunlu>
        {(baglanti) => (
          <SecimKutusu value={alanlar.ulke} onValueChange={(deger) => degistir("ulke", deger)}>
            <SecimTetikleyici {...baglanti}>
              <SecimDegeri />
            </SecimTetikleyici>
            <SecimListesi>
              {veri.ulkeler.map((ulke) => (
                <SecimOgesi key={ulke.kod} value={ulke.kod}>
                  {ulke.ad}
                </SecimOgesi>
              ))}
            </SecimListesi>
          </SecimKutusu>
        )}
      </PanelAlani>
      {iller.length > 0 ? (
        <PanelAlani ad="il" etiket={metin("yonetim.vergi.oranForm.il")} zorunlu={false}>
          {(baglanti) => (
            <SecimKutusu
              value={alanlar.il === "" ? butunIller : alanlar.il}
              onValueChange={(deger) => degistir("il", deger === butunIller ? "" : deger)}
            >
              <SecimTetikleyici {...baglanti}>
                <SecimDegeri />
              </SecimTetikleyici>
              <SecimListesi>
                <SecimOgesi value={butunIller}>
                  {metin("yonetim.vergi.oranForm.ilHepsi")}
                </SecimOgesi>
                {iller.map((il) => (
                  <SecimOgesi key={il.kod} value={il.kod}>
                    {il.ad}
                  </SecimOgesi>
                ))}
              </SecimListesi>
            </SecimKutusu>
          )}
        </PanelAlani>
      ) : null}
      <PanelAlani
        ad="postaKodu"
        etiket={metin("yonetim.vergi.oranForm.postaKodu")}
        aciklama={metin("yonetim.vergi.oranForm.postaKoduAciklamasi")}
        zorunlu={false}
      >
        {(baglanti) => (
          <GirisAlani
            {...baglanti}
            autoComplete="off"
            value={alanlar.postaKodu}
            onChange={(olay) => degistir("postaKodu", olay.target.value)}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="oran"
        etiket={metin("yonetim.vergi.oranForm.oran")}
        aciklama={metin("yonetim.vergi.oranForm.oranAciklamasi")}
        zorunlu
      >
        {(baglanti) => (
          <GirisAlani
            {...baglanti}
            required
            inputMode="decimal"
            autoComplete="off"
            value={alanlar.oran}
            onChange={(olay) => degistir("oran", olay.target.value)}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="ad"
        etiket={metin("yonetim.vergi.oranForm.ad")}
        aciklama={doldur(metin("yonetim.vergi.oranForm.adAciklamasi"), {
          ad: veri.ayarlar.vergiAdi,
        })}
        zorunlu={false}
      >
        {(baglanti) => (
          <GirisAlani
            {...baglanti}
            autoComplete="off"
            value={alanlar.ad}
            onChange={(olay) => degistir("ad", olay.target.value)}
          />
        )}
      </PanelAlani>
      <KaydetCubugu vazgec={bitti} kaydetEtiketi={metin("yonetim.vergi.oranKaydet")} />
    </PanelFormu>
  );
}
