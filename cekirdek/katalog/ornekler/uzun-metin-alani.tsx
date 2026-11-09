"use client";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { useOrnekMetni } from "./ortak";

export function UzunMetinAlaniOrnegi() {
  const m = useOrnekMetni();
  return (
    <>
      <FormAlani etiket={m("siparisNotu")} aciklama={m("siparisNotuAciklama")}>
        {(alan) => <UzunMetinAlani {...alan} name="not" maxLength={500} />}
      </FormAlani>
      <FormAlani etiket={m("siparisNotu")} hata={m("siparisNotuHata")}>
        {(alan) => <UzunMetinAlani {...alan} name="hatali-not" />}
      </FormAlani>
    </>
  );
}
