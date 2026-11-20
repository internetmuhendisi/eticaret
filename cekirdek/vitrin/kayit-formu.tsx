"use client";
// Müşteri kayıt formu (kart 0033, karar 0051). Şema uçla ortaktır. Robot korumasını useRobotluGonderim yürütür.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../bilesenler/form/form";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../bilesenler/parcalar/onay-kutusu";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { hataKodlari } from "../kayitlar/kapi";
import { sifreSiniri } from "../kayitlar/oturum";
import { doldur } from "../metinler/doldur";
import { useMetin } from "../metinler/istemci-metni";
import { kayitFormuSemasi } from "../moduller/musteri/semalar";
import { useRobotluGonderim } from "../moduller/robot-korumasi/istemci";
import { vitrinAdresleri } from "./adresler";
import { stil } from "./stil";

const kayitUcu = "/kapi/herkese-acik/musteri-kayit";

type AlanHatalari = Partial<Record<"eposta" | "sifre" | "uyelikOnayi" | "kvkkOnayi", string>>;
type GenelHata = "kayitli" | "sinir" | "genel";

// donus: kayıttan sonra gidilecek vitrin adresi (vitrinDonusu'ndan geçmiş; kart 0237). Verilmezse ana sayfa.
export function KayitFormu({ donus = vitrinAdresleri.anasayfa }: { donus?: string }) {
  const metin = useMetin();
  const [alanHatalari, setAlanHatalari] = useState<AlanHatalari>({});
  const [genelHata, setGenelHata] = useState<GenelHata | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  const robotluGonder = useRobotluGonderim();
  const formYeri = useRef<HTMLDivElement>(null);
  const enKisa = { enKisa: String(sifreSiniri.enKisa) };

  // Klavyeyle dolduran kişi hatanın olduğu alana gider.
  useEffect(() => {
    if (Object.keys(alanHatalari).length === 0) return;
    formYeri.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [alanHatalari]);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    // İkinci tıklama dikkate alınmaz.
    if (gonderiliyor.current) return;
    const veri = new FormData(olay.currentTarget);
    const girdi = kayitFormuSemasi.safeParse({
      eposta: veri.get("eposta"),
      sifre: veri.get("sifre"),
      uyelikOnayi: veri.get("uyelikOnayi") === "on",
      kvkkOnayi: veri.get("kvkkOnayi") === "on",
      pazarlamaIzni: veri.get("pazarlamaIzni") === "on",
    });
    setGenelHata(null);
    if (!girdi.success) {
      const alanlar = new Set(girdi.error.issues.map(({ path }) => path[0]));
      setAlanHatalari({
        ...(alanlar.has("eposta") ? { eposta: metin("vitrin.kayit.hataEposta") } : {}),
        ...(alanlar.has("sifre") ? { sifre: doldur(metin("vitrin.kayit.hataSifre"), enKisa) } : {}),
        ...(alanlar.has("uyelikOnayi") ? { uyelikOnayi: metin("vitrin.kayit.hataOnay") } : {}),
        ...(alanlar.has("kvkkOnayi") ? { kvkkOnayi: metin("vitrin.kayit.hataOnay") } : {}),
      });
      return;
    }
    setAlanHatalari({});
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      const yanit = await robotluGonder(kayitUcu, girdi.data);
      if (yanit.ok) {
        window.location.assign(donus);
        return;
      }
      if (yanit.status === hataKodlari.cakisma) setGenelHata("kayitli");
      else if (yanit.status === hataKodlari["istek-siniri"]) setGenelHata("sinir");
      else setGenelHata("genel");
    } catch {
      setGenelHata("genel");
    } finally {
      // Başarıda da: tarayıcının geri tuşu sayfayı önbellekten döndürürse form kilitli kalmasın.
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  return (
    <div ref={formYeri}>
      <Form
        className={stil.form}
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
      >
        {genelHata === "kayitli" ? (
          <Uyari tur="tehlike">
            <p>{metin("vitrin.kayit.hataKayitli")}</p>
            <Baglanti href={vitrinAdresleri.giris}>{metin("vitrin.kayit.girisBaglanti")}</Baglanti>
          </Uyari>
        ) : null}
        {genelHata === "sinir" ? (
          <Uyari tur="tehlike">{metin("vitrin.kayit.hataSinir")}</Uyari>
        ) : null}
        {genelHata === "genel" ? (
          <Uyari tur="tehlike">{metin("vitrin.kayit.hataGenel")}</Uyari>
        ) : null}
        <FormAlani
          etiket={metin("vitrin.kayit.eposta")}
          {...(alanHatalari.eposta === undefined ? {} : { hata: alanHatalari.eposta })}
        >
          {(alan) => (
            <GirisAlani {...alan} name="eposta" type="email" autoComplete="email" required />
          )}
        </FormAlani>
        <FormAlani
          etiket={metin("vitrin.kayit.sifre")}
          aciklama={doldur(metin("vitrin.kayit.sifreAciklama"), enKisa)}
          {...(alanHatalari.sifre === undefined ? {} : { hata: alanHatalari.sifre })}
        >
          {(alan) => (
            <GirisAlani
              {...alan}
              name="sifre"
              type="password"
              autoComplete="new-password"
              required
            />
          )}
        </FormAlani>
        <OnayKutusu
          name="uyelikOnayi"
          etiket={metin("vitrin.kayit.uyelikOnayi")}
          hata={alanHatalari.uyelikOnayi}
          ek={
            <Baglanti href={vitrinAdresleri.uyelikSozlesmesi} target="_blank">
              {metin("vitrin.kayit.uyelikBaglanti")}
            </Baglanti>
          }
        />
        <OnayKutusu
          name="kvkkOnayi"
          etiket={metin("vitrin.kayit.kvkkOnayi")}
          hata={alanHatalari.kvkkOnayi}
          ek={
            <Baglanti href={vitrinAdresleri.kvkkAydinlatma} target="_blank">
              {metin("vitrin.kayit.kvkkBaglanti")}
            </Baglanti>
          }
        />
        {/* Pazarlama onayının metni bütün formlarda tektir (vitrin.onay.pazarlama; bülten kaydı, kart 0112). */}
        <OnayKutusu
          name="pazarlamaIzni"
          etiket={doldur(metin("vitrin.kayit.pazarlamaIzni"), {
            onay: metin("vitrin.onay.pazarlama"),
          })}
        />
        {bekliyor ? <p role="status">{metin("vitrin.kayit.gonderiliyor")}</p> : null}
        <GonderDugmesi>{metin("vitrin.kayit.gonder")}</GonderDugmesi>
        <Baglanti href={vitrinAdresleri.giris}>{metin("vitrin.kayit.hesabinVarMi")}</Baglanti>
      </Form>
    </div>
  );
}
