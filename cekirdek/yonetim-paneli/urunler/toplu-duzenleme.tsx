"use client";
// Ürünlerde toplu düzenlemenin penceresi (kart 0314, karar 0189; taslak: planlar/tasarim-yonu/panel-2.html, "Toplu
// düzenleme"): fiyatı değiştir, stoğu değiştir, kategoriye ekle, kategoriden çıkar. Liste motorunun pencere açan toplu
// işlemidir (TopluPencereTanimi).
// - Önce "Önizle": sunucu her ürünün ve birleşimin eski ve yeni değerini sitenin biçimiyle verir, işlenmeyecek
//   ürünleri nedeniyle söyler. Form değişince önizleme düşer, yeniden önizlenir.
// - Sonra "N ürüne uygula": yalnız değişecek ürünler önizlemenin gördüğü değerlerle gider; sonuç listede söylenir.
//   Önizlemede işlenmeyecek görünen ürünler de sonucun işlenemeyenlerine eklenir, seçimde kalırlar.
// - Tutar, oran ve miktar yazı olarak gider, sunucu okur (kargo ekranının kuralı); ekran sayı çevirmez.
// - Hatalar ortak form yapısıyla (karar 0159): alanın altında, tek hatada odak alanda.
import { type RefObject, useRef, useState } from "react";
import { useCizimdenSonraOdak } from "../../../bilesenler/parcalar/cizimden-sonra-odak";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
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
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import type { TopluSonuc } from "../../kayitlar/liste";
import { type ElleStokSebebi, stokSebepleri } from "../../kayitlar/stok";
import {
  type TopluDegisimBirimi,
  type TopluFiyatHedefi,
  type TopluFiyatYontemi,
  type TopluStokYontemi,
  topluDegisimBirimleri,
  topluDuzenlemeSinirlari,
  topluStokYontemleri,
  type UrunTopluDuzenlemesi,
  urunTopluDuzenlemeNedenleri,
} from "../../kayitlar/urun";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { notUzunlugu } from "../../moduller/stok/semalar";
import { CokluKayitSecimi, type SecilenKayit } from "../coklu-kayit-secimi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { kayitAramaAcikMi } from "../kayit-arama";
import { panelIstegi } from "../panel-istegi";
import { SebepSecimi, TutarGirisi } from "./fiyat-stok-bolumleri";
import type { OnizlemeSatiri, TopluOnizlemeVerisi } from "./toplu-duzenleme-verisi";

export type ParaSimgesi = { simge: string; simgeYeri: "basta" | "sonda" };

type DuzenlemeFormu = {
  hedef: TopluFiyatHedefi;
  yontem: TopluFiyatYontemi;
  birim: TopluDegisimBirimi;
  deger: string;
  baslangic: string;
  bitis: string;
  stokYontemi: TopluStokYontemi;
  miktar: string;
  sebep: ElleStokSebebi;
  not: string;
  kategoriler: SecilenKayit[];
};

const ilkForm: DuzenlemeFormu = {
  hedef: "satis",
  yontem: "artir",
  birim: "oran",
  deger: "",
  baslangic: "",
  bitis: "",
  stokYontemi: "ekle",
  miktar: "",
  sebep: "yeni-mal",
  not: "",
  kategoriler: [],
};

// Hedefin yöntemleri: "satıştan indir" yalnız indirimli fiyattadır (taslağın sırası).
const yontemler: Record<TopluFiyatHedefi, TopluFiyatYontemi[]> = {
  satis: ["artir", "azalt"],
  indirimli: ["satistan-indir", "artir", "azalt"],
};

// Sunucunun alan yolundan formun alanına.
const alanlar: Record<string, string> = {
  "duzenleme.deger": "deger",
  "duzenleme.yontem": "yontem",
  "duzenleme.indirimBaslangici": "baslangic",
  "duzenleme.indirimBitisi": "bitis",
  "duzenleme.miktar": "miktar",
  "duzenleme.not": "not",
  "duzenleme.sebep": "sebep",
  "duzenleme.kategoriler": "kategoriler",
};

