"use client";
// Adreslerim (kart 0237, karar 0149; Canlı Çarşı taslağı): müşterinin kayıtlı adresleri, boş hâl, ekleme ve düzenleme
// penceresi, onaylı silme ve "Varsayılan yap". Liste sunucuda çizilir, her işlemden sonra uçtan gelen güncel listeyle
// yenilenir. Form şeması uçla ortaktır (adres-semalari.ts); alanlar ödeme adımınınkilerdir (odeme/alanlar.tsx). Hata
// alanın altında yazar, odak ilk hatalı alana gider; sonuç bildirimle söylenir.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import {
  Pencere,
  PencereBasligi,
  PencereIcerigi,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { adresSatiri } from "../../bolgeler/adres-satiri";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { doldur } from "../../moduller/eposta/sablon";
import {
  type AdresListesi,
  adresFormuSemasi,
  type KayitliAdres,
} from "../../moduller/musteri/adres-semalari";
import { girisAdresiDonuslu, vitrinAdresleri } from "../adresler";
import {
  type Adres,
  AdresAlanlari,
  type AlanKimlikleri,
  adresGirdisi,
  type BolgeUlkesi,
  bosAdres,
  type HataHaritasi,
  hataMetni,
  MetinAlani,
  ulkeVerisindenAdlar,
} from "../odeme/alanlar";

export type AdresDefteriVerisi = {
  adresler: KayitliAdres[];
  ulkeler: BolgeUlkesi[];
  telefonZorunlu: boolean;
  sinir: number;
};

const uclar = {
  ekle: "/kapi/musteri/adres",
  degistir: "/kapi/musteri/adres-degistir",
  sil: "/kapi/musteri/adres-sil",
  varsayilan: "/kapi/musteri/adres-varsayilan",
} as const;

type Zarf = {
  veri?: AdresListesi;
  hata?: { kod: string; ayrinti?: { alan: string; kod: string }[] };
};

type GenelHata = "sinir" | "yok" | "genel";
const genelHataMetinleri: Record<GenelHata, MetinAnahtari> = {
  sinir: "vitrin.hesap.adresler.sinir",
  yok: "vitrin.hesap.adresler.yok",
  genel: "vitrin.hesap.adresler.hata",
};

// Uca istek; girişsiz müşteri girişe gider, bu sayfaya döner. Başarıda güncel liste, değilse hata.
const istek = async (
  uc: string,
  govde: unknown,
): Promise<
  { tur: "liste"; adresler: KayitliAdres[] } | { tur: "hata"; durum: number; zarf?: Zarf }
> => {
  const yanit = await kapiyaIstek(uc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(govde),
  });
  const zarf = (await yanit.json().catch(() => undefined)) as Zarf | undefined;
  if (yanit.ok && zarf?.veri !== undefined) return { tur: "liste", adresler: zarf.veri.adresler };
  if (yanit.status === hataKodlari["oturum-yok"]) {
    window.location.assign(girisAdresiDonuslu(vitrinAdresleri.hesapAdresleri));
  }
  return { tur: "hata", durum: yanit.status, ...(zarf === undefined ? {} : { zarf }) };
};

const genelHataSec = (durum: number, zarf: Zarf | undefined): GenelHata =>
  durum === hataKodlari["is-kurali"] &&
  (zarf?.hata?.ayrinti ?? []).some(({ kod }) => kod === "adres-siniri")
    ? "sinir"
    : durum === hataKodlari.bulunamadi
      ? "yok"
      : "genel";

const formAdresi = (adres: KayitliAdres | undefined, ilkUlke: string): Adres =>
  adres === undefined
    ? bosAdres(ilkUlke)
    : {
        ulke: adres.teslimat.adres.ulke,
        il: adres.teslimat.adres.il ?? "",
        ilce: adres.teslimat.adres.ilce ?? "",
        adres: adres.teslimat.adres.adres,
        postaKodu: adres.teslimat.adres.postaKodu ?? "",
      };

