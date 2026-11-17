"use client";
// Vitrinde müşterinin sepeti, tek yerden (kart 0212, karar 0135). Ürün kartının ve ürün sayfasının sepete ekle
// düğmeleri, üst kısmın sayısı, sepet penceresi ve sepet sayfası bu durumu paylaşır.
//
// - Sepet tarayıcının deposundadır (depo.ts); sunucuya kaydedilmez, hesaba bağlanmaz. Bu yüzden hesap durumu
//   beklenmez, sayfa açılınca istek gitmez: üst kısmın sayısı depodan okunur.
// - Sepetin tutarları yalnız sunucuda hesaplanır (POST /kapi/herkese-acik/sepet). İstek yalnız sepeti gösteren bir
//   parça (sayfa ya da açık pencere) varken gider; sepet her değişince yeniden sorulur, eski cevap yenisini ezmez.
// - Sunucunun gösterdiği birim fiyatı depoya yazılır: fiyat değişikliği bir kez söylenir, sonraki bakışta tekrar
//   etmez. Düzeltilen adet (stok, alım sınırı) depoya kendiliğinden yazılmaz: sunucu her hesapta adedi sınıra indirir,
//   uyarı müşteri adedi değiştirene kadar görünür (yazılsaydı yeni istek uyarıyı hemen kaldırırdı).
// - Başka sekmedeki değişiklik görülür (storage olayı).
// - Depoya her yazımda ve durum kurulunca sepet sayfasının çerezi kalem sayısıyla eşitlenir (depo.ts, karar 0136).
// - Katalogun örnek kipinde depo kullanılmaz, istek gitmez; sepet yalnız bellekte durur.
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { kapiyaIstek } from "../../kapi/istemci";
import { type SepeteEkleyince, sepetDepoAnahtari, sepetSinirlari } from "../../kayitlar/sepet";
import type { VergiBolgeleri } from "../../moduller/sepet/semalar";
import { kimligiDuzelt } from "../../veritabani/kimlik-bicimi";
import { cereziYaz, kalemListesi, type YerelKalem, yereldenOku, yereleYaz } from "./depo";
import type { SepetGorunumu } from "./veri";

const sepetUcu = "/kapi/herkese-acik/sepet";

// Vitrin çerçevesi verir: istek gider mi ve ürün eklenince ne olur. Sağlayıcı yoksa (katalog) örnek kiptir.
export type SepetAyarlari = { kip: "sorulur" | "ornek"; sepeteEkleyince: SepeteEkleyince };
const AyarBaglami = createContext<SepetAyarlari>({ kip: "ornek", sepeteEkleyince: "yan-pencere" });

export function SepetSaglayici({
  ayarlar,
  children,
}: {
  ayarlar: SepetAyarlari;
  children: ReactNode;
}) {
  return createElement(AyarBaglami.Provider, { value: ayarlar }, children);
}

export const useSepetAyarlari = () => useContext(AyarBaglami);

// eklenen: pencereyi açan eklemenin ürün adı; pencerenin üstünde "… sepete eklendi." yazar.
type Durum = {
  hazir: boolean;
  kalemler: readonly YerelKalem[];
  pencereAcik: boolean;
  eklenen?: string | undefined;
};
const ilk: Durum = { hazir: false, kalemler: [], pencereAcik: false };
let durum: Durum = ilk;
let kip: SepetAyarlari["kip"] | undefined;
const dinleyiciler = new Set<() => void>();

const yay = (yeni: Partial<Durum>) => {
  durum = { ...durum, ...yeni };
  for (const dinleyici of dinleyiciler) dinleyici();
};

const depoDegisti = (olay: StorageEvent) => {
  if (olay.key !== sepetDepoAnahtari && olay.key !== null) return;
  yay({ kalemler: yereldenOku() });
};

const kur = (yeniKip: SepetAyarlari["kip"]) => {
  if (kip !== undefined) return;
  kip = yeniKip;
  if (yeniKip === "sorulur") {
    window.addEventListener("storage", depoDegisti);
    const kalemler = yereldenOku();
    // Sepet sayfasının çerezi depoyla eşitlenir (karar 0136): çerez silinmiş ya da çerezden önce dolmuş sepet,
    // vitrinin herhangi bir sayfası açılınca yeniden doğru sayıyı taşır.
    cereziYaz(kalemler.length);
    yay({ hazir: true, kalemler });
  } else yay({ hazir: true, kalemler: [] });
};

