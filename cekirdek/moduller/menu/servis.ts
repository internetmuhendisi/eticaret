// Menüleri okuyan ve değiştiren tek yol (kart 0107, karar 0082).
//
// - Menü: kod, ad ve tür. Kod ve tür açılırken verilir, değişmez. Kategori menüsü (kategori-agaci) öğe
//   saklamaz, kategori ağacından derinlik sınırına kadar kurulur.
// - Öğe: bir hedefe (kategori, marka, ürün, sabit sayfa, blog yazısı, adres, başlık; kart 0273) bağlanır, sıralanır,
//   bir alt düzey açılır. Derinlik kayıttadır (cekirdek/kayitlar/menu.ts).
// - Yarış: bütün yazmalar aynı işlem kilidini alır. Veritabanındaki ağaç tetikleyicisi (değişiklik 0026) aynı
//   kilidi alır: servisi atlayan yazılar da sırayla denetlenir. Bağlanılan kayıt paylaşımlı kilitlenir: aynı
//   anda silinen kayda bağlanılmaz, silme bitene kadar beklenir. Kilit sırası: menü, sonra kayıtların
//   satırları; kategori, marka ve ürün silmesi menü kilidini almaz.
// - Bağlı kayıt sonradan silinirse öğe yerinde kalır: vitrinde görünmez (altlarıyla), panelde "hedef-silindi"
//   olarak görünür. Vitrinde açılmayan ürün, taslak sayfa ve vitrinde olmayan blog yazısı (blog kapalıyken hepsi) da
//   ("hedef-gorunmuyor") görünmez. Görünür altı kalmayan başlık
//   da görünmez ("bos-baslik").
// - Silme işaretle yapılır: silinen öğenin altları da silinir, silinen menünün öğeleri de.
// - Her yazım değişiklik kaydına aynı veritabanı işleminde girer (karar 0045).
//
// İzin kapıda denetlenir (izinler.ts); servis yalnız kimin yaptığını kayda yazar.
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, asc, count, eq, inArray, isNull, max, sql } from "drizzle-orm";
import type { z } from "zod";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  type KayitliMenuHedefi,
  kullanilabilirMenuHedefleri,
  type MenuHedefTuru,
  type MenuTuru,
  menuSinirlari,
} from "../../kayitlar/menu.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { blogYazilari, sabitSayfalar } from "../icerik/model.ts";
import { sabitSayfaVitrinde } from "../icerik/sayfa.ts";
import { blogYazisiVitrinde } from "../icerik/vitrin.ts";
import { kategoriler } from "../kategori/model.ts";
import { kategorileriOku } from "../kategori/servis.ts";
import { markalar } from "../marka/model.ts";
import { urunler } from "../urun/model.ts";
import { vitrinKosulu } from "../urun/vitrin.ts";
import { menuler, menuOgeleri } from "./model.ts";
import {
  type MenuDegisikligi,
  type MenuGirdisi,
  type MenuHatasi,
  type MenuHedefi,
  menuDegisikligi,
  menuGirdisi,
  menuHatalari,
  metinGerekirMi,
  type OgeDegisikligi,
  type OgeGirdisi,
  ogeDegisikligi,
  ogeGirdisi,
} from "./semalar.ts";

export type Menu = { kimlik: string; kod: string; ad: string; tur: MenuTuru };

// Öğenin saklanan hedefi: kayıtlı hedef kimliğiyle.
export type SaklananHedef =
  | { tur: KayitliMenuHedefi; kimlik: string }
  | { tur: "adres"; adres: string; yeniSekme: boolean }
  | { tur: "baslik" };

// Vitrinin gördüğü hedef: kayıtlı hedef adres adıyla (sayfa adresini vitrin kurar).
export type VitrinHedefi =
  | { tur: KayitliMenuHedefi; adresAdi: string }
  | { tur: "adres"; adres: string; yeniSekme: boolean }
  | { tur: "baslik" };

export type MenuDali = { kimlik: string; metin: string; hedef: VitrinHedefi; altlar: MenuDali[] };

export type OgeDurumu = "gecerli" | "hedef-silindi" | "hedef-gorunmuyor" | "bos-baslik";

export type PanelOgesi = {
  kimlik: string;
  // Mağaza sahibinin yazdığı metin; boşsa vitrinde bağlı kaydın adı görünür.
  metin: string | null;
  // Vitrinde görünecek (ya da hedef silinmişse görünecek olan) metin.
  gorunenMetin: string;
  hedef: SaklananHedef;
  // Kayıtlı hedefin bugünkü adı ve adres adı (kart 0143): panel seçili kaydı adıyla ve vitrindeki adresiyle
  // gösterir. Hedef silinmişse de son hâli gelir.
  kayit?: { ad: string; adresAdi: string };
  durum: OgeDurumu;
  altlar: PanelOgesi[];
};

type Sorun = { alan: string; kod: string };
const dogrulama = (sorunlar: Sorun[]) => new BilinenHata("dogrulama", sorunlar);
const isKurali = (alan: string, kod: MenuHatasi) => new BilinenHata("is-kurali", [{ alan, kod }]);

