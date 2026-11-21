"use client";
// Bölümün düzenleme formu (kart 0106, karar 0081). Form bölüm tarifinden kendiliğinden çıkar: her alan kendi
// türünün parçasıyla çizilir, ikinci bir form tanımı yazılmaz. Tarife alan eklenince formda da görünür.
//
// Bu bileşen yalnız alanları çizer ve değerleri tutar; kaydetme, panelin sayfasının işidir: sayfa alanları
// <Form> içine koyar, değerleri düzen servisine gönderir, dönen hataları alan yoluyla geri verir. Kategori,
// marka, etiket, ürün, görsel ve menü seçenekleri de sayfadan gelir.
import { useId, useState } from "react";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../bilesenler/parcalar/onay-kutusu";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../bilesenler/parcalar/secim-kutusu";
import { UzunMetinAlani } from "../../bilesenler/parcalar/uzun-metin-alani";
import { doldur } from "../metinler/doldur";
import type { MetinAnahtari } from "../metinler/metin";
import { usePanelMetni } from "../metinler/panel-metni";
import type { GorselSecenegi } from "../moduller/duzen/secenekler";
import type {
  AlanTarifi,
  BolumDegerleri,
  BolumTarifi,
  TekAlanTarifi,
} from "../vitrin/bolum-kutuphanesi/tarif";
import { AlanKabi } from "./form/panel-formu";
import { GorselSecimi } from "./gorsel-secimi";

// Kayıt seçeneği: kimliği ve panelde görünen adı.
export type KayitSecenegi = { kimlik: string; ad: string };
export type BolumFormuSecenekleri = {
  kategoriler: readonly KayitSecenegi[];
  markalar: readonly KayitSecenegi[];
  etiketler: readonly KayitSecenegi[];
  urunler: readonly KayitSecenegi[];
  // Sitede kayıtlı görseller (kart 0142): önizlemeyle seçilir (gorsel-secimi.tsx).
  gorseller: readonly GorselSecenegi[];
  // Menüler (kart 0108): kimlik yerine menünün kodu.
  menuler: readonly KayitSecenegi[];
  // Blog kategorileri (kart 0112): kimlik yerine adres adı. Blog işlevi yazılana kadar boştur.
  blogKategorileri: readonly KayitSecenegi[];
};

// Radix seçim kutusunun öğesi boş değer alamaz: "seçilmedi" bu değerle gösterilir, değere çevrilmez.
const secilmedi = "__secilmedi";

const urunKaynagiTurleri = ["yeni", "indirimli", "kategori", "marka", "etiket", "elle"] as const;
type UrunKaynagiTuru = (typeof urunKaynagiTurleri)[number];

type Degistir = (deger: unknown) => void;

function KayitSecimi({
  etiket,
  aciklama,
  hata,
  secenekler,
  deger,
  degistir,
  zorunlu,
}: {
  etiket: string;
  // Alanın açıklaması (kart 0112): seçim alanında da metin alanındaki gibi alanın altında görünür.
  aciklama: string | undefined;
  hata: string | undefined;
  secenekler: readonly KayitSecenegi[];
  deger: unknown;
  degistir: Degistir;
  zorunlu: boolean;
}) {
  const metin = usePanelMetni();
  return (
    <FormAlani
      etiket={etiket}
      {...(aciklama === undefined ? {} : { aciklama })}
      {...(hata === undefined ? {} : { hata })}
    >
      {(alan) => (
        <SecimKutusu
          value={typeof deger === "string" ? deger : secilmedi}
          onValueChange={(yeni) => degistir(yeni === secilmedi ? undefined : yeni)}
        >
          <SecimTetikleyici {...alan}>
            <SecimDegeri />
          </SecimTetikleyici>
          <SecimListesi>
            {zorunlu ? null : (
              <SecimOgesi value={secilmedi}>{metin("yonetim.bolumFormu.secilmedi")}</SecimOgesi>
            )}
            {secenekler.map((secenek) => (
              <SecimOgesi key={secenek.kimlik} value={secenek.kimlik}>
                {secenek.ad}
              </SecimOgesi>
            ))}
          </SecimListesi>
        </SecimKutusu>
      )}
    </FormAlani>
  );
}

