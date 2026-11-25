// Yöneticilerin rolleri ve izin sorusu (kart 0026, karar 0040). Kod rol adına bakmaz: tek soru
// "bu yöneticide bu izin var mı" sorusudur. Bu servisi çağıran uç, izni kapıda beyan eder.
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, gt, inArray, isNotNull, isNull, max, or } from "drizzle-orm";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import type { GirisIzni } from "../../kayitlar/izinler.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { hesapAc } from "../oturum/servis.ts";
import { sifreOzetle } from "../oturum/sifre.ts";
import { baslangicRolleri } from "./baslangic-rolleri.ts";
import {
  rolIzinleri,
  roller,
  yoneticiDavetleri,
  yoneticiGirisAdimlari,
  yoneticiIkiAsama,
  yoneticiler,
  yoneticiOturumlari,
  yoneticiRolleri,
  yoneticiSifreSifirlamalari,
  yoneticiYedekKodlari,
} from "./model.ts";

// Her istekte çalışır: rol alınınca erişim bir sonraki istekte kesilir.
export const yoneticininIzniVarMi = async (
  vt: Veritabani | VeritabaniIslemi,
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
export const tamYetkiliRolleriKilitle = (islem: VeritabaniIslemi) =>
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

// Tam yetkili rolün (mağaza sahibi) silinmemiş yöneticilerinin e-postaları (kart 0241: yönetici bildirimlerinin
// varsayılan alıcıları). Rol adı kodda geçmez: rol tam yetkisiyle seçilir.
export const tamYetkiliYoneticiEpostalari = async (vt: Veritabani): Promise<string[]> => {
  const satirlar = await vt
    .selectDistinct({ eposta: yoneticiler.eposta })
    .from(yoneticiRolleri)
    .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
    .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiRolleri.yonetici_kimligi))
    .where(and(eq(roller.tam_yetki, true), isNull(yoneticiler.silinme_zamani)))
    .orderBy(yoneticiler.eposta);
  return satirlar.map((satir) => satir.eposta);
};

// Hata fırlarsa işlem geri alınır, yapılan değişiklik yerine döner.
const sonSahipKontrolu = async (islem: VeritabaniIslemi): Promise<void> => {
  const [kalan] = await islem
    .select({ sayi: count() })
    .from(yoneticiRolleri)
    .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
    .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiRolleri.yonetici_kimligi))
    .where(and(eq(roller.tam_yetki, true), isNull(yoneticiler.silinme_zamani)));
  if ((kalan?.sayi ?? 0) === 0) {
    throw new BilinenHata("is-kurali", [{ alan: "yonetici", kod: "son-sahip" }]);
  }
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

// Panelden yapılan işlem yöneticinin kendi hesabına yapılamaz (kart 0274): kendi rolünü, hesabını ve iki aşamalı
// girişini değiştiren yönetici kendini dışarıda bırakabilirdi. Sunucu komutu (sistem) bu kurala bağlı değildir.
const kendiHesabiDegil = (kim: DegisikligiYapan, yoneticiKimligi: string) => {
  if (kim.tur === "yonetici" && kim.kimlik === yoneticiKimligi) {
    throw new BilinenHata("is-kurali", [{ alan: "yonetici", kod: "kendi-hesabi" }]);
  }
};

// İşi yapan yöneticinin izni, tam yetkili rollerin kilidinden sonra işlemin içinde yeniden sorulur (bağımsız
// kontrolün bulgusu, kart 0274): kapıdan geçip kilidi bekleyen istek, o arada izni alınmışsa iş yapmaz.
export const izniniDenetle = async (
  islem: VeritabaniIslemi,
  kim: DegisikligiYapan,
  izin: GirisIzni<"yonetici">,
) => {
  if (kim.tur !== "yonetici") return;
  if (!(await yoneticininIzniVarMi(islem, kim.kimlik, izin))) throw new BilinenHata("yetki");
};

// Bekleyen davetin koşulu (kart 0275): kullanılmamış, geri alınmamış, süresi dolmamış.
export const bekleyenDavetKosulu = (simdi: Date) =>
  and(
    isNull(yoneticiDavetleri.kullanilma_zamani),
    isNull(yoneticiDavetleri.geri_alinma_zamani),
    gt(yoneticiDavetleri.bitis, simdi),
  );

