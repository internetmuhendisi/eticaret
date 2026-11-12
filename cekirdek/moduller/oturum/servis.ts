// Şifre ve oturum motoru (kart 0025, karar 0039, .claude/rules/guvenlik.md). Yönetici ve müşteri
// aynı motoru kendi tablolarıyla kullanır; biri ötekinin oturumuna hiçbir yoldan giremez.
// Anahtarlar rastgele üretilir, veritabanında yalnız özetleri durur. Her site kendi veritabanını
// kullandığı için bir sitenin anahtarı başka sitede bulunamaz.
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { gunluk } from "../../izleme/gunluk.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import {
  type HesapTuru,
  kisaAnahtarSuresiSaniye,
  yenilemeToleransiSaniye,
} from "../../kayitlar/oturum.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { yoneticiler, yoneticiOturumlari } from "../ekip/model.ts";
import { musteriler, musteriOturumlari } from "../musteri/model.ts";
import { epostaSemasi, sifreSemasi } from "./semalar.ts";
import { sahteDogrulama, sifreDogrula, sifreOzetle, yenidenOzetlenmeli } from "./sifre.ts";

const tablolar = {
  yonetici: { hesap: yoneticiler, oturum: yoneticiOturumlari },
  musteri: { hesap: musteriler, oturum: musteriOturumlari },
} as const;

// Yönetici oturumu yalnız iki aşamadan geçtiyse geçerlidir: eski sürümün şifreyle açtığı oturum
// (yayın aralığında, geri dönüşte) burada elenir (karar 0044).
const gecerliOturumSarti = (tur: HesapTuru): SQL | undefined =>
  tur === "yonetici" ? isNotNull(yoneticiOturumlari.iki_asama_zamani) : undefined;

export type Anahtarlar = { kisaAnahtar: string; yenilemeAnahtari: string };
export type DogrulananSifre = { hesapKimligi: string; sifreOzeti: string };

export type YenilemeSonucu =
  | { durum: "yenilendi"; hesapKimligi: string; anahtarlar: Anahtarlar }
  // Aynı anda giden başka bir istek anahtarı az önce yeniledi; yeni anahtarlar o isteğin yanıtında.
  | { durum: "tolerans"; hesapKimligi: string }
  | { durum: "yeniden-kullanim" }
  | { durum: "gecersiz" };

const anahtarUret = (): string => randomBytes(32).toString("base64url");

export const anahtarOzeti = (anahtar: string): string =>
  createHash("sha256").update(anahtar).digest("hex");

const sonra = (saniye: number, baslangic = new Date()): Date =>
  new Date(baslangic.getTime() + saniye * 1000);

const yeniAnahtarlar = (sureSaniye: number) => {
  const simdi = new Date();
  const kisaAnahtar = anahtarUret();
  const yenilemeAnahtari = anahtarUret();
  return {
    anahtarlar: { kisaAnahtar, yenilemeAnahtari },
    alanlar: {
      kisa_anahtar_ozeti: anahtarOzeti(kisaAnahtar),
      kisa_anahtar_bitis: sonra(kisaAnahtarSuresiSaniye, simdi),
      yenileme_anahtari_ozeti: anahtarOzeti(yenilemeAnahtari),
      oturum_bitis: sonra(sureSaniye, simdi),
    },
  };
};

export const hesapAc = async (
  vt: Pick<Veritabani, "insert">,
  tur: HesapTuru,
  girdi: { eposta: string; sifre: string },
): Promise<{ hesapKimligi: string }> => {
  const eposta = epostaSemasi.safeParse(girdi.eposta);
  const sifre = sifreSemasi.safeParse(girdi.sifre);
  if (!eposta.success || !sifre.success) {
    // Ayrıntıya girilen değer yazılmaz, yalnız hangi alanın geçmediği.
    throw new BilinenHata("dogrulama", [
      ...(eposta.success ? [] : [{ alan: "eposta", kod: eposta.error.issues[0]?.code }]),
      ...(sifre.success ? [] : [{ alan: "sifre", kod: sifre.error.issues[0]?.code }]),
    ]);
  }
  const { hesap } = tablolar[tur];
  const [acilan] = await vt
    .insert(hesap)
    .values({ eposta: eposta.data, sifre_ozeti: await sifreOzetle(sifre.data) })
    .onConflictDoNothing()
    .returning({ kimlik: hesap.kimlik });
  if (acilan === undefined) throw new BilinenHata("cakisma");
  return { hesapKimligi: acilan.kimlik };
};