function UrunKaynagiAlani({
  alan,
  deger,
  degistir,
  secenekler,
  hata,
}: {
  alan: Extract<TekAlanTarifi, { tur: "urun-kaynagi" }>;
  deger: unknown;
  degistir: Degistir;
  secenekler: BolumFormuSecenekleri;
  hata: (yol: string) => string | undefined;
}) {
  const metin = usePanelMetni();
  const kaynak = (deger ?? undefined) as
    | ({ tur: UrunKaynagiTuru; adet?: number; urunler?: string[] } & Record<string, unknown>)
    | undefined;
  const turDegistir = (tur: string) => {
    if (tur === secilmedi) return degistir(undefined);
    degistir(tur === "elle" ? { tur, urunler: [] } : { tur, adet: kaynak?.adet ?? 4 });
  };
  const kayitlar: Partial<Record<UrunKaynagiTuru, readonly KayitSecenegi[]>> = {
    kategori: secenekler.kategoriler,
    marka: secenekler.markalar,
    etiket: secenekler.etiketler,
  };
  const secilenKayitlar = kaynak === undefined ? undefined : kayitlar[kaynak.tur];
  const urunler = kaynak?.urunler ?? [];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-kalin">{metin(alan.ad)}</legend>
      <FormAlani etiket={metin("yonetim.bolumFormu.kaynakTuru")}>
        {(baglanti) => (
          <SecimKutusu value={kaynak?.tur ?? secilmedi} onValueChange={turDegistir}>
            <SecimTetikleyici {...baglanti}>
              <SecimDegeri />
            </SecimTetikleyici>
            <SecimListesi>
              {alan.zorunlu === true ? null : (
                <SecimOgesi value={secilmedi}>{metin("yonetim.bolumFormu.secilmedi")}</SecimOgesi>
              )}
              {urunKaynagiTurleri.map((tur) => (
                <SecimOgesi key={tur} value={tur}>
                  {metin(`yonetim.bolumFormu.kaynak.${tur}` as MetinAnahtari)}
                </SecimOgesi>
              ))}
            </SecimListesi>
          </SecimKutusu>
        )}
      </FormAlani>
      {kaynak !== undefined && secilenKayitlar !== undefined ? (
        <KayitSecimi
          etiket={metin(`yonetim.bolumFormu.kaynak.${kaynak.tur}` as MetinAnahtari)}
          aciklama={undefined}
          hata={hata(kaynak.tur)}
          secenekler={secilenKayitlar}
          deger={kaynak[kaynak.tur]}
          degistir={(yeni) => degistir({ ...kaynak, [kaynak.tur]: yeni })}
          zorunlu
        />
      ) : null}
      {kaynak !== undefined && kaynak.tur !== "elle" ? (
        <FormAlani etiket={metin("yonetim.bolumFormu.adet")} {...hataOzelligi(hata("adet"))}>
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              type="number"
              min={1}
              max={alan.enCokUrun}
              value={kaynak.adet ?? ""}
              onChange={(olay) => degistir({ ...kaynak, adet: Number(olay.target.value) })}
            />
          )}
        </FormAlani>
      ) : null}
      {kaynak?.tur === "elle" ? (
        <>
          {urunler.map((urun, sira) => (
            // Aynı ürün geçici olarak iki satırda seçilebilir; satır sırasıyla tanınır.
            // biome-ignore lint/suspicious/noArrayIndexKey: satır sırasıyla tanınır.
            <div key={sira} className="flex items-end gap-2">
              <div className="flex-1">
                <KayitSecimi
                  etiket={`${metin("yonetim.bolumFormu.urun")} ${sira + 1}`}
                  aciklama={undefined}
                  hata={hata(`urunler.${sira}`)}
                  secenekler={secenekler.urunler}
                  deger={urun}
                  degistir={(yeni) =>
                    degistir({ ...kaynak, urunler: urunler.map((u, i) => (i === sira ? yeni : u)) })
                  }
                  zorunlu
                />
              </div>
              <Dugme
                tur="sade"
                onClick={() =>
                  degistir({ ...kaynak, urunler: urunler.filter((_, i) => i !== sira) })
                }
              >
                {metin("yonetim.bolumFormu.kaldir")}
              </Dugme>
            </div>
          ))}
          <Dugme
            tur="cerceveli"
            disabled={urunler.length >= alan.enCokUrun || secenekler.urunler.length === 0}
            onClick={() =>
              degistir({ ...kaynak, urunler: [...urunler, secenekler.urunler[0]?.kimlik] })
            }
          >
            {metin("yonetim.bolumFormu.urunEkle")}
          </Dugme>
        </>
      ) : null}
    </fieldset>
  );
}

