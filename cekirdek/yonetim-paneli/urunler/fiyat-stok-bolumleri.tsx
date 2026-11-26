"use client";
// Ürün ekranının fiyat ve stok bölümleri (kart 0265; taslak: planlar/tasarim-yonu/panel.html, u-fiyat, u-fg, u-stok,
// u-sg). Fiyat ve stok alanları ürünün tek formunun parçasıdır, "Kaydet" ürünle birlikte kaydeder (karar 0162);
// basit ürünün stoğu "Stoğu düzelt" penceresiyle hemen düzeltilir (görülen miktarla, sebebiyle). Seçenekli üründe
// birleşimlerin fiyatı ve stoğu seçenekler bölümünün tablosundadır, burada yalnız ortak indirim zamanı ve özet durur.
// Fiyatı değiştirme izni olmayan (görevli) alanları okur; geçmişler yalnız görme izni olana.
import { type ComponentProps, useId, useState } from "react";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { type ElleStokSebebi, elleStokSebepleri } from "../../kayitlar/stok";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { stokHataMetinleri, stokSebepMetinleri } from "../../moduller/stok/semalar";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { kodluAlanHatalari, kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { panelIstegi } from "../panel-istegi";
import { yazanYazisi } from "../siparisler/metinler";
import type {
  FiyatGecmisiGorunusu,
  FiyatStokVerisi,
  GecmisSayfasi,
  StokGecmisiGorunusu,
  Yazan,
} from "./fiyat-stok-verisi";
import type { UrunFormu } from "./urun-verisi";

type FiyatFormu = UrunFormu["fiyat"];

// Tutar alanı: para simgesi sitenin yerinde (başta ya da sonda), ekran okuyucu etiketi okur (kargo ekranının kalıbı).
export function TutarGirisi({
  simge,
  simgeYeri,
  className,
  ...ozellikler
}: ComponentProps<typeof GirisAlani> & { simge: string; simgeYeri: "basta" | "sonda" }) {
  return (
    <span className="relative flex items-center">
      <GirisAlani
        inputMode="decimal"
        autoComplete="off"
        {...ozellikler}
        className={sinif(simgeYeri === "basta" ? "pl-10" : "pr-10", className)}
      />
      <span
        aria-hidden="true"
        className={sinif(
          "pointer-events-none absolute text-soluk-yazi",
          simgeYeri === "basta" ? "left-4" : "right-4",
        )}
      >
        {simge}
      </span>
    </span>
  );
}

const yazanMetni = (metin: (anahtar: MetinAnahtari) => string, yazan: Yazan) =>
  yazan === null
    ? metin("yonetim.urunEkrani.gecmis.yazanYok")
    : yazan.tur === "sistem" && yazan.ad === "baslangic-katalog"
      ? metin("yonetim.urunEkrani.gecmis.baslangicKatalogu")
      : yazanYazisi(metin, yazan);

export function FiyatBolumu({
  fiyat,
  degistir,
  veri,
  izinli,
  secenekli,
}: {
  fiyat: FiyatFormu;
  degistir: (yeni: FiyatFormu) => void;
  veri: FiyatStokVerisi;
  izinli: boolean;
  secenekli: boolean;
}) {
  const metin = usePanelMetni();
  const alan = (ad: keyof FiyatFormu, deger: string) => degistir({ ...fiyat, [ad]: deger });
  // Kayıtlı satış fiyatı boşaltılamaz (sunucu "zorunlu" der): alan zorunlu görünür.
  const fiyatKayitli = (veri.birimler[""]?.satisFiyati ?? "") !== "";
  const tutar = (ad: "satisFiyati" | "indirimliFiyat", etiket: MetinAnahtari, aciklama: string) => (
    <PanelAlani
      ad={`fiyat.${ad}`}
      etiket={metin(etiket)}
      aciklama={aciklama}
      zorunlu={ad === "satisFiyati" && fiyatKayitli}
    >
      {(baglanti) => (
        <TutarGirisi
          {...baglanti}
          simge={veri.simge}
          simgeYeri={veri.simgeYeri}
          value={fiyat[ad]}
          disabled={!izinli}
          onChange={(olay) => alan(ad, olay.target.value)}
        />
      )}
    </PanelAlani>
  );
  const zaman = (
    ad: "indirimBaslangici" | "indirimBitisi",
    etiket: MetinAnahtari,
    aciklama: MetinAnahtari,
  ) => (
    <PanelAlani
      ad={`fiyat.${ad}`}
      etiket={metin(etiket)}
      aciklama={metin(aciklama)}
      zorunlu={false}
    >
      {(baglanti) => (
        <GirisAlani
          {...baglanti}
          type="datetime-local"
          value={fiyat[ad]}
          disabled={!izinli}
          onChange={(olay) => alan(ad, olay.target.value)}
        />
      )}
    </PanelAlani>
  );
  const zamanlar = (
    <div className="grid gap-5 tablet:grid-cols-2">
      {zaman(
        "indirimBaslangici",
        "yonetim.urunEkrani.fiyat.baslangic",
        "yonetim.urunEkrani.fiyat.baslangicAciklamasi",
      )}
      {zaman(
        "indirimBitisi",
        "yonetim.urunEkrani.fiyat.bitis",
        "yonetim.urunEkrani.fiyat.bitisAciklamasi",
      )}
    </div>
  );
  return (
    <AlanKabi ad="fiyat" etiket={metin("yonetim.urunEkrani.bolum.fiyat")}>
      <div className="flex flex-col gap-5">
        {secenekli ? (
          <p className="text-kucuk">{metin("yonetim.urunEkrani.fiyat.secenekli")}</p>
        ) : (
          <div className="grid gap-5 tablet:grid-cols-2">
            {tutar(
              "satisFiyati",
              "yonetim.urunEkrani.fiyat.satis",
              metin(
                veri.fiyatGirisi === "vergi-dahil"
                  ? "yonetim.urunEkrani.fiyat.satisAciklamasi.dahil"
                  : "yonetim.urunEkrani.fiyat.satisAciklamasi.haric",
              ),
            )}
            {tutar(
              "indirimliFiyat",
              "yonetim.urunEkrani.fiyat.indirimli",
              metin("yonetim.urunEkrani.fiyat.indirimliAciklamasi"),
            )}
          </div>
        )}
        {zamanlar}
        {secenekli || veri.vitrin === undefined ? null : (
          <div className="flex flex-col gap-1 rounded-orta bg-yuzey p-4">
            <span className="text-kucuk text-soluk-yazi">
              {metin("yonetim.urunEkrani.fiyat.vitrinde")}
            </span>
            <span className="flex flex-wrap items-baseline gap-2">
              <strong className={sinif("text-baslik-4", veri.vitrin.indirimde && "text-indirim")}>
                {veri.vitrin.tutar}
              </strong>
              {veri.vitrin.eskiTutar === undefined ? null : (
                <s className="text-kucuk text-soluk-yazi">{veri.vitrin.eskiTutar}</s>
              )}
            </span>
            <span className="text-kucuk text-soluk-yazi">
              {[
                veri.vitrin.bitis === undefined
                  ? undefined
                  : doldur(metin("yonetim.urunEkrani.fiyat.bitisYazisi"), {
                      zaman: veri.vitrin.bitis,
                    }),
                veri.vitrin.ekMetin,
                veri.vitrin.indirimde
                  ? metin(
                      veri.vitrin.eskiTutar === undefined
                        ? "yonetim.urunEkrani.fiyat.eskiFiyatYok"
                        : "yonetim.urunEkrani.fiyat.eskiFiyat",
                    )
                  : undefined,
              ]
                .filter((parca) => parca !== undefined)
                .join(" · ")}
            </span>
          </div>
        )}
      </div>
    </AlanKabi>
  );
}

export function StokBolumu({
  form,
  degistir,
  veri,
  izinler,
  secenekli,
  yeni,
}: {
  form: UrunFormu;
  degistir: (yeni: Partial<UrunFormu>) => void;
  veri: FiyatStokVerisi;
  izinler: { degistir: boolean; duzelt: boolean };
  secenekli: boolean;
  yeni: boolean;
}) {
  const metin = usePanelMetni();
  const [pencere, setPencere] = useState(false);
  const duzeltDugmesi = useId();
  const basit = veri.birimler[""];
  const toplam = Object.values(veri.birimler).reduce((t, b) => t + b.stok, 0);
  return (
    <AlanKabi ad="stok" etiket={metin("yonetim.urunEkrani.bolum.stok")}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-kalin">{metin("yonetim.urunEkrani.stok.takip")}</span>
            <span className="text-kucuk text-soluk-yazi">
              {metin("yonetim.urunEkrani.stok.takipAciklamasi")}
            </span>
          </div>
          <Anahtar
            etiket={metin("yonetim.urunEkrani.stok.takip")}
            acikYazisi={metin("yonetim.urunEkrani.stok.acik")}
            kapaliYazisi={metin("yonetim.urunEkrani.stok.kapali")}
            checked={form.stokTakibi}
            disabled={!izinler.degistir}
            onCheckedChange={(acik) => degistir({ stokTakibi: acik })}
          />
        </div>
        {secenekli ? (
          <p className="text-kucuk">
            {doldur(metin("yonetim.urunEkrani.stok.secenekli"), { toplam: String(toplam) })}
          </p>
        ) : yeni ? (
          izinler.duzelt ? (
            <PanelAlani
              ad="baslangicStogu"
              etiket={metin("yonetim.urunEkrani.stok.baslangic")}
              aciklama={metin("yonetim.urunEkrani.stok.baslangicAciklamasi")}
              zorunlu={false}
            >
              {(baglanti) => (
                <GirisAlani
                  {...baglanti}
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.baslangicStogu}
                  onChange={(olay) => degistir({ baslangicStogu: olay.target.value })}
                  className="tablet:max-w-form"
                />
              )}
            </PanelAlani>
          ) : null
        ) : basit === undefined ? null : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-orta bg-yuzey p-4">
            <span>
              {doldur(
                metin(
                  basit.ayrilan > 0
                    ? "yonetim.urunEkrani.stok.durumAyrilan"
                    : "yonetim.urunEkrani.stok.durum",
                ),
                { stok: String(basit.stok), ayrilan: String(basit.ayrilan) },
              )}
            </span>
            {izinler.duzelt ? (
              <Dugme id={duzeltDugmesi} tur="cerceveli" onClick={() => setPencere(true)}>
                {metin("yonetim.urunEkrani.stok.duzelt")}
              </Dugme>
            ) : null}
          </div>
        )}
        <PanelAlani
          ad="dusukStokEsigi"
          etiket={metin("yonetim.urunEkrani.stok.esik")}
          aciklama={doldur(metin("yonetim.urunEkrani.stok.esikAciklamasi"), {
            esik: String(veri.magazaEsigi),
          })}
          zorunlu={false}
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              inputMode="numeric"
              autoComplete="off"
              value={form.dusukStokEsigi}
              disabled={!izinler.degistir}
              onChange={(olay) => degistir({ dusukStokEsigi: olay.target.value })}
              className="tablet:max-w-form"
            />
          )}
        </PanelAlani>
      </div>
      {basit === undefined || secenekli ? null : (
        <StokDuzeltPenceresi
          acik={pencere}
          kapat={() => setPencere(false)}
          birim={basit.kimlik}
          stok={basit.stok}
          acan={duzeltDugmesi}
        />
      )}
    </AlanKabi>
  );
}

