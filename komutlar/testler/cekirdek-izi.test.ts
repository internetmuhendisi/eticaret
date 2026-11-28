// Bir sürüm numarası yalnız bir çekirdeği gösterir (kart 0040, karar 0205): parmak izinin kapsamı ve yayının kuralı.
// Her kuralın bozuk bir örneği yakalanır. Git kayıtları geçici bir depoda kurulur (hat yalnız son kaydı çeker).
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  birlesikKayitlariCoz,
  cekirdekIzi,
  dockerfileYolu,
  dockerignoreKurallari,
  dockerignoreYolu,
  goruntuyeGirerMi,
  izeGirerMi,
  pakettenMi,
  type SiteninKayitlari,
  surumCakismasi,
} from "../cekirdek-izi.mts";
import { kok } from "../sunucu.mts";
import { butunKayitlarBetigi, kayitlariCoz } from "../yayin.mts";

const gercekKurallar = dockerignoreKurallari(readFileSync(join(kok, dockerignoreYolu), "utf8"));

describe("parmak izinin kapsamı: görüntünün izin listesi ve demo paketleri", () => {
  it.each([
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "yamalar/ornek.patch",
    "cekirdek/surum.ts",
    "cekirdek/moduller/urun/servis.ts",
    "cekirdek/metinler/tr.json",
    "bilesenler/parcalar/dugme.tsx",
    "sahip-paneli/package.json",
  ])("görüntüye girer: %s", (yol) => {
    expect(goruntuyeGirerMi(gercekKurallar, yol)).toBe(true);
  });

  it.each([
    "siteler/ornek-magaza/ayarlar.json",
    "planlar/tasarim-yonu/panel-3.html",
    "kararlar/0205-surum-numarasi-tek-cekirdek.md",
    "komutlar/yayin.mts",
    "cekirdek/moduller/urun/testler/servis.test.ts",
    "cekirdek/testler/uctan-uca/sepet.test.ts",
    "cekirdek/vitrin/urun-sayfasi/galeri.test.tsx",
    "cekirdek/demolar/demo1/paket.json",
    "cekirdek/node_modules/x/index.js",
    "cekirdek/uygulama/.next/server/a.js",
    ".env",
    "cekirdek/.env.local",
    "sahip-paneli/app/page.tsx",
    dockerignoreYolu,
  ])("görüntüye girmez: %s", (yol) => {
    expect(goruntuyeGirerMi(gercekKurallar, yol)).toBe(false);
  });

  it.each([
    ["Dockerfile", dockerfileYolu, true],
    ["dockerignore", dockerignoreYolu, true],
    ["çekirdek kodu", "cekirdek/moduller/urun/servis.ts", true],
    ["demo paketi", "cekirdek/demolar/demo1/paket.json", true],
    ["sürüm notu", "cekirdek/surum-notlari/0.82.0.md", false],
    ["çekirdekteki belge", "cekirdek/kapi/uclar.md", false],
    ["shadcn kaynağı", "bilesenler/shadcn-kaynagi/badge.json", false],
    ["site klasörü", "siteler/ornek-magaza/kimlik.json", false],
    ["komut", "komutlar/cekirdek-goruntusu.mts", false],
  ])("ize girer mi: %s", (_, yol, beklenen) => {
    expect(izeGirerMi(gercekKurallar, yol)).toBe(beklenen);
  });

  it("Docker'la anlamı ayrışabilecek kalıp hata verir, './' kökle aynıdır", () => {
    for (const k of ["[ab].ts", "a\\b", "**.ts", "a/**b"]) {
      expect(() => dockerignoreKurallari(`*\n!${k}`)).toThrow(/desteklenmeyen kalıp/);
    }
    const k = dockerignoreKurallari("*\n!./cekirdek/");
    expect(goruntuyeGirerMi(k, "cekirdek/a.ts")).toBe(true);
  });

  it("demo paketleri görüntüye girmez ama ize girer (karar 0203)", () => {
    expect(pakettenMi("cekirdek/demolar/demo1/baslangic/katalog.json")).toBe(true);
    expect(pakettenMi("cekirdek/demolarx/a.json")).toBe(false);
    expect(pakettenMi("siteler/ornek-magaza/baslangic/katalog.json")).toBe(false);
  });

  it("son uyan kural kazanır; bozuk örnek: sırası ters yazılan kurallar", () => {
    const dogru = dockerignoreKurallari("*\n!cekirdek/\ncekirdek/demolar");
    const ters = dockerignoreKurallari("*\ncekirdek/demolar\n!cekirdek/");
    expect(goruntuyeGirerMi(dogru, "cekirdek/demolar/a.json")).toBe(false);
    expect(goruntuyeGirerMi(ters, "cekirdek/demolar/a.json")).toBe(true);
  });

  it("'**/' her derinlikte, '*' tek yol parçasında", () => {
    const k = dockerignoreKurallari("*\n!a/\n**/t\na/*.x");
    expect(goruntuyeGirerMi(k, "a/b/c/t/d.ts")).toBe(false);
    expect(goruntuyeGirerMi(k, "a/t/d.ts")).toBe(false);
    expect(goruntuyeGirerMi(k, "a/d.x")).toBe(false);
    expect(goruntuyeGirerMi(k, "a/b/d.x")).toBe(true);
    expect(goruntuyeGirerMi(k, "a/b/d.ts")).toBe(true);
  });
});

