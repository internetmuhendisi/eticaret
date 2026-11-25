// Siparişin teslimat ve fatura bilgilerinin panelden düzeltilmesi (kart 0269, karar 0180). Müşteri yanlış adres ya da
// yanlış fatura bilgisi yazınca mağaza kargodan önce düzeltir.
//
// Kurallar:
// - Yalnız kargoya verilene kadar (adresDuzeltilebilirDurumlar). Siparişin satırı kilitlenir; ekranın gördüğü durum
//   ve bilgiler (surum, adresSurumu) bugünkünden farklıysa "cakisma", hiçbir şey yazılmaz.
// - Kişisel bilgisi silinmiş siparişte düzeltme yoktur (is-kurali, kisisel-veri-silindi).
// - Teslimat ödeme adımının kurallarıyla: şema (il ve ilçe tutarlı, telefon biçimi, vergi numarası) uçta, telefonun
//   zorunluluğu ve teslimat ülkesi burada (teslimatKuraliHatasi), yalnız teslimat değişince.
// - Vergi: düzeltme verginin bölgesini (vergiAdresi ayarının adresi; tabloda yoksa mağaza adresi) değiştiriyor ve
//   sitenin oranları iki bölgede aynı değilse reddedilir (vergi-bolgesi-degisir): siparişin tutarı ve vergisi
//   değişmez, yanlış siparişi iptal edip yenisini girmek gerekir. Vergi kapalı verilmiş (gosterim "yok") ya da vergi
//   dökümü boş siparişte bölge önemsizdir. Oranlar sitenin bugünkü tablosundan okunur.
// - Aynı bilgiler yeniden yazılmaz; geçmişe, kayda ve e-postaya girmez.
// - Geçmişe "adres-duzeltildi" (durum değişmez) yazılır; önceki ve yeni bilgiler siparis_adres_duzeltmeleri'ne (kişisel
//   veri temizliği siler). Değişiklik kaydına yalnız değişen alanların adları ve il, ilçe kodları girer.
// - Müşteriye "Sipariş bilgileriniz güncellendi" e-postası panelin kutusuyla (gecmiseYaz, satırın kimliğiyle).
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { adresDuzeltilebilirDurumlar, type SiparisDurumu } from "../../kayitlar/siparis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import type { Fatura, Teslimat } from "../odeme/semalar.ts";
import { teslimatKuraliHatasi } from "../odeme/teslimat-kurallari.ts";
import { bolgelerinOranlariAyniMi, type VergiBolgesi, vergiBolgesiniSec } from "../vergi/hesap.ts";
import { siteninVergiServisi } from "../vergi/servis.ts";
import { gecmiseYaz } from "./gecmis.ts";
import { siparisAdresDuzeltmeleri, siparisler } from "./model.ts";
import type { SiparisAdresiGirdisi } from "./semalar.ts";

// Anahtarları sıralı JSON: aynı değerin yazılışı veritabanından nasıl okunursa okunsun aynıdır.
const sirali = (deger: unknown): unknown =>
  Array.isArray(deger)
    ? deger.map(sirali)
    : deger !== null && typeof deger === "object"
      ? Object.fromEntries(
          Object.entries(deger as Record<string, unknown>)
            .filter(([, alt]) => alt !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([ad, alt]) => [ad, sirali(alt)]),
        )
      : deger;
const ayniMi = (a: unknown, b: unknown) => JSON.stringify(sirali(a)) === JSON.stringify(sirali(b));

// Ekranın gördüğü hâlin özeti: durum ve bilgiler. Kişisel bilgi taşımaz (özet), yalnız karşılaştırılır.
export const adresSurumu = (siparis: {
  durum: string;
  teslimat: Teslimat;
  fatura: Fatura;
}): string =>
  createHash("sha256")
    .update(
      JSON.stringify(
        sirali({ durum: siparis.durum, teslimat: siparis.teslimat, fatura: siparis.fatura }),
      ),
    )
    .digest("hex");