const bilinenKodlar = new Set<string>(menuHatalari);
const girdiyiDogrula = <T>(sonuc: z.ZodSafeParseResult<T>): T => {
  if (sonuc.success) return sonuc.data;
  throw dogrulama(
    sonuc.error.issues.map((sorun) => ({
      alan: sorun.path.join("."),
      kod: bilinenKodlar.has(sorun.message) ? sorun.message : sorun.code,
    })),
  );
};

// Menü yazmalarının işlem kilidi. Veritabanındaki ağaç tetikleyicisi de bunu alır.
export const menuKilidiAl = (islem: VeritabaniIslemi) =>
  islem.execute(sql`select pg_advisory_xact_lock(hashtext('menu'))`);

const yaz = <T>(vt: Veritabani | VeritabaniIslemi, is: (islem: VeritabaniIslemi) => Promise<T>) =>
  vt.transaction(async (islem) => {
    await menuKilidiAl(islem);
    return is(islem);
  });

const kayitliTablolar = {
  kategori: kategoriler,
  marka: markalar,
  urun: urunler,
  sayfa: sabitSayfalar,
  "blog-yazisi": blogYazilari,
} as const satisfies Record<KayitliMenuHedefi, unknown>;

const hedefSatiri = (hedef: SaklananHedef) => ({
  hedef_turu: hedef.tur,
  kategori_kimligi: hedef.tur === "kategori" ? hedef.kimlik : null,
  marka_kimligi: hedef.tur === "marka" ? hedef.kimlik : null,
  urun_kimligi: hedef.tur === "urun" ? hedef.kimlik : null,
  sayfa_kimligi: hedef.tur === "sayfa" ? hedef.kimlik : null,
  blog_yazisi_kimligi: hedef.tur === "blog-yazisi" ? hedef.kimlik : null,
  adres: hedef.tur === "adres" ? hedef.adres : null,
  yeni_sekme: hedef.tur === "adres" ? hedef.yeniSekme : false,
});

type OgeSatiri = {
  kimlik: string;
  ust: string | null;
  sira: number;
  metin: string | null;
  hedefTuru: string;
  kategori: string | null;
  marka: string | null;
  urun: string | null;
  sayfa: string | null;
  "blog-yazisi": string | null;
  adres: string | null;
  yeniSekme: boolean;
};

const ogeAlanlari = {
  kimlik: menuOgeleri.kimlik,
  ust: menuOgeleri.ust_kimligi,
  sira: menuOgeleri.sira,
  metin: menuOgeleri.metin,
  hedefTuru: menuOgeleri.hedef_turu,
  kategori: menuOgeleri.kategori_kimligi,
  marka: menuOgeleri.marka_kimligi,
  urun: menuOgeleri.urun_kimligi,
  sayfa: menuOgeleri.sayfa_kimligi,
  "blog-yazisi": menuOgeleri.blog_yazisi_kimligi,
  adres: menuOgeleri.adres,
  yeniSekme: menuOgeleri.yeni_sekme,
};

// Satırdaki hedef. Denetim (menu_ogeleri_hedef) türle alanların uyumunu garanti eder.
const satirinHedefi = (satir: OgeSatiri): SaklananHedef => {
  const tur = satir.hedefTuru as MenuHedefTuru;
  switch (tur) {
    case "kategori":
    case "marka":
    case "urun":
    case "sayfa":
    case "blog-yazisi": {
      const kimlik = satir[tur];
      if (kimlik === null) throw new Error(`Menü öğesinin hedefi eksik: ${satir.kimlik}.`);
      return { tur, kimlik };
    }
    case "adres":
      if (satir.adres === null) throw new Error(`Menü öğesinin adresi eksik: ${satir.kimlik}.`);
      return { tur, adres: satir.adres, yeniSekme: satir.yeniSekme };
    case "baslik":
      return { tur };
  }
};

// Panelin verdiği hedef saklanacak hedefe döner. Kullanılamayan hedef türü şemada da reddedilir.
const saklanacakHedef = (hedef: MenuHedefi): SaklananHedef => {
  if (!kullanilabilirMenuHedefleri[hedef.tur]) {
    throw dogrulama([{ alan: "hedef.tur", kod: "hedef-kullanilamaz" }]);
  }
  return hedef;
};

// Kayıtlı hedef var ve silinmemiş olmalı; aynı işlemde paylaşımlı kilitlenir.
const hedefiDenetle = async (islem: VeritabaniIslemi, hedef: SaklananHedef) => {
  if (hedef.tur === "adres" || hedef.tur === "baslik") return;
  const tablo = kayitliTablolar[hedef.tur];
  const [bulunan] = await islem
    .select({ kimlik: tablo.kimlik })
    .from(tablo)
    .where(and(eq(tablo.kimlik, hedef.kimlik), isNull(tablo.silinme_zamani)))
    .for("share");
  if (bulunan === undefined) throw dogrulama([{ alan: "hedef.kimlik", kod: "hedef-yok" }]);
};

// Kayda giden hedef: boş alan yazılmaz.
const hedefKaydi = (hedef: SaklananHedef): Record<string, unknown> => ({ ...hedef });

