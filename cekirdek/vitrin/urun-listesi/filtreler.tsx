"use client";
// Ürün listesinin filtreleri ve sıralaması, tarayıcıda (kart 0136, karar 0102; Canlı Çarşı taslağı). Seçim adresi
// değiştirir (adres.ts), sayfa sunucuda yeniden kurulur: filtre adreste durur, geri tuşu çalışır. Grupların
// verisi ve sayıları sunucudan gelir (veri.ts, sayfa.tsx).
//
// - Masaüstünde temanın seçimiyle solda açık duran sütun ya da üstte, her grubu kendi düğmesiyle açılan şerit.
// - Telefonda ve tablette "Filtrele" düğmesi soldan açılan yan pencereyi açar: sıralama, gruplar, "Temizle" ve
//   sonuç sayısıyla "N ürünü göster". Pencere açıkken seçimler hemen uygulanır, sayı güncellenir.
// - Fiyat aralığı müşterinin yazdığı gibi adrese girer; "Uygula" ya da Enter ile. Sunucu sitenin para
//   biçimiyle okur, okuyamazsa hatayı alanın altında gösterir.
// - Sayısı sıfır olan seçenek seçilemez (seçiliyse kaldırılabilir).
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import {
  Akordeon,
  AkordeonBasligi,
  AkordeonIcerigi,
  AkordeonOgesi,
} from "../../../bilesenler/parcalar/akordeon";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  YanPencere,
  YanPencereIcerigi,
  YanPencereKapat,
  YanPencereTetikleyici,
} from "../../../bilesenler/parcalar/yan-pencere";
import { type ListeSiralamasi, listeSiralamalari } from "../../kayitlar/liste";
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { durumdanSorgu, durumuDegistir, type ListeDegisikligi, type ListeDurumu } from "./adres";

// Bir grubun bir seçeneği: etiket sunucuda yazılmıştır (ad ve sayı).
export type FiltreSecenekGorunumu = {
  deger: string;
  etiket: string;
  secili: boolean;
  bos: boolean;
};
export type FiltreGrupGorunumu =
  | { tur: "marka" | "stok"; kimlik: string; ad: string; secenekler: FiltreSecenekGorunumu[] }
  | {
      tur: "secenek" | "ozellik";
      kimlik: string;
      anahtar: string;
      ad: string;
      secenekler: FiltreSecenekGorunumu[];
    };

export type FiltreGorunumu = {
  yol: string;
  durum: ListeDurumu;
  varsayilanSiralama: ListeSiralamasi;
  gruplar: FiltreGrupGorunumu[];
  fiyat: { ipucu: string; hata?: string };
  // "12 ürünü göster".
  sonucYazisi: string;
  seciliSayisi: number;
};

const useListeGezgini = (gorunum: FiltreGorunumu) => {
  const router = useRouter();
  const [bekliyor, gecis] = useTransition();
  const git = (degisiklik: ListeDegisikligi) => {
    const sorgu = durumdanSorgu(
      durumuDegistir(gorunum.durum, degisiklik),
      gorunum.varsayilanSiralama,
    );
    gecis(() => router.push(`${gorunum.yol}${sorgu}`, { scroll: false }));
  };
  return { git, bekliyor };
};

const degisiklik = (grup: FiltreGrupGorunumu, deger: string, secili: boolean): ListeDegisikligi => {
  switch (grup.tur) {
    case "marka":
      return { tur: "marka", deger, secili };
    case "stok":
      return { tur: "stok", secili };
    case "secenek":
    case "ozellik":
      return { tur: grup.tur, anahtar: grup.anahtar, deger, secili };
  }
};

function GrupSecenekleri({
  grup,
  git,
}: {
  grup: FiltreGrupGorunumu;
  git: (degisiklik: ListeDegisikligi) => void;
}) {
  return (
    <div className="flex flex-col">
      {grup.secenekler.map((secenek) => (
        <OnayKutusu
          key={secenek.deger}
          etiket={secenek.etiket}
          checked={secenek.secili}
          disabled={secenek.bos && !secenek.secili}
          onCheckedChange={(isaretli) => git(degisiklik(grup, secenek.deger, isaretli === true))}
        />
      ))}
    </div>
  );
}