const bolgesi = (adres: {
  ulke: string;
  il?: string | undefined;
  postaKodu?: string | undefined;
}) => ({
  ulke: adres.ulke,
  ...(adres.il === undefined ? {} : { il: adres.il }),
  ...(adres.postaKodu === undefined ? {} : { postaKodu: adres.postaKodu }),
});

// Değişen alanların adları (değerleri değil): kayıt için.
const degisenAlanlar = (
  eski: { teslimat: Teslimat; fatura: Fatura },
  yeni: { teslimat: Teslimat; fatura: Fatura },
): string[] => {
  const alanlar: string[] = [];
  for (const ad of ["ad", "soyad", "telefon", "adres"] as const) {
    if (!ayniMi(eski.teslimat[ad], yeni.teslimat[ad])) alanlar.push(`teslimat.${ad}`);
  }
  const ef = eski.fatura as Record<string, unknown>;
  const yf = yeni.fatura as Record<string, unknown>;
  for (const ad of ["tur", "firma", "vergiDairesi", "vergiNumarasi", "adresAyni", "adres"]) {
    if (!ayniMi(ef[ad], yf[ad])) alanlar.push(`fatura.${ad}`);
  }
  return alanlar;
};

// Kayda giren kişisel olmayan bölge bilgisi: teslimatın ülke, il ve ilçe kodları, faturanın türü.
const kayitDegeri = (teslimat: Teslimat, fatura: Fatura) => ({
  teslimatUlkesi: teslimat.adres.ulke,
  teslimatIli: teslimat.adres.il ?? null,
  teslimatIlcesi: teslimat.adres.ilce ?? null,
  faturaTuru: fatura.tur,
});

