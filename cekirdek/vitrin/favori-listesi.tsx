"use client";
// Favoriler sayfasının listesi (kart 0140, karar 0110). Kartlar sunucuda çizilmiş gelir; hangilerinin ve hangi
// sırayla görüneceği tarayıcıdaki favori durumundandır (favori-durumu.ts):
//
// - Durum bilinmezken iskelet görünür; okunamazsa hata yazar. İkisinde de "liste boş" denmez. Tek ayrık: sunucu
//   çerezde hiç ürün görmediyse boş hâl hemen, sunucuda çizilir (kart 0146, kullanıcı kararı): yavaş telefonda
//   içerik iskelet yüzünden 3,3 saniyede geliyordu. Hesabında favori olan üye bu cihazda ilk kez gelirse boş hâli
//   kısa bir an görür; listesi gelince sayfa aşağıdaki kuralla bir kez yenilenir.
// - Durumda olup sunucunun denetlemediği ürün varsa (başka cihazda eklenmiş, sayfa çerezsiz açılmış) sayfa bir kez
//   yenilenir; çerez o ana kadar yazılmıştır. Aynı liste için ikinci kez yenilenmez (çerez yazılamıyorsa döngü olmaz).
// - Sunucunun denetleyip kartını çizmediği ürün (taslak, arşiv, silinmiş) görünmez ve sayılmaz; üye olmayan
//   müşterinin listesinden atılır.
// - İlk açılışta sunucu durumda olmayan ürünlerin kartını çizdiyse (eski çerez) sayfa bir kez yenilenir.
// - Çıkarılan kartın yerine odak bir sonraki kartın favori düğmesine geçer.
// - Çıkarılan ürün hemen kalkar, bildirimdeki "Geri al" onu eski yerine koyar (kullanıcı kararı); kartı bellekte
//   kaldığı için sayfa yenilenmez.
// - Üye olmayan müşteriye "bu cihazda saklanıyor" bilgisi liste doluyken görünür (karar 0102).
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { IskeletGorunum } from "../../bilesenler/parcalar/iskelet";
import { SayfaBasligi } from "../../bilesenler/parcalar/sayfa-basligi";
import { sinif } from "../../bilesenler/parcalar/sinif";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { doldur } from "../metinler/doldur";
import { useMetin } from "../metinler/istemci-metni";
import { FavoriSayfasiBaglami, favoriUrunIsareti } from "./favori-dugmesi";
import { gorunmeyenleriAt, useFavoriler } from "./favori-durumu";

// İskelette gösterilen kart sayısı.
const iskeletSayisi = 4;

