// Arama sayfasının istek sınırı ara katmanda (kart 0137): aranan metinle gelen istek istemci başına sayılır; sınırı
// aşan istek 429 ve Retry-After ile aynı adrese, bekleme süresini taşıyan başlıkla geçer (sayfa arama yapmaz).
// Aranan metinsiz istek sayılmaz; başka istemci etkilenmez; IPv6 ilk 64 bitiyle sayılır; dışarıdan gönderilen
// başlık silinir.

import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { istekSinirlari } from "../../kayitlar/kapi.ts";
import { proxy } from "../../uygulama/proxy.ts";
import { aramaSiniriBasligi } from "../urun-listesi/arama-siniri.ts";

const istek = (adres: string, istemci: string, basliklar: Record<string, string> = {}) =>
  new NextRequest(new URL(adres, "http://site.localhost"), {
    headers: { "x-forwarded-for": istemci, ...basliklar },
  });

// Ara katmanın sayfaya geçirdiği istek başlığı (Next.js onu yanıtta bu adla taşır).
const gecenBaslik = (yanit: Response, ad: string) =>
  yanit.headers.get(`x-middleware-request-${ad}`);

const sinir = istekSinirlari.arama.istek;

// Ara katman her istekte sitenin tema demosu ayarına bakar (kart 0116): uygulamada site her zaman vardır.
beforeEach(() => {
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("arama istek sınırı", () => {
  it("sınıra kadar geçer, sonraki 429 ve bekleme başlığıyla aynı adrese gider", async () => {
    const istemci = "203.0.113.50";
    for (let i = 0; i < sinir; i += 1) {
      const yanit = await proxy(istek("/arama?ara=kupa", istemci));
      expect(yanit.status, `${i + 1}. istek`).toBe(200);
      expect(gecenBaslik(yanit, aramaSiniriBasligi)).toBeNull();
    }
    const asan = await proxy(istek("/arama?ara=kupa", istemci));
    expect(asan.status).toBe(429);
    expect(Number(asan.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(Number(gecenBaslik(asan, aramaSiniriBasligi))).toBeGreaterThan(0);
    expect(asan.headers.get("x-middleware-rewrite")).toContain("/arama?ara=kupa");
    // Başka istemci etkilenmez; aranan metinsiz istek sayılmaz.
    expect((await proxy(istek("/arama?ara=kupa", "203.0.113.51"))).status).toBe(200);
    expect((await proxy(istek("/arama", istemci))).status).toBe(200);
    expect((await proxy(istek("/arama?ara=+++", istemci))).status).toBe(200);
  });

  // Bağımsız kontrolün bulgusu: ilk değeri boş, ikincisi dolu "ara" sayfada aranır; ara katman da onu sayar.
  it("sayfanın aradığı her yazılış sayılır (?ara=&ara=x)", async () => {
    const istemci = "203.0.113.70";
    for (let i = 0; i < sinir; i += 1) {
      await proxy(istek("/arama?ara=&ara=kupa", istemci));
    }
    expect((await proxy(istek("/arama?ara=&ara=kupa", istemci))).status).toBe(429);
    // Sayfanın aramadığı yazılış sayılmaz (ilk dolu değer yalnız boşluk).
    expect((await proxy(istek("/arama?ara=+&ara=kupa", istemci))).status).toBe(200);
    expect((await proxy(istek("/arama?ara=&ara=", istemci))).status).toBe(200);
  });

  it("IPv6 adresi ilk 64 bitiyle sayılır", async () => {
    for (let i = 0; i < sinir; i += 1) {
      await proxy(istek("/arama?ara=kupa", `2001:db8:aa:bb::${i.toString(16)}`));
    }
    expect((await proxy(istek("/arama?ara=kupa", "2001:db8:aa:bb::ffff"))).status).toBe(429);
    expect((await proxy(istek("/arama?ara=kupa", "2001:db8:aa:cc::1"))).status).toBe(200);
  });

  it("dışarıdan gönderilen bekleme başlığı silinir", async () => {
    const yanit = await proxy(
      istek("/arama?ara=kupa", "203.0.113.60", { [aramaSiniriBasligi]: "99" }),
    );
    expect(yanit.status).toBe(200);
    expect(gecenBaslik(yanit, aramaSiniriBasligi)).toBeNull();
    expect(yanit.headers.get("x-middleware-override-headers")).not.toContain(aramaSiniriBasligi);
  });
});
