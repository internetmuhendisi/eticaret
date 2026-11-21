// Ürün girdisinin ortak şemaları (kart 0076, karar 0062). Panelin ekranı ve uçlar aynı şemayı kullanır.
//
// Şema her alanı tek başına doğrular. Alanlar arası kurallar (zamanlanmış ürünün yayın zamanı, en çok
// adedin en az adetten küçük olmaması) birleşmiş kayda uygulanır, çünkü değişiklikte yalnız bir alan
// gelebilir: servis.ts'deki kurallariDenetle.
//
// Hata iletileri düz cümle değil koddur (urunHatalari); metni ekran çözer.
import { z } from "zod";
import { galeriSinirlari } from "../../kayitlar/gorsel.ts";
import { panelSayfaBoylari } from "../../kayitlar/liste.ts";
import { ozellikSinirlari } from "../../kayitlar/ozellik.ts";
import {
  agirlikSiniriGram,
  type UrunDurumu,
  type UrunTopluIslemi,
  urunDurumlari,
  urunDurumVitrini,
  urunTopluIslemKodlari,
  varsayilanUrunDurumu,
  varyantSinirlari,
} from "../../kayitlar/urun.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { kayitMetni } from "../degisiklik-kaydi/deger.ts";
import { urunOzellikDegeri } from "../ozellik/semalar.ts";
import { barkoduDogrula } from "./barkod.ts";
import { videoAdresiniCoz, videoAdresiUzunlugu } from "./video.ts";

