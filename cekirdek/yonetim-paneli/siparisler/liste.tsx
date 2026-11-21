"use client";
// Siparişler ekranının listesi (kart 0234, karar 0145; kart 0258'de liste motoruna taşındı). Tanımı liste-tanimi.ts:
// durum sekmeleri sayılarıyla, ödeme yöntemi süzgeci, arama (numara, ad ya da e-posta; adrese yazılmaz), sıralama,
// sayfa ve "Hazırlamaya al" toplu işlemi. Havalesi bildirilmiş ve bekleyen iade talebi olan sipariş işaretlidir.
// Masaüstünde tablo, telefonda her sipariş bir kart (.claude/rules/telefon-gorunumu.md).
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import type { SiparisDurumu, SiparisListesiSiralamasi } from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { siparisAyrintisiAdresi } from "../adresler";
import { Liste, type SutunTanimi, type TopluIslemTanimi } from "../liste/liste";
import type { ListeDurumu, ListeVerisi } from "../liste/tanim";
import { DurumRozeti } from "./durum-rozeti";
import { iadeTalebiSekmesi, siparisListesiTanimi } from "./liste-tanimi";
import { durumMetni, odemeYazisi } from "./metinler";
import type { SiparisSatiri } from "./veri";

function Musteri({ satir }: { satir: SiparisSatiri }) {
  const metin = usePanelMetni();
  return (
    <span className="flex flex-col">
      <span>
        {satir.musteri === "" ? metin("yonetim.siparisler.kisiselSilindi") : satir.musteri}
      </span>
      {satir.uye ? null : (
        <span className="text-kucuk text-soluk-yazi">{metin("yonetim.siparisler.uyeDegil")}</span>
      )}
    </span>
  );
}

function Isaretler({ satir }: { satir: SiparisSatiri }) {
  const metin = usePanelMetni();
  return (
    <>
      {satir.havaleBildirildi ? (
        <span className="flex items-center gap-1 text-kucuk font-kalin text-uyari-yazi">
          <Ikon ad="havale" />
          {metin("yonetim.siparisler.havaleBildirildi")}
        </span>
      ) : null}
      {satir.iadeTalebi ? (
        <span className="flex items-center gap-1 text-kucuk font-kalin text-uyari-yazi">
          <Ikon ad="iade" />
          {metin("yonetim.siparisler.iadeTalebi")}
        </span>
      ) : null}
    </>
  );
}

function Numara({ satir }: { satir: SiparisSatiri }) {
  const metin = usePanelMetni();
  return (
    <Baglanti
      href={siparisAyrintisiAdresi(satir.numara)}
      aria-label={doldur(metin("yonetim.siparisler.ayrintiAdi"), { numara: satir.numara })}
      className="w-fit"
    >
      {satir.numara}
    </Baglanti>
  );
}

const siralamalar: Record<SiparisListesiSiralamasi, MetinAnahtari> = {
  "en-yeni": "yonetim.siparisler.siralama.en-yeni",
  "en-eski": "yonetim.siparisler.siralama.en-eski",
  "tutar-azalan": "yonetim.siparisler.siralama.tutar-azalan",
  "tutar-artan": "yonetim.siparisler.siralama.tutar-artan",
};

// Toplu işlemin nedeni: servisin bilinen kodları, gerisi genel metin.
const nedenler: Record<string, MetinAnahtari> = {
  "durum-degisti": "yonetim.siparisler.toplu.neden.durum-degisti",
  "gecis-yok": "yonetim.siparisler.toplu.neden.gecis-yok",
  "yontem-uymuyor": "yonetim.siparisler.toplu.neden.yontem-uymuyor",
  "iade-bekliyor": "yonetim.siparisler.toplu.neden.iade-bekliyor",
  bulunamadi: "yonetim.siparisler.toplu.neden.bulunamadi",
};

