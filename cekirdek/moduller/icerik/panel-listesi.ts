// Panelin blog listesi (kart 0272, karar 0176): silinmemiş yazılar; arama, süzgeç, sıralama, sayfa ve durum sayıları
// sunucuda.
//
// - Durum yazının vitrindeki durumudur: zamanı gelmiş zamanlanmış yazı "yayında" sayılır (vitrin koşulunun kendisi).
// - Arama: başlık; harf kuralı aramanınkidir (aramaAnahtari), aranan metin başlığın herhangi bir yerinde geçebilir
//   (strpos: % ve _ joker değildir).
// - Süzgeçler: durum (sekme, tek değer) ve blog kategorisi (birden çok, kimlikle). Durum sayıları kategoriye ve
//   aramaya uyar, duruma uymaz.
// - Sıralama: yayın zamanı (yoksa son değişme anı) azalan ve artan, başlık (sitenin dilinin harf sırası).
import { and, asc, count, desc, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import {
  type BlogPanelSiralamasi,
  type BlogYaziDurumu,
  blogYaziDurumlari,
} from "../../kayitlar/blog.ts";
import type { PanelSayfaBoyu } from "../../kayitlar/liste.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { harfSirasi } from "../../veritabani/harf-sirasi.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { blogKategorileri, blogYazilari } from "./model.ts";
import { blogYazisiVitrinde } from "./vitrin.ts";

export type BlogPanelListesiGirdisi = {
  ara?: string | undefined;
  durum?: BlogYaziDurumu | undefined;
  kategori?: readonly string[];
  siralama: BlogPanelSiralamasi;
  sayfa: number;
  sayfaBoyu: PanelSayfaBoyu;
};

export type BlogPanelSatiri = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  // Vitrindeki durum (zamanı gelmiş zamanlanmış yazı yayındadır).
  durum: BlogYaziDurumu;
  yayinZamani: Date | null;
  kapak: string | null;
  kategori: { kimlik: string; ad: string } | null;
};

export type BlogPanelListesi = {
  satirlar: BlogPanelSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  sayfaBoyu: number;
  durumSayilari: Record<BlogYaziDurumu, number>;
};

// Vitrindeki durum: vitrinde görünen yazı yayındadır (zamanı gelmiş zamanlanmış yazı da). Kural vitrinin tek
// koşulundan okunur (blogYazisiVitrinde), saat veritabanınındır.
const gorunenDurum = (an: Date | undefined): SQL<string> =>
  sql<string>`case when ${blogYazisiVitrinde(an)} then 'yayinda' else ${blogYazilari.durum} end`;

export const blogPanelListesi = async (
  vt: Veritabani,
  girdi: BlogPanelListesiGirdisi,
  { an, dil }: { an?: Date; dil: string },
): Promise<BlogPanelListesi> => {
  const aranan = aramaAnahtari(girdi.ara ?? "");
  const kategoriler = [...new Set((girdi.kategori ?? []).filter(kimlikMi).map(kimligiDuzelt))];
  const durum = gorunenDurum(an);
  const ortak = and(
    isNull(blogYazilari.silinme_zamani),
    aranan === ""
      ? undefined
      : sql`strpos(${aramaAnahtariSql(blogYazilari.baslik)}, ${aranan}) > 0`,
    kategoriler.length === 0 ? undefined : inArray(blogYazilari.kategori_kimligi, kategoriler),
  );
  const sayilar = await vt
    .select({ durum, sayi: count() })
    .from(blogYazilari)
    .where(ortak)
    // Durum ifadesi anı parametre olarak taşır: seçimdeki ile gruplamadaki ayrı parametre olurdu, sırayla gruplanır.
    .groupBy(sql`1`);
  const durumSayilari = Object.fromEntries(blogYaziDurumlari.map((d) => [d, 0])) as Record<
    BlogYaziDurumu,
    number
  >;
  for (const satir of sayilar) durumSayilari[satir.durum as BlogYaziDurumu] = satir.sayi;
  const toplam =
    girdi.durum === undefined
      ? Object.values(durumSayilari).reduce((a, b) => a + b, 0)
      : durumSayilari[girdi.durum];

  const boyut = girdi.sayfaBoyu;
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / boyut));
  const sayfa = Math.min(Math.max(1, Math.trunc(girdi.sayfa) || 1), sayfaSayisi);
  const zaman = sql`coalesce(${blogYazilari.yayin_zamani}, ${blogYazilari.guncellenme_zamani})`;
  const baslik = sql`${blogYazilari.baslik} collate ${sql.identifier(await harfSirasi(vt, dil))}`;
  const sira: SQL[] = {
    "yayin-azalan": [desc(zaman)],
    "yayin-artan": [asc(zaman)],
    "baslik-artan": [asc(baslik)],
  }[girdi.siralama];
  const satirlar = await vt
    .select({
      kimlik: blogYazilari.kimlik,
      baslik: blogYazilari.baslik,
      adresAdi: blogYazilari.adres_adi,
      durum,
      yayinZamani: blogYazilari.yayin_zamani,
      kapak: blogYazilari.kapak_kimligi,
      kategoriKimligi: blogKategorileri.kimlik,
      kategoriAdi: blogKategorileri.ad,
    })
    .from(blogYazilari)
    .leftJoin(
      blogKategorileri,
      and(
        eq(blogKategorileri.kimlik, blogYazilari.kategori_kimligi),
        isNull(blogKategorileri.silinme_zamani),
      ),
    )
    .where(and(ortak, girdi.durum === undefined ? undefined : sql`${durum} = ${girdi.durum}`))
    .orderBy(...sira, asc(blogYazilari.kimlik))
    .limit(boyut)
    .offset((sayfa - 1) * boyut);
  return {
    satirlar: satirlar.map(({ kategoriKimligi, kategoriAdi, durum: satirDurumu, ...satir }) => ({
      ...satir,
      durum: satirDurumu as BlogYaziDurumu,
      kategori:
        kategoriKimligi === null || kategoriAdi === null
          ? null
          : { kimlik: kategoriKimligi, ad: kategoriAdi },
    })),
    toplam,
    sayfa,
    sayfaSayisi,
    sayfaBoyu: boyut,
    durumSayilari,
  };
};
