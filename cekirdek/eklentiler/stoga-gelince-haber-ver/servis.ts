// Stoğa gelince haber ver eklentisinin kuralları (kart 0144, karar 0117). Talep yalnız buradan yazılır, gönderilir
// ve silinir.
//
// Kurallar:
// - Eklenti kapalıysa hiçbir işlem yapılmaz: talep yazılmaz ("bulunamadi"), e-posta gitmez. Saklama süresi dolan
//   talep kapalıyken de silinir.
// - Talep yalnız tükenmiş birime yazılır: sayfası açılan ürünün (vitrinKosulu, sayfa yeri) silinmemiş, takibi açık
//   ve stoğu olmayan birimi (stokDurumu). Satılabilir ya da takibi kapalı birime "is-kurali" döner; olmayan,
//   silinmiş ya da sayfası açılmayan birim bulunamadıdır.
// - Aynı e-posta aynı birime bekleyen talep olarak bir kez yazılır; ikinci kez de başarı döner (adresin kayıtlı
//   olup olmadığı belli olmaz).
// - Gönderim parti partidir: her partiden önce birim yeniden okunur, satılamıyorsa (stok yeniden bitti, ürün
//   kapandı) kalan talepler bekler. Talepler SKIP LOCKED ile alınır: aynı anda çalışan iki gönderim aynı talebi
//   alamaz, her talep bir kez gider. E-posta ve talebin "gönderildi"si aynı işlemdedir; e-posta adresi talepten
//   silinir (kullanıcı kararı).
import { and, asc, count, desc, eq, inArray, isNull, lt, min, sql } from "drizzle-orm";
import { siteAdresi } from "../../ayar-semasi/site-adresi.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type StokBildirimiSiralamasi, stokBildirimiAyari } from "../../kayitlar/eklentiler.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { epostaGonder } from "../../moduller/eposta/servis.ts";
import { siteninStokAyarlari, stokDurumlari } from "../../moduller/stok/durum.ts";
import { urunBirimleri, urunler } from "../../moduller/urun/model.ts";
import { birimDegerleri, secenekleriOku, urunlerinBirimleri } from "../../moduller/urun/varyant.ts";
import { vitrinKosulu, vitrinStokSecenegi } from "../../moduller/urun/vitrin.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { kayitAdresleri } from "../../vitrin/adresler.ts";
import { sayfaSecenekleri } from "../../vitrin/urun-sayfasi/secenekler.ts";
import { secimdenSorgu } from "../../vitrin/urun-sayfasi/secim.ts";
import { eklentiAcikMi } from "../acik.ts";
import { stokBildirimiTalepleri } from "./model.ts";

const kod = "stoga-gelince-haber-ver";

// Birimin vitrindeki adı ve sayfası: ürünün adı, seçimin değer adları (renk, beden) ve sayfanın seçimli adresi.
export type BirimBilgisi = {
  urun: string;
  urunAdi: string;
  // Değer adları seçeneklerin sırasıyla; basit üründe boş.
  secim: string[];
  // Sitenin köküne göre ürün sayfası, seçimiyle ("/urun/tisort?secenek-renk=siyah").
  adres: string;
};

// Birimlerin bilgisi; birim sayısıyla artmayan dört sorgu. Olmayan birim haritada yoktur. Seçenek anahtarları ürün
// sayfasıyla aynı işlevden gelir (sayfaSecenekleri): e-postadaki bağlantı sayfada aynı birleşimi açar.
export const birimBilgileri = async (
  vt: Veritabani | VeritabaniIslemi,
  birimler: string[],
): Promise<Map<string, BirimBilgisi>> => {
  const gecerli = [...new Set(birimler.filter(kimlikMi).map(kimligiDuzelt))];
  if (gecerli.length === 0) return new Map();
  const satirlar = await vt
    .select({
      birim: urunBirimleri.kimlik,
      urun: urunler.kimlik,
      urunAdi: urunler.ad,
      adresAdi: urunler.adres_adi,
    })
    .from(urunBirimleri)
    .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
    .where(inArray(urunBirimleri.kimlik, gecerli));
  const urunKimlikleri = [...new Set(satirlar.map((satir) => satir.urun))];
  const [secenekler, urununBirimleri] = await Promise.all([
    secenekleriOku(vt, urunKimlikleri, { silinmisler: false }),
    urunlerinBirimleri(vt, urunKimlikleri),
  ]);
  // Değerler bütün ürünlerin seçenekleri birlikte verilerek tek sorguda sıralanır: kimlikler ürünler arasında
  // çakışmaz, her ürünün kendi seçenek sırası korunur.
  const butunSecenekler = urunKimlikleri.flatMap((urun) => secenekler.get(urun) ?? []);
  const degerler = await birimDegerleri(
    vt,
    [...new Set([...gecerli, ...[...urununBirimleri.values()].flat()])],
    butunSecenekler,
  );
  return new Map(
    satirlar.map((satir) => {
      const sayfaninSecenekleri = sayfaSecenekleri(
        secenekler.get(satir.urun) ?? [],
        (urununBirimleri.get(satir.urun) ?? []).map((birim) => ({
          degerler: degerler.get(birim) ?? [],
        })),
      );
      const birimin = new Set(degerler.get(satir.birim) ?? []);
      const secim = sayfaninSecenekleri.map(
        (secenek) => secenek.degerler.find((deger) => birimin.has(deger.kimlik))?.kimlik,
      );
      const adlar = sayfaninSecenekleri.flatMap((secenek, i) => {
        const ad = secenek.degerler.find((deger) => deger.kimlik === secim[i])?.ad;
        return ad === undefined ? [] : [ad];
      });
      return [
        satir.birim,
        {
          urun: satir.urun,
          urunAdi: satir.urunAdi,
          secim: adlar,
          adres: `${kayitAdresleri.urun(satir.adresAdi)}${secimdenSorgu(sayfaninSecenekleri, secim)}`,
        },
      ];
    }),
  );
};

