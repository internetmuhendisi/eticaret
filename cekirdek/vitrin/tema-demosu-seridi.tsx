// Tema demosunun şeridi (kart 0116, karar 0127; kullanıcı kararı): vitrinin en üstünde ziyaretçiye bunun bir tema
// demosu olduğunu, alışveriş yapılamadığını söyler ve sitenin temaları arasında geçiş verir. Şerit demoya aittir,
// temanın kendisinde ve gerçek mağazada yoktur. Yalnız tema demosu ayarı açık sitede çizilir (vitrin çerçevesi).
//
// Bağlantı sayfayı baştan yükler (ham <a>): temanın değerleri kök düzendedir, Next.js'in sayfa içi geçişi kök düzeni
// yeniden çizmez. Adres yalnız tema parametresidir (?tema=kod): bulunulan sayfada kalınır, ara katman seçimi çereze
// yazıp parametresiz adrese yönlendirir (cekirdek/uygulama/proxy.ts).
import { sinif } from "../../bilesenler/parcalar/sinif";
import { temaDemosu } from "../kayitlar/tema";
import { metin } from "../metinler/site-metni";
import type { Tema } from "../temalar/temalar";

export const temaninAdi = (tema: Tema): string =>
  "anahtar" in tema.ad ? metin(tema.ad.anahtar) : tema.ad.metin;

export function TemaDemosuSeridi({
  temalar,
  secili,
}: {
  temalar: readonly Tema[];
  secili: string;
}) {
  return (
    <section
      aria-label={metin("vitrin.temaDemosu.seritAdi")}
      className="odak-yazi-renginde bg-alt-kisim text-kucuk text-alt-kisim-ustu"
    >
      <div className="mx-auto flex w-full max-w-icerik flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-1 tablet:px-6">
        <p className="py-2">{metin("vitrin.temaDemosu.aciklama")}</p>
        <nav aria-label={metin("vitrin.temaDemosu.temalar")}>
          <ul className="m-0 flex list-none flex-wrap items-center gap-x-2 p-0">
            {temalar.map((tema) => {
              const seciliMi = tema.kod === secili;
              return (
                <li key={tema.kod}>
                  <a
                    href={`?${new URLSearchParams({ [temaDemosu.parametre]: tema.kod })}`}
                    aria-current={seciliMi ? "true" : undefined}
                    className={sinif(
                      "inline-flex min-h-11 items-center px-2 text-alt-kisim-ustu",
                      seciliMi ? "font-en-kalin no-underline" : "underline underline-offset-2",
                    )}
                  >
                    {temaninAdi(tema)}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}
