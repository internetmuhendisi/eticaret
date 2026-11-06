"use client";
// İki aşamalı girişin kod formu (kart 0028): kod ekranı ve kurulum ekranı ortak kullanır. Süresi dolan
// ara adımda giriş sayfasına döner.
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../bilesenler/form/form";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { GirisAlani } from "../../bilesenler/form/giris-alani";
import { Uyari } from "../../bilesenler/form/uyari";
import { useMetin } from "../metinler/istemci-metni";
import { kodSemasi } from "../moduller/oturum/semalar";
import { girisAdresi } from "./adresler";
import { stil } from "./stil";

export function KodFormu<Veri>({
  uc,
  etiket,
  dugme,
  basarili,
}: {
  uc: string;
  etiket: string;
  dugme: string;
  basarili: (veri: Veri) => void;
}) {
  const metin = useMetin();
  const [hata, setHata] = useState<string | null>(null);
  const gonderiliyor = useRef(false);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    gonderiliyor.current = true;
    setHata(null);
    const girdi = kodSemasi.safeParse({ kod: new FormData(olay.currentTarget).get("kod") });
    if (!girdi.success) {
      setHata(metin("yonetim.kod.hataKod"));
      gonderiliyor.current = false;
      return;
    }
    try {
      const yanit = await fetch(uc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(girdi.data),
      });
      if (yanit.ok) {
        const { veri } = (await yanit.json()) as { veri: Veri };
        basarili(veri);
        return;
      }
      const govde = (await yanit.json().catch(() => null)) as { hata?: { kod?: string } } | null;
      if (govde?.hata?.kod === "oturum-yok") {
        window.location.assign(girisAdresi);
        return;
      }
      // Başka sekmede kurulum bitmiş ya da durum değişmiş: ara katman doğru adıma yönlendirir.
      if (govde?.hata?.kod === "is-kurali") {
        window.location.reload();
        return;
      }
      if (yanit.status === 429) setHata(metin("yonetim.giris.hataSinir"));
      else if (yanit.status === 400 || yanit.status === 401) setHata(metin("yonetim.kod.hataKod"));
      else setHata(metin("yonetim.giris.hataGenel"));
    } catch {
      setHata(metin("yonetim.giris.hataGenel"));
    } finally {
      gonderiliyor.current = false;
    }
  };

  return (
    <Form
      className={stil.form}
      onSubmit={gonder}
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
    >
      {hata === null ? null : <Uyari>{hata}</Uyari>}
      <FormAlani etiket={etiket}>
        {(alan) => (
          <GirisAlani {...alan} name="kod" autoComplete="one-time-code" autoFocus required />
        )}
      </FormAlani>
      <GonderDugmesi>{dugme}</GonderDugmesi>
    </Form>
  );
}
