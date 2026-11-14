"use client";
// Vitrinde müşterinin favorileri, tek yerden (kart 0140, karar 0110). Ürün kartının, ürün sayfasının ve üst
// kısmın favori düğmeleri, sayısı ve favoriler sayfası bu durumu paylaşır.
//
// - Durum sayfa yüklemesi başına bir kez kurulur. Önce hesap durumu beklenir (hesap-durumu.ts): aynı sayfada iki
//   müşteri isteği aynı yenileme anahtarını aynı anda kullanmasın (karar 0098).
//   - Girişsiz müşteride liste tarayıcının deposundandır, sunucuya gitmez.
//   - Girişli müşteride liste hesaptandır (GET /kapi/musteri/favoriler). Tarayıcıda liste kalmışsa (giriş ya da
//     kayıttan hemen sonra) önce hesaba birleşir (POST /kapi/musteri/favori-birlestir), sonra tarayıcıdan silinir.
//   - Hesap durumu bilinmiyorsa (sunucu ya da ağ hatası) favoriler de bilinmiyor sayılır: düğme basılınca hata
//     söyler, tarayıcıdaki listeyle hesabı karıştırmaz.
// - Girişli müşterinin değişikliği ekranda hemen görünür, istekler sırayla gider. Olmazsa yalnız o ürün eski
//   hâline döner.
// - Geçerli liste her değişince favoriler sayfasının çerezine yazılır (favori-deposu.ts).
// - Katalogun örnek kipinde istek gitmez, depo ve çerez kullanılmaz; liste yalnız bellekte durur.
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import { favoriDepoAnahtari, favoriSiniriEnCok } from "../kayitlar/favori";
import { hataKodlari } from "../kayitlar/kapi";
import type { BirlesmeSonucu, FavoriHatasi, FavoriListesi } from "../moduller/favori/semalar";
import { kimligiDuzelt } from "../veritabani/kimlik-bicimi";
import { cereziSil, cereziYaz, yereldenOku, yereleYaz } from "./favori-deposu";
import { hesapDurumunuBekle, hesapDurumunuYenile } from "./hesap-durumu";

const uclar = {
  liste: "/kapi/musteri/favoriler",
  degistir: "/kapi/musteri/favori",
  birlestir: "/kapi/musteri/favori-birlestir",
} as const;

export type FavoriKaynagi = "hesap" | "tarayici" | "ornek";

export type FavoriDurumu =
  | { tur: "bilinmiyor" }
  | { tur: "hata" }
  | {
      tur: "hazir";
      kaynak: FavoriKaynagi;
      // En yeni önce.
      urunler: readonly string[];
      // Birleşmede sınıra sığmayan ürün sayısı (bir kez gösterilir).
      sigmayan: number;
    };

export type FavoriSonucu = "eklendi" | "cikarildi" | "sinir" | "urun-yok" | "hata";

// Vitrin çerçevesi verir: istek gider mi ve sitenin sınırı. Sağlayıcı yoksa (katalog) örnek kiptir.
export type FavoriAyarlari = { kip: "sorulur" | "ornek"; sinir: number };
const AyarBaglami = createContext<FavoriAyarlari>({ kip: "ornek", sinir: favoriSiniriEnCok });

export function FavoriSaglayici({
  ayarlar,
  children,
}: {
  ayarlar: FavoriAyarlari;
  children: ReactNode;
}) {
  return createElement(AyarBaglami.Provider, { value: ayarlar }, children);
}

export const useFavoriAyarlari = () => useContext(AyarBaglami);

const bilinmiyor: FavoriDurumu = { tur: "bilinmiyor" };
let durum: FavoriDurumu = bilinmiyor;
let sinir = favoriSiniriEnCok;
let kurulum: Promise<void> | undefined;
const dinleyiciler = new Set<() => void>();

const yay = (yeni: FavoriDurumu) => {
  durum = yeni;
  if (yeni.tur === "hazir" && yeni.kaynak !== "ornek") cereziYaz(yeni.urunler);
  // Favoriler bilinmiyorsa çerezde önceki listenin kalması onu favoriler sayfasına taşırdı (bağımsız kontrolün
  // bulgusu): çerez silinir.
  if (yeni.tur === "hata") cereziSil();
  for (const dinleyici of dinleyiciler) dinleyici();
};

