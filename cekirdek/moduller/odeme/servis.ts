// Ödeme adımı (kart 0213, karar 0140). Müşteri "Siparişi onayla"ya basınca ödeme oturumu açılır ve sepetin
// birimleri stok ayırma süresi kadar ayrılır. Sipariş kart 0214'te oturumdan kurulur.
//
// Kurallar:
// - Tutar yalnız sunucunun hesabıdır (sepetiHesapla, karar 0135): tarayıcıdan yalnız kalemler gelir. Vergi teslimat ve
//   fatura adresinin bölgesiyle hesaplanır, hangisinin kullanılacağı vergiAdresi ayarıdır (karar 0061).
// - Sepet ödemeye geçilemez durumdaysa (satılamayan satır, alım adedi) ya da müşterinin görmediği bir değişiklik
//   varsa (fiyat, stok, adet sınırı) oturum açılmaz: "sepet-degisti", müşteri güncel özeti görüp yeniden onaylar.
// - Üye olmadan alışveriş kapalıysa üye olmayan müşteri "oturum-yok" alır (ekran girişe yönlendirir). Telefonun
//   zorunluluğu ayardır. Teslimat adresi sitenin teslimat ülkelerinden birinde olmalıdır.
// - Üye olmayan müşteri isterse hesap açar: müşteri kaydıyla aynı işlev (karar 0051), oturumla aynı işlemde. Kayıtlı
//   e-posta "cakisma" alır.
// - Onaylar oturuma metin sürümüyle yazılır. Pazarlama izni yalnız işaretlenince verilir: üye müşteride hesabın
//   onaylarına da yeni satır olarak yazılır (işaretsiz bırakmak var olan izni geri almaz), hesap açan müşteride kayıtla
//   birlikte yazılır, üye olmayanda yalnız oturumdadır.
// - Stok ayırması oturumla aynı işlemdedir: ayrılamayan birim "stok-ayrildi" ile döner, oturum da yazılmaz.
// - Müşterinin bir önceki oturumu (yeniden basınca) aynı işlemde silinir, ayırmaları serbest kalır; yalnız aynı
//   müşterinin (üye olmayanda yine üye olmayanın) oturumu silinir.
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { musteriOnayTurleri, siparisOnayTurleri } from "../../kayitlar/musteri-onaylari.ts";
import { odemeOturumuSaklamaSaat } from "../../kayitlar/odeme.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { musteriOnaylari } from "../musteri/model.ts";
import { musteriHesabi, musteriHesabiAc } from "../musteri/servis.ts";
import type { Anahtarlar } from "../oturum/servis.ts";
import { sepetiHesapla } from "../sepet/hesap.ts";
import type { SepetKalemi } from "../sepet/semalar.ts";
import { stokServisi } from "../stok/servis.ts";
import { type OturumOnayi, odemeOturumlari } from "./model.ts";
import type { MisafirOdemeFormu, OdemeBilgileri } from "./semalar.ts";

export type OdemeyiYapan =
  | { tur: "uye"; musteri: string }
  | { tur: "misafir"; eposta: string; hesap: MisafirOdemeFormu["hesap"] };

export type OdemeGirdisi = {
  kim: OdemeyiYapan;
  bilgiler: OdemeBilgileri;
  kalemler: SepetKalemi[];
  onceki?: string | undefined;
};

export type OdemeSonucu = {
  oturum: string;
  bitis: Date;
  // Ödemede hesap açıldıysa yeni oturumun anahtarları (uç çerez olarak yazar).
  anahtarlar?: Anahtarlar;
};

const stok = stokServisi();

const dogrulama = (alan: string, kod: string) => new BilinenHata("dogrulama", [{ alan, kod }]);

// Verginin bölgesi: posta adresinin ülkesi, ili ve posta kodu.
const bolge = (adres: {
  ulke: string;
  il?: string | undefined;
  postaKodu?: string | undefined;
}) => ({
  ulke: adres.ulke,
  ...(adres.il === undefined ? {} : { il: adres.il }),
  ...(adres.postaKodu === undefined ? {} : { postaKodu: adres.postaKodu }),
});

// "Aynı" işaretliyse faturanın adresi teslimat adresidir.
export const faturaAdresi = (bilgiler: OdemeBilgileri) =>
  bilgiler.fatura.adres ?? bilgiler.teslimat.adres;

