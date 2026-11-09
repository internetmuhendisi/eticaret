// Kategoriler gerçek veritabanıyla (kart 0077, karar 0063): ekleme ve okuma, kardeş adı ve adres adı
// tekilliği, döngü kuran taşımanın servis ve veritabanında reddi (aynı anda iki taşıma dahil), silme
// kuralı (altlar bir üste çıkar, ürün bağlantıları kalkar), bir kategorinin ürünlerinin tek sorguyla
// gelmesi, ürünün birden çok kategoride olması, değişiklik kaydı ve iki sitenin ayrı kalması.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyaSil, gorselKaydet } from "../../dosya/servis.ts";
import type { UrunGirdisi } from "../../urun/semalar.ts";
import { urunServisi } from "../../urun/servis.ts";
import type { VitrinSecenekleri } from "../../urun/vitrin.ts";
import { kategoriler, urunKategorileri } from "../model.ts";
import {
  kategoriDegistir,
  kategoriEkle,
  kategorileriOku,
  kategorininUrunleri,
  kategoriSil,
  kategoriyiOku,
} from "../servis.ts";

// Stokla ilgisi olmayan vitrin testleri: tükenen ürün gösterilir (kart 0083).
const goster: VitrinSecenekleri = { tukenenUrun: "goster" };

const urunSrv = urunServisi(() => "Europe/Istanbul");
const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const silinecekler: (() => Promise<void>)[] = [];
const siteAc = async (): Promise<Veritabani> => {
  const site = await denemeSitesiAc("kategori");
  silinecekler.push(site.sil);
  return site.vt;
};
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

const hatasi = async (is: Promise<unknown>) => {
  const hata = await is.then(
    () => undefined,
    (yakalanan: unknown) => yakalanan,
  );
  if (!(hata instanceof BilinenHata)) throw new Error(`Bilinen hata beklenirdi: ${String(hata)}`);
  return { kod: hata.kod, ayrinti: hata.ayrinti };
};

const ekle = (vt: Veritabani, ad: string, ust: string | null = null) =>
  kategoriEkle(vt, yonetici(), { ad, ust });
const urunEkle = (vt: Veritabani, ek: Partial<UrunGirdisi> = {}) =>
  urunSrv.urunEkle(vt, yonetici(), { ad: "Deneme ürünü", vergiSinifi: null, ...ek });
const ustu = async (vt: Veritabani, kimlik: string) => (await kategoriyiOku(kimlik, vt))?.ust;

