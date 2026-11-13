// Ürün bölümlerinin ürün kaynakları gerçek veritabanıyla (kart 0111, karar 0088):
// - Her kaynak (elle, kategori ve alt kategorileri, marka, etiket, yeni, indirimli) yalnız vitrinde görünen
//   ürünleri getirir: taslak, gizli, arşiv, silinmiş ve zamanı gelmemiş ürün gelmez; zamanı gelince gelir.
// - Tükenen ürün mağaza sahibinin ayarına uyar; silinmiş kategori, marka ve etiketin ürünü gelmez; adet ve sıra
//   (en yeni önce, elle seçimde seçim sırası).
// - İndirimdekiler yalnız süren indirimi sayar; fırsatlar yalnız bitişi olanları, en yakın biten önce. Kartın
//   bitişi indirimin bitişidir, varyantlı üründe satılabilir birleşimlerin en yakını; biten indirim düşer.
// - SQL koşulu indirimSuruyorMu ile aynı sonucu verir; sorgu sayısı ürün sayısıyla artmaz, aynı kaynak bir kez
//   okunur.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import { ornekBaglam } from "../../katalog/ornek-baglam.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { etiketServisi } from "../../moduller/etiket/servis.ts";
import { indirimSuruyorMu } from "../../moduller/fiyat/gecerli.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { indirimdekiUrunKosulu } from "../../moduller/fiyat/vitrin.ts";
import { kategoriEkle, kategoriSil } from "../../moduller/kategori/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { markaServisi } from "../../moduller/marka/servis.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunListesi } from "../../moduller/urun/liste.ts";
import type { UrunGirdisi } from "../../moduller/urun/semalar.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { bolumBosluklari } from "../bolum-kutuphanesi/gorunumler.tsx";
import { bolumKutuphanesi } from "../bolum-kutuphanesi/kutuphane.ts";
import { bolumDegerSemasi, bolumunUrunKaynaklari, kayitliKip } from "../bolum-kutuphanesi/tarif.ts";
import type { UrunKaynagi } from "../bolum-kutuphanesi/urun-kaynagi.ts";
import { urunKaynagiAnahtari } from "../bolum-kutuphanesi/urun-kaynagi.ts";
import { kaynaklarinUrunleri } from "../urun-kaynagi.ts";

vi.setConfig({ testTimeout: 60_000 });

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const site: Site = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const urunler = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

// Sabit an: ürünlerin oluşturma zamanından bağımsız, bütün zamanlar bu ana göre kurulur. Sitenin saat dilimi
// İstanbul'dur (UTC+3): yerel 15:00, 12:00Z'dir.
const an = new Date("2030-01-15T12:00:00Z");

