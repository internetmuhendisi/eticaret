"use client";
// Birden çok kaydı arayarak seçmek (kart 0263): ürünün kategorileri, etiketleri ve ilgili ürünleri. Arama kutusu
// KayitArama'dır (seçince boşalır); seçilenler kutunun altında sırasıyla durur, her birinin "Kaldır" düğmesi vardır.
// Kaldırınca odak sonraki seçilenin düğmesine, yoksa arama kutusuna geçer. Aynı kayıt ikinci kez eklenmez; sınır
// doluysa arama kutusu yerine sınırın yazısı görünür. Hata ve odak ortak form yapısındadır (AlanKabi).
import { useRef } from "react";
import { useCizimdenSonraOdak } from "../../bilesenler/parcalar/cizimden-sonra-odak";
import { IkonDugmesi } from "../../bilesenler/parcalar/dugme";
import { doldur } from "../metinler/doldur";
import { usePanelMetni } from "../metinler/panel-metni";
import type { AranabilirKayit } from "../moduller/urun/kayit-arama";
import { AlanKabi, usePanelFormuBaglami } from "./form/panel-formu";
import { KayitArama } from "./kayit-arama";

export type SecilenKayit = { kimlik: string; ad: string };

export function CokluKayitSecimi({
  ad,
  tur,
  etiket,
  aciklama,
  secilenler,
  degisti,
  sinir,
  sinirYazisi,
  haric,
  disabled = false,
}: {
  // Formdaki alanın adı (hata ve odak).
  ad: string;
  tur: AranabilirKayit;
  etiket: string;
  aciklama?: string;
  secilenler: readonly SecilenKayit[];
  degisti: (yeni: SecilenKayit[]) => void;
  sinir?: number;
  sinirYazisi?: string;
  // Seçilemeyen kayıt (ilgili ürünlerde ürünün kendisi).
  haric?: string;
  disabled?: boolean;
}) {
  const metin = usePanelMetni();
  const { hata } = usePanelFormuBaglami();
  const liste = useRef<HTMLUListElement>(null);
  const kap = useRef<HTMLDivElement>(null);
  const odakla = useCizimdenSonraOdak();
  const dolu = sinir !== undefined && secilenler.length >= sinir;

  const kaldir = (sira: number) => {
    degisti(secilenler.filter((_, i) => i !== sira));
    // Sonraki seçilenin düğmesi (kaldırılandan sonra aynı sırada), yoksa öncekininki, yoksa arama kutusu. Düğmeler
    // kaldırılan çizildikten sonra sayılır (kart 0307): önce sayılırsa kaldırılanın kendi düğmesi seçilebiliyordu.
    odakla(() => {
      const dugmeler = liste.current?.querySelectorAll("button");
      return (
        dugmeler?.[Math.min(sira, (dugmeler?.length ?? 0) - 1)] ??
        kap.current?.querySelector<HTMLElement>("input[role=combobox]")
      );
    });
  };

  return (
    <AlanKabi ad={ad} etiket={etiket}>
      <div ref={kap} className="flex flex-col gap-2">
        {dolu || disabled ? (
          // Sınır doluysa ya da değiştirme izni yoksa arama kutusu yoktur; alanın adı ve durumu yine görünür.
          <div className="flex flex-col gap-1">
            <span className="font-kalin">{etiket}</span>
            {dolu && sinirYazisi !== undefined && !disabled ? (
              <p className="text-kucuk text-soluk-yazi">{sinirYazisi}</p>
            ) : secilenler.length === 0 ? (
              <p className="text-kucuk text-soluk-yazi">{metin("yonetim.cokluKayit.secilmedi")}</p>
            ) : null}
          </div>
        ) : (
          <KayitArama
            tur={tur}
            etiket={etiket}
            {...(aciklama === undefined ? {} : { aciklama })}
            secili={undefined}
            secinceBosalt
            sec={(kayit) => {
              if (kayit === undefined || kayit.kimlik === haric) return;
              if (secilenler.some((secilen) => secilen.kimlik === kayit.kimlik)) return;
              degisti([...secilenler, { kimlik: kayit.kimlik, ad: kayit.ad }]);
            }}
            {...(hata(ad) === undefined ? {} : { hata: hata(ad) ?? "" })}
          />
        )}
        {secilenler.length === 0 ? null : (
          <ul
            ref={liste}
            aria-label={doldur(metin("yonetim.cokluKayit.secilenler"), { alan: etiket })}
            className="flex flex-wrap gap-2"
          >
            {secilenler.map((kayit, sira) => (
              <li
                key={kayit.kimlik}
                className="flex items-center gap-1 rounded-dugme border border-kenar bg-yuzey py-1 pr-1 pl-3 text-kucuk"
              >
                <span className="min-w-0 break-words">{kayit.ad}</span>
                {disabled ? null : (
                  <IkonDugmesi
                    ikon="kapat"
                    etiket={doldur(metin("yonetim.cokluKayit.kaldir"), { ad: kayit.ad })}
                    onClick={() => kaldir(sira)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AlanKabi>
  );
}
