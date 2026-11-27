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
// - Bekleyen iade talebi olan sipariş listede işaretlidir (kart 0239). Bildirilmiş havalesi ödeme bekleyen, bekleyen
//   iade talebi olan, sonucu beklenen iadesi olan, onaylanmış ve iadesi yapılmamış talebi olan ve son iadesi başarısız
//   olan siparişler "Bakılması gereken" süzgeciyle listelenir (kart 0267).
// - Tarih süzgeci siparişin oluşturulduğu günü sitenin saat dilimiyle sayar (iki uç dahil); kargo firması süzgeci
//   siparişe kargoya verildiği an yazılan adla eşleşir.
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNotNull,
  lt,
  notExists,
  notInArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { TopluSonuc } from "../../kayitlar/liste.ts";
import {
  type SiparisDurumu,
  type SiparisIslemi,
  type SiparisListesiSiralamasi,
  type SiparisTopluIslemi,
  siparisDurumlari,
  siparisIslemleri,
  takipNumarasiYeri,
} from "../../kayitlar/siparis.ts";
import { aramaAnahtari, aramaAnahtariSql } from "../../metinler/arama-anahtari.ts";
import { gunEkle, gununBasi } from "../../metinler/bicimleyici.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { harfSirasi } from "../../veritabani/harf-sirasi.ts";
import { yoneticiler } from "../ekip/model.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { musteriler } from "../musteri/model.ts";
import { siparisEpostasiYaz } from "./epostalar.ts";
import { gecmiseYaz, kimSutunlari } from "./gecmis.ts";
import { iadeTalebiServisi } from "./iade-talebi.ts";
import {
  havaleBildirimleri,
  type Siparis,
  type SiparisIadesi,
  type SiparisKalemi,
  siparisAdresDuzeltmeleri,
  siparisGecmisi,
  siparisIadeleri,
  siparisIadeTalepleri,
  siparisKalemleri,
  siparisler,
  siparisNotlari,
} from "./model.ts";
import type { KargoBilgisi, SiparisListesiGirdisi, SiparisNotuGirdisi } from "./semalar.ts";

// Listenin sıralamaları (kart 0258): eşitlikte kimlik, aynı yönde.
const listeSiralari: Record<SiparisListesiSiralamasi, SQL[]> = {
  "en-yeni": [desc(siparisler.olusturma_zamani), desc(siparisler.kimlik)],
  "en-eski": [asc(siparisler.olusturma_zamani), asc(siparisler.kimlik)],
  "tutar-azalan": [desc(siparisler.toplam), desc(siparisler.kimlik)],
  "tutar-artan": [asc(siparisler.toplam), asc(siparisler.kimlik)],
};

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
  // Bekleyen iade talebi var (kart 0239).
  iadeTalebi: boolean;
  // Sonucu beklenen iadesi var (kart 0267): kartla iade ödeme kuruluşunun cevabını bekliyor.
  iadeBekliyor: boolean;
  // Onaylanmış ve iadesi yapılmamış talebi var; son iadesi başarısız (kart 0267, kullanıcı kararı).
  talepOnaylandi: boolean;
  iadeBasarisiz: boolean;
};

