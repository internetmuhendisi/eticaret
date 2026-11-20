"use client";
// Kod ekranının formu (kart 0028): kod doğruysa oturum açılmıştır, panele dönülür.
import { usePanelMetni } from "../metinler/panel-metni";
import { KodFormu } from "./kod-formu";

export function KodGirisi({ donus }: { donus: string }) {
  const metin = usePanelMetni();
  return (
    <KodFormu
      uc="/kapi/herkese-acik/yonetici-kod"
      etiket={metin("yonetim.kod.alan")}
      dugme={metin("yonetim.kod.gonder")}
      basarili={() => window.location.assign(donus)}
    />
  );
}
