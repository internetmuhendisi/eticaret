"use client";
// "Yorum yaz" düğmesi ve yorum formu (kart 0139, karar 0109). Sayfa çizilirken müşterinin oturumu okunamaz
// (karar 0039): düğme basılınca müşteri ucu sorulur.
// - Girişsiz müşteri giriş sayfasına gider, girişten sonra yorumlara döner.
// - Yazabilirse form pencerede açılır (telefonda tam ekran). Yazamıyorsa nedeni düğmenin yanında yazar
//   ("yalnız satın alanlar", "yorumunuzu yazdınız").
// - Form şeması uçla ortaktır; robot koruması form açılınca arkada hazırlanır. Gönderilince pencere kapanır,
//   teşekkür yazısı düğmenin yanında duyurulur.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import {
  Pencere,
  PencereAciklamasi,
  PencereBasligi,
  PencereIcerigi,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { hataKodlari } from "../../kayitlar/kapi";
import { yorumSinirlari } from "../../kayitlar/yorum";
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { useRobotluGonderim } from "../../moduller/robot-korumasi/istemci";
import { yorumFormuSemasi } from "../../moduller/yorum/semalar";
import { girisAdresiDonuslu } from "../adresler";

const izinUcu = "/kapi/musteri/yorum-izni";
const yorumUcu = "/kapi/musteri/yorum";

type Durum =
  | "bos"
  | "soruluyor"
  | "gonderildi"
  | "satin-alma-gerekli"
  | "yorum-yazildi"
  | "urun-yok"
  | "hata";
type AlanHatalari = Partial<Record<"puan" | "ad" | "baslik" | "metin", string>>;
type GenelHata = "sinir" | "genel" | "yorum-yazildi" | "satin-alma-gerekli";

const puanlar = Array.from(
  { length: yorumSinirlari.enYuksekPuan - yorumSinirlari.enDusukPuan + 1 },
  (_, i) => yorumSinirlari.enYuksekPuan - i,
);

function YorumFormu({ urun, onGonderildi }: { urun: string; onGonderildi: () => void }) {
  const metin = useMetin();
  const [puan, setPuan] = useState<number | undefined>(undefined);
  const [alanHatalari, setAlanHatalari] = useState<AlanHatalari>({});
  const [genelHata, setGenelHata] = useState<GenelHata | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const gonderiliyor = useRef(false);
  const robotluGonder = useRobotluGonderim();
  const formYeri = useRef<HTMLDivElement>(null);
  const sinir = (enCok: number) => ({ enCok: String(enCok) });

  // Klavyeyle dolduran kişi hatanın olduğu ilk alana gider.
  useEffect(() => {
    if (Object.keys(alanHatalari).length === 0) return;
    const ilk = formYeri.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    // Puan grubunun kendisi odak almaz, ilk seçeneği alır.
    (ilk?.getAttribute("role") === "radiogroup"
      ? ilk.querySelector<HTMLElement>('[role="radio"]')
      : ilk
    )?.focus();
  }, [alanHatalari]);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    const veri = new FormData(olay.currentTarget);
    const girdi = yorumFormuSemasi.safeParse({
      urun,
      puan,
      baslik: veri.get("baslik") ?? "",
      metin: veri.get("metin") ?? "",
      ad: veri.get("ad") ?? "",
    });
    setGenelHata(null);
    if (!girdi.success) {
      const alanlar = new Set(girdi.error.issues.map(({ path }) => path[0]));
      setAlanHatalari({
        ...(alanlar.has("puan") ? { puan: metin("vitrin.yorum.hataPuan") } : {}),
        ...(alanlar.has("ad") ? { ad: metin("vitrin.yorum.hataAd") } : {}),
        ...(alanlar.has("baslik")
          ? { baslik: doldur(metin("vitrin.yorum.hataBaslik"), sinir(yorumSinirlari.baslik)) }
          : {}),
        ...(alanlar.has("metin")
          ? { metin: doldur(metin("vitrin.yorum.hataMetin"), sinir(yorumSinirlari.metin)) }
          : {}),
      });
      return;
    }
    setAlanHatalari({});
    gonderiliyor.current = true;
    setBekliyor(true);
    try {
      const yanit = await robotluGonder(yorumUcu, girdi.data);
      if (yanit.ok) {
        onGonderildi();
        return;
      }
      if (yanit.status === hataKodlari["istek-siniri"]) setGenelHata("sinir");
      else if (yanit.status === hataKodlari.cakisma) setGenelHata("yorum-yazildi");
      else if (yanit.status === hataKodlari["is-kurali"]) setGenelHata("satin-alma-gerekli");
      else setGenelHata("genel");
    } catch {
      setGenelHata("genel");
    } finally {
      gonderiliyor.current = false;
      setBekliyor(false);
    }
  };

  const genelMetin: Record<GenelHata, string> = {
    sinir: metin("vitrin.yorum.hataSinir"),
    genel: metin("vitrin.yorum.hataGenel"),
    "yorum-yazildi": metin("vitrin.yorum.yorumYazildi"),
    "satin-alma-gerekli": metin("vitrin.yorum.satinAlmaGerekli"),
  };

  return (
    <div ref={formYeri}>
      <Form
        className="flex flex-col gap-4"
        onSubmit={gonder}
        kodGerekliMetni={metin("ortak.form.kodGerekli")}
        yukleniyorMetni={metin("ortak.form.yukleniyor")}
      >
        {genelHata === null ? null : <Uyari tur="tehlike">{genelMetin[genelHata]}</Uyari>}
        <div className="flex flex-col gap-1">
          <SecenekGrubu
            baslik={
              puan === undefined ? (
                metin("vitrin.yorum.puanAlani")
              ) : (
                <>
                  {metin("vitrin.yorum.puanSecili")}
                  <strong className="font-en-kalin">
                    {doldur(metin("vitrin.yorum.puanSecenegi"), { puan: String(puan) })}
                  </strong>
                </>
              )
            }
            etiket={metin("vitrin.yorum.puanAlani")}
            ogeler={puanlar.map((deger) => ({
              deger: String(deger),
              ad: doldur(metin("vitrin.yorum.puanSecenegi"), { puan: String(deger) }),
            }))}
            deger={puan === undefined ? undefined : String(puan)}
            onDegerDegisti={(deger) => setPuan(Number(deger))}
            secilemezEki=""
            {...(alanHatalari.puan === undefined ? {} : { hata: alanHatalari.puan })}
          />
        </div>
        <FormAlani
          etiket={metin("vitrin.yorum.adAlani")}
          aciklama={metin("vitrin.yorum.adAciklamasi")}
          {...(alanHatalari.ad === undefined ? {} : { hata: alanHatalari.ad })}
        >
          {(alan) => (
            <GirisAlani
              {...alan}
              name="ad"
              autoComplete="name"
              maxLength={yorumSinirlari.ad}
              required
            />
          )}
        </FormAlani>
        <FormAlani
          etiket={metin("vitrin.yorum.baslikAlani")}
          {...(alanHatalari.baslik === undefined ? {} : { hata: alanHatalari.baslik })}
        >
          {(alan) => <GirisAlani {...alan} name="baslik" maxLength={yorumSinirlari.baslik} />}
        </FormAlani>
        <FormAlani
          etiket={metin("vitrin.yorum.metinAlani")}
          aciklama={doldur(metin("vitrin.yorum.metinAciklamasi"), sinir(yorumSinirlari.metin))}
          {...(alanHatalari.metin === undefined ? {} : { hata: alanHatalari.metin })}
        >
          {(alan) => (
            <UzunMetinAlani
              {...alan}
              name="metin"
              rows={5}
              maxLength={yorumSinirlari.metin}
              required
            />
          )}
        </FormAlani>
        {bekliyor ? <p role="status">{metin("vitrin.yorum.gonderiliyor")}</p> : null}
        <GonderDugmesi>{metin("vitrin.yorum.gonder")}</GonderDugmesi>
      </Form>
    </div>
  );
}

