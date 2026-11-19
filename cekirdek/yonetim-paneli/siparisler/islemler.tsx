"use client";
// Sipariş ayrıntısının komut çubuğundaki işlemleri (kart 0234, karar 0145): yalnız siparişin durumunda yapılabilen
// ve yöneticinin izni olan işlemler gelir (veri.ts). Havale onayı, hazırlamaya alma ve teslim onay penceresiyle
// sorulur (geri dönüşleri yoktur); kargoya verme ve kargo düzeltme yan pencerede firma ve takip numarası ister.
// İstek ekranın gördüğü durumu gönderir; arada durum değiştiyse sayfa yenilenir ve bildirilir. Asıl eylem en sondadır.
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereAltCubugu,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import type { SiparisDurumu, SiparisIslemi } from "../../kayitlar/siparis";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { doldur } from "../../moduller/eposta/sablon";
import { panelAdresi } from "../adresler";
import { EylemDugmesi } from "../eylem-dugmesi";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";

const hataMetni = (hata: PanelHatasi): MetinAnahtari => {
  if (hata.kod === "cakisma") return "yonetim.siparis.hata.cakisma";
  if (hata.kod === "is-kurali") return "yonetim.siparis.hata.gecis";
  if (hata.kod === "yetki") return "yonetim.siparis.hata.yetki";
  return "yonetim.siparis.hata.genel";
};

const basariMetinleri: Record<SiparisIslemi, MetinAnahtari> = {
  "havale-onayla": "yonetim.siparis.basari.havale-onayla",
  "hazirlamaya-al": "yonetim.siparis.basari.hazirlamaya-al",
  "kargoya-ver": "yonetim.siparis.basari.kargoya-ver",
  "kargo-duzelt": "yonetim.siparis.basari.kargo-duzelt",
  "teslim-edildi": "yonetim.siparis.basari.teslim-edildi",
};

// Onayla sorulan işlemlerin pencere metinleri.
const onaylar = {
  "havale-onayla": "havale",
  "hazirlamaya-al": "hazirla",
  "teslim-edildi": "teslim",
} as const;
type OnayliIslem = keyof typeof onaylar;

export function SiparisIslemleri({
  numara,
  durum,
  tutar,
  islemler,
  kargoFirmalari,
  kargo,
}: {
  numara: string;
  durum: SiparisDurumu;
  tutar: string;
  islemler: SiparisIslemi[];
  kargoFirmalari: { kimlik: string; ad: string }[];
  // Kargodaki siparişin bugünkü bilgisi (düzeltme formu onunla açılır); firma artık listede yoksa boş seçilir.
  kargo: { firma: string; takipNumarasi: string | null } | null;
}) {
  const metin = useMetin();
  const islem = usePanelIslemi(hataMetni);
  const [onay, setOnay] = useState<OnayliIslem | null>(null);
  const [kargoPenceresi, setKargoPenceresi] = useState<"kargoya-ver" | "kargo-duzelt" | null>(null);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setKargoPenceresi(null));
  if (islemler.length === 0) return null;

  const gonder = (secilen: SiparisIslemi, govde: Record<string, unknown> = {}) =>
    secilen === "havale-onayla"
      ? islem("siparis-havale-onayi", { numara, gorulenDurum: durum }, basariMetinleri[secilen])
      : islem(
          "siparis-islemi",
          { numara, islem: secilen, gorulenDurum: durum, ...govde },
          basariMetinleri[secilen],
          { formda: secilen === "kargoya-ver" || secilen === "kargo-duzelt" },
        );

  const onayMetni = onay === null ? null : onaylar[onay];
  return (
    <>
      {islemler.map((secilen, sira) => (
        <EylemDugmesi
          key={secilen}
          eylem={secilen}
          asil={sira === islemler.length - 1}
          onClick={() =>
            secilen === "kargoya-ver" || secilen === "kargo-duzelt"
              ? setKargoPenceresi(secilen)
              : setOnay(secilen)
          }
        />
      ))}
      <OnayPenceresi
        acik={onay !== null}
        acikDegisince={(acik) => (acik ? undefined : setOnay(null))}
        tur="birincil"
        baslik={onayMetni === null ? "" : metin(`yonetim.siparis.onay.${onayMetni}.baslik`)}
        aciklama={
          onayMetni === null
            ? ""
            : doldur(metin(`yonetim.siparis.onay.${onayMetni}.metin`), { numara, tutar })
        }
        onayEtiketi={onayMetni === null ? "" : metin(`yonetim.siparis.onay.${onayMetni}.dugme`)}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          if (onay !== null) await gonder(onay);
        }}
      />
      <YanPencere
        open={kargoPenceresi !== null}
        onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
      >
        {kargoPenceresi === null ? null : (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-form"
          >
            <YanPencereUstu>
              <YanPencereBasligi>
                {metin(
                  kargoPenceresi === "kargoya-ver"
                    ? "yonetim.siparis.pencere.kargoBaslik"
                    : "yonetim.siparis.pencere.kargoDuzeltBaslik",
                )}
              </YanPencereBasligi>
              <YanPencereAciklamasi>
                {metin("yonetim.siparis.pencere.kargoAciklamasi")}
              </YanPencereAciklamasi>
            </YanPencereUstu>
            {soru}
            <KargoFormu
              firmalar={kargoFirmalari}
              ilk={
                kargoPenceresi === "kargo-duzelt" && kargo !== null
                  ? {
                      firma: kargoFirmalari.find((firma) => firma.ad === kargo.firma)?.kimlik ?? "",
                      takipNumarasi: kargo.takipNumarasi ?? "",
                    }
                  : {
                      firma: kargoFirmalari.length === 1 ? (kargoFirmalari[0]?.kimlik ?? "") : "",
                      takipNumarasi: "",
                    }
              }
              degisince={degisince}
              vazgec={kapatmayiIste}
              gonder={async (form) => {
                const sonuc = await gonder(kargoPenceresi, {
                  kargo: {
                    firma: form.firma,
                    ...(form.takipNumarasi.trim() === ""
                      ? {}
                      : { takipNumarasi: form.takipNumarasi }),
                  },
                });
                if (sonuc.tamam) kapat();
                return sonuc;
              }}
            />
          </YanPencereIcerigi>
        )}
      </YanPencere>
    </>
  );
}

