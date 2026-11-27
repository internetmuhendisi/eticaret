// E-postalar ekranlarının verisi (kart 0279, karar 0197): gönderen bilgileri, e-postaların listesi ve bir e-postanın
// metinleri. Metinler sunucuda sitenin dilinin bilgi adlarıyla yazıya çevrilir ("[Müşteri adı]"); ilk önizleme de
// sunucuda çizilir. Tarayıcı birim kaydını yalnız adlar ve bilgi listesi için taşır.
import { inArray } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../../izleme/hata-katmani";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { yoneticiler } from "../../moduller/ekip/model";
import { epostaGidebilirMi } from "../../moduller/eposta/gonderici";
import {
  type EpostaBilgisi,
  type EpostaMetinBirimi,
  type EpostaMetinBirimKodu,
  epostaMetinBirimleri,
} from "../../moduller/eposta/metin-birimleri";
import { bilgiAdlari, epostaMetinleriniOku } from "../../moduller/eposta/metin-servisi";
import { epostaOnizlemesi } from "../../moduller/eposta/onizleme";
import { magazaAyarlariniOku, magazaninAdi } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type GonderenFormu = { gonderenAdi: string; yanitAdresi: string; altBilgiEki: string };

export type EpostalarVerisi = {
  gonderen: GonderenFormu;
  // Altyapının gönderim adresi; yoksa bu sitede e-posta gitmez.
  gonderenAdresi: string | null;
  magazaAdi: string;
  birimler: {
    kod: EpostaMetinBirimKodu;
    grup: EpostaMetinBirimi["grup"];
    // "20 Kasım 2026 · sahip@ornek.test"; varsayılan metinde null.
    degisiklik: string | null;
    degisti: boolean;
  }[];
};

export const epostalarVerisi = async (): Promise<EpostalarVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const b = siteninBicimleyicisi(site.ayarlar);
  const [ayarlar, magazaAdi, satirlar] = await Promise.all([
    magazaAyarlariniOku(vt),
    magazaninAdi(vt, site),
    epostaMetinleriniOku(vt, site.ayarlar.dil),
  ]);
  const kisiler = satirlar.flatMap((s) => (s.degistiren === null ? [] : [s.degistiren]));
  const epostalar =
    kisiler.length === 0
      ? []
      : await vt
          .select({ kimlik: yoneticiler.kimlik, eposta: yoneticiler.eposta })
          .from(yoneticiler)
          .where(inArray(yoneticiler.kimlik, kisiler));
  return {
    gonderen: {
      gonderenAdi: ayarlar.epostaGonderenAdi ?? "",
      yanitAdresi: ayarlar.epostaYanitAdresi ?? "",
      altBilgiEki: ayarlar.epostaAltBilgiEki ?? "",
    },
    gonderenAdresi: site.ayarlar.epostaGonderenAdresi ?? null,
    magazaAdi,
    birimler: satirlar.map((satir) => {
      const kisi = epostalar.find((e) => e.kimlik === satir.degistiren)?.eposta;
      return {
        kod: satir.kod,
        grup: epostaMetinBirimleri[satir.kod].grup,
        degisti: satir.degisen.length > 0,
        degisiklik:
          satir.degismeZamani === null
            ? null
            : [b.uzunTarih(satir.degismeZamani), kisi].filter((p) => p !== undefined).join(" · "),
      };
    }),
  };
};

export type EpostaMetniFormu = { konu: string; giris: string; kapanis: string };

export type EpostaMetniVerisi = {
  kod: EpostaMetinBirimKodu;
  form: EpostaMetniFormu;
  surum: number;
  degisti: boolean;
  // Birimin kullanabildiği bilgiler, sitenin dilindeki adlarıyla.
  bilgiler: { kod: EpostaBilgisi; ad: string }[];
  dil: string;
  ornekNumara: string;
  onizleme: { konu: string; html: string } | null;
  gidebilir: boolean;
};

export const epostaMetniVerisi = async (kod: EpostaMetinBirimKodu): Promise<EpostaMetniVerisi> => {
  const site = calisanSite();
  const vt = siteninVeritabani();
  const satirlar = await epostaMetinleriniOku(vt, site.ayarlar.dil);
  const satir = satirlar.find((s) => s.kod === kod);
  if (satir === undefined) throw new Error("E-postanın birimi yok.");
  const adlar = bilgiAdlari(site.ayarlar.dil);
  const form = { konu: satir.konu, giris: satir.giris, kapanis: satir.kapanis };
  // İlk önizleme sayfayla gelir; çizilemezse ekran sonra ister.
  const onizleme = await epostaOnizlemesi(vt, site, { kod, ...form }).catch((hata: unknown) => {
    hatayiKaydet(hata, { kaynak: "eposta-onizlemesi" });
    return null;
  });
  return {
    kod,
    form,
    surum: satir.surum,
    degisti: satir.degisen.length > 0,
    bilgiler: epostaMetinBirimleri[kod].bilgiler.map((bilgi) => ({ kod: bilgi, ad: adlar[bilgi] })),
    dil: site.ayarlar.dil,
    ornekNumara: `${site.ayarlar.siparisOneki}-${site.ayarlar.siparisBaslangici}`,
    onizleme,
    gidebilir: epostaGidebilirMi(site.ayarlar),
  };
};
