"use client";
// Ürünler ekranının listesi (kart 0262, karar 0161; taslak: "Ortak liste: Ürünler"). Tanımı liste-tanimi.ts: arama (ad
// ya da stok kodu), yayın durumu, kategori, stok ve marka süzgeçleri, sıralama (ürün, stok ve fiyat sütunu başlıktan
// da), sayfa ve dört toplu işlem. Satırda ana görsel, ad ve stok kodu (varyantlı üründe birleşim sayısı), yayın
// durumu, kategoriler, stok durumu ve vitrindeki fiyat; sayfası vitrinde açılan üründe "Vitrinde gör". Masaüstünde
// tablo, telefonda her ürün bir kart (.claude/rules/telefon-gorunumu.md). Ürünün adı ürün ekranına gider (kart 0263).
import { useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import {
  AcilirMenu,
  AcilirMenuIcerigi,
  AcilirMenuOgesi,
  AcilirMenuTetikleyici,
} from "../../../bilesenler/parcalar/acilir-menu";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import {
  type UrunDurumu,
  type UrunPanelSiralamasi,
  type UrunPanelStokDurumu,
  type UrunTopluIslemi,
  urunTopluDuzenlemeKodlari,
  urunTopluIslemKodlari,
} from "../../kayitlar/urun";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { kayitAdresleri } from "../../vitrin/adresler";
import { urunEkraniAdresi } from "../adresler";
import { panelEylemleri } from "../eylemler";
import { KatalogGorseli } from "../katalog-gorseli";
import { Liste, type SutunTanimi, type TopluIslemTanimi } from "../liste/liste";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import { useMenudenPencere } from "../menuden-pencere";
import { panelIkonu } from "../panel-ikon";
import { UrunKopyalamaPenceresi } from "./kopyalama";
import { urunListesiTanimi } from "./liste-tanimi";
import { type ParaSimgesi, TopluDuzenlemePenceresi, topluDuzenlemeNedeni } from "./toplu-duzenleme";
import type { KayitSecenegi, UrunSatiri } from "./veri";

// Yayın durumunun rozeti: renk ve yazı birlikte (yalnız renkle verilmez).
const durumRozetleri = {
  yayinda: "basari",
  zamanlanmis: "birincil",
  taslak: "ikincil",
  gizli: "uyari",
  arsiv: "cerceveli",
} as const satisfies Record<UrunDurumu, "basari" | "birincil" | "ikincil" | "uyari" | "cerceveli">;
const durumAdi = (durum: UrunDurumu): MetinAnahtari => `yonetim.urunler.durum.${durum}`;

function DurumRozeti({ satir }: { satir: UrunSatiri }) {
  const metin = usePanelMetni();
  return (
    <span className="flex flex-col items-start gap-1">
      <Rozet tur={durumRozetleri[satir.durum]}>{metin(durumAdi(satir.durum))}</Rozet>
      {satir.yayinZamani === null ? null : (
        <span className="text-kucuk text-soluk-yazi">{satir.yayinZamani}</span>
      )}
    </span>
  );
}

// Stok: tükendi ve az kaldı renkli ve yazılı; takipli üründe toplam adet, varyantlı üründe tükenen birleşim sayısı.
function Stok({ satir }: { satir: UrunSatiri }) {
  const metin = usePanelMetni();
  const { durum, toplam, tukenenBirlesim } = satir.stok;
  if (durum === "tukendi") {
    return (
      <span className="font-kalin text-tehlike-yazi">{metin("yonetim.urunler.stok.tukendi")}</span>
    );
  }
  const adet =
    toplam === null
      ? metin("yonetim.urunler.stok.takipsiz")
      : doldur(metin("yonetim.urunler.stok.adet"), { sayi: String(toplam) });
  return (
    <span className="flex flex-col">
      <span className={durum === "dusuk" ? "font-kalin text-uyari-yazi" : undefined}>
        {durum === "dusuk" ? doldur(metin("yonetim.urunler.stok.az"), { adet }) : adet}
      </span>
      {tukenenBirlesim === 0 ? null : (
        <span className="text-kucuk text-tehlike-yazi">
          {doldur(metin("yonetim.urunler.stok.tukenenBirlesim"), {
            sayi: String(tukenenBirlesim),
          })}
        </span>
      )}
    </span>
  );
}

function Fiyat({ satir }: { satir: UrunSatiri }) {
  const metin = usePanelMetni();
  if (satir.fiyat === null) {
    return <span className="font-normal text-soluk-yazi">{metin("yonetim.urunler.fiyatYok")}</span>;
  }
  return (
    <span className="flex flex-col items-end">
      <span>{satir.fiyat.yazi}</span>
      {satir.fiyat.eski === undefined ? null : (
        <s className="text-kucuk font-normal text-soluk-yazi">{satir.fiyat.eski}</s>
      )}
    </span>
  );
}

// Ad ve altında stok kodu ya da birleşim sayısı.
function Ad({ satir }: { satir: UrunSatiri }) {
  const metin = usePanelMetni();
  return (
    <span className="flex min-w-0 flex-col break-words">
      {/* Ürünün ekranına bağlantı (kart 0263). */}
      <Baglanti href={urunEkraniAdresi(satir.kimlik)} className="min-h-11 self-start font-kalin">
        {satir.ad}
      </Baglanti>
      <span className="text-kucuk text-soluk-yazi">
        {satir.birlesim > 0
          ? doldur(metin("yonetim.urunler.birlesim"), { sayi: String(satir.birlesim) })
          : (satir.stokKodu ?? metin("yonetim.urunler.stokKoduYok"))}
      </span>
    </span>
  );
}

// Satırın sonundaki "Diğer işlemler" menüsü (kart 0320): bugün "Kopyala". Pencere menü kapandıktan sonra açılır.
function SatirMenusu({
  satir,
  kopyala,
}: {
  satir: UrunSatiri;
  kopyala: (satir: UrunSatiri) => void;
}) {
  const metin = usePanelMetni();
  const menudenPencere = useMenudenPencere();
  return (
    <AcilirMenu>
      <AcilirMenuTetikleyici asChild>
        <IkonDugmesi
          ikon={panelIkonu("diger")}
          etiket={doldur(metin("yonetim.urunKopyalama.digerIslemler"), { ad: satir.ad })}
        />
      </AcilirMenuTetikleyici>
      <AcilirMenuIcerigi align="end" onCloseAutoFocus={menudenPencere.kapaninca}>
        <AcilirMenuOgesi onSelect={menudenPencere.sec(() => kopyala(satir))}>
          {metin(panelEylemleri["urun-kopyala"].ad)}
        </AcilirMenuOgesi>
      </AcilirMenuIcerigi>
    </AcilirMenu>
  );
}

function VitrindeGor({ satir }: { satir: UrunSatiri }) {
  const metin = usePanelMetni();
  if (!satir.vitrinde) return null;
  return (
    <Baglanti
      href={kayitAdresleri.urun(satir.adresAdi)}
      target="_blank"
      gorunum="sade"
      aria-label={doldur(metin("yonetim.urunler.vitrindeGorAdi"), { ad: satir.ad })}
      className="px-2 whitespace-nowrap"
    >
      <Ikon ad="yeni-sekme" />
      {metin("yonetim.urunler.vitrindeGor")}
    </Baglanti>
  );
}

const siralamalar: Record<UrunPanelSiralamasi, MetinAnahtari> = {
  "son-degisen": "yonetim.urunler.siralama.son-degisen",
  "ad-artan": "yonetim.urunler.siralama.ad-artan",
  "ad-azalan": "yonetim.urunler.siralama.ad-azalan",
  "stok-artan": "yonetim.urunler.siralama.stok-artan",
  "stok-azalan": "yonetim.urunler.siralama.stok-azalan",
  "fiyat-artan": "yonetim.urunler.siralama.fiyat-artan",
  "fiyat-azalan": "yonetim.urunler.siralama.fiyat-azalan",
};

// Toplu işlemin nedeni: servisin bilinen kodları, gerisi genel metin.
const nedenler: Record<string, MetinAnahtari> = {
  bulunamadi: "yonetim.urunler.toplu.neden.bulunamadi",
};

const islemAdlari: Record<UrunTopluIslemi, MetinAnahtari> = {
  yayinla: "yonetim.urunler.toplu.yayinla.ad",
  "taslaga-al": "yonetim.urunler.toplu.taslaga-al.ad",
  "arsive-al": "yonetim.urunler.toplu.arsive-al.ad",
  sil: "yonetim.urunler.toplu.sil.ad",
};

export function UrunListesi({
  durum,
  veri,
  kayitSecenekleri,
  topluIslemler,
  para,
  kopyalayabilir,
  fiyatIzni,
}: {
  durum: ListeDurumu;
  veri: ListeVerisi<UrunSatiri> | null;
  kayitSecenekleri: Record<string, KayitSecenegi[]>;
  // Yöneticinin izni olan toplu işlemlerin kodları (sunucu süzer).
  topluIslemler: readonly string[];
  // Toplu fiyat değişikliğinin tutar alanının simgesi, sitenin biçimiyle (sunucu verir).
  para: ParaSimgesi;
  // Ürün ekleme izni (urun.degistir): satırın "Kopyala"sı (kart 0320); fiyat izni yoksa kopya fiyatsızdır.
  kopyalayabilir: boolean;
  fiyatIzni: boolean;
}) {
  const metin = usePanelMetni();
  const [kopyalanacak, setKopyalanacak] = useState<{ kimlik: string; ad: string } | null>(null);
  const kopyala = (satir: UrunSatiri) => setKopyalanacak({ kimlik: satir.kimlik, ad: satir.ad });
  const sutunlar: SutunTanimi<UrunSatiri>[] = [
    {
      kod: "urun",
      baslik: metin("yonetim.urunler.sutun.urun"),
      hucre: (satir) => (
        <span className="flex min-w-0 items-center gap-3">
          <KatalogGorseli gorsel={satir.gorsel} />
          <Ad satir={satir} />
        </span>
      ),
    },
    {
      kod: "durum",
      baslik: metin("yonetim.urunler.sutun.durum"),
      hucre: (satir) => <DurumRozeti satir={satir} />,
    },
    {
      kod: "kategori",
      baslik: metin("yonetim.urunler.sutun.kategori"),
      hucre: (satir) =>
        satir.kategoriler.length === 0 ? (
          <span className="text-soluk-yazi">{metin("yonetim.urunler.kategoriYok")}</span>
        ) : (
          satir.kategoriler.join(metin("yonetim.urunler.ayrac"))
        ),
    },
    {
      kod: "stok",
      baslik: metin("yonetim.urunler.sutun.stok"),
      hucre: (satir) => <Stok satir={satir} />,
    },
    {
      kod: "fiyat",
      baslik: metin("yonetim.urunler.sutun.fiyat"),
      sag: true,
      hucre: (satir) => <Fiyat satir={satir} />,
    },
    {
      kod: "vitrin",
      baslik: metin("yonetim.urunler.sutun.vitrin"),
      hucre: (satir) => <VitrindeGor satir={satir} />,
    },
    ...(kopyalayabilir
      ? [
          {
            kod: "islemler",
            baslik: metin("yonetim.urunKopyalama.islemler"),
            hucre: (satir: UrunSatiri) => <SatirMenusu satir={satir} kopyala={kopyala} />,
          },
        ]
      : []),
  ];
  // Toplu düzenlemeler (kart 0314): her biri kendi penceresini açar, önizler ve uygular.
  const duzenlemeler: TopluIslemTanimi<UrunSatiri>[] = urunTopluDuzenlemeKodlari
    .filter((kod) => topluIslemler.includes(kod))
    .map((kod) => ({
      tur: "pencere",
      kod,
      ad: metin(`yonetim.urunler.topluDuzenleme.${kod}.ad`),
      pencere: ({ satirlar, kapat, bitti }) => (
        <TopluDuzenlemePenceresi
          tur={kod}
          urunler={satirlar.map((satir) => ({ kimlik: satir.kimlik, ad: satir.ad }))}
          para={para}
          kapat={kapat}
          bitti={bitti}
        />
      ),
      basari: (sayi) =>
        doldur(metin(`yonetim.urunler.topluDuzenleme.${kod}.basari`), { sayi: String(sayi) }),
      neden: (neden) => metin(topluDuzenlemeNedeni(neden)),
    }));
  const durumIslemleri: TopluIslemTanimi<UrunSatiri>[] = urunTopluIslemKodlari
    .filter((kod) => topluIslemler.includes(kod))
    .map((kod) => ({
      kod,
      ad: metin(islemAdlari[kod]),
      onay: (sayi) => ({
        baslik: doldur(metin(`yonetim.urunler.toplu.${kod}.baslik`), { sayi: String(sayi) }),
        aciklama: metin(`yonetim.urunler.toplu.${kod}.aciklama`),
        onayEtiketi: metin(islemAdlari[kod]),
      }),
      uc: "urunler-toplu",
      govde: (satirlar) => ({ islem: kod, urunler: satirlar.map((satir) => satir.kimlik) }),
      basari: (sayi) =>
        doldur(metin(`yonetim.urunler.toplu.${kod}.basari`), { sayi: String(sayi) }),
      neden: (neden) => metin(nedenler[neden] ?? "yonetim.urunler.toplu.neden.genel"),
    }));
  return (
    <>
      <Liste
        tanim={urunListesiTanimi}
        durum={durum}
        veri={veri}
        ad={metin("yonetim.urunler.liste")}
        sutunlar={sutunlar}
        telefon={(satir) => (
          <span className="flex min-w-0 gap-3">
            <KatalogGorseli gorsel={satir.gorsel} />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex flex-wrap items-start justify-between gap-2">
                <Ad satir={satir} />
                <DurumRozeti satir={satir} />
              </span>
              <span className="flex flex-wrap items-end justify-between gap-2 text-kucuk">
                <Stok satir={satir} />
                <span className="font-kalin">
                  <Fiyat satir={satir} />
                </span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <VitrindeGor satir={satir} />
                {kopyalayabilir ? <SatirMenusu satir={satir} kopyala={kopyala} /> : null}
              </span>
            </span>
          </span>
        )}
        anahtar={(satir) => satir.kimlik}
        satirAdi={(satir) => satir.ad}
        suzgecAdlari={{
          durum: {
            ad: metin("yonetim.urunler.suzgec.durum"),
            secenek: (deger) => metin(durumAdi(deger as UrunDurumu)),
          },
          kategori: { ad: metin("yonetim.urunler.suzgec.kategori"), secenek: (deger) => deger },
          stok: {
            ad: metin("yonetim.urunler.suzgec.stok"),
            secenek: (deger) =>
              metin(`yonetim.urunler.stokSuzgeci.${deger as UrunPanelStokDurumu}`),
          },
          marka: { ad: metin("yonetim.urunler.suzgec.marka"), secenek: (deger) => deger },
        }}
        kayitSecenekleri={kayitSecenekleri}
        siralamaAdi={(kod) => metin(siralamalar[kod as UrunPanelSiralamasi])}
        arama={{ etiket: metin("yonetim.urunler.ara"), yerTutucu: metin("yonetim.urunler.araYer") }}
        bos={{
          ikon: "urunler",
          baslik: metin("yonetim.urunler.bos.baslik"),
          aciklama: metin("yonetim.urunler.bos.metin"),
        }}
        topluIslemler={[...duzenlemeler, ...durumIslemleri]}
      />
      <UrunKopyalamaPenceresi
        urun={kopyalanacak}
        kapat={() => setKopyalanacak(null)}
        fiyatIzni={fiyatIzni}
      />
    </>
  );
}
