"use client";
// İade talebi formu (kart 0239, karar 0151; Canlı Çarşı taslağı siparis-ve-hesap.html): müşteri iade etmek istediği
// ürünleri onay kutusuyla, birden çok aldığı üründe adedi seçer; nedeni ve isteğe bağlı açıklamayı yazar. İade
// kargosunu kimin ödediği (site ayarı) formda söylenir. Talep edilemeyen ürün (iade edilmiş ya da talepte) kapalıdır.
// Şema uçla ortaktır (iade-talebi-semalari.ts). Hata olursa üstte alanlara bağlantılı özet çıkar ve odağı alır; alanın
// altında da yazar. Üye kendi ucuna, üye olmayan takip anahtarıyla robot korumalı (ertelenmiş) uca gider. Başarıda
// teşekkür görünür ve odağı alır.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { AdetSecici } from "../../../bilesenler/parcalar/adet-secici";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { useCizimdenSonraOdak } from "../../../bilesenler/parcalar/cizimden-sonra-odak";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import {
  type IadeKargosuOdeyen,
  iadeTalebiSinirlari,
  type MusteriIadeNedeni,
  musteriIadeNedenleri,
  siparisTakipCerezi,
} from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import type { VitrinMetinAnahtari } from "../../metinler/istemci-metni";
import { useMetin } from "../../metinler/istemci-metni";
import { useRobotluGonderim } from "../../moduller/robot-korumasi/istemci";
import { iadeTalebiFormuSemasi } from "../../moduller/siparis/iade-talebi-semalari";
import { SatirGorseli } from "../sepet/sepet-gorunumu";
import type { UrunKartiGorseli } from "../urun-karti/tur";

const uyeUcu = "/kapi/musteri/iade-talebi";
const takipUcu = `${siparisTakipCerezi.kapiYolu}/iade-talebi`;

export type IadeTalebiVerisi = {
  numara: string;
  yol: "hesap" | "takip";
  kalemler: {
    sira: number;
    ad: string;
    secim: string;
    adet: number;
    // Talep edilebilir adet; 0 ise satır kapalıdır.
    enCok: number;
    fiyat: string;
    gorsel?: UrunKartiGorseli;
  }[];
  kargo: IadeKargosuOdeyen;
  // Siparişin sayfası (teşekkürdeki "Siparişe dön").
  siparisAdresi: string;
};

const nedenMetinleri: Record<MusteriIadeNedeni, VitrinMetinAnahtari> = {
  "beklentiyi-karsilamadi": "vitrin.iadeTalebi.neden.beklentiyi-karsilamadi",
  "kusurlu-hasarli": "vitrin.iadeTalebi.neden.kusurlu-hasarli",
  "yanlis-urun": "vitrin.iadeTalebi.neden.yanlis-urun",
  "beden-uymadi": "vitrin.iadeTalebi.neden.beden-uymadi",
  diger: "vitrin.iadeTalebi.neden.diger",
};

type Alan = "kalemler" | "neden" | "aciklama";
const alanSirasi: Alan[] = ["kalemler", "neden", "aciklama"];
const alanAdlari: Record<Alan, VitrinMetinAnahtari> = {
  kalemler: "vitrin.iadeTalebi.urunlerKisa",
  neden: "vitrin.iadeTalebi.neden.baslik",
  aciklama: "vitrin.iadeTalebi.aciklama",
};
const alanHataMetinleri: Record<Alan, VitrinMetinAnahtari> = {
  kalemler: "vitrin.iadeTalebi.hata.kalemler",
  neden: "vitrin.iadeTalebi.hata.neden",
  aciklama: "vitrin.iadeTalebi.hata.aciklama",
};

type Genel = "bekleyen" | "kapali" | "bulunamadi" | "sinir" | "genel";
const genelMetinler: Record<Genel, VitrinMetinAnahtari> = {
  bekleyen: "vitrin.iadeTalebi.hata.bekleyen",
  kapali: "vitrin.iadeTalebi.hata.kapali",
  bulunamadi: "vitrin.iadeTalebi.hata.bulunamadi",
  sinir: "vitrin.iadeTalebi.hata.sinir",
  genel: "vitrin.iadeTalebi.hata.genel",
};

