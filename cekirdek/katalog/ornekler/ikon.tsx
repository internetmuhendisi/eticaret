"use client";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { type IkonAdi, ikonlar } from "../../../bilesenler/ikonlar/sozluk";

// Sözlükteki her ikon kavramının adıyla. Ad koddaki addır, ekran metni değildir.
export function IkonOrnegi() {
  return (
    <ul className="grid grid-cols-2 gap-2 tablet:grid-cols-4">
      {(Object.keys(ikonlar) as IkonAdi[]).map((ad) => (
        <li key={ad} className="flex items-center gap-2">
          <Ikon ad={ad} className="size-6" />
          <code>{ad}</code>
        </li>
      ))}
    </ul>
  );
}
