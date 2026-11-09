// Katalogun açık olduğu yerler (kart 0104): geliştirme ve deneme ortamı. Canlı ve ortamı bilinmeyen kutuda
// kapalıdır. Gerçek görüntüde iki durumu yerel ortam denemesi ölçer (pnpm yerel-ortam-testi).
import { describe, expect, it } from "vitest";
import { siteOrtamiDegiskeni } from "../../kayitlar/site.ts";
import { katalogAcikMi } from "../acik-mi.ts";

describe("katalog nerede açılır", () => {
  it.each<[string, Parameters<typeof katalogAcikMi>[0], boolean]>([
    ["geliştirme sunucusu", { NODE_ENV: "development" }, true],
    ["deneme ortamı", { NODE_ENV: "production", [siteOrtamiDegiskeni]: "deneme" }, true],
    ["canlı ortam", { NODE_ENV: "production", [siteOrtamiDegiskeni]: "canli" }, false],
    ["ortamı bilinmeyen kutu", { NODE_ENV: "production" }, false],
    ["boş ortam", { NODE_ENV: "production", [siteOrtamiDegiskeni]: "" }, false],
    ["büyük harfli yazılış", { NODE_ENV: "production", [siteOrtamiDegiskeni]: "Deneme" }, false],
    ["test süreci", { NODE_ENV: "test" }, false],
  ])("%s", (_ad, ortam, beklenen) => {
    expect(katalogAcikMi(ortam)).toBe(beklenen);
  });
});
