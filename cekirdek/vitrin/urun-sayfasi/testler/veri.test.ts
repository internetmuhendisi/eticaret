// Ürün sayfasının verisi gerçek veritabanı ve klasörle (kart 0138, karar 0108):
// - Her birleşimin fiyatı, stok yazısı, stok kodu ve görseli çekirdeğin tek işlevleriyle birebir aynıdır
//   (gosterilecekFiyatlar ve araliginiKur, stokDurumlari, birimGorseli); tükenmiş, fiyatsız ve silinmiş birleşim
//   satılabilir görünmez; seçimsiz ürünün fiyatı fiyatAraliklari'ndandır.
// - Seçenekler ürünün sırasıyla, yalnız canlı birleşimde geçen değerlerle; galeri sırasıyla, görsel boyutları
//   ürün görseli ucundan, video çerezsiz oynatıcıyla.
// - Özellik tablosu dört türde özelliklerin sırasıyla ve sitenin biçimiyle; uzun açıklama temizlenmiş.
// - Sayfa yolunun kategorisi silinmemiş ilk kategori; silinmiş marka görünmez; ilgili ürünler kartlarıyla.
// - Görünmeyen ürün: taslak, arşiv, silinmiş ve zamanı gelmemiş ürünün adresi bulunamaz, gizli ürününki açılır.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { gorselBoyutAdlari } from "../../../kayitlar/gorsel.ts";
import { gorselKaydet } from "../../../moduller/dosya/servis.ts";
import { fiyatGosterimServisi } from "../../../moduller/fiyat/gosterim.ts";
import { siteninFiyatServisi } from "../../../moduller/fiyat/servis.ts";
import { kayitAdresiniCoz } from "../../../moduller/gorunurluk/adres.ts";
import { kategoriler } from "../../../moduller/kategori/model.ts";
import { kategoriEkle, kategoriSil } from "../../../moduller/kategori/servis.ts";
import { siteninServisi } from "../../../moduller/magaza-ayarlari/servis.ts";
import { markalar } from "../../../moduller/marka/model.ts";
import { markaServisi } from "../../../moduller/marka/servis.ts";
import { ozellikServisi } from "../../../moduller/ozellik/servis.ts";
import { siteninStokAyarlari, stokDurumlari } from "../../../moduller/stok/durum.ts";
import { stokServisi } from "../../../moduller/stok/servis.ts";
import { urunServisi } from "../../../moduller/urun/servis.ts";
import { donusenBirimiSil } from "../../../moduller/urun/testler/donusen-birim.ts";
import { urunGorseliAdresi } from "../../../moduller/urun/urun-gorseli.ts";
import { baglantiyiKapat } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kayitAdresleri } from "../../adresler.ts";
import { urunKartlari } from "../../urun-karti/veri.ts";
import { urunSayfasiVerisi } from "../veri.ts";

// Görseller gerçekten yeniden kodlanır.
vi.setConfig({ testTimeout: 60_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

// Vergi tablosu dolu deneme sitesi, mağaza Ankara'da: fiyat vergi metniyle gelir.
const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak No: 1",
      postaKodu: "06000",
    },
  },
};

const temizlenecekler: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const hazirla = async () => {
  const deneme = await denemeSitesiAc("urun-sayfasi");
  const dosyaKlasoru = mkdtempSync(join(tmpdir(), "urun-sayfasi-"));
  temizlenecekler.push(deneme.sil, () => rmSync(dosyaKlasoru, { recursive: true, force: true }));
  const vt = deneme.vt;
  const gorselEkle = async (urun: string, metin: string, mavi: number) => {
    const icerik = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: { r: 40, g: 90, b: mavi } },
    })
      .png()
      .toBuffer();
    const kayit = await gorselKaydet(vt, icerik, dosyaKlasoru);
    if (!kayit.tamam) throw new Error(kayit.hata);
    return urunler.galeriyeGorselEkle(vt, yonetici(), urun, {
      dosya: kayit.dosya.kimlik,
      alternatifMetin: metin,
    });
  };
  const stokYaz = (birim: string, yeniMiktar: number) =>
    stok.stokDuzelt(vt, yonetici(), birim, { yeniMiktar, gorulenMiktar: 0, sebep: "sayim" });
  const basitUrun = async (ek: Parameters<typeof urunler.urunEkle>[2] | object = {}) => {
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: null,
      durum: "yayinda",
      ...ek,
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    await stokYaz(birim, 3);
    return urun;
  };
  return { vt, gorselEkle, stokYaz, basitUrun };
};