const menuyuBul = async (islem: VeritabaniIslemi, kimlik: string) => {
  if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
  const [menu] = await islem
    .select({ kimlik: menuler.kimlik, kod: menuler.kod, ad: menuler.ad, tur: menuler.tur })
    .from(menuler)
    .where(and(eq(menuler.kimlik, kimlik), isNull(menuler.silinme_zamani)));
  if (menu === undefined) throw new BilinenHata("bulunamadi");
  return menu as Menu;
};

// Silinmemiş menünün silinmemiş öğesi.
const ogeyiBul = async (islem: VeritabaniIslemi, kimlik: string) => {
  if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
  const [satir] = await islem
    .select({ ...ogeAlanlari, menu: menuOgeleri.menu_kimligi })
    .from(menuOgeleri)
    .innerJoin(menuler, eq(menuler.kimlik, menuOgeleri.menu_kimligi))
    .where(
      and(
        eq(menuOgeleri.kimlik, kimlik),
        isNull(menuOgeleri.silinme_zamani),
        isNull(menuler.silinme_zamani),
      ),
    );
  if (satir === undefined) throw new BilinenHata("bulunamadi");
  return satir;
};

// Özyinelemeli sorguların düzey sınırı. Servisin yazdığı ağaç derinlik sınırını aşmaz; tetikleyiciyi atlayan
// doğrudan bir yazı (örneğin silinmiş satırla kurulmuş döngü) sorguyu sonsuza döndürmesin. Tetikleyicideki
// sınırla aynıdır.
const ozyinelemeSiniri = 100;

// Öğenin silinmemiş bütün alt öğeleri (kendisi hariç). Kimlikle birleştiği için döngüde de biter.
const altAgac = async (islem: VeritabaniIslemi, kimlik: string): Promise<string[]> => {
  const sonuc = await islem.execute<{ kimlik: string }>(sql`
    with recursive agac(kimlik) as (
      select ${menuOgeleri.kimlik} from ${menuOgeleri}
        where ${menuOgeleri.ust_kimligi} = ${kimlik}::uuid and ${menuOgeleri.silinme_zamani} is null
      union
      select ${menuOgeleri.kimlik} from ${menuOgeleri}
        join agac on ${menuOgeleri.ust_kimligi} = agac.kimlik
        where ${menuOgeleri.silinme_zamani} is null
    )
    select kimlik from agac`);
  return sonuc.rows.map((satir) => satir.kimlik).toSorted();
};

// Öğenin düzeyi: en üst 1.
const duzeyi = async (islem: VeritabaniIslemi, kimlik: string): Promise<number> => {
  const sonuc = await islem.execute<{ duzey: number }>(sql`
    with recursive atalar(kimlik, duzey) as (
      select ${kimlik}::uuid, 1
      union
      select ${menuOgeleri.ust_kimligi}, atalar.duzey + 1 from ${menuOgeleri}
        join atalar on ${menuOgeleri.kimlik} = atalar.kimlik
        where ${menuOgeleri.ust_kimligi} is not null and atalar.duzey < ${ozyinelemeSiniri}
    )
    select max(duzey)::int as duzey from atalar`);
  return sonuc.rows[0]?.duzey ?? 1;
};

// Öğenin altında kaç düzey var: altı yoksa 0.
const altDerinligi = async (islem: VeritabaniIslemi, kimlik: string): Promise<number> => {
  const sonuc = await islem.execute<{ derinlik: number }>(sql`
    with recursive agac(kimlik, derinlik) as (
      select ${kimlik}::uuid, 0
      union
      select ${menuOgeleri.kimlik}, agac.derinlik + 1 from ${menuOgeleri}
        join agac on ${menuOgeleri.ust_kimligi} = agac.kimlik
        where ${menuOgeleri.silinme_zamani} is null and agac.derinlik < ${ozyinelemeSiniri}
    )
    select max(derinlik)::int as derinlik from agac`);
  return sonuc.rows[0]?.derinlik ?? 0;
};

// Üst öğe aynı menüde ve silinmemiş olmalı; taşınan öğe kendi altına giremez; derinlik aşılmamalı.
const ustuDenetle = async (
  islem: VeritabaniIslemi,
  menu: string,
  ust: string | null,
  tasinan?: string,
) => {
  const altlar = tasinan === undefined ? 0 : await altDerinligi(islem, tasinan);
  if (ust === null) {
    if (1 + altlar > menuSinirlari.derinlik) throw isKurali("ust", "derinlik");
    return;
  }
  const [bulunan] = await islem
    .select({ kimlik: menuOgeleri.kimlik })
    .from(menuOgeleri)
    .where(
      and(
        eq(menuOgeleri.kimlik, ust),
        eq(menuOgeleri.menu_kimligi, menu),
        isNull(menuOgeleri.silinme_zamani),
      ),
    );
  if (bulunan === undefined) throw dogrulama([{ alan: "ust", kod: "ust-gecersiz" }]);
  if (tasinan !== undefined && (ust === tasinan || (await altAgac(islem, tasinan)).includes(ust))) {
    throw isKurali("ust", "ust-gecersiz");
  }
  if ((await duzeyi(islem, ust)) + 1 + altlar > menuSinirlari.derinlik) {
    throw isKurali("ust", "derinlik");
  }
};