describe("ekleme ve okuma", () => {
  it("alanlar yazılır, adres adı addan üretilir, sıra kardeşlerin sonudur", async () => {
    const vt = await siteAc();
    const ev = await kategoriEkle(vt, yonetici(), { ad: "Ev ve Yaşam", aciklama: "Ev için" });
    const mum = await ekle(vt, "Mum", ev);
    const vazo = await ekle(vt, "Vazo", ev);
    expect(await kategoriyiOku(ev, vt)).toEqual({
      kimlik: ev,
      ad: "Ev ve Yaşam",
      adresAdi: "ev-ve-yasam",
      aciklama: "Ev için",
      ust: null,
      sira: 0,
      silindi: false,
    });
    expect(await kategoriyiOku(vazo, vt)).toMatchObject({ ust: ev, sira: 1, adresAdi: "vazo" });
    expect((await kategorileriOku(vt)).map((k) => k.kimlik)).toEqual([ev, mum, vazo]);
  });

  it("aynı üstün altında aynı ad reddedilir, farklı üstlerin altında serbesttir", async () => {
    const vt = await siteAc();
    const erkek = await ekle(vt, "Erkek");
    const kadin = await ekle(vt, "Kadın");
    await ekle(vt, "Tişört", erkek);
    const ikinci = await ekle(vt, "Tişört", kadin);
    // Adres adı sitede tekildir: ikinci sayı alır.
    expect((await kategoriyiOku(ikinci, vt))?.adresAdi).toBe("tisort-2");
    const beklenen = { kod: "cakisma", ayrinti: [{ alan: "ad", kod: "ad-tekrar" }] };
    expect(await hatasi(ekle(vt, "TİŞÖRT", erkek))).toEqual(beklenen);
    // Noktalı noktasız i ayrımı da yapılmaz (kart 0078, cekirdek/metinler/ad-anahtari.ts).
    await ekle(vt, "Deniz", erkek);
    expect(await hatasi(ekle(vt, "DENİZ", erkek))).toEqual(beklenen);
    await ekle(vt, "Şık", erkek);
    expect(await hatasi(ekle(vt, "ŞIK", erkek))).toEqual(beklenen);
    expect(await hatasi(ekle(vt, "erkek"))).toEqual(beklenen);
    // Taşınınca yeni kardeşlerle karşılaştırılır.
    expect(await hatasi(kategoriDegistir(vt, yonetici(), ikinci, { ust: erkek }))).toEqual(
      beklenen,
    );
  });

  it("aynı adres adı reddedilir, üst kategori var ve silinmemiş olmalı", async () => {
    const vt = await siteAc();
    await kategoriEkle(vt, yonetici(), { ad: "Bir", adresAdi: "ortak" });
    expect(await hatasi(kategoriEkle(vt, yonetici(), { ad: "İki", adresAdi: "ortak" }))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "adresAdi", kod: "adres-adi-tekrar" }],
    });
    const ust = await ekle(vt, "Üst");
    await kategoriSil(vt, yonetici(), ust);
    const beklenen = { kod: "dogrulama", ayrinti: [{ alan: "ust", kod: "ust-gecersiz" }] };
    expect(await hatasi(ekle(vt, "Alt", ust))).toEqual(beklenen);
    expect(await hatasi(ekle(vt, "Alt", randomUUID()))).toEqual(beklenen);
  });
});

