// Kategori, marka ve etiket sayfasının ürün listesi (kart 0136, karar 0102; Canlı Çarşı taslağı). Sayfa adresten
// durumu okur (adres.ts), filtreli listeyi alır (veri.ts), kartları ürün kartının tek veri işleviyle kurar ve
// çizer. Arama sayfası (kart 0137) aynı parçayı kullanır.
//
// - Filtrenin yeri temanın görünümüdür (kayitlar/tema.ts, urun-filtresi): masaüstünde solda sütun ya da üstte
//   şerit; telefonda ve tablette yan pencere.
// - Sıralamanın, sayfa geçişinin ve sayfa başına ürünün varsayılanı mağaza sahibinin ayarıdır.
// - Fiyat filtresi sitenin para biçimiyle okunur (biçimleyicinin paraOku'su); okunamayan tutar filtreye
//   girmez, alanın altında hata görünür.
// - Seçili filtreler kaldırılabilir bağlantılardır, "Tümünü temizle" sıralamayı korur.
// - Kapsamda hiç ürün yoksa boş hâl; filtrelere uyan ürün yoksa filtreleri kaldırmayı öneren boş hâl.
import Link from "next/link";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { DahaFazla, Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { yazilanIslevler } from "../../kayitlar/islevler";
import { type AramaSiralamasi, listeSiralamalari } from "../../kayitlar/liste";
import { type UrunFiltresiGorunumu, urunFiltresiGorunumleri } from "../../kayitlar/tema";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siteninGecerliTemasi } from "../../moduller/tema/servis";
import type { UrunFiltresi } from "../../moduller/urun/filtre";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../adresler";
import { izgaraSiniflari } from "../bolumler/ortak/urun-izgarasi";
import { urunKartiGorunumu } from "../urun-karti/gorunum";
import type { UrunKartiVerisi } from "../urun-karti/tur";
import { oncelikliKartSayisi, UrunKarti } from "../urun-karti/urun-karti";
import { urunKartlari } from "../urun-karti/veri";
import {
  type AdresParametreleri,
  adrestenDurum,
  durumdanSorgu,
  durumuDegistir,
  type ListeDegisikligi,
  type ListeDurumu,
} from "./adres";
import {
  type FiltreGorunumu,
  type FiltreGrupGorunumu,
  FiltreSutunu,
  ListeAraclari,
  UstFiltre,
} from "./filtreler";
import type { FiltreliListe, FiltreliListeSecenekleri, FiltreSecenegi } from "./veri";
import { filtreliUrunListesi } from "./veri";

export type UrunListesiVerisi = {
  liste: FiltreliListe;
  kartlar: UrunKartiVerisi[];
  durum: ListeDurumu;
  siralama: AramaSiralamasi;
  varsayilanSiralama: AramaSiralamasi;
  // Sayfanın sıralamaları (arama "en uygun"u da sunar).
  siralamalar: readonly AramaSiralamasi[];
  birikimli: boolean;
  boyut: number;
  filtreYeri: UrunFiltresiGorunumu;
  kartGorunumu: ReturnType<typeof urunKartiGorunumu>;
  // Okunamayan fiyat alanları; ikisi de okunduysa yok.
  fiyatHatasi?: { enAz: boolean; enCok: boolean };
  // Okunan fiyat sınırları, kuruş.
  fiyat: { enAz?: number; enCok?: number };
  // Marka sayfasında marka grubu gösterilmez.
  markaGrubu: boolean;
};

