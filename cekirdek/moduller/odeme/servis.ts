// Ödeme adımı (kart 0213, karar 0140). Müşteri "Siparişi onayla"ya basınca ödeme oturumu açılır ve sepetin
// birimleri stok ayırma süresi kadar ayrılır. Havale ve kapıda ödemede sipariş aynı işlemde oturumdan kurulur
// (kart 0214, karar 0141): dışarıda ödeme adımı yoktur. Kartla ödeme (kart 0215) siparişi bankadan dönüşte kurar.
//
// Kurallar:
// - Tutar yalnız sunucunun hesabıdır (sepetiHesapla, karar 0135): tarayıcıdan yalnız kalemler gelir. Vergi teslimat ve
//   fatura adresinin bölgesiyle hesaplanır, hangisinin kullanılacağı vergiAdresi ayarıdır (karar 0061).
// - Sepet ödemeye geçilemez durumdaysa (satılamayan satır, alım adedi) ya da müşterinin görmediği bir değişiklik
//   varsa (fiyat, stok, adet sınırı, özette gördüğü toplam bugünkü toplamdan farklı) oturum açılmaz: "sepet-degisti",
//   müşteri güncel özeti görüp yeniden onaylar. Görülen toplam yalnız karşılaştırılır, tutar olarak kullanılmaz.
// - Üye olmadan alışveriş kapalıysa üye olmayan müşteri "oturum-yok" alır (ekran girişe yönlendirir). Telefonun
//   zorunluluğu ayardır. Teslimat adresi sitenin teslimat ülkelerinden birinde olmalıdır.
// - Üye olmayan müşteri isterse hesap açar: müşteri kaydıyla aynı işlev (karar 0051), oturumla aynı işlemde. Kayıtlı
//   e-posta "cakisma" alır.
// - Onaylar oturuma metin sürümüyle yazılır. Pazarlama izni yalnız işaretlenince verilir: üye müşteride hesabın
//   onaylarına da yeni satır olarak yazılır (işaretsiz bırakmak var olan izni geri almaz), hesap açan müşteride kayıtla
//   birlikte yazılır, üye olmayanda yalnız oturumdadır.
// - Ödeme yöntemi sitede kullanılabilir olmalıdır (açık, havalede banka hesabı var, kapıda ödemede seçenek açık,
//   eklentili yöntemde eklenti açık ve hazır): değilse "yontem-kapali" (cekirdek/moduller/odeme/yontemler.ts).
// - Eklentiyle gelen yöntemde (kart, kart 0215) "Siparişi onayla" (onayla) oturumu ve ayırmayı yazar, siparişi kurmaz:
//   eklentinin ödemesini başlatır (bağlantı noktası cekirdek/eklentiler/odeme-yontemleri.ts) ve müşterinin gideceği
//   adresi döner. Başlatılamazsa ayırma bırakılır, "yontem-ulasilamadi" döner. Sipariş, ödeme doğrulanınca
//   eklentili ödemenin siparişiyle (eklentiliSiparisiKur) aynı siparisiKur'dan kurulur.
// - Stok ayırması oturumla aynı işlemdedir: ayrılamayan birim "stok-ayrildi" ile döner, oturum da yazılmaz.
// - Müşterinin bir önceki oturumu (yeniden basınca) aynı işlemde silinir, ayırmaları serbest kalır. Üye olmayan yalnız
//   üye olmayanın oturumunu, üye kendi oturumunu ve aynı sekmede üye olmadan açtığı oturumu (giriş yapıp yeniden
//   onaylayınca) siler; başka üyenin oturumu silinmez. Oturumun kimliği yalnız onu açan sekmeye döner.
import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { eklentiliMi, eklentiliOdemeyiBaslat } from "../../eklentiler/odeme-yontemleri.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { musteriOnayTurleri, siparisOnayTurleri } from "../../kayitlar/musteri-onaylari.ts";
import { odemeBaslatilamadi } from "../../kayitlar/odeme.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { musteriOnaylari } from "../musteri/model.ts";
import { musteriHesabi, musteriHesabiAc } from "../musteri/servis.ts";
import type { Anahtarlar } from "../oturum/servis.ts";
import { sepetiHesapla } from "../sepet/hesap.ts";
import type { SepetKalemi } from "../sepet/semalar.ts";
import { siparisler } from "../siparis/model.ts";
import type { ElleSiparisGirdisi } from "../siparis/semalar.ts";
import { siparisServisi } from "../siparis/servis.ts";
import { stokServisi } from "../stok/servis.ts";
import { type OturumOnayi, odemeOturumlari } from "./model.ts";
import { bolge, faturaAdresi } from "./oturum-hesabi.ts";
import type { MisafirOdemeFormu, OdemeBilgileri, OdemeYontemiSecimi } from "./semalar.ts";
import { yontemKullanilabilirMi } from "./yontemler.ts";