function AdresFormu({
  duzenlenen,
  veri,
  ilkAdres,
  onKaydedildi,
}: {
  duzenlenen: KayitliAdres | undefined;
  veri: AdresDefteriVerisi;
  // Defterin ilk adresi iki türde varsayılan olur: kutular işaretli gelir.
  ilkAdres: boolean;
  onKaydedildi: (adresler: KayitliAdres[]) => void;
}) {
  const metin = useMetin();
  const [adres, setAdres] = useState<Adres>(formAdresi(duzenlenen, veri.ulkeler[0]?.kod ?? ""));
  const [varsayilan, setVarsayilan] = useState({
    teslimat: duzenlenen?.varsayilanTeslimat ?? ilkAdres,
    fatura: duzenlenen?.varsayilanFatura ?? ilkAdres,
  });
  const [hatalar, setHatalar] = useState<HataHaritasi>({});
  const [genelHata, setGenelHata] = useState<GenelHata | null>(null);
  const gonderiliyor = useRef(false);
  const formYeri = useRef<HTMLDivElement>(null);
  const kimlikler = useRef<AlanKimlikleri>({}).current;

  // Klavyeyle dolduran kişi hatanın olduğu ilk alana gider.
  useEffect(() => {
    if (Object.keys(hatalar).length === 0) return;
    formYeri.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [hatalar]);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    const form = new FormData(olay.currentTarget);
    const deger = (ad: string) => String(form.get(ad) ?? "");
    const girdi = {
      baslik: deger("baslik"),
      teslimat: {
        ad: deger("teslimat.ad"),
        soyad: deger("teslimat.soyad"),
        telefon: deger("teslimat.telefon"),
        adres: adresGirdisi(adres),
      },
      varsayilanTeslimat: varsayilan.teslimat,
      varsayilanFatura: varsayilan.fatura,
    };
    const sonuc = adresFormuSemasi.safeParse(girdi);
    const yeniHatalar: HataHaritasi = {};
    // Telefonun zorunluluğu sitenin ayarıdır: şema yalnız biçimi denetler.
    if (veri.telefonZorunlu && girdi.teslimat.telefon.trim() === "") {
      yeniHatalar["teslimat.telefon"] = metin("vitrin.odeme.hata.gerekli");
    }
    if (!sonuc.success) {
      for (const sorun of sonuc.error.issues) {
        const alan = sorun.path.join(".");
        if (yeniHatalar[alan] !== undefined) continue;
        yeniHatalar[alan] = hataMetni(
          metin,
          alan,
          sorun.code === "custom" ? sorun.message : sorun.code,
          0,
        );
      }
    }
    setGenelHata(null);
    setHatalar(yeniHatalar);
    if (!sonuc.success || Object.keys(yeniHatalar).length > 0) return;
    gonderiliyor.current = true;
    try {
      const cevap = await istek(
        duzenlenen === undefined ? uclar.ekle : uclar.degistir,
        duzenlenen === undefined ? sonuc.data : { ...sonuc.data, kimlik: duzenlenen.kimlik },
      );
      if (cevap.tur === "liste") {
        onKaydedildi(cevap.adresler);
        return;
      }
      const ayrinti = cevap.zarf?.hata?.ayrinti ?? [];
      if (cevap.durum === hataKodlari.dogrulama && ayrinti.length > 0) {
        setHatalar(
          Object.fromEntries(
            ayrinti.map(({ alan, kod }) => [alan, hataMetni(metin, alan, kod, 0)]),
          ),
        );
      } else {
        setGenelHata(genelHataSec(cevap.durum, cevap.zarf));
      }
    } catch {
      setGenelHata("genel");
    } finally {
      gonderiliyor.current = false;
    }
  };

  const sinir = { sinir: String(veri.sinir) };
  return (
    <div ref={formYeri}>
      <Form
        className="flex flex-col gap-4"
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
      >
        {genelHata === null ? null : (
          <Uyari tur="tehlike">{doldur(metin(genelHataMetinleri[genelHata]), sinir)}</Uyari>
        )}
        <MetinAlani
          ad="baslik"
          etiket={metin("vitrin.hesap.adresler.baslikAlani")}
          aciklama={metin("vitrin.hesap.adresler.baslikAciklama")}
          {...(duzenlenen === undefined ? {} : { varsayilan: duzenlenen.baslik })}
          hatalar={hatalar}
          kimlikler={kimlikler}
        />
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <MetinAlani
            ad="teslimat.ad"
            etiket={metin("vitrin.odeme.ad")}
            autoComplete="given-name"
            {...(duzenlenen === undefined ? {} : { varsayilan: duzenlenen.teslimat.ad })}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
          <MetinAlani
            ad="teslimat.soyad"
            etiket={metin("vitrin.odeme.soyad")}
            autoComplete="family-name"
            {...(duzenlenen === undefined ? {} : { varsayilan: duzenlenen.teslimat.soyad })}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
          <MetinAlani
            ad="teslimat.telefon"
            etiket={metin(
              veri.telefonZorunlu ? "vitrin.odeme.telefon" : "vitrin.odeme.telefonIstegeBagli",
            )}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...(duzenlenen?.teslimat.telefon === undefined
              ? {}
              : { varsayilan: duzenlenen.teslimat.telefon })}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
        </div>
        <AdresAlanlari
          onEk="teslimat.adres"
          adres={adres}
          degistir={setAdres}
          ulkeler={veri.ulkeler}
          hatalar={hatalar}
          kimlikler={kimlikler}
        />
        <div className="flex flex-col gap-2">
          <OnayKutusu
            etiket={metin("vitrin.hesap.adresler.varsayilanTeslimatAlani")}
            checked={varsayilan.teslimat}
            onCheckedChange={(deger) => setVarsayilan({ ...varsayilan, teslimat: deger === true })}
          />
          <OnayKutusu
            etiket={metin("vitrin.hesap.adresler.varsayilanFaturaAlani")}
            checked={varsayilan.fatura}
            onCheckedChange={(deger) => setVarsayilan({ ...varsayilan, fatura: deger === true })}
          />
        </div>
        <GonderDugmesi>{metin("vitrin.hesap.adresler.kaydet")}</GonderDugmesi>
      </Form>
    </div>
  );
}