export function YorumYaz({ urun, urunAdi }: { urun: string; urunAdi: string }) {
  const metin = useMetin();
  const [acik, setAcik] = useState(false);
  const [durum, setDurum] = useState<Durum>("bos");

  const ac = async () => {
    if (durum === "soruluyor") return;
    setDurum("soruluyor");
    try {
      const yanit = await fetch(`${izinUcu}?${new URLSearchParams({ urun })}`, {
        cache: "no-store",
      });
      if (yanit.status === hataKodlari["oturum-yok"]) {
        const { pathname, search } = window.location;
        window.location.assign(girisAdresiDonuslu(`${pathname}${search}#yorumlar`));
        return;
      }
      if (yanit.status === hataKodlari.bulunamadi) {
        setDurum("urun-yok");
        return;
      }
      if (!yanit.ok) {
        setDurum("hata");
        return;
      }
      const { veri } = (await yanit.json()) as { veri: { izin: string } };
      if (veri.izin === "yazabilir") {
        setDurum("bos");
        setAcik(true);
      } else if (veri.izin === "satin-alma-gerekli" || veri.izin === "yorum-yazildi") {
        setDurum(veri.izin);
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  };

  const durumMetni: Partial<Record<Durum, string>> = {
    gonderildi: metin("vitrin.yorum.gonderildi"),
    "satin-alma-gerekli": metin("vitrin.yorum.satinAlmaGerekli"),
    "yorum-yazildi": metin("vitrin.yorum.yorumYazildi"),
    "urun-yok": metin("vitrin.yorum.hataUrun"),
    hata: metin("vitrin.yorum.hataGenel"),
  };
  const yazi = durumMetni[durum];

  return (
    <div className="flex flex-col items-end gap-2">
      <Dugme tur="cerceveli" onClick={ac} aria-haspopup="dialog">
        {metin("vitrin.yorum.yorumYaz")}
      </Dugme>
      <p role="status" className="max-w-form text-right text-kucuk text-soluk-yazi empty:hidden">
        {yazi ?? ""}
      </p>
      <Pencere open={acik} onOpenChange={setAcik}>
        <PencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} genislik="orta">
          <PencereUstu>
            <PencereBasligi>{metin("vitrin.yorum.pencereBasligi")}</PencereBasligi>
            <PencereAciklamasi>
              {doldur(metin("vitrin.yorum.pencereAciklamasi"), { urun: urunAdi })}
            </PencereAciklamasi>
          </PencereUstu>
          <YorumFormu
            urun={urun}
            onGonderildi={() => {
              setAcik(false);
              setDurum("gonderildi");
            }}
          />
        </PencereIcerigi>
      </Pencere>
    </div>
  );
}
