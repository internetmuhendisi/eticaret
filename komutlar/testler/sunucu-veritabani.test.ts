// Sunucudaki veritabanının tanımı ve betikleri (kart 0039, karar 0034). Betikler sunucuya
// gitmeden burada sözdiziminden ve davranışından geçer; her kuralın bozuk bir örneği yakalanır.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { kodAdiGecerli } from "../on-kapi.mts";
import {
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

  const calistir = (deger: string) => {
    const dosya = join(klasor, "veritabani_adresi");
    const cikti = join(klasor, "psql-girdisi");
    writeFileSync(dosya, deger);
    rmSync(cikti, { force: true });
    const betik = siteAcmaBetigi("deneme", "ornek-magaza");
    const ic = betik.split("<<'KOK_SONU'\n")[1]?.split("\nKOK_SONU\n")[0] ?? "";
    const yerel = ic
      .replace(/^f=.*$/m, `f=${dosya}`)
      .replace(/docker exec -i \S+ psql .* -f - >\/dev\/null/, `cat > ${cikti}`);
    const sonuc = spawnSync("bash", ["-c", yerel], { encoding: "utf8" });
    let girdi = "";
    try {
      girdi = readFileSync(cikti, "utf8");
    } catch {}
    return { ...sonuc, girdi };
  };

  it("şifreyi psql'e girdinin ilk satırında verir, ardından SQL betiği gelir", () => {
    const sonuc = calistir(
      `postgres://site_ornek_magaza:${sifre}@veritabani:5432/site_ornek_magaza`,
    );
    expect(sonuc.status).toBe(0);
    expect(sonuc.stdout).not.toContain(sifre);
    expect(sonuc.stderr).not.toContain(sifre);
    const [ilk, ...geri] = sonuc.girdi.split("\n");
    expect(ilk).toBe(`\\set sifre '${sifre}'`);
    expect(geri.join("\n")).toContain('ALTER ROLE :"ad"');
  });

  it.each([
    ["başka sitenin adresi", `postgres://site_baska:${sifre}@veritabani:5432/site_baska`],
    ["kısa şifre", "postgres://site_ornek_magaza:abc@veritabani:5432/site_ornek_magaza"],
    [
      "tırnaklı şifre",
      `postgres://site_ornek_magaza:${sifre.slice(1)}'@veritabani:5432/site_ornek_magaza`,
    ],
    ["boş dosya", ""],
  ])("%s reddedilir, psql'e bir şey gitmez", (_ad, deger) => {
    const sonuc = calistir(deger);
    expect(sonuc.status).not.toBe(0);
    expect(sonuc.girdi).toBe("");
  });
});