describe("taşıma ve döngü", () => {
  it("kendi altına, çocuğunun ve torununun altına taşıma reddedilir; geçerli taşıma yapılır", async () => {
    const vt = await siteAc();
    const a = await ekle(vt, "A");
    const b = await ekle(vt, "B", a);
    const c = await ekle(vt, "C", b);
    const beklenen = { kod: "is-kurali", ayrinti: [{ alan: "ust", kod: "dongu" }] };
    for (const ust of [a, b, c]) {
      expect(await hatasi(kategoriDegistir(vt, yonetici(), a, { ust }))).toEqual(beklenen);
    }
    expect(await hatasi(kategoriDegistir(vt, yonetici(), b, { ust: c }))).toEqual(beklenen);
    expect(await ustu(vt, a)).toBeNull();
    // C en üste, sonra A, C'nin altına: geçerli.
    await kategoriDegistir(vt, yonetici(), c, { ust: null });
    await kategoriDegistir(vt, yonetici(), a, { ust: c });
    expect(await ustu(vt, a)).toBe(c);
    expect((await kategoriyiOku(a, vt))?.sira).toBe(0);
  });

  it("veritabanı da döngüyü reddeder: kendi üstü ve doğrudan yazılan döngü", async () => {
    const vt = await siteAc();
    const a = await ekle(vt, "A");
    const b = await ekle(vt, "B", a);
    await expect(
      vt.update(kategoriler).set({ ust_kimligi: a }).where(eq(kategoriler.kimlik, a)),
    ).rejects.toThrow();
    await expect(
      vt.update(kategoriler).set({ ust_kimligi: b }).where(eq(kategoriler.kimlik, a)),
    ).rejects.toThrow();
    expect(await ustu(vt, a)).toBeNull();
  });

  it("aynı anda iki ters taşıma döngü kuramaz: servisle de doğrudan yazıyla da biri geçer", async () => {
    const vt = await siteAc();
    for (let tur = 0; tur < 5; tur += 1) {
      const a = await ekle(vt, `A${tur}`);
      const b = await ekle(vt, `B${tur}`);
      const sonuclar = await Promise.allSettled([
        kategoriDegistir(vt, yonetici(), a, { ust: b }),
        kategoriDegistir(vt, yonetici(), b, { ust: a }),
      ]);
      expect(sonuclar.filter((s) => s.status === "fulfilled")).toHaveLength(1);
      const c = await ekle(vt, `C${tur}`);
      const d = await ekle(vt, `D${tur}`);
      const dogrudan = await Promise.allSettled([
        vt.transaction(async (islem) => {
          await islem.update(kategoriler).set({ ust_kimligi: d }).where(eq(kategoriler.kimlik, c));
          await islem.execute(sql`select pg_sleep(0.05)`);
        }),
        vt.transaction(async (islem) => {
          await islem.update(kategoriler).set({ ust_kimligi: c }).where(eq(kategoriler.kimlik, d));
          await islem.execute(sql`select pg_sleep(0.05)`);
        }),
      ]);
      expect(dogrudan.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    }
  });
});

describe("silme kuralı", () => {
  it("altlar silinenin üstüne çıkar, torunlar yerinde kalır, ürün bağlantıları kalkar", async () => {
    const vt = await siteAc();
    const giyim = await ekle(vt, "Giyim");
    const ust = await ekle(vt, "Üst giyim", giyim);
    const tisort = await ekle(vt, "Tişört", ust);
    const kazak = await ekle(vt, "Kazak", ust);
    const v = await ekle(vt, "V yaka", tisort);
    const indirim = await ekle(vt, "İndirim");
    const urun = await urunEkle(vt, { kategoriler: [ust, indirim] });
    await kategoriSil(vt, yonetici(), ust);
    expect(await ustu(vt, tisort)).toBe(giyim);
    expect(await ustu(vt, kazak)).toBe(giyim);
    expect(await ustu(vt, v)).toBe(tisort);
    expect((await kategoriyiOku(ust, vt))?.silindi).toBe(true);
    expect((await kategorileriOku(vt)).map((k) => k.kimlik)).not.toContain(ust);
    // Ürün öteki kategorisinde kalır.
    expect((await urunSrv.urunuOku(vt, urun))?.kategoriler).toEqual([indirim]);
    expect(await hatasi(kategoriDegistir(vt, yonetici(), ust, { ad: "x y" }))).toMatchObject({
      kod: "bulunamadi",
    });
    // En üstteki kategori silinince altı en üste çıkar.
    await kategoriSil(vt, yonetici(), giyim);
    expect(await ustu(vt, tisort)).toBeNull();
  });

  it("üste çıkan alt kategori orada aynı adla karşılaşırsa hiçbir şey değişmez", async () => {
    const vt = await siteAc();
    const giyim = await ekle(vt, "Giyim");
    await ekle(vt, "Tişört");
    const alt = await ekle(vt, "tişört", giyim);
    const urun = await urunEkle(vt, { kategoriler: [giyim] });
    expect(await hatasi(kategoriSil(vt, yonetici(), giyim))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "ad", kod: "silmede-ad-tekrar", kimlik: alt }],
    });
    expect((await kategoriyiOku(giyim, vt))?.silindi).toBe(false);
    expect(await ustu(vt, alt)).toBe(giyim);
    expect((await urunSrv.urunuOku(vt, urun))?.kategoriler).toEqual([giyim]);
  });

  it("silinen kategorinin adres adı ve adı yeniden kullanılabilir", async () => {
    const vt = await siteAc();
    const eski = await ekle(vt, "Mum");
    await kategoriSil(vt, yonetici(), eski);
    const yeni = await ekle(vt, "Mum");
    expect((await kategoriyiOku(yeni, vt))?.adresAdi).toBe("mum");
  });

  // Sıra bilerek kurulur: silme işlemi kategoriyi işaretleyip bağlantılarını kaldırır ve açık bekler,
  // ürün değişikliği tam o sırada gelir. Paylaşımlı kilit olmasa ürün eski görüntüyü okur: ya silinmiş
  // kategoriye bağlanır ya da kayda kalkmış bağlantıyı yazar (kart 0077 kontrolü). İki durum ayrı
  // denenir: ürün kilidi aynı anda iki ürün değişikliğini sıraya koyar.
  const acikSilme = async (vt: Veritabani, kategori: string) => {
    let hazir: () => void = () => undefined;
    const isaretlendi = new Promise<void>((coz) => {
      hazir = coz;
    });
    const bitti = vt.transaction(async (islem) => {
      await islem
        .update(kategoriler)
        .set({ silinme_zamani: sql`now()` })
        .where(eq(kategoriler.kimlik, kategori));
      await islem.delete(urunKategorileri).where(eq(urunKategorileri.kategori_kimligi, kategori));
      hazir();
      await islem.execute(sql`select pg_sleep(0.3)`);
    });
    await isaretlendi;
    // Söz nesne içinde döner: async işlevden doğrudan dönen söz beklenirdi, yarış kurulmazdı.
    return { bitti };
  };
  const gecersizKategori = {
    kod: "dogrulama",
    ayrinti: [{ alan: "kategoriler", kod: "kategori-gecersiz" }],
  };
  const urunDegisiklikleri = (vt: Veritabani) =>
    vt.select().from(degisiklikKayitlari).where(eq(degisiklikKayitlari.islem, "urun.degisti"));

  it("açık duran silmenin kategorisine ürün bağlanamaz", async () => {
    const vt = await siteAc();
    const silinecek = await ekle(vt, "Silinecek");
    const urun = await urunEkle(vt);
    const silme = await acikSilme(vt, silinecek);
    const sonuc = await hatasi(
      urunSrv.urunDegistir(vt, yonetici(), urun, { kategoriler: [silinecek] }),
    );
    await silme.bitti;
    expect(sonuc).toEqual(gecersizKategori);
    expect(await vt.select().from(urunKategorileri)).toEqual([]);
    expect(await urunDegisiklikleri(vt)).toEqual([]);
  });

  it("açık duran silmenin kaldırdığı bağlantı ürünün kaydına bağlıymış gibi girmez", async () => {
    const vt = await siteAc();
    const silinecek = await ekle(vt, "Silinecek");
    const kalan = await ekle(vt, "Kalan");
    const urun = await urunEkle(vt, { kategoriler: [silinecek] });
    const silme = await acikSilme(vt, silinecek);
    const sonuc = await hatasi(
      urunSrv.urunDegistir(vt, yonetici(), urun, { kategoriler: [silinecek, kalan] }),
    );
    await silme.bitti;
    expect(sonuc).toEqual(gecersizKategori);
    expect(await vt.select().from(urunKategorileri)).toEqual([]);
    expect(await urunDegisiklikleri(vt)).toEqual([]);
  });

  it("veritabanı READ COMMITTED dışındaki işlemde taşımayı reddeder", async () => {
    const vt = await siteAc();
    const a = await ekle(vt, "A");
    const b = await ekle(vt, "B");
    await expect(
      vt.transaction(
        (islem) =>
          islem.update(kategoriler).set({ ust_kimligi: b }).where(eq(kategoriler.kimlik, a)),
        { isolationLevel: "repeatable read" },
      ),
    ).rejects.toThrow();
    expect(await ustu(vt, a)).toBeNull();
  });

  it("kimlik biçiminde olmayan metin bulunamadı sayılır, beklenmeyen hata vermez", async () => {
    const vt = await siteAc();
    for (const bozuk of ["abc", "1; select 1", ""]) {
      expect(await kategoriyiOku(bozuk, vt)).toBeUndefined();
      expect(await kategorininUrunleri(vt, bozuk)).toEqual({ urunler: [], toplam: 0 });
      expect(await hatasi(kategoriDegistir(vt, yonetici(), bozuk, { ad: "x y" }))).toMatchObject({
        kod: "bulunamadi",
      });
      expect(await hatasi(kategoriSil(vt, yonetici(), bozuk))).toMatchObject({ kod: "bulunamadi" });
      expect(await urunSrv.urunuOku(vt, bozuk)).toBeUndefined();
      expect(await urunSrv.vitrindeGorunurMu(vt, bozuk, "sayfa", goster)).toBe(false);
      expect(
        await hatasi(urunSrv.urunDegistir(vt, yonetici(), bozuk, { ad: "x y" })),
      ).toMatchObject({ kod: "bulunamadi" });
      expect(await hatasi(urunSrv.urunSil(vt, yonetici(), bozuk))).toMatchObject({
        kod: "bulunamadi",
      });
    }
  });
});

