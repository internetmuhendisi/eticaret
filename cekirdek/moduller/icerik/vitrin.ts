// Blog yazısının vitrinde görünme koşulu (kart 0272, karar 0176): silinmemiş ve yayında ya da yayın zamanı gelmiş
// zamanlanmış yazı. Vitrinin listesi, yazı sayfası, adres çözümü, ana sayfanın blog bölümü ve vitrin görseli ucu
// yalnız bunu kullanır. Blogun açık olup olmadığı (site ayarı blogAcik) bu koşulun dışındadır: sayfa ve bağlam ayarı
// ayrıca okur.
import { and, asc, count, desc, eq, isNull, lte, or, type SQL, sql } from "drizzle-orm";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { blogKategorileri, blogYazilari } from "./model.ts";

export const blogYazisiVitrinde = (an?: Date): SQL => {
  const simdi = an === undefined ? sql`now()` : sql`${an.toISOString()}::timestamptz`;
  const kosul = and(
    isNull(blogYazilari.silinme_zamani),
    or(
      eq(blogYazilari.durum, "yayinda"),
      and(eq(blogYazilari.durum, "zamanlanmis"), lte(blogYazilari.yayin_zamani, simdi)),
    ),
  );
  if (kosul === undefined) throw new Error("Blog koşulu kurulamadı.");
  return kosul;
};

export type VitrinBlogKarti = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  ozet: string | null;
  yayinZamani: Date;
  kapak: { dosya: string; metin: string } | null;
  kategori: { ad: string; adresAdi: string } | null;
  yazar: string | null;
};

const kartAlanlari = {
  kimlik: blogYazilari.kimlik,
  baslik: blogYazilari.baslik,
  adresAdi: blogYazilari.adres_adi,
  ozet: blogYazilari.ozet,
  yayinZamani: blogYazilari.yayin_zamani,
  kapakDosyasi: blogYazilari.kapak_kimligi,
  kapakMetni: blogYazilari.kapak_metni,
  kategoriAdi: blogKategorileri.ad,
  kategoriAdresi: blogKategorileri.adres_adi,
  yazar: blogYazilari.yazar,
};
type KartSatiri = {
  kimlik: string;
  baslik: string;
  adresAdi: string;
  ozet: string | null;
  yayinZamani: Date | null;
  kapakDosyasi: string | null;
  kapakMetni: string | null;
  kategoriAdi: string | null;
  kategoriAdresi: string | null;
  yazar: string | null;
};
const kartiKur = ({
  kapakDosyasi,
  kapakMetni,
  kategoriAdi,
  kategoriAdresi,
  yayinZamani,
  ...satir
}: KartSatiri): VitrinBlogKarti => ({
  ...satir,
  // Vitrindeki yazının yayın zamanı her zaman doludur (veritabanının denetimi: taslak dışında zorunlu).
  yayinZamani: yayinZamani ?? new Date(0),
  kapak:
    kapakDosyasi === null || kapakMetni === null
      ? null
      : { dosya: kapakDosyasi, metin: kapakMetni },
  kategori:
    kategoriAdi === null || kategoriAdresi === null
      ? null
      : { ad: kategoriAdi, adresAdi: kategoriAdresi },
});

// Silinmemiş kategoriye bağlantı: silinmiş kategori (servis yazıyı kategorisiz bırakır, ikinci ağ) görünmez.
const kategoriBagi = and(
  eq(blogKategorileri.kimlik, blogYazilari.kategori_kimligi),
  isNull(blogKategorileri.silinme_zamani),
);

// Vitrinde görünen yazılar, yayın zamanı en yeni önce; kategori verilirse (adres adı) yalnız onun yazıları. Sayfa
// sınır dışıysa en yakın geçerli sayfaya çekilir. Silinmiş ya da olmayan kategori boş liste verir.
export const vitrinBlogYazilari = async (
  vt: Veritabani | VeritabaniIslemi,
  girdi: { kategori?: string | undefined; sayfa: number; boyut: number; an?: Date },
): Promise<{
  yazilar: VitrinBlogKarti[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
}> => {
  const kosul = and(
    blogYazisiVitrinde(girdi.an),
    girdi.kategori === undefined ? undefined : eq(blogKategorileri.adres_adi, girdi.kategori),
  );
  const [sayim] = await vt
    .select({ sayi: count() })
    .from(blogYazilari)
    .leftJoin(blogKategorileri, kategoriBagi)
    .where(kosul);
  const toplam = sayim?.sayi ?? 0;
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / girdi.boyut));
  const sayfa = Math.min(Math.max(1, Math.trunc(girdi.sayfa) || 1), sayfaSayisi);
  const satirlar = await vt
    .select(kartAlanlari)
    .from(blogYazilari)
    .leftJoin(blogKategorileri, kategoriBagi)
    .where(kosul)
    .orderBy(desc(blogYazilari.yayin_zamani), asc(blogYazilari.kimlik))
    .limit(girdi.boyut)
    .offset((sayfa - 1) * girdi.boyut);
  return { yazilar: satirlar.map(kartiKur), toplam, sayfa, sayfaSayisi };
};

// Vitrinde görünen yazının sayfası: kart ve içerik (temizlenmemiş; sayfa aciklamayiTemizle ile yazar). Görünmüyorsa
// null.
export const vitrinBlogYazisi = async (
  vt: Veritabani | VeritabaniIslemi,
  kimlik: string,
  an?: Date,
): Promise<(VitrinBlogKarti & { icerik: string }) | null> => {
  const [satir] = await vt
    .select({ ...kartAlanlari, icerik: blogYazilari.icerik })
    .from(blogYazilari)
    .leftJoin(blogKategorileri, kategoriBagi)
    .where(and(eq(blogYazilari.kimlik, kimlik), blogYazisiVitrinde(an)));
  if (satir === undefined) return null;
  const { icerik, ...kart } = satir;
  return { ...kartiKur(kart), icerik };
};

// Görsel bir yazının kapağı ve yazı vitrinde mi (vitrin görseli ucu, karar 0087).
export const blogKapagiVitrindeMi = async (
  vt: Veritabani | VeritabaniIslemi,
  dosya: string,
): Promise<boolean> =>
  (
    await vt
      .select({ kimlik: blogYazilari.kimlik })
      .from(blogYazilari)
      .where(and(eq(blogYazilari.kapak_kimligi, dosya), blogYazisiVitrinde()))
      .limit(1)
  ).length > 0;

// Vitrinde görünen en az bir yazısı olan blog kategorileri, sırasıyla (blog listesinin kategori seçimi).
export const vitrinBlogKategorileri = async (
  vt: Veritabani | VeritabaniIslemi,
  an?: Date,
): Promise<{ ad: string; adresAdi: string }[]> =>
  vt
    .selectDistinct({
      ad: blogKategorileri.ad,
      adresAdi: blogKategorileri.adres_adi,
      sira: blogKategorileri.sira,
    })
    .from(blogYazilari)
    .innerJoin(blogKategorileri, kategoriBagi)
    .where(blogYazisiVitrinde(an))
    .orderBy(asc(blogKategorileri.sira), asc(blogKategorileri.ad))
    .then((satirlar) => satirlar.map(({ ad, adresAdi }) => ({ ad, adresAdi })));
