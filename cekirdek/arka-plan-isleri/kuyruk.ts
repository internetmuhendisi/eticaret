// Kuyruğun veritabanı işlemleri (kart 0031, karar 0049). Bir iş veritabanında kilitlenerek alınır:
// iki süreç aynı işi aynı anda alamaz. Süreç iş bitmeden ölürse kilit süresi dolunca iş yeniden
// alınır, bu yüzden dış servise giden iş kendi kimliğiyle tekrarı önlemelidir (isKimligi).
import { randomUUID } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import type { z } from "zod";
import { metniMaskele } from "../izleme/maskele.ts";
import { isDurumu, type KuyrukAyari, kuyrukAyari } from "../kayitlar/arka-plan.ts";
import type { Veritabani, VeritabaniIslemi } from "../veritabani/baglanti.ts";
import { arkaPlanIsleri } from "./model.ts";

export type IsBaglami = {
  vt: Veritabani;
  // Her denemede aynıdır: dış servise tekrar anahtarı olarak verilir.
  isKimligi: string;
  deneme: number;
  // İş süresi dolunca ya da süreç kapanırken tetiklenir.
  sinyal: AbortSignal;
};

export type IsTanimi<Girdi = unknown> = {
  tur: string;
  enCokDeneme: number;
  ilkGecikmeSaniye: number;
  girdiyiDogrula: (girdi: unknown) => Girdi;
  calistir: (girdi: unknown, baglam: IsBaglami) => Promise<void>;
};

export const isTanimla = <Sema extends z.ZodType>(tanim: {
  tur: string;
  sema: Sema;
  calistir: (girdi: z.output<Sema>, baglam: IsBaglami) => Promise<void>;
  enCokDeneme?: number;
  ilkGecikmeSaniye?: number;
}): IsTanimi<z.input<Sema>> => ({
  tur: tanim.tur,
  enCokDeneme: tanim.enCokDeneme ?? kuyrukAyari.enCokDeneme,
  ilkGecikmeSaniye: tanim.ilkGecikmeSaniye ?? kuyrukAyari.ilkGecikmeSaniye,
  girdiyiDogrula: (girdi) => tanim.sema.parse(girdi) as z.input<Sema>,
  // Girdi kuyruktan okunurken de doğrulanır: tablodaki satır eski bir sürümden kalmış olabilir.
  calistir: (girdi, baglam) => tanim.calistir(tanim.sema.parse(girdi), baglam),
});

// Yazan bir işlemin içinden çağrılırsa iş, işlemle birlikte girer ya da hiç girmez. Tekillik anahtarı
// daha önce kullanılmışsa iş girmez, null döner.
export const isEkle = async <Girdi>(
  vt: Veritabani | VeritabaniIslemi,
  tanim: IsTanimi<Girdi>,
  girdi: Girdi,
  secenekler: { tekillikAnahtari?: string; gecikmeSaniye?: number } = {},
): Promise<string | null> => {
  const [satir] = await vt
    .insert(arkaPlanIsleri)
    .values({
      tur: tanim.tur,
      girdi: tanim.girdiyiDogrula(girdi),
      durum: isDurumu.bekliyor,
      en_cok_deneme: tanim.enCokDeneme,
      calisma_zamani: new Date(Date.now() + (secenekler.gecikmeSaniye ?? 0) * 1000),
      tekillik_anahtari: secenekler.tekillikAnahtari,
    })
    .onConflictDoNothing({ target: arkaPlanIsleri.tekillik_anahtari })
    .returning({ kimlik: arkaPlanIsleri.kimlik });
  return satir?.kimlik ?? null;
};

export type AlinanIs = {
  kimlik: string;
  tur: string;
  girdi: unknown;
  deneme_sayisi: number;
  en_cok_deneme: number;
};

export const sahipUret = (): string => randomUUID();

// Sıradaki işi kilitleyerek alır. Yalnız bu sürümün tanıdığı türler alınır: yayın sırasında eski ve
// yeni süreç bir süre birlikte çalışır. SKIP LOCKED başka sürecin aldığı satırı atlar.
export const isAl = async (
  vt: Veritabani,
  turler: readonly string[],
  sahip: string,
  kilitSaniye: number = kuyrukAyari.kilitSaniye,
): Promise<AlinanIs | undefined> => {
  if (turler.length === 0) return undefined;
  const { rows } = await vt.execute<AlinanIs>(sql`
    update arka_plan_isleri
    set durum = ${isDurumu.calisiyor},
        deneme_sayisi = deneme_sayisi + 1,
        kilit_sahibi = ${sahip},
        kilit_bitis = now() + make_interval(secs => ${kilitSaniye})
    where kimlik = (
      select kimlik from arka_plan_isleri
      where tur in ${turler}
        and ((durum = ${isDurumu.bekliyor} and calisma_zamani <= now())
          or (durum = ${isDurumu.calisiyor} and kilit_bitis <= now()))
      order by calisma_zamani
      for update skip locked
      limit 1
    )
    returning kimlik, tur, girdi, deneme_sayisi, en_cok_deneme`);
  return rows[0];
};

