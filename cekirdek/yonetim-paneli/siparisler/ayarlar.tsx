"use client";
// Sipariş ayarları ekranı (kart 0234): kargo firmaları. Firma komut çubuğundaki "Firma ekle" ya da satırdaki düzenle
// düğmesiyle yan pencerede yazılır (ad ve isteğe bağlı takip adresi); silme onay penceresiyle sorulur. Her değişiklik
// bütün listeyi ekranın gördüğü hâliyle (onceki) gönderir: arada liste değiştiyse sayfa yenilenir ve söylenir. Takip
// adresi sunucuda doğrulanır, hatası alanın altında yazar. Değiştirme izni olmayan yönetici yalnız listeyi görür.
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereAltCubugu,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { doldur } from "../../moduller/eposta/sablon";
import type { KargoFirmasi } from "../../moduller/siparis/ayarlar";
import { EylemDugmesi } from "../eylem-dugmesi";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";

const hataMetni = (hata: PanelHatasi): MetinAnahtari => {
  if (hata.kod === "cakisma") return "yonetim.siparisAyarlari.hata.cakisma";
  if (hata.kod === "yetki") return "yonetim.siparisAyarlari.hata.yetki";
  return "yonetim.siparisAyarlari.hata.genel";
};

type Pencere = { tur: "ekle" } | { tur: "duzenle"; firma: KargoFirmasi };