const ayniUst = (menu: string, ust: string | null) =>
  and(
    eq(menuOgeleri.menu_kimligi, menu),
    ust === null ? isNull(menuOgeleri.ust_kimligi) : eq(menuOgeleri.ust_kimligi, ust),
    isNull(menuOgeleri.silinme_zamani),
  );

const sonrakiSira = async (islem: VeritabaniIslemi, menu: string, ust: string | null) => {
  const [son] = await islem
    .select({ sira: max(menuOgeleri.sira) })
    .from(menuOgeleri)
    .where(ayniUst(menu, ust));
  return son?.sira === null || son?.sira === undefined ? 0 : son.sira + 1;
};

const menuKaydi = (menu: Omit<Menu, "kimlik">) => ({ kod: menu.kod, ad: menu.ad, tur: menu.tur });

export const menuEkle = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  ham: MenuGirdisi,
): Promise<string> => {
  const girdi = girdiyiDogrula(menuGirdisi.safeParse(ham));
  return yaz(vt, async (islem) => {
    const [sayi] = await islem
      .select({ sayi: count() })
      .from(menuler)
      .where(isNull(menuler.silinme_zamani));
    if ((sayi?.sayi ?? 0) >= menuSinirlari.menuSayisi) throw isKurali("menu", "menu-sayisi");
    const [ayniKod] = await islem
      .select({ kimlik: menuler.kimlik })
      .from(menuler)
      .where(and(eq(menuler.kod, girdi.kod), isNull(menuler.silinme_zamani)));
    if (ayniKod !== undefined) {
      throw new BilinenHata("cakisma", [{ alan: "kod", kod: "kod-tekrar" }]);
    }
    const kimlik = randomUUID();
    await islem.insert(menuler).values({ kimlik, kod: girdi.kod, ad: girdi.ad, tur: girdi.tur });
    await degisikligiKaydet(islem, {
      kim,
      islem: "menu.eklendi",
      kayit: { tur: "menu", kimlik },
      eski: null,
      yeni: menuKaydi(girdi),
    });
    return kimlik;
  });
};

export const menuDegistir = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  kimlik: string,
  ham: MenuDegisikligi,
): Promise<void> => {
  const girdi = girdiyiDogrula(menuDegisikligi.safeParse(ham));
  await yaz(vt, async (islem) => {
    const menu = await menuyuBul(islem, kimlik);
    if (menu.ad === girdi.ad) return;
    await islem
      .update(menuler)
      .set({ ad: girdi.ad, guncellenme_zamani: sql`now()` })
      .where(eq(menuler.kimlik, kimlik));
    await degisikligiKaydet(islem, {
      kim,
      islem: "menu.degisti",
      kayit: { tur: "menu", kimlik },
      eski: { ad: menu.ad },
      yeni: { ad: girdi.ad },
    });
  });
};

// Menü ve bütün öğeleri silinmiş işaretlenir; kod serbest kalır.
export const menuSil = (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) =>
  yaz(vt, async (islem) => {
    const menu = await menuyuBul(islem, kimlik);
    const silinen = await islem
      .update(menuOgeleri)
      .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
      .where(and(eq(menuOgeleri.menu_kimligi, kimlik), isNull(menuOgeleri.silinme_zamani)))
      .returning({ kimlik: menuOgeleri.kimlik });
    await islem
      .update(menuler)
      .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
      .where(eq(menuler.kimlik, kimlik));
    await degisikligiKaydet(islem, {
      kim,
      islem: "menu.silindi",
      kayit: { tur: "menu", kimlik },
      eski: {
        ...menuKaydi(menu),
        ...(silinen.length > 0 ? { ogeler: silinen.map((oge) => oge.kimlik).toSorted() } : {}),
      },
      yeni: null,
    });
  });

type OgeKaydi = {
  metin: string | null;
  hedef: SaklananHedef;
  ust: string | null;
  sira: number;
};

const ogeKaydi = (oge: OgeKaydi): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries({ ...oge, hedef: hedefKaydi(oge.hedef) }).filter(([, deger]) => deger !== null),
  );

// Elle kurulan menüye öğe ekler. Yeni öğenin kimliğini döndürür.
export const ogeEkle = async (
  vt: Veritabani | VeritabaniIslemi,
  kim: DegisikligiYapan,
  menuKimligi: string,
  ham: OgeGirdisi,
): Promise<string> => {
  const girdi = girdiyiDogrula(ogeGirdisi.safeParse(ham));
  const hedef = saklanacakHedef(girdi.hedef);
  return yaz(vt, async (islem) => {
    const menu = await menuyuBul(islem, menuKimligi);
    if (menu.tur !== "elle") throw isKurali("menu", "kategori-menusu");
    const [sayi] = await islem
      .select({ sayi: count() })
      .from(menuOgeleri)
      .where(and(eq(menuOgeleri.menu_kimligi, menu.kimlik), isNull(menuOgeleri.silinme_zamani)));
    if ((sayi?.sayi ?? 0) >= menuSinirlari.ogeSayisi) throw isKurali("menu", "menu-dolu");
    await ustuDenetle(islem, menu.kimlik, girdi.ust);
    await hedefiDenetle(islem, hedef);
    const kayit: OgeKaydi = {
      metin: girdi.metin,
      hedef,
      ust: girdi.ust,
      sira: girdi.sira ?? (await sonrakiSira(islem, menu.kimlik, girdi.ust)),
    };
    const kimlik = randomUUID();
    await islem.insert(menuOgeleri).values({
      kimlik,
      menu_kimligi: menu.kimlik,
      ust_kimligi: kayit.ust,
      sira: kayit.sira,
      metin: kayit.metin,
      ...hedefSatiri(hedef),
    });
    await degisikligiKaydet(islem, {
      kim,
      islem: "menu-ogesi.eklendi",
      kayit: { tur: "menu-ogesi", kimlik },
      eski: null,
      yeni: { menu: menu.kimlik, ...ogeKaydi(kayit) },
    });
    return kimlik;
  });
};