class FavoriIstekHatasi extends Error {
  constructor(readonly neden: FavoriHatasi | "baska") {
    super(neden);
  }
}

// Kapıya istek: zarfın verisini döner, hatada nedeni taşıyan hata atar.
const istek = async <Veri>(adres: string, govde?: unknown): Promise<Veri> => {
  const yanit = await fetch(adres, {
    cache: "no-store",
    ...(govde === undefined
      ? {}
      : {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(govde),
        }),
  });
  const zarf = (await yanit.json().catch(() => undefined)) as
    | { basarili: true; veri: Veri }
    | { basarili: false; hata: { kod: string; ayrinti?: { kod?: string }[] } }
    | undefined;
  if (zarf?.basarili === true) return zarf.veri;
  const neden = zarf?.hata.ayrinti?.[0]?.kod;
  throw new FavoriIstekHatasi(
    yanit.status !== hataKodlari["oturum-yok"] &&
      (neden === "favori-siniri" || neden === "urun-yok")
      ? neden
      : "baska",
  );
};

const hazirla = async (): Promise<void> => {
  const hesap = await hesapDurumunuBekle();
  if (hesap.tur === "girissiz") {
    yay({ tur: "hazir", kaynak: "tarayici", urunler: yereldenOku().slice(0, sinir), sigmayan: 0 });
    return;
  }
  if (hesap.tur === "bilinmiyor") {
    yay({ tur: "hata" });
    return;
  }
  try {
    const tarayicidakiler = yereldenOku();
    if (tarayicidakiler.length === 0) {
      const { favoriler } = await istek<FavoriListesi>(uclar.liste);
      yay({ tur: "hazir", kaynak: "hesap", urunler: favoriler, sigmayan: 0 });
      return;
    }
    const sonuc = await istek<BirlesmeSonucu>(uclar.birlestir, { urunler: tarayicidakiler });
    yereleYaz([]);
    yay({ tur: "hazir", kaynak: "hesap", urunler: sonuc.favoriler, sigmayan: sonuc.sigmayan });
  } catch {
    yay({ tur: "hata" });
  }
};

// Üye olmayan müşterinin listesi başka sekmede değişince hesap durumu yeniden sorulur ve durum yeniden kurulur:
// başka sekmede giriş yapılıp liste hesaba birleştiyse bu sekme de hesabın listesine geçer (bağımsız kontrolün
// bulgusu); girişsiz kaldıysa yeni listeyi alır.
const depoDegisti = (olay: StorageEvent) => {
  if (olay.key !== favoriDepoAnahtari && olay.key !== null) return;
  if (durum.tur !== "hazir" || durum.kaynak !== "tarayici") return;
  kurulum = hesapDurumunuYenile().then(() => hazirla());
};

// Favoriler sayfasının sunucuda denetleyip görünmez bulduğu ürünler (taslak, arşiv, silinmiş) üye olmayan
// müşterinin listesinden atılır: görünmeyen ürün sınırdan yer yemesin, sayıda kalmasın (bağımsız kontrolün
// bulgusu). Girişli müşterinin listesi zaten yalnız görünenlerdir.
export const gorunmeyenleriAt = (urunler: readonly string[]): void => {
  if (durum.tur !== "hazir" || durum.kaynak !== "tarayici" || urunler.length === 0) return;
  const atilacak = new Set(urunler);
  const kalan = durum.urunler.filter((urun) => !atilacak.has(urun));
  if (kalan.length === durum.urunler.length) return;
  yereleYaz(kalan);
  yay({ ...durum, urunler: kalan });
};

const kur = (ayarlar: FavoriAyarlari): Promise<void> => {
  sinir = ayarlar.sinir;
  if (kurulum === undefined) {
    if (ayarlar.kip === "ornek") {
      yay({ tur: "hazir", kaynak: "ornek", urunler: [], sigmayan: 0 });
      kurulum = Promise.resolve();
    } else {
      window.addEventListener("storage", depoDegisti);
      kurulum = hazirla();
    }
  }
  return kurulum;
};

