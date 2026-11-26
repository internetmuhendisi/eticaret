"use client";
// Kupon listesi (kart 0313, karar 0188; taslak: planlar/tasarim-yonu/panel-2.html "Kuponlar"). Tanımı liste-tanimi.ts:
// arama (kod ve ad), durum sekmesi, sıralama ve sayfa. Satırda kod (kuponun sayfasına gider) ve adı, indirim ve
// koşulları, geçerlilik, kullanım ve durum. Masaüstünde tablo, telefonda her kupon bir kart.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import type { KuponDurumu, KuponPanelSiralamasi } from "../../kayitlar/kampanya";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { kuponAdresi, yeniKuponAdresi } from "../adresler";
import { Liste, type SutunTanimi } from "../liste/liste";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import { kuponListesiTanimi } from "./liste-tanimi";
import type { KuponSatiri } from "./veri";

// Durumun rozeti: renk ve yazı birlikte (yalnız renkle verilmez).
export const kuponDurumRozetleri = {
  etkin: "basari",
  zamanlanmis: "birincil",
  "suresi-doldu": "ikincil",
  kapali: "ikincil",
} as const satisfies Record<KuponDurumu, "basari" | "birincil" | "ikincil">;

const siralamalar: Record<KuponPanelSiralamasi, MetinAnahtari> = {
  yeni: "yonetim.kupon.siralama.yeni",
  "kod-artan": "yonetim.kupon.siralama.kod-artan",
  "kullanim-azalan": "yonetim.kupon.siralama.kullanim-azalan",
  "bitis-artan": "yonetim.kupon.siralama.bitis-artan",
};

export function KuponDurumRozeti({ durum }: { durum: KuponDurumu }) {
  const metin = usePanelMetni();
  return <Rozet tur={kuponDurumRozetleri[durum]}>{metin(`yonetim.kupon.durum.${durum}`)}</Rozet>;
}

function Kod({ satir }: { satir: KuponSatiri }) {
  return (
    <span className="flex min-w-0 flex-col break-words">
      <Baglanti href={kuponAdresi(satir.kimlik)} className="min-h-11 self-start font-kalin">
        {satir.kod}
      </Baglanti>
      {satir.ad === null ? null : <span className="text-kucuk text-soluk-yazi">{satir.ad}</span>}
    </span>
  );
}

function Indirim({ satir }: { satir: KuponSatiri }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="font-kalin">{satir.indirim}</span>
      {satir.kosullar === null ? null : (
        <span className="text-kucuk text-soluk-yazi">{satir.kosullar}</span>
      )}
    </span>
  );
}

export function KuponListesi({
  durum,
  veri,
  ekleyebilir,
}: {
  durum: ListeDurumu;
  veri: ListeVerisi<KuponSatiri> | null;
  // Yöneticinin kupon.degistir izni (sunucudan): boş listede "Kupon ekle".
  ekleyebilir: boolean;
}) {
  const metin = usePanelMetni();
  const sutunlar: SutunTanimi<KuponSatiri>[] = [
    {
      kod: "kod",
      baslik: metin("yonetim.kupon.sutun.kod"),
      hucre: (satir) => <Kod satir={satir} />,
    },
    {
      kod: "indirim",
      baslik: metin("yonetim.kupon.sutun.indirim"),
      hucre: (satir) => <Indirim satir={satir} />,
    },
    {
      kod: "gecerlilik",
      baslik: metin("yonetim.kupon.sutun.gecerlilik"),
      hucre: (satir) => satir.gecerlilik,
    },
    {
      kod: "kullanim",
      baslik: metin("yonetim.kupon.sutun.kullanim"),
      sag: true,
      hucre: (satir) => satir.kullanim,
    },
    {
      kod: "durum",
      baslik: metin("yonetim.kupon.sutun.durum"),
      hucre: (satir) => <KuponDurumRozeti durum={satir.durum} />,
    },
  ];
  return (
    <Liste
      tanim={kuponListesiTanimi}
      durum={durum}
      veri={veri}
      ad={metin("yonetim.kupon.liste")}
      sutunlar={sutunlar}
      // Telefonda sıkı kart (taslak): kod ve durum, altında indirim ve geçerlilik, sağda kullanım.
      telefon={(satir) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <Kod satir={satir} />
            <KuponDurumRozeti durum={satir.durum} />
          </span>
          <span className="flex flex-wrap items-baseline justify-between gap-2 text-kucuk">
            <span className="text-soluk-yazi">
              {doldur(metin("yonetim.kupon.telefonSatiri"), {
                indirim: satir.indirim,
                gecerlilik: satir.gecerlilik,
              })}
            </span>
            <span>
              {doldur(metin("yonetim.kupon.kullanimSatiri"), { kullanim: satir.kullanim })}
            </span>
          </span>
        </span>
      )}
      anahtar={(satir) => satir.kimlik}
      satirAdi={(satir) => satir.kod}
      suzgecAdlari={{
        durum: {
          ad: metin("yonetim.kupon.suzgec.durum"),
          secenek: (deger) => metin(`yonetim.kupon.durum.${deger as KuponDurumu}`),
        },
      }}
      kayitSecenekleri={{}}
      siralamaAdi={(kod) => metin(siralamalar[kod as KuponPanelSiralamasi])}
      arama={{ etiket: metin("yonetim.kupon.ara"), yerTutucu: metin("yonetim.kupon.araYer") }}
      bos={{
        ikon: "kupon",
        baslik: metin("yonetim.kupon.bos.baslik"),
        aciklama: metin("yonetim.kupon.bos.metin"),
        ...(ekleyebilir
          ? {
              eylem: (
                <Baglanti href={yeniKuponAdresi} gorunum="birincil">
                  {metin("yonetim.eylem.kuponEkle")}
                </Baglanti>
              ),
            }
          : {}),
      }}
      topluIslemler={[]}
    />
  );
}
