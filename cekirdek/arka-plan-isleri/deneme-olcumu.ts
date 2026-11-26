// Kuyruk denemesinin kendisi (kart 0031, karar 0049); deneme.ts bunu kutunun içinde çalıştırır, testi
// gerçek veritabanı ve gerçek döngüyle testler/deneme-olcumu.test.ts'tedir.
//
// Kuyruk işleri çalışma zamanına göre tek tek alır. Denemenin işlerinden önce sırası gelmiş işler varsa
// (hattın Örnek Mağaza'sında tarayıcı testlerinin bıraktığı e-posta ve bildirim işleri; o testlerde arka
// plan süreci yoktur) süreç önce onları işler ve hatalı işin ikinci denemesi pencereye sığmaz (kart 0328).
// Bu yüzden önce o işlerin bitmesi beklenir, pencere ondan sonra başlar. Pencere dolunca kuyruğun o anki
// hâli de yazılır: bir sonraki düşüşün sebebi çıktıdan okunur.
import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { denemeOlcumuAyari, isDurumu } from "../kayitlar/arka-plan.ts";
import { epostaKayitlari } from "../moduller/eposta/model.ts";
import { epostaGonder } from "../moduller/eposta/servis.ts";
import type { Veritabani } from "../veritabani/baglanti.ts";
import { basariliDenemeIsi, hataliDenemeIsi } from "./isler.ts";
import { isEkle } from "./kuyruk.ts";
import { arkaPlanIsleri } from "./model.ts";

const bekle = (ms: number) => new Promise((coz) => setTimeout(coz, ms));

const veritabaniSaati = async (vt: Veritabani): Promise<Date> => {
  const { rows } = await vt.execute<{ simdi: Date | string }>(sql`select now() as simdi`);
  return new Date(rows[0]?.simdi ?? Date.now());
};

// Sırası gelmiş ve bekleyen ya da şu an bir süreçte çalışan işler. Kilidi dolmuş "çalışıyor" satırı da
// sırası gelmiş iş sayılır: kuyruk onu yeniden alır.
const ondekiler = (sinir: Date) =>
  or(
    and(eq(arkaPlanIsleri.durum, isDurumu.bekliyor), lte(arkaPlanIsleri.calisma_zamani, sinir)),
    eq(arkaPlanIsleri.durum, isDurumu.calisiyor),
  );

const say = async (vt: Veritabani, sinir: Date): Promise<number> => {
  const [satir] = await vt
    .select({ sayi: sql<number>`count(*)::int` })
    .from(arkaPlanIsleri)
    .where(ondekiler(sinir));
  return satir?.sayi ?? 0;
};

// Kuyruğun o anki hâli: sırası gelmiş işlerin türe göre sayısı (en çok beş tür) ve çalışan iş.
const kuyrukOzeti = async (vt: Veritabani): Promise<string> => {
  const simdi = await veritabaniSaati(vt);
  const turler = await vt
    .select({
      tur: arkaPlanIsleri.tur,
      durum: arkaPlanIsleri.durum,
      sayi: sql<number>`count(*)::int`,
    })
    .from(arkaPlanIsleri)
    .where(ondekiler(simdi))
    .groupBy(arkaPlanIsleri.tur, arkaPlanIsleri.durum)
    .orderBy(sql`count(*) desc`)
    .limit(5);
  return turler.length === 0
    ? "bos"
    : turler.map(({ tur, durum, sayi }) => `${tur}:${durum}:${sayi}`).join(" ");
};

export const kuyrukDenemesi = async (
  vt: Veritabani,
  { isaret, epostaAlicisi }: { isaret: string; epostaAlicisi?: string | undefined },
  ayar: typeof denemeOlcumuAyari = denemeOlcumuAyari,
): Promise<string[]> => {
  const satirlar: string[] = [];

  const sinir = await veritabaniSaati(vt);
  const ilkOnde = await say(vt, sinir);
  const ondeBaslangic = Date.now();
  let kalan = ilkOnde;
  while (kalan > 0 && Date.now() - ondeBaslangic < ayar.ondekiSinirMs) {
    await bekle(ayar.aralikMs);
    kalan = await say(vt, sinir);
  }
  satirlar.push(
    `onde=${ilkOnde} ${Math.round((Date.now() - ondeBaslangic) / 1000)} sn${kalan > 0 ? ` kalan ${kalan}` : ""}`,
  );

  const basarili = await isEkle(vt, basariliDenemeIsi, { isaret });
  const hatali = await isEkle(vt, hataliDenemeIsi, { isaret });
  const epostaKaydi = epostaAlicisi
    ? await epostaGonder(vt, { kime: epostaAlicisi, sablon: "deneme" })
    : undefined;
  const epostaIsi = epostaKaydi
    ? (
        await vt
          .select({ kimlik: arkaPlanIsleri.kimlik })
          .from(arkaPlanIsleri)
          .where(sql`${arkaPlanIsleri.girdi}->>'kayitKimligi' = ${epostaKaydi}`)
      )[0]?.kimlik
    : undefined;
  const kimlikler = [basarili, hatali, epostaIsi].filter((kimlik) => typeof kimlik === "string");

  const sonucDurumlari: string[] = [isDurumu.bitti, isDurumu.hata];
  const oku = () =>
    vt.select().from(arkaPlanIsleri).where(inArray(arkaPlanIsleri.kimlik, kimlikler));
  const pencereBaslangic = Date.now();
  let isler = await oku();
  while (
    !isler.every((is) => sonucDurumlari.includes(is.durum)) &&
    Date.now() - pencereBaslangic < ayar.pencereMs
  ) {
    await bekle(ayar.aralikMs);
    isler = await oku();
  }
  for (const [ad, kimlik] of [
    ["basarili", basarili],
    ["hatali", hatali],
  ] as const) {
    const is = isler.find((satir) => satir.kimlik === kimlik);
    satirlar.push(`${ad}=${is?.durum ?? "yok"} ${is?.deneme_sayisi ?? 0}`);
  }
  if (epostaKaydi) {
    const [kayit] = await vt
      .select({ durum: epostaKayitlari.durum })
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.kimlik, epostaKaydi));
    satirlar.push(`eposta=${kayit?.durum ?? "yok"}`);
  }
  if (!isler.every((is) => sonucDurumlari.includes(is.durum))) {
    satirlar.push(`kuyruk=${await kuyrukOzeti(vt)}`);
  }
  if (epostaKaydi) await vt.delete(epostaKayitlari).where(eq(epostaKayitlari.kimlik, epostaKaydi));
  await vt.delete(arkaPlanIsleri).where(inArray(arkaPlanIsleri.kimlik, kimlikler));
  return satirlar;
};