const sahipliIs = (is: AlinanIs, sahip: string) =>
  and(
    eq(arkaPlanIsleri.kimlik, is.kimlik),
    eq(arkaPlanIsleri.kilit_sahibi, sahip),
    eq(arkaPlanIsleri.durum, isDurumu.calisiyor),
  );

const kilitsiz = { kilit_sahibi: null, kilit_bitis: null };

// Dönen değer: sonuç yazıldı mı. Yazılmadıysa kilit başka sürece geçmiştir.
export const isiBitir = async (vt: Veritabani, is: AlinanIs, sahip: string): Promise<boolean> => {
  const guncellenen = await vt
    .update(arkaPlanIsleri)
    .set({ durum: isDurumu.bitti, bitis_zamani: new Date(), son_hata: null, ...kilitsiz })
    .where(sahipliIs(is, sahip))
    .returning({ kimlik: arkaPlanIsleri.kimlik });
  return guncellenen.length > 0;
};

// Süreç kapanırken yarıda bırakılan iş sıraya döner, deneme hakkı yenmez: kapanış işin hatası değildir.
export const isiBirak = async (vt: Veritabani, is: AlinanIs, sahip: string): Promise<void> => {
  await vt
    .update(arkaPlanIsleri)
    .set({
      durum: isDurumu.bekliyor,
      deneme_sayisi: is.deneme_sayisi - 1,
      calisma_zamani: new Date(),
      ...kilitsiz,
    })
    .where(sahipliIs(is, sahip));
};

export const hataOzeti = (hata: unknown): string =>
  metniMaskele(hata instanceof Error ? hata.message : String(hata)).slice(
    0,
    kuyrukAyari.hataOzetiUzunlugu,
  );

export const yenidenDenemeGecikmesi = (
  ilkGecikmeSaniye: number,
  deneme: number,
  enUzun: number = kuyrukAyari.enUzunGecikmeSaniye,
): number => Math.min(ilkGecikmeSaniye * 2 ** (deneme - 1), enUzun);

// Deneme hakkı bitmişse iş hata olarak kalır. Kilidi başka sürece geçmiş işin sonucu yazılmaz.
export const isiBasarisizYap = async (
  vt: Veritabani,
  is: AlinanIs,
  sahip: string,
  hata: unknown,
  ilkGecikmeSaniye: number,
  ayar: Pick<KuyrukAyari, "enUzunGecikmeSaniye"> = kuyrukAyari,
): Promise<"yeniden" | "hata" | "kayip"> => {
  const sonDeneme = is.deneme_sayisi >= is.en_cok_deneme;
  const gecikme = yenidenDenemeGecikmesi(
    ilkGecikmeSaniye,
    is.deneme_sayisi,
    ayar.enUzunGecikmeSaniye,
  );
  const guncellenen = await vt
    .update(arkaPlanIsleri)
    .set({
      son_hata: hataOzeti(hata),
      ...kilitsiz,
      ...(sonDeneme
        ? { durum: isDurumu.hata, bitis_zamani: new Date() }
        : {
            durum: isDurumu.bekliyor,
            calisma_zamani: new Date(Date.now() + gecikme * 1000),
          }),
    })
    .where(sahipliIs(is, sahip))
    .returning({ kimlik: arkaPlanIsleri.kimlik });
  if (guncellenen.length === 0) return "kayip";
  return sonDeneme ? "hata" : "yeniden";
};

export const bitenIsleriSil = async (
  vt: Veritabani,
  gun: number = kuyrukAyari.bitenSaklamaGun,
): Promise<number> => {
  const silinenler = await vt
    .delete(arkaPlanIsleri)
    .where(
      and(
        eq(arkaPlanIsleri.durum, isDurumu.bitti),
        lt(arkaPlanIsleri.bitis_zamani, new Date(Date.now() - gun * 86_400_000)),
      ),
    )
    .returning({ kimlik: arkaPlanIsleri.kimlik });
  return silinenler.length;
};
