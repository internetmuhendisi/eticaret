// Sitenin asıl adresinin kuralları (kart 0344, karar 0202): alt adres ve kendi alan adı, ayrılmış adlar,
// çözülmeden ön kapıya girmeme, deneme adresinin yönlenmesi, www ve arama motoru kuralı.
import { describe, expect, it } from "vitest";
import {
  adCozumleri,
  adCozumuBetigi,
  altAdHatasi,
  altAdres,
  altyapiAdresiMi,
  asilAdresAdlari,
  asilAdresCakismalari,
  asilAdreseYonleniyor,
  asilAdresiCoz,
  ayrilmisAltAdlar,
  bakimBilgisiCoz,
  cozulenleriSec,
  cozulmeHatasi,
  kimlikAdresiHatasi,
  kurmaBetigi,
  onKapiyiKur,
  saglikYolu,
  siteSatiri,
  siteSatirlari,
  yayiniDurdurmayanSatir,
} from "../on-kapi.mts";
import { asilAdresKilidi } from "../yayin-hazirligi.mts";

describe("alt adres", () => {
  it("kod adının kuralına uyan, ayrılmamış ad geçer", () => {
    expect(altAdHatasi("seramik")).toBeUndefined();
    expect(altAdHatasi("seramik-dukkani")).toBeUndefined();
    expect(altAdres("seramik")).toBe("seramik.eticaretmagazasi.com");
  });

  it("her ayrılmış ad ve geçersiz ad reddedilir", () => {
    for (const ad of ayrilmisAltAdlar) expect(altAdHatasi(ad)).toContain("ayrılmış");
    for (const ad of ["Seramik", "seramik--a", "-a", "a-", "", "a.b", "şeker"]) {
      expect(altAdHatasi(ad), ad).toContain("geçersiz");
    }
    expect(() => altAdres("www")).toThrow("ayrılmış");
  });
});

describe("asıl adres", () => {
  it("alt adres ve www'suz kendi alan adı çözülür", () => {
    expect(asilAdresiCoz("https://seramik.eticaretmagazasi.com")).toEqual({
      tur: "alt",
      ad: "seramik.eticaretmagazasi.com",
    });
    expect(asilAdresiCoz("https://seramikdukkani.com/")).toEqual({
      tur: "kendi",
      ad: "seramikdukkani.com",
    });
    expect(asilAdresiCoz("https://xn--iek-qna.com")).toEqual({
      tur: "kendi",
      ad: "xn--iek-qna.com",
    });
    expect(asilAdresiCoz("https://magaza.seramik.com.tr")).toEqual({
      tur: "kendi",
      ad: "magaza.seramik.com.tr",
    });
  });

  it("biçime uymayan adres reddedilir", () => {
    const bozuklar = [
      "http://seramik.eticaretmagazasi.com",
      "https://seramik.eticaretmagazasi.com/magaza",
      "https://seramik.eticaretmagazasi.com:8443",
      "https://a:b@seramik.eticaretmagazasi.com",
      "https://seramik.eticaretmagazasi.com?x=1",
      "https://seramik.eticaretmagazasi.com#x",
      "https://Seramik.eticaretmagazasi.com",
      "https://www.seramikdukkani.com",
      "https://a.b.eticaretmagazasi.com",
      "https://panel.eticaretmagazasi.com",
      "https://kapi--yoklama.eticaretmagazasi.com",
      "https://eticaretmagazasi.com",
      "https://seramik",
      "https://192.0.2.1",
      "seramik.com",
      "",
    ];
    for (const adres of bozuklar) expect(asilAdresiCoz(adres), adres).toHaveProperty("hata");
  });

  it("kendi alan adında www. hâli de karşılanır", () => {
    expect(asilAdresAdlari({ tur: "kendi", ad: "seramikdukkani.com" })).toEqual([
      "seramikdukkani.com",
      "www.seramikdukkani.com",
    ]);
    expect(asilAdresAdlari({ tur: "alt", ad: "seramik.eticaretmagazasi.com" })).toEqual([
      "seramik.eticaretmagazasi.com",
    ]);
  });

  it("kimlikteki asıl adres denetlenir", () => {
    const kimlik = (canli?: string) => ({
      kodAdi: "seramik",
      adresler: { deneme: "https://seramik.deneme.eticaretmagazasi.com", canli },
    });
    expect(kimlikAdresiHatasi(kimlik())).toBeUndefined();
    expect(kimlikAdresiHatasi(kimlik("https://seramik.eticaretmagazasi.com"))).toBeUndefined();
    expect(kimlikAdresiHatasi(kimlik("https://www.eticaretmagazasi.com"))).toContain("asıl adres");
  });

  it("iki site aynı asıl adresi taşıyamaz", () => {
    const site = (kodAdi: string, canli?: string) => ({ kodAdi, adresler: { canli } });
    expect(
      asilAdresCakismalari([
        site("a", "https://seramik.eticaretmagazasi.com"),
        site("b", "https://seramik.eticaretmagazasi.com/"),
        site("c"),
        site("d", "https://baska.com"),
      ]),
    ).toEqual(["b ile a aynı asıl adresi taşıyor: seramik.eticaretmagazasi.com"]);
  });

  it("altyapının iki tireli adresi site adresi değildir", () => {
    expect(altyapiAdresiMi("kapi--deneme.eticaretmagazasi.com")).toBe(true);
    expect(altyapiAdresiMi("seramik.eticaretmagazasi.com")).toBe(false);
    expect(altyapiAdresiMi("kapi--deneme.eticaretmagazasi.com.ornek.com")).toBe(false);
    expect(altyapiAdresiMi("kapi--deneme.deneme.eticaretmagazasi.com")).toBe(false);
  });
});

