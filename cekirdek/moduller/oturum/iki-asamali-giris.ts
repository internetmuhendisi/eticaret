// Yöneticinin iki aşamalı girişi (kart 0028, karar 0044, .claude/rules/guvenlik.md). Şifre doğrulanınca
// oturum değil, kısa ömürlü bir ara adım açılır. Gerçek oturum ancak kod doğrulanınca ya da kurulum
// onaylanınca başlar. Ara adım panele ve yönetici uçlarına girmez; kurulumu atlamanın yolu bu yüzden yoktur.
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { gunluk } from "../../izleme/gunluk.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { girisAdimiSuresiSaniye, ikiAsamaDenemeSiniri } from "../../kayitlar/oturum.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import {
  yoneticiGirisAdimlari,
  yoneticiIkiAsama,
  yoneticiler,
  yoneticiYedekKodlari,
} from "../ekip/model.ts";
import { denemeleriSil, denemeyiAyir, denemeyiGeriVer } from "./deneme-siniri.ts";
import { sinirliSifreDogrula } from "./giris.ts";
import {
  altiHaneliMi,
  gizliyiCoz,
  gizliyiSifrele,
  ikiAsamaGizlisiUret,
  kodunAdimi,
  kurulumAdresiUret,
  yedekKodlariUret,
  yedekKodOzeti,
} from "./iki-asama.ts";
import { type Anahtarlar, anahtarOzeti, oturumAc, sifreDegismediyse } from "./servis.ts";

export type AdimDurumu = "kod" | "kurulum";
export type GirisAdimi = { hesapKimligi: string; eposta: string; durum: AdimDurumu };

// Süresi dolmamış ara adım; hesabın kurulumu bitmişse "kod", bitmemişse "kurulum" durumundadır.
export const girisAdiminiOku = async (
  vt: Veritabani,
  anahtar: string | undefined,
): Promise<GirisAdimi | null> => {
  if (anahtar === undefined) return null;
  const [bulunan] = await vt
    .select({
      hesapKimligi: yoneticiGirisAdimlari.yonetici_kimligi,
      eposta: yoneticiler.eposta,
      kurulu: yoneticiIkiAsama.yonetici_kimligi,
    })
    .from(yoneticiGirisAdimlari)
    .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiGirisAdimlari.yonetici_kimligi))
    .leftJoin(
      yoneticiIkiAsama,
      eq(yoneticiIkiAsama.yonetici_kimligi, yoneticiGirisAdimlari.yonetici_kimligi),
    )
    .where(
      and(
        eq(yoneticiGirisAdimlari.anahtar_ozeti, anahtarOzeti(anahtar)),
        gt(yoneticiGirisAdimlari.bitis, new Date()),
        isNull(yoneticiler.silinme_zamani),
      ),
    );
  if (bulunan === undefined) return null;
  const { hesapKimligi, eposta, kurulu } = bulunan;
  return { hesapKimligi, eposta, durum: kurulu === null ? "kurulum" : "kod" };
};

// Giriş ucunun işi: şifreyi deneme sınırıyla doğrular, ara adım açar. Hesabın süresi dolmuş adımları silinir.
export const yoneticiSifreAsamasi = async (
  vt: Veritabani,
  girdi: { eposta: string; sifre: string },
  baglanti: string,
): Promise<{ anahtar: string; durum: AdimDurumu }> => {
  const dogrulanan = await sinirliSifreDogrula(vt, "yonetici", girdi, baglanti);
  const { hesapKimligi } = dogrulanan;
  const simdi = new Date();
  const anahtar = randomBytes(32).toString("base64url");
  await sifreDegismediyse(vt, "yonetici", dogrulanan, async (islem) => {
    await islem
      .delete(yoneticiGirisAdimlari)
      .where(
        and(
          eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi),
          lt(yoneticiGirisAdimlari.bitis, simdi),
        ),
      );
    await islem.insert(yoneticiGirisAdimlari).values({
      yonetici_kimligi: hesapKimligi,
      anahtar_ozeti: anahtarOzeti(anahtar),
      bitis: new Date(simdi.getTime() + girisAdimiSuresiSaniye * 1000),
    });
  });
  const adim = await girisAdiminiOku(vt, anahtar);
  if (adim === null) throw new BilinenHata("oturum-yok");
  return { anahtar, durum: adim.durum };
};

