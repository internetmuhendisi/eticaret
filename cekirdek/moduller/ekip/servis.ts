// Yöneticilerin rolleri ve izin sorusu (kart 0026, karar 0040). Kod rol adına bakmaz: tek soru
// "bu yöneticide bu izin var mı" sorusudur. Bu servisi çağıran uç, izni kapıda beyan eder.
import { and, count, eq, isNotNull, isNull, or } from "drizzle-orm";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { GirisIzni } from "../../kayitlar/izinler.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { hesapAc } from "../oturum/servis.ts";
import {
  rolIzinleri,
  roller,
  yoneticiGirisAdimlari,
  yoneticiler,
  yoneticiOturumlari,
  yoneticiRolleri,
} from "./model.ts";

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
    .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiRolleri.yonetici_kimligi))
    .leftJoin(
      rolIzinleri,
      and(eq(rolIzinleri.rol_kimligi, roller.kimlik), eq(rolIzinleri.izin, izin)),
    )
    .where(
      and(
        eq(yoneticiRolleri.yonetici_kimligi, yoneticiKimligi),
        isNull(yoneticiler.silinme_zamani),
        or(eq(roller.tam_yetki, true), isNotNull(rolIzinleri.izin)),
      ),
    )
    .limit(1);
  return bulunan !== undefined;
};

// Yöneticinin bütün izinleri tek sorguyla (kart 0141): panel menüsü her sayfanın iznini ayrı sormaz.
// Kural yukarıdakiyle aynıdır: silinmiş hesabın izni yoktur, tam yetkili rol her izni verir. İkisinin her
// rol ve her izinde aynı cevabı verdiği testte ölçülür (testler/servis.test.ts).
export type YoneticiYetkileri = (izin: GirisIzni<"yonetici">) => boolean;

export const yoneticininYetkileri = async (
  vt: Veritabani,
  yoneticiKimligi: string,
): Promise<YoneticiYetkileri> => {
  const satirlar = await vt
    .select({ tamYetki: roller.tam_yetki, izin: rolIzinleri.izin })
    .from(yoneticiRolleri)
    .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
    .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiRolleri.yonetici_kimligi))
    .leftJoin(rolIzinleri, eq(rolIzinleri.rol_kimligi, roller.kimlik))
    .where(
      and(
        eq(yoneticiRolleri.yonetici_kimligi, yoneticiKimligi),
        isNull(yoneticiler.silinme_zamani),
      ),
    );
  if (satirlar.some((satir) => satir.tamYetki)) return () => true;
  const izinler = new Set(satirlar.map((satir) => satir.izin));
  return (izin) => izinler.has(izin);
};

// Yetki işlemlerinin ortak kilidi: tam yetkili rollerin satırları. Bir sahibin rolünü almak ya da hesabını
// kapatmak aynı anda iki kez geçemez, sahipsiz mağaza kalmaz (karar 0040). Rol verme de alır: kapatılmakta
// olan hesaba rol verilmez. Her yetki işlemi önce bunu alır, kilitlenme (deadlock) olmaz.
const tamYetkiliRolleriKilitle = (islem: VeritabaniIslemi) =>
  islem
    .select({ kimlik: roller.kimlik })
    .from(roller)
    .where(eq(roller.tam_yetki, true))
    .orderBy(roller.kimlik)
    .for("update");

// Her değişiklik aynı işlemde değişiklik kaydına yazılır (kart 0029, karar 0045). Kişi zaten bu role
// sahipse değişen bir şey yoktur, kayıt düşmez.
export const rolVer = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { yoneticiKimligi: string; rolKodu: string },
  kim: DegisikligiYapan,
): Promise<void> => {
  await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    const [rol] = await islem
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, girdi.rolKodu));
    const [yonetici] = await islem
      .select({ kimlik: yoneticiler.kimlik })
      .from(yoneticiler)
      .where(
        and(eq(yoneticiler.kimlik, girdi.yoneticiKimligi), isNull(yoneticiler.silinme_zamani)),
      );
    if (rol === undefined || yonetici === undefined) throw new BilinenHata("bulunamadi");
    const verilen = await islem
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: yonetici.kimlik, rol_kimligi: rol.kimlik })
      .onConflictDoNothing()
      .returning({ rol: yoneticiRolleri.rol_kimligi });
    if (verilen.length === 0) return;
    await degisikligiKaydet(islem, {
      kim,
      islem: "rol.verildi",
      kayit: { tur: "yonetici", kimlik: yonetici.kimlik },
      eski: null,
      yeni: { rol: girdi.rolKodu },
    });
  });
};

