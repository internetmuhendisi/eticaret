// Panelin müşteri ekranlarının servisi (kart 0271, karar 0173): liste, ayrıntı, mağazanın notları ve şifre sıfırlama
// bağlantısı. Yalnız üyeler (karar 0157); silinmiş hesap listede ve ayrıntıda yoktur.
// - Ad: hesapta ad yoktur (kullanıcı kararı): son siparişin teslimat adı (kişisel bilgisi silinmemiş), yoksa varsayılan
//   teslimat adresinin adı, ikisi de yoksa boş (ekran e-postayı yazar).
// - Sipariş sayısı ve toplam: iptal edilmemiş siparişler, sitenin para biriminde; toplamdan tamamlanan iadeler düşülür
//   (siparişin iadesi siparişin tutarını aşmaz).
// - Kampanya izni: müşterinin en yeni pazarlama onayı satırı (satırlar değişmez, karar 0051).
// - Liste, sayılar ve süzgeçler tek sorguda: her müşteri için ayrı sorgu atılmaz.
// - Not metni ve e-posta değişiklik kaydına yazılmaz; kayda yalnız müşterinin ve notun kimliği girer.
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { MusteriOnayTuru } from "../../kayitlar/musteri-onaylari.ts";
import type { MusteriListesiSiralamasi } from "../../kayitlar/musteri-paneli.ts";
import { musteriPanelSinirlari } from "../../kayitlar/musteri-paneli.ts";
import type { SiparisDurumu } from "../../kayitlar/siparis.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import { gunEkle, gununBasi } from "../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { vitrinAdresleri } from "../../vitrin/adresler.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { yoneticiler } from "../ekip/model.ts";
import { type SifreSifirlamaSonucu, sifreSifirlamaIste } from "../oturum/sifre-sifirlama.ts";
import { siparisIadeleri, siparisler } from "../siparis/model.ts";
import { adresServisi } from "./adres.ts";
import { musteriAdresleri, musteriler, musteriNotlari, musteriOnaylari } from "./model.ts";
import type {
  MusteriListesiGirdisi,
  MusteriNotuGirdisi,
  MusteriNotuSilGirdisi,
} from "./panel-semalari.ts";

const iptal: SiparisDurumu = "iptal";
const pazarlama: MusteriOnayTuru = "pazarlama";
const uyelik: MusteriOnayTuru = "uyelik-sozlesmesi";

// Notun ve geçmişin yazanı panelde (siparişlerinkiyle aynı biçim): yönetici e-postasıyla, sistem işlemi adıyla.
export type NotYazani =
  | { tur: "yonetici" | "musteri" | "sahip"; eposta: string | null }
  | { tur: "sistem"; ad: string };

export type MusteriSatiri = {
  kimlik: string;
  eposta: string;
  ad: string | null;
  kayit: Date;
  siparisSayisi: number;
  toplam: number;
  kampanyaIzni: boolean;
};

export type MusteriListesi = {
  satirlar: MusteriSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  sayfaBoyu: number;
};

export type MusteriAyrintisi = MusteriSatiri & {
  kampanyaZamani: Date | null;
  uyelikSurumu: string | null;
  siparisler: { numara: string; zaman: Date; durum: SiparisDurumu; toplam: number }[];
  adresler: Awaited<ReturnType<ReturnType<typeof adresServisi>["adresListesi"]>>;
  notlar: { kimlik: string; zaman: Date; metin: string; yazan: NotYazani }[];
};

const listeSiralari = (
  s: {
    kayit: SQL.Aliased<Date> | SQL;
    adet: SQL;
    toplam: SQL;
  },
  kimlik: typeof musteriler.kimlik,
): Record<MusteriListesiSiralamasi, SQL[]> => ({
  "en-yeni": [sql`${s.kayit} desc`, desc(kimlik)],
  "en-eski": [sql`${s.kayit} asc`, asc(kimlik)],
  "siparis-azalan": [sql`${s.adet} desc`, sql`${s.kayit} desc`, desc(kimlik)],
  "siparis-artan": [sql`${s.adet} asc`, sql`${s.kayit} desc`, desc(kimlik)],
  "toplam-azalan": [sql`${s.toplam} desc`, sql`${s.kayit} desc`, desc(kimlik)],
  "toplam-artan": [sql`${s.toplam} asc`, sql`${s.kayit} desc`, desc(kimlik)],
});