const kaydet = (kalemler: readonly YerelKalem[]) => {
  const temiz = kalemListesi(kalemler);
  if (kip === "sorulur") yereleYaz(temiz);
  yay({ kalemler: temiz });
};

// Sunucuda ve hidrasyonda sepet bilinmiyordur (boş): sunucunun çizdiğiyle tarayıcının ilk çizimi aynı kalır.
export const useSepet = (): Durum => {
  const ayarlar = useSepetAyarlari();
  const abone = useCallback(
    (dinleyici: () => void) => {
      dinleyiciler.add(dinleyici);
      kur(ayarlar.kip);
      return () => {
        dinleyiciler.delete(dinleyici);
      };
    },
    [ayarlar.kip],
  );
  return useSyncExternalStore(
    abone,
    () => durum,
    () => ilk,
  );
};

export type EklemeSonucu = "eklendi" | "sinir" | "adet-siniri";

// Birimi sepete ekler; sepette varsa adedi artar. Adet ürünün sınırlarını sunucu denetler, burada yalnız sepetin
// sınırları vardır.
export const sepeteEkle = (
  ayarlar: SepetAyarlari,
  ham: string,
  adet: number,
  gorulenTutar?: number,
): EklemeSonucu => {
  kur(ayarlar.kip);
  const birim = kimligiDuzelt(ham);
  const onceki = durum.kalemler.find((kalem) => kalem.birim === birim);
  if (onceki === undefined && durum.kalemler.length >= sepetSinirlari.kalemEnCok) return "sinir";
  const yeniAdet = (onceki?.adet ?? 0) + adet;
  if (yeniAdet > sepetSinirlari.adetEnCok) return "adet-siniri";
  const kalem: YerelKalem = {
    birim,
    adet: yeniAdet,
    ...(gorulenTutar === undefined ? {} : { gorulenTutar }),
  };
  kaydet(
    onceki === undefined
      ? [...durum.kalemler, kalem]
      : durum.kalemler.map((eski) => (eski.birim === birim ? kalem : eski)),
  );
  return "eklendi";
};

export const adetDegistir = (ham: string, adet: number): void => {
  const birim = kimligiDuzelt(ham);
  const sinirli = Math.min(Math.max(adet, 1), sepetSinirlari.adetEnCok);
  kaydet(
    durum.kalemler.map((kalem) => (kalem.birim === birim ? { ...kalem, adet: sinirli } : kalem)),
  );
};

// Çıkarılan kalem ve eski yeri döner: "Geri al" onu yerine koyar.
export const sepettenCikar = (ham: string): { kalem: YerelKalem; sira: number } | undefined => {
  const birim = kimligiDuzelt(ham);
  const sira = durum.kalemler.findIndex((kalem) => kalem.birim === birim);
  const kalem = durum.kalemler[sira];
  if (kalem === undefined) return undefined;
  kaydet(durum.kalemler.filter((eski) => eski.birim !== birim));
  return { kalem, sira };
};

export const geriKoy = (kalem: YerelKalem, sira: number): void => {
  if (durum.kalemler.some((eski) => eski.birim === kalem.birim)) return;
  const yer = Math.min(Math.max(sira, 0), durum.kalemler.length);
  kaydet([...durum.kalemler.slice(0, yer), kalem, ...durum.kalemler.slice(yer)]);
};

// Pencere bir tetikleyiciyle değil durumla açılır: Radix odağı geri vereceği öğeyi bilmez. Açılırken odaktaki öğe
// (sepete ekle düğmesi) saklanır, pencere kapanınca odak ona döner (penceredenDonulecekOge).
let donulecekOge: HTMLElement | null = null;
export const pencereyiAc = (eklenen?: string): void => {
  donulecekOge = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  yay({ pencereAcik: true, eklenen });
};
export const pencereyiKapat = (): void => yay({ pencereAcik: false });
export const penceredenDonulecekOge = (): HTMLElement | null => {
  const oge = donulecekOge;
  donulecekOge = null;
  return oge?.isConnected ? oge : null;
};

