// Sunucuda yönetici açan betiğin kuralları (kart 0048, karar 0054). Parçanın davranışını
// cekirdek/moduller/ekip/testler/sunucuda-yonetici.test.ts ölçer.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sifreyiOku, yoneticiBetigi } from "../sunucu-yonetici.mts";

const betik = (eposta = "magaza-sahibi@ornek.test", kodAdi = "ornek-magaza") =>
  yoneticiBetigi("ac", "deneme", kodAdi, 3, "yayin-deneme-ornek-magaza:7", eposta);

describe("sunucuda yönetici betiği", () => {
  it("günlüğü kapalı, sitenin kullanıcısıyla, kısıtlı ve yalnız o sitenin gizli dosyasıyla çalışır", () => {
    const metin = betik();
    expect(metin).toContain("--rm --log-driver none");
    expect(metin).toContain("--network site-deneme-ornek-magaza");
    expect(metin).toContain("--read-only --cap-drop ALL --security-opt no-new-privileges:true");
    expect(metin).toContain("/deneme/ornek-magaza/veritabani_adresi:");
    expect(metin).toContain("node yonetici/yonetici.mjs ornek-magaza ac magaza-sahibi@ornek.test");
    expect(spawnSync("bash", ["-n"], { input: metin }).status).toBe(0);
  });

  it.each(["a';touch x;'@ornek.test", "$(touch x)@ornek.test", "a b@ornek.test", "gecersiz"])(
    "kabuğa zarar verecek e-posta betiğe girmez: %s",
    (eposta) => {
      expect(() => betik(eposta)).toThrow();
    },
  );

  it("bozuk kod adı betiğe girmez", () => {
    expect(() => betik(undefined, "a;touch x")).toThrow();
  });

  it("şifre yalnız kendi satırından okunur", () => {
    expect(sifreyiOku("sifre abc\n")).toBe("abc");
    expect(sifreyiOku("hata var\n")).toBeNull();
    expect(sifreyiOku("")).toBeNull();
  });

  it("parça görüntüde", () => {
    const dockerfile = readFileSync(
      join(import.meta.dirname, "..", "..", "sunucu", "cekirdek", "Dockerfile"),
      "utf8",
    );
    expect(dockerfile).toContain("--outfile=/kaynak/yonetici/yonetici.mjs");
    expect(dockerfile).toContain("COPY --from=derleme /kaynak/yonetici ./yonetici");
  });
});
