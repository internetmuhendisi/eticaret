"use client";
// Üye olmayanın sipariş takibi formu (kart 0238, karar 0150; Canlı Çarşı taslağı siparis-ve-hesap.html): sipariş
// numarası ve siparişteki e-posta. Şema uçla ortaktır (cekirdek/moduller/siparis/takip-semalari.ts). İstek robot
// korumalıdır ve ertelenmiştir (sayfa açılınca soru istenmez). Bulunursa uç takip çerezini yazar, sayfa yeniden
// yüklenip siparişi gösterir. Eşleşmezse siparişin var olup olmadığı söylenmez: tek uyarı görünür ve odağı alır.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { hataKodlari } from "../../kayitlar/kapi";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { useRobotluGonderim } from "../../moduller/robot-korumasi/istemci";
import { siparisTakibiFormuSemasi } from "../../moduller/siparis/takip-semalari";
import { vitrinAdresleri } from "../adresler";

const uc = "/kapi/herkese-acik/siparis-takibi";

type Alan = "numara" | "eposta";
const alanSirasi: Alan[] = ["numara", "eposta"];
const alanMetinleri: Record<Alan, MetinAnahtari> = {
  numara: "vitrin.siparisTakibi.hata.numara",
  eposta: "vitrin.siparisTakibi.hata.eposta",
};

type Genel = "bulunamadi" | "sinir" | "genel";
const genelMetinler: Record<Genel, MetinAnahtari> = {
  bulunamadi: "vitrin.siparisTakibi.hata.bulunamadi",
  sinir: "vitrin.siparisTakibi.hata.sinir",
  genel: "vitrin.siparisTakibi.hata.genel",
};

export function SiparisTakibiFormu({ numara }: { numara: string }) {
  const metin = useMetin();
  const robotluGonder = useRobotluGonderim({ ertele: true });
  const [hatalar, setHatalar] = useState<Partial<Record<Alan, string>>>({});
  const [genel, setGenel] = useState<Genel | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  const kimlikler = useRef<Partial<Record<Alan, string>>>({}).current;
  const uyari = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (genel !== null) uyari.current?.focus();
  }, [genel]);

  const alanaOdaklan = (yeni: Partial<Record<Alan, string>>) => {
    const ilk = alanSirasi.find((alan) => yeni[alan] !== undefined);
    const kimlik = ilk === undefined ? undefined : kimlikler[ilk];
    if (kimlik !== undefined) document.getElementById(kimlik)?.focus();
  };

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    const form = new FormData(olay.currentTarget);
    const girdi = siparisTakibiFormuSemasi.safeParse({
      numara: String(form.get("numara") ?? ""),
      eposta: String(form.get("eposta") ?? ""),
    });
    setGenel(null);
    if (!girdi.success) {
      const yeni: Partial<Record<Alan, string>> = {};
      for (const sorun of girdi.error.issues) {
        const alan = sorun.path[0] as Alan;
        if (yeni[alan] === undefined) yeni[alan] = metin(alanMetinleri[alan]);
      }
      setHatalar(yeni);
      alanaOdaklan(yeni);
      return;
    }
    setHatalar({});
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      const yanit = await robotluGonder(uc, girdi.data);
      if (yanit.ok) {
        // Takip çerezi yazıldı: sayfa sunucuda siparişi çizer.
        window.location.assign(vitrinAdresleri.siparisTakibi);
        return;
      }
      const zarf = (await yanit.json().catch(() => undefined)) as
        | { hata?: { ayrinti?: { alan: string; kod: string }[] } }
        | undefined;
      const ayrinti = zarf?.hata?.ayrinti ?? [];
      if (yanit.status === hataKodlari.dogrulama && ayrinti.length > 0) {
        const yeni: Partial<Record<Alan, string>> = {};
        for (const { alan } of ayrinti) {
          if ((alanSirasi as string[]).includes(alan))
            yeni[alan as Alan] = metin(alanMetinleri[alan as Alan]);
        }
        setHatalar(yeni);
        alanaOdaklan(yeni);
        if (Object.keys(yeni).length === 0) setGenel("genel");
      } else if (yanit.status === hataKodlari.bulunamadi) {
        setGenel("bulunamadi");
      } else if (yanit.status === hataKodlari["istek-siniri"]) {
        setGenel("sinir");
      } else {
        setGenel("genel");
      }
    } catch {
      setGenel("genel");
    } finally {
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  const alan = (
    ad: Alan,
    etiket: MetinAnahtari,
    ek: { type?: "text" | "email"; autoComplete: string; defaultValue?: string },
  ) => (
    <FormAlani etiket={metin(etiket)} {...(hatalar[ad] === undefined ? {} : { hata: hatalar[ad] })}>
      {(ozellikler) => {
        kimlikler[ad] = ozellikler.id;
        return <GirisAlani {...ozellikler} name={ad} {...ek} />;
      }}
    </FormAlani>
  );

  return (
    <Kart className="p-5 tablet:p-6">
      <Form
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
        className="flex flex-col gap-4"
      >
        <div ref={uyari} tabIndex={-1} className="empty:hidden">
          {genel === null ? null : <Uyari tur="tehlike">{metin(genelMetinler[genel])}</Uyari>}
        </div>
        {alan("numara", "vitrin.siparisTakibi.numara", {
          autoComplete: "off",
          ...(numara === "" ? {} : { defaultValue: numara }),
        })}
        {alan("eposta", "vitrin.siparisTakibi.eposta", { type: "email", autoComplete: "email" })}
        {bekliyor ? <p role="status">{metin("vitrin.siparisTakibi.gonderiliyor")}</p> : null}
        <GonderDugmesi className="self-start" disabled={bekliyor}>
          {metin("vitrin.siparisTakibi.gonder")}
        </GonderDugmesi>
      </Form>
    </Kart>
  );
}
