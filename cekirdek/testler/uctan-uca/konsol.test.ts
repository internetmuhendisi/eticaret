// Konsol denetiminin kendisi (kart 0123): hidrasyon uyarısı uyarı seviyesinde de, hata seviyesinde de yakalanır ve
// ayıklanamaz; sıradan uyarı sayılmaz, beklenen hata ayıklanır, yakalanmamış hata sayılır. İletiler sayfanın kendi
// konsoluna gerçek tarayıcıda yazdırılır (bozuk örnekler).
import { expect, test } from "@playwright/test";
import { katalogAdresi } from "../../katalog/kayit";
import { hidrasyonUyarisiMi, konsoluDinle } from "./konsol";
import { sayfaHazir } from "./sayfa-hazir";

// React 19 ve Next.js'in hidrasyon iletilerinden örnekler.
const hidrasyonIletileri = [
  "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up.",
  "Hydration failed because the server rendered HTML didn't match the client.",
  'Warning: Prop `style` did not match. Server: "opacity:0" Client: "opacity:0;width:24px"',
  'Text content did not match. Server: "a" Client: "b"',
  "An error occurred during hydration. The server HTML was replaced with client content.",
];

test("hidrasyon iletileri tanınır, sıradan iletiler tanınmaz", () => {
  for (const ileti of hidrasyonIletileri) expect(hidrasyonUyarisiMi(ileti), ileti).toBe(true);
  for (const ileti of [
    "[HMR] connected",
    "Failed to load resource: 401",
    "Download the React DevTools",
  ]) {
    expect(hidrasyonUyarisiMi(ileti), ileti).toBe(false);
  }
});

test("bozuk örnekler: hidrasyon uyarısı uyarı ve hata seviyesinde yakalanır, ayıklanamaz", async ({
  page,
}) => {
  const hatalar = konsoluDinle(page, {
    haric: (metin) => metin.includes("401") || metin.includes("hydrated"),
  });
  await page.goto(`${katalogAdresi}/onay-kutusu`);
  await sayfaHazir(page);
  expect(hatalar).toEqual([]);
  await page.evaluate((iletiler) => {
    // Bozuk örnekler tarayıcıda sayfanın kendi konsoluna yazılır: bu dosya doğrudan konsol kuralından muaftır
    // (biome.json), tıpkı cekirdek/izleme/testler/konsol.test.ts gibi.
    console.warn(iletiler[0]);
    console.error(iletiler[1]);
    console.info(iletiler[3]);
    console.warn("Sıradan bir uyarı");
    console.error(
      "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
    );
    console.error("Beklenmeyen bir hata");
    setTimeout(() => {
      throw new Error("Yakalanmamış hata");
    });
  }, hidrasyonIletileri);
  await expect.poll(() => hatalar.length).toBe(5);
  expect(hatalar).toEqual([
    `warning: ${hidrasyonIletileri[0]}`,
    `error: ${hidrasyonIletileri[1]}`,
    `info: ${hidrasyonIletileri[3]}`,
    "Beklenmeyen bir hata",
    "Yakalanmamış hata",
  ]);
});
