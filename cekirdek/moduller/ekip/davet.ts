// Ekibe davet (kart 0275, karar 0179). Mağaza sahibi e-posta ve rollerle davet gönderir; bağlantının anahtarı rastgele
// üretilir, veritabanında yalnız özeti durur, 3 gün geçerli ve tek kullanımlıktır (karar 0157). Davetle gelen kişi adını
// ve şifresini koyar; hesap davetin rolleriyle açılır ve kişi aynı işlemde açılan ara adımla iki aşamalı girişin
// kurulumuna geçer (karar 0044: oturum yalnız kurulumdan sonra açılır).
//
// Bütün yazımlar yetki işlemlerinin ortak kilidini (tam yetkili rollerin satırları) alır: davet, geri alma, kabul ve
// daveti gönderenin hesabının kapatılması birbirini bekler. Kullanılmış, süresi dolmuş, geri alınmış ve uydurma bağlantı
// aynı cevabı alır ("is-kurali").
import { randomBytes } from "node:crypto";
import { and, asc, count, eq, inArray, isNull, lt } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteAdresi } from "../../ayar-semasi/site-adresi.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { davetAyari } from "../../kayitlar/oturum.ts";
import type { MetinAnahtari } from "../../metinler/metin.ts";
import { metin } from "../../metinler/site-metni.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import { epostaGonder } from "../eposta/servis.ts";
import { girisAdimiYaz } from "../oturum/iki-asamali-giris.ts";
import { epostaSemasi } from "../oturum/semalar.ts";
import { anahtarOzeti } from "../oturum/servis.ts";
import { anahtarParametresi } from "../oturum/sifirlama-adresleri.ts";
import { sifreOzetle } from "../oturum/sifre.ts";
import {
  roller,
  yoneticiDavetleri,
  yoneticiDavetRolleri,
  yoneticiler,
  yoneticiRolleri,
} from "./model.ts";
import {
  bekleyenDavetKosulu,
  izniniDenetle,
  tamYetkiliRolleriKilitle,
  yoneticininIzniVarMi,
} from "./servis.ts";

type Yonetici = { tur: "yonetici"; kimlik: string };

const gunMs = 24 * 60 * 60 * 1000;

// Rol adları sitenin dilinde, virgülle (e-postanın ve kabul sayfasının metni).
export const rolAdlari = (kodlar: readonly string[]): string =>
  kodlar.map((kod) => metin(`yonetim.rol.${kod}` as MetinAnahtari)).join(", ");

const isKurali = (alan: string, kod: string) => new BilinenHata("is-kurali", [{ alan, kod }]);