// Kart 0078 kontrolü: kategori silme birden çok kategori satırını günceller, ürün değişikliği aynı
// satırları başka sırayla paylaşımlı kilitleyebilir. Silme önce ürün kilidini alır (urun/kilit.ts).
describe("kategori silme ile ürün değişikliği", () => {
  it("silme, açık duran ürün yazmasının kilidini bekler", async () => {
    const vt = await siteAc();
    const kategori = await ekle(vt, "Bekleyen");
    let hazir: () => void = () => undefined;
    const alindi = new Promise<void>((coz) => {
      hazir = coz;
    });
    const urunYazmasi = vt.transaction(async (islem) => {
      await islem.execute(sql`select pg_advisory_xact_lock(hashtext('urun'))`);
      hazir();
      await islem.execute(sql`select pg_sleep(0.4)`);
    });
    await alindi;
    const bas = Date.now();
    await kategoriSil(vt, yonetici(), kategori);
    const sure = Date.now() - bas;
    await urunYazmasi;
    expect(sure).toBeGreaterThanOrEqual(300);
  });

  it("alt kategorisiyle birlikte bağlı ürün değişirken silme kilitlenmez", async () => {
    const vt = await siteAc();
    for (let tur = 0; tur < 10; tur += 1) {
      const ust = await ekle(vt, `Üst ${tur}`);
      const altlar = await Promise.all(
        Array.from({ length: 4 }, (_, sira) => ekle(vt, `Alt ${tur}-${sira}`, ust)),
      );
      const urun = await urunEkle(vt, { ad: `Ürün ${tur}`, kategoriler: altlar });
      const sonuclar = await Promise.allSettled([
        urunSrv.urunDegistir(vt, yonetici(), urun, { kategoriler: [...altlar, ust] }),
        kategoriSil(vt, yonetici(), ust),
      ]);
      for (const sonuc of sonuclar) {
        if (sonuc.status === "rejected") expect(sonuc.reason).toBeInstanceOf(BilinenHata);
      }
    }
  });
});

