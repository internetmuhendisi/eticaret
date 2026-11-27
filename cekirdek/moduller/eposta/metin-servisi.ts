// Mağaza sahibinin e-posta metinleri ve gönderen bilgileri (kart 0279, karar 0197).
//
// - Metin panelden köşeli parantezli bilgilerle yazı olarak gelir ("Merhaba [Müşteri adı]"), sitenin dilinin bilgi
//   adlarıyla parçalara çevrilir (metin-birimleri.ts). Birimin kullanamadığı bilgi "bilinmeyen-bilgi" ile reddedilir.
// - Varsayılan metinle aynı alan kayda null yazılır: çekirdeğin metni güncellenince e-posta da güncellenir; yalnız
//   farklı alan mağaza sahibinin metnidir. "Varsayılana dön" bütün alanları null yapar.
// - Ekran gördüğü sürümü gönderir; arada başka yazım olduysa "cakisma", hiçbir şey yazılmaz. Satır birimin ilk
//   yazımında açılır, sonra hep kalır (değişiklik kaydı aynı kimliğe bağlıdır).
// - Değişiklik kaydına metin girmez (mağaza sahibi e-posta adresi yazabilir; kayıt e-posta taşıyan değeri reddeder),
//   yalnız değişen alanların adı.
// - Değişiklik kuyrukta bekleyen e-postayı değiştirmez: e-posta kuyruğa girerken o anki metinler kayda yazılır
//   (servis.ts).
import { eq } from "drizzle-orm";
import { magazaAyarSemasi } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { type Dil, metinOkuyucu } from "../../metinler/metin.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { kayitDegeriYasakMi, kayitMetniHatasi } from "../degisiklik-kaydi/deger.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { siteninServisi } from "../magaza-ayarlari/servis.ts";
import {
  type EpostaBilgisi,
  type EpostaMetinAlani,
  type EpostaMetinBirimi,
  type EpostaMetinBirimKodu,
  epostaBilgiAdlari,
  epostaBilgileri,
  epostaMetinAlanlari,
  epostaMetinBirimleri,
  epostaMetinSinirlari,
  type MetinParcasi,
  metniCoz,
  parcalarAyniMi,
  parcalariYaz,
  varsayilanParcalar,
} from "./metin-birimleri.ts";
import { epostaMetinleri } from "./model.ts";

type Sorun = { alan: string; kod: string };

// Satır sonu ve sekme dışındaki denetim karakteri (mağaza bilgilerinin kuralı); konu satır sonu da taşımaz.
const denetimKarakteri = /[^\P{Cc}\n\r\t]/u;

export const bilgiAdlari = (dil: Dil): Record<EpostaBilgisi, string> => {
  const oku = metinOkuyucu(dil);
  return Object.fromEntries(
    epostaBilgileri.map((bilgi) => [bilgi, oku(epostaBilgiAdlari[bilgi])]),
  ) as Record<EpostaBilgisi, string>;
};

// Birimin alanının varsayılan parçaları (çekirdeğin metni); kapanışın varsayılanı yoksa boş.
export const varsayilanAlan = (
  dil: Dil,
  kod: EpostaMetinBirimKodu,
  alan: EpostaMetinAlani,
): MetinParcasi[] => {
  const anahtar = (epostaMetinBirimleri[kod] as EpostaMetinBirimi)[alan];
  return anahtar === undefined ? [] : varsayilanParcalar(metinOkuyucu(dil)(anahtar));
};

export type BirimSatiri = {
  kod: EpostaMetinBirimKodu;
  // Ekranın yazıları: kayıtlı metin ya da varsayılan.
  konu: string;
  giris: string;
  kapanis: string;
  // Varsayılandan farklı alanlar ve sürüm; hiç yazılmamış birimin sürümü 0'dır.
  degisen: EpostaMetinAlani[];
  surum: number;
  degistiren: string | null;
  degismeZamani: Date | null;
};

