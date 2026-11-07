// Her rolün her uçtaki erişimi, gerçek veritabanıyla (kart 0030, karar 0047, .claude/rules/yetki.md).
// Uç listesi uygulamanın adres dosyalarından okunur, kimse elle yazmaz. Makinenin gerçekten yakaladığı,
// yalnız bu testte duran örnek uçlarla gösterilir (ornek-adresler/): bugün uygulamada yönetici ve müşteri
// ucu yoktur.
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { baslangicRolleri } from "../../moduller/ekip/baslangic-rolleri.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  belgedekiIzinler,
  erisebilirMi,
  erisimleriDene,
  type KayitliUc,
  kapiDisiAdresler,
  kisiler,
  oturumCerezi,
  uclariOku,
  uygulamaAdresleri,
} from "./erisim-denemesi.ts";

const ornekler = join(import.meta.dirname, "ornek-adresler");
const belge = readFileSync(join(import.meta.dirname, "..", "uclar.md"), "utf8");

const belgeUret = (satirlar: Record<string, string>): string =>
  Object.entries(satirlar)
    .map(([baslik, izin]) => `### ${baslik}\n\n- İzin: \`${izin}\`. Sınır: \`genel\`.\n`)
    .join("\n");

// Müşteri girişindeki her uç burada başka müşterinin kaydını isteyen bir senaryo yazar: kapı kaydın kime
// ait olduğunu bilemez, süzmek ucun işidir (karar 0040). Senaryosu olmayan uç testi kırmızıya düşürür.
// Senaryo A'nın oturumuyla B'nin kaydını ister. İstek gerçekten işlenmeli (200): reddedilen ya da şemadan
// geçmeyen istek hiçbir şey kanıtlamaz. Senaryo B'ye veri hazırlayıp aranan değerleri verir (adres, sipariş
// gibi); verilmezse B'nin e-postası aranır. Yazma yapan uçta B'nin kaydının değişmediğini ucu yazan ölçer.
type MusteriSenaryosu = (b: { kimlik: string; eposta: string }) => Promise<{
  sorgu?: string;
  govde?: unknown;
  aranan?: string[];
}>;
const musteriSenaryolari: Record<string, MusteriSenaryosu> = {
  // Uç girdi almaz, kimliği yalnız kapıdan okur: A kendi e-postasını görür, B'ninkini göremez.
  "GET /kapi/musteri/hesabim": async () => ({}),
};

const senaryosuzUclar = (uclar: readonly KayitliUc[], senaryolar: Record<string, unknown>) =>
  uclar
    .filter(({ giris }) => giris === "musteri")
    .map(({ baslik }) => baslik)
    .filter((baslik) => !(baslik in senaryolar));

let vt: Veritabani;
let sil: () => Promise<void>;
let sayac = 0;

const yeniMusteri = async () => {
  sayac += 1;
  const eposta = `musteri${sayac}@ornek.test`;
  const { hesapKimligi } = await hesapAc(vt, "musteri", {
    eposta,
    sifre: "uzun-bir-deneme-sifresi",
  });
  return { kimlik: hesapKimligi, eposta };
};

// A'nın oturumuyla B'nin kaydını ister, B'nin e-postası yanıtta olmamalı.
const baskasininKaydi = async ({ yontem, yol, uc }: KayitliUc, senaryo: MusteriSenaryosu) => {
  const a = await yeniMusteri();
  const b = await yeniMusteri();
  const { sorgu = "", govde, aranan = [b.eposta] } = await senaryo(b);
  const yanit = await uc(
    new Request(`http://yerel${yol}${sorgu}`, {
      method: yontem,
      headers: {
        "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
        cookie: await oturumCerezi(vt, "musteri", a.kimlik),
      },
      ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
    }),
  );
  const metin = await yanit.text();
  const sorunlar = [
    ...(yanit.status === 200 ? [] : [`istek işlenmedi (${yanit.status})`]),
    ...aranan.filter((deger) => metin.includes(deger)).map((deger) => `yanıtta ${deger}`),
  ];
  return { durum: yanit.status, metin, a, b, sorunlar };
};