// Birleşim tablosunun altındaki ortak sebep ve not (kullanıcı kararı): tabloda değişen bütün stoklara yazılır.
export function StokSebebiAlanlari({
  sebep,
  not,
  degistir,
}: {
  sebep: ElleStokSebebi;
  not: string;
  degistir: (yeni: { stokSebebi?: ElleStokSebebi; stokNotu?: string }) => void;
}) {
  const metin = usePanelMetni();
  return (
    <div className="grid gap-5 tablet:grid-cols-2">
      <SebepSecimi ad="stokSebebi" deger={sebep} sec={(s) => degistir({ stokSebebi: s })} />
      {sebep === "diger" ? (
        <PanelAlani ad="stokNotu" etiket={metin("yonetim.urunEkrani.stok.not")} zorunlu>
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              autoComplete="off"
              value={not}
              onChange={(olay) => degistir({ stokNotu: olay.target.value })}
            />
          )}
        </PanelAlani>
      ) : null}
    </div>
  );
}

export function SebepSecimi({
  ad,
  deger,
  sec,
}: {
  ad: string;
  deger: ElleStokSebebi;
  sec: (sebep: ElleStokSebebi) => void;
}) {
  const metin = usePanelMetni();
  return (
    <PanelAlani
      ad={ad}
      etiket={metin("yonetim.urunEkrani.stok.sebep")}
      aciklama={metin("yonetim.urunEkrani.stok.sebepAciklamasi")}
      zorunlu
    >
      {(baglanti) => (
        <SecimKutusu value={deger} onValueChange={(s) => sec(s as ElleStokSebebi)}>
          <SecimTetikleyici {...baglanti}>
            <SecimDegeri />
          </SecimTetikleyici>
          <SecimListesi>
            {elleStokSebepleri.map((sebep) => (
              <SecimOgesi key={sebep} value={sebep}>
                {metin(stokSebepMetinleri[sebep])}
              </SecimOgesi>
            ))}
          </SecimListesi>
        </SecimKutusu>
      )}
    </PanelAlani>
  );
}

