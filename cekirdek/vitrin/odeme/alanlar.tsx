"use client";
// Ödeme bilgilerinin ortak alanları (kart 0213; kart 0236 ile vitrinin ödeme formundan taşındı): ad, telefon gibi metin
// alanı, ülke, il ve ilçe seçimi, adres ve posta kodu; hata kodlarının alan metni ve alanların adları. Vitrinin ödeme
// adımı (odeme-formu.tsx) ve panelin elle siparişi (cekirdek/yonetim-paneli/siparisler/elle-siparis.tsx) aynı alanları
// kullanır; şema ikisinde de cekirdek/moduller/odeme/semalar.ts'tedir.
import type { ComponentProps } from "react";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import type { AdresAdlari } from "../../bolgeler/adres-satiri";
import { postaKoduGecerliMi } from "../../bolgeler/bolgeler";
import { doldur } from "../../metinler/doldur";
import type { VitrinMetinAnahtari } from "../../metinler/istemci-metni";
import { useMetin } from "../../metinler/istemci-metni";

export type BolgeUlkesi = {
  kod: string;
  ad: string;
  iller: readonly { kod: string; ad: string; ilceler: readonly { kod: string; ad: string }[] }[];
  postaKoduZorunlu: boolean;
};

export type Adres = { ulke: string; il: string; ilce: string; adres: string; postaKodu: string };

// Adres satırının adları sunucunun verdiği ülke verisinden (kart 0237: adres defteri ve ödemedeki kayıtlı adresler; il
// ve ilçe listesi tarayıcı koduna alınmaz).
export const ulkeVerisindenAdlar = (ulkeler: readonly BolgeUlkesi[]): AdresAdlari => {
  const iller = ulkeler.flatMap((ulke) => ulke.iller);
  return {
    ulke: (kod) => ulkeler.find((ulke) => ulke.kod === kod)?.ad ?? kod,
    il: (kod) => iller.find((il) => il.kod === kod)?.ad,
    ilce: (kod) => iller.flatMap((il) => il.ilceler).find((ilce) => ilce.kod === kod)?.ad,
  };
};
export type HataHaritasi = Record<string, string>;

export const bosAdres = (ulke: string): Adres => ({
  ulke,
  il: "",
  ilce: "",
  adres: "",
  postaKodu: "",
});
export const bosIseYok = (deger: string) => (deger.trim() === "" ? undefined : deger);
export const adresGirdisi = (adres: Adres) => ({
  ulke: adres.ulke,
  il: bosIseYok(adres.il),
  ilce: bosIseYok(adres.ilce),
  adres: adres.adres,
  postaKodu: bosIseYok(adres.postaKodu),
});
// Özetin vergi bölgesi. Posta kodu yalnız ülkenin biçimine uyunca girer: yazılırken her harfte özet istenmez, yarım
// kod bölgeyi değiştirmez.
export const vergiBolgesi = (adres: Adres) => {
  const postaKodu = adres.postaKodu.trim();
  return {
    ulke: adres.ulke,
    ...(adres.il === "" ? {} : { il: adres.il }),
    ...(postaKodu !== "" && postaKoduGecerliMi(adres.ulke, postaKodu) ? { postaKodu } : {}),
  };
};

// Şemanın ve sunucunun hata kodundan alanın altındaki metin.
export const ozelHatalar: Record<string, VitrinMetinAnahtari> = {
  "telefon-bicimi": "vitrin.odeme.hata.telefon",
  "telefon-gerekli": "vitrin.odeme.hata.gerekli",
  "il-gerekli": "vitrin.odeme.hata.secin",
  "ilce-gerekli": "vitrin.odeme.hata.secin",
  "posta-kodu-gerekli": "vitrin.odeme.hata.gerekli",
  "posta-kodu-bicimi": "vitrin.odeme.hata.postaKodu",
  "metin-gecersiz": "vitrin.odeme.hata.metin",
  "vergi-numarasi-bicimi": "vitrin.odeme.hata.vergiNumarasiBicimi",
  "vergi-numarasi-kontrol": "vitrin.odeme.hata.vergiNumarasiKontrol",
  "ulke-teslimat-disi": "vitrin.odeme.hata.ulke",
  "yontem-kapali": "vitrin.odeme.hata.yontemKapali",
  "yontem-ulasilamadi": "vitrin.odeme.hata.yontemUlasilamadi",
};
export const onayAlanlari = new Set([
  "bilgiler.onBilgilendirmeOnayi",
  "bilgiler.mesafeliSatisOnayi",
  "hesap.uyelikOnayi",
  "hesap.kvkkOnayi",
]);
export const secimAlanlari = /\.(ulke|il|ilce)$/;