// Şifreyi doğrular, oturum açmaz. Yanlış şifre ile kayıtlı olmayan e-postanın sonucu ve süresi aynıdır.
export const hesapSifresiniDogrula = async (
  vt: Veritabani,
  tur: HesapTuru,
  girdi: { eposta: string; sifre: string },
): Promise<DogrulananSifre | null> => {
  const { hesap } = tablolar[tur];
  const eposta = epostaSemasi.safeParse(girdi.eposta);
  const [bulunan] = eposta.success
    ? await vt
        .select({ kimlik: hesap.kimlik, sifre_ozeti: hesap.sifre_ozeti })
        .from(hesap)
        .where(and(eq(hesap.eposta, eposta.data), isNull(hesap.silinme_zamani)))
    : [];
  if (bulunan === undefined) {
    await sahteDogrulama(girdi.sifre);
    return null;
  }
  if (!(await sifreDogrula(girdi.sifre, bulunan.sifre_ozeti))) return null;

  if (yenidenOzetlenmeli(bulunan.sifre_ozeti)) {
    const yeniOzet = await sifreOzetle(girdi.sifre);
    // Bu arada şifre değiştiyse eski şifre geri yazılmaz.
    const [yenilenen] = await vt
      .update(hesap)
      .set({ sifre_ozeti: yeniOzet, guncellenme_zamani: new Date() })
      .where(and(eq(hesap.kimlik, bulunan.kimlik), eq(hesap.sifre_ozeti, bulunan.sifre_ozeti)))
      .returning({ kimlik: hesap.kimlik });
    if (yenilenen === undefined) return null;
    return { hesapKimligi: bulunan.kimlik, sifreOzeti: yeniOzet };
  }
  return { hesapKimligi: bulunan.kimlik, sifreOzeti: bulunan.sifre_ozeti };
};

// Şifreden geçen kişinin oturumu ya da ara adımı bununla açılır (kart 0034, karar 0052). Şifre doğrulanıp
// oturum açılana kadar sıfırlama bitmiş olabilir: eski şifreyle başlayan giriş, "oturumlar kapatıldı"dan sonra
// açık oturum bırakırdı. Hesap satırı paylaşımlı kilitlenir: sıfırlama sürüyorsa beklenir, sonra şifre değişmiş
// bulunur; önce bu işlem başladıysa sıfırlama onu bekler ve açılan oturumu da kapatır.
export const sifreDegismediyse = <Sonuc>(
  vt: Veritabani,
  tur: HesapTuru,
  dogrulanan: DogrulananSifre,
  is: (islem: VeritabaniIslemi) => Promise<Sonuc>,
): Promise<Sonuc> =>
  vt.transaction(async (islem) => {
    const { hesap } = tablolar[tur];
    const [guncel] = await islem
      .select({ sifre_ozeti: hesap.sifre_ozeti })
      .from(hesap)
      .where(and(eq(hesap.kimlik, dogrulanan.hesapKimligi), isNull(hesap.silinme_zamani)))
      .for("share");
    if (guncel?.sifre_ozeti !== dogrulanan.sifreOzeti) throw new BilinenHata("giris-hatasi");
    return is(islem);
  });

// Oturum açar. Şifreden geçmiş kimlikle çağrılır. Yönetici için yalnız iki aşamalı giriş çağırır
// (iki-asamali-giris.ts, cekirdek/kapi/testler/iki-asamali-giris.test.ts denetler).
export const oturumAc = async (
  vt: Pick<Veritabani, "insert">,
  tur: HesapTuru,
  hesapKimligi: string,
  sureSaniye: number,
): Promise<Anahtarlar> => {
  const { oturum } = tablolar[tur];
  const { anahtarlar, alanlar } = yeniAnahtarlar(sureSaniye);
  await vt.insert(oturum).values({
    hesap_kimligi: hesapKimligi,
    ...alanlar,
    ...(tur === "yonetici" ? { iki_asama_zamani: new Date() } : {}),
  });
  return anahtarlar;
};

