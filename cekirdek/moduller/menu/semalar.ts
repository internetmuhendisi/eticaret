// Menü girdisinin ortak şemaları (kart 0107, karar 0082). Panelin ekranı, uçlar ve site klasörünün
// başlangıç dosyası (baslangic/menuler.json) aynı şemaları kullanır. Hata iletileri düz cümle değil koddur
// (menuHatalari); metni ekran çözer.
//
// Site klasörü doğrulaması bu dosyayı Node ile doğrudan okur: yalnız .ts uzantısıyla, Node'un çalıştırdığı
// dosyaları alır.
import { z } from "zod";
import {
  type KayitliMenuHedefi,
  kullanilabilirMenuHedefleri,
  type MenuHedefTuru,
  menuSinirlari,
  menuTurleri,
} from "../../kayitlar/menu.ts";
import { adresAdiKalibi, adresAdiUzunlugu } from "../../metinler/adres-adi.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { baglantiGecerliMi } from "../../vitrin/bolum-kutuphanesi/tarif.ts";
import { kayitDegeriYasakMi, kayitMetni, kayitMetniHatasi } from "../degisiklik-kaydi/deger.ts";

export const menuHatalari = [
  "kayda-uygun-degil",
  "denetim-karakteri",
  "kod-bicimi",
  // Silinmemiş başka bir menü bu kodu kullanıyor.
  "kod-tekrar",
  "baglanti-gecersiz",
  // Hedef türü bugün seçilemez (sayfa: düz sayfalar gelince açılır).
  "hedef-kullanilamaz",
  // Adres ve başlığın metni zorunludur.
  "metin-gerekli",
  // Bağlanılan kategori, marka ya da ürün yok ya da silinmiş.
  "hedef-yok",
  // Üst öğe yok, silinmiş ya da başka menüde.
  "ust-gecersiz",
  // Öğe derinlik sınırını aşar (alt öğenin altı olmaz).
  "derinlik",
  // Kategori menüsü kategori ağacından kurulur, öğesi olmaz.
  "kategori-menusu",
  "menu-dolu",
  "menu-sayisi",
  // Sıralamada kardeşlerin hepsi, her biri bir kez verilmeli.
  "siralama-gecersiz",
] as const;
export type MenuHatasi = (typeof menuHatalari)[number];

// Her hata kodunun ekran metni: eksik metin tür kontrolünde hata verir.
export const menuHataMetinleri = {
  "kayda-uygun-degil": "yonetim.menu.hata.kayda-uygun-degil",
  "denetim-karakteri": "yonetim.menu.hata.denetim-karakteri",
  "kod-bicimi": "yonetim.menu.hata.kod-bicimi",
  "kod-tekrar": "yonetim.menu.hata.kod-tekrar",
  "baglanti-gecersiz": "yonetim.menu.hata.baglanti-gecersiz",
  "hedef-kullanilamaz": "yonetim.menu.hata.hedef-kullanilamaz",
  "metin-gerekli": "yonetim.menu.hata.metin-gerekli",
  "hedef-yok": "yonetim.menu.hata.hedef-yok",
  "ust-gecersiz": "yonetim.menu.hata.ust-gecersiz",
  derinlik: "yonetim.menu.hata.derinlik",
  "kategori-menusu": "yonetim.menu.hata.kategori-menusu",
  "menu-dolu": "yonetim.menu.hata.menu-dolu",
  "menu-sayisi": "yonetim.menu.hata.menu-sayisi",
  "siralama-gecersiz": "yonetim.menu.hata.siralama-gecersiz",
} as const satisfies Record<MenuHatasi, MetinAnahtari>;

const hata = (kod: MenuHatasi) => kod;

// Değişiklik kaydına girer ve vitrinde yazılır: denetim karakteri taşımaz.
const metin = (enCok: number) =>
  kayitMetni(enCok).refine((deger) => !/\p{Cc}/u.test(deger), hata("denetim-karakteri"));

const kod = z.string().trim().max(adresAdiUzunlugu).regex(adresAdiKalibi, hata("kod-bicimi"));

const adres = z
  .string()
  .trim()
  .max(menuSinirlari.adres)
  .refine(baglantiGecerliMi, hata("baglanti-gecersiz"))
  // Adres değişiklik kaydına girer: kaydın kabul etmediği biçim burada kodla reddedilir.
  .refine((deger) => !kayitDegeriYasakMi(deger), kayitMetniHatasi);