export type OdemeyiYapan =
  | { tur: "uye"; musteri: string }
  | { tur: "misafir"; eposta: string; hesap: MisafirOdemeFormu["hesap"] };

export type OdemeGirdisi = {
  kim: OdemeyiYapan;
  bilgiler: OdemeBilgileri;
  kalemler: SepetKalemi[];
  onceki?: string | undefined;
  // Müşterinin özette gördüğü toplam (kuruş): yalnız karşılaştırılır, tutar olarak kullanılmaz.
  gorulenToplam?: number | undefined;
  // Müşterinin adresi: eklentili yöntemde ödeme kuruluşuna gider (sahtecilik denetimi).
  ip?: string | undefined;
};

// Siparişin ödeme seçimi: müşterinin seçtiği yöntem ya da panelden "elden" (kart 0236).
export type SiparisinOdemesi = OdemeYontemiSecimi | { yontem: "elden" };

// Oturum açmanın iç girdisi: panelin elle siparişi "elden" yöntemini de verir.
type IcGirdi = Omit<OdemeGirdisi, "bilgiler"> & {
  bilgiler: Omit<OdemeBilgileri, "odemeYontemi"> & { odemeYontemi: SiparisinOdemesi };
};

// Panelden elle sipariş (kart 0236): siparişi giren yönetici.
type Panelden = { yonetici: string };

export type OdemeSonucu = {
  oturum: string;
  bitis: Date;
  // Ödemede hesap açıldıysa yeni oturumun anahtarları (uç çerez olarak yazar).
  anahtarlar?: Anahtarlar;
};

// "Siparişi onayla"nın sonucu: oturum ve kurulan sipariş (numara ve siparişi veren tarayıcının erişim anahtarı; uç
// çerez olarak yazar).
export type SiparisSonucu = OdemeSonucu & { siparis: { numara: string; erisimAnahtari: string } };

// "Siparişi onayla"nın sonucu: havale ve kapıda ödemede sipariş, eklentili yöntemde müşterinin gideceği adres.
export type OnaySonucu =
  | (SiparisSonucu & { tur: "siparis" })
  | (OdemeSonucu & { tur: "yonlendir"; adres: string });

const stok = stokServisi();

const dogrulama = (alan: string, kod: string) => new BilinenHata("dogrulama", [{ alan, kod }]);

export { faturaAdresi };

