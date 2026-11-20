"use client";
// Stoğa gelince haber ver formu (kart 0144, karar 0117; Canlı Çarşı taslağının "haber-ver" kutusu). Ürün sayfasının
// eklenti yuvasında, stok yazısının altında durur ve yalnız seçili birim talep alınabilirse görünür (sunucu hangi
// birimlerin alınabildiğini verir). Seçim değişince form o birime göre baştan kurulur.
//
// - Giriş yapmış müşteri e-posta yazmaz: hesabının adresi yazılır, "Haber ver" müşteri ucuna gider.
// - Üye olmayan müşteri e-postasını yazar; istek robot korumalıdır ve ertelenmiştir (sayfa açılınca soru istenmez).
// - Mağaza sahibi üye olmayana kapattıysa giriş bağlantısı görünür; girişten sonra aynı sayfaya dönülür.
// - Onay kutusu yoktur (kullanıcı kararı): KVKK aydınlatma bağlantısı ve adresin yalnız bu bildirim için
//   kullanıldığı yazar.
// - Başarıda kutu teşekkür yazısına döner, odak ona geçer. Katalogdaki örnek kipte istek gitmez.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart, KartAciklamasi, KartBasligi } from "../../../bilesenler/parcalar/kart";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { kapiyaIstek } from "../../kapi/istemci";
import { hataKodlari } from "../../kayitlar/kapi";
import { doldur } from "../../metinler/doldur";
import { useMetin } from "../../metinler/istemci-metni";
import { useRobotluGonderim } from "../../moduller/robot-korumasi/istemci";
import { girisAdresiDonuslu, vitrinAdresleri } from "../../vitrin/adresler";
import { useHesapDurumu } from "../../vitrin/hesap-durumu";
import { useSeciliBirim } from "../../vitrin/urun-sayfasi/secili-birim";
import { stokBildirimiFormuSemasi } from "./semalar";

const herkeseAcikUc = "/kapi/herkese-acik/stok-bildirimi";
const musteriUcu = "/kapi/musteri/stok-bildirimi";

type Sonuc = "tamam" | "giris" | "stokta" | "sinir" | "genel";

const hataMetinleri = {
  stokta: "eklenti.stokBildirimi.form.hataStokta",
  sinir: "eklenti.stokBildirimi.form.hataSinir",
  genel: "eklenti.stokBildirimi.form.hataGenel",
} as const;

export function StokBildirimiFormu({
  birimler,
  uyeOlmayan,
  ornek = false,
}: {
  // Talep alınabilir birimler (sunucuda servisle bulunur).
  birimler: readonly string[];
  // Üye olmayan müşteri talep bırakabilir mi (mağaza sahibinin ayarı).
  uyeOlmayan: boolean;
  // Katalogdaki örnek: hesap sorulmaz, istek gitmez.
  ornek?: boolean;
}) {
  const birim = useSeciliBirim();
  if (birim === undefined || !birimler.includes(birim)) return null;
  // Birim değişince form baştan kurulur: başka birimin sonucu ve hatası kalmaz.
  return <BirimFormu key={birim} birim={birim} uyeOlmayan={uyeOlmayan} ornek={ornek} />;
}

