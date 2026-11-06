// Seviyeli günlük ve ortak hata katmanı (kart 0014, karar 0025).
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gunlukSeviyeleri } from "../../kayitlar/izleme.ts";
import { cekirdekSurumu } from "../../surum.ts";
import { gunluk, gunlukOlustur } from "../gunluk.ts";
import {
  hataIzlemeAraciniBagla,
  hatayiKaydet,
  type IzlenenHata,
  surecHatalariniBagla,
} from "../hata-katmani.ts";
import { gizliIsareti, kartIsareti } from "../maskele.ts";

type Satir = Record<string, unknown> & { zaman?: unknown; seviye?: unknown; site?: unknown };

const yakala = () => {
  const satirlar: { satir: Satir; seviye: string }[] = [];
  const kayit = gunlukOlustur({
    site: () => "deneme-sitesi",
    yaz: (satir, seviye) => satirlar.push({ satir: JSON.parse(satir), seviye }),
  });
  return { kayit, satirlar };
};

// Uygulamanın kendi günlüğünün süreç çıktısına yazdığı satırlar.
const surecCiktisiniYakala = () => {
  const satirlar: Satir[] = [];
  const oku = (parca: string | Uint8Array) => {
    satirlar.push(JSON.parse(String(parca)));
    return true;
  };
  const cikti = vi.spyOn(process.stdout, "write").mockImplementation(oku);
  const hataCiktisi = vi.spyOn(process.stderr, "write").mockImplementation(oku);
  return { satirlar, cikti, hataCiktisi };
};

describe("günlük", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    hataIzlemeAraciniBagla(undefined);
  });

  it("her seviyede zaman, seviye, site kod adı ve çekirdek sürümüyle tek satır JSON yazar", () => {
    const { kayit, satirlar } = yakala();
    for (const seviye of gunlukSeviyeleri) kayit[seviye]("deneme", { adim: 1 });
    expect(satirlar.map((s) => s.seviye)).toEqual([...gunlukSeviyeleri]);
    for (const { satir, seviye } of satirlar) {
      expect(satir).toMatchObject({
        seviye,
        site: "deneme-sitesi",
        cekirdekSurumu,
        mesaj: "deneme",
        alanlar: { adim: 1 },
      });
      expect(Number.isNaN(Date.parse(String(satir.zaman)))).toBe(false);
    }
  });

  it("şifre, anahtar ve kart bilgisini yazmaz; e-postayı ve telefonu kısaltır", () => {
    const { kayit, satirlar } = yakala();
    kayit.bilgi("müşteri ayse@ornek.com girişi denedi", {
      sifre: "Gizli-Sifre-123",
      oturumAnahtari: "abc123",
      musteri: { eposta: "ayse@ornek.com", telefon: "0532 123 45 67" },
      not: "kart 4111 1111 1111 1111",
    });
    const metin = JSON.stringify(satirlar);
    for (const gizli of ["Gizli-Sifre-123", "abc123", "ayse@", "0532", "4111"]) {
      expect(metin).not.toContain(gizli);
    }
    expect(satirlar[0]?.satir).toMatchObject({
      mesaj: "müşteri a***@ornek.com girişi denedi",
      alanlar: {
        sifre: gizliIsareti,
        oturumAnahtari: gizliIsareti,
        musteri: { eposta: "a***@ornek.com", telefon: "*********67" },
        not: `kart ${kartIsareti}`,
      },
    });
  });

  it("sabit alanların üzerine yazılmasına izin vermez", () => {
    const { kayit, satirlar } = yakala();
    kayit.uyari("deneme", { seviye: "bilgi", site: "baska-site" });
    expect(satirlar[0]?.satir).toMatchObject({ seviye: "uyari", site: "deneme-sitesi" });
  });

  it("yazamasa da hata fırlatmaz", () => {
    const kayit = gunlukOlustur({
      yaz: () => {
        throw new Error("disk dolu");
      },
    });
    expect(() => kayit.olumcul("deneme")).not.toThrow();
  });

  it("bilgi ve uyarıyı standart çıktıya, hata ve ölümcülü standart hataya yazar", () => {
    const { cikti, hataCiktisi } = surecCiktisiniYakala();
    gunluk.bilgi("a");
    gunluk.uyari("b");
    gunluk.hata("c");
    gunluk.olumcul("d");
    expect(cikti).toHaveBeenCalledTimes(2);
    expect(hataCiktisi).toHaveBeenCalledTimes(2);
  });

  it("site kod adını çalışan sitenin klasöründen okur", () => {
    vi.stubEnv(
      "SITE_KLASORU",
      resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
    );
    const { satirlar } = surecCiktisiniYakala();
    gunluk.bilgi("deneme");
    expect(satirlar[0]?.site).toBe("gecerli");
  });
});

