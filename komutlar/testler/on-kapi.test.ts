// Ön kapının tanımı ve denetiminin karar kuralları (kart 0020). Her kuralın bozuk bir örneği
// yakaladığı gösterilir.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { siteKlasorunuOku } from "../../cekirdek/ayar-semasi/site-klasoru.ts";
import {
  alanAdiKayitlari,
  ayniAdres,
  bakimBilgisiCoz,
  bakimDamgasi,
  bakimIsaretiBetigi,
  bakimListesiniCoz,
  bakimSayfasi,
  bakimSuresiHatasi,
  bakimUnutulduMetni,
  caddyGoruntusu,
  denemeAdresi,
  denemeSatiri,
  dizineKapali,
  kalanGun,
  kimlikAdresiHatasi,
  kodAdiGecerli,
  kurmaBetigi,
  kutuKisitHatalari,
  onKapiTanimi,
  robotlaraKapali,
  saglikYolu,
  sertifikaReddedildi,
  siteSatiri,
  sonIstemciAdresi,
  yayiniDurdurmayanSatir,
  yoklamaAdi,
  yoklamaAdresi,
  yonlendirmeDogru,
} from "../on-kapi.mts";

const kok = join(import.meta.dirname, "..", "..");

describe("deneme adresi", () => {
  it("kod adından üretilir", () => {
    expect(denemeAdresi("ornek-magaza")).toBe("ornek-magaza.deneme.eticaretmagazasi.com");
  });

  it.each(["Ornek", "ornek_magaza", "ornek.magaza", "-ornek", "a".repeat(41), ""])(
    "geçersiz kod adını reddeder: %j",
    (kodAdi) => {
      expect(() => denemeAdresi(kodAdi)).toThrow();
    },
  );

  it("yoklama adı hiçbir kod adıyla çakışmaz", () => {
    expect(() => denemeAdresi(yoklamaAdi)).toThrow();
  });

  it("alan adı kayıtları joker ve vekilsizdir", () => {
    const kayitlar = alanAdiKayitlari("2.31.160.7", "2a01::1");
    expect(kayitlar.map((k) => [k.type, k.name, k.proxied])).toEqual([
      ["A", "*.deneme.eticaretmagazasi.com", false],
      ["AAAA", "*.deneme.eticaretmagazasi.com", false],
    ]);
  });
});

// Sitenin kimliğindeki deneme adresi ön kapının adresiyle aynı olmalı (kart 0023).
describe("sitelerin kimliğindeki deneme adresi", () => {
  const siteler = readdirSync(join(kok, "siteler"), { withFileTypes: true })
    .filter((girdi) => girdi.isDirectory())
    .map((girdi) => siteKlasorunuOku(join(kok, "siteler", girdi.name)).kimlik);

  it.each(siteler.map((kimlik) => [kimlik.kodAdi, kimlik] as const))(
    "%s: kimlikte ön kapının adresi yazıyor",
    (_kodAdi, kimlik) => {
      expect(kimlikAdresiHatasi(kimlik)).toBeUndefined();
    },
  );

  it.each([
    ["adres yok", {}, "yok"],
    ["başka sitenin adresi", { deneme: "https://baska.deneme.eticaretmagazasi.com" }, "beklenen"],
    ["şifresiz", { deneme: "http://ornek-site.deneme.eticaretmagazasi.com" }, "beklenen"],
    [
      "sonunda eğik çizgi",
      { deneme: "https://ornek-site.deneme.eticaretmagazasi.com/" },
      "beklenen",
    ],
  ])("bozuk kimlik yakalanır: %s", (_ad, adresler, beklenen) => {
    expect(kimlikAdresiHatasi({ kodAdi: "ornek-site", adresler })).toContain(beklenen);
  });
});

