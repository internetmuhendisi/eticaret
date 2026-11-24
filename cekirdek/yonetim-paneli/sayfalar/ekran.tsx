"use client";
// Sabit sayfanın ekranı (kart 0273; taslak: planlar/tasarim-yonu/panel.html, "Sayfa formu"): yeni sayfa ve var olan
// sayfa. Solda sayfa (başlık, adres adı, içerik, arama motoru açıklaması); sağda yayın durumu, bağlı olduğu menüler ve
// "Sayfayı kaldır". Tek form, "Kaydet" birlikte kaydeder; hata ve odak ortak form yapısındadır (karar 0159). Blog yazısı
// ekranının (blog/yazi-ekrani.tsx) yolundan gider.
//
// - Yeni sayfa yalnız başlıkla kaydedilebilir, taslak olarak başlar; kaydedilince sayfanın kendi ekranı açılır.
// - Değişiklikte yalnız değişen alanlar gider, ekranın gördüğü değişme anıyla (arada değişen sayfa çakışır).
// - "Menüye ekle" menüler ekranını öğe penceresi bu sayfa seçili açılmış olarak açar (menu.degistir izni olana).
// - Değiştirme izni olmayan yönetici alanları okur, düğmeleri görmez; silme ayrıca icerik.sil ister.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BicimliMetinAlani } from "../../../bilesenler/parcalar/bicimli-metin-alani";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import {
  type SabitSayfaDurumu,
  sabitSayfaDurumlari,
  sabitSayfaSinirlari,
} from "../../kayitlar/sayfa";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { sabitSayfaHataMetinleri } from "../../moduller/icerik/sayfa-semalari";
import { aciklamaBaglantisiGecerliMi } from "../../moduller/urun/aciklama-baglantisi";
import { kayitAdresleri } from "../../vitrin/adresler";
import { menuyeSayfaEkleAdresi, sayfaEkraniAdresi, sayfalarAdresi } from "../adresler";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { kodluAlanHatalari, kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { panelIstegi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import { menuYeriYazisi } from "./menu-yeri";
import type { SayfaEkraniVerisi, SayfaFormu } from "./veri";

const hataMetni = kodluHataMetni(sabitSayfaHataMetinleri);
const alanlar = ["baslik", "adresAdi", "icerik", "aciklama", "durum"] as const;
// Adres adı alanının öneki: vitrindeki adresin adsız hâli ("/sayfa/").
const kayitOneki = kayitAdresleri.sayfa("");

// Formun girdisi: yeni sayfada dolu alanlar, değişiklikte boş açıklama null.
const alanGirdisi = (form: SayfaFormu, yeni: boolean): Record<string, unknown> => {
  const alanlarin: Record<string, unknown> = {
    baslik: form.baslik,
    ...(yeni ? {} : { adresAdi: form.adresAdi }),
    icerik: form.icerik,
    aciklama: form.aciklama.trim() === "" ? (yeni ? undefined : null) : form.aciklama,
    durum: form.durum,
  };
  return Object.fromEntries(Object.entries(alanlarin).filter(([, deger]) => deger !== undefined));
};

// Değişiklikte yalnız sunucudan gelen hâline göre değişen alanlar gider: düzenleyicinin yeniden yazdığı içerik
// değişmeden kayda girmez.
export const sayfaGirdisi = (
  form: SayfaFormu,
  bilinen: SayfaFormu,
  yeni: boolean,
): Record<string, unknown> => {
  const yeniHali = alanGirdisi(form, yeni);
  if (yeni) return yeniHali;
  const eskiHali = alanGirdisi(bilinen, false);
  return Object.fromEntries(
    Object.entries(yeniHali).filter(
      ([alan, deger]) => JSON.stringify(deger) !== JSON.stringify(eskiHali[alan]),
    ),
  );
};

export function SayfaEkrani({ veri }: { veri: SayfaEkraniVerisi }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const islem = usePanelIslemi(hataMetni);
  const izinli = veri.izinler.degistir;
  const yeni = veri.kimlik === undefined;
  const { form, setForm, bilinen, degisti, kaydedildi, vazgec } = useSunucuFormu<SayfaFormu>(
    veri.form,
  );
  // Yeni sayfa kaydedilince sayfanın ekranına geçilir; geçiş bitene kadar ikinci kayıt yapılmaz.
  const acilan = useRef(false);
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const [silOnayi, setSilOnayi] = useState(false);
  // Ekranın gördüğü değişme anı: kayıttan dönen yeni an hemen kullanılır (blog yazısıyla aynı).
  const gorulen = useRef(veri.gorulen);
  useEffect(() => {
    gorulen.current = veri.gorulen;
  }, [veri.gorulen]);

  const degistir = <Alan extends keyof SayfaFormu>(alan: Alan, deger: SayfaFormu[Alan]) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const kaydet = async (): Promise<boolean> => {
    if (acilan.current) return false;
    const gonderilen = form;
    const sayfa = sayfaGirdisi(gonderilen, bilinen, yeni);
    const sonuc = await pf.isle(() =>
      yeni
        ? islem<{ kimlik?: string; gorulen?: string }>(
            "sayfa-ekle",
            { sayfa },
            "yonetim.sabitSayfa.eklendi",
            { formda: true },
          )
        : islem<{ kimlik?: string; gorulen?: string }>(
            "sayfa-degistir",
            { kimlik: veri.kimlik, gorulen: gorulen.current, sayfa },
            "yonetim.sabitSayfa.kaydedildi",
            { formda: true },
          ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      if (yeni) {
        acilan.current = true;
        router.replace(sayfaEkraniAdresi(sonuc.veri.kimlik ?? ""));
      } else {
        gorulen.current = sonuc.veri.gorulen;
      }
      return true;
    }
    const alanHatalari = kodluAlanHatalari(sabitSayfaHataMetinleri, sonuc, alanlar);
    pf.hatalariGoster(
      Object.fromEntries(
        Object.entries(alanHatalari).map(([alan, anahtar]) => [alan, metin(anahtar)]),
      ),
      Object.keys(alanHatalari).length > 0 ? [] : [metin(hataMetni(sonuc))],
    );
    return false;
  };

  const sil = async () => {
    if (veri.kimlik === undefined) return;
    // Sayfa yenilenmez (silinen sayfanın ekranı bulunamadı verirdi), listeye gidilir.
    const sonuc = await panelIstegi("sayfa-sil", { kimlik: veri.kimlik });
    if (sonuc.tamam) {
      bildirimGoster("basari", metin("yonetim.sabitSayfa.silindi"));
      router.push(sayfalarAdresi);
    } else {
      bildirimGoster("tehlike", metin(hataMetni(sonuc)));
    }
  };

  const metinAlani = (
    alan: "baslik" | "adresAdi",
    etiket: string,
    { aciklama, onEk }: { aciklama?: string; onEk?: string } = {},
  ) => (
    <PanelAlani ad={alan} etiket={etiket} aciklama={aciklama} zorunlu>
      {(baglanti) => (
        <span className="flex min-w-0 items-stretch">
          {onEk === undefined ? null : (
            <span
              aria-hidden="true"
              className="flex items-center rounded-l-kucuk border border-r-0 border-alan-kenari bg-yuzey px-3 text-soluk-yazi"
            >
              {onEk}
            </span>
          )}
          <GirisAlani
            {...baglanti}
            name={alan}
            autoComplete="off"
            value={form[alan]}
            disabled={!izinli}
            onChange={(olay) => degistir(alan, olay.target.value)}
            className={onEk === undefined ? undefined : "rounded-l-none"}
          />
        </span>
      )}
    </PanelAlani>
  );

  const sayfaBolumu = (
    <Kart
      role="region"
      aria-labelledby="sayfa-bolum-baslik"
      className="flex min-w-0 flex-col gap-5 p-4 tablet:p-6"
    >
      <h2 id="sayfa-bolum-baslik" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.sabitSayfa.bolum.sayfa")}
      </h2>
      {metinAlani("baslik", metin("yonetim.sabitSayfa.baslik"))}
      {yeni
        ? null
        : metinAlani("adresAdi", metin("yonetim.sabitSayfa.adresAdi"), {
            aciklama: metin("yonetim.sabitSayfa.adresAdiAciklamasi"),
            // Vitrindeki adresin öneki: /sayfa/<adres adı>.
            onEk: kayitOneki,
          })}
      <PanelAlani ad="icerik" etiket={metin("yonetim.sabitSayfa.icerik")} zorunlu={false}>
        {(baglanti) => (
          <BicimliMetinAlani
            {...baglanti}
            etiket={metin("yonetim.sabitSayfa.icerik")}
            deger={form.icerik}
            onDegerDegisti={(html) => degistir("icerik", html)}
            baglantiGecerliMi={aciklamaBaglantisiGecerliMi}
            disabled={!izinli}
            metinler={{
              aracCubugu: doldur(metin("yonetim.bicimliMetin.aracCubugu"), {
                alan: metin("yonetim.sabitSayfa.icerik"),
              }),
              kalin: metin("yonetim.bicimliMetin.kalin"),
              egik: metin("yonetim.bicimliMetin.egik"),
              araBaslik: metin("yonetim.bicimliMetin.araBaslik"),
              maddeListesi: metin("yonetim.bicimliMetin.maddeListesi"),
              siraliListe: metin("yonetim.bicimliMetin.siraliListe"),
              baglanti: metin("yonetim.bicimliMetin.baglanti"),
              baglantiAdresi: metin("yonetim.bicimliMetin.baglantiAdresi"),
              baglantiUygula: metin("yonetim.bicimliMetin.baglantiUygula"),
              baglantiKaldir: metin("yonetim.bicimliMetin.baglantiKaldir"),
              baglantiGecersiz: metin("yonetim.bicimliMetin.baglantiGecersiz"),
            }}
          />
        )}
      </PanelAlani>
      <PanelAlani
        ad="aciklama"
        etiket={metin("yonetim.sabitSayfa.aciklama")}
        aciklama={metin("yonetim.sabitSayfa.aciklamaAciklamasi")}
        zorunlu={false}
      >
        {(baglanti) => (
          <UzunMetinAlani
            {...baglanti}
            name="aciklama"
            rows={2}
            maxLength={sabitSayfaSinirlari.aciklama}
            value={form.aciklama}
            disabled={!izinli}
            onChange={(olay) => degistir("aciklama", olay.target.value)}
          />
        )}
      </PanelAlani>
    </Kart>
  );

  const yayin = (
    <Kart className="flex flex-col gap-4 p-4 tablet:p-6">
      <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.sabitSayfa.bolum.yayin")}
      </h2>
      <AlanKabi ad="durum" etiket={metin("yonetim.sabitSayfa.yayinDurumu")}>
        <SecenekGrubu
          baslik={<span className="sr-only">{metin("yonetim.sabitSayfa.yayinDurumu")}</span>}
          etiket={metin("yonetim.sabitSayfa.yayinDurumu")}
          ogeler={sabitSayfaDurumlari.map((durum) => ({
            deger: durum,
            ad: metin(`yonetim.sabitSayfa.durum.${durum}`),
            ...(izinli ? {} : { secilemez: true }),
          }))}
          deger={form.durum}
          onDegerDegisti={(deger) => {
            if (izinli) degistir("durum", deger as SabitSayfaDurumu);
          }}
          secilemezEki=""
          {...(pf.hata("durum") === undefined ? {} : { hata: pf.hata("durum") ?? "" })}
        />
      </AlanKabi>
    </Kart>
  );

  const menuler = yeni ? null : (
    <Kart
      role="region"
      aria-labelledby="sayfa-menuler-baslik"
      className="flex flex-col gap-3 p-4 tablet:p-6"
    >
      <h2 id="sayfa-menuler-baslik" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.sabitSayfa.bolum.menuler")}
      </h2>
      {veri.menuler.length === 0 ? (
        <p className="m-0">{metin("yonetim.sabitSayfa.menudeDegilUzun")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {veri.menuler.map((yer) => (
            <li key={`${yer.menu}:${yer.ust ?? ""}`}>
              {menuYeriYazisi(yer, metin("yonetim.sabitSayfa.ayrac"))}
            </li>
          ))}
        </ul>
      )}
      {veri.izinler.menuDegistir && veri.kimlik !== undefined ? (
        <Baglanti
          href={menuyeSayfaEkleAdresi(veri.kimlik)}
          gorunum="cerceveli"
          className="self-start"
        >
          <Ikon ad="ekle" />
          {metin("yonetim.sabitSayfa.menuyeEkle")}
        </Baglanti>
      ) : null}
      <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.sabitSayfa.menuAciklamasi")}</p>
    </Kart>
  );

  const kaldir =
    yeni || !veri.izinler.sil ? null : (
      <Kart className="flex flex-col gap-3 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.sabitSayfa.kaldirBasligi")}
        </h2>
        <Dugme tur="cerceveli" className="self-start" onClick={() => setSilOnayi(true)}>
          <Ikon ad="sil" />
          {metin("yonetim.sabitSayfa.sil")}
        </Dugme>
        <p className="m-0 text-kucuk text-soluk-yazi">
          {metin("yonetim.sabitSayfa.kaldirAciklamasi")}
        </p>
      </Kart>
    );

  return (
    <>
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <div className="grid gap-6 masaustu:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 masaustu:col-span-2">
            {sayfaBolumu}
            {izinli ? (
              <KaydetCubugu
                sayfada
                durumYazisi
                degisiklikGerekli={!yeni}
                kaydetEtiketi={metin(
                  yeni ? "yonetim.sabitSayfa.ekle" : "yonetim.sabitSayfa.kaydet",
                )}
                vazgec={() => {
                  if (yeni) {
                    router.push(sayfalarAdresi);
                    return;
                  }
                  vazgec();
                  pf.temizle();
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-6 masaustu:sticky masaustu:top-4 masaustu:self-start">
            {yayin}
            {menuler}
            {kaldir}
          </div>
        </div>
      </PanelFormu>
      <OnayPenceresi
        acik={silOnayi}
        acikDegisince={setSilOnayi}
        baslik={doldur(metin("yonetim.sabitSayfa.silOnay.baslik"), { baslik: veri.form.baslik })}
        aciklama={metin("yonetim.sabitSayfa.silOnay.aciklama")}
        onayEtiketi={metin("yonetim.sabitSayfa.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={sil}
        tur="tehlike"
      />
    </>
  );
}
