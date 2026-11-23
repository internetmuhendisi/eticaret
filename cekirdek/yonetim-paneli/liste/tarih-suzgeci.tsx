"use client";
// Liste motorunun tarih süzgeci (kart 0267; taslak: planlar/tasarim-yonu/panel.html, "Tam sipariş listesi"). Araç
// şeridinde "Tarih" düğmesi açılır paneli açar: hazır aralıklar (Bugün, Son 7 gün, Son 30 gün) ve "Tarih seç" ile
// iki gün. "Uygula" adresi değiştirir, "Temizle" süzgeci kaldırır. Günler sitenin saat dilimiyle sayılır, iki gün de
// dahildir (sunucu çevirir). Gün alanları alt alta durur: yan yana sığmıyor, gün kesiliyordu (taslakla
// karşılaştırma). Hata alanın altında yazar, odak hatalı alana gider; panel kapanınca odak düğmeye döner.
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
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { takvimGunuMu } from "../../metinler/bicimleyici";
import { usePanelMetni } from "../../metinler/panel-metni";
import { type TarihHaziri, tarihAraligiDegeri, tarihDegeriniCoz } from "./tanim";

const ozel = "ozel";

export function TarihSuzgeci({
  ad,
  hazirlar,
  secili,
  degistir,
}: {
  // Süzgecin adı: düğmenin yazısı ve panelin adı ("Tarih").
  ad: string;
  // Tanımın hazır aralıkları, sırasıyla.
  hazirlar: readonly string[];
  // Adresteki değer (geçerli olduğu tanımla denetlenmiş) ya da yok.
  secili: string | undefined;
  // Yeni değer; null süzgeci kaldırır.
  degistir: (deger: string | null) => void;
}) {
  const metin = usePanelMetni();
  const [acik, setAcik] = useState(false);
  const cozulen = secili === undefined ? undefined : tarihDegeriniCoz(secili);
  // Panel her açılışta adresteki değerle başlar.
  const baslangicSecimi = cozulen === undefined ? "" : cozulen.tur === "hazir" ? cozulen.kod : ozel;
  const [secim, setSecim] = useState(baslangicSecimi);
  const [baslangic, setBaslangic] = useState(
    cozulen?.tur === "aralik" ? (cozulen.baslangic ?? "") : "",
  );
  const [bitis, setBitis] = useState(cozulen?.tur === "aralik" ? (cozulen.bitis ?? "") : "");
  const [hata, setHata] = useState<{ alan: "baslangic" | "bitis"; metin: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);

  const acikDegisince = (yeni: boolean) => {
    if (yeni) {
      setSecim(baslangicSecimi);
      setBaslangic(cozulen?.tur === "aralik" ? (cozulen.baslangic ?? "") : "");
      setBitis(cozulen?.tur === "aralik" ? (cozulen.bitis ?? "") : "");
      setHata(null);
    }
    setAcik(yeni);
  };

  const hataGoster = (alan: "baslangic" | "bitis", yazi: string) => {
    setHata({ alan, metin: yazi });
    form.current?.querySelector<HTMLInputElement>(`input[name="${alan}"]`)?.focus();
  };

  const uygula = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (secim === "") {
      setAcik(false);
      degistir(null);
      return;
    }
    if (secim !== ozel) {
      setAcik(false);
      degistir(secim);
      return;
    }
    if (baslangic !== "" && !takvimGunuMu(baslangic)) {
      hataGoster("baslangic", metin("yonetim.liste.tarih.hata.gecersiz"));
      return;
    }
    if (bitis !== "" && !takvimGunuMu(bitis)) {
      hataGoster("bitis", metin("yonetim.liste.tarih.hata.gecersiz"));
      return;
    }
    if (baslangic === "" && bitis === "") {
      hataGoster("baslangic", metin("yonetim.liste.tarih.hata.bos"));
      return;
    }
    if (baslangic !== "" && bitis !== "" && baslangic > bitis) {
      hataGoster("bitis", metin("yonetim.liste.tarih.hata.sira"));
      return;
    }
    setAcik(false);
    degistir(tarihAraligiDegeri(baslangic || null, bitis || null));
  };

  const hazirAdi = (kod: string) => metin(`yonetim.liste.tarih.hazir.${kod as TarihHaziri}`);

  return (
    <AcilirPanel open={acik} onOpenChange={acikDegisince}>
      <AcilirPanelTetikleyici asChild>
        <Dugme tur="cerceveli" className="px-3">
          <Ikon ad="takvim" />
          {ad}
          {secili === undefined ? null : <Rozet tur="ikincil">{String(1)}</Rozet>}
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
            baslik={<span className="font-kalin">{ad}</span>}
            etiket={metin("yonetim.liste.tarih.aralik")}
            ogeler={[...hazirlar, ozel].map((kod) => ({
              deger: kod,
              ad: kod === ozel ? metin("yonetim.liste.tarih.ozel") : hazirAdi(kod),
            }))}
            deger={secim === "" ? undefined : secim}
            onDegerDegisti={(yeni) => {
              setSecim(yeni);
              setHata(null);
            }}
            secilemezEki=""
          />
          {secim === ozel ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <FormAlani
                  etiket={metin("yonetim.liste.tarih.baslangic")}
                  {...(hata?.alan === "baslangic" ? { hata: hata.metin } : {})}
                >
                  {(alan) => (
                    <GirisAlani
                      {...alan}
                      name="baslangic"
                      type="date"
                      value={baslangic}
                      onChange={(olay) => {
                        setBaslangic(olay.target.value);
                        setHata(null);
                      }}
                    />
                  )}
                </FormAlani>
                <FormAlani
                  etiket={metin("yonetim.liste.tarih.bitis")}
                  {...(hata?.alan === "bitis" ? { hata: hata.metin } : {})}
                >
                  {(alan) => (
                    <GirisAlani
                      {...alan}
                      name="bitis"
                      type="date"
                      value={bitis}
                      onChange={(olay) => {
                        setBitis(olay.target.value);
                        setHata(null);
                      }}
                    />
                  )}
                </FormAlani>
              </div>
              <p className="text-kucuk text-soluk-yazi">{metin("yonetim.liste.tarih.aciklama")}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <GonderDugmesi tur="birincil">{metin("yonetim.liste.tarih.uygula")}</GonderDugmesi>
            <Dugme
              tur="sade"
              onClick={() => {
                setAcik(false);
                degistir(null);
              }}
            >
              {metin("yonetim.liste.tarih.temizle")}
            </Dugme>
          </div>
        </Form>
      </AcilirPanelIcerigi>
    </AcilirPanel>
  );
}