export function FavoriListesi({
  baslik,
  denetlenenler,
  kartlar,
  izgara,
  cihazdaBilgisi,
  bosHal,
}: {
  baslik: string;
  // Sunucunun çerezde gördüğü, görünürlüğünü denetlediği ürünler.
  denetlenenler: readonly string[];
  kartlar: readonly { kimlik: string; kart: ReactNode }[];
  izgara: string;
  cihazdaBilgisi: ReactNode;
  bosHal: ReactNode;
}) {
  const metin = useMetin();
  const router = useRouter();
  const durum = useFavoriler();
  const yenilenenler = useRef(new Set<string>());
  // İlk açılışın denetimi: çerez önceki bir müşterinin listesini taşıyorsa sayfa bir kez yenilenir.
  const ilkDenetim = useRef(true);
  const kap = useRef<HTMLDivElement>(null);
  const oncekiler = useRef<readonly string[]>([]);

  const denetlenen = new Set(denetlenenler);
  const kartiOlan = new Map(kartlar.map((kayit) => [kayit.kimlik, kayit.kart]));
  const urunler = durum.tur === "hazir" ? durum.urunler : [];
  const eksikler = urunler.filter((urun) => !denetlenen.has(urun));
  // Sunucunun çizdiği ama durumda olmayan kartlar (oturumu çıkışsız bitmiş müşterinin çerezi): ilk açılışta
  // sayfa yenilenir, kartlar sayfanın verisinde kalmaz (bağımsız kontrolün bulgusu). Sonradan çıkarılanlar
  // "Geri al" için bellekte kalır.
  const fazlalar =
    durum.tur !== "bilinmiyor" && ilkDenetim.current
      ? denetlenenler.filter((urun) => !urunler.includes(urun))
      : [];
  const imza = [...eksikler, "|", ...fazlalar].join(",");
  const yenilenecek = imza !== "|" && !yenilenenler.current.has(imza);
  useEffect(() => {
    if (durum.tur === "bilinmiyor") return;
    ilkDenetim.current = false;
    if (!yenilenecek) return;
    yenilenenler.current.add(imza);
    router.refresh();
  }, [durum.tur, yenilenecek, imza, router]);

  // Sunucunun denetleyip görünmez bulduğu ürünler üye olmayan müşterinin listesinden atılır.
  const gorunmeyenler =
    durum.tur === "hazir" && durum.kaynak === "tarayici" && !yenilenecek
      ? urunler.filter((urun) => denetlenen.has(urun) && !kartiOlan.has(urun))
      : [];
  const gorunmeyenImza = gorunmeyenler.join(",");
  useEffect(() => {
    if (gorunmeyenImza !== "") gorunmeyenleriAt(gorunmeyenImza.split(","));
  }, [gorunmeyenImza]);

  const gorunenler = urunler.filter((urun) => kartiOlan.has(urun));
  // Çıkarılan kartın düğmesi sayfadan kalkınca odak kaybolmasın (bağımsız kontrolün bulgusu): aynı sıradaki
  // kartın favori düğmesine, liste boşaldıysa boş hâlin bağlantısına geçer.
  const gorunenImza = gorunenler.join(",");
  useEffect(() => {
    const once = oncekiler.current;
    const simdi = gorunenImza === "" ? [] : gorunenImza.split(",");
    oncekiler.current = simdi;
    const odak = document.activeElement;
    if (odak !== null && odak !== document.body) return;
    const cikan = once.findIndex((urun) => !simdi.includes(urun));
    if (cikan < 0) return;
    const hedef = simdi[Math.min(cikan, simdi.length - 1)];
    const oge =
      hedef === undefined
        ? kap.current?.querySelector<HTMLElement>("a, button")
        : kap.current?.querySelector<HTMLElement>(`[${favoriUrunIsareti}="${hedef}"]`);
    oge?.focus();
  }, [gorunenImza]);

  const bosBilinen = denetlenenler.length === 0;
  if ((durum.tur === "bilinmiyor" && !bosBilinen) || yenilenecek) {
    return (
      <>
        <SayfaBasligi baslik={baslik} className="mb-5" />
        <p className="sr-only" role="status">
          {metin("vitrin.favori.yukleniyor")}
        </p>
        <div className={sinif("grid min-w-0", izgara)}>
          {Array.from({ length: iskeletSayisi }, (_, sira) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: iskeletin öğeleri sabittir, sırası değişmez.
            <IskeletGorunum key={sira} className="aspect-3/4" />
          ))}
        </div>
      </>
    );
  }

  // Favoriler okunamadı (sunucu ya da ağ hatası): liste boş denmez.
  if (durum.tur === "hata") {
    return (
      <>
        <SayfaBasligi baslik={baslik} className="mb-5" />
        <Uyari tur="tehlike">{metin("vitrin.favori.hata")}</Uyari>
      </>
    );
  }

  return (
    <div ref={kap} className="contents">
      <SayfaBasligi
        baslik={baslik}
        {...(gorunenler.length === 0
          ? {}
          : { ek: doldur(metin("vitrin.favori.sayi"), { sayi: String(gorunenler.length) }) })}
        className="mb-5"
      />
      {gorunenler.length === 0 ? (
        bosHal
      ) : (
        <>
          {durum.tur === "hazir" && durum.kaynak === "tarayici" ? cihazdaBilgisi : null}
          <FavoriSayfasiBaglami.Provider value>
            <ul
              aria-label={metin("vitrin.favori.urunler")}
              className={sinif("grid min-w-0", izgara)}
            >
              {gorunenler.map((urun) => (
                <li key={urun} className="min-w-0">
                  {kartiOlan.get(urun)}
                </li>
              ))}
            </ul>
          </FavoriSayfasiBaglami.Provider>
        </>
      )}
    </div>
  );
}