// Adresin varsayılan rozetinin metni: iki tür, yalnız teslimat ya da yalnız fatura.
const varsayilanMetni = (adres: KayitliAdres): MetinAnahtari | undefined =>
  adres.varsayilanTeslimat && adres.varsayilanFatura
    ? "vitrin.hesap.adresler.varsayilanIkisi"
    : adres.varsayilanTeslimat
      ? "vitrin.hesap.adresler.varsayilanTeslimat"
      : adres.varsayilanFatura
        ? "vitrin.hesap.adresler.varsayilanFatura"
        : undefined;

// Silmeden sonra odağın gideceği düğme ("Yeni adres ekle": boş hâlde ya da ızgaranın sonunda; sınırdayken yoktur).
const ekleKimligi = "adres-ekle";

// Sayaç yazısı: sınıra ulaşınca odak buraya geçer.
const sayacKimligi = "adres-sayisi";
const duzenleKimligi = (adres: KayitliAdres) => `adres-duzenle-${adres.kimlik}`;

// Kartın düğmeleri kenarlıdır (taslak).
const kartDugmesi = "border border-kenar px-3";

export function AdresDefteri({ veri }: { veri: AdresDefteriVerisi }) {
  const metin = useMetin();
  const [adresler, setAdresler] = useState(veri.adresler);
  // Açık form: yeni adres ya da düzenlenen adres.
  const [form, setForm] = useState<{ duzenlenen: KayitliAdres | undefined } | null>(null);
  const [silinecek, setSilinecek] = useState<KayitliAdres | null>(null);
  // Pencere kapanınca odağın gideceği öğe: açan öğe kalktıysa (sınıra ulaşınca "Yeni adres ekle") bu verilir.
  const kapanisOdagi = useRef<string | null>(null);

  const adlar = ulkeVerisindenAdlar(veri.ulkeler);
  const satir = (adres: KayitliAdres) => adresSatiri(adres.teslimat.adres, adlar);

  const varsayilanYap = async (adres: KayitliAdres) => {
    try {
      const cevap = await istek(uclar.varsayilan, {
        kimlik: adres.kimlik,
        turler: ["teslimat", "fatura"],
      });
      if (cevap.tur === "liste") {
        setAdresler(cevap.adresler);
        bildirimGoster(
          "basari",
          doldur(metin("vitrin.hesap.adresler.varsayilanOldu"), { baslik: adres.baslik }),
        );
        // "Varsayılan yap" düğmesi kalktı, kart başa taşındı: odak kartın "Düzenle"sine geçer (bağımsız kontrolün
        // bulgusu).
        requestAnimationFrame(() => document.getElementById(duzenleKimligi(adres))?.focus());
        return;
      }
      bildirimGoster("tehlike", metin(genelHataMetinleri[genelHataSec(cevap.durum, cevap.zarf)]));
    } catch {
      bildirimGoster("tehlike", metin(genelHataMetinleri.genel));
    }
  };

  const sil = async () => {
    if (silinecek === null) return;
    try {
      const cevap = await istek(uclar.sil, { kimlik: silinecek.kimlik });
      if (cevap.tur === "liste") {
        setAdresler(cevap.adresler);
        bildirimGoster("basari", metin("vitrin.hesap.adresler.silindi"));
        // Silinen kartın düğmesi kalktı: odak "Yeni adres ekle"ye geçer (boş hâlde onun düğmesine).
        requestAnimationFrame(() => document.getElementById(ekleKimligi)?.focus());
        return;
      }
      bildirimGoster("tehlike", metin(genelHataMetinleri[genelHataSec(cevap.durum, cevap.zarf)]));
    } catch {
      bildirimGoster("tehlike", metin(genelHataMetinleri.genel));
    }
  };

  const sinirda = adresler.length >= veri.sinir;

  return (
    <>
      {adresler.length === 0 ? (
        <BosHal
          ikon="konum"
          baslik={metin("vitrin.hesap.adresler.bosBaslik")}
          aciklama={metin("vitrin.hesap.adresler.bosAciklama")}
        >
          <Dugme
            id={ekleKimligi}
            tur="birincil"
            onClick={() => setForm({ duzenlenen: undefined })}
            aria-haspopup="dialog"
          >
            <Ikon ad="ekle" />
            {metin("vitrin.hesap.adresler.ekle")}
          </Dugme>
        </BosHal>
      ) : (
        <>
          <ul
            aria-label={metin("vitrin.hesap.adresler.liste")}
            className="grid grid-cols-1 gap-4 tablet:grid-cols-2"
          >
            {adresler.map((adres) => {
              const rozet = varsayilanMetni(adres);
              return (
                <li key={adres.kimlik}>
                  <Kart
                    className={sinif(
                      "flex h-full flex-col gap-3 p-4",
                      // Varsayılan teslimat adresi kalın kenarlıdır (taslak).
                      adres.varsayilanTeslimat && "border-2 border-yazi",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-govde text-govde font-en-kalin wrap-anywhere">
                        {adres.baslik}
                      </h2>
                      {rozet === undefined ? null : <Rozet tur="ikincil">{metin(rozet)}</Rozet>}
                    </div>
                    <p className="flex flex-col wrap-anywhere">
                      <span>
                        {[`${adres.teslimat.ad} ${adres.teslimat.soyad}`, adres.teslimat.telefon]
                          .filter((parca) => parca !== undefined)
                          .join(" · ")}
                      </span>
                      <span className="text-soluk-yazi">{satir(adres)}</span>
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1">
                      <Dugme
                        id={duzenleKimligi(adres)}
                        tur="sade"
                        className={kartDugmesi}
                        aria-label={doldur(metin("vitrin.hesap.adresler.duzenleEtiket"), {
                          baslik: adres.baslik,
                        })}
                        aria-haspopup="dialog"
                        onClick={() => setForm({ duzenlenen: adres })}
                      >
                        <Ikon ad="duzenle" />
                        {metin("vitrin.hesap.adresler.duzenle")}
                      </Dugme>
                      {adres.varsayilanTeslimat && adres.varsayilanFatura ? null : (
                        <Dugme
                          tur="sade"
                          className={kartDugmesi}
                          aria-label={doldur(metin("vitrin.hesap.adresler.varsayilanYapEtiket"), {
                            baslik: adres.baslik,
                          })}
                          onClick={() => void varsayilanYap(adres)}
                        >
                          {metin("vitrin.hesap.adresler.varsayilanYap")}
                        </Dugme>
                      )}
                      <Dugme
                        tur="sade"
                        className={kartDugmesi}
                        aria-label={doldur(metin("vitrin.hesap.adresler.silEtiket"), {
                          baslik: adres.baslik,
                        })}
                        onClick={() => setSilinecek(adres)}
                      >
                        <Ikon ad="sil" />
                        {metin("vitrin.hesap.adresler.sil")}
                      </Dugme>
                    </div>
                  </Kart>
                </li>
              );
            })}
            {sinirda ? null : (
              <li>
                <Dugme
                  id={ekleKimligi}
                  tur="sade"
                  className="h-full w-full flex-col gap-2 rounded-orta border-2 border-dashed border-kenar py-12 font-kalin"
                  onClick={() => setForm({ duzenlenen: undefined })}
                  aria-haspopup="dialog"
                >
                  <Ikon ad="ekle" />
                  {metin("vitrin.hesap.adresler.ekle")}
                </Dugme>
              </li>
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <p id={sayacKimligi} tabIndex={-1} className="text-kucuk text-soluk-yazi">
              {doldur(
                metin(sinirda ? "vitrin.hesap.adresler.sinir" : "vitrin.hesap.adresler.sayi"),
                { sayi: String(adresler.length), sinir: String(veri.sinir) },
              )}
            </p>
          </div>
        </>
      )}
      <Pencere open={form !== null} onOpenChange={(acik) => (acik ? undefined : setForm(null))}>
        <PencereIcerigi
          kapatEtiketi={metin("ortak.parca.kapat")}
          genislik="orta"
          onCloseAutoFocus={(olay) => {
            const hedef = kapanisOdagi.current;
            kapanisOdagi.current = null;
            if (hedef === null) return;
            olay.preventDefault();
            document.getElementById(hedef)?.focus();
          }}
        >
          <PencereUstu>
            <PencereBasligi>
              {metin(
                form?.duzenlenen === undefined
                  ? "vitrin.hesap.adresler.yeniBaslik"
                  : "vitrin.hesap.adresler.duzenleBaslik",
              )}
            </PencereBasligi>
          </PencereUstu>
          {form === null ? null : (
            <AdresFormu
              key={form.duzenlenen?.kimlik ?? "yeni"}
              duzenlenen={form.duzenlenen}
              veri={veri}
              ilkAdres={adresler.length === 0}
              onKaydedildi={(yeniler) => {
                setAdresler(yeniler);
                // Sınıra ulaşan eklemede "Yeni adres ekle" kalkar: odak sayaca geçer (bağımsız kontrolün bulgusu).
                if (yeniler.length >= veri.sinir) kapanisOdagi.current = sayacKimligi;
                bildirimGoster(
                  "basari",
                  metin(
                    form.duzenlenen === undefined
                      ? "vitrin.hesap.adresler.eklendi"
                      : "vitrin.hesap.adresler.kaydedildi",
                  ),
                );
                setForm(null);
              }}
            />
          )}
        </PencereIcerigi>
      </Pencere>
      <OnayPenceresi
        acik={silinecek !== null}
        acikDegisince={(acik) => (acik ? undefined : setSilinecek(null))}
        baslik={metin("vitrin.hesap.adresler.silBaslik")}
        aciklama={doldur(metin("vitrin.hesap.adresler.silAciklama"), {
          baslik: silinecek?.baslik ?? "",
        })}
        onayEtiketi={metin("vitrin.hesap.adresler.silOnay")}
        vazgecEtiketi={metin("vitrin.hesap.adresler.vazgec")}
        onayla={sil}
        tur="tehlike"
      />
    </>
  );
}
