// Alan adı kayıtlarının planı (kart 0344, kararlar 0032 ve 0202): yalnız kendi kayıtlarına dokunur, başka
// kayıtta durur, artık istenmeyen kendi kaydını siler.
import { describe, expect, it } from "vitest";
import {
  alanAdiPlani,
  type CloudflareKaydi,
  denemeAciklamasi,
  istenenKayitlar,
  kendiAlanAdiKayitlari,
  siteAciklamaOneki,
  siteAciklamasi,
} from "../alan-adi-plani.mts";

const ipv4 = "2.31.160.7";
const ipv6 = "2a01:4f8:c01e:14ad::1";
const seramik = { kodAdi: "seramik", adresler: { canli: "https://seramik.eticaretmagazasi.com" } };

// Bugünkü alan adı: yalnız deneme adreslerinin joker kayıtları (2026-11-28'de okundu).
const joker: CloudflareKaydi[] = [
  {
    id: "1",
    type: "A",
    name: "*.deneme.eticaretmagazasi.com",
    content: ipv4,
    proxied: false,
    comment: denemeAciklamasi,
  },
  {
    id: "2",
    type: "AAAA",
    name: "*.deneme.eticaretmagazasi.com",
    content: ipv6,
    proxied: false,
    comment: denemeAciklamasi,
  },
];

const plan = (siteler: Parameters<typeof istenenKayitlar>[2], mevcut: CloudflareKaydi[]) =>
  alanAdiPlani(istenenKayitlar(ipv4, ipv6, siteler), mevcut, siteAciklamaOneki);

describe("istenen kayıtlar", () => {
  it("alt adresi olan sitenin A ve AAAA kaydı, vekil kapalı; kendi alan adı ve asıl adressiz site kayıt istemez", () => {
    const istenenler = istenenKayitlar(ipv4, ipv6, [
      seramik,
      { kodAdi: "kendi", adresler: { canli: "https://seramikdukkani.com" } },
      { kodAdi: "yalin", adresler: {} },
      { kodAdi: "bozuk", adresler: { canli: "https://www.eticaretmagazasi.com" } },
    ]);
    expect(istenenler.filter((k) => k.name === "seramik.eticaretmagazasi.com")).toEqual([
      {
        type: "A",
        name: "seramik.eticaretmagazasi.com",
        content: ipv4,
        proxied: false,
        comment: "altyapi: site seramik (karar 0202)",
      },
      {
        type: "AAAA",
        name: "seramik.eticaretmagazasi.com",
        content: ipv6,
        proxied: false,
        comment: "altyapi: site seramik (karar 0202)",
      },
    ]);
    expect(istenenler).toHaveLength(4);
  });
});

