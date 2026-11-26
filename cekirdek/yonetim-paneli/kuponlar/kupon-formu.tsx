"use client";
// Kupon formu (kart 0313, karar 0188; taslak: planlar/tasarim-yonu/panel-2.html "Kuponlar" formu): yeni kupon ve
// düzenleme. Bölümler: kupon (kod, ad, indirim türü ve indirim, en az sepet tutarı), hangi ürünlerde geçer (kapsam,
// kategori ya da ürün seçimi, indirimli ürünlerde geçmez), süre ve kullanım sınırı, durum; en sonda özet. Tek form,
// "Kaydet" birlikte kaydeder; hata ve odak ortak form yapısındadır (karar 0159).
//
// - Alanlar metin gider: tutar sitenin para biçimiyle, zaman sitenin saat diliminde; sunucu okur (panelKuponGirdisi).
// - Düzenlemede yalnız değişen alanlar gider, ekranın gördüğü değişme anıyla (arada değişen kupon çakışır). İndirim
//   türüyle, kapsam seçimiyle birlikte gider.
// - Kullanılmış kuponun kodu, türü, indirimi, kapsamı ve "indirimli ürünlerde geçmez"i kapalıdır, nedeni yazar; sunucu
//   yine denetler.
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  type KuponKapsami,
  type KuponTuru,
  kuponSinirlari,
  kuponTurleri,
} from "../../kayitlar/kampanya";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { kuponHataMetinleri } from "../../moduller/kampanya/semalar";
import { kuponAdresi, kuponlarAdresi } from "../adresler";
import { CokluKayitSecimi } from "../coklu-kayit-secimi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { kodluAlanHatalari, kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { useSunucuFormu } from "../sunucu-formu";
import type { KuponEkraniVerisi, KuponFormu } from "./veri";

const hataMetni = kodluHataMetni(kuponHataMetinleri);
// Metinlerdeki sınırlar kayıttan (metne sayı yazılmaz).
const sinirYazilari = {
  kodEnAz: String(kuponSinirlari.kodEnAz),
  kodEnCok: String(kuponSinirlari.kodEnCok),
  yuzdeEnAz: String(kuponSinirlari.yuzdeEnAz),
  yuzdeEnCok: String(kuponSinirlari.yuzdeEnCok),
  kapsamEnCok: String(kuponSinirlari.kapsamEnCok),
};
// Kapsamın ekrandaki sırası (taslak): bütün ürünler, kategoriler, ürünler.
const kapsamSirasi = ["hepsi", "kategoriler", "urunler"] as const satisfies readonly KuponKapsami[];

// Formun alanları (hata ve odak), ekrandaki sırayla.
const alanlar = [
  "kod",
  "ad",
  "tur",
  "deger",
  "enAzTutar",
  "kapsam",
  "kapsamKayitlari",
  "indirimdeGecmez",
  "baslangic",
  "bitis",
  "toplamSinir",
  "kisiBasiSinir",
  "acik",
] as const;

// Formun uç girdisi: yeni kuponda bütün alanlar; düzenlemede sunucudan gelen hâline göre değişenler (indirim türüyle,
// kapsam seçimiyle birlikte).
export const kuponGirdisi = (
  form: KuponFormu,
  bilinen: KuponFormu,
  yeni: boolean,
): Record<string, unknown> => {
  const hali = (f: KuponFormu): Record<string, unknown> => ({
    kod: f.kod,
    ad: f.ad,
    tur: f.tur,
    deger: f.tur === "ucretsiz-kargo" ? "" : f.deger,
    enAzTutar: f.enAzTutar,
    kapsam: f.kapsam,
    kapsamKayitlari: f.kapsam === "hepsi" ? [] : f.kapsamKayitlari.map(({ kimlik }) => kimlik),
    baslangic: f.baslangic,
    bitis: f.bitis,
    toplamSinir: f.toplamSinir,
    kisiBasiSinir: f.kisiBasiSinir,
    indirimdeGecmez: f.indirimdeGecmez,
    acik: f.acik,
  });
  const yeniHali = hali(form);
  if (yeni) return yeniHali;
  const eskiHali = hali(bilinen);
  const degisti = (alan: string) =>
    JSON.stringify(yeniHali[alan]) !== JSON.stringify(eskiHali[alan]);
  const birlikte = [
    ["tur", "deger"],
    ["kapsam", "kapsamKayitlari"],
  ];
  const gidecek = new Set(Object.keys(yeniHali).filter(degisti));
  for (const grup of birlikte) {
    if (grup.some((alan) => gidecek.has(alan))) for (const alan of grup) gidecek.add(alan);
  }
  return Object.fromEntries([...gidecek].map((alan) => [alan, yeniHali[alan]]));
};

