// Sayfa yolu (kart 0135, karar 0102): ana sayfadan bulunulan sayfaya kadar olan adımlar. Son adım bulunulan
// sayfadır, bağlantı değildir ve ekran okuyucuya "geçerli sayfa" diye okunur. Adlar, ayraç ve gezinme bölgesinin
// adı kullanan sayfadan gelir. Bağlantılar gezinme bölgesinde durduğu için menüdeki gibi alt çizgisizdir, fare
// üstüne gelince çizilir. Satır sıkı durur (32 px), basılan alan 44 × 44 px'tir (kart 0191): bağlantı en az 44 px
// geniştir (kısa ad ortada durur, komşu kısa adların alanları üst üste binmez), yüksekliği dokunma-alani ile 44
// px'e çıkar; yol iki satıra inerse satırların arası alanın taşması kadardır.
import Link from "next/link";
import { sinif } from "./sinif.ts";

export type SayfaYoluAdimi = { ad: string; adres: string };

export function SayfaYolu({
  adimlar,
  etiket,
  ayrac,
  className,
}: {
  // Bulunulan sayfa dahil, ana sayfadan başlayarak. Sonuncunun adresi bağlantı olarak kullanılmaz.
  adimlar: readonly SayfaYoluAdimi[];
  // Gezinme bölgesinin adı, örneğin "Sayfa yolu".
  etiket: string;
  // Adımların arasındaki işaret, örneğin "/". Ekran okuyucuya okunmaz.
  ayrac: string;
  className?: string;
}) {
  return (
    <nav aria-label={etiket} data-slot="sayfa-yolu" className={sinif("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-3 text-kucuk text-soluk-yazi">
        {adimlar.map((adim, sira) => {
          const son = sira === adimlar.length - 1;
          return (
            <li key={adim.adres} className="flex items-center gap-1.5">
              {sira === 0 ? null : (
                <span aria-hidden="true" className="text-soluk-yazi">
                  {ayrac}
                </span>
              )}
              {son ? (
                <span aria-current="page" className="font-kalin text-yazi">
                  {adim.ad}
                </span>
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