describe("Caddy satırı", () => {
  it("deneme kuralını alır ve kutuya gönderir", () => {
    expect(denemeSatiri(yoklamaAdresi, "on-kapi-yoklama:3000")).toBe(
      `${yoklamaAdresi} {\n\timport deneme\n\treverse_proxy on-kapi-yoklama:3000\n}\n`,
    );
  });

  it.each([
    ["ornek.com", "kutu:3000"],
    ["x.deneme.eticaretmagazasi.com { }\nkotu", "kutu:3000"],
    ["x.deneme.eticaretmagazasi.com", "kutu:3000\n}\n:80 {"],
    ["x.deneme.eticaretmagazasi.com", "kutu"],
  ])("deneme alanı dışını ya da ayar sızdıran girdiyi reddeder: %j", (adres, hedef) => {
    expect(() => denemeSatiri(adres, hedef)).toThrow();
  });
});

describe("bakım sayfası", () => {
  const adres = "ornek-magaza.deneme.eticaretmagazasi.com";
  const hedef = "site-deneme-ornek-magaza-6:3000";
  const bilgi = { ad: "Örnek Mağaza" };

  it("ortak metinle ve sitenin adıyla çıkar, damga taşır, ham renk taşımaz", () => {
    const sayfa = bakimSayfasi(bilgi);
    expect(sayfa).toContain("Örnek Mağaza");
    expect(sayfa).toContain("Birazdan yeniden buradayız");
    expect(sayfa).toContain(bakimDamgasi);
    expect(sayfa).toContain('lang="tr"');
    expect(sayfa).not.toMatch(/__[A-Z]+__/);
    expect(sayfa).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
  });

  it("süslü ayraç taşımaz: Caddy yer tutucu sanırdı", () => {
    expect(bakimSayfasi(bilgi)).not.toMatch(/[{}]/);
  });

  it("sitenin metni ortak metnin yerine geçer", () => {
    const sayfa = bakimSayfasi({ ...bilgi, metin: "Saat 14:00'te döneceğiz." });
    expect(sayfa).toContain("Saat 14:00&#39;te döneceğiz.");
    expect(sayfa).not.toContain("Birazdan yeniden buradayız");
  });

  it.each([
    ["HTML", "<script>x</script>", "&#60;script&#62;"],
    ["Caddy yer tutucusu", "{env.HETZNER_ANAHTARI}", "env.HETZNER_ANAHTARI"],
    ["Caddy ayar kaçışı", "\\`\nrespond 200", "&#96;"],
  ])("%s metinden kaçamaz", (_ad, metin, beklenen) => {
    const sayfa = bakimSayfasi({ ad: metin, metin });
    expect(sayfa).toContain(beklenen);
    expect(sayfa).not.toContain(metin);
  });

  it("bilinmeyen dil ortak dile düşer", () => {
    expect(bakimSayfasi({ ...bilgi, dil: "xx" })).toContain('lang="tr"');
  });

  it("olağan satır kutuya gönderir, sağlık yoklar, hata yolunda sayfayı 503 ile verir", () => {
    const satir = siteSatiri(adres, hedef, bilgi);
    expect(satir).toContain(`health_uri ${saglikYolu}`);
    expect(satir).toContain("health_fails 6");
    expect(satir).toContain("response_header_timeout 30s");
    expect(satir).toContain("method GET HEAD");
    expect(satir).toContain(`{http.request.uri} == "${saglikYolu}"`);
    expect(satir).toContain("handle_errors 502 503 504");
    expect(satir).toContain("import bakim-basliklari");
    expect(satir).not.toContain("error 503");
  });

  it("elle bakımda kutuya yalnız sağlık ucu gider, panel de kapanır", () => {
    const satir = siteSatiri(adres, hedef, bilgi, { elleBakim: true });
    expect(satir).toContain("handle @saglik {");
    expect(satir).toContain("handle {\n\t\terror 503\n\t}");
    expect(satir.match(/reverse_proxy/g)).toHaveLength(1);
  });

  it("kapıya gelen istek zarfla cevap alır, zarftaki ayraçlar kaçırılır", () => {
    expect(siteSatiri(adres, hedef, bilgi)).toContain(
      'respond `\\{"basarili":false,"hata":\\{"kod":"hizmet-kullanilamiyor"\\}\\}` 503',
    );
  });

  it("deneme alanı dışını ve ayar sızdıran hedefi reddeder", () => {
    expect(() => siteSatiri("ornek.com", hedef, bilgi)).toThrow();
    expect(() => siteSatiri(adres, "kutu:3000\n}\n:80 {", bilgi)).toThrow();
  });

  it("Caddyfile bakım başlıklarını tanımlar", () => {
    const ayar = readFileSync(join(kok, "sunucu", "on-kapi", "Caddyfile"), "utf8");
    expect(ayar).toContain("(bakim-basliklari)");
    expect(ayar).toContain('Retry-After "300"');
    expect(ayar).toMatch(/\(bakim-basliklari\)[\s\S]*X-Robots-Tag "noindex, nofollow"/);
  });

  it("metindeki $ ve yer tutucuya benzeyen yazı yorumlanmaz", () => {
    const sayfa = bakimSayfasi({ ad: "__METIN__", metin: "100$'a kadar, $& ve $$" });
    expect(sayfa).toContain("100$&#39;a kadar, $&#38; ve $$");
    expect(sayfa).toContain("<title>Bakımdayız · __METIN__</title>");
  });

  it("bozuk site bilgisi kod adına düşer, tür dışı değer kullanılmaz", () => {
    expect(bakimBilgisiCoz("x", '{"gorunenAd":"Ad"}', '{"bakimMetni":"M"}')).toEqual({
      ad: "Ad",
      dil: undefined,
      metin: "M",
    });
    expect(bakimBilgisiCoz("x", "", "").ad).toBe("x");
    expect(bakimBilgisiCoz("x", '{"gorunenAd":5}', "[]").ad).toBe("x");
    expect(() => bakimBilgisiCoz("x", "{bozuk", "")).toThrow();
  });

  it("geri almada önceki zaman korunur, işlem kayda geçer", () => {
    const betik = bakimIsaretiBetigi("ornek-magaza", true, {
      zaman: "2026-11-06T10:00:00Z",
      islem: "geri-alindi",
    });
    expect(betik).toContain("printf '%s\\n' '2026-11-06T10:00:00Z' >");
    expect(betik).toContain('"islem":"geri-alindi"');
    expect(() => bakimIsaretiBetigi("x", true, { zaman: "'; rm" })).toThrow();
  });

  it("bakımdaki site listesi: bozuk satır atlanır", () => {
    expect(bakimListesiniCoz("ornek-magaza 2026-11-06T10:00:00Z\n").get("ornek-magaza")).toBe(
      "2026-11-06T10:00:00Z",
    );
    expect(bakimListesiniCoz("").size).toBe(0);
    expect(bakimListesiniCoz("../kotu x\n").size).toBe(0);
  });

  it("yayını yalnız unutulan bakım satırı durdurmaz", () => {
    expect(yayiniDurdurmayanSatir(`HATA x: ${bakimUnutulduMetni}: açık`)).toBe(true);
    expect(yayiniDurdurmayanSatir("HATA deneme/x yayındaki kutusu: sağlık ucu")).toBe(false);
  });

  it("24 saatten uzun açık bakım kırmızıdır, okunamayan zaman da", () => {
    const simdi = Date.parse("2026-11-07T12:00:00Z");
    expect(bakimSuresiHatasi("2026-11-07T11:00:00Z", simdi)).toBeUndefined();
    expect(bakimSuresiHatasi("2026-11-06T11:00:00Z", simdi)).toContain("24 saatten");
    expect(bakimSuresiHatasi("bozuk", simdi)).toContain("okunamadı");
  });

  it("işaret betiğinin sözdizimi doğru, geçersiz kod adını reddeder", () => {
    for (const acik of [true, false]) {
      const sonuc = spawnSync("bash", ["-n"], {
        input: bakimIsaretiBetigi("ornek-magaza", acik),
        encoding: "utf8",
      });
      expect(sonuc.status).toBe(0);
    }
    expect(() => bakimIsaretiBetigi("../x", true)).toThrow();
  });

  it("açık bakımı yeniden açmak başlangıç zamanını değiştirmez", () => {
    expect(bakimIsaretiBetigi("ornek-magaza", true)).toContain(
      "[ -f /srv/altyapi/on-kapi/bakim-acik/ornek-magaza ] ||",
    );
  });
});

