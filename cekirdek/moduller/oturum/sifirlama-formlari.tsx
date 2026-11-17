"use client";
// "Şifremi unuttum" ve "Yeni şifre belirle" formları (kart 0034, karar 0052). Vitrin ve panel aynı formu kendi
// adresleriyle kullanır. Şemalar uçla ortaktır.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import { sifreSifirlamaAyari, sifreSiniri } from "../../kayitlar/oturum";
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../eposta/sablon";
import { useRobotluGonderim } from "../robot-korumasi/istemci";
import { sifirlamaFormuSemasi, sifreYenileSemasi } from "./semalar";
import { anahtarParametresi, sifreYenilendiParametresi } from "./sifirlama-adresleri";

// Anahtar adresten silinir, sekme kapanana kadar burada durur: sayfa yenilenince bağlantı "geçersiz" görünmesin.
const anahtarYeri = "sifre-sifirlama-anahtari";
const depodan = <Sonuc,>(is: (depo: Storage) => Sonuc): Sonuc | null => {
  try {
    return is(window.sessionStorage);
  } catch {
    // Tarayıcı depoyu kapatmış olabilir: yenilemede bağlantı yeniden açılır.
    return null;
  }
};

// Adresteki anahtar öncedir: yeni bağlantı eskisinin yerine geçer. Biçimi bozuk anahtar bağlantı hatasıdır.
const anahtariOku = (): string | null => {
  const adresteki = new URLSearchParams(window.location.hash.slice(1)).get(anahtarParametresi);
  if (window.location.hash !== "") {
    // Anahtar adres çubuğunda ve tarayıcı geçmişinde kalmasın.
    window.history.replaceState(null, "", window.location.pathname);
  }
  if (adresteki !== null) depodan((depo) => depo.setItem(anahtarYeri, adresteki));
  const anahtar = adresteki ?? depodan((depo) => depo.getItem(anahtarYeri));
  return sifreYenileSemasi.shape.anahtar.safeParse(anahtar).success ? anahtar : null;
};

type OrtakOzellikler = { className: string; girisAdresi: string };

export function SifremiUnuttumFormu({
  className,
  girisAdresi,
  istekUcu,
}: OrtakOzellikler & { istekUcu: string }) {
  const metin = useMetin();
  const robotluGonder = useRobotluGonderim();
  const [alanHatasi, setAlanHatasi] = useState<string | undefined>();
  const [hata, setHata] = useState<string | null>(null);
  const [durum, setDurum] = useState<"bos" | "gidiyor" | "gitti">("bos");
  const gonderiliyor = useRef(false);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    // İkinci tıklama dikkate alınmaz.
    if (gonderiliyor.current) return;
    setHata(null);
    const girdi = sifirlamaFormuSemasi.safeParse({
      eposta: new FormData(olay.currentTarget).get("eposta"),
    });
    if (!girdi.success) {
      setAlanHatasi(metin("ortak.sifirlama.hataEposta"));
      return;
    }
    setAlanHatasi(undefined);
    gonderiliyor.current = true;
    setDurum("gidiyor");
    try {
      const yanit = await robotluGonder(istekUcu, girdi.data);
      if (yanit.ok) {
        setDurum("gitti");
        return;
      }
      setHata(
        metin(
          yanit.status === hataKodlari["istek-siniri"]
            ? "ortak.sifirlama.hataSinir"
            : "ortak.sifirlama.hataGenel",
        ),
      );
    } catch {
      setHata(metin("ortak.sifirlama.hataGenel"));
    } finally {
      gonderiliyor.current = false;
    }
    setDurum("bos");
  };

  if (durum === "gitti") {
    return (
      <>
        <p role="status">
          {doldur(metin("ortak.sifirlama.gonderildi"), {
            dakika: String(sifreSifirlamaAyari.gecerlilikSaniye / 60),
          })}
        </p>
        <Baglanti href={girisAdresi}>{metin("ortak.sifirlama.girisDon")}</Baglanti>
      </>
    );
  }
  return (
    <Form
      className={className}
      onSubmit={gonder}
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
    >
      <p>{metin("ortak.sifirlama.istekAciklama")}</p>
      {hata === null ? null : <Uyari tur="tehlike">{hata}</Uyari>}
      <FormAlani
        etiket={metin("ortak.sifirlama.eposta")}
        {...(alanHatasi === undefined ? {} : { hata: alanHatasi })}
      >
        {(alan) => (
          <GirisAlani {...alan} name="eposta" type="email" autoComplete="username" required />
        )}
      </FormAlani>
      {durum === "gidiyor" ? <p role="status">{metin("ortak.sifirlama.gonderiliyor")}</p> : null}
      <GonderDugmesi>{metin("ortak.sifirlama.gonder")}</GonderDugmesi>
      <Baglanti href={girisAdresi}>{metin("ortak.sifirlama.girisDon")}</Baglanti>
    </Form>
  );
}

