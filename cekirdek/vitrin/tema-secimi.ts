// Vitrinin teması (kart 0116, karar 0127). Vitrin temayı yalnız buradan okur: sitenin kayıtlı teması, tema
// demosunda (site ayarı temaDemosu) ziyaretçinin seçtiği tema. Panel her zaman sitenin kayıtlı temasını okur
// (siteninGecerliTemasi).
//
// Demoda seçilen tema çerezdedir (ara katman adresteki ?tema= değerini yazar, cekirdek/uygulama/proxy.ts). Tema
// sitenin kullanabileceği temalardan değilse yok sayılır: siteye özel tema yalnız kendi sitesinde listededir. Demo
// temayı mağaza sahibinin ayarları olmadan, kendi değerleriyle gösterir; yalnız koyu tema sitenin başlangıç
// ayarındandır.
import { cookies } from "next/headers";
import type { Site } from "../ayar-semasi/site-klasoru";
import { temaDemosu } from "../kayitlar/tema";
import { temaServisi } from "../moduller/tema/servis";
import { type TemaAyarlari, temaAyarlariSemasi } from "../temalar/ayarlar";
import type { Tema } from "../temalar/temalar";
import type { Veritabani } from "../veritabani/baglanti";

// Demoda ziyaretçinin seçtiği tema; seçilmemişse ya da geçersizse undefined. Çerez yalnız istek sırasında
// okunabilir: istek dışında (testler, arka plan) seçim yoktur.
export const demodaSecilenTema = async (site: Site): Promise<Tema | undefined> => {
  if (!site.ayarlar.temaDemosu) return undefined;
  let kod: string | undefined;
  try {
    kod = (await cookies()).get(temaDemosu.cerez)?.value;
  } catch {
    return undefined;
  }
  return site.temalar.find((tema) => tema.kod === kod);
};

export const vitrinTemasi = async (
  vt: Veritabani,
  site: Site,
): Promise<{ tema: Tema; ayarlar: TemaAyarlari }> => {
  const secilen = await demodaSecilenTema(site);
  if (secilen === undefined) return temaServisi(() => site).gecerliTema(vt);
  return {
    tema: secilen,
    ayarlar: temaAyarlariSemasi.parse({ koyuTema: site.temaBaslangici.ayarlar.koyuTema }),
  };
};