// Sunucuda ve hidrasyonda durum bilinmiyordur: sunucunun çizdiğiyle tarayıcının ilk çizimi aynı kalır.
export const useFavoriler = (): FavoriDurumu => {
  const { kip, sinir: siteninSiniri } = useFavoriAyarlari();
  const abone = useCallback(
    (dinleyici: () => void) => {
      dinleyiciler.add(dinleyici);
      void kur({ kip, sinir: siteninSiniri });
      return () => {
        dinleyiciler.delete(dinleyici);
      };
    },
    [kip, siteninSiniri],
  );
  return useSyncExternalStore(
    abone,
    () => durum,
    () => bilinmiyor,
  );
};

// Birleşme uyarısı gösterildi: bir daha gösterilmez.
export const sigmayanGosterildi = (): void => {
  if (durum.tur === "hazir" && durum.sigmayan > 0) yay({ ...durum, sigmayan: 0 });
};

// Girişli müşterinin istekleri sırayla gider.
let kuyruk: Promise<unknown> = Promise.resolve();
let bekleyen = 0;

const listeyeKoy = (liste: readonly string[], urun: string, sira?: number): string[] => {
  const kalan = liste.filter((kimlik) => kimlik !== urun);
  const yer = sira === undefined ? 0 : Math.min(Math.max(sira, 0), kalan.length);
  return [...kalan.slice(0, yer), urun, ...kalan.slice(yer)];
};

// Ürünü favorilere ekler ya da çıkarır. sira, geri alınan ürünün listedeki eski yeridir (favoriler sayfası).
export const favoriDegistir = async (
  ayarlar: FavoriAyarlari,
  ham: string,
  favoride: boolean,
  sira?: number,
): Promise<FavoriSonucu> => {
  await kur(ayarlar);
  const simdiki = durum;
  if (simdiki.tur !== "hazir") return "hata";
  const urun = kimligiDuzelt(ham);
  const tamam: FavoriSonucu = favoride ? "eklendi" : "cikarildi";
  if (simdiki.urunler.includes(urun) === favoride) return tamam;
  if (favoride && simdiki.urunler.length >= sinir) return "sinir";
  const yeni = favoride
    ? listeyeKoy(simdiki.urunler, urun, sira)
    : simdiki.urunler.filter((kimlik) => kimlik !== urun);
  if (simdiki.kaynak === "tarayici") yereleYaz(yeni);
  yay({ ...simdiki, urunler: yeni });
  if (simdiki.kaynak !== "hesap") return tamam;

  bekleyen += 1;
  const sonuc = kuyruk.then(() => istek<FavoriListesi>(uclar.degistir, { urun, favoride }));
  kuyruk = sonuc.catch(() => undefined);
  try {
    const { favoriler } = await sonuc;
    bekleyen -= 1;
    // Bekleyen istek kalmadıysa hesabın listesi ekrandakinden farklıysa (başka sekmede değişmiş) hesabınki
    // geçerlidir. Aynıysa ekrandaki sıra kalır (geri alınan ürün eski yerinde durur).
    const ekranda = durum.tur === "hazir" ? durum.urunler : [];
    const ayni =
      ekranda.length === favoriler.length && favoriler.every((kimlik) => ekranda.includes(kimlik));
    if (bekleyen === 0 && !ayni && durum.tur === "hazir") yay({ ...durum, urunler: favoriler });
    return tamam;
  } catch (hata) {
    bekleyen -= 1;
    // Yalnız bu ürün eski hâline döner; öteki değişiklikler ekranda kalır.
    if (durum.tur === "hazir") {
      const eski = simdiki.urunler.indexOf(urun);
      yay({
        ...durum,
        urunler: favoride
          ? durum.urunler.filter((kimlik) => kimlik !== urun)
          : listeyeKoy(durum.urunler, urun, eski),
      });
    }
    const neden = hata instanceof FavoriIstekHatasi ? hata.neden : "baska";
    return neden === "favori-siniri" ? "sinir" : neden === "urun-yok" ? "urun-yok" : "hata";
  }
};

// Yalnız testler için: bir sonraki kullanan durumu yeniden kurar.
export const favoriDurumunuSifirla = (): void => {
  durum = bilinmiyor;
  kurulum = undefined;
  kuyruk = Promise.resolve();
  bekleyen = 0;
  sinir = favoriSiniriEnCok;
  if (typeof window !== "undefined") window.removeEventListener("storage", depoDegisti);
};
