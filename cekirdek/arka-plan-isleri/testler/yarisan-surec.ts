// İki gerçek sürecin yarışı için test süreci (iki-surec.test.ts çalıştırır). Kuyruk boşalana kadar
// çalışır, yaptığı her işi yarisan_kayitlar tablosuna yazar. Ortam: VERITABANI_ADRESI, SAHIP.
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { isDurumu, kuyrukAyari } from "../../kayitlar/arka-plan.ts";
import { baglan } from "../../veritabani/baglanti.ts";
import { calistiriciKur } from "../calistirici.ts";
import { isTanimla } from "../kuyruk.ts";
import { arkaPlanIsleri } from "../model.ts";

const { VERITABANI_ADRESI: adres, SAHIP: sahip } = process.env;
if (!adres || !sahip) throw new Error("VERITABANI_ADRESI ve SAHIP gerekli.");
const vt = baglan(adres);

const yarisIsi = isTanimla({
  tur: "yaris",
  sema: z.object({}),
  calistir: async (_, { isKimligi }) => {
    await vt.execute(
      sql`insert into yarisan_kayitlar (is_kimligi, sahip) values (${isKimligi}, ${sahip})`,
    );
    await new Promise((coz) => setTimeout(coz, 2));
  },
});

// İki süreç de hazır olmadan iş alınmaz: geç başlayan süreç yarışı kaçırmasın.
await vt.execute(sql`insert into yarisan_hazir (sahip) values (${sahip})`);
for (;;) {
  const { rows } = await vt.execute<{ sayi: number }>(
    sql`select count(*)::int as sayi from yarisan_hazir`,
  );
  if (rows[0]?.sayi === 2) break;
  await new Promise((coz) => setTimeout(coz, 10));
}

const durdur = new AbortController();
const denetim = setInterval(async () => {
  const kalan = await vt
    .select({ kimlik: arkaPlanIsleri.kimlik })
    .from(arkaPlanIsleri)
    .where(eq(arkaPlanIsleri.durum, isDurumu.bekliyor))
    .limit(1);
  if (kalan.length === 0) durdur.abort();
}, 50);

await calistiriciKur({
  vt,
  isler: [yarisIsi],
  sahip,
  ayar: { ...kuyrukAyari, bosBeklemeMs: 10 },
}).dongu(durdur.signal);
clearInterval(denetim);
await vt.$client.end();