export type Metin = ReturnType<typeof useMetin>;

export const hataMetni = (metin: Metin, alan: string, kod: string, sifreEnKisa: number): string => {
  const ozel = ozelHatalar[kod];
  if (ozel !== undefined) return metin(ozel);
  if (alan === "eposta") return metin("vitrin.odeme.hata.eposta");
  if (alan === "bilgiler.odemeYontemi") return metin("vitrin.odeme.hata.yontem");
  if (alan === "hesap.sifre") {
    return doldur(metin("vitrin.kayit.hataSifre"), { enKisa: String(sifreEnKisa) });
  }
  if (onayAlanlari.has(alan)) return metin("vitrin.odeme.hata.onay");
  if (secimAlanlari.test(alan) || kod.startsWith("il") || kod.startsWith("ulke")) {
    return metin("vitrin.odeme.hata.secin");
  }
  if (kod === "too_big") return metin("vitrin.odeme.hata.uzun");
  return metin("vitrin.odeme.hata.gerekli");
};

// Alanın bölümündeki adı (hata özetindeki bağlantı).
export const alanAdlari: Record<string, VitrinMetinAnahtari> = {
  eposta: "vitrin.odeme.eposta",
  "hesap.sifre": "vitrin.kayit.sifre",
  "hesap.uyelikOnayi": "vitrin.kayit.uyelikOnayi",
  "hesap.kvkkOnayi": "vitrin.kayit.kvkkOnayi",
  "bilgiler.teslimat.ad": "vitrin.odeme.ad",
  "bilgiler.teslimat.soyad": "vitrin.odeme.soyad",
  "bilgiler.teslimat.telefon": "vitrin.odeme.telefon",
  "bilgiler.teslimat.adres.ulke": "vitrin.odeme.ulke",
  "bilgiler.teslimat.adres.il": "vitrin.odeme.il",
  "bilgiler.teslimat.adres.ilce": "vitrin.odeme.ilce",
  "bilgiler.teslimat.adres.adres": "vitrin.odeme.adres",
  "bilgiler.teslimat.adres.postaKodu": "vitrin.odeme.postaKodu",
  "bilgiler.fatura.firma": "vitrin.odeme.firma",
  "bilgiler.fatura.vergiDairesi": "vitrin.odeme.vergiDairesi",
  "bilgiler.fatura.vergiNumarasi": "vitrin.odeme.vergiNumarasi",
  "bilgiler.fatura.adres.ulke": "vitrin.odeme.ulke",
  "bilgiler.fatura.adres.il": "vitrin.odeme.il",
  "bilgiler.fatura.adres.ilce": "vitrin.odeme.ilce",
  "bilgiler.fatura.adres.adres": "vitrin.odeme.adres",
  "bilgiler.fatura.adres.postaKodu": "vitrin.odeme.postaKodu",
  "bilgiler.not": "vitrin.odeme.notu",
  "adresiKaydet.baslik": "vitrin.hesap.adresler.baslikAlani",
  "bilgiler.odemeYontemi": "vitrin.odeme.bolum.yontem",
  "bilgiler.onBilgilendirmeOnayi": "vitrin.odeme.onBilgilendirmeOnayi",
  "bilgiler.mesafeliSatisOnayi": "vitrin.odeme.mesafeliSatisOnayi",
};

// Alanların kimlikleri (form alanı verir): hata özeti bağlantıyla alana gider.
export type AlanKimlikleri = Record<string, string>;

export function MetinAlani({
  ad,
  etiket,
  aciklama,
  hatalar,
  kimlikler,
  ...ozellikler
}: {
  ad: string;
  etiket: string;
  aciklama?: string;
  hatalar: HataHaritasi;
  kimlikler: AlanKimlikleri;
  type?: NonNullable<ComponentProps<typeof GirisAlani>["type"]>;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  // Verilirse alan durumdan çizilir (posta kodu: özetin vergi bölgesi ona bağlıdır).
  deger?: string;
  // Alanın ilk değeri (önceki siparişin adresi): alan durumdan çizilmez, müşteri değiştirir.
  varsayilan?: string;
  onDegisti?: (deger: string) => void;
}) {
  const hata = hatalar[ad];
  const { deger, onDegisti, varsayilan, ...giris } = ozellikler;
  return (
    <FormAlani
      etiket={etiket}
      {...(aciklama === undefined ? {} : { aciklama })}
      {...(hata === undefined ? {} : { hata })}
    >
      {(alan) => {
        kimlikler[ad] = alan.id;
        return (
          <GirisAlani
            {...alan}
            name={ad}
            {...giris}
            {...(deger === undefined ? {} : { value: deger })}
            {...(varsayilan === undefined ? {} : { defaultValue: varsayilan })}
            {...(onDegisti === undefined
              ? {}
              : { onChange: (olay) => onDegisti(olay.currentTarget.value) })}
          />
        );
      }}
    </FormAlani>
  );
}

