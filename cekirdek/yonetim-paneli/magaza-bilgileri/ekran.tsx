"use client";
// Mağaza bilgileri ekranı (kart 0278, karar 0175; taslak: "Ortak form: Mağaza bilgileri"). Dört kart: mağaza adı;
// iletişim (telefon, e-posta, adres; il ve ilçe listeden, ödeme adımının alanlarıyla); sosyal hesaplar (her site için
// kullanıcı adı, önünde sitenin adresi); satıcı bilgileri (işletme türü, unvan, vergi dairesi, vergi ya da kimlik
// numarası, MERSİS, ticaret sicil, KEP). Kurallar sunucudadır (ayar şeması): hata alanın altında, birden çok hatada
// özette (ortak form yapısı, karar 0159). Kaydedilince vitrinde, sipariş fişinde ve yeni e-postalarda hemen görünür.
// Değiştirme izni olmayan yönetici alanları okur, kaydet çubuğunu görmez.
import { useRef } from "react";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { type IsletmeTuru, isletmeTurleri } from "../../kayitlar/satici";
import {
  type SosyalSite,
  sosyalHesapAdresleri,
  sosyalSiteler,
} from "../../kayitlar/sosyal-siteler";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import {
  AdresAlanlari,
  type AlanKimlikleri,
  type HataHaritasi,
  SecimAlani,
} from "../../vitrin/odeme/alanlar";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import type { MagazaBilgileriFormu, MagazaBilgileriVerisi, SaticiFormu } from "./veri";

// Sunucunun kodlarının metni (ayar şemasının kodları ve zod'un kodları).
const kodMetinleri: Record<string, MetinAnahtari> = {
  "telefon-bicimi": "yonetim.magazaBilgileri.hata.telefon",
  "il-gerekli": "yonetim.magazaBilgileri.hata.secin",
  "ilce-gerekli": "yonetim.magazaBilgileri.hata.secin",
  "il-yok": "yonetim.magazaBilgileri.hata.secin",
  "il-baska-ulkenin": "yonetim.magazaBilgileri.hata.secin",
  "ilce-yok": "yonetim.magazaBilgileri.hata.secin",
  "ilce-baska-ilin": "yonetim.magazaBilgileri.hata.secin",
  "ilce-ilsiz": "yonetim.magazaBilgileri.hata.secin",
  "ulke-yok": "yonetim.magazaBilgileri.hata.secin",
  "ulke-gecersiz": "yonetim.magazaBilgileri.hata.secin",
  "posta-kodu-gerekli": "yonetim.magazaBilgileri.hata.zorunlu",
  "posta-kodu-bicimi": "yonetim.magazaBilgileri.hata.postaKodu",
  "vergi-numarasi-bicimi": "yonetim.magazaBilgileri.hata.vergiNumarasiBicimi",
  "vergi-numarasi-kontrol": "yonetim.magazaBilgileri.hata.vergiNumarasiKontrol",
  "mersis-numarasi-bicimi": "yonetim.magazaBilgileri.hata.mersis",
  "kep-adresi-bicimi": "yonetim.magazaBilgileri.hata.kep",
  too_small: "yonetim.magazaBilgileri.hata.zorunlu",
  invalid_type: "yonetim.magazaBilgileri.hata.zorunlu",
  too_big: "yonetim.magazaBilgileri.hata.uzun",
};

// Alanın kendine özgü metni: biçimi tutmayan e-posta ve sosyal hesap.
const alanMetni = (alan: string, kod: string): MetinAnahtari => {
  if (kod === "invalid_format" || kod === "custom") {
    if (alan === "iletisimEpostasi" || alan === "saticiBilgileri.kepAdresi") {
      return "yonetim.magazaBilgileri.hata.eposta";
    }
    if (alan.startsWith("sosyal.")) return "yonetim.magazaBilgileri.hata.sosyalHesap";
  }
  return kodMetinleri[kod] ?? "yonetim.magazaBilgileri.hata.gecersiz";
};

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.magazaBilgileri.hata.yetki"
    : hata.kod === "oturum-yok"
      ? "yonetim.magazaBilgileri.hata.oturum"
      : "yonetim.magazaBilgileri.hata.genel";

const isletmeAdlari: Record<IsletmeTuru, MetinAnahtari> = {
  sirket: "yonetim.magazaBilgileri.isletme.sirket",
  sahis: "yonetim.magazaBilgileri.isletme.sahis",
};

