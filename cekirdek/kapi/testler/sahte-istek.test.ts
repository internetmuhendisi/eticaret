// Başka sitelerden gelen sahte isteklerin reddi (kart 0025, karar 0039).
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { sahteIstekMi } from "../sahte-istek.ts";
import { ucTanimla } from "../uc.ts";

// Request "host", "origin" ve "sec-fetch-*" başlıklarını kendi kurmaz, testte elle verilir.
const istek = (method: string, basliklar: Record<string, string>) => {
  const sonuc = new Request("http://yerel/kapi/herkese-acik/deneme", { method });
  for (const [ad, deger] of Object.entries(basliklar)) sonuc.headers.set(ad, deger);
  return sonuc;
};

const adres = "a.deneme.ornek.test";

describe("sahte istek", () => {
  it.each([
    ["kendi adresinden", { host: adres, origin: `https://${adres}` }],
    [
      "kendi adresinden, tarayıcı bilgisiyle",
      {
        host: adres,
        origin: `https://${adres}`,
        "sec-fetch-site": "same-origin",
      },
    ],
    ["tarayıcıdan gelmeyen (ödeme bildirimi gibi)", { host: adres }],
  ])("%s gelen isteği kabul eder", (_, basliklar) => {
    expect(sahteIstekMi(istek("POST", basliklar))).toBe(false);
  });

  it.each([
    ["başka siteden", { host: adres, origin: "https://kotu.test" }],
    ["kardeş adresten", { host: adres, origin: "https://b.deneme.ornek.test" }],
    ["başka porttan", { host: adres, origin: `https://${adres}:8443` }],
    ["kaynağı gizlenmiş", { host: adres, origin: "null" }],
    ["adresi bilinmeyen", { origin: `https://${adres}` }],
    ["tarayıcının başka site dediği", { host: adres, "sec-fetch-site": "cross-site" }],
    [
      "tarayıcının kardeş site dediği",
      {
        host: adres,
        origin: `https://${adres}`,
        "sec-fetch-site": "same-site",
      },
    ],
  ])("%s isteği reddeder", (_, basliklar) => {
    expect(sahteIstekMi(istek("POST", basliklar))).toBe(true);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("%s isteklerinde denetler", (yontem) => {
    expect(sahteIstekMi(istek(yontem, { host: adres, origin: "https://kotu.test" }))).toBe(true);
  });

  it.each(["GET", "HEAD", "OPTIONS"])("%s veri değiştirmez, denetlenmez", (yontem) => {
    expect(sahteIstekMi(istek(yontem, { host: adres, origin: "https://kotu.test" }))).toBe(false);
  });
});

describe("kapıda sahte istek ve çerez", () => {
  const ornekUc = (isle: Parameters<typeof ucTanimla>[0]["isle"]) =>
    ucTanimla({
      giris: "herkese-acik",
      sema: z.strictObject({}),
      izin: herkeseAcik,
      sinir: "genel",
      isle,
    });

  it("sahte isteği yetki koduyla reddeder, servisi çağırmaz", async () => {
    const isle = vi.fn(async () => ({}));
    const yanit = await ornekUc(isle)(
      istek("POST", { host: `sahte-${adres}`, origin: "https://kotu.test" }),
    );
    expect(yanit.status).toBe(403);
    expect(await yanit.json()).toEqual({ basarili: false, hata: { kod: "yetki" } });
    expect(isle).not.toHaveBeenCalled();
  });

  it("servisin çerezlerini başarılı yanıta tek tek yazar", async () => {
    const yanit = await ornekUc(async (_girdi, _istek, { cerezYaz }) => {
      cerezYaz("a=1; Secure", "b=2; Secure");
      return {};
    })(new Request("http://yerel/kapi/herkese-acik/cerez-basarili"));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.getSetCookie()).toEqual(["a=1; Secure", "b=2; Secure"]);
  });

  it("servis hata fırlatsa da çerezleri yazar: geçersiz oturumun çerezi silinir", async () => {
    const { BilinenHata } = await import("../zarf.ts");
    const yanit = await ornekUc(async (_girdi, _istek, { cerezYaz }) => {
      cerezYaz("a=; Max-Age=0");
      throw new BilinenHata("yetki");
    })(new Request("http://yerel/kapi/herkese-acik/cerez-hatali"));
    expect(yanit.status).toBe(403);
    expect(yanit.headers.getSetCookie()).toEqual(["a=; Max-Age=0"]);
  });
});
