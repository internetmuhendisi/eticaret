"use client";
import { useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { useMetin } from "../../metinler/istemci-metni";
import { useOrnekMetni } from "./ortak";

// Gönder düğmesi kod yüklenene kadar kapalıdır; örnek gönderimi tarayıcıda karşılar, hiçbir yere gitmez.
export function FormOrnegi() {
  const metin = useMetin();
  const m = useOrnekMetni();
  const [gonderildi, setGonderildi] = useState(false);
  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      className="flex flex-col gap-4"
      onSubmit={(olay) => {
        olay.preventDefault();
        setGonderildi(true);
      }}
    >
      <FormAlani etiket={m("eposta")}>
        {(alan) => <GirisAlani {...alan} name="eposta" type="email" autoComplete="email" />}
      </FormAlani>
      <div>
        <GonderDugmesi>{m("aboneOl")}</GonderDugmesi>
      </div>
      {gonderildi ? <p role="status">{m("gonderildi")}</p> : null}
    </Form>
  );
}
