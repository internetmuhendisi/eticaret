"use client";
import { KopyalaDugmesi } from "../../../bilesenler/parcalar/kopyala-dugmesi";
import { useOrnekMetni } from "./ortak";

// Kopyalanan değer ve sonucun bildirimi.
export function KopyalaDugmesiOrnegi() {
  const m = useOrnekMetni();
  return (
    <KopyalaDugmesi
      deger={m("kopyalaDeger")}
      etiket={m("kopyala")}
      kopyalandiMetni={m("kopyalandi")}
      kopyalanamadiMetni={m("kopyalanamadi")}
    />
  );
}