export function SifreYenileFormu({
  className,
  girisAdresi,
  sifremiUnuttumAdresi,
  yenileUcu,
}: OrtakOzellikler & { sifremiUnuttumAdresi: string; yenileUcu: string }) {
  const metin = useMetin();
  const enKisa = { enKisa: String(sifreSiniri.enKisa) };
  // Sunucuda çizilirken adresin # sonrası bilinmez: anahtar kod yüklenince okunur. O zamana kadar form görünür,
  // düğmesi kapalıdır; JavaScript kapalıysa Form nedenini söyler.
  const [anahtar, setAnahtar] = useState<string | null | undefined>(undefined);
  const [alanHatasi, setAlanHatasi] = useState<string | undefined>();
  const [hata, setHata] = useState<"baglanti" | "sinir" | "genel" | null>(null);
  const gonderiliyor = useRef(false);

  useEffect(() => {
    const oku = () => {
      setAnahtar(anahtariOku());
      setHata(null);
    };
    oku();
    // Aynı sekmeye yeni bağlantı yapıştırılırsa sayfa yeniden yüklenmez.
    window.addEventListener("hashchange", oku);
    return () => window.removeEventListener("hashchange", oku);
  }, []);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    setHata(null);
    const girdi = sifreYenileSemasi.safeParse({
      anahtar,
      sifre: new FormData(olay.currentTarget).get("sifre"),
    });
    if (!girdi.success) {
      setAlanHatasi(doldur(metin("ortak.sifirlama.hataSifre"), enKisa));
      return;
    }
    setAlanHatasi(undefined);
    gonderiliyor.current = true;
    try {
      const yanit = await kapiyaIstek(yenileUcu, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(girdi.data),
      });
      if (yanit.ok) {
        depodan((depo) => depo.removeItem(anahtarYeri));
        window.location.assign(`${girisAdresi}?${sifreYenilendiParametresi}=1`);
        return;
      }
      if (yanit.status === hataKodlari["is-kurali"]) {
        depodan((depo) => depo.removeItem(anahtarYeri));
        setHata("baglanti");
      } else if (yanit.status === hataKodlari["istek-siniri"]) setHata("sinir");
      else setHata("genel");
    } catch {
      setHata("genel");
    } finally {
      gonderiliyor.current = false;
    }
  };

  if (anahtar === null || hata === "baglanti") {
    return (
      <>
        <Uyari tur="tehlike">{metin("ortak.sifirlama.hataBaglanti")}</Uyari>
        <Baglanti href={sifremiUnuttumAdresi}>{metin("ortak.sifirlama.yeniBaglanti")}</Baglanti>
      </>
    );
  }
  return (
    <Form
      className={className}
      onSubmit={gonder}
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
    >
      {hata === "sinir" ? <Uyari tur="tehlike">{metin("ortak.sifirlama.hataSinir")}</Uyari> : null}
      {hata === "genel" ? <Uyari tur="tehlike">{metin("ortak.sifirlama.hataGenel")}</Uyari> : null}
      <FormAlani
        etiket={metin("ortak.sifirlama.sifre")}
        aciklama={doldur(metin("ortak.sifirlama.sifreAciklama"), enKisa)}
        {...(alanHatasi === undefined ? {} : { hata: alanHatasi })}
      >
        {(alan) => (
          <GirisAlani {...alan} name="sifre" type="password" autoComplete="new-password" required />
        )}
      </FormAlani>
      <GonderDugmesi>{metin("ortak.sifirlama.yenileGonder")}</GonderDugmesi>
    </Form>
  );
}