function FiyatAraligi({
  gorunum,
  git,
}: {
  gorunum: FiltreGorunumu;
  git: (degisiklik: ListeDegisikligi) => void;
}) {
  const metin = useMetin();
  const kimlik = useId();
  const [enAz, enAzYaz] = useState(gorunum.durum.fiyatYazisi.enAz ?? "");
  const [enCok, enCokYaz] = useState(gorunum.durum.fiyatYazisi.enCok ?? "");
  const uygula = () => git({ tur: "fiyat", enAz, enCok });
  const aciklama = gorunum.fiyat.hata === undefined ? `${kimlik}-ipucu` : `${kimlik}-hata`;
  const alan = (deger: string, yaz: (d: string) => void, etiket: string) => (
    <GirisAlani
      value={deger}
      onChange={(olay) => yaz(olay.target.value)}
      onKeyDown={(olay) => {
        if (olay.key === "Enter") uygula();
      }}
      inputMode="decimal"
      aria-label={etiket}
      placeholder={etiket}
      aria-describedby={aciklama}
      {...(gorunum.fiyat.hata === undefined ? {} : { "aria-invalid": true })}
    />
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {alan(enAz, enAzYaz, metin("vitrin.liste.enAz"))}
        <span aria-hidden="true" className="text-soluk-yazi">
          {metin("vitrin.liste.aralikAyirici")}
        </span>
        {alan(enCok, enCokYaz, metin("vitrin.liste.enCok"))}
      </div>
      {gorunum.fiyat.hata === undefined ? (
        <span id={`${kimlik}-ipucu`} className="text-kucuk text-soluk-yazi">
          {gorunum.fiyat.ipucu}
        </span>
      ) : (
        <span id={`${kimlik}-hata`} className="font-kalin text-tehlike-yazi">
          {gorunum.fiyat.hata}
        </span>
      )}
      <Dugme tur="cerceveli" onClick={uygula} className="self-start">
        {metin("vitrin.liste.uygula")}
      </Dugme>
    </div>
  );
}

// Grupların akordeonla dizilişi: sütunda ve yan pencerede. Bütün gruplar açık başlar.
function AkordeonGruplari({
  gorunum,
  git,
  duzey,
}: {
  gorunum: FiltreGorunumu;
  git: (degisiklik: ListeDegisikligi) => void;
  duzey: 2 | 3;
}) {
  const metin = useMetin();
  return (
    <Akordeon
      type="multiple"
      defaultValue={["fiyat", ...gorunum.gruplar.map((grup) => grup.kimlik)]}
    >
      <AkordeonOgesi value="fiyat">
        <AkordeonBasligi duzey={duzey}>{metin("vitrin.liste.fiyat")}</AkordeonBasligi>
        <AkordeonIcerigi>
          <FiyatAraligi gorunum={gorunum} git={git} />
        </AkordeonIcerigi>
      </AkordeonOgesi>
      {gorunum.gruplar.map((grup) => (
        <AkordeonOgesi key={grup.kimlik} value={grup.kimlik}>
          <AkordeonBasligi duzey={duzey}>{grup.ad}</AkordeonBasligi>
          <AkordeonIcerigi>
            <GrupSecenekleri grup={grup} git={git} />
          </AkordeonIcerigi>
        </AkordeonOgesi>
      ))}
    </Akordeon>
  );
}

function Siralama({
  gorunum,
  git,
  className,
}: {
  gorunum: FiltreGorunumu;
  git: (degisiklik: ListeDegisikligi) => void;
  className?: string;
}) {
  const metin = useMetin();
  const kimlik = useId();
  const secili = gorunum.durum.siralama ?? gorunum.varsayilanSiralama;
  return (
    <div className={sinif("flex items-center gap-2", className)}>
      <span id={kimlik} className="text-soluk-yazi">
        {metin("vitrin.liste.sirala")}
      </span>
      <SecimKutusu
        value={secili}
        onValueChange={(deger) => {
          const siralama = listeSiralamalari.find((s) => s === deger);
          if (siralama !== undefined) git({ tur: "sirala", siralama });
        }}
      >
        <SecimTetikleyici aria-labelledby={kimlik} className="w-auto min-w-0">
          <SecimDegeri />
        </SecimTetikleyici>
        <SecimListesi>
          {listeSiralamalari.map((siralama) => (
            <SecimOgesi key={siralama} value={siralama}>
              {metin(`vitrin.liste.siralama.${siralama}`)}
            </SecimOgesi>
          ))}
        </SecimListesi>
      </SecimKutusu>
    </div>
  );
}

// Masaüstünde solda sütun.
export function FiltreSutunu({ gorunum }: { gorunum: FiltreGorunumu }) {
  const metin = useMetin();
  const { git, bekliyor } = useListeGezgini(gorunum);
  return (
    <section
      aria-labelledby="liste-filtreleri"
      aria-busy={bekliyor}
      className="hidden flex-col masaustu:flex"
    >
      <h2 id="liste-filtreleri" className="sr-only">
        {metin("vitrin.liste.filtreler")}
      </h2>
      <AkordeonGruplari gorunum={gorunum} git={git} duzey={3} />
    </section>
  );
}

