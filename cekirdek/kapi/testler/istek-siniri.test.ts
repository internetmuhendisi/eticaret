// İstek sınırı IPv6'da bağlantı ağına göre sayar (kart 0045, karar 0041).
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { istekSinirlari } from "../../kayitlar/kapi.ts";
import { sayacAdresi } from "../istek-siniri.ts";
import { ucTanimla } from "../uc.ts";

describe("sayaç adresi", () => {
  it.each([
    ["2001:db8:1:2::1", "2001:db8:1:2::/64"],
    ["2001:db8:1:2:aaaa:bbbb:cccc:dddd", "2001:db8:1:2::/64"],
    ["2001:DB8:1:2::FFFF", "2001:db8:1:2::/64"],
    ["2001:0db8:0001:0002:0000:0000:0000:0001", "2001:db8:1:2::/64"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["::1", "0:0:0:0::/64"],
    ["fe80::1%eth0", "fe80:0:0:0::/64"],
  ])("%s IPv6 adresi ilk 64 bitiyle sayılır", (adres, beklenen) => {
    expect(sayacAdresi(adres)).toBe(beklenen);
  });

  it.each([
    ["203.0.113.7", "203.0.113.7"],
    ["::ffff:203.0.113.7", "203.0.113.7"],
    ["::FFFF:cb00:7107", "203.0.113.7"],
  ])("%s IPv4 adresi tam adresle sayılır", (adres, beklenen) => {
    expect(sayacAdresi(adres)).toBe(beklenen);
  });

  it("farklı IPv4 adresleri ayrı sayılır", () => {
    expect(sayacAdresi("203.0.113.7")).not.toBe(sayacAdresi("203.0.113.8"));
  });

  it.each(["yerel", "", "abc:xyz", "2001:db8::1::2", "1.2.3"])(
    "adres olmayan %j olduğu gibi kalır",
    (deger) => {
      expect(sayacAdresi(deger)).toBe(deger);
    },
  );
});

describe("kapıdan geçen istek", () => {
  const { istek: sinirSayisi } = istekSinirlari.siki;
  const ucAc = () =>
    ucTanimla({
      giris: "herkese-acik",
      sema: z.strictObject({}),
      izin: herkeseAcik,
      sinir: "siki",
      isle: async () => ({}),
    });
  const istek = (yol: string, adres: string) =>
    new Request(`http://yerel/kapi/herkese-acik/${yol}`, {
      headers: { "x-forwarded-for": adres },
    });

  it("aynı /64'ten farklı adresler aynı sayaca düşer, farklı /64 ayrılır", async () => {
    const uc = ucAc();
    for (let sira = 0; sira < sinirSayisi; sira += 1) {
      expect((await uc(istek("ipv6", `2001:db8:a:b::${sira + 1}`))).status).toBe(200);
    }
    expect((await uc(istek("ipv6", "2001:db8:a:b:ffff::9"))).status).toBe(429);
    expect((await uc(istek("ipv6", "2001:db8:a:c::1"))).status).toBe(200);
  });

  it("IPv4 adresleri tam adresle ayrılır, IPv6 yazılışı aynı sayaca düşer", async () => {
    const uc = ucAc();
    for (let sira = 0; sira < sinirSayisi; sira += 1) {
      expect((await uc(istek("ipv4", "198.51.100.1"))).status).toBe(200);
    }
    expect((await uc(istek("ipv4", "::ffff:198.51.100.1"))).status).toBe(429);
    expect((await uc(istek("ipv4", "198.51.100.2"))).status).toBe(200);
  });
});
