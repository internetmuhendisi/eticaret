"use client";
// Müşteriler ekranının listesi (kart 0271, karar 0173; taslak planlar/tasarim-yonu/panel.html "Müşteriler"). Tanımı
// liste-tanimi.ts: kayıt tarihi, kampanya izni ve sipariş süzgeçleri, ad ya da e-postada arama (adrese yazılmaz),
// sıralama ve sayfa; toplu işlem yok. Satırda ad (yoksa e-posta) ayrıntıya gider, altında e-posta.
// Masaüstünde tablo, telefonda her müşteri bir kart (.claude/rules/telefon-gorunumu.md).
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import type { MusteriListesiSiralamasi } from "../../kayitlar/musteri-paneli";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { musteriAyrintisiAdresi } from "../adresler";
import { Liste, type SutunTanimi } from "../liste/liste";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import { musteriListesiTanimi } from "./liste-tanimi";
import type { MusteriSatiri } from "./veri";

function Ad({ satir }: { satir: MusteriSatiri }) {
  const metin = usePanelMetni();
  const gorunen = satir.ad === "" ? satir.eposta : satir.ad;
  return (
    <span className="flex min-w-0 flex-col">
      <Baglanti
        href={musteriAyrintisiAdresi(satir.kimlik)}
        aria-label={doldur(metin("yonetim.musteriler.ayrintiAdi"), { ad: gorunen })}
        className="w-fit wrap-anywhere"
      >
        {gorunen}
      </Baglanti>
      {satir.ad === "" ? null : (
        <span className="text-kucuk text-soluk-yazi wrap-anywhere">{satir.eposta}</span>
      )}
    </span>
  );
}

function KampanyaIzni({ satir }: { satir: MusteriSatiri }) {
  const metin = usePanelMetni();
  return satir.kampanyaIzni ? (
    <Rozet tur="basari">{metin("yonetim.musteriler.kampanya.var")}</Rozet>
  ) : (
    <span className="text-soluk-yazi">{metin("yonetim.musteriler.kampanya.yok")}</span>
  );
}

const siralamalar: Record<MusteriListesiSiralamasi, MetinAnahtari> = {
  "en-yeni": "yonetim.musteriler.siralama.en-yeni",
  "en-eski": "yonetim.musteriler.siralama.en-eski",
  "siparis-azalan": "yonetim.musteriler.siralama.siparis-azalan",
  "siparis-artan": "yonetim.musteriler.siralama.siparis-artan",
  "toplam-azalan": "yonetim.musteriler.siralama.toplam-azalan",
  "toplam-artan": "yonetim.musteriler.siralama.toplam-artan",
};

const secenekAdlari: Record<string, Record<string, MetinAnahtari>> = {
  kampanya: {
    var: "yonetim.musteriler.kampanya.var",
    yok: "yonetim.musteriler.kampanya.yok",
  },
  siparis: {
    var: "yonetim.musteriler.siparisSecenegi.var",
    yok: "yonetim.musteriler.siparisSecenegi.yok",
  },
};

export function MusteriListesi({
  durum,
  veri,
  gunYazilari,
}: {
  durum: ListeDurumu;
  veri: ListeVerisi<MusteriSatiri> | null;
  // Kayıt tarihi süzgecindeki günlerin yazılışı (sunucu verir).
  gunYazilari: Record<string, string>;
}) {
  const metin = usePanelMetni();
  const secenek = (suzgec: string) => (deger: string) => {
    const anahtar = secenekAdlari[suzgec]?.[deger];
    return anahtar === undefined ? deger : metin(anahtar);
  };
  const sutunlar: SutunTanimi<MusteriSatiri>[] = [
    {
      kod: "musteri",
      baslik: metin("yonetim.musteriler.sutun.musteri"),
      hucre: (satir) => <Ad satir={satir} />,
    },
    {
      kod: "kayit",
      baslik: metin("yonetim.musteriler.sutun.kayit"),
      hucre: (satir) => satir.kayit,
    },
    {
      kod: "siparis",
      baslik: metin("yonetim.musteriler.sutun.siparis"),
      sag: true,
      hucre: (satir) => String(satir.siparisSayisi),
    },
    {
      kod: "toplam",
      baslik: metin("yonetim.musteriler.sutun.toplam"),
      sag: true,
      hucre: (satir) => satir.toplam,
    },
    {
      kod: "kampanya",
      baslik: metin("yonetim.musteriler.sutun.kampanya"),
      hucre: (satir) => <KampanyaIzni satir={satir} />,
    },
  ];
  return (
    <Liste
      tanim={musteriListesiTanimi}
      durum={durum}
      veri={veri}
      ad={metin("yonetim.musteriler.liste")}
      sutunlar={sutunlar}
      telefon={(satir) => (
        <>
          <Ad satir={satir} />
          <span className="flex flex-wrap items-center justify-between gap-2 text-kucuk">
            <span className="text-soluk-yazi">
              {doldur(metin("yonetim.musteriler.telefonOzeti"), {
                kayit: satir.kayit,
                sayi: String(satir.siparisSayisi),
              })}
            </span>
            <span className="font-kalin">{satir.toplam}</span>
          </span>
          <KampanyaIzni satir={satir} />
        </>
      )}
      anahtar={(satir) => satir.kimlik}
      satirAdi={(satir) => (satir.ad === "" ? satir.eposta : satir.ad)}
      suzgecAdlari={{
        kayit: { ad: metin("yonetim.musteriler.kayitSuzgeci"), secenek: (deger) => deger },
        kampanya: { ad: metin("yonetim.musteriler.kampanyaSuzgeci"), secenek: secenek("kampanya") },
        siparis: { ad: metin("yonetim.musteriler.siparisSuzgeci"), secenek: secenek("siparis") },
      }}
      kayitSecenekleri={{}}
      gunYazilari={gunYazilari}
      siralamaAdi={(kod) => metin(siralamalar[kod as MusteriListesiSiralamasi])}
      arama={{
        etiket: metin("yonetim.musteriler.ara"),
        yerTutucu: metin("yonetim.musteriler.araYer"),
      }}
      bos={{
        ikon: "hesap",
        baslik: metin("yonetim.musteriler.bos.baslik"),
        aciklama: metin("yonetim.musteriler.bos.metin"),
      }}
      topluIslemler={[]}
    />
  );
}
