// Hata izleme aracına giden olay (kart 0022, karar 0036): adres, etiketler, maskeleme, gönderim
// ve hata katmanından araca giden yol. Gerçek araçla denemesi: pnpm hata-izleme-denemesi.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cekirdekSurumu } from "../../surum.ts";
import { onRequestError } from "../../uygulama/instrumentation.ts";
import {
  type Gonderici,
  gonderimAdresiniCoz,
  hataIzlemeAraciKur,
  hataIzlemeDegiskenleri,
  type Olay,
  olayKur,
  yiginiCoz,
} from "../hata-izleme-araci.ts";
import { hataIzlemeBilgisi, hataIzlemeyiBagla } from "../hata-izleme-baglantisi.ts";
import { hataIzlemeAraciniBagla, hatayiKaydet } from "../hata-katmani.ts";

const anahtar = "0123456789abcdef0123456789abcdef";
const adres = `https://${anahtar}@izleme.ornek.com/7`;
const bilgi = { adres, site: "deneme-sitesi", surum: cekirdekSurumu, ortam: "deneme" };

// Uydurma kişisel ve gizli bilgiler: hiçbiri araca açık gitmemeli.
const eposta = "ayse.yilmaz@ornek.com";
const telefon = "0532 123 45 67";
const sifre = "cokGizli123";
const kart = "4111 1111 1111 1111";
const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig";
const bozukHata = () => {
  const hata = new Error(`ödeme düştü ${eposta} ${telefon} sifre=${sifre} kart ${kart}`);
  Object.assign(hata, { ayrinti: `Bearer ${jwt}` });
  return hata;
};
const acikDegerler = [eposta, "5321234567", telefon, sifre, "4111111111111111", kart, jwt];

const yakalayici = (durum = 200) => {
  const istekler: { adres: string; istek: RequestInit; olay: Olay }[] = [];
  const gonder = vi.fn<Gonderici>(async (adres, istek) => {
    istekler.push({ adres, istek, olay: JSON.parse(String(istek.body)) });
    return new Response(null, { status: durum });
  });
  return { istekler, gonder };
};

const bekle = () => new Promise((coz) => setTimeout(coz, 0));

describe("gönderim adresi", () => {
  it("anahtarı ve proje numarasını adresten çıkarır", () => {
    expect(gonderimAdresiniCoz(adres)).toEqual({
      adres: "https://izleme.ornek.com/api/7/store/",
      anahtar,
    });
  });

  it.each([
    ["boş", ""],
    ["adres değil", "izleme"],
    ["anahtarsız", "https://izleme.ornek.com/7"],
    ["kısa anahtar", "https://abc@izleme.ornek.com/7"],
    ["proje numarasız", `https://${anahtar}@izleme.ornek.com/`],
    ["başka şema", `ftp://${anahtar}@izleme.ornek.com/7`],
  ])("bozuk adres araç bağlamaz: %s", (_, deger) => {
    expect(gonderimAdresiniCoz(deger)).toBeUndefined();
    expect(hataIzlemeAraciKur({ ...bilgi, adres: deger }, { kaynak: "sunucu" })).toBeUndefined();
  });
});