// Hata fırlarsa işlem geri alınır, yapılan değişiklik yerine döner.
const sonSahipKontrolu = async (islem: VeritabaniIslemi): Promise<void> => {
  const [kalan] = await islem
    .select({ sayi: count() })
    .from(yoneticiRolleri)
    .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
    .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiRolleri.yonetici_kimligi))
    .where(and(eq(roller.tam_yetki, true), isNull(yoneticiler.silinme_zamani)));
  if ((kalan?.sayi ?? 0) === 0) throw new BilinenHata("is-kurali");
};

// Tam yetkili son yöneticinin rolü alınamaz (karar 0040): mağazada ekibi yönetecek kimse kalmazdı.
export const rolAl = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { yoneticiKimligi: string; rolKodu: string },
  kim: DegisikligiYapan,
): Promise<void> => {
  await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);

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
    if (rol.tamYetki) await sonSahipKontrolu(islem);
    await degisikligiKaydet(islem, {
      kim,
      islem: "rol.alindi",
      kayit: { tur: "yonetici", kimlik: girdi.yoneticiKimligi },
      eski: { rol: girdi.rolKodu },
      yeni: null,
    });
  });
};

// Yöneticinin giriş hesabını kapatır: giremez, açık oturumu ve yarım girişi hemen geçersiz olur. Tam
// yetkili son yöneticinin hesabı kapatılamaz; rolAl ile aynı kilidi alır, ikisi aynı anda geçemez.
export const yoneticiHesabiKapat = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { yoneticiKimligi: string },
  kim: DegisikligiYapan,
): Promise<void> => {
  await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    const simdi = new Date();
    const [kapanan] = await islem
      .update(yoneticiler)
      .set({ silinme_zamani: simdi, guncellenme_zamani: simdi })
      .where(and(eq(yoneticiler.kimlik, girdi.yoneticiKimligi), isNull(yoneticiler.silinme_zamani)))
      .returning({ kimlik: yoneticiler.kimlik });
    if (kapanan === undefined) throw new BilinenHata("bulunamadi");
    const [tamYetkili] = await islem
      .select({ rol: yoneticiRolleri.rol_kimligi })
      .from(yoneticiRolleri)
      .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
      .where(and(eq(yoneticiRolleri.yonetici_kimligi, kapanan.kimlik), eq(roller.tam_yetki, true)))
      .limit(1);
    if (tamYetkili !== undefined) await sonSahipKontrolu(islem);
    await islem
      .update(yoneticiOturumlari)
      .set({ kapanma_zamani: simdi })
      .where(
        and(
          eq(yoneticiOturumlari.hesap_kimligi, kapanan.kimlik),
          isNull(yoneticiOturumlari.kapanma_zamani),
        ),
      );
    await islem
      .delete(yoneticiGirisAdimlari)
      .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, kapanan.kimlik));
    await degisikligiKaydet(islem, {
      kim,
      islem: "yonetici.kapatildi",
      kayit: { tur: "yonetici", kimlik: kapanan.kimlik },
      eski: { hesap: "acik" },
      yeni: { hesap: "kapali" },
    });
  });
};

// Yeni yöneticiyi tam yetkili rolle açar (kart 0027). Rolsüz yönetici her izinli uçta yetki hatası
// alır ve rol ucu olmadığı için bunu düzeltecek yol kalmaz (karar 0040); bu yüzden hesap ve rol tek
// işlemdedir, rol verilemezse hesap da açılmaz.
export const tamYetkiliYoneticiAc = (
  vt: Veritabani,
  girdi: { eposta: string; sifre: string },
  kim: DegisikligiYapan,
): Promise<{ hesapKimligi: string }> =>
  vt.transaction(async (islem) => {
    const [rol] = await islem
      .select({ kod: roller.kod })
      .from(roller)
      .where(eq(roller.tam_yetki, true))
      .orderBy(roller.kod)
      .limit(1);
    if (rol === undefined) throw new BilinenHata("bulunamadi");
    const { hesapKimligi } = await hesapAc(islem, "yonetici", girdi);
    await rolVer(islem, { yoneticiKimligi: hesapKimligi, rolKodu: rol.kod }, kim);
    return { hesapKimligi };
  });
