// Yedeğin kuralları ve gece betiğinin davranışı (kart 0024, karar 0037). Gece betiği sahte docker,
// age ve flock ile gerçekten çalıştırılır; her kuralın bozuk bir örneği yakalanır.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sunucuTanimi } from "../sunucu.mts";
import {
  ayariOku,
  degistirmeBetigi,
  depoAyariMetni,
  geriAlmaBetigi,
  kayitHatalari,
  kayittaYedekSizintisi,
  konumHatalari,
  konumOlcmeBetigi,
  kurmaBetigi,
  kurulumHatalari,
  ozetFarklari,
  ozetiOku,
  provaBetigi,
  siteBilgisiSatiri,
  type YedekAyari,
  type YedekKaydi,
  yanaAcmaBetigi,
  yedekAyariHatalari,
  yedekKlasoru,
} from "../yedek.mts";

const acik = `age1${"q".repeat(58)}`;
const anahtar = `AGE-SECRET-KEY-1${"Q".repeat(58)}`;
const iyiAyar: YedekAyari = {
  depo: { konum: "nbg1", kova: "altyapi-yedek-abc123" },
  rclone_goruntusu: "rclone/rclone:1.75.2",
  varsayilan_saklama_gun: 30,
  siteler: { deneme: { "ornek-magaza": { acik_anahtar: acik, saklama_gun: 30 } } },
};
const sozdizimi = (betik: string) => spawnSync("bash", ["-n"], { input: betik, encoding: "utf8" });

describe("yedek ayarı", () => {
  it("projedeki ayar kuralına uyuyor", () => {
    expect(() => ayariOku()).not.toThrow();
  });

  it("geçerli ayar hatasız", () => {
    expect(yedekAyariHatalari(iyiAyar, "fsn1")).toEqual([]);
  });

  it.each([
    [
      "canlıyla aynı veri merkezi",
      { depo: { konum: "fsn1", kova: "abc" } },
      "aynı veri merkezinde",
    ],
    ["Almanya dışı", { depo: { konum: "hel1", kova: "abc" } }, "Almanya'da değil"],
    ["bozuk kova adı", { depo: { konum: "nbg1", kova: "A_B" } }, "kova"],
    ["sürümü sabit olmayan görüntü", { rclone_goruntusu: "rclone/rclone:latest" }, "sürümü sabit"],
    ["geçersiz süre", { varsayilan_saklama_gun: 0 }, "saklama"],
    [
      "bozuk açık anahtar",
      { siteler: { deneme: { x: { acik_anahtar: "AGE-SECRET-KEY-1", saklama_gun: 30 } } } },
      "açık anahtar",
    ],
    [
      "sitede geçersiz süre",
      { siteler: { deneme: { x: { acik_anahtar: acik, saklama_gun: 1.5 } } } },
      "saklama",
    ],
  ])("%s yakalanır", (_ad, bozuk, beklenen) => {
    const hatalar = yedekAyariHatalari({ ...iyiAyar, ...bozuk } as YedekAyari, "fsn1");
    expect(hatalar.join(" ")).toContain(beklenen);
  });

  it("depo canlı sunucunun kayıtlı veri merkezinden farklı", () => {
    expect(ayariOku().depo.konum).not.toBe(sunucuTanimi.konum);
  });

  it("açık anahtar yerine başka bir şey site satırına giremez", () => {
    expect(() => siteBilgisiSatiri(anahtar, 60, 30)).toThrow();
    expect(siteBilgisiSatiri(acik, 60, 30)).toBe(`${acik} 60 30`);
  });

  it("depo anahtarı kabuğa izinsiz karakter taşıyamaz", () => {
    expect(() => depoAyariMetni("nbg1", "a'; rm", "b")).toThrow();
    expect(depoAyariMetni("nbg1", "ABC", "def")).toContain(
      "endpoint = nbg1.your-objectstorage.com",
    );
  });
});

