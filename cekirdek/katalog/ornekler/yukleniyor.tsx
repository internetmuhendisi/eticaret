"use client";
import { YukleniyorGostergesi } from "../../../bilesenler/parcalar/yukleniyor";
import { useOrnekMetni } from "./ortak";

export function YukleniyorOrnegi() {
  const m = useOrnekMetni();
  return <YukleniyorGostergesi etiket={m("urunlerYukleniyor")} />;
}