describe("olay", () => {
  const kur = (hata: unknown, baglam: unknown = {}) =>
    olayKur({
      hata,
      baglam,
      seviye: "hata",
      kaynak: "sunucu",
      bilgi,
      olayNumarasi: "1234567890123456789012345678901a",
      zaman: new Date("2026-11-05T10:00:00Z"),
    });

  it("site kod adı, çekirdek sürümü ve ortamla etiketlenir", () => {
    const olay = kur(new Error("bozuk"));
    expect(olay.tags).toEqual({
      site: "deneme-sitesi",
      cekirdek_surumu: cekirdekSurumu,
      kaynak: "sunucu",
    });
    expect(olay.release).toBe(cekirdekSurumu);
    expect(olay.environment).toBe("deneme");
    expect(olay.level).toBe("error");
    expect(olay.platform).toBe("node");
  });

  it("olay numarası ve zaman maskelenmez", () => {
    const olay = kur(new Error("bozuk"));
    expect(olay.event_id).toBe("1234567890123456789012345678901a");
    expect(olay.timestamp).toBe("2026-11-05T10:00:00.000Z");
  });

  it("hatanın adı, mesajı ve yığını olayın hatası olur", () => {
    const olay = kur(new TypeError("bozuk"));
    const [deger] = olay.exception?.values ?? [];
    expect(deger?.type).toBe("TypeError");
    expect(deger?.value).toBe("bozuk");
    const yigin = deger?.stacktrace as { frames: { filename: string }[] } | undefined;
    expect(yigin?.frames.at(-1)?.filename).toContain("hata-izleme-araci.test.ts");
  });

  it("kişisel ve gizli bilgi açık gitmez: mesaj, ek alan, bağlam", () => {
    const metin = JSON.stringify(
      kur(bozukHata(), { eposta, sifre, telefon, yol: `/hesap/${eposta}` }),
    );
    for (const deger of acikDegerler) expect(metin).not.toContain(deger);
    expect(metin).toContain("a***@ornek.com");
  });

  it("maskelenmemiş bir değer verilse de olay maskelenir (ikinci ağ)", () => {
    const metin = JSON.stringify(kur({ ad: "Hata", mesaj: `bozuk ${eposta}`, yigin: sifre }));
    expect(metin).not.toContain(eposta);
  });

  it("hata nesnesi olmayan değer de olay olur", () => {
    const [deger] = kur("düz metin").exception?.values ?? [];
    expect(deger?.type).toBe("Hata");
    expect(deger?.value).toBe("düz metin");
  });
});

describe("yığın", () => {
  it("V8 satırlarını eskiden yeniye çerçeve yapar", () => {
    const yigin = [
      "Error: bozuk",
      "    at icteki (/uygulama/a.js:10:5)",
      "    at /uygulama/b.js:20:7",
      "    at Module._compile (node:internal/modules/cjs/loader:1:1)",
      "    at kutuphane (/uygulama/node_modules/x/index.js:3:4)",
      "    at async node:internal/modules/esm/loader:647:26",
    ].join("\n");
    expect(yiginiCoz(yigin)).toEqual([
      { filename: "node:internal/modules/esm/loader", lineno: 647, colno: 26, in_app: false },
      {
        filename: "/uygulama/node_modules/x/index.js",
        function: "kutuphane",
        lineno: 3,
        colno: 4,
        in_app: false,
      },
      {
        filename: "node:internal/modules/cjs/loader",
        function: "Module._compile",
        lineno: 1,
        colno: 1,
        in_app: false,
      },
      { filename: "/uygulama/b.js", lineno: 20, colno: 7, in_app: true },
      { filename: "/uygulama/a.js", function: "icteki", lineno: 10, colno: 5, in_app: true },
    ]);
    expect(yiginiCoz(undefined)).toEqual([]);
  });

  it("Safari ve Firefox biçimini de çözer, adresin sorgu kısmını atar", () => {
    const yigin = [
      "icteki@https://site.ornek.com/_next/static/a.js?k=degerburada:10:5",
      "@https://site.ornek.com/_next/static/b.js#parca:20:7",
    ].join("\n");
    expect(yiginiCoz(yigin)).toEqual([
      { filename: "https://site.ornek.com/_next/static/b.js", lineno: 20, colno: 7, in_app: true },
      {
        filename: "https://site.ornek.com/_next/static/a.js",
        function: "icteki",
        lineno: 10,
        colno: 5,
        in_app: true,
      },
    ]);
  });
});

