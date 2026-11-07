// GET /kapi/herkese-acik/logo (kart 0073): yanıt zarf değil dosyanın kendisidir, türü içerikten
// bulunmuş türdür, tarayıcı türü tahmin etmez, aynı etiketle gelen istek gövdesiz 304 alır; logo
// yoksa zarfla 404, tanınmayan parametre 400. Çalışan site sürecin ortak alanına konarak verilir.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { baglantiyiKapat } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { logoUcu } from "../herkese-acik/logo.ts";
import { dosyaOnbellekSuresi } from "../zarf.ts";

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const calistir = (site: Site) => {
  ortak[siteAnahtari] = site;
};
const adres = "http://magaza.ornek.test/kapi/herkese-acik/logo";

let sil: () => Promise<void>;
let klasor: string;

beforeAll(async () => {
  const site = await denemeSitesiAc("logo-ucu");
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  klasor = mkdtempSync(join(tmpdir(), "logo-ucu-"));
  vi.stubEnv("DOSYA_KLASORU", klasor);
  await baglantiyiKapat();
}, 60_000);
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  rmSync(klasor, { recursive: true, force: true });
  await sil();
});

describe("logo ucu", () => {
  const logolu = siteKlasorunuOku(join(ornekler, "marka-logolu"));

  it("logonun kendisini doğru tür, nosniff, önbellek ve etiketle verir", async () => {
    calistir(logolu);
    const yanit = await logoUcu(new Request(adres));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("content-type")).toBe("image/webp");
    expect(yanit.headers.get("x-content-type-options")).toBe("nosniff");
    expect(yanit.headers.get("cache-control")).toBe(`public, max-age=${dosyaOnbellekSuresi}`);
    expect(yanit.headers.get("etag")).toMatch(/^"[0-9a-f]{64}"$/);
    const govde = Buffer.from(await yanit.arrayBuffer());
    expect(govde.equals(readFileSync(logolu.markaLogosu?.yol ?? ""))).toBe(true);
  });

  it("aynı etiketle gelen istek gövdesiz 304 alır, başka etiket 200", async () => {
    calistir(logolu);
    const etiket = (await logoUcu(new Request(adres))).headers.get("etag") ?? "";
    const ayni = await logoUcu(new Request(adres, { headers: { "if-none-match": etiket } }));
    expect(ayni.status).toBe(304);
    expect((await ayni.arrayBuffer()).byteLength).toBe(0);
    const baska = await logoUcu(new Request(adres, { headers: { "if-none-match": '"baska"' } }));
    expect(baska.status).toBe(200);
  });

  it("önbelleği aşan parametre yanıtı değiştirmez, tanınmayan parametre doğrulama hatası", async () => {
    calistir(logolu);
    expect((await logoUcu(new Request(`${adres}?s=abc123`))).status).toBe(200);
    const bozuk = await logoUcu(new Request(`${adres}?s=<script>`));
    expect(bozuk.status).toBe(400);
    const fazla = await logoUcu(new Request(`${adres}?yol=../etc/passwd`));
    expect(fazla.status).toBe(400);
    expect(await fazla.json()).toMatchObject({ basarili: false, hata: { kod: "dogrulama" } });
  });

  it("logo yoksa zarfla 404", async () => {
    calistir(siteKlasorunuOku(join(ornekler, "gecerli")));
    const yanit = await logoUcu(new Request(adres));
    expect(yanit.status).toBe(404);
    expect(await yanit.json()).toEqual({ basarili: false, hata: { kod: "bulunamadi" } });
  });

  it("HEAD isteği gövdesiz yanıt alır", async () => {
    calistir(logolu);
    const yanit = await logoUcu(new Request(adres, { method: "HEAD" }));
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("content-type")).toBe("image/webp");
    expect((await yanit.arrayBuffer()).byteLength).toBe(0);
  });
});