export const musteriYonetimi = (site: Site) => {
  const paraBirimi = site.ayarlar.paraBirimi;

  // Her müşterinin sayıları, adı ve kampanya izni: alt sorgular müşteri başına bir satır verir.
  const ozetler = (vt: Veritabani) => {
    const siparisOzeti = vt
      .select({
        musteri: siparisler.musteri_kimligi,
        adet: sql<number>`count(*) filter (where ${siparisler.durum} <> ${iptal} and ${siparisler.para_birimi} = ${paraBirimi})`
          .mapWith(Number)
          .as("adet"),
        brut: sql<number>`coalesce(sum(${siparisler.toplam}) filter (where ${siparisler.durum} <> ${iptal} and ${siparisler.para_birimi} = ${paraBirimi}), 0)`
          .mapWith(Number)
          .as("brut"),
      })
      .from(siparisler)
      .where(isNotNull(siparisler.musteri_kimligi))
      .groupBy(siparisler.musteri_kimligi)
      .as("siparis_ozeti");
    // Siparişin iadesi siparişin tutarını aşamaz: taksitli ödemenin tam iadesi taksit farkını da döndürür
    // (iade-hesabi.ts), müşterinin toplamı yine eksiye düşmez.
    const siparisIadesi = vt
      .select({
        siparis: siparisIadeleri.siparis_kimligi,
        iade: sql<number>`sum(${siparisIadeleri.tutar})`.mapWith(Number).as("siparis_iadesi"),
      })
      .from(siparisIadeleri)
      .where(eq(siparisIadeleri.durum, "tamamlandi"))
      .groupBy(siparisIadeleri.siparis_kimligi)
      .as("siparis_iadesi");
    const iadeOzeti = vt
      .select({
        musteri: siparisler.musteri_kimligi,
        iade: sql<number>`coalesce(sum(least(${siparisIadesi.iade}, ${siparisler.toplam})), 0)`
          .mapWith(Number)
          .as("iade"),
      })
      .from(siparisler)
      .innerJoin(siparisIadesi, eq(siparisIadesi.siparis, siparisler.kimlik))
      .where(
        and(
          isNotNull(siparisler.musteri_kimligi),
          ne(siparisler.durum, iptal),
          eq(siparisler.para_birimi, paraBirimi),
        ),
      )
      .groupBy(siparisler.musteri_kimligi)
      .as("iade_ozeti");
    const kampanya = vt
      .selectDistinctOn([musteriOnaylari.musteri_kimligi], {
        musteri: musteriOnaylari.musteri_kimligi,
        verildi: musteriOnaylari.verildi,
        zaman: sql<Date>`${musteriOnaylari.zaman}`
          .mapWith(musteriOnaylari.zaman)
          .as("kampanya_zamani"),
      })
      .from(musteriOnaylari)
      .where(eq(musteriOnaylari.tur, pazarlama))
      .orderBy(
        musteriOnaylari.musteri_kimligi,
        desc(musteriOnaylari.zaman),
        desc(musteriOnaylari.kimlik),
      )
      .as("kampanya");
    const sonSiparis = vt
      .selectDistinctOn([siparisler.musteri_kimligi], {
        musteri: siparisler.musteri_kimligi,
        ad: sql<string>`trim(coalesce(${siparisler.teslimat}->>'ad', '') || ' ' || coalesce(${siparisler.teslimat}->>'soyad', ''))`.as(
          "son_ad",
        ),
      })
      .from(siparisler)
      .where(
        and(isNotNull(siparisler.musteri_kimligi), isNull(siparisler.kisisel_veri_silinme_zamani)),
      )
      .orderBy(
        siparisler.musteri_kimligi,
        desc(siparisler.olusturma_zamani),
        desc(siparisler.kimlik),
      )
      .as("son_siparis");
    const adres = alias(musteriAdresleri, "varsayilan_adres");
    const adIfadesi = sql<
      string | null
    >`coalesce(nullif(${sonSiparis.ad}, ''), nullif(trim(${adres.ad} || ' ' || ${adres.soyad}), ''))`;
    const adet = sql<number>`coalesce(${siparisOzeti.adet}, 0)`;
    const toplam = sql<number>`coalesce(${siparisOzeti.brut}, 0) - coalesce(${iadeOzeti.iade}, 0)`;
    const kampanyaIzni = sql<boolean>`coalesce(${kampanya.verildi}, false)`;
    const sutunlar = {
      kimlik: musteriler.kimlik,
      eposta: musteriler.eposta,
      ad: adIfadesi,
      kayit: musteriler.olusturulma_zamani,
      siparisSayisi: adet.mapWith(Number),
      toplam: toplam.mapWith(Number),
      kampanyaIzni,
      kampanyaZamani: kampanya.zaman,
    };
    return {
      sutunlar,
      adIfadesi,
      adet,
      toplam,
      kampanyaIzni,
      siparisOzeti,
      iadeOzeti,
      kampanya,
      sonSiparis,
      adres,
    };
  };

  // Listenin ve ayrıntının ortak sorgusu: müşteriler, özetleri, adı ve kampanya izni.
  const birlesik = (vt: Veritabani, o: ReturnType<typeof ozetler>) =>
    vt
      .select(o.sutunlar)
      .from(musteriler)
      .leftJoin(o.siparisOzeti, eq(o.siparisOzeti.musteri, musteriler.kimlik))
      .leftJoin(o.iadeOzeti, eq(o.iadeOzeti.musteri, musteriler.kimlik))
      .leftJoin(o.kampanya, eq(o.kampanya.musteri, musteriler.kimlik))
      .leftJoin(o.sonSiparis, eq(o.sonSiparis.musteri, musteriler.kimlik))
      .leftJoin(
        o.adres,
        and(eq(o.adres.musteri_kimligi, musteriler.kimlik), eq(o.adres.varsayilan_teslimat, true)),
      );

  const liste = async (vt: Veritabani, girdi: MusteriListesiGirdisi): Promise<MusteriListesi> => {
    const o = ozetler(vt);
    const kosullar: (SQL | undefined)[] = [isNull(musteriler.silinme_zamani)];
    if (girdi.kayit !== undefined) {
      const { baslangic, bitis } = girdi.kayit;
      const saatDilimi = site.ayarlar.saatDilimi;
      if (baslangic !== null) {
        kosullar.push(gte(musteriler.olusturulma_zamani, gununBasi(baslangic, saatDilimi)));
      }
      if (bitis !== null) {
        kosullar.push(lt(musteriler.olusturulma_zamani, gununBasi(gunEkle(bitis, 1), saatDilimi)));
      }
    }
    // İki seçenek birlikte süzmez (hepsi).
    if (girdi.kampanya !== undefined && girdi.kampanya.length === 1) {
      kosullar.push(
        girdi.kampanya[0] === "var" ? sql`${o.kampanyaIzni}` : sql`not ${o.kampanyaIzni}`,
      );
    }
    if (girdi.siparis !== undefined && girdi.siparis.length === 1) {
      kosullar.push(girdi.siparis[0] === "var" ? sql`${o.adet} > 0` : sql`${o.adet} = 0`);
    }
    if (girdi.ara !== undefined) {
      // Aramanın harf kuralıyla (cekirdek/metinler/arama-anahtari.ts); strpos: "%" ve "_" düz harftir.
      const aranan = aramaAnahtari(girdi.ara);
      kosullar.push(
        or(
          sql`strpos(${aramaAnahtariSql(musteriler.eposta)}, ${aranan}) > 0`,
          sql`strpos(${aramaAnahtariSql(sql`coalesce(${o.adIfadesi}, '')`)}, ${aranan}) > 0`,
        ),
      );
    }
    const nerede = and(...kosullar);
    const [sayim] = await vt
      .select({ adet: count() })
      .from(birlesik(vt, o).where(nerede).as("sayilan"));
    const toplam = Number(sayim?.adet ?? 0);
    const sayfaSayisi = Math.max(1, Math.ceil(toplam / girdi.sayfaBoyu));
    const sayfa = Math.min(girdi.sayfa, sayfaSayisi);
    const satirlar = await birlesik(vt, o)
      .where(nerede)
      .orderBy(
        ...listeSiralari(
          { kayit: sql`${musteriler.olusturulma_zamani}`, adet: o.adet, toplam: o.toplam },
          musteriler.kimlik,
        )[girdi.siralama],
      )
      .limit(girdi.sayfaBoyu)
      .offset((sayfa - 1) * girdi.sayfaBoyu);
    return {
      satirlar: satirlar.map(({ kampanyaZamani: _zaman, ...satir }) => satir),
      toplam,
      sayfa,
      sayfaSayisi,
      sayfaBoyu: girdi.sayfaBoyu,
    };
  };

  // Müşterinin ayrıntısı: silinmiş ya da olmayan hesapta null.
  const ayrinti = async (vt: Veritabani, kimlik: string): Promise<MusteriAyrintisi | null> => {
    const o = ozetler(vt);
    const [satir] = await birlesik(vt, o).where(
      and(eq(musteriler.kimlik, kimlik), isNull(musteriler.silinme_zamani)),
    );
    if (satir === undefined) return null;
    const [uyelikOnayi] = await vt
      .select({ surum: musteriOnaylari.metin_surumu })
      .from(musteriOnaylari)
      .where(and(eq(musteriOnaylari.musteri_kimligi, kimlik), eq(musteriOnaylari.tur, uyelik)))
      .orderBy(desc(musteriOnaylari.zaman), desc(musteriOnaylari.kimlik))
      .limit(1);
    const siparisSatirlari = await vt
      .select({
        numara: siparisler.numara,
        zaman: siparisler.olusturma_zamani,
        durum: siparisler.durum,
        toplam: siparisler.toplam,
      })
      .from(siparisler)
      .where(eq(siparisler.musteri_kimligi, kimlik))
      .orderBy(desc(siparisler.olusturma_zamani), desc(siparisler.kimlik))
      .limit(musteriPanelSinirlari.ayrintiSiparis);
    const yonetici = alias(yoneticiler, "not_yazani");
    const notlar = await vt
      .select({
        kimlik: musteriNotlari.kimlik,
        zaman: musteriNotlari.zaman,
        metin: musteriNotlari.metin,
        kimTuru: musteriNotlari.kim_turu,
        kimAdi: musteriNotlari.kim_adi,
        yoneticiEpostasi: yonetici.eposta,
      })
      .from(musteriNotlari)
      .leftJoin(yonetici, eq(yonetici.kimlik, musteriNotlari.kim_kimligi))
      .where(eq(musteriNotlari.musteri_kimligi, kimlik))
      .orderBy(desc(musteriNotlari.zaman), desc(musteriNotlari.kimlik))
      .limit(musteriPanelSinirlari.ayrintiNot);
    return {
      ...satir,
      uyelikSurumu: uyelikOnayi?.surum ?? null,
      siparisler: siparisSatirlari.map((s) => ({ ...s, durum: s.durum as SiparisDurumu })),
      adresler: await adresServisi(site).adresListesi(vt, kimlik),
      notlar: notlar.map((n) => ({
        kimlik: n.kimlik,
        zaman: n.zaman,
        metin: n.metin,
        yazan:
          n.kimTuru === "sistem"
            ? { tur: "sistem" as const, ad: n.kimAdi ?? "" }
            : {
                tur: n.kimTuru as "yonetici" | "musteri" | "sahip",
                eposta: n.kimTuru === "yonetici" ? n.yoneticiEpostasi : null,
              },
      })),
    };
  };

  // Hesap var ve silinmemiş mi (sipariş ayrıntısındaki bağlantı için).
  const acikMi = async (vt: Veritabani, kimlik: string): Promise<boolean> =>
    (
      await vt
        .select({ kimlik: musteriler.kimlik })
        .from(musteriler)
        .where(and(eq(musteriler.kimlik, kimlik), isNull(musteriler.silinme_zamani)))
    ).length > 0;

  // Not ekler: müşterinin satırı paylaşımlı kilitlenir (aynı anda silinen hesaba not yazılmaz).
  const notEkle = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: MusteriNotuGirdisi,
  ): Promise<{ kimlik: string }> =>
    vt.transaction(async (islem) => {
      const [musteri] = await islem
        .select({ kimlik: musteriler.kimlik })
        .from(musteriler)
        .where(and(eq(musteriler.kimlik, girdi.musteri), isNull(musteriler.silinme_zamani)))
        .for("share");
      if (musteri === undefined) throw new BilinenHata("bulunamadi");
      const [not] = await islem
        .insert(musteriNotlari)
        .values({
          musteri_kimligi: musteri.kimlik,
          zaman: sql`clock_timestamp()`,
          metin: girdi.metin,
          kim_turu: kim.tur,
          kim_kimligi: kim.tur === "sistem" ? null : kim.kimlik,
          kim_adi: kim.tur === "sistem" ? kim.ad : null,
        })
        .returning({ kimlik: musteriNotlari.kimlik });
      if (not === undefined) throw new Error("Not yazılamadı.");
      await degisikligiKaydet(islem, {
        kim,
        islem: "musteri-notu.eklendi",
        kayit: { tur: "musteri-notu", kimlik: not.kimlik },
        eski: null,
        yeni: { musteri: musteri.kimlik },
      });
      return { kimlik: not.kimlik };
    });

  // Notu kalıcı siler; başka müşterinin notu ya da olmayan not "bulunamadi".
  const notSil = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: MusteriNotuSilGirdisi,
  ): Promise<void> =>
    vt.transaction(async (islem) => {
      const [silinen] = await islem
        .delete(musteriNotlari)
        .where(
          and(
            eq(musteriNotlari.kimlik, girdi.not),
            eq(musteriNotlari.musteri_kimligi, girdi.musteri),
          ),
        )
        .returning({ kimlik: musteriNotlari.kimlik });
      if (silinen === undefined) throw new BilinenHata("bulunamadi");
      await degisikligiKaydet(islem, {
        kim,
        islem: "musteri-notu.silindi",
        kayit: { tur: "musteri-notu", kimlik: silinen.kimlik },
        eski: { musteri: girdi.musteri },
        yeni: null,
      });
    });

  // Şifre sıfırlama bağlantısı müşterinin kendi e-postasına gider (şifremi unuttum akışı ve sınırları); mağaza şifreyi
  // görmez. Değişiklik kaydı bağlantıyla aynı işlemde yazılır. Müşterinin sınırı doluysa "istek-siniri"
  // (ayrıntıda müşteri alanıyla), hesap yoksa "bulunamadi".
  const sifreSifirlamaGonder = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    musteriKimligi: string,
  ): Promise<{ sonuc: Extract<SifreSifirlamaSonucu, "gonderildi"> }> => {
    const [musteri] = await vt
      .select({ kimlik: musteriler.kimlik, eposta: musteriler.eposta })
      .from(musteriler)
      .where(and(eq(musteriler.kimlik, musteriKimligi), isNull(musteriler.silinme_zamani)));
    if (musteri === undefined) throw new BilinenHata("bulunamadi");
    const sonuc = await sifreSifirlamaIste(
      vt,
      "musteri",
      { eposta: musteri.eposta },
      vitrinAdresleri.sifreYenile,
      (islem, hesap) =>
        degisikligiKaydet(islem, {
          kim,
          islem: "musteri.sifre-sifirlama-gonderildi",
          kayit: { tur: "musteri", kimlik: hesap },
          eski: null,
          yeni: null,
        }),
    );
    // Müşterinin bağlantı sınırı panelin kendi istek sınırından ayrılır: ayrıntıda müşteri alanı.
    if (sonuc === "sinir") {
      throw new BilinenHata("istek-siniri", [{ alan: "musteri", kod: "sifre-sifirlama-siniri" }]);
    }
    if (sonuc === "hesap-yok") throw new BilinenHata("bulunamadi");
    if (sonuc === "adres-yok") throw new BilinenHata("hizmet-kullanilamiyor");
    return { sonuc };
  };

  return { liste, ayrinti, acikMi, notEkle, notSil, sifreSifirlamaGonder };
};