describe("hata katmanı", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    hataIzlemeAraciniBagla(undefined);
  });

  it("hatayı günlüğe hata seviyesinde, maskelenmiş olarak yazar", () => {
    const { satirlar } = surecCiktisiniYakala();
    hatayiKaydet(new Error("ayse@ornek.com için şifre yanlış"), { yol: "/kapi/deneme" });
    expect(satirlar[0]).toMatchObject({
      seviye: "hata",
      mesaj: "beklenmeyen hata",
      alanlar: { yol: "/kapi/deneme", hata: { mesaj: "a***@ornek.com için şifre yanlış" } },
    });
  });

  it("bağlanan hata izleme aracına maskelenmiş kaydı verir", () => {
    surecCiktisiniYakala();
    const kayitlar: IzlenenHata[] = [];
    hataIzlemeAraciniBagla((kayit) => kayitlar.push(kayit));
    hatayiKaydet(new Error("kart 4111111111111111"), { sifre: "x" }, "olumcul");
    expect(kayitlar).toEqual([
      {
        seviye: "olumcul",
        hata: expect.objectContaining({ mesaj: `kart ${kartIsareti}` }),
        baglam: { sifre: gizliIsareti },
      },
    ]);
  });

  // Next.js açılışı, uçları ve ara katmanı ayrı paketlere derler: açılışta bağlanan aracı öteki
  // kopyalar da görmeli (kart 0049). Gerçek uygulamadaki ölçümü: pnpm hata-izleme-denemesi.
  it("dosyanın başka kopyasından geçen hata, ilk kopyaya bağlanan araca gider", async () => {
    surecCiktisiniYakala();
    const kayitlar: IzlenenHata[] = [];
    hataIzlemeAraciniBagla((kayit) => kayitlar.push(kayit));

    vi.resetModules();
    const ikinciKopya = await import("../hata-katmani.ts");
    expect(ikinciKopya.hatayiKaydet).not.toBe(hatayiKaydet);
    ikinciKopya.hatayiKaydet(new Error("kopyadan"), { kaynak: "kopya" });

    expect(kayitlar).toHaveLength(1);
    expect(kayitlar[0]?.baglam).toEqual({ kaynak: "kopya" });

    ikinciKopya.hataIzlemeAraciniBagla(undefined);
    hatayiKaydet(new Error("çözüldü"));
    expect(kayitlar).toHaveLength(1);
  });

  it("yakalanmamış süreç hatasını ölümcül seviyede kaydeder", () => {
    const { satirlar } = surecCiktisiniYakala();
    const onceki = process.listeners("uncaughtExceptionMonitor");
    surecHatalariniBagla();
    const eklenen = process
      .listeners("uncaughtExceptionMonitor")
      .filter((d) => !onceki.includes(d));
    try {
      expect(eklenen).toHaveLength(1);
      for (const dinleyici of eklenen) dinleyici(new Error("süreç düştü"), "uncaughtException");
      expect(satirlar[0]).toMatchObject({
        seviye: "olumcul",
        alanlar: { kaynak: "surec", tur: "uncaughtException" },
      });
    } finally {
      for (const dinleyici of eklenen) process.off("uncaughtExceptionMonitor", dinleyici);
    }
  });

  it("hata izleme aracı bozulsa da hatayı kaydeder ve uyarı yazar", () => {
    const { satirlar } = surecCiktisiniYakala();
    hataIzlemeAraciniBagla(() => {
      throw new Error("araç kapalı");
    });
    expect(() => hatayiKaydet(new Error("asıl hata"))).not.toThrow();
    expect(satirlar.map((s) => s.seviye)).toEqual(["hata", "uyari"]);
  });
});
