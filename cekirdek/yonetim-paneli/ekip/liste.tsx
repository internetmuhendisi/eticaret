// Ekibin kullanıcıları (kart 0274; taslak: "Ekip"): kısa bir listedir, liste motoruna girmez. Her satırda e-posta
// (ayrıntıya bağlantı), rolleri, son girişi; oturumdaki yöneticinin satırı "Siz" ile işaretlidir. Sunucuda çizilir.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { ekipKisiAdresi } from "../adresler";
import type { EkipSatiri } from "./veri";

export const rolAdi = (kod: string): string => metin(`yonetim.rol.${kod}` as MetinAnahtari);

export function EkipListesi({ satirlar }: { satirlar: EkipSatiri[] }) {
  return (
    <ul
      aria-label={metin("yonetim.ekip.liste")}
      className="m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0"
    >
      {satirlar.map((satir) => (
        <li
          key={satir.kimlik}
          className="flex min-w-0 flex-col gap-1 border-b border-kenar p-3 last:border-b-0 tablet:px-4"
        >
          <span className="flex flex-wrap items-center gap-2">
            <Baglanti href={ekipKisiAdresi(satir.kimlik)} className="font-kalin wrap-anywhere">
              {satir.eposta}
            </Baglanti>
            {satir.kendi ? <Rozet tur="cerceveli">{metin("yonetim.ekip.sen")}</Rozet> : null}
            {satir.roller.map((kod) => (
              <Rozet key={kod} tur="ikincil">
                {rolAdi(kod)}
              </Rozet>
            ))}
          </span>
          <span className="text-kucuk text-soluk-yazi">
            {satir.sonGiris === null
              ? metin("yonetim.ekip.hicGirmedi")
              : doldur(metin("yonetim.ekip.sonGiris"), { zaman: satir.sonGiris })}
          </span>
        </li>
      ))}
    </ul>
  );
}