describe("kutu tanımı", () => {
  const tanim = onKapiTanimi();

  it("yalnız 80 ve 443 TCP dışarıya açılır, yoklama kutusu hiç açılmaz", () => {
    expect(tanim.services.caddy.ports).toEqual(["80:80/tcp", "443:443/tcp"]);
    expect("ports" in tanim.services.yoklama).toBe(false);
  });

  it("kutular kök olmayan kullanıcıyla, salt okunur ve tek yetkiyle çalışır", () => {
    for (const servis of Object.values(tanim.services)) {
      expect(servis.user).toMatch(/^[1-9]\d{3,}:[1-9]\d{3,}$/);
      expect(servis.read_only).toBe(true);
      expect(servis.cap_drop).toEqual(["ALL"]);
      expect(servis.cap_add).toEqual(["NET_BIND_SERVICE"]);
      expect(servis.security_opt).toContain("no-new-privileges:true");
    }
  });

  it("ağ IPv6 açıktır (ziyaretçi adresi kaybolmasın)", () => {
    expect(tanim.networks.altyapi.enable_ipv6).toBe(true);
  });

  it("Caddy görüntüsü yerel ortamdakiyle aynıdır", () => {
    const yerel = readFileSync(join(kok, "sunucu", "yerel-ortam.yaml"), "utf8");
    expect(yerel).toContain(`image: ${caddyGoruntusu}`);
  });

  it("üretilen kurma betiği kabuğun sözdizimi denetiminden geçer", () => {
    const betik = kurmaBetigi({
      [yoklamaAdi]: denemeSatiri(yoklamaAdresi, "on-kapi-yoklama:3000"),
    });
    const sonuc = spawnSync("bash", ["-n"], { input: betik, encoding: "utf8" });
    expect(sonuc.stderr).toBe("");
    expect(sonuc.status).toBe(0);
  });

  it("sözdizimi denetimi bozuk betiği yakalar", () => {
    const sonuc = spawnSync("bash", ["-n"], {
      input: 'if [ x ]; then\necho "kapanmadı\n',
      encoding: "utf8",
    });
    expect(sonuc.status).not.toBe(0);
  });

  it("kurma betiği önce doğrular, sonra yerine koyar", () => {
    const betik = kurmaBetigi({ [yoklamaAdi]: "x\n" });
    const dogrulama = betik.indexOf("caddy validate");
    expect(dogrulama).toBeGreaterThan(0);
    expect(dogrulama).toBeLessThan(betik.indexOf(`sudo mv "$t/caddy/Caddyfile"`));
    expect(betik).toContain("çalışmıyor");
  });

  it("kurma betiği listede olmayan site satırlarını siler ve Caddy'yi yeniden okutur", () => {
    const betik = kurmaBetigi({ [yoklamaAdi]: "x\n" });
    expect(betik).toContain(`siteler/${yoklamaAdi}.caddy`);
    expect(betik).toContain(`*" $(basename "$f") "*`);
    expect(betik).toContain("caddy reload");
  });

  it("kurma betiği dosya sonu işaretini taşıyan içeriği reddeder", () => {
    expect(() => kurmaBetigi({ kotu: "ON_KAPI_DOSYA_SONU\nrm -rf /\n" })).toThrow();
  });
});