export const odemeServisi = (site: Site) => {
  const oturumAc = async (
    vt: Veritabani,
    girdi: OdemeGirdisi,
    oturumSuresiSaniye: number,
  ): Promise<OdemeSonucu> => {
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    if (girdi.kim.tur === "misafir" && !ayarlar.uyeOlmadanAlisveris) {
      throw new BilinenHata("oturum-yok");
    }
    const { teslimat } = girdi.bilgiler;
    if (ayarlar.telefonZorunlu && teslimat.telefon === undefined) {
      throw dogrulama("bilgiler.teslimat.telefon", "telefon-gerekli");
    }
    if (!site.ayarlar.teslimatUlkeleri.includes(teslimat.adres.ulke)) {
      throw dogrulama("bilgiler.teslimat.adres.ulke", "ulke-teslimat-disi");
    }

    const hesap = await sepetiHesapla(vt, site, girdi.kalemler, {
      adresler: { teslimat: bolge(teslimat.adres), fatura: bolge(faturaAdresi(girdi.bilgiler)) },
    });
    const satilanlar = hesap.satirlar.filter((satir) => satir.satilabilir);
    if (satilanlar.length === 0) {
      throw new BilinenHata("is-kurali", [{ alan: "kalemler", kod: "sepet-bos" }]);
    }
    // Müşterinin görmediği her değişiklik (adet sınıra inmiş, fiyat değişmiş) onayı durdurur.
    if (!hesap.odemeyeGecilebilir || hesap.satirlar.some((satir) => satir.uyarilar.length > 0)) {
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

      const onaylar: OturumOnayi[] = [
        {
          tur: "on-bilgilendirme",
          verildi: girdi.bilgiler.onBilgilendirmeOnayi,
          metinSurumu: siparisOnayTurleri["on-bilgilendirme"].metinSurumu,
        },
        {
          tur: "mesafeli-satis",
          verildi: girdi.bilgiler.mesafeliSatisOnayi,
          metinSurumu: siparisOnayTurleri["mesafeli-satis"].metinSurumu,
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
        })
        .returning({ kimlik: odemeOturumlari.kimlik });
      if (yazilan === undefined) throw new Error("Ödeme oturumu yazılamadı.");

      try {
        await stok.stokAyir(islem, yazilan.kimlik, kalemler, bitis);
      } catch (hata) {
        if (hata instanceof BilinenHata && hata.kod === "cakisma") {
          throw new BilinenHata(
            "cakisma",
            (hata.ayrinti ?? []).map((sorun) => ({ ...sorun, kod: "stok-ayrildi" })),
          );
        }
        throw hata;
      }
      return {
        oturum: yazilan.kimlik,
        bitis,
        ...(anahtarlar === undefined ? {} : { anahtarlar }),
      };
    });
  };

  // Müşterinin bir önceki oturumu: yalnız aynı sahibin oturumu silinir, ayırmaları onunla gider. Başkasının oturumu
  // ya da olmayan oturum sessizce atlanır (oturumun var olup olmadığı belli olmaz).
  const oncekiniSil = async (
    islem: VeritabaniIslemi,
    onceki: string,
    musteri: string | undefined,
  ): Promise<void> => {
    await islem
      .delete(odemeOturumlari)
      .where(
        and(
          eq(odemeOturumlari.kimlik, onceki),
          musteri === undefined
            ? isNull(odemeOturumlari.musteri_kimligi)
            : eq(odemeOturumlari.musteri_kimligi, musteri),
        ),
      );
  };

  // Ödeme başarısız olunca (kartla ödeme, kart 0215) oturumun ayırmaları serbest kalır.
  const ayirmayiBirak = (vt: Veritabani, oturum: string) =>
    vt.transaction((islem) => stok.ayirmayiBirak(islem, oturum));

  return { oturumAc, ayirmayiBirak };
};

// Süresi dolup saklama süresini de geçen oturumlar silinir (kişisel veri taşır); ayırmaları onunla gider. Siparişe
// dönen oturumun kuralı kart 0214'tedir.
export const eskiOdemeOturumlariniSil = async (vt: Veritabani): Promise<number> => {
  const silinen = await vt
    .delete(odemeOturumlari)
    .where(
      lte(
        odemeOturumlari.bitis_zamani,
        sql`now() - make_interval(hours => ${odemeOturumuSaklamaSaat})`,
      ),
    )
    .returning({ kimlik: odemeOturumlari.kimlik });
  return silinen.length;
};