const hataOzelligi = (hata: string | undefined) => (hata === undefined ? {} : { hata });

function TekAlan({
  alan,
  deger,
  degistir,
  secenekler,
  hata,
}: {
  alan: TekAlanTarifi;
  deger: unknown;
  degistir: Degistir;
  secenekler: BolumFormuSecenekleri;
  // Bu alanın altındaki yolun hatası ("" alanın kendisi).
  hata: (yol: string) => string | undefined;
}) {
  const metin = usePanelMetni();
  const etiket = metin(alan.ad);
  const aciklama = alan.aciklama === undefined ? undefined : metin(alan.aciklama);
  const zorunlu = alan.zorunlu === true;
  const metinDegeri = typeof deger === "string" ? deger : "";
  // Boş bırakılan metin "yok" demektir: şema boş metni kabul etmez.
  const metinDegistir = (yeni: string) => degistir(yeni === "" ? undefined : yeni);
  switch (alan.tur) {
    case "metin":
      return (
        <FormAlani
          etiket={etiket}
          {...(alan.aciklama === undefined ? {} : { aciklama: metin(alan.aciklama) })}
          {...hataOzelligi(hata(""))}
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              required={zorunlu}
              maxLength={alan.enCok}
              value={metinDegeri}
              onChange={(olay) => metinDegistir(olay.target.value)}
            />
          )}
        </FormAlani>
      );
    case "uzun-metin":
      return (
        <FormAlani
          etiket={etiket}
          {...(alan.aciklama === undefined ? {} : { aciklama: metin(alan.aciklama) })}
          {...hataOzelligi(hata(""))}
        >
          {(baglanti) => (
            <UzunMetinAlani
              {...baglanti}
              required={zorunlu}
              maxLength={alan.enCok}
              value={metinDegeri}
              onChange={(olay) => metinDegistir(olay.target.value)}
            />
          )}
        </FormAlani>
      );
    case "tarih":
      return (
        <FormAlani etiket={etiket} {...hataOzelligi(hata(""))}>
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              type={alan.saatli ? "datetime-local" : "date"}
              required={zorunlu}
              value={metinDegeri}
              onChange={(olay) => metinDegistir(olay.target.value)}
            />
          )}
        </FormAlani>
      );
    case "baglanti": {
      const baglantiDegeri = (deger ?? undefined) as
        | { adres: string; yeniSekme?: boolean }
        | undefined;
      return (
        <fieldset className="flex flex-col gap-3">
          <legend className="font-kalin">{etiket}</legend>
          <FormAlani
            etiket={metin("yonetim.bolumFormu.adres")}
            aciklama={metin("yonetim.bolumFormu.adresAciklamasi")}
            {...hataOzelligi(hata("adres"))}
          >
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                required={zorunlu}
                value={baglantiDegeri?.adres ?? ""}
                onChange={(olay) =>
                  degistir(
                    olay.target.value === ""
                      ? undefined
                      : { yeniSekme: false, ...baglantiDegeri, adres: olay.target.value },
                  )
                }
              />
            )}
          </FormAlani>
          <OnayKutusu
            etiket={metin("yonetim.bolumFormu.yeniSekme")}
            disabled={baglantiDegeri === undefined}
            checked={baglantiDegeri?.yeniSekme === true}
            onCheckedChange={(isaretli) =>
              baglantiDegeri === undefined
                ? undefined
                : degistir({ ...baglantiDegeri, yeniSekme: isaretli === true })
            }
          />
        </fieldset>
      );
    }
    case "gorsel":
      return (
        <GorselSecimi
          etiket={etiket}
          aciklama={aciklama}
          hata={hata("")}
          gorseller={secenekler.gorseller}
          deger={deger}
          degistir={degistir}
          zorunlu={zorunlu}
        />
      );
    case "kategori":
      return (
        <KayitSecimi
          etiket={etiket}
          aciklama={aciklama}
          hata={hata("")}
          secenekler={secenekler.kategoriler}
          deger={deger}
          degistir={degistir}
          zorunlu={zorunlu}
        />
      );
    case "marka":
      return (
        <KayitSecimi
          etiket={etiket}
          aciklama={aciklama}
          hata={hata("")}
          secenekler={secenekler.markalar}
          deger={deger}
          degistir={degistir}
          zorunlu={zorunlu}
        />
      );
    case "blog-kategorisi":
      // Blog kategorisi adres adıyla seçilir: seçeneğin kimliği kategorinin adres adıdır.
      return (
        <KayitSecimi
          etiket={etiket}
          aciklama={aciklama}
          hata={hata("")}
          secenekler={secenekler.blogKategorileri}
          deger={deger}
          degistir={degistir}
          zorunlu={zorunlu}
        />
      );
    case "menu":
      // Menü koduyla seçilir: seçeneğin kimliği menünün kodudur.
      return (
        <KayitSecimi
          etiket={etiket}
          aciklama={aciklama}
          hata={hata("")}
          secenekler={secenekler.menuler}
          deger={deger}
          degistir={degistir}
          zorunlu={zorunlu}
        />
      );
    case "renk":
      return (
        <KayitSecimi
          etiket={etiket}
          aciklama={aciklama}
          hata={hata("")}
          secenekler={alan.renkler.map((renk) => ({
            kimlik: renk,
            ad: metin(`yonetim.renk.${renk}` as MetinAnahtari),
          }))}
          deger={deger}
          degistir={degistir}
          zorunlu={zorunlu}
        />
      );
    case "secim":
      // Seçim her zaman bir değerdir: boşsa varsayılanı gösterilir, "seçilmedi" yoktur.
      return (
        <KayitSecimi
          etiket={etiket}
          aciklama={aciklama}
          hata={hata("")}
          secenekler={alan.secenekler.map((secenek) => ({
            kimlik: secenek.kod,
            ad: metin(secenek.ad),
          }))}
          deger={typeof deger === "string" ? deger : alan.varsayilan}
          degistir={degistir}
          zorunlu
        />
      );
    case "urun-kaynagi":
      return (
        <UrunKaynagiAlani
          alan={alan}
          deger={deger}
          degistir={degistir}
          secenekler={secenekler}
          hata={hata}
        />
      );
  }
}