describe("kategorinin ürünleri", () => {
  it("bir ürün iki kategoride listelenir; ürünler tek sorguyla, sayfa sayfa ve toplamla gelir", async () => {
    const vt = await siteAc();
    const mum = await ekle(vt, "Mum");
    const indirim = await ekle(vt, "İndirim");
    const ikisinde = await urunEkle(vt, { ad: "İkisinde", kategoriler: [mum, indirim] });
    const yalnizMum = await urunEkle(vt, { ad: "Yalnız mum", kategoriler: [mum] });
    const ucuncu = await urunEkle(vt, { ad: "Üçüncü", kategoriler: [mum] });
    const sorgu = vi.spyOn(vt.$client, "query");
    const sayfa = await kategorininUrunleri(vt, mum);
    expect(sorgu).toHaveBeenCalledTimes(1);
    // En yeni önce.
    expect(sayfa).toEqual({ urunler: [ucuncu, yalnizMum, ikisinde], toplam: 3 });
    expect(await kategorininUrunleri(vt, indirim)).toEqual({ urunler: [ikisinde], toplam: 1 });
    expect(await kategorininUrunleri(vt, mum, { boyut: 2, sayfa: 2 })).toEqual({
      urunler: [ikisinde],
      toplam: 3,
    });
    expect(await kategorininUrunleri(vt, mum, { boyut: 2, sayfa: 3 })).toEqual({
      urunler: [],
      toplam: 0,
    });
  });

  it("alt kategoriler istenirse bütün alt ağaç gelir, iki kez eşleşen ürün bir kez", async () => {
    const vt = await siteAc();
    const giyim = await ekle(vt, "Giyim");
    const tisort = await ekle(vt, "Tişört", giyim);
    const vyaka = await ekle(vt, "V yaka", tisort);
    const ust = await urunEkle(vt, { ad: "Giyimde", kategoriler: [giyim] });
    const ikisi = await urunEkle(vt, { ad: "Giyim ve tişört", kategoriler: [giyim, tisort] });
    const torun = await urunEkle(vt, { ad: "V yaka", kategoriler: [vyaka] });
    expect((await kategorininUrunleri(vt, giyim)).urunler.toSorted()).toEqual(
      [ust, ikisi].toSorted(),
    );
    const sorgu = vi.spyOn(vt.$client, "query");
    const agac = await kategorininUrunleri(vt, giyim, { altKategoriler: true });
    expect(sorgu).toHaveBeenCalledTimes(1);
    expect(agac.urunler.toSorted()).toEqual([ust, ikisi, torun].toSorted());
    expect(agac.toplam).toBe(3);
  });

  it("vitrin istenirse yalnız görünen ürünler gelir; silinmiş ürün ve kategori hiç gelmez", async () => {
    const vt = await siteAc();
    const mum = await ekle(vt, "Mum");
    const yayinda = await urunEkle(vt, { ad: "Yayında", durum: "yayinda", kategoriler: [mum] });
    const gizli = await urunEkle(vt, { ad: "Gizli", durum: "gizli", kategoriler: [mum] });
    const taslak = await urunEkle(vt, { ad: "Taslak", kategoriler: [mum] });
    const silinen = await urunEkle(vt, { ad: "Silinen", durum: "yayinda", kategoriler: [mum] });
    await urunSrv.urunSil(vt, yonetici(), silinen);
    expect((await kategorininUrunleri(vt, mum)).urunler.toSorted()).toEqual(
      [yayinda, gizli, taslak].toSorted(),
    );
    expect(await kategorininUrunleri(vt, mum, { vitrin: { yer: "liste", ...goster } })).toEqual({
      urunler: [yayinda],
      toplam: 1,
    });
    expect(
      (
        await kategorininUrunleri(vt, mum, { vitrin: { yer: "sayfa", ...goster } })
      ).urunler.toSorted(),
    ).toEqual([yayinda, gizli].toSorted());
    await kategoriSil(vt, yonetici(), mum);
    expect(await kategorininUrunleri(vt, mum)).toEqual({ urunler: [], toplam: 0 });
  });
});

