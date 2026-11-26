"use client";
// Sepetin görünüşü (kart 0212, karar 0135; kart 0211'in taslağı): sepet sayfası ve sepet penceresi. Veri sunucuda
// hesaplanmış gelir (useSepetGorunumu, veri.ts); burada hesap yapılmaz, yalnız yazılır.
//
// - Satır: görsel, ad (ürün sayfasına bağlantı), seçim, birim fiyatı (fiyat bileşeni, vergi metni özette), uyarılar,
//   adet seçici, satır tutarı ve "Sepetten çıkar". Satılamayan satırın adedi değişmez, tutarı yoktur, yalnız çıkarılır.
// - Pencere: eklenen ürünün bildirimi, sade satırlar (adet ve tutar; değişiklik sepet sayfasında) ve ara toplam.
// - Uyarılar yazıyla ve ikonla verilir, yalnız renkle değil (.claude/rules/erisilebilirlik.md).
// - Çıkarılan ürünün bildiriminde "Geri al" vardır: ürün eski yerine döner. Odak bir sonraki satırın çıkar düğmesine,
//   sepet boşalınca boş hâlin bağlantısına geçer.
// - Özet: ara toplam, kargo, toplam ve vergi dökümü (vergi dahil gösterimde "toplama dahil") ve "Ödemeye geç" (kart
//   0213). Satılamayan satır varken düğme kapalıdır ama odak alır, nedeni altında yazar (karar 0132).
// - Telefonda sepet sayfasının toplamı altta sabit durur.
// - Kupon (kart 0312, karar 0185): kutu yalnız sepet sayfasının özetindedir. Uygulanan kupon kodu ve "Kaldır" ile,
//   özette tek satır "Kupon (KOD) −tutar" olarak görünür; geçmeyen kuponun nedeni alanın altında yazar ve alana
//   bağlıdır. İndirimdeki ürüne geçmeyen kupon satırda söylenir. Ödeme adımının özeti aynı satırı gösterir.
import { type FormEvent, type Ref, useEffect, useId, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { AdetSecici } from "../../../bilesenler/parcalar/adet-secici";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { useCizimdenSonraOdak } from "../../../bilesenler/parcalar/cizimden-sonra-odak";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { kuponSinirlari } from "../../kayitlar/kampanya";
import { doldur } from "../../metinler/doldur";
import type { VitrinMetinAnahtari } from "../../metinler/istemci-metni";
import { useMetin } from "../../metinler/istemci-metni";
import { vitrinAdresleri } from "../adresler";
import {
  adetDegistir,
  geriKoy,
  kuponuAyarla,
  sepettenCikar,
  useSepet,
  useSepetGorunumu,
} from "./durum";
import { SepetFiyati } from "./fiyat";
import type { SepetGorunumu, SepetGorunumuKuponu, SepetGorunumuSatiri } from "./veri";

type Metin = ReturnType<typeof useMetin>;

const uyariMetinleri = {
  "fiyat-degisti": "vitrin.sepet.uyari.fiyatDegisti",
  "stok-azaldi": "vitrin.sepet.uyari.stokAzaldi",
  "en-cok": "vitrin.sepet.uyari.enCok",
  "en-az": "vitrin.sepet.uyari.enAz",
  tukendi: "vitrin.sepet.uyari.tukendi",
  kaldirildi: "vitrin.sepet.uyari.kaldirildi",
} as const satisfies Record<SepetGorunumuSatiri["uyarilar"][number]["kod"], VitrinMetinAnahtari>;

// Satırı durduran uyarı tehlike renginde, öteki uyarılar uyarı renginde.
// Satırın uyarısı ve durdurup durdurmadığı: panelin elle siparişi de aynı metni yazar (kart 0236).
export const durdurur = (kod: SepetGorunumuSatiri["uyarilar"][number]["kod"]) =>
  kod === "tukendi" || kod === "kaldirildi" || kod === "en-az";

export const uyariYazisi = (
  metin: Metin,
  satir: SepetGorunumuSatiri,
  uyari: SepetGorunumuSatiri["uyarilar"][number],
) =>
  doldur(metin(uyariMetinleri[uyari.kod]), {
    ...("sayi" in uyari ? { sayi: String(uyari.sayi) } : {}),
    ...("eskiYazili" in uyari && uyari.eskiYazili !== undefined ? { eski: uyari.eskiYazili } : {}),
    ...(satir.fiyat === undefined ? {} : { yeni: satir.fiyat.enDusuk.yazili.tutar }),
  });

export const satirAdi = (metin: Metin, satir: SepetGorunumuSatiri) =>
  satir.urun?.ad ?? metin("vitrin.sepet.kaldirilanUrun");

// Sepet sayfasının satırı. Telefonda bilgi üstte, adet ve tutar altta, sil sağ üstte; masaüstünde hepsi tek sırada
// (taslak). Odak sırası her genişlikte ad, adet, sil: sil telefonda yalnız görünüşte sağ üsttedir.
function SepetSatiri({
  satir,
  sonraki,
}: {
  satir: SepetGorunumuSatiri;
  // Çıkarınca odağın gideceği yer.
  sonraki: () => void;
}) {
  const metin = useMetin();
  const ad = satirAdi(metin, satir);
  // Gösterilen adet: müşterinin değiştirdiği adedin cevabı henüz gelmediyse tarayıcıdaki adet, gelince sunucunun
  // (sınıra indirilmiş) adedi. Sunucunun adedi gösterilse, cevap gelmeden ikinci basış eski adetten sayardı.
  const yerel = useSepet().kalemler.find((kalem) => kalem.birim === satir.birim);
  const gosterilenAdet =
    yerel !== undefined && yerel.adet !== satir.istenenAdet ? yerel.adet : satir.adet;
  const cikar = () => {
    const cikan = sepettenCikar(satir.birim);
    sonraki();
    if (cikan === undefined) return;
    bildirimGoster("bilgi", doldur(metin("vitrin.sepet.cikarildi"), { urun: ad }), {
      etiket: metin("vitrin.sepet.geriAl"),
      tikla: () => geriKoy(cikan.kalem, cikan.sira),
    });
  };
  return (
    <li
      data-slot="sepet-satiri"
      data-birim={satir.birim}
      className="relative flex items-start gap-3 border-b border-kenar py-4 tablet:gap-4 masaustu:items-center"
    >
      <SatirGorseli satir={satir} buyukluk="size-20" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 masaustu:flex-row masaustu:items-center masaustu:gap-6">
        <div className="flex min-w-0 flex-col gap-1 pr-10 masaustu:flex-1 masaustu:pr-0">
          {satir.urun === undefined ? (
            <span className="font-kalin">{ad}</span>
          ) : (
            <Baglanti
              href={satir.urun.adres}
              gorunum="baglanti"
              className="min-h-0 self-start no-underline hover:underline"
            >
              {ad}
            </Baglanti>
          )}
          <SecimYazisi satir={satir} />
          {satir.fiyat === undefined ? null : (
            <SepetFiyati fiyat={satir.fiyat} boyut="kucuk" vergiMetni={false} />
          )}
          {satir.uyarilar.map((uyari) => (
            <span
              key={uyari.kod}
              className={sinif(
                "flex items-start gap-1.5 text-kucuk font-kalin",
                durdurur(uyari.kod) ? "text-tehlike-yazi" : "text-uyari-yazi",
              )}
            >
              <Ikon
                ad={durdurur(uyari.kod) ? "uyari" : "bilgi"}
                className="mt-0.5 size-4 shrink-0"
              />
              {uyariYazisi(metin, satir, uyari)}
            </span>
          ))}
          {satir.kuponDisi === "indirimli" ? (
            <span className="flex items-start gap-1.5 text-kucuk text-soluk-yazi">
              <Ikon ad="bilgi" className="mt-0.5 size-4 shrink-0" />
              {metin("vitrin.sepet.kupon.indirimliUrun")}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 masaustu:flex-nowrap masaustu:gap-6">
          {satir.satilabilir ? (
            <AdetSecici
              deger={gosterilenAdet}
              enAz={1}
              enCok={Math.max(satir.enCok, gosterilenAdet)}
              onDegerDegisti={(adet) => adetDegistir(satir.birim, adet)}
              etiketler={{
                grup: doldur(metin("vitrin.sepet.adetUrun"), { urun: ad }),
                azalt: doldur(metin("vitrin.sepet.azalt"), { urun: ad }),
                artir: doldur(metin("vitrin.sepet.artir"), { urun: ad }),
              }}
            />
          ) : null}
          {satir.yaziliTutar === undefined ? null : (
            <span className="ml-auto whitespace-nowrap text-right font-en-kalin">
              {satir.yaziliTutar}
            </span>
          )}
        </div>
      </div>
      <IkonDugmesi
        ikon="sil"
        etiket={doldur(metin("vitrin.sepet.cikar"), { urun: ad })}
        onClick={cikar}
        data-sepet-cikar=""
        className="absolute top-2 right-0 masaustu:static"
      />
    </li>
  );
}

// Satırın görseli: sepet sayfası, sepet penceresi, ödeme adımının özeti (kart 0213) ve siparişin kalemleri (kart 0238).
// Görsel yanında adı yazan satırda süslemedir (alt boş); adı yalnız görselde olan yerde (Siparişlerim) alt verilir.
export function SatirGorseli({
  satir,
  buyukluk,
  alt = "",
}: {
  satir: Pick<SepetGorunumuSatiri, "gorsel"> & { satilabilir?: boolean };
  buyukluk: string;
  alt?: string;
}) {
  return (
    <span
      className={sinif(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-orta bg-yuzey",
        buyukluk,
        satir.satilabilir === false && "opacity-50",
      )}
      {...(satir.gorsel === undefined && alt !== "" ? { role: "img", "aria-label": alt } : {})}
    >
      {satir.gorsel === undefined ? (
        <Ikon ad="gorsel" className="text-soluk-yazi" />
      ) : (
        // biome-ignore lint/performance/noImgElement: boyutlar çekirdekte üretilir (karar 0073), srcset ile seçilir.
        <img
          src={satir.gorsel.kaynaklar[0]?.adres}
          srcSet={satir.gorsel.kaynaklar.map((k) => `${k.adres} ${k.genislik}w`).join(", ")}
          sizes="5rem"
          alt={alt}
          width={satir.gorsel.genislik}
          height={satir.gorsel.yukseklik}
          loading="lazy"
          className="size-7/8 object-contain"
        />
      )}
    </span>
  );
}

function SecimYazisi({ satir }: { satir: SepetGorunumuSatiri }) {
  const metin = useMetin();
  if (satir.secim.length === 0) return null;
  return (
    <span className="text-kucuk text-soluk-yazi">
      {satir.secim.map((secim) => doldur(metin("vitrin.sepet.secim"), secim)).join(" · ")}
    </span>
  );
}

// Sepet penceresinin satırı (taslak): küçük görsel ve üstünde adet, ad, seçim, "n adet" ve tutar. Pencerede adet
// değişmez, ürün çıkarılmaz: bunlar sepet sayfasındadır.
function PencereSatiri({ satir }: { satir: SepetGorunumuSatiri }) {
  const metin = useMetin();
  const ad = satirAdi(metin, satir);
  return (
    <li data-slot="sepet-satiri" data-birim={satir.birim} className="flex items-start gap-3 py-2">
      <span className="relative shrink-0">
        <SatirGorseli satir={satir} buyukluk="size-12" />
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-dugme bg-yazi text-kucuk font-en-kalin text-zemin"
        >
          {satir.adet}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-govde font-kalin">{ad}</span>
        <SecimYazisi satir={satir} />
        <span className="text-kucuk text-soluk-yazi">
          {doldur(metin("vitrin.sepet.adetSayisi"), { sayi: String(satir.adet) })}
        </span>
        {satir.uyarilar.map((uyari) => (
          <span
            key={uyari.kod}
            className={sinif(
              "text-kucuk font-kalin",
              durdurur(uyari.kod) ? "text-tehlike-yazi" : "text-uyari-yazi",
            )}
          >
            {uyariYazisi(metin, satir, uyari)}
          </span>
        ))}
      </div>
      {satir.yaziliTutar === undefined ? null : (
        <span className="whitespace-nowrap text-govde">{satir.yaziliTutar}</span>
      )}
    </li>
  );
}

function SepetSatirlari({ gorunum }: { gorunum: SepetGorunumu }) {
  const metin = useMetin();
  const liste = useRef<HTMLUListElement>(null);
  const odakIste = useCizimdenSonraOdak();
  // Çıkarılan satırdan sonra odak bir sonraki satırın çıkar düğmesine, son satırsa bir öncekine geçer. Satır sunucunun
  // yeni sepet cevabıyla kalkar: odak satır listeden kalkınca verilir (kart 0307; eskiden bir sonraki karede, satır
  // henüz dururken kendi düğmesine veriliyor ve satırla birlikte kayboluyordu).
  const odakla = (birim: string) => () => {
    const sira = gorunum.satirlar.findIndex((satir) => satir.birim === birim);
    const satirlar = () => [
      ...(liste.current?.querySelectorAll<HTMLElement>("[data-slot=sepet-satiri]") ?? []),
    ];
    odakIste(
      () => {
        const kalan = [
          ...(liste.current?.querySelectorAll<HTMLElement>("[data-sepet-cikar]") ?? []),
        ];
        return kalan[sira] ?? kalan[sira - 1];
      },
      () => satirlar().every((satir) => satir.dataset["birim"] !== birim),
    );
  };
  return (
    <ul ref={liste} aria-label={metin("vitrin.sepet.satirlar")} className="border-t border-kenar">
      {gorunum.satirlar.map((satir) => (
        <SepetSatiri key={satir.birim} satir={satir} sonraki={odakla(satir.birim)} />
      ))}
    </ul>
  );
}

function OzetSatiri({ ad, deger, vurgu = false }: { ad: string; deger: string; vurgu?: boolean }) {
  return (
    <div
      className={sinif(
        "flex justify-between gap-3",
        vurgu ? "border-t border-kenar pt-3 text-buyuk font-en-kalin" : "text-govde",
      )}
    >
      <dt>{ad}</dt>
      <dd className="whitespace-nowrap">{deger}</dd>
    </div>
  );
}

// Sipariş alındı sayfası da aynı özeti siparişin saklanan tutarlarıyla çizer (kart 0214).
export type OzetTutarlari = Pick<
  SepetGorunumu,
  "adet" | "kargo" | "gosterim" | "vergiDokumu" | "yazili"
> & { kupon?: SepetGorunumuKuponu | undefined };

// Kupon geçmeme nedeninin yazısı (sepetin kutusu ve ödeme adımı).
export const kuponNedeni = (
  metin: Metin,
  kupon: { kod: string; neden: Extract<SepetGorunumuKuponu, { durum: "gecmedi" }>["neden"] },
  kalan?: string,
) =>
  doldur(metin(`vitrin.sepet.kupon.neden.${kupon.neden}`), { kod: kupon.kod, kalan: kalan ?? "" });

export function SepetOzeti({ gorunum }: { gorunum: OzetTutarlari }) {
  const metin = useMetin();
  const vergiAdi = (ad?: string) => ad ?? metin("vitrin.sepet.vergiAdsiz");
  return (
    <dl className="flex flex-col gap-3">
      <OzetSatiri
        ad={doldur(metin("vitrin.sepet.araToplam"), { sayi: String(gorunum.adet) })}
        deger={gorunum.yazili.araToplam}
      />
      {gorunum.kupon?.durum === "uygulandi" ? (
        <div className="flex justify-between gap-3 text-govde font-kalin text-basari-yazi">
          <dt>{doldur(metin("vitrin.sepet.kupon.ozet"), { kod: gorunum.kupon.kod })}</dt>
          <dd className="whitespace-nowrap">
            {gorunum.kupon.tur === "ucretsiz-kargo"
              ? metin("vitrin.sepet.kupon.ucretsizKargo")
              : doldur(metin("vitrin.sepet.kupon.indirim"), {
                  tutar: gorunum.kupon.yaziliIndirim,
                })}
          </dd>
        </div>
      ) : null}
      {gorunum.kargo === "yok" ? null : (
        <OzetSatiri
          ad={metin("vitrin.sepet.kargo")}
          deger={gorunum.yazili.kargo ?? metin("vitrin.sepet.kargoUcretsiz")}
        />
      )}
      {gorunum.gosterim === "vergi-haric"
        ? gorunum.vergiDokumu.map((satir) => (
            <OzetSatiri
              key={`${satir.ad}-${satir.oran}`}
              ad={doldur(metin("vitrin.sepet.vergi"), {
                vergi: vergiAdi(satir.ad),
                oran: satir.oran,
              })}
              deger={satir.yazili}
            />
          ))
        : null}
      <OzetSatiri ad={metin("vitrin.sepet.toplam")} deger={gorunum.yazili.toplam} vurgu />
      {gorunum.gosterim === "vergi-dahil"
        ? gorunum.vergiDokumu.map((satir) => (
            <div
              key={`${satir.ad}-${satir.oran}`}
              className="flex justify-between gap-3 text-kucuk text-soluk-yazi"
            >
              <dt>
                {doldur(metin("vitrin.sepet.vergiDahil"), {
                  vergi: vergiAdi(satir.ad),
                  oran: satir.oran,
                })}
              </dt>
              <dd className="whitespace-nowrap">{satir.yazili}</dd>
            </div>
          ))
        : null}
    </dl>
  );
}

// Sepet sayfasının kupon kutusu (kart 0312). Uygulanan kupon kod ve "Kaldır" ile durur; geçmeyen kuponun kodu alanda
// kalır, nedeni alanın altında yazar (sepet değişince geçebilir). Kaldırınca odak alana geçer.
function KuponAlani({ kupon }: { kupon: SepetGorunumuKuponu | undefined }) {
  const metin = useMetin();
  const form = useRef<HTMLFormElement>(null);
  const [bosHata, setBosHata] = useState(false);
  const odakla = useCizimdenSonraOdak();
  const kuponAlani = (): HTMLInputElement | null => {
    const alan = form.current?.elements.namedItem("kupon");
    return alan instanceof HTMLInputElement ? alan : null;
  };
  const uygula = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    const kod = kuponAlani()?.value.trim() ?? "";
    setBosHata(kod.length === 0);
    if (kod.length === 0) {
      kuponAlani()?.focus();
      return;
    }
    kuponuAyarla(kod);
  };
  if (kupon?.durum === "uygulandi") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-kucuk border border-dashed border-basari-yazi bg-basari-zemin py-1 pr-1 pl-3 text-govde text-basari-yazi">
        <span className="flex items-center gap-1.5">
          <Ikon ad="basari" className="size-4 shrink-0" />
          <span>
            <strong className="font-en-kalin">{kupon.kod}</strong>{" "}
            {metin("vitrin.sepet.kupon.uygulandiEki")}
          </span>
        </span>
        <Dugme
          tur="sade"
          aria-label={doldur(metin("vitrin.sepet.kupon.kaldir"), { kod: kupon.kod })}
          className="shrink-0"
          onClick={() => {
            kuponuAyarla(undefined);
            // Kutu sunucunun yeni cevabıyla alana döner: odak alan çizilince verilir.
            odakla(kuponAlani, () => kuponAlani() !== null);
          }}
        >
          {metin("vitrin.sepet.kupon.kaldirYazisi")}
        </Dugme>
      </div>
    );
  }
  const hata = bosHata
    ? metin("vitrin.sepet.kupon.bos")
    : kupon?.durum === "gecmedi"
      ? kuponNedeni(metin, kupon, kupon.yaziliKalan)
      : undefined;
  return (
    <Form
      ref={form}
      onSubmit={uygula}
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      className="flex flex-col gap-1"
    >
      <FormAlani
        etiket={metin("vitrin.sepet.kupon.alan")}
        {...(hata === undefined ? {} : { hata })}
      >
        {(baglanti) => (
          <div className="flex gap-2">
            <GirisAlani
              {...baglanti}
              name="kupon"
              // Alan yeniden kurulmaz (anahtar yok): geçmeyen kodla Enter'a basan müşterinin odağı alanda kalır
              // (bağımsız kontrolün bulgusu).
              defaultValue={kupon?.kod ?? ""}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={kuponSinirlari.kodEnCok}
              className="min-w-0 flex-1 uppercase"
              onInput={() => setBosHata(false)}
            />
            <GonderDugmesi tur="cerceveli" className="shrink-0">
              {metin("vitrin.sepet.kupon.uygula")}
            </GonderDugmesi>
          </div>
        )}
      </FormAlani>
    </Form>
  );
}