// Alanın hata kodlarının metinleri; tanınmayan kod genel metni alır.
const hataKodlari = [
  "too_small",
  "oran-okunamadi",
  "tutar-okunamadi",
  "deger-sifir",
  "oran-siniri",
  "miktar-okunamadi",
  "stok-siniri",
  "not-gerekli",
  "not-uzun",
  "kayda-uygun-degil",
  "yontem-gecersiz",
  "indirim-zamani-gecersiz",
  "indirim-zamani-indirimsiz",
  "indirim-sirasi",
  "kategori-gecersiz",
] as const;
const hataMetni = (kod: string): MetinAnahtari =>
  (hataKodlari as readonly string[]).includes(kod)
    ? `yonetim.urunler.topluDuzenleme.hata.${kod as (typeof hataKodlari)[number]}`
    : "yonetim.urunler.topluDuzenleme.hata.genel";

// İşlenmeme nedeninin metni (sonuçta ve önizlemede): kayıttaki nedenler ve servislerin geçirdiği fiyat kuralı.
export const topluDuzenlemeNedeni = (kod: string): MetinAnahtari =>
  (urunTopluDuzenlemeNedenleri as readonly string[]).includes(kod)
    ? `yonetim.urunler.topluDuzenleme.neden.${kod as (typeof urunTopluDuzenlemeNedenleri)[number]}`
    : "yonetim.urunler.toplu.neden.genel";

const duzenlemeGirdisi = (tur: UrunTopluDuzenlemesi, form: DuzenlemeFormu) => {
  if (tur === "fiyat") {
    const indirimli = form.hedef === "indirimli";
    return {
      islem: "fiyat",
      hedef: form.hedef,
      yontem: form.yontem,
      birim: form.birim,
      deger: form.deger,
      indirimBaslangici: indirimli && form.baslangic !== "" ? form.baslangic : null,
      indirimBitisi: indirimli && form.bitis !== "" ? form.bitis : null,
    };
  }
  if (tur === "stok") {
    return {
      islem: "stok",
      yontem: form.stokYontemi,
      miktar: form.miktar,
      sebep: form.sebep,
      ...(form.not.trim() === "" ? {} : { not: form.not }),
    };
  }
  return { islem: tur, kategoriler: form.kategoriler.map((kategori) => kategori.kimlik) };
};

const baslikMetinleri: Record<UrunTopluDuzenlemesi, MetinAnahtari> = {
  fiyat: "yonetim.urunler.topluDuzenleme.fiyat.ad",
  stok: "yonetim.urunler.topluDuzenleme.stok.ad",
  "kategori-ekle": "yonetim.urunler.topluDuzenleme.kategori-ekle.ad",
  "kategori-cikar": "yonetim.urunler.topluDuzenleme.kategori-cikar.ad",
};

export function TopluDuzenlemePenceresi({
  tur,
  urunler,
  para,
  kapat,
  bitti,
}: {
  tur: UrunTopluDuzenlemesi;
  urunler: readonly { kimlik: string; ad: string }[];
  para: ParaSimgesi;
  kapat: () => void;
  bitti: (sonuc: TopluSonuc) => void;
}) {
  const metin = usePanelMetni();
  const bitiyor = useRef(false);
  const { kapatmayiIste, degisince, soru } = useKapatmaSorusu(kapat);
  return (
    <YanPencere open onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}>
      <YanPencereIcerigi
        kapatEtiketi={metin("ortak.parca.kapat")}
        className="tablet:max-w-metin"
        // Öneri listesi açıkken Escape yalnız listeyi kapatır (kayıt arama kutusu).
        onEscapeKeyDown={(olay) => {
          if (kayitAramaAcikMi(document.activeElement)) olay.preventDefault();
        }}
        // İşlem bitince odak listedeki sonuca gider (liste verir); pencere odağı çubuğa döndürmez.
        onCloseAutoFocus={(olay) => {
          if (bitiyor.current) olay.preventDefault();
        }}
      >
        <YanPencereUstu>
          <YanPencereBasligi>{metin(baslikMetinleri[tur])}</YanPencereBasligi>
          <YanPencereAciklamasi>
            {doldur(metin(`yonetim.urunler.topluDuzenleme.${tur}.aciklama`), {
              sayi: String(urunler.length),
            })}
          </YanPencereAciklamasi>
        </YanPencereUstu>
        {soru}
        <TopluDuzenlemeFormu
          tur={tur}
          urunler={urunler}
          para={para}
          degisince={degisince}
          vazgec={kapatmayiIste}
          bitti={(sonuc) => {
            bitiyor.current = true;
            bitti(sonuc);
          }}
        />
      </YanPencereIcerigi>
    </YanPencere>
  );
}