const adresHedefi = z.strictObject({
  tur: z.literal("adres"),
  adres,
  yeniSekme: z.boolean().default(false),
});
const baslikHedefi = z.strictObject({ tur: z.literal("baslik") });

// Panelin verdiği hedef: kayıtlı hedef kimliğiyle.
export const menuHedefi = z
  .discriminatedUnion("tur", [
    z.strictObject({ tur: z.literal("kategori"), kimlik: kimlikSemasi }),
    z.strictObject({ tur: z.literal("marka"), kimlik: kimlikSemasi }),
    z.strictObject({ tur: z.literal("urun"), kimlik: kimlikSemasi }),
    z.strictObject({ tur: z.literal("sayfa"), kimlik: kimlikSemasi }),
    adresHedefi,
    baslikHedefi,
  ])
  .refine((hedef) => kullanilabilirMenuHedefleri[hedef.tur], {
    message: hata("hedef-kullanilamaz"),
    path: ["tur"],
  });
export type MenuHedefi = z.output<typeof menuHedefi>;
export type MenuHedefiGirdisi = z.input<typeof menuHedefi>;

// Adres ve başlığın kendi adı yoktur: metin zorunludur.
export const metinGerekirMi = (tur: MenuHedefTuru) => tur === "adres" || tur === "baslik";

const sira = z.int().min(0).max(9999);

export const menuGirdisi = z.strictObject({
  kod,
  ad: metin(menuSinirlari.menuAdi),
  tur: z.enum(menuTurleri),
});
export type MenuGirdisi = z.input<typeof menuGirdisi>;

// Menünün kodu ve türü açılırken verilir, değişmez: bölümler menüye koduyla başvurur.
export const menuDegisikligi = z.strictObject({ ad: metin(menuSinirlari.menuAdi) });
export type MenuDegisikligi = z.input<typeof menuDegisikligi>;

// Yeni öğe. Verilmeyen üst en üst düzeydir, verilmeyen sıra kardeşlerin sonudur. Boş metin bağlı kaydın
// adını kullanır.
export const ogeGirdisi = z
  .strictObject({
    metin: metin(menuSinirlari.ogeMetni).nullable().default(null),
    hedef: menuHedefi,
    ust: kimlikSemasi.nullable().default(null),
    sira: sira.optional(),
  })
  .refine((oge) => oge.metin !== null || !metinGerekirMi(oge.hedef.tur), {
    message: hata("metin-gerekli"),
    path: ["metin"],
  });
export type OgeGirdisi = z.input<typeof ogeGirdisi>;

// Değişiklik: yalnız verilen alan değişir. Üstün değişmesi taşımadır. Metni boşaltmak için null. Metin
// zorunluluğu birleşmiş öğeye bakılarak serviste denetlenir.
export const ogeDegisikligi = z.strictObject({
  metin: metin(menuSinirlari.ogeMetni).nullable().optional(),
  hedef: menuHedefi.optional(),
  ust: kimlikSemasi.nullable().optional(),
  sira: sira.optional(),
});
export type OgeDegisikligi = z.input<typeof ogeDegisikligi>;

// Başlangıç menüleri (baslangic/menuler.json): kayıtlı hedef adres adıyla yazılır (kimlikler kurulumda
// üretilir). Alt öğe yalnız derinlik sınırına kadar yazılabilir: şema derinlikten kurulur.
const adresAdi = z.string().max(adresAdiUzunlugu).regex(adresAdiKalibi);
const baslangicHedefi = z.discriminatedUnion("tur", [
  z.strictObject({ tur: z.literal("kategori"), adresAdi }),
  z.strictObject({ tur: z.literal("marka"), adresAdi }),
  z.strictObject({ tur: z.literal("urun"), adresAdi }),
  adresHedefi,
  baslikHedefi,
]);

export type BaslangicOgesi = {
  metin?: string;
  hedef: z.output<typeof baslangicHedefi>;
  altlar: BaslangicOgesi[];
};

// En alt düzeyde altlar boş olmalı: dolu liste "derinlik" hatası verir.
const baslangicOgesiSemasi = (kalanDerinlik: number): z.ZodType<BaslangicOgesi, unknown> =>
  z
    .strictObject({
      metin: metin(menuSinirlari.ogeMetni).optional(),
      hedef: baslangicHedefi,
      altlar:
        kalanDerinlik > 1
          ? z.array(z.lazy(() => baslangicOgesiSemasi(kalanDerinlik - 1))).default([])
          : z.array(z.unknown()).max(0, hata("derinlik")).default([]),
    })
    .refine((oge) => oge.metin !== undefined || !metinGerekirMi(oge.hedef.tur), {
      message: hata("metin-gerekli"),
      path: ["metin"],
    }) as z.ZodType<BaslangicOgesi, unknown>;

