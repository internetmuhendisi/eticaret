// Tarayıcı testlerinin sunucu günlüğü (kart 0226): sorgu kısmının değerleri gitmez, adları kalır; renk kodları
// silinir; her satır yazıldığı anla başlar; gerçek süreçte dosya her çalışmada baştan yazılır ve son satır da
// dosyada olur. Hattın ayarı dosyayı düşen testlerin iziyle saklar.
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { gunlukSatiri, satiriTemizle, sunucuGunluguYolu } from "../sunucu-gunlugu.mts";

const kok = join(import.meta.dirname, "..", "..");
const betik = join(kok, "komutlar", "sunucu-gunlugu.mts");
const klasorler: string[] = [];
afterAll(() => {
  for (const klasor of klasorler) rmSync(klasor, { recursive: true, force: true });
});

const esc = String.fromCharCode(27);

describe("sunucu günlüğünün satırı", () => {
  it("istek satırında sorgu değerleri silinir, adları ve süreler kalır", () => {
    expect(
      satiriTemizle(
        " GET /urun-listesi?ara=gizli-metin&b=orta&sirala 200 in 46ms (next.js: 1.0ms, application-code: 45ms)",
      ),
    ).toBe(
      " GET /urun-listesi?ara=…&b=…&sirala 200 in 46ms (next.js: 1.0ms, application-code: 45ms)",
    );
  });

  it("günlüğün JSON satırındaki ve tam adresteki sorgu değerleri de silinir", () => {
    const satir = satiriTemizle(
      '{"mesaj":"x","alanlar":{"adres":"http://localhost:3000/yonetim/giris?donus=%2Fyonetim%2Fekip"}}',
    );
    expect(satir).toBe(
      '{"mesaj":"x","alanlar":{"adres":"http://localhost:3000/yonetim/giris?donus=…"}}',
    );
    expect(satir).not.toContain("ekip");
  });

  it("sorgusuz satır ve cümle sonundaki soru işareti değişmez", () => {
    const satir =
      " POST /kapi/yonetici/elle-siparis 200 in 4.4s (next.js: 3.4s, application-code: 1.0s)";
    expect(satiriTemizle(satir)).toBe(satir);
    expect(satiriTemizle("Sayfa bulunamadı? Yeniden dene")).toBe("Sayfa bulunamadı? Yeniden dene");
  });

  it("tek tırnaklı sorgu değeri de silinir", () => {
    expect(satiriTemizle(" GET /arama?ara=it's-gizli 200 in 5ms")).toBe(
      " GET /arama?ara=… 200 in 5ms",
    );
  });

  it("renk kodları silinir", () => {
    expect(satiriTemizle(`${esc}[37m${esc}[1m○${esc}[22m${esc}[39m Compiling / ...`)).toBe(
      "○ Compiling / ...",
    );
  });

  it("satır yazıldığı anın Unix saniyesiyle başlar", () => {
    expect(gunlukSatiri(1795588217302, " GET /?a=1 200 in 5ms")).toBe(
      "1795588217.302  GET /?a=… 200 in 5ms\n",
    );
  });

  it("dosya kayıt dışı klasördedir", () => {
    expect(sunucuGunluguYolu).toBe(join(kok, "sunucu", "olusan", "tarayici-sunucu-gunlugu.log"));
    expect(readFileSync(join(kok, ".gitignore"), "utf8").split("\n")).toContain("sunucu/olusan/");
  });
});

describe("sunucu günlüğünün süreci", () => {
  it("girdiyi satır satır dosyaya yazar, dosyayı baştan yazar, son satırı da yazar", () => {
    const klasor = mkdtempSync(join(tmpdir(), "sunucu-gunlugu-"));
    klasorler.push(klasor);
    const dosya = join(klasor, "alt", "gunluk.log");
    const once = Date.now() / 1000;
    execFileSync(process.execPath, [betik, dosya], { input: "birinci?a=1\nikinci\nson" });
    execFileSync(process.execPath, [betik, dosya], { input: " GET /x?ara=gizli 200 in 3ms\nson" });
    const satirlar = readFileSync(dosya, "utf8").trimEnd().split("\n");
    expect(satirlar.map((satir) => satir.replace(/^\S+ /, ""))).toEqual([
      " GET /x?ara=… 200 in 3ms",
      "son",
    ]);
    for (const satir of satirlar) {
      const an = Number(satir.split(" ")[0]);
      expect(an).toBeGreaterThanOrEqual(Math.floor(once));
      expect(an).toBeLessThanOrEqual(Date.now() / 1000 + 1);
    }
  });

  it("hattın ayarı dosyayı düşen testlerin iziyle saklar", () => {
    const hat = readFileSync(join(kok, ".github", "workflows", "kontrol-hatti.yml"), "utf8");
    const adim = hat.slice(hat.indexOf("name: Düşen tarayıcı testlerinin izi"));
    const yol = adim.slice(adim.indexOf("path:"), adim.indexOf("retention-days:"));
    expect(yol).toContain("test-results/");
    expect(yol).toContain("sunucu/olusan/tarayici-sunucu-gunlugu.log");
  });

  // Kart 0251 (karar 0184): asıl aşamanın sunucusu canlı derlemedir, geliştirme aşamasınınki geliştirme sunucusudur.
  it("tarayıcı testlerinin iki aşamasının sunucusu satırlarını bu betiğe verir", () => {
    const ayar = readFileSync(join(kok, "playwright.config.ts"), "utf8");
    expect(ayar).toContain(
      'command: "node komutlar/tarayici-sunucusu.mts | node komutlar/sunucu-gunlugu.mts"',
    );
    const gelistirme = readFileSync(join(kok, "playwright.gelistirme.config.ts"), "utf8");
    expect(gelistirme).toContain('command: "pnpm cekirdek | node komutlar/sunucu-gunlugu.mts"');
  });
});

// Dosya açılamazsa günlük olmadan sürülür (bağımsız kontrolün bulgusu): uyarı hata akışına bir kez yazılır, girdi
// sonuna kadar okunur (sunucunun çıkışı kırılmaz), süreç girdi bitince hata koduyla biter.
describe("sunucu günlüğünün hatası", () => {
  it("dosya açılamazsa uyarır, girdiyi sonuna kadar okur, sonra hata koduyla biter", async () => {
    const klasor = mkdtempSync(join(tmpdir(), "sunucu-gunlugu-"));
    klasorler.push(klasor);
    // Klasörün yerinde düz dosya var: altına yazılamaz.
    const klasorYerineDosya = join(klasor, "dosya");
    writeFileSync(klasorYerineDosya, "");
    const surec = spawn(process.execPath, [betik, join(klasorYerineDosya, "alt.log")], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let hataAkisi = "";
    surec.stderr.on("data", (parca: Buffer) => {
      hataAkisi += parca.toString();
    });
    const bitti = new Promise<number | null>((coz) => surec.on("close", coz));
    for (let i = 0; i < 5; i++) {
      surec.stdin.write(`satir ${i}\n`);
      await new Promise((coz) => setTimeout(coz, 100));
      expect(surec.exitCode, "girdi bitmeden süreç çıkmamalı").toBeNull();
    }
    surec.stdin.end();
    expect(await bitti).toBe(1);
    expect(hataAkisi.match(/Sunucu günlüğü yazılamıyor/g)).toHaveLength(1);
  });
});