// Renk (Beyaz, Siyah) ve Beden (S, M, L) seçenekli ürün; birleşimler:
// Beyaz-S indirimli ve bol stoklu, Beyaz-M son adet, Beyaz-L tükenmiş, Siyah-S kendi görselli, Siyah-M fiyatsız,
// Siyah-L silinmiş.
const varyantliUrun = async (h: Awaited<ReturnType<typeof hazirla>>) => {
  const urun = await urunler.urunEkle(h.vt, yonetici(), {
    ad: "Deneme Tişört",
    vergiSinifi: null,
    durum: "yayinda",
  });
  const beyazGorsel = await h.gorselEkle(urun, "Beyaz tişört", 200);
  const video = await urunler.galeriyeVideoEkle(h.vt, yonetici(), urun, {
    adres: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    alternatifMetin: "Tanıtım videosu",
  });
  const siyahGorsel = await h.gorselEkle(urun, "Siyah tişört", 20);
  await urunler.secenekEkle(h.vt, yonetici(), urun, { ad: "Renk", degerler: ["Beyaz", "Siyah"] });
  await urunler.secenekEkle(h.vt, yonetici(), urun, { ad: "Beden", degerler: ["S", "M", "L"] });
  await donusenBirimiSil(urunler, h.vt, urun);
  const okunan = await urunler.urunuOku(h.vt, urun);
  const d = Object.fromEntries(
    (okunan?.secenekler ?? []).flatMap((s) => s.degerler.map((x) => [x.ad, x.kimlik] as const)),
  ) as Record<"Beyaz" | "Siyah" | "S" | "M" | "L", string>;
  const ekle = (degerler: string[], stokKodu: string, gorsel?: string) =>
    urunler.birlesimEkle(h.vt, yonetici(), urun, {
      degerler,
      stokKodu,
      ...(gorsel === undefined ? {} : { gorsel }),
    });
  const b = {
    beyazS: await ekle([d.Beyaz, d.S], "DT-BYZ-S"),
    beyazM: await ekle([d.Beyaz, d.M], "DT-BYZ-M"),
    beyazL: await ekle([d.Beyaz, d.L], "DT-BYZ-L"),
    siyahS: await ekle([d.Siyah, d.S], "DT-SYH-S", siyahGorsel),
    siyahM: await ekle([d.Siyah, d.M], "DT-SYH-M", siyahGorsel),
    siyahL: await ekle([d.Siyah, d.L], "DT-SYH-L", siyahGorsel),
  };
  await fiyat.fiyatYaz(h.vt, yonetici(), b.beyazS, {
    satisFiyati: 20_000,
    indirimliFiyat: 15_000,
    indirimBitisi: "2099-01-01T00:00",
  });
  for (const birim of [b.beyazM, b.beyazL]) {
    await fiyat.fiyatYaz(h.vt, yonetici(), birim, { satisFiyati: 22_000 });
  }
  for (const birim of [b.siyahS, b.siyahL]) {
    await fiyat.fiyatYaz(h.vt, yonetici(), birim, { satisFiyati: 21_000 });
  }
  await h.stokYaz(b.beyazS, 40);
  await h.stokYaz(b.beyazM, 2);
  await h.stokYaz(b.siyahS, 9);
  await h.stokYaz(b.siyahM, 9);
  await h.stokYaz(b.siyahL, 9);
  await urunler.birlesimSil(h.vt, yonetici(), b.siyahL);
  return { urun, d, b, beyazGorsel, video, siyahGorsel };
};