beforeAll(async () => {
  const site = await denemeSitesiAc("erisim");
  vt = site.vt;
  sil = site.sil;
  vi.stubEnv("VERITABANI_ADRESI", site.baglantiAdresi);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  vi.stubEnv(
    "SITE_KLASORU",
    resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
  await baglantiyiKapat();
});

afterAll(async () => {
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
});

describe("uygulamanın uçları", () => {
  it("liste adres dosyalarından gelir, belgedeki bütün izinler okunur", async () => {
    const uclar = await uclariOku(uygulamaAdresleri);
    expect(uclar.length).toBeGreaterThan(0);
    expect(uclar.map(({ baslik }) => baslik).toSorted()).toEqual(
      [...belgedekiIzinler(belge).keys()].toSorted(),
    );
  });

  it("her kişi her uçta izin kaydının söylediğini görür", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const uclar = await uclariOku(uygulamaAdresleri);
    expect(await erisimleriDene(vt, uclar, belge)).toEqual([]);
    vi.restoreAllMocks();
  });

  it("kapı dışında ya da başka adla yazılmış adres yok, sahip panelinde de", () => {
    const uygulama = join(uygulamaAdresleri, "..");
    const sahipPaneli = resolve(import.meta.dirname, "../../../sahip-paneli");
    expect(kapiDisiAdresler(uygulama)).toEqual([]);
    expect(kapiDisiAdresler(join(sahipPaneli, "app"))).toEqual([]);
    expect(kapiDisiAdresler(join(sahipPaneli, "src"))).toEqual([]);
  });

  it("müşteri girişindeki her ucun başka müşteri senaryosu var", async () => {
    const uclar = await uclariOku(uygulamaAdresleri);
    expect(senaryosuzUclar(uclar, musteriSenaryolari)).toEqual([]);
    for (const uc of uclar.filter(({ giris }) => giris === "musteri")) {
      const senaryo = musteriSenaryolari[uc.baslik];
      if (senaryo === undefined) continue;
      expect((await baskasininKaydi(uc, senaryo)).sorunlar).toEqual([]);
    }
  });
});

describe("kişi listesi", () => {
  it("girişsiz, müşteri, rolsüz yönetici ve kayıttaki her rol var", () => {
    expect(kisiler.map(({ tur }) => tur)).toEqual(expect.arrayContaining(["girissiz", "musteri"]));
    const yoneticiler = kisiler.filter((kisi) => kisi.tur === "yonetici");
    expect(yoneticiler.length).toBeGreaterThanOrEqual(3);
  });

  it("beklenti izin kaydından çıkar", () => {
    const [girissiz, musteri, rolsuz, ...roller] = kisiler;
    if (girissiz === undefined || musteri === undefined || rolsuz === undefined) {
      throw new Error("Kişi eksik.");
    }
    for (const kisi of kisiler) expect(erisebilirMi(kisi, "herkese-acik")).toBe(true);
    expect(erisebilirMi(girissiz, "ekip.gor")).toBe(false);
    expect(erisebilirMi(musteri, "ekip.gor")).toBe(false);
    expect(erisebilirMi(rolsuz, "ekip.kendi-hesabi.gor")).toBe(false);
    expect(erisebilirMi(musteri, "musteri.kendi-hesabi.gor")).toBe(true);
    for (const rol of roller) {
      expect(erisebilirMi(rol, "musteri.kendi-hesabi.gor")).toBe(false);
      expect(erisebilirMi(rol, "ekip.kendi-hesabi.gor")).toBe(true);
    }
  });

  // Kart 0076 ve 0077 (kullanıcı kararları): her rol ürünü ve kategoriyi görür ve değiştirir, yalnız
  // tam yetkili siler. Uçlar panel ekranlarıyla gelir; o zaman bu beklenti her uçta gerçek
  // veritabanıyla denenir.
  it.each([
    ["ürün", "urun.gor", "urun.degistir", "urun.sil"],
    ["kategori", "kategori.gor", "kategori.degistir", "kategori.sil"],
  ] as const)(
    "%s izinleri: her rol görür ve değiştirir, yalnız tam yetkili siler",
    (_ad, gor, degistir, sil) => {
      const [girissiz, musteri, rolsuz, ...roller] = kisiler;
      for (const kisi of [girissiz, musteri, rolsuz]) {
        if (kisi === undefined) throw new Error("Kişi eksik.");
        for (const izin of [gor, degistir, sil]) {
          expect(erisebilirMi(kisi, izin)).toBe(false);
        }
      }
      expect(roller.length).toBeGreaterThanOrEqual(2);
      for (const rol of roller) {
        if (rol.tur !== "yonetici" || rol.rolKodu === null) throw new Error("Rol eksik.");
        expect(erisebilirMi(rol, gor)).toBe(true);
        expect(erisebilirMi(rol, degistir)).toBe(true);
        expect(erisebilirMi(rol, sil)).toBe(baslangicRolleri[rol.rolKodu].tamYetki);
      }
    },
  );
});