describe("çözülme", () => {
  const ipv4 = "2.31.160.7";
  const ipv6 = "2a01:4f8:1c1b:1::1";

  it("yalnız sunucunun kendi iki adresi geçer", () => {
    expect(cozulmeHatasi([ipv4], ["2a01:4f8:1c1b:1:0:0:0:1"], ipv4, ipv6)).toBeUndefined();
  });

  it("çözülmeyen, başka yere çözülen, vekilli ve IPv6'sız ad geçmez", () => {
    expect(cozulmeHatasi([], [], ipv4, ipv6)).toBe("çözülmüyor");
    expect(cozulmeHatasi(["192.0.2.1"], [ipv6], ipv4, ipv6)).toContain("beklenen 2.31.160.7");
    // Cloudflare vekili açıksa iki Cloudflare adresi döner.
    expect(cozulmeHatasi(["104.21.1.1", "172.67.1.1"], [ipv6], ipv4, ipv6)).toContain("IPv4");
    expect(cozulmeHatasi([ipv4], [], ipv4, ipv6)).toContain("IPv6 yok");
    expect(cozulmeHatasi([ipv4], ["2a01::2"], ipv4, ipv6)).toContain("IPv6");
  });

  it("sunucunun çözücü çıktısı okunur, betiğe girmeyecek ad reddedilir", () => {
    const cikti = [
      "seramik.eticaretmagazasi.com 4 2.31.160.7",
      "seramik.eticaretmagazasi.com 4 2.31.160.7",
      "seramik.eticaretmagazasi.com 6 2a01:4f8:1c1b:1::1",
      "bozuk satir",
    ].join("\n");
    expect(adCozumleri(cikti).get("seramik.eticaretmagazasi.com")).toEqual({
      v4: ["2.31.160.7"],
      v6: ["2a01:4f8:1c1b:1::1"],
      onKapida: false,
    });
    // AAAA kaydı olmayan adda getent IPv4'ü IPv6 biçiminde döndürür: yok sayılır. Ön kapıdaki ad işaretlenir.
    expect(
      adCozumleri("a.com 4 2.31.160.7\na.com 6 ::ffff:2.31.160.7\na.com onkapi\ncozum=bitti").get(
        "a.com",
      ),
    ).toEqual({ v4: ["2.31.160.7"], v6: [], onKapida: true });
    const betik = adCozumuBetigi(["seramik.eticaretmagazasi.com"]);
    expect(betik).toContain("grep -qs '^seramik\\.eticaretmagazasi\\.com {'");
    expect(betik.trim().endsWith("echo cozum=bitti")).toBe(true);
    expect(adCozumuBetigi(["seramik.eticaretmagazasi.com"])).toContain(
      "getent ahostsv$t seramik.eticaretmagazasi.com",
    );
    expect(() => adCozumuBetigi(["a;rm -rf /"])).toThrow("Betiğe girmeyecek ad");
  });
});