describe("birleşimler", () => {
  it("her birleşimin fiyatı, stoğu, stok kodu ve görseli çekirdeğin işlevleriyle aynı", async () => {
    const h = await hazirla();
    await siteninServisi(site).degistir(h.vt, yonetici(), { indirimdeEnDusukFiyat: false });
    const u = await varyantliUrun(h);
    const veri = await urunSayfasiVerisi(h.vt, site, u.urun);
    if (veri === undefined) throw new Error("Sayfa verisi yok.");

    const canli = [u.b.beyazS, u.b.beyazM, u.b.beyazL, u.b.siyahS, u.b.siyahM];
    expect(veri.birimler.map((b) => b.kimlik)).toEqual(canli);
    const gosterim = fiyatGosterimServisi(site);
    const fiyatlar = await gosterim.gosterilecekFiyatlar(h.vt, canli);
    const stoklar = await stokDurumlari(h.vt, canli, await siteninStokAyarlari(h.vt, site));
    for (const birim of veri.birimler) {
      const beklenen = fiyatlar.get(birim.kimlik);
      expect(birim.fiyat).toEqual(
        beklenen === undefined ? undefined : gosterim.araliginiKur([beklenen]),
      );
      // Fiyatsız birleşim de dahil: sayfa stok yazısını yalnız stokDurumu'ndan alır (kart 0155).
      expect(birim.stok).toEqual(stoklar.get(birim.kimlik)?.gosterim);
      expect(birim.satilabilir).toBe(stoklar.get(birim.kimlik)?.satilabilir);
    }
    const birim = (kimlik: string) => veri.birimler.find((b) => b.kimlik === kimlik);
    expect(veri.birimler.map((b) => b.satilabilir)).toEqual([true, true, false, true, false]);
    // Elle yazılmış beklentiler: vergisiz ürün, tutarlar girildiği gibi.
    expect(birim(u.b.beyazS)?.fiyat?.enDusuk).toMatchObject({ tutar: 15_000, eskiTutar: 20_000 });
    expect(birim(u.b.beyazM)?.fiyat?.enDusuk.tutar).toBe(22_000);
    expect(birim(u.b.siyahS)?.fiyat?.enDusuk.tutar).toBe(21_000);
    expect(veri.genel.fiyat?.enDusuk.tutar).toBe(15_000);
    expect(veri.genel.fiyat?.enYuksek.tutar).toBe(22_000);
    expect(birim(u.b.beyazS)?.fiyat?.indirim).toEqual({ oran: 25, varan: false });
    expect(birim(u.b.beyazS)?.fiyat?.indirimBitisi).toBeInstanceOf(Date);
    expect(birim(u.b.beyazM)?.stok).toEqual({ tur: "son-adet", adet: 2 });
    expect(birim(u.b.beyazL)?.stok).toEqual({ tur: "tukendi" });
    expect(birim(u.b.siyahM)?.fiyat).toBeUndefined();
    // Fiyatsız birleşimin stoğu var ama satın alınamaz.
    expect(birim(u.b.siyahM)?.stok).toEqual({ tur: "tukendi" });
    expect(birim(u.b.siyahS)?.stokKodu).toBe("DT-SYH-S");

    // Galeri sırası: beyaz görsel, video, siyah görsel; seçmeyen birleşim ana görseli gösterir.
    expect(veri.galeri.map((oge) => oge.kimlik)).toEqual([u.beyazGorsel, u.video, u.siyahGorsel]);
    expect(veri.anaGorselSirasi).toBe(0);
    expect(birim(u.b.beyazS)?.gorselSirasi).toBe(0);
    expect(birim(u.b.siyahS)?.gorselSirasi).toBe(2);
    const [ilk, video] = veri.galeri;
    if (ilk?.tur !== "gorsel" || video?.tur !== "video") throw new Error("Galeri beklenen değil.");
    expect(ilk.kaynaklar.map((k) => k.adres)).toEqual(
      gorselBoyutAdlari.map((boyut) => urunGorseliAdresi(u.beyazGorsel, boyut)),
    );
    expect(ilk.alternatifMetin).toBe("Beyaz tişört");
    expect(video.oynatici).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);

    // Seçimsiz ürünün fiyatı ve durumu.
    const araliklar = await gosterim.fiyatAraliklari(h.vt, [u.urun]);
    expect(veri.genel.fiyat).toEqual(araliklar.get(u.urun));
    expect(veri.genel).toMatchObject({ stok: { tur: "stokta" }, satilabilir: true });
  });

  it("seçenekler ürünün sırasıyla; silinmiş birleşimin yalnız kendi değeri kalmaz", async () => {
    const h = await hazirla();
    const u = await varyantliUrun(h);
    // L yalnız Beyaz-L'de (tükenmiş) yaşar: değer kalır. Beyaz-L de silinince L kalkar.
    let veri = await urunSayfasiVerisi(h.vt, site, u.urun);
    expect(
      veri?.secenekler.map((s) => [s.ad, s.anahtar, s.degerler.map((x) => x.anahtar)]),
    ).toEqual([
      ["Renk", "renk", ["beyaz", "siyah"]],
      ["Beden", "beden", ["s", "m", "l"]],
    ]);
    await urunler.birlesimSil(h.vt, yonetici(), u.b.beyazL);
    veri = await urunSayfasiVerisi(h.vt, site, u.urun);
    expect(veri?.secenekler[1]?.degerler.map((x) => x.ad)).toEqual(["S", "M"]);
    expect(veri?.birimler.every((b) => b.degerler.length === 2)).toBe(true);
  });

  it("hiçbir birleşimi satılamayan ürün (fiyatsız birleşimin stoğu olsa da): genel durum tükendi", async () => {
    const h = await hazirla();
    const u = await varyantliUrun(h);
    for (const [birim, gorulenMiktar] of [
      [u.b.beyazS, 40],
      [u.b.beyazM, 2],
      [u.b.siyahS, 9],
    ] as const) {
      await stok.stokDuzelt(h.vt, yonetici(), birim, {
        yeniMiktar: 0,
        gorulenMiktar,
        sebep: "sayim",
      });
    }
    const veri = await urunSayfasiVerisi(h.vt, site, u.urun);
    expect(veri?.birimler.some((b) => b.satilabilir)).toBe(false);
    expect(veri?.genel).toMatchObject({ stok: { tur: "tukendi" }, satilabilir: false });
  });
});

