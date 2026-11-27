"use client";
// Raporun dönem seçimi (kart 0317; taslak: planlar/tasarim-yonu/panel-2.html "Raporlar", tarih aralığı). Araç
// şeridindeki düğme açılır paneli açar: hazır dönemler, "Özel aralık" ile iki gün (ikisi de zorunlu, en çok
// raporSinirlari.enCokGun gün) ve "Önceki dönemle karşılaştır". "Uygula" adresi değiştirir; günler sitenin saat
// dilimiyle sayılır (sunucu çevirir). Liste motorunun tarih süzgecinden ayrıdır: rapor dönemi boş olamaz, kendi hazır
// dönemleri ve karşılaştırması vardır. Hata alanın altında yazar, odak hatalı alana gider; panel kapanınca odak
// düğmeye döner.
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import {
  AcilirPanel,
  AcilirPanelIcerigi,
  AcilirPanelTetikleyici,
} from "../../../bilesenler/parcalar/acilir-panel";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { raporHazirDonemleri, raporSinirlari } from "../../kayitlar/rapor";
import { takvimGunuMu } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { gunSayisi } from "../../moduller/rapor/donem";
import { raporAdresi } from "../adresler";
import { PanelIkon } from "../panel-ikon";

const ozel = "ozel";
type Alan = "baslangic" | "bitis";

export function DonemSecici({
  dugmeYazisi,
  hazirKod,
  baslangic,
  bitis,
  karsilastir,
}: {
  // Düğmede seçili dönem: "Son 30 gün: 29 Ekim – 27 Kasım 2026".
  dugmeYazisi: string;
  // Seçili hazır dönem; özel aralıkta yok.
  hazirKod: string | null;
  // Seçili dönemin günleri: özel aralığın alanları bunlarla başlar.
  baslangic: string;
  bitis: string;
  karsilastir: boolean;
}) {
  const metin = usePanelMetni();
  const yonlendirici = useRouter();
  const [acik, setAcik] = useState(false);
  const [secim, setSecim] = useState(hazirKod ?? ozel);
  const [ilk, setIlk] = useState(baslangic);
  const [son, setSon] = useState(bitis);
  const [kiyas, setKiyas] = useState(karsilastir);
  const [hata, setHata] = useState<{ alan: Alan; metin: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);

  // Panel her açılışta seçili dönemle başlar.
  const acikDegisince = (yeni: boolean) => {
    if (yeni) {
      setSecim(hazirKod ?? ozel);
      setIlk(baslangic);
      setSon(bitis);
      setKiyas(karsilastir);
      setHata(null);
    }
    setAcik(yeni);
  };

  const hataGoster = (alan: Alan, yazi: string) => {
    setHata({ alan, metin: yazi });
    form.current?.querySelector<HTMLInputElement>(`input[name="${alan}"]`)?.focus();
  };

  const git = (donem: string) => {
    setAcik(false);
    yonlendirici.push(raporAdresi(donem, kiyas));
  };

  const uygula = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (secim !== ozel) {
      git(secim);
      return;
    }
    // Tarayıcının gün alanı yarım girişte değer vermez: yarım giriş boş sayılmaz, hata verir.
    for (const [alan, deger] of [
      ["baslangic", ilk],
      ["bitis", son],
    ] as const) {
      const giris = form.current?.querySelector<HTMLInputElement>(`input[name="${alan}"]`);
      if (giris?.validity.badInput === true || (deger !== "" && !takvimGunuMu(deger))) {
        hataGoster(alan, metin("yonetim.rapor.hata.gecersiz"));
        return;
      }
      if (deger === "") {
        hataGoster(alan, metin("yonetim.rapor.hata.bos"));
        return;
      }
    }
    if (ilk > son) {
      hataGoster("bitis", metin("yonetim.rapor.hata.sira"));
      return;
    }
    if (gunSayisi({ baslangic: ilk, bitis: son }) > raporSinirlari.enCokGun) {
      hataGoster(
        "bitis",
        doldur(metin("yonetim.rapor.hata.uzun"), { gun: String(raporSinirlari.enCokGun) }),
      );
      return;
    }
    git(`${ilk}_${son}`);
  };

  const gunAlani = (alan: Alan, deger: string, degistir: (yeni: string) => void) => (
    <FormAlani
      etiket={metin(`yonetim.rapor.${alan}`)}
      {...(hata?.alan === alan ? { hata: hata.metin } : {})}
    >
      {(ozellikler) => (
        <GirisAlani
          {...ozellikler}
          name={alan}
          type="date"
          value={deger}
          onChange={(olay) => {
            degistir(olay.target.value);
            setHata(null);
          }}
        />
      )}
    </FormAlani>
  );

  const ad = metin("yonetim.rapor.donemSecimi");
  return (
    <AcilirPanel open={acik} onOpenChange={acikDegisince}>
      <AcilirPanelTetikleyici asChild>
        <Dugme tur="cerceveli" className="max-w-full shrink px-3 py-2 text-left">
          <PanelIkon ad="takvim" />
          {/* Telefonda dönemin yazısı alt satıra iner: düğme sayfayı yana kaydırmaz. */}
          <span className="min-w-0">{dugmeYazisi}</span>
          <Ikon ad="asagi" />
        </Dugme>
      </AcilirPanelTetikleyici>
      <AcilirPanelIcerigi aria-label={ad}>
        <Form
          kodGerekliMetni={metin("ortak.form.kodGerekli")}
          yukleniyorMetni={metin("ortak.form.yukleniyor")}
          ref={form}
          onSubmit={uygula}
          className="flex flex-col gap-3"
        >
          <SecenekGrubu
            baslik={<span className="font-kalin">{metin("yonetim.rapor.donem")}</span>}
            etiket={metin("yonetim.rapor.donem")}
            ogeler={[...raporHazirDonemleri, ozel].map((kod) => ({
              deger: kod,
              ad:
                kod === ozel
                  ? metin("yonetim.rapor.ozel")
                  : metin(`yonetim.rapor.hazir.${kod as (typeof raporHazirDonemleri)[number]}`),
            }))}
            deger={secim}
            onDegerDegisti={(yeni) => {
              setSecim(yeni);
              setHata(null);
            }}
            secilemezEki=""
          />
          {secim === ozel ? (
            <div className="flex flex-col gap-3">
              {gunAlani("baslangic", ilk, setIlk)}
              {gunAlani("bitis", son, setSon)}
            </div>
          ) : null}
          <OnayKutusu
            etiket={metin("yonetim.rapor.karsilastir")}
            checked={kiyas}
            onCheckedChange={(yeni) => setKiyas(yeni === true)}
          />
          <div className="flex flex-wrap gap-2">
            <GonderDugmesi tur="birincil">{metin("yonetim.rapor.uygula")}</GonderDugmesi>
          </div>
        </Form>
      </AcilirPanelIcerigi>
    </AcilirPanel>
  );
}
