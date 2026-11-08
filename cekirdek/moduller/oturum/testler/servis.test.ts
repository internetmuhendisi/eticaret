// Şifre ve oturum motoru, gerçek veritabanıyla (kart 0025, karar 0039). İki deneme sitesi açar,
// bitince siler. Yerel veritabanı kutusu açık olmalı (pnpm veritabani-baslat).
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ayarSemasi, type SiteAyarlari } from "../../../ayar-semasi/ayarlar.ts";
import { gunluk } from "../../../izleme/gunluk.ts";
import { gizliIsareti, maskele } from "../../../izleme/maskele.ts";
import {
  cerezOku,
  istektenOturumAl,
  oturumCerezleri,
  oturumCerezleriniSil,
  oturumSuresiSaniye,
} from "../../../kapi/oturum-cerezi.ts";
import {
  type HesapTuru,
  hesapTurleri,
  oturumCerezAdlari,
  yenilemeToleransiSaniye,
} from "../../../kayitlar/oturum.ts";
import { baglan, siteVeritabaniAdi, type Veritabani } from "../../../veritabani/baglanti.ts";
import { siteVeritabaniniGuncelle } from "../../../veritabani/guncelle.ts";
import { adres, yoneticiAdresi } from "../../../veritabani/testler/adresler.ts";
import { denemeVeritabaniAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { yoneticiler, yoneticiOturumlari } from "../../ekip/model.ts";
import { musteriler, musteriOturumlari } from "../../musteri/model.ts";
import {
  anahtarOzeti,
  cikisYap,
  girisYap,
  hesapAc,
  oturumuDogrula,
  oturumuYenile,
} from "../servis.ts";
import { siraylaEnKisaSureler } from "./sure-olcumu.ts";

const ek = randomBytes(4).toString("hex");
const sifre = "uzun-bir-deneme-sifresi";
const sure = 24 * 60 * 60;
const yonetici = baglan(yoneticiAdresi("postgres"));
const siteler: { ad: string; vt: Veritabani }[] = [];
let a: Veritabani;
let b: Veritabani;
let sayac = 0;

const yeniEposta = () => {
  sayac += 1;
  return `deneme${sayac}@ornek.test`;
};

const siteAc = async (harf: string): Promise<Veritabani> => {
  const kodAdi = `oturum-${harf}-${ek}`;
  const ad = siteVeritabaniAdi(kodAdi);
  const veritabaniSifresi = randomBytes(24).toString("base64url");
  await denemeVeritabaniAc(ad, veritabaniSifresi);
  const vt = baglan(adres(ad, veritabaniSifresi, ad));
  siteler.push({ ad, vt });
  await siteVeritabaniniGuncelle(vt, kodAdi);
  return vt;
};

const girisliHesap = async (vt: Veritabani, tur: HesapTuru = "musteri") => {
  const eposta = yeniEposta();
  await hesapAc(vt, tur, { eposta, sifre });
  const giris = await girisYap(vt, tur, { eposta, sifre }, sure);
  if (giris === null) throw new Error("Giriş yapılamadı.");
  return { eposta, ...giris };
};

const oturumTablolari = { yonetici: yoneticiOturumlari, musteri: musteriOturumlari };

// Süre dolmasını bekletmeden gerçek satırdaki zaman geçmişe alınır.
const gecmis = () => new Date(Date.now() - 1000);
const kisaAnahtariBitir = (vt: Veritabani, tur: HesapTuru, kisaAnahtar: string) =>
  vt
    .update(oturumTablolari[tur])
    .set({ kisa_anahtar_bitis: gecmis() })
    .where(eq(oturumTablolari[tur].kisa_anahtar_ozeti, anahtarOzeti(kisaAnahtar)));

beforeAll(async () => {
  a = await siteAc("a");
  b = await siteAc("b");
}, 60_000);

afterAll(async () => {
  for (const { ad, vt } of siteler) {
    await vt.$client.end();
    await yonetici.execute(sql`drop database if exists ${sql.identifier(ad)} with (force)`);
    await yonetici.execute(sql`drop role if exists ${sql.identifier(ad)}`);
  }
  await yonetici.$client.end();
});

describe.each(hesapTurleri)("%s hesabı", (tur) => {
  it("doğru şifre oturum açar, yanlış şifre ve bilinmeyen e-posta açmaz", async () => {
    const eposta = yeniEposta();
    const { hesapKimligi } = await hesapAc(a, tur, { eposta, sifre });

    const giris = await girisYap(a, tur, { eposta: eposta.toUpperCase(), sifre }, sure);
    expect(giris?.hesapKimligi).toBe(hesapKimligi);
    expect(await oturumuDogrula(a, tur, giris?.anahtarlar.kisaAnahtar as string)).toEqual({
      hesapKimligi,
    });

    expect(await girisYap(a, tur, { eposta, sifre: `${sifre}x` }, sure)).toBeNull();
    expect(await girisYap(a, tur, { eposta: yeniEposta(), sifre }, sure)).toBeNull();
    expect(await girisYap(a, tur, { eposta: "eposta-degil", sifre }, sure)).toBeNull();
  });

  it("kayıtlı olmayan e-posta yanlış şifre kadar sürer", async () => {
    const eposta = yeniEposta();
    await hesapAc(a, tur, { eposta, sifre });
    const kayitsizEposta = yeniEposta();
    const [yanlisSifre, kayitsiz] = await siraylaEnKisaSureler(
      () => girisYap(a, tur, { eposta, sifre: `${sifre}x` }, sure),
      () => girisYap(a, tur, { eposta: kayitsizEposta, sifre }, sure),
    );
    expect(kayitsiz).toBeGreaterThan(yanlisSifre / 2);
  });

  it("süresi dolan kısa anahtar geçmez, yenileme anahtarıyla yenilenir, eskileri geçmez", async () => {
    const { anahtarlar, hesapKimligi } = await girisliHesap(a, tur);
    await kisaAnahtariBitir(a, tur, anahtarlar.kisaAnahtar);
    expect(await oturumuDogrula(a, tur, anahtarlar.kisaAnahtar)).toBeNull();

    const sonuc = await oturumuYenile(a, tur, anahtarlar.yenilemeAnahtari, sure);
    if (sonuc.durum !== "yenilendi") throw new Error(`Yenilenmedi: ${sonuc.durum}`);
    expect(sonuc.hesapKimligi).toBe(hesapKimligi);
    expect(sonuc.anahtarlar.kisaAnahtar).not.toBe(anahtarlar.kisaAnahtar);
    expect(sonuc.anahtarlar.yenilemeAnahtari).not.toBe(anahtarlar.yenilemeAnahtari);
    expect(await oturumuDogrula(a, tur, sonuc.anahtarlar.kisaAnahtar)).toEqual({ hesapKimligi });
    expect(await oturumuDogrula(a, tur, anahtarlar.kisaAnahtar)).toBeNull();
  });

  it("çıkıştan sonra iki anahtar da geçmez, eski yenileme anahtarı da", async () => {
    const { anahtarlar } = await girisliHesap(a, tur);
    const yenilenen = await oturumuYenile(a, tur, anahtarlar.yenilemeAnahtari, sure);
    if (yenilenen.durum !== "yenilendi") throw new Error("Yenilenmedi.");

    await cikisYap(a, tur, yenilenen.anahtarlar);

    expect(await oturumuDogrula(a, tur, yenilenen.anahtarlar.kisaAnahtar)).toBeNull();
    for (const eski of [yenilenen.anahtarlar.yenilemeAnahtari, anahtarlar.yenilemeAnahtari]) {
      expect(await oturumuYenile(a, tur, eski, sure)).toEqual({ durum: "gecersiz" });
    }
  });

  it("çıkış tek anahtarla da oturumu bütünüyle kapatır", async () => {
    const kisayla = await girisliHesap(a, tur);
    await cikisYap(a, tur, { kisaAnahtar: kisayla.anahtarlar.kisaAnahtar });
    expect(await oturumuYenile(a, tur, kisayla.anahtarlar.yenilemeAnahtari, sure)).toEqual({
      durum: "gecersiz",
    });

    const yenilemeyle = await girisliHesap(a, tur);
    await cikisYap(a, tur, { yenilemeAnahtari: yenilemeyle.anahtarlar.yenilemeAnahtari });
    expect(await oturumuDogrula(a, tur, yenilemeyle.anahtarlar.kisaAnahtar)).toBeNull();

    await expect(cikisYap(a, tur, {})).resolves.toBeNull();
  });

  it("yenileme hareketsizlik süresini ileri alır", async () => {
    const { anahtarlar } = await girisliHesap(a, tur);
    const tablo = oturumTablolari[tur];
    const yakin = new Date(Date.now() + 60_000);
    await a
      .update(tablo)
      .set({ oturum_bitis: yakin })
      .where(eq(tablo.kisa_anahtar_ozeti, anahtarOzeti(anahtarlar.kisaAnahtar)));
    const sonuc = await oturumuYenile(a, tur, anahtarlar.yenilemeAnahtari, sure);
    if (sonuc.durum !== "yenilendi") throw new Error("Yenilenmedi.");
    const [satir] = await a
      .select({ bitis: tablo.oturum_bitis })
      .from(tablo)
      .where(eq(tablo.kisa_anahtar_ozeti, anahtarOzeti(sonuc.anahtarlar.kisaAnahtar)));
    expect(satir?.bitis.getTime()).toBeGreaterThan(Date.now() + sure * 1000 - 60_000);
  });

  it("çıkış değişmiş yenileme anahtarıyla da oturumu kapatır", async () => {
    const { anahtarlar } = await girisliHesap(a, tur);
    const yenilenen = await oturumuYenile(a, tur, anahtarlar.yenilemeAnahtari, sure);
    if (yenilenen.durum !== "yenilendi") throw new Error("Yenilenmedi.");
    await cikisYap(a, tur, { yenilemeAnahtari: anahtarlar.yenilemeAnahtari });
    expect(await oturumuDogrula(a, tur, yenilenen.anahtarlar.kisaAnahtar)).toBeNull();
  });

  it("hareketsizlik süresi dolan oturum yenilenmez", async () => {
    const { anahtarlar } = await girisliHesap(a, tur);
    await a
      .update(oturumTablolari[tur])
      .set({ oturum_bitis: gecmis() })
      .where(eq(oturumTablolari[tur].kisa_anahtar_ozeti, anahtarOzeti(anahtarlar.kisaAnahtar)));
    expect(await oturumuDogrula(a, tur, anahtarlar.kisaAnahtar)).toBeNull();
    expect(await oturumuYenile(a, tur, anahtarlar.yenilemeAnahtari, sure)).toEqual({
      durum: "gecersiz",
    });
  });

  it("A sitesinin anahtarları B sitesinde geçmez, aynı e-posta ve şifreyle de", async () => {
    const { anahtarlar, eposta } = await girisliHesap(a, tur);
    expect(await oturumuDogrula(b, tur, anahtarlar.kisaAnahtar)).toBeNull();
    expect(await oturumuYenile(b, tur, anahtarlar.yenilemeAnahtari, sure)).toEqual({
      durum: "gecersiz",
    });
    expect(await girisYap(b, tur, { eposta, sifre }, sure)).toBeNull();

    // B'de aynı e-postayla açılan hesabın oturumu da A'da geçmez.
    await hesapAc(b, tur, { eposta, sifre });
    const bGirisi = await girisYap(b, tur, { eposta, sifre }, sure);
    expect(await oturumuDogrula(a, tur, bGirisi?.anahtarlar.kisaAnahtar as string)).toBeNull();
    expect(await oturumuDogrula(a, tur, anahtarlar.kisaAnahtar)).not.toBeNull();
  });
});

describe("yenileme anahtarının yeniden kullanımı", () => {
  const tur = "musteri";
  const yenile = async () => {
    const { anahtarlar } = await girisliHesap(a, tur);
    const sonuc = await oturumuYenile(a, tur, anahtarlar.yenilemeAnahtari, sure);
    if (sonuc.durum !== "yenilendi") throw new Error("Yenilenmedi.");
    return { eski: anahtarlar, yeni: sonuc.anahtarlar };
  };

  it("tolerans içinde eski anahtar kullanıcıyı çıkarmaz, yeni anahtar da üretmez", async () => {
    const { eski, yeni } = await yenile();
    const sonuc = await oturumuYenile(a, tur, eski.yenilemeAnahtari, sure);
    expect(sonuc.durum).toBe("tolerans");
    expect(await oturumuDogrula(a, tur, yeni.kisaAnahtar)).not.toBeNull();
  });

  it("toleranstan sonra eski anahtar oturumu kapatır ve günlüğe uyarı yazar", async () => {
    const uyari = vi.spyOn(gunluk, "uyari").mockImplementation(() => undefined);
    const { eski, yeni } = await yenile();
    await a
      .update(musteriOturumlari)
      .set({ yenileme_zamani: new Date(Date.now() - (yenilemeToleransiSaniye + 1) * 1000) })
      .where(eq(musteriOturumlari.kisa_anahtar_ozeti, anahtarOzeti(yeni.kisaAnahtar)));

    expect(await oturumuYenile(a, tur, eski.yenilemeAnahtari, sure)).toEqual({
      durum: "yeniden-kullanim",
    });
    expect(await oturumuDogrula(a, tur, yeni.kisaAnahtar)).toBeNull();
    expect(await oturumuYenile(a, tur, yeni.yenilemeAnahtari, sure)).toEqual({
      durum: "gecersiz",
    });
    expect(uyari).toHaveBeenCalledOnce();
    expect(JSON.stringify(uyari.mock.calls)).not.toContain(eski.yenilemeAnahtari);
    // Uyarıdan hangi kaydın olduğu anlaşılır, alanlar günlükte gizlenmez.
    expect(JSON.stringify(maskele(uyari.mock.calls[0]?.[1]))).not.toContain(gizliIsareti);
    uyari.mockRestore();
  });

  it("aynı anda giden yenilemelerden yalnız biri yeni anahtar alır, oturum açık kalır", async () => {
    const adet = 8;
    // Bağlantılar önceden açılır: yoksa istekler bağlantı beklerken sıraya girer ve yarış olmaz.
    await Promise.all(Array.from({ length: adet }, () => a.$client.query("select pg_sleep(0.05)")));
    for (let deneme = 0; deneme < 5; deneme += 1) {
      const { anahtarlar } = await girisliHesap(a, tur);
      const sonuclar = await Promise.all(
        Array.from({ length: adet }, () =>
          oturumuYenile(a, tur, anahtarlar.yenilemeAnahtari, sure),
        ),
      );
      const yenilenen = sonuclar.filter(({ durum }) => durum === "yenilendi");
      expect(yenilenen).toHaveLength(1);
      expect(sonuclar.filter(({ durum }) => durum === "tolerans")).toHaveLength(adet - 1);
    }
  });
});

describe("hesap", () => {
  it("aynı e-postayla ikinci hesap açılmaz, büyük harfle de", async () => {
    const eposta = yeniEposta();
    await hesapAc(a, "musteri", { eposta, sifre });
    await expect(
      hesapAc(a, "musteri", { eposta: eposta.toUpperCase(), sifre }),
    ).rejects.toMatchObject({ kod: "cakisma" });
  });

  it("kısa şifre ve bozuk e-posta reddedilir, hata girilen değeri taşımaz", async () => {
    const hata = await hesapAc(a, "musteri", { eposta: "eposta-degil", sifre: "kisa-sifre" }).catch(
      (yakalanan: unknown) => yakalanan,
    );
    expect(hata).toMatchObject({ kod: "dogrulama" });
    expect(JSON.stringify(hata)).not.toContain("kisa-sifre");
    expect(JSON.stringify(hata)).not.toContain("eposta-degil");
  });

  it("silinen hesap giremez, oturumu geçmez, e-postası yeniden kullanılabilir", async () => {
    const { eposta, anahtarlar, hesapKimligi } = await girisliHesap(a, "musteri");
    await a
      .update(musteriler)
      .set({ silinme_zamani: new Date() })
      .where(eq(musteriler.kimlik, hesapKimligi));

    expect(await girisYap(a, "musteri", { eposta, sifre }, sure)).toBeNull();
    expect(await oturumuDogrula(a, "musteri", anahtarlar.kisaAnahtar)).toBeNull();
    expect(await oturumuYenile(a, "musteri", anahtarlar.yenilemeAnahtari, sure)).toEqual({
      durum: "gecersiz",
    });
    await expect(hesapAc(a, "musteri", { eposta, sifre })).resolves.toBeDefined();
  });

  it("yönetici ve müşteri ayrıdır: aynı e-posta iki yerde açılır, oturumlar karışmaz", async () => {
    const eposta = yeniEposta();
    await hesapAc(a, "yonetici", { eposta, sifre });
    await hesapAc(a, "musteri", { eposta, sifre: `${sifre}-musteri` });

    expect(await girisYap(a, "yonetici", { eposta, sifre: `${sifre}-musteri` }, sure)).toBeNull();
    const yoneticiGirisi = await girisYap(a, "yonetici", { eposta, sifre }, sure);
    const anahtarlar = yoneticiGirisi?.anahtarlar;
    if (anahtarlar === undefined) throw new Error("Giriş yapılamadı.");
    expect(await oturumuDogrula(a, "musteri", anahtarlar.kisaAnahtar)).toBeNull();
    expect(await oturumuYenile(a, "musteri", anahtarlar.yenilemeAnahtari, sure)).toEqual({
      durum: "gecersiz",
    });
  });

  it("eski ayarla özetlenmiş şifre başarılı girişte güncel ayara geçer", async () => {
    const eposta = yeniEposta();
    const { hesapKimligi } = await hesapAc(a, "yonetici", { eposta, sifre });
    const { argon2Sync, randomBytes: rastgele } = await import("node:crypto");
    const tuz = rastgele(16);
    const deger = argon2Sync("argon2id", {
      message: sifre,
      nonce: tuz,
      memory: 1024,
      passes: 1,
      parallelism: 1,
      tagLength: 32,
    });
    const yaz = (b: Buffer) => b.toString("base64").replace(/=+$/, "");
    const eskiOzet = `$argon2id$v=19$m=1024,t=1,p=1$${yaz(tuz)}$${yaz(deger)}`;
    await a
      .update(yoneticiler)
      .set({ sifre_ozeti: eskiOzet })
      .where(eq(yoneticiler.kimlik, hesapKimligi));

    expect(await girisYap(a, "yonetici", { eposta, sifre }, sure)).not.toBeNull();
    const [satir] = await a
      .select({ ozet: yoneticiler.sifre_ozeti })
      .from(yoneticiler)
      .where(eq(yoneticiler.kimlik, hesapKimligi));
    expect(satir?.ozet).not.toBe(eskiOzet);
    expect(await girisYap(a, "yonetici", { eposta, sifre }, sure)).not.toBeNull();
  });

  it("veritabanı hatası şifre özetini ve anahtar özetini günlüğe taşımaz", async () => {
    const eposta = yeniEposta();
    const { hesapKimligi } = await hesapAc(a, "yonetici", { eposta, sifre });
    const [satir] = await a
      .select({ ozet: yoneticiler.sifre_ozeti })
      .from(yoneticiler)
      .where(eq(yoneticiler.kimlik, hesapKimligi));
    const ozet = satir?.ozet as string;
    // Aynı e-posta kısmi indeksi çiğner: gerçek sorgu hatası, değerleriyle birlikte.
    const hata = await a
      .insert(yoneticiler)
      .values({ eposta, sifre_ozeti: ozet })
      .catch((yakalanan: unknown) => yakalanan);
    expect(String((hata as Error).message)).toContain(ozet);
    const dokum = JSON.stringify(maskele(hata));
    expect(dokum).not.toContain(ozet);
    expect(dokum).not.toContain(eposta);
  });

  it("veritabanında düz şifre ve düz anahtar durmaz", async () => {
    const ozelSifre = `duz-metin-sifre-${ek}`;
    const eposta = yeniEposta();
    await hesapAc(a, "yonetici", { eposta, sifre: ozelSifre });
    const giris = await girisYap(a, "yonetici", { eposta, sifre: ozelSifre }, sure);
    const anahtarlar = giris?.anahtarlar;
    if (anahtarlar === undefined) throw new Error("Giriş yapılamadı.");
    const yenilenen = await oturumuYenile(a, "yonetici", anahtarlar.yenilemeAnahtari, sure);
    if (yenilenen.durum !== "yenilendi") throw new Error("Yenilenmedi.");

    const dokum = JSON.stringify([
      await a.select().from(yoneticiler),
      await a.select().from(yoneticiOturumlari),
    ]);
    expect(dokum).toContain(eposta);
    for (const gizli of [
      ozelSifre,
      anahtarlar.kisaAnahtar,
      anahtarlar.yenilemeAnahtari,
      yenilenen.anahtarlar.kisaAnahtar,
      yenilenen.anahtarlar.yenilemeAnahtari,
    ]) {
      expect(dokum).not.toContain(gizli);
    }
    expect(dokum).toContain(anahtarOzeti(yenilenen.anahtarlar.kisaAnahtar));
  });
});

describe("çerezler ve istekten oturum", () => {
  const tur = "yonetici";
  const adlar = oturumCerezAdlari[tur];
  const istek = (cerezler: Record<string, string>) =>
    new Request("http://yerel/kapi/yonetici/deneme", {
      headers: {
        cookie: Object.entries(cerezler)
          .map(([ad, deger]) => `${ad}=${deger}`)
          .join("; "),
      },
    });

  it("çerezler güvenli bayraklarla ve adrese bağlı yazılır, alan adı taşımaz", () => {
    const cerezler = oturumCerezleri(tur, { kisaAnahtar: "k", yenilemeAnahtari: "y" }, sure);
    expect(cerezler).toEqual([
      `${adlar.kisa}=k; Path=/; Max-Age=900; HttpOnly; Secure; SameSite=Lax`,
      `${adlar.yenileme}=y; Path=/; Max-Age=${sure}; HttpOnly; Secure; SameSite=Lax`,
    ]);
    expect(adlar.kisa.startsWith("__Host-")).toBe(true);
    expect(cerezler.join()).not.toContain("Domain");
    for (const silen of oturumCerezleriniSil(tur)) {
      expect(silen).toMatch(/Max-Age=0; HttpOnly; Secure; SameSite=Lax$/);
    }
  });

  it("süreler site ayarından gelir: yönetici 24 saat, müşteri 30 gün", () => {
    const ayarlar = ayarSemasi.parse({ paraBirimi: "XTS" }) as SiteAyarlari;
    expect(oturumSuresiSaniye("yonetici", ayarlar)).toBe(24 * 60 * 60);
    expect(oturumSuresiSaniye("musteri", ayarlar)).toBe(30 * 24 * 60 * 60);
    const degisik = { ...ayarlar, yoneticiOturumuSaat: 2, musteriOturumuGun: 3 };
    expect(oturumSuresiSaniye("yonetici", degisik)).toBe(2 * 60 * 60);
    expect(oturumSuresiSaniye("musteri", degisik)).toBe(3 * 24 * 60 * 60);
  });

  it("geçerli kısa anahtarla çerez yazmadan oturumu verir", async () => {
    const { anahtarlar, hesapKimligi } = await girisliHesap(a, tur);
    expect(
      await istektenOturumAl(a, tur, istek({ [adlar.kisa]: anahtarlar.kisaAnahtar }), sure),
    ).toEqual({ hesapKimligi, cerezler: [] });
  });

  it("kısa anahtar yoksa yeniler ve yeni çerezleri verir, yeni çerezler geçer", async () => {
    const { anahtarlar, hesapKimligi } = await girisliHesap(a, tur);
    const sonuc = await istektenOturumAl(
      a,
      tur,
      istek({ [adlar.yenileme]: anahtarlar.yenilemeAnahtari }),
      sure,
    );
    expect(sonuc.hesapKimligi).toBe(hesapKimligi);
    expect(sonuc.cerezler).toHaveLength(2);
    const yeniKisa = sonuc.cerezler[0]?.split(";")[0]?.split("=")[1] as string;
    expect(await istektenOturumAl(a, tur, istek({ [adlar.kisa]: yeniKisa }), sure)).toEqual({
      hesapKimligi,
      cerezler: [],
    });
  });

  it("aynı anda giden istek eski anahtarla da geçer, çerezleri bozmaz", async () => {
    const { anahtarlar, hesapKimligi } = await girisliHesap(a, tur);
    const eski = istek({ [adlar.yenileme]: anahtarlar.yenilemeAnahtari });
    expect((await istektenOturumAl(a, tur, eski, sure)).cerezler).toHaveLength(2);
    expect(await istektenOturumAl(a, tur, eski, sure)).toEqual({ hesapKimligi, cerezler: [] });
  });

  it("aynı adlı çerezde ilki alınır, boşlukla kırpılır, başka karakterle kırpılmaz", () => {
    expect(cerezOku(istek({ a: "1", b: "2" }), "b")).toBe("2");
    const cift = new Request("http://yerel/", { headers: { cookie: "a=ilk;  a=ikinci" } });
    expect(cerezOku(cift, "a")).toBe("ilk");
    const sahte = new Request("http://yerel/", { headers: { cookie: "\u00a0a=kotu" } });
    expect(cerezOku(sahte, "a")).toBeUndefined();
  });

  it("çıkıştan sonra çerezler reddedilir ve silinir; çerezsiz istek yalnız oturumsuzdur", async () => {
    const { anahtarlar } = await girisliHesap(a, tur);
    await cikisYap(a, tur, anahtarlar);
    expect(
      await istektenOturumAl(
        a,
        tur,
        istek({
          [adlar.kisa]: anahtarlar.kisaAnahtar,
          [adlar.yenileme]: anahtarlar.yenilemeAnahtari,
        }),
        sure,
      ),
    ).toEqual({ hesapKimligi: null, cerezler: oturumCerezleriniSil(tur) });
    expect(await istektenOturumAl(a, tur, istek({}), sure)).toEqual({
      hesapKimligi: null,
      cerezler: [],
    });
  });

  it("müşterinin çerezi yönetici oturumu açmaz", async () => {
    const { anahtarlar } = await girisliHesap(a, "musteri");
    const musteriAdlari = oturumCerezAdlari.musteri;
    expect(
      await istektenOturumAl(
        a,
        tur,
        istek({
          [musteriAdlari.kisa]: anahtarlar.kisaAnahtar,
          [musteriAdlari.yenileme]: anahtarlar.yenilemeAnahtari,
        }),
        sure,
      ),
    ).toEqual({ hesapKimligi: null, cerezler: [] });
  });

  it("A sitesinin çerezi B sitesinde oturum açmaz", async () => {
    const { anahtarlar } = await girisliHesap(a, tur);
    const sonuc = await istektenOturumAl(
      b,
      tur,
      istek({
        [adlar.kisa]: anahtarlar.kisaAnahtar,
        [adlar.yenileme]: anahtarlar.yenilemeAnahtari,
      }),
      sure,
    );
    expect(sonuc.hesapKimligi).toBeNull();
  });
});
