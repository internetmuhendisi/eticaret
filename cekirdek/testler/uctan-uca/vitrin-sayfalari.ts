// Ekran ve hız ölçümünün vitrin sayfaları (kart 0146): her sayfa türü bir adres. Adresler sitenin başlangıç
// kataloğundan okunur (çekirdeğe site adı yazılmaz): yayındaki ilk kategori, marka, etiket ve seçenekli ürün; arama
// o ürünün adının ilk sözcüğüyle yapılır. Bulunamadı sayfası 404 ile açılır.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { kayitAdresleri, vitrinAdresleri } from "../../vitrin/adresler";

export const ekranGenislikleri = [320, 390, 768, 1280] as const;

const katalog = calisanSite().katalogBaslangici;
const yayindakiUrunler = katalog.urunler.filter((urun) => urun.durum === "yayinda");
const urun = yayindakiUrunler.find((u) => (u.secenekler?.length ?? 0) > 0) ?? yayindakiUrunler[0];
const ilk = <T>(liste: readonly T[] | undefined, ne: string): T => {
  const deger = liste?.[0];
  if (deger === undefined)
    throw new Error(`Sitenin başlangıç kataloğunda ${ne} yok: ekran ölçümü yapılamaz.`);
  return deger;
};

// menu: false olan sayfanın üst kısmında menü düğmesi yoktur (ödeme adımının sade çerçevesi, karar 0132): hız ölçümü
// orada menüye basmaz, tepkiyi ölçmez.
export const ekranSayfalari: Record<string, { adres: string; durum: number; menu?: false }> = {
  "ana sayfa": { adres: vitrinAdresleri.anasayfa, durum: 200 },
  kategori: {
    adres: kayitAdresleri.kategori(ilk(katalog.kategoriler, "kategori").adresAdi),
    durum: 200,
  },
  marka: { adres: kayitAdresleri.marka(ilk(katalog.markalar, "marka").adresAdi), durum: 200 },
  etiket: { adres: kayitAdresleri.etiket(ilk(katalog.etiketler, "etiket").adresAdi), durum: 200 },
  arama: {
    adres: `${vitrinAdresleri.arama}?ara=${encodeURIComponent(ilk(urun?.ad.split(" "), "yayında ürün"))}`,
    durum: 200,
  },
  urun: {
    adres: kayitAdresleri.urun(ilk(urun ? [urun] : [], "yayında ürün").adresAdi),
    durum: 200,
  },
  favoriler: { adres: vitrinAdresleri.favoriler, durum: 200 },
  // Kart 0212: boş sepet (testin tarayıcısında sepet yoktur).
  sepet: { adres: vitrinAdresleri.sepet, durum: 200 },
  // Kart 0213: ödeme adımı, boş sepetle (boş hâl); dolu formun taraması ödeme testindedir.
  odeme: { adres: vitrinAdresleri.odeme, durum: 200, menu: false },
  // Kart 0214: havale bildirimi (boş form). Sipariş alındı sayfası erişim çereziyle açılır, burada ölçülmez; taraması
  // ödeme testindedir.
  "havale bildirimi": { adres: vitrinAdresleri.havaleBildirimi, durum: 200 },
  // Kart 0238: üye olmayanın sipariş takibi (boş form). Sonucu takip çereziyle açılır, taraması takip testindedir.
  "siparis takibi": { adres: vitrinAdresleri.siparisTakibi, durum: 200 },
  giris: { adres: vitrinAdresleri.giris, durum: 200 },
  kayit: { adres: vitrinAdresleri.kayit, durum: 200 },
  bulunamadi: { adres: "/olcum-icin-olmayan-sayfa", durum: 404 },
};