describe("ürünün kategorileri", () => {
  it("olmayan, silinmiş ve iki kez verilen kategori reddedilir; değişiklik listeyi değiştirir", async () => {
    const vt = await siteAc();
    const a = await ekle(vt, "A");
    const b = await ekle(vt, "B");
    const silinen = await ekle(vt, "Silinen");
    await kategoriSil(vt, yonetici(), silinen);
    const gecersiz = {
      kod: "dogrulama",
      ayrinti: [{ alan: "kategoriler", kod: "kategori-gecersiz" }],
    };
    expect(await hatasi(urunEkle(vt, { kategoriler: [a, silinen] }))).toEqual(gecersiz);
    expect(await hatasi(urunEkle(vt, { kategoriler: [randomUUID()] }))).toEqual(gecersiz);
    expect(await hatasi(urunEkle(vt, { kategoriler: [a, a] }))).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "kategoriler", kod: "kategori-tekrar" }],
    });
    const urun = await urunEkle(vt, { kategoriler: [a] });
    await urunSrv.urunDegistir(vt, yonetici(), urun, { kategoriler: [b, a] });
    expect((await urunSrv.urunuOku(vt, urun))?.kategoriler).toEqual([a, b].toSorted());
    await urunSrv.urunDegistir(vt, yonetici(), urun, { kategoriler: [b] });
    expect((await urunSrv.urunuOku(vt, urun))?.kategoriler).toEqual([b]);
    // Kategori listesi verilmeyen değişiklik bağlantılara dokunmaz.
    await urunSrv.urunDegistir(vt, yonetici(), urun, { ad: "Yeni ad" });
    expect((await urunSrv.urunuOku(vt, urun))?.kategoriler).toEqual([b]);
    await urunSrv.urunDegistir(vt, yonetici(), urun, { kategoriler: [] });
    expect(await vt.select().from(urunKategorileri)).toEqual([]);
  });
});

