// Ekibin kullanıcıları (kart 0274; taslak: "Ekip"): kısa bir listedir, liste motoruna girmez. Her satırda ad (davetle
// gelen yöneticide, kart 0275; yoksa e-posta) ayrıntıya bağlantı, rolleri, e-postası ve son girişi; oturumdaki
// yöneticinin satırı "Siz" ile işaretlidir. Bekleyen davetler aynı listede, sonda: e-posta, roller, "Davet bekliyor",
// son geçerli an ve (izni olana) "Daveti geri al". Sunucuda çizilir.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { ekipKisiAdresi } from "../adresler";
import { DavetiGeriAl } from "./davet";
import type { DavetSatiri, EkipSatiri } from "./veri";

export const rolAdi = (kod: string): string => metin(`yonetim.rol.${kod}` as MetinAnahtari);

const satirSiniflari =
  "flex min-w-0 flex-col border-b border-kenar px-3 py-1 last:border-b-0 tablet:px-4";

const Roller = ({ roller }: { roller: string[] }) =>
  roller.map((kod) => (
    <Rozet key={kod} tur="ikincil">
      {rolAdi(kod)}
    </Rozet>
  ));

export function EkipListesi({
  satirlar,
  davetler,
  davetGeriAlinir,
}: {
  satirlar: EkipSatiri[];
  davetler: DavetSatiri[];
  davetGeriAlinir: boolean;
}) {
  return (
    <ul
      aria-label={metin("yonetim.ekip.liste")}
      className="m-0 flex list-none flex-col rounded-orta border border-kenar bg-zemin p-0"
    >
      {satirlar.map((satir) => (
        <li key={satir.kimlik} className={satirSiniflari}>
          <span className="flex flex-wrap items-center gap-2">
            <Baglanti href={ekipKisiAdresi(satir.kimlik)} className="font-kalin wrap-anywhere">
              {satir.ad ?? satir.eposta}
            </Baglanti>
            {satir.kendi ? <Rozet tur="cerceveli">{metin("yonetim.ekip.sen")}</Rozet> : null}
            <Roller roller={satir.roller} />
          </span>
          <span className="-mt-2 pb-1 text-kucuk text-soluk-yazi wrap-anywhere">
            {satir.ad === null
              ? satir.sonGiris === null
                ? metin("yonetim.ekip.hicGirmedi")
                : doldur(metin("yonetim.ekip.sonGiris"), { zaman: satir.sonGiris })
              : satir.sonGiris === null
                ? doldur(metin("yonetim.ekip.epostaHicGirmedi"), { eposta: satir.eposta })
                : doldur(metin("yonetim.ekip.epostaSonGiris"), {
                    eposta: satir.eposta,
                    zaman: satir.sonGiris,
                  })}
          </span>
        </li>
      ))}
      {davetler.map((davet) => (
        <li
          key={davet.kimlik}
          className={`${satirSiniflari} gap-1 py-3 tablet:flex-row tablet:items-center tablet:justify-between`}
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-kalin wrap-anywhere">{davet.eposta}</span>
              <Roller roller={davet.roller} />
              <Rozet tur="uyari">{metin("yonetim.ekip.davet.bekliyor")}</Rozet>
            </span>
            <span className="text-kucuk text-soluk-yazi">
              {doldur(metin("yonetim.ekip.davet.gecerlilik"), { tarih: davet.gecerlilik })}
            </span>
          </span>
          {davetGeriAlinir ? (
            <span className="shrink-0 self-start tablet:self-center">
              <DavetiGeriAl kimlik={davet.kimlik} eposta={davet.eposta} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
