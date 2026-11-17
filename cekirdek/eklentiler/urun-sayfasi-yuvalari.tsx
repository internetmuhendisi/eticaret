// Ürün sayfasının eklenti yuvası (kart 0144, karar 0117): eklentilerin ürün sayfasına bağlandığı tek nokta. Yuva
// stok yazısının altındadır; içindeki tarayıcı parçası seçili birimi useSeciliBirim ile okur. Her eklenti
// sunucuda kendi parçasını verir ya da null döner; açıklığını kendisi sorar (eklentiAcikMi).
//
// Yeni eklenti yuvasını bu listeye ekler; ürün sayfası değişmez.
import { Fragment, type ReactNode } from "react";
import type { Site } from "../ayar-semasi/site-klasoru";
import type { EklentiKodu } from "../kayitlar/eklentiler";
import type { Veritabani } from "../veritabani/baglanti";
import { kartlaOdemeTukenmisBirimIster, kartlaOdemeYuvasi } from "./kartla-odeme/urun-sayfasi";
import {
  stokBildirimiTukenmisBirimIster,
  stokBildirimiYuvasi,
} from "./stoga-gelince-haber-ver/urun-sayfasi";

// birimler: ürünün silinmemiş birimleri (basit ürünün tek birimi ya da birleşimler).
export type UrunSayfasiYuvasi = (
  vt: Veritabani,
  site: Site,
  birimler: readonly string[],
) => Promise<ReactNode>;

// tukenmisBirimIster: eklenti tükenmiş birim için iş görüyorsa (stoğa gelince haber ver) ürün sayfasında tükenmiş
// değer seçilebilir olur (kart 0144, kullanıcı kararı).
const yuvalar: readonly {
  kod: EklentiKodu;
  yuva: UrunSayfasiYuvasi;
  tukenmisBirimIster: (site: Site) => boolean;
}[] = [
  {
    kod: "stoga-gelince-haber-ver",
    yuva: stokBildirimiYuvasi,
    tukenmisBirimIster: stokBildirimiTukenmisBirimIster,
  },
  {
    kod: "kartla-odeme",
    yuva: kartlaOdemeYuvasi,
    tukenmisBirimIster: kartlaOdemeTukenmisBirimIster,
  },
];

export const tukenmisBirimSecilebilirMi = (site: Site): boolean =>
  yuvalar.some(({ tukenmisBirimIster }) => tukenmisBirimIster(site));

export async function UrunSayfasiYuvalari({
  vt,
  site,
  birimler,
}: {
  vt: Veritabani;
  site: Site;
  birimler: readonly string[];
}) {
  const parcalar = await Promise.all(
    yuvalar.map(async ({ kod, yuva }) => ({ kod, parca: await yuva(vt, site, birimler) })),
  );
  return (
    <>
      {parcalar.map(({ kod, parca }) => (
        <Fragment key={kod}>{parca}</Fragment>
      ))}
    </>
  );
}