describe("ürünün bilgileri", () => {
  it("özellik tablosu, temizlenmiş açıklama, marka, kategori, kargo ve ayarlar", async () => {
    const h = await hazirla();
    const o = {
      kumas: await ozellikServisi.ekle(h.vt, yonetici(), {
        ad: "Kumaş",
        tur: "liste",
        secenekler: ["Pamuk", "Keten"],
      }),
      gramaj: await ozellikServisi.ekle(h.vt, yonetici(), {
        ad: "Gramaj",
        tur: "sayi",
        birim: "g",
      }),
      yikanir: await ozellikServisi.ekle(h.vt, yonetici(), { ad: "Yıkanır", tur: "evet-hayir" }),
      not: await ozellikServisi.ekle(h.vt, yonetici(), { ad: "Bakım notu", tur: "metin" }),
      silinen: await ozellikServisi.ekle(h.vt, yonetici(), { ad: "Silinen", tur: "metin" }),
    };
    const kumas = await ozellikServisi.oku(o.kumas, h.vt);
    const pamuk = kumas?.secenekler.find((s) => s.ad === "Pamuk")?.kimlik ?? "";
    const silinenKategori = await kategoriEkle(h.vt, yonetici(), { ad: "Silinecek" });
    const kategori = await kategoriEkle(h.vt, yonetici(), { ad: "Giyim" });
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Deneme Markası" });
    const urun = await h.basitUrun({
      ad: "Bilgili",
      kisaAciklama: "  Kısa açıklama.  ",
      uzunAciklama: '<p>Güzel <script>alert(1)</script><a href="javascript:alert(1)">tıkla</a></p>',
      kategoriler: [silinenKategori, kategori],
      marka,
      ozellikler: [
        { ozellik: o.not, deger: "30 derecede yıkayın" },
        { ozellik: o.yikanir, deger: true },
        { ozellik: o.gramaj, deger: 180.5 },
        { ozellik: o.kumas, deger: pamuk },
        { ozellik: o.silinen, deger: "görünmez" },
      ],
    });
    await kategoriSil(h.vt, yonetici(), silinenKategori);
    // Bağlantısı kalmış ama silinmiş işaretli kategori (servis bağlantıyı kaldırır; süzgeç ikinci katmandır).
    const isaretliKategori = await kategoriEkle(h.vt, yonetici(), { ad: "İşaretli" });
    await urunler.urunDegistir(h.vt, yonetici(), urun, {
      kategoriler: [isaretliKategori, kategori],
    });
    await h.vt
      .update(kategoriler)
      .set({ silinme_zamani: new Date() })
      .where(eq(kategoriler.kimlik, isaretliKategori));
    await ozellikServisi.sil(h.vt, yonetici(), o.silinen);
    const veri = await urunSayfasiVerisi(h.vt, site, urun);
    expect(veri?.ozellikler).toEqual([
      { ad: "Kumaş", deger: "Pamuk" },
      { ad: "Gramaj", deger: "180,5 g" },
      { ad: "Yıkanır", deger: "Evet" },
      { ad: "Bakım notu", deger: "30 derecede yıkayın" },
    ]);
    expect(veri?.uzunAciklama).toBe('<p>Güzel <a rel="nofollow noopener noreferrer">tıkla</a></p>');
    expect(veri?.kisaAciklama).toBe("Kısa açıklama.");
    expect(veri?.kategori).toEqual({ ad: "Giyim", adres: kayitAdresleri.kategori("giyim") });
    expect(veri?.marka).toEqual({
      ad: "Deneme Markası",
      adres: kayitAdresleri.marka("deneme-markasi"),
    });
    expect(veri?.kargoyaVermeSuresi).toBe(1);
    expect(veri).toMatchObject({
      tukenmisSecenek: "ustu-cizili",
      secenekOnSecimi: "ilk-satilabilir",
    });

    // Bağlantısı kalmış ama silinmiş işaretli marka; sonra servisle silinen marka.
    await h.vt
      .update(markalar)
      .set({ silinme_zamani: new Date() })
      .where(eq(markalar.kimlik, marka));
    expect((await urunSayfasiVerisi(h.vt, site, urun))?.marka).toBeUndefined();
    await h.vt.update(markalar).set({ silinme_zamani: null }).where(eq(markalar.kimlik, marka));
    await markaServisi.sil(h.vt, yonetici(), marka);
    await urunler.urunDegistir(h.vt, yonetici(), urun, { kargoGerekmez: true });
    await siteninServisi(site).degistir(h.vt, yonetici(), {
      tukenmisSecenek: "gizle",
      secenekOnSecimi: "secimsiz",
      kargoyaVermeSuresi: 3,
    });
    const sonra = await urunSayfasiVerisi(h.vt, site, urun);
    expect(sonra?.marka).toBeUndefined();
    expect(sonra?.kargoyaVermeSuresi).toBeUndefined();
    expect(sonra).toMatchObject({ tukenmisSecenek: "gizle", secenekOnSecimi: "secimsiz" });
  });

  it("ilgili ürünler kartlarıyla, görünmeyen ilgili ürün yok", async () => {
    const h = await hazirla();
    const gorunen = await h.basitUrun();
    const taslak = await h.basitUrun({ durum: "taslak" });
    const urun = await h.basitUrun({ ilgiliUrunler: [taslak, gorunen] });
    const veri = await urunSayfasiVerisi(h.vt, site, urun);
    expect(veri?.ilgili).toEqual(await urunKartlari(h.vt, site, [gorunen], { yer: "liste" }));
  });
});

