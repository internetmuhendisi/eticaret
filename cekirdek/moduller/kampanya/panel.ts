// Panelin kupon ekranlarının sorguları (kart 0313, karar 0188): liste, ayrıntı, kullanıldığı siparişler ve formun
// metinlerinin çevirisi. Kuponu yazan işlemler servistedir (servis.ts: ekle, degistir).
//
// - Durum yalnız kuponDurumuSql ile, veritabanının saatiyle bulunur (kayıt: kuponDurumlari). Liste ve ayrıntı aynı
//   ifadeyi kullanır.
// - Kullanım: siparişe bağlı ve geri verilmemiş (iptal ya da tam iade değil) kullanım. Süren ödemenin ayırması
//   sayılmaz.
// - Arama kodda ve adda, aramanın harf kuralıyla (aramaAnahtari), kodun ya da adın herhangi bir yerinde.
// - Kullanıldığı siparişler: kupona bağlı bütün siparişler (iptal edilen de, durumuyla), en yeni önce; müşterinin adı
//   kısaltılır, kişisel bilgisi silinmiş siparişte yoktur.
import { and, asc, count, desc, eq, isNotNull, isNull, type SQL, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import {
  type KuponDurumu,
  type KuponHatasi,
  type KuponKapsami,
  type KuponPanelSiralamasi,
  type KuponTuru,
  kuponDurumlari,
} from "../../kayitlar/kampanya.ts";
import type { PanelSayfaBoyu } from "../../kayitlar/liste.ts";
import type { SiparisDurumu } from "../../kayitlar/siparis.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { harfSirasi } from "../../veritabani/harf-sirasi.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { kategoriler } from "../kategori/model.ts";
import { siparisIadeleri, siparisler } from "../siparis/model.ts";
import { urunler } from "../urun/model.ts";
import { kuponKapsami, kuponKullanimlari, kuponlar } from "./model.ts";
import type { KuponPanelGirdisi } from "./semalar.ts";
import { type KuponGirdisi, kodBiciminde } from "./servis.ts";

export const kuponDurumuSql = (): SQL<KuponDurumu> =>
  sql<KuponDurumu>`case
    when not ${kuponlar.acik} then 'kapali'
    when ${kuponlar.baslangic_zamani} is not null and ${kuponlar.baslangic_zamani} > now() then 'zamanlanmis'
    when ${kuponlar.bitis_zamani} is not null and ${kuponlar.bitis_zamani} <= now() then 'suresi-doldu'
    else 'etkin' end`;

// Alt sorgunun sütunları tablo adıyla: tek tablolu sorguda Drizzle sütunu tablo adı olmadan yazar, alt sorguda dıştaki
// kuponun kimliği kullanımın kendi kimliğine bağlanırdı (testte bulundu).
const sutun = (tablo: string, ad: string) => sql`${sql.identifier(tablo)}.${sql.identifier(ad)}`;
const disKupon = sutun("kuponlar", "kimlik");

// Kuponun sayılan kullanımı (siparişe bağlı, geri verilmemiş).
const kullanimSayisi = (): SQL<number> =>
  sql<number>`(select count(*) from ${kuponKullanimlari}
    where ${kuponKullanimlari.kupon_kimligi} = ${disKupon}
      and ${kuponKullanimlari.siparis_kimligi} is not null
      and ${kuponKullanimlari.serbest_zamani} is null)`.mapWith(Number);

// Kapsamın silinmemiş kayıtları (kupon silinmiş kayıtta geçmez; bağımsız kontrolün bulgusu).
const kapsamSayisi = (): SQL<number> =>
  sql<number>`(select count(*) from ${kuponKapsami}
    left join ${urunler} on ${sutun("urunler", "kimlik")} = ${sutun("kupon_kapsami", "urun_kimligi")}
    left join ${kategoriler}
      on ${sutun("kategoriler", "kimlik")} = ${sutun("kupon_kapsami", "kategori_kimligi")}
    where ${sutun("kupon_kapsami", "kupon_kimligi")} = ${disKupon}
      and coalesce(${sutun("urunler", "silinme_zamani")}, ${sutun("kategoriler", "silinme_zamani")})
        is null)`.mapWith(Number);

// Süren ödemelerin ayırdığı kullanım (siparişe bağlanmamış, süresi dolmamış): vitrin sınıra sayar.
const ayrilanSayisi = (): SQL<number> =>
  sql<number>`(select count(*) from ${kuponKullanimlari}
    where ${kuponKullanimlari.kupon_kimligi} = ${disKupon}
      and ${kuponKullanimlari.siparis_kimligi} is null
      and ${kuponKullanimlari.serbest_zamani} is null
      and ${kuponKullanimlari.bitis_zamani} > now())`.mapWith(Number);

export type KuponPanelSatiri = {
  kimlik: string;
  kod: string;
  ad: string | null;
  tur: KuponTuru;
  deger: number;
  kapsam: KuponKapsami;
  kapsamSayisi: number;
  enAzTutar: number | null;
  baslangic: Date | null;
  bitis: Date | null;
  toplamSinir: number | null;
  kisiBasiSinir: number | null;
  indirimdeGecmez: boolean;
  durum: KuponDurumu;
  kullanim: number;
};

const satirAlanlari = () => ({
  kimlik: kuponlar.kimlik,
  kod: kuponlar.kod,
  ad: kuponlar.ad,
  tur: sql<KuponTuru>`${kuponlar.tur}`,
  deger: kuponlar.deger,
  kapsam: sql<KuponKapsami>`${kuponlar.kapsam}`,
  kapsamSayisi: kapsamSayisi(),
  enAzTutar: kuponlar.en_az_tutar,
  baslangic: kuponlar.baslangic_zamani,
  bitis: kuponlar.bitis_zamani,
  toplamSinir: kuponlar.toplam_sinir,
  kisiBasiSinir: kuponlar.kisi_basi_sinir,
  indirimdeGecmez: kuponlar.indirimde_gecmez,
  durum: kuponDurumuSql(),
  kullanim: kullanimSayisi(),
});

export type KuponPanelListesiGirdisi = {
  ara?: string | undefined;
  durum?: KuponDurumu | undefined;
  siralama: KuponPanelSiralamasi;
  sayfa: number;
  sayfaBoyu: PanelSayfaBoyu;
};

export type KuponPanelListesi = {
  satirlar: KuponPanelSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  sayfaBoyu: number;
  // Aramaya uyar, sekmeye uymaz.
  durumSayilari: Record<KuponDurumu, number>;
};

export const kuponPanelListesi = async (
  vt: Veritabani,
  girdi: KuponPanelListesiGirdisi,
  { dil }: { dil: string },
): Promise<KuponPanelListesi> => {
  const aranan = aramaAnahtari(girdi.ara ?? "");
  const durum = kuponDurumuSql();
  const ortak = and(
    isNull(kuponlar.silinme_zamani),
    aranan === ""
      ? undefined
      : sql`(strpos(${aramaAnahtariSql(kuponlar.kod)}, ${aranan}) > 0
          or strpos(${aramaAnahtariSql(sql`coalesce(${kuponlar.ad}, '')`)}, ${aranan}) > 0)`,
  );
  const sayilar = await vt
    .select({ durum, sayi: count() })
    .from(kuponlar)
    .where(ortak)
    .groupBy(sql`1`);
  const durumSayilari = Object.fromEntries(kuponDurumlari.map((d) => [d, 0])) as Record<
    KuponDurumu,
    number
  >;
  for (const satir of sayilar) durumSayilari[satir.durum] = satir.sayi;
  const toplam =
    girdi.durum === undefined
      ? Object.values(durumSayilari).reduce((a, b) => a + b, 0)
      : durumSayilari[girdi.durum];
  const boyut = girdi.sayfaBoyu;
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / boyut));
  const sayfa = Math.min(Math.max(1, Math.trunc(girdi.sayfa) || 1), sayfaSayisi);
  const kod = sql`${kuponlar.kod} collate ${sql.identifier(await harfSirasi(vt, dil))}`;
  const sira: SQL[] = {
    yeni: [desc(kuponlar.olusturma_zamani)],
    "kod-artan": [asc(kod)],
    "kullanim-azalan": [desc(kullanimSayisi()), desc(kuponlar.olusturma_zamani)],
    "bitis-artan": [sql`${kuponlar.bitis_zamani} asc nulls last`, asc(kod)],
  }[girdi.siralama];
  const satirlar = await vt
    .select(satirAlanlari())
    .from(kuponlar)
    .where(and(ortak, girdi.durum === undefined ? undefined : sql`${durum} = ${girdi.durum}`))
    .orderBy(...sira, asc(kuponlar.kimlik))
    .limit(boyut)
    .offset((sayfa - 1) * boyut);
  return { satirlar, toplam, sayfa, sayfaSayisi, sayfaBoyu: boyut, durumSayilari };
};

