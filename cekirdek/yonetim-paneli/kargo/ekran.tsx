"use client";
// Kargo ekranı (kart 0212, karar 0135; kart 0211'in taslağı): teslimat bölgesinin kartında kargo ücreti, ücretsiz kargo
// sınırı, sınırın hangi tutara baktığı ve kargoya verme süresi. Tutarlar sitenin para biçimiyle yazılır, sunucuda
// okunur; okunamayan alan kendi hatasıyla döner, form değişmez. Kaydedilince hemen yayınlanır, değişen her ayar
// değişiklik kaydına girer. Değiştirme izni olmayan yönetici alanları okur, düğmeleri görmez.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { YanPencereAltCubugu } from "../../../bilesenler/parcalar/yan-pencere";
import { type UcretsizKargoTutari, ucretsizKargoTutarlari } from "../../kayitlar/sepet";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import type { KargoEkraniVerisi, KargoFormu } from "./veri";

type Alan = keyof KargoFormu;

const alanHatasiMetni: Record<string, MetinAnahtari> = {
  "tutar-okunamadi": "yonetim.kargo.hata.tutarOkunamadi",
  "tutar-sinir-disi": "yonetim.kargo.hata.tutarSinirDisi",
  "gun-gecersiz": "yonetim.kargo.hata.gunGecersiz",
};

// Alana bağlanmayan hata (yetki, ağ, sunucu) formun üstünde yazılır.
const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki" ? "yonetim.kargo.hata.yetki" : "yonetim.kargo.hata.genel";

const sinirTutariAdlari: Record<UcretsizKargoTutari, MetinAnahtari> = {
  "indirimden-sonra": "yonetim.kargo.indirimdenSonra",
  "indirimden-once": "yonetim.kargo.indirimdenOnce",
};