function Bolum({
  kimlik,
  baslik,
  children,
}: {
  kimlik: string;
  baslik: string;
  children: ReactNode;
}) {
  return (
    <Kart
      role="region"
      className="flex min-w-0 flex-col gap-5 p-4 tablet:p-6"
      aria-labelledby={`${kimlik}-baslik`}
    >
      <h2 id={`${kimlik}-baslik`} className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {baslik}
      </h2>
      {children}
    </Kart>
  );
}

export function KuponFormuEkrani({ veri }: { veri: KuponEkraniVerisi }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const islem = usePanelIslemi(hataMetni);
  const yeni = veri.kimlik === undefined;
  const kilitli = veri.kullanildi;
  const { form, setForm, bilinen, degisti, kaydedildi, vazgec } = useSunucuFormu<KuponFormu>(
    veri.form,
  );
  // Kayıttan sonra kuponun sayfasına geçilir; geçiş bitene kadar ikinci kayıt yapılmaz.
  const acilan = useRef(false);
  const pf = usePanelFormu({ degisti, kaydet: () => kaydet() });
  const gorulen = useRef(veri.gorulen);
  useEffect(() => {
    gorulen.current = veri.gorulen;
  }, [veri.gorulen]);

  const degistir = <Alan extends keyof KuponFormu>(alan: Alan, deger: KuponFormu[Alan]) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const kaydet = async (): Promise<boolean> => {
    if (acilan.current) return false;
    const gonderilen = form;
    const kupon = kuponGirdisi(gonderilen, bilinen, yeni);
    const sonuc = await pf.isle(() =>
      yeni
        ? islem<{ kimlik?: string; gorulen?: string }>(
            "kupon-ekle",
            { kupon },
            "yonetim.kupon.eklendi",
            {
              formda: true,
            },
          )
        : islem<{ kimlik?: string; gorulen?: string }>(
            "kupon-degistir",
            { kimlik: veri.kimlik, gorulen: gorulen.current, kupon },
            "yonetim.kupon.kaydedildi",
            { formda: true },
          ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      acilan.current = true;
      const kimlik = sonuc.veri.kimlik ?? veri.kimlik ?? "";
      router.push(kuponAdresi(kimlik));
      return true;
    }
    const alanHatalari = kodluAlanHatalari(kuponHataMetinleri, sonuc, alanlar);
    pf.hatalariGoster(
      Object.fromEntries(
        Object.entries(alanHatalari).map(([alan, anahtar]) => [
          alan,
          doldur(metin(anahtar), sinirYazilari),
        ]),
      ),
      Object.keys(alanHatalari).length > 0 ? [] : [doldur(metin(hataMetni(sonuc)), sinirYazilari)],
    );
    return false;
  };

  const ekliAlan = (
    alan: "deger" | "enAzTutar",
    etiket: string,
    {
      aciklama,
      zorunlu,
      isaret,
      kapali,
    }: {
      aciklama?: string;
      zorunlu: boolean;
      isaret: { simge: string; yer: "basta" | "sonda" };
      kapali?: boolean;
    },
  ) => (
    <PanelAlani ad={alan} etiket={etiket} aciklama={aciklama} zorunlu={zorunlu}>
      {(baglanti) => (
        // İşaret (para simgesi ya da yüzde) alanın içinde; ekran okuyucu etiketi okur.
        <span className="relative flex items-center">
          <GirisAlani
            {...baglanti}
            name={alan}
            inputMode="decimal"
            autoComplete="off"
            value={form[alan]}
            disabled={kapali === true}
            onChange={(olay) => degistir(alan, olay.target.value)}
            className={isaret.yer === "basta" ? "pl-10" : "pr-10"}
          />
          <span
            aria-hidden="true"
            className={sinif(
              "pointer-events-none absolute text-soluk-yazi",
              isaret.yer === "basta" ? "left-4" : "right-4",
            )}
          >
            {isaret.simge}
          </span>
        </span>
      )}
    </PanelAlani>
  );

  const metinAlani = (
    alan: "kod" | "ad" | "baslangic" | "bitis" | "toplamSinir" | "kisiBasiSinir",
    etiket: string,
    {
      aciklama,
      zorunlu,
      tur,
      kapali,
    }: { aciklama?: string; zorunlu: boolean; tur?: "datetime-local" | "sayi"; kapali?: boolean },
  ) => (
    <PanelAlani ad={alan} etiket={etiket} aciklama={aciklama} zorunlu={zorunlu}>
      {(baglanti) => (
        <GirisAlani
          {...baglanti}
          name={alan}
          autoComplete="off"
          {...(tur === "datetime-local" ? { type: "datetime-local" } : {})}
          {...(tur === "sayi" ? { inputMode: "numeric" as const } : {})}
          {...(alan === "kod" ? { maxLength: kuponSinirlari.kodEnCok, spellCheck: false } : {})}
          {...(alan === "ad" ? { maxLength: kuponSinirlari.adEnCok } : {})}
          value={form[alan]}
          disabled={kapali === true}
          onChange={(olay) => degistir(alan, olay.target.value)}
        />
      )}
    </PanelAlani>
  );

  const turAdi = (tur: KuponTuru) => metin(`yonetim.kupon.tur.${tur}`);
  const kapsamAdi = (kapsam: KuponKapsami) => metin(`yonetim.kupon.kapsam.${kapsam}`);

  // Yazılan tutar simgesiyle, simge sitenin ayarındaki yerde (tutar biçimlenmez: yazıldığı gibidir).
  const simgeli = (yazi: string) =>
    veri.paraSimgesi.yer === "basta"
      ? `${veri.paraSimgesi.simge}${yazi}`
      : `${yazi} ${veri.paraSimgesi.simge}`;
  // Özet: formun bugünkü hâliyle tek cümle grubu (taslaktaki "Özet").
  const ozet = [
    form.deger.trim() === "" && form.tur !== "ucretsiz-kargo"
      ? null
      : doldur(metin(`yonetim.kupon.ozetCumlesi.${form.tur}`), {
          deger: form.deger.trim(),
          tutar: simgeli(form.deger.trim()),
          kapsam:
            form.kapsam === "hepsi"
              ? metin("yonetim.kupon.ozetCumlesi.hepsi")
              : form.kapsamKayitlari.map(({ ad }) => ad).join(", "),
        }),
    form.enAzTutar.trim() === ""
      ? null
      : doldur(metin("yonetim.kupon.kosul.enAz"), {
          tutar: simgeli(form.enAzTutar.trim()),
        }),
    form.toplamSinir.trim() === ""
      ? null
      : doldur(metin("yonetim.kupon.ozetCumlesi.toplam"), { sayi: form.toplamSinir.trim() }),
    form.kisiBasiSinir.trim() === ""
      ? null
      : doldur(metin("yonetim.kupon.kosul.kisiBasi"), { sayi: form.kisiBasiSinir.trim() }),
    form.indirimdeGecmez ? metin("yonetim.kupon.kosul.indirimdeGecmez") : null,
    metin("yonetim.kupon.ozetCumlesi.tek"),
  ].filter((parca): parca is string => parca !== null);

  return (
    <PanelFormu
      durum={pf}
      gonder={async () => {
        await kaydet();
      }}
    >
      <div className="grid gap-6 masaustu:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 masaustu:col-span-2">
          {kilitli ? (
            <Uyari tur="bilgi" baslik={metin("yonetim.kupon.kilitli.baslik")}>
              {metin("yonetim.kupon.kilitli.metin")}
            </Uyari>
          ) : null}
          {veri.silinmisKapsam.length === 0 ? null : (
            <Uyari tur="uyari" baslik={metin("yonetim.kupon.silinmisKapsam.baslik")}>
              {doldur(metin("yonetim.kupon.silinmisKapsam.metin"), {
                adlar: veri.silinmisKapsam.join(", "),
              })}
            </Uyari>
          )}
          <Bolum kimlik="kupon-bilgi" baslik={metin("yonetim.kupon.bolum.kupon")}>
            {metinAlani("kod", metin("yonetim.kupon.kod"), {
              aciklama: metin(
                veri.harfDuyarli
                  ? "yonetim.kupon.kodAciklamasiDuyarli"
                  : "yonetim.kupon.kodAciklamasi",
              ),
              zorunlu: true,
              kapali: kilitli,
            })}
            {metinAlani("ad", metin("yonetim.kupon.ad"), {
              aciklama: metin("yonetim.kupon.adAciklamasi"),
              zorunlu: false,
            })}
            <AlanKabi ad="tur" etiket={metin("yonetim.kupon.tur.baslik")}>
              <SecenekGrubu
                baslik={metin("yonetim.kupon.tur.baslik")}
                etiket={metin("yonetim.kupon.tur.baslik")}
                ogeler={kuponTurleri.map((tur) => ({
                  deger: tur,
                  ad: turAdi(tur),
                  ...(kilitli ? { secilemez: true } : {}),
                }))}
                deger={form.tur}
                onDegerDegisti={(deger) => {
                  if (!kilitli) degistir("tur", deger as KuponTuru);
                }}
                secilemezEki=""
                {...(pf.hata("tur") === undefined ? {} : { hata: pf.hata("tur") ?? "" })}
              />
            </AlanKabi>
            <div className="grid gap-5 tablet:grid-cols-2">
              {form.tur === "ucretsiz-kargo"
                ? null
                : ekliAlan("deger", metin("yonetim.kupon.deger"), {
                    aciklama: doldur(
                      metin(
                        form.tur === "yuzde"
                          ? "yonetim.kupon.degerAciklamasiYuzde"
                          : "yonetim.kupon.degerAciklamasiTutar",
                      ),
                      sinirYazilari,
                    ),
                    zorunlu: true,
                    isaret:
                      form.tur === "yuzde"
                        ? { simge: metin("yonetim.kupon.yuzdeIsareti"), yer: "sonda" }
                        : veri.paraSimgesi,
                    kapali: kilitli,
                  })}
              {ekliAlan("enAzTutar", metin("yonetim.kupon.enAzTutar"), {
                aciklama: metin("yonetim.kupon.enAzTutarAciklamasi"),
                zorunlu: false,
                isaret: veri.paraSimgesi,
              })}
            </div>
          </Bolum>
          <Bolum kimlik="kupon-kapsam" baslik={metin("yonetim.kupon.bolum.kapsam")}>
            <AlanKabi ad="kapsam" etiket={metin("yonetim.kupon.kapsam.baslik")}>
              <SecenekGrubu
                baslik={metin("yonetim.kupon.kapsam.baslik")}
                etiket={metin("yonetim.kupon.kapsam.baslik")}
                ogeler={kapsamSirasi.map((kapsam) => ({
                  deger: kapsam,
                  ad: kapsamAdi(kapsam),
                  ...(kilitli ? { secilemez: true } : {}),
                }))}
                deger={form.kapsam}
                onDegerDegisti={(deger) => {
                  if (kilitli) return;
                  // Kapsam değişince seçim boşalır: kategori ile ürün aynı listede durmaz.
                  setForm((onceki) => ({
                    ...onceki,
                    kapsam: deger as KuponKapsami,
                    kapsamKayitlari: [],
                  }));
                }}
                secilemezEki=""
                {...(pf.hata("kapsam") === undefined ? {} : { hata: pf.hata("kapsam") ?? "" })}
              />
            </AlanKabi>
            {form.kapsam === "hepsi" ? null : (
              <CokluKayitSecimi
                ad="kapsamKayitlari"
                tur={form.kapsam === "kategoriler" ? "kategori" : "urun"}
                etiket={metin(
                  form.kapsam === "kategoriler"
                    ? "yonetim.kupon.kapsamKategoriler"
                    : "yonetim.kupon.kapsamUrunler",
                )}
                aciklama={metin(
                  form.kapsam === "kategoriler"
                    ? "yonetim.kupon.kapsamKategorilerAciklamasi"
                    : "yonetim.kupon.kapsamUrunlerAciklamasi",
                )}
                secilenler={form.kapsamKayitlari}
                degisti={(liste) => degistir("kapsamKayitlari", liste)}
                sinir={kuponSinirlari.kapsamEnCok}
                disabled={kilitli}
              />
            )}
            <OnayKutusu
              etiket={metin("yonetim.kupon.indirimdeGecmez")}
              ek={
                <span className="-mt-3 pl-8 text-kucuk text-soluk-yazi">
                  {metin("yonetim.kupon.indirimdeGecmezAciklamasi")}
                </span>
              }
              name="indirimdeGecmez"
              checked={form.indirimdeGecmez}
              disabled={kilitli}
              onCheckedChange={(isaretli) => degistir("indirimdeGecmez", isaretli === true)}
              hata={pf.hata("indirimdeGecmez")}
            />
          </Bolum>
          <Bolum kimlik="kupon-sure" baslik={metin("yonetim.kupon.bolum.sure")}>
            <div className="grid gap-5 tablet:grid-cols-2">
              {metinAlani("baslangic", metin("yonetim.kupon.baslangic"), {
                aciklama: metin("yonetim.kupon.baslangicAciklamasi"),
                zorunlu: false,
                tur: "datetime-local",
              })}
              {metinAlani("bitis", metin("yonetim.kupon.bitis"), {
                aciklama: doldur(metin("yonetim.kupon.bitisAciklamasi"), {
                  saatDilimi: veri.saatDilimi,
                }),
                zorunlu: false,
                tur: "datetime-local",
              })}
              {metinAlani("toplamSinir", metin("yonetim.kupon.toplamSinir"), {
                aciklama: metin("yonetim.kupon.toplamSinirAciklamasi"),
                zorunlu: false,
                tur: "sayi",
              })}
              {metinAlani("kisiBasiSinir", metin("yonetim.kupon.kisiBasiSinir"), {
                aciklama: metin("yonetim.kupon.kisiBasiSinirAciklamasi"),
                zorunlu: false,
                tur: "sayi",
              })}
            </div>
          </Bolum>
          <KaydetCubugu
            sayfada
            durumYazisi
            degisiklikGerekli={!yeni}
            kaydetEtiketi={metin(yeni ? "yonetim.kupon.ekle" : "yonetim.kupon.kaydet")}
            vazgec={() => {
              if (yeni) {
                router.push(kuponlarAdresi);
                return;
              }
              vazgec();
              pf.temizle();
            }}
          />
        </div>
        <div className="flex flex-col gap-6 masaustu:sticky masaustu:top-4 masaustu:self-start">
          <Kart className="flex flex-col gap-4 p-4 tablet:p-6">
            <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("yonetim.kupon.bolum.durum")}
            </h2>
            <AlanKabi ad="acik" etiket={metin("yonetim.kupon.acik")}>
              <Anahtar
                etiket={metin("yonetim.kupon.acik")}
                acikYazisi={metin("yonetim.kupon.acikYazisi")}
                kapaliYazisi={metin("yonetim.kupon.kapaliYazisi")}
                checked={form.acik}
                onCheckedChange={(acik) => degistir("acik", acik)}
              />
            </AlanKabi>
            <p className="m-0 text-kucuk text-soluk-yazi">
              {metin("yonetim.kupon.acikAciklamasi")}
            </p>
          </Kart>
          <Kart
            role="region"
            aria-labelledby="kupon-ozet-baslik"
            className="flex flex-col gap-3 p-4 tablet:p-6"
          >
            <h2 id="kupon-ozet-baslik" className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("yonetim.kupon.bolum.ozet")}
            </h2>
            <p className="m-0">{ozet.join(" ")}</p>
          </Kart>
        </div>
      </div>
    </PanelFormu>
  );
}