describe("gönderim", () => {
  it("olayı anahtarla, çerezsiz gönderir", async () => {
    const { istekler, gonder } = yakalayici();
    hataIzlemeAraciKur(bilgi, { kaynak: "sunucu", gonder })?.(new Error("bozuk"), {}, "olumcul");
    await bekle();
    expect(istekler).toHaveLength(1);
    const [{ adres: hedef, istek, olay }] = istekler as [(typeof istekler)[number]];
    expect(hedef).toBe("https://izleme.ornek.com/api/7/store/");
    expect(istek.method).toBe("POST");
    expect(istek.credentials).toBe("omit");
    expect((istek.headers as Record<string, string>)["X-Sentry-Auth"]).toContain(
      `sentry_key=${anahtar}`,
    );
    expect(olay.level).toBe("fatal");
    expect(olay.event_id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("sınır verilmişse fazlası gönderilmez", async () => {
    const { istekler, gonder } = yakalayici();
    const arac = hataIzlemeAraciKur(bilgi, { kaynak: "tarayici", gonder, enCokOlay: 2 });
    for (let i = 0; i < 5; i++) arac?.(new Error(`bozuk ${i}`), {}, "hata");
    await bekle();
    expect(istekler).toHaveLength(2);
  });

  it("araç reddeder ya da ulaşılamazsa bildirir, hata fırlatmaz", async () => {
    const basarisiz = vi.fn();
    const { gonder } = yakalayici(429);
    hataIzlemeAraciKur(bilgi, { kaynak: "sunucu", gonder, basarisiz })?.(
      new Error("x"),
      {},
      "hata",
    );
    const ulasilamaz = vi.fn<Gonderici>(() => Promise.reject(new Error("ağ yok")));
    hataIzlemeAraciKur(bilgi, { kaynak: "sunucu", gonder: ulasilamaz, basarisiz })?.(
      new Error("x"),
      {},
      "hata",
    );
    await bekle();
    expect(basarisiz).toHaveBeenCalledTimes(2);
  });
});

describe("sunucudaki bağlantı", () => {
  afterEach(() => {
    hataIzlemeAraciniBagla(undefined);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adres ya da ortam yoksa araç bağlanmaz", () => {
    vi.stubEnv(hataIzlemeDegiskenleri.adres, "");
    vi.stubEnv(hataIzlemeDegiskenleri.ortam, "deneme");
    expect(hataIzlemeBilgisi()).toBeUndefined();
    expect(hataIzlemeyiBagla()).toBe(false);
  });

  it("hatayiKaydet'ten geçen hata araca maskelenmiş ve etiketli gider", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const { istekler, gonder } = yakalayici();
    vi.stubGlobal("fetch", gonder);
    expect(hataIzlemeyiBagla(bilgi)).toBe(true);
    hatayiKaydet(bozukHata(), { kaynak: "next", yol: "/odeme", eposta });
    await bekle();
    expect(istekler).toHaveLength(1);
    const metin = JSON.stringify(istekler[0]?.olay);
    for (const deger of acikDegerler) expect(metin).not.toContain(deger);
    expect(istekler[0]?.olay.tags).toMatchObject({ site: "deneme-sitesi", kaynak: "sunucu" });
    expect(istekler[0]?.olay.extra).toMatchObject({ baglam: { kaynak: "next", yol: "/odeme" } });
  });

  // Next.js istek hatasının yoluna sorgu kısmını da yazar; araca yalnız yol gitmeli. Değerlerin
  // adı maskenin tanıdığı bir sözcük değildir: gizlenmeleri ancak sorgunun atılmasına bağlıdır.
  it("Next.js istek hatası sorgu kısmı olmadan gider", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const { istekler, gonder } = yakalayici();
    vi.stubGlobal("fetch", gonder);
    hataIzlemeyiBagla(bilgi);
    await onRequestError(
      new Error("sayfa bozuldu"),
      { path: "/ara?q=Gizli Arama Metni&k=dogrulamadegeri", method: "GET", headers: {} },
      {
        routerKind: "App Router",
        routePath: "/ara",
        routeType: "render",
        revalidateReason: undefined,
      },
    );
    await bekle();
    const metin = JSON.stringify(istekler[0]?.olay);
    expect(metin).not.toContain("Gizli Arama Metni");
    expect(metin).not.toContain("dogrulamadegeri");
    expect(istekler[0]?.olay.extra).toMatchObject({ baglam: { yol: "/ara" } });
  });

  it("araç ulaşılamazsa günlüğe uyarı yazılır, uygulama çalışır", async () => {
    const satirlar: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((parca) => {
      satirlar.push(String(parca));
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.stubGlobal("fetch", () => Promise.reject(new Error("ağ yok")));
    hataIzlemeyiBagla(bilgi);
    expect(() => hatayiKaydet(new Error("bozuk"))).not.toThrow();
    await bekle();
    expect(satirlar.some((satir) => satir.includes("hata izleme aracı hatayı alamadı"))).toBe(true);
  });
});