describe("sunucudaki Caddy ayarı", () => {
  const ayar = readFileSync(join(kok, "sunucu", "on-kapi", "Caddyfile"), "utf8");

  it("şifreli bağlantıyı kapatmaz ve HTTP/3'ü kapatır", () => {
    expect(ayar).not.toMatch(/auto_https\s+off/);
    expect(ayar).toMatch(/protocols h1 h2\n/);
  });

  it("tanınmayan ad şifresiz de şifreli de 404 alır", () => {
    expect(ayar).toMatch(/http:\/\/ \{\n\trespond 404\n\}/);
    expect(ayar).toMatch(/https:\/\/ \{\n\trespond 404\n\}/);
  });

  it("deneme kuralı dizine almayı ve robots.txt'yi kapatır", () => {
    expect(ayar).toContain('X-Robots-Tag "noindex, nofollow"');
    expect(ayar).toContain("Disallow: /");
  });
});

describe("denetimin karar kuralları", () => {
  const adres = "x.deneme.eticaretmagazasi.com";

  it("kalıcı yönlendirme aynı adres ve yola gitmeli", () => {
    expect(yonlendirmeDogru(308, `https://${adres}/a?b=1`, adres, "/a?b=1")).toBe(true);
    expect(yonlendirmeDogru(301, `https://${adres}/`, adres, "/")).toBe(true);
  });

  it.each([
    [302, `https://${adres}/`],
    [308, `http://${adres}/`],
    [308, "https://baska.com/"],
    [308, `https://${adres}/baska`],
    [200, undefined],
  ])("yanlış yönlendirme kırmızıdır: %s %s", (durum, konum) => {
    expect(yonlendirmeDogru(durum, konum, adres, "/")).toBe(false);
  });

  it("dizine alma başlığını okur", () => {
    expect(dizineKapali("noindex, nofollow")).toBe(true);
    expect(dizineKapali(["nofollow", "NoIndex"])).toBe(true);
    expect(dizineKapali("nofollow")).toBe(false);
    expect(dizineKapali(undefined)).toBe(false);
    expect(dizineKapali("index")).toBe(false);
  });

  it("robots.txt bütün siteyi kapatmalı", () => {
    expect(robotlaraKapali("User-agent: *\nDisallow: /\n")).toBe(true);
    expect(robotlaraKapali("User-agent: *\nDisallow: /yonetim\n")).toBe(false);
    expect(robotlaraKapali("User-agent: *\nAllow: /\n")).toBe(false);
    expect(robotlaraKapali("")).toBe(false);
  });

  it("sertifikanın kalan gününü sayar", () => {
    const simdi = new Date("2026-11-05T00:00:00Z");
    expect(kalanGun("Feb  3 00:00:00 2027 GMT", simdi)).toBe(90);
    expect(kalanGun("Nov 10 00:00:00 2026 GMT", simdi)).toBe(5);
    expect(Number.isNaN(kalanGun("okunamadı", simdi))).toBe(true);
  });

  it("istemci adresi başlığının son değerini alır", () => {
    expect(sonIstemciAdresi("1.2.3.4")).toBe("1.2.3.4");
    expect(sonIstemciAdresi("6.6.6.6, 1.2.3.4")).toBe("1.2.3.4");
    expect(sonIstemciAdresi("")).toBeUndefined();
  });

  it("adresleri yazılışından bağımsız karşılaştırır", () => {
    expect(ayniAdres("2a01:4f8:c01e:14ad::1", "2A01:04F8:C01E:14AD:0:0:0:1")).toBe(true);
    expect(ayniAdres("::ffff:1.2.3.4", "1.2.3.4")).toBe(true);
    expect(ayniAdres("1.2.3.4", "1.2.3.5")).toBe(false);
    expect(ayniAdres("2a01::1", "2a01::2")).toBe(false);
    expect(ayniAdres(undefined, "1.2.3.4")).toBe(false);
    expect(ayniAdres("172.17.0.1", "1.2.3.4")).toBe(false);
  });
});

