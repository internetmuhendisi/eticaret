"use client";
import { useState } from "react";
import { DosyaYukleme } from "../../../bilesenler/parcalar/dosya-yukleme";
import { yuklenebilenTurler } from "../../kayitlar/dosya";
import { doldur } from "../../metinler/doldur";
import { useOrnekMetni } from "./ortak";

// Örnek isteği göndermez: seçilen dosyanın adı yazar. İkinci örnek yükleme sürerken görünüşüdür (ilerleme ve İptal).
export function DosyaYuklemeOrnegi() {
  const m = useOrnekMetni();
  const [secilen, setSecilen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <DosyaYukleme
          secEtiketi={m("dosyaSec")}
          kabul={yuklenebilenTurler}
          onSecildi={(dosya) => setSecilen(dosya.name)}
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
    </div>
  );
}
