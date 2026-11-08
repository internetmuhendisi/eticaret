// Ürün girdisinin ortak şemaları (kart 0076, karar 0062). Panelin ekranı ve uçlar aynı şemayı kullanır.
//
// Şema her alanı tek başına doğrular. Alanlar arası kurallar (zamanlanmış ürünün yayın zamanı, en çok
// adedin en az adetten küçük olmaması) birleşmiş kayda uygulanır, çünkü değişiklikte yalnız bir alan
// gelebilir: servis.ts'deki kurallariDenetle.
//
// Hata iletileri düz cümle değil koddur (urunHatalari); metni ekran çözer.
import { z } from "zod";
import {
  type UrunDurumu,
  urunDurumlari,
  urunDurumVitrini,
  varsayilanUrunDurumu,
  varyantSinirlari,
} from "../../kayitlar/urun.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { kayitMetni } from "../degisiklik-kaydi/deger.ts";
import { barkoduDogrula } from "./barkod.ts";

export const urunHatalari = [
  "barkod",
  "kayda-uygun-degil",
  "adres-adi-bicimi",
  "adres-adi-tekrar",
  "stok-kodu-tekrar",
  "yayin-zamani-bicimi",
  "yayin-zamani-gerekli",
  "yayin-zamani-gecersiz",
  "adet-siniri",
  "vergi-sinifi-gecersiz",
  // Ürünün kategorileri (kart 0077): aynı kategori iki kez, ya da olmayan veya silinmiş kategori.
  "kategori-tekrar",
  "kategori-gecersiz",
  // Ürünün markası ve etiketleri (kart 0078).
  "marka-gecersiz",
  "etiket-tekrar",
  "etiket-gecersiz",
  // Elle seçilen ilgili ürünler (kart 0079): aynı ürün iki kez, ürünün kendisi, olmayan ya da
  // silinmiş ürün.
  "ilgili-tekrar",
  "ilgili-kendisi",
  "ilgili-gecersiz",
  // Varyantlı ürün (kart 0085, karar 0071).
  "secenek-ad-tekrar",
  "deger-ad-tekrar",
  "deger-tekrar",
  "secenek-siniri",
  "deger-siniri",
  "birlesim-siniri",
  "secenek-eklenemez",
  "birlesim-tekrar",
  "birlesim-eksik",
  "birlesim-gecersiz",
  "varyantli-urun-birim-alani",
  "son-deger",
] as const;
export type UrunHatasi = (typeof urunHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const urunHataMetinleri = {
  barkod: "yonetim.urun.hata.barkod",
  "kayda-uygun-degil": "yonetim.urun.hata.kayda-uygun-degil",
  "adres-adi-bicimi": "yonetim.urun.hata.adres-adi-bicimi",
  "adres-adi-tekrar": "yonetim.urun.hata.adres-adi-tekrar",
  "stok-kodu-tekrar": "yonetim.urun.hata.stok-kodu-tekrar",
  "yayin-zamani-bicimi": "yonetim.urun.hata.yayin-zamani-bicimi",
  "yayin-zamani-gerekli": "yonetim.urun.hata.yayin-zamani-gerekli",
  "yayin-zamani-gecersiz": "yonetim.urun.hata.yayin-zamani-gecersiz",
  "adet-siniri": "yonetim.urun.hata.adet-siniri",
  "vergi-sinifi-gecersiz": "yonetim.urun.hata.vergi-sinifi-gecersiz",
  "kategori-tekrar": "yonetim.urun.hata.kategori-tekrar",
  "kategori-gecersiz": "yonetim.urun.hata.kategori-gecersiz",
  "marka-gecersiz": "yonetim.urun.hata.marka-gecersiz",
  "etiket-tekrar": "yonetim.urun.hata.etiket-tekrar",
  "etiket-gecersiz": "yonetim.urun.hata.etiket-gecersiz",
  "ilgili-tekrar": "yonetim.urun.hata.ilgili-tekrar",
  "ilgili-kendisi": "yonetim.urun.hata.ilgili-kendisi",
  "ilgili-gecersiz": "yonetim.urun.hata.ilgili-gecersiz",
  "secenek-ad-tekrar": "yonetim.urun.hata.secenek-ad-tekrar",
  "deger-ad-tekrar": "yonetim.urun.hata.deger-ad-tekrar",
  "deger-tekrar": "yonetim.urun.hata.deger-tekrar",
  "secenek-siniri": "yonetim.urun.hata.secenek-siniri",
  "deger-siniri": "yonetim.urun.hata.deger-siniri",
  "birlesim-siniri": "yonetim.urun.hata.birlesim-siniri",
  "secenek-eklenemez": "yonetim.urun.hata.secenek-eklenemez",
  "birlesim-tekrar": "yonetim.urun.hata.birlesim-tekrar",
  "birlesim-eksik": "yonetim.urun.hata.birlesim-eksik",
  "birlesim-gecersiz": "yonetim.urun.hata.birlesim-gecersiz",
  "varyantli-urun-birim-alani": "yonetim.urun.hata.varyantli-urun-birim-alani",
  "son-deger": "yonetim.urun.hata.son-deger",
} as const satisfies Record<UrunHatasi, MetinAnahtari>;

const hata = (kod: UrunHatasi) => kod;

// Serbest metin: değerin tamamı e-posta adresi ya da giriş anahtarı olamaz, değişiklik kaydı onu
// reddeder (karar 0045); mağaza sahibi beklenmeyen hata yerine "kayda-uygun-degil" kodunu görür.
const metin = kayitMetni;

// Listelerin üst sınırı: kategori ve etiket bağlantıları, elle seçilen ilgili ürünler.
export const listeSinirlari = { grup: 50, ilgili: 20 } as const;

// Tekrarsız liste. Başlangıç kataloğu (baslangic-semasi.ts) aynı kuralı adres adı listelerinde kullanır.
export const tekrarsizListe = <T extends z.ZodType>(oge: T, enCok: number, tekrar: UrunHatasi) =>
  z
    .array(oge)
    .max(enCok)
    .refine((liste) => new Set(liste).size === liste.length, hata(tekrar));

const kimlikListesi = (tekrar: UrunHatasi) => tekrarsizListe(z.uuid(), listeSinirlari.grup, tekrar);

// Alanlar arası kurallar: zamanlanmış ürünün yayın zamanı olur, en çok adet en az adetten küçük olmaz.
// Servis birleşmiş kayda uygular (değişiklikte yalnız bir alan gelebilir); başlangıç kataloğunun
// doğrulaması da aynı işlevi kullanır.
export const urunAlanKurallari = (kayit: {
  durum: UrunDurumu;
  yayinZamaniVar: boolean;
  enAzAdet: number;
  enCokAdet: number | null;
}): { alan: string; kod: UrunHatasi }[] => [
  ...(urunDurumVitrini[kayit.durum].zamanli && !kayit.yayinZamaniVar
    ? [{ alan: "yayinZamani", kod: hata("yayin-zamani-gerekli") }]
    : []),
  ...(kayit.enCokAdet !== null && kayit.enCokAdet < kayit.enAzAdet
    ? [{ alan: "enCokAdet", kod: hata("adet-siniri") }]
    : []),
];

// Ağırlık gram, ölçüler milimetre biriminde tam sayıdır (karar 0062). Ekran sitenin birimine
// (agirlikBirimi, boyutBirimi) çevirir.
const olcu = (enCok: number) => z.int().min(0).max(enCok);
const adet = z.int().min(1).max(1_000_000);

const alanlar = {
  ad: metin(200),
  kisaAciklama: metin(1000),
  // Biçimli metin düzenleyicisi panel bölümüyle gelir; vitrin yazarken temizler (.claude/rules/guvenlik.md).
  uzunAciklama: metin(100_000),
  adresAdi: z.string().trim().max(adresAdiUzunlugu).regex(adresAdiKalibi, hata("adres-adi-bicimi")),
  durum: z.enum(urunDurumlari),
  // Sitenin saat diliminde yerel zaman: "2026-11-08T09:30". Servis saat dilimi ayarıyla ana çevirir.
  yayinZamani: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, hata("yayin-zamani-bicimi")),
  kargoGerekmez: z.boolean(),
  // Stok takibi (kart 0082): yeni üründe açık (kullanıcı kararı).
  stokTakibi: z.boolean(),
  // Ürünün kendi düşük stok eşiği (kart 0083); boşsa mağaza ayarı geçerlidir.
  dusukStokEsigi: z.int().min(0).max(1_000_000),
  enAzAdet: adet,
  enCokAdet: adet,
  // Vergi sınıfının kimliği; null ürünü vergisiz yapar. Bilerek zorunludur: unutulan sınıf vergisiz
  // satış olmasın.
  vergiSinifi: z.uuid().nullable(),
  stokKodu: metin(64),
  barkod: z.string().transform((barkod, ctx) => {
    const temiz = barkoduDogrula(barkod);
    if (temiz === undefined) {
      ctx.addIssue({ code: "custom", message: hata("barkod") });
      return z.NEVER;
    }
    return temiz;
  }),
  agirlikGram: olcu(10_000_000),
  enMm: olcu(100_000),
  boyMm: olcu(100_000),
  yukseklikMm: olcu(100_000),
  // Ürünün kategorileri (kart 0077) ve etiketleri (kart 0078): kimlik listesi, tekrarsız. Sırası
  // önemli değildir.
  kategoriler: kimlikListesi("kategori-tekrar"),
  etiketler: kimlikListesi("etiket-tekrar"),
  // Ürünün markası (kart 0078); null ürünü markasız yapar.
  marka: z.uuid().nullable(),
  // Elle seçilen ilgili ürünler (kart 0079): sırası tutulur. Vitrinde en çok ilgiliUrunSiniri kadarı
  // görünür (ilgili.ts); fazlası, öncekiler vitrinden çıkarsa yerlerini alır.
  ilgiliUrunler: tekrarsizListe(z.uuid(), listeSinirlari.ilgili, "ilgili-tekrar"),
};