// Hesabı kapanan yöneticinin gönderdiği bekleyen davetler geri alınmış sayılır; her biri kayda girer.
const gonderdigiDavetleriDusur = async (
  islem: VeritabaniIslemi,
  yoneticiKimligi: string,
  kim: DegisikligiYapan,
) => {
  const simdi = new Date();
  const dusenler = await islem
    .update(yoneticiDavetleri)
    .set({ geri_alinma_zamani: simdi })
    .where(and(eq(yoneticiDavetleri.davet_eden, yoneticiKimligi), bekleyenDavetKosulu(simdi)))
    .returning({ kimlik: yoneticiDavetleri.kimlik });
  for (const davet of dusenler.toSorted((a, b) => a.kimlik.localeCompare(b.kimlik))) {
    await degisikligiKaydet(islem, {
      kim,
      islem: "yonetici-daveti.geri-alindi",
      kayit: { tur: "yonetici-daveti", kimlik: davet.kimlik },
      eski: { davet: "bekliyor" },
      yeni: { davet: "geri-alindi" },
    });
  }
};

// Yöneticinin giriş hesabını kapatır: giremez, açık oturumu ve yarım girişi hemen geçersiz olur. Tam
// yetkili son yöneticinin hesabı kapatılamaz; rolAl ile aynı kilidi alır, ikisi aynı anda geçemez.
export const yoneticiHesabiKapat = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { yoneticiKimligi: string },
  kim: DegisikligiYapan,
): Promise<void> => {
  kendiHesabiDegil(kim, girdi.yoneticiKimligi);
  await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    await izniniDenetle(islem, kim, "ekip.hesap-kapat");
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
    // Kapanan hesabın gönderdiği bekleyen davetler düşer (kart 0275): ekipte olmayan kişinin bağlantısı açık kalmaz.
    await gonderdigiDavetleriDusur(islem, kapanan.kimlik, kim);
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

// Yöneticinin rollerini verilen listeye getirir (kart 0274): eksik rol verilir, fazlası alınır, tek işlemde ve yetki
// işlemlerinin ortak kilidiyle. Tam yetkili son yöneticinin tam yetkili rolü alınamaz (son-sahip); yönetici kendi
// rollerini değiştiremez (kendi-hesabi); en az bir rol kalır (rol-gerekli: rolsüz yönetici hiçbir şey yapamaz, hesap
// kapatılır). Her değişiklik bir kayıttır; aynı liste hiçbir şey yazmaz.
export const rolleriAyarla = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { yoneticiKimligi: string; roller: readonly string[] },
  kim: DegisikligiYapan,
): Promise<void> => {
  kendiHesabiDegil(kim, girdi.yoneticiKimligi);
  const istenen = [...new Set(girdi.roller)];
  if (istenen.length === 0) {
    throw new BilinenHata("dogrulama", [{ alan: "roller", kod: "rol-gerekli" }]);
  }
  await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    await izniniDenetle(islem, kim, "ekip.rol-ata");
    const [yonetici] = await islem
      .select({ kimlik: yoneticiler.kimlik })
      .from(yoneticiler)
      .where(
        and(eq(yoneticiler.kimlik, girdi.yoneticiKimligi), isNull(yoneticiler.silinme_zamani)),
      );
    if (yonetici === undefined) throw new BilinenHata("bulunamadi");
    const tumRoller = await islem
      .select({ kimlik: roller.kimlik, kod: roller.kod, tamYetki: roller.tam_yetki })
      .from(roller);
    const rolu = new Map(tumRoller.map((rol) => [rol.kod, rol]));
    if (istenen.some((kod) => !rolu.has(kod))) {
      throw new BilinenHata("dogrulama", [{ alan: "roller", kod: "rol-yok" }]);
    }
    const mevcut = await islem
      .select({ kod: roller.kod, kimlik: roller.kimlik, tamYetki: roller.tam_yetki })
      .from(yoneticiRolleri)
      .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
      .where(eq(yoneticiRolleri.yonetici_kimligi, yonetici.kimlik));
    const mevcutKodlar = new Set(mevcut.map((rol) => rol.kod));
    const verilecek = istenen.filter((kod) => !mevcutKodlar.has(kod)).sort();
    const alinacak = mevcut.filter((rol) => !istenen.includes(rol.kod));
    if (verilecek.length === 0 && alinacak.length === 0) return;
    for (const kod of verilecek) {
      await islem
        .insert(yoneticiRolleri)
        .values({ yonetici_kimligi: yonetici.kimlik, rol_kimligi: rolu.get(kod)?.kimlik ?? "" });
      await degisikligiKaydet(islem, {
        kim,
        islem: "rol.verildi",
        kayit: { tur: "yonetici", kimlik: yonetici.kimlik },
        eski: null,
        yeni: { rol: kod },
      });
    }
    if (alinacak.length > 0) {
      await islem.delete(yoneticiRolleri).where(
        and(
          eq(yoneticiRolleri.yonetici_kimligi, yonetici.kimlik),
          inArray(
            yoneticiRolleri.rol_kimligi,
            alinacak.map((rol) => rol.kimlik),
          ),
        ),
      );
      if (alinacak.some((rol) => rol.tamYetki)) await sonSahipKontrolu(islem);
      for (const rol of alinacak.toSorted((a, b) => a.kod.localeCompare(b.kod))) {
        await degisikligiKaydet(islem, {
          kim,
          islem: "rol.alindi",
          kayit: { tur: "yonetici", kimlik: yonetici.kimlik },
          eski: { rol: rol.kod },
          yeni: null,
        });
      }
    }
  });
};

