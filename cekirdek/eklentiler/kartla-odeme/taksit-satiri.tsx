"use client";
// Ürün sayfasının taksit satırı ve penceresi (kart 0215, karar 0132): "Kartla N taksite kadar · Taksit seçenekleri".
// Pencere açılınca seçili birimin taksit tablosu ödeme kuruluşundan istenir (bankalara göre, kart numarasız); sayfa
// açılırken istek gitmez. Tutarlar sunucudan sitenin biçimiyle yazılı gelir.
import { useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";
import {
  Pencere,
  PencereAciklamasi,
  PencereBasligi,
  PencereIcerigi,
  PencereTetikleyici,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { kapiyaIstek } from "../../kapi/istemci";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";
import { useSeciliBirim } from "../../vitrin/urun-sayfasi/secili-birim";
import type { TaksitTablosu } from "./servis";

const taksitlerUcu = "/kapi/herkese-acik/kartla-odeme/taksitler";

type Durum =
  | { tur: "bos" }
  | { tur: "yukleniyor" }
  | { tur: "hazir"; bankalar: TaksitTablosu["bankalar"] }
  | { tur: "hata" };

export function TaksitSatiri({ enCok }: { enCok: number }) {
  const metin = useMetin();
  const birim = useSeciliBirim();
  const [durum, setDurum] = useState<Durum>({ tur: "bos" });

  const ac = async (acik: boolean) => {
    if (!acik || birim === undefined) return;
    setDurum({ tur: "yukleniyor" });
    try {
      const yanit = await kapiyaIstek(`${taksitlerUcu}?${new URLSearchParams({ birim })}`);
      const zarf = (await yanit.json().catch(() => undefined)) as
        | { veri?: { bankalar: TaksitTablosu["bankalar"] } }
        | undefined;
      setDurum(
        yanit.ok && zarf?.veri !== undefined
          ? { tur: "hazir", bankalar: zarf.veri.bankalar }
          : { tur: "hata" },
      );
    } catch {
      setDurum({ tur: "hata" });
    }
  };

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-govde">
      <Ikon ad="kart" className="size-4 text-soluk-yazi" />
      <span>{doldur(metin("eklenti.kartlaOdeme.taksitSatiri"), { sayi: String(enCok) })}</span>
      <span aria-hidden="true">{metin("eklenti.kartlaOdeme.ayrac")}</span>
      <Pencere onOpenChange={(acik) => void ac(acik)}>
        <PencereTetikleyici asChild>
          <Dugme tur="baglanti" disabled={birim === undefined}>
            {metin("eklenti.kartlaOdeme.taksitSecenekleri")}
          </Dugme>
        </PencereTetikleyici>
        <PencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} genislik="orta">
          <PencereUstu>
            <PencereBasligi>{metin("eklenti.kartlaOdeme.taksitPenceresi")}</PencereBasligi>
            <PencereAciklamasi>{metin("eklenti.kartlaOdeme.taksitAciklamasi")}</PencereAciklamasi>
          </PencereUstu>
          {durum.tur === "hazir" ? (
            durum.bankalar.length === 0 ? (
              <Uyari tur="bilgi">{metin("eklenti.kartlaOdeme.taksitYok")}</Uyari>
            ) : (
              <div className="flex flex-col gap-6">
                {durum.bankalar.map((banka) => (
                  <Tablo key={`${banka.banka}-${banka.aile}`} className="text-kucuk">
                    <TabloBasligi className="pb-2 text-left font-kalin">
                      {[banka.aile, banka.banka].filter((ad) => ad !== "").join(" · ")}
                    </TabloBasligi>
                    <TabloUstu>
                      <TabloSatiri className="text-soluk-yazi">
                        <TabloBasHucresi scope="col" className="py-2 pr-3 text-left font-normal">
                          {metin("eklenti.kartlaOdeme.taksitSutun")}
                        </TabloBasHucresi>
                        <TabloBasHucresi scope="col" className="py-2 pr-3 text-right font-normal">
                          {metin("eklenti.kartlaOdeme.aylikSutun")}
                        </TabloBasHucresi>
                        <TabloBasHucresi scope="col" className="py-2 text-right font-normal">
                          {metin("eklenti.kartlaOdeme.toplamSutun")}
                        </TabloBasHucresi>
                      </TabloSatiri>
                    </TabloUstu>
                    <TabloGovdesi>
                      {banka.taksitler.map((taksit) => (
                        <TabloSatiri key={taksit.sayi}>
                          <TabloBasHucresi scope="row" className="py-2 pr-3 text-left font-normal">
                            {taksit.sayi === 1
                              ? metin("eklenti.kartlaOdeme.tekCekim")
                              : doldur(metin("eklenti.kartlaOdeme.taksitSayisi"), {
                                  sayi: String(taksit.sayi),
                                })}
                          </TabloBasHucresi>
                          <TabloHucresi className="py-2 pr-3 text-right whitespace-nowrap">
                            {taksit.aylik}
                          </TabloHucresi>
                          <TabloHucresi className="py-2 text-right whitespace-nowrap">
                            {taksit.toplam}
                          </TabloHucresi>
                        </TabloSatiri>
                      ))}
                    </TabloGovdesi>
                  </Tablo>
                ))}
              </div>
            )
          ) : durum.tur === "hata" ? (
            <Uyari tur="tehlike">{metin("eklenti.kartlaOdeme.taksitYok")}</Uyari>
          ) : (
            <div role="status" className="flex flex-col gap-2">
              <span className="sr-only">{metin("eklenti.kartlaOdeme.yukleniyor")}</span>
              <IskeletGorunum className="h-32 w-full" />
            </div>
          )}
        </PencereIcerigi>
      </Pencere>
    </p>
  );
}