// Yalnız verilen alan değişir. Üst değişirse taşımadır: yeni üst aynı menüde olmalı, derinlik aşılmamalı;
// taşınan öğe sırası verilmezse yeni kardeşlerin sonuna gelir. Hedef verilirse denetlenir; verilmeyen hedef,
// sonradan silinmiş olsa da, değişmeden kalır. Aynı kalan değişiklik kayda girmez.
export const ogeDegistir = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  kimlik: string,
  ham: OgeDegisikligi,
): Promise<void> => {
  const girdi = girdiyiDogrula(ogeDegisikligi.safeParse(ham));
  const yeniHedef = girdi.hedef === undefined ? undefined : saklanacakHedef(girdi.hedef);
  await yaz(vt, async (islem) => {
    const satir = await ogeyiBul(islem, kimlik);
    const eski: OgeKaydi = {
      metin: satir.metin,
      hedef: satirinHedefi(satir),
      ust: satir.ust,
      sira: satir.sira,
    };
    const ust = girdi.ust === undefined ? eski.ust : girdi.ust;
    const tasindi = ust !== eski.ust;
    const yeni: OgeKaydi = {
      metin: girdi.metin === undefined ? eski.metin : girdi.metin,
      hedef: yeniHedef ?? eski.hedef,
      ust,
      sira: girdi.sira ?? (tasindi ? await sonrakiSira(islem, satir.menu, ust) : eski.sira),
    };
    if (yeni.metin === null && metinGerekirMi(yeni.hedef.tur)) {
      throw dogrulama([{ alan: "metin", kod: "metin-gerekli" }]);
    }
    const hedefDegisti = !isDeepStrictEqual(yeni.hedef, eski.hedef);
    const degisen = (["metin", "ust", "sira"] as const).filter((alan) => eski[alan] !== yeni[alan]);
    if (degisen.length === 0 && !hedefDegisti) return;
    if (tasindi) await ustuDenetle(islem, satir.menu, ust, satir.kimlik);
    if (hedefDegisti) await hedefiDenetle(islem, yeni.hedef);
    await islem
      .update(menuOgeleri)
      .set({
        ust_kimligi: yeni.ust,
        sira: yeni.sira,
        metin: yeni.metin,
        ...hedefSatiri(yeni.hedef),
        guncellenme_zamani: sql`now()`,
      })
      .where(eq(menuOgeleri.kimlik, kimlik));
    const sec = (kaynak: OgeKaydi) => ({
      ...Object.fromEntries(degisen.map((alan) => [alan, kaynak[alan]])),
      ...(hedefDegisti ? { hedef: hedefKaydi(kaynak.hedef) } : {}),
    });
    await degisikligiKaydet(islem, {
      kim,
      islem: "menu-ogesi.degisti",
      kayit: { tur: "menu-ogesi", kimlik },
      eski: sec(eski),
      yeni: sec(yeni),
    });
  });
};

// Öğe ve bütün altları silinmiş işaretlenir.
export const ogeSil = (vt: Veritabani, kim: DegisikligiYapan, kimlik: string) =>
  yaz(vt, async (islem) => {
    const satir = await ogeyiBul(islem, kimlik);
    const altlar = await altAgac(islem, kimlik);
    await islem
      .update(menuOgeleri)
      .set({ silinme_zamani: sql`now()`, guncellenme_zamani: sql`now()` })
      .where(inArray(menuOgeleri.kimlik, [kimlik, ...altlar]));
    await degisikligiKaydet(islem, {
      kim,
      islem: "menu-ogesi.silindi",
      kayit: { tur: "menu-ogesi", kimlik },
      eski: {
        menu: satir.menu,
        ...ogeKaydi({
          metin: satir.metin,
          hedef: satirinHedefi(satir),
          ust: satir.ust,
          sira: satir.sira,
        }),
        ...(altlar.length > 0 ? { altlar } : {}),
      },
      yeni: null,
    });
  });