export const urunHatalari = [
  "barkod",
  // Panelde yazılan ağırlık sitenin sayı biçimiyle okunamadı (kart 0263).
  "agirlik-bicimi",
  // Panelde yazılan ağırlık sınırı aşıyor (kart 0263).
  "agirlik-siniri",
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
  "birlesim-tekrar",
  "birlesim-eksik",
  "birlesim-gecersiz",
  "varyantli-urun-birim-alani",
  "son-deger",
  // Panelin seçenekler bölümü (kart 0264): ekranın gördüğü seçenek ya da değer bu arada silinmiş ya da başka ürünün;
  // kayıtlı seçenek ya da değer silmek urun.sil ister.
  "varyant-degisti",
  "varyant-silme-yetkisi",
  // Ürün özelliklerinin değerleri (kart 0086, karar 0072): aynı özellik iki kez, olmayan ya da
  // silinmiş özellik, türüne uymayan değer, özelliğin olmayan ya da silinmiş seçeneği.
  "ozellik-tekrar",
  "ozellik-gecersiz",
  "ozellik-deger-gecersiz",
  // Önerilen sıralama (kart 0136): aynı ürün iki kez, olmayan ya da silinmiş ürün.
  "vitrin-sirasi-tekrar",
  "vitrin-sirasi-gecersiz",
  "ozellik-secenek-gecersiz",
  // Ürün galerisi (kart 0087, karar 0073): olmayan, silinmiş ya da boyutları eksik görsel; aynı görsel
  // iki kez; öğe sınırı; sıralamada eksik ya da fazla öğe; tanınmayan ya da bu sitede kabul edilmeyen
  // video bağlantısı; birleşimin seçtiği öğe ürünün galerisinde görsel değil.
  "galeri-gorsel-gecersiz",
  "galeri-boyut-eksik",
  "galeri-gorsel-tekrar",
  "galeri-siniri",
  "galeri-sira-gecersiz",
  "video-adresi-gecersiz",
  "video-sitesi-izinsiz",
  "birim-gorseli-gecersiz",
] as const;
export type UrunHatasi = (typeof urunHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const urunHataMetinleri = {
  barkod: "yonetim.urun.hata.barkod",
  "agirlik-bicimi": "yonetim.urun.hata.agirlik-bicimi",
  "agirlik-siniri": "yonetim.urun.hata.agirlik-siniri",
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
  "birlesim-tekrar": "yonetim.urun.hata.birlesim-tekrar",
  "birlesim-eksik": "yonetim.urun.hata.birlesim-eksik",
  "birlesim-gecersiz": "yonetim.urun.hata.birlesim-gecersiz",
  "varyantli-urun-birim-alani": "yonetim.urun.hata.varyantli-urun-birim-alani",
  "son-deger": "yonetim.urun.hata.son-deger",
  "varyant-degisti": "yonetim.urun.hata.varyant-degisti",
  "varyant-silme-yetkisi": "yonetim.urun.hata.varyant-silme-yetkisi",
  "ozellik-tekrar": "yonetim.urun.hata.ozellik-tekrar",
  "ozellik-gecersiz": "yonetim.urun.hata.ozellik-gecersiz",
  "ozellik-deger-gecersiz": "yonetim.urun.hata.ozellik-deger-gecersiz",
  "ozellik-secenek-gecersiz": "yonetim.urun.hata.ozellik-secenek-gecersiz",
  "galeri-gorsel-gecersiz": "yonetim.urun.hata.galeri-gorsel-gecersiz",
  "galeri-boyut-eksik": "yonetim.urun.hata.galeri-boyut-eksik",
  "galeri-gorsel-tekrar": "yonetim.urun.hata.galeri-gorsel-tekrar",
  "galeri-siniri": "yonetim.urun.hata.galeri-siniri",
  "galeri-sira-gecersiz": "yonetim.urun.hata.galeri-sira-gecersiz",
  "video-adresi-gecersiz": "yonetim.urun.hata.video-adresi-gecersiz",
  "video-sitesi-izinsiz": "yonetim.urun.hata.video-sitesi-izinsiz",
  "birim-gorseli-gecersiz": "yonetim.urun.hata.birim-gorseli-gecersiz",
  "vitrin-sirasi-tekrar": "yonetim.urun.hata.vitrin-sirasi-tekrar",
  "vitrin-sirasi-gecersiz": "yonetim.urun.hata.vitrin-sirasi-gecersiz",
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

const kimlikListesi = (tekrar: UrunHatasi) =>
  tekrarsizListe(kimlikSemasi, listeSinirlari.grup, tekrar);

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
  vergiSinifi: kimlikSemasi.nullable(),
  stokKodu: metin(64),
  barkod: z.string().transform((barkod, ctx) => {
    const temiz = barkoduDogrula(barkod);
    if (temiz === undefined) {
      ctx.addIssue({ code: "custom", message: hata("barkod") });
      return z.NEVER;
    }
    return temiz;
  }),
  agirlikGram: olcu(agirlikSiniriGram),
  enMm: olcu(100_000),
  boyMm: olcu(100_000),
  yukseklikMm: olcu(100_000),
  // Ürünün kategorileri (kart 0077) ve etiketleri (kart 0078): kimlik listesi, tekrarsız. Sırası
  // önemli değildir.
  kategoriler: kimlikListesi("kategori-tekrar"),
  etiketler: kimlikListesi("etiket-tekrar"),
  // Ürünün markası (kart 0078); null ürünü markasız yapar.
  marka: kimlikSemasi.nullable(),
  // Elle seçilen ilgili ürünler (kart 0079): sırası tutulur. Vitrinde en çok ilgiliUrunSiniri kadarı
  // görünür (ilgili.ts); fazlası, öncekiler vitrinden çıkarsa yerlerini alır.
  ilgiliUrunler: tekrarsizListe(kimlikSemasi, listeSinirlari.ilgili, "ilgili-tekrar"),
  // Ürünün özellik değerleri (kart 0086): her özellikte en çok bir değer. Değerin özelliğin türüne
  // uyduğunu servis özelliği okuyunca denetler (cekirdek/moduller/ozellik/degerler.ts).
  ozellikler: z
    .array(urunOzellikDegeri)
    .max(ozellikSinirlari.ozellik)
    .refine(
      (liste) => new Set(liste.map((d) => d.ozellik)).size === liste.length,
      hata("ozellik-tekrar"),
    ),
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
  ozellikler: alanlar.ozellikler.optional(),
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
  // Verilirse ürünün özellik değerleri bu liste olur; listede olmayan özelliğin değeri kalkar, boş
  // liste bütün değerleri kaldırır.
  ozellikler: alanlar.ozellikler.optional(),
});
export type UrunDegisikligi = z.input<typeof urunDegisikligi>;

// Panelin ürün ekranının uçları (kart 0263). Ürünün alanları servis şemasıyla doğrulanır (urunGirdisi,
// urunDegisikligi): hata alanın adıyla ve ürünün koduyla döner, uç yalnız zarfı denetler. Ağırlık ve sayı türündeki
// özellik değerleri metin olarak gelir, panel-girdisi.ts çevirir.
const urunNesnesi = z.record(z.string(), z.unknown());
// Seçenekler bölümünün son hâli (kart 0264): verilirse ürünle aynı işlemde yazılır; servis varyantKaydi ile doğrular.
const varyantNesnesi = z.record(z.string(), z.unknown()).optional();
export const urunEklemeSemasi = z.strictObject({ urun: urunNesnesi, varyant: varyantNesnesi });
export const urunDegisikligiSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  urun: urunNesnesi,
  varyant: varyantNesnesi,
});
export const urunSilmeSemasi = z.strictObject({ kimlik: kimlikSemasi });

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
  degerler: tekrarsizListe(kimlikSemasi, varyantSinirlari.secenek, "deger-tekrar").min(1),
  sira: sira.optional(),
  stokKodu: alanlar.stokKodu.optional(),
  barkod: alanlar.barkod.optional(),
  agirlikGram: alanlar.agirlikGram.optional(),
  enMm: alanlar.enMm.optional(),
  boyMm: alanlar.boyMm.optional(),
  yukseklikMm: alanlar.yukseklikMm.optional(),
  // Birleşimin görseli: ürünün galerisindeki bir görsel öğesinin kimliği (kart 0087). Verilmezse ana
  // görsel gösterilir.
  gorsel: kimlikSemasi.optional(),
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
  // null seçimi kaldırır: ana görsel gösterilir.
  gorsel: kimlikSemasi.nullable().optional(),
});
export type BirlesimDegisikligi = z.input<typeof birlesimDegisikligi>;