export function IadeTalebiFormu({ veri }: { veri: IadeTalebiVerisi }) {
  const metin = useMetin();
  const robotluGonder = useRobotluGonderim({ ertele: true });
  const [secili, setSecili] = useState<Record<number, number>>({});
  const [neden, setNeden] = useState<MusteriIadeNedeni | "">("");
  const [hatalar, setHatalar] = useState<Partial<Record<Alan, string | undefined>>>({});
  const [genel, setGenel] = useState<Genel | null>(null);
  const [alindi, setAlindi] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  const ozet = useRef<HTMLDivElement>(null);
  const odakla = useCizimdenSonraOdak();
  const tesekkur = useRef<HTMLDivElement>(null);
  const kimlikler = useRef<Partial<Record<Alan, string>>>({}).current;
  // Ürünlerin hatasında odak ilk seçilebilir kutuya gider.
  const odaklan = (alan: Alan) => {
    if (alan === "kalemler") {
      document
        .querySelector<HTMLElement>('#iade-urunleri button[role="checkbox"]:not([disabled])')
        ?.focus();
      return;
    }
    const kimlik = kimlikler[alan];
    if (kimlik !== undefined) document.getElementById(kimlik)?.focus();
  };

  useEffect(() => {
    if (alindi) tesekkur.current?.focus();
  }, [alindi]);

  const hatalariGoster = (yeni: Partial<Record<Alan, string>>, genelHata: Genel | null) => {
    setHatalar(yeni);
    setGenel(genelHata);
    // Özet hatalar çizildikten sonra görünür (boşken gizlidir); odak ona o zaman gider (kart 0307).
    odakla(() => ozet.current);
  };

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    const aciklama = String(new FormData(olay.currentTarget).get("aciklama") ?? "");
    const girdi = iadeTalebiFormuSemasi.safeParse({
      numara: veri.numara,
      kalemler: Object.entries(secili).map(([sira, adet]) => ({ sira: Number(sira), adet })),
      neden,
      aciklama,
    });
    if (!girdi.success) {
      const yeni: Partial<Record<Alan, string>> = {};
      for (const sorun of girdi.error.issues) {
        const alan = sorun.path[0] as Alan;
        if (alanSirasi.includes(alan) && yeni[alan] === undefined) {
          yeni[alan] = metin(alanHataMetinleri[alan]);
        }
      }
      hatalariGoster(yeni, Object.keys(yeni).length === 0 ? "genel" : null);
      return;
    }
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      const yanit =
        veri.yol === "hesap"
          ? await kapiyaIstek(uyeUcu, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(girdi.data),
            })
          : await robotluGonder(takipUcu, girdi.data);
      if (yanit.ok) {
        setAlindi(true);
        return;
      }
      const zarf = (await yanit.json().catch(() => undefined)) as
        | { hata?: { ayrinti?: { alan: string; kod: string }[] } }
        | undefined;
      const ayrinti = zarf?.hata?.ayrinti ?? [];
      if (yanit.status === hataKodlari.dogrulama && ayrinti.length > 0) {
        const yeni: Partial<Record<Alan, string>> = {};
        for (const { alan } of ayrinti) {
          const ust = alan.split(".")[0] as Alan;
          if (alanSirasi.includes(ust)) yeni[ust] = metin(alanHataMetinleri[ust]);
        }
        hatalariGoster(yeni, Object.keys(yeni).length === 0 ? "genel" : null);
      } else if (yanit.status === hataKodlari.cakisma) {
        hatalariGoster({}, "bekleyen");
      } else if (yanit.status === hataKodlari["is-kurali"]) {
        hatalariGoster({}, "kapali");
      } else if (yanit.status === hataKodlari.bulunamadi) {
        hatalariGoster({}, "bulunamadi");
      } else if (yanit.status === hataKodlari["istek-siniri"]) {
        hatalariGoster({}, "sinir");
      } else {
        hatalariGoster({}, "genel");
      }
    } catch {
      hatalariGoster({}, "genel");
    } finally {
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  if (alindi) {
    return (
      <div
        ref={tesekkur}
        tabIndex={-1}
        role="status"
        className="flex flex-col items-center gap-3 py-6 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-dugme bg-basari-zemin text-basari-yazi">
          <Ikon ad="basari" className="size-6" />
        </span>
        <h2 className="font-baslik text-baslik-2 font-baslik-kalinligi">
          {metin("vitrin.iadeTalebi.alindi")}
        </h2>
        <p className="max-w-metin text-soluk-yazi">{metin("vitrin.iadeTalebi.alindiAciklamasi")}</p>
        <Baglanti href={veri.siparisAdresi} gorunum="sade">
          {metin("vitrin.iadeTalebi.siparisinizeDonun")}
        </Baglanti>
      </div>
    );
  }

  const hataSayisi = alanSirasi.filter((alan) => hatalar[alan] !== undefined).length;
  return (
    <div className="flex flex-col gap-4">
      <div ref={ozet} tabIndex={-1} className="empty:hidden">
        {genel !== null ? (
          <Uyari tur="tehlike">{metin(genelMetinler[genel])}</Uyari>
        ) : hataSayisi > 0 ? (
          <Uyari tur="tehlike">
            <span className="flex flex-col gap-1">
              <strong>
                {doldur(metin("vitrin.iadeTalebi.hataOzeti"), { sayi: String(hataSayisi) })}
              </strong>
              <ul className="list-disc pl-5">
                {alanSirasi
                  .filter((alan) => hatalar[alan] !== undefined)
                  .map((alan) => (
                    <li key={alan}>
                      <a
                        href={`#${alan === "kalemler" ? "iade-urunleri" : (kimlikler[alan] ?? "")}`}
                        onClick={(olay) => {
                          olay.preventDefault();
                          odaklan(alan);
                        }}
                        className="font-kalin text-yazi underline"
                      >
                        {metin(alanAdlari[alan])}
                      </a>
                    </li>
                  ))}
              </ul>
            </span>
          </Uyari>
        ) : null}
      </div>
      <Kart className="p-5 tablet:p-6">
        <Form
          onSubmit={gonder}
          kodGerekliMetni={metin("ortak.form.kodGerekli")}
          yukleniyorMetni={metin("ortak.form.yukleniyor")}
          className="flex flex-col gap-5"
        >
          <fieldset
            id="iade-urunleri"
            className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
            aria-describedby={hatalar.kalemler === undefined ? undefined : "iade-urun-hatasi"}
          >
            <legend className="mb-2 font-kalin">{metin("vitrin.iadeTalebi.urunler")}</legend>
            {/* Taslaktaki gibi: her ürün çerçeveli satırdır; seçilen satırın çerçevesi kalın, istenemeyeninki kesik. */}
            <ul className="flex flex-col gap-2">
              {veri.kalemler.map((kalem) => {
                const adet = secili[kalem.sira];
                const kapali = kalem.enCok === 0;
                return (
                  <li
                    key={kalem.sira}
                    className={sinif(
                      "flex flex-wrap items-center gap-3 rounded-orta p-3",
                      kapali
                        ? "border border-dashed border-kenar"
                        : adet === undefined
                          ? "border border-kenar"
                          : "border-2 border-yazi",
                    )}
                  >
                    <SatirGorseli
                      satir={kalem.gorsel === undefined ? {} : { gorsel: kalem.gorsel }}
                      buyukluk="size-16"
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <OnayKutusu
                        etiket={kalem.ad}
                        className="font-kalin wrap-anywhere"
                        checked={adet !== undefined}
                        disabled={kapali}
                        onCheckedChange={(isaretli) => {
                          setSecili((onceki) => {
                            const yeni = { ...onceki };
                            if (isaretli === true) yeni[kalem.sira] = 1;
                            else delete yeni[kalem.sira];
                            return yeni;
                          });
                          setHatalar((onceki) => ({ ...onceki, kalemler: undefined }));
                        }}
                        {...(hatalar.kalemler !== undefined && !kapali
                          ? { "aria-invalid": true }
                          : {})}
                      />
                      {kalem.secim === "" ? null : (
                        <span className="text-kucuk text-soluk-yazi">{kalem.secim}</span>
                      )}
                      <span className="text-kucuk text-soluk-yazi">
                        {kapali
                          ? metin("vitrin.iadeTalebi.istenemez")
                          : doldur(metin("vitrin.iadeTalebi.alinanAdet"), {
                              adet: String(kalem.adet),
                              fiyat: kalem.fiyat,
                            })}
                      </span>
                    </span>
                    {adet !== undefined && kalem.enCok > 1 ? (
                      <AdetSecici
                        deger={adet}
                        enAz={1}
                        enCok={kalem.enCok}
                        onDegerDegisti={(yeni) =>
                          setSecili((onceki) => ({ ...onceki, [kalem.sira]: yeni }))
                        }
                        etiketler={{
                          grup: doldur(metin("vitrin.iadeTalebi.adetGrubu"), { urun: kalem.ad }),
                          azalt: doldur(metin("vitrin.iadeTalebi.azalt"), { urun: kalem.ad }),
                          artir: doldur(metin("vitrin.iadeTalebi.artir"), { urun: kalem.ad }),
                        }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {hatalar.kalemler === undefined ? null : (
              <span id="iade-urun-hatasi" className="font-kalin text-tehlike-yazi">
                {hatalar.kalemler}
              </span>
            )}
          </fieldset>
          <FormAlani
            etiket={metin("vitrin.iadeTalebi.neden.baslik")}
            {...(hatalar.neden === undefined ? {} : { hata: hatalar.neden })}
          >
            {(alan) => {
              kimlikler.neden = alan.id;
              return (
                <SecimKutusu
                  value={neden}
                  onValueChange={(deger) => {
                    setNeden(deger as MusteriIadeNedeni);
                    setHatalar((onceki) => ({ ...onceki, neden: undefined }));
                  }}
                >
                  <SecimTetikleyici {...alan} className="tablet:max-w-form">
                    <SecimDegeri placeholder={metin("vitrin.odeme.secin")} />
                  </SecimTetikleyici>
                  <SecimListesi>
                    {musteriIadeNedenleri.map((deger) => (
                      <SecimOgesi key={deger} value={deger}>
                        {metin(nedenMetinleri[deger])}
                      </SecimOgesi>
                    ))}
                  </SecimListesi>
                </SecimKutusu>
              );
            }}
          </FormAlani>
          <FormAlani
            etiket={metin("vitrin.iadeTalebi.aciklama")}
            aciklama={doldur(metin("vitrin.iadeTalebi.aciklamaIpucu"), {
              sinir: String(iadeTalebiSinirlari.aciklamaEnCok),
            })}
            {...(hatalar.aciklama === undefined ? {} : { hata: hatalar.aciklama })}
          >
            {(alan) => {
              kimlikler.aciklama = alan.id;
              return (
                <UzunMetinAlani
                  {...alan}
                  name="aciklama"
                  rows={4}
                  maxLength={iadeTalebiSinirlari.aciklamaEnCok}
                />
              );
            }}
          </FormAlani>
          <Uyari tur="bilgi">
            {metin(
              veri.kargo === "magaza"
                ? "vitrin.iadeTalebi.kargoMagaza"
                : "vitrin.iadeTalebi.kargoMusteri",
            )}
          </Uyari>
          {bekliyor ? <p role="status">{metin("vitrin.iadeTalebi.gonderiliyor")}</p> : null}
          <GonderDugmesi className="self-start" disabled={bekliyor}>
            {metin("vitrin.iadeTalebi.gonder")}
          </GonderDugmesi>
        </Form>
      </Kart>
    </div>
  );
}