// Ödeme adımına geçiş (kart 0213). Ödemeye geçilemiyorsa düğme kapalı görünür, odak alır, nedenini söyler.
export function OdemeyeGec({ gorunum, className }: { gorunum: SepetGorunumu; className?: string }) {
  const metin = useMetin();
  const nedenKimligi = useId();
  if (gorunum.odemeyeGecilebilir) {
    return (
      <Baglanti href={vitrinAdresleri.odeme} gorunum="birincil" className={className}>
        {metin("vitrin.sepet.odemeyeGec")}
      </Baglanti>
    );
  }
  return (
    <div className={sinif("flex flex-col gap-1", className)}>
      <Dugme
        aria-disabled="true"
        aria-describedby={nedenKimligi}
        className="aria-disabled:cursor-not-allowed aria-disabled:bg-yuzey aria-disabled:text-soluk-yazi"
      >
        {metin("vitrin.sepet.odemeyeGec")}
      </Dugme>
      <span id={nedenKimligi} className="text-kucuk font-kalin text-tehlike-yazi">
        {metin("vitrin.sepet.odemeEngeli")}
      </span>
    </div>
  );
}

function Yukleniyor() {
  const metin = useMetin();
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{metin("vitrin.sepet.yukleniyor")}</span>
      <IskeletGorunum className="h-20 w-full" />
      <IskeletGorunum className="h-20 w-full" />
    </div>
  );
}