export function SiparisListesi({
  durum,
  veri,
  topluIslemler,
}: {
  durum: ListeDurumu;
  veri: ListeVerisi<SiparisSatiri> | null;
  // Yöneticinin izni olan toplu işlemlerin kodları (sunucu süzer).
  topluIslemler: readonly string[];
}) {
  const metin = usePanelMetni();
  const sutunlar: SutunTanimi<SiparisSatiri>[] = [
    {
      kod: "siparis",
      baslik: metin("yonetim.siparisler.sutun.siparis"),
      hucre: (satir) => (
        <span className="flex flex-col gap-1">
          <Numara satir={satir} />
          <Isaretler satir={satir} />
        </span>
      ),
    },
    {
      kod: "tarih",
      baslik: metin("yonetim.siparisler.sutun.tarih"),
      hucre: (satir) => satir.zaman,
    },
    {
      kod: "musteri",
      baslik: metin("yonetim.siparisler.sutun.musteri"),
      hucre: (satir) => <Musteri satir={satir} />,
    },
    {
      kod: "durum",
      baslik: metin("yonetim.siparisler.sutun.durum"),
      hucre: (satir) => <DurumRozeti durum={satir.durum} />,
    },
    {
      kod: "odeme",
      baslik: metin("yonetim.siparisler.sutun.odeme"),
      hucre: (satir) => odemeYazisi(metin, satir.odeme.yontem, satir.odeme.secenek),
    },
    {
      kod: "tutar",
      baslik: metin("yonetim.siparisler.sutun.tutar"),
      sag: true,
      hucre: (satir) => satir.tutar,
    },
  ];
  const islemler: TopluIslemTanimi<SiparisSatiri>[] = topluIslemler.includes("hazirlamaya-al")
    ? [
        {
          kod: "hazirlamaya-al",
          ad: metin("yonetim.eylem.hazirlamayaAl"),
          onay: (sayi) => ({
            baslik: doldur(metin("yonetim.siparisler.toplu.hazirlamayaAl.baslik"), {
              sayi: String(sayi),
            }),
            aciklama: metin("yonetim.siparisler.toplu.hazirlamayaAl.aciklama"),
            onayEtiketi: metin("yonetim.eylem.hazirlamayaAl"),
          }),
          uc: "siparisler-toplu",
          govde: (satirlar) => ({
            islem: "hazirlamaya-al",
            siparisler: satirlar.map((satir) => ({
              numara: satir.numara,
              gorulenDurum: satir.durum,
            })),
          }),
          basari: (sayi) =>
            doldur(metin("yonetim.siparisler.toplu.hazirlamayaAl.basari"), { sayi: String(sayi) }),
          neden: (kod) => metin(nedenler[kod] ?? "yonetim.siparisler.toplu.neden.genel"),
        },
      ]
    : [];
  return (
    <Liste
      tanim={siparisListesiTanimi}
      durum={durum}
      veri={veri}
      ad={metin("yonetim.siparisler.liste")}
      sutunlar={sutunlar}
      telefon={(satir) => (
        <>
          <span className="flex flex-wrap items-center justify-between gap-2">
            <Numara satir={satir} />
            <DurumRozeti durum={satir.durum} />
          </span>
          <span className="flex flex-wrap items-end justify-between gap-2 text-kucuk">
            <span className="flex flex-col">
              <span className="text-soluk-yazi">{satir.zaman}</span>
              <Musteri satir={satir} />
            </span>
            <span className="font-kalin">{satir.tutar}</span>
          </span>
          <Isaretler satir={satir} />
        </>
      )}
      anahtar={(satir) => satir.numara}
      satirAdi={(satir) => satir.numara}
      suzgecAdlari={{
        durum: {
          ad: metin("yonetim.siparisler.durumSuzgeci"),
          secenek: (deger) =>
            deger === iadeTalebiSekmesi
              ? metin("yonetim.siparisler.iadeTalepleri")
              : metin(durumMetni(deger as SiparisDurumu)),
        },
        odeme: {
          ad: metin("yonetim.siparisler.odemeSuzgeci"),
          secenek: (deger) => odemeYazisi(metin, deger, null),
        },
      }}
      siralamaAdi={(kod) => metin(siralamalar[kod as SiparisListesiSiralamasi])}
      arama={{
        etiket: metin("yonetim.siparisler.ara"),
        yerTutucu: metin("yonetim.siparisler.araYer"),
      }}
      bos={{
        ikon: "paket",
        baslik: metin("yonetim.siparisler.bos.baslik"),
        aciklama: metin("yonetim.siparisler.bos.metin"),
        eylem: (
          <Baglanti href="/" target="_blank" gorunum="sade">
            {metin("yonetim.siparisler.bos.dugme")}
          </Baglanti>
        ),
      }}
      topluIslemler={islemler}
    />
  );
}