const stokHataMetni = kodluHataMetni(stokHataMetinleri);

// Basit ürünün "Stoğu düzelt" penceresi: yeni miktar, sebep ve not; hemen kaydeder. Ekranın gördüğü miktar
// gönderilir: arada değiştiyse çakışma, sayfa yenilenince güncel miktar görünür.
function StokDuzeltPenceresi({
  acik,
  kapat,
  birim,
  stok,
  acan,
}: {
  acik: boolean;
  kapat: () => void;
  birim: string;
  stok: number;
  acan: string;
}) {
  const metin = usePanelMetni();
  const { kapat: kapatVeTemizle, kapatmayiIste, degisince, soru } = useKapatmaSorusu(kapat);
  return (
    <YanPencere open={acik} onOpenChange={(durum) => (durum ? undefined : kapatmayiIste())}>
      {acik ? (
        <YanPencereIcerigi
          kapatEtiketi={metin("ortak.parca.kapat")}
          className="tablet:max-w-form"
          // Kayıttan sonra sayfa yenilenir; Radix'in kendi dönüşü odağı gövdede bırakıyordu (tarayıcıda ölçüldü):
          // odak açan düğmeye açıkça verilir.
          onCloseAutoFocus={(olay) => {
            olay.preventDefault();
            document.getElementById(acan)?.focus();
          }}
        >
          <YanPencereUstu>
            <YanPencereBasligi>{metin("yonetim.urunEkrani.stok.duzelt")}</YanPencereBasligi>
            <YanPencereAciklamasi>
              {doldur(metin("yonetim.urunEkrani.stok.duzeltAciklamasi"), { stok: String(stok) })}
            </YanPencereAciklamasi>
          </YanPencereUstu>
          {soru}
          <StokDuzeltFormu
            birim={birim}
            stok={stok}
            kapat={kapatVeTemizle}
            vazgec={kapatmayiIste}
            degisince={degisince}
          />
        </YanPencereIcerigi>
      ) : null}
    </YanPencere>
  );
}

