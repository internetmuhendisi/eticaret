"use client";
import { useId } from "react";
import { Etiket } from "../../../bilesenler/parcalar/etiket";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { useOrnekMetni } from "./ortak";

export function EtiketOrnegi() {
  const m = useOrnekMetni();
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <Etiket htmlFor={id}>{m("not")}</Etiket>
      <GirisAlani id={id} name="not" />
    </div>
  );
}
