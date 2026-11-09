// Arka plan süreci açılırken sitenin başlangıç kataloğunu yazar (kart 0084, karar 0070): gerçek süreç,
// gerçek veritabanı ve örnek site klasörüyle. Kataloğun kuralları cekirdek/moduller/urun/testler/
// baslangic.test.ts'dedir; burada yalnız açılışın onu çağırdığı ve kuyruğun yine çalıştığı denenir.
// Başlangıç menüleri (kart 0107) katalogdan sonra yazılır; katalog yazılamazsa menüler de yazılmaz.
import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { count, eq } from "drizzle-orm";
import { afterEach, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { isDurumu } from "../../kayitlar/arka-plan.ts";
import { menuler } from "../../moduller/menu/model.ts";
import { urunler } from "../../moduller/urun/model.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { basariliDenemeIsi } from "../isler.ts";
import { isEkle } from "../kuyruk.ts";
import { arkaPlanIsleri } from "../model.ts";

const ornekSite = join(
  import.meta.dirname,
  "..",
  "..",
  "ayar-semasi",
  "testler",
  "ornek-siteler",
  "menu-dolu",
);

const kapatilacaklar: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const kapat of kapatilacaklar.splice(0).toReversed()) await kapat();
});

const surecAc = (baglantiAdresi: string): { surec: ChildProcess; cikti: () => string } => {
  let cikti = "";
  const surec = spawn(process.execPath, [join(import.meta.dirname, "..", "surec.ts")], {
    env: { ...process.env, VERITABANI_ADRESI: baglantiAdresi, SITE_KLASORU: ornekSite },
    stdio: ["ignore", "pipe", "pipe"],
  });
  surec.stdout?.on("data", (parca: Buffer) => {
    cikti += parca.toString();
  });
  surec.stderr?.on("data", (parca: Buffer) => {
    cikti += parca.toString();
  });
  kapatilacaklar.push(
    () =>
      new Promise((coz) => {
        if (surec.exitCode !== null) return coz();
        surec.once("close", () => coz());
        surec.kill("SIGTERM");
      }),
  );
  return { surec, cikti: () => cikti };
};

const bekle = async (kosul: () => Promise<boolean>, sure: number) => {
  const son = Date.now() + sure;
  while (Date.now() < son) {
    if (await kosul()) return true;
    await new Promise((coz) => setTimeout(coz, 200));
  }
  return false;
};

it("açılışta katalog bir kez yazılır, ikinci açılış bir şey değiştirmez", async () => {
  const site = await denemeSitesiAc("katalog-acilis");
  kapatilacaklar.push(site.sil);
  const urunSayisi = async () => (await site.vt.select({ sayi: count() }).from(urunler))[0]?.sayi;

  const birinci = surecAc(site.baglantiAdresi);
  const yazildi = await bekle(
    async () => birinci.cikti().includes("başlangıç kataloğu yazıldı"),
    30_000,
  );
  expect(yazildi, birinci.cikti()).toBe(true);
  expect(await urunSayisi()).toBe(2);
  const menuSayisi = async () => (await site.vt.select({ sayi: count() }).from(menuler))[0]?.sayi;
  expect(
    await bekle(async () => birinci.cikti().includes("başlangıç menüleri yazıldı"), 30_000),
    birinci.cikti(),
  ).toBe(true);
  expect(await menuSayisi()).toBe(3);
  // Katalogdan sonra kuyruk çalışır: süreç açık kalır.
  expect(birinci.surec.exitCode).toBeNull();

  const ikinci = surecAc(site.baglantiAdresi);
  // İkinci süreç kataloğa bakıp geçtiğini günlüğe yazar; ürün sayısı aynıdır.
  const gecti = await bekle(
    async () => ikinci.cikti().includes("başlangıç kataloğu yazılmadı"),
    30_000,
  );
  expect(gecti, ikinci.cikti()).toBe(true);
  expect(ikinci.cikti()).not.toContain("başlangıç kataloğu yazıldı");
  expect(await urunSayisi()).toBe(2);
  expect(
    await bekle(async () => ikinci.cikti().includes("başlangıç menüleri yazılmadı"), 30_000),
    ikinci.cikti(),
  ).toBe(true);
  expect(await menuSayisi()).toBe(3);
}, 90_000);

it("katalog yazılamazsa hata kaydedilir, hiçbir parçası kalmaz, süreç açık kalır", async () => {
  const site = await denemeSitesiAc("katalog-acilis");
  kapatilacaklar.push(site.sil);
  // Ürünlerin vergi sınıfı veritabanında silinmiş: katalog yazılamaz.
  const vergi = siteninVergiServisi(siteKlasorunuOku(ornekSite));
  const [genel] = await vergi.tabloyuOku(site.vt);
  if (genel === undefined) throw new Error("Vergi sınıfı yok.");
  await vergi.sinifSil(site.vt, { tur: "sistem", ad: "deneme" }, genel.kimlik);

  const surec = surecAc(site.baglantiAdresi);
  const kaydedildi = await bekle(async () => surec.cikti().includes("vergi sınıfı yok"), 30_000);
  expect(kaydedildi, surec.cikti()).toBe(true);
  // Kuyruk yine çalışır: hatadan sonra konan iş biter, süreç açık kalır.
  const kimlik = await isEkle(site.vt, basariliDenemeIsi, { isaret: "katalogacilisdenemesi" });
  if (kimlik === null) throw new Error("İş eklenemedi.");
  const bitti = await bekle(async () => {
    const [is] = await site.vt
      .select({ durum: arkaPlanIsleri.durum })
      .from(arkaPlanIsleri)
      .where(eq(arkaPlanIsleri.kimlik, kimlik));
    return is?.durum === isDurumu.bitti;
  }, 30_000);
  expect(bitti, surec.cikti()).toBe(true);
  expect(surec.surec.exitCode).toBeNull();
  expect((await site.vt.select({ sayi: count() }).from(urunler))[0]?.sayi).toBe(0);
  // Menüler kataloğa bağlanır: katalog yazılamayınca denenmez, sonraki açılışta ikisi birlikte denenir.
  expect((await site.vt.select({ sayi: count() }).from(menuler))[0]?.sayi).toBe(0);
  expect(surec.cikti()).not.toContain("başlangıç menüleri");
}, 90_000);