export const siparisAdresServisi = (site: Site) => {
  const duzelt = async (
    vt: Veritabani,
    kim: DegisikligiYapan,
    girdi: SiparisAdresiGirdisi,
  ): Promise<{ numara: string; degisti: boolean }> => {
    // Ayarlar ve vergi tablosu işlemden önce okunur (kilit tutulurken beklenmesin).
    const [ayarlar, tablo] = await Promise.all([
      siteninMagazaAyarlari(vt, site),
      siteninVergiServisi(site).tabloyuOku(vt, { silinmisSiniflar: true }),
    ]);
    return vt.transaction(async (islem) => {
      const [satir] = await islem
        .select({
          kimlik: siparisler.kimlik,
          numara: siparisler.numara,
          durum: siparisler.durum,
          teslimat: siparisler.teslimat,
          fatura: siparisler.fatura,
          gosterim: siparisler.gosterim,
          vergiDokumu: siparisler.vergi_dokumu,
          kisiselVeriSilinme: siparisler.kisisel_veri_silinme_zamani,
        })
        .from(siparisler)
        .where(eq(siparisler.numara, girdi.numara))
        .for("update");
      if (satir === undefined) throw new BilinenHata("bulunamadi");
      // Kişisel bilgisi silinmiş sipariş önce söylenir: özet de değişmiştir, ama nedeni çakışma değildir.
      if (satir.kisiselVeriSilinme !== null) {
        throw new BilinenHata("is-kurali", [{ alan: "siparis", kod: "kisisel-veri-silindi" }]);
      }
      if (adresSurumu(satir) !== girdi.surum) {
        throw new BilinenHata("cakisma", [{ alan: "siparis", kod: "adres-degisti" }]);
      }
      const durum = satir.durum as SiparisDurumu;
      if (!(adresDuzeltilebilirDurumlar as readonly string[]).includes(durum)) {
        throw new BilinenHata("is-kurali", [{ alan: "siparis", kod: "adres-duzeltilemez" }]);
      }
      const eski = { teslimat: satir.teslimat, fatura: satir.fatura };
      const yeni = { teslimat: girdi.teslimat, fatura: girdi.fatura };
      const alanlar = degisenAlanlar(eski, yeni);
      if (alanlar.length === 0) return { numara: satir.numara, degisti: false };
      // Teslimatın sitenin bugünkü ayarına bağlı kuralları (telefon zorunluluğu, teslimat ülkesi) yalnız teslimat
      // değişince: yalnız faturayı düzeltmek, sonradan açılan bir ayar yüzünden engellenmesin (bağımsız kontrolün
      // bulgusu).
      if (alanlar.some((alan) => alan.startsWith("teslimat."))) {
        const kural = teslimatKuraliHatasi(site, ayarlar, girdi.teslimat);
        if (kural !== undefined) {
          throw new BilinenHata("dogrulama", [{ alan: `teslimat.${kural.alan}`, kod: kural.kod }]);
        }
      }

      // Vergi kapalı verilmiş ya da hiç vergilenmiş kalemi olmayan (döküm boş) siparişte bölge önemsizdir.
      if (satir.gosterim !== "yok" && satir.vergiDokumu.length > 0) {
        const magaza = ayarlar.magazaAdresi;
        const adresler = (b: { teslimat: Teslimat; fatura: Fatura }) => ({
          teslimat: bolgesi(b.teslimat.adres),
          fatura: bolgesi(b.fatura.adres ?? b.teslimat.adres),
          ...(magaza === undefined ? {} : { magaza: bolgesi(magaza) }),
        });
        const [, eskiBolge]: [unknown, VergiBolgesi | undefined] = vergiBolgesiniSec(
          ayarlar,
          tablo,
          adresler(eski),
        );
        const [, yeniBolge]: [unknown, VergiBolgesi | undefined] = vergiBolgesiniSec(
          ayarlar,
          tablo,
          adresler(yeni),
        );
        if (!bolgelerinOranlariAyniMi(tablo, eskiBolge, yeniBolge)) {
          const adres =
            ayarlar.vergiAdresi === "fatura" && !girdi.fatura.adresAyni
              ? "fatura.adres"
              : "teslimat.adres";
          // Hata bölgeyi değiştiren alana bağlanır: ülke, il ya da posta kodu.
          const alan =
            eskiBolge?.ulke !== yeniBolge?.ulke
              ? "ulke"
              : eskiBolge?.il !== yeniBolge?.il
                ? "il"
                : "postaKodu";
          throw new BilinenHata("is-kurali", [
            { alan: `${adres}.${alan}`, kod: "vergi-bolgesi-degisir" },
          ]);
        }
      }

      await islem
        .update(siparisler)
        .set({ teslimat: yeni.teslimat, fatura: yeni.fatura })
        .where(eq(siparisler.kimlik, satir.kimlik));
      // Geçmiş ve e-posta güncellemeden sonra: e-posta yeni adresi taşır.
      const gecmis = await gecmiseYaz(islem, {
        siparis: satir.kimlik,
        onceki: durum,
        sonraki: durum,
        neden: "adres-duzeltildi",
        kim,
        ...(girdi.eposta ? {} : { eposta: false }),
      });
      await islem.insert(siparisAdresDuzeltmeleri).values({
        siparis_kimligi: satir.kimlik,
        gecmis_kimligi: gecmis,
        onceki_teslimat: eski.teslimat,
        onceki_fatura: eski.fatura,
        yeni_teslimat: yeni.teslimat,
        yeni_fatura: yeni.fatura,
      });
      await degisikligiKaydet(islem, {
        kim,
        islem: "siparis.adres-duzeltildi",
        kayit: { tur: "siparis", kimlik: satir.kimlik },
        eski: kayitDegeri(eski.teslimat, eski.fatura),
        yeni: { ...kayitDegeri(yeni.teslimat, yeni.fatura), degisenAlanlar: alanlar },
      });
      return { numara: satir.numara, degisti: true };
    });
  };

  return { duzelt };
};