describe("parmak izi gerçek git kayıtlarında", () => {
  const depo = mkdtempSync(join(tmpdir(), "cekirdek-izi-"));
  afterAll(() => rmSync(depo, { recursive: true, force: true }));
  const git = (...argumanlar: string[]) => {
    const s = spawnSync("git", argumanlar, { cwd: depo, encoding: "utf8" });
    if (s.status !== 0) throw new Error(s.stderr);
    return s.stdout.trim();
  };
  const yaz = (yol: string, icerik: string) => {
    mkdirSync(dirname(join(depo, yol)), { recursive: true });
    writeFileSync(join(depo, yol), icerik);
  };
  const kaydet = (): string => {
    git("add", "-A");
    git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "k", "--allow-empty");
    return git("rev-parse", "HEAD");
  };
  git("init", "-q");
  yaz(dockerignoreYolu, readFileSync(join(kok, dockerignoreYolu), "utf8"));
  yaz("package.json", "{}");
  yaz("cekirdek/surum.ts", "export const cekirdekSurumu = '0.1.0';");
  yaz("cekirdek/moduller/urun/servis.ts", "1");
  yaz("cekirdek/demolar/demo1/paket.json", "{}");
  yaz("siteler/ornek-magaza/ayarlar.json", "{}");
  const ilk = kaydet();
  const ilkIz = cekirdekIzi(depo, ilk);

  const sonra = (degisiklik: () => void): string => {
    degisiklik();
    return cekirdekIzi(depo, kaydet());
  };

  it("aynı kayıt aynı izi verir, iz biçim önekli ve 64 haneli", () => {
    expect(cekirdekIzi(depo, ilk)).toBe(ilkIz);
    expect(ilkIz).toMatch(/^v1:[0-9a-f]{64}$/);
  });

  it("site klasörü, belge, test ve komut değişince iz değişmez", () => {
    const iz = sonra(() => {
      yaz("siteler/ornek-magaza/ayarlar.json", '{"x":1}');
      yaz("siteler/yeni/kimlik.json", "{}");
      yaz("kararlar/0001.md", "k");
      yaz("cekirdek/moduller/urun/testler/servis.test.ts", "t");
      yaz("komutlar/yayin.mts", "y");
      yaz("cekirdek/surum-notlari/0.1.0.md", "düzeltme");
      yaz("cekirdek/kapi/uclar.md", "belge");
    });
    expect(iz).toBe(ilkIz);
  });

  it.each([
    ["çekirdek dosyası", "cekirdek/moduller/urun/servis.ts"],
    ["yeni çekirdek dosyası", "cekirdek/moduller/yeni/servis.ts"],
    ["paket dosyası", "package.json"],
    ["bileşen", "bilesenler/parcalar/dugme.tsx"],
    ["demo paketi", "cekirdek/demolar/demo1/baslangic/katalog.json"],
    ["Dockerfile", dockerfileYolu],
    ["Türkçe harfli yollu çekirdek dosyası", "cekirdek/moduller/ürün/şema.ts"],
  ])("%s değişince iz değişir", (_, yol) => {
    const once = cekirdekIzi(depo, git("rev-parse", "HEAD"));
    expect(sonra(() => yaz(yol, `${Math.random()}`))).not.toBe(once);
  });

  it("görüntünün izin listesi genişleyince yeni dosya ize girer", () => {
    yaz("komutlar/yeni.mts", "k");
    const once = cekirdekIzi(depo, kaydet());
    const metin = readFileSync(join(kok, dockerignoreYolu), "utf8");
    expect(sonra(() => yaz(dockerignoreYolu, `${metin}\n!komutlar/\n`))).not.toBe(once);
  });

  it("dosya kipi değişince iz değişir (çalıştırılabilir)", () => {
    const once = cekirdekIzi(depo, git("rev-parse", "HEAD"));
    chmodSync(join(depo, "cekirdek/surum.ts"), 0o755);
    expect(cekirdekIzi(depo, kaydet())).not.toBe(once);
  });

  it("bilinmeyen ve bozuk kayıt hata verir", () => {
    expect(() => cekirdekIzi(depo, "0".repeat(40))).toThrow();
    expect(() => cekirdekIzi(depo, "HEAD;rm")).toThrow(/geçersiz/);
  });

  it("projenin kendi son kaydının izi hesaplanır", () => {
    const bas = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: kok,
      encoding: "utf8",
    }).stdout.trim();
    expect(cekirdekIzi(kok, bas)).toMatch(/^v1:[0-9a-f]{64}$/);
  });
});