function BirimFormu({
  birim,
  uyeOlmayan,
  ornek,
}: {
  birim: string;
  uyeOlmayan: boolean;
  ornek: boolean;
}) {
  const metin = useMetin();
  const hesap = useHesapDurumu(!ornek);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [epostaHatasi, setEpostaHatasi] = useState<string | undefined>();
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  const robotluGonder = useRobotluGonderim({ ertele: true });
  const tamamYazisi = useRef<HTMLParagraphElement>(null);
  const formYeri = useRef<HTMLDivElement>(null);
  const baslikKimligi = `stok-bildirimi-${birim}`;
  // Girişten sonra dönülecek adres: seçimli ürün sayfası. Sunucuda ve ilk çizimde ana sayfadır (hidrasyon aynı kalır).
  const [donus, setDonus] = useState<string>(vitrinAdresleri.anasayfa);
  useEffect(() => {
    setDonus(`${window.location.pathname}${window.location.search}`);
  }, []);

  useEffect(() => {
    if (sonuc === "tamam") tamamYazisi.current?.focus();
  }, [sonuc]);
  useEffect(() => {
    if (epostaHatasi !== undefined) {
      formYeri.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [epostaHatasi]);

  const yanitiIsle = (yanit: Response) => {
    if (yanit.ok) setSonuc("tamam");
    else if (yanit.status === hataKodlari["oturum-yok"]) setSonuc("giris");
    else if (yanit.status === hataKodlari["is-kurali"]) setSonuc("stokta");
    else if (yanit.status === hataKodlari["istek-siniri"]) setSonuc("sinir");
    else setSonuc("genel");
  };

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    setSonuc(null);
    let istek: () => Promise<Response>;
    if (hesap.tur === "girisli") {
      istek = () =>
        kapiyaIstek(musteriUcu, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ birim }),
        });
    } else {
      const girdi = stokBildirimiFormuSemasi.safeParse({
        eposta: new FormData(olay.currentTarget).get("eposta"),
      });
      if (!girdi.success) {
        setEpostaHatasi(metin("eklenti.stokBildirimi.form.hataEposta"));
        return;
      }
      setEpostaHatasi(undefined);
      istek = () => robotluGonder(herkeseAcikUc, { birim, eposta: girdi.data.eposta });
    }
    if (ornek) return;
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      yanitiIsle(await istek());
    } catch {
      setSonuc("genel");
    } finally {
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  const girisBaglantisi = () => {
    return (
      <p>
        {metin("eklenti.stokBildirimi.form.girisGerekli")}{" "}
        <Baglanti href={girisAdresiDonuslu(donus)} className="font-kalin">
          {metin("eklenti.stokBildirimi.form.girisBaglantisi")}
        </Baglanti>
      </p>
    );
  };

  const icerik = () => {
    if (sonuc === "tamam") {
      return (
        <p ref={tamamYazisi} tabIndex={-1} role="status" className="font-kalin">
          {metin("eklenti.stokBildirimi.form.tamam")}
        </p>
      );
    }
    // Hesap sorulurken bir şey çizilmez: girişli müşteriye e-posta alanı, girişsize hesap adresi gösterilmesin.
    if (hesap.tur === "bilinmiyor" && !ornek) return null;
    if ((hesap.tur !== "girisli" && !uyeOlmayan) || sonuc === "giris") return girisBaglantisi();
    return (
      <div ref={formYeri}>
        <Form
          onSubmit={gonder}
          kodGerekliMetni={metin("ortak.form.kodGerekli")}
          yukleniyorMetni={metin("ortak.form.yukleniyor")}
          className="flex flex-col gap-3"
        >
          {sonuc === null ? null : <Uyari tur="tehlike">{metin(hataMetinleri[sonuc])}</Uyari>}
          <div className="flex flex-wrap items-end gap-2">
            {hesap.tur === "girisli" ? (
              <p className="min-w-0 flex-1 wrap-anywhere">
                {doldur(metin("eklenti.stokBildirimi.form.girisli"), { eposta: hesap.eposta })}
              </p>
            ) : (
              <div className="min-w-0 flex-1 basis-48">
                <FormAlani
                  etiket={metin("eklenti.stokBildirimi.form.eposta")}
                  {...(epostaHatasi === undefined ? {} : { hata: epostaHatasi })}
                >
                  {(alan) => (
                    <GirisAlani
                      {...alan}
                      name="eposta"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  )}
                </FormAlani>
              </div>
            )}
            <GonderDugmesi tur="ikincil">
              {metin("eklenti.stokBildirimi.form.gonder")}
            </GonderDugmesi>
          </div>
          {bekliyor ? (
            <p role="status">{metin("eklenti.stokBildirimi.form.gonderiliyor")}</p>
          ) : null}
          <p className="text-kucuk text-soluk-yazi">
            {metin("eklenti.stokBildirimi.form.kullanim")}{" "}
            <Baglanti href={vitrinAdresleri.kvkkAydinlatma} target="_blank">
              {metin("vitrin.kayit.kvkkBaglanti")}
            </Baglanti>
          </p>
        </Form>
      </div>
    );
  };

  return (
    <Kart className="gap-3 p-4 tablet:p-4" aria-labelledby={baslikKimligi} role="region">
      <KartBasligi duzey={2} id={baslikKimligi} className="font-baslik font-baslik-kalinligi">
        {metin("eklenti.stokBildirimi.form.baslik")}
      </KartBasligi>
      <KartAciklamasi>{metin("eklenti.stokBildirimi.form.aciklama")}</KartAciklamasi>
      {icerik()}
    </Kart>
  );
}
