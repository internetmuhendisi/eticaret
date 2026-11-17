"use client";
// Yönetici giriş formu (kart 0027). Şema uçla ortaktır; şemadan geçmeyen girdi sunucuya gitmez.
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../bilesenler/form/form";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../bilesenler/parcalar/giris-alani";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { kapiyaIstek } from "../kapi/istemci";
import { useMetin } from "../metinler/istemci-metni";
import { girisSemasi } from "../moduller/oturum/semalar";
import { adimAdresi, donusParametresi, sifremiUnuttumAdresi } from "./adresler";
import { stil } from "./stil";

const girisUcu = "/kapi/herkese-acik/yonetici-giris";

export function GirisFormu({ donus }: { donus: string }) {
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
      setHata(metin("yonetim.giris.hataBilgi"));
      gonderiliyor.current = false;
      return;
    }
    try {
      const yanit = await kapiyaIstek(girisUcu, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(girdi.data),
      });
      if (yanit.ok) {
        // Şifre yalnız ilk aşamadır: oturum kod ya da kurulum ekranından sonra başlar (kart 0028).
        const { veri } = (await yanit.json()) as { veri: { sonraki: "kod" | "kurulum" } };
        const sorgu = new URLSearchParams({ [donusParametresi]: donus });
        window.location.assign(`${adimAdresi(veri.sonraki)}?${sorgu}`);
        return;
      }
      if (yanit.status === 429) setHata(metin("yonetim.giris.hataSinir"));
      else if (yanit.status === 400 || yanit.status === 401)
        setHata(metin("yonetim.giris.hataBilgi"));
      else setHata(metin("yonetim.giris.hataGenel"));
    } catch {
      setHata(metin("yonetim.giris.hataGenel"));
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
      <FormAlani etiket={metin("yonetim.giris.eposta")}>
        {(alan) => (
          <GirisAlani {...alan} name="eposta" type="email" autoComplete="username" required />
        )}
      </FormAlani>
      <FormAlani etiket={metin("yonetim.giris.sifre")}>
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
      <GonderDugmesi>{metin("yonetim.giris.gonder")}</GonderDugmesi>
      <Baglanti href={sifremiUnuttumAdresi}>{metin("ortak.sifirlama.baglanti")}</Baglanti>
    </Form>
  );
}
