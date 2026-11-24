// Rollerin izin tablosu (kart 0274; taslak: "Roller", yalnız okunur). Her yönetici izni okunur adıyla bir satırdır,
// modülüne göre gruplu; sütunlar hazır rollerdir. "Var" ve "Yok" yalnız işaretle değil yazıyla da okunur. Tablo kendi
// kabında yana kayar (telefonda), kap klavyeyle kaydırılabilsin diye odak alır. Kap konumlu (relative): hücrelerdeki
// ekran okuyucu yazıları (sr-only, mutlak konumlu) kabın içinde kırpılır, sayfayı yana kaydırmaz.
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { rolAdi } from "./liste";
import type { IzinTablosu } from "./veri";

export function RollerTablosu({ tablo }: { tablo: IzinTablosu }) {
  return (
    <section
      aria-label={metin("yonetim.ekip.rolTablosu")}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: kayan tablonun kabı klavyeyle kaydırılır (WCAG 2.1.1).
      tabIndex={0}
      className="relative min-w-0 overflow-x-auto rounded-orta border border-kenar bg-zemin"
    >
      <Tablo className="min-w-full">
        <TabloBasligi className="sr-only">{metin("yonetim.ekip.rolTablosu")}</TabloBasligi>
        <TabloUstu>
          <TabloSatiri>
            <TabloBasHucresi scope="col" className="p-3 text-left">
              {metin("yonetim.ekip.izin")}
            </TabloBasHucresi>
            {tablo.roller.map((rol) => (
              <TabloBasHucresi key={rol.kod} scope="col" className="p-3 text-center">
                {rolAdi(rol.kod)}
                <span className="block text-kucuk font-normal text-soluk-yazi">
                  {metin(`yonetim.rolAciklamasi.${rol.kod}` as MetinAnahtari)}
                </span>
              </TabloBasHucresi>
            ))}
          </TabloSatiri>
        </TabloUstu>
        {tablo.gruplar.map((grup) => (
          <TabloGovdesi key={grup.modul}>
            <TabloSatiri>
              <TabloBasHucresi
                scope="colgroup"
                colSpan={tablo.roller.length + 1}
                className="bg-yuzey p-3 text-left text-kucuk"
              >
                {metin(`yonetim.izinGrubu.${grup.modul}` as MetinAnahtari)}
              </TabloBasHucresi>
            </TabloSatiri>
            {grup.izinler.map((satir) => (
              <TabloSatiri key={satir.izin}>
                <TabloBasHucresi scope="row" className="p-3 text-left font-normal">
                  {metin(`yonetim.izin.${satir.izin}` as MetinAnahtari)}
                </TabloBasHucresi>
                {satir.roller.map((var_, sira) => (
                  <TabloHucresi key={tablo.roller[sira]?.kod ?? sira} className="p-3 text-center">
                    {var_ ? (
                      <span className="inline-flex items-center text-basari-yazi">
                        <Ikon ad="onay" />
                        <span className="sr-only">{metin("yonetim.ekip.var")}</span>
                      </span>
                    ) : (
                      <span className="text-soluk-yazi">
                        <span aria-hidden="true">{metin("yonetim.ekip.yokIsareti")}</span>
                        <span className="sr-only">{metin("yonetim.ekip.yok")}</span>
                      </span>
                    )}
                  </TabloHucresi>
                ))}
              </TabloSatiri>
            ))}
          </TabloGovdesi>
        ))}
      </Tablo>
    </section>
  );
}