type KargoFormuDegeri = { firma: string; takipNumarasi: string };

function KargoFormu({
  firmalar,
  ilk,
  degisince,
  vazgec,
  gonder,
}: {
  firmalar: { kimlik: string; ad: string }[];
  ilk: KargoFormuDegeri;
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  gonder: (form: KargoFormuDegeri) => Promise<{ tamam: true } | ({ tamam: false } & PanelHatasi)>;
}) {
  const metin = useMetin();
  const [form, setForm] = useState(ilk);
  const [hatalar, setHatalar] = useState<Partial<Record<keyof KargoFormuDegeri, string>>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const gonderiliyor = useRef(false);
  const degistir = (alan: keyof KargoFormuDegeri, deger: string) => {
    const yeni = { ...form, [alan]: deger };
    setForm(yeni);
    degisince(yeni.firma !== ilk.firma || yeni.takipNumarasi !== ilk.takipNumarasi);
  };
  if (firmalar.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Uyari tur="uyari">{metin("yonetim.siparis.pencere.firmaYok")}</Uyari>
        <Baglanti href={`${panelAdresi}/siparis-ayarlari`} gorunum="sade" className="w-fit">
          {metin("yonetim.siparis.pencere.firmaYokBaglanti")}
        </Baglanti>
      </div>
    );
  }
  const kaydet = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    if (form.firma === "") {
      setHatalar({ firma: metin("yonetim.siparis.hata.firma") });
      document.querySelector<HTMLElement>('[data-alan="kargo-firmasi"]')?.focus();
      return;
    }
    gonderiliyor.current = true;
    const sonuc = await gonder(form);
    gonderiliyor.current = false;
    if (sonuc.tamam) return;
    const takip = sonuc.ayrinti.some((sorun) => sorun.alan.startsWith("kargo.takipNumarasi"));
    const firma = sonuc.ayrinti.some((sorun) => sorun.kod === "firma-yok");
    if (takip || firma) {
      setHatalar({
        ...(takip ? { takipNumarasi: metin("yonetim.siparis.hata.takipNumarasi") } : {}),
        ...(firma ? { firma: metin("yonetim.siparis.hata.firmaYok") } : {}),
      });
      setGenelHata(null);
      // Odak hatalı ilk alana.
      document
        .querySelector<HTMLElement>(
          firma ? '[data-alan="kargo-firmasi"]' : '[name="takip-numarasi"]',
        )
        ?.focus();
      return;
    }
    setHatalar({});
    setGenelHata(metin(hataMetni(sonuc)));
  };
  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={kaydet}
      className="flex flex-col gap-4"
    >
      {genelHata === null ? null : <Uyari tur="tehlike">{genelHata}</Uyari>}
      <FormAlani
        etiket={metin("yonetim.siparis.pencere.firma")}
        {...(hatalar.firma === undefined ? {} : { hata: hatalar.firma })}
      >
        {(alan) => (
          <SecimKutusu value={form.firma} onValueChange={(deger) => degistir("firma", deger)}>
            <SecimTetikleyici {...alan} data-alan="kargo-firmasi">
              <SecimDegeri placeholder={metin("yonetim.siparis.pencere.firmaSec")} />
            </SecimTetikleyici>
            <SecimListesi>
              {firmalar.map((firma) => (
                <SecimOgesi key={firma.kimlik} value={firma.kimlik}>
                  {firma.ad}
                </SecimOgesi>
              ))}
            </SecimListesi>
          </SecimKutusu>
        )}
      </FormAlani>
      <FormAlani
        etiket={metin("yonetim.siparis.pencere.takip")}
        aciklama={metin("yonetim.siparis.pencere.takipAciklamasi")}
        {...(hatalar.takipNumarasi === undefined ? {} : { hata: hatalar.takipNumarasi })}
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            name="takip-numarasi"
            autoComplete="off"
            spellCheck={false}
            value={form.takipNumarasi}
            onChange={(olay) => degistir("takipNumarasi", olay.target.value)}
          />
        )}
      </FormAlani>
      <YanPencereAltCubugu>
        <Dugme tur="sade" onClick={vazgec}>
          {metin("ortak.islem.vazgec")}
        </Dugme>
        <GonderDugmesi>{metin("yonetim.siparis.pencere.kaydet")}</GonderDugmesi>
      </YanPencereAltCubugu>
    </Form>
  );
}