// Bir üstün altındaki öğelerin yeni sırası (ust null: en üst düzey): kardeşlerin hepsi, her biri bir kez.
export const ogeleriSirala = (
  vt: Veritabani,
  kim: DegisikligiYapan,
  menuKimligi: string,
  ustGirdisi: string | null,
  kimlikler: readonly string[],
) =>
  yaz(vt, async (islem) => {
    const menu = await menuyuBul(islem, menuKimligi);
    if (ustGirdisi !== null && !kimlikMi(ustGirdisi)) {
      throw dogrulama([{ alan: "ust", kod: "ust-gecersiz" }]);
    }
    // Veritabanı kimlikleri küçük harfle verir; karşılaştırma metinle yapılır.
    const ust = ustGirdisi === undefined || ustGirdisi === null ? null : kimligiDuzelt(ustGirdisi);
    const yeniSira = kimlikler.map(kimligiDuzelt);
    const kardesler = await islem
      .select({ kimlik: menuOgeleri.kimlik, sira: menuOgeleri.sira })
      .from(menuOgeleri)
      .where(ayniUst(menu.kimlik, ust))
      .orderBy(asc(menuOgeleri.sira), asc(menuOgeleri.olusturma_zamani), asc(menuOgeleri.kimlik));
    const eski = kardesler.map((kardes) => kardes.kimlik);
    const ayniKume =
      yeniSira.length === eski.length &&
      new Set(yeniSira).size === yeniSira.length &&
      yeniSira.every((kimlik) => eski.includes(kimlik));
    if (!ayniKume) throw dogrulama([{ alan: "kimlikler", kod: "siralama-gecersiz" }]);
    const siralar = new Map(kardesler.map((kardes) => [kardes.kimlik, kardes.sira]));
    if (yeniSira.every((kimlik, sira) => siralar.get(kimlik) === sira)) return;
    for (const [sira, kimlik] of yeniSira.entries()) {
      if (siralar.get(kimlik) === sira) continue;
      await islem
        .update(menuOgeleri)
        .set({ sira, guncellenme_zamani: sql`now()` })
        .where(eq(menuOgeleri.kimlik, kimlik));
    }
    await degisikligiKaydet(islem, {
      kim,
      islem: "menu-ogesi.siralandi",
      kayit: { tur: "menu", kimlik: menu.kimlik },
      eski: { ...(ust === null ? {} : { ust }), sira: eski },
      yeni: { ...(ust === null ? {} : { ust }), sira: [...yeniSira] },
    });
  });

const menuAlanlari = { kimlik: menuler.kimlik, kod: menuler.kod, ad: menuler.ad, tur: menuler.tur };

// Verilen kodlardan kategori ağacından gelen (silinmemiş) menülerin kodları (kart 0168): telefonun yan penceresi
// kategori menüsünü tek bir "Kategoriler" dalı olarak çizer, masaüstündeki menü satırının düğmesi gibi.
export const kategoriMenuleriniSec = async (
  vt: Veritabani,
  kodlar: readonly string[],
): Promise<string[]> =>
  kodlar.length === 0
    ? []
    : (
        await vt
          .select({ kod: menuler.kod })
          .from(menuler)
          .where(
            and(
              inArray(menuler.kod, [...kodlar]),
              eq(menuler.tur, "kategori-agaci"),
              isNull(menuler.silinme_zamani),
            ),
          )
      ).map((satir) => satir.kod);

// Silinmemiş menüler, koduna göre.
export const menuleriOku = async (vt: Veritabani): Promise<Menu[]> =>
  (await vt
    .select(menuAlanlari)
    .from(menuler)
    .where(isNull(menuler.silinme_zamani))
    .orderBy(asc(menuler.kod))) as Menu[];

export type MenuOkumaSecenekleri = {
  // Verilmezse veritabanının şimdiki zamanı (ürünün ve blog yazısının yayın zamanı bununla karşılaştırılır).
  an?: Date;
  // Blog vitrinde açık mı (mağaza ayarı blogAcik, kart 0273). Verilmezse kapalı sayılır: blog yazısına bağlı öğe
  // görünmez. Vitrin ve panel ayarı okuyup verir.
  blogAcik?: boolean;
};

// Bir menünün silinmemiş öğeleri, bağlı kayıtlarıyla, tek sorguyla. Ürünün açılıp açılmadığı ürün sayfasının
// vitrin koşuluyla bulunur: menü bir bağlantıdır, listede değil sayfada açılır (gizli ürünün sayfası açılır).
// Tükenen ürün ayarı yalnız listeleri etkiler, sayfada kullanılmaz.
const ogeleriOku = async (
  vt: Veritabani,
  menu: string,
  { an, blogAcik = false }: MenuOkumaSecenekleri,
) => {
  const sayfasiAcik = vitrinKosulu("sayfa", {
    ...(an === undefined ? {} : { an }),
    tukenenUrun: "goster",
  });
  return vt
    .select({
      ...ogeAlanlari,
      kategoriAdi: kategoriler.ad,
      kategoriAdresi: kategoriler.adres_adi,
      kategoriSilindi: sql<boolean>`${kategoriler.silinme_zamani} is not null`,
      markaAdi: markalar.ad,
      markaAdresi: markalar.adres_adi,
      markaSilindi: sql<boolean>`${markalar.silinme_zamani} is not null`,
      urunAdi: urunler.ad,
      urunAdresi: urunler.adres_adi,
      urunSilindi: sql<boolean>`${urunler.silinme_zamani} is not null`,
      urunAcik: sql<boolean>`coalesce(${sayfasiAcik}, false)`,
      // Kart 0273: sabit sayfa (yalnız yayındaki açılır) ve blog yazısı (blog açıkken, vitrin koşuluyla).
      sayfaAdi: sabitSayfalar.baslik,
      sayfaAdresi: sabitSayfalar.adres_adi,
      sayfaSilindi: sql<boolean>`${sabitSayfalar.silinme_zamani} is not null`,
      sayfaAcik: sql<boolean>`coalesce(${sabitSayfaVitrinde()}, false)`,
      yaziAdi: blogYazilari.baslik,
      yaziAdresi: blogYazilari.adres_adi,
      yaziSilindi: sql<boolean>`${blogYazilari.silinme_zamani} is not null`,
      yaziAcik: blogAcik
        ? sql<boolean>`coalesce(${blogYazisiVitrinde(an)}, false)`
        : sql<boolean>`false`,
    })
    .from(menuOgeleri)
    .leftJoin(kategoriler, eq(kategoriler.kimlik, menuOgeleri.kategori_kimligi))
    .leftJoin(markalar, eq(markalar.kimlik, menuOgeleri.marka_kimligi))
    .leftJoin(urunler, eq(urunler.kimlik, menuOgeleri.urun_kimligi))
    .leftJoin(sabitSayfalar, eq(sabitSayfalar.kimlik, menuOgeleri.sayfa_kimligi))
    .leftJoin(blogYazilari, eq(blogYazilari.kimlik, menuOgeleri.blog_yazisi_kimligi))
    .where(and(eq(menuOgeleri.menu_kimligi, menu), isNull(menuOgeleri.silinme_zamani)))
    .orderBy(asc(menuOgeleri.sira), asc(menuOgeleri.olusturma_zamani), asc(menuOgeleri.kimlik));
};
type OkunanOge = Awaited<ReturnType<typeof ogeleriOku>>[number];