describe("plan", () => {
  it("bugünkü alan adında hiçbir iş yok", () => {
    expect(plan([], joker)).toEqual({ isler: [], hatalar: [] });
  });

  it("yeni alt adres iki kayıt ekler, joker kayda dokunmaz", () => {
    const { isler, hatalar } = plan([seramik], joker);
    expect(hatalar).toEqual([]);
    expect(isler.map((is) => is.tur)).toEqual(["ekle", "ekle"]);
    expect(isler.map((is) => is.metin)).toEqual([
      `eklenecek   A seramik.eticaretmagazasi.com → ${ipv4} (vekil kapalı)`,
      `eklenecek   AAAA seramik.eticaretmagazasi.com → ${ipv6} (vekil kapalı)`,
    ]);
  });

  it("vekili açılmış ya da adresi değişmiş kendi kaydı düzeltilir", () => {
    const mevcut: CloudflareKaydi[] = [
      ...joker,
      {
        id: "3",
        type: "A",
        name: "seramik.eticaretmagazasi.com",
        content: "192.0.2.1",
        proxied: true,
        comment: siteAciklamasi("seramik"),
      },
      {
        id: "4",
        type: "AAAA",
        name: "seramik.eticaretmagazasi.com",
        content: ipv6,
        proxied: false,
        comment: siteAciklamasi("seramik"),
      },
    ];
    const { isler } = plan([seramik], mevcut);
    expect(isler).toHaveLength(1);
    expect(isler[0]).toMatchObject({ tur: "degistir", id: "3" });
  });

  it("artık istenmeyen kendi kaydı silinir, başkasınınki silinmez", () => {
    const mevcut: CloudflareKaydi[] = [
      ...joker,
      {
        id: "3",
        type: "A",
        name: "eski.eticaretmagazasi.com",
        content: ipv4,
        proxied: false,
        comment: siteAciklamasi("eski"),
      },
      {
        id: "5",
        type: "A",
        name: "blog.eticaretmagazasi.com",
        content: "192.0.2.9",
        proxied: true,
        comment: "elle",
      },
      {
        id: "6",
        type: "MX",
        name: "eticaretmagazasi.com",
        content: "posta",
        proxied: false,
        comment: null,
      },
    ];
    const { isler, hatalar } = plan([], mevcut);
    expect(hatalar).toEqual([]);
    expect(isler).toEqual([expect.objectContaining({ tur: "sil", id: "3" })]);
  });

  it("aynı adda başka türde kayıt, başka açıklamalı kayıt ve aynı türde iki kayıt hiçbir iş yaptırmaz", () => {
    const cname: CloudflareKaydi = {
      id: "7",
      type: "CNAME",
      name: "seramik.eticaretmagazasi.com",
      content: "x.com",
      proxied: false,
    };
    expect(plan([seramik], [...joker, cname]).hatalar[0]).toContain("Aynı adda başka kayıt var");
    const elle: CloudflareKaydi = {
      id: "8",
      type: "A",
      name: "seramik.eticaretmagazasi.com",
      content: ipv4,
      proxied: false,
      comment: "elle açıldı",
    };
    expect(plan([seramik], [...joker, elle]).hatalar[0]).toContain("başka bir açıklama taşıyor");
    const iki: CloudflareKaydi[] = [
      {
        id: "9",
        type: "A",
        name: "seramik.eticaretmagazasi.com",
        content: ipv4,
        proxied: false,
        comment: siteAciklamasi("seramik"),
      },
      {
        id: "10",
        type: "A",
        name: "seramik.eticaretmagazasi.com",
        content: ipv4,
        proxied: false,
        comment: siteAciklamasi("seramik"),
      },
    ];
    expect(plan([seramik], [...joker, ...iki]).hatalar[0]).toContain("2 kayıt var");
    const deneme = [
      { ...joker[0], comment: "başka" } as CloudflareKaydi,
      joker[1] as CloudflareKaydi,
    ];
    expect(plan([], deneme).hatalar[0]).toContain("*.deneme.eticaretmagazasi.com");
  });

  it("aynı kayıt iki sorgudan gelse de bir kez sayılır", () => {
    const kendi: CloudflareKaydi = {
      id: "3",
      type: "A",
      name: "eski.eticaretmagazasi.com",
      content: ipv4,
      proxied: false,
      comment: siteAciklamasi("eski"),
    };
    expect(plan([], [...joker, kendi, kendi]).isler).toHaveLength(1);
  });
});

describe("kendi alan adı", () => {
  it("mağaza sahibinin açacağı kayıtlar: www'suz ve www'lu adın A ve AAAA kaydı; alt adreste yok", () => {
    expect(
      kendiAlanAdiKayitlari(ipv4, ipv6, [
        { kodAdi: "kendi", adresler: { canli: "https://seramikdukkani.com" } },
        seramik,
      ]),
    ).toEqual([
      { kodAdi: "kendi", type: "A", name: "seramikdukkani.com", content: ipv4 },
      { kodAdi: "kendi", type: "AAAA", name: "seramikdukkani.com", content: ipv6 },
      { kodAdi: "kendi", type: "A", name: "www.seramikdukkani.com", content: ipv4 },
      { kodAdi: "kendi", type: "AAAA", name: "www.seramikdukkani.com", content: ipv6 },
    ]);
  });
});