export function SecimAlani({
  ad,
  etiket,
  secenekler,
  deger,
  onDegisti,
  hatalar,
  kimlikler,
}: {
  ad: string;
  etiket: string;
  secenekler: readonly { kod: string; ad: string }[];
  deger: string;
  onDegisti: (deger: string) => void;
  hatalar: HataHaritasi;
  kimlikler: AlanKimlikleri;
}) {
  const metin = useMetin();
  const hata = hatalar[ad];
  return (
    <FormAlani etiket={etiket} {...(hata === undefined ? {} : { hata })}>
      {(alan) => {
        kimlikler[ad] = alan.id;
        return (
          <SecimKutusu value={deger} onValueChange={onDegisti}>
            <SecimTetikleyici {...alan}>
              <SecimDegeri placeholder={metin("vitrin.odeme.secin")} />
            </SecimTetikleyici>
            <SecimListesi>
              {secenekler.map((secenek) => (
                <SecimOgesi key={secenek.kod} value={secenek.kod}>
                  {secenek.ad}
                </SecimOgesi>
              ))}
            </SecimListesi>
          </SecimKutusu>
        );
      }}
    </FormAlani>
  );
}

export function AdresAlanlari({
  onEk,
  adres,
  degistir,
  ulkeler,
  hatalar,
  kimlikler,
}: {
  onEk: string;
  adres: Adres;
  degistir: (adres: Adres) => void;
  ulkeler: readonly BolgeUlkesi[];
  hatalar: HataHaritasi;
  kimlikler: AlanKimlikleri;
}) {
  const metin = useMetin();
  const ulke = ulkeler.find((u) => u.kod === adres.ulke);
  const il = ulke?.iller.find((i) => i.kod === adres.il);
  return (
    <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
      {ulkeler.length > 1 ? (
        <SecimAlani
          ad={`${onEk}.ulke`}
          etiket={metin("vitrin.odeme.ulke")}
          secenekler={ulkeler}
          deger={adres.ulke}
          onDegisti={(yeni) => degistir({ ...bosAdres(yeni), adres: adres.adres })}
          hatalar={hatalar}
          kimlikler={kimlikler}
        />
      ) : (
        // Tek teslimat ülkesi seçilmez, yazı olarak görünür (taslak, kart 0211).
        <p className="flex flex-col gap-1 tablet:col-span-2">
          <span className="font-kalin">{metin("vitrin.odeme.ulke")}</span>
          <span>{ulke?.ad}</span>
        </p>
      )}
      {ulke !== undefined && ulke.iller.length > 0 ? (
        <>
          <SecimAlani
            ad={`${onEk}.il`}
            etiket={metin("vitrin.odeme.il")}
            secenekler={ulke.iller}
            deger={adres.il}
            onDegisti={(yeni) => degistir({ ...adres, il: yeni, ilce: "" })}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
          <SecimAlani
            ad={`${onEk}.ilce`}
            etiket={metin("vitrin.odeme.ilce")}
            secenekler={il?.ilceler ?? []}
            deger={adres.ilce}
            onDegisti={(yeni) => degistir({ ...adres, ilce: yeni })}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
        </>
      ) : null}
      <div className="tablet:col-span-2">
        <FormAlani
          etiket={metin("vitrin.odeme.adres")}
          aciklama={metin("vitrin.odeme.adresAciklama")}
          {...(hatalar[`${onEk}.adres`] === undefined ? {} : { hata: hatalar[`${onEk}.adres`] })}
        >
          {(alan) => {
            kimlikler[`${onEk}.adres`] = alan.id;
            return (
              <UzunMetinAlani
                {...alan}
                autoComplete="street-address"
                rows={2}
                value={adres.adres}
                onChange={(olay) => degistir({ ...adres, adres: olay.currentTarget.value })}
              />
            );
          }}
        </FormAlani>
      </div>
      <MetinAlani
        ad={`${onEk}.postaKodu`}
        etiket={metin(
          ulke?.postaKoduZorunlu === false
            ? "vitrin.odeme.postaKoduIstegeBagli"
            : "vitrin.odeme.postaKodu",
        )}
        autoComplete="postal-code"
        deger={adres.postaKodu}
        onDegisti={(deger) => degistir({ ...adres, postaKodu: deger })}
        hatalar={hatalar}
        kimlikler={kimlikler}
      />
    </div>
  );
}
