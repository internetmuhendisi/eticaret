// Sayfa yolu (kart 0135, karar 0102): ana sayfadan bulunulan sayfaya kadar olan adımlar. Son adım bulunulan
// sayfadır, bağlantı değildir ve ekran okuyucuya "geçerli sayfa" diye okunur. Adlar, ayraç ve gezinme bölgesinin
// adı kullanan sayfadan gelir. Bağlantılar gezinme bölgesinde durduğu için menüdeki gibi alt çizgisizdir, fare
// üstüne gelince çizilir. Satır sıkı durur (32 px), basılan alan 44 × 44 px'tir (kart 0191): bağlantı en az 44 px
// geniştir (kısa ad ortada durur, komşu kısa adların alanları üst üste binmez), yüksekliği dokunma-alani ile 44
// px'e çıkar; yol iki satıra inerse satırların arası alanın taşması kadardır.
// tekSatir (kart 0272): yol hiç alt satıra inmez, son adım sığmazsa üç noktayla biter. Uzun son adımlı sayfada (blog
// yazısı) yolun yüksekliği yazı tipine bağlı olmasın diye: yedek yazı tipinde bir, asıl yazı tipinde iki satır olan yol
// yazı tipi yüklenince sayfayı kaydırıyordu (hız ölçümü). Son adımın tamamı sayfanın başlığındadır.
import Link from "next/link";
import { sinif } from "./sinif.ts";

// Adresi olmayan adım bağlantı değildir (kart 0301): panelde menünün grubu, kendi sayfası yoktur.
export type SayfaYoluAdimi = { ad: string; adres?: string };

export function SayfaYolu({
  adimlar,
  etiket,
  ayrac,
  tekSatir = false,
  className,
}: {
  // Bulunulan sayfa dahil, ana sayfadan başlayarak. Sonuncunun adresi bağlantı olarak kullanılmaz; adresi olmayan
  // ara adım düz yazıdır.
  adimlar: readonly SayfaYoluAdimi[];
  // Gezinme bölgesinin adı, örneğin "Sayfa yolu".
  etiket: string;
  // Adımların arasındaki işaret, örneğin "/". Ekran okuyucuya okunmaz.
  ayrac: string;
  tekSatir?: boolean;
  className?: string;
}) {
  return (
    <nav aria-label={etiket} data-slot="sayfa-yolu" className={sinif("min-w-0", className)}>
      <ol
        className={sinif(
          "flex items-center gap-x-1.5 gap-y-3 text-kucuk text-soluk-yazi",
          tekSatir ? "flex-nowrap" : "flex-wrap",
        )}
      >
        {adimlar.map((adim, sira) => {
          const son = sira === adimlar.length - 1;
          return (
            <li
              key={`${sira}-${adim.ad}`}
              className={sinif(
                "flex items-center gap-1.5",
                tekSatir && (son ? "min-w-0" : "shrink-0"),
              )}
            >
              {sira === 0 ? null : (
                <span aria-hidden="true" className="text-soluk-yazi">
                  {ayrac}
                </span>
              )}
              {son ? (
                <span
                  aria-current="page"
                  className={sinif("font-kalin text-yazi", tekSatir && "truncate")}
                >
                  {adim.ad}
                </span>
              ) : adim.adres === undefined ? (
                <span className="inline-flex min-h-8 items-center">{adim.ad}</span>
              ) : (
                <Link
                  href={adim.adres}
                  className="dokunma-alani inline-flex min-h-8 min-w-11 items-center justify-center text-soluk-yazi no-underline hover:text-yazi hover:underline"
                >
                  {adim.ad}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
