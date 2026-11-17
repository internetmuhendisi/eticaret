// Kapının yanıt zarfı ve önbellek (kart 0065, karar 0139): zarfla dönen başarılı ve hatalı yanıt önbelleğe alınmaz,
// hatalı yanıtın ek başlığı (Retry-After) korunur; dosya yanıtı kendi önbellek süresini taşır.
import { describe, expect, it } from "vitest";
import {
  basariliYanit,
  DosyaYaniti,
  dosyaOnbellekSuresi,
  dosyaYanitla,
  hataliYanit,
  zarfOnbellegi,
} from "../zarf.ts";

describe("kapının yanıtları ve önbellek", () => {
  it("zarfın değeri no-store", () => {
    expect(zarfOnbellegi).toBe("no-store");
  });

  it("başarılı ve hatalı yanıt önbelleğe alınmaz, ek başlık korunur", async () => {
    const basarili = basariliYanit({ eposta: "a@ornek.test" });
    expect(basarili.status).toBe(200);
    expect(basarili.headers.get("cache-control")).toBe("no-store");
    expect(basarili.headers.get("content-type")).toContain("application/json");
    expect(await basarili.json()).toEqual({ basarili: true, veri: { eposta: "a@ornek.test" } });

    const hatali = hataliYanit("oturum-yok");
    expect(hatali.status).toBe(401);
    expect(hatali.headers.get("cache-control")).toBe("no-store");

    const sinirli = hataliYanit("istek-siniri", undefined, { "Retry-After": "30" });
    expect(sinirli.headers.get("retry-after")).toBe("30");
    expect(sinirli.headers.get("cache-control")).toBe("no-store");
    // Ek başlık önbelleği açamaz.
    const zorlanan = hataliYanit("dogrulama", undefined, { "Cache-Control": "public, max-age=60" });
    expect(zorlanan.headers.get("cache-control")).toBe("no-store");
  });

  it("dosya yanıtı kendi önbelleğini taşır, ortak ve özel", () => {
    const istek = new Request("http://yerel/kapi/herkese-acik/logo");
    const ortak = dosyaYanitla(new DosyaYaniti(new Uint8Array([1]), "image/webp", "e"), istek);
    expect(ortak.headers.get("cache-control")).toBe(`public, max-age=${dosyaOnbellekSuresi}`);
    const ozel = dosyaYanitla(
      new DosyaYaniti(new Uint8Array([1]), "image/webp", "e", "ozel"),
      istek,
    );
    expect(ozel.headers.get("cache-control")).toBe(`private, max-age=${dosyaOnbellekSuresi}`);
  });
});
