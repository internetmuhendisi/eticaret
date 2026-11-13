"use client";
// Bölümün düzenleme formu ve kaydı (kart 0142): görünüm seçimi ve tariften çıkan alanlar (BolumFormu), "Kaydet ve
// yayınla". Vitrin bölümleri ekranının penceresi ve Slider kısayolunun sayfası aynı formu kullanır. Kayıt
// kullananın verdiği işle yapılır (ekleme ya da değişiklik ucu); sunucunun alan hataları alanların altında, öteki
// hatalar formun üstünde görünür. Kaydedilmemiş değişiklik varken sayfadan çıkmak isteyene tarayıcı uyarır.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { YanPencereAltCubugu } from "../../../bilesenler/parcalar/yan-pencere";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import type { BolumDegerleri, BolumTarifi } from "../../vitrin/bolum-kutuphanesi/tarif";
import { BolumFormu, type BolumFormuSecenekleri } from "../bolum-formu";
import type { PanelHatasi, PanelSonucu } from "../panel-istegi";
import { alanHatalari, islemHatasiMetni } from "./hatalar";

export type BolumKaydi = { gorunum: string; degerler: BolumDegerleri };

// Yeni bölümün ilk değerleri: en az öğe isteyen listeler o kadar boş öğeyle açılır (yeni slider bir slaytla).
export const yeniDegerler = (tarif: BolumTarifi): BolumDegerleri =>
  Object.fromEntries(
    Object.entries(tarif.alanlar).flatMap(([kod, alan]) =>
      alan.tur === "liste" && alan.enAz > 0
        ? [[kod, Array.from({ length: alan.enAz }, () => ({}))]]
        : [],
    ),
  );

export function BolumDuzenleyici({
  tarif,
  ilk,
  secenekler,
  kaydet,
  kaydedince,
  vazgec,
  degisince,
}: {
  tarif: BolumTarifi;
  // Bölümün bugünkü görünümü ve değerleri; yeni bölümde ilk görünüm ve boş değerler.
  ilk: BolumKaydi;
  secenekler: BolumFormuSecenekleri;
  kaydet: (kayit: BolumKaydi) => Promise<PanelSonucu<unknown>>;
  kaydedince: () => void;
  // Verilirse formun altında Vazgeç durur (pencere).
  vazgec?: () => void;
  // Kaydedilmemiş değişiklik olup olmadığı: pencere kapatılmadan önce sorar.
  degisince?: (degisti: boolean) => void;
}) {
  const metin = useMetin();
  const [gorunum, setGorunum] = useState(ilk.gorunum);
  const degerler = useRef<BolumDegerleri>(ilk.degerler);
  const [degisti, setDegisti] = useState(false);
  const [hatalar, setHatalar] = useState<Record<string, MetinAnahtari>>({});
  const [genelHata, setGenelHata] = useState<MetinAnahtari | null>(null);
  const gonderiliyor = useRef(false);
  const uyariRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: kullananın verdiği işlev her çizimde yenidir.
  useEffect(() => degisince?.(degisti), [degisti]);

  useEffect(() => {
    if (!degisti) return;
    const uyar = (olay: BeforeUnloadEvent) => olay.preventDefault();
    window.addEventListener("beforeunload", uyar);
    return () => window.removeEventListener("beforeunload", uyar);
  }, [degisti]);

  useEffect(() => {
    if (genelHata !== null) uyariRef.current?.focus();
  }, [genelHata]);

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    // İkinci tıklama dikkate alınmaz.
    if (gonderiliyor.current) return;
    gonderiliyor.current = true;
    const sonuc = await kaydet({ gorunum, degerler: degerler.current });
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      setDegisti(false);
      setHatalar({});
      setGenelHata(null);
      kaydedince();
      return;
    }
    const hata: PanelHatasi = sonuc;
    setHatalar(alanHatalari(hata));
    setGenelHata(islemHatasiMetni(hata));
  };

  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex flex-col gap-5"
    >
      {genelHata === null ? null : (
        <div ref={uyariRef} tabIndex={-1}>
          <Uyari tur="tehlike">{metin(genelHata)}</Uyari>
        </div>
      )}
      {tarif.gorunumler.length > 1 ? (
        <SecenekGrubu
          baslik={metin("yonetim.bolumler.form.gorunum")}
          etiket={metin("yonetim.bolumler.form.gorunum")}
          ogeler={tarif.gorunumler.map((secenek) => ({
            deger: secenek.kod,
            ad: metin(secenek.ad),
          }))}
          deger={gorunum}
          onDegerDegisti={(yeni) => {
            setGorunum(yeni);
            setDegisti(true);
            degisince?.(true);
          }}
          secilemezEki=""
        />
      ) : null}
      <BolumFormu
        tarif={tarif}
        ilkDegerler={ilk.degerler}
        secenekler={secenekler}
        hatalar={Object.fromEntries(
          Object.entries(hatalar).map(([yol, anahtar]) => [yol, metin(anahtar)]),
        )}
        degisince={(yeni) => {
          degerler.current = yeni;
          setDegisti(true);
          // Çizimi beklemeden: hemen basılan Escape de sorsun.
          degisince?.(true);
        }}
      />
      <YanPencereAltCubugu>
        {vazgec === undefined ? null : (
          <Dugme tur="sade" onClick={vazgec}>
            {metin("ortak.islem.vazgec")}
          </Dugme>
        )}
        <GonderDugmesi>{metin("yonetim.bolumler.form.kaydet")}</GonderDugmesi>
      </YanPencereAltCubugu>
    </Form>
  );
}
