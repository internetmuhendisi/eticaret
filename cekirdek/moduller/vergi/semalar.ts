// Vergi sınıfı ve oran girdisinin ortak şemaları (kart 0074, karar 0060). Panelin ekranı, uçlar ve
// sitenin başlangıç verisi (baslangic/vergi.json) aynı şemayı kullanır.
//
// Çekirdekte vergi adı, oran ya da ülke yazmaz (.claude/rules/e-ticaret-is-kurallari.md): hepsi sitenin
// verisidir. Bunu cekirdek/testler/vergi-degeri-yok.test.ts denetler.
//
// Oran, küsuratlı sayı yerine milyonda bir birimiyle tam sayı olarak saklanır: %18 = 180000,
// %7,5 = 75000. Girişte yüzde metin olarak yazılır ("18", "7.5" ya da "7,5") ve sayıya çevrilmeden
// okunur, böylece hiçbir adımda yuvarlama olmaz. En çok dört ondalık basamak yazılabilir. Yüzde 100'ü
// geçemediği için binlik ayırıcı yoktur: nokta da virgül de ondalık ayırıcıdır.
//
// Hata iletileri düz cümle değil koddur (vergiHatalari, bolgeHatalari, adresHatalari); metni ekran çözer.
// Komutlar bu dosyayı Node ile doğrudan çalıştırır (site doğrulaması): yalnız silinebilir tür sözdizimi.
import { z } from "zod";
import type { AdresHatasi } from "../../bolgeler/adres.ts";
import { bolgeyiDogrula, postaKoduGecerliMi } from "../../bolgeler/bolgeler.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";

export const vergiHatalari = [
  "oran-bicimi",
  "oran-siniri",
  "ad-bicimi",
  "ad-tekrar",
  "sinif-silinmis",
  // Başlangıç verisinde birden çok kargo sınıfı (kart 0075).
  "kargo-tekrar",
  // Ne müşterinin ne mağazanın bölgesi vergi tablosunda var (kart 0075, karar 0061).
  "vergi-bolgesi-yok",
] as const;
export type VergiHatasi = (typeof vergiHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const vergiHataMetinleri = {
  "oran-bicimi": "yonetim.vergi.hata.oran-bicimi",
  "oran-siniri": "yonetim.vergi.hata.oran-siniri",
  "ad-bicimi": "yonetim.vergi.hata.ad-bicimi",
  "ad-tekrar": "yonetim.vergi.hata.ad-tekrar",
  "sinif-silinmis": "yonetim.vergi.hata.sinif-silinmis",
  "kargo-tekrar": "yonetim.vergi.hata.kargo-tekrar",
  "vergi-bolgesi-yok": "yonetim.vergi.hata.vergi-bolgesi-yok",
} as const satisfies Record<VergiHatasi, MetinAnahtari>;

// Vergi ayarlarının seçenekleri (kart 0075, karar 0061). Mağaza sahibinin ayarıdır (ayarlar.ts).
// - fiyatGirisi: ürün ve kargo fiyatı vergi dahil mi hariç mi girilir.
// - vergiAdresi: vergi hangi adresin bölgesine göre hesaplanır.
// - vergiYuvarlama: vergi her satırda mı, aynı oranlı satırların toplamında mı yuvarlanır.
export const fiyatGirisleri = ["vergi-dahil", "vergi-haric"] as const;
export type FiyatGirisi = (typeof fiyatGirisleri)[number];
export const vergiAdresleri = ["teslimat", "fatura", "magaza"] as const;
export type VergiAdresi = (typeof vergiAdresleri)[number];
export const vergiYuvarlamalari = ["satir", "ara-toplam"] as const;
export type VergiYuvarlama = (typeof vergiYuvarlamalari)[number];

// Tam oran (yüzde yüz) milyonda bir biriminde.
export const tamOran = 1_000_000;
const yuzdeBasinaBirim = tamOran / 100;
const ondalikBasamak = 4;

// Yüzde metnini ("18", "7.5", "7,5", "0.0001") milyonda bir birimine çevirir. Biçim dışı metin
// undefined döner.
export const yuzdedenOrana = (yuzde: string): number | undefined => {
  const eslesme = /^(\d{1,3})(?:[.,](\d{1,4}))?$/.exec(yuzde);
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
  .refine((ad) => !ad.includes("@"), hata("ad-bicimi"));

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

// Sıra verilmezse servis yeni kaydı listenin sonuna koyar.
export const sinifGirdisi = z.strictObject({
  ad: vergiAdiSemasi,
  sira: siraSemasi.optional(),
});
export type SinifGirdisi = z.input<typeof sinifGirdisi>;

// Yalnız verilen alan değişir: varsayılan yoktur, verilmeyen sıra sıfıra dönmez.
export const sinifDegisikligi = z.strictObject({
  ad: vergiAdiSemasi.optional(),
  sira: siraSemasi.optional(),
});

export const oranGirdisi = oranAlanlari
  .extend({ sira: siraSemasi.optional() })
  .superRefine(bolgeKurali);
export type OranGirdisi = z.input<typeof oranGirdisi>;

// Oran değişikliği: yalnız verilen alan değişir. İsteğe bağlı alanı (il, posta kodu, ad) boşaltmak için
// null verilir; verilmeyen alan eski değerinde kalır. Bölge kuralı birleşmiş sonuca uygulanır
// (oranBolgesi), çünkü yalnız il değişince de ülkeyle tutarlı olmalıdır.
export const oranDegisikligi = z.strictObject({
  ulke: z.string().trim().optional(),
  il: z.string().trim().nullable().optional(),
  postaKodu: z.string().trim().min(1).max(20).nullable().optional(),
  oran: oranSemasi.optional(),
  ad: vergiAdiSemasi.nullable().optional(),
  sira: siraSemasi.optional(),
});
export type OranDegisikligi = z.input<typeof oranDegisikligi>;

export const oranBolgesi = z
  .strictObject({
    ulke: z.string(),
    il: z.string().optional(),
    postaKodu: z.string().optional(),
  })
  .superRefine(bolgeKurali);

// Sitenin başlangıç verisi (baslangic/vergi.json). Sınıflar ve oranlar yazıldıkları sırayla gelir.
// Dosyası olmayan site sınıfsız başlar.
export const vergiBaslangicSemasi = z.strictObject({
  siniflar: z
    .array(
      z.strictObject({
        ad: vergiAdiSemasi,
        // Kargo ücretinin sınıfı (kart 0075); en çok bir sınıf.
        kargo: z.literal(true).optional(),
        oranlar: z.array(oranAlanlari.superRefine(bolgeKurali)).max(200).default([]),
      }),
    )
    .max(50)
    .superRefine((siniflar, ctx) => {
      const gorulen = new Set<string>();
      let kargoGoruldu = false;
      siniflar.forEach((sinif, sira) => {
        if (gorulen.has(sinif.ad)) {
          ctx.addIssue({ code: "custom", message: hata("ad-tekrar"), path: [sira, "ad"] });
        }
        gorulen.add(sinif.ad);
        if (sinif.kargo === true) {
          if (kargoGoruldu) {
            ctx.addIssue({ code: "custom", message: hata("kargo-tekrar"), path: [sira, "kargo"] });
          }
          kargoGoruldu = true;
        }
      });
    }),
});
export type VergiBaslangici = z.output<typeof vergiBaslangicSemasi>;
