// Sekme bağlantıları (kart 0318; ekip ekranı kart 0274'ten taşındı): her sekmesi ayrı bir adrese giden şerit. Sekmeler
// sayfa içi panel değil bağlantıdır (sunucuda çizilir, adres değişir); seçili olan aria-current taşır. Görünüş liste
// motorunun sekme şeridiyle aynıdır. Sekmenin yanındaki sayı isteğe bağlıdır. Metinler kullanandan gelir.
import { Baglanti } from "./baglanti.tsx";
import { Rozet } from "./rozet.tsx";
import { sinif } from "./sinif.ts";

export type SekmeBaglantisi = {
  kod: string;
  ad: string;
  adres: string;
  sayi?: number | undefined;
};

export function SekmeBaglantilari({
  etiket,
  sekmeler,
  secili,
}: {
  // Şeridin ekran okuyucu adı.
  etiket: string;
  sekmeler: readonly SekmeBaglantisi[];
  secili: string;
}) {
  return (
    <nav aria-label={etiket} className="overflow-x-auto border-b border-kenar">
      <ul className="flex gap-1">
        {sekmeler.map((sekme) => (
          <li key={sekme.kod} className="shrink-0">
            <Baglanti
              href={sekme.adres}
              aria-current={secili === sekme.kod ? "page" : undefined}
              className={sinif(
                "min-h-11 gap-2 rounded-none border-b-2 px-3 text-kucuk whitespace-nowrap no-underline",
                secili === sekme.kod
                  ? "border-yazi text-yazi"
                  : "border-transparent text-soluk-yazi",
              )}
            >
              {sekme.ad}
              {sekme.sayi === undefined ? null : <Rozet tur="ikincil">{sekme.sayi}</Rozet>}
            </Baglanti>
          </li>
        ))}
      </ul>
    </nav>
  );
}