const ogeSayisi = (ogeler: BaslangicOgesi[]): number =>
  ogeler.reduce((toplam, oge) => toplam + 1 + ogeSayisi(oge.altlar), 0);

const baslangicMenusu = z
  .strictObject({
    kod,
    ad: metin(menuSinirlari.menuAdi),
    tur: z.enum(menuTurleri),
    ogeler: z.array(baslangicOgesiSemasi(menuSinirlari.derinlik)).default([]),
  })
  .superRefine((menu, ctx) => {
    if (menu.tur === "kategori-agaci" && menu.ogeler.length > 0) {
      ctx.addIssue({ code: "custom", message: hata("kategori-menusu"), path: ["ogeler"] });
    }
    if (ogeSayisi(menu.ogeler) > menuSinirlari.ogeSayisi) {
      ctx.addIssue({ code: "custom", message: hata("menu-dolu"), path: ["ogeler"] });
    }
  });

export const menuBaslangicSemasi = z
  .array(baslangicMenusu)
  .max(menuSinirlari.menuSayisi, hata("menu-sayisi"))
  .superRefine((menuler, ctx) => {
    const gorulen = new Set<string>();
    menuler.forEach((menu, sira) => {
      if (gorulen.has(menu.kod)) {
        ctx.addIssue({ code: "custom", message: hata("kod-tekrar"), path: [sira, "kod"] });
      }
      gorulen.add(menu.kod);
    });
  });
export type MenuBaslangici = z.output<typeof menuBaslangicSemasi>;

// Başlangıç menülerinin bağlandığı kayıtlar başlangıç kataloğunda olmalı: katalog kurulmadan menü bağlanamaz.
export const menuBaslangicKurallari = (
  menuler: MenuBaslangici,
  katalog: Record<KayitliMenuHedefi, ReadonlySet<string>>,
): { yer: (string | number)[]; kod: MenuHatasi }[] => {
  const sorunlar: { yer: (string | number)[]; kod: MenuHatasi }[] = [];
  const tara = (ogeler: BaslangicOgesi[], yer: (string | number)[]) => {
    ogeler.forEach((oge, sira) => {
      const burasi = [...yer, sira];
      const { hedef } = oge;
      if ("adresAdi" in hedef && !katalog[hedef.tur].has(hedef.adresAdi)) {
        sorunlar.push({ yer: [...burasi, "hedef", "adresAdi"], kod: "hedef-yok" });
      }
      tara(oge.altlar, [...burasi, "altlar"]);
    });
  };
  menuler.forEach((menu, sira) => {
    tara(menu.ogeler, [sira, "ogeler"]);
  });
  return sorunlar;
};

// Panelin menü uçlarının girdileri (kart 0143, karar 0116). Öğenin kendisi (ogeGirdisi, ogeDegisikligi) yalnız nesne
// olarak alınır, ortak şemayla menü serviste doğrulanır: kapı hata kodu olarak şemanın kendi kodunu yazar, menünün
// kodları ("metin-gerekli", "derinlik") serviste korunur.
const ogeNesnesi = z.record(z.string(), z.unknown());

export const menulerSemasi = z.strictObject({});
export const menuOkumaSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const menuEklemeSemasi = z.strictObject({
  kod: z.string().max(adresAdiUzunlugu),
  ad: z.string().max(menuSinirlari.menuAdi * 2),
  tur: z.enum(menuTurleri),
});
export const menuDegisikligiSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  ad: z.string().max(menuSinirlari.menuAdi * 2),
});
export const menuSilmeSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const ogeEklemeSemasi = z.strictObject({ menu: kimlikSemasi, oge: ogeNesnesi });
export const ogeDegisikligiSemasi = z.strictObject({ kimlik: kimlikSemasi, oge: ogeNesnesi });
export const ogeSilmeSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const ogeSiralamaSemasi = z.strictObject({
  menu: kimlikSemasi,
  ust: kimlikSemasi.nullable(),
  kimlikler: z.array(kimlikSemasi).max(menuSinirlari.ogeSayisi),
});