export function KargoEkrani({ veri, izinli }: { veri: KargoEkraniVerisi; izinli: boolean }) {
  const metin = useMetin();
  const islem = usePanelIslemi(genelHataMetni);
  // Kayıttan sonra sayfa yenilenir: sunucunun yazdığı hâl (örneğin "60" yerine "60,00") kaydedilmemiş değişiklik
  // yoksa formun yeni başlangıcıdır; arada yazılan değer ezilmez (kart 0223).
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<KargoFormu>(veri.form);
  const [hatalar, setHatalar] = useState<Partial<Record<Alan, MetinAnahtari>>>({});
  const [genelHata, setGenelHata] = useState<MetinAnahtari | null>(null);
  const gonderiliyor = useRef(false);
  const uyariRef = useRef<HTMLDivElement>(null);

  // Kaydedilmemiş değişiklikle sayfadan çıkarken tarayıcı sorar.
  useEffect(() => {
    if (!degisti) return;
    const uyar = (olay: BeforeUnloadEvent) => olay.preventDefault();
    window.addEventListener("beforeunload", uyar);
    return () => window.removeEventListener("beforeunload", uyar);
  }, [degisti]);

  useEffect(() => {
    if (genelHata !== null) uyariRef.current?.focus();
  }, [genelHata]);

  const degistir = (alan: Alan, deger: string) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    if (gonderiliyor.current) return;
    gonderiliyor.current = true;
    const gonderilen = form;
    const sonuc = await islem("kargo-ayarlari", gonderilen, "yonetim.kargo.kaydedildi", {
      formda: true,
    });
    gonderiliyor.current = false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      setHatalar({});
      setGenelHata(null);
      return;
    }
    const alanlar = Object.fromEntries(
      sonuc.ayrinti.flatMap(({ alan, kod }) => {
        const anahtar = alanHatasiMetni[kod];
        return anahtar !== undefined && alan in veri.form ? [[alan, anahtar]] : [];
      }),
    ) as Partial<Record<Alan, MetinAnahtari>>;
    setHatalar(alanlar);
    setGenelHata(Object.keys(alanlar).length > 0 ? null : genelHataMetni(sonuc));
    // Hatalı ilk alana odak.
    const ilk = (Object.keys(veri.form) as Alan[]).find((alan) => alanlar[alan] !== undefined);
    if (ilk !== undefined) document.querySelector<HTMLInputElement>(`[name="${ilk}"]`)?.focus();
  };

  const tutarAlani = (
    alan: "kargoUcreti" | "ucretsizKargoSiniri",
    etiket: MetinAnahtari,
    aciklama: MetinAnahtari,
  ) => (
    <FormAlani
      etiket={metin(etiket)}
      aciklama={metin(aciklama)}
      {...(hatalar[alan] === undefined ? {} : { hata: metin(hatalar[alan]) })}
    >
      {(baglanti) => (
        // Para simgesi alanın içinde, yazının önünde ya da sonunda (taslak); ekran okuyucu etiketi okur.
        <span className="relative flex items-center">
          <GirisAlani
            {...baglanti}
            name={alan}
            inputMode="decimal"
            autoComplete="off"
            value={form[alan]}
            disabled={!izinli}
            onChange={(olay) => degistir(alan, olay.target.value)}
            className={veri.simgeYeri === "basta" ? "pl-10" : "pr-10"}
          />
          <span
            aria-hidden="true"
            className={sinif(
              "pointer-events-none absolute text-soluk-yazi",
              veri.simgeYeri === "basta" ? "left-4" : "right-4",
            )}
          >
            {veri.simge}
          </span>
        </span>
      )}
    </FormAlani>
  );

  return (
    <Form
      kodGerekliMetni={metin("ortak.form.kodGerekli")}
      yukleniyorMetni={metin("ortak.form.yukleniyor")}
      onSubmit={gonder}
      className="flex max-w-metin flex-col gap-5"
    >
      {genelHata === null ? null : (
        <div ref={uyariRef} tabIndex={-1}>
          <Uyari tur="tehlike">{metin(genelHata)}</Uyari>
        </div>
      )}
      <Kart className="flex flex-col gap-5 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">{veri.bolge}</h2>
        <div className="grid gap-5 tablet:grid-cols-2">
          {tutarAlani(
            "kargoUcreti",
            "yonetim.kargo.ucret",
            veri.fiyatGirisi === "vergi-dahil"
              ? "yonetim.kargo.ucretAciklamasi.dahil"
              : "yonetim.kargo.ucretAciklamasi.haric",
          )}
          {tutarAlani(
            "ucretsizKargoSiniri",
            "yonetim.kargo.sinir",
            "yonetim.kargo.sinirAciklamasi",
          )}
        </div>
        <SecenekGrubu
          baslik={metin("yonetim.kargo.sinirTutari")}
          etiket={metin("yonetim.kargo.sinirTutari")}
          ogeler={ucretsizKargoTutarlari.map((deger) => ({
            deger,
            ad: metin(sinirTutariAdlari[deger]),
            ...(izinli ? {} : { secilemez: true }),
          }))}
          deger={form.ucretsizKargoTutari}
          onDegerDegisti={(deger) => {
            if (izinli) degistir("ucretsizKargoTutari", deger);
          }}
          secilemezEki=""
        />
        <FormAlani
          etiket={metin("yonetim.kargo.sure")}
          aciklama={metin("yonetim.kargo.sureAciklamasi")}
          {...(hatalar.kargoyaVermeSuresi === undefined
            ? {}
            : { hata: metin(hatalar.kargoyaVermeSuresi) })}
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              name="kargoyaVermeSuresi"
              inputMode="numeric"
              autoComplete="off"
              value={form.kargoyaVermeSuresi}
              disabled={!izinli}
              onChange={(olay) => degistir("kargoyaVermeSuresi", olay.target.value)}
              className="tablet:max-w-form"
            />
          )}
        </FormAlani>
        {izinli ? (
          <YanPencereAltCubugu className="bottom-0 mx-0 px-0">
            <Dugme
              tur="sade"
              disabled={!degisti}
              onClick={() => {
                vazgec();
                setHatalar({});
                setGenelHata(null);
              }}
            >
              {metin("ortak.islem.vazgec")}
            </Dugme>
            <GonderDugmesi>{metin("yonetim.kargo.kaydet")}</GonderDugmesi>
          </YanPencereAltCubugu>
        ) : null}
      </Kart>
    </Form>
  );
}