// Şifre doğruysa oturum açar. Motor testleri içindir; uygulamada yönetici oturumu kodsuz açılmaz.
export const girisYap = async (
  vt: Veritabani,
  tur: HesapTuru,
  girdi: { eposta: string; sifre: string },
  sureSaniye: number,
): Promise<{ hesapKimligi: string; anahtarlar: Anahtarlar } | null> => {
  const bulunan = await hesapSifresiniDogrula(vt, tur, girdi);
  if (bulunan === null) return null;
  const { hesapKimligi } = bulunan;
  return { hesapKimligi, anahtarlar: await oturumAc(vt, tur, hesapKimligi, sureSaniye) };
};

// Kısa anahtar geçerliyse hesabın kimliğini döner.
export const oturumuDogrula = async (
  vt: Veritabani,
  tur: HesapTuru,
  kisaAnahtar: string,
): Promise<{ hesapKimligi: string } | null> => {
  const { hesap, oturum } = tablolar[tur];
  const simdi = new Date();
  const [bulunan] = await vt
    .select({ hesapKimligi: oturum.hesap_kimligi })
    .from(oturum)
    .innerJoin(hesap, eq(hesap.kimlik, oturum.hesap_kimligi))
    .where(
      and(
        eq(oturum.kisa_anahtar_ozeti, anahtarOzeti(kisaAnahtar)),
        isNull(oturum.kapanma_zamani),
        gt(oturum.kisa_anahtar_bitis, simdi),
        gt(oturum.oturum_bitis, simdi),
        isNull(hesap.silinme_zamani),
        gecerliOturumSarti(tur),
      ),
    );
  return bulunan ?? null;
};

// Yenileme anahtarını yenisiyle değiştirir. Eski anahtar tolerans süresinden sonra yeniden gelirse
// anahtar çalınmış olabilir: oturum kapanır. Satır kilitli okunur, aynı anda iki yenileme olmaz.
export const oturumuYenile = async (
  vt: Veritabani,
  tur: HesapTuru,
  yenilemeAnahtari: string,
  sureSaniye: number,
): Promise<YenilemeSonucu> => {
  const { hesap, oturum } = tablolar[tur];
  const ozet = anahtarOzeti(yenilemeAnahtari);
  return vt.transaction(async (islem): Promise<YenilemeSonucu> => {
    const [bulunan] = await islem
      .select({
        kimlik: oturum.kimlik,
        hesapKimligi: oturum.hesap_kimligi,
        yenilemeOzeti: oturum.yenileme_anahtari_ozeti,
        yenilemeZamani: oturum.yenileme_zamani,
        oturumBitis: oturum.oturum_bitis,
        kapanmaZamani: oturum.kapanma_zamani,
        silinmeZamani: hesap.silinme_zamani,
      })
      .from(oturum)
      .innerJoin(hesap, eq(hesap.kimlik, oturum.hesap_kimligi))
      .where(
        and(
          or(eq(oturum.yenileme_anahtari_ozeti, ozet), eq(oturum.onceki_yenileme_ozeti, ozet)),
          gecerliOturumSarti(tur),
        ),
      )
      .for("update", { of: oturum });

    const simdi = new Date();
    if (
      bulunan === undefined ||
      bulunan.kapanmaZamani !== null ||
      bulunan.silinmeZamani !== null ||
      bulunan.oturumBitis <= simdi
    ) {
      return { durum: "gecersiz" };
    }

    if (bulunan.yenilemeOzeti !== ozet) {
      const yenilendi = bulunan.yenilemeZamani;
      if (yenilendi !== null && sonra(yenilemeToleransiSaniye, yenilendi) > simdi) {
        return { durum: "tolerans", hesapKimligi: bulunan.hesapKimligi };
      }
      await islem
        .update(oturum)
        .set({ kapanma_zamani: simdi })
        .where(eq(oturum.kimlik, bulunan.kimlik));
      gunluk.uyari("Eski yenileme anahtarı yeniden kullanıldı, oturum kapatıldı.", {
        hesapTuru: tur,
        // Alanın adında "oturum" geçerse günlükte gizlenir.
        kayitKimligi: bulunan.kimlik,
        hesapKimligi: bulunan.hesapKimligi,
      });
      return { durum: "yeniden-kullanim" };
    }

    const { anahtarlar, alanlar } = yeniAnahtarlar(sureSaniye);
    await islem
      .update(oturum)
      .set({ ...alanlar, onceki_yenileme_ozeti: ozet, yenileme_zamani: simdi })
      .where(eq(oturum.kimlik, bulunan.kimlik));
    return { durum: "yenilendi", hesapKimligi: bulunan.hesapKimligi, anahtarlar };
  });
};

