// Sunucuda yönetici açan parça, gerçek süreç ve gerçek veritabanıyla (kart 0048, karar 0054).
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { hesapSifresiniDogrula } from "../../oturum/servis.ts";
import { yoneticiler } from "../model.ts";
import { yoneticininIzniVarMi } from "../servis.ts";

let vt: Veritabani;
let adres: string;
let sil: () => Promise<void>;
let kodAdi: string;

const calistir = (kod: string, ...kalan: string[]) =>
  spawnSync(
    process.execPath,
    [join(import.meta.dirname, "..", "sunucuda-yonetici.ts"), kod, ...kalan],
    { encoding: "utf8", env: { ...process.env, VERITABANI_ADRESI: adres } },
  );

beforeAll(async () => {
  const site = await denemeSitesiAc("yonetici");
  vt = site.vt;
  sil = site.sil;
  adres = site.baglantiAdresi;
  kodAdi = decodeURIComponent(new URL(adres).username)
    .replace(/^site_/, "")
    .replaceAll("_", "-");
}, 60_000);
afterAll(() => sil(), 60_000);

describe("sunucuda yönetici", () => {
  it("açar, şifre yalnız çıktıda bir kez, geçer, tam yetkilidir, kayda şifre girmez", async () => {
    const eposta = "ilk@ornek.test";
    const sonuc = calistir(kodAdi, "ac", eposta);
    expect(sonuc.status).toBe(0);
    expect(sonuc.stderr).toBe("");
    const sifre = /^sifre (\S+)$/m.exec(sonuc.stdout)?.[1] ?? "";
    expect(sifre.length).toBeGreaterThan(20);
    const dogrulanan = await hesapSifresiniDogrula(vt, "yonetici", { eposta, sifre });
    if (dogrulanan === null) throw new Error("şifre geçmedi");
    expect(await yoneticininIzniVarMi(vt, dogrulanan.hesapKimligi, "ekip.rol-ata")).toBe(true);
    const kayit = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, dogrulanan.hesapKimligi));
    expect(kayit[0]?.kim_adi).toBe("sunucu-yonetici");
    expect(JSON.stringify(kayit)).not.toContain(sifre);
  });

  it("aynı e-posta ikinci kez açılmaz, şifre üretilmez", () => {
    const sonuc = calistir(kodAdi, "ac", "ilk@ornek.test");
    expect(sonuc.status).toBe(1);
    expect(sonuc.stderr).toContain("zaten var");
    expect(sonuc.stdout).not.toContain("sifre");
  });

  it("başka sitenin kod adıyla hiçbir şey yapmaz", async () => {
    const eposta = "baska@ornek.test";
    const sonuc = calistir("baska-site", "ac", eposta);
    expect(sonuc.status).toBe(1);
    expect(sonuc.stderr).toContain("hiçbir şey yapılmadı");
    expect(await vt.select().from(yoneticiler).where(eq(yoneticiler.eposta, eposta))).toEqual([]);
  });

  it.each([
    ["geçersiz e-posta", ["ac", "gecersiz"]],
    ["e-posta yok", ["ac"]],
    ["bilinmeyen işlem", ["sil", "x@ornek.test"]],
  ])("%s reddedilir", (_ad, argumanlar) => {
    expect(calistir("kod", ...argumanlar).status).toBe(1);
  });

  it("bozuk adres şifreyi yazmaz, hiçbir şey yapmaz", () => {
    const sonuc = spawnSync(
      process.execPath,
      [join(import.meta.dirname, "..", "sunucuda-yonetici.ts"), kodAdi, "ac", "bozuk@ornek.test"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          VERITABANI_ADRESI: ["postgres://k:", "gizli-deger", "@[bozuk"].join(""),
        },
      },
    );
    expect(sonuc.status).toBe(1);
    expect(`${sonuc.stdout}${sonuc.stderr}`).not.toContain("gizli-deger");
  });

  it("tam yetkili yöneticileri sayar", async () => {
    const once = /^sahip (\d+)$/m.exec(calistir(kodAdi, "sahip-sayisi").stdout)?.[1];
    calistir(kodAdi, "ac", "sayilan@ornek.test");
    const sonra = /^sahip (\d+)$/m.exec(calistir(kodAdi, "sahip-sayisi").stdout)?.[1];
    expect(Number(sonra)).toBe(Number(once) + 1);
    calistir(kodAdi, "kapat", "sayilan@ornek.test");
    expect(calistir("baska-site", "sahip-sayisi").status).toBe(1);
  });

  it("son tam yetkili kapatılamaz, başka sahip varken kapatılır, kapanan giremez", async () => {
    const son = calistir(kodAdi, "kapat", "ilk@ornek.test");
    expect(son.status).toBe(1);
    expect(son.stderr).toContain("Son tam yetkili");

    const ikinci = "ikinci@ornek.test";
    const sifre = /^sifre (\S+)$/m.exec(calistir(kodAdi, "ac", ikinci).stdout)?.[1] ?? "";
    const kapat = calistir(kodAdi, "kapat", ikinci);
    expect(kapat.status).toBe(0);
    expect(kapat.stdout).toContain("kapatildi");
    expect(await hesapSifresiniDogrula(vt, "yonetici", { eposta: ikinci, sifre })).toBeNull();
    expect(calistir(kodAdi, "kapat", "yok@ornek.test").status).toBe(1);
  });
});
