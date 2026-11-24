"use client";
// Sabit sayfalar listesi (kart 0273; taslak: planlar/tasarim-yonu/panel.html, "Sayfalar"). Kısa bir listedir, liste
// motoruna geçmez (taslağın notu): her satırda başlık (sayfanın ekranına bağlantı), durumu, vitrindeki adresi ve bağlı
// olduğu menüler; satırın sonunda sil. Silme onay penceresiyle sorulur; menüdeki öğesi yerinde kalır, vitrinde görünmez.
//
// Her değişiklik hemen yayınlanır; sonuç bildirimle verilir, verisi sunucudan yeniden okunur (usePanelIslemi).
import { useEffect, useId, useRef, useState } from "react";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import type { SabitSayfaDurumu } from "../../kayitlar/sayfa";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { sabitSayfaHataMetinleri } from "../../moduller/icerik/sayfa-semalari";
import type { MenuYeri } from "../../moduller/menu/servis";
import { kayitAdresleri } from "../../vitrin/adresler";
import { sayfaEkraniAdresi, yeniSayfaAdresi } from "../adresler";
import { EylemBaglantisi } from "../eylem-dugmesi";
import { kodluHataMetni } from "../kodlu-form";
import { panelIkonu } from "../panel-ikon";
import { usePanelIslemi } from "../panel-islemi";
import type { SayfaSatiri } from "./veri";

const hataMetni = kodluHataMetni(sabitSayfaHataMetinleri);

export const sayfaDurumRozetleri = {
  yayinda: "basari",
  taslak: "ikincil",
} as const satisfies Record<SabitSayfaDurumu, "basari" | "ikincil">;

// Menüdeki yeri: "Alt bilgi › Kurumsal" ya da yalnız menünün adı.
export const menuYeriYazisi = (yer: MenuYeri, ayrac: string): string =>
  yer.ust === null ? yer.menuAdi : `${yer.menuAdi}${ayrac}${yer.ust}`;

export function SayfalarListesi({
  sayfalar,
  izinler,
}: {
  sayfalar: SayfaSatiri[];
  izinler: { degistir: boolean; sil: boolean };
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const baslikKimligi = useId();
  const [onay, setOnay] = useState<SayfaSatiri | null>(null);
  // Silinen satır kalkınca odak sonraki satıra, yoksa öncekine, yoksa listenin başlığına geçer.
  const odaklanacak = useRef<string | null>(null);
  const silindi = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: liste yenilenince bekleyen odak yerine konur.
  useEffect(() => {
    const hedef = odaklanacak.current;
    if (hedef === null) return;
    const oge =
      hedef === ""
        ? document.querySelector<HTMLElement>("[data-sayfa-ekle]")
        : document.querySelector<HTMLElement>(`[data-sayfa="${hedef}"] a`);
    if (oge === null) return;
    odaklanacak.current = null;
    oge.focus();
  }, [sayfalar]);

  if (sayfalar.length === 0) {
    return (
      <BosHal
        ikon={panelIkonu("sayfa")}
        baslik={metin("yonetim.sabitSayfa.bos.baslik")}
        aciklama={metin("yonetim.sabitSayfa.bos.aciklama")}
      >
        {izinler.degistir ? (
          <EylemBaglantisi eylem="sayfa-ekle" asil href={yeniSayfaAdresi} data-sayfa-ekle="" />
        ) : null}
      </BosHal>
    );
  }

  const ayrac = metin("yonetim.sabitSayfa.ayrac");
  return (
    <section aria-labelledby={baslikKimligi}>
      <h2 id={baslikKimligi} className="sr-only">
        {metin("yonetim.sabitSayfa.liste")}
      </h2>
      <Kart className="p-0">
        <ul aria-labelledby={baslikKimligi} className="m-0 flex list-none flex-col p-0">
          {sayfalar.map((sayfa, sira) => (
            <li
              key={sayfa.kimlik}
              data-sayfa={sayfa.kimlik}
              className="flex min-w-0 items-center gap-3 border-b border-kenar p-3 last:border-b-0 tablet:px-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1 break-words">
                <span className="flex flex-wrap items-center gap-2">
                  <Baglanti href={sayfaEkraniAdresi(sayfa.kimlik)} className="font-kalin">
                    {sayfa.baslik}
                  </Baglanti>
                  <Rozet tur={sayfaDurumRozetleri[sayfa.durum]}>
                    {metin(`yonetim.sabitSayfa.durum.${sayfa.durum}`)}
                  </Rozet>
                </span>
                <span className="text-kucuk text-soluk-yazi">
                  {[
                    kayitAdresleri.sayfa(sayfa.adresAdi),
                    sayfa.menuler.length === 0
                      ? metin("yonetim.sabitSayfa.menudeDegil")
                      : sayfa.menuler.map((yer) => menuYeriYazisi(yer, ayrac)).join(", "),
                  ].join(metin("yonetim.kategori.ayrac"))}
                </span>
              </div>
              {izinler.sil ? (
                <IkonDugmesi
                  ikon="sil"
                  etiket={doldur(metin("yonetim.sabitSayfa.silAdli"), { baslik: sayfa.baslik })}
                  onClick={() => {
                    odaklanacak.current = (sayfalar[sira + 1] ?? sayfalar[sira - 1])?.kimlik ?? "";
                    setOnay(sayfa);
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Kart>
      <OnayPenceresi
        acik={onay !== null}
        acikDegisince={(acik) => {
          if (acik) return;
          if (!silindi.current) odaklanacak.current = null;
          silindi.current = false;
          setOnay(null);
        }}
        baslik={doldur(metin("yonetim.sabitSayfa.silOnay.baslik"), { baslik: onay?.baslik ?? "" })}
        aciklama={metin("yonetim.sabitSayfa.silOnay.aciklama")}
        onayEtiketi={metin("yonetim.sabitSayfa.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          if (onay === null) return;
          const sonuc = await islem(
            "sayfa-sil",
            { kimlik: onay.kimlik },
            "yonetim.sabitSayfa.silindi",
          );
          silindi.current = sonuc.tamam;
        }}
        tur="tehlike"
      />
    </section>
  );
}