function ListeAlani({
  yol,
  alan,
  deger,
  degistir,
  secenekler,
  hata,
}: {
  // Listenin formdaki yolu (alanın kodu): öğelerin alanları "<yol>.<sıra>.<kod>" adıyla bulunur (kart 0259).
  yol: string;
  alan: Extract<AlanTarifi, { tur: "liste" }>;
  deger: unknown;
  degistir: Degistir;
  secenekler: BolumFormuSecenekleri;
  hata: (yol: string) => string | undefined;
}) {
  const metin = usePanelMetni();
  const kimlik = useId();
  const ogeler = (Array.isArray(deger) ? deger : []) as Record<string, unknown>[];
  const listeHatasi = hata("");
  return (
    <fieldset
      className="flex flex-col gap-4"
      aria-describedby={listeHatasi === undefined ? undefined : `${kimlik}-hata`}
    >
      <legend className="font-kalin">{metin(alan.ad)}</legend>
      {ogeler.map((oge, sira) => (
        // Öğelerin kimliği yoktur; sırası kimliğidir.
        // biome-ignore lint/suspicious/noArrayIndexKey: öğe sırasıyla tanınır.
        <fieldset key={sira} className="flex flex-col gap-3 border-l-2 border-kenar pl-4">
          <legend>
            {metin(alan.ogeAdi)} {sira + 1}
          </legend>
          {Object.entries(alan.alanlar).map(([kod, alt]) => (
            <AlanKabi
              key={kod}
              ad={`${yol}.${sira}.${kod}`}
              etiket={doldur(metin("yonetim.bolumFormu.ogeAlani"), {
                oge: metin(alan.ogeAdi),
                sira: String(sira + 1),
                alan: metin(alt.ad),
              })}
            >
              <TekAlan
                alan={alt}
                deger={oge[kod]}
                degistir={(yeni) =>
                  degistir(ogeler.map((o, i) => (i === sira ? { ...o, [kod]: yeni } : o)))
                }
                secenekler={secenekler}
                hata={(alt) => hata(alt === "" ? `${sira}.${kod}` : `${sira}.${kod}.${alt}`)}
              />
            </AlanKabi>
          ))}
          <Dugme
            tur="sade"
            disabled={ogeler.length <= alan.enAz}
            onClick={() => degistir(ogeler.filter((_, i) => i !== sira))}
          >
            {metin("yonetim.bolumFormu.kaldir")}
          </Dugme>
        </fieldset>
      ))}
      <Dugme
        tur="cerceveli"
        disabled={ogeler.length >= alan.enCok}
        onClick={() => degistir([...ogeler, {}])}
      >
        {doldur(metin("yonetim.bolumFormu.ogeEkle"), { ad: metin(alan.ogeAdi) })}
      </Dugme>
      {listeHatasi === undefined ? null : (
        <span id={`${kimlik}-hata`} className="font-kalin text-tehlike-yazi">
          {listeHatasi}
        </span>
      )}
    </fieldset>
  );
}

