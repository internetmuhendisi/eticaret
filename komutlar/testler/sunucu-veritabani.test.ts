// Sunucudaki veritabanının tanımı ve betikleri (kart 0039, karar 0034). Betikler sunucuya
// gitmeden burada sözdiziminden ve davranışından geçer; her kuralın bozuk bir örneği yakalanır.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sablonParcalari } from "../gizli-bilgi.mts";
import { kodAdiGecerli } from "../on-kapi.mts";
import {
  agHatalari,
  guncellemeBetigi,
  kurmaBetigi,
  portuKapali,
  postgresGoruntusu,
  siteAcmaBetigi,
  siteAgi,
  veritabaniTanimi,
  yoneticiDosyasi,
  yoneticiKlasoruAdi,
} from "../sunucu-veritabani.mts";

const kok = join(import.meta.dirname, "..", "..");
const sozdizimi = (betik: string) => spawnSync("bash", ["-n"], { input: betik, encoding: "utf8" });

describe("veritabanı kutusunun tanımı", () => {
  const tanim = veritabaniTanimi("deneme", ["ornek-magaza", "vt-deneme", "ornek-magaza"]);
  const kutu = tanim.services.veritabani;

  it("görüntüsü yerel ortamla aynı", () => {
    const yerel = readFileSync(join(kok, "sunucu", "compose.yaml"), "utf8");
    expect(yerel).toContain(`image: ${postgresGoruntusu}`);
    expect(kutu.image).toBe(postgresGoruntusu);
  });

  it("kısıtlı çalışır, portu açılmaz", () => {
    expect(kutu.user).toBe("70:70");
    expect(kutu.read_only).toBe(true);
    expect(kutu.cap_drop).toEqual(["ALL"]);
    expect(kutu.cap_add).toEqual([]);
    expect(kutu.security_opt).toEqual(["no-new-privileges:true"]);
    expect("ports" in kutu).toBe(false);
  });

  it("her sitenin ağına bir kez, veritabani adıyla bağlanır", () => {
    expect(kutu.networks).toEqual({
      "site-deneme-ornek-magaza": { aliases: ["veritabani"] },
      "site-deneme-vt-deneme": { aliases: ["veritabani"] },
    });
    expect(Object.keys(tanim.networks ?? {})).toEqual(Object.keys(kutu.networks ?? {}));
  });

  it("site yoksa ağ tanımlanmaz", () => {
    const bos = veritabaniTanimi("deneme", []);
    expect("networks" in bos).toBe(false);
    expect("networks" in bos.services.veritabani).toBe(false);
  });

  it("yönetici şifresi dosyadan gelir, ortam değişkeninde değer yok", () => {
    expect(tanim.secrets.yonetici.file).toBe(yoneticiDosyasi("deneme"));
    expect(kutu.environment).toEqual({ POSTGRES_PASSWORD_FILE: "/run/secrets/yonetici_sifresi" });
  });

  it("yönetici klasörü hiçbir sitenin adı olamaz", () => {
    expect(kodAdiGecerli(yoneticiKlasoruAdi)).toBe(false);
  });

  it.each(["Ornek", "a--b", "-a", ""])("geçersiz kod adına ağ verilmez: %j", (kodAdi) => {
    expect(() => siteAgi("deneme", kodAdi)).toThrow();
  });

  it("açık port ölçümü", () => {
    expect(portuKapali("{}\n")).toBe(true);
    expect(portuKapali("null")).toBe(true);
    expect(portuKapali('{"5432/tcp":[{"HostIp":"","HostPort":"5432"}]}')).toBe(false);
    expect(portuKapali("")).toBe(false);
  });
});

describe("veritabanı kutusunun ağları", () => {
  it("yalnız o ortamdaki sitelerin ağları geçer", () => {
    const siteler = ["ornek-magaza", "vt-deneme"];
    expect(
      agHatalari(["site-deneme-ornek-magaza", "site-deneme-vt-deneme"], "deneme", siteler),
    ).toEqual([]);
  });

  it.each([
    ["ön kapının ortak ağı", "altyapi"],
    ["Docker'ın kendi ağı", "bridge"],
    ["başka ortamın site ağı", "site-canli-ornek-magaza"],
    ["geçersiz kod adlı ağ", "site-deneme-a--b"],
    ["kod adsız ağ", "site-deneme-"],
    ["listede olmayan sitenin kalmış ağı", "site-deneme-vt-deneme"],
  ])("%s kırmızıdır", (_ad, ag) => {
    expect(agHatalari(["site-deneme-ornek-magaza", ag], "deneme", ["ornek-magaza"])).toEqual([
      `beklenmeyen ağ ${ag}`,
    ]);
  });

  it("veritabanı henüz açılmamış sitenin ağı olmaması kırmızı değildir", () => {
    expect(
      agHatalari(["site-deneme-ornek-magaza"], "deneme", ["ornek-magaza", "yeni-site"]),
    ).toEqual([]);
  });
});

