// Sipariş (kart 0214, karar 0141). Sipariş ödeme oturumundan, sepetin tek hesabıyla (sepetiHesapla) kurulur; bu kartta
// yalnız ödeme adımının sonunda oluşan kayıt kadardır. Sipariş yönetimi, e-postalar ve siparişlerim on üçüncü
// bölümdedir.
//
// Kurallar:
// - siparisiKur çağıranın işleminde çalışır (ödeme servisi oturumla aynı işlemde çağırır; kartla ödeme, kart 0215,
//   bankadan dönüşte). Stok stokDus ile "yeterliyse düş" koşuluyla düşer; başka oturumların süresi dolmamış
//   ayırmaları düşülmüş sayılır, siparişin kendi oturumunun ayırması siparişe geçer (silinir). Aynı oturumdan ikinci
//   sipariş kurulmaz (tekil indeks; ikinci çağrı "cakisma").
// - Siparişe o anki her şey yazılır: ürün adı, seçim, stok kodu, birim fiyat, vergi oranları ve tutarı, kargo,
//   toplam, vergi dökümü (vergi adıyla), teslimat ve fatura, not, onaylar ve ödeme yöntemi.
// - Numara sitenin öneki ve sıradan gelir (siparisNumarasi); geri alınan işlemin numarası boşta kalır.
// - Ödemesi sipariş kurulurken alınmış siparişte (kartla ödeme, kart 0215; tahsilat verilir) durum "hazırlanıyor"dur,
//   tahsilat (ödenen tutar, taksit, ödeme kimliği) siparişe yazılır.
// - Havalede ödeme son anı veritabanının saatiyle şimdi artı havaleIptalSuresi gündür. Süresi dolan, ödeme bekleyen
//   ve bildirimsiz havale siparişi kendiliğinden iptal olur (havaleIptalTaramasi): stok yalnız o siparişin stok
//   geçmişinde düşürdüğü adet kadar geri konur, geçmişe yazılır. Bildirimli sipariş iptal olmaz (kullanıcı kararı).
//   Satır kilidi aynı siparişin iki kez iptal edilmesini önler (SKIP LOCKED ve durum koşulu). İptal iptal.ts'tedir:
//   arka plan süreci yükler, bu dosyanın vitrin bağımlılıklarını (sitenin biçimleyicisi) çekmez.
// - Siparişi veren tarayıcıya bir erişim anahtarı verilir; veritabanında yalnız özeti durur. Sipariş alındı sayfası
//   siparişi yalnız bu anahtarla okur.
// - Havale bildirimi: üye olmayan müşteri numara ve siparişteki e-postayla, üye kendi siparişi için bildirir. Numara
//   ve e-posta eşleşmezse "bulunamadi" döner (siparişin var olup olmadığı belli olmaz). Yalnız ödeme bekleyen havale
//   siparişine bildirim yazılır.
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { havaleBildirimiSinirlari } from "../../kayitlar/odeme.ts";
import type { SiparisDurumu } from "../../kayitlar/siparis.ts";

import { yerelZamandan } from "../../metinler/bicimleyici.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import type { OturumOnayi } from "../odeme/model.ts";
import type { Fatura, OdemeYontemiSecimi, Teslimat } from "../odeme/semalar.ts";
import type { SepetHesabi } from "../sepet/hesap.ts";
import { stokServisi } from "../stok/servis.ts";
import {
  urunBirimiDegerleri,
  urunBirimleri,
  urunler,
  urunSecenekDegerleri,
  urunSecenekleri,
} from "../urun/model.ts";
import { gecmiseYaz, uyeOlmayanMusteri } from "./gecmis.ts";
import { havaleIptalTaramasi } from "./iptal.ts";
import {
  havaleBildirimleri,
  type Siparis,
  type SiparisKalemi,
  siparisKalemleri,
  siparisler,
  type Tahsilat,
} from "./model.ts";
import type { HavaleBildirimiFormu } from "./semalar.ts";

const stok = stokServisi();

export const erisimOzeti = (anahtar: string): string =>
  createHash("sha256").update(anahtar).digest("hex");

export type KurulacakOturum = {
  kimlik: string;
  musteri: string | null;
  eposta: string;
  teslimat: Teslimat;
  fatura: Fatura;
  not: string | null;
  onaylar: OturumOnayi[];
};

export type KurulanSiparis = { kimlik: string; numara: string; erisimAnahtari: string };