export const odemeServisi = (site: Site) => {
  // Oturum ve ayırma; siparisKur verilirse aynı işlemde sipariş de kurulur (havale ve kapıda ödeme, kart 0214).
  const oturumuAc = async (
    vt: Veritabani,
    girdi: IcGirdi,
    oturumSuresiSaniye: number,
    siparisKur: boolean,
    disarida = false,
    panel?: Panelden,
  ): Promise<
    OdemeSonucu & {
      siparis?: SiparisSonucu["siparis"];
      hesap: Awaited<ReturnType<typeof sepetiHesapla>>;
      eposta: string;
      musteri: string | null;
    }
  > => {
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    // Ayar vitrini bağlar: panelden üye olmayan müşterinin siparişi her zaman girilir (kullanıcı kararı, kart 0236).
    if (panel === undefined && girdi.kim.tur === "misafir" && !ayarlar.uyeOlmadanAlisveris) {
      throw new BilinenHata("oturum-yok");
    }
    const { teslimat } = girdi.bilgiler;
    if (ayarlar.telefonZorunlu && teslimat.telefon === undefined) {
      throw dogrulama("bilgiler.teslimat.telefon", "telefon-gerekli");
    }
    if (!site.ayarlar.teslimatUlkeleri.includes(teslimat.adres.ulke)) {
      throw dogrulama("bilgiler.teslimat.adres.ulke", "ulke-teslimat-disi");
    }
    const odeme = girdi.bilgiler.odemeYontemi;
    if (
      odeme.yontem === "elden" ? panel === undefined : !yontemKullanilabilirMi(site, ayarlar, odeme)
    ) {
      throw new BilinenHata("is-kurali", [{ alan: "bilgiler.odemeYontemi", kod: "yontem-kapali" }]);
    }

    const hesap = await sepetiHesapla(vt, site, girdi.kalemler, {
      adresler: { teslimat: bolge(teslimat.adres), fatura: bolge(faturaAdresi(girdi.bilgiler)) },
    });
    const satilanlar = hesap.satirlar.filter((satir) => satir.satilabilir);
    if (satilanlar.length === 0) {
      throw new BilinenHata("is-kurali", [{ alan: "kalemler", kod: "sepet-bos" }]);
    }
    // Müşterinin görmediği her değişiklik (adet sınıra inmiş, fiyat değişmiş) onayı durdurur.
    if (
      !hesap.odemeyeGecilebilir ||
      hesap.satirlar.some((satir) => satir.uyarilar.length > 0) ||
      (girdi.gorulenToplam !== undefined && girdi.gorulenToplam !== hesap.toplam)
    ) {
      throw new BilinenHata("is-kurali", [{ alan: "kalemler", kod: "sepet-degisti" }]);
    }

    return vt.transaction(async (islem) => {
      const sahip = girdi.kim.tur === "uye" ? girdi.kim.musteri : undefined;
      if (girdi.onceki !== undefined) await oncekiniSil(islem, girdi.onceki, sahip);

      let musteri = sahip;
      let eposta: string;
      let anahtarlar: Anahtarlar | undefined;
      if (girdi.kim.tur === "uye") {
        const hesabi = await musteriHesabi(islem, girdi.kim.musteri);
        if (hesabi === null) throw new BilinenHata("oturum-yok");
        eposta = hesabi.eposta;
        if (girdi.bilgiler.pazarlamaIzni) {
          await islem.insert(musteriOnaylari).values({
            musteri_kimligi: girdi.kim.musteri,
            tur: "pazarlama",
            verildi: true,
            metin_surumu: musteriOnayTurleri.pazarlama.metinSurumu,
          });
        }
      } else {
        eposta = girdi.kim.eposta;
        if (girdi.kim.hesap.ac) {
          const { sifre, uyelikOnayi, kvkkOnayi } = girdi.kim.hesap;
          const acilan = await musteriHesabiAc(
            islem,
            { eposta, sifre, uyelikOnayi, kvkkOnayi, pazarlamaIzni: girdi.bilgiler.pazarlamaIzni },
            oturumSuresiSaniye,
          );
          anahtarlar = acilan.anahtarlar;
          musteri = acilan.musteri;
        }
      }

      // Panelden: metinlerin iletildiği yöneticinin beyanıdır (kullanıcı kararı, karar 0148).
      const beyan = panel === undefined ? {} : { beyan: panel.yonetici };
      const onaylar: OturumOnayi[] = [
        {
          tur: "on-bilgilendirme",
          verildi: girdi.bilgiler.onBilgilendirmeOnayi,
          metinSurumu: siparisOnayTurleri["on-bilgilendirme"].metinSurumu,
          ...beyan,
        },
        {
          tur: "mesafeli-satis",
          verildi: girdi.bilgiler.mesafeliSatisOnayi,
          metinSurumu: siparisOnayTurleri["mesafeli-satis"].metinSurumu,
          ...beyan,
        },
        {
          tur: "pazarlama",
          verildi: girdi.bilgiler.pazarlamaIzni,
          metinSurumu: musteriOnayTurleri.pazarlama.metinSurumu,
        },
      ];
      // Süre veritabanının saatiyle: ayırmanın süresi dolmuş mu sorusu da onun saatiyle sorulur.
      const sure = await islem.execute<{ bitis: string }>(
        sql`select (now() + make_interval(mins => ${ayarlar.stokAyirmaSuresi})) as bitis`,
      );
      const bitis = new Date(String(sure.rows[0]?.bitis));
      const kalemler = satilanlar.map(({ birim, adet }) => ({ birim, adet }));
      const [yazilan] = await islem
        .insert(odemeOturumlari)
        .values({
          musteri_kimligi: musteri ?? null,
          eposta,
          teslimat: girdi.bilgiler.teslimat,
          fatura: girdi.bilgiler.fatura,
          not: girdi.bilgiler.not ?? null,
          kalemler,
          toplam: hesap.toplam,
          para_birimi: hesap.paraBirimi,
          onaylar,
          bitis_zamani: bitis,
          odeme_disarida: disarida,
        })
        .returning({ kimlik: odemeOturumlari.kimlik });
      if (yazilan === undefined) throw new Error("Ödeme oturumu yazılamadı.");

      try {
        await stok.stokAyir(islem, yazilan.kimlik, kalemler, bitis);
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
      const sonuc = {
        oturum: yazilan.kimlik,
        bitis,
        ...(anahtarlar === undefined ? {} : { anahtarlar }),
        hesap,
        eposta,
        musteri: musteri ?? null,
      };
      if (!siparisKur) return sonuc;
      const siparis = await siparisServisi(site).siparisiKur(islem, {
        oturum: {
          kimlik: yazilan.kimlik,
          musteri: musteri ?? null,
          eposta,
          teslimat: girdi.bilgiler.teslimat,
          fatura: girdi.bilgiler.fatura,
          not: girdi.bilgiler.not ?? null,
          onaylar,
        },
        hesap,
        odeme,
        havaleIptalSuresi: ayarlar.havaleIptalSuresi,
        ...(panel === undefined ? {} : { panel }),
      });
      return {
        ...sonuc,
        siparis: { numara: siparis.numara, erisimAnahtari: siparis.erisimAnahtari },
      };
    });
  };

  // Yalnız oturum ve ayırma (kartla ödeme, kart 0215: sipariş bankadan dönüşte kurulur).
  const odemeOturumuAc = async (
    vt: Veritabani,
    girdi: OdemeGirdisi,
    oturumSuresiSaniye: number,
  ): Promise<OdemeSonucu> => {
    const {
      siparis: _yok,
      hesap: _h,
      eposta: _e,
      musteri: _m,
      ...sonuc
    } = await oturumuAc(vt, girdi, oturumSuresiSaniye, false);
    return sonuc;
  };

  // "Siparişi onayla" (havale ve kapıda ödeme, kart 0214): oturum, ayırma ve sipariş tek işlemde.
  const siparisVer = async (
    vt: Veritabani,
    girdi: OdemeGirdisi,
    oturumSuresiSaniye: number,
  ): Promise<SiparisSonucu> => {
    const {
      hesap: _h,
      eposta: _e,
      musteri: _m,
      ...sonuc
    } = await oturumuAc(vt, girdi, oturumSuresiSaniye, true);
    if (sonuc.siparis === undefined) throw new Error("Sipariş kurulmadı.");
    return { ...sonuc, siparis: sonuc.siparis };
  };

  // Panelden elle sipariş (kart 0236, karar 0148): vitrin siparişiyle aynı yoldan (oturum, ayırma ve sipariş tek
  // işlemde, tutar sunucunun hesabı). Ayrımlar: üye olmadan alışveriş ayarı bağlamaz; "elden" yöntemi vardır; onaylar
  // yöneticinin beyanıdır, pazarlama izni verilmez; geçmişe ve değişiklik kaydına siparişi giren yönetici yazılır.
  // Üye seçildiyse e-posta hesabındandır.
  const elleSiparisVer = async (
    vt: Veritabani,
    yonetici: string,
    girdi: ElleSiparisGirdisi,
  ): Promise<{ numara: string }> => {
    const { siparis } = await oturumuAc(
      vt,
      {
        kim:
          girdi.musteri.tur === "uye"
            ? { tur: "uye", musteri: girdi.musteri.kimlik }
            : { tur: "misafir", eposta: girdi.musteri.eposta, hesap: { ac: false } },
        bilgiler: {
          odemeYontemi: girdi.bilgiler.odemeYontemi,
          teslimat: girdi.bilgiler.teslimat,
          fatura: girdi.bilgiler.fatura,
          not: girdi.bilgiler.not,
          onBilgilendirmeOnayi: true,
          mesafeliSatisOnayi: true,
          pazarlamaIzni: false,
        },
        kalemler: girdi.kalemler,
        gorulenToplam: girdi.gorulenToplam,
      },
      0,
      true,
      false,
      { yonetici },
    );
    if (siparis === undefined) throw new Error("Sipariş kurulmadı.");
    return { numara: siparis.numara };
  };

  // "Siparişi onayla" (uçların çağırdığı): havale ve kapıda ödemede siparisVer, eklentili yöntemde oturum ve ayırmadan
  // sonra eklentinin ödemesi başlatılır. Ödeme kuruluşuna gidilen çağrı veritabanı işleminin dışındadır.
  const onayla = async (
    vt: Veritabani,
    girdi: OdemeGirdisi,
    oturumSuresiSaniye: number,
  ): Promise<OnaySonucu> => {
    const yontem = girdi.bilgiler.odemeYontemi.yontem;
    if (!eklentiliMi(yontem)) {
      return { tur: "siparis", ...(await siparisVer(vt, girdi, oturumSuresiSaniye)) };
    }
    const {
      siparis: _yok,
      hesap,
      eposta,
      musteri,
      ...sonuc
    } = await oturumuAc(vt, girdi, oturumSuresiSaniye, false, true);
    try {
      const { adres } = await eklentiliOdemeyiBaslat(vt, site, yontem, {
        oturum: sonuc.oturum,
        eposta,
        musteri,
        teslimat: girdi.bilgiler.teslimat,
        fatura: girdi.bilgiler.fatura,
        hesap,
        ip: girdi.ip,
      });
      return { tur: "yonlendir", ...sonuc, adres };
    } catch (hata) {
      // Ödeme başlamadı: ayrılan stok başka müşteriye kalır. Oturum süresi dolunca temizlenir.
      await ayirmayiBirak(vt, sonuc.oturum);
      if (hata instanceof BilinenHata) throw hata;
      hatayiKaydet(hata, { islem: "eklentili-odeme-baslat", yontem });
      throw new BilinenHata("is-kurali", [
        { alan: "bilgiler.odemeYontemi", kod: odemeBaslatilamadi },
      ]);
    }
  };

  // Müşterinin bir önceki oturumu: üye olmayanınki ya da üyenin kendisininki silinir, ayırmaları onunla gider.
  // Başka üyenin oturumu ya da olmayan oturum sessizce atlanır (oturumun var olup olmadığı belli olmaz).
  const oncekiniSil = async (
    islem: VeritabaniIslemi,
    onceki: string,
    musteri: string | undefined,
  ): Promise<void> => {
    const sahibi = and(
      eq(odemeOturumlari.kimlik, onceki),
      // Siparişe dönmüş oturum silinmez (kart 0214): sipariş ona bağlıdır, ayırması zaten siparişe geçti.
      sql`not exists (select 1 from ${siparisler} where ${siparisler.oturum_kimligi} = ${odemeOturumlari.kimlik})`,
      musteri === undefined
        ? isNull(odemeOturumlari.musteri_kimligi)
        : or(isNull(odemeOturumlari.musteri_kimligi), eq(odemeOturumlari.musteri_kimligi, musteri)),
    );
    // Ödemesi dışarıda başlamış oturum silinmez (kart 0215, bağımsız kontrolün bulgusu): ödeme sonradan başarılı
    // olabilir, kaydı kalmalı. Yalnız ayırması bırakılır; sipariş kurulurken stok yetmezse ödeme iptal edilir.
    const [disarida] = await islem
      .select({ kimlik: odemeOturumlari.kimlik })
      .from(odemeOturumlari)
      .where(and(sahibi, eq(odemeOturumlari.odeme_disarida, true)));
    if (disarida !== undefined) {
      await stok.ayirmayiBirak(islem, disarida.kimlik);
      return;
    }
    await islem.delete(odemeOturumlari).where(sahibi);
  };

  // Ödeme başarısız olunca (kartla ödeme, kart 0215) oturumun ayırmaları serbest kalır.
  const ayirmayiBirak = (vt: Veritabani, oturum: string) =>
    vt.transaction((islem) => stok.ayirmayiBirak(islem, oturum));

  return { odemeOturumuAc, siparisVer, elleSiparisVer, onayla, ayirmayiBirak };
};