// Sepet sayfasının başlığındaki ürün sayısı (adetlerin toplamı); sepet bilinmeden ya da boşken yazılmaz.
export function SepetUrunSayisi() {
  const metin = useMetin();
  const { hazir, kalemler } = useSepet();
  const adet = kalemler.reduce((toplam, kalem) => toplam + kalem.adet, 0);
  if (!hazir || adet === 0) return null;
  return doldur(metin("vitrin.sepet.urunSayisi"), { sayi: String(adet) });
}

// Sepet sayfasının boş hâli: sonraki adımın bağlantısıyla.
function BosSepet({ baglanti }: { baglanti: Ref<HTMLAnchorElement> }) {
  const metin = useMetin();
  return (
    <BosHal
      ikon="sepet"
      baslik={metin("vitrin.sepet.bosBaslik")}
      aciklama={metin("vitrin.sepet.bosAciklama")}
    >
      <Baglanti ref={baglanti} href={vitrinAdresleri.anasayfa} gorunum="birincil">
        {metin("vitrin.sepet.alisveriseBasla")}
      </Baglanti>
    </BosHal>
  );
}

// Sepet sayfasının içi. ornek: katalogun örnek kipinde gösterilen veri. cerezdeBos: sunucu sepet sayfasının çerezinde
// kalem görmedi (karar 0136); sepet bilinene kadar iskelet yerine boş hâl çizilir. Sunucunun ve tarayıcının ilk
// çizimi aynıdır (sepet ikisinde de bilinmiyor). Depoda kalem çıkarsa (çerez silinmiş) iskelete, sonra satırlara geçer.
export function SepetSayfasiIcerigi({
  ornek,
  cerezdeBos = false,
}: {
  ornek?: SepetGorunumu;
  cerezdeBos?: boolean;
}) {
  const metin = useMetin();
  const sepet = useSepet();
  const durum = useSepetGorunumu(true, ornek);
  const bosBaglanti = useRef<HTMLAnchorElement>(null);
  const bos = durum.tur === "hazir" && durum.gorunum.satirlar.length === 0;
  useEffect(() => {
    if (bos && document.activeElement === document.body) bosBaglanti.current?.focus();
  }, [bos]);
  const bosBilinir = cerezdeBos && (!sepet.hazir || sepet.kalemler.length === 0);
  if (durum.tur === "yukleniyor")
    return bosBilinir ? <BosSepet baglanti={bosBaglanti} /> : <Yukleniyor />;
  if (durum.tur === "hata") return <Uyari tur="tehlike">{metin("vitrin.sepet.hata")}</Uyari>;
  const { gorunum } = durum;
  if (gorunum.satirlar.length === 0) return <BosSepet baglanti={bosBaglanti} />;
  const degisiklik = gorunum.satirlar.some((satir) => satir.uyarilar.length > 0);
  return (
    <div className="flex flex-col gap-4">
      {degisiklik ? <Uyari tur="uyari">{metin("vitrin.sepet.degisiklikVar")}</Uyari> : null}
      <div className="flex flex-col gap-6 masaustu:flex-row masaustu:items-start masaustu:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SepetSatirlari gorunum={gorunum} />
          <Baglanti href={vitrinAdresleri.anasayfa} gorunum="cerceveli" className="self-start">
            <Ikon ad="onceki" />
            {metin("vitrin.sepet.alisveriseDevam")}
          </Baglanti>
        </div>
        <section
          aria-labelledby="sepet-ozet-basligi"
          className="flex flex-col gap-4 rounded-orta border border-kenar bg-zemin p-5 masaustu:sticky masaustu:top-4 masaustu:w-form masaustu:shrink-0"
        >
          <h2 id="sepet-ozet-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("vitrin.sepet.ozet")}
          </h2>
          <KuponAlani kupon={gorunum.kupon} />
          <SepetOzeti gorunum={gorunum} />
          <OdemeyeGec gorunum={gorunum} className="hidden tablet:flex" />
        </section>
      </div>
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-kenar bg-zemin px-4 py-3 shadow-kart tablet:hidden">
        <span className="flex flex-col">
          <span className="text-kucuk text-soluk-yazi">{metin("vitrin.sepet.toplam")}</span>
          <strong className="text-buyuk font-en-kalin">{gorunum.yazili.toplam}</strong>
        </span>
        <OdemeyeGec gorunum={gorunum} />
      </div>
    </div>
  );
}

