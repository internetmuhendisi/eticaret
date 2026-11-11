"use client";
import { useState } from "react";
import { AramaFormu, Form, GonderDugmesi } from "../../../bilesenler/form/form";
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
    <div className="flex flex-col gap-8">
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
      <AramaFormuOrnegi />
    </div>
  );
}

// Arama formu: GET ile gönderilir, aranan metin adrese yazılır (gizli bilgi taşımaz). Örnek kataloğun kendi
// adresine gönderir.
function AramaFormuOrnegi() {
  const m = useOrnekMetni();
  return (
    <AramaFormu
      adres="#"
      alanAdi="ara"
      etiket={m("aramaEtiketi")}
      yerTutucu={m("aramaYerTutucu")}
      dugmeEtiketi={m("ara")}
      className="max-w-form"
    />
  );
}
