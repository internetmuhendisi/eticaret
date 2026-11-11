"use client";
import { DahaFazla, Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { useOrnekMetni } from "./ortak";

const adres = (sayfa: number) => `?sayfa=${sayfa}`;

// Numaralı sayfalar: başta, ortada ve sonda; altında "Daha fazla göster" ve son sayfadaki hâli.
export function SayfalamaOrnegi() {
  const m = useOrnekMetni();
  const metin = useMetin();
  const metinler = {
    etiket: metin("ortak.parca.sayfalar"),
    onceki: metin("ortak.parca.oncekiSayfa"),
    sonraki: metin("ortak.parca.sonrakiSayfa"),
    sayfaAdi: (sira: number) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
    bosluk: metin("ortak.parca.atlananSayfalar"),
  };
  return (
    <div className="flex flex-col gap-6">
      <Sayfalama sayfa={1} toplamSayfa={3} adres={adres} metinler={metinler} />
      <Sayfalama sayfa={6} toplamSayfa={12} adres={adres} metinler={metinler} />
      <Sayfalama sayfa={12} toplamSayfa={12} adres={adres} metinler={metinler} />
      <DahaFazla durum={m("dahaFazlaDurum")} adres={adres(2)} dugmeYazisi={m("dahaFazlaGoster")} />
      <DahaFazla durum={m("sonSayfaDurum")} adres={undefined} dugmeYazisi={m("dahaFazlaGoster")} />
    </div>
  );
}
