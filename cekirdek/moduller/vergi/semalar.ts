// Vergi sınıfı ve oran girdisinin ortak şemaları (kart 0074, karar 0060). Panelin ekranı, uçlar ve
// sitenin başlangıç verisi (baslangic/vergi.json) aynı şemayı kullanır.
//
// Çekirdekte vergi adı, oran ya da ülke yazmaz (.claude/rules/e-ticaret-is-kurallari.md): hepsi sitenin
// verisidir. Bunu cekirdek/testler/vergi-degeri-yok.test.ts denetler.
//
// Oran, küsuratlı sayı yerine milyonda bir birimiyle tam sayı olarak saklanır: %18 = 180000,
// %7,5 = 75000. Girişte yüzde metin olarak yazılır ("18", "7.5") ve sayıya çevrilmeden okunur, böylece
// hiçbir adımda yuvarlama olmaz. En çok dört ondalık basamak yazılabilir.
//
// Hata iletileri düz cümle değil koddur (vergiHatalari, bolgeHatalari, adresHatalari); metni ekran çözer.
// Komutlar bu dosyayı Node ile doğrudan çalıştırır (site doğrulaması): yalnız silinebilir tür sözdizimi.
import { z } from "zod";
import type { AdresHatasi } from "../../bolgeler/adres.ts";
import { bolgeyiDogrula, postaKoduGecerliMi } from "../../bolgeler/bolgeler.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";

export const vergiHatalari = ["oran-bicimi", "oran-siniri", "ad-tekrar", "sinif-silinmis"] as const;
export type VergiHatasi = (typeof vergiHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const vergiHataMetinleri = {
  "oran-bicimi": "yonetim.vergi.hata.oran-bicimi",
  "oran-siniri": "yonetim.vergi.hata.oran-siniri",
  "ad-tekrar": "yonetim.vergi.hata.ad-tekrar",
  "sinif-silinmis": "yonetim.vergi.hata.sinif-silinmis",
} as const satisfies Record<VergiHatasi, MetinAnahtari>;

// Tam oran (yüzde yüz) milyonda bir biriminde.
export const tamOran = 1_000_000;
const yuzdeBasinaBirim = tamOran / 100;
const ondalikBasamak = 4;

// Yüzde metnini ("18", "7.5", "0.0001") milyonda bir birimine çevirir. Biçim dışı metin undefined döner.
export const yuzdedenOrana = (yuzde: string): number | undefined => {
  const eslesme = /^(\d{1,3})(?:\.(\d{1,4}))?$/.exec(yuzde);
  if (eslesme === null) return undefined;
  const [, tam = "", kesir = ""] = eslesme;
  return Number(tam) * yuzdeBasinaBirim + Number(kesir.padEnd(ondalikBasamak, "0"));
};

// Milyonda bir biriminden yüzde metnine: sondaki sıfırlar düşer (180000 → "18", 75000 → "7.5").
export const oranYuzdesi = (oran: number): string => {
  const tam = Math.trunc(oran / yuzdeBasinaBirim);
  const kesir = String(oran % yuzdeBasinaBirim)
    .padStart(ondalikBasamak, "0")
    .replace(/0+$/, "");
  return kesir === "" ? String(tam) : `${tam}.${kesir}`;
};

const hata = (kod: VergiHatasi) => kod;

// Yüzde metni → milyonda bir. Sayı olarak yazılan yüzde kabul edilmez: küsuratlı sayının yuvarlama hatası
// girişte başlamasın.
export const oranSemasi = z
  .string()
  .trim()
  .transform((yuzde, ctx) => {
    const oran = yuzdedenOrana(yuzde);
    if (oran === undefined) {
      ctx.addIssue({ code: "custom", message: hata("oran-bicimi") });
      return z.NEVER;
    }
    if (oran > tamOran) {
      ctx.addIssue({ code: "custom", message: hata("oran-siniri") });
      return z.NEVER;
    }
    return oran;
  });

// Sınıf ve oranın adı. "@" içermez: e-posta biçimindeki değeri değişiklik kaydı reddeder (karar 0045).
export const vergiAdiSemasi = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine((ad) => !ad.includes("@"), "@ olamaz.");

const siraSemasi = z.int().min(0).max(9999);

// Oranın bölgesi ülke, isteğe bağlı il ve posta kodudur. İl yalnız il listesi olan ülkede yazılabilir
// (bolgeler.ts), ilçe yoktur. Posta kodu ülkenin biçimine uyar ve tam eşleşir.
const oranAlanlari = z.strictObject({
  ulke: z.string().trim(),
  il: z.string().trim().optional(),
  postaKodu: z.string().trim().min(1).max(20).optional(),
  oran: oranSemasi,
  // Boşsa mağazanın vergi adı (vergiAdi ayarı) kullanılır.
  ad: vergiAdiSemasi.optional(),
});

const bolgeKurali = (
  oran: { ulke: string; il?: string | undefined; postaKodu?: string | undefined },
  ctx: z.RefinementCtx,
) => {
  const bolge = bolgeyiDogrula({ ulke: oran.ulke, il: oran.il });
  if (!bolge.gecerli) {
    ctx.addIssue({
      code: "custom",
      message: bolge.hata,
      path: [bolge.hata.startsWith("ulke") ? "ulke" : "il"],
    });
    return;
  }
  if (oran.postaKodu !== undefined && !postaKoduGecerliMi(oran.ulke, oran.postaKodu)) {
    const kod: AdresHatasi = "posta-kodu-bicimi";
    ctx.addIssue({ code: "custom", message: kod, path: ["postaKodu"] });
  }
};

export const sinifGirdisi = z.strictObject({
  ad: vergiAdiSemasi,
  sira: siraSemasi.default(0),
});
export type SinifGirdisi = z.input<typeof sinifGirdisi>;

// Yalnız verilen alan değişir: varsayılan yoktur, verilmeyen sıra sıfıra dönmez.
export const sinifDegisikligi = z.strictObject({
  ad: vergiAdiSemasi.optional(),
  sira: siraSemasi.optional(),
});

export const oranGirdisi = oranAlanlari
  .extend({ sira: siraSemasi.default(0) })
  .superRefine(bolgeKurali);
export type OranGirdisi = z.input<typeof oranGirdisi>;
export type OranDegeri = z.output<typeof oranGirdisi>;

// Sitenin başlangıç verisi (baslangic/vergi.json). Sınıflar ve oranlar yazıldıkları sırayla gelir.
// Dosyası olmayan site sınıfsız başlar.
export const vergiBaslangicSemasi = z.strictObject({
  siniflar: z
    .array(
      z.strictObject({
        ad: vergiAdiSemasi,
        oranlar: z.array(oranAlanlari.superRefine(bolgeKurali)).max(200).default([]),
      }),
    )
    .max(50)
    .superRefine((siniflar, ctx) => {
      const gorulen = new Set<string>();
      siniflar.forEach((sinif, sira) => {
        if (gorulen.has(sinif.ad)) {
          ctx.addIssue({ code: "custom", message: hata("ad-tekrar"), path: [sira, "ad"] });
        }
        gorulen.add(sinif.ad);
      });
    }),
});
export type VergiBaslangici = z.output<typeof vergiBaslangicSemasi>;