// Yeni ürün. Verilmeyen adres adı addan üretilir; zamanlanmış durum dışında yayın zamanı yok sayılır.
export const urunGirdisi = z.strictObject({
  ad: alanlar.ad,
  kisaAciklama: alanlar.kisaAciklama.optional(),
  uzunAciklama: alanlar.uzunAciklama.optional(),
  adresAdi: alanlar.adresAdi.optional(),
  durum: alanlar.durum.default(varsayilanUrunDurumu),
  yayinZamani: alanlar.yayinZamani.optional(),
  kargoGerekmez: alanlar.kargoGerekmez.default(false),
  stokTakibi: alanlar.stokTakibi.default(true),
  dusukStokEsigi: alanlar.dusukStokEsigi.optional(),
  enAzAdet: alanlar.enAzAdet.default(1),
  enCokAdet: alanlar.enCokAdet.optional(),
  vergiSinifi: alanlar.vergiSinifi,
  stokKodu: alanlar.stokKodu.optional(),
  barkod: alanlar.barkod.optional(),
  agirlikGram: alanlar.agirlikGram.optional(),
  enMm: alanlar.enMm.optional(),
  boyMm: alanlar.boyMm.optional(),
  yukseklikMm: alanlar.yukseklikMm.optional(),
  kategoriler: alanlar.kategoriler.optional(),
  etiketler: alanlar.etiketler.optional(),
  marka: alanlar.marka.optional(),
  ilgiliUrunler: alanlar.ilgiliUrunler.optional(),
});
export type UrunGirdisi = z.input<typeof urunGirdisi>;