export function SiparisAyarlariEkrani({
  firmalar,
  izinli,
}: {
  firmalar: KargoFirmasi[];
  izinli: boolean;
}) {
  const metin = useMetin();
  const islem = usePanelIslemi(hataMetni);
  const [pencere, setPencere] = useState<Pencere | null>(null);
  const [silinecek, setSilinecek] = useState<KargoFirmasi | null>(null);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setPencere(null));
  const onceki = firmalar.map((firma) => firma.kimlik);
  const girdisi = (firma: KargoFirmasi) => ({
    kimlik: firma.kimlik,
    ad: firma.ad,
    ...(firma.takipAdresi === undefined ? {} : { takipAdresi: firma.takipAdresi }),
  });
  const kaydet = (yeniler: object[], basari: MetinAnahtari, formda = false) =>
    islem("siparis-ayarlari", { onceki, firmalar: yeniler }, basari, { formda });
  const duzenlenen = pencere?.tur === "duzenle" ? pencere.firma : undefined;

  return (
    <section aria-labelledby="kargo-firmalari" className="max-w-metin">
      <Kart className="gap-4 p-4 tablet:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="kargo-firmalari" className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("yonetim.siparisAyarlari.kargoFirmalari")}
            </h2>
            <p className="text-kucuk text-soluk-yazi">
              {metin("yonetim.siparisAyarlari.kargoAciklamasi")}
            </p>
          </div>
          {izinli ? (
            <EylemDugmesi
              eylem="ekle"
              ne={metin("yonetim.siparisAyarlari.firmaEkleNe")}
              onClick={() => setPencere({ tur: "ekle" })}
            />
          ) : null}
        </div>
        {firmalar.length === 0 ? (
          <BosHal
            ikon="kargo"
            duzey={3}
            baslik={metin("yonetim.siparisAyarlari.bos.baslik")}
            aciklama={metin("yonetim.siparisAyarlari.bos.metin")}
          />
        ) : (
          <ul
            aria-labelledby="kargo-firmalari"
            className="flex flex-col divide-y divide-kenar rounded-orta border border-kenar px-4"
          >
            {firmalar.map((firma) => (
              <li key={firma.kimlik}>
                <div className="flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-kalin wrap-anywhere">{firma.ad}</span>
                    <span className="text-kucuk text-soluk-yazi break-all">
                      {firma.takipAdresi ?? metin("yonetim.siparisAyarlari.takipYok")}
                    </span>
                  </span>
                  {izinli ? (
                    <span className="flex shrink-0 items-center">
                      <IkonDugmesi
                        ikon="duzenle"
                        etiket={doldur(metin("yonetim.siparisAyarlari.duzenle"), { ad: firma.ad })}
                        onClick={() => setPencere({ tur: "duzenle", firma })}
                      />
                      <IkonDugmesi
                        ikon="sil"
                        etiket={doldur(metin("yonetim.siparisAyarlari.sil"), { ad: firma.ad })}
                        onClick={() => setSilinecek(firma)}
                      />
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <YanPencere
          open={pencere !== null}
          onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}
        >
          {pencere === null ? null : (
            <YanPencereIcerigi
              kapatEtiketi={metin("ortak.parca.kapat")}
              className="tablet:max-w-form"
            >
              <YanPencereUstu>
                <YanPencereBasligi>
                  {metin(
                    duzenlenen === undefined
                      ? "yonetim.siparisAyarlari.yeniFirma"
                      : "yonetim.siparisAyarlari.firmayiDuzenle",
                  )}
                </YanPencereBasligi>
                <YanPencereAciklamasi>
                  {metin("yonetim.siparisAyarlari.formAciklamasi")}
                </YanPencereAciklamasi>
              </YanPencereUstu>
              {soru}
              <FirmaFormu
                key={duzenlenen?.kimlik ?? "yeni"}
                {...(duzenlenen === undefined ? {} : { firma: duzenlenen })}
                degisince={degisince}
                vazgec={kapatmayiIste}
                gonder={async (form) => {
                  const yeni = {
                    ad: form.ad,
                    ...(form.takipAdresi.trim() === "" ? {} : { takipAdresi: form.takipAdresi }),
                  };
                  const liste =
                    duzenlenen === undefined
                      ? [...firmalar.map(girdisi), yeni]
                      : firmalar.map((firma) =>
                          firma.kimlik === duzenlenen.kimlik
                            ? { kimlik: firma.kimlik, ...yeni }
                            : girdisi(firma),
                        );
                  const sonuc = await kaydet(
                    liste,
                    duzenlenen === undefined
                      ? "yonetim.siparisAyarlari.eklendi"
                      : "yonetim.siparisAyarlari.degisti",
                    true,
                  );
                  if (sonuc.tamam) kapat();
                  return sonuc;
                }}
                // Sunucunun alan yolu listedeki sırayı taşır: formun firması yeni firmada son sıradadır.
                sira={
                  duzenlenen === undefined
                    ? firmalar.length
                    : firmalar.findIndex((f) => f.kimlik === duzenlenen.kimlik)
                }
              />
            </YanPencereIcerigi>
          )}
        </YanPencere>
        <OnayPenceresi
          acik={silinecek !== null}
          acikDegisince={(acik) => (acik ? undefined : setSilinecek(null))}
          baslik={doldur(metin("yonetim.siparisAyarlari.silOnay.baslik"), {
            ad: silinecek?.ad ?? "",
          })}
          aciklama={metin("yonetim.siparisAyarlari.silOnay.metin")}
          onayEtiketi={metin("yonetim.siparisAyarlari.silOnay.sil")}
          vazgecEtiketi={metin("ortak.islem.vazgec")}
          onayla={async () => {
            if (silinecek === null) return;
            await kaydet(
              firmalar.filter((firma) => firma.kimlik !== silinecek.kimlik).map(girdisi),
              "yonetim.siparisAyarlari.silindi",
            );
          }}
        />
      </Kart>
    </section>
  );
}

type FirmaFormuDegeri = { ad: string; takipAdresi: string };

function FirmaFormu({
  firma,
  sira,
  degisince,
  vazgec,
  gonder,
}: {
  firma?: KargoFirmasi;
  sira: number;
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  gonder: (form: FirmaFormuDegeri) => Promise<{ tamam: true } | ({ tamam: false } & PanelHatasi)>;
}) {
  const metin = useMetin();
  const ilk = { ad: firma?.ad ?? "", takipAdresi: firma?.takipAdresi ?? "" };
  const [form, setForm] = useState(ilk);
  const [hatalar, setHatalar] = useState<Partial<Record<keyof FirmaFormuDegeri, string>>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const gonderiliyor = useRef(false);
  const degistir = (alan: keyof FirmaFormuDegeri, deger: string) => {
    const yeni = { ...form, [alan]: deger };
    setForm(yeni);
    degisince(yeni.ad !== ilk.ad || yeni.takipAdresi !== ilk.takipAdresi);
  };
  const kaydet = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    if (form.ad.trim() === "") {
      setHatalar({ ad: metin("yonetim.siparisAyarlari.hata.gerekli") });
      document.querySelector<HTMLInputElement>('[name="firma-ad"]')?.focus();
      return;
    }
    gonderiliyor.current = true;
    const sonuc = await gonder(form);
    gonderiliyor.current = false;
    if (sonuc.tamam) return;
    if (sonuc.ayrinti.some((sorun) => sorun.alan === `firmalar.${sira}.takipAdresi`)) {
      setHatalar({ takipAdresi: metin("yonetim.siparisAyarlari.hata.takipAdresi") });
      setGenelHata(null);
      document.querySelector<HTMLInputElement>('[name="firma-takip"]')?.focus();
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
        etiket={metin("yonetim.siparisAyarlari.ad")}
        {...(hatalar.ad === undefined ? {} : { hata: hatalar.ad })}
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            name="firma-ad"
            autoComplete="off"
            value={form.ad}
            onChange={(olay) => degistir("ad", olay.target.value)}
          />
        )}
      </FormAlani>
      <FormAlani
        etiket={metin("yonetim.siparisAyarlari.takipAdresi")}
        aciklama={metin("yonetim.siparisAyarlari.takipAciklamasi")}
        {...(hatalar.takipAdresi === undefined ? {} : { hata: hatalar.takipAdresi })}
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            name="firma-takip"
            type="url"
            autoComplete="off"
            spellCheck={false}
            value={form.takipAdresi}
            onChange={(olay) => degistir("takipAdresi", olay.target.value)}
          />
        )}
      </FormAlani>
      <YanPencereAltCubugu>
        <Dugme tur="sade" onClick={vazgec}>
          {metin("ortak.islem.vazgec")}
        </Dugme>
        <GonderDugmesi>{metin("yonetim.siparisAyarlari.kaydet")}</GonderDugmesi>
      </YanPencereAltCubugu>
    </Form>
  );
}