// Çıkış: anahtarlardan hangisi elde varsa onun oturumu kapanır, ikisi birden geçersiz olur.
export const cikisYap = async (
  vt: Veritabani,
  tur: HesapTuru,
  anahtarlar: Partial<Anahtarlar>,
): Promise<{ eposta: string } | null> => {
  const { hesap, oturum } = tablolar[tur];
  const { kisaAnahtar, yenilemeAnahtari } = anahtarlar;
  if (kisaAnahtar === undefined && yenilemeAnahtari === undefined) return null;
  const [kapanan] = await vt
    .update(oturum)
    .set({ kapanma_zamani: new Date() })
    .where(
      and(
        isNull(oturum.kapanma_zamani),
        or(
          kisaAnahtar === undefined
            ? undefined
            : eq(oturum.kisa_anahtar_ozeti, anahtarOzeti(kisaAnahtar)),
          yenilemeAnahtari === undefined
            ? undefined
            : eq(oturum.yenileme_anahtari_ozeti, anahtarOzeti(yenilemeAnahtari)),
          yenilemeAnahtari === undefined
            ? undefined
            : eq(oturum.onceki_yenileme_ozeti, anahtarOzeti(yenilemeAnahtari)),
        ),
      ),
    )
    .returning({ hesapKimligi: oturum.hesap_kimligi });
  if (kapanan === undefined) return null;
  const [bulunan] = await vt
    .select({ eposta: hesap.eposta })
    .from(hesap)
    .where(eq(hesap.kimlik, kapanan.hesapKimligi));
  return bulunan ?? null;
};

// Anahtarı değiştirmeden oturumun hesabını söyler, oturum açık değilse null. Sayfa çizerken kullanılır:
// çerez yazılamayan yerde oturumu yenilemek onu kapatırdı (karar 0039, 0042). Kısa anahtarı dolmuş
// oturumun yenileme anahtarı da sayılır; az önce değiştiyse eskisi tolerans süresince geçerlidir.
export const oturumunHesabi = async (
  vt: Veritabani,
  tur: HesapTuru,
  anahtarlar: Partial<Anahtarlar>,
): Promise<string | null> => {
  const { hesap, oturum } = tablolar[tur];
  const { kisaAnahtar, yenilemeAnahtari } = anahtarlar;
  if (kisaAnahtar !== undefined) {
    const dogrulanan = await oturumuDogrula(vt, tur, kisaAnahtar);
    if (dogrulanan !== null) return dogrulanan.hesapKimligi;
  }
  if (yenilemeAnahtari === undefined) return null;
  const ozet = anahtarOzeti(yenilemeAnahtari);
  const simdi = new Date();
  const [bulunan] = await vt
    .select({ hesapKimligi: oturum.hesap_kimligi })
    .from(oturum)
    .innerJoin(hesap, eq(hesap.kimlik, oturum.hesap_kimligi))
    .where(
      and(
        isNull(oturum.kapanma_zamani),
        gt(oturum.oturum_bitis, simdi),
        isNull(hesap.silinme_zamani),
        gecerliOturumSarti(tur),
        or(
          eq(oturum.yenileme_anahtari_ozeti, ozet),
          and(
            eq(oturum.onceki_yenileme_ozeti, ozet),
            gt(oturum.yenileme_zamani, new Date(simdi.getTime() - yenilemeToleransiSaniye * 1000)),
          ),
        ),
      ),
    );
  return bulunan?.hesapKimligi ?? null;
};

// Anahtarı değiştirmeden oturumun açık olup olmadığını söyler (yukarıdakiyle aynı kural).
export const oturumAcikMi = async (
  vt: Veritabani,
  tur: HesapTuru,
  anahtarlar: Partial<Anahtarlar>,
): Promise<boolean> => (await oturumunHesabi(vt, tur, anahtarlar)) !== null;
