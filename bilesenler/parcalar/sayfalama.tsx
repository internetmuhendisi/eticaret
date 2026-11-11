// Sayfa geçişi (kart 0135, karar 0102). Sitenin "sayfa geçişi" ayarının iki değeri iki parçadır:
// - Sayfalama: numaralı sayfalar. İlk ve son sayfa ile bulunulan sayfanın iki yanı her zaman görünür, aradaki
//   boşluk üç noktayla gösterilir. Bulunulan sayfa ekran okuyucuya "geçerli sayfa" diye okunur.
// - DahaFazla: kaç ürünün görüldüğünü söyleyen yazı ve sonraki sayfanın bağlantısı.
// İkisi de bağlantıdır, kod yüklenmeden de çalışır; sayfa adreste durur. Adresleri ve metinleri kullanan sayfa
// verir. Tek sayfalık listede hiçbiri çizilmez.
// Sayfa bağlantıları ön yüklenmez (kart 0137): sayfalar arama ve filtre sonuçlarıdır, ön yükleme her sayfayı
// veritabanında hesaplatır ve aramanın istek sınırını tüketir.
import Link from "next/link";
import { Ikon } from "../ikonlar/ikon.tsx";
import { Baglanti } from "./baglanti.tsx";
import { sinif } from "./sinif.ts";

// Gösterilecek sayfa numaraları; "bosluk" üç noktadır. Sayfalar 1'den başlar.
export const sayfaNumaralari = (sayfa: number, toplam: number): (number | "bosluk")[] => {
  const gorunen = new Set([1, toplam, sayfa - 1, sayfa, sayfa + 1]);
  const sonuc: (number | "bosluk")[] = [];
  for (let numara = 1; numara <= toplam; numara += 1) {
    if (gorunen.has(numara)) sonuc.push(numara);
    else if (sonuc.at(-1) !== "bosluk") sonuc.push("bosluk");
  }
  // Tek sayfalık boşluk üç nokta yerine numarasıyla yazılır: üç nokta yer kazandırmaz.
  return sonuc.map((oge, sira) =>
    oge === "bosluk" && sonuc[sira - 1] === (sonuc[sira + 1] as number) - 2
      ? (sonuc[sira - 1] as number) + 1
      : oge,
  );
};

const kutu =
  "inline-flex size-11 items-center justify-center rounded-dugme border border-kenar bg-zemin font-kalin text-yazi no-underline";

export type SayfalamaMetinleri = {
  // Gezinme bölgesinin adı, örneğin "Sayfalar".
  etiket: string;
  onceki: string;
  sonraki: string;
  // Sayfa bağlantısının ekran okuyucudaki adı, örneğin "3. sayfa".
  sayfaAdi: (sayfa: number) => string;
  // Atlanan sayfaların yerindeki işaret, örneğin "…". Ekran okuyucuya okunmaz.
  bosluk: string;
};

export function Sayfalama({
  sayfa,
  toplamSayfa,
  adres,
  metinler,
  className,
}: {
  sayfa: number;
  toplamSayfa: number;
  adres: (sayfa: number) => string;
  metinler: SayfalamaMetinleri;
  className?: string;
}) {
  // Çağıranın verdiği sayfa sınırların dışındaysa ya da tam sayı değilse en yakın geçerli sayfa kullanılır:
  // gezinme her durumda geçerli sayfayı işaretler ve geri dönülecek bağlantıyı gösterir.
  const toplam = Math.max(0, Math.floor(toplamSayfa));
  if (toplam <= 1) return null;
  const gecerli = Math.min(toplam, Math.max(1, Math.floor(sayfa)));
  const yon = (hedef: number, ad: string, ikon: "onceki" | "sonraki") =>
    hedef < 1 || hedef > toplam ? (
      // Gidilemeyen yön yalnız görünüşte soluk bir işarettir: bağlantı değildir, odak almaz, ekran okuyucuya
      // okunmaz (ilk sayfada "önceki sayfa" bir şey söylemez).
      <span aria-hidden="true" data-pasif="" className={sinif(kutu, "text-soluk-yazi")}>
        <Ikon ad={ikon} />
      </span>
    ) : (
      <Link
        href={adres(hedef)}
        prefetch={false}
        className={sinif(kutu, "hover:bg-yuzey")}
        aria-label={ad}
      >
        <Ikon ad={ikon} />
      </Link>
    );
  return (
    <nav aria-label={metinler.etiket} data-slot="sayfalama" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>{yon(gecerli - 1, metinler.onceki, "onceki")}</li>
        {sayfaNumaralari(gecerli, toplam).map((oge, sira) =>
          oge === "bosluk" ? (
            <li
              // Boşluk en çok iki kez geçer; sırası anahtardır.
              key={`bosluk-${sira}`}
              aria-hidden="true"
              className="inline-flex size-11 items-center justify-center text-soluk-yazi"
            >
              {metinler.bosluk}
            </li>
          ) : (
            <li key={oge}>
              <Link
                href={adres(oge)}
                prefetch={false}
                aria-label={metinler.sayfaAdi(oge)}
                aria-current={oge === gecerli ? "page" : undefined}
                className={sinif(
                  kutu,
                  oge === gecerli ? "border-yazi bg-yazi text-zemin" : "hover:bg-yuzey",
                )}
              >
                {oge}
              </Link>
            </li>
          ),
        )}
        <li>{yon(gecerli + 1, metinler.sonraki, "sonraki")}</li>
      </ul>
    </nav>
  );
}

export function DahaFazla({
  durum,
  adres,
  dugmeYazisi,
  className,
}: {
  // Görülen ve toplam ürün sayısını söyleyen yazı, örneğin "24 ürünün 8'ini gördünüz".
  durum: string;
  // Sonraki sayfanın adresi; son sayfadaysa verilmez, düğme çizilmez.
  adres: string | undefined;
  dugmeYazisi: string;
  className?: string;
}) {
  return (
    <div data-slot="daha-fazla" className={sinif("flex flex-col items-center gap-3", className)}>
      <p className="text-soluk-yazi">{durum}</p>
      {adres === undefined ? null : (
        <Baglanti href={adres} prefetch={false} gorunum="cerceveli">
          {dugmeYazisi}
        </Baglanti>
      )}
    </div>
  );
}