// Bağlı kaydın adı, adres adı ve durumu.
const bagliKayit = (satir: OkunanOge) => {
  switch (satir.hedefTuru as MenuHedefTuru) {
    case "kategori":
      return {
        ad: satir.kategoriAdi,
        adresAdi: satir.kategoriAdresi,
        silindi: satir.kategoriSilindi,
      };
    case "marka":
      return { ad: satir.markaAdi, adresAdi: satir.markaAdresi, silindi: satir.markaSilindi };
    case "urun":
      return {
        ad: satir.urunAdi,
        adresAdi: satir.urunAdresi,
        silindi: satir.urunSilindi,
        gorunmuyor: !satir.urunAcik,
      };
    case "sayfa":
      return {
        ad: satir.sayfaAdi,
        adresAdi: satir.sayfaAdresi,
        silindi: satir.sayfaSilindi,
        gorunmuyor: !satir.sayfaAcik,
      };
    case "blog-yazisi":
      return {
        ad: satir.yaziAdi,
        adresAdi: satir.yaziAdresi,
        silindi: satir.yaziSilindi,
        gorunmuyor: !satir.yaziAcik,
      };
    default:
      return undefined;
  }
};

// Panelin ağacı: her öğe durumuyla. Görünür altı kalmayan başlık "bos-baslik" olur.
const panelAgaci = (satirlar: OkunanOge[]): PanelOgesi[] => {
  const ogeler = new Map<string, PanelOgesi>();
  for (const satir of satirlar) {
    const bagli = bagliKayit(satir);
    const durum: OgeDurumu =
      bagli === undefined
        ? "gecerli"
        : bagli.silindi
          ? "hedef-silindi"
          : bagli.gorunmuyor === true
            ? "hedef-gorunmuyor"
            : "gecerli";
    ogeler.set(satir.kimlik, {
      kimlik: satir.kimlik,
      metin: satir.metin,
      gorunenMetin: satir.metin ?? bagli?.ad ?? "",
      hedef: satirinHedefi(satir),
      ...(bagli === undefined
        ? {}
        : { kayit: { ad: bagli.ad ?? "", adresAdi: bagli.adresAdi ?? "" } }),
      durum,
      altlar: [],
    });
  }
  const kokler: PanelOgesi[] = [];
  for (const satir of satirlar) {
    const oge = ogeler.get(satir.kimlik) as PanelOgesi;
    if (satir.ust === null) kokler.push(oge);
    else ogeler.get(satir.ust)?.altlar.push(oge);
  }
  // Başlığın durumu altları belli olunca: alttan yukarı.
  const basliklariIsaretle = (dallar: PanelOgesi[]) => {
    for (const dal of dallar) {
      basliklariIsaretle(dal.altlar);
      if (dal.hedef.tur === "baslik" && !dal.altlar.some((alt) => alt.durum === "gecerli")) {
        dal.durum = "bos-baslik";
      }
    }
  };
  basliklariIsaretle(kokler);
  return kokler;
};

// Kategori menüsü: silinmemiş kategori ağacı, kardeş sırasıyla, derinlik sınırına kadar.
const kategoriAgaci = async (vt: Veritabani): Promise<MenuDali[]> => {
  const hepsi = await kategorileriOku(vt);
  const altlari = (ust: string | null, duzey: number): MenuDali[] =>
    duzey > menuSinirlari.derinlik
      ? []
      : hepsi
          .filter((kategori) => kategori.ust === ust)
          .map((kategori) => ({
            kimlik: kategori.kimlik,
            metin: kategori.ad,
            hedef: { tur: "kategori", adresAdi: kategori.adresAdi },
            altlar: altlari(kategori.kimlik, duzey + 1),
          }));
  return altlari(null, 1);
};