// Adresten sayfanın listesi. Aynı istekte sayfa bilgisi ve sayfa ayrı çağırsa da hesap ucuzdur; kart ve
// liste her çağrıda yeniden okunur.
export const urunListesiVerisi = async ({
  kapsam,
  parametreler,
  markaGrubu = true,
  arama,
}: {
  kapsam: FiltreliListeSecenekleri["kapsam"];
  parametreler: AdresParametreleri;
  markaGrubu?: boolean;
  // Arama sayfası (kart 0137): sıralamalara "en uygun" eklenir ve varsayılan olur, puanı uygunluk verir.
  arama?: {
    siralamalar: readonly AramaSiralamasi[];
    uygunluk: FiltreliListeSecenekleri["uygunluk"];
  };
}): Promise<UrunListesiVerisi> => {
  const vt = siteninVeritabani();
  const site = calisanSite();
  const an = new Date();
  const [ayarlar, tema] = await Promise.all([
    siteninMagazaAyarlari(vt, site),
    siteninGecerliTemasi(vt),
  ]);
  const siralamalar = arama?.siralamalar ?? listeSiralamalari;
  const durum = adrestenDurum(parametreler, siralamalar);
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const enAz =
    durum.fiyatYazisi.enAz === undefined ? undefined : bicim.paraOku(durum.fiyatYazisi.enAz);
  const enCok =
    durum.fiyatYazisi.enCok === undefined ? undefined : bicim.paraOku(durum.fiyatYazisi.enCok);
  const hataliAlanlar = {
    enAz: durum.fiyatYazisi.enAz !== undefined && enAz === undefined,
    enCok: durum.fiyatYazisi.enCok !== undefined && enCok === undefined,
  };
  const filtre: UrunFiltresi = {
    ...(enAz === undefined && enCok === undefined
      ? {}
      : {
          fiyat: {
            ...(enAz === undefined ? {} : { enAz }),
            ...(enCok === undefined ? {} : { enCok }),
          },
        }),
    markalar: markaGrubu ? durum.markalar : [],
    secenekler: durum.secenekler,
    ozellikler: durum.ozellikler,
    stoktakiler: durum.stoktakiler,
  };
  const varsayilanSiralama: AramaSiralamasi =
    arama === undefined ? ayarlar.listeSiralamasi : (siralamalar[0] ?? ayarlar.listeSiralamasi);
  const siralama = durum.siralama ?? varsayilanSiralama;
  const birikimli = ayarlar.listeSayfaGecisi === "daha-fazla";
  const liste = await filtreliUrunListesi(vt, site, {
    kapsam,
    filtre,
    siralama,
    ...(arama?.uygunluk === undefined ? {} : { uygunluk: arama.uygunluk }),
    sayfa: durum.sayfa,
    boyut: ayarlar.listeSayfaBoyutu,
    birikimli,
    tukenenUrun: ayarlar.tukenenUrun,
    an,
  });
  const kartlar = await urunKartlari(vt, site, liste.urunler, { yer: "liste", an });
  const temaninGorunumleri = tema.tema.tanim.gorunumler;
  const filtreYeri =
    urunFiltresiGorunumleri.find((g) => g === temaninGorunumleri["urun-filtresi"]) ??
    urunFiltresiGorunumleri[0];
  return {
    liste,
    kartlar,
    durum,
    siralama,
    varsayilanSiralama,
    siralamalar,
    birikimli,
    boyut: ayarlar.listeSayfaBoyutu,
    filtreYeri,
    kartGorunumu: urunKartiGorunumu(temaninGorunumleri),
    ...(hataliAlanlar.enAz || hataliAlanlar.enCok ? { fiyatHatasi: hataliAlanlar } : {}),
    fiyat: filtre.fiyat ?? {},
    markaGrubu,
  };
};

// Başlığın yanındaki ürün sayısı.
export const urunSayisiYazisi = (veri: UrunListesiVerisi): string =>
  doldur(metin("vitrin.liste.urunSayisi"), {
    sayi: siteninBicimleyicisi(calisanSite().ayarlar).sayi(veri.liste.toplam),
  });

// Filtre ya da sıralama varsa sayfa arama motorlarının dizinine girmez (sayfa bilgisi).
export { filtreliMi } from "./adres";

const secenekEtiketi = (secenek: FiltreSecenegi): string =>
  doldur(metin("vitrin.liste.secenekSayili"), {
    ad: secenek.ad,
    sayi: siteninBicimleyicisi(calisanSite().ayarlar).sayi(secenek.adet),
  });

const gorunumSecenekleri = (secenekler: FiltreSecenegi[]) =>
  secenekler.map((secenek) => ({
    deger: secenek.anahtar,
    etiket: secenekEtiketi(secenek),
    secili: secenek.secili,
    bos: secenek.adet === 0,
  }));