function TopluDuzenlemeFormu({
  tur,
  urunler,
  para,
  degisince,
  vazgec,
  bitti,
}: {
  tur: UrunTopluDuzenlemesi;
  urunler: readonly { kimlik: string; ad: string }[];
  para: ParaSimgesi;
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  bitti: (sonuc: TopluSonuc) => void;
}) {
  const metin = usePanelMetni();
  const [form, setForm] = useState(ilkForm);
  const [onizleme, setOnizleme] = useState<TopluOnizlemeVerisi | null>(null);
  const pf = usePanelFormu({ degisti: JSON.stringify(form) !== JSON.stringify(ilkForm) });
  const ozetBasligi = useRef<HTMLHeadingElement>(null);
  const odakla = useCizimdenSonraOdak();
  const degistir = (yeni: Partial<DuzenlemeFormu>, alan?: string) => {
    const sonraki = { ...form, ...yeni };
    // Hedef değişince yöntem hedefin ilk yöntemine döner (indirimli fiyatta "satış fiyatından indir", taslak).
    if (yeni.hedef !== undefined && yeni.hedef !== form.hedef) {
      sonraki.yontem = yontemler[yeni.hedef][0] ?? "artir";
    }
    setForm(sonraki);
    setOnizleme(null);
    if (alan !== undefined) pf.alaniTemizle(alan);
    degisince(JSON.stringify(sonraki) !== JSON.stringify(ilkForm));
  };

  const hatalariGoster = (sonuc: { kod: string; ayrinti: { alan: string; kod: string }[] }) => {
    const alanHatalari: Record<string, string> = {};
    for (const sorun of sonuc.ayrinti) {
      const alan = alanlar[sorun.alan];
      if (alan !== undefined && alanHatalari[alan] === undefined) {
        alanHatalari[alan] = doldur(metin(hataMetni(sorun.kod)), {
          artirma: String(topluDuzenlemeSinirlari.artirmaOraniEnCok),
          azaltma: String(topluDuzenlemeSinirlari.azaltmaOraniEnCok),
          ondalik: String(topluDuzenlemeSinirlari.oranOndalik),
          notUzunlugu: String(notUzunlugu),
        });
      }
    }
    if (Object.keys(alanHatalari).length > 0) {
      pf.hatalariGoster(alanHatalari);
      return;
    }
    pf.hatalariGoster({}, [
      metin(
        sonuc.kod === "yetki"
          ? "yonetim.liste.sonuc.yetki"
          : "yonetim.urunler.topluDuzenleme.hata.genel",
      ),
    ]);
  };

  const gonder = async () => {
    // Boş zorunlu alan istek gitmeden söylenir (sunucu da reddeder): değer, miktar ve kategori.
    const bos =
      tur === "fiyat" && form.deger.trim() === ""
        ? { deger: metin("yonetim.urunler.topluDuzenleme.hata.too_small") }
        : tur === "stok" && form.miktar.trim() === ""
          ? { miktar: metin("yonetim.urunler.topluDuzenleme.hata.too_small") }
          : (tur === "kategori-ekle" || tur === "kategori-cikar") && form.kategoriler.length === 0
            ? { kategoriler: metin("yonetim.urunler.topluDuzenleme.hata.kategoriSec") }
            : undefined;
    if (bos !== undefined) {
      pf.hatalariGoster(bos);
      return;
    }
    const duzenleme = duzenlemeGirdisi(tur, form);
    if (onizleme === null || onizleme.urunSayisi === 0) {
      const sonuc = await pf.isle(() =>
        panelIstegi<TopluOnizlemeVerisi>("urunler-toplu-onizle", {
          urunler: urunler.map((urun) => urun.kimlik),
          duzenleme,
        }),
      );
      if (sonuc === undefined) return;
      if (!sonuc.tamam) {
        hatalariGoster(sonuc);
        return;
      }
      setOnizleme(sonuc.veri);
      odakla(() => ozetBasligi.current);
      return;
    }
    const degisecek = onizleme.urunler.filter((urun) => urun.degisir).map((urun) => urun.kimlik);
    const sonuc = await pf.isle(() =>
      panelIstegi<TopluSonuc>("urunler-toplu-duzenle", {
        urunler: degisecek,
        duzenleme,
        gorulen: onizleme.gorulen,
      }),
    );
    if (sonuc === undefined) return;
    if (!sonuc.tamam) {
      hatalariGoster(sonuc);
      return;
    }
    const onizlemedeIslenmeyen = onizleme.urunler.flatMap((urun) =>
      urun.neden === undefined ? [] : [{ anahtar: urun.kimlik, kod: urun.neden }],
    );
    bitti({
      islenen: sonuc.veri.islenen,
      islenemeyen: [...sonuc.veri.islenemeyen, ...onizlemedeIslenmeyen],
    });
  };

  const secenek = (anahtar: MetinAnahtari) => metin(anahtar);
  const uygulanabilir = onizleme !== null && onizleme.urunSayisi > 0;
  const yontemHatasi = pf.hata("yontem");
  return (
    <PanelFormu durum={pf} gonder={gonder} className="gap-4">
      {tur === "fiyat" ? (
        <>
          <AlanKabi ad="hedef" etiket={metin("yonetim.urunler.topluDuzenleme.fiyat.hedef")}>
            <SecenekGrubu
              baslik={metin("yonetim.urunler.topluDuzenleme.fiyat.hedef")}
              etiket={metin("yonetim.urunler.topluDuzenleme.fiyat.hedef")}
              ogeler={(["satis", "indirimli"] as const).map((deger) => ({
                deger,
                ad: secenek(`yonetim.urunler.topluDuzenleme.fiyat.hedefler.${deger}`),
              }))}
              deger={form.hedef}
              onDegerDegisti={(deger) => degistir({ hedef: deger as TopluFiyatHedefi })}
              secilemezEki=""
            />
          </AlanKabi>
          <AlanKabi ad="yontem" etiket={metin("yonetim.urunler.topluDuzenleme.fiyat.yontem")}>
            <SecenekGrubu
              baslik={metin("yonetim.urunler.topluDuzenleme.fiyat.yontem")}
              etiket={metin("yonetim.urunler.topluDuzenleme.fiyat.yontem")}
              ogeler={yontemler[form.hedef].map((deger) => ({
                deger,
                ad: secenek(`yonetim.urunler.topluDuzenleme.fiyat.yontemler.${deger}`),
              }))}
              deger={form.yontem}
              onDegerDegisti={(deger) => degistir({ yontem: deger as TopluFiyatYontemi }, "yontem")}
              secilemezEki=""
              {...(yontemHatasi === undefined ? {} : { hata: yontemHatasi })}
            />
          </AlanKabi>
          <div className="grid items-start gap-4 tablet:grid-cols-2">
            <PanelAlani
              ad="deger"
              etiket={metin(
                form.birim === "oran"
                  ? "yonetim.urunler.topluDuzenleme.fiyat.oran"
                  : "yonetim.urunler.topluDuzenleme.fiyat.tutar",
              )}
              aciklama={metin("yonetim.urunler.topluDuzenleme.fiyat.yuvarlama")}
              zorunlu
            >
              {(baglanti) =>
                form.birim === "oran" ? (
                  <TutarGirisi
                    {...baglanti}
                    simge={metin("yonetim.urunler.topluDuzenleme.fiyat.yuzdeIsareti")}
                    simgeYeri="sonda"
                    value={form.deger}
                    onChange={(olay) => degistir({ deger: olay.target.value }, "deger")}
                  />
                ) : (
                  <TutarGirisi
                    {...baglanti}
                    simge={para.simge}
                    simgeYeri={para.simgeYeri}
                    value={form.deger}
                    onChange={(olay) => degistir({ deger: olay.target.value }, "deger")}
                  />
                )
              }
            </PanelAlani>
            <AlanKabi ad="birim" etiket={metin("yonetim.urunler.topluDuzenleme.fiyat.birim")}>
              <SecenekGrubu
                baslik={metin("yonetim.urunler.topluDuzenleme.fiyat.birim")}
                etiket={metin("yonetim.urunler.topluDuzenleme.fiyat.birim")}
                ogeler={topluDegisimBirimleri.map((deger) => ({
                  deger,
                  ad:
                    deger === "tutar"
                      ? doldur(metin("yonetim.urunler.topluDuzenleme.fiyat.birimler.tutar"), {
                          simge: para.simge,
                        })
                      : metin("yonetim.urunler.topluDuzenleme.fiyat.birimler.oran"),
                }))}
                deger={form.birim}
                onDegerDegisti={(deger) => degistir({ birim: deger as TopluDegisimBirimi })}
                secilemezEki=""
              />
            </AlanKabi>
          </div>
          {form.hedef === "indirimli" ? (
            <div className="grid gap-4 tablet:grid-cols-2">
              {(["baslangic", "bitis"] as const).map((ad) => (
                <PanelAlani
                  key={ad}
                  ad={ad}
                  etiket={metin(`yonetim.urunler.topluDuzenleme.fiyat.${ad}`)}
                  aciklama={metin("yonetim.urunler.topluDuzenleme.fiyat.zamanAciklamasi")}
                  zorunlu={false}
                >
                  {(baglanti) => (
                    <GirisAlani
                      {...baglanti}
                      type="datetime-local"
                      value={form[ad]}
                      onChange={(olay) => degistir({ [ad]: olay.target.value }, ad)}
                    />
                  )}
                </PanelAlani>
              ))}
            </div>
          ) : null}
        </>
      ) : tur === "stok" ? (
        <>
          <AlanKabi ad="stokYontemi" etiket={metin("yonetim.urunler.topluDuzenleme.stok.yontem")}>
            <SecenekGrubu
              baslik={metin("yonetim.urunler.topluDuzenleme.stok.yontem")}
              etiket={metin("yonetim.urunler.topluDuzenleme.stok.yontem")}
              ogeler={topluStokYontemleri.map((deger) => ({
                deger,
                ad: secenek(`yonetim.urunler.topluDuzenleme.stok.yontemler.${deger}`),
              }))}
              deger={form.stokYontemi}
              onDegerDegisti={(deger) => degistir({ stokYontemi: deger as TopluStokYontemi })}
              secilemezEki=""
            />
          </AlanKabi>
          <PanelAlani
            ad="miktar"
            etiket={metin("yonetim.urunler.topluDuzenleme.stok.miktar")}
            zorunlu
          >
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                inputMode="numeric"
                autoComplete="off"
                value={form.miktar}
                onChange={(olay) => degistir({ miktar: olay.target.value }, "miktar")}
              />
            )}
          </PanelAlani>
          <SebepSecimi
            ad="sebep"
            deger={form.sebep}
            sec={(sebep) => degistir({ sebep }, "sebep")}
          />
          <PanelAlani
            ad="not"
            etiket={metin("yonetim.urunEkrani.stok.not")}
            zorunlu={stokSebepleri[form.sebep].notZorunlu}
          >
            {(baglanti) => (
              <UzunMetinAlani
                {...baglanti}
                rows={2}
                value={form.not}
                onChange={(olay) => degistir({ not: olay.target.value }, "not")}
              />
            )}
          </PanelAlani>
        </>
      ) : (
        <CokluKayitSecimi
          ad="kategoriler"
          tur="kategori"
          etiket={metin("yonetim.urunler.topluDuzenleme.kategoriler")}
          aciklama={metin(`yonetim.urunler.topluDuzenleme.${tur}.kategorilerAciklamasi`)}
          secilenler={form.kategoriler}
          degisti={(yeni) => degistir({ kategoriler: yeni }, "kategoriler")}
          sinir={topluDuzenlemeSinirlari.kategoriEnCok}
          sinirYazisi={doldur(metin("yonetim.urunler.topluDuzenleme.kategoriSiniri"), {
            sayi: String(topluDuzenlemeSinirlari.kategoriEnCok),
          })}
        />
      )}
      {onizleme === null ? null : (
        <OnizlemeBolumu tur={tur} onizleme={onizleme} baslik={ozetBasligi} />
      )}
      <KaydetCubugu
        kaydetEtiketi={
          uygulanabilir
            ? doldur(metin("yonetim.urunler.topluDuzenleme.uygula"), {
                sayi: String(onizleme.urunSayisi),
              })
            : metin("yonetim.urunler.topluDuzenleme.onizle")
        }
        vazgec={vazgec}
      />
    </PanelFormu>
  );
}