describe("sunucuda çalışan betikler", () => {
  it.each([
    ["kurma", kurmaBetigi("deneme", ["ornek-magaza"])],
    ["sitenin veritabanını açma", siteAcmaBetigi("deneme", "ornek-magaza")],
    [
      "değişiklikleri uygulama",
      guncellemeBetigi("deneme", "ornek-magaza", 1, "altyapi-cekirdek:0.1.0"),
    ],
  ])("%s betiğinin sözdizimi geçerli", (_ad, betik) => {
    const sonuc = sozdizimi(betik);
    expect(sonuc.stderr).toBe("");
    expect(sonuc.status).toBe(0);
  });

  it("değişiklikler sitenin kullanıcısıyla, ağında ve yalnız kendi dosyasıyla uygulanır", () => {
    const betik = guncellemeBetigi("deneme", "ornek-magaza", 1, "altyapi-cekirdek:0.1.0");
    expect(betik).toContain("--network site-deneme-ornek-magaza");
    expect(betik).toContain("--user 30001:30001");
    expect(betik).toContain("-v /srv/altyapi/gizli/deneme/ornek-magaza/veritabani_adresi:");
    expect(betik).toContain("--read-only --cap-drop ALL");
    expect(betik).not.toMatch(/VERITABANI_ADRESI=/);
  });
});

// Sitenin veritabanını açan betiğin kök kabuğunda çalışan kısmı, sahte bir gizli bilgi dosyası ve
// psql yerine girdiyi kaydeden bir komutla burada çalıştırılır.
describe("sitenin veritabanını açan betik", () => {
  const klasor = mkdtempSync(join(tmpdir(), "vt-betik-"));
  afterAll(() => rmSync(klasor, { recursive: true, force: true }));
  const sifre = "a".repeat(32) + "0123456789abcdef".repeat(2);
  // Adresler gizli bilgi kaydının parçalarından kurulur: kayıtta şifreli adres kalıbı durmaz
  // (veri ayrımı testi).
  const [on, son] = sablonParcalari("VERITABANI_ADRESI", "ornek-magaza");
  const [baskaOn, baskaSon] = sablonParcalari("VERITABANI_ADRESI", "baska");
  const adres = (deger: string) => `${on}${deger}${son}`;

  // psql yerine geçen komut: girdiyi kaydeder; hata istenirse psql gibi şifreyi ve komutun metnini
  // hata çıktısına basıp hatayla biter.
  const calistir = (deger: string, { psqlHatasi = false } = {}) => {
    const dosya = join(klasor, "veritabani_adresi");
    const cikti = join(klasor, "psql-girdisi");
    writeFileSync(dosya, deger);
    rmSync(cikti, { force: true });
    const betik = siteAcmaBetigi("deneme", "ornek-magaza");
    const ic = betik.split("<<'KOK_SONU'\n")[1]?.split("\nKOK_SONU\n")[0] ?? "";
    const yerel = ic
      .replace(/^f=.*$/m, `f=${dosya}`)
      .replace(
        /docker exec -i -e PGOPTIONS='[^']*' \S+ psql .* -f - (>\/dev\/null 2>"\$e")/,
        psqlHatasi
          ? `{ cat > ${cikti}; printf '%s\\n' "psql:<stdin>:21: ERROR:  syntax error at or near $s" "LINE 1: ALTER ROLE x PASSWORD '$s'" "                                ^" >&2; false; } $1`
          : `cat > ${cikti}`,
      );
    const sonuc = spawnSync("bash", ["-c", yerel], { encoding: "utf8" });
    let girdi = "";
    try {
      girdi = readFileSync(cikti, "utf8");
    } catch {}
    return { ...sonuc, girdi };
  };

  it("şifreyi psql'e girdinin ilk satırında verir, ardından SQL betiği gelir", () => {
    const sonuc = calistir(adres(sifre));
    expect(sonuc.status).toBe(0);
    expect(sonuc.stdout).not.toContain(sifre);
    expect(sonuc.stderr).not.toContain(sifre);
    const [ilk, ...geri] = sonuc.girdi.split("\n");
    expect(ilk).toBe(`\\set sifre '${sifre}'`);
    expect(geri.join("\n")).toContain('ALTER ROLE :"ad"');
  });

  it("psql hatasında yalnız ERROR: iletisi görünür, şifre ve komutun metni görünmez", () => {
    const sonuc = calistir(adres(sifre), { psqlHatasi: true });
    expect(sonuc.status).not.toBe(0);
    expect(sonuc.stderr).toContain("veritabanı açılamadı");
    expect(sonuc.stderr).not.toContain(sifre);
    expect(sonuc.stderr).not.toContain(sifre.slice(0, 16));
    expect(sonuc.stderr).not.toContain("LINE 1");
  });

  it.each([
    ["başka sitenin adresi", `${baskaOn}${sifre}${baskaSon}`],
    ["kısa şifre", adres("abc")],
    ["tırnaklı şifre", adres(`${sifre.slice(1)}'`)],
    ["boş dosya", ""],
    ["şifreden sonra satır sonuyla eklenmiş komut", adres(`${sifre}\nselect 1/0;\n`)],
    ["şifreden önce satır sonuyla eklenmiş komut", adres(`select 1/0;\n${sifre}`)],
  ])("%s reddedilir, psql'e bir şey gitmez", (_ad, deger) => {
    const sonuc = calistir(deger);
    expect(sonuc.status).not.toBe(0);
    expect(sonuc.girdi).toBe("");
  });
});
