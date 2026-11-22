"use client";
import { useState } from "react";
import { DosyaYukleme } from "../../../bilesenler/parcalar/dosya-yukleme";
import { yuklenebilenTurler } from "../../kayitlar/dosya";
import { doldur } from "../../metinler/doldur";
import { useOrnekMetni } from "./ortak";

// Örnek isteği göndermez: seçilen dosyanın adı yazar. İkinci örnek yükleme sürerken görünüşüdür (ilerleme ve İptal),
// üçüncüsü birden çok dosya ve bırakma alanı (kart 0266).
export function DosyaYuklemeOrnegi() {
  const m = useOrnekMetni();
  const [secilen, setSecilen] = useState<string | null>(null);
  const [coklu, setCoklu] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <DosyaYukleme
          secEtiketi={m("dosyaSec")}
          kabul={yuklenebilenTurler}
          onSecildi={([dosya]) => setSecilen(dosya?.name ?? null)}
          yukleme={null}
          ilerlemeEtiketi={m("dosyaIlerleme")}
          iptalEtiketi={m("dosyaIptal")}
          onIptal={() => undefined}
        />
        {secilen === null ? null : (
          <p className="m-0" role="status">
            {doldur(m("dosyaSecildi"), { ad: secilen })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-kalin">{m("dosyaYukleniyorBasligi")}</span>
        <DosyaYukleme
          secEtiketi={m("dosyaSec")}
          kabul={yuklenebilenTurler}
          onSecildi={() => undefined}
          yukleme={{ oran: 0.4 }}
          ilerlemeEtiketi={m("dosyaIlerleme")}
          iptalEtiketi={m("dosyaIptal")}
          onIptal={() => undefined}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-kalin">{m("dosyaBirakma")}</span>
        <DosyaYukleme
          coklu
          birakma={{ baslik: m("dosyaBirakmaBaslik"), aciklama: m("dosyaBirakmaAciklamasi") }}
          tur="sade"
          secEtiketi={m("dosyaSec")}
          kabul={yuklenebilenTurler}
          onSecildi={(dosyalar) => setCoklu(dosyalar.map((dosya) => dosya.name))}
          yukleme={null}
          ilerlemeEtiketi={m("dosyaIlerleme")}
          iptalEtiketi={m("dosyaIptal")}
          onIptal={() => undefined}
        />
        {coklu.length === 0 ? null : (
          <p className="m-0" role="status">
            {doldur(m("dosyalarSecildi"), { adlar: coklu.join(", ") })}
          </p>
        )}
      </div>
    </div>
  );
}
