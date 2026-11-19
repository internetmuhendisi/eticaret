// Siparişin panelden yönetimi (kart 0234, karar 0145). Liste, ayrıntı, durum işlemleri ve notlar yalnız bu servisle.
//
// Kurallar:
// - Durum yalnız siparisIslemleri'ndeki işlemlerle değişir (cekirdek/kayitlar/siparis.ts). İşlem siparişin satırını
//   kilitler; ekranın gördüğü durum bugünkünden farklıysa "cakisma" döner ve hiçbir şey yazılmaz (aynı anda iki
//   yönetici aynı siparişe basınca ikincisi). İşlemin önceki durumu ve ödeme yöntemi tutmazsa "is-kurali". Kayıtta
//   olmayan geçişi veritabanındaki tetikleyici de reddeder (siparis_durum_gecisi).
// - Her işlem geçmişe kim, ne zaman, neden ile yazılır (gecmiseYaz), aynı işlemde.
// - Ödemenin alındığı an (odeme_zamani) havalede onayda, kapıda ödemede teslimde yazılır; daha önce yazılmışsa
//   değişmez (kartla ödeme sipariş kurulurken yazar).
// - Kargo: firma mağaza ayarındaki listeden seçilir; siparişe o anki adı ve takip numarasıyla kurulan takip adresi
//   yazılır (firma listesi sonradan değişse de sipariş değişmez). Takip numarası yoksa takip adresi de yoktur.
// - Not: iç not yalnız panelde, müşteriye not müşterinin sipariş ayrıntısında görünür; not değiştirilemez.
// - Kişisel bilgileri silinmiş siparişte (saklama süresi, temizlik.ts) ad, adres, telefon ve e-posta boştur.
import { and, asc, count, desc, eq, exists, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import {
  type SiparisDurumu,
  type SiparisIslemi,
  siparisDurumlari,
  siparisIslemleri,
  siparisSinirlari,
  takipNumarasiYeri,
} from "../../kayitlar/siparis.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { yoneticiler } from "../ekip/model.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { musteriler } from "../musteri/model.ts";
import { gecmiseYaz, kimSutunlari } from "./gecmis.ts";
import {
  havaleBildirimleri,
  type Siparis,
  type SiparisKalemi,
  siparisGecmisi,
  siparisKalemleri,
  siparisler,
  siparisNotlari,
} from "./model.ts";
import type { KargoBilgisi, SiparisListesiGirdisi, SiparisNotuGirdisi } from "./semalar.ts";

export type SiparisListesiSatiri = {
  kimlik: string;
  numara: string;
  zaman: Date;
  ad: string;
  soyad: string;
  uye: boolean;
  durum: SiparisDurumu;
  odemeYontemi: string;
  kapidaSecenegi: string | null;
  toplam: number;
  paraBirimi: string;
  havaleBildirildi: boolean;
};

export type SiparisListesi = {
  satirlar: SiparisListesiSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  // Durum başına sipariş sayısı (sekmeler); aranan metinden bağımsızdır.
  sayilar: Record<SiparisDurumu, number>;
};

// Geçmişin ve notların yazanı panelde: yönetici ve müşteri e-postasıyla, sistem işleminin adıyla.
export type Yazan =
  | { tur: "yonetici" | "musteri" | "sahip"; eposta: string | null }
  | { tur: "sistem"; ad: string };

// Erişim anahtarının özeti, ödeme oturumunun kimliği ve ödeme kuruluşunun ödeme kimliği panele ve uca çıkmaz
// (bağımsız kontrolün bulgusu): ekran kullanmaz, görevli de görür.
export type SiparisAyrintisi = {
  siparis: Omit<Siparis, "erisim_ozeti" | "oturum_kimligi" | "tahsilat"> & {
    tahsilat: { odenen: number; taksit: number } | null;
  };
  kalemler: SiparisKalemi[];
  gecmis: {
    zaman: Date;
    onceki: SiparisDurumu | null;
    sonraki: SiparisDurumu;
    neden: string;
    yazan: Yazan;
  }[];
  notlar: { zaman: Date; tur: string; metin: string; yazan: Yazan }[];
  bildirimler: {
    zaman: Date;
    gonderen: string;
    banka: string;
    tutar: number;
    odemeTarihi: string;
    not: string | null;
  }[];
};

const yazan = (satir: {
  kimTuru: string;
  kimAdi: string | null;
  yoneticiEpostasi: string | null;
  musteriEpostasi: string | null;
}): Yazan =>
  satir.kimTuru === "sistem"
    ? { tur: "sistem", ad: satir.kimAdi ?? "" }
    : {
        tur: satir.kimTuru as "yonetici" | "musteri" | "sahip",
        eposta: satir.kimTuru === "musteri" ? satir.musteriEpostasi : satir.yoneticiEpostasi,
      };

export const siparisYonetimi = (site: Site) => {
  const liste = async (vt: Veritabani, girdi: SiparisListesiGirdisi): Promise<SiparisListesi> => {
    const kosullar: SQL[] = [];
    if (girdi.durum !== undefined) kosullar.push(eq(siparisler.durum, girdi.durum));
    if (girdi.ara !== undefined) {
      // Aramanın harf kuralıyla (cekirdek/metinler/arama-anahtari.ts): "deniz" "DENİZ"i, "ayse" "Ayşe"yi bulur.
      // strpos ile aranır: "%" ve "_" düz harftir.
      const aranan = aramaAnahtari(girdi.ara);
      const kosul = or(
        sql`strpos(${aramaAnahtariSql(siparisler.numara)}, ${aranan}) > 0`,
        sql`strpos(${aramaAnahtariSql(siparisler.eposta)}, ${aranan}) > 0`,
        sql`strpos(${aramaAnahtariSql(sql`(${siparisler.teslimat}->>'ad') || ' ' || (${siparisler.teslimat}->>'soyad')`)}, ${aranan}) > 0`,
      );
      if (kosul !== undefined) kosullar.push(kosul);
    }
    const nerede = kosullar.length === 0 ? undefined : and(...kosullar);
    const [sayim] = await vt.select({ adet: count() }).from(siparisler).where(nerede);
    const toplam = sayim?.adet ?? 0;
    const sayfaSayisi = Math.max(1, Math.ceil(toplam / siparisSinirlari.sayfaBoyu));
    const sayfa = Math.min(girdi.sayfa, sayfaSayisi);
    const satirlar = await vt
      .select({
        kimlik: siparisler.kimlik,
        numara: siparisler.numara,
        zaman: siparisler.olusturma_zamani,
        teslimat: siparisler.teslimat,
        musteri: siparisler.musteri_kimligi,
        durum: siparisler.durum,
        odemeYontemi: siparisler.odeme_yontemi,
        kapidaSecenegi: siparisler.kapida_secenegi,
        toplam: siparisler.toplam,
        paraBirimi: siparisler.para_birimi,
        havaleBildirildi: exists(
          vt
            .select({ var: sql`1` })
            .from(havaleBildirimleri)
            .where(eq(havaleBildirimleri.siparis_kimligi, siparisler.kimlik)),
        ),
      })
      .from(siparisler)
      .where(nerede)
      .orderBy(desc(siparisler.olusturma_zamani), desc(siparisler.kimlik))
      .limit(siparisSinirlari.sayfaBoyu)
      .offset((sayfa - 1) * siparisSinirlari.sayfaBoyu);
    const durumSayilari = await vt
      .select({ durum: siparisler.durum, adet: count() })
      .from(siparisler)
      .groupBy(siparisler.durum);
    const sayilar = Object.fromEntries(siparisDurumlari.map((durum) => [durum, 0])) as Record<
      SiparisDurumu,
      number
    >;
    for (const { durum, adet } of durumSayilari) sayilar[durum as SiparisDurumu] = adet;
    return {
      satirlar: satirlar.map(({ teslimat, musteri, durum, havaleBildirildi, ...satir }) => ({
        ...satir,
        ad: teslimat.ad ?? "",
        soyad: teslimat.soyad ?? "",
        uye: musteri !== null,
        durum: durum as SiparisDurumu,
        // Bildirim yalnız ödeme beklerken bakılacak iştir.
        havaleBildirildi: Boolean(havaleBildirildi) && durum === "odeme-bekleniyor",
      })),
      toplam,
      sayfa,
      sayfaSayisi,
      sayilar,
    };
  };

  const ayrinti = async (vt: Veritabani, numara: string): Promise<SiparisAyrintisi | null> => {
    const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
    if (satir === undefined) return null;
    const { erisim_ozeti: _ozet, oturum_kimligi: _oturum, tahsilat, ...geri } = satir;
    const siparis = {
      ...geri,
      tahsilat: tahsilat === null ? null : { odenen: tahsilat.odenen, taksit: tahsilat.taksit },
    };
    const yonetici = alias(yoneticiler, "yazan_yonetici");
    const musteri = alias(musteriler, "yazan_musteri");
    const yazanSutunlari = (tablo: typeof siparisGecmisi | typeof siparisNotlari) => ({
      kimTuru: tablo.kim_turu,
      kimAdi: tablo.kim_adi,
      yoneticiEpostasi: yonetici.eposta,
      musteriEpostasi: musteri.eposta,
    });
    const kalemler = await vt
      .select()
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik))
      .orderBy(asc(siparisKalemleri.sira));
    const gecmis = await vt
      .select({
        zaman: siparisGecmisi.zaman,
        onceki: siparisGecmisi.onceki_durum,
        sonraki: siparisGecmisi.sonraki_durum,
        neden: siparisGecmisi.neden,
        ...yazanSutunlari(siparisGecmisi),
      })
      .from(siparisGecmisi)
      .leftJoin(
        yonetici,
        and(
          eq(siparisGecmisi.kim_turu, "yonetici"),
          eq(yonetici.kimlik, siparisGecmisi.kim_kimligi),
        ),
      )
      .leftJoin(
        musteri,
        and(eq(siparisGecmisi.kim_turu, "musteri"), eq(musteri.kimlik, siparisGecmisi.kim_kimligi)),
      )
      .where(eq(siparisGecmisi.siparis_kimligi, siparis.kimlik))
      .orderBy(desc(siparisGecmisi.zaman), desc(siparisGecmisi.kimlik));
    const notlar = await vt
      .select({
        zaman: siparisNotlari.zaman,
        tur: siparisNotlari.tur,
        metin: siparisNotlari.metin,
        ...yazanSutunlari(siparisNotlari),
      })
      .from(siparisNotlari)
      .leftJoin(
        yonetici,
        and(
          eq(siparisNotlari.kim_turu, "yonetici"),
          eq(yonetici.kimlik, siparisNotlari.kim_kimligi),
        ),
      )
      .leftJoin(
        musteri,
        and(eq(siparisNotlari.kim_turu, "musteri"), eq(musteri.kimlik, siparisNotlari.kim_kimligi)),
      )
      .where(eq(siparisNotlari.siparis_kimligi, siparis.kimlik))
      .orderBy(desc(siparisNotlari.zaman), desc(siparisNotlari.kimlik));
    const bildirimler = await vt
      .select({
        zaman: havaleBildirimleri.olusturma_zamani,
        gonderen: havaleBildirimleri.gonderen,
        banka: havaleBildirimleri.banka,
        tutar: havaleBildirimleri.tutar,
        odemeTarihi: havaleBildirimleri.odeme_tarihi,
        not: havaleBildirimleri.not,
      })
      .from(havaleBildirimleri)
      .where(eq(havaleBildirimleri.siparis_kimligi, siparis.kimlik))
      .orderBy(desc(havaleBildirimleri.olusturma_zamani), desc(havaleBildirimleri.kimlik));
    return {
      siparis,
      kalemler,
      gecmis: gecmis.map(({ zaman, onceki, sonraki, neden, ...kim }) => ({
        zaman,
        onceki: onceki as SiparisDurumu | null,
        sonraki: sonraki as SiparisDurumu,
        neden,
        yazan: yazan(kim),
      })),
      notlar: notlar.map(({ zaman, tur, metin, ...kim }) => ({
        zaman,
        tur,
        metin,
        yazan: yazan(kim),
      })),
      bildirimler,
    };
  };

  // Durum işlemi. kargo yalnız kargoya verme ve kargo düzeltmede verilir (öteki işlemlerde reddedilir).
  const islemYap = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: {
      numara: string;
      islem: SiparisIslemi;
      gorulenDurum: SiparisDurumu;
      kargo?: KargoBilgisi | undefined;
    },
  ): Promise<{ numara: string; durum: SiparisDurumu }> => {
    const tanim = siparisIslemleri[girdi.islem];
    const kargoIslemi = girdi.islem === "kargoya-ver" || girdi.islem === "kargo-duzelt";
    if (kargoIslemi !== (girdi.kargo !== undefined)) {
      throw new BilinenHata("dogrulama", [
        { alan: "kargo", kod: kargoIslemi ? "kargo-gerekli" : "kargo-fazla" },
      ]);
    }
    let kargoAlanlari: {
      kargo_firmasi: string;
      takip_numarasi: string | null;
      takip_adresi: string | null;
    } | null = null;
    if (girdi.kargo !== undefined) {
      const { kargoFirmalari } = await siteninMagazaAyarlari(vt, site);
      const firma = kargoFirmalari.find((f) => f.kimlik === girdi.kargo?.firma);
      if (firma === undefined) {
        throw new BilinenHata("dogrulama", [{ alan: "kargo.firma", kod: "firma-yok" }]);
      }
      const takip = girdi.kargo.takipNumarasi ?? null;
      kargoAlanlari = {
        kargo_firmasi: firma.ad,
        takip_numarasi: takip,
        takip_adresi:
          takip === null || firma.takipAdresi === undefined
            ? null
            : firma.takipAdresi.replace(takipNumarasiYeri, encodeURIComponent(takip)),
      };
    }

    return vt.transaction(async (islem) => {
      const [siparis] = await islem
        .select({
          kimlik: siparisler.kimlik,
          numara: siparisler.numara,
          durum: siparisler.durum,
          yontem: siparisler.odeme_yontemi,
          kargoFirmasi: siparisler.kargo_firmasi,
          takipNumarasi: siparisler.takip_numarasi,
        })
        .from(siparisler)
        .where(eq(siparisler.numara, girdi.numara))
        .for("update");
      if (siparis === undefined) throw new BilinenHata("bulunamadi");
      if (siparis.durum !== girdi.gorulenDurum) {
        throw new BilinenHata("cakisma", [{ alan: "durum", kod: "durum-degisti" }]);
      }
      if (siparis.durum !== tanim.onceki) {
        throw new BilinenHata("is-kurali", [{ alan: "islem", kod: "gecis-yok" }]);
      }
      if (tanim.yontem !== null && siparis.yontem !== tanim.yontem) {
        throw new BilinenHata("is-kurali", [{ alan: "islem", kod: "yontem-uymuyor" }]);
      }
      // Hiçbir şeyi değiştirmeyen kargo düzeltmesi geçmişe yazılmaz (bağımsız kontrolün bulgusu).
      if (
        girdi.islem === "kargo-duzelt" &&
        kargoAlanlari !== null &&
        siparis.kargoFirmasi === kargoAlanlari.kargo_firmasi &&
        siparis.takipNumarasi === kargoAlanlari.takip_numarasi
      ) {
        return { numara: siparis.numara, durum: tanim.sonraki };
      }
      await islem
        .update(siparisler)
        .set({
          durum: tanim.sonraki,
          ...(tanim.odeme
            ? { odeme_zamani: sql`coalesce(${siparisler.odeme_zamani}, now())` }
            : {}),
          ...(kargoAlanlari === null ? {} : kargoAlanlari),
          ...(girdi.islem === "kargoya-ver" ? { kargo_zamani: sql`now()` } : {}),
          ...(girdi.islem === "teslim-edildi" ? { teslim_zamani: sql`now()` } : {}),
        })
        .where(eq(siparisler.kimlik, siparis.kimlik));
      await gecmiseYaz(islem, {
        siparis: siparis.kimlik,
        onceki: tanim.onceki,
        sonraki: tanim.sonraki,
        neden: tanim.neden,
        kim,
      });
      return { numara: siparis.numara, durum: tanim.sonraki };
    });
  };

  const notEkle = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: SiparisNotuGirdisi,
  ): Promise<{ numara: string }> => {
    const [siparis] = await vt
      .select({ kimlik: siparisler.kimlik, numara: siparisler.numara })
      .from(siparisler)
      .where(eq(siparisler.numara, girdi.numara));
    if (siparis === undefined) throw new BilinenHata("bulunamadi");
    await vt.insert(siparisNotlari).values({
      siparis_kimligi: siparis.kimlik,
      zaman: sql`clock_timestamp()`,
      tur: girdi.tur,
      metin: girdi.metin,
      ...kimSutunlari(kim),
    });
    return { numara: siparis.numara };
  };

  return { liste, ayrinti, islemYap, notEkle };
};