export const girisAdiminiSil = async (vt: Veritabani, anahtar: string | undefined) => {
  if (anahtar === undefined) return;
  await vt
    .delete(yoneticiGirisAdimlari)
    .where(eq(yoneticiGirisAdimlari.anahtar_ozeti, anahtarOzeti(anahtar)));
};

// Kurulum ekranının bilgisi. Gizli bu ara adıma aittir: aynı adımda sayfa yenilenince okutulmuş karekod
// bozulmaz, ama yeni bir şifre girişi yeni gizli alır. Çalınmış şifreyle görülen gizli, gerçek yöneticinin
// sonradan yaptığı kurulumda geçerli olmaz. Kurulumu bitmiş hesapta gizli gösterilmez (null).
export const kurulumuHazirla = async (
  vt: Veritabani,
  adimAnahtari: string,
  adim: GirisAdimi,
  siteAdi: string,
): Promise<{ gizli: string; adres: string } | null> => {
  const { hesapKimligi, eposta, durum } = adim;
  if (durum !== "kurulum") return null;
  const ozet = anahtarOzeti(adimAnahtari);
  await vt
    .update(yoneticiGirisAdimlari)
    .set({ bekleyen_gizli: gizliyiSifrele(ikiAsamaGizlisiUret(), hesapKimligi) })
    .where(
      and(
        eq(yoneticiGirisAdimlari.anahtar_ozeti, ozet),
        isNull(yoneticiGirisAdimlari.bekleyen_gizli),
      ),
    );
  const [kayit] = await vt
    .select({ sifreli: yoneticiGirisAdimlari.bekleyen_gizli })
    .from(yoneticiGirisAdimlari)
    .where(eq(yoneticiGirisAdimlari.anahtar_ozeti, ozet));
  if (!kayit?.sifreli) return null;
  const gizli = gizliyiCoz(kayit.sifreli, hesapKimligi);
  return { gizli, adres: kurulumAdresiUret(gizli, siteAdi, eposta) };
};

// Kod denemesi hesap ve bağlantı başına sayılır. Şifre doğrulansa da sayaç sıfırlanmaz: şifreyi bilen biri
// yeniden girerek deneme hakkı kazanamaz. Yalnız doğru kod sıfırlar.
const sinirliKodDenemesi = async <Sonuc>(
  hesapKimligi: string,
  eposta: string,
  baglanti: string,
  dene: () => Promise<Sonuc | null>,
): Promise<Sonuc> => {
  const hesapAnahtari = `yonetici kod hesap ${hesapKimligi}`;
  const baglantiAnahtari = `yonetici kod baglanti ${baglanti}`;
  const bekle = denemeyiAyir([
    { anahtar: hesapAnahtari, ...ikiAsamaDenemeSiniri.hesap },
    { anahtar: baglantiAnahtari, ...ikiAsamaDenemeSiniri.baglanti },
  ]);
  if (bekle !== null) {
    gunluk.uyari("Kod deneme sınırı doldu.", { hesapTuru: "yonetici", eposta });
    throw new BilinenHata("istek-siniri", undefined, { "Retry-After": String(bekle) });
  }
  let sonuc: Sonuc | null;
  try {
    sonuc = await dene();
  } catch (hata) {
    // Yanlış kod değil: veritabanı hatası, süresi dolmuş adım ya da kurulum durumu.
    denemeyiGeriVer(hesapAnahtari);
    denemeyiGeriVer(baglantiAnahtari);
    throw hata;
  }
  if (sonuc === null) {
    gunluk.uyari("Yanlış kod denemesi.", { hesapTuru: "yonetici", eposta });
    throw new BilinenHata("giris-hatasi");
  }
  denemeleriSil(hesapAnahtari);
  denemeyiGeriVer(baglantiAnahtari);
  return sonuc;
};

