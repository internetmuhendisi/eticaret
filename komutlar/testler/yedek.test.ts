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
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { dosyaTemizligiAyari } from "../../cekirdek/kayitlar/dosya.ts";
import { sunucuTanimi } from "../sunucu.mts";
import {
  anahtarHatalari,
  ayariOku,
  degistirmeBetigi,
  depoAyariMetni,
  dosyaGetirmeBetigi,
  dosyaYedegiBetigi,
  geriAlmaBetigi,
  kayitHatalari,
  kayitlariCoz,
  kayittaYedekSizintisi,
  konumHatalari,
  konumOlcmeBetigi,
  kurmaBetigi,
  kurulumHatalari,
  ozetFarklari,
  ozetiOku,
  provaBetigi,
  siteBilgisiSatiri,
  siteYuklemeKomutu,
  tabloOzetiKomutu,
  veritabaniHatalari,
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
// Kök kabuğunda çalışan gövde (kokBetigi) dış betik için heredoc verisidir: ayrıca denetlenir (kart 0093:
// bitiş satırına yazılan yönlendirme yalnız iç gövdede uyarı veriyordu).
const sozdizimi = (betik: string) => {
  const dis = spawnSync("bash", ["-n"], { input: betik, encoding: "utf8" });
  const ic = /sudo bash -s <<'KOK_SONU'\n([\s\S]*)\nKOK_SONU\n?$/.exec(betik)?.[1];
  if (ic === undefined || dis.status !== 0 || dis.stderr) return dis;
  return spawnSync("bash", ["-n"], { input: ic, encoding: "utf8" });
};

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
    [
      "dosyaların kalıcı silinme süresinden uzun saklama",
      {
        siteler: {
          deneme: {
            x: { acik_anahtar: acik, saklama_gun: dosyaTemizligiAyari.kaliciSilmeGun + 1 },
          },
        },
      },
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
    [
      "dosya getirme",
      dosyaGetirmeBetigi(
        "deneme",
        { kodAdi: "ornek-magaza", numara: 1 },
        "site_ornek_magaza__geri",
        anahtar,
      ),
    ],
    ["dosya yedeği", dosyaYedegiBetigi("deneme", "ornek-magaza")],
    ["yer değiştirme", degistirmeBetigi("deneme", "ornek-magaza")],
    ["geri alma", geriAlmaBetigi("deneme", "ornek-magaza")],
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
    // Canlı veritabanının kutusuna giden satırlar yalnız okur.
    const canli = prova.split("\n").filter((satir) => satir.includes("veritabani-deneme"));
    expect(canli.length).toBeGreaterThan(0);
    expect(canli.join("\n")).not.toMatch(/DROP|ALTER|CREATE|pg_restore/);
    expect(prova).toContain(
      "pg_restore -U site_ornek_magaza --no-owner --no-acl --exit-on-error -d prova",
    );
  });

  // Sitenin kodu yönetici oturumunda çalışırsa site süper kullanıcı olur (kart 0068, karar 0206). Yedeği
  // yükleyen ve tabloların özetini alan komut sitenin kullanıcısıyla çalışır; saldırının kendisi veri
  // ayrımı testinde gerçek veritabanıyla denenir.
  it("yedek ve tablo özeti yönetici olarak çalışmaz", () => {
    for (const betik of [
      provaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar),
      yanaAcmaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar),
    ]) {
      const yuklemeler = betik.split("\n").filter((satir) => satir.includes("pg_restore"));
      expect(yuklemeler.length).toBe(1);
      expect(yuklemeler.join("\n")).toContain("pg_restore -U site_ornek_magaza ");
      expect(betik).not.toContain("--role");
    }
    const prova = provaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar);
    const ozetler = prova.split("\n").filter((satir) => satir.includes("OZET_SONU'"));
    expect(ozetler).toHaveLength(2);
    for (const satir of ozetler) expect(satir).toContain("psql -U site_ornek_magaza ");
    expect(() => tabloOzetiKomutu("k", "postgres", "site_x")).toThrow();
    expect(() => siteYuklemeKomutu("k", "postgres", "site_x")).toThrow();
  });

  it("yana açma sunucu günlüğüne satır içeriği yazmaz, ayarı yüklemeden sonra kaldırır", () => {
    const betik = yanaAcmaBetigi("deneme", "x", "20261106T000000Z.dump.age", anahtar);
    const ac = betik.indexOf("log_min_error_statement = panic");
    const yukleme = betik.indexOf("pg_restore");
    const kapat = betik.indexOf("RESET ALL");
    expect(betik).toContain("log_min_messages = panic");
    expect(ac).toBeGreaterThan(0);
    expect(yukleme).toBeGreaterThan(ac);
    expect(kapat).toBeGreaterThan(yukleme);
    expect(betik.indexOf("UST_BILGI_SONU")).toBeGreaterThan(kapat);
  });

  it("pg_restore çıktısı (müşteri verisi taşıyabilir) gösterilmez", () => {
    for (const betik of [
      provaBetigi("deneme", "x", "20261106T000000Z.dump.age", anahtar),
      yanaAcmaBetigi("deneme", "x", "20261106T000000Z.dump.age", anahtar),
    ]) {
      expect(betik).toMatch(/pg_restore [^\n]*2>\/dev\/null/);
    }
  });

  it("yer değiştirme tek işlemdedir, hiçbir şey silmez; geri alma önce eskiyi arar", () => {
    const degistir = degistirmeBetigi("deneme", "x");
    expect(degistir.indexOf("BEGIN;")).toBeLessThan(degistir.indexOf("ALTER DATABASE"));
    expect(degistir).toContain("COMMIT;");
    expect(degistir).not.toContain("DROP");
    const geri = geriAlmaBetigi("deneme", "x");
    expect(geri.indexOf("say 'site_x__eski'")).toBeGreaterThan(-1);
    expect(geri.indexOf("exit 1")).toBeLessThan(geri.indexOf("ALTER DATABASE"));
    expect(geri.indexOf("COMMIT;")).toBeLessThan(geri.indexOf("DROP DATABASE"));
  });

  it("geri alma canlı yoksa yalnız eskiyi adlandırır, canlıyı silmez", () => {
    const geri = geriAlmaBetigi("deneme", "x");
    const kosul = geri.indexOf("say 'site_x'");
    expect(kosul).toBeGreaterThan(-1);
    expect(geri.indexOf("BEGIN;")).toBeGreaterThan(kosul);
    expect(geri).toMatch(/else\n[^\n]*RENAME TO "site_x"/);
  });

  it("yana açma canlı veritabanına yazmaz, hatada yan veritabanını siler", () => {
    const betik = yanaAcmaBetigi("deneme", "ornek-magaza", "20261106T000000Z.dump.age", anahtar);
    expect(betik).toContain('-d "site_ornek_magaza__geri"');
    expect(betik).not.toMatch(/-d "?site_ornek_magaza"?(\s|$)/);
    expect(betik).toContain(
      "pg_restore -U site_ornek_magaza --no-owner --no-acl --exit-on-error -d site_ornek_magaza__geri",
    );
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

  const dosyaKaydi = kayit({ tur: "dosya", dosya: "0" });

  it("taze ve başarılı gece ve dosya yedeği yeşil", () => {
    expect(kayitHatalari([kayit({}), dosyaKaydi], [site], simdi)).toEqual([]);
  });

  // Kart 0093: dosya yedeği de son 26 saatte başarılı olmalı; elle alınan (--dosya) da sayılır.
  it.each([
    ["kaydı yok", [], "dosya yedeği kaydı yok"],
    ["başarısız", [kayit({ tur: "dosya", sonuc: "basarisiz", sebep: "klasor-yok" })], "klasor-yok"],
    [
      "eski",
      [kayit({ tur: "dosya", zaman: "2026-11-05T00:00:10Z" })],
      "son dosya yedeği 26 saatten eski",
    ],
  ])("dosya yedeği %s kırmızı", (_ad, dosyalar, beklenen) => {
    const hatalar = kayitHatalari([kayit({}), ...(dosyalar as YedekKaydi[])], [site], simdi);
    expect(hatalar.join(" ")).toContain(beklenen);
    expect(hatalar).toHaveLength(1);
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

  it("temizlik hatası 26 saat sonra da kırmızı, onaylanınca kalkar", () => {
    const eskiHata = kayit({
      zaman: "2026-11-01T00:00:10Z",
      tur: "temizlik",
      sonuc: "basarisiz",
      sebep: "temizlik-yarim",
    });
    const taze = kayit({});
    expect(kayitHatalari([eskiHata, taze], [site], simdi).join(" ")).toContain("temizlik");
    const onay = kayit({ zaman: "2026-11-02T00:00:10Z", tur: "temizlik-onay" });
    expect(kayitHatalari([eskiHata, onay, taze, dosyaKaydi], [site], simdi)).toEqual([]);
    const sonrakiHata = { ...eskiHata, zaman: "2026-11-03T00:00:10Z" };
    expect(
      kayitHatalari([eskiHata, onay, sonrakiHata, taze, dosyaKaydi], [site], simdi),
    ).toHaveLength(1);
  });

  it("anahtarsız veritabanı ve yarım geri yükleme artığı kırmızı", () => {
    expect(veritabaniHatalari(["deneme site_ornek_magaza"], iyiAyar)).toEqual([]);
    expect(veritabaniHatalari(["deneme site_yeni"], iyiAyar)[0]).toContain("anahtarı yok");
    expect(veritabaniHatalari(["canli site_ornek_magaza"], iyiAyar)[0]).toContain("anahtarı yok");
    expect(veritabaniHatalari(["deneme site_ornek_magaza__eski"], iyiAyar)[0]).toContain("artığı");
  });

  it("sunucudaki ya da bilgisayardaki anahtar ayarla aynı olmalı", () => {
    const sunucuda = new Map([["deneme/ornek-magaza", acik]]);
    expect(anahtarHatalari(iyiAyar, sunucuda, () => acik)).toEqual([]);
    expect(anahtarHatalari(iyiAyar, new Map(), () => acik)[0]).toContain("sunucudaki");
    expect(anahtarHatalari(iyiAyar, sunucuda, () => undefined)[0]).toContain("bilgisayarda yok");
    const baska = `age1${"p".repeat(58)}`;
    expect(anahtarHatalari(iyiAyar, sunucuda, () => baska)[0]).toContain("eşleşmiyor");
  });

  it("sonraki başarılı gece işi anahtarsız site hatasını kapatır", () => {
    const hatali = kayit({ site: "site_yeni", sonuc: "basarisiz", sebep: "anahtar-yok" });
    expect(kayitHatalari([kayit({}), hatali, dosyaKaydi], [site], simdi)).toHaveLength(1);
    expect(kayitHatalari([hatali, kayit({}), dosyaKaydi], [site], simdi)).toEqual([]);
  });

  it("yarım yazılmış kayıt satırı okumayı düşürmez", () => {
    expect(kayitlariCoz('{"tur":"gece"}\n{"tur":"ge').map((k) => k.tur)).toEqual(["gece"]);
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
  // Veritabanı yedeğinin kayıtları: dosya yedeği (kart 0093) ve onun temizliği dışarıda.
  const vtKayitlari = (r: { kayit: YedekKaydi[] }) =>
    r.kayit.filter((k) => k.tur !== "dosya" && k.dosya !== "dosyalar");
  const koklar: string[] = [];
  const { PATH: yol } = process.env;
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
    // Sitelerin dosya klasörleri (kart 0093): varsayılan olarak boş.
    const d = join(kok, "dosyalar");
    for (const s of siteler) mkdirSync(join(d, "deneme", s), { recursive: true });
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
  *pg_dump*) [ -z "\${DOKUM_BOZUK:-}" ] || exit 1; [ -n "\${DOKUM_BOS:-}" ] || printf 'PGDMPveri'; exit 0 ;;
  *"ps --format"*) [ -z "\${KUTU_BOZUK:-}" ] || exit 1; printf '%s\\n' \${KUTULAR:-veritabani-deneme}; exit 0 ;;
  *"dosyalar/**"*) [ -z "\${DEPO_LISTE_BOZUK:-}" ] || exit 1; [ -z "\${DEPO_DOSYALARI:-}" ] || printf '%s\\n' \${DEPO_DOSYALARI}; exit 0 ;;
  *" copy /veri "*)
    [ -z "\${DOSYA_YUKLEME_BOZUK:-}" ] || exit 1
    kaynak="$(printf '%s\\n' "$@" | sed -n 's|:/veri:ro$||p')"
    find "$kaynak" -type f -printf '%s;%f\\n' >> "$DEPO_KAYDI"; exit 0 ;;
  *"--files-from /g/sil"*)
    bag="$(printf '%s\\n' "$@" | sed -n 's|:/g:ro$||p')"
    cat "$bag/sil" >> "$SILINEN"; exit 0 ;;
  *"--format sp"*) [ -z "\${DOSYA_BOYUT_BOZUK:-}" ] || { echo "1;x"; exit 0; }; cat "$DEPO_KAYDI" 2>/dev/null; exit 0 ;;
  *"--files-only"*) printf '%s\\n' \${GENC_DOSYA-yeni.dump.age}; exit 0 ;;
  *copyto*) [ -z "\${YUKLEME_BOZUK:-}" ] || exit 1; exit 0 ;;
  *lsf*) printf '%s\\n' "\${UZAK_BOYUT:-11}"; exit 0 ;;
  *cleanup-hidden*) [ -z "\${TEMIZLIK_BOZUK:-}" ] || exit 1; exit 0 ;;
  *) exit 0 ;;
