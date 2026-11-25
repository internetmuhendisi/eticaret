"use client";
// Ekibe davetin kabul formu (kart 0275, karar 0179; taslak: "Davet kabulü"). Panel giriş sayfasının görünüşündedir.
// Bağlantının anahtarı adresin # sonrasındadır: sunucuda çizilirken bilinmez, kod yüklenince okunur, adresten silinir ve
// sekme kapanana kadar sekmenin deposunda durur (sayfa yenilenince bağlantı "geçersiz" görünmesin). Davetin e-postası ve
// rolleri okunur; kişi adını ve şifresini koyar, ardından iki aşamalı girişin kurulum ekranına geçer.
//
// Kullanılmış, süresi dolmuş, geri alınmış ve uydurma bağlantı aynı "Bu davet geçerli değil" cevabını alır.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../bilesenler/form/form";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../bilesenler/parcalar/giris-alani";
import { Uyari } from "../../bilesenler/parcalar/uyari";
import { YukleniyorGostergesi } from "../../bilesenler/parcalar/yukleniyor";
import { kapiyaIstek } from "../kapi/istemci";
import { hataKodlari } from "../kayitlar/kapi";
import { davetAyari, sifreSiniri } from "../kayitlar/oturum";
import { doldur } from "../metinler/doldur";
import type { MetinAnahtari } from "../metinler/metin";
import { usePanelMetni } from "../metinler/panel-metni";
import { davetAnahtariSemasi, davetKabulSemasi } from "../moduller/ekip/semalar";
import { anahtarParametresi } from "../moduller/oturum/sifirlama-adresleri";
import { girisAdresi, kurulumAdresi } from "./adresler";
import { stil } from "./stil";

const okumaUcu = "/kapi/herkese-acik/yonetici-davet-oku";
const kabulUcu = "/kapi/herkese-acik/yonetici-davet-kabul";
const anahtarYeri = "yonetici-davet-anahtari";

const depodan = <Sonuc,>(is: (depo: Storage) => Sonuc): Sonuc | null => {
  try {
    return is(window.sessionStorage);
  } catch {
    // Tarayıcı depoyu kapatmış olabilir: yenilemede bağlantı yeniden açılır.
    return null;
  }
};

const anahtariOku = (): string | null => {
  const adresteki = new URLSearchParams(window.location.hash.slice(1)).get(anahtarParametresi);
  if (window.location.hash !== "") {
    // Anahtar adres çubuğunda ve tarayıcı geçmişinde kalmasın.
    window.history.replaceState(null, "", window.location.pathname);
  }
  if (adresteki !== null) depodan((depo) => depo.setItem(anahtarYeri, adresteki));
  const anahtar = adresteki ?? depodan((depo) => depo.getItem(anahtarYeri));
  return davetAnahtariSemasi.safeParse(anahtar).success ? anahtar : null;
};

const json = (govde: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(govde),
});

type Davet = { eposta: string; roller: string[] };
type Durum =
  | { tur: "okunuyor" }
  | { tur: "gecersiz" }
  | { tur: "hata"; metin: MetinAnahtari }
  | { tur: "form"; anahtar: string; davet: Davet };