function StokDuzeltFormu({
  birim,
  stok,
  kapat,
  vazgec,
  degisince,
}: {
  birim: string;
  stok: number;
  kapat: () => void;
  vazgec: () => void;
  degisince: (degisti: boolean) => void;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(stokHataMetni);
  const ilk = { yeniMiktar: String(stok), sebep: "sayim" as ElleStokSebebi, not: "" };
  const [form, setForm] = useState(ilk);
  const pf = usePanelFormu({ degisti: JSON.stringify(form) !== JSON.stringify(ilk) });
  const degistir = (yeni: Partial<typeof ilk>) => {
    const sonraki = { ...form, ...yeni };
    setForm(sonraki);
    degisince(JSON.stringify(sonraki) !== JSON.stringify(ilk));
  };
  const gonder = async () => {
    const miktar = form.yeniMiktar.trim();
    const sonuc = await pf.isle(() =>
      islem(
        "urun-stok-duzelt",
        {
          birim,
          duzeltme: {
            yeniMiktar: /^\d{1,10}$/.test(miktar) ? Number(miktar) : miktar,
            gorulenMiktar: stok,
            sebep: form.sebep,
            ...(form.not.trim() === "" ? {} : { not: form.not }),
          },
        },
        "yonetim.urunEkrani.stok.duzeltildi",
        { formda: true },
      ),
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      kapat();
      return;
    }
    const alanlar = kodluAlanHatalari(stokHataMetinleri, sonuc, ["yeniMiktar", "sebep", "not"]);
    pf.hatalariGoster(
      Object.fromEntries(Object.entries(alanlar).map(([ad, anahtar]) => [ad, metin(anahtar)])),
      Object.keys(alanlar).length > 0 ? [] : [metin(stokHataMetni(sonuc))],
    );
  };
  return (
    <PanelFormu durum={pf} gonder={gonder} className="gap-4">
      <PanelAlani ad="yeniMiktar" etiket={metin("yonetim.urunEkrani.stok.yeniMiktar")} zorunlu>
        {(baglanti) => (
          <GirisAlani
            {...baglanti}
            inputMode="numeric"
            autoComplete="off"
            value={form.yeniMiktar}
            onChange={(olay) => degistir({ yeniMiktar: olay.target.value })}
          />
        )}
      </PanelAlani>
      <SebepSecimi ad="sebep" deger={form.sebep} sec={(sebep) => degistir({ sebep })} />
      <PanelAlani
        ad="not"
        etiket={metin("yonetim.urunEkrani.stok.not")}
        zorunlu={form.sebep === "diger"}
      >
        {(baglanti) => (
          <UzunMetinAlani
            {...baglanti}
            rows={2}
            value={form.not}
            onChange={(olay) => degistir({ not: olay.target.value })}
          />
        )}
      </PanelAlani>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.urunEkrani.stok.kaydet")} vazgec={vazgec} />
    </PanelFormu>
  );
}

// Geçmiş tablolarının ortak gövdesi: ilk sayfa sunucudan, "Daha fazla" ucun sonraki sayfasıyla eklenir.
function useGecmis<T extends { kimlik: string }>(
  ilk: GecmisSayfasi<T>,
  uc: "urun-fiyat-gecmisi" | "urun-stok-gecmisi",
  urun: string,
) {
  const [sayfa, setSayfa] = useState(ilk);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(false);
  // Sunucunun verisi değişince (kayıttan sonra) ilk sayfaya dönülür.
  const [bilinen, setBilinen] = useState(ilk);
  if (bilinen !== ilk) {
    setBilinen(ilk);
    setSayfa(ilk);
  }
  const dahaFazla = async () => {
    if (sayfa.devam === undefined) return;
    setYukleniyor(true);
    const sonuc = await panelIstegi<GecmisSayfasi<T>>(uc, { kimlik: urun, sonra: sayfa.devam });
    setYukleniyor(false);
    setHata(!sonuc.tamam);
    if (!sonuc.tamam) return;
    setSayfa((onceki) => ({
      satirlar: [...onceki.satirlar, ...sonuc.veri.satirlar],
      ...(sonuc.veri.devam === undefined ? {} : { devam: sonuc.veri.devam }),
    }));
  };
  return { sayfa, yukleniyor, hata, dahaFazla };
}

function GecmisAlti({
  devam,
  yukleniyor,
  hata,
  dahaFazla,
}: {
  devam: boolean;
  yukleniyor: boolean;
  hata: boolean;
  dahaFazla: () => void;
}) {
  const metin = usePanelMetni();
  return (
    <>
      {hata ? (
        <p role="alert" className="text-kucuk font-kalin text-tehlike-yazi">
          {metin("yonetim.urunEkrani.gecmis.hata")}
        </p>
      ) : null}
      {devam ? (
        <Dugme tur="cerceveli" className="self-start" disabled={yukleniyor} onClick={dahaFazla}>
          {metin("yonetim.urunEkrani.gecmis.dahaFazla")}
        </Dugme>
      ) : null}
    </>
  );
}

export function FiyatGecmisi({
  ilk,
  urun,
  secenekli,
}: {
  ilk: GecmisSayfasi<FiyatGecmisiGorunusu>;
  urun: string;
  secenekli: boolean;
}) {
  const metin = usePanelMetni();
  const { sayfa, yukleniyor, hata, dahaFazla } = useGecmis(ilk, "urun-fiyat-gecmisi", urun);
  if (sayfa.satirlar.length === 0) {
    return <p className="text-kucuk text-soluk-yazi">{metin("yonetim.urunEkrani.gecmis.bos")}</p>;
  }
  const bas = "pb-2 pr-3 text-left font-kalin";
  return (
    <>
      {/* Telefonda tablo kendi kabında kayar; içinde odaklanacak öğe yok, kap klavyeyle odak alır (WCAG 2.1.1). */}
      <section
        className="min-w-0 overflow-x-auto"
        aria-label={metin("yonetim.urunEkrani.gecmis.fiyatTablosu")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılan bölge odak almalıdır (WCAG 2.1.1).
        tabIndex={0}
      >
        <Tablo className="w-max min-w-full text-kucuk">
          <TabloBasligi className="sr-only">
            {metin("yonetim.urunEkrani.gecmis.fiyatTablosu")}
          </TabloBasligi>
          <TabloUstu>
            <TabloSatiri className="text-soluk-yazi">
              <TabloBasHucresi scope="col" className={bas}>
                {metin("yonetim.urunEkrani.gecmis.zaman")}
              </TabloBasHucresi>
              {secenekli ? (
                <TabloBasHucresi scope="col" className={bas}>
                  {metin("yonetim.urunEkrani.secenek.sutun.birlesim")}
                </TabloBasHucresi>
              ) : null}
              <TabloBasHucresi scope="col" className={bas}>
                {metin("yonetim.urunEkrani.fiyat.satis")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className={bas}>
                {metin("yonetim.urunEkrani.fiyat.indirimli")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className={bas}>
                {metin("yonetim.urunEkrani.gecmis.yazan")}
              </TabloBasHucresi>
            </TabloSatiri>
          </TabloUstu>
          <TabloGovdesi>
            {sayfa.satirlar.map((satir) => (
              <TabloSatiri key={satir.kimlik} className="last:border-b-0">
                <TabloHucresi className="py-2 pr-3 align-top">{satir.zaman}</TabloHucresi>
                {secenekli ? (
                  <TabloHucresi className="py-2 pr-3 align-top">
                    {satir.birlesim ?? ""}
                  </TabloHucresi>
                ) : null}
                <TabloHucresi className="py-2 pr-3 align-top">{satir.satis}</TabloHucresi>
                <TabloHucresi className="py-2 pr-3 align-top">
                  {satir.indirimli === undefined ? (
                    metin("yonetim.urunEkrani.gecmis.indirimYok")
                  ) : (
                    <span className="flex flex-col">
                      <span>{satir.indirimli}</span>
                      {satir.baslangic === undefined && satir.bitis === undefined ? null : (
                        <span className="text-soluk-yazi">
                          {doldur(metin("yonetim.urunEkrani.gecmis.aralik"), {
                            baslangic: satir.baslangic ?? metin("yonetim.urunEkrani.gecmis.hemen"),
                            bitis: satir.bitis ?? metin("yonetim.urunEkrani.gecmis.suresiz"),
                          })}
                        </span>
                      )}
                    </span>
                  )}
                </TabloHucresi>
                <TabloHucresi className="py-2 align-top">
                  {yazanMetni(metin, satir.yazan)}
                </TabloHucresi>
              </TabloSatiri>
            ))}
          </TabloGovdesi>
        </Tablo>
      </section>
      <GecmisAlti
        devam={sayfa.devam !== undefined}
        yukleniyor={yukleniyor}
        hata={hata}
        dahaFazla={() => void dahaFazla()}
      />
    </>
  );
}

export function StokGecmisi({
  ilk,
  urun,
  secenekli,
}: {
  ilk: GecmisSayfasi<StokGecmisiGorunusu>;
  urun: string;
  secenekli: boolean;
}) {
  const metin = usePanelMetni();
  const { sayfa, yukleniyor, hata, dahaFazla } = useGecmis(ilk, "urun-stok-gecmisi", urun);
  if (sayfa.satirlar.length === 0) {
    return <p className="text-kucuk text-soluk-yazi">{metin("yonetim.urunEkrani.gecmis.bos")}</p>;
  }
  const bas = "pb-2 pr-3 text-left font-kalin";
  return (
    <>
      {/* Telefonda tablo kendi kabında kayar; içinde odaklanacak öğe yok, kap klavyeyle odak alır (WCAG 2.1.1). */}
      <section
        className="min-w-0 overflow-x-auto"
        aria-label={metin("yonetim.urunEkrani.gecmis.stokTablosu")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılan bölge odak almalıdır (WCAG 2.1.1).
        tabIndex={0}
      >
        <Tablo className="w-max min-w-full text-kucuk">
          <TabloBasligi className="sr-only">
            {metin("yonetim.urunEkrani.gecmis.stokTablosu")}
          </TabloBasligi>
          <TabloUstu>
            <TabloSatiri className="text-soluk-yazi">
              <TabloBasHucresi scope="col" className={bas}>
                {metin("yonetim.urunEkrani.gecmis.zaman")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className={bas}>
                {metin("yonetim.urunEkrani.gecmis.neden")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className={sinif(bas, "text-right")}>
                {metin("yonetim.urunEkrani.gecmis.degisim")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className={sinif(bas, "pr-0 text-right")}>
                {metin("yonetim.urunEkrani.gecmis.sonra")}
              </TabloBasHucresi>
            </TabloSatiri>
          </TabloUstu>
          <TabloGovdesi>
            {sayfa.satirlar.map((satir) => (
              <TabloSatiri key={satir.kimlik} className="last:border-b-0">
                <TabloHucresi className="py-2 pr-3 align-top">{satir.zaman}</TabloHucresi>
                <TabloHucresi className="py-2 pr-3 align-top">
                  <span className="flex flex-col">
                    <span>
                      {[
                        secenekli ? satir.birlesim : undefined,
                        metin(stokSebepMetinleri[satir.sebep]),
                        satir.siparis,
                        satir.not,
                      ]
                        .filter((parca) => parca !== undefined && parca !== "")
                        .join(" · ")}
                    </span>
                    {satir.yazan === null || satir.yazan.tur === "sistem" ? null : (
                      <span className="text-soluk-yazi">{yazanMetni(metin, satir.yazan)}</span>
                    )}
                  </span>
                </TabloHucresi>
                <TabloHucresi
                  className={sinif(
                    "py-2 pr-3 text-right align-top font-kalin",
                    satir.degisim < 0 ? "text-tehlike-yazi" : "text-basari-yazi",
                  )}
                >
                  {doldur(
                    metin(
                      satir.degisim > 0
                        ? "yonetim.urunEkrani.gecmis.artis"
                        : "yonetim.urunEkrani.gecmis.azalis",
                    ),
                    { sayi: String(Math.abs(satir.degisim)) },
                  )}
                </TabloHucresi>
                <TabloHucresi className="py-2 text-right align-top">{satir.sonra}</TabloHucresi>
              </TabloSatiri>
            ))}
          </TabloGovdesi>
        </Tablo>
      </section>
      <GecmisAlti
        devam={sayfa.devam !== undefined}
        yukleniyor={yukleniyor}
        hata={hata}
        dahaFazla={() => void dahaFazla()}
      />
    </>
  );
}
