// Ödeme yöntemleri ve banka hesapları (kart 0214, karar 0141). Yöntemlerin açık olup olmadığı, sırası, kapıda ödemenin
// seçenekleri, havalenin iptal süresi ve banka hesapları mağaza sahibinin ayarlarıdır (magazaAyarSemasi); yalnız bu
// dosyanın işlevleriyle değişir (ayarlar kendiIsleviyle). Her değişiklik mağaza ayarları servisiyle yazılır: değişiklik
// kaydına girer, aynı kalan değer girmez.
//
// - Listede olmayan yöntem kapalıdır ve listenin sonuna eklenir (yeni bir yöntem kayda girince eski sitelerde kapalı
//   başlar).
// - Müşterinin ödeme adımında gördüğü seçenekler (kullanilabilirYontemler): açık yöntemler sırasıyla; havale yalnız en
//   az bir banka hesabı varsa, kapıda ödeme her seçeneğiyle ayrı satırdır.
// - Müşterinin kullanabileceği en az bir yöntem kalır (kart 0214 kontrolü): açık ama banka hesabı olmayan havale
//   sayılmaz. Bu durumu doğuran kaydetme "en-az-bir-yontem", son hesabın silinmesi "son-yontem" ile durur.
// - Banka hesabının numarası IBAN olarak doğrulanır (cekirdek/bolgeler/iban.ts). Aynı numara iki kez eklenmez.
// - Sıralama ekranın gördüğü bütün hesapları ister: arada eklenen ya da silinen hesap varsa "cakisma" döner.
//   Yöntemlerin sırası da tek başına, aynı kuralla kaydedilir (kart 0224, karar 0144).
// - Eklentiyle gelen yöntem (kart, kart 0215) eklentisi kapalı sitede yoktur: ne ekranda ne ödeme adımında görünür.
//   Ekranın kaydettiği liste sitede var olan yöntemleri taşır; görünmeyen yöntemin kayıtlı açıklığı korunur, satırı
//   listenin sonuna geçer (eklenti yeniden açılınca açıklığıyla, listenin sonunda döner). Açık ama çalışamayan eklentili yöntem (anahtarı yok) müşteriye
//   görünmez ve "en az bir yöntem" sayımına girmez. Bağlantı noktası: cekirdek/eklentiler/odeme-yontemleri.ts.
import { randomUUID } from "node:crypto";
import type { MagazaAyarlari } from "../../ayar-semasi/ayarlar.ts";
import { magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { ibanDuzelt, ibanHatasi } from "../../bolgeler/iban.ts";
import { yontemHazirMi, yontemSitedeVarMi } from "../../eklentiler/odeme-yontemleri.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  bankaHesabiSinirlari,
  type KapidaOdemeSecenegi,
  type OdemeYontemi,
  odemeYontemleri,
} from "../../kayitlar/odeme.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt } from "../../veritabani/kimlik.ts";
import { siteninServisi } from "../magaza-ayarlari/servis.ts";
import type { OdemeYontemiSecimi } from "./semalar.ts";
import type { OdemeYontemleriGirdisi } from "./yontem-semalari.ts";

export type YontemAyari = { kod: OdemeYontemi; acik: boolean };
export type BankaHesabi = MagazaAyarlari["bankaHesaplari"][number];

// Hata kodları (ekran metni koda göre seçer).
export const odemeYontemiHatalari = [
  "en-az-bir-yontem",
  "son-yontem",
  "gun-gecersiz",
  "yontem-kapali",
  "iban-ayni",
  "hesap-siniri",
] as const;

// Kayıttaki bütün yöntemler, ayarın sırasıyla; listede olmayan kapalı olarak sonda.
export const odemeYontemleriniSirala = (ayar: readonly YontemAyari[]): YontemAyari[] => [
  ...ayar,
  ...odemeYontemleri
    .filter((kod) => !ayar.some((yontem) => yontem.kod === kod))
    .map((kod) => ({ kod, acik: false })),
];