// Bölümün düzenleme formu. hatalar: alanın yolu ("baslik", "maddeler.0.metin", "baglanti.adres") ile
// gösterilecek metin.
export function BolumFormu({
  tarif,
  ilkDegerler = {},
  secenekler,
  hatalar = {},
  degisince,
}: {
  tarif: BolumTarifi;
  ilkDegerler?: BolumDegerleri;
  secenekler: BolumFormuSecenekleri;
  hatalar?: Readonly<Record<string, string>>;
  degisince?: (degerler: BolumDegerleri) => void;
}) {
  const metin = usePanelMetni();
  const [degerler, setDegerler] = useState<BolumDegerleri>(ilkDegerler);
  const alanDegistir = (kod: string) => (yeni: unknown) => {
    const sonraki = { ...degerler };
    if (yeni === undefined) delete sonraki[kod];
    else sonraki[kod] = yeni;
    setDegerler(sonraki);
    degisince?.(sonraki);
  };
  return (
    <div className="flex flex-col gap-5" data-bolum-turu={tarif.tur}>
      {Object.entries(tarif.alanlar).map(([kod, alan]) => {
        const hata = (yol: string) => hatalar[yol === "" ? kod : `${kod}.${yol}`];
        // Alanın yeri ve adı (kart 0259): hata özeti ve odak alanı bununla bulur.
        return (
          <AlanKabi key={kod} ad={kod} etiket={metin(alan.ad)}>
            {alan.tur === "liste" ? (
              <ListeAlani
                yol={kod}
                alan={alan}
                deger={degerler[kod]}
                degistir={alanDegistir(kod)}
                secenekler={secenekler}
                hata={hata}
              />
            ) : (
              <TekAlan
                alan={alan}
                deger={degerler[kod]}
                degistir={alanDegistir(kod)}
                secenekler={secenekler}
                hata={hata}
              />
            )}
          </AlanKabi>
        );
      })}
    </div>
  );
}