// Önizlemede gösterilen en çok satır: daha fazlası sayıyla söylenir (önizleme yine bütün ürünler içindir).
const onizlemeSatirSiniri = 50;

function OnizlemeBolumu({
  tur,
  onizleme,
  baslik,
}: {
  tur: UrunTopluDuzenlemesi;
  onizleme: TopluOnizlemeVerisi;
  baslik: RefObject<HTMLHeadingElement | null>;
}) {
  const metin = usePanelMetni();
  const kategori = tur === "kategori-ekle" || tur === "kategori-cikar";
  const islenmeyen = onizleme.urunler.filter((urun) => urun.neden !== undefined);
  const degismeyen = onizleme.urunler.filter((urun) => !urun.degisir && urun.neden === undefined);
  const satirlar = onizleme.urunler
    .filter((urun) => urun.degisir)
    .flatMap((urun): { anahtar: string; ad: string; satir: OnizlemeSatiri | undefined }[] =>
      kategori
        ? [{ anahtar: urun.kimlik, ad: urun.ad, satir: undefined }]
        : urun.satirlar.map((satir, i) => ({
            anahtar: `${urun.kimlik}-${i}`,
            ad:
              satir.degerler.length === 0
                ? urun.ad
                : `${urun.ad}${metin("yonetim.urunler.topluDuzenleme.birlesimAyraci")}${satir.degerler.join(metin("yonetim.urunler.topluDuzenleme.degerAyraci"))}`,
            satir,
          })),
    );
  const gosterilen = satirlar.slice(0, onizlemeSatirSiniri);
  const ozet =
    onizleme.urunSayisi === 0
      ? metin("yonetim.urunler.topluDuzenleme.onizleme.degisenYok")
      : kategori || onizleme.birimSayisi === onizleme.urunSayisi
        ? doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.ozetUrun"), {
            urun: String(onizleme.urunSayisi),
          })
        : doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.ozet"), {
            urun: String(onizleme.urunSayisi),
            birim: String(onizleme.birimSayisi),
          });
  return (
    <section aria-labelledby="toplu-onizleme-baslik" className="flex min-w-0 flex-col gap-3">
      <h3
        id="toplu-onizleme-baslik"
        ref={baslik}
        tabIndex={-1}
        className="text-govde font-kalin outline-none"
      >
        {metin("yonetim.urunler.topluDuzenleme.onizleme.baslik")}
      </h3>
      <p className="m-0" role="status">
        {ozet}
      </p>
      {gosterilen.length === 0 ? null : (
        // Telefonda tablo kendi kabında kayar; içinde odaklanacak öğe yok, kap klavyeyle odak alır (WCAG 2.1.1).
        <section
          className="min-w-0 overflow-x-auto"
          aria-label={metin("yonetim.urunler.topluDuzenleme.onizleme.tablo")}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılan bölge odak almalıdır (WCAG 2.1.1).
          tabIndex={0}
        >
          <Tablo className="w-max min-w-full text-kucuk">
            <TabloBasligi className="sr-only">
              {metin("yonetim.urunler.topluDuzenleme.onizleme.tablo")}
            </TabloBasligi>
            <TabloUstu>
              <TabloSatiri className="text-soluk-yazi">
                <TabloBasHucresi scope="col" className="pr-3 pb-2 font-kalin">
                  {metin("yonetim.urunler.topluDuzenleme.onizleme.urun")}
                </TabloBasHucresi>
                {kategori ? null : (
                  <>
                    {tur === "fiyat" ? (
                      <TabloBasHucresi scope="col" className="pr-3 pb-2 text-right font-kalin">
                        {metin("yonetim.urunler.topluDuzenleme.onizleme.satis")}
                      </TabloBasHucresi>
                    ) : null}
                    <TabloBasHucresi scope="col" className="pr-3 pb-2 text-right font-kalin">
                      {metin("yonetim.urunler.topluDuzenleme.onizleme.simdi")}
                    </TabloBasHucresi>
                    <TabloBasHucresi scope="col" className="pr-3 pb-2 text-right font-kalin">
                      {metin("yonetim.urunler.topluDuzenleme.onizleme.yeni")}
                    </TabloBasHucresi>
                  </>
                )}
              </TabloSatiri>
            </TabloUstu>
            <TabloGovdesi>
              {gosterilen.map(({ anahtar, ad, satir }) => (
                <TabloSatiri key={anahtar}>
                  <TabloHucresi className="py-2 pr-3">{ad}</TabloHucresi>
                  {satir === undefined ? null : (
                    <>
                      {tur === "fiyat" ? (
                        <TabloHucresi className="py-2 pr-3 text-right">
                          {satir.satis ?? metin("yonetim.urunler.topluDuzenleme.onizleme.yok")}
                        </TabloHucresi>
                      ) : null}
                      <TabloHucresi className="py-2 pr-3 text-right">
                        {satir.eski ?? metin("yonetim.urunler.topluDuzenleme.onizleme.yok")}
                      </TabloHucresi>
                      <TabloHucresi className="py-2 text-right font-kalin">
                        {satir.yeni ?? (
                          <span className="font-normal text-soluk-yazi">
                            {metin(topluDuzenlemeNedeni(satir.neden ?? ""))}
                          </span>
                        )}
                      </TabloHucresi>
                    </>
                  )}
                </TabloSatiri>
              ))}
            </TabloGovdesi>
          </Tablo>
        </section>
      )}
      {satirlar.length > gosterilen.length ? (
        <p className="m-0 text-kucuk text-soluk-yazi">
          {doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.dahaFazla"), {
            sayi: String(satirlar.length - gosterilen.length),
          })}
        </p>
      ) : null}
      {degismeyen.length === 0 ? null : (
        <p className="m-0 text-kucuk text-soluk-yazi">
          {doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.degismeyen"), {
            sayi: String(degismeyen.length),
          })}
        </p>
      )}
      {islenmeyen.length === 0 ? null : (
        <Uyari tur="uyari">
          <span className="flex flex-col gap-1">
            <span>
              {doldur(metin("yonetim.urunler.topluDuzenleme.onizleme.islenmeyecek"), {
                sayi: String(islenmeyen.length),
              })}
            </span>
            <ul className="list-disc pl-5">
              {islenmeyen.map((urun) => (
                <li key={urun.kimlik}>
                  {doldur(metin("yonetim.liste.sonuc.satir"), {
                    ad: urun.ad,
                    neden: metin(topluDuzenlemeNedeni(urun.neden ?? "")),
                  })}
                </li>
              ))}
            </ul>
          </span>
        </Uyari>
      )}
    </section>
  );
}
