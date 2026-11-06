// Şifre ve oturum motoru (kart 0025, karar 0039, .claude/rules/guvenlik.md). Yönetici ve müşteri
// aynı motoru kendi tablolarıyla kullanır; biri ötekinin oturumuna hiçbir yoldan giremez.
// Anahtarlar rastgele üretilir, veritabanında yalnız özetleri durur. Her site kendi veritabanını
// kullandığı için bir sitenin anahtarı başka sitede bulunamaz.
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { gunluk } from "../../izleme/gunluk.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import {
  type HesapTuru,
  kisaAnahtarSuresiSaniye,
  yenilemeToleransiSaniye,
} from "../../kayitlar/oturum.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { yoneticiler, yoneticiOturumlari } from "../ekip/model.ts";
import { musteriler, musteriOturumlari } from "../musteri/model.ts";
import { epostaSemasi, sifreSemasi } from "./semalar.ts";
import { sahteDogrulama, sifreDogrula, sifreOzetle, yenidenOzetlenmeli } from "./sifre.ts";

const tablolar = {
  yonetici: { hesap: yoneticiler, oturum: yoneticiOturumlari },
  musteri: { hesap: musteriler, oturum: musteriOturumlari },
} as const;

export type Anahtarlar = { kisaAnahtar: string; yenilemeAnahtari: string };

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
  vt: Veritabani,
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

// Doğru şifrede oturum açar. Yanlış şifre ile kayıtlı olmayan e-postanın sonucu ve süresi aynıdır.
export const girisYap = async (
  vt: Veritabani,
  tur: HesapTuru,
  girdi: { eposta: string; sifre: string },
  sureSaniye: number,
): Promise<{ hesapKimligi: string; anahtarlar: Anahtarlar } | null> => {
  const { hesap, oturum } = tablolar[tur];
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
    await vt
      .update(hesap)
      .set({ sifre_ozeti: await sifreOzetle(girdi.sifre), guncellenme_zamani: new Date() })
      .where(eq(hesap.kimlik, bulunan.kimlik));
  }
  const { anahtarlar, alanlar } = yeniAnahtarlar(sureSaniye);
  await vt.insert(oturum).values({ hesap_kimligi: bulunan.kimlik, ...alanlar });
  return { hesapKimligi: bulunan.kimlik, anahtarlar };
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
      .where(or(eq(oturum.yenileme_anahtari_ozeti, ozet), eq(oturum.onceki_yenileme_ozeti, ozet)))
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
        oturumKimligi: bulunan.kimlik,
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
): Promise<void> => {
  const { oturum } = tablolar[tur];
  const { kisaAnahtar, yenilemeAnahtari } = anahtarlar;
  if (kisaAnahtar === undefined && yenilemeAnahtari === undefined) return;
  await vt
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
    );
};