// Telefonunu ve yedek kodlarını kaybeden yöneticinin iki aşamalı girişini ve şifresini sıfırlar (kartlar 0053, 0274):
// kurulum, yedek kodlar, ara adımlar, açık şifre bağlantıları ve açık oturumlar silinir, eski şifre geçmez; yönetici
// yeni şifreyi bağlantıyla koyar, sonra girişte kurulum ekranına düşer; eski kodlar geçmez. Yönetici kendisininkini sıfırlayamaz. Kurulumu olmayan yöneticide (kurulu-degil) bir şey yapılmaz.
// Sıra: önce ara adımlar silinir. Aynı anda onaylanmakta olan bir kurulum ya da kod girişi adımın satırını kilitlidir:
// silme onun bitmesini bekler, sonra onun yazdığını (kurulum, oturum, yedek kodlar) da siler. Yönetici satırı
// FOR NO KEY UPDATE ile kilitlenir: bekleyen giriş oturum ya da yedek kod eklerken bu satırın bağ kilidini (KEY SHARE)
// ister; FOR UPDATE onunla çakışıp iki işlemi kilitlenmeye sokardı (bağımsız kontrolün bulgusu).
export const ikiAsamaliGirisiSifirla = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { yoneticiKimligi: string },
  kim: DegisikligiYapan,
): Promise<void> => {
  // Şifre de sıfırlanır (kullanıcı kararı, karar 0178): telefonla birlikte çalınan şifre işe yaramasın. Yerine kimsenin
  // bilmediği rastgele bir şifrenin özeti yazılır; yönetici yeni şifreyi sıfırlama bağlantısıyla koyar. Özet
  // işlemden önce hesaplanır (yavaştır, kilit tutulurken beklenmesin).
  const bilinmeyenSifre = await sifreOzetle(randomBytes(32).toString("base64url"));
  kendiHesabiDegil(kim, girdi.yoneticiKimligi);
  await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    await izniniDenetle(islem, kim, "ekip.iki-asama-sifirla");
    const [yonetici] = await islem
      .select({ kimlik: yoneticiler.kimlik })
      .from(yoneticiler)
      .where(and(eq(yoneticiler.kimlik, girdi.yoneticiKimligi), isNull(yoneticiler.silinme_zamani)))
      .for("no key update");
    if (yonetici === undefined) throw new BilinenHata("bulunamadi");
    await islem
      .delete(yoneticiGirisAdimlari)
      .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, yonetici.kimlik));
    const silinen = await islem
      .delete(yoneticiIkiAsama)
      .where(eq(yoneticiIkiAsama.yonetici_kimligi, yonetici.kimlik))
      .returning({ kimlik: yoneticiIkiAsama.yonetici_kimligi });
    if (silinen.length === 0) {
      throw new BilinenHata("is-kurali", [{ alan: "yonetici", kod: "kurulu-degil" }]);
    }
    await islem
      .delete(yoneticiYedekKodlari)
      .where(eq(yoneticiYedekKodlari.yonetici_kimligi, yonetici.kimlik));
    await islem
      .update(yoneticiler)
      .set({ sifre_ozeti: bilinmeyenSifre, guncellenme_zamani: new Date() })
      .where(eq(yoneticiler.kimlik, yonetici.kimlik));
    await islem
      .delete(yoneticiSifreSifirlamalari)
      .where(eq(yoneticiSifreSifirlamalari.hesap_kimligi, yonetici.kimlik));
    await islem
      .update(yoneticiOturumlari)
      .set({ kapanma_zamani: new Date() })
      .where(
        and(
          eq(yoneticiOturumlari.hesap_kimligi, yonetici.kimlik),
          isNull(yoneticiOturumlari.kapanma_zamani),
        ),
      );
    await degisikligiKaydet(islem, {
      kim,
      islem: "yonetici.iki-asama-sifirlandi",
      kayit: { tur: "yonetici", kimlik: yonetici.kimlik },
      eski: { ikiAsama: "kurulu", giris: "acik" },
      yeni: { ikiAsama: "kurulu-degil", giris: "yeni-baglanti-gerekli" },
    });
  });
};