esac`,
    );
    betik("age", 'cat > "$AGE_GIRDISI"; printf "12345678901"; exit 0');
    betik("flock", "exit 0");
    // Sitenin dosyası sitenin kullanıcısıyla okunur (setpriv); burada kullanıcı değişmez.
    betik("setpriv", 'while [ "$1" != "--" ]; do shift; done; shift; exec "$@"');
    const calistir = (args: string[], ortam: Record<string, string> = {}) => {
      const sonuc = spawnSync("bash", [join(k, "gece.sh"), ...args], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${arac}:${yol}`,
          YEDEK_KOKU: k,
          GIZLI_KOKU: join(kok, "gizli"),
          CAGRILAR: join(kok, "cagrilar"),
          AGE_GIRDISI: join(kok, "age-girdisi"),
          DOSYA_KOKU: d,
          DEPO_KAYDI: join(kok, "depo-kaydi"),
          SILINEN: join(kok, "silinen"),
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
        sifrelenen: existsSync(join(kok, "age-girdisi"))
          ? readFileSync(join(kok, "age-girdisi"), "utf8")
          : "",
        gecici: spawnSync("ls", ["-A", join(k, "gecici")], { encoding: "utf8" }).stdout.trim(),
      };
    };
    const siteYaz = (site: string, metin: string) =>
      writeFileSync(join(k, "siteler", "deneme", site), metin);
    const kayitYaz = (metin: string) => writeFileSync(join(k, "kayit.jsonl"), metin);
    const dosyaYaz = (site: string, ad: string, icerik = "veri") =>
      writeFileSync(join(d, "deneme", site, ad), icerik);
    const depoKaydi = () =>
      existsSync(join(kok, "depo-kaydi")) ? readFileSync(join(kok, "depo-kaydi"), "utf8") : "";
    const silinen = () =>
      existsSync(join(kok, "silinen")) ? readFileSync(join(kok, "silinen"), "utf8") : "";
    return { calistir, siteYaz, kayitYaz, dosyaYaz, depoKaydi, silinen, dosyaKoku: d };
  };

  it("başarılı gece: kilitle yükler, kayda yazar, temizler, geçici dosya kalmaz", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(0);
    expect(vtKayitlari(r).at(-1)).toMatchObject({ tur: "temizlik", sonuc: "basarili" });
    expect(vtKayitlari(r).at(-2)).toMatchObject({
      site: "ornek-magaza",
      tur: "gece",
      sonuc: "basarili",
      boyut: 11,
    });
    expect(r.cagrilar).toContain("--s3-no-check-bucket");
    expect(r.cagrilar).toMatch(
      /copyto .*--s3-object-lock-mode COMPLIANCE --s3-object-lock-retain-until-date \d{4}-/,
    );
    expect(r.cagrilar).toContain(
      "delete --max-depth 1 --min-age 90s depo:kova/deneme/ornek-magaza",
    );
    expect(r.gecici).toBe("");
  });

  it("döküm bozuksa yüklemez, başarısız yazar, temizlemez", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { DOKUM_BOZUK: "1", VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(1);
    expect(vtKayitlari(r).at(-1)).toMatchObject({ sonuc: "basarisiz", sebep: "dokum-alinamadi" });
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
      expect(vtKayitlari(r).at(-1)).toMatchObject({ sonuc: "basarisiz", sebep });
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
    expect(vtKayitlari(r).map((k) => k.site)).toEqual(["a-site", "b-site"]);
  });

  it("temizlik hata verirse (silme işareti) kayda yazılır, çıkış kırmızıdır", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { TEMIZLIK_BOZUK: "1", VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(1);
    expect(vtKayitlari(r).at(-1)).toMatchObject({ tur: "temizlik", sebep: "temizlik-yarim" });
  });

  it("döküm şifrelemeye eksiksiz gider: imza denetimi baştaki baytları yutmaz", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir(["deneme", "ornek-magaza", "elle"]);
    expect(r.sifrelenen).toBe("PGDMPveri");
  });

  it("boş döküm başarılı sayılmaz (age boş girdiyi de şifreler)", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { DOKUM_BOS: "1", VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(1);
    expect(vtKayitlari(r).at(-1)).toMatchObject({ sonuc: "basarisiz", sebep: "dokum-bos" });
    expect(r.cagrilar).not.toContain("copyto");
  });

  it("yedek işi kurulmamış ortamın veritabanı da görünür", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], {
      KUTULAR: "veritabani-deneme veritabani-canli",
      VERITABANLARI: "site_ornek_magaza",
    });
    expect(r.cagrilar).toContain("exec veritabani-canli psql");
    expect(r.kayit.some((k) => k.ortam === "canli" && k.sebep === "anahtar-yok")).toBe(true);
    expect(r.durum).toBe(1);
  });

  it("kutu listesi okunamazsa kırmızıdır", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { KUTU_BOZUK: "1", VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(1);
    expect(r.kayit.some((k) => k.sebep === "kutu-listesi-okunamadi")).toBe(true);
  });

  it("bozuk site satırıyla temizlik hiçbir şey silmez, kayda yazar", () => {
    const { calistir, siteYaz } = kur(["ornek-magaza"]);
    siteYaz("ornek-magaza", `${acik}\n`);
    const r = calistir(["--temizle", "deneme", "ornek-magaza"]);
    expect(r.durum).toBe(1);
    expect(r.cagrilar).not.toContain("delete");
    expect(r.kayit.at(-1)).toMatchObject({ tur: "temizlik", sebep: "site-bilgisi-bozuk" });
  });

  it("süresi dolmamış yedek görünmüyorsa temizlik silmez: en yeni yedek kalır", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir(["--temizle", "deneme", "ornek-magaza"], { GENC_DOSYA: "" });
    expect(r.durum).toBe(1);
    expect(r.cagrilar).not.toContain("delete");
    expect(r.kayit.at(-1)).toMatchObject({ tur: "temizlik", sebep: "yeni-yedek-yok" });
    // İşaret altındaki yedek geri gelsin: işaretler yine kaldırılır.
    expect(r.cagrilar).toContain("cleanup-hidden");
  });

  it("kayıt büyüyünce kısalır, onay bekleyen temizlik hatası kalır", () => {
    const { calistir, kayitYaz } = kur(["ornek-magaza"]);
    const hata =
      '{"zaman":"2026-01-01T00:00:00Z","ortam":"deneme","site":"ornek-magaza","tur":"temizlik","sonuc":"basarisiz","sebep":"temizlik-yarim","dosya":"","boyut":0}';
    const dolgu =
      '{"zaman":"2026-01-02T00:00:00Z","ortam":"deneme","site":"ornek-magaza","tur":"gece","sonuc":"basarili","sebep":"","dosya":"x","boyut":1}';
    kayitYaz(`${hata}\n${`${dolgu}\n`.repeat(3100)}`);
    const r = calistir(["deneme", "ornek-magaza", "elle"]);
    expect(r.kayit.length).toBeLessThan(2100);
    expect(r.kayit[0]).toMatchObject({ tur: "temizlik", sonuc: "basarisiz" });
    expect(r.kayit.at(-1)).toMatchObject({ tur: "elle" });
  });

  it("dosya adı yedeğin türünü taşır", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir(["deneme", "ornek-magaza", "geri-yukleme-oncesi"]);
    expect(r.kayit.at(-1)?.dosya).toMatch(/^\d{8}T\d{6}Z-geri-yukleme-oncesi\.dump\.age$/);
    expect(() => provaBetigi("deneme", "x", r.kayit.at(-1)?.dosya ?? "", anahtar)).not.toThrow();
  });

  // Dosyalar (kart 0093, karar 0207).
  const ad1 = "11111111-1111-4111-8111-111111111111.webp";
  const ad2 = "22222222-2222-4222-8222-222222222222.pdf";
  const zamanAdi = (ms: number) =>
    new Date(ms)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const dosyaKayitlari = (r: { kayit: YedekKaydi[] }) =>
    r.kayit.filter((k) => k.tur === "dosya" || k.dosya === "dosyalar");

  it("dosyalar kilitle bir kez gider, geçici adlı dosya gitmez, eski kopyalar temizlenir", () => {
    const { calistir, dosyaYaz, depoKaydi } = kur(["ornek-magaza"]);
    dosyaYaz("ornek-magaza", ad1);
    dosyaYaz("ornek-magaza", ad2);
    dosyaYaz("ornek-magaza", `${ad1}.yaziliyor`);
    // Depoda yalnız eski (kilidi bitmeye yakın) bir kopya var: o dosya ve hiç kopyası olmayan dosya gider.
    const r = calistir([], {
      VERITABANLARI: "site_ornek_magaza",
      DEPO_DOSYALARI: `dosyalar/${ad1}.20200101T000000Z.age`,
    });
    expect(r.durum).toBe(0);
    expect(dosyaKayitlari(r)).toMatchObject([
      { tur: "dosya", sonuc: "basarili", dosya: "2", boyut: 22 },
      { tur: "temizlik", sonuc: "basarili", dosya: "dosyalar" },
    ]);
    const giden = depoKaydi().trim().split("\n").sort();
    expect(giden).toHaveLength(2);
    expect(giden[0]).toMatch(new RegExp(`^11;${ad1.replace(".", "\\.")}\\.\\d{8}T\\d{6}Z\\.age$`));
    expect(giden[1]).toMatch(/^11;22222222-.*\.pdf\.\d{8}T\d{6}Z\.age$/);
    expect(r.cagrilar).toMatch(
      /copy \/veri depo:kova\/deneme\/ornek-magaza\/dosyalar --s3-no-check-bucket --s3-object-lock-mode COMPLIANCE --s3-object-lock-retain-until-date \d{4}-/,
    );
    // Depodaki tek kopya diskteki dosyanın en yeni kopyasıdır: silinmez.
    expect(r.cagrilar).not.toContain("--files-from /g/sil");
    expect(r.cagrilar).toContain("backend cleanup-hidden depo:kova/deneme/ornek-magaza/dosyalar");
    expect(r.gecici).toBe("");
  });

  it("süresi dolan kopya silinir; diskteki dosyanın ve en eski veritabanı yedeğinden yeni kopyanın en yenisi kalır", () => {
    const { calistir, dosyaYaz, silinen } = kur(["ornek-magaza"]);
    dosyaYaz("ornek-magaza", ad1);
    const ad3 = "33333333-3333-4333-8333-333333333333.png";
    const ad4 = "44444444-4444-4444-8444-444444444444.png";
    const taze = zamanAdi(Date.now() - 5_000);
    const r = calistir([], {
      VERITABANLARI: "site_ornek_magaza",
      // En eski veritabanı yedeği 2020-06-15.
      GENC_DOSYA: "20200615T000000Z-gece.dump.age 20261101T000000Z-gece.dump.age",
      DEPO_DOSYALARI: [
        `dosyalar/${ad1}.20200101T000000Z.age`,
        `dosyalar/${ad1}.20210101T000000Z.age`,
        `dosyalar/${ad1}.${taze}.age`,
        `dosyalar/${ad3}.20200101T000000Z.age`,
        `dosyalar/${ad4}.20200701T000000Z.age`,
      ].join(" "),
    });
    expect(r.durum).toBe(0);
    expect(silinen().trim().split("\n").sort()).toEqual([
      `${ad1}.20200101T000000Z.age`,
      `${ad1}.20210101T000000Z.age`,
      `${ad3}.20200101T000000Z.age`,
    ]);
    expect(dosyaKayitlari(r).at(-1)).toMatchObject({
      tur: "temizlik",
      sonuc: "basarili",
      dosya: "dosyalar",
      boyut: 3,
    });
  });

  it("diskteki dosyanın en yeni kopyası eski olsa da silinmez", () => {
    const { calistir, dosyaYaz, silinen } = kur(["ornek-magaza"]);
    dosyaYaz("ornek-magaza", ad1);
    // Gönderim yapılsa da sahte depo listesi değişmez: en yeni kopya 2021'dir.
    calistir([], {
      VERITABANLARI: "site_ornek_magaza",
      GENC_DOSYA: "20261101T000000Z-gece.dump.age",
      DEPO_DOSYALARI: `dosyalar/${ad1}.20200101T000000Z.age dosyalar/${ad1}.20210101T000000Z.age`,
    });
    expect(silinen().trim()).toBe(`${ad1}.20200101T000000Z.age`);
  });

  it("bağ, özel dosya ve satır sonlu ad okunmaz; dosya sitenin kullanıcısıyla, bağı izlemeden okunur", () => {
    const { calistir, dosyaYaz, depoKaydi, dosyaKoku } = kur(["ornek-magaza"]);
    const klasor = join(dosyaKoku, "deneme", "ornek-magaza");
    const gizli = join(dosyaKoku, "baska-sitenin-dosyasi");
    writeFileSync(gizli, "GIZLI-ICERIK");
    symlinkSync(gizli, join(klasor, ad1));
    // Satır sonlu ad, bağın adını taşır: adlar satırla ayrılsaydı bağ okunurdu.
    dosyaYaz("ornek-magaza", `x\n${ad1}`);
    spawnSync("mkfifo", [join(klasor, "55555555-5555-4555-8555-555555555555.png")]);
    const r = calistir(["--dosya", "deneme", "ornek-magaza"]);
    expect(r.durum).toBe(0);
    expect(r.kayit.at(-1)).toMatchObject({ tur: "dosya", sonuc: "basarili", dosya: "0" });
    expect(depoKaydi()).toBe("");
    expect(r.sifrelenen).not.toContain("GIZLI");
    // Okuma işlevi bağı izlemez.
    const oku = spawnSync(
      "bash",
      [
        "-c",
        `. ${join(yedekKlasoru, "ortak.sh")}; site_dosyasi_oku 1 "$1"`,
        "-",
        join(klasor, ad1),
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${join(dosyaKoku, "..", "arac")}:${process.env["PATH"]}`,
          YEDEK_KOKU: join(dosyaKoku, "..", "yedek"),
        },
      },
    );
    expect(oku.status).not.toBe(0);
    expect(oku.stdout).toBe("");
  });

  it("kilidi uzun süren kopyası olan dosya yeniden gönderilmez", () => {
    const { calistir, dosyaYaz, depoKaydi } = kur(["ornek-magaza"]);
    dosyaYaz("ornek-magaza", ad1);
    // Saklama 60 sn, yenileme payı 30 sn: 10 sn önceki kopya taze, 40 sn önceki eski.
    const r = calistir(["--dosya", "deneme", "ornek-magaza"], {
      DEPO_DOSYALARI: `dosyalar/${ad1}.20200101T000000Z.age dosyalar/${ad1}.${zamanAdi(Date.now() - 10_000)}.age`,
    });
    expect(r.durum).toBe(0);
    expect(depoKaydi()).toBe("");
    expect(r.kayit.at(-1)).toMatchObject({ tur: "dosya", sonuc: "basarili", dosya: "0" });
    const eski = kur(["ornek-magaza"]);
    eski.dosyaYaz("ornek-magaza", ad1);
    const r2 = eski.calistir(["--dosya", "deneme", "ornek-magaza"], {
      DEPO_DOSYALARI: `dosyalar/${ad1}.${zamanAdi(Date.now() - 40_000)}.age`,
    });
    expect(r2.kayit.at(-1)).toMatchObject({ tur: "dosya", sonuc: "basarili", dosya: "1" });
    // Tek site çağrısı temizlemez.
    expect(r2.cagrilar).not.toContain("delete");
  });

  it("dosyasız site başarılıdır, silecek kopyası yoksa temizlik çağrılmaz", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir([], { VERITABANLARI: "site_ornek_magaza" });
    expect(r.durum).toBe(0);
    expect(dosyaKayitlari(r)).toMatchObject([{ tur: "dosya", sonuc: "basarili", dosya: "0" }]);
    expect(r.cagrilar).not.toContain("ornek-magaza/dosyalar");
  });

  it.each([
    ["klasörü yoksa", { klasorYok: true }, "klasor-yok"],
    ["depo listesi okunamazsa", { DEPO_LISTE_BOZUK: "1" }, "liste-okunamadi"],
    ["yükleme tutmazsa", { DOSYA_YUKLEME_BOZUK: "1" }, "yuklenemedi"],
    ["boyut tutmazsa", { DOSYA_BOYUT_BOZUK: "1" }, "boyut-tutmadi"],
  ] as const)("dosya yedeği %s başarısızdır, kopyalar silinmez", (_ad, ayar, sebep) => {
    const { calistir, dosyaYaz, dosyaKoku } = kur(["ornek-magaza"]);
    dosyaYaz("ornek-magaza", ad1);
    if ("klasorYok" in ayar) rmSync(join(dosyaKoku, "deneme", "ornek-magaza"), { recursive: true });
    const { klasorYok: _, ...ortam } = { klasorYok: false, ...ayar };
    const r = calistir([], {
      ...(ortam as Record<string, string>),
      VERITABANLARI: "site_ornek_magaza",
      DEPO_DOSYALARI: `dosyalar/${ad1}.20200101T000000Z.age`,
    });
    expect(r.durum).toBe(1);
    expect(dosyaKayitlari(r)).toMatchObject([{ tur: "dosya", sonuc: "basarisiz", sebep }]);
    expect(r.cagrilar).not.toContain("delete --min-age 90s depo:kova/deneme/ornek-magaza/dosyalar");
    // Veritabanı yedeği yine alınır.
    expect(vtKayitlari(r).find((k) => k.tur === "gece")).toMatchObject({ sonuc: "basarili" });
    expect(r.gecici).toBe("");
  });

  it("dosyalar parti parti gönderilir, geçici klasör hepsini birden tutmaz", () => {
    const { calistir, dosyaYaz, depoKaydi } = kur(["ornek-magaza"]);
    dosyaYaz("ornek-magaza", ad1);
    dosyaYaz("ornek-magaza", ad2);
    const r = calistir(["--dosya", "deneme", "ornek-magaza"], { DOSYA_PARTI_SINIRI: "1" });
    expect(r.durum).toBe(0);
    expect(r.cagrilar.match(/ copy \/veri /g)).toHaveLength(2);
    expect(depoKaydi().trim().split("\n")).toHaveLength(2);
    expect(r.gecici).toBe("");
  });

  it("dosya temizliği hata verirse kayda yazılır, çıkış kırmızıdır", () => {
    const { calistir, dosyaYaz } = kur(["ornek-magaza"]);
    dosyaYaz("ornek-magaza", ad1);
    const r = calistir([], {
      VERITABANLARI: "site_ornek_magaza",
      TEMIZLIK_BOZUK: "1",
      DEPO_DOSYALARI: `dosyalar/${ad1}.20200101T000000Z.age`,
    });
    expect(r.durum).toBe(1);
    expect(dosyaKayitlari(r).at(-1)).toMatchObject({
      tur: "temizlik",
      sonuc: "basarisiz",
      sebep: "temizlik-yarim",
      dosya: "dosyalar",
    });
  });

  it("tek site çağrısında temizlik yapılmaz", () => {
    const { calistir } = kur(["ornek-magaza"]);
    const r = calistir(["deneme", "ornek-magaza", "elle"]);
    expect(r.durum).toBe(0);
    expect(r.kayit.at(-1)).toMatchObject({ tur: "elle", sonuc: "basarili" });
    expect(r.cagrilar).not.toContain("delete");
  });
});