const hazirla = async () => {
  const deneme = await denemeSitesiAc("urun-kaynagi");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const urunAc = async (
    ek: Partial<UrunGirdisi> = {},
    { satis = 10_000, miktar = 5 }: { satis?: number; miktar?: number } = {},
  ) => {
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: null,
      durum: "yayinda",
      ...ek,
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: satis });
    if (miktar > 0) {
      await stok.stokDuzelt(vt, yonetici(), birim, {
        yeniMiktar: miktar,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return { urun, birim };
  };
  const indirim = (
    birim: string,
    zaman: { baslangic?: string | null; bitis?: string | null } = {},
  ) =>
    fiyat.fiyatYaz(vt, yonetici(), birim, {
      satisFiyati: 10_000,
      indirimliFiyat: 7_500,
      indirimBaslangici: zaman.baslangic ?? null,
      indirimBitisi: zaman.bitis ?? null,
    });
  const oku = (kaynaklar: UrunKaynagi[], okumaAni: Date = an) =>
    kaynaklarinUrunleri(vt, site, kaynaklar, okumaAni);
  const kimlikleri = async (kaynak: UrunKaynagi, okumaAni: Date = an) =>
    ((await oku([kaynak], okumaAni))[urunKaynagiAnahtari(kaynak)] ?? []).map((kart) => kart.kimlik);
  return { vt, urunAc, indirim, oku, kimlikleri };
};

// Görünmeyen her durumda bir ürün: taslak, gizli, arşiv, silinmiş, zamanı gelmemiş (yerel 16:00 = 13:00Z).
const gorunmeyenler = async (
  h: Awaited<ReturnType<typeof hazirla>>,
  ek: Partial<UrunGirdisi>,
  vt: Veritabani,
) => {
  const taslak = await h.urunAc({ ...ek, durum: "taslak" });
  const gizli = await h.urunAc({ ...ek, durum: "gizli" });
  const arsiv = await h.urunAc({ ...ek, durum: "arsiv" });
  const silinmis = await h.urunAc(ek);
  await urunler.urunSil(vt, yonetici(), silinmis.urun);
  const zamanli = await h.urunAc({ ...ek, durum: "zamanlanmis", yayinZamani: "2030-01-15T16:00" });
  return { taslak, gizli, arsiv, silinmis, zamanli };
};

describe("kaynaklar yalnız vitrinde görünen ürünleri getirir", () => {
  it("kategori (alt kategorileriyle), marka, etiket, yeni ve elle", async () => {
    const h = await hazirla();
    const ust = await kategoriEkle(h.vt, yonetici(), { ad: "Üst" });
    const alt = await kategoriEkle(h.vt, yonetici(), { ad: "Alt", ust });
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Marka" });
    const etiket = await etiketServisi.ekle(h.vt, yonetici(), { ad: "Etiket" });
    const ek = { kategoriler: [alt], marka, etiketler: [etiket] };
    const gorunen = await h.urunAc(ek);
    const g = await gorunmeyenler(h, ek, h.vt);
    // Başka kategorideki ürün kategori, marka ve etiket kaynağına girmez.
    const baska = await h.urunAc();

    expect(await h.kimlikleri({ tur: "kategori", kategori: ust, adet: 12 })).toEqual([
      gorunen.urun,
    ]);
    expect(await h.kimlikleri({ tur: "marka", marka, adet: 12 })).toEqual([gorunen.urun]);
    expect(await h.kimlikleri({ tur: "etiket", etiket, adet: 12 })).toEqual([gorunen.urun]);
    expect(await h.kimlikleri({ tur: "yeni", adet: 12 })).toEqual([baska.urun, gorunen.urun]);
    const elle: UrunKaynagi = {
      tur: "elle",
      urunler: [g.zamanli.urun, g.taslak.urun, gorunen.urun, g.gizli.urun, baska.urun],
    };
    expect(await h.kimlikleri(elle)).toEqual([gorunen.urun, baska.urun]);
    // Yayın zamanından bir milisaniye önce yok, zamanında var; elle seçimde seçim sırasıyla.
    const yayin = new Date("2030-01-15T13:00:00Z");
    expect(await h.kimlikleri(elle, new Date(yayin.getTime() - 1))).toEqual([
      gorunen.urun,
      baska.urun,
    ]);
    expect(await h.kimlikleri(elle, yayin)).toEqual([g.zamanli.urun, gorunen.urun, baska.urun]);
    expect(await h.kimlikleri({ tur: "kategori", kategori: ust, adet: 12 }, yayin)).toEqual([
      g.zamanli.urun,
      gorunen.urun,
    ]);
    // Büyük harfle verilen elle seçim de aynı ürünleri getirir.
    expect(await h.kimlikleri({ tur: "elle", urunler: [gorunen.urun.toUpperCase()] })).toEqual([
      gorunen.urun,
    ]);
  });

  it("adet ve sıra: en yeni önce, adet kadar", async () => {
    const h = await hazirla();
    const birinci = await h.urunAc();
    const ikinci = await h.urunAc();
    const ucuncu = await h.urunAc();
    expect(await h.kimlikleri({ tur: "yeni", adet: 2 })).toEqual([ucuncu.urun, ikinci.urun]);
    // Görünmeyen daha yeni ürünler adedi doldurmaz: süzme sorgudadır, karttan önce.
    for (const durum of ["taslak", "gizli", "arsiv"] as const) await h.urunAc({ durum });
    expect(await h.kimlikleri({ tur: "yeni", adet: 2 })).toEqual([ucuncu.urun, ikinci.urun]);
    expect(await h.kimlikleri({ tur: "yeni", adet: 12 })).toEqual([
      ucuncu.urun,
      ikinci.urun,
      birinci.urun,
    ]);
  });

  it("tükenen ürün mağaza sahibinin ayarına uyar", async () => {
    const h = await hazirla();
    const stokta = await h.urunAc();
    const tukenmis = await h.urunAc({}, { miktar: 0 });
    await siteninServisi(site).degistir(h.vt, yonetici(), { tukenenUrun: "goster" });
    expect(await h.kimlikleri({ tur: "yeni", adet: 12 })).toEqual([tukenmis.urun, stokta.urun]);
    await siteninServisi(site).degistir(h.vt, yonetici(), { tukenenUrun: "gizle" });
    expect(await h.kimlikleri({ tur: "yeni", adet: 12 })).toEqual([stokta.urun]);
    expect(await h.kimlikleri({ tur: "elle", urunler: [tukenmis.urun, stokta.urun] })).toEqual([
      stokta.urun,
    ]);
  });

  it("silinmiş kategori, marka ve etiketin ürünü gelmez; olmayan kaynak boştur", async () => {
    const h = await hazirla();
    const kategori = await kategoriEkle(h.vt, yonetici(), { ad: "Kategori" });
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Marka" });
    const etiket = await etiketServisi.ekle(h.vt, yonetici(), { ad: "Etiket" });
    await h.urunAc({ kategoriler: [kategori], marka, etiketler: [etiket] });
    await kategoriSil(h.vt, yonetici(), kategori);
    await markaServisi.sil(h.vt, yonetici(), marka);
    await etiketServisi.sil(h.vt, yonetici(), etiket);
    for (const kaynak of [
      { tur: "kategori", kategori, adet: 12 },
      { tur: "marka", marka, adet: 12 },
      { tur: "etiket", etiket, adet: 12 },
      { tur: "kategori", kategori: randomUUID(), adet: 12 },
    ] as const) {
      expect(await h.kimlikleri(kaynak)).toEqual([]);
    }
  });
});

describe("indirimdekiler ve fırsatlar", () => {
  // Kart 0172: panel fırsatlar bölümünün boşluğunu görünüşün işleviyle bulur. Gerçek veritabanıyla: yalnız bitişsiz
  // indirim varken bölüm boştur, bitişli indirim gelince değildir.
  it("fırsatlar bölümü yalnız bitişsiz indirim varken boş, bitişli indirim gelince dolu", async () => {
    // Örnek bağlamın metinleri çalışan siteden okunur.
    (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = site;
    const h = await hazirla();
    const bolum = bolumKutuphanesi.firsatlar;
    const degerler = bolumDegerSemasi(bolum, kayitliKip).parse({});
    const [kaynak] = bolumunUrunKaynaklari(bolum, degerler);
    if (kaynak === undefined) throw new Error("fırsatların kaynağı yok");
    const baglam = async () => ({ ...ornekBaglam(an), urunler: await h.oku([kaynak]) });
    const suresiz = await h.urunAc();
    await h.indirim(suresiz.birim);
    expect(bolumBosluklari.firsatlar(degerler, await baglam())).toBe(true);
    const bitisli = await h.urunAc();
    await h.indirim(bitisli.birim, { bitis: "2030-02-01T00:00" });
    expect(bolumBosluklari.firsatlar(degerler, await baglam())).toBe(false);
  });

  it("indirimdekiler yalnız süren indirimi sayar; fırsatlar yalnız bitişi olanları, en yakın biten önce", async () => {
    const h = await hazirla();
    // En yakın biten en eski üründür: fırsatların sırası "en yeni önce" sırasının tersidir.
    const yakin = await h.urunAc();
    await h.indirim(yakin.birim, { baslangic: "2030-01-01T00:00", bitis: "2030-01-16T00:00" });
    const suresiz = await h.urunAc();
    await h.indirim(suresiz.birim);
    const gec = await h.urunAc();
    await h.indirim(gec.birim, { bitis: "2030-02-01T00:00" });
    const baslamamis = await h.urunAc();
    await h.indirim(baslamamis.birim, { baslangic: "2030-01-20T00:00" });
    const bitmis = await h.urunAc();
    await h.indirim(bitmis.birim, { bitis: "2030-01-10T00:00" });
    const indirimsiz = await h.urunAc();
    // Görünmeyen her durumda bitişli indirimli bir ürün: iki kaynakta da yok. İndirim, zamanlanmış ürünün yayına
    // girdiği anda (yerel 16:00) biter: saat ilerletilince de görünmez.
    const g = await gorunmeyenler(h, {}, h.vt);
    for (const urun of [g.taslak, g.gizli, g.arsiv, g.zamanli]) {
      await h.indirim(urun.birim, { bitis: "2030-01-15T16:00" });
    }

    expect(await h.kimlikleri({ tur: "indirimli", adet: 12 })).toEqual([
      gec.urun,
      suresiz.urun,
      yakin.urun,
    ]);
    expect(await h.kimlikleri({ tur: "firsat", adet: 12 })).toEqual([yakin.urun, gec.urun]);
    expect(await h.kimlikleri({ tur: "firsat", adet: 1 })).toEqual([yakin.urun]);
    expect(await h.kimlikleri({ tur: "indirimli", adet: 1 })).toEqual([gec.urun]);
    expect(indirimsiz.urun).toBeDefined();

    // Kartın bitişi indirimin bitişidir: yerel 16 Ocak 00:00 = 15 Ocak 21:00Z.
    const kaynak: UrunKaynagi = { tur: "firsat", adet: 12 };
    const [ilk] = (await h.oku([kaynak]))[urunKaynagiAnahtari(kaynak)] ?? [];
    const bitis = new Date("2030-01-15T21:00:00Z");
    expect(ilk?.fiyat?.indirimBitisi).toEqual(bitis);
    expect(
      (await fiyat.gecerliFiyatlar(h.vt, [yakin.birim], an)).get(yakin.birim)?.indirimBitisi,
    ).toEqual(bitis);
    // Biten indirim bölümden düşer: bitişten bir milisaniye önce var, bittiği anda yok.
    expect(await h.kimlikleri(kaynak, new Date(bitis.getTime() - 1))).toEqual([
      yakin.urun,
      gec.urun,
    ]);
    expect(await h.kimlikleri(kaynak, bitis)).toEqual([gec.urun]);
    expect(await h.kimlikleri({ tur: "indirimli", adet: 12 }, bitis)).toEqual([
      gec.urun,
      suresiz.urun,
    ]);
  });

  it("varyantlı ürünün bitişi satılabilir birleşimlerin en yakını; silinmiş birleşim sayılmaz", async () => {
    const h = await hazirla();
    const urun = await urunler.urunEkle(h.vt, yonetici(), {
      ad: "Varyantlı",
      vergiSinifi: null,
      durum: "yayinda",
    });
    await urunler.secenekEkle(h.vt, yonetici(), urun, { ad: "Beden", degerler: ["S", "M", "L"] });
    const degerler = (await urunler.urunuOku(h.vt, urun))?.secenekler[0]?.degerler ?? [];
    const birimler: string[] = [];
    for (const deger of degerler) {
      birimler.push(
        await urunler.birlesimEkle(h.vt, yonetici(), urun, { degerler: [deger.kimlik] }),
      );
    }
    const [tukenmis, satilabilir, ucuncu] = birimler;
    if (tukenmis === undefined || satilabilir === undefined || ucuncu === undefined) {
      throw new Error("Birleşim yok.");
    }
    // Önce satış fiyatı: indirimin eski fiyatı gösterilsin (önceki fiyatı olmayan indirim kartta görünmez).
    for (const birim of birimler)
      await fiyat.fiyatYaz(h.vt, yonetici(), birim, { satisFiyati: 10_000 });
    // Tükenmiş birleşimin indirimi en erken biter; sayılmaz, çünkü öteki birleşim satılabilir.
    await h.indirim(tukenmis, { bitis: "2030-01-16T00:00" });
    await h.indirim(satilabilir, { bitis: "2030-01-20T00:00" });
    await h.indirim(ucuncu, { bitis: "2030-01-25T00:00" });
    for (const birim of [satilabilir, ucuncu]) {
      await stok.stokDuzelt(h.vt, yonetici(), birim, {
        yeniMiktar: 3,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    const kaynak: UrunKaynagi = { tur: "firsat", adet: 12 };
    const kart = async (okumaAni: Date = an) =>
      ((await h.oku([kaynak], okumaAni))[urunKaynagiAnahtari(kaynak)] ?? [])[0];
    expect((await kart())?.fiyat?.indirimBitisi).toEqual(new Date("2030-01-19T21:00:00Z"));
    // En yakın biten bitince bir sonrakine geçer.
    expect((await kart(new Date("2030-01-19T21:00:00Z")))?.fiyat?.indirimBitisi).toEqual(
      new Date("2030-01-24T21:00:00Z"),
    );
    // Silinen birleşimin indirimi sayılmaz.
    await urunler.birlesimSil(h.vt, yonetici(), satilabilir);
    expect((await kart())?.fiyat?.indirimBitisi).toEqual(new Date("2030-01-24T21:00:00Z"));
  });

  it("indirimi yalnız satılamayan ya da silinmiş birleşimde olan ürün fırsatlara girmez", async () => {
    const h = await hazirla();
    const varyantli = async (ad: string) => {
      const urun = await urunler.urunEkle(h.vt, yonetici(), {
        ad,
        vergiSinifi: null,
        durum: "yayinda",
      });
      await urunler.secenekEkle(h.vt, yonetici(), urun, { ad: "Beden", degerler: ["S", "M"] });
      const degerler = (await urunler.urunuOku(h.vt, urun))?.secenekler[0]?.degerler ?? [];
      const birimler: string[] = [];
      for (const deger of degerler) {
        birimler.push(
          await urunler.birlesimEkle(h.vt, yonetici(), urun, { degerler: [deger.kimlik] }),
        );
      }
      const [indirimli, satilabilir] = birimler;
      if (indirimli === undefined || satilabilir === undefined) throw new Error("Birleşim yok.");
      await h.indirim(indirimli, { bitis: "2030-01-20T00:00" });
      await fiyat.fiyatYaz(h.vt, yonetici(), satilabilir, { satisFiyati: 10_000 });
      await stok.stokDuzelt(h.vt, yonetici(), satilabilir, {
        yeniMiktar: 3,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
      return { urun, indirimli };
    };
    // İndirimli birleşim tükenmiş, indirimsiz birleşim satılabilir: kartta indirim ve bitiş yok.
    const tukenmisIndirimli = await varyantli("Tükenmiş indirimli");
    // İndirimli birleşim silinmiş: indirimdekilere de girmez.
    const silinmisIndirimli = await varyantli("Silinmiş indirimli");
    await urunler.birlesimSil(h.vt, yonetici(), silinmisIndirimli.indirimli);
    // Kartta indirim görünmez (rozet yok): ikisi de indirimdekilere girmez (kart 0111 kontrolü).
    expect(await h.kimlikleri({ tur: "firsat", adet: 12 })).toEqual([]);
    expect(await h.kimlikleri({ tur: "indirimli", adet: 12 })).toEqual([]);
    expect(tukenmisIndirimli.urun).toBeDefined();
  });

  // Kart 0111 kontrolü: eski fiyatı gösterilemeyen indirimde kart düz fiyat gösterir; sayaç görünmemeli.
  it("eski fiyatı gösterilemeyen (30 gün kuralı) indirim ne fırsatlara ne indirimdekilere girer", async () => {
    const h = await hazirla();
    await siteninServisi(site).degistir(h.vt, yonetici(), { indirimdeEnDusukFiyat: true });
    // Son 30 günün en düşük fiyatı (50,00) indirimli fiyattan (75,00) yüksek değil.
    const ucuzdu = await h.urunAc({}, { satis: 5_000 });
    await h.indirim(ucuzdu.birim, { bitis: "2030-01-20T00:00" });
    const gosterilen = await h.urunAc();
    await h.indirim(gosterilen.birim, { bitis: "2030-01-25T00:00" });
    const kaynak: UrunKaynagi = { tur: "firsat", adet: 12 };
    const [kart] = (await h.oku([kaynak]))[urunKaynagiAnahtari(kaynak)] ?? [];
    expect(kart?.kimlik).toBe(gosterilen.urun);
    expect(kart?.fiyat?.indirim).toBeDefined();
    expect(await h.kimlikleri(kaynak)).toEqual([gosterilen.urun]);
    expect(await h.kimlikleri({ tur: "indirimli", adet: 12 })).toEqual([gosterilen.urun]);
    // Aynı ürün kartta indirimsiz görünür: fiyatı var, rozeti ve bitişi yok.
    const elle: UrunKaynagi = { tur: "elle", urunler: [ucuzdu.urun] };
    const [duz] = (await h.oku([elle]))[urunKaynagiAnahtari(elle)] ?? [];
    expect(duz?.fiyat).toBeDefined();
    expect(duz?.fiyat?.indirim).toBeUndefined();
    expect(duz?.fiyat?.indirimBitisi).toBeUndefined();
  });

  it("elle seçimde harf farkıyla aynı ürün tek kart verir; şema da kabul etmez", async () => {
    const h = await hazirla();
    const { urun } = await h.urunAc();
    expect(await h.kimlikleri({ tur: "elle", urunler: [urun, urun.toUpperCase()] })).toEqual([
      urun,
    ]);
    const tarif = bolumKutuphanesi["urun-vitrini"];
    if (tarif === undefined) throw new Error("Tarif yok.");
    const sonuc = bolumDegerSemasi(tarif).safeParse({
      urunler: { tur: "elle", urunler: [urun, urun.toUpperCase()] },
    });
    expect(sonuc.success).toBe(false);
    expect(sonuc.error?.issues.map((sorun) => sorun.message)).toContain("ayni-urun-iki-kez");
  });

  it("SQL koşulu indirimSuruyorMu ile aynı sonucu verir; başka para birimindeki fiyat sayılmaz", async () => {
    const h = await hazirla();
    const durumlar = [
      { baslangic: null, bitis: null },
      { baslangic: "2030-01-15T15:00", bitis: null },
      { baslangic: "2030-01-15T15:01", bitis: null },
      { baslangic: null, bitis: "2030-01-15T15:00" },
      { baslangic: null, bitis: "2030-01-15T15:01" },
      { baslangic: "2030-01-01T00:00", bitis: "2030-02-01T00:00" },
    ];
    const kayitlar = [];
    for (const zaman of durumlar) {
      const { urun, birim } = await h.urunAc();
      await h.indirim(birim, zaman);
      kayitlar.push({ urun, birim });
    }
    const indirimsiz = await h.urunAc();
    kayitlar.push(indirimsiz);
    const birimFiyatlari = await fiyat.fiyatlariOku(
      h.vt,
      kayitlar.map(({ birim }) => birim),
    );
    for (const yalnizBitisli of [false, true]) {
      const sql = new Set(
        (
          await urunListesi(
            h.vt,
            indirimdekiUrunKosulu({ an, paraBirimi: site.ayarlar.paraBirimi, yalnizBitisli }),
            { boyut: 100 },
          )
        ).urunler,
      );
      for (const { urun, birim } of kayitlar) {
        const satir = birimFiyatlari.get(birim);
        const js =
          satir !== undefined &&
          indirimSuruyorMu(satir, an) &&
          (!yalnizBitisli || satir.indirimBitisi !== null);
        expect([urun, sql.has(urun)]).toEqual([urun, js]);
      }
    }
    // Sitenin bugünkü para birimi değilse hiçbir fiyat sayılmaz.
    expect(
      (
        await urunListesi(
          h.vt,
          indirimdekiUrunKosulu({ an, paraBirimi: "XXX", yalnizBitisli: false }),
          { boyut: 100 },
        )
      ).urunler,
    ).toEqual([]);
  });
});

describe("sorgular", () => {
  it("sorgu sayısı ürün sayısıyla artmaz; aynı kaynak bir kez okunur", async () => {
    const h = await hazirla();
    const kategori = await kategoriEkle(h.vt, yonetici(), { ad: "Kategori" });
    const tek = await h.urunAc({ kategoriler: [kategori] });
    await h.indirim(tek.birim, { bitis: "2030-02-01T00:00" });
    const marka = await markaServisi.ekle(h.vt, yonetici(), { ad: "Marka" });
    const etiket = await etiketServisi.ekle(h.vt, yonetici(), { ad: "Etiket" });
    await urunler.urunDegistir(h.vt, yonetici(), tek.urun, { marka, etiketler: [etiket] });
    const kaynaklar: UrunKaynagi[] = [
      { tur: "yeni", adet: 12 },
      { tur: "kategori", kategori, adet: 12 },
      { tur: "marka", marka, adet: 12 },
      { tur: "etiket", etiket, adet: 12 },
      { tur: "indirimli", adet: 12 },
      { tur: "firsat", adet: 12 },
    ];
    // İlk okuma mağaza ayarlarının başlangıç değerini yazar; sayım ondan sonradır.
    await h.oku(kaynaklar);
    const say = async (liste: UrunKaynagi[]) => {
      const sorgu = vi.spyOn(h.vt.$client, "query");
      await h.oku(liste);
      const sayi = sorgu.mock.calls.length;
      sorgu.mockRestore();
      return sayi;
    };
    const elle = (kimlikler: string[]): UrunKaynagi => ({ tur: "elle", urunler: kimlikler });
    const birUrunle = await say([...kaynaklar, elle([tek.urun])]);
    const hepsi = [tek.urun];
    for (let i = 0; i < 4; i += 1) {
      const { urun, birim } = await h.urunAc({
        kategoriler: [kategori],
        marka,
        etiketler: [etiket],
      });
      await h.indirim(birim, { bitis: "2030-02-01T00:00" });
      hepsi.push(urun);
    }
    expect(await say([...kaynaklar, elle(hepsi)])).toBe(birUrunle);
    // Aynı kaynak iki bölümde: bir kez okunur.
    expect(await say([...kaynaklar, elle(hepsi), ...kaynaklar, elle(hepsi)])).toBe(birUrunle);
    expect(await say([])).toBe(0);
  });
});