describe("değişiklik kaydı", () => {
  it("ekleme, taşıma, silme ve silmenin taşıdığı alt kategoriler kayda girer", async () => {
    const vt = await siteAc();
    const kim = yonetici();
    const kimKimligi = kim.tur === "yonetici" ? kim.kimlik : "";
    const ust = await kategoriEkle(vt, kim, { ad: "Üst" });
    const orta = await kategoriEkle(vt, kim, { ad: "Orta" });
    const alt = await kategoriEkle(vt, kim, { ad: "Alt", ust: orta });
    await kategoriDegistir(vt, kim, orta, { ust, ad: "Orta" });
    const urun = await urunEkle(vt, { kategoriler: [orta] });
    await kategoriSil(vt, kim, orta);
    const satirlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_turu, "kategori"))
      // Aynı işlemdeki kayıtlar aynı zamanı taşır: işlem adı sırayı belirler (degisti, silindi).
      .orderBy(degisiklikKayitlari.zaman, degisiklikKayitlari.islem);
    expect(
      satirlar
        .filter((s) => s.kayit_kimligi !== ust)
        .map((s) => [s.islem, s.kayit_kimligi, s.kim_kimligi, s.eski_deger, s.yeni_deger]),
    ).toEqual([
      ["kategori.eklendi", orta, kimKimligi, null, { ad: "Orta", adresAdi: "orta", sira: 1 }],
      [
        "kategori.eklendi",
        alt,
        kimKimligi,
        null,
        { ad: "Alt", adresAdi: "alt", ust: orta, sira: 0 },
      ],
      ["kategori.degisti", orta, kimKimligi, { ust: null, sira: 1 }, { ust, sira: 0 }],
      ["kategori.degisti", alt, kimKimligi, { ust: orta }, { ust }],
      [
        "kategori.silindi",
        orta,
        kimKimligi,
        { ad: "Orta", adresAdi: "orta", ust, sira: 0, urunler: [urun] },
        null,
      ],
    ]);
  });

  it("ürünün kategori değişikliği ürünün kaydına girer", async () => {
    const vt = await siteAc();
    const a = await ekle(vt, "A");
    const urun = await urunEkle(vt, { kategoriler: [a] });
    await urunSrv.urunDegistir(vt, yonetici(), urun, { kategoriler: [] });
    const satirlar = await vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, urun))
      .orderBy(degisiklikKayitlari.zaman);
    expect(satirlar.map((s) => [s.islem, s.eski_deger, s.yeni_deger])).toEqual([
      ["urun.eklendi", null, expect.objectContaining({ kategoriler: [a] })],
      ["urun.degisti", { kategoriler: [a] }, { kategoriler: [] }],
    ]);
  });
});

describe("iki site", () => {
  it("bir sitenin kategorisi ve bağlantısı ötekinde görünmez", async () => {
    const [a, b] = await Promise.all([siteAc(), siteAc()]);
    const kategori = await ekle(a, "Mum");
    await urunEkle(a, { kategoriler: [kategori] });
    expect(await kategoriyiOku(kategori, b)).toBeUndefined();
    expect(await kategorileriOku(b)).toEqual([]);
    expect(await kategorininUrunleri(b, kategori)).toEqual({ urunler: [], toplam: 0 });
    expect(await hatasi(urunEkle(b, { kategoriler: [kategori] }))).toMatchObject({
      kod: "dogrulama",
    });
    // Aynı ad ve adres adı öteki sitede serbesttir.
    expect((await kategoriyiOku(await ekle(b, "Mum"), b))?.adresAdi).toBe("mum");
  });
});