// Masaüstünde üstte şerit: her grup kendi düğmesiyle altında açılır, bir anda biri açıktır.
export function UstFiltre({ gorunum }: { gorunum: FiltreGorunumu }) {
  const metin = useMetin();
  const kimlik = useId();
  const { git, bekliyor } = useListeGezgini(gorunum);
  const [acik, ac] = useState<string | undefined>(undefined);
  const gruplar = [
    { kimlik: "fiyat", ad: metin("vitrin.liste.fiyat"), secili: 0 },
    ...gorunum.gruplar.map((grup) => ({
      kimlik: grup.kimlik,
      ad: grup.ad,
      secili: grup.secenekler.filter((s) => s.secili).length,
    })),
  ];
  const acikGrup = gorunum.gruplar.find((grup) => grup.kimlik === acik);
  return (
    <section
      aria-labelledby={`${kimlik}-baslik`}
      aria-busy={bekliyor}
      className="hidden flex-col gap-3 masaustu:flex"
    >
      <h2 id={`${kimlik}-baslik`} className="sr-only">
        {metin("vitrin.liste.filtreler")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {gruplar.map((grup) => (
          <Dugme
            key={grup.kimlik}
            tur={acik === grup.kimlik ? "ikincil" : "cerceveli"}
            aria-expanded={acik === grup.kimlik}
            aria-controls={`${kimlik}-panel`}
            onClick={() => ac(acik === grup.kimlik ? undefined : grup.kimlik)}
          >
            {grup.secili > 0
              ? doldur(metin("vitrin.liste.grupSecili"), { ad: grup.ad, sayi: String(grup.secili) })
              : grup.ad}
            <Ikon ad={acik === grup.kimlik ? "yukari" : "asagi"} />
          </Dugme>
        ))}
      </div>
      {acik === undefined ? null : (
        <fieldset
          id={`${kimlik}-panel`}
          className="m-0 min-w-0 rounded-orta border border-kenar bg-zemin p-4"
          aria-label={acikGrup?.ad ?? metin("vitrin.liste.fiyat")}
        >
          {acikGrup === undefined ? (
            <FiyatAraligi gorunum={gorunum} git={git} />
          ) : (
            <GrupSecenekleri grup={acikGrup} git={git} />
          )}
        </fieldset>
      )}
    </section>
  );
}

// Listenin üstündeki sıralama (masaüstü) ve telefondaki "Filtrele" düğmesi ile yan pencere.
export function ListeAraclari({ gorunum }: { gorunum: FiltreGorunumu }) {
  const metin = useMetin();
  const { git, bekliyor } = useListeGezgini(gorunum);
  return (
    <div className="flex w-full items-center justify-between gap-2 masaustu:ml-auto masaustu:w-auto">
      <YanPencere>
        <YanPencereTetikleyici asChild>
          <Dugme tur="cerceveli" className="masaustu:hidden">
            <Ikon ad="filtre" />
            {gorunum.seciliSayisi > 0
              ? doldur(metin("vitrin.liste.filtreleSayili"), {
                  sayi: String(gorunum.seciliSayisi),
                })
              : metin("vitrin.liste.filtrele")}
          </Dugme>
        </YanPencereTetikleyici>
        <YanPencereIcerigi
          taraf="sol"
          kapatEtiketi={metin("ortak.parca.kapat")}
          aria-describedby={undefined}
          aria-busy={bekliyor}
        >
          <h2 className="font-baslik font-baslik-kalinligi text-baslik-3">
            {metin("vitrin.liste.filtrele")}
          </h2>
          <AkordeonGruplari gorunum={gorunum} git={git} duzey={3} />
          <div className="sticky -bottom-6 -mx-6 mt-auto flex gap-2 border-t border-kenar bg-zemin px-6 py-4">
            <Dugme tur="sade" onClick={() => git({ tur: "temizle" })}>
              {metin("vitrin.liste.temizle")}
            </Dugme>
            <YanPencereKapat asChild>
              <Dugme tur="ikincil" className="flex-1">
                {gorunum.sonucYazisi}
              </Dugme>
            </YanPencereKapat>
          </div>
        </YanPencereIcerigi>
      </YanPencere>
      <Siralama gorunum={gorunum} git={git} />
    </div>
  );
}