// gec: kurulum ekranına geçiş (testte sahte; jsdom gezinmeyi yapamaz).
export function DavetKabulFormu({
  magaza,
  gec = (adres) => window.location.assign(adres),
}: {
  magaza: string;
  gec?: (adres: string) => void;
}) {
  const metin = usePanelMetni();
  const [durum, setDurum] = useState<Durum>({ tur: "okunuyor" });
  const [alanHatalari, setAlanHatalari] = useState<{ ad?: string; sifre?: string }>({});
  const [hata, setHata] = useState<string | null>(null);
  const gonderiliyor = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const siniri = { enKisa: String(sifreSiniri.enKisa), enUzun: String(sifreSiniri.enUzun) };

  useEffect(() => {
    const anahtar = anahtariOku();
    if (anahtar === null) {
      setDurum({ tur: "gecersiz" });
      return;
    }
    let iptal = false;
    void (async () => {
      try {
        const yanit = await kapiyaIstek(okumaUcu, json({ anahtar }));
        if (iptal) return;
        if (yanit.ok) {
          const { veri } = (await yanit.json()) as { veri: Davet };
          setDurum({ tur: "form", anahtar, davet: veri });
        } else if (yanit.status === hataKodlari["is-kurali"]) {
          depodan((depo) => depo.removeItem(anahtarYeri));
          setDurum({ tur: "gecersiz" });
        } else {
          setDurum({
            tur: "hata",
            metin:
              yanit.status === hataKodlari["istek-siniri"]
                ? "yonetim.davet.hataSinir"
                : "yonetim.davet.hataGenel",
          });
        }
      } catch {
        if (!iptal) setDurum({ tur: "hata", metin: "yonetim.davet.hataGenel" });
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  if (durum.tur === "okunuyor") {
    return (
      <>
        <h1>{metin("yonetim.davet.baslik")}</h1>
        <YukleniyorGostergesi etiket={metin("yonetim.davet.okunuyor")} />
      </>
    );
  }
  if (durum.tur === "gecersiz") {
    return (
      <>
        <h1>{metin("yonetim.davet.gecersizBaslik")}</h1>
        <p>{metin("yonetim.davet.gecersizAciklama")}</p>
        <Baglanti href={girisAdresi}>{metin("yonetim.davet.girisGit")}</Baglanti>
      </>
    );
  }
  if (durum.tur === "hata") {
    return (
      <>
        <h1>{metin("yonetim.davet.baslik")}</h1>
        <Uyari tur="tehlike">{metin(durum.metin)}</Uyari>
      </>
    );
  }

  const { anahtar, davet } = durum;
  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    setHata(null);
    const veri = new FormData(olay.currentTarget);
    const girdi = davetKabulSemasi.safeParse({
      anahtar,
      ad: veri.get("ad"),
      sifre: veri.get("sifre"),
    });
    if (!girdi.success) {
      const yollar = new Set(girdi.error.issues.map((sorun) => String(sorun.path[0])));
      setAlanHatalari({
        ...(yollar.has("ad")
          ? {
              ad: doldur(metin("yonetim.davet.hataAd"), {
                enUzun: String(davetAyari.adEnUzun),
              }),
            }
          : {}),
        ...(yollar.has("sifre") ? { sifre: doldur(metin("yonetim.davet.hataSifre"), siniri) } : {}),
      });
      // Odak ilk hatalı alana geçer.
      formRef.current
        ?.querySelector<HTMLInputElement>(`[name="${yollar.has("ad") ? "ad" : "sifre"}"]`)
        ?.focus();
      return;
    }
    setAlanHatalari({});
    gonderiliyor.current = true;
    try {
      const yanit = await kapiyaIstek(kabulUcu, json(girdi.data));
      if (yanit.ok) {
        depodan((depo) => depo.removeItem(anahtarYeri));
        // Oturum açılmadı: ara adım çerezde, kurulum ekranı telefonu bağlatır (karar 0044).
        gec(kurulumAdresi);
        return;
      }
      if (yanit.status === hataKodlari["is-kurali"]) {
        const govde = (await yanit.json().catch(() => null)) as {
          hata?: { ayrinti?: { kod?: string }[] };
        } | null;
        if (govde?.hata?.ayrinti?.some((sorun) => sorun.kod === "hesap-var")) {
          setHata(metin("yonetim.davet.hataHesapVar"));
        } else {
          depodan((depo) => depo.removeItem(anahtarYeri));
          setDurum({ tur: "gecersiz" });
        }
      } else if (yanit.status === hataKodlari["istek-siniri"]) {
        setHata(metin("yonetim.davet.hataSinir"));
      } else {
        setHata(metin("yonetim.davet.hataGenel"));
      }
    } catch {
      setHata(metin("yonetim.davet.hataGenel"));
    } finally {
      gonderiliyor.current = false;
    }
  };

  const rolAdlari = davet.roller
    .map((kod) => metin(`yonetim.rol.${kod}` as MetinAnahtari))
    .join(", ");
  return (
    <>
      <h1>{metin("yonetim.davet.baslik")}</h1>
      <p>{doldur(metin("yonetim.davet.aciklama"), { magaza, roller: rolAdlari })}</p>
      <Form
        ref={formRef}
        className={stil.form}
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
      >
        {hata === null ? null : <Uyari tur="tehlike">{hata}</Uyari>}
        <FormAlani
          etiket={metin("yonetim.davet.eposta")}
          aciklama={metin("yonetim.davet.epostaIpucu")}
        >
          {(alan) => (
            <GirisAlani
              {...alan}
              name="eposta"
              type="email"
              autoComplete="username"
              readOnly
              value={davet.eposta}
            />
          )}
        </FormAlani>
        <FormAlani
          etiket={metin("yonetim.davet.ad")}
          aciklama={metin("yonetim.davet.adIpucu")}
          {...(alanHatalari.ad === undefined ? {} : { hata: alanHatalari.ad })}
        >
          {(alan) => (
            <GirisAlani
              {...alan}
              name="ad"
              autoComplete="name"
              maxLength={davetAyari.adEnUzun}
              required
            />
          )}
        </FormAlani>
        <FormAlani
          etiket={metin("yonetim.davet.sifre")}
          aciklama={doldur(metin("yonetim.davet.sifreIpucu"), siniri)}
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
        <GonderDugmesi>{metin("yonetim.davet.gonder")}</GonderDugmesi>
        <p>{metin("yonetim.davet.sonrakiAdim")}</p>
      </Form>
    </>
  );
}
