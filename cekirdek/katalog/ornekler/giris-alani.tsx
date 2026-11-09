"use client";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { useOrnekMetni } from "./ortak";

export function GirisAlaniOrnegi() {
  const m = useOrnekMetni();
  return (
    <>
      <FormAlani etiket={m("ad")} aciklama={m("adAciklama")}>
        {(alan) => <GirisAlani {...alan} name="ad" autoComplete="name" />}
      </FormAlani>
      <FormAlani etiket={m("soyad")} hata={m("soyadHata")}>
        {(alan) => <GirisAlani {...alan} name="soyad" autoComplete="family-name" />}
      </FormAlani>
    </>
  );
}
