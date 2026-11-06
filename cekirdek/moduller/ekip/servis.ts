// Yöneticilerin rolleri ve izin sorusu (kart 0026, karar 0040). Kod rol adına bakmaz: tek soru
// "bu yöneticide bu izin var mı" sorusudur. Bu servisi çağıran uç, izni kapıda beyan eder.
import { and, count, eq, isNotNull, isNull, or } from "drizzle-orm";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { GirisIzni } from "../../kayitlar/izinler.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { rolIzinleri, roller, yoneticiler, yoneticiRolleri } from "./model.ts";

// Her istekte çalışır: rol alınınca erişim bir sonraki istekte kesilir.
export const yoneticininIzniVarMi = async (
  vt: Veritabani,
  yoneticiKimligi: string,
  izin: GirisIzni<"yonetici">,
): Promise<boolean> => {
  const [bulunan] = await vt
    .select({ rol: roller.kimlik })
    .from(yoneticiRolleri)
    .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
    .leftJoin(
      rolIzinleri,
      and(eq(rolIzinleri.rol_kimligi, roller.kimlik), eq(rolIzinleri.izin, izin)),
    )
    .where(
      and(
        eq(yoneticiRolleri.yonetici_kimligi, yoneticiKimligi),
        or(eq(roller.tam_yetki, true), isNotNull(rolIzinleri.izin)),
      ),
    )
    .limit(1);
  return bulunan !== undefined;
};

export const rolVer = async (
  vt: Veritabani,
  girdi: { yoneticiKimligi: string; rolKodu: string },
): Promise<void> => {
  const [rol] = await vt
    .select({ kimlik: roller.kimlik })
    .from(roller)
    .where(eq(roller.kod, girdi.rolKodu));
  const [yonetici] = await vt
    .select({ kimlik: yoneticiler.kimlik })
    .from(yoneticiler)
    .where(and(eq(yoneticiler.kimlik, girdi.yoneticiKimligi), isNull(yoneticiler.silinme_zamani)));
  if (rol === undefined || yonetici === undefined) throw new BilinenHata("bulunamadi");
  await vt
    .insert(yoneticiRolleri)
    .values({ yonetici_kimligi: yonetici.kimlik, rol_kimligi: rol.kimlik })
    .onConflictDoNothing();
};

// Tam yetkili son yöneticinin rolü alınamaz (karar 0040): mağazada ekibi yönetecek kimse kalmazdı.
// Tam yetkili roller kilitlenir, iki sahibin rolü aynı anda alınırken ikisi de geçemez.
export const rolAl = async (
  vt: Veritabani,
  girdi: { yoneticiKimligi: string; rolKodu: string },
): Promise<void> => {
  await vt.transaction(async (islem) => {
    await islem
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.tam_yetki, true))
      .orderBy(roller.kimlik)
      .for("update");

    const [rol] = await islem
      .select({ kimlik: roller.kimlik, tamYetki: roller.tam_yetki })
      .from(roller)
      .where(eq(roller.kod, girdi.rolKodu));
    if (rol === undefined) throw new BilinenHata("bulunamadi");

    const alinan = await islem
      .delete(yoneticiRolleri)
      .where(
        and(
          eq(yoneticiRolleri.yonetici_kimligi, girdi.yoneticiKimligi),
          eq(yoneticiRolleri.rol_kimligi, rol.kimlik),
        ),
      )
      .returning({ rol: yoneticiRolleri.rol_kimligi });
    if (alinan.length === 0) throw new BilinenHata("bulunamadi");
    if (!rol.tamYetki) return;

    // Hata fırlarsa işlem geri alınır, silinen satır yerine döner.
    const [kalan] = await islem
      .select({ sayi: count() })
      .from(yoneticiRolleri)
      .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
      .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiRolleri.yonetici_kimligi))
      .where(and(eq(roller.tam_yetki, true), isNull(yoneticiler.silinme_zamani)));
    if ((kalan?.sayi ?? 0) === 0) throw new BilinenHata("is-kurali");
  });
};