// Panelin ekip listesi ve ayrıntısı (kart 0274): silinmemiş yöneticiler e-postaya göre, rolleri (kod), iki aşamalı
// girişin kurulu olup olmadığı ve son girişi (iki aşamadan geçmiş son oturumun açıldığı an). Tek sorguyla rolleri,
// tek sorguyla son girişleri okur.
export type EkipUyesi = {
  kimlik: string;
  eposta: string;
  // Davetle gelen yöneticinin adı (kart 0275); sunucudan açılan hesapta null.
  ad: string | null;
  roller: string[];
  ikiAsamaKurulu: boolean;
  sonGiris: Date | null;
  olusturulma: Date;
};

export const ekibiOku = async (
  vt: Veritabani,
  { kimlik }: { kimlik?: string } = {},
): Promise<EkipUyesi[]> => {
  const uyeler = await vt
    .select({
      kimlik: yoneticiler.kimlik,
      eposta: yoneticiler.eposta,
      ad: yoneticiler.ad,
      olusturulma: yoneticiler.olusturulma_zamani,
      ikiAsama: yoneticiIkiAsama.yonetici_kimligi,
    })
    .from(yoneticiler)
    .leftJoin(yoneticiIkiAsama, eq(yoneticiIkiAsama.yonetici_kimligi, yoneticiler.kimlik))
    .where(
      and(
        isNull(yoneticiler.silinme_zamani),
        kimlik === undefined ? undefined : eq(yoneticiler.kimlik, kimlik),
      ),
    )
    .orderBy(asc(yoneticiler.eposta));
  if (uyeler.length === 0) return [];
  const kimlikler = uyeler.map((uye) => uye.kimlik);
  const [rolSatirlari, girisler] = await Promise.all([
    vt
      .select({ yonetici: yoneticiRolleri.yonetici_kimligi, kod: roller.kod })
      .from(yoneticiRolleri)
      .innerJoin(roller, eq(roller.kimlik, yoneticiRolleri.rol_kimligi))
      .where(inArray(yoneticiRolleri.yonetici_kimligi, kimlikler))
      .orderBy(asc(roller.kod)),
    vt
      .select({
        yonetici: yoneticiOturumlari.hesap_kimligi,
        son: max(yoneticiOturumlari.olusturulma_zamani),
      })
      .from(yoneticiOturumlari)
      .where(
        and(
          inArray(yoneticiOturumlari.hesap_kimligi, kimlikler),
          isNotNull(yoneticiOturumlari.iki_asama_zamani),
        ),
      )
      .groupBy(yoneticiOturumlari.hesap_kimligi),
  ]);
  const sonGirisi = new Map(girisler.map((satir) => [satir.yonetici, satir.son]));
  return uyeler.map((uye) => ({
    kimlik: uye.kimlik,
    eposta: uye.eposta,
    ad: uye.ad,
    roller: rolSatirlari.filter((satir) => satir.yonetici === uye.kimlik).map((satir) => satir.kod),
    ikiAsamaKurulu: uye.ikiAsama !== null,
    sonGiris: sonGirisi.get(uye.kimlik) ?? null,
    olusturulma: uye.olusturulma,
  }));
};

// Rollerin ekrandaki sırası hazır rollerin tanım sırasıdır (taslak: mağaza sahibi, görevli, sipariş görevlisi, içerik
// editörü); tanımda olmayan rol sona.
const rolSirasi = (kod: string): number => {
  const sira = Object.keys(baslangicRolleri).indexOf(kod);
  return sira === -1 ? Number.MAX_SAFE_INTEGER : sira;
};

// Hazır roller ve izinleri, tanım sırasıyla (panelin roller tablosu ve rol seçimi).
export const rolleriOku = async (
  vt: Veritabani,
): Promise<{ kod: string; tamYetki: boolean; izinler: string[] }[]> => {
  const [satirlar, izinSatirlari] = await Promise.all([
    vt.select({ kimlik: roller.kimlik, kod: roller.kod, tamYetki: roller.tam_yetki }).from(roller),
    vt.select({ rol: rolIzinleri.rol_kimligi, izin: rolIzinleri.izin }).from(rolIzinleri),
  ]);
  return satirlar
    .map((rol) => ({
      kod: rol.kod,
      tamYetki: rol.tamYetki,
      izinler: izinSatirlari.filter((satir) => satir.rol === rol.kimlik).map((satir) => satir.izin),
    }))
    .toSorted((a, b) => rolSirasi(a.kod) - rolSirasi(b.kod) || a.kod.localeCompare(b.kod));
};