// Davet gönderir; bağlantıyı bir kez döndürür (panel kişiye iletmek için gösterir) ve e-postasını kuyruğa koyar.
// Kurallar: e-posta ekipte olmamalı (ekipte), aynı e-postanın bekleyen daveti olmamalı (davet-var), sitede en çok
// bekleyenSiniri davet bekler (davet-siniri), roller kayıtta olmalı (rol-yok) ve tam yetkili olmamalı (tam-yetki).
export const davetGonder = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { eposta: string; roller: readonly string[]; yenilemeYolu: string },
  kim: Yonetici,
): Promise<{ kimlik: string; baglanti: string }> => {
  const eposta = epostaSemasi.safeParse(girdi.eposta);
  if (!eposta.success) {
    throw new BilinenHata("dogrulama", [{ alan: "eposta", kod: "eposta-gecersiz" }]);
  }
  const istenen = [...new Set(girdi.roller)].sort();
  if (istenen.length === 0) {
    throw new BilinenHata("dogrulama", [{ alan: "roller", kod: "rol-gerekli" }]);
  }
  const adres = siteAdresi(calisanSite().kimlik);
  if (adres === undefined) throw isKurali("davet", "adres-yok");
  const anahtar = randomBytes(32).toString("base64url");
  const baglanti = `${adres}${girdi.yenilemeYolu}#${anahtarParametresi}=${anahtar}`;

  const kimlik = await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    await izniniDenetle(islem, kim, "ekip.davet-et");
    const tumRoller = await islem
      .select({ kimlik: roller.kimlik, kod: roller.kod, tamYetki: roller.tam_yetki })
      .from(roller);
    const rolu = new Map(tumRoller.map((rol) => [rol.kod, rol]));
    if (istenen.some((kod) => !rolu.has(kod))) {
      throw new BilinenHata("dogrulama", [{ alan: "roller", kod: "rol-yok" }]);
    }
    if (istenen.some((kod) => rolu.get(kod)?.tamYetki)) throw isKurali("roller", "tam-yetki");

    const [ekipte] = await islem
      .select({ kimlik: yoneticiler.kimlik })
      .from(yoneticiler)
      .where(and(eq(yoneticiler.eposta, eposta.data), isNull(yoneticiler.silinme_zamani)));
    if (ekipte !== undefined) throw isKurali("eposta", "ekipte");
    const simdi = new Date();
    const [ayni] = await islem
      .select({ kimlik: yoneticiDavetleri.kimlik })
      .from(yoneticiDavetleri)
      .where(and(eq(yoneticiDavetleri.eposta, eposta.data), bekleyenDavetKosulu(simdi)));
    if (ayni !== undefined) throw isKurali("eposta", "davet-var");
    const [bekleyen] = await islem
      .select({ sayi: count() })
      .from(yoneticiDavetleri)
      .where(bekleyenDavetKosulu(simdi));
    if ((bekleyen?.sayi ?? 0) >= davetAyari.bekleyenSiniri) {
      throw isKurali("davet", "davet-siniri");
    }

    const [davet] = await islem
      .insert(yoneticiDavetleri)
      .values({
        eposta: eposta.data,
        anahtar_ozeti: anahtarOzeti(anahtar),
        davet_eden: kim.kimlik,
        bitis: new Date(simdi.getTime() + davetAyari.gecerlilikGun * gunMs),
      })
      .returning({ kimlik: yoneticiDavetleri.kimlik });
    if (davet === undefined) throw new Error("Davet yazılamadı.");
    await islem.insert(yoneticiDavetRolleri).values(
      istenen.map((kod) => ({
        davet_kimligi: davet.kimlik,
        rol_kimligi: rolu.get(kod)?.kimlik ?? "",
      })),
    );
    await degisikligiKaydet(islem, {
      kim,
      islem: "yonetici-daveti.gonderildi",
      kayit: { tur: "yonetici-daveti", kimlik: davet.kimlik },
      eski: null,
      yeni: { roller: istenen },
    });
    await epostaGonder(islem, {
      kime: eposta.data,
      sablon: "yonetici-daveti",
      degiskenler: {
        baglanti,
        gun: String(davetAyari.gecerlilikGun),
        roller: rolAdlari(istenen),
      },
    });
    return davet.kimlik;
  });
  gunluk.bilgi("Ekibe davet gönderildi.", { eposta: eposta.data });
  return { kimlik, baglanti };
};

// Bekleyen daveti geri alır; bağlantı hemen geçersiz olur. Bekleyen değilse (kabul edilmiş, geri alınmış, süresi
// dolmuş, olmayan) bulunamadı.
export const davetiGeriAl = async (
  vt: Pick<Veritabani, "transaction">,
  girdi: { kimlik: string },
  kim: Yonetici,
): Promise<void> => {
  await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    await izniniDenetle(islem, kim, "ekip.davet-et");
    const simdi = new Date();
    const [alinan] = await islem
      .update(yoneticiDavetleri)
      .set({ geri_alinma_zamani: simdi })
      .where(and(eq(yoneticiDavetleri.kimlik, girdi.kimlik), bekleyenDavetKosulu(simdi)))
      .returning({ kimlik: yoneticiDavetleri.kimlik });
    if (alinan === undefined) throw new BilinenHata("bulunamadi");
    await degisikligiKaydet(islem, {
      kim,
      islem: "yonetici-daveti.geri-alindi",
      kayit: { tur: "yonetici-daveti", kimlik: alinan.kimlik },
      eski: { davet: "bekliyor" },
      yeni: { davet: "geri-alindi" },
    });
  });
};