// Sitenin adresinin önü: "instagram.com/" (kullanıcı adı yazılır, bağlantı kayıttan kurulur).
const hesapOnEki = (site: SosyalSite): string =>
  sosyalHesapAdresleri[site]("")
    .replace(/^https:\/\//, "")
    .replace(/^www\./, "");

// Formdan ucun girdisi ve sosyal hesapların gönderilen sıradaki alan adları (sunucunun hatası alana bağlanır).
const girdiKur = (form: MagazaBilgileriFormu) => {
  const hesaplar: { site: SosyalSite; hesap: string }[] = [];
  const hesapAlanlari: string[] = [];
  for (const site of sosyalSiteler) {
    form.sosyal[site].forEach((hesap, sira) => {
      hesaplar.push({ site, hesap });
      hesapAlanlari.push(`sosyal.${site}.${sira}`);
    });
  }
  return {
    girdi: {
      magazaAdi: form.magazaAdi,
      iletisimEpostasi: form.iletisimEpostasi,
      iletisimTelefonu: form.iletisimTelefonu,
      magazaAdresi: form.magazaAdresi,
      sosyalHesaplar: hesaplar,
      saticiBilgileri: form.saticiBilgileri,
    },
    hesapAlanlari,
  };
};

export function MagazaBilgileriEkrani({
  veri,
  izinli,
}: {
  veri: MagazaBilgileriVerisi;
  izinli: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<MagazaBilgileriFormu>(
    veri.form,
  );
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const kimlikler = useRef<AlanKimlikleri>({}).current;
  const hatalar: HataHaritasi = pf.hatalar;

  const satici = (alan: keyof SaticiFormu, deger: string) =>
    setForm((onceki) => ({
      ...onceki,
      saticiBilgileri: { ...onceki.saticiBilgileri, [alan]: deger },
    }));

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const { girdi, hesapAlanlari } = girdiKur(gonderilen);
    const sonuc = await pf.isle(() =>
      islem("magaza-bilgileri", girdi, "yonetim.magazaBilgileri.kaydedildi", { formda: true }),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    const alanlar: Record<string, string> = {};
    const genel: string[] = [];
    for (const { alan: gelen, kod } of sonuc.ayrinti) {
      // Sosyal hesabın yolu gönderilen sıradır ("sosyalHesaplar.3.hesap"): formun alanına çevrilir.
      const sosyal = /^sosyalHesaplar\.(\d+)/.exec(gelen);
      const alan = sosyal === null ? gelen : (hesapAlanlari[Number(sosyal[1])] ?? "");
      if (kod === "sosyal-hesap-tekrar" || alan === "" || alan === "sosyalHesaplar") {
        genel.push(metin("yonetim.magazaBilgileri.hata.sosyalTekrar"));
        continue;
      }
      alanlar[alan] ??= metin(alanMetni(alan, kod));
    }
    pf.hatalariGoster(
      alanlar,
      Object.keys(alanlar).length > 0 || genel.length > 0 ? genel : [metin(genelHataMetni(sonuc))],
    );
    return false;
  };

  const metinAlani = (
    ad: string,
    etiket: string,
    deger: string,
    degistir: (deger: string) => void,
    secenekler: {
      zorunlu?: boolean;
      aciklama?: string;
      autoComplete?: string;
      inputMode?: "text" | "tel" | "email";
      type?: "text" | "tel" | "email";
      genis?: boolean;
    } = {},
  ) => (
    <div className={secenekler.genis === true ? "tablet:col-span-2" : undefined}>
      <PanelAlani
        ad={ad}
        etiket={etiket}
        zorunlu={secenekler.zorunlu ?? false}
        aciklama={secenekler.aciklama}
      >
        {(baglanti) => (
          <GirisAlani
            {...baglanti}
            name={ad}
            type={secenekler.type ?? "text"}
            {...(secenekler.inputMode === undefined ? {} : { inputMode: secenekler.inputMode })}
            autoComplete={secenekler.autoComplete ?? "off"}
            value={deger}
            onChange={(olay) => degistir(olay.target.value)}
          />
        )}
      </PanelAlani>
    </div>
  );

  const bolum = (kimlik: string, baslik: MetinAnahtari, aciklama: MetinAnahtari) => (
    <div className="flex flex-col gap-1">
      <h2 id={kimlik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin(baslik)}
      </h2>
      <p className="text-kucuk text-soluk-yazi">{metin(aciklama)}</p>
    </div>
  );

  const tur = form.saticiBilgileri.isletmeTuru;
  const saticiUlkesi = veri.ulkeler.find((ulke) => ulke.kod === form.saticiBilgileri.ulke);

  return (
    <PanelFormu
      durum={pf}
      gonder={async () => {
        await kaydet();
      }}
      className="max-w-metin"
    >
      {/* İzni olmayan yönetici yalnız okur: bütün alanlar kapalıdır. */}
      <fieldset disabled={!izinli} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
        <Kart
          role="region"
          aria-labelledby="bolum-magaza"
          className="flex flex-col gap-5 p-4 tablet:p-6"
        >
          {bolum(
            "bolum-magaza",
            "yonetim.magazaBilgileri.magaza.baslik",
            "yonetim.magazaBilgileri.magaza.aciklama",
          )}
          {metinAlani(
            "magazaAdi",
            metin("yonetim.magazaBilgileri.magazaAdi"),
            form.magazaAdi,
            (deger) => setForm((onceki) => ({ ...onceki, magazaAdi: deger })),
            { zorunlu: true, autoComplete: "organization" },
          )}
        </Kart>

        <Kart
          role="region"
          aria-labelledby="bolum-iletisim"
          className="flex flex-col gap-5 p-4 tablet:p-6"
        >
          {bolum(
            "bolum-iletisim",
            "yonetim.magazaBilgileri.iletisim.baslik",
            "yonetim.magazaBilgileri.iletisim.aciklama",
          )}
          <div className="grid gap-5 tablet:grid-cols-2">
            {metinAlani(
              "iletisimTelefonu",
              metin("yonetim.magazaBilgileri.telefon"),
              form.iletisimTelefonu,
              (deger) => setForm((onceki) => ({ ...onceki, iletisimTelefonu: deger })),
              {
                aciklama: metin("yonetim.magazaBilgileri.telefonAciklama"),
                inputMode: "tel",
                type: "tel",
                autoComplete: "tel",
              },
            )}
            {metinAlani(
              "iletisimEpostasi",
              metin("yonetim.magazaBilgileri.eposta"),
              form.iletisimEpostasi,
              (deger) => setForm((onceki) => ({ ...onceki, iletisimEpostasi: deger })),
              { inputMode: "email", type: "email", autoComplete: "email" },
            )}
          </div>
          <AdresAlanlari
            onEk="magazaAdresi"
            adres={form.magazaAdresi}
            degistir={(adres) => setForm((onceki) => ({ ...onceki, magazaAdresi: adres }))}
            ulkeler={veri.ulkeler}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
          <p className="text-kucuk text-soluk-yazi">{metin("yonetim.magazaBilgileri.adresBos")}</p>
        </Kart>

        <Kart
          role="region"
          aria-labelledby="bolum-sosyal"
          className="flex flex-col gap-5 p-4 tablet:p-6"
        >
          {bolum(
            "bolum-sosyal",
            "yonetim.magazaBilgileri.sosyal.baslik",
            "yonetim.magazaBilgileri.sosyal.aciklama",
          )}
          <div className="grid gap-5 tablet:grid-cols-2">
            {sosyalSiteler.flatMap((site) =>
              form.sosyal[site].map((hesap, sira) => {
                const ad = `sosyal.${site}.${sira}`;
                const siteAdi = metin(`vitrin.bolum.sosyalHesaplar.site.${site}`);
                return (
                  <PanelAlani
                    key={ad}
                    ad={ad}
                    etiket={
                      sira === 0
                        ? siteAdi
                        : doldur(metin("yonetim.magazaBilgileri.sosyal.ikinci"), {
                            site: siteAdi,
                            sira: String(sira + 1),
                          })
                    }
                    zorunlu={false}
                  >
                    {(baglanti) => (
                      // Sitenin adresi alanın içinde, yazının önünde (taslak); ekran okuyucu açıklamayı okur.
                      <span className="flex min-w-0 items-center overflow-hidden rounded-dugme border border-alan-kenari bg-zemin">
                        {/* Önek ayrı kutuda (taslak): alanın değeri sanılmasın. */}
                        <span
                          aria-hidden="true"
                          className="flex shrink-0 items-center self-stretch border-r border-alan-kenari bg-yuzey px-3 text-kucuk text-soluk-yazi"
                        >
                          {hesapOnEki(site)}
                        </span>
                        <GirisAlani
                          {...baglanti}
                          name={ad}
                          autoComplete="off"
                          value={hesap}
                          onChange={(olay) => {
                            const deger = olay.target.value;
                            setForm((onceki) => ({
                              ...onceki,
                              sosyal: {
                                ...onceki.sosyal,
                                [site]: onceki.sosyal[site].map((eski, i) =>
                                  i === sira ? deger : eski,
                                ),
                              },
                            }));
                          }}
                          className="min-w-0 flex-1 rounded-none border-0 bg-transparent"
                        />
                      </span>
                    )}
                  </PanelAlani>
                );
              }),
            )}
          </div>
        </Kart>

        <Kart
          role="region"
          aria-labelledby="bolum-satici"
          className="flex flex-col gap-5 p-4 tablet:p-6"
        >
          {bolum(
            "bolum-satici",
            "yonetim.magazaBilgileri.satici.baslik",
            "yonetim.magazaBilgileri.satici.aciklama",
          )}
          {veri.ulkeler.length > 1 ? (
            <SecimAlani
              ad="saticiBilgileri.ulke"
              etiket={metin("yonetim.magazaBilgileri.ulke")}
              secenekler={veri.ulkeler}
              deger={form.saticiBilgileri.ulke}
              onDegisti={(deger) => satici("ulke", deger)}
              hatalar={hatalar}
              kimlikler={kimlikler}
            />
          ) : (
            <p className="flex flex-col gap-1">
              <span className="font-kalin">{metin("yonetim.magazaBilgileri.ulke")}</span>
              <span>{saticiUlkesi?.ad}</span>
            </p>
          )}
          <AlanKabi
            ad="saticiBilgileri.isletmeTuru"
            etiket={metin("yonetim.magazaBilgileri.isletmeTuru")}
          >
            <SecenekGrubu
              baslik={metin("yonetim.magazaBilgileri.isletmeTuru")}
              etiket={metin("yonetim.magazaBilgileri.isletmeTuru")}
              ogeler={isletmeTurleri.map((deger) => ({
                deger,
                ad: metin(isletmeAdlari[deger]),
                ...(izinli ? {} : { secilemez: true }),
              }))}
              deger={tur}
              onDegerDegisti={(deger) => {
                if (izinli) satici("isletmeTuru", deger);
              }}
              secilemezEki=""
              {...(pf.hata("saticiBilgileri.isletmeTuru") === undefined
                ? {}
                : { hata: pf.hata("saticiBilgileri.isletmeTuru") ?? "" })}
            />
          </AlanKabi>
          <div className="grid gap-5 tablet:grid-cols-2">
            {metinAlani(
              "saticiBilgileri.unvan",
              metin(
                tur === "sahis"
                  ? "yonetim.magazaBilgileri.unvanSahis"
                  : "yonetim.magazaBilgileri.unvan",
              ),
              form.saticiBilgileri.unvan,
              (deger) => satici("unvan", deger),
              {
                zorunlu: true,
                genis: true,
                aciklama: metin("yonetim.magazaBilgileri.unvanAciklama"),
              },
            )}
            {metinAlani(
              "saticiBilgileri.vergiDairesi",
              metin("yonetim.magazaBilgileri.vergiDairesi"),
              form.saticiBilgileri.vergiDairesi,
              (deger) => satici("vergiDairesi", deger),
            )}
            {metinAlani(
              "saticiBilgileri.vergiNumarasi",
              metin(
                tur === "sahis"
                  ? "yonetim.magazaBilgileri.kimlikNumarasi"
                  : "yonetim.magazaBilgileri.vergiNumarasi",
              ),
              form.saticiBilgileri.vergiNumarasi,
              (deger) => satici("vergiNumarasi", deger),
              { inputMode: "text" },
            )}
            {metinAlani(
              "saticiBilgileri.mersisNumarasi",
              metin("yonetim.magazaBilgileri.mersis"),
              form.saticiBilgileri.mersisNumarasi,
              (deger) => satici("mersisNumarasi", deger),
            )}
            {metinAlani(
              "saticiBilgileri.ticaretSicilNumarasi",
              metin("yonetim.magazaBilgileri.ticaretSicil"),
              form.saticiBilgileri.ticaretSicilNumarasi,
              (deger) => satici("ticaretSicilNumarasi", deger),
            )}
            {metinAlani(
              "saticiBilgileri.kepAdresi",
              metin("yonetim.magazaBilgileri.kep"),
              form.saticiBilgileri.kepAdresi,
              (deger) => satici("kepAdresi", deger),
              { inputMode: "email", type: "email", genis: true },
            )}
          </div>
        </Kart>
      </fieldset>
      {izinli ? (
        <KaydetCubugu
          sayfada
          durumYazisi
          degisiklikGerekli
          kaydetEtiketi={metin("yonetim.magazaBilgileri.kaydet")}
          vazgec={() => {
            vazgec();
            pf.temizle();
          }}
        />
      ) : null}
    </PanelFormu>
  );
}