// Sitenin eklentileri: eklentili yöntemin sitede olup olmadığı buradan sorulur.
export type YontemSitesi = Pick<Site, "ayarlar" | "kimlik">;

// Sitede var olan yöntemler (ekranın gösterdiği ve kaydettiği liste), ayarın sırasıyla.
export const sitedekiYontemler = (
  site: YontemSitesi,
  ayar: readonly YontemAyari[],
): YontemAyari[] =>
  odemeYontemleriniSirala(ayar).filter((yontem) => yontemSitedeVarMi(site, yontem.kod));

type YontemAyarlari = Pick<
  MagazaAyarlari,
  "odemeYontemleri" | "kapidaOdemeSecenekleri" | "bankaHesaplari"
>;

// Müşterinin ödeme adımında seçebileceği yöntemler, sırasıyla.
export const kullanilabilirYontemler = (
  site: YontemSitesi,
  ayarlar: YontemAyarlari,
): OdemeYontemiSecimi[] =>
  odemeYontemleriniSirala(ayarlar.odemeYontemleri).flatMap((yontem): OdemeYontemiSecimi[] => {
    if (!yontem.acik || !yontemHazirMi(site, yontem.kod)) return [];
    if (yontem.kod === "havale") {
      return ayarlar.bankaHesaplari.length === 0 ? [] : [{ yontem: "havale" }];
    }
    if (yontem.kod === "kart") return [{ yontem: "kart" }];
    return ayarlar.kapidaOdemeSecenekleri.map((secenek) => ({ yontem: "kapida-odeme", secenek }));
  });

export const yontemKullanilabilirMi = (
  site: YontemSitesi,
  ayarlar: YontemAyarlari,
  secim: OdemeYontemiSecimi,
): boolean =>
  kullanilabilirYontemler(site, ayarlar).some(
    (yontem) =>
      yontem.yontem === secim.yontem &&
      (yontem.yontem !== "kapida-odeme" ||
        (secim.yontem === "kapida-odeme" && yontem.secenek === secim.secenek)),
  );

export type OdemeYontemiAyarlari = {
  yontemler: YontemAyari[];
  kapidaOdemeSecenekleri: KapidaOdemeSecenegi[];
  havaleIptalSuresi: number;
  bankaHesaplari: BankaHesabi[];
};