const filtreGorunumu = (veri: UrunListesiVerisi, yol: string): FiltreGorunumu => {
  const { secenekler } = veri.liste;
  const bicim = siteninBicimleyicisi(calisanSite().ayarlar);
  const gruplar: FiltreGrupGorunumu[] = [
    ...(veri.markaGrubu && secenekler.markalar.length > 0
      ? [
          {
            tur: "marka" as const,
            kimlik: "marka",
            ad: metin("vitrin.liste.marka"),
            secenekler: gorunumSecenekleri(secenekler.markalar),
          },
        ]
      : []),
    ...secenekler.secenekler.map((grup) => ({
      tur: "secenek" as const,
      kimlik: `secenek-${grup.anahtar}`,
      anahtar: grup.anahtar,
      ad: grup.ad,
      secenekler: gorunumSecenekleri(grup.secenekler),
    })),
    ...secenekler.ozellikler.map((grup) => ({
      tur: "ozellik" as const,
      kimlik: `ozellik-${grup.anahtar}`,
      anahtar: grup.anahtar,
      ad: grup.ad,
      secenekler: gorunumSecenekleri(grup.secenekler),
    })),
    {
      tur: "stok",
      kimlik: "stok",
      ad: metin("vitrin.liste.stok"),
      secenekler: [
        {
          deger: "var",
          etiket: secenekEtiketi({
            anahtar: "var",
            ad: metin("vitrin.liste.stoktakiler"),
            ...secenekler.stoktakiler,
          }),
          secili: secenekler.stoktakiler.secili,
          bos: secenekler.stoktakiler.adet === 0,
        },
      ],
    },
  ];
  const ornek = { duz: bicim.sayi(1000), ondalikli: bicim.sayi(1000.5, 2) };
  return {
    yol,
    durum: veri.durum,
    varsayilanSiralama: veri.varsayilanSiralama,
    siralamalar: veri.siralamalar,
    gruplar,
    fiyat: {
      ipucu: doldur(metin("vitrin.liste.fiyatIpucu"), {
        binlikli: ornek.duz,
        duz: "1000",
      }),
      ...(veri.fiyatHatasi === undefined
        ? {}
        : {
            hata: {
              metin: doldur(metin("vitrin.liste.fiyatHatasi"), {
                ornek: ornek.duz,
                ondalikli: ornek.ondalikli,
              }),
              ...veri.fiyatHatasi,
            },
          }),
    },
    sonucYazisi: doldur(metin("vitrin.liste.sonuclariGoster"), {
      sayi: bicim.sayi(veri.liste.toplam),
    }),
    seciliSayisi: seciliFiltreler(veri, yol).length,
  };
};

// Seçili filtrelerin kaldırılabilir etiketleri: adı ve kaldırınca gidilecek adres.
const seciliFiltreler = (
  veri: UrunListesiVerisi,
  yol: string,
): { anahtar: string; etiket: string; adres: string }[] => {
  const adres = (degisiklik: ListeDegisikligi) =>
    `${yol}${durumdanSorgu(durumuDegistir(veri.durum, degisiklik), veri.varsayilanSiralama)}`;
  const { secenekler } = veri.liste;
  const bicim = siteninBicimleyicisi(calisanSite().ayarlar);
  const { enAz, enCok } = veri.fiyat;
  // Okunamayan tutar filtreye girmez; etiketi de yoktur (hata alanın altındadır).
  const fiyatEtiketi =
    enAz !== undefined && enCok !== undefined
      ? doldur(metin("vitrin.liste.seciliFiyatAraligi"), {
          enAz: bicim.para(enAz),
          enCok: bicim.para(enCok),
        })
      : enAz !== undefined
        ? doldur(metin("vitrin.liste.seciliFiyatEnAz"), { tutar: bicim.para(enAz) })
        : enCok !== undefined
          ? doldur(metin("vitrin.liste.seciliFiyatEnCok"), { tutar: bicim.para(enCok) })
          : undefined;
  const fiyat =
    fiyatEtiketi === undefined
      ? []
      : [{ anahtar: "fiyat", etiket: fiyatEtiketi, adres: adres({ tur: "fiyat-kaldir" }) }];
  const grubun = (tur: "secenek" | "ozellik", gruplar: typeof secenekler.secenekler) =>
    gruplar.flatMap((grup) =>
      grup.secenekler
        .filter((s) => s.secili)
        .map((s) => ({
          anahtar: `${tur}-${grup.anahtar}-${s.anahtar}`,
          etiket: doldur(metin("vitrin.liste.seciliSecenek"), { grup: grup.ad, ad: s.ad }),
          adres: adres({ tur, anahtar: grup.anahtar, deger: s.anahtar, secili: false }),
        })),
    );
  return [
    ...fiyat,
    ...(veri.markaGrubu
      ? secenekler.markalar
          .filter((m) => m.secili)
          .map((m) => ({
            anahtar: `marka-${m.anahtar}`,
            etiket: m.ad,
            adres: adres({ tur: "marka", deger: m.anahtar, secili: false }),
          }))
      : []),
    ...grubun("secenek", secenekler.secenekler),
    ...grubun("ozellik", secenekler.ozellikler),
    ...(veri.durum.stoktakiler
      ? [
          {
            anahtar: "stok",
            etiket: metin("vitrin.liste.stoktakiler"),
            adres: adres({ tur: "stok", secili: false }),
          },
        ]
      : []),
  ];
};

