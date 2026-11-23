"use client";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { panelIkonlari } from "../../../bilesenler/ikonlar/panel-sozlugu";
import { type IkonAdi, ikonlar } from "../../../bilesenler/ikonlar/sozluk";

// Sözlükteki her ikon kavramının adıyla; ardından yalnız panelin kullandığı ikonlar (panel-sozlugu.ts, kart 0295).
// Ad koddaki addır, ekran metni değildir.
export function IkonOrnegi() {
  return (
    <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-4">
      {(Object.keys(ikonlar) as IkonAdi[]).map((ad) => (
        <li key={ad} className="flex items-center gap-2">
          <Ikon ad={ad} className="size-6" />
          <code>{ad}</code>
        </li>
      ))}
      {(Object.keys(panelIkonlari) as (keyof typeof panelIkonlari)[]).map((ad) => (
        <li key={ad} className="flex items-center gap-2">
          <Ikon ad={panelIkonlari[ad]} className="size-6" />
          <code>{ad}</code>
        </li>
      ))}
    </ul>
  );
}
