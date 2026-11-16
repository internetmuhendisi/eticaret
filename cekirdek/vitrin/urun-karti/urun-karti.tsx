// Ürün kartı (kart 0109, karar 0085). Ürünün listede, vitrin bölümlerinde, aramada ve önerilerde görünen
// kartı tek bileşendir (.claude/rules/vitrin.md); veriyi yalnız urunKartlari'ndan (veri.ts) alır.
//
// Görünüm temadan ya da bölümün seçiminden gelir (gorunum.ts):
// - dikey: kare görsel üstte, marka, ad, puan ve fiyat altta (Canlı Çarşı taslağı, karar 0075).
// - yatay: küçük görsel solda; ad, fiyat ve tükenmişse "Tükendi" yazısı sağda (taslağın kompakt kartı:
//   marka ve rozet yok, indirimi fiyatın rengi ve eski fiyat söyler); dar yerler için. Sepet ve favori fiyatın
//   sağındadır, fiyata yer kalmayınca altına iner (kart 0193, karar 0134).
// - buyuk-gorsel: uzun görsel büyük boyuttan, ad ve fiyat daha büyük.
//
// - Rozet görselin sol üstündedir. Tükenmiş üründe yalnız "Tükendi" (koyu); değilse indirim oranı
//   (kullanıcı kararı: aşağı yuvarlanmış oran, birleşimlerin oranları farklıysa "...'e varan"). "Son 3
//   ürün" kartta yazmaz, ürün sayfasınındır (kullanıcı kararı).
// - Görsel yüzey renginde kutunun ortasında, kutunun 7/8'i kadardır (taslakta 86 ve 88 yüzde). Görseli
//   olmayan üründe ikon durur; görselin alternatif metni galeriden gelir.
// - Puan beş yıldızdır (taslak): ortalamanın yuvarlandığı kadarı dolu; puanı olmayan üründe beşi boş.
// - Ad iki satırda üç noktayla biter, tam adı bağlantının kendisidir. Bütün kart ürün sayfasına gider:
//   adın bağlantısı kartın üstüne yayılır, favori ve sepet düğmeleri onun üstündedir.
// - Favori, sepete ekle ve puan işlevleri yazılınca görünür (cekirdek/kayitlar/islevler.ts). Favori kart 0140
//   ile çalışır (FavoriDugmesi, durumu sayfada tek yerden). Öteki eylemleri
//   bu kartta yazılmaz, yalnız yerleri vardır (kart 0109'un sınırı).
import Link from "next/link";
import type { ReactNode } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { sabitDegerler } from "../../../bilesenler/tasarim-degerleri/degerler";
import type { Islev } from "../../kayitlar/islevler";
import type { UrunKartiGorunumu } from "../../kayitlar/tema";
import { bicim, metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { FavoriDugmesi } from "../favori-dugmesi";
import { Yildizlar } from "../yildizlar";
import { FiyatGosterimi } from "./fiyat";
import type { UrunKartiGorseli, UrunKartiVerisi } from "./tur";

export type UrunKartiIslevleri = Readonly<
  Pick<Record<Islev, boolean>, "favori" | "sepet" | "yorum">
>;

const { tablet, masaustu } = sabitDegerler.kirilmaNoktalari;

// Listenin ilk kaç kartının görseli öncelikli yüklenir (kart 0146): telefonda ilk satır. Ölçüldü: yavaş telefonda
// kategori sayfasının ana içeriği ilk kartın görselidir, tembel ve öncelik verilmeden yüklenince kodla aynı anda
// iniyor, 2,5 saniyeyi aşıyordu.
export const oncelikliKartSayisi = 2;

// Tarayıcının görsel boyutunu seçmesi için kartın yaklaşık genişliği; ızgarayı bilen çağıran
// değiştirebilir. Yatay kartın görseli 5rem'dir (size-20).
const varsayilanGenislikler: Record<UrunKartiGorunumu, string> = {
  dikey: `(min-width: ${masaustu}) 20vw, (min-width: ${tablet}) 33vw, 50vw`,
  yatay: sabitDegerler.bosluklar["20"],
  "buyuk-gorsel": `(min-width: ${tablet}) 50vw, 100vw`,
};

function KartGorseli({
  gorsel,
  genislik,
  oncelikli,
}: {
  gorsel: UrunKartiGorseli | undefined;
  genislik: string;
  oncelikli: boolean;
}) {
  if (gorsel === undefined) {
    return (
      <span className="flex size-full items-center justify-center text-soluk-yazi">
        <Ikon ad="gorsel" className="size-8" />
      </span>
    );
  }
  const [ilk] = gorsel.kaynaklar;
  return (
    <span className="flex size-full items-center justify-center">
      {/* biome-ignore lint/performance/noImgElement: boyutlar çekirdekte üretilir (karar 0073), srcset ile seçilir. */}
      <img
        src={ilk?.adres}
        srcSet={gorsel.kaynaklar.map((k) => `${k.adres} ${k.genislik}w`).join(", ")}
        sizes={genislik}
        alt={gorsel.alternatifMetin}
        width={gorsel.genislik}
        height={gorsel.yukseklik}
        loading={oncelikli ? "eager" : "lazy"}
        fetchPriority={oncelikli ? "high" : "auto"}
        decoding="async"
        className="size-7/8 object-contain"
      />
    </span>
  );
}

function KartRozeti({ urun }: { urun: UrunKartiVerisi }) {
  // Dar kartta uzun rozet ("...'e varan indirim") satıra sığmazsa iki satıra iner.
  if (urun.tukendi) {
    return (
      <Rozet tur="koyu" className="whitespace-normal">
        {metin("vitrin.stok.tukendi")}
      </Rozet>
    );
  }
  const indirim = urun.fiyat?.indirim;
  if (indirim === undefined) return null;
  const oran = bicim().yuzde(indirim.oran);
  return (
    <Rozet className="whitespace-normal">
      {indirim.varan
        ? doldur(metin("vitrin.urunKarti.varanIndirim"), {
            oran,
            ek: bicim().yonelmeEki(indirim.oran),
          })
        : doldur(metin("vitrin.urunKarti.indirim"), { oran })}
    </Rozet>
  );
}

function Puan({ puan }: { puan: UrunKartiVerisi["puan"] }) {
  const yazi =
    puan === undefined
      ? metin("vitrin.urunKarti.puanYok")
      : doldur(metin("vitrin.urunKarti.puan"), {
          ortalama: bicim().sayi(puan.ortalama, 1),
          sayi: bicim().sayi(puan.sayi),
        });
  return (
    <span className="text-soluk-yazi">
      <Yildizlar dolu={puan === undefined ? 0 : Math.round(puan.ortalama)} yazi={yazi} />
    </span>
  );
}

export function UrunKarti({
  urun,
  gorunum,
  islevler,
  baslikDuzeyi = 3,
  gorselGenisligi,
  oncelikli = false,
  ustSatir,
  className,
}: {
  urun: UrunKartiVerisi;
  gorunum: UrunKartiGorunumu;
  islevler: UrunKartiIslevleri;
  // Adın başlık düzeyi, kartın sayfadaki yerine göre.
  baslikDuzeyi?: 2 | 3 | 4;
  // Görselin sayfadaki yaklaşık genişliği (sizes); verilmezse görünümün varsayılanı.
  gorselGenisligi?: string;
  // Sayfanın ilk görünen kartları görseli beklemeden yükler.
  oncelikli?: boolean;
  // Bilgilerin en üstündeki satır, markadan önce (kart 0111: fırsatlarda indirimin kalan süresi; Canlı Çarşı
  // taslağı). Kartın verisi değildir, kartı çizen bölüm verir.
  ustSatir?: ReactNode;
  className?: string;
}) {
  const Baslik = `h${baslikDuzeyi}` as const;
  const yatay = gorunum === "yatay";
  const buyuk = gorunum === "buyuk-gorsel";
  // Favori taslaktaki gibi zeminsizdir: görselin köşesindeki yüzeyin üstünde durur. Sepete ekle
  // görselin altına yakın durduğu için zemin rengindedir, görselin üstüne gelse de okunur.
  const favori = islevler.favori ? (
    <FavoriDugmesi urun={urun.kimlik} urunAdi={urun.ad} className="pointer-events-auto relative" />
  ) : null;
  const sepet =
    islevler.sepet && !urun.tukendi && urun.fiyat !== undefined ? (
      <IkonDugmesi
        ikon="sepet"
        etiket={metin("vitrin.urunKarti.sepeteEkle")}
        tur="cerceveli"
        className={sinif("pointer-events-auto relative shrink-0", !yatay && "bg-zemin")}
      />
    ) : null;

  const gorselAlani = (
    <KartGorseli
      gorsel={urun.gorsel}
      genislik={gorselGenisligi ?? varsayilanGenislikler[gorunum]}
      oncelikli={oncelikli}
    />
  );

  const bilgiler = (
    <div
      className={sinif(
        "flex min-w-0 flex-1 flex-col",
        yatay ? "gap-1" : buyuk ? "gap-1.5 p-4" : "gap-1.5 p-kart-ici",
      )}
    >
      {ustSatir}
      {yatay || urun.marka === undefined ? null : (
        <span className="truncate text-kucuk text-soluk-yazi">{urun.marka}</span>
      )}
      <Baslik className={sinif("font-govde font-orta", buyuk ? "text-buyuk" : "text-govde")}>
        <Link
          href={urun.adres}
          className="line-clamp-2 wrap-anywhere text-yazi no-underline after:absolute after:inset-0 after:rounded-orta hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-odak focus-visible:after:outline-solid"
        >
          {urun.ad}
        </Link>
      </Baslik>
      {islevler.yorum && !yatay ? <Puan puan={urun.puan} /> : null}
      {/* Yatay kartta düğmeler fiyatın sağındadır; kart dar olunca (kapsayıcı genişliği "kart"ın altında) fiyat
          bütün satırı alır, düğmeler altına iner ve sağa yaslanır (kart 0193, karar 0134). Karar ekranın değil
          kartın kendi genişliğine göre verilir: telefonda da dört sütunlu ızgarada da aynı kural. */}
      <div
        className={sinif(
          "mt-auto flex min-w-0 items-end justify-between gap-2",
          yatay && "@max-kart:flex-col @max-kart:items-stretch",
        )}
      >
        {urun.fiyat === undefined ? null : (
          <FiyatGosterimi fiyat={urun.fiyat} boyut={buyuk ? "buyuk" : "normal"} />
        )}
        {yatay && (sepet !== null || favori !== null) ? (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {sepet}
            {favori}
          </div>
        ) : null}
      </div>
      {yatay && urun.tukendi ? (
        <span className="text-kucuk font-kalin text-soluk-yazi">
          {metin("vitrin.stok.tukendi")}
        </span>
      ) : null}
    </div>
  );

  if (yatay) {
    return (
      <article
        data-slot="urun-karti"
        data-gorunum={gorunum}
        className={sinif(
          "@container relative flex min-w-0 flex-row items-center gap-3 overflow-hidden rounded-orta border border-kart-kenari bg-zemin p-3 text-yazi shadow-kart",
          className,
        )}
      >
        <div className="size-20 shrink-0 rounded-kucuk bg-yuzey">{gorselAlani}</div>
        {bilgiler}
      </article>
    );
  }

  // Dikey ve büyük görselli kart: görsel alanı kodda bilgilerden sonra gelir, ekranda üsttedir
  // (order-first). Böylece klavye sırası ürünün adı, sepete ekle ve favoridir. Görsel alanı adın kartı
  // kaplayan bağlantısının tıklamasını almaz; yalnız düğmeleri alır.
  return (
    <article
      data-slot="urun-karti"
      data-gorunum={gorunum}
      className={sinif(
        "relative flex min-w-0 flex-col overflow-hidden rounded-orta border border-kart-kenari bg-zemin text-yazi shadow-kart",
        className,
      )}
    >
      {bilgiler}
      <div
        className={sinif(
          "pointer-events-none relative order-first w-full shrink-0 bg-yuzey",
          buyuk ? "aspect-4/5" : "aspect-square",
        )}
      >
        {gorselAlani}
        {/* Favori düğmesi sağ üstteyse rozet onun yerine girmez. */}
        <div className={sinif("absolute top-2 left-2", favori === null ? "right-2" : "right-12")}>
          <KartRozeti urun={urun} />
        </div>
        {sepet === null ? null : <div className="absolute right-2 bottom-2">{sepet}</div>}
        {favori === null ? null : <div className="absolute top-1 right-1">{favori}</div>}
      </div>
    </article>
  );
}