// Sunucunun gösterdiği birim fiyatını depoya yazar: fiyat değişikliği bir kez söylenir. İstek anahtarı yalnız birim
// ve adettir, bu yazım yeni istek göndermez.
const gordugunuYaz = (gorunum: SepetGorunumu) => {
  let degisti = false;
  const kalemler = durum.kalemler.map((kalem) => {
    const satir = gorunum.satirlar.find((aday) => aday.birim === kalem.birim);
    const gorulenTutar = satir?.birimTutari;
    if (gorulenTutar === undefined || gorulenTutar === kalem.gorulenTutar) return kalem;
    degisti = true;
    return { ...kalem, gorulenTutar };
  });
  if (degisti) kaydet(kalemler);
};

const bosGorunum: SepetGorunumu = {
  satirlar: [],
  adet: 0,
  gosterim: "yok",
  kargo: "yok",
  vergiDokumu: [],
  yazili: { araToplam: "", vergi: "", toplam: "" },
  toplam: 0,
  odemeyeGecilebilir: false,
};

export type GorunumDurumu =
  | { tur: "yukleniyor" }
  | { tur: "hata" }
  | { tur: "hazir"; gorunum: SepetGorunumu };

// Sepetin sunucuda hesaplanmış görünümü. Etkin değilse istek gitmez. Örnek kipte örnek görünüm verilir.
// Ödeme adımı teslimat ve fatura adresinin bölgesini verir, vergi ona göre hesaplanır (kart 0213); yenileme sayısı
// artınca görünüm yeniden istenir (sunucu sepetin değiştiğini söyleyince).
export const useSepetGorunumu = (
  etkin: boolean,
  ornek?: SepetGorunumu,
  { vergiBolgeleri, yenileme = 0 }: { vergiBolgeleri?: VergiBolgeleri; yenileme?: number } = {},
): GorunumDurumu => {
  const { kip: ayarKipi } = useSepetAyarlari();
  const sepet = useSepet();
  const [sonuc, setSonuc] = useState<GorunumDurumu>({ tur: "yukleniyor" });
  const anahtar = JSON.stringify(sepet.kalemler.map(({ birim, adet }) => [birim, adet]));
  const bolgeAnahtari = JSON.stringify(vergiBolgeleri ?? null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: istek yalnız birim, adet, vergi bölgesi ve yenileme değişince gider; son görülen fiyat yazılınca gitmez.
  useEffect(() => {
    if (!etkin || !sepet.hazir) return;
    if (ayarKipi === "ornek") {
      setSonuc(ornek === undefined ? { tur: "hata" } : { tur: "hazir", gorunum: ornek });
      return;
    }
    // Boş sepet için istek gitmez: boş hâl hemen çizilir.
    if (durum.kalemler.length === 0) {
      setSonuc({ tur: "hazir", gorunum: bosGorunum });
      return;
    }
    let gecerli = true;
    void (async () => {
      try {
        const yanit = await kapiyaIstek(sepetUcu, {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kalemler: durum.kalemler,
            ...(vergiBolgeleri === undefined ? {} : { vergiBolgeleri }),
          }),
        });
        const zarf = (await yanit.json()) as { basarili: boolean; veri?: SepetGorunumu };
        if (!gecerli) return;
        if (zarf.basarili && zarf.veri !== undefined) {
          setSonuc({ tur: "hazir", gorunum: zarf.veri });
          gordugunuYaz(zarf.veri);
        } else setSonuc({ tur: "hata" });
      } catch {
        if (gecerli) setSonuc({ tur: "hata" });
      }
    })();
    return () => {
      gecerli = false;
    };
  }, [etkin, sepet.hazir, anahtar, bolgeAnahtari, yenileme, ayarKipi]);
  return sonuc;
};

// Yalnız testler için: bir sonraki kullanan durumu yeniden kurar.
export const sepetDurumunuSifirla = (): void => {
  durum = ilk;
  kip = undefined;
  if (typeof window !== "undefined") window.removeEventListener("storage", depoDegisti);
};