// Sepet penceresindeki içerik (sepet-penceresi.tsx).
export function SepetPenceresiIcerigi({ acik }: { acik: boolean }) {
  const metin = useMetin();
  const durum = useSepetGorunumu(acik);
  const { eklenen } = useSepet();
  if (durum.tur === "yukleniyor") return <Yukleniyor />;
  if (durum.tur === "hata") return <Uyari tur="tehlike">{metin("vitrin.sepet.hata")}</Uyari>;
  const { gorunum } = durum;
  if (gorunum.satirlar.length === 0) {
    return <BosHal ikon="sepet" baslik={metin("vitrin.sepet.bosBaslik")} duzey={3} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {eklenen === undefined ? null : (
        <p className="flex items-center gap-2 rounded-orta bg-basari-zemin px-4 py-3 text-basari-yazi">
          <Ikon ad="basari" className="shrink-0" />
          <span>{doldur(metin("vitrin.sepet.eklendi"), { urun: eklenen })}</span>
        </p>
      )}
      <ul aria-label={metin("vitrin.sepet.satirlar")} className="flex flex-col gap-1">
        {gorunum.satirlar.map((satir) => (
          <PencereSatiri key={satir.birim} satir={satir} />
        ))}
      </ul>
      <dl className="flex flex-col gap-1 border-t border-kenar pt-4">
        <div className="flex justify-between gap-3 font-kalin">
          <dt>{doldur(metin("vitrin.sepet.araToplam"), { sayi: String(gorunum.adet) })}</dt>
          <dd className="whitespace-nowrap font-en-kalin">{gorunum.yazili.araToplam}</dd>
        </div>
      </dl>
      <p className="text-kucuk text-soluk-yazi">{metin("vitrin.sepet.pencereNotu")}</p>
    </div>
  );
}