export type BekleyenDavet = { kimlik: string; eposta: string; roller: string[]; bitis: Date };

// Ekip ekranının bekleyen davetleri, e-postaya göre; roller tek sorguyla.
export const bekleyenDavetler = async (vt: Veritabani): Promise<BekleyenDavet[]> => {
  const davetler = await vt
    .select({
      kimlik: yoneticiDavetleri.kimlik,
      eposta: yoneticiDavetleri.eposta,
      bitis: yoneticiDavetleri.bitis,
    })
    .from(yoneticiDavetleri)
    .where(bekleyenDavetKosulu(new Date()))
    .orderBy(asc(yoneticiDavetleri.eposta), asc(yoneticiDavetleri.kimlik));
  if (davetler.length === 0) return [];
  const rolSatirlari = await davetinRolleri(
    vt,
    davetler.map((davet) => davet.kimlik),
  );
  return davetler.map((davet) => ({
    ...davet,
    roller: rolSatirlari.filter((satir) => satir.davet === davet.kimlik).map((satir) => satir.kod),
  }));
};

const davetinRolleri = (vt: Veritabani | VeritabaniIslemi, kimlikler: string[]) =>
  vt
    .select({ davet: yoneticiDavetRolleri.davet_kimligi, kod: roller.kod })
    .from(yoneticiDavetRolleri)
    .innerJoin(roller, eq(roller.kimlik, yoneticiDavetRolleri.rol_kimligi))
    .where(inArray(yoneticiDavetRolleri.davet_kimligi, kimlikler))
    .orderBy(asc(roller.kod));

// Bağlantının davetini bulur: bekliyorsa, daveti gönderenin hesabı açıksa ve gönderen hâlâ davet edebiliyorsa (rolü
// alınan kişinin bekleyen davetleri zaten düşer; bu ikinci katmandır).
const gecerliDavet = async (vt: Veritabani | VeritabaniIslemi, anahtar: string) => {
  const bulunan = await bekleyenDavet(vt, anahtar);
  if (bulunan === undefined) return undefined;
  return (await yoneticininIzniVarMi(vt, bulunan.davetEden, "ekip.davet-et")) ? bulunan : undefined;
};

const bekleyenDavet = async (vt: Veritabani | VeritabaniIslemi, anahtar: string) => {
  const [bulunan] = await vt
    .select({
      kimlik: yoneticiDavetleri.kimlik,
      eposta: yoneticiDavetleri.eposta,
      davetEden: yoneticiDavetleri.davet_eden,
    })
    .from(yoneticiDavetleri)
    .innerJoin(yoneticiler, eq(yoneticiler.kimlik, yoneticiDavetleri.davet_eden))
    .where(
      and(
        eq(yoneticiDavetleri.anahtar_ozeti, anahtarOzeti(anahtar)),
        bekleyenDavetKosulu(new Date()),
        isNull(yoneticiler.silinme_zamani),
      ),
    );
  return bulunan;
};

// Kabul sayfasının bilgisi: davet edilen e-posta ve roller. Geçersiz bağlantıda "is-kurali".
export const davetiOku = async (
  vt: Veritabani,
  anahtar: string,
): Promise<{ eposta: string; roller: string[] }> => {
  const davet = await gecerliDavet(vt, anahtar);
  if (davet === undefined) throw new BilinenHata("is-kurali");
  const rolSatirlari = await davetinRolleri(vt, [davet.kimlik]);
  return { eposta: davet.eposta, roller: rolSatirlari.map((satir) => satir.kod) };
};

