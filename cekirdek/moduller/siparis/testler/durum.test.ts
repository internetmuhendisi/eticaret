// Sipariş durumlarının veritabanındaki tanımı kayıtla aynıdır (kart 0234, karar 0146): geçiş tetikleyicisinin
// (siparis_durum_gecisi) izin verdiği her geçiş kayıttaki siparisDurumTanimlari'nın geçişidir, ne eksik ne fazla.
// Kayıtta olmayan geçişin gerçek reddi yonetim.test.ts'tedir.
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { siparisDurumlari, siparisDurumTanimlari } from "../../../kayitlar/siparis.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";

vi.setConfig({ testTimeout: 90_000 });

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

describe("sipariş durumlarının veritabanı tanımı", () => {
  it("geçiş tetikleyicisinin geçişleri kayıtla aynıdır", async () => {
    const deneme = await denemeSitesiAc("siparis-durum");
    temizlenecekler.push(deneme.sil);
    const tanim =
      (
        await deneme.vt.execute<{ tanim: string }>(
          sql`select pg_get_functiondef('siparis_durum_gecisi'::regproc) as tanim`,
        )
      ).rows[0]?.tanim ?? "";
    const tetikleyicide = [...tanim.matchAll(/\('([a-z-]+)', '([a-z-]+)'\)/g)].map(
      ([, onceki, sonraki]) => `${onceki}>${sonraki}`,
    );
    const kayitta = siparisDurumlari.flatMap((durum) =>
      siparisDurumTanimlari[durum].gecis.map((sonraki) => `${durum}>${sonraki}`),
    );
    expect(tetikleyicide.toSorted()).toEqual(kayitta.toSorted());
  });
});