describe("makine gerçekten yakalıyor", () => {
  const dogruBelge = belgeUret({
    "GET /kapi/yonetici/ekip-listesi": "ekip.gor",
    "GET /kapi/musteri/hesabim": "musteri.kendi-hesabi.gor",
  });

  it("doğru yazılmış yönetici ve müşteri ucu temiz geçer, izinsiz rol giremez", async () => {
    const uclar = await uclariOku(join(ornekler, "dogru"));
    expect(uclar.map(({ baslik }) => baslik)).toEqual([
      "GET /kapi/musteri/hesabim",
      "GET /kapi/yonetici/ekip-listesi",
    ]);
    expect(await erisimleriDene(vt, uclar, dogruBelge)).toEqual([]);
  });

  it("uca belgeden farklı izin yazılınca kırmızı, yanlış açılan rol görünür", async () => {
    const uclar = await uclariOku(join(ornekler, "yanlis-izin"));
    const hatalar = await erisimleriDene(
      vt,
      uclar,
      belgeUret({ "POST /kapi/yonetici/rol-ata": "ekip.rol-ata" }),
    );
    expect(hatalar.join("\n")).toContain('uçta "ekip.kendi-hesabi.gor", belgede "ekip.rol-ata"');
    // Sınırlı rol bu uca hiç girmemeliydi, yanlış izin onu içeri aldı.
    expect(hatalar.join("\n")).toMatch(/rolü erişmemeliydi/);
  });

  it("kapıdan geçmeyen uç kırmızı: girişsiz ziyaretçi erişmemeliydi", async () => {
    const uclar = await uclariOku(join(ornekler, "atlayan"));
    const hatalar = await erisimleriDene(
      vt,
      uclar,
      belgeUret({ "GET /kapi/yonetici/ekip-listesi": "ekip.gor" }),
    );
    expect(hatalar.join("\n")).toContain("girişsiz ziyaretçi erişmemeliydi");
    expect(hatalar.join("\n")).toContain("müşteri erişmemeliydi");
  });

  it("belgede yazmayan ya da kayıtta olmayan izin kırmızı", async () => {
    const uclar = await uclariOku(join(ornekler, "dogru"));
    const eksik = await erisimleriDene(vt, uclar, "");
    expect(eksik.join("\n")).toContain("belgede izni yok");
    const uydurma = await erisimleriDene(
      vt,
      uclar,
      belgeUret({
        "GET /kapi/yonetici/ekip-listesi": "uydurma.izin",
        "GET /kapi/musteri/hesabim": "musteri.kendi-hesabi.gor",
      }),
    );
    expect(uydurma.join("\n")).toContain("izin kaydında yok");
  });

  it("yeni eklenen uç listeye kendiliğinden girer, belgesiz olduğu için kırmızı", async () => {
    const klasor = mkdtempSync(join(tmpdir(), "erisim-"));
    try {
      const yeni = join(klasor, "yonetici", "yeni-uc");
      mkdirSync(yeni, { recursive: true });
      writeFileSync(
        join(yeni, "route.ts"),
        `export const DELETE = Object.assign(async () => new Response("{}"), {
          tanim: { giris: "yonetici", izin: "ekip.gor", sinir: "genel" },
        });\n`,
      );
      const uclar = await uclariOku(klasor);
      expect(uclar.map(({ baslik }) => baslik)).toEqual(["DELETE /kapi/yonetici/yeni-uc"]);
      expect(await erisimleriDene(vt, uclar, "")).toEqual([
        "DELETE /kapi/yonetici/yeni-uc: belgede izni yok",
      ]);
    } finally {
      rmSync(klasor, { recursive: true, force: true });
    }
  });

  it("yeni müşteri ucu senaryosu yazılmadan kırmızı", async () => {
    const uclar = await uclariOku(join(ornekler, "dogru"));
    expect(senaryosuzUclar(uclar, {})).toEqual(["GET /kapi/musteri/hesabim"]);
    expect(senaryosuzUclar(uclar, { "GET /kapi/musteri/hesabim": () => ({}) })).toEqual([]);
  });

  it("süzen müşteri ucu başkasının kaydını vermez, kimliği girdiden alan uç verir", async () => {
    const senaryo: MusteriSenaryosu = async ({ kimlik }) => ({ sorgu: `?kimlik=${kimlik}` });
    const [dogru] = (await uclariOku(join(ornekler, "dogru"))).filter(
      ({ giris }) => giris === "musteri",
    );
    const [bozuk] = await uclariOku(join(ornekler, "baskasinin"));
    if (dogru === undefined || bozuk === undefined) throw new Error("Örnek uç yok.");

    const iyi = await baskasininKaydi(dogru, senaryo);
    expect(iyi.durum).toBe(200);
    expect(iyi.metin).toContain(iyi.a.eposta);
    expect(iyi.sorunlar).toEqual([]);

    const kotu = await baskasininKaydi(bozuk, senaryo);
    expect(kotu.metin).toContain(kotu.b.eposta);
    expect(kotu.sorunlar).toEqual([`yanıtta ${kotu.b.eposta}`]);
  });

  it("işlenmeyen istek kanıt sayılmaz: yanlış parametreli senaryo kırmızı", async () => {
    const [bozuk] = await uclariOku(join(ornekler, "baskasinin"));
    if (bozuk === undefined) throw new Error("Örnek uç yok.");
    const bosSenaryo: MusteriSenaryosu = async () => ({});
    expect((await baskasininKaydi(bozuk, bosSenaryo)).sorunlar).toEqual(["istek işlenmedi (400)"]);
  });

  it("senaryonun verdiği değer aranır: e-posta dönmese de sızıntı görünür", async () => {
    const [bozuk] = await uclariOku(join(ornekler, "baskasinin"));
    if (bozuk === undefined) throw new Error("Örnek uç yok.");
    const sonuc = await baskasininKaydi(bozuk, async ({ kimlik }) => ({
      sorgu: `?kimlik=${kimlik}`,
      aranan: ["kayit"],
    }));
    expect(sonuc.sorunlar).toEqual(["yanıtta kayit"]);
  });

  it("izinli kişi reddedilirse de kırmızı", async () => {
    const reddeden = Object.assign(async () => new Response("", { status: 403 }), {
      tanim: {
        giris: "herkese-acik" as const,
        izin: "herkese-acik" as const,
        sinir: "genel" as const,
      },
    });
    const hatalar = await erisimleriDene(
      vt,
      [
        {
          baslik: "GET /kapi/herkese-acik/x",
          yontem: "GET",
          yol: "/kapi/herkese-acik/x",
          giris: "herkese-acik",
          uc: reddeden,
        },
      ],
      belgeUret({ "GET /kapi/herkese-acik/x": "herkese-acik" }),
    );
    expect(hatalar.join("\n")).toContain("erişmeliydi");
  });

  it("kapı dışındaki ve route.ts adı dışındaki adres yakalanır", () => {
    const klasor = mkdtempSync(join(tmpdir(), "erisim-app-"));
    try {
      for (const yol of [
        "kapi/yonetici/dogru/route.ts",
        "kapi/yonetici/uzanti/route.tsx",
        "gizli/js/route.js",
        "api/dis/route.ts",
      ]) {
        mkdirSync(join(klasor, yol, ".."), { recursive: true });
        writeFileSync(join(klasor, yol), "export {};\n");
      }
      expect(kapiDisiAdresler(klasor)).toEqual([
        "api/dis/route.ts",
        "gizli/js/route.js",
        "kapi/yonetici/uzanti/route.tsx",
      ]);
    } finally {
      rmSync(klasor, { recursive: true, force: true });
    }
  });
});