export const odemeYontemiServisi = (site: Site) => {
  const ayarServisi = siteninServisi(site);

  const oku = async (vt: Veritabani): Promise<OdemeYontemiAyarlari> => {
    const ayarlar = await ayarServisi.oku(vt);
    return {
      yontemler: sitedekiYontemler(site, ayarlar.odemeYontemleri),
      kapidaOdemeSecenekleri: ayarlar.kapidaOdemeSecenekleri,
      havaleIptalSuresi: ayarlar.havaleIptalSuresi,
      bankaHesaplari: ayarlar.bankaHesaplari,
    };
  };

  // Yöntemler, sıraları, kapıda ödemenin seçenekleri ve havalenin iptal süresi birlikte kaydedilir. Liste kayıttaki
  // her yöntemi bir kez taşır (şema denetler). Süre tam gün sayısıdır; sınırı ayarın şemasındadır.
  const yontemleriDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: OdemeYontemleriGirdisi,
  ): Promise<OdemeYontemiAyarlari> => {
    const hatalar: { alan: string; kod: string }[] = [];
    const kayitli = await ayarServisi.oku(vt);
    const { bankaHesaplari } = kayitli;
    // Liste sitede var olan yöntemleri tam olarak taşır; görünmeyenin kayıtlı satırı sona korunur.
    const gorunen = sitedekiYontemler(site, kayitli.odemeYontemleri);
    if (
      girdi.yontemler.length !== gorunen.length ||
      gorunen.some((yontem) => !girdi.yontemler.some((gelen) => gelen.kod === yontem.kod))
    ) {
      throw new BilinenHata("dogrulama", [{ alan: "yontemler", kod: "yontem-listesi" }]);
    }
    const yontemler = [
      ...girdi.yontemler,
      ...odemeYontemleriniSirala(kayitli.odemeYontemleri).filter(
        (yontem) => !gorunen.some((gelen) => gelen.kod === yontem.kod),
      ),
    ];
    if (
      kullanilabilirYontemler(site, {
        odemeYontemleri: yontemler,
        kapidaOdemeSecenekleri: girdi.kapidaOdemeSecenekleri,
        bankaHesaplari,
      }).length === 0
    ) {
      hatalar.push({ alan: "yontemler", kod: "en-az-bir-yontem" });
    }
    const gun = /^\d{1,3}$/.test(girdi.havaleIptalSuresi)
      ? Number(girdi.havaleIptalSuresi)
      : undefined;
    const havaleIptalSuresi =
      gun !== undefined && magazaAyarSemasi.shape.havaleIptalSuresi.safeParse(gun).success
        ? gun
        : undefined;
    if (havaleIptalSuresi === undefined)
      hatalar.push({ alan: "havaleIptalSuresi", kod: "gun-gecersiz" });
    if (hatalar.length > 0 || havaleIptalSuresi === undefined) {
      throw new BilinenHata("dogrulama", hatalar);
    }
    await ayarServisi.degistir(
      vt,
      kim,
      {
        odemeYontemleri: yontemler,
        kapidaOdemeSecenekleri: girdi.kapidaOdemeSecenekleri,
        havaleIptalSuresi,
      },
      { kendiIslevi: true },
    );
    return oku(vt);
  };

  // Yalnız sıra (kart 0224, karar 0144): ekranın gördüğü bütün yöntemler yeni sırasıyla gelir; açık-kapalı bilgisi,
  // kapıda ödemenin seçenekleri ve iptal süresi kayıtlı hâliyle kalır (ekrandaki kaydedilmemiş değişiklik birlikte
  // yazılmaz). Eksik, fazla ya da tekrarlı liste "cakisma"dır. Görünmeyen yöntemin kayıtlı satırı sona korunur.
  // Ayar kilidin içinde okunur (bağımsız kontrolün bulgusu): aynı anda kaydedilen açık-kapalı değişikliği sıralamayla
  // geri alınmaz.
  const yontemleriSirala = async (vt: Veritabani, kim: DegisikligiYapan, sira: OdemeYontemi[]) => {
    const kumesi = new Set(sira);
    await ayarServisi.degistir(
      vt,
      kim,
      (bugunku) => {
        const gorunen = sitedekiYontemler(site, bugunku.odemeYontemleri);
        // Uzunluk aynı ve her yöntem listedeyse tekrar olamaz.
        if (sira.length !== gorunen.length || gorunen.some((yontem) => !kumesi.has(yontem.kod))) {
          throw new BilinenHata("cakisma", [{ alan: "sira", kod: "liste-degisti" }]);
        }
        return {
          odemeYontemleri: [
            ...sira.flatMap((kod) => gorunen.filter((yontem) => yontem.kod === kod)),
            ...odemeYontemleriniSirala(bugunku.odemeYontemleri).filter(
              (yontem) => !kumesi.has(yontem.kod),
            ),
          ],
        };
      },
      { kendiIslevi: true },
    );
    return oku(vt);
  };

  type HesapGirdisi = { banka: string; sahip: string; iban: string };

  // Hesabın alanları denetlenir; IBAN hatası alanın koduyla döner. Aynı numara başka hesapta varsa "iban-ayni".
  const hesabiDenetle = (
    hesaplar: readonly BankaHesabi[],
    girdi: HesapGirdisi,
    haric?: string,
  ): Omit<BankaHesabi, "kimlik"> => {
    const hata = ibanHatasi(girdi.iban);
    if (hata !== undefined) throw new BilinenHata("dogrulama", [{ alan: "iban", kod: hata }]);
    const iban = ibanDuzelt(girdi.iban);
    if (hesaplar.some((hesap) => hesap.iban === iban && hesap.kimlik !== haric)) {
      throw new BilinenHata("dogrulama", [{ alan: "iban", kod: "iban-ayni" }]);
    }
    return { banka: girdi.banka.trim(), sahip: girdi.sahip.trim(), iban };
  };

  const hesaplariYaz = async (vt: Veritabani, kim: DegisikligiYapan, hesaplar: BankaHesabi[]) => {
    await ayarServisi.degistir(vt, kim, { bankaHesaplari: hesaplar }, { kendiIslevi: true });
    return oku(vt);
  };

  const hesapEkle = async (vt: Veritabani, kim: DegisikligiYapan, girdi: HesapGirdisi) => {
    const { bankaHesaplari } = await oku(vt);
    if (bankaHesaplari.length >= bankaHesabiSinirlari.enCok) {
      throw new BilinenHata("is-kurali", [{ alan: "hesaplar", kod: "hesap-siniri" }]);
    }
    const hesap = { kimlik: randomUUID(), ...hesabiDenetle(bankaHesaplari, girdi) };
    return hesaplariYaz(vt, kim, [...bankaHesaplari, hesap]);
  };

  const hesapDegistir = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    hamKimlik: string,
    girdi: HesapGirdisi,
  ) => {
    const kimlik = kimligiDuzelt(hamKimlik);
    const { bankaHesaplari } = await oku(vt);
    if (!bankaHesaplari.some((hesap) => hesap.kimlik === kimlik)) {
      throw new BilinenHata("bulunamadi");
    }
    const yeni = hesabiDenetle(bankaHesaplari, girdi, kimlik);
    return hesaplariYaz(
      vt,
      kim,
      bankaHesaplari.map((hesap) => (hesap.kimlik === kimlik ? { kimlik, ...yeni } : hesap)),
    );
  };

  const hesapSil = async (vt: Veritabani, kim: DegisikligiYapan, hamKimlik: string) => {
    const kimlik = kimligiDuzelt(hamKimlik);
    const ayarlar = await oku(vt);
    const { bankaHesaplari } = ayarlar;
    if (!bankaHesaplari.some((hesap) => hesap.kimlik === kimlik)) {
      throw new BilinenHata("bulunamadi");
    }
    const kalan = bankaHesaplari.filter((hesap) => hesap.kimlik !== kimlik);
    // Son hesap silinince müşterinin kullanabileceği yöntem kalmıyorsa silinmez: önce başka bir yöntem açılır.
    if (
      kullanilabilirYontemler(site, {
        odemeYontemleri: (await ayarServisi.oku(vt)).odemeYontemleri,
        kapidaOdemeSecenekleri: ayarlar.kapidaOdemeSecenekleri,
        bankaHesaplari: kalan,
      }).length === 0
    ) {
      throw new BilinenHata("is-kurali", [{ alan: "hesaplar", kod: "son-yontem" }]);
    }
    return hesaplariYaz(vt, kim, kalan);
  };

  // Ekranın gördüğü bütün hesaplar yeni sırasıyla gelir; eksik, fazla ya da tekrarlı liste "cakisma"dır.
  const hesaplariSirala = async (vt: Veritabani, kim: DegisikligiYapan, hamSira: string[]) => {
    const sira = hamSira.map(kimligiDuzelt);
    const { bankaHesaplari } = await oku(vt);
    const kumesi = new Set(sira);
    // Uzunluk aynı ve her hesap listedeyse tekrar olamaz.
    if (
      sira.length !== bankaHesaplari.length ||
      bankaHesaplari.some((hesap) => !kumesi.has(hesap.kimlik))
    ) {
      throw new BilinenHata("cakisma", [{ alan: "sira", kod: "liste-degisti" }]);
    }
    const hesaplar = new Map(bankaHesaplari.map((hesap) => [hesap.kimlik, hesap]));
    return hesaplariYaz(
      vt,
      kim,
      sira.flatMap((kimlik) => {
        const hesap = hesaplar.get(kimlik);
        return hesap === undefined ? [] : [hesap];
      }),
    );
  };

  return {
    oku,
    yontemleriDegistir,
    yontemleriSirala,
    hesapEkle,
    hesapDegistir,
    hesapSil,
    hesaplariSirala,
  };
};