// Kart 0110: kategorinin görseli. Görsel hazır olmalı (var, silinmemiş, kendisi bir boyut değil, boyutları
// tam); değişiklik kaydına girer; null görseli kaldırır.
describe("kategori görseli", () => {
  const gorselKaydi = async (vt: Veritabani) => {
    const klasor = mkdtempSync(join(tmpdir(), "kategori-gorseli-"));
    silinecekler.push(async () => rmSync(klasor, { recursive: true, force: true }));
    const icerik = await sharp({
      create: { width: 300, height: 300, channels: 3, background: { r: 10, g: 120, b: 60 } },
    })
      .png()
      .toBuffer();
    const sonuc = await gorselKaydet(vt, icerik, klasor);
    if (!sonuc.tamam) throw new Error(sonuc.hata);
    return sonuc;
  };

  it("hazır görsel eklenir, değişir ve kaldırılır; her değişiklik kayda girer", async () => {
    const vt = await siteAc();
    const ilk = await gorselKaydi(vt);
    const kategori = await kategoriEkle(vt, yonetici(), { ad: "Giyim", gorsel: ilk.dosya.kimlik });
    expect((await kategoriyiOku(kategori, vt))?.gorsel).toBe(ilk.dosya.kimlik);
    const ikinci = await gorselKaydi(vt);
    await kategoriDegistir(vt, yonetici(), kategori, { gorsel: ikinci.dosya.kimlik });
    expect((await kategoriyiOku(kategori, vt))?.gorsel).toBe(ikinci.dosya.kimlik);
    await kategoriDegistir(vt, yonetici(), kategori, { gorsel: null });
    expect((await kategoriyiOku(kategori, vt))?.gorsel).toBeUndefined();
    const kayitlar = await vt
      .select({ eski: degisiklikKayitlari.eski_deger, yeni: degisiklikKayitlari.yeni_deger })
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kategori))
      .orderBy(degisiklikKayitlari.zaman);
    expect(kayitlar.map((k) => [k.eski, k.yeni])).toEqual([
      [null, expect.objectContaining({ gorsel: ilk.dosya.kimlik })],
      [{ gorsel: ilk.dosya.kimlik }, { gorsel: ikinci.dosya.kimlik }],
      [{ gorsel: ikinci.dosya.kimlik }, { gorsel: null }],
    ]);
  });

  it("olmayan, silinmiş, kendisi boyut olan ve boyutu silinmiş görsel bağlanmaz", async () => {
    const vt = await siteAc();
    const kategori = await ekle(vt, "Ev");
    const silinen = await gorselKaydi(vt);
    await dosyaSil(vt, silinen.dosya.kimlik);
    const boyutuEksik = await gorselKaydi(vt);
    await dosyaSil(vt, boyutuEksik.boyutlar.orta.kimlik);
    const bir = await gorselKaydi(vt);
    for (const gorsel of [
      randomUUID(),
      silinen.dosya.kimlik,
      bir.boyutlar.kucuk.kimlik,
      boyutuEksik.dosya.kimlik,
    ]) {
      expect(await hatasi(kategoriDegistir(vt, yonetici(), kategori, { gorsel }))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "gorsel", kod: "gorsel-gecersiz" }],
      });
      expect(await hatasi(kategoriEkle(vt, yonetici(), { ad: `Yeni ${gorsel}`, gorsel }))).toEqual({
        kod: "dogrulama",
        ayrinti: [{ alan: "gorsel", kod: "gorsel-gecersiz" }],
      });
    }
    expect((await kategoriyiOku(kategori, vt))?.gorsel).toBeUndefined();
  });

  it("aynı görsel yeniden verilince değişiklik yazılmaz; görseli sonradan silinen kategori değişebilir", async () => {
    const vt = await siteAc();
    const gorsel = await gorselKaydi(vt);
    const kategori = await kategoriEkle(vt, yonetici(), {
      ad: "Mutfak",
      gorsel: gorsel.dosya.kimlik,
    });
    await dosyaSil(vt, gorsel.dosya.kimlik);
    // Görsel değişmiyorsa yeniden denetlenmez: kategorinin adı değişebilir.
    await kategoriDegistir(vt, yonetici(), kategori, {
      ad: "Mutfak Gereçleri",
      gorsel: gorsel.dosya.kimlik,
    });
    expect((await kategoriyiOku(kategori, vt))?.ad).toBe("Mutfak Gereçleri");
  });
});