// Panelin seçenekler bölümü (kart 0264, karar 0163): ürünün seçeneklerinin, değerlerinin ve birleşim alanlarının son
// hâli, sırasıyla. Var olan seçenek ve değer kimliğiyle gelir, yenisi kimliksiz. Birleşimler bütün değerlerin
// birleşimidir ve servis kurar; girdideki birleşim yalnız alanlarını taşır, değerleri her seçenekteki değerin sırasıdır
// ([0, 2]: ilk seçeneğin ilk değeri, ikincinin üçüncü değeri). Verilmeyen birleşimin alanı boş açılır.
export const varyantKaydi = z.strictObject({
  secenekler: z
    .array(
      z.strictObject({
        kimlik: kimlikSemasi.optional(),
        ad: secenekAdi,
        degerler: z
          .array(z.strictObject({ kimlik: kimlikSemasi.optional(), ad: secenekAdi }))
          .min(1)
          .max(varyantSinirlari.deger, hata("deger-siniri")),
      }),
    )
    .max(varyantSinirlari.secenek, hata("secenek-siniri")),
  birlesimler: z
    .array(
      z.strictObject({
        degerler: z
          .array(
            z
              .int()
              .min(0)
              .max(varyantSinirlari.deger - 1),
          )
          .min(1)
          .max(varyantSinirlari.secenek),
        stokKodu: alanlar.stokKodu.nullable().optional(),
        barkod: alanlar.barkod.nullable().optional(),
        agirlikGram: alanlar.agirlikGram.nullable().optional(),
        gorsel: kimlikSemasi.nullable().optional(),
      }),
    )
    .max(varyantSinirlari.birlesim, hata("birlesim-siniri")),
});
export type VaryantKaydi = z.input<typeof varyantKaydi>;
export type VaryantKaydiCikti = z.output<typeof varyantKaydi>;

// Galeri öğesinin alternatif metni (kart 0087): görselde ekran okuyucunun okuduğu metin, videoda
// oynatıcının başlığı. Zorunludur.
const alternatifMetin = metin(galeriSinirlari.alternatifMetin);

// Galeriye görsel: dosya deposunda boyutlarıyla kaydedilmiş görselin kimliği (gorselKaydet,
// cekirdek/moduller/dosya/servis.ts). Sıra verilmezse sona eklenir.
export const galeriGorselGirdisi = z.strictObject({
  dosya: kimlikSemasi,
  alternatifMetin,
  sira: sira.optional(),
});
export type GaleriGorselGirdisi = z.input<typeof galeriGorselGirdisi>;

// Galeriye video: video sitesinin bağlantısı. Bağlantıdan yalnız site ve videonun kimliği saklanır
// (video.ts); sitenin bu sitede kabul edildiğini servis ayarla denetler.
export const galeriVideoGirdisi = z.strictObject({
  adres: z
    .string()
    .max(videoAdresiUzunlugu, hata("video-adresi-gecersiz"))
    .refine((adres) => videoAdresiniCoz(adres) !== undefined, hata("video-adresi-gecersiz")),
  alternatifMetin,
  sira: sira.optional(),
});
export type GaleriVideoGirdisi = z.input<typeof galeriVideoGirdisi>;

export const galeriOgesiDegisikligi = z.strictObject({
  alternatifMetin: alternatifMetin.optional(),
});
export type GaleriOgesiDegisikligi = z.input<typeof galeriOgesiDegisikligi>;

// Galerinin yeni sırası: silinmemiş bütün öğelerin kimlikleri, tekrarsız. Eksik ya da fazla öğe
// servis tarafından reddedilir.
export const galeriSiralamasi = z.strictObject({
  ogeler: tekrarsizListe(kimlikSemasi, galeriSinirlari.oge, "galeri-sira-gecersiz"),
});
export type GaleriSiralamasi = z.input<typeof galeriSiralamasi>;

// Panelin ürün listesinin toplu işlem ucunun girdisi (kart 0262): işlem ve en çok bir sayfanın ürünleri.
export const urunTopluIslemiSemasi = z.strictObject({
  islem: z.enum(urunTopluIslemKodlari as [UrunTopluIslemi, ...UrunTopluIslemi[]]),
  urunler: z
    .array(kimlikSemasi)
    .min(1)
    .max(panelSayfaBoylari[panelSayfaBoylari.length - 1] ?? 100),
});
