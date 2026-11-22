"use client";
import { useState } from "react";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { sinif as birlestir } from "../../../bilesenler/parcalar/sinif";
import { doldur } from "../../metinler/doldur";
import { useOrnekMetni } from "./ortak";

// Beden adları kod ve ölçüdür, metin değildir.
const bedenler = [
  { deger: "s", ad: "S" },
  { deger: "m", ad: "M", secilemez: true },
  { deger: "l", ad: "L" },
  { deger: "xl", ad: "XL" },
];

export function SecenekGrubuOrnegi() {
  const m = useOrnekMetni();
  const [secili, setSecili] = useState<string | undefined>("s");
  const [teslimat, setTeslimat] = useState<string | undefined>("standart");
  const [kose, setKose] = useState<string | undefined>("orta");
  const ad = bedenler.find((beden) => beden.deger === secili)?.ad ?? "";
  return (
    <div className="flex flex-col gap-6">
      <SecenekGrubu
        baslik={doldur(m("bedenBasligi"), { deger: ad })}
        etiket={m("beden")}
        ogeler={bedenler}
        deger={secili}
        onDegerDegisti={setSecili}
        secilemezEki={m("tukendiEki")}
        aciklama={m("bedenAciklamasi")}
      />
      {/* Kart görünümü (kart 0214): ödeme yöntemi gibi açıklamalı seçenekler. */}
      <SecenekGrubu
        baslik={m("teslimatSekli")}
        etiket={m("teslimatSekli")}
        gorunum="kart"
        ogeler={[
          {
            deger: "standart",
            ad: m("standartTeslimat"),
            aciklama: m("standartAciklama"),
            ikon: "kargo",
          },
          {
            deger: "magaza",
            ad: m("magazadanAl"),
            aciklama: m("magazadanAlAciklama"),
            ikon: "konum",
          },
        ]}
        deger={teslimat}
        onDegerDegisti={setTeslimat}
        secilemezEki={m("tukendiEki")}
      />
      {/* Örnekli görünüm (kart 0260): tema ayarlarında köşe, düğme ve yazı tipi seçimi. */}
      <SecenekGrubu
        baslik={m("koseBasligi")}
        etiket={m("koseBasligi")}
        gorunum="ornekli"
        ogeler={[
          { deger: "keskin", ad: m("koseKeskin"), ornek: <KoseOrnegi sinif="rounded-none" /> },
          { deger: "orta", ad: m("koseOrta"), ornek: <KoseOrnegi sinif="rounded-orta" /> },
          { deger: "yuvarlak", ad: m("koseYuvarlak"), ornek: <KoseOrnegi sinif="rounded-dugme" /> },
        ]}
        deger={kose}
        onDegerDegisti={setKose}
        secilemezEki={m("tukendiEki")}
      />
    </div>
  );
}

function KoseOrnegi({ sinif }: { sinif: string }) {
  return <span className={birlestir("size-8 border-2 border-yazi", sinif)} />;
}
