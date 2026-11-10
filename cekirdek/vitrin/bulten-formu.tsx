"use client";
// Bülten kaydının formu (kart 0112, karar 0090). Şema bülten eklentisinin ucuyla ortaktır (sema.ts). Robot
// korumasını useRobotluGonderim yürütür. Pazarlama onayı zorunludur, metni kayıt formuyla aynı tek metindir
// (kullanıcı kararı). Gönderim adresi bağlamdadır (eklenti verir); katalogdaki örnek kipte form yalnız doğrular.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../bilesenler/form/form";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../bilesenler/parcalar/onay-kutusu";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { hataKodlari } from "../kayitlar/kapi";
import { useMetin } from "../metinler/istemci-metni";
import { useRobotluGonderim } from "../moduller/robot-korumasi/istemci";
import { vitrinAdresleri } from "./adresler";
import type { BultenKaydi } from "./bolum-kutuphanesi/islev-verisi";
import { bultenKaydiSemasi } from "./bolumler/bulten-kaydi/sema";

type AlanHatalari = Partial<Record<"eposta" | "pazarlamaOnayi", string>>;
type Sonuc = "tamam" | "sinir" | "genel";

export function BultenFormu({ kayit }: { kayit: BultenKaydi }) {
  const metin = useMetin();
  const [alanHatalari, setAlanHatalari] = useState<AlanHatalari>({});
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  // Form ana sayfada durur: robot sorusu yalnız gönderirken istenir (ertele).
  const robotluGonder = useRobotluGonderim({ ertele: true });
  const formYeri = useRef<HTMLDivElement>(null);
  const tamamYazisi = useRef<HTMLParagraphElement>(null);

  // Klavyeyle dolduran kişi hatanın olduğu alana gider.
  useEffect(() => {
    if (Object.keys(alanHatalari).length === 0) return;
    formYeri.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [alanHatalari]);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    const veri = new FormData(olay.currentTarget);
    const girdi = bultenKaydiSemasi.safeParse({
      eposta: veri.get("eposta"),
      pazarlamaOnayi: veri.get("pazarlamaOnayi") === "on",
    });
    setSonuc(null);
    if (!girdi.success) {
      const alanlar = new Set(girdi.error.issues.map(({ path }) => path[0]));
      setAlanHatalari({
        ...(alanlar.has("eposta") ? { eposta: metin("vitrin.bolum.bultenKaydi.hataEposta") } : {}),
        ...(alanlar.has("pazarlamaOnayi")
          ? { pazarlamaOnayi: metin("vitrin.bolum.bultenKaydi.hataOnay") }
          : {}),
      });
      return;
    }
    setAlanHatalari({});
    // Katalogdaki örnek kipte gönderilecek yer yoktur: form yalnız doğrular.
    if (kayit.tur === "ornek") return;
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      const yanit = await robotluGonder(kayit.adres, girdi.data);
      if (yanit.ok) setSonuc("tamam");
      else if (yanit.status === hataKodlari["istek-siniri"]) setSonuc("sinir");
      else setSonuc("genel");
    } catch {
      setSonuc("genel");
    } finally {
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  // Başarıda form kalkar: odak teşekkür yazısına geçer, sayfanın başına düşmez; yazı okunur.
  useEffect(() => {
    if (sonuc === "tamam") tamamYazisi.current?.focus();
  }, [sonuc]);

  if (sonuc === "tamam") {
    return (
      <p ref={tamamYazisi} tabIndex={-1} role="status" className="font-kalin">
        {metin("vitrin.bolum.bultenKaydi.tamam")}
      </p>
    );
  }
  return (
    <div ref={formYeri}>
      <Form
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
        className="flex flex-col gap-3"
      >
        {sonuc === null ? null : (
          <Uyari tur="tehlike">
            {metin(
              sonuc === "sinir"
                ? "vitrin.bolum.bultenKaydi.hataSinir"
                : "vitrin.bolum.bultenKaydi.hataGenel",
            )}
          </Uyari>
        )}
        {/* Sıra e-posta, onay, düğme: klavyeyle dolduran kişi onaya düğmeden önce gelir (taslakta düğme
            e-postanın yanındadır). */}
        <FormAlani
          etiket={metin("vitrin.bolum.bultenKaydi.eposta")}
          {...(alanHatalari.eposta === undefined ? {} : { hata: alanHatalari.eposta })}
        >
          {(alan) => (
            <GirisAlani {...alan} name="eposta" type="email" autoComplete="email" required />
          )}
        </FormAlani>
        <OnayKutusu
          name="pazarlamaOnayi"
          etiket={metin("vitrin.onay.pazarlama")}
          hata={alanHatalari.pazarlamaOnayi}
          required
          ek={
            <Baglanti href={vitrinAdresleri.kvkkAydinlatma} target="_blank">
              {metin("vitrin.kayit.kvkkBaglanti")}
            </Baglanti>
          }
        />
        <GonderDugmesi tur="ikincil" className="w-fit">
          {metin("vitrin.bolum.bultenKaydi.gonder")}
        </GonderDugmesi>
        {bekliyor ? <p role="status">{metin("vitrin.bolum.bultenKaydi.gonderiliyor")}</p> : null}
      </Form>
    </div>
  );
}
