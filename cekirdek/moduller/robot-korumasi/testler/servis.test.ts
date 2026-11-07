// Robot koruması: doğru cevap bir kez geçer, öteki her şey reddedilir (kart 0033, karar 0051).
import { afterEach, describe, expect, it, vi } from "vitest";
import { robotKorumasiAyari } from "../../../kayitlar/robot-korumasi.ts";
import { robotCevabiniDogrula, robotSorusuUret } from "../servis.ts";
import { soruyuCoz } from "./soru-coz.ts";

const reddedilir = (cevap: string) =>
  expect(robotCevabiniDogrula(cevap)).rejects.toMatchObject({ kod: "robot-dogrulamasi" });

afterEach(() => vi.useRealTimers());

describe("robot koruması", () => {
  it("doğru cevap geçer, aynı cevap ikinci kez geçmez", async () => {
    const cevap = await soruyuCoz(await robotSorusuUret());
    await expect(robotCevabiniDogrula(cevap)).resolves.toBeUndefined();
    await reddedilir(cevap);
  });

  it("aynı cevapla aynı anda giden isteklerden yalnız biri geçer", async () => {
    const cevap = await soruyuCoz(await robotSorusuUret());
    const sonuclar = await Promise.allSettled([
      robotCevabiniDogrula(cevap),
      robotCevabiniDogrula(cevap),
      robotCevabiniDogrula(cevap),
    ]);
    expect(sonuclar.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
  });

  it("işi yapmadan uydurulan çözüm geçmez", async () => {
    const soru = await robotSorusuUret();
    await reddedilir(JSON.stringify({ soru, cozum: { counter: 1, derivedKey: "00".repeat(32) } }));
  });

  it("soruyu kolaylaştırmak imzayı bozar", async () => {
    const cevap = JSON.parse(await soruyuCoz(await robotSorusuUret()));
    cevap.soru.parameters.cost = 1;
    await reddedilir(JSON.stringify(cevap));
  });

  it("imzasız soru geçmez", async () => {
    const cevap = JSON.parse(await soruyuCoz(await robotSorusuUret()));
    delete cevap.soru.signature;
    await reddedilir(JSON.stringify(cevap));
  });

  it("başka sürecin anahtarıyla üretilmiş soru geçmez", async () => {
    const cevap = await soruyuCoz(await robotSorusuUret());
    const yer = Symbol.for("cekirdek.robot-korumasi");
    const kok = globalThis as unknown as Record<symbol, unknown>;
    const eski = kok[yer];
    delete kok[yer];
    try {
      await reddedilir(cevap);
    } finally {
      kok[yer] = eski;
    }
  });

  it("süresi dolan cevap geçmez", async () => {
    const cevap = await soruyuCoz(await robotSorusuUret());
    vi.useFakeTimers({ now: Date.now() + (robotKorumasiAyari.sureSaniye + 1) * 1000 });
    await reddedilir(cevap);
  });

  it.each(["", "metin", "{}", "null", '{"soru":{},"cozum":{}}'])(
    "bozuk cevap hata vermeden reddedilir: %s",
    async (cevap) => {
      await reddedilir(cevap);
    },
  );

  it("doğru cevabın yeri ayarlanan aralıktadır", async () => {
    const { enAzDeneme, enCokDeneme } = robotKorumasiAyari;
    for (let tur = 0; tur < 5; tur++) {
      const { cozum } = JSON.parse(await soruyuCoz(await robotSorusuUret()));
      expect(cozum.counter).toBeGreaterThanOrEqual(enAzDeneme);
      expect(cozum.counter).toBeLessThanOrEqual(enCokDeneme);
    }
  });

  it("cevap şemanın sınırına sığar", async () => {
    const cevap = await soruyuCoz(await robotSorusuUret());
    expect(cevap.length).toBeLessThan(robotKorumasiAyari.cevapUzunlugu);
  });
});