// Daveti kabul eder: hesap adı, şifresi ve davetin rolleriyle açılır, bağlantı harcanır, iki aşamalı girişin kurulumu
// için ara adım açılır (anahtarı çereze yazılır). Aynı anda iki kabulden biri geçer. E-postayla açık bir hesap varsa
// (davetten sonra sunucudan açılmış) hesap-var; davet harcanmaz.
export const davetiKabulEt = async (
  vt: Veritabani,
  girdi: { anahtar: string; ad: string; sifre: string },
): Promise<{ hesapKimligi: string; adimAnahtari: string }> => {
  // Uydurma anahtar şifre özetleme yükünü çalıştırmasın.
  if ((await gecerliDavet(vt, girdi.anahtar)) === undefined) throw new BilinenHata("is-kurali");
  // Özet işlemden önce hesaplanır: yavaştır, ortak kilit tutulurken beklenmesin.
  const sifreOzeti = await sifreOzetle(girdi.sifre);
  const adimAnahtari = randomBytes(32).toString("base64url");
  const hesapKimligi = await vt.transaction(async (islem) => {
    await tamYetkiliRolleriKilitle(islem);
    // Kilitten sonra yeniden okunur: o arada geri alınmış, kabul edilmiş ya da göndereni kapatılmış olabilir.
    const davet = await gecerliDavet(islem, girdi.anahtar);
    if (davet === undefined) throw new BilinenHata("is-kurali");
    const [acilan] = await islem
      .insert(yoneticiler)
      .values({ eposta: davet.eposta, ad: girdi.ad, sifre_ozeti: sifreOzeti })
      .onConflictDoNothing()
      .returning({ kimlik: yoneticiler.kimlik });
    if (acilan === undefined) throw isKurali("eposta", "hesap-var");
    const simdi = new Date();
    const [harcanan] = await islem
      .update(yoneticiDavetleri)
      .set({ kullanilma_zamani: simdi, yonetici_kimligi: acilan.kimlik })
      .where(and(eq(yoneticiDavetleri.kimlik, davet.kimlik), bekleyenDavetKosulu(simdi)))
      .returning({ kimlik: yoneticiDavetleri.kimlik });
    if (harcanan === undefined) throw new BilinenHata("is-kurali");
    const rolSatirlari = await islem
      .select({ rol: yoneticiDavetRolleri.rol_kimligi, kod: roller.kod })
      .from(yoneticiDavetRolleri)
      .innerJoin(roller, eq(roller.kimlik, yoneticiDavetRolleri.rol_kimligi))
      .where(eq(yoneticiDavetRolleri.davet_kimligi, davet.kimlik))
      .orderBy(asc(roller.kod));
    await islem
      .insert(yoneticiRolleri)
      .values(
        rolSatirlari.map((satir) => ({ yonetici_kimligi: acilan.kimlik, rol_kimligi: satir.rol })),
      );
    // Rolleri daveti gönderen verdi: yetki değişikliği onun adıyla kayda girer.
    for (const satir of rolSatirlari) {
      await degisikligiKaydet(islem, {
        kim: { tur: "yonetici", kimlik: davet.davetEden },
        islem: "rol.verildi",
        kayit: { tur: "yonetici", kimlik: acilan.kimlik },
        eski: null,
        yeni: { rol: satir.kod },
      });
    }
    await degisikligiKaydet(islem, {
      kim: { tur: "yonetici", kimlik: acilan.kimlik },
      islem: "yonetici-daveti.kabul-edildi",
      kayit: { tur: "yonetici-daveti", kimlik: davet.kimlik },
      eski: { davet: "bekliyor" },
      yeni: { davet: "kabul-edildi", yonetici: acilan.kimlik },
    });
    await girisAdimiYaz(islem, acilan.kimlik, adimAnahtari);
    return acilan.kimlik;
  });
  gunluk.bilgi("Ekibe davet kabul edildi.", { hesapKimligi });
  return { hesapKimligi, adimAnahtari };
};

// Süresi dolduktan sonra saklamaGun gün geçen davetler silinir (e-posta kişisel veridir); rolleri satırla gider. Kabul edilen
// davetin hesabı ve kayıtları kalır.
export const davetTemizligi = async (vt: Veritabani): Promise<number> => {
  const sinir = new Date(Date.now() - davetAyari.saklamaGun * gunMs);
  const silinen = await vt
    .delete(yoneticiDavetleri)
    .where(lt(yoneticiDavetleri.bitis, sinir))
    .returning({ kimlik: yoneticiDavetleri.kimlik });
  return silinen.length;
};