describe("kutuların sunucudaki gerçek ayarı", () => {
  const { caddy } = onKapiTanimi().services;
  const satir = (degisiklik: Partial<Record<number, string>> = {}) => {
    const alanlar = [
      "true",
      "false",
      caddy.user,
      "true",
      '["CAP_NET_BIND_SERVICE"]',
      '["ALL"]',
      '["no-new-privileges:true"]',
      "unless-stopped",
    ];
    for (const [sira, deger] of Object.entries(degisiklik)) alanlar[Number(sira)] = deger ?? "";
    return alanlar.join("|");
  };

  it("tanımla aynı kutu geçer (Docker'ın CAP_ önekiyle de)", () => {
    expect(kutuKisitHatalari(satir(), caddy)).toEqual([]);
    expect(kutuKisitHatalari(satir({ 4: '["NET_BIND_SERVICE"]' }), caddy)).toEqual([]);
  });

  it.each([
    ["kutu durmuş", { 0: "false" }],
    ["yetkili kip", { 1: "true" }],
    ["kök kullanıcı", { 2: "" }],
    ["kök kullanıcı (0:0)", { 2: "0:0" }],
    ["başka kullanıcı", { 2: "10081:10081" }],
    ["yazılabilir dosya sistemi", { 3: "false" }],
    ["fazla yetki", { 4: '["CAP_NET_BIND_SERVICE","CAP_SYS_ADMIN"]' }],
    ["yetkiler kaldırılmamış", { 5: "null" }],
    ["yetki yükseltme açık", { 6: "null" }],
    ["bozuk çıktı", { 6: "[" }],
    ["yeniden başlama kuralı yok", { 7: "no" }],
    ["yeniden başlama kuralı farklı", { 7: "always" }],
    ["yeniden başlama kuralı boş", { 7: "" }],
  ])("%s kırmızıdır", (_ad, degisiklik) => {
    expect(kutuKisitHatalari(satir(degisiklik), caddy)).not.toEqual([]);
  });

  it("okunamayan çıktı kırmızıdır", () => {
    expect(kutuKisitHatalari("", caddy)).not.toEqual([]);
    expect(kutuKisitHatalari(`${satir()}|fazla`, caddy)).not.toEqual([]);
  });
});