export type PanelSatiri = BirimBilgisi & {
  birim: string;
  bekleyen: number;
  enEski: Date;
};

export const stokBildirimiServisi = (site: Site) => {
  // Eklenti açık ve site e-posta gönderebiliyor mu: gönderen adresi olmayan sitede e-posta hiç gitmez, talep de
  // alınmaz (bağımsız kontrolün bulgusu; bülten bölümüyle aynı kural, karar 0090).
  const acik = () => eklentiAcikMi(site, kod) && site.ayarlar.epostaGonderenAdresi !== undefined;
  // Mağaza ayarları ve sitenin para birimi: fiyatsız birim satın alınamaz, stokDurumu onu tükenmiş sayar
  // (kart 0155, karar 0133).
  const ayarlar = (vt: Veritabani) => siteninStokAyarlari(vt, site);
  type Ayarlar = Awaited<ReturnType<typeof ayarlar>>;

  // Verilen birimlerden silinmemiş ve ürününün sayfası açılanlar (vitrinKosulu, sayfa yeri). Talep, gönderim ve
  // hatanın seçimi aynı koşulu kullanır.
  const gorunenBirimler = async (
    vt: Veritabani | VeritabaniIslemi,
    birimler: string[],
    okunan: Ayarlar,
  ): Promise<Set<string>> => {
    if (birimler.length === 0) return new Set();
    const satirlar = await vt
      .select({ birim: urunBirimleri.kimlik })
      .from(urunBirimleri)
      .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
      .where(
        and(
          inArray(urunBirimleri.kimlik, birimler),
          isNull(urunBirimleri.silinme_zamani),
          vitrinKosulu("sayfa", vitrinStokSecenegi(site, okunan)),
        ),
      );
    return new Set(satirlar.map(({ birim }) => birim));
  };

  // Birimlerin hangilerine talep yazılabilir: sayfası açılan ürünün silinmemiş, satın alınamayan birimleri: stoğu
  // tükenmiş ya da fiyatı olmayan (stokDurumu, kart 0155; takibi kapalı fiyatlı birim hiç tükenmez). Eklenti
  // kapalıysa hiçbiri. Ürün sayfası formu bununla çizer; talep yazarken aynı kural yeniden sınanır.
  const talepAlinabilirBirimler = async (
    vt: Veritabani,
    birimler: string[],
  ): Promise<Set<string>> => {
    const gecerli = [...new Set(birimler.filter(kimlikMi).map(kimligiDuzelt))];
    if (!acik() || gecerli.length === 0) return new Set();
    const okunan = await ayarlar(vt);
    const [durumlar, gorunen] = await Promise.all([
      stokDurumlari(vt, gecerli, okunan),
      gorunenBirimler(vt, gecerli, okunan),
    ]);
    return new Set([...gorunen].filter((birim) => durumlar.get(birim)?.tukendi === true));
  };

  // Birim sayfası açılan bir üründe var mı ve silinmemiş mi (talep yazılamayan birimin hatasını seçmek için).
  const birimGorunuyorMu = async (vt: Veritabani, birim: string): Promise<boolean> =>
    (await gorunenBirimler(vt, [birim], await ayarlar(vt))).has(birim);

  // Talep yazar. Üye olmayan müşteri ayar kapalıysa yazamaz (uç denetler: uyeOlmayanIzinliMi).
  const talepYaz = async (vt: Veritabani, birim: string, eposta: string): Promise<void> => {
    if (!acik() || !kimlikMi(birim)) throw new BilinenHata("bulunamadi");
    const kimlik = kimligiDuzelt(birim);
    if (!(await talepAlinabilirBirimler(vt, [kimlik])).has(kimlik)) {
      if (!(await birimGorunuyorMu(vt, kimlik))) throw new BilinenHata("bulunamadi");
      throw new BilinenHata("is-kurali", [{ alan: "birim", kod: "talep-alinamaz" }]);
    }
    await vt
      .insert(stokBildirimiTalepleri)
      .values({
        birim_kimligi: kimlik,
        eposta,
        durum: "bekliyor",
        olusturma_zamani: sql`clock_timestamp()`,
      })
      .onConflictDoNothing();
  };

  const uyeOlmayanIzinliMi = async (vt: Veritabani): Promise<boolean> =>
    (await ayarlar(vt)).stokBildirimiUyeOlmayan;

  // Birimin bekleyen taleplerini gönderir. Dönen değer gönderilen talep sayısıdır.
  const bekleyenleriGonder = async (vt: Veritabani, birim: string): Promise<number> => {
    if (!acik() || !kimlikMi(birim)) return 0;
    const kimlik = kimligiDuzelt(birim);
    const metin = metinOkuyucu(site.ayarlar.dil);
    const kok = siteAdresi(site.kimlik);
    const okunan = await ayarlar(vt);
    let gonderilen = 0;
    for (;;) {
      const partide = await vt.transaction(async (islem) => {
        // Her partide yeniden: stok bittiyse ya da ürün kapandıysa kalan talepler bekler.
        if (!(await gonderilebilirMi(islem, kimlik, okunan))) return 0;
        const talepler = await islem
          .select({ kimlik: stokBildirimiTalepleri.kimlik, eposta: stokBildirimiTalepleri.eposta })
          .from(stokBildirimiTalepleri)
          .where(
            and(
              eq(stokBildirimiTalepleri.birim_kimligi, kimlik),
              eq(stokBildirimiTalepleri.durum, "bekliyor"),
            ),
          )
          .orderBy(asc(stokBildirimiTalepleri.olusturma_zamani), asc(stokBildirimiTalepleri.kimlik))
          .limit(stokBildirimiAyari.parti)
          .for("update", { skipLocked: true });
        if (talepler.length === 0) return 0;
        const bilgi = (await birimBilgileri(islem, [kimlik])).get(kimlik);
        if (bilgi === undefined) return 0;
        const urun =
          bilgi.secim.length === 0
            ? bilgi.urunAdi
            : `${bilgi.urunAdi} (${bilgi.secim.join(metin("eklenti.stokBildirimi.secimAyiraci"))})`;
        for (const talep of talepler) {
          if (talep.eposta === null) continue;
          await epostaGonder(islem, {
            kime: talep.eposta,
            sablon: "stok-bildirimi",
            degiskenler: {
              urun,
              ...(kok === undefined ? {} : { baglanti: `${kok}${bilgi.adres}` }),
            },
          });
        }
        await islem
          .update(stokBildirimiTalepleri)
          .set({ durum: "gonderildi", eposta: null, gonderilme_zamani: sql`clock_timestamp()` })
          .where(
            inArray(
              stokBildirimiTalepleri.kimlik,
              talepler.map((talep) => talep.kimlik),
            ),
          );
        return talepler.length;
      });
      gonderilen += partide;
      if (partide < stokBildirimiAyari.parti) return gonderilen;
    }
  };

  // Birim satılabilir (stoğu ve fiyatı var, stokDurumu) ve sayfası açık mı. Stok kilitlenmez: parti yazılırken gelen sipariş beklemesin.
  // Bu sırada stok biterse bu partinin e-postaları yine gider, sonraki parti bekler.
  const gonderilebilirMi = async (
    islem: VeritabaniIslemi,
    birim: string,
    okunan: Ayarlar,
  ): Promise<boolean> => {
    const [durumlar, gorunen] = await Promise.all([
      stokDurumlari(islem, [birim], okunan),
      gorunenBirimler(islem, [birim], okunan),
    ]);
    return gorunen.has(birim) && durumlar.get(birim)?.satilabilir === true;
  };

  // Panel: bekleyen talebi olan birimler, en çok bekleyen önce (eşitte en eski talep önce).
  // Panelin listesi (kart 0258): sıralama ve ürün adında arama (aramanın harf kuralıyla, "%" ve "_" düz harftir).
  const panelListesi = async (
    vt: Veritabani,
    secim: { siralama?: StokBildirimiSiralamasi; ara?: string } = {},
  ): Promise<PanelSatiri[]> => {
    const ilk = min(stokBildirimiTalepleri.olusturma_zamani);
    const sira =
      secim.siralama === "en-eski-talep" ? [asc(ilk), desc(count())] : [desc(count()), asc(ilk)];
    const aranan = secim.ara === undefined || secim.ara === "" ? "" : aramaAnahtari(secim.ara);
    const satirlar = await vt
      .select({
        birim: stokBildirimiTalepleri.birim_kimligi,
        bekleyen: count(),
        enEski: ilk,
      })
      .from(stokBildirimiTalepleri)
      .innerJoin(urunBirimleri, eq(urunBirimleri.kimlik, stokBildirimiTalepleri.birim_kimligi))
      .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
      .where(
        and(
          eq(stokBildirimiTalepleri.durum, "bekliyor"),
          aranan === "" ? undefined : sql`strpos(${aramaAnahtariSql(urunler.ad)}, ${aranan}) > 0`,
        ),
      )
      .groupBy(stokBildirimiTalepleri.birim_kimligi)
      .orderBy(...sira, asc(stokBildirimiTalepleri.birim_kimligi))
      .limit(stokBildirimiAyari.panelSiniri);
    const birimler = satirlar.map((satir) => satir.birim);
    // Silinmiş birimin ya da sayfası açılmayan (silinmiş, taslak, arşiv) ürünün talepleri gösterilmez: bağlantı
    // bulunamadıya gider, talep süresi dolunca silinir (bağımsız kontrolün bulgusu).
    const [bilgiler, gorunen] = await Promise.all([
      birimBilgileri(vt, birimler),
      gorunenBirimler(vt, birimler, await ayarlar(vt)),
    ]);
    return satirlar.flatMap(({ birim, bekleyen, enEski }) => {
      const bilgi = bilgiler.get(birim);
      return bilgi === undefined || enEski === null || !gorunen.has(birim)
        ? []
        : [{ ...bilgi, birim, bekleyen, enEski }];
    });
  };

  // Bekleyen talebi olup şu an gönderilebilecek birimler: satılabilir (stoğu ve fiyatı var), sayfası açık. Stoğun sıfırdan
  // çıktığı anda gönderilemeyen talepler (eklenti kapalıydı, ürün taslaktaydı, fiyat sonradan girildi, talep stokla
  // aynı anda yazıldı) zamanlı taramayla bunlardan gider (bağımsız kontrolün bulgusu). Eklenti kapalıysa hiçbiri.
  const gonderilebilirBekleyenler = async (vt: Veritabani): Promise<string[]> => {
    if (!acik()) return [];
    const satirlar = await vt
      .selectDistinct({ birim: stokBildirimiTalepleri.birim_kimligi })
      .from(stokBildirimiTalepleri)
      .where(eq(stokBildirimiTalepleri.durum, "bekliyor"));
    const birimler = satirlar.map(({ birim }) => birim);
    if (birimler.length === 0) return [];
    const okunan = await ayarlar(vt);
    const [durumlar, gorunen] = await Promise.all([
      stokDurumlari(vt, birimler, okunan),
      gorunenBirimler(vt, birimler, okunan),
    ]);
    return birimler.filter(
      (birim) => gorunen.has(birim) && durumlar.get(birim)?.satilabilir === true,
    );
  };

  // Saklama süresi dolan talepleri siler (bekleyen de gönderilmiş de). Eklenti kapalıyken de çalışır: süre kişisel
  // verinin saklanma süresidir. Dönen değer silinen talep sayısıdır.
  const eskiTalepleriSil = async (vt: Veritabani): Promise<number> => {
    const { stokBildirimiSaklamaGun: gun } = await ayarlar(vt);
    const silinen = await vt
      .delete(stokBildirimiTalepleri)
      .where(
        lt(stokBildirimiTalepleri.olusturma_zamani, sql`now() - make_interval(days => ${gun})`),
      )
      .returning({ kimlik: stokBildirimiTalepleri.kimlik });
    return silinen.length;
  };

  return {
    acikMi: acik,
    talepAlinabilirBirimler,
    gonderilebilirBekleyenler,
    talepYaz,
    uyeOlmayanIzinliMi,
    bekleyenleriGonder,
    panelListesi,
    eskiTalepleriSil,
  };
};