// Ara adımı kilitleyip okur: aynı anda giden ikinci istek bekler, sonra adımı silinmiş bulur.
const adimiKilitle = async (islem: VeritabaniIslemi, anahtar: string, hesapKimligi: string) => {
  const [adim] = await islem
    .select({
      kimlik: yoneticiGirisAdimlari.kimlik,
      bekleyenGizli: yoneticiGirisAdimlari.bekleyen_gizli,
    })
    .from(yoneticiGirisAdimlari)
    .where(
      and(
        eq(yoneticiGirisAdimlari.anahtar_ozeti, anahtarOzeti(anahtar)),
        eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi),
        gt(yoneticiGirisAdimlari.bitis, new Date()),
      ),
    )
    .for("update");
  if (adim === undefined) throw new BilinenHata("oturum-yok");
  return adim;
};

const ikiAsamayiKilitle = async (islem: VeritabaniIslemi, hesapKimligi: string) => {
  const [kayit] = await islem
    .select({
      sifreli: yoneticiIkiAsama.sifreli_gizli,
      sonAdim: yoneticiIkiAsama.son_kod_adimi,
    })
    .from(yoneticiIkiAsama)
    .where(eq(yoneticiIkiAsama.yonetici_kimligi, hesapKimligi))
    .for("update");
  return kayit;
};

const adimiKapatipOturumAc = async (
  islem: VeritabaniIslemi,
  adimKimligi: string,
  hesapKimligi: string,
  sureSaniye: number,
): Promise<Anahtarlar> => {
  await islem.delete(yoneticiGirisAdimlari).where(eq(yoneticiGirisAdimlari.kimlik, adimKimligi));
  return oturumAc(islem, "yonetici", hesapKimligi, sureSaniye);
};

// Kod ekranının işi: zamanlı kod ya da yedek kod doğruysa oturum açar. Her şey tek işlemdedir: kod
// tükendiyse oturum da açılmıştır, biri olmadan öteki olmaz.
export const kodlaGirisiBitir = async (
  vt: Veritabani,
  adimAnahtari: string | undefined,
  kod: string,
  baglanti: string,
  sureSaniye: number,
): Promise<Anahtarlar> => {
  const adim = await girisAdiminiOku(vt, adimAnahtari);
  if (adim === null || adimAnahtari === undefined) throw new BilinenHata("oturum-yok");
  if (adim.durum !== "kod") throw new BilinenHata("is-kurali");
  const { hesapKimligi, eposta } = adim;
  const sonuc = await sinirliKodDenemesi(hesapKimligi, eposta, baglanti, () =>
    vt.transaction(async (islem) => {
      const { kimlik: adimKimligi } = await adimiKilitle(islem, adimAnahtari, hesapKimligi);
      const kayit = await ikiAsamayiKilitle(islem, hesapKimligi);
      if (kayit === undefined) throw new BilinenHata("is-kurali");

      if (altiHaneliMi(kod)) {
        const gizli = gizliyiCoz(kayit.sifreli, hesapKimligi);
        const kodAdimi = kodunAdimi(gizli, kod, kayit.sonAdim);
        if (kodAdimi === null) return null;
        await islem
          .update(yoneticiIkiAsama)
          .set({ son_kod_adimi: kodAdimi, guncellenme_zamani: new Date() })
          .where(eq(yoneticiIkiAsama.yonetici_kimligi, hesapKimligi));
        return {
          anahtarlar: await adimiKapatipOturumAc(islem, adimKimligi, hesapKimligi, sureSaniye),
          yedekKalan: null,
        };
      }

      const [kullanilan] = await islem
        .update(yoneticiYedekKodlari)
        .set({ kullanilma_zamani: new Date() })
        .where(
          and(
            eq(yoneticiYedekKodlari.yonetici_kimligi, hesapKimligi),
            eq(yoneticiYedekKodlari.kod_ozeti, yedekKodOzeti(kod)),
            isNull(yoneticiYedekKodlari.kullanilma_zamani),
          ),
        )
        .returning({ kimlik: yoneticiYedekKodlari.kimlik });
      if (kullanilan === undefined) return null;
      const [kalan] = await islem
        .select({ sayi: sql<number>`count(*)::int` })
        .from(yoneticiYedekKodlari)
        .where(
          and(
            eq(yoneticiYedekKodlari.yonetici_kimligi, hesapKimligi),
            isNull(yoneticiYedekKodlari.kullanilma_zamani),
          ),
        );
      return {
        anahtarlar: await adimiKapatipOturumAc(islem, adimKimligi, hesapKimligi, sureSaniye),
        yedekKalan: kalan?.sayi ?? 0,
      };
    }),
  );
  if (sonuc.yedekKalan === null) {
    gunluk.bilgi("Giriş yapıldı.", { hesapTuru: "yonetici", eposta });
  } else {
    // Uyarı: telefonu elinde olmayan biri ya da gerçekten kaybolmuş telefon olabilir.
    gunluk.uyari("Yedek kodla giriş yapıldı.", {
      hesapTuru: "yonetici",
      eposta,
      kalanYedek: sonuc.yedekKalan,
    });
  }
  return sonuc.anahtarlar;
};

