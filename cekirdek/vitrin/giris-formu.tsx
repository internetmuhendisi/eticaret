"use client";
// Müşteri giriş formu (kart 0033). Şema uçla ortaktır; şemadan geçmeyen girdi sunucuya gitmez.
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../bilesenler/form/form";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../bilesenler/parcalar/giris-alani";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { useMetin } from "../metinler/istemci-metni";
import { girisSemasi } from "../moduller/oturum/semalar";
import { vitrinAdresleri } from "./adresler";
import { stil } from "./stil";

const girisUcu = "/kapi/herkese-acik/musteri-giris";

export function GirisFormu() {
  const metin = useMetin();
  const [hata, setHata] = useState<string | null>(null);
  const gonderiliyor = useRef(false);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    // İkinci tıklama dikkate alınmaz.
    if (gonderiliyor.current) return;
    gonderiliyor.current = true;
    setHata(null);
    const veri = new FormData(olay.currentTarget);
    const girdi = girisSemasi.safeParse({ eposta: veri.get("eposta"), sifre: veri.get("sifre") });
    if (!girdi.success) {
      setHata(metin("vitrin.giris.hataBilgi"));
      gonderiliyor.current = false;
      return;
    }
    try {
      const yanit = await fetch(girisUcu, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(girdi.data),
      });
      if (yanit.ok) {
        window.location.assign(vitrinAdresleri.anasayfa);
        return;
      }
      if (yanit.status === 429) setHata(metin("vitrin.giris.hataSinir"));
      else if (yanit.status === 400 || yanit.status === 401)
        setHata(metin("vitrin.giris.hataBilgi"));
      else setHata(metin("vitrin.giris.hataGenel"));
    } catch {
      setHata(metin("vitrin.giris.hataGenel"));
    } finally {
      // Başarıda da: tarayıcının geri tuşu sayfayı önbellekten döndürürse form kilitli kalmasın.
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
      {hata === null ? null : <Uyari tur="tehlike">{hata}</Uyari>}
      <FormAlani etiket={metin("vitrin.giris.eposta")}>
        {(alan) => (
          <GirisAlani {...alan} name="eposta" type="email" autoComplete="username" required />
        )}
      </FormAlani>
      <FormAlani etiket={metin("vitrin.giris.sifre")}>
        {(alan) => (
          <GirisAlani
            {...alan}
            name="sifre"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </FormAlani>
      <GonderDugmesi>{metin("vitrin.giris.gonder")}</GonderDugmesi>
      <Baglanti href={vitrinAdresleri.sifremiUnuttum}>{metin("ortak.sifirlama.baglanti")}</Baglanti>
      <Baglanti href={vitrinAdresleri.kayit}>{metin("vitrin.giris.hesabinYokMu")}</Baglanti>
    </Form>
  );
}