describe("görünmeyen ürün", () => {
  it("taslak, arşiv, zamanı gelmemiş ve silinmiş ürünün adresi bulunamaz; gizli ürünün sayfası açılır", async () => {
    const h = await hazirla();
    const durumlar = {
      taslak: await h.basitUrun({ durum: "taslak" }),
      arsiv: await h.basitUrun({ durum: "arsiv" }),
      zamanlanmis: await h.basitUrun({ durum: "zamanlanmis", yayinZamani: "2099-01-01T10:00" }),
      gizli: await h.basitUrun({ durum: "gizli" }),
      silinmis: await h.basitUrun(),
    };
    await urunler.urunSil(h.vt, yonetici(), durumlar.silinmis);
    const sonuc = async (kimlik: string) => {
      const okunan = await urunler.urunuOku(h.vt, kimlik);
      return (await kayitAdresiniCoz(h.vt, "urun", okunan?.adresAdi ?? "")).sonuc;
    };
    expect(await sonuc(durumlar.taslak)).toBe("yok");
    expect(await sonuc(durumlar.arsiv)).toBe("yok");
    expect(await sonuc(durumlar.zamanlanmis)).toBe("yok");
    expect(await sonuc(durumlar.silinmis)).toBe("yok");
    expect(await sonuc(durumlar.gizli)).toBe("kayit");
    expect(await urunSayfasiVerisi(h.vt, site, durumlar.silinmis)).toBeUndefined();
    expect(await urunSayfasiVerisi(h.vt, site, "bozuk")).toBeUndefined();
  });
});