export type KuponPanelAyrintisi = KuponPanelSatiri & {
  // Ekranın gördüğü değişme anı (çakışma denetimi).
  degismeZamani: Date;
  // Kupon bir siparişte ya da süren bir ödemede kullanıldı: kodu, türü, indirimi ve kapsamı değişmez.
  kullanildi: boolean;
  // Süren ödemelerin ayırdığı kullanım: kalan hak ondan da düşer (vitrinin sayımı).
  ayrilan: number;
  // Kapsamın kayıtları ada göre; silinmiş kayıt işaretli (kupon onda artık geçmez).
  kapsamKayitlari: { kimlik: string; ad: string; silinmis: boolean }[];
  ozet: {
    // Kuponun indirimi (ürün indirimi ve ücretsiz kargo kuponunun verilmeyen kargosu) ve siparişlerin toplamı
    // (kupondan sonra); sayılan kullanımların siparişlerinden. Net: toplamdan tamamlanan iadeler düşülür.
    verilenIndirim: number;
    siparisToplami: number;
    iadeSonrasi: number;
  };
};

export const kuponPanelAyrintisi = async (
  vt: Veritabani,
  kimlik: string,
  { dil }: { dil: string },
): Promise<KuponPanelAyrintisi | null> => {
  if (!kimlikMi(kimlik)) return null;
  const [satir] = await vt
    .select({
      ...satirAlanlari(),
      degismeZamani: kuponlar.degisme_zamani,
      ayrilan: ayrilanSayisi(),
      kullanildi: sql<boolean>`kupon_kullanildi_mi(${kuponlar.kimlik})`,
    })
    .from(kuponlar)
    .where(and(eq(kuponlar.kimlik, kimligiDuzelt(kimlik)), isNull(kuponlar.silinme_zamani)));
  if (satir === undefined) return null;
  const harf = sql.identifier(await harfSirasi(vt, dil));
  const tablo = satir.kapsam === "urunler" ? urunler : kategoriler;
  const kolon =
    satir.kapsam === "urunler" ? kuponKapsami.urun_kimligi : kuponKapsami.kategori_kimligi;
  const [kapsamKayitlari, [ozet]] = await Promise.all([
    satir.kapsam === "hepsi"
      ? Promise.resolve([])
      : vt
          .select({
            kimlik: tablo.kimlik,
            ad: tablo.ad,
            silinmis: sql<boolean>`${tablo.silinme_zamani} is not null`,
          })
          .from(kuponKapsami)
          .innerJoin(tablo, eq(tablo.kimlik, kolon))
          .where(eq(kuponKapsami.kupon_kimligi, satir.kimlik))
          .orderBy(sql`${tablo.ad} collate ${harf}`, asc(tablo.kimlik)),
    vt
      .select({
        verilenIndirim:
          sql<number>`coalesce(sum(${siparisler.kupon_indirimi} + ${siparisler.kupon_kargo_indirimi}), 0)`.mapWith(
            Number,
          ),
        siparisToplami: sql<number>`coalesce(sum(${siparisler.toplam}), 0)`.mapWith(Number),
        iade: sql<number>`coalesce(sum(least((select coalesce(sum(${siparisIadeleri.tutar}), 0)
            from ${siparisIadeleri} where ${siparisIadeleri.siparis_kimligi} = ${siparisler.kimlik}
              and ${siparisIadeleri.durum} = 'tamamlandi'), ${siparisler.toplam})), 0)`.mapWith(
          Number,
        ),
      })
      .from(kuponKullanimlari)
      .innerJoin(siparisler, eq(siparisler.kimlik, kuponKullanimlari.siparis_kimligi))
      .where(
        and(
          eq(kuponKullanimlari.kupon_kimligi, satir.kimlik),
          isNull(kuponKullanimlari.serbest_zamani),
        ),
      ),
  ]);
  return {
    ...satir,
    kapsamKayitlari,
    ozet: {
      verilenIndirim: ozet?.verilenIndirim ?? 0,
      siparisToplami: ozet?.siparisToplami ?? 0,
      iadeSonrasi: (ozet?.siparisToplami ?? 0) - (ozet?.iade ?? 0),
    },
  };
};