// Değişiklik: yalnız verilen alan değişir. İsteğe bağlı alanı boşaltmak için null verilir.
export const urunDegisikligi = z.strictObject({
  ad: alanlar.ad.optional(),
  kisaAciklama: alanlar.kisaAciklama.nullable().optional(),
  uzunAciklama: alanlar.uzunAciklama.nullable().optional(),
  adresAdi: alanlar.adresAdi.optional(),
  durum: alanlar.durum.optional(),
  yayinZamani: alanlar.yayinZamani.nullable().optional(),
  kargoGerekmez: alanlar.kargoGerekmez.optional(),
  stokTakibi: alanlar.stokTakibi.optional(),
  dusukStokEsigi: alanlar.dusukStokEsigi.nullable().optional(),
  enAzAdet: alanlar.enAzAdet.optional(),
  enCokAdet: alanlar.enCokAdet.nullable().optional(),
  vergiSinifi: alanlar.vergiSinifi.optional(),
  stokKodu: alanlar.stokKodu.nullable().optional(),
  barkod: alanlar.barkod.nullable().optional(),
  agirlikGram: alanlar.agirlikGram.nullable().optional(),
  enMm: alanlar.enMm.nullable().optional(),
  boyMm: alanlar.boyMm.nullable().optional(),
  yukseklikMm: alanlar.yukseklikMm.nullable().optional(),
  // Verilirse ürünün kategorileri ya da etiketleri bu liste olur; boş liste bütün bağlantıları
  // kaldırır. null markayı kaldırır.
  kategoriler: alanlar.kategoriler.optional(),
  etiketler: alanlar.etiketler.optional(),
  marka: alanlar.marka.optional(),
  // Verilirse elle seçilen ilgili ürünler bu liste olur (sırasıyla); boş liste seçimi kaldırır.
  ilgiliUrunler: alanlar.ilgiliUrunler.optional(),
});
export type UrunDegisikligi = z.input<typeof urunDegisikligi>;