describe("tanınmayan adrese sertifika", () => {
  const hata = (code: string, message: string) => Object.assign(new Error(message), { code });

  it("yalnız Caddy'nin TLS uyarısıyla kesmesi yeşildir", () => {
    expect(
      sertifikaReddedildi(
        hata("EPROTO", "SSL routines:ssl3_read_bytes:tlsv1 alert internal error"),
      ),
    ).toBe(true);
  });

  it.each([
    hata("ERR_TLS_CERT_ALTNAME_INVALID", "Hostname/IP does not match certificate's altnames"),
    hata("ECONNREFUSED", "connect ECONNREFUSED"),
    hata("ECONNRESET", "socket hang up"),
    new Error("zaman aşımı"),
    { durum: 200 },
  ])("başka her sonuç kırmızıdır: %o", (sonuc) => {
    expect(sertifikaReddedildi(sonuc)).toBe(false);
  });
});

describe("kurma betiğinin girdileri", () => {
  it.each(['a"; rm -rf / #', "../disari", "$(id)", "Buyuk", "a b"])(
    "site satırı adı kod adı değilse reddedilir: %j",
    (ad) => {
      expect(() => kurmaBetigi({ [ad]: "x\n" })).toThrow();
    },
  );

  it("kod adı kuralı kimlik şemasından okunur", () => {
    expect(kodAdiGecerli("ornek-magaza")).toBe(true);
    expect(kodAdiGecerli("a".repeat(40))).toBe(true);
    expect(kodAdiGecerli("a".repeat(41))).toBe(false);
    expect(kodAdiGecerli(yoklamaAdi)).toBe(false);
  });

  it("ayar dosyaları kutulara klasör olarak bağlanır (yenisi açık kutuya ulaşsın)", () => {
    for (const servis of Object.values(onKapiTanimi().services)) {
      for (const baglama of servis.volumes) {
        expect(baglama.split(":")[0]).not.toMatch(/Caddyfile$/);
      }
    }
  });
});
