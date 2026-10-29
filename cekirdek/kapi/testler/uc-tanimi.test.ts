// Uç tanımının ortak davranışı ve zorunlu parçaları (kart 0013, karar 0024).
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { istekSinirlari } from "../../kayitlar/kapi.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

const istek = (yol: string, secenekler?: RequestInit) =>
  new Request(`http://yerel/kapi/herkese-acik/${yol}`, secenekler);

const ornekUc = (isle: (girdi: { ad: string }) => Promise<unknown>) =>
  ucTanimla({
    giris: "herkese-acik",
    sema: z.strictObject({ ad: z.string().min(1) }),
    izin: herkeseAcik,
    sinir: "genel",
    isle,
  });

describe("uç tanımı", () => {
  afterEach(() => vi.restoreAllMocks());

  it("başarılı yanıtı zarfa koyar", async () => {
    const yanit = await ornekUc(async ({ ad }) => ({ selam: ad }))(istek("basari?ad=deneme"));
    expect(yanit.status).toBe(200);
    expect(await yanit.json()).toEqual({ basarili: true, veri: { selam: "deneme" } });
  });

  it("şemadan geçmeyen girdiye doğrulama koduyla cevap verir, servisi çağırmaz", async () => {
    const isle = vi.fn(async () => ({}));
    const yanit = await ornekUc(isle)(istek("dogrulama?ad=&fazla=1"));
    expect(yanit.status).toBe(400);
    expect(await yanit.json()).toEqual({
      basarili: false,
      hata: {
        kod: "dogrulama",
        ayrinti: [
          { alan: "ad", kod: "too_small" },
          { alan: "", kod: "unrecognized_keys" },
        ],
      },
    });
    expect(isle).not.toHaveBeenCalled();
  });

  it("JSON olmayan gövdeye doğrulama koduyla cevap verir", async () => {
    const yanit = await ornekUc(async () => ({}))(
      istek("govde", { method: "POST", body: "{bozuk" }),
    );
    expect(yanit.status).toBe(400);
    expect((await yanit.json()).hata.kod).toBe("dogrulama");
  });

  it("gövdedeki girdiyi şemadan geçirir", async () => {
    const yanit = await ornekUc(async ({ ad }) => ad)(
      istek("govde-gecerli", { method: "POST", body: JSON.stringify({ ad: "deneme" }) }),
    );
    expect(await yanit.json()).toEqual({ basarili: true, veri: "deneme" });
  });

  it("servisin bilinen hatasını kodu ve ayrıntısıyla döndürür", async () => {
    const yanit = await ornekUc(async () => {
      throw new BilinenHata("cakisma", { alan: "ad" });
    })(istek("bilinen?ad=deneme"));
    expect(yanit.status).toBe(409);
    expect(await yanit.json()).toEqual({
      basarili: false,
      hata: { kod: "cakisma", ayrinti: { alan: "ad" } },
    });
  });

  it("beklenmeyen hatanın mesajını istemciye göstermez, günlüğe hata seviyesinde yazar", async () => {
    const gunlukSatirlari: Record<string, unknown>[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation((parca) => {
      gunlukSatirlari.push(JSON.parse(String(parca)));
      return true;
    });
    const yanit = await ornekUc(async () => {
      throw new Error("iç ayrıntı");
    })(istek("beklenmeyen?ad=deneme"));
    expect(yanit.status).toBe(500);
    const metin = await yanit.text();
    expect(JSON.parse(metin)).toEqual({ basarili: false, hata: { kod: "sunucu-hatasi" } });
    expect(metin).not.toContain("iç ayrıntı");
    expect(gunlukSatirlari).toEqual([
      expect.objectContaining({
        seviye: "hata",
        alanlar: expect.objectContaining({
          yontem: "GET",
          yol: "/kapi/herkese-acik/beklenmeyen",
          hata: expect.objectContaining({ mesaj: "iç ayrıntı" }),
        }),
      }),
    ]);
  });

  it("sınır aşılınca istek sınırı koduyla ve bekleme süresiyle cevap verir", async () => {
    const uc = ucTanimla({
      giris: "herkese-acik",
      sema: z.strictObject({}),
      izin: herkeseAcik,
      sinir: "siki",
      isle: async () => ({}),
    });
    const istemci = (adres: string) =>
      istek("sinir", { headers: { "x-forwarded-for": `1.1.1.1, ${adres}` } });
    for (let i = 0; i < istekSinirlari.siki.istek; i += 1) {
      expect((await uc(istemci("10.0.0.1"))).status).toBe(200);
    }
    const asan = await uc(istemci("10.0.0.1"));
    expect(asan.status).toBe(429);
    expect((await asan.json()).hata.kod).toBe("istek-siniri");
    expect(Number(asan.headers.get("retry-after"))).toBeGreaterThan(0);
    // Başka bir istemcinin sayacı ayrıdır.
    expect((await uc(istemci("10.0.0.2"))).status).toBe(200);
  });

  it("izin beyanını ve sınırı uçla birlikte taşır", () => {
    expect(ornekUc(async () => ({})).tanim).toEqual({
      giris: "herkese-acik",
      izin: "herkese-acik",
      sinir: "genel",
    });
  });
});
