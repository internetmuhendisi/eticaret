// Aynı iş iki kez yapılmaz (kart 0031, karar 0049): iki ayrı süreç aynı kuyruğu gerçek veritabanında
// aynı anda boşaltır.
import { spawn } from "node:child_process";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { isDurumu } from "../../kayitlar/arka-plan.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { isEkle, isTanimla } from "../kuyruk.ts";
import { arkaPlanIsleri } from "../model.ts";

type Site = Awaited<ReturnType<typeof denemeSitesiAc>>;
let site: Site;
const isSayisi = 300;
const yarisIsi = isTanimla({ tur: "yaris", sema: z.object({}), calistir: async () => {} });

const surecCalistir = (baglantiAdresi: string, sahip: string): Promise<number | null> =>
  new Promise((coz, reddet) => {
    const surec = spawn(process.execPath, [join(import.meta.dirname, "yarisan-surec.ts")], {
      env: { ...process.env, VERITABANI_ADRESI: baglantiAdresi, SAHIP: sahip },
      stdio: ["ignore", "ignore", "inherit"],
    });
    surec.on("error", reddet);
    surec.on("close", coz);
  });

beforeAll(async () => {
  site = await denemeSitesiAc("kuyruk");
  await site.vt.execute(
    sql`create table yarisan_kayitlar (is_kimligi uuid not null, sahip text not null)`,
  );
}, 60_000);

afterAll(async () => {
  await site?.sil();
}, 60_000);

describe("iki süreç", () => {
  it("aynı anda çalışırken her iş yalnız bir kez yapılır, ikisi de iş alır", async () => {
    await Promise.all(Array.from({ length: isSayisi }, () => isEkle(site.vt, yarisIsi, {})));
    const kodlar = await Promise.all([
      surecCalistir(site.baglantiAdresi, "birinci"),
      surecCalistir(site.baglantiAdresi, "ikinci"),
    ]);
    expect(kodlar).toEqual([0, 0]);

    const { rows } = await site.vt.execute<{ is_kimligi: string; sahip: string }>(
      sql`select is_kimligi, sahip from yarisan_kayitlar`,
    );
    expect(rows.length).toBe(isSayisi);
    expect(new Set(rows.map((satir) => satir.is_kimligi)).size).toBe(isSayisi);
    expect(new Set(rows.map((satir) => satir.sahip))).toEqual(new Set(["birinci", "ikinci"]));
    const bitenler = await site.vt
      .select({ kimlik: arkaPlanIsleri.kimlik, deneme: arkaPlanIsleri.deneme_sayisi })
      .from(arkaPlanIsleri)
      .where(eq(arkaPlanIsleri.durum, isDurumu.bitti));
    expect(bitenler.length).toBe(isSayisi);
    expect(bitenler.every((is) => is.deneme === 1)).toBe(true);
  }, 120_000);
});
