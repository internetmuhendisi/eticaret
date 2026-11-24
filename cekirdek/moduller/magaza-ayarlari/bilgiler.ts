// Mağaza bilgileri (kart 0278, karar 0175): mağaza adı, iletişim bilgileri, mağaza adresi, sosyal hesaplar ve satıcı
// bilgileri panelden birlikte değişir.
//
// - Her alan ayar şemasının kendi kuralıyla denetlenir (magazaAyarSemasi); hata alanın yolu ("magazaAdresi.il",
//   "saticiBilgileri.vergiNumarasi", "sosyalHesaplar.2.hesap") ve şemanın koduyla döner, hiçbir şey yazılmaz.
// - Boş yazı ayarı boşaltır. Adresin ya da satıcı bilgilerinin bütün alanları boşsa ayar silinir; bir alanı doluysa
//   zorunlu alanları (adres, il, ilçe; unvan) istenir.
// - Telefon ülke içi yazılışla da girilir (0312 ...): ödeme adımındaki gibi ülkenin koduyla uluslararası biçime çevrilir
//   (telefonuDuzelt), çevirmede mağaza adresinin ülkesi, yoksa sitenin ilk satış ülkesi kullanılır.
// - Boş sosyal hesap alanı atılır; hesabın başındaki "@" kullanıcı adının parçası sayılmaz.
// - Yazım mağaza ayarları servisiyle tek işlemdedir: telefon, e-posta, adres ve satıcı bilgileri değişiklik kaydına
//   değeri yazılmadan girer (kayıtta gizli, kart 0071).

import { magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { telefonuDuzelt } from "../../bolgeler/adres.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import type { MagazaBilgileriGirdisi } from "./semalar.ts";
import { siteninServisi } from "./servis.ts";

type Sorun = { alan: string; kod: string };

const dolu = (deger: string): string | undefined => {
  const temiz = deger.trim();
  return temiz === "" ? undefined : temiz;
};

// Şemanın sorunlarından alan yolları ve kodlar: kendi kodu olan sorun (custom) iletisini, öteki zod'un kodunu taşır.
const sorunlar = (onEk: string, sonuc: { error: { issues: readonly unknown[] } }): Sorun[] =>
  (sonuc.error.issues as { path: PropertyKey[]; code: string; message: string }[]).map(
    ({ path, code, message }) => ({
      alan: [onEk, ...path.map(String)].filter((parca) => parca !== "").join("."),
      kod: code === "custom" ? message : code,
    }),
  );

// Panelin girdisinden ayarların yeni değerleri; okunamayan alanın sorunu döner.
export const magazaBilgileriniCevir = (
  site: Pick<Site, "ayarlar">,
  girdi: MagazaBilgileriGirdisi,
): { degerler: Record<string, unknown>; sorunlar: Sorun[] } => {
  const sema = magazaAyarSemasi.shape;
  const hatalar: Sorun[] = [];
  const degerler: Record<string, unknown> = {};
  const al = (anahtar: keyof typeof sema, ham: unknown) => {
    const sonuc = sema[anahtar].safeParse(ham);
    if (sonuc.success) degerler[anahtar] = sonuc.data;
    else hatalar.push(...sorunlar(anahtar, sonuc));
  };

  // Mağaza adı zorunludur: boş ad başlangıç değerine dönmez, hatadır.
  const ad = dolu(girdi.magazaAdi);
  if (ad === undefined) hatalar.push({ alan: "magazaAdi", kod: "too_small" });
  else al("magazaAdi", ad);

  const eposta = dolu(girdi.iletisimEpostasi);
  al("iletisimEpostasi", eposta);

  const adres = girdi.magazaAdresi;
  const adresDolu = [adres.il, adres.ilce, adres.adres, adres.postaKodu].some(
    (deger) => dolu(deger) !== undefined,
  );
  al(
    "magazaAdresi",
    adresDolu
      ? {
          ulke: adres.ulke,
          ...(dolu(adres.il) === undefined ? {} : { il: dolu(adres.il) }),
          ...(dolu(adres.ilce) === undefined ? {} : { ilce: dolu(adres.ilce) }),
          adres: adres.adres.trim(),
          ...(dolu(adres.postaKodu) === undefined ? {} : { postaKodu: dolu(adres.postaKodu) }),
        }
      : undefined,
  );

  const telefon = dolu(girdi.iletisimTelefonu);
  const telefonUlkesi = adresDolu ? adres.ulke : (site.ayarlar.satisUlkeleri[0] ?? "");
  al(
    "iletisimTelefonu",
    telefon === undefined ? undefined : telefonuDuzelt(telefonUlkesi, telefon),
  );

  // Sosyal hesaplar: boş alan atılır; sorunun yolu formun gönderdiği sıradır.
  const hesaplar: { site: string; hesap: string }[] = [];
  const hesapSiralari: number[] = [];
  girdi.sosyalHesaplar.forEach(({ site: hesapSitesi, hesap }, sira) => {
    const temiz = dolu(hesap)?.replace(/^@/, "");
    if (temiz === undefined || temiz === "") return;
    hesaplar.push({ site: hesapSitesi, hesap: temiz });
    hesapSiralari.push(sira);
  });
  const sosyal = sema.sosyalHesaplar.safeParse(hesaplar);
  if (sosyal.success) degerler["sosyalHesaplar"] = sosyal.data;
  else {
    for (const sorun of sorunlar("", sosyal)) {
      // "0.hesap" yolu süzülmüş listenin sırasıdır: formun sırasına çevrilir.
      const [ilk, ...kalan] = sorun.alan.split(".");
      const sira = ilk === undefined || ilk === "" ? undefined : hesapSiralari[Number(ilk)];
      hatalar.push({
        alan:
          sira === undefined
            ? "sosyalHesaplar"
            : ["sosyalHesaplar", String(sira), ...kalan].join("."),
        kod: sira === undefined && sorun.kod !== "too_big" ? "sosyal-hesap-tekrar" : sorun.kod,
      });
    }
  }

  // Satıcı bilgileri: bütün yazı alanları boşsa ayar silinir.
  const satici = girdi.saticiBilgileri;
  const saticiAlanlari = {
    unvan: satici.unvan,
    vergiDairesi: satici.vergiDairesi,
    vergiNumarasi: satici.vergiNumarasi,
    mersisNumarasi: satici.mersisNumarasi,
    ticaretSicilNumarasi: satici.ticaretSicilNumarasi,
    kepAdresi: satici.kepAdresi,
  };
  const saticiDolu = Object.values(saticiAlanlari).some((deger) => dolu(deger) !== undefined);
  al(
    "saticiBilgileri",
    saticiDolu
      ? {
          ulke: satici.ulke,
          isletmeTuru: satici.isletmeTuru,
          unvan: satici.unvan.trim(),
          ...Object.fromEntries(
            Object.entries(saticiAlanlari)
              .filter(([alan, deger]) => alan !== "unvan" && dolu(deger) !== undefined)
              .map(([alan, deger]) => [alan, dolu(deger)]),
          ),
        }
      : undefined,
  );
  return { degerler, sorunlar: hatalar };
};

export const magazaBilgileriniDegistir = async (
  vt: Veritabani,
  site: Site,
  kim: DegisikligiYapan,
  girdi: MagazaBilgileriGirdisi,
): Promise<void> => {
  const { degerler, sorunlar: hatalar } = magazaBilgileriniCevir(site, girdi);
  if (hatalar.length > 0) throw new BilinenHata("dogrulama", hatalar);
  await siteninServisi(site).degistir(vt, kim, degerler);
};