// Bütün birimlerin ekrandaki hâli.
export const epostaMetinleriniOku = async (vt: Veritabani, dil: Dil): Promise<BirimSatiri[]> => {
  const satirlar = await vt.select().from(epostaMetinleri);
  const adlar = bilgiAdlari(dil);
  return (Object.keys(epostaMetinBirimleri) as EpostaMetinBirimKodu[]).map((kod) => {
    const satir = satirlar.find((s) => s.kod === kod);
    const yazi = (alan: EpostaMetinAlani) =>
      parcalariYaz(satir?.[alan] ?? varsayilanAlan(dil, kod, alan), adlar);
    const degisen = epostaMetinAlanlari.filter((alan) => (satir?.[alan] ?? null) !== null);
    return {
      kod,
      konu: yazi("konu"),
      giris: yazi("giris"),
      kapanis: yazi("kapanis"),
      degisen,
      surum: satir?.surum ?? 0,
      degistiren: degisen.length === 0 ? null : (satir?.degistiren_kimligi ?? null),
      degismeZamani: degisen.length === 0 ? null : (satir?.degisme_zamani ?? null),
    };
  });
};

export type EpostaMetniGirdisi = {
  kod: EpostaMetinBirimKodu;
  konu: string;
  giris: string;
  kapanis: string;
  // Ekranın gördüğü sürüm.
  surum: number;
};

// Panelin yazılarından parçalar; sorunlu alan yolu ve koduyla döner. Önizleme bilinmeyen bilgiyi yazı olarak çizer,
// kayıt reddeder.
export const metinleriCevir = (
  dil: Dil,
  girdi: Pick<EpostaMetniGirdisi, "kod" | "konu" | "giris" | "kapanis">,
): { alanlar: Record<EpostaMetinAlani, MetinParcasi[]>; sorunlar: Sorun[] } => {
  const birim = epostaMetinBirimleri[girdi.kod] as EpostaMetinBirimi;
  const adlar = bilgiAdlari(dil);
  const sorunlar: Sorun[] = [];
  const alanlar = {} as Record<EpostaMetinAlani, MetinParcasi[]>;
  for (const alan of epostaMetinAlanlari) {
    const yazi = girdi[alan].trim();
    const zorunlu = alan !== "kapanis";
    if (zorunlu && yazi === "") sorunlar.push({ alan, kod: "too_small" });
    else if ([...yazi].length > epostaMetinSinirlari[alan]) sorunlar.push({ alan, kod: "too_big" });
    else if (denetimKarakteri.test(yazi) || (alan === "konu" && /[\r\n]/.test(yazi))) {
      sorunlar.push({ alan, kod: "metin-gecersiz" });
    }
    const cozum = metniCoz(yazi, { adlar, izinli: birim.bilgiler, dil });
    if (cozum.bilinmeyenler.length > 0 && !sorunlar.some((s) => s.alan === alan)) {
      sorunlar.push({ alan, kod: "bilinmeyen-bilgi" });
    }
    alanlar[alan] = cozum.parcalar;
  }
  return { alanlar, sorunlar };
};