const vitrinHedefi = (oge: PanelOgesi, satir: OkunanOge): VitrinHedefi => {
  const { hedef } = oge;
  if (hedef.tur === "adres" || hedef.tur === "baslik") return hedef;
  return { tur: hedef.tur, adresAdi: bagliKayit(satir)?.adresAdi ?? "" };
};

// Panelin menü ekranı: menü ve öğeleri durumlarıyla. Kategori menüsünün öğeleri ağaçtan gelir, panelde
// yalnız gösterilir.
export const panelMenusu = async (
  vt: Veritabani,
  kimlik: string,
  secenekler: MenuOkumaSecenekleri = {},
): Promise<{ menu: Menu; ogeler: PanelOgesi[] } | { menu: Menu; kategoriAgaci: MenuDali[] }> => {
  if (!kimlikMi(kimlik)) throw new BilinenHata("bulunamadi");
  const [menu] = (await vt
    .select(menuAlanlari)
    .from(menuler)
    .where(and(eq(menuler.kimlik, kimlik), isNull(menuler.silinme_zamani)))) as Menu[];
  if (menu === undefined) throw new BilinenHata("bulunamadi");
  if (menu.tur === "kategori-agaci") return { menu, kategoriAgaci: await kategoriAgaci(vt) };
  return { menu, ogeler: panelAgaci(await ogeleriOku(vt, menu.kimlik, secenekler)) };
};

// Vitrinin çizeceği menü, koduyla. Menü yoksa undefined. Durumu "gecerli" olmayan öğe altlarıyla birlikte
// görünmez.
export const vitrinMenusu = async (
  vt: Veritabani,
  kod: string,
  secenekler: MenuOkumaSecenekleri = {},
): Promise<MenuDali[] | undefined> => {
  const [menu] = (await vt
    .select(menuAlanlari)
    .from(menuler)
    .where(and(eq(menuler.kod, kod), isNull(menuler.silinme_zamani)))) as Menu[];
  if (menu === undefined) return undefined;
  if (menu.tur === "kategori-agaci") return kategoriAgaci(vt);
  const satirlar = await ogeleriOku(vt, menu.kimlik, secenekler);
  const satiri = new Map(satirlar.map((satir) => [satir.kimlik, satir]));
  const dallar = (ogeler: PanelOgesi[]): MenuDali[] =>
    ogeler
      .filter((oge) => oge.durum === "gecerli")
      .map((oge) => ({
        kimlik: oge.kimlik,
        metin: oge.gorunenMetin,
        hedef: vitrinHedefi(oge, satiri.get(oge.kimlik) as OkunanOge),
        altlar: dallar(oge.altlar),
      }));
  return dallar(panelAgaci(satirlar));
};

// Kayıtlı hedeflerin bağlı olduğu menü yerleri (kart 0273): sayfanın panelde "hangi menüde" bilgisi. Her kayıt için
// silinmemiş menülerdeki silinmemiş öğelerin yeri: menünün adı ve (alt öğede) üst öğenin vitrinde görünen metni
// (metinsiz kayıt öğesinde kaydın adı, bağımsız kontrolün bulgusu). Aynı yer bir kez yazılır. Menüler ada göre, öğeler
// menüdeki sırasıyla; kaydı içeren her menü için bir sorgu (menü sayısı sınırlıdır).
export type MenuYeri = { menu: string; menuAdi: string; ust: string | null };

export const kayitlarinMenuYerleri = async (
  vt: Veritabani,
  tur: KayitliMenuHedefi,
): Promise<Map<string, MenuYeri[]>> => {
  const alan = {
    kategori: menuOgeleri.kategori_kimligi,
    marka: menuOgeleri.marka_kimligi,
    urun: menuOgeleri.urun_kimligi,
    sayfa: menuOgeleri.sayfa_kimligi,
    "blog-yazisi": menuOgeleri.blog_yazisi_kimligi,
  }[tur];
  const icerenler = await vt
    .selectDistinct({ kimlik: menuler.kimlik, ad: menuler.ad })
    .from(menuOgeleri)
    .innerJoin(menuler, eq(menuler.kimlik, menuOgeleri.menu_kimligi))
    .where(
      and(
        sql`${alan} is not null`,
        isNull(menuOgeleri.silinme_zamani),
        isNull(menuler.silinme_zamani),
      ),
    )
    .orderBy(asc(menuler.ad), asc(menuler.kimlik));
  const yerler = new Map<string, MenuYeri[]>();
  for (const menu of icerenler) {
    const gez = (dallar: PanelOgesi[], ust: string | null) => {
      for (const dal of dallar) {
        const { hedef } = dal;
        if (hedef.tur === tur && "kimlik" in hedef) {
          const liste = yerler.get(hedef.kimlik) ?? [];
          if (!liste.some((yer) => yer.menu === menu.kimlik && yer.ust === ust)) {
            liste.push({ menu: menu.kimlik, menuAdi: menu.ad, ust });
          }
          yerler.set(hedef.kimlik, liste);
        }
        gez(dal.altlar, dal.gorunenMetin);
      }
    };
    gez(panelAgaci(await ogeleriOku(vt, menu.kimlik, {})), null);
  }
  return yerler;
};