describe("ön kapıya girecek adlar", () => {
  const ipv4 = "2.31.160.7";
  const ipv6 = "2a01:4f8:1c1b:1::1";
  const ad = "seramik.eticaretmagazasi.com";
  const sec = (cozum: { v4: string[]; v6: string[]; onKapida: boolean }) =>
    cozulenleriSec([ad], new Map([[ad, cozum]]), ipv4, ipv6);

  it("sunucuya çözülen ad girer", () => {
    expect(sec({ v4: [ipv4], v6: [ipv6], onKapida: false })).toEqual({
      cozulenler: new Set([ad]),
      uyarilar: [],
    });
  });

  it("cevap alınamayan ad yalnız ön kapıda zaten varsa kalır", () => {
    const kalir = sec({ v4: [], v6: [], onKapida: true });
    expect(kalir.cozulenler.has(ad)).toBe(true);
    expect(kalir.uyarilar[0]).toContain("zaten olduğu için kaldı");
    const girmez = sec({ v4: [], v6: [], onKapida: false });
    expect(girmez.cozulenler.size).toBe(0);
    expect(girmez.uyarilar[0]).toContain("ön kapıya eklenmedi");
    expect(cozulenleriSec([ad], new Map(), ipv4, ipv6).cozulenler.size).toBe(0);
  });

  it("başka adrese çözülen ad ön kapıda olsa da çıkar", () => {
    expect(sec({ v4: ["192.0.2.1"], v6: [ipv6], onKapida: true }).cozulenler.size).toBe(0);
    expect(sec({ v4: [ipv4], v6: [], onKapida: true }).cozulenler.size).toBe(0);
  });

  it("ek satır var olan bir satırın adını taşıyamaz (ssh'tan önce durur)", () => {
    for (const ad of ["kapi--yoklama", "altyapi--hata", "ornek-magaza"]) {
      expect(() => onKapiyiKur("192.0.2.1", { "ornek-magaza": 1 }, { [ad]: "" }), ad).toThrow(
        "var olan bir satırın adını",
      );
    }
  });

  it("asıl adresin ölçümü öteki sitelerin yayınını durdurmaz", () => {
    expect(
      yayiniDurdurmayanSatir(
        "HATA   deneme/seramik yayındaki kutusu: asıl adres seramik.eticaretmagazasi.com ön kapıda değil",
      ),
    ).toBe(true);
    expect(
      yayiniDurdurmayanSatir("HATA   deneme/seramik yayındaki kutusu: IPv4 ile deneme adresi"),
    ).toBe(false);
  });
});