export type SiparisListesi = {
  satirlar: SiparisListesiSatiri[];
  toplam: number;
  sayfa: number;
  sayfaSayisi: number;
  sayfaBoyu: number;
  // Durum başına sipariş sayısı (sekmeler); ödeme yöntemi, tarih ve kargo firması süzgeçlerine uyar, aranan
  // metinden ve sekmeden bağımsızdır.
  sayilar: Record<SiparisDurumu, number>;
  // Bakılması gereken sipariş sayısı (kart 0267, "Bakılması gereken" sekmesi), sayılarla aynı kuralla.
  bakilacakSayisi: number;
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
    // Adres düzeltmesinin (kart 0269) önceki ve yeni bilgileri; başka nedende ve temizlikten sonra null.
    oncekiTeslimat: Siparis["teslimat"] | null;
    oncekiFatura: Siparis["fatura"] | null;
    yeniTeslimat: Siparis["teslimat"] | null;
    yeniFatura: Siparis["fatura"] | null;
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
  // İptal ve iadeler, en yeni önce (kart 0235); başarısız olanlar da (para dönmedi).
  iadeler: (Omit<SiparisIadesi, "kim_turu" | "kim_kimligi" | "kim_adi"> & { yazan: Yazan })[];
  // Müşterinin iade talepleri, eskiden yeniye (kart 0239); iadesi yapıldı mı.
  talepler: Awaited<ReturnType<ReturnType<typeof iadeTalebiServisi>["talepler"]>>;
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

// Siparişin aramasının koşulu (liste ve panelin araması, kart 0321): numara, e-posta ya da teslimattaki ad, aramanın
// harf kuralıyla (cekirdek/metinler/arama-anahtari.ts): "deniz" "DENİZ"i, "ayse" "Ayşe"yi bulur. strpos ile aranır:
// "%" ve "_" düz harftir.
const siparisAramaKosulu = (metin: string) => {
  const aranan = aramaAnahtari(metin);
  return or(
    sql`strpos(${aramaAnahtariSql(siparisler.numara)}, ${aranan}) > 0`,
    sql`strpos(${aramaAnahtariSql(siparisler.eposta)}, ${aranan}) > 0`,
    sql`strpos(${aramaAnahtariSql(sql`(${siparisler.teslimat}->>'ad') || ' ' || (${siparisler.teslimat}->>'soyad')`)}, ${aranan}) > 0`,
  );
};

export const siparisYonetimi = (site: Site) => {
  // Listenin koşulları (kart 0316'da ayrıldı): liste, sayılar ve dışa aktarma aynı koşulu kullanır.
  type ListeKosulGirdisi = Omit<SiparisListesiGirdisi, "siralama" | "sayfa" | "sayfaBoyu">;
  const listeKosullari = (vt: Veritabani, girdi: ListeKosulGirdisi) => {
    const varMi = (tablo: typeof siparisIadeTalepleri | typeof siparisIadeleri) =>
      exists(
        vt
          .select({ var: sql`1` })
          .from(tablo)
          .where(and(eq(tablo.siparis_kimligi, siparisler.kimlik), eq(tablo.durum, "bekliyor"))),
      );
    // Bakılması gereken işler (kart 0267): bildirilmiş havale (yalnız ödeme beklerken), bekleyen iade talebi, sonucu
    // beklenen iade (kartla iade kuruluşun cevabını bekliyor), onaylanmış ve iadesi yapılmamış talep, başarısız iade.
    // Satırın işaretleri ve sekme aynı koşullardır.
    const havaleBekliyor = and(
      eq(siparisler.durum, "odeme-bekleniyor"),
      exists(
        vt
          .select({ var: sql`1` })
          .from(havaleBildirimleri)
          .where(eq(havaleBildirimleri.siparis_kimligi, siparisler.kimlik)),
      ),
    );
    const talepBekliyor = varMi(siparisIadeTalepleri);
    const iadeBekliyor = varMi(siparisIadeleri);
    // Onaylanmış ve iadesi yapılmamış talep (kart 0267, kullanıcı kararı): talebe bağlı tamamlanmış ya da süren iade
    // yoksa (iade talebi servisinin iadeYapildi kuralı). İadesi bitmiş ya da iptal edilmiş siparişte artık
    // yapılacak iade yoktur, sayılmaz.
    const talepIadesi = alias(siparisIadeleri, "talep_iadesi");
    const talepOnaylandi = and(
      notInArray(siparisler.durum, ["iade-edildi", "iptal"]),
      exists(
        vt
          .select({ var: sql`1` })
          .from(siparisIadeTalepleri)
          .where(
            and(
              eq(siparisIadeTalepleri.siparis_kimligi, siparisler.kimlik),
              eq(siparisIadeTalepleri.durum, "onaylandi"),
              notExists(
                vt
                  .select({ var: sql`1` })
                  .from(talepIadesi)
                  .where(
                    and(
                      eq(talepIadesi.talep_kimligi, siparisIadeTalepleri.kimlik),
                      inArray(talepIadesi.durum, ["tamamlandi", "bekliyor"]),
                    ),
                  ),
              ),
            ),
          ),
      ),
    );
    // Başarısız iade (kart 0267, kullanıcı kararı): ödeme kuruluşunun reddettiği iade, siparişte ondan sonra
    // tamamlanmış ya da süren bir iade yoksa. Yeniden iade yapılınca sayılmaz.
    const sonrakiIade = alias(siparisIadeleri, "sonraki_iade");
    const iadeBasarisiz = exists(
      vt
        .select({ var: sql`1` })
        .from(siparisIadeleri)
        .where(
          and(
            eq(siparisIadeleri.siparis_kimligi, siparisler.kimlik),
            eq(siparisIadeleri.durum, "basarisiz"),
            notExists(
              vt
                .select({ var: sql`1` })
                .from(sonrakiIade)
                .where(
                  and(
                    eq(sonrakiIade.siparis_kimligi, siparisIadeleri.siparis_kimligi),
                    inArray(sonrakiIade.durum, ["tamamlandi", "bekliyor"]),
                    gt(sonrakiIade.olusturma_zamani, siparisIadeleri.olusturma_zamani),
                  ),
                ),
            ),
          ),
        ),
    );
    const bakilacak = or(
      havaleBekliyor,
      talepBekliyor,
      iadeBekliyor,
      talepOnaylandi,
      iadeBasarisiz,
    );
    // Sekmenin dışındaki süzgeçler (ödeme yöntemi, tarih, kargo firması) sekme sayılarına da uygulanır.
    const suzgecler: SQL[] = [];
    if (girdi.odeme !== undefined) suzgecler.push(inArray(siparisler.odeme_yontemi, girdi.odeme));
    if (girdi.tarih !== undefined) {
      const { baslangic, bitis } = girdi.tarih;
      const saatDilimi = site.ayarlar.saatDilimi;
      if (baslangic !== null) {
        suzgecler.push(gte(siparisler.olusturma_zamani, gununBasi(baslangic, saatDilimi)));
      }
      if (bitis !== null) {
        suzgecler.push(lt(siparisler.olusturma_zamani, gununBasi(gunEkle(bitis, 1), saatDilimi)));
      }
    }
    if (girdi.kargo !== undefined) suzgecler.push(inArray(siparisler.kargo_firmasi, girdi.kargo));
    const kosullar: (SQL | undefined)[] = [...suzgecler];
    if (girdi.durum !== undefined) kosullar.push(eq(siparisler.durum, girdi.durum));
    if (girdi.bakilacak === true) kosullar.push(bakilacak);
    if (girdi.ara !== undefined) kosullar.push(siparisAramaKosulu(girdi.ara));
    return {
      nerede: and(...kosullar),
      suzgecKosulu: and(...suzgecler),
      bakilacak,
      havaleBekliyor,
      talepBekliyor,
      iadeBekliyor,
      talepOnaylandi,
      iadeBasarisiz,
    };
  };

  const liste = async (vt: Veritabani, girdi: SiparisListesiGirdisi): Promise<SiparisListesi> => {
    const {
      nerede,
      suzgecKosulu,
      bakilacak,
      havaleBekliyor,
      talepBekliyor,
      iadeBekliyor,
      talepOnaylandi,
      iadeBasarisiz,
    } = listeKosullari(vt, girdi);
    const [sayim] = await vt.select({ adet: count() }).from(siparisler).where(nerede);
    const toplam = sayim?.adet ?? 0;
    const sayfaSayisi = Math.max(1, Math.ceil(toplam / girdi.sayfaBoyu));
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
        havaleBildirildi: sql<boolean>`coalesce(${havaleBekliyor}, false)`,
        iadeTalebi: talepBekliyor,
        iadeBekliyor,
        talepOnaylandi: sql<boolean>`coalesce(${talepOnaylandi}, false)`,
        iadeBasarisiz,
      })
      .from(siparisler)
      .where(nerede)
      .orderBy(...listeSiralari[girdi.siralama])
      .limit(girdi.sayfaBoyu)
      .offset((sayfa - 1) * girdi.sayfaBoyu);
    const durumSayilari = await vt
      .select({ durum: siparisler.durum, adet: count() })
      .from(siparisler)
      .where(suzgecKosulu)
      .groupBy(siparisler.durum);
    const sayilar = Object.fromEntries(siparisDurumlari.map((durum) => [durum, 0])) as Record<
      SiparisDurumu,
      number
    >;
    for (const { durum, adet } of durumSayilari) sayilar[durum as SiparisDurumu] = adet;
    const [bakilacakSayimi] = await vt
      .select({ adet: count() })
      .from(siparisler)
      .where(and(suzgecKosulu, bakilacak));
    return {
      satirlar: satirlar.map(
        ({
          teslimat,
          musteri,
          durum,
          havaleBildirildi,
          iadeTalebi,
          iadeBekliyor,
          talepOnaylandi,
          iadeBasarisiz,
          ...satir
        }) => ({
          ...satir,
          ad: teslimat.ad ?? "",
          soyad: teslimat.soyad ?? "",
          uye: musteri !== null,
          durum: durum as SiparisDurumu,
          havaleBildirildi: Boolean(havaleBildirildi),
          iadeTalebi: Boolean(iadeTalebi),
          iadeBekliyor: Boolean(iadeBekliyor),
          talepOnaylandi: Boolean(talepOnaylandi),
          iadeBasarisiz: Boolean(iadeBasarisiz),
        }),
      ),
      toplam,
      sayfa,
      sayfaSayisi,
      sayfaBoyu: girdi.sayfaBoyu,
      sayilar,
      bakilacakSayisi: bakilacakSayimi?.adet ?? 0,
    };
  };

  // Listenin süzgeçlerine uyan siparişlerin kimlikleri listenin sırasıyla (kart 0316, dışa aktarma): en çok sinir
  // kadar; toplam sınırı aşıyorsa yalnız sayı döner.
  const listeninSiparisleri = async (
    vt: Veritabani,
    girdi: ListeKosulGirdisi & { siralama: SiparisListesiSiralamasi },
    sinir: number,
  ): Promise<{ toplam: number; kimlikler: string[] }> => {
    const { nerede } = listeKosullari(vt, girdi);
    const [sayim] = await vt.select({ adet: count() }).from(siparisler).where(nerede);
    const toplam = sayim?.adet ?? 0;
    if (toplam > sinir) return { toplam, kimlikler: [] };
    const satirlar = await vt
      .select({ kimlik: siparisler.kimlik })
      .from(siparisler)
      .where(nerede)
      .orderBy(...listeSiralari[girdi.siralama]);
    return { toplam, kimlikler: satirlar.map((satir) => satir.kimlik) };
  };

  // Siparişlerdeki kargo firması adları (kart 0267, sipariş listesinin süzgeci): kargoya verildiği andaki adlar,
  // tekrarsız, sitenin dilinin harf sırasıyla. Firma listesinden silinmiş ya da adı değişmiş firma da gelir.
  const kargoFirmalari = async (vt: Veritabani): Promise<string[]> => {
    const ad = sql`${siparisler.kargo_firmasi} collate ${sql.identifier(await harfSirasi(vt, site.ayarlar.dil))}`;
    const satirlar = await vt
      .selectDistinct({ ad: siparisler.kargo_firmasi, sira: ad })
      .from(siparisler)
      .where(isNotNull(siparisler.kargo_firmasi))
      .orderBy(ad);
    return satirlar.flatMap((satir) => (satir.ad === null ? [] : [satir.ad]));
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
    const yazanSutunlari = (
      tablo: typeof siparisGecmisi | typeof siparisNotlari | typeof siparisIadeleri,
    ) => ({
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
        // Adres düzeltmesinin önceki bilgileri (kart 0269); kişisel veri temizliğinden sonra yoktur.
        oncekiTeslimat: siparisAdresDuzeltmeleri.onceki_teslimat,
        oncekiFatura: siparisAdresDuzeltmeleri.onceki_fatura,
        yeniTeslimat: siparisAdresDuzeltmeleri.yeni_teslimat,
        yeniFatura: siparisAdresDuzeltmeleri.yeni_fatura,
        ...yazanSutunlari(siparisGecmisi),
      })
      .from(siparisGecmisi)
      .leftJoin(
        siparisAdresDuzeltmeleri,
        eq(siparisAdresDuzeltmeleri.gecmis_kimligi, siparisGecmisi.kimlik),
      )
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
    const iadeler = await vt
      .select({ iade: siparisIadeleri, ...yazanSutunlari(siparisIadeleri) })
      .from(siparisIadeleri)
      .leftJoin(
        yonetici,
        and(
          eq(siparisIadeleri.kim_turu, "yonetici"),
          eq(yonetici.kimlik, siparisIadeleri.kim_kimligi),
        ),
      )
      .leftJoin(
        musteri,
        and(
          eq(siparisIadeleri.kim_turu, "musteri"),
          eq(musteri.kimlik, siparisIadeleri.kim_kimligi),
        ),
      )
      .where(eq(siparisIadeleri.siparis_kimligi, siparis.kimlik))
      .orderBy(desc(siparisIadeleri.olusturma_zamani), desc(siparisIadeleri.kimlik));
    const talepler = await iadeTalebiServisi(site).talepler(vt, siparis.kimlik);
    return {
      siparis,
      kalemler,
      gecmis: gecmis.map(
        ({
          zaman,
          onceki,
          sonraki,
          neden,
          oncekiTeslimat,
          oncekiFatura,
          yeniTeslimat,
          yeniFatura,
          ...kim
        }) => ({
          zaman,
          onceki: onceki as SiparisDurumu | null,
          sonraki: sonraki as SiparisDurumu,
          neden,
          oncekiTeslimat,
          oncekiFatura,
          yeniTeslimat,
          yeniFatura,
          yazan: yazan(kim),
        }),
      ),
      notlar: notlar.map(({ zaman, tur, metin, ...kim }) => ({
        zaman,
        tur,
        metin,
        yazan: yazan(kim),
      })),
      bildirimler,
      iadeler: iadeler.map(({ iade: { kim_turu, kim_kimligi: _k, kim_adi, ...iade }, ...kim }) => ({
        ...iade,
        yazan: yazan({ ...kim, kimTuru: kim_turu, kimAdi: kim_adi }),
      })),
      talepler,
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

    // Teslim e-postası iade talebinin son gününü söyler (kart 0240); süre işlemden önce okunur.
    const iadeTalebiSuresi =
      girdi.islem === "teslim-edildi"
        ? (await siteninMagazaAyarlari(vt, site)).iadeTalebiSuresi
        : undefined;

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
      // Kuruluşun yanıtını bekleyen iade varken durum değişmez (kart 0235): iade tamamlanınca durumu kendisi yazar.
      const [bekleyen] = await islem
        .select({ kimlik: siparisIadeleri.kimlik })
        .from(siparisIadeleri)
        .where(
          and(
            eq(siparisIadeleri.siparis_kimligi, siparis.kimlik),
            eq(siparisIadeleri.durum, "bekliyor"),
          ),
        )
        .limit(1);
      if (bekleyen !== undefined) {
        throw new BilinenHata("cakisma", [{ alan: "iade", kod: "iade-bekliyor" }]);
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
        ...(iadeTalebiSuresi === undefined ? {} : { eposta: { iadeTalebiSuresi } }),
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
    // Müşteriye not e-postayla da gider (kart 0240), notla aynı işlemde ve notun kimliğiyle.
    await vt.transaction(async (islem) => {
      const [not] = await islem
        .insert(siparisNotlari)
        .values({
          siparis_kimligi: siparis.kimlik,
          zaman: sql`clock_timestamp()`,
          tur: girdi.tur,
          metin: girdi.metin,
          ...kimSutunlari(kim),
        })
        .returning({ kimlik: siparisNotlari.kimlik });
      if (not === undefined) throw new Error("Not yazılamadı.");
      if (girdi.tur === "musteri") {
        await siparisEpostasiYaz(islem, {
          siparis: siparis.kimlik,
          sablon: "musteriye-not",
          olayAnahtari: `siparis-notu:${not.kimlik}`,
          ek: { not: girdi.metin },
        });
      }
    });
    return { numara: siparis.numara };
  };

  // Toplu işlem (kart 0258): her sipariş tekil işlemle aynı yoldan (islemYap: satır kilidi, görülen durum, geçiş ve
  // yöntem kuralı, geçmiş, e-posta), kendi işleminde ve sırayla geçer. Bilinen hata o siparişin nedeni olur, ötekiler
  // sürer; beklenmeyen hata kaydedilir ve "beklenmeyen" nedeniyle döner.
  const topluIslem = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: {
      islem: SiparisTopluIslemi;
      siparisler: readonly { numara: string; gorulenDurum: SiparisDurumu }[];
    },
  ): Promise<TopluSonuc> => {
    const sonuc: TopluSonuc = { islenen: [], islenemeyen: [] };
    for (const { numara, gorulenDurum } of girdi.siparisler) {
      try {
        await islemYap(vt, kim, { numara, islem: girdi.islem, gorulenDurum });
        sonuc.islenen.push(numara);
      } catch (hata) {
        if (hata instanceof BilinenHata) {
          const ayrinti = Array.isArray(hata.ayrinti)
            ? (hata.ayrinti[0] as { kod?: unknown } | undefined)
            : undefined;
          sonuc.islenemeyen.push({
            anahtar: numara,
            kod: typeof ayrinti?.kod === "string" ? ayrinti.kod : hata.kod,
          });
        } else {
          hatayiKaydet(hata, { islem: "siparis-toplu-islem" });
          sonuc.islenemeyen.push({ anahtar: numara, kod: "beklenmeyen" });
        }
      }
    }
    return sonuc;
  };

  // Panelin araması (kart 0321): aramaya uyan siparişler, en yeni önce, en çok verilen sayıda. Kişisel bilgisi silinmiş
  // siparişin adı ve e-postası yoktur: yalnız numarasıyla bulunur.
  const ara = async (vt: Veritabani, metin: string, sinir: number) =>
    vt
      .select({
        numara: siparisler.numara,
        teslimat: siparisler.teslimat,
        durum: siparisler.durum,
        toplam: siparisler.toplam,
        paraBirimi: siparisler.para_birimi,
      })
      .from(siparisler)
      .where(siparisAramaKosulu(metin))
      .orderBy(desc(siparisler.olusturma_zamani), desc(siparisler.numara))
      .limit(sinir);

  return {
    liste,
    listeninSiparisleri,
    ara,
    kargoFirmalari,
    ayrinti,
    islemYap,
    notEkle,
    topluIslem,
  };
};
