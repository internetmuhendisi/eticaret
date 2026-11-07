"use client";
// Müşteri kayıt formu (kart 0033, karar 0051). Şema uçla ortaktır. Robot sorusu form açılınca arkada çözülür,
// müşteri bir şey yapmaz. Her cevap bir kez geçer: gönderimden sonra yenisi hazırlanır.
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../bilesenler/form/form";
import { FormAlani } from "../../bilesenler/form/form-alani";
import { GirisAlani } from "../../bilesenler/form/giris-alani";
import { OnayKutusu } from "../../bilesenler/form/onay-kutusu";
import { Uyari } from "../../bilesenler/form/uyari";
import { hataKodlari } from "../kayitlar/kapi";
import { sifreSiniri } from "../kayitlar/oturum";
import { useMetin } from "../metinler/istemci-metni";
import { doldur } from "../moduller/eposta/sablon";
import { kayitFormuSemasi } from "../moduller/musteri/semalar";
import { robotCevabiAl } from "../moduller/robot-korumasi/istemci";
import { vitrinAdresleri } from "./adresler";
import { stil } from "./stil";

const kayitUcu = "/kapi/herkese-acik/musteri-kayit";

type AlanHatalari = Partial<Record<"eposta" | "sifre" | "uyelikOnayi" | "kvkkOnayi", string>>;
type GenelHata = "kayitli" | "sinir" | "genel";

export function KayitFormu() {
  const metin = useMetin();
  const [alanHatalari, setAlanHatalari] = useState<AlanHatalari>({});
  const [genelHata, setGenelHata] = useState<GenelHata | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  const robotCevabi = useRef<Promise<string | null> | null>(null);
  const formYeri = useRef<HTMLDivElement>(null);
  const enKisa = { enKisa: String(sifreSiniri.enKisa) };

  useEffect(() => {
    robotCevabi.current = robotCevabiAl();
  }, []);

  // Klavyeyle dolduran kişi hatanın olduğu alana gider.
  useEffect(() => {
    if (Object.keys(alanHatalari).length === 0) return;
    formYeri.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [alanHatalari]);

  // Arkadaki çözüm tutmadıysa (ağ hatası, süre) gönderirken bir kez daha denenir.
  const siradakiCevap = async () => {
    const hazir = robotCevabi.current;
    robotCevabi.current = robotCevabiAl();
    return (await hazir) ?? robotCevabiAl();
  };

  const istekGonder = async (girdi: object) =>
    fetch(kayitUcu, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...girdi, robotCevabi: await siradakiCevap() }),
    });

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
      let yanit = await istekGonder(girdi.data);
      // Soru süresi dolduysa ya da site yeniden başladıysa müşteri fark etmeden bir kez daha denenir.
      if (yanit.status === hataKodlari["robot-dogrulamasi"]) yanit = await istekGonder(girdi.data);
      if (yanit.ok) {
        window.location.assign(vitrinAdresleri.anasayfa);
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
          <Uyari>
            <p>{metin("vitrin.kayit.hataKayitli")}</p>
            <Link className={stil.baglanti} href={vitrinAdresleri.giris}>
              {metin("vitrin.kayit.girisBaglanti")}
            </Link>
          </Uyari>
        ) : null}
        {genelHata === "sinir" ? <Uyari>{metin("vitrin.kayit.hataSinir")}</Uyari> : null}
        {genelHata === "genel" ? <Uyari>{metin("vitrin.kayit.hataGenel")}</Uyari> : null}
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
            <Link className={stil.baglanti} href={vitrinAdresleri.uyelikSozlesmesi} target="_blank">
              {metin("vitrin.kayit.uyelikBaglanti")}
            </Link>
          }
        />
        <OnayKutusu
          name="kvkkOnayi"
          etiket={metin("vitrin.kayit.kvkkOnayi")}
          hata={alanHatalari.kvkkOnayi}
          ek={
            <Link className={stil.baglanti} href={vitrinAdresleri.kvkkAydinlatma} target="_blank">
              {metin("vitrin.kayit.kvkkBaglanti")}
            </Link>
          }
        />
        <OnayKutusu name="pazarlamaIzni" etiket={metin("vitrin.kayit.pazarlamaIzni")} />
        {bekliyor ? <p role="status">{metin("vitrin.kayit.gonderiliyor")}</p> : null}
        <GonderDugmesi>{metin("vitrin.kayit.gonder")}</GonderDugmesi>
        <Link className={stil.baglanti} href={vitrinAdresleri.giris}>
          {metin("vitrin.kayit.hesabinVarMi")}
        </Link>
      </Form>
    </div>
  );
}