export type KuponKullanimSatiri = {
  numara: string;
  zaman: Date;
  durum: SiparisDurumu;
  // Teslimattaki ad ve soyad (kişisel bilgisi silinmiş siparişte yok) ve üye olup olmadığı.
  adSoyad: string | null;
  uye: boolean;
  indirim: number;
  toplam: number;
  // İptal ya da tam iadeyle kullanım geri verildi (sayılmaz).
  geriVerildi: boolean;
};

export const kuponKullanimListesi = async (
  vt: Veritabani,
  kupon: string,
  { sayfa, sayfaBoyu }: { sayfa: number; sayfaBoyu: number },
): Promise<{
  satirlar: KuponKullanimSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
}> => {
  const kosul = and(
    eq(kuponKullanimlari.kupon_kimligi, kimligiDuzelt(kupon)),
    isNotNull(kuponKullanimlari.siparis_kimligi),
  );
  const [sayi] = await vt.select({ toplam: count() }).from(kuponKullanimlari).where(kosul);
  const toplam = sayi?.toplam ?? 0;
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / sayfaBoyu));
  const gecerliSayfa = Math.min(Math.max(1, Math.trunc(sayfa) || 1), sayfaSayisi);
  const satirlar = await vt
    .select({
      numara: siparisler.numara,
      zaman: siparisler.olusturma_zamani,
      durum: sql<SiparisDurumu>`${siparisler.durum}`,
      teslimat: siparisler.teslimat,
      silindi: siparisler.kisisel_veri_silinme_zamani,
      musteri: siparisler.musteri_kimligi,
      indirim: siparisler.kupon_indirimi,
      kargoIndirimi: siparisler.kupon_kargo_indirimi,
      toplam: siparisler.toplam,
      serbest: kuponKullanimlari.serbest_zamani,
    })
    .from(kuponKullanimlari)
    .innerJoin(siparisler, eq(siparisler.kimlik, kuponKullanimlari.siparis_kimligi))
    .where(kosul)
    .orderBy(desc(siparisler.olusturma_zamani), desc(siparisler.numara))
    .limit(sayfaBoyu)
    .offset((gecerliSayfa - 1) * sayfaBoyu);
  return {
    satirlar: satirlar.map((satir) => ({
      numara: satir.numara,
      zaman: satir.zaman,
      durum: satir.durum,
      adSoyad:
        satir.silindi === null ? `${satir.teslimat.ad} ${satir.teslimat.soyad}`.trim() : null,
      uye: satir.musteri !== null,
      indirim: satir.indirim + satir.kargoIndirimi,
      toplam: satir.toplam,
      geriVerildi: satir.serbest !== null,
    })),
    toplam,
    sayfa: gecerliSayfa,
    sayfaSayisi,
  };
};