// Birimin kendi alanları: basit üründe ürün girdisiyle, varyantlı üründe her birleşimde ayrı gelir
// (kart 0085). Varyantlı üründe ürün girdisi ve değişikliği bunları taşıyamaz.
export const birimAlanAdlari = [
  "stokKodu",
  "barkod",
  "agirlikGram",
  "enMm",
  "boyMm",
  "yukseklikMm",
] as const;

// Seçeneklerin ve değerlerin adları sitenin verisidir ("Beden", "M"). Ad tekilliği veritabanında, ad
// anahtarıyla aranır (karar 0064); girdi içindeki tekrar da öyle yakalanır.
const secenekAdi = metin(100);
const sira = z.int().min(0).max(1_000_000);

// Yeni seçenek ve değerleri; değerlerin sırası listedeki sıradır.
export const secenekGirdisi = z.strictObject({
  ad: secenekAdi,
  sira: sira.optional(),
  degerler: z.array(secenekAdi).min(1).max(varyantSinirlari.deger),
});
export type SecenekGirdisi = z.input<typeof secenekGirdisi>;

export const secenekDegisikligi = z.strictObject({
  ad: secenekAdi.optional(),
  sira: sira.optional(),
});
export type SecenekDegisikligi = z.input<typeof secenekDegisikligi>;

export const degerGirdisi = z.strictObject({ ad: secenekAdi, sira: sira.optional() });
export type DegerGirdisi = z.input<typeof degerGirdisi>;

export const degerDegisikligi = z.strictObject({
  ad: secenekAdi.optional(),
  sira: sira.optional(),
});
export type DegerDegisikligi = z.input<typeof degerDegisikligi>;

// Yeni birleşim: her seçenekten bir değerin kimliği ve birimin alanları. Birleşim sonradan değişmez:
// başka bir birleşim yeni birimdir (stok ve fiyat geçmişi birime bağlıdır).
export const birlesimGirdisi = z.strictObject({
  degerler: tekrarsizListe(z.uuid(), varyantSinirlari.secenek, "deger-tekrar").min(1),
  sira: sira.optional(),
  stokKodu: alanlar.stokKodu.optional(),
  barkod: alanlar.barkod.optional(),
  agirlikGram: alanlar.agirlikGram.optional(),
  enMm: alanlar.enMm.optional(),
  boyMm: alanlar.boyMm.optional(),
  yukseklikMm: alanlar.yukseklikMm.optional(),
});
export type BirlesimGirdisi = z.input<typeof birlesimGirdisi>;

// Birleşimin değişikliği: yalnız verilen alan değişir, null boşaltır.
export const birlesimDegisikligi = z.strictObject({
  sira: sira.optional(),
  stokKodu: alanlar.stokKodu.nullable().optional(),
  barkod: alanlar.barkod.nullable().optional(),
  agirlikGram: alanlar.agirlikGram.nullable().optional(),
  enMm: alanlar.enMm.nullable().optional(),
  boyMm: alanlar.boyMm.nullable().optional(),
  yukseklikMm: alanlar.yukseklikMm.nullable().optional(),
});
export type BirlesimDegisikligi = z.input<typeof birlesimDegisikligi>;
