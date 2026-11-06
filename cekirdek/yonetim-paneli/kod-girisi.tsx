"use client";
// Kod ekranının formu (kart 0028): kod doğruysa oturum açılmıştır, panele dönülür.
import { useMetin } from "../metinler/istemci-metni";
import { KodFormu } from "./kod-formu";

export function KodGirisi({ donus }: { donus: string }) {
  const metin = useMetin();
  return (
    <KodFormu
      uc="/kapi/herkese-acik/yonetici-kod"
      etiket={metin("yonetim.kod.alan")}
      dugme={metin("yonetim.kod.gonder")}
      basarili={() => window.location.assign(donus)}
    />
  );
}
