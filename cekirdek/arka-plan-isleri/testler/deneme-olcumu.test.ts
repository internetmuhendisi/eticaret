// Kuyruk denemesi gerçek veritabanı ve gerçek döngüyle (kart 0328). Denemenin önünde sırası gelmiş işler
// varken (hattın Örnek Mağaza'sında tarayıcı testlerinin bıraktığı işler) süreç önce onları işler: beklemeden
// başlayan pencere hatalı işin ikinci denemesine yetmez. Deneme önce onların bitmesini bekler.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { hataIzlemeAraciniBagla } from "../../izleme/hata-katmani.ts";
import { denemeOlcumuAyari, kuyrukAyari } from "../../kayitlar/arka-plan.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { calistiriciKur } from "../calistirici.ts";
import { kuyrukDenemesi } from "../deneme-olcumu.ts";
import { basariliDenemeIsi, hataliDenemeIsi } from "../isler.ts";
import { isEkle, isTanimla } from "../kuyruk.ts";
import { arkaPlanIsleri } from "../model.ts";

type Site = Awaited<ReturnType<typeof denemeSitesiAc>>;
let site: Site;
let vt: Veritabani;
let durdur: AbortController;
let dongu: Promise<void>;

// Önde bekleyen iş: her biri bir süre sürer. Altısı, aşağıdaki pencereden uzundur.
const yavasMs = 700;
const ondekiSayi = 6;
const pencereMs = 3_000;
const yavasIs = isTanimla({
  tur: "deneme-yavas",
  sema: z.object({}),
  calistir: () => new Promise<void>((coz) => setTimeout(coz, yavasMs)),
});

beforeAll(async () => {
  site = await denemeSitesiAc("kuyrukdenemesi");
  vt = site.vt;
}, 60_000);
afterAll(async () => {
  await site?.sil();
}, 60_000);
beforeEach(async () => {
  hataIzlemeAraciniBagla(() => {});
  await vt.delete(arkaPlanIsleri);
  // Süreç kapalıyken birikmiş işler: sırası gelmiş, denemenin işlerinden önce alınır.
  for (let i = 0; i < ondekiSayi; i++) {
    await isEkle(vt, yavasIs, {}, { gecikmeSaniye: -60 });
  }
  durdur = new AbortController();
  dongu = calistiriciKur({
    vt,
    isler: [yavasIs, basariliDenemeIsi, hataliDenemeIsi],
    ayar: { ...kuyrukAyari, bosBeklemeMs: 10 },
  }).dongu(durdur.signal);
});
afterEach(async () => {
  durdur.abort();
  await dongu;
  hataIzlemeAraciniBagla(undefined);
});

describe("kuyruk denemesi", () => {
  it("önündeki işler beklenmezse hatalı işin ikinci denemesi pencereye sığmaz, kuyruğun hâli yazılır", async () => {
    const satirlar = await kuyrukDenemesi(
      vt,
      { isaret: "denemeolcumuonde" },
      { ...denemeOlcumuAyari, ondekiSinirMs: 0, pencereMs, aralikMs: 100 },
    );
    expect(satirlar[0]).toBe(`onde=${ondekiSayi} 0 sn kalan ${ondekiSayi}`);
    expect(satirlar).not.toContain("hatali=hata 2");
    expect(satirlar.find((satir) => satir.startsWith("kuyruk="))).toMatch(/deneme-/);
  }, 30_000);

  it("önündeki işlerin bitmesi beklenince pencere yeter; sonunda yalnız kendi satırlarını siler", async () => {
    const satirlar = await kuyrukDenemesi(
      vt,
      { isaret: "denemeolcumubekler" },
      { ...denemeOlcumuAyari, ondekiSinirMs: 30_000, pencereMs, aralikMs: 100 },
    );
    expect(satirlar[0]).toMatch(new RegExp(`^onde=${ondekiSayi} \\d+ sn$`));
    expect(satirlar.slice(1)).toEqual(["basarili=bitti 1", "hatali=hata 2"]);
    const kalanlar = await vt.select({ tur: arkaPlanIsleri.tur }).from(arkaPlanIsleri);
    expect(kalanlar.map(({ tur }) => tur)).toEqual(Array(ondekiSayi).fill(yavasIs.tur));
  }, 60_000);
});
