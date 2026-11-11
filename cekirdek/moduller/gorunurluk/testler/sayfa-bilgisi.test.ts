// Vitrin sayfalarının başlığı ve açıklaması (kart 0135, karar 0103): kalıp mağaza adıyla, kaydın kendi
// açıklaması ya da türün kalıbı, uzun açıklamanın sözcük sonunda kesilmesi. Mağaza adı ayardan okunur; burada
// okuma işlevi taklit edilir, okumanın kendisi magaza-ayarlari testlerindedir.
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { sorguMetni } from "../../../vitrin/kayit-sayfasi.tsx";
import {
  aciklamaKisalt,
  aciklamaUzunlugu,
  kayitSayfaBilgisi,
  sayfaBasligi,
  vitrinSayfaKalibi,
} from "../sayfa-bilgisi.ts";

const ayar = vi.hoisted(() => ({ magazaAdi: "Deneme Dükkânı" }));
vi.mock("../../magaza-ayarlari/servis.ts", () => ({ magazaninAdi: async () => ayar.magazaAdi }));
afterEach(() => {
  ayar.magazaAdi = "Deneme Dükkânı";
});

const metin = metinOkuyucu("tr");

// Üretici metni çalışan sitenin dilinden okur.
beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});

describe("sayfa bilgisi", () => {
  it("çerçevenin varsayılan başlığı mağaza adıdır; sayfanın başlığı kalıpla tam olarak kurulur", async () => {
    const bilgi = await vitrinSayfaKalibi();
    expect(bilgi.title).toBe("Deneme Dükkânı");
    expect(bilgi.description).toContain("Deneme Dükkânı");
    expect(await sayfaBasligi("Giriş yap")).toEqual({
      absolute: metin("vitrin.sayfaBilgisi.kalip")
        .replace("{baslik}", "Giriş yap")
        .replace("{magaza}", "Deneme Dükkânı"),
    });
  });

  it("mağaza ya da kayıt adındaki işaretler başlığı bozmaz", async () => {
    ayar.magazaAdi = "A%sB $& {baslik}";
    const { title } = await kayitSayfaBilgisi("urun", { ad: "Kazak $' %s", aciklama: null });
    expect(title).toEqual({
      absolute: metin("vitrin.sayfaBilgisi.kalip")
        .split("{baslik}")
        .join("Kazak $' %s")
        .split("{magaza}")
        .join("A%sB $& {baslik}"),
    });
    expect(JSON.stringify(title)).toContain("A%sB $& {baslik}");
  });

  it("kaydın açıklaması varsa o, yoksa ya da boşsa türün kalıbı kullanılır", async () => {
    expect(
      await kayitSayfaBilgisi("urun", { ad: "Kazak", aciklama: "  Yumuşak yün kazak.  " }),
    ).toEqual({
      title: await sayfaBasligi("Kazak"),
      description: "Yumuşak yün kazak.",
    });
    for (const aciklama of [null, "", "   "]) {
      const bilgi = await kayitSayfaBilgisi("kategori", { ad: "Giyim", aciklama });
      expect(bilgi.title).toEqual(await sayfaBasligi("Giyim"));
      expect(bilgi.description).toBe(
        metin("vitrin.sayfaBilgisi.aciklama.kategori")
          .replace("{ad}", "Giyim")
          .replace("{magaza}", "Deneme Dükkânı"),
      );
    }
  });

  it("her türün kendi kalıbı vardır ve adla mağazayı içerir", async () => {
    for (const tur of ["kategori", "marka", "etiket", "urun"] as const) {
      const bilgi = await kayitSayfaBilgisi(tur, { ad: "Örnek Ad", aciklama: null });
      expect(bilgi.description).toContain("Örnek Ad");
      expect(bilgi.description).toContain("Deneme Dükkânı");
      expect(bilgi.description).not.toMatch(/\{[a-z]+\}/i);
    }
  });

  it("uzun açıklama sözcük sonunda kesilir, boşluklar sadeleşir", () => {
    const uzun = `${"Pamuklu kumaşı nefes alır, ".repeat(10)}son.`;
    const kisa = aciklamaKisalt(uzun);
    expect(kisa.length).toBeLessThanOrEqual(aciklamaUzunlugu);
    expect(kisa.endsWith("…")).toBe(true);
    expect(uzun.replace(/\s+/g, " ").startsWith(kisa.slice(0, -1))).toBe(true);
    expect(kisa.slice(0, -1)).not.toMatch(/[\s,]$/);
    expect(aciklamaKisalt(" Kısa \n açıklama ")).toBe("Kısa açıklama");
    // İki birimlik harf (emoji) ortadan bölünmez, uzunluk harf sayısıdır.
    const emojili = aciklamaKisalt("😀".repeat(300));
    expect(Array.from(emojili)).toHaveLength(aciklamaUzunlugu);
    expect(emojili).toBe(`${"😀".repeat(aciklamaUzunlugu - 1)}…`);
    // Boşluksuz uzun metin de sınırı aşmaz.
    expect(aciklamaKisalt("a".repeat(300)).length).toBe(aciklamaUzunlugu);
  });
});

describe("yönlendirmenin sorgu kısmı", () => {
  it("sorgu kısmı aynen korunur, boşsa eklenmez", () => {
    expect(sorguMetni({})).toBe("");
    expect(sorguMetni({ sayfa: "2", beden: ["m", "l"], bos: undefined })).toBe(
      "?sayfa=2&beden=m&beden=l",
    );
    expect(sorguMetni({ ara: "çanta & kılıf" })).toBe("?ara=%C3%A7anta+%26+k%C4%B1l%C4%B1f");
  });
});