describe("ön kapı satırları", () => {
  const siteler = { seramik: 3 };
  const alt = { tur: "alt", ad: "seramik.eticaretmagazasi.com" } as const;
  const kendi = { tur: "kendi", ad: "seramikdukkani.com" } as const;

  it("asıl adresi olmayan site yalnız deneme adresinde açılır", () => {
    const satir = siteSatirlari(siteler, { seramik: { ad: "Seramik" } })["seramik"] ?? "";
    expect(satir.startsWith("seramik.deneme.eticaretmagazasi.com {")).toBe(true);
    expect(satir).not.toContain("redir");
  });

  it("çözülen alt adres: deneme adresi sağlık ve robots dışında asıl adrese yönlenir, asıl adres kapalı kuralla açılır", () => {
    const satir =
      siteSatirlari(
        siteler,
        { seramik: { ad: "Seramik", asil: alt } },
        new Map(),
        new Set([alt.ad]),
      )["seramik"] ?? "";
    const [deneme = "", asil = ""] = satir.split(/\n(?=seramik\.eticaretmagazasi\.com \{)/);
    expect(deneme.startsWith("seramik.deneme.eticaretmagazasi.com {")).toBe(true);
    expect(deneme).toContain("import deneme");
    expect(deneme).toContain(`expression \`{http.request.uri} == "${saglikYolu}"\``);
    expect(deneme).toContain("handle @saglik {\n\t\treverse_proxy site-deneme-seramik-3:3000");
    expect(deneme).toContain("redir https://seramik.eticaretmagazasi.com{uri} 308");
    expect(asil.startsWith("seramik.eticaretmagazasi.com {")).toBe(true);
    expect(asil).toContain("import arama-kapali");
    expect(asil).toContain("reverse_proxy site-deneme-seramik-3:3000");
    expect(satir).not.toContain("www.");
  });

  it("arama motorlarına açık sitenin asıl adresi kural almaz, deneme adresi yine kapalıdır", () => {
    const satir =
      siteSatirlari(
        siteler,
        { seramik: { ad: "Seramik", asil: alt, aramaAcik: true } },
        new Map(),
        new Set([alt.ad]),
      )["seramik"] ?? "";
    const [deneme = "", asil = ""] = satir.split(/\n(?=seramik\.eticaretmagazasi\.com \{)/);
    expect(deneme).toContain("import deneme");
    expect(asil).not.toContain("arama-kapali");
    expect(asil).not.toContain("import deneme");
  });

  it("kendi alan adında www. hâli www'suz adrese yönlenir", () => {
    const satir =
      siteSatirlari(
        siteler,
        { seramik: { ad: "Seramik", asil: kendi } },
        new Map(),
        new Set(asilAdresAdlari(kendi)),
      )["seramik"] ?? "";
    expect(satir).toContain("seramikdukkani.com {\n\timport arama-kapali");
    expect(satir).toContain(
      "www.seramikdukkani.com {\n\tredir https://seramikdukkani.com{uri} 308\n}",
    );
    expect(satir).toContain("redir https://seramikdukkani.com{uri} 308");
  });

  it("çözülmeyen asıl adres ön kapıya girmez: kendi alan adında www. hâli çözülmezse de", () => {
    for (const cozulenler of [
      new Set<string>(),
      new Set([kendi.ad]),
      new Set([`www.${kendi.ad}`]),
    ]) {
      const satir =
        siteSatirlari(siteler, { seramik: { ad: "Seramik", asil: kendi } }, new Map(), cozulenler)[
          "seramik"
        ] ?? "";
      expect(satir).not.toContain("seramikdukkani.com");
      expect(satir).not.toContain("redir");
    }
  });

  it("deneme adresinin sağlık ucu kutu kapalıyken bakım zarfıyla 503 alır; kural deneme adresinin ortak kuralıdır", () => {
    const satir =
      siteSatirlari(
        siteler,
        { seramik: { ad: "Seramik", asil: alt } },
        new Map(),
        new Set([alt.ad]),
      )["seramik"] ?? "";
    const deneme = satir.slice(0, satir.indexOf("\nseramik.eticaretmagazasi.com {"));
    expect(deneme).toContain("handle_errors 502 503 504 {\n\t\timport bakim-basliklari");
    expect(deneme).toContain('respond `\\{"basarili":false,"hata":\\{"kod":');
    expect(siteSatirlari(siteler, { seramik: { ad: "Seramik" } })["seramik"]).toContain(
      "seramik.deneme.eticaretmagazasi.com {\n\timport deneme\n",
    );
  });

  it("asıl adres satırında da kutu hedefi denetlenir", () => {
    expect(() => siteSatiri(alt.ad, "x:1\n}\n:80 {", { ad: "S" })).toThrow("Geçersiz kutu hedefi");
  });

  it("aynı asıl adresi ikinci taşıyan site deneme adresinde kalır", () => {
    const satirlar = siteSatirlari(
      { a: 1, b: 2 },
      { a: { ad: "A", asil: alt }, b: { ad: "B", asil: alt } },
      new Map(),
      new Set([alt.ad]),
    );
    expect(satirlar["a"]).toContain("redir https://seramik.eticaretmagazasi.com");
    expect(satirlar["b"]).not.toContain("seramik.eticaretmagazasi.com {");
  });

  it("elle bakım asıl adreste de geçerlidir", () => {
    const satir =
      siteSatirlari(
        siteler,
        { seramik: { ad: "Seramik", asil: alt } },
        new Map([["seramik", "2026-11-28T00:00:00Z"]]),
        new Set([alt.ad]),
      )["seramik"] ?? "";
    const asil = satir.slice(satir.indexOf("\nseramik.eticaretmagazasi.com {"));
    expect(asil).toContain("error 503");
  });
});

describe("site bilgisi", () => {
  it("asıl adres ve arama ayarı yayın klasöründeki kimlik ve ayarlardan okunur", () => {
    const bilgi = bakimBilgisiCoz(
      "seramik",
      JSON.stringify({ gorunenAd: "Seramik", adresler: { canli: "https://seramikdukkani.com" } }),
      JSON.stringify({ aramaMotorlarinaAcik: true }),
    );
    expect(bilgi.asil).toEqual({ tur: "kendi", ad: "seramikdukkani.com" });
    expect(bilgi.aramaAcik).toBe(true);
  });

  it("geçersiz asıl adres ve tür dışı ayar kullanılmaz", () => {
    const bilgi = bakimBilgisiCoz(
      "seramik",
      JSON.stringify({ adresler: { canli: "http://seramik.eticaretmagazasi.com" } }),
      JSON.stringify({ aramaMotorlarinaAcik: "evet" }),
    );
    expect(bilgi.asil).toBeUndefined();
    expect(bilgi.aramaAcik).toBe(false);
    expect(bakimBilgisiCoz("x", '{"adresler":5}', "").asil).toBeUndefined();
  });
});

describe("ön kapı satır adları", () => {
  it("site kod adı ve altyapının iki tireli adı kabul edilir, öteki adlar reddedilir", () => {
    expect(() =>
      kurmaBetigi({ seramik: "", "kapi--deneme": "", "altyapi--hata": "" }),
    ).not.toThrow();
    for (const ad of ["../x", "a/b", "Seramik", "kapi--", "--x", "a b"]) {
      expect(() => kurmaBetigi({ [ad]: "" }), ad).toThrow("Geçersiz site satırı adı");
    }
  });
});

describe("asıl adrese yönlenme ölçümü", () => {
  it("yalnız 308 ve yolu ile sorgusu korunmuş adres geçer", () => {
    const yol = "/denetim?yonlendirme=1";
    const asil = "seramik.eticaretmagazasi.com";
    expect(asilAdreseYonleniyor(308, `https://${asil}${yol}`, asil, yol)).toBe(true);
    expect(asilAdreseYonleniyor(301, `https://${asil}${yol}`, asil, yol)).toBe(false);
    expect(asilAdreseYonleniyor(302, `https://${asil}${yol}`, asil, yol)).toBe(false);
    expect(asilAdreseYonleniyor(308, `https://${asil}/`, asil, yol)).toBe(false);
    expect(asilAdreseYonleniyor(308, `http://${asil}${yol}`, asil, yol)).toBe(false);
    expect(asilAdreseYonleniyor(308, undefined, asil, yol)).toBe(false);
  });
});

describe("yayının asıl adres kilidi", () => {
  const sunucu = { ipv4: "2.31.160.7", ipv6: "2a01:4f8:1c1b:1::1" };

  it("asıl adres yoksa geçer, çözülüyorsa adı döner", async () => {
    expect(await asilAdresKilidi(undefined, sunucu, async () => [])).toBeUndefined();
    expect(
      await asilAdresKilidi("https://seramik.eticaretmagazasi.com", sunucu, async () => [
        ["seramik.eticaretmagazasi.com", undefined],
      ]),
    ).toBe("seramik.eticaretmagazasi.com");
  });

  it("çözülmeyen ad ve geçersiz asıl adres yayını durdurur; kendi alan adında mağaza sahibine yönlendirir", async () => {
    await expect(
      asilAdresKilidi("https://seramik.eticaretmagazasi.com", sunucu, async () => [
        ["seramik.eticaretmagazasi.com", "çözülmüyor"],
      ]),
    ).rejects.toThrow("pnpm alan-adi --onayli");
    await expect(
      asilAdresKilidi("https://seramikdukkani.com", sunucu, async () => [
        ["seramikdukkani.com", undefined],
        ["www.seramikdukkani.com", "çözülmüyor"],
      ]),
    ).rejects.toThrow("Mağaza sahibi kayıtları açmalı");
    await expect(asilAdresKilidi("http://seramik.com", sunucu, async () => [])).rejects.toThrow(
      "Kimlikteki asıl adres",
    );
  });
});
