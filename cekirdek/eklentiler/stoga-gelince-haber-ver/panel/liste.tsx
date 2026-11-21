"use client";
// Stoğa gelince haber ver eklentisinin panel ekranı (kart 0144, karar 0117; kart 0258'de liste motoruna taşındı):
// bekleyen talebi olan birimler. Ürünün adı vitrindeki sayfasına (seçimiyle) yeni sekmede gider; seçim, bekleyen kişi
// sayısı ve ilk talebin tarihi yazar. E-posta adresleri panelde gösterilmez: yalnız bildirim için alınmıştır. Tarih ve
// sayı sunucuda biçimlenir.
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import type { StokBildirimiSiralamasi } from "../../../kayitlar/eklentiler";
import { doldur } from "../../../metinler/doldur";
import type { MetinAnahtari } from "../../../metinler/metin";
import { usePanelMetni } from "../../../metinler/panel-metni";
import { Liste } from "../../../yonetim-paneli/liste/liste";
import type { ListeDurumu, ListeVerisi } from "../../../yonetim-paneli/liste/tanim";
import { stokBildirimleriListesiTanimi } from "./liste-tanimi";

export type StokBildirimiSatiri = {
  birim: string;
  urunAdi: string;
  adres: string;
  secim: string[];
  bekleyen: string;
  enEski: string;
};

const siralamalar: Record<StokBildirimiSiralamasi, MetinAnahtari> = {
  "en-cok-bekleyen": "eklenti.stokBildirimi.panel.siralama.en-cok-bekleyen",
  "en-eski-talep": "eklenti.stokBildirimi.panel.siralama.en-eski-talep",
};

export function StokBildirimleriListesi({
  durum,
  veri,
  sinirda,
  sinir,
}: {
  durum: ListeDurumu;
  veri: ListeVerisi<StokBildirimiSatiri> | null;
  // Liste sınırına ulaştı mı ve sınır (biçimlenmiş): en çok bekleyenler gösterilir.
  sinirda: boolean;
  sinir: string;
}) {
  const metin = usePanelMetni();
  const urun = (satir: StokBildirimiSatiri) => (
    <span className="flex min-w-0 flex-col gap-1">
      <Baglanti href={satir.adres} target="_blank" className="w-fit wrap-anywhere">
        {satir.urunAdi}
      </Baglanti>
      {satir.secim.length === 0 ? null : (
        <span className="text-kucuk text-soluk-yazi wrap-anywhere">
          {satir.secim.join(metin("eklenti.stokBildirimi.secimAyiraci"))}
        </span>
      )}
    </span>
  );
  const bekleyen = (satir: StokBildirimiSatiri) =>
    doldur(metin("eklenti.stokBildirimi.panel.bekleyen"), { sayi: satir.bekleyen });
  return (
    <section aria-labelledby="stok-bildirimleri" className="flex flex-col gap-3">
      <h2 id="stok-bildirimleri" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("eklenti.stokBildirimi.panel.baslik")}
      </h2>
      <Liste
        tanim={stokBildirimleriListesiTanimi}
        durum={durum}
        veri={veri}
        ad={metin("eklenti.stokBildirimi.panel.baslik")}
        sutunlar={[
          { kod: "urun", baslik: metin("eklenti.stokBildirimi.panel.sutun.urun"), hucre: urun },
          {
            kod: "bekleyen",
            baslik: metin("eklenti.stokBildirimi.panel.sutun.bekleyen"),
            hucre: bekleyen,
          },
          {
            kod: "enEski",
            baslik: metin("eklenti.stokBildirimi.panel.sutun.enEski"),
            hucre: (satir) => satir.enEski,
          },
        ]}
        telefon={(satir) => (
          <>
            {urun(satir)}
            <span className="flex flex-col gap-1">
              <span className="font-kalin">{bekleyen(satir)}</span>
              <span className="text-kucuk text-soluk-yazi">
                {doldur(metin("eklenti.stokBildirimi.panel.enEski"), { tarih: satir.enEski })}
              </span>
            </span>
          </>
        )}
        anahtar={(satir) => satir.birim}
        satirAdi={(satir) => satir.urunAdi}
        suzgecAdlari={{}}
        siralamaAdi={(kod) => metin(siralamalar[kod as StokBildirimiSiralamasi])}
        arama={{
          etiket: metin("eklenti.stokBildirimi.panel.ara"),
          yerTutucu: metin("eklenti.stokBildirimi.panel.araYer"),
        }}
        bos={{
          ikon: "eposta",
          baslik: metin("eklenti.stokBildirimi.panel.bos"),
          aciklama: metin("eklenti.stokBildirimi.panel.bosAciklama"),
        }}
        topluIslemler={[]}
      />
      {sinirda ? (
        <p className="text-kucuk text-soluk-yazi">
          {doldur(metin("eklenti.stokBildirimi.panel.sinir"), { sayi: sinir })}
        </p>
      ) : null}
    </section>
  );
}