// Bağlantılar ön yüklenmez: her biri bir liste sorgusudur ve aramada istek sınırına sayılır (kart 0137).
function SeciliFiltreler({ veri, yol }: { veri: UrunListesiVerisi; yol: string }) {
  const secili = seciliFiltreler(veri, yol);
  if (secili.length === 0) return null;
  return (
    <ul
      aria-label={metin("vitrin.liste.seciliFiltreler")}
      className="flex flex-wrap items-center gap-2"
    >
      {secili.map((filtre) => (
        <li key={filtre.anahtar}>
          <Link
            href={filtre.adres}
            scroll={false}
            prefetch={false}
            className="inline-flex min-h-11 items-center gap-1 rounded-dugme border border-kenar bg-yuzey px-4 text-yazi no-underline hover:border-yazi"
          >
            {filtre.etiket}
            <Ikon ad="kapat" className="size-4" />
            <span className="sr-only">{metin("vitrin.liste.filtreyiKaldir")}</span>
          </Link>
        </li>
      ))}
      <li>
        <Baglanti
          href={`${yol}${durumdanSorgu(durumuDegistir(veri.durum, { tur: "temizle" }), veri.varsayilanSiralama)}`}
          scroll={false}
          prefetch={false}
        >
          {metin("vitrin.liste.tumunuTemizle")}
        </Baglanti>
      </li>
    </ul>
  );
}

export function UrunListesiGorunumu({ veri, yol }: { veri: UrunListesiVerisi; yol: string }) {
  const { liste } = veri;
  if (liste.kapsamToplami === 0) {
    return (
      <BosHal
        ikon="paket"
        baslik={metin("vitrin.liste.bosKapsamBaslik")}
        aciklama={metin("vitrin.liste.bosKapsamAciklama")}
      >
        <Baglanti href={vitrinAdresleri.anasayfa} gorunum="ikincil">
          {metin("vitrin.bulunamadi.anasayfayaDon")}
        </Baglanti>
      </BosHal>
    );
  }
  const gorunum = filtreGorunumu(veri, yol);
  const solda = veri.filtreYeri === "solda";
  const sayfaAdresi = (sayfa: number) =>
    `${yol}${durumdanSorgu({ ...veri.durum, sayfa }, veri.varsayilanSiralama)}`;
  const sonuc =
    liste.toplam === 0 ? (
      <BosHal
        ikon="filtre"
        baslik={metin("vitrin.liste.bosFiltreBaslik")}
        aciklama={metin("vitrin.liste.bosFiltreAciklama")}
      >
        <Baglanti
          href={`${yol}${durumdanSorgu(durumuDegistir(veri.durum, { tur: "temizle" }), veri.varsayilanSiralama)}`}
          gorunum="ikincil"
          scroll={false}
        >
          {metin("vitrin.liste.tumunuTemizle")}
        </Baglanti>
      </BosHal>
    ) : (
      <>
        <ul
          aria-label={metin("vitrin.liste.urunler")}
          className={sinif(
            "grid min-w-0",
            izgaraSiniflari(veri.kartGorunumu, solda ? "filtreli" : "tam"),
          )}
        >
          {veri.kartlar.map((urun, sira) => (
            <li key={urun.kimlik} className="min-w-0">
              <UrunKarti
                urun={urun}
                gorunum={veri.kartGorunumu}
                islevler={yazilanIslevler}
                baslikDuzeyi={2}
                oncelikli={sira < oncelikliKartSayisi}
                className="h-full"
              />
            </li>
          ))}
        </ul>
        {veri.birikimli ? (
          <DahaFazla
            className="mt-8"
            durum={doldur(metin("vitrin.liste.dahaFazlaDurum"), {
              gorulen: siteninBicimleyicisi(calisanSite().ayarlar).sayi(veri.kartlar.length),
              toplam: siteninBicimleyicisi(calisanSite().ayarlar).sayi(liste.toplam),
            })}
            adres={liste.sayfa < liste.toplamSayfa ? sayfaAdresi(liste.sayfa + 1) : undefined}
            dugmeYazisi={metin("vitrin.liste.dahaFazla")}
          />
        ) : (
          <Sayfalama
            className="mt-8"
            sayfa={liste.sayfa}
            toplamSayfa={liste.toplamSayfa}
            adres={sayfaAdresi}
            metinler={{
              etiket: metin("ortak.parca.sayfalar"),
              onceki: metin("ortak.parca.oncekiSayfa"),
              sonraki: metin("ortak.parca.sonrakiSayfa"),
              sayfaAdi: (sira) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
              bosluk: metin("ortak.parca.atlananSayfalar"),
            }}
          />
        )}
      </>
    );
  return (
    <div className="flex flex-col gap-4">
      {solda ? null : <UstFiltre gorunum={gorunum} />}
      <div className={sinif("grid gap-6", solda && "masaustu:grid-cols-4")}>
        {solda ? <FiltreSutunu gorunum={gorunum} /> : null}
        <div className={sinif("flex min-w-0 flex-col gap-4", solda && "masaustu:col-span-3")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SeciliFiltreler veri={veri} yol={yol} />
            <ListeAraclari gorunum={gorunum} />
          </div>
          {sonuc}
        </div>
      </div>
    </div>
  );
}
