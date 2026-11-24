// Sunucuda yönetici açan parça, gerçek süreç ve gerçek veritabanıyla (kart 0048, karar 0054).
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { hesapSifresiniDogrula } from "../../oturum/servis.ts";
import { yoneticiIkiAsama, yoneticiler, yoneticiYedekKodlari } from "../model.ts";
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

// Her adım parçayı ayrı bir süreçte çalıştırır: testin denediği şey gerçek süreçtir. Bir sürecin açılışı ölçüldü
// (kart 0088, 2026-11-10): yalnız modüllerin yüklenmesi yaklaşık 280 ms, veritabanı işi ve şifre özeti onun
// yanında küçük (özet 20 ms). Yükleme işlemciye bağlıdır, makine yüklüyken uzar: dört ya da beş süreç açan
// testler boşta 1,5–3 saniye sürerken yük ortalaması 27,8'de (32 çekirdek) 5 saniyelik varsayılan sınırı aştı.
// Sınır bu yüzden yükseltildi; süreç asılı kalırsa test yine düşer.
const surecliTestSiniri = 30_000;

describe(
  "sunucuda yönetici",
  () => {
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

    it("iki aşamalı girişi sıfırlar: kurulum ve yedek kodlar silinir, kayda sunucu adıyla girer (kart 0053)", async () => {
      const eposta = "telefonsuz@ornek.test";
      const ilkSifre = /^sifre (\S+)$/m.exec(calistir(kodAdi, "ac", eposta).stdout)?.[1] ?? "";
      expect(
        await hesapSifresiniDogrula(vt, "yonetici", { eposta, sifre: ilkSifre }),
      ).not.toBeNull();
      const [hesap] = await vt
        .select({ kimlik: yoneticiler.kimlik })
        .from(yoneticiler)
        .where(eq(yoneticiler.eposta, eposta));
      if (hesap === undefined) throw new Error("Hesap açılmadı.");
      // Kurulumu yoksa sıfırlanacak bir şey yok.
      const kurulmamis = calistir(kodAdi, "iki-asama-sifirla", eposta);
      expect(kurulmamis.status).toBe(1);
      expect(kurulmamis.stderr).toContain("kurulu değil");
      await vt.insert(yoneticiIkiAsama).values({
        yonetici_kimligi: hesap.kimlik,
        sifreli_gizli: "deneme",
        son_kod_adimi: 0,
        onay_zamani: new Date(),
      });
      await vt
        .insert(yoneticiYedekKodlari)
        .values({ yonetici_kimligi: hesap.kimlik, kod_ozeti: "ozet" });
      // Başka sitenin kod adıyla kurulumlu hesaba dokunulmaz (kurulum yerinde kalır).
      expect(calistir("baska-site", "iki-asama-sifirla", eposta).status).toBe(1);
      expect(
        await vt
          .select()
          .from(yoneticiIkiAsama)
          .where(eq(yoneticiIkiAsama.yonetici_kimligi, hesap.kimlik)),
      ).toHaveLength(1);
      const sonuc = calistir(kodAdi, "iki-asama-sifirla", eposta);
      expect(sonuc.status).toBe(0);
      expect(sonuc.stdout).toContain("sifirlandi");
      // Şifre de sıfırlandı: "ac"ın verdiği şifre artık geçmez.
      expect(await hesapSifresiniDogrula(vt, "yonetici", { eposta, sifre: ilkSifre })).toBeNull();
      expect(
        await vt
          .select()
          .from(yoneticiIkiAsama)
          .where(eq(yoneticiIkiAsama.yonetici_kimligi, hesap.kimlik)),
      ).toEqual([]);
      expect(
        await vt
          .select()
          .from(yoneticiYedekKodlari)
          .where(eq(yoneticiYedekKodlari.yonetici_kimligi, hesap.kimlik)),
      ).toEqual([]);
      const [kayit] = await vt
        .select()
        .from(degisiklikKayitlari)
        .where(eq(degisiklikKayitlari.islem, "yonetici.iki-asama-sifirlandi"));
      expect(kayit).toMatchObject({
        kim_turu: "sistem",
        kim_adi: "sunucu-yonetici",
        kayit_kimligi: hesap.kimlik,
      });
      expect(calistir(kodAdi, "iki-asama-sifirla", "yok@ornek.test").status).toBe(1);
    });
  },
  surecliTestSiniri,
);
