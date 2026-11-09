"use client";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { useOrnekMetni } from "./ortak";

// Etiket, açıklama ve hata alana bağlıdır; ekran okuyucu üçünü birlikte okur.
export function FormAlaniOrnegi() {
  const m = useOrnekMetni();
  return (
    <>
      <FormAlani etiket={m("telefon")} aciklama={m("telefonAciklama")}>
        {(alan) => <GirisAlani {...alan} name="telefon" type="tel" autoComplete="tel" />}
      </FormAlani>
      <FormAlani etiket={m("isTelefonu")} aciklama={m("telefonAciklama")} hata={m("telefonHata")}>
        {(alan) => <GirisAlani {...alan} name="isTelefonu" type="tel" />}
      </FormAlani>
    </>
  );
}