// Kurulum ekranının işi: ilk kodu doğrular, kurulumu bitirir, yedek kodları bir kez döner, oturum açar.
export const kurulumuOnayla = async (
  vt: Veritabani,
  adimAnahtari: string | undefined,
  kod: string,
  baglanti: string,
  sureSaniye: number,
): Promise<{ anahtarlar: Anahtarlar; yedekKodlari: string[] }> => {
  const adim = await girisAdiminiOku(vt, adimAnahtari);
  if (adim === null || adimAnahtari === undefined) throw new BilinenHata("oturum-yok");
  if (adim.durum !== "kurulum") throw new BilinenHata("is-kurali");
  const { hesapKimligi, eposta } = adim;
  const sonuc = await sinirliKodDenemesi(hesapKimligi, eposta, baglanti, () =>
    vt.transaction(async (islem) => {
      const { kimlik: adimKimligi, bekleyenGizli } = await adimiKilitle(
        islem,
        adimAnahtari,
        hesapKimligi,
      );
      // Kurulum ekranı açılmadan gelen istekte gizli yoktur.
      if (bekleyenGizli === null) throw new BilinenHata("is-kurali");
      if (!altiHaneliMi(kod)) return null;
      const kodAdimi = kodunAdimi(gizliyiCoz(bekleyenGizli, hesapKimligi), kod, null);
      if (kodAdimi === null) return null;
      const simdi = new Date();
      // İki ayrı ara adımdan aynı anda gelen onayda yalnız biri satırı yazar.
      const [yazilan] = await islem
        .insert(yoneticiIkiAsama)
        .values({
          yonetici_kimligi: hesapKimligi,
          sifreli_gizli: bekleyenGizli,
          son_kod_adimi: kodAdimi,
          onay_zamani: simdi,
        })
        .onConflictDoNothing()
        .returning({ kimlik: yoneticiIkiAsama.yonetici_kimligi });
      if (yazilan === undefined) throw new BilinenHata("is-kurali");
      // Öteki ara adımlardaki gizliler artık geçersizdir, satırda kalmaz.
      await islem
        .update(yoneticiGirisAdimlari)
        .set({ bekleyen_gizli: null })
        .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi));
      const yedekKodlari = yedekKodlariUret();
      await islem.insert(yoneticiYedekKodlari).values(
        yedekKodlari.map((yedek) => ({
          yonetici_kimligi: hesapKimligi,
          kod_ozeti: yedekKodOzeti(yedek),
        })),
      );
      return {
        anahtarlar: await adimiKapatipOturumAc(islem, adimKimligi, hesapKimligi, sureSaniye),
        yedekKodlari,
      };
    }),
  );
  gunluk.bilgi("İki aşamalı giriş kuruldu.", { hesapTuru: "yonetici", eposta });
  return sonuc;
};
