"use client";
// Blog ekranının listesi (kart 0272, karar 0176; taslak: "Blog" listesi). Tanımı liste-tanimi.ts: arama (başlık), durum
// sekmesi, kategori süzgeci, sıralama (yayın sütunu başlıktan da) ve sayfa. Satırda kapak, başlık ve adresi, vitrindeki
// durum ve yayın zamanı, kategori. Masaüstünde tablo, telefonda her yazı bir kart. Başlık yazının ekranına gider.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import type { BlogPanelSiralamasi, BlogYaziDurumu } from "../../kayitlar/blog";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { kayitAdresleri } from "../../vitrin/adresler";
import { blogYazisiEkraniAdresi, yeniBlogYazisiAdresi } from "../adresler";
import { KatalogGorseli } from "../katalog-gorseli";
import { Liste, type SutunTanimi } from "../liste/liste";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import type { KayitSecenegi } from "../urunler/veri";
import { blogListesiTanimi } from "./liste-tanimi";
import type { BlogSatiri } from "./veri";

// Durumun rozeti: renk ve yazı birlikte (yalnız renkle verilmez). Ürünün yayın durumlarıyla aynı renkler.
const durumRozetleri = {
  yayinda: "basari",
  zamanlanmis: "birincil",
  taslak: "ikincil",
} as const satisfies Record<BlogYaziDurumu, "basari" | "birincil" | "ikincil">;

const siralamalar: Record<BlogPanelSiralamasi, MetinAnahtari> = {
  "yayin-azalan": "yonetim.blog.siralama.yayin-azalan",
  "yayin-artan": "yonetim.blog.siralama.yayin-artan",
  "baslik-artan": "yonetim.blog.siralama.baslik-artan",
};

function Baslik({ satir }: { satir: BlogSatiri }) {
  return (
    <span className="flex min-w-0 flex-col break-words">
      <Baglanti
        href={blogYazisiEkraniAdresi(satir.kimlik)}
        className="min-h-11 self-start font-kalin"
      >
        {satir.baslik}
      </Baglanti>
      <span className="text-kucuk text-soluk-yazi">
        {kayitAdresleri["blog-yazisi"](satir.adresAdi)}
      </span>
    </span>
  );
}

function Durum({ satir }: { satir: BlogSatiri }) {
  const metin = usePanelMetni();
  return (
    <Rozet tur={durumRozetleri[satir.durum]}>{metin(`yonetim.blog.durum.${satir.durum}`)}</Rozet>
  );
}

export function BlogListesi({
  durum,
  veri,
  kayitSecenekleri,
  ekleyebilir,
}: {
  durum: ListeDurumu;
  veri: ListeVerisi<BlogSatiri> | null;
  kayitSecenekleri: Record<string, KayitSecenegi[]>;
  // Yöneticinin icerik.degistir izni (sunucudan): boş listede "Yazı ekle".
  ekleyebilir: boolean;
}) {
  const metin = usePanelMetni();
  const yayin = (satir: BlogSatiri) =>
    satir.yayinZamani ?? <span className="text-soluk-yazi">{metin("yonetim.blog.yayinYok")}</span>;
  const sutunlar: SutunTanimi<BlogSatiri>[] = [
    {
      kod: "yazi",
      baslik: metin("yonetim.blog.sutun.yazi"),
      hucre: (satir) => (
        <span className="flex min-w-0 items-center gap-3">
          <KatalogGorseli gorsel={satir.kapak} />
          <Baslik satir={satir} />
        </span>
      ),
    },
    {
      kod: "durum",
      baslik: metin("yonetim.blog.sutun.durum"),
      hucre: (satir) => <Durum satir={satir} />,
    },
    {
      kod: "kategori",
      baslik: metin("yonetim.blog.sutun.kategori"),
      hucre: (satir) =>
        satir.kategori ?? (
          <span className="text-soluk-yazi">{metin("yonetim.blog.kategorisiz")}</span>
        ),
    },
    { kod: "yayin", baslik: metin("yonetim.blog.sutun.yayin"), hucre: yayin },
  ];
  return (
    <Liste
      tanim={blogListesiTanimi}
      durum={durum}
      veri={veri}
      ad={metin("yonetim.blog.liste")}
      sutunlar={sutunlar}
      telefon={(satir) => (
        <span className="flex min-w-0 gap-3">
          <KatalogGorseli gorsel={satir.kapak} />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex flex-wrap items-start justify-between gap-2">
              <Baslik satir={satir} />
              <Durum satir={satir} />
            </span>
            <span className="text-kucuk">{yayin(satir)}</span>
          </span>
        </span>
      )}
      anahtar={(satir) => satir.kimlik}
      satirAdi={(satir) => satir.baslik}
      suzgecAdlari={{
        durum: {
          ad: metin("yonetim.blog.suzgec.durum"),
          secenek: (deger) => metin(`yonetim.blog.durum.${deger as BlogYaziDurumu}`),
        },
        kategori: { ad: metin("yonetim.blog.suzgec.kategori"), secenek: (deger) => deger },
      }}
      kayitSecenekleri={kayitSecenekleri}
      siralamaAdi={(kod) => metin(siralamalar[kod as BlogPanelSiralamasi])}
      arama={{ etiket: metin("yonetim.blog.ara"), yerTutucu: metin("yonetim.blog.araYer") }}
      bos={{
        ikon: "yazi",
        baslik: metin("yonetim.blog.bos.baslik"),
        aciklama: metin("yonetim.blog.bos.metin"),
        ...(ekleyebilir
          ? {
              eylem: (
                <Baglanti href={yeniBlogYazisiAdresi} gorunum="birincil">
                  {metin("yonetim.eylem.yaziEkle")}
                </Baglanti>
              ),
            }
          : {}),
      }}
      topluIslemler={[]}
    />
  );
}