export const siparisServisi = (site: Site) => {
  // Sitenin öneki ve sıradan numara: "ORN-1001". Başlangıç ayarı ilk siparişin numarasıdır.
  const numaraAl = async (islem: VeritabaniIslemi): Promise<string> => {
    const sonuc = await islem.execute<{ sira: string }>(
      sql`select nextval('siparis_numarasi')::text as sira`,
    );
    const sira = Number(sonuc.rows[0]?.sira);
    if (!Number.isSafeInteger(sira)) throw new Error("Sipariş numarası alınamadı.");
    return `${site.ayarlar.siparisOneki}-${site.ayarlar.siparisBaslangici - 1 + sira}`;
  };

  // Kalemlerin sipariş anındaki adı, seçimi ve stok kodu, birimler sayısınca artmayan iki sorguyla.
  const kalemBilgileri = async (islem: VeritabaniIslemi, birimler: string[]) => {
    // İşlemin tek bağlantısında sırayla.
    const satirlar = await islem
      .select({
        birim: urunBirimleri.kimlik,
        urun: urunler.kimlik,
        ad: urunler.ad,
        stokKodu: urunBirimleri.stok_kodu,
      })
      .from(urunBirimleri)
      .innerJoin(urunler, eq(urunler.kimlik, urunBirimleri.urun_kimligi))
      .where(inArray(urunBirimleri.kimlik, birimler));
    const degerler = await islem
      .select({
        birim: urunBirimiDegerleri.birim_kimligi,
        secenek: urunSecenekleri.ad,
        deger: urunSecenekDegerleri.ad,
      })
      .from(urunBirimiDegerleri)
      .innerJoin(
        urunSecenekDegerleri,
        eq(urunSecenekDegerleri.kimlik, urunBirimiDegerleri.deger_kimligi),
      )
      .innerJoin(urunSecenekleri, eq(urunSecenekleri.kimlik, urunSecenekDegerleri.secenek_kimligi))
      .where(inArray(urunBirimiDegerleri.birim_kimligi, birimler))
      .orderBy(asc(urunSecenekleri.sira), asc(urunSecenekleri.kimlik));
    return { bilgiler: new Map(satirlar.map((satir) => [satir.birim, satir])), degerler };
  };

  // Oturumdan sipariş: çağıranın işleminde. Hesap çağıranın sepetiHesapla sonucudur (aynı kalemler, aynı bölge).
  const siparisiKur = async (
    islem: VeritabaniIslemi,
    girdi: {
      oturum: KurulacakOturum;
      hesap: SepetHesabi;
      odeme: OdemeYontemiSecimi | { yontem: "elden" };
      havaleIptalSuresi: number;
      tahsilat?: Tahsilat;
      // Panelden elle sipariş (kart 0236): geçmişe ve değişiklik kaydına siparişi giren yönetici yazılır.
      panel?: { yonetici: string };
    },
  ): Promise<KurulanSiparis> => {
    const { oturum, hesap, odeme } = girdi;
    const satilanlar = hesap.satirlar.filter((satir) => satir.satilabilir);
    if (satilanlar.length === 0) {
      throw new BilinenHata("is-kurali", [{ alan: "kalemler", kod: "sepet-bos" }]);
    }
    const kim: DegisikligiYapan =
      girdi.panel !== undefined
        ? { tur: "yonetici", kimlik: girdi.panel.yonetici }
        : oturum.musteri === null
          ? uyeOlmayanMusteri
          : { tur: "musteri", kimlik: oturum.musteri };
    const numara = await numaraAl(islem);
    const erisimAnahtari = randomBytes(32).toString("base64url");
    const havale = odeme.yontem === "havale";
    // Ödemesi alınmış sipariş (kartla ödeme, panelden "elden") hazırlanıyor, ötekiler ödeme bekliyor.
    const odendi = girdi.tahsilat !== undefined || odeme.yontem === "elden";
    const durum: SiparisDurumu = odendi ? "hazirlaniyor" : "odeme-bekleniyor";
    const [yazilan] = await islem
      .insert(siparisler)
      .values({
        numara,
        oturum_kimligi: oturum.kimlik,
        musteri_kimligi: oturum.musteri,
        eposta: oturum.eposta,
        teslimat: oturum.teslimat,
        fatura: oturum.fatura,
        not: oturum.not,
        onaylar: oturum.onaylar,
        odeme_yontemi: odeme.yontem,
        kapida_secenegi: odeme.yontem === "kapida-odeme" ? odeme.secenek : null,
        durum,
        para_birimi: hesap.paraBirimi,
        gosterim: hesap.gosterim,
        ara_toplam: hesap.araToplam,
        kargo_turu: hesap.kargo.tur,
        kargo_tutari: hesap.kargo.tur === "ucretli" ? hesap.kargo.tutar : 0,
        vergi_toplami: hesap.vergi.toplam,
        toplam: hesap.toplam,
        // Oranın adı vergi hesabından gelir: oranın kendi adı, yoksa sitenin vergi adı (vergiHesapla).
        vergi_dokumu: hesap.vergi.dokum.map((satir) => ({
          ...(satir.ad === undefined ? {} : { ad: satir.ad }),
          oran: satir.oran,
          matrah: satir.matrah,
          vergi: satir.vergi,
        })),
        odeme_son_zamani: havale
          ? sql`now() + make_interval(days => ${girdi.havaleIptalSuresi})`
          : null,
        tahsilat: girdi.tahsilat ?? null,
        // Kartla ödemede ödeme sipariş kurulurken alınmıştır (kart 0234).
        odeme_zamani: odendi ? sql`now()` : null,
        erisim_ozeti: erisimOzeti(erisimAnahtari),
      })
      .onConflictDoNothing({ target: siparisler.oturum_kimligi })
      .returning({ kimlik: siparisler.kimlik });
    if (yazilan === undefined) {
      throw new BilinenHata("cakisma", [{ alan: "oturum", kod: "siparis-var" }]);
    }

    const { bilgiler, degerler } = await kalemBilgileri(
      islem,
      satilanlar.map((satir) => satir.birim),
    );
    await islem.insert(siparisKalemleri).values(
      satilanlar.map((satir, sira) => {
        const bilgi = bilgiler.get(satir.birim);
        if (bilgi === undefined || satir.birimTutari === undefined || satir.tutar === undefined) {
          throw new Error("Satılabilir satırın ürünü ya da tutarı yok.");
        }
        return {
          siparis_kimligi: yazilan.kimlik,
          sira,
          birim_kimligi: satir.birim,
          urun_kimligi: bilgi.urun,
          urun_adi: bilgi.ad,
          secim: degerler
            .filter((deger) => deger.birim === satir.birim)
            .map(({ secenek, deger }) => ({ secenek, deger })),
          stok_kodu: bilgi.stokKodu,
          adet: satir.adet,
          birim_tutari: satir.birimTutari,
          tutar: satir.tutar,
          vergisiz: satir.vergi?.vergisiz ?? satir.tutar,
          vergi: satir.vergi?.vergi ?? 0,
          vergi_oranlari: satir.vergi?.oranlar ?? [],
        };
      }),
    );

    try {
      await stok.stokDus(
        islem,
        kim,
        satilanlar.map(({ birim, adet }) => ({ birim, adet })),
        { sebep: "siparis", kaynak: yazilan.kimlik, oturum: oturum.kimlik },
      );
    } catch (hata) {
      if (hata instanceof BilinenHata && hata.kod === "cakisma") {
        throw new BilinenHata(
          "cakisma",
          (Array.isArray(hata.ayrinti) ? (hata.ayrinti as object[]) : []).map((sorun) => ({
            ...sorun,
            kod: "stok-ayrildi",
          })),
        );
      }
      throw hata;
    }
    // Oturumun ayırması siparişe geçti.
    await stok.ayirmayiBirak(islem, oturum.kimlik);
    await gecmiseYaz(islem, {
      siparis: yazilan.kimlik,
      onceki: null,
      sonraki: durum,
      neden: girdi.panel === undefined ? "olusturuldu" : "panelden-olusturuldu",
      kim,
    });
    if (girdi.panel !== undefined) {
      await degisikligiKaydet(islem, {
        kim,
        islem: "siparis.panelden-olusturuldu",
        kayit: { tur: "siparis", kimlik: yazilan.kimlik },
        eski: null,
        yeni: {
          numara,
          durum,
          toplam: hesap.toplam,
          odemeYontemi: odeme.yontem,
          uye: oturum.musteri !== null,
          metinlerIletildi: true,
        },
      });
    }
    return { kimlik: yazilan.kimlik, numara, erisimAnahtari };
  };

  // Havale bildirimi. Sahip: üye olmayan müşteride siparişteki e-posta, üyede hesabı. Hesap mağazanın bugünkü banka
  // hesaplarından biri olmalı; tutar sitenin biçimiyle okunur, ödeme günü sitenin takviminde ve en geç yarındır.
  const havaleBildir = async (
    vt: Veritabani,
    sahip: { tur: "eposta"; eposta: string } | { tur: "musteri"; musteri: string },
    girdi: HavaleBildirimiFormu,
  ): Promise<{ numara: string }> => {
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    const bicim = siteninBicimleyicisi(site.ayarlar);
    const hatalar: { alan: string; kod: string }[] = [];
    const tutar = bicim.paraOku(girdi.tutar);
    if (tutar === undefined || tutar <= 0) hatalar.push({ alan: "tutar", kod: "tutar-okunamadi" });
    const gun = yerelZamandan(`${girdi.odemeTarihi}T12:00`, site.ayarlar.saatDilimi);
    if (gun === undefined || gun.getTime() > Date.now() + 36 * 60 * 60 * 1000) {
      hatalar.push({ alan: "odemeTarihi", kod: "tarih-gecersiz" });
    }
    const hesap = ayarlar.bankaHesaplari.find((h) => h.kimlik === girdi.hesap);
    if (hesap === undefined) hatalar.push({ alan: "hesap", kod: "hesap-yok" });
    if (hatalar.length > 0 || tutar === undefined || hesap === undefined || gun === undefined) {
      throw new BilinenHata("dogrulama", hatalar);
    }

    return vt.transaction(async (islem) => {
      const [siparis] = await islem
        .select({
          kimlik: siparisler.kimlik,
          numara: siparisler.numara,
          durum: siparisler.durum,
          yontem: siparisler.odeme_yontemi,
          musteri: siparisler.musteri_kimligi,
          eposta: siparisler.eposta,
          olusturma: siparisler.olusturma_zamani,
        })
        .from(siparisler)
        .where(eq(siparisler.numara, girdi.numara))
        .for("update");
      const sahibi =
        siparis !== undefined &&
        (sahip.tur === "musteri"
          ? siparis.musteri === sahip.musteri
          : siparis.eposta.toLowerCase() === sahip.eposta.toLowerCase());
      if (siparis === undefined || !sahibi) throw new BilinenHata("bulunamadi");
      if (siparis.yontem !== "havale" || siparis.durum !== "odeme-bekleniyor") {
        throw new BilinenHata("is-kurali", [{ alan: "numara", kod: "havale-beklemiyor" }]);
      }
      // Ödeme günü siparişten önce olamaz (saat dilimi farkı için bir buçuk gün pay).
      if (gun.getTime() < siparis.olusturma.getTime() - 36 * 60 * 60 * 1000) {
        throw new BilinenHata("dogrulama", [{ alan: "odemeTarihi", kod: "tarih-gecersiz" }]);
      }
      // Sipariş başına bildirim sınırı: kilit altında sayılır.
      const [sayi] = await islem
        .select({ adet: sql<number>`count(*)::int` })
        .from(havaleBildirimleri)
        .where(eq(havaleBildirimleri.siparis_kimligi, siparis.kimlik));
      if ((sayi?.adet ?? 0) >= havaleBildirimiSinirlari.siparisBasinaEnCok) {
        throw new BilinenHata("is-kurali", [{ alan: "numara", kod: "bildirim-siniri" }]);
      }
      await islem.insert(havaleBildirimleri).values({
        siparis_kimligi: siparis.kimlik,
        gonderen: girdi.gonderen,
        banka: hesap.banka,
        iban: hesap.iban,
        tutar,
        odeme_tarihi: girdi.odemeTarihi,
        not: girdi.not ?? null,
      });
      await gecmiseYaz(islem, {
        siparis: siparis.kimlik,
        onceki: "odeme-bekleniyor",
        sonraki: "odeme-bekleniyor",
        neden: "havale-bildirildi",
        kim:
          sahip.tur === "musteri" ? { tur: "musteri", kimlik: sahip.musteri } : uyeOlmayanMusteri,
      });
      return { numara: siparis.numara };
    });
  };

  // Erişim anahtarıyla sipariş ve kalemleri (sipariş alındı sayfası). Anahtar yoksa ya da tutmazsa null.
  const erisimleOku = async (
    vt: Veritabani,
    anahtar: string | undefined,
  ): Promise<{ siparis: Siparis; kalemler: SiparisKalemi[] } | null> => {
    if (anahtar === undefined || !/^[A-Za-z0-9_-]{20,100}$/.test(anahtar)) return null;
    const [siparis] = await vt
      .select()
      .from(siparisler)
      .where(eq(siparisler.erisim_ozeti, erisimOzeti(anahtar)))
      .limit(1);
    if (siparis === undefined) return null;
    const kalemler = await vt
      .select()
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik))
      .orderBy(asc(siparisKalemleri.sira));
    return { siparis, kalemler };
  };

  // Giriş yapmış müşterinin en son siparişinin teslimat bilgisi (ödeme adımında öneri). Siparişi yoksa null.
  const sonTeslimat = async (vt: Veritabani, musteri: string): Promise<Teslimat | null> => {
    const [son] = await vt
      .select({ teslimat: siparisler.teslimat })
      .from(siparisler)
      // Kişisel bilgisi silinmiş sipariş öneri vermez (kart 0234, bağımsız kontrolün bulgusu).
      .where(
        and(
          eq(siparisler.musteri_kimligi, musteri),
          isNull(siparisler.kisisel_veri_silinme_zamani),
        ),
      )
      .orderBy(desc(siparisler.olusturma_zamani), desc(siparisler.kimlik))
      .limit(1);
    return son?.teslimat ?? null;
  };

  return {
    siparisiKur,
    // Arka plan süreci iptali doğrudan iptal.ts'ten çağırır; servis testleri buradan.
    havaleIptalTaramasi,
    havaleBildir,
    erisimleOku,
    sonTeslimat,
    numaraAl,
  };
};