describe("sunucu betikleri", () => {
  const depoAyari = depoAyariMetni("nbg1", "ERISIMDEGERI", "GIZLIDEGER");

  it.each([
    ["kurulum", kurmaBetigi(iyiAyar, "deneme", depoAyari)],
    ["prova", provaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar)],
    ["yana açma", yanaAcmaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar)],
    ["yer değiştirme", degistirmeBetigi("deneme", "ornek-magaza", "kutu")],
    ["geri alma", geriAlmaBetigi("deneme", "ornek-magaza", "kutu")],
    ["konum", konumOlcmeBetigi("deneme")],
    ["gece", readFileSync(join(yedekKlasoru, "gece.sh"), "utf8")],
    ["ortak", readFileSync(join(yedekKlasoru, "ortak.sh"), "utf8")],
  ])("%s betiğinin sözdizimi doğru", (_ad, betik) => {
    const sonuc = sozdizimi(betik);
    expect(sonuc.stderr).toBe("");
    expect(sonuc.status).toBe(0);
  });

  it("gizli değerler kök kabuğunun girdisinde kalır, sudo'nun komut satırına çıkmaz", () => {
    const kurma = kurmaBetigi(iyiAyar, "deneme", depoAyari);
    const prova = provaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar);
    for (const [betik, deger] of [
      [kurma, "GIZLIDEGER"],
      [prova, anahtar],
    ] as const) {
      expect(betik.startsWith("set -eu\nsudo bash -s <<'KOK_SONU'\n")).toBe(true);
      // Değer yalnız heredoc satırlarında ya da kabuk değişkeninde geçer; age'e süreç ikamesiyle gider.
      for (const satir of betik.split("\n").filter((s) => s.includes(deger))) {
        expect(satir).toMatch(/^(secret_access_key = |anahtar=')/);
      }
    }
    expect(prova).toContain("age -d -i <(printf");
  });

  it("uydurma dosya adı ve anahtar betiğe giremez", () => {
    expect(() => provaBetigi("deneme", "x", "a;b.dump.age", anahtar)).toThrow();
    expect(() => provaBetigi("deneme", "x", "20261106T000000Z.dump.age", "yanlis")).toThrow();
    expect(() => yanaAcmaBetigi("deneme", "x", "../y", anahtar)).toThrow();
  });

  it("geçici prova kutusu ağsızdır, canlı veritabanına yalnız okumak için bakar", () => {
    const prova = provaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar);
    expect(prova).toContain("--network none");
    expect(prova).not.toMatch(/DROP|ALTER|CREATE DATABASE/);
    expect(prova).toContain("pg_restore -U postgres --no-owner --no-acl --exit-on-error -d prova");
  });

  it("yana açma canlı veritabanına yazmaz, hatada yan veritabanını siler", () => {
    const betik = yanaAcmaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar);
    expect(betik).toContain('-d "site_ornek_magaza__geri"');
    expect(betik).not.toMatch(/-d "?site_ornek_magaza"?(\s|$)/);
    expect(betik).toContain('--role="site_ornek_magaza"');
  });
});

describe("özet karşılaştırması", () => {
  const ozet = (satirlar: string) => ozetiOku(`A sema s1\n${satirlar}`, "A");
  const temel = ozet("A tablo public.x|2|abc\nA tablo public.y|0|def");

  it("aynı özet farksız", () => {
    expect(ozetFarklari(temel, ozet("A tablo public.y|0|def\nA tablo public.x|2|abc"))).toEqual([]);
  });

  it.each([
    ["eksik satır", "A tablo public.x|1|abc\nA tablo public.y|0|def", "1"],
    ["farklı içerik", "A tablo public.x|2|zzz\nA tablo public.y|0|def", "içerik"],
    ["eksik tablo", "A tablo public.x|2|abc", "yedekte yok"],
    [
      "fazla tablo",
      "A tablo public.x|2|abc\nA tablo public.y|0|def\nA tablo public.z|0|d",
      "yalnız",
    ],
  ])("%s yakalanır", (_ad, satirlar, beklenen) => {
    expect(ozetFarklari(temel, ozet(satirlar)).join(" ")).toContain(beklenen);
  });

  it("farklı düzen ve boş özet eşit sayılmaz", () => {
    expect(
      ozetFarklari(temel, ozetiOku("A sema s2\nA tablo public.x|2|abc", "A")).join(" "),
    ).toContain("düzeni");
    expect(ozetFarklari(ozetiOku("", "A"), ozetiOku("", "A")).length).toBeGreaterThan(0);
  });
});