describe("sürüm çakışması: bir sürüm numarası yalnız bir çekirdeği gösterir", () => {
  const izler: Record<string, string> = { aaaaaaa: "A", bbbbbbb: "B" };
  const kayittanIz = (kayit: string) => {
    const iz = izler[kayit];
    if (!iz) throw new Error("kayıt yok");
    return iz;
  };
  const yayin = (surum: string, kayit: string, ek: object = {}) => ({
    tur: "yayin",
    sonuc: "basarili",
    surum,
    kayit,
    ...ek,
  });
  const site = (kodAdi: string, kayitlar: SiteninKayitlari["kayitlar"]): SiteninKayitlari => ({
    ortam: "deneme",
    kodAdi,
    kayitlar,
  });

  it("aynı sürüm aynı çekirdekle yeniden yayınlanır (yeni site de aynı sürüme kurulur)", () => {
    const s = [site("ornek-magaza", [yayin("0.2.0", "aaaaaaa")])];
    expect(surumCakismasi("0.2.0", "A", s, kayittanIz)).toBeUndefined();
  });

  it("aynı sürüm başka bir çekirdekle durur, sebep siteyi ve kaydı söyler", () => {
    const s = [site("ornek-magaza", [yayin("0.2.0", "aaaaaaa")])];
    expect(surumCakismasi("0.2.0", "B", s, kayittanIz)).toMatch(
      /Sürüm 0\.2\.0 deneme\/ornek-magaza sitesinde aaaaaaa kaydıyla.*başka bir çekirdek.*artırın/,
    );
  });

  it("başka sitenin kaydı da sayılır", () => {
    const s = [site("ornek-magaza", []), site("seramik", [yayin("0.2.0", "aaaaaaa")])];
    expect(surumCakismasi("0.2.0", "B", s, kayittanIz)).toMatch(/deneme\/seramik/);
  });

  it("kayıttaki bu biçimdeki iz git kaydından önce gelir", () => {
    const s = [site("ornek-magaza", [yayin("0.2.0", "aaaaaaa", { cekirdekIzi: "v1:B" })])];
    expect(surumCakismasi("0.2.0", "v1:B", s, kayittanIz)).toBeUndefined();
    expect(surumCakismasi("0.2.0", "v1:A", s, kayittanIz)).toMatch(/başka bir çekirdek/);
  });

  it("kayıtta başka biçimde saklanan iz git kaydından yeniden hesaplanır", () => {
    const yeni = (k: string) => `v1:${kayittanIz(k)}`;
    const s = [site("ornek-magaza", [yayin("0.2.0", "aaaaaaa", { cekirdekIzi: "v0:eski" })])];
    expect(surumCakismasi("0.2.0", "v1:A", s, yeni)).toBeUndefined();
  });

  it("izi hesaplanamayan eski kayıt çakışma sayılır", () => {
    const s = [site("ornek-magaza", [yayin("0.2.0", "ccccccc")])];
    expect(surumCakismasi("0.2.0", "A", s, kayittanIz)).toMatch(/izi hesaplanamadı/);
  });

  it("başka sürüm, başarısız yayın ve geri dönüş sayılmaz", () => {
    const s = [
      site("ornek-magaza", [
        yayin("0.1.0", "aaaaaaa"),
        yayin("0.2.0", "aaaaaaa", { sonuc: "basarisiz" }),
        yayin("0.2.0", "aaaaaaa", { tur: "geri-donus" }),
      ]),
    ];
    expect(surumCakismasi("0.2.0", "B", s, kayittanIz)).toBeUndefined();
  });

  it("bugünkü durum: üç farklı kayıtla yayınlanmış 0.1.0'a dördüncüsü eklenemez", () => {
    const s = [
      site(
        "ornek-magaza",
        ["aaaaaaa", "bbbbbbb"].map((k) => yayin("0.1.0", k)),
      ),
    ];
    expect(surumCakismasi("0.1.0", "A", s, kayittanIz)).toMatch(/bbbbbbb/);
  });
});

