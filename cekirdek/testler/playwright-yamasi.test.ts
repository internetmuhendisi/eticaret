// Playwright'ın "networkidle" yarışına yama (kart 0203, karar 0130). Yamasız Playwright'ta sinyal bir kez verildikten
// sonra başlayıp biten istek zamanlayıcıyı yeniden kurmuyor, geç gelen domcontentloaded/load olayı sinyali silince
// sinyal bir daha hiç gelmiyordu: yavaş işlemcide sayfaHazir 60 saniye bekleyip düşüyordu (ölçüldü). Bu test testlerin
// kullandığı Playwright'ta yamanın durduğunu ölçer. Playwright yükseltilince yama uygulanmaz ya da bu test düşer:
// yeni sürümde yarışın düzelip düzelmediği o zaman yeniden ölçülür.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const kok = join(import.meta.dirname, "..", "..");

// Testlerin çalıştırdığı playwright-core: @playwright/test → playwright → playwright-core zinciriyle çözülür.
const playwrightCekirdegi = () => {
  const iste = createRequire(join(kok, "package.json"));
  const testPaketi = dirname(iste.resolve("@playwright/test/package.json"));
  const playwright = dirname(
    createRequire(join(testPaketi, "package.json")).resolve("playwright/package.json"),
  );
  return dirname(
    createRequire(join(playwright, "package.json")).resolve("playwright-core/package.json"),
  );
};

// Zamanlayıcıyı kuran işlevin gövdesi; "networkidle" verilmişken erken dönüyorsa yarış vardır. Denetim bugünkü
// yazılışı arar: yeni sürümde koşul başka biçimde yazılırsa sürüm satırı düşer ve kaynak yeniden okunur.
const zamanlayiciGovdesi = (kaynak: string) => {
  const bas = kaynak.indexOf("_startNetworkIdleTimer() {");
  if (bas === -1) throw new Error("_startNetworkIdleTimer bulunamadı");
  const son = kaynak.indexOf("\n      }", bas);
  if (son === -1) throw new Error("_startNetworkIdleTimer gövdesinin sonu bulunamadı");
  return kaynak.slice(bas, son);
};
const yarisVar = (kaynak: string) =>
  /if \([^)]*_firedLifecycleEvents\.has\("networkidle"\)/.test(zamanlayiciGovdesi(kaynak));

describe("Playwright networkidle yaması", () => {
  it("bozuk örnek: yamasız gövde yarışlı sayılır, yamalı gövde sayılmaz", () => {
    const yamasiz = `_startNetworkIdleTimer() {
        assert(!this._networkIdleTimer);
        if (this._firedLifecycleEvents.has("networkidle") || this._detachedScope.isClosed())
          return;
      }`;
    const yamali = `_startNetworkIdleTimer() {
        assert(!this._networkIdleTimer);
        if (this._detachedScope.isClosed())
          return;
      }`;
    expect(yarisVar(yamasiz)).toBe(true);
    expect(yarisVar(yamali)).toBe(false);
  });

  it("testlerin kullandığı playwright-core yamalı ve sürümü yama kaydıyla aynı", () => {
    const klasor = playwrightCekirdegi();
    const { version } = JSON.parse(readFileSync(join(klasor, "package.json"), "utf8")) as {
      version: string;
    };
    expect(readFileSync(join(kok, "pnpm-workspace.yaml"), "utf8")).toContain(
      `playwright-core@${version}: yamalar/playwright-core@${version}.patch`,
    );
    expect(yarisVar(readFileSync(join(klasor, "lib", "coreBundle.js"), "utf8"))).toBe(false);
  });
});