describe("denetimin kararları", () => {
  const simdi = Date.parse("2026-11-06T12:00:00Z");
  const site = { ortam: "deneme", kodAdi: "ornek-magaza" };
  const kayit = (ek: Partial<YedekKaydi>): YedekKaydi => ({
    zaman: "2026-11-06T00:00:10Z",
    ortam: "deneme",
    site: "ornek-magaza",
    tur: "gece",
    sonuc: "basarili",
    sebep: "",
    dosya: "x",
    boyut: 10,
    ...ek,
  });

  it("taze ve başarılı gece yedeği yeşil", () => {
    expect(kayitHatalari([kayit({})], [site], simdi)).toEqual([]);
  });

  it.each([
    ["kayıt yok", [], "kaydı yok"],
    ["başarısız", [kayit({ sonuc: "basarisiz", sebep: "yuklenemedi" })], "yuklenemedi"],
    ["eski", [kayit({ zaman: "2026-11-05T00:00:10Z" })], "26 saatten eski"],
    ["elle alınan gece yerine geçmez", [kayit({ tur: "elle" })], "kaydı yok"],
    [
      "anahtarsız site",
      [kayit({}), kayit({ site: "site_yeni", sonuc: "basarisiz", sebep: "anahtar-yok" })],
      "anahtar-yok",
    ],
    [
      "yarım temizlik",
      [kayit({}), kayit({ tur: "temizlik", sonuc: "basarisiz", sebep: "temizlik-yarim" })],
      "temizlik",
    ],
  ])("%s kırmızı", (_ad, kayitlar, beklenen) => {
    expect(kayitHatalari(kayitlar as YedekKaydi[], [site], simdi).join(" ")).toContain(beklenen);
  });

  it("kayıtlarda anahtar araması", () => {
    expect(kayittaYedekSizintisi("temiz metin", ["DEGER"])).toEqual([]);
    expect(kayittaYedekSizintisi("x DEGER y", ["DEGER"])).toHaveLength(1);
    expect(kayittaYedekSizintisi(`x ${anahtar} y`, ["DEGER"])).toHaveLength(1);
    expect(kayittaYedekSizintisi("temiz", [""])).toEqual([]);
  });

  it("konum ölçümü: yalnız kendi ucundan görünmeli", () => {
    const iyi = "gorunuyor nbg1\ngorunmuyor fsn1\ngorunmuyor hel1\n";
    expect(konumHatalari(iyi, "nbg1")).toEqual([]);
    expect(konumHatalari("gorunmuyor nbg1\ngorunmuyor fsn1\ngorunmuyor hel1", "nbg1")).toHaveLength(
      1,
    );
    expect(konumHatalari("gorunuyor nbg1\ngorunuyor fsn1\ngorunmuyor hel1", "nbg1")[0]).toContain(
      "fsn1",
    );
  });

  it("kurulum ölçümü: değişmiş betik ve kapalı zamanlayıcı kırmızı", () => {
    expect(kurulumHatalari("disabled\ninactive\nx\ny\n755 0\n").join(" ")).toMatch(
      /etkin değil.*çalışmıyor.*gece\.sh.*ortak\.sh.*köke/,
    );
  });
});

