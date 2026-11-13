// Stoğa gelince haber ver eklentisinin panel ekranı (kart 0144, karar 0117): bekleyen talebi olan birimler, en çok
// bekleyen önce. Her birim bir karttır (telefonda da, .claude/rules/telefon-gorunumu.md): ürünün adı vitrindeki
// sayfasına (seçimiyle) yeni sekmede gider, seçim, bekleyen kişi sayısı ve ilk talebin tarihi yazar. E-posta adresleri
// panelde gösterilmez: yalnız bildirim için alınmıştır.
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { stokBildirimiAyari } from "../../kayitlar/eklentiler";
import { bicim, metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import type { PanelSatiri } from "./servis";

export function StokBildirimleriListesi({ satirlar }: { satirlar: readonly PanelSatiri[] }) {
  if (satirlar.length === 0) {
    return (
      <BosHal
        ikon="eposta"
        baslik={metin("eklenti.stokBildirimi.panel.bos")}
        aciklama={metin("eklenti.stokBildirimi.panel.bosAciklama")}
      />
    );
  }
  const bicimleyici = bicim();
  return (
    <section aria-labelledby="stok-bildirimleri" className="flex flex-col gap-3">
      <h2 id="stok-bildirimleri" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("eklenti.stokBildirimi.panel.baslik")}
      </h2>
      <ul className="flex flex-col gap-2">
        {satirlar.map((satir) => (
          <li key={satir.birim}>
            <Kart className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4 tablet:p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <Baglanti
                  href={satir.adres}
                  target="_blank"
                  className="w-fit font-kalin wrap-anywhere"
                >
                  {satir.urunAdi}
                </Baglanti>
                {satir.secim.length === 0 ? null : (
                  <span className="text-kucuk text-soluk-yazi wrap-anywhere">
                    {satir.secim.join(metin("eklenti.stokBildirimi.secimAyiraci"))}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 tablet:items-end">
                <span className="font-kalin">
                  {doldur(metin("eklenti.stokBildirimi.panel.bekleyen"), {
                    sayi: bicimleyici.sayi(satir.bekleyen),
                  })}
                </span>
                <span className="text-kucuk text-soluk-yazi">
                  {doldur(metin("eklenti.stokBildirimi.panel.enEski"), {
                    tarih: bicimleyici.tarih(satir.enEski),
                  })}
                </span>
              </div>
            </Kart>
          </li>
        ))}
      </ul>
      {satirlar.length < stokBildirimiAyari.panelSiniri ? null : (
        <p className="text-kucuk text-soluk-yazi">
          {doldur(metin("eklenti.stokBildirimi.panel.sinir"), {
            sayi: bicimleyici.sayi(stokBildirimiAyari.panelSiniri),
          })}
        </p>
      )}
    </section>
  );
}