// Formun metinlerinden servisin girdisi (verilen alanlar). Okunamayan bütün alanlar (ve biçimi tutmayan kod) birlikte
// döner (dogrulama).
// İndirim türüyle okunur: yüzde tam sayı, tutar sitenin para biçimiyle; ücretsiz kargoda indirim yoktur (0).
export const panelKuponGirdisi = (
  site: Site,
  girdi: { [Alan in keyof KuponPanelGirdisi]?: KuponPanelGirdisi[Alan] | undefined },
): Partial<KuponGirdisi> => {
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const hatalar: { alan: string; kod: KuponHatasi }[] = [];
  const sonuc: Partial<KuponGirdisi> = {};
  const bos = (yazi: string) => yazi.trim() === "";
  if (girdi.kod !== undefined) {
    sonuc.kod = girdi.kod;
    // Kodun biçimi burada da denetlenir: okunamayan alanla birlikte söylenir (servis yine denetler).
    if (kodBiciminde(girdi.kod) === undefined) hatalar.push({ alan: "kod", kod: "kod-gecersiz" });
  }
  if (girdi.ad !== undefined) sonuc.ad = bos(girdi.ad) ? null : girdi.ad.trim().normalize("NFC");
  if (girdi.tur !== undefined) sonuc.tur = girdi.tur;
  if (girdi.kapsam !== undefined) sonuc.kapsam = girdi.kapsam;
  if (girdi.kapsamKayitlari !== undefined) sonuc.kapsamKayitlari = [...girdi.kapsamKayitlari];
  if (girdi.indirimdeGecmez !== undefined) sonuc.indirimdeGecmez = girdi.indirimdeGecmez;
  if (girdi.acik !== undefined) sonuc.acik = girdi.acik;
  if (girdi.tur !== undefined && (girdi.deger !== undefined || girdi.tur === "ucretsiz-kargo")) {
    const yazi = (girdi.deger ?? "").trim();
    if (girdi.tur === "ucretsiz-kargo") sonuc.deger = 0;
    else if (girdi.tur === "yuzde") {
      if (/^\d{1,3}$/.test(yazi)) sonuc.deger = Number(yazi);
      else hatalar.push({ alan: "deger", kod: "yuzde-gecersiz" });
    } else {
      const tutar = bicim.paraOku(yazi);
      if (tutar === undefined) hatalar.push({ alan: "deger", kod: "tutar-okunamadi" });
      else sonuc.deger = tutar;
    }
  }
  if (girdi.enAzTutar !== undefined) {
    if (bos(girdi.enAzTutar)) sonuc.enAzTutar = null;
    else {
      const tutar = bicim.paraOku(girdi.enAzTutar);
      if (tutar === undefined) hatalar.push({ alan: "enAzTutar", kod: "tutar-okunamadi" });
      else sonuc.enAzTutar = tutar;
    }
  }
  for (const alan of ["baslangic", "bitis"] as const) {
    const yazi = girdi[alan];
    if (yazi === undefined) continue;
    if (bos(yazi)) sonuc[alan] = null;
    else {
      const an = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(yazi)
        ? yerelZamandan(yazi, site.ayarlar.saatDilimi)
        : undefined;
      if (an === undefined) hatalar.push({ alan, kod: "zaman-gecersiz" });
      else sonuc[alan] = an;
    }
  }
  for (const alan of ["toplamSinir", "kisiBasiSinir"] as const) {
    const yazi = girdi[alan];
    if (yazi === undefined) continue;
    if (bos(yazi)) sonuc[alan] = null;
    else if (/^\d{1,10}$/.test(yazi.trim())) sonuc[alan] = Number(yazi.trim());
    else hatalar.push({ alan, kod: "sayi-gecersiz" });
  }
  if (hatalar.length > 0) throw new BilinenHata("dogrulama", hatalar);
  return sonuc;
};
