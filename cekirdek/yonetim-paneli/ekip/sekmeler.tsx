// Ekip ekranının sekmeleri (kart 0274; taslak: Kullanıcılar ve Roller, sayılarıyla). Sunucuda çizilir; sekmeler iki
// ayrı sayfadır, seçili olan aria-current taşır. Görünüş liste motorunun sekme şeridiyle aynıdır.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { metin } from "../../metinler/site-metni";
import { ekipAdresi, ekipRolleriAdresi } from "../adresler";

export function EkipSekmeleri({
  secili,
  kullaniciSayisi,
  rolSayisi,
}: {
  secili: "kullanicilar" | "roller";
  kullaniciSayisi: number;
  rolSayisi: number;
}) {
  const sekmeler = [
    { kod: "kullanicilar", adres: ekipAdresi, sayi: kullaniciSayisi },
    { kod: "roller", adres: ekipRolleriAdresi, sayi: rolSayisi },
  ] as const;
  return (
    <nav
      aria-label={metin("yonetim.ekip.sekmeler")}
      className="overflow-x-auto border-b border-kenar"
    >
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
              {metin(`yonetim.ekip.${sekme.kod}`)}
              <Rozet tur="ikincil">{sekme.sayi}</Rozet>
            </Baglanti>
          </li>
        ))}
      </ul>
    </nav>
  );
}