describe("sunucudaki bütün sitelerin birleşik kaydı", () => {
  const satir = (no: number, surum: string) =>
    JSON.stringify({
      no,
      tur: "yayin",
      etkin: no,
      kayit: "aaaaaaa",
      surum,
      goruntu: "",
      zaman: "",
      sonuc: "basarili",
      degisiklikToplami: 0,
      degisiklikNotlari: [],
    });

  it("başlıklara göre sitelere ayrılır, boş satır atlanır", () => {
    const metin = `### deneme/ornek-magaza\n${satir(1, "0.1.0")}\n${satir(2, "0.2.0")}\n\n### deneme/seramik\n${satir(1, "0.2.0")}\n\n### deneme/bos\n\n`;
    const siteler = birlesikKayitlariCoz(metin, kayitlariCoz);
    expect(siteler.map((s) => [s.kodAdi, s.kayitlar.length])).toEqual([
      ["ornek-magaza", 2],
      ["seramik", 1],
      ["bos", 0],
    ]);
  });

  it("başlıksız satır ve okunamayan satır hata verir", () => {
    expect(() => birlesikKayitlariCoz(satir(1, "0.1.0"), kayitlariCoz)).toThrow(/başlıksız/);
    expect(() => birlesikKayitlariCoz("### deneme/a\n{bozuk", kayitlariCoz)).toThrow(
      /deneme\/a yayın kaydı: .*okunamadı/,
    );
  });
});

describe("sunucudaki okuma betiği", () => {
  it("her ortamın her sitesinin kaydını başlığıyla verir, kaydı olmayan klasörü atlar", () => {
    const koku = mkdtempSync(join(tmpdir(), "yayin-koku-"));
    try {
      const kayit = (no: number) =>
        JSON.stringify({ no, tur: "yayin", sonuc: "basarili", surum: "0.2.0", kayit: "aaaaaaa" });
      mkdirSync(join(koku, "deneme", "ornek-magaza"), { recursive: true });
      mkdirSync(join(koku, "deneme", "seramik"), { recursive: true });
      mkdirSync(join(koku, "canli", "seramik"), { recursive: true });
      mkdirSync(join(koku, "deneme", "kayitsiz"), { recursive: true });
      writeFileSync(
        join(koku, "deneme", "ornek-magaza", "kayit.jsonl"),
        `${kayit(1)}\n${kayit(2)}`,
      );
      writeFileSync(join(koku, "deneme", "seramik", "kayit.jsonl"), `${kayit(1)}\n`);
      writeFileSync(join(koku, "canli", "seramik", "kayit.jsonl"), `${kayit(1)}\n`);
      const cikti = spawnSync("sh", ["-c", butunKayitlarBetigi(koku)], { encoding: "utf8" });
      expect(cikti.status).toBe(0);
      const siteler = birlesikKayitlariCoz(cikti.stdout, kayitlariCoz);
      expect(siteler.map((s) => [`${s.ortam}/${s.kodAdi}`, s.kayitlar.length]).sort()).toEqual([
        ["canli/seramik", 1],
        ["deneme/ornek-magaza", 2],
        ["deneme/seramik", 1],
      ]);
    } finally {
      rmSync(koku, { recursive: true, force: true });
    }
  });
  it("hiç kaydı olmayan sunucuda boş liste verir, hata vermez", () => {
    const koku = mkdtempSync(join(tmpdir(), "yayin-koku-"));
    try {
      const cikti = spawnSync("sh", ["-c", butunKayitlarBetigi(koku)], { encoding: "utf8" });
      expect([cikti.status, cikti.stdout, cikti.stderr]).toEqual([0, "", ""]);
    } finally {
      rmSync(koku, { recursive: true, force: true });
    }
  });
});

describe("yayın komutu kuralı kullanır (yalnız yazıyla denetlenir: yayın sunucuya bağlanır)", () => {
  it("yeni yayın, görüntüye ve sunucuya dokunmadan önce bütün sitelerde sürüm çakışmasını arar", () => {
    const metin = readFileSync(join(kok, "komutlar", "yayin.mts"), "utf8");
    const govde = metin.slice(
      metin.indexOf("const yayinlaKilitli"),
      metin.indexOf("// --- Geri dönüş ---"),
    );
    const kural = govde.indexOf("surumCakismasi(surum, kayit.cekirdekIzi, butunKayitlariOku(ipv4)");
    expect(kural).toBeGreaterThan(0);
    expect(govde.indexOf("if (cakisma) throw")).toBeGreaterThan(kural);
    expect(kural).toBeLessThan(govde.indexOf("goruntuyuDenetle("));
    expect(kural).toBeLessThan(govde.indexOf("projeAdresiniHazirla("));
  });
});