// Gece betiği sahte araçlarla çalışır: docker hangi çağrının geldiğini dosyaya yazar, davranışı
// ortam değişkenleriyle bozulur.
describe("gece betiğinin davranışı", () => {
  const koklar: string[] = [];
  afterAll(() => {
    for (const k of koklar) rmSync(k, { recursive: true, force: true });
  });

  const kur = (siteler: string[]) => {
    const kok = mkdtempSync(join(tmpdir(), "yedek-gece-"));
    koklar.push(kok);
    const k = join(kok, "yedek");
    const arac = join(kok, "arac");
    mkdirSync(join(k, "gecici"), { recursive: true });
    mkdirSync(join(k, "siteler", "deneme"), { recursive: true });
    mkdirSync(arac);
    copyFileSync(join(yedekKlasoru, "gece.sh"), join(k, "gece.sh"));
    copyFileSync(join(yedekKlasoru, "ortak.sh"), join(k, "ortak.sh"));
    writeFileSync(join(k, "ayar"), "KOVA=kova\nRCLONE_GORUNTUSU=rclone/rclone:1.75.2\n");
    for (const s of siteler) writeFileSync(join(k, "siteler", "deneme", s), `${acik} 60 30\n`);
    const betik = (ad: string, metin: string) => {
      writeFileSync(join(arac, ad), `#!/bin/bash\n${metin}\n`);
      chmodSync(join(arac, ad), 0o755);
    };
    betik(
      "docker",
      `printf '%s\\n' "$*" >> "$CAGRILAR"
case "$*" in
  *"psql -U postgres -Atc"*) [ -z "\${LISTE_BOZUK:-}" ] || exit 1; printf '%s\\n' \${VERITABANLARI:-}; exit 0 ;;
  *pg_dump*) [ -z "\${DOKUM_BOZUK:-}" ] || exit 1; printf 'DOKUM'; exit 0 ;;
  *copyto*) [ -z "\${YUKLEME_BOZUK:-}" ] || exit 1; exit 0 ;;
  *lsf*) printf '%s\\n' "\${UZAK_BOYUT:-11}"; exit 0 ;;
  *cleanup-hidden*) [ -z "\${TEMIZLIK_BOZUK:-}" ] || exit 1; exit 0 ;;
  *) exit 0 ;;
esac`,
    );
    betik(
      "age",
      'cat >/dev/null; printf "SIFRELIDOSYA"; exit 0'.replace("SIFRELIDOSYA", "12345678901"),
    );
    betik("flock", "exit 0");
    const calistir = (args: string[], ortam: Record<string, string> = {}) => {
      const sonuc = spawnSync("bash", [join(k, "gece.sh"), ...args], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${arac}:${process.env["PATH"]}`,
          YEDEK_KOKU: k,
          GIZLI_KOKU: join(kok, "gizli"),
          CAGRILAR: join(kok, "cagrilar"),
          ...ortam,
        },
      });
      return {
        durum: sonuc.status,
        kayit: existsSync(join(k, "kayit.jsonl"))
          ? readFileSync(join(k, "kayit.jsonl"), "utf8")
              .trim()
              .split("\n")
              .map((s) => JSON.parse(s) as YedekKaydi)
          : [],
        cagrilar: existsSync(join(kok, "cagrilar"))
          ? readFileSync(join(kok, "cagrilar"), "utf8")
          : "",
        gecici: spawnSync("ls", ["-A", join(k, "gecici")], { encoding: "utf8" }).stdout.trim(),
      };
    };
    return { calistir };
  };

  it("başarılı gece: kilitle yükler, kayda yazar, temizler, geçici dosya kalmaz", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(0);
    expect(r.kayit.at(-1)).toMatchObject({
      site: "ornek-magaza",
      tur: "gece",
      sonuc: "basarili",
      boyut: 11,
    });
    expect(r.cagrilar).toMatch(
      /copyto .*--s3-object-lock-mode COMPLIANCE --s3-object-lock-retain-until-date \d{4}-/,
    );
    expect(r.cagrilar).toContain("delete --min-age 90s depo:kova/deneme/ornek-magaza");
    expect(r.gecici).toBe("");
  });

  it("döküm bozuksa yüklemez, başarısız yazar, temizlemez", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { DOKUM_BOZUK: "1", VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(1);
    expect(r.kayit.at(-1)).toMatchObject({ sonuc: "basarisiz", sebep: "dokum-alinamadi" });
    expect(r.cagrilar).not.toContain("copyto");
    expect(r.cagrilar).not.toContain("delete");
    expect(r.gecici).toBe("");
  });

  it("yükleme ya da boyut tutmazsa başarısız ve eski yedekler silinmez", () => {
    for (const [ortam, sebep] of [
      [{ YUKLEME_BOZUK: "1" }, "yuklenemedi"],
      [{ UZAK_BOYUT: "5" }, "boyut-tutmadi"],
    ] as const) {
      const { calistir } = kur(["ornek-magaza"]);
      const r = calistir([], { ...ortam, VERITABANLARI: "site_ornek_magaza" });
      expect(r.durum).toBe(1);
      expect(r.kayit.at(-1)).toMatchObject({ sonuc: "basarisiz", sebep });
      expect(r.cagrilar).not.toContain("delete");
    }
  });

  it("anahtarı olmayan veritabanı atlanmaz, kırmızıdır", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { VERITABANLARI: "site_ornek_magaza site_yeni" });
    expect(r.durum).toBe(1);
    expect(r.kayit.at(-1)).toMatchObject({ site: "site_yeni", sebep: "anahtar-yok" });
  });

  it("site listesi okunamazsa kırmızıdır", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { LISTE_BOZUK: "1" });
    expect(r.durum).toBe(1);
    expect(r.kayit.at(-1)).toMatchObject({ sebep: "site-listesi-okunamadi" });
  });

  it("bir sitenin hatası ötekini durdurmaz", () => {
    const { calistir } = kur(["a-site", "b-site"]);
    const r = calistir([], { VERITABANLARI: "site_a_site site_b_site", UZAK_BOYUT: "5" });
    expect(r.kayit.map((k) => k.site)).toEqual(["a-site", "b-site"]);
  });

  it("temizlik hata verirse (silme işareti) kayda yazılır, çıkış kırmızıdır", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { TEMIZLIK_BOZUK: "1", VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(1);
    expect(r.kayit.at(-1)).toMatchObject({ tur: "temizlik", sebep: "temizlik-yarim" });
  });

  it("tek site çağrısında temizlik yapılmaz", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir(["deneme", "ornek-magaza", "elle"]);
    expect(r.durum).toBe(0);
    expect(r.kayit.at(-1)).toMatchObject({ tur: "elle", sonuc: "basarili" });
    expect(r.cagrilar).not.toContain("delete");
  });
});