export const epostaMetniServisi = (site: Pick<Site, "ayarlar">) => {
  const dil = site.ayarlar.dil;

  // Birimin satırı: yoksa açılır, sonra kilitlenir.
  const satiriKilitle = async (
    islem: Parameters<Parameters<Veritabani["transaction"]>[0]>[0],
    kod: EpostaMetinBirimKodu,
  ) => {
    await islem.insert(epostaMetinleri).values({ kod }).onConflictDoNothing();
    const [satir] = await islem
      .select()
      .from(epostaMetinleri)
      .where(eq(epostaMetinleri.kod, kod))
      .for("update");
    if (satir === undefined) throw new Error("E-posta metninin satırı açılamadı.");
    return satir;
  };

  const yaz = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    kod: EpostaMetinBirimKodu,
    surum: number,
    yeni: Record<EpostaMetinAlani, MetinParcasi[] | null>,
    islemAdi: "eposta-metni.degisti" | "eposta-metni.varsayilana-dondu",
  ): Promise<{ surum: number }> =>
    vt.transaction(async (islem) => {
      const satir = await satiriKilitle(islem, kod);
      if (satir.surum !== surum) throw new BilinenHata("cakisma");
      const degisen = epostaMetinAlanlari.filter((alan) => {
        const eski = satir[alan];
        const yeniDeger = yeni[alan];
        return eski === null || yeniDeger === null
          ? eski !== yeniDeger
          : !parcalarAyniMi(eski, yeniDeger);
      });
      if (degisen.length === 0) return { surum: satir.surum };
      const [yazilan] = await islem
        .update(epostaMetinleri)
        .set({
          ...yeni,
          surum: satir.surum + 1,
          degistiren_kimligi: kim.tur === "yonetici" ? kim.kimlik : null,
          degisme_zamani: new Date(),
        })
        .where(eq(epostaMetinleri.kimlik, satir.kimlik))
        .returning({ surum: epostaMetinleri.surum });
      await degisikligiKaydet(islem, {
        kim,
        islem: islemAdi,
        kayit: { tur: "eposta-metni", kimlik: satir.kimlik },
        eski: null,
        yeni: { kod, alanlar: degisen },
      });
      return { surum: yazilan?.surum ?? satir.surum + 1 };
    });

  const kaydet = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: EpostaMetniGirdisi,
  ): Promise<{ surum: number }> => {
    const { alanlar, sorunlar } = metinleriCevir(dil, girdi);
    if (sorunlar.length > 0) throw new BilinenHata("dogrulama", sorunlar);
    // Varsayılanla aynı alan null: çekirdeğin metni güncellenince e-posta da güncellenir.
    const yeni = Object.fromEntries(
      epostaMetinAlanlari.map((alan) => [
        alan,
        parcalarAyniMi(alanlar[alan], varsayilanAlan(dil, girdi.kod, alan)) ? null : alanlar[alan],
      ]),
    ) as Record<EpostaMetinAlani, MetinParcasi[] | null>;
    return yaz(vt, kim, girdi.kod, girdi.surum, yeni, "eposta-metni.degisti");
  };

  const varsayilanaDon = (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: { kod: EpostaMetinBirimKodu; surum: number },
  ) =>
    yaz(
      vt,
      kim,
      girdi.kod,
      girdi.surum,
      { konu: null, giris: null, kapanis: null },
      "eposta-metni.varsayilana-dondu",
    );

  return { kaydet, varsayilanaDon };
};

export type EpostaGondereniGirdisi = {
  gonderenAdi: string;
  yanitAdresi: string;
  altBilgiEki: string;
};

// Gönderen adı, yanıt adresi ve alt bilgiye ek: boş yazı ayarı boşaltır. Kurallar ayar şemasındadır; hata alanın
// adı ve şemanın koduyla döner, hiçbir şey yazılmaz.
export const epostaGondereniniKaydet = async (
  vt: Veritabani,
  site: Site,
  kim: DegisikligiYapan,
  girdi: EpostaGondereniGirdisi,
): Promise<void> => {
  const sema = magazaAyarSemasi.shape;
  const alanlar = {
    gonderenAdi: ["epostaGonderenAdi", girdi.gonderenAdi],
    yanitAdresi: ["epostaYanitAdresi", girdi.yanitAdresi],
    altBilgiEki: ["epostaAltBilgiEki", girdi.altBilgiEki],
  } as const;
  const sorunlar: Sorun[] = [];
  const degerler: Record<string, unknown> = {};
  for (const [alan, [anahtar, yazi]] of Object.entries(alanlar)) {
    const temiz = yazi.trim();
    if (denetimKarakteri.test(temiz) || (alan !== "altBilgiEki" && /[\r\n]/.test(temiz))) {
      sorunlar.push({ alan, kod: "metin-gecersiz" });
      continue;
    }
    const sonuc = sema[anahtar].safeParse(temiz === "" ? undefined : temiz);
    // Gönderen adı değişiklik kaydına değeriyle girer: kaydın yasakladığı değeri (anahtar biçimi) taşıyamaz.
    if (sonuc.success && alan === "gonderenAdi" && temiz !== "" && kayitDegeriYasakMi(temiz)) {
      sorunlar.push({ alan, kod: kayitMetniHatasi });
    } else if (sonuc.success) degerler[anahtar] = sonuc.data;
    else {
      const [sorun] = sonuc.error.issues;
      sorunlar.push({
        alan,
        kod:
          sorun === undefined ? "gecersiz" : sorun.code === "custom" ? sorun.message : sorun.code,
      });
    }
  }
  if (sorunlar.length > 0) throw new BilinenHata("dogrulama", sorunlar);
  await siteninServisi(site).degistir(vt, kim, degerler);
};
