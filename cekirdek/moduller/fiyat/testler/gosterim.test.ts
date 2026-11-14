// Gösterilecek fiyat gerçek veritabanıyla (kart 0081, karar 0067): vergi dahil ve hariç girişin dahil
// ve hariç gösterimi ve ek metni, vergi kapalı, vergi adı olmayan site, mağaza sahibinin kendi metni ve
// boş metni, geçmişten eski fiyat (ayar açık ve kapalı), sitenin para biçimiyle yazılış, bölge, fiyatsız
// birim ve birim sayısıyla artmayan sorgu sayısı. Kart 0085: varyantlı ürünün fiyat aralığı (yalnız
// satılabilir birleşimler, hepsi tükenmişse hepsi, fiyatsız ve silinmiş birleşim, tek fiyat, indirim ve
// vergi çevirmesi), basit ürünün aralığı ve ürün sayısıyla artmayan sorgu sayısı.
//
// Beklenen tutarlar elle hesaplanmıştır. Deneme sitesinin vergi sınıfı "Genel" ülkede yüzde 18'dir; mağaza
// Ankara'dadır, binde beşlik ek oran yalnız İstanbul'un bir posta kodundadır (orada en özel oran olarak
// yalnız o geçer).
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MagazaAyarlari } from "../../../ayar-semasi/ayarlar.ts";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { gunluk } from "../../../izleme/gunluk.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { siteninBicimleyicisi } from "../../../metinler/site-metni.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunBirimleri } from "../../urun/model.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { fiyatGosterimServisi } from "../gosterim.ts";
import { birimFiyatlari, fiyatGecmisi } from "../model.ts";
import { siteninFiyatServisi } from "../servis.ts";

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const klasor = siteKlasorunuOku(
  join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "ayar-semasi",
    "testler",
    "ornek-siteler",
    "vergi-dolu",
  ),
);
const site = (baslangic: Partial<MagazaAyarlari> = {}) => ({
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
    ...baslangic,
  },
});

const silinecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(silinecekler.splice(0).map((sil) => sil()));
});

// Sitenin veritabanı, vergi sınıfı "Genel" ve bir ürünün birimi.
const hazirla = async (baslangic: Partial<MagazaAyarlari> = {}, sinifli = true) => {
  const deneme = await denemeSitesiAc("gosterim");
  silinecekler.push(deneme.sil);
  const vt = deneme.vt;
  const s = site(baslangic);
  const siniflar = await siteninVergiServisi(s).tabloyuOku(vt);
  const genel = siniflar.find((sinif) => sinif.ad === "Genel");
  if (genel === undefined) throw new Error("Genel sınıfı yok.");
  const birimAc = async () => {
    const urunler = urunServisi(() => s.ayarlar.saatDilimi);
    const urun = await urunler.urunEkle(vt, yonetici(), {
      ad: "Deneme ürünü",
      vergiSinifi: sinifli ? genel.kimlik : null,
    });
    const birim = (await urunler.urunuOku(vt, urun))?.birimler[0]?.kimlik;
    if (birim === undefined) throw new Error("Birim yok.");
    return birim;
  };
  return {
    vt,
    site: s,
    birim: await birimAc(),
    birimAc,
    gosterim: fiyatGosterimServisi(s),
    fiyat: siteninFiyatServisi(s),
    ayarla: (degerler: Partial<MagazaAyarlari>) =>
      siteninServisi(s).degistir(vt, yonetici(), degerler),
  };
};

const gosterileni = async (h: Awaited<ReturnType<typeof hazirla>>, an?: Date) => {
  const sonuc = (await h.gosterim.gosterilecekFiyatlar(h.vt, [h.birim], an ? { an } : {})).get(
    h.birim,
  );
  if (sonuc === undefined) throw new Error("Fiyat yok.");
  return sonuc;
};

describe("vergi dahil ve hariç gösterim", () => {
  it.each([
    // Giriş, gösterim, gösterilen tutar (elle), ek metin.
    ["vergi-dahil", "vergi-dahil", 10_000, "Deneme vergisi dahil"],
    // 10000 × 18 / 118 = 1525,42 → 1525; 10000 − 1525 = 8475.
    ["vergi-dahil", "vergi-haric", 8_475, "Deneme vergisi hariç"],
    // 10000 × 0,18 = 1800; 10000 + 1800 = 11800.
    ["vergi-haric", "vergi-dahil", 11_800, "Deneme vergisi dahil"],
    ["vergi-haric", "vergi-haric", 10_000, "Deneme vergisi hariç"],
  ] as const)("%s girilen fiyat %s gösterilir", async (giris, gosterim, tutar, ekMetin) => {
    const h = await hazirla({ fiyatGirisi: giris, fiyatGosterimi: gosterim });
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 10_000 });
    const sonuc = await gosterileni(h);
    expect(sonuc).toMatchObject({ tutar, vergi: gosterim, ekMetin, indirimde: false });
    expect(sonuc.eskiTutar).toBeUndefined();
  });

  it("vergisiz ürün çevrilmez, vergisi yok, kendiliğinden metni yok", async () => {
    const h = await hazirla({ fiyatGosterimi: "vergi-haric" }, false);
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 10_000 });
    const sonuc = await gosterileni(h);
    expect(sonuc).toMatchObject({ tutar: 10_000, vergi: "yok" });
    expect(sonuc.ekMetin).toBeUndefined();
    // Mağaza sahibinin kendi metni yine görünür.
    await h.ayarla({ fiyatEkMetni: "Kargo hariç" });
    expect((await gosterileni(h)).ekMetin).toBe("Kargo hariç");
  });

  it("bölge bulunamazsa vitrin düşmez: tutar girildiği biçimde, kendi metniyle; hata bir kez", async () => {
    const h = await hazirla({ magazaAdresi: undefined, fiyatGosterimi: "vergi-haric" });
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 10_000 });
    const hata = vi.spyOn(gunluk, "hata").mockImplementation(() => undefined);
    try {
      for (let i = 0; i < 3; i++) {
        expect(await gosterileni(h)).toMatchObject({
          tutar: 10_000,
          vergi: "vergi-dahil",
          ekMetin: "Deneme vergisi dahil",
        });
      }
      expect(hata).toHaveBeenCalledTimes(1);
      expect(hata.mock.calls[0]?.[1]).toMatchObject({ kaynak: "fiyat-gosterimi" });
    } finally {
      hata.mockRestore();
    }
  });

  it("vergi kapalıysa çevrilmez, metin yok", async () => {
    const h = await hazirla({ vergiAcik: false, fiyatGosterimi: "vergi-haric" });
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 10_000 });
    const sonuc = await gosterileni(h);
    expect(sonuc).toMatchObject({ tutar: 10_000, vergi: "yok" });
    expect(sonuc.ekMetin).toBeUndefined();
  });

  it("verilen bölgeyle çevrilir; bölge tabloda yoksa mağaza adresi", async () => {
    const h = await hazirla({ fiyatGirisi: "vergi-haric" });
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 10_000 });
    const bolgeyle = async (bolge: { ulke: string; il?: string; postaKodu?: string }) =>
      (await h.gosterim.gosterilecekFiyatlar(h.vt, [h.birim], { bolge })).get(h.birim)?.tutar;
    // İstanbul'un posta kodunda en özel oran geçer (karar 0061): yalnız binde beş, 10000 × 0,005 = 50.
    expect(await bolgeyle({ ulke: "TR", il: "TR-34", postaKodu: "34000" })).toBe(10_050);
    expect(await bolgeyle({ ulke: "DE" })).toBe(11_800);
  });
});

describe("fiyatın yanındaki metin", () => {
  it("mağaza sahibinin metni, boş metin ve vergi adı olmayan site", async () => {
    const h = await hazirla();
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 10_000 });
    await h.ayarla({ fiyatEkMetni: "Tüm vergiler fiyata dahildir" });
    expect((await gosterileni(h)).ekMetin).toBe("Tüm vergiler fiyata dahildir");
    await h.ayarla({ fiyatEkMetni: "  " });
    expect((await gosterileni(h)).ekMetin).toBeUndefined();
    const adsiz = await hazirla({ vergiAdi: undefined, fiyatGosterimi: "vergi-haric" });
    await adsiz.fiyat.fiyatYaz(adsiz.vt, yonetici(), adsiz.birim, { satisFiyati: 10_000 });
    expect((await gosterileni(adsiz)).ekMetin).toBe("Vergiler hariç");
  });
});

describe("eski fiyat geçmişten", () => {
  // Kart 0080'in servisi geçmişe o anın saatini yazar; burada geçmiş bilinen zamanlarla kurulur.
  const ilk = Date.parse("2026-09-01T00:00:00Z");
  const gun = (n: number) => new Date(ilk + n * 24 * 60 * 60 * 1000);
  const satirlar = [
    { zaman: 0, satis: 12_000 },
    { zaman: 10, satis: 11_000 },
    { zaman: 15, satis: 11_000, indirim: 10_500, bas: 16, bit: 18 },
    { zaman: 20, satis: 13_000 },
    { zaman: 40, satis: 13_000, indirim: 10_000, bas: 41 },
  ];
  type Satir = { zaman: number; satis: number; indirim?: number; bas?: number; bit?: number };
  const gecmisiKur = async (
    h: Awaited<ReturnType<typeof hazirla>>,
    kurulacak: Satir[] = satirlar,
  ) => {
    for (const s of kurulacak) {
      await h.vt.insert(fiyatGecmisi).values({
        birim_kimligi: h.birim,
        zaman: gun(s.zaman),
        satis_fiyati: s.satis,
        indirimli_fiyat: s.indirim ?? null,
        indirim_baslangici: s.bas === undefined ? null : gun(s.bas),
        indirim_bitisi: s.bit === undefined ? null : gun(s.bit),
        para_birimi: h.site.ayarlar.paraBirimi,
      });
    }
    const son = kurulacak.at(-1);
    if (son === undefined) throw new Error("Satır yok.");
    await h.vt.insert(birimFiyatlari).values({
      birim_kimligi: h.birim,
      satis_fiyati: son.satis,
      indirimli_fiyat: son.indirim ?? null,
      indirim_baslangici: son.bas === undefined ? null : gun(son.bas),
      para_birimi: h.site.ayarlar.paraBirimi,
    });
  };

  it("fiyatı birkaç kez değişmiş üründe elle hesaplanan eski fiyat", async () => {
    const h = await hazirla();
    await gecmisiKur(h);
    // Pencere gün 11–41: en düşük 105,00 (gün 16–18 indirimi); 120,00 dışarıda.
    const sonuc = await gosterileni(h, gun(45));
    expect(sonuc).toMatchObject({ tutar: 10_000, eskiTutar: 10_500, indirimde: true });
    expect(sonuc.yazili).toEqual({ tutar: "100,00\u00a0XTS", eskiTutar: "105,00\u00a0XTS" });
    expect(await gosterileni(h, gun(30))).toMatchObject({ tutar: 13_000, indirimde: false });
  });

  it("ayar kapalıyken eski fiyat indirimden önceki satış fiyatı", async () => {
    const h = await hazirla({ indirimdeEnDusukFiyat: false });
    await gecmisiKur(h);
    expect(await gosterileni(h, gun(45))).toMatchObject({ tutar: 10_000, eskiTutar: 13_000 });
  });

  it("eski fiyat da gösterim biçimine çevrilir", async () => {
    const h = await hazirla({ fiyatGosterimi: "vergi-haric" });
    await gecmisiKur(h);
    // 10000 → 8475; 10500 × 18 / 118 = 1601,69 → 1602, 10500 − 1602 = 8898.
    expect(await gosterileni(h, gun(45))).toMatchObject({ tutar: 8_475, eskiTutar: 8_898 });
  });

  it("çevrilince aynı kuruşa yuvarlanan eski fiyat gösterilmez", async () => {
    const h = await hazirla({ fiyatGosterimi: "vergi-haric" });
    // Girişte en düşük 4 kuruş, indirimli 3 kuruş. Hariç: 4 × 18 / 118 = 0,61 → 1, 4 − 1 = 3;
    // 3 × 18 / 118 = 0,46 → 0, 3 − 0 = 3. İkisi de 3 kuruş.
    await gecmisiKur(h, [
      { zaman: 0, satis: 4 },
      { zaman: 40, satis: 10, indirim: 3, bas: 41 },
    ]);
    const sonuc = await gosterileni(h, gun(45));
    expect(sonuc).toMatchObject({ tutar: 3, indirimde: true });
    expect(sonuc.eskiTutar).toBeUndefined();
    expect(sonuc.yazili.eskiTutar).toBeUndefined();
  });
});

describe("sitenin para biçimi", () => {
  it("tutar sitenin para biçimiyle yazılır", async () => {
    const h = await hazirla();
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 123_456 });
    const bicimli = fiyatGosterimServisi({
      ...h.site,
      ayarlar: {
        ...h.site.ayarlar,
        paraBicimi: { ...h.site.ayarlar.paraBicimi, simge: "¤", simgeYeri: "basta" },
      },
    });
    const sonuc = (await bicimli.gosterilecekFiyatlar(h.vt, [h.birim])).get(h.birim);
    expect(sonuc?.yazili.tutar).toBe("¤\u00a01.234,56");
  });
});

describe("birimler", () => {
  it("fiyatı olmayan birim haritada yok", async () => {
    const h = await hazirla();
    expect((await h.gosterim.gosterilecekFiyatlar(h.vt, [h.birim])).size).toBe(0);
  });

  it("sorgu sayısı birim sayısıyla artmaz", async () => {
    const h = await hazirla({ fiyatGosterimi: "vergi-haric" });
    const birimler = [h.birim, ...(await Promise.all([1, 2, 3, 4].map(() => h.birimAc())))];
    for (const birim of birimler) {
      await h.fiyat.fiyatYaz(h.vt, yonetici(), birim, {
        satisFiyati: 10_000,
        indirimliFiyat: 9_000,
      });
    }
    const say = async (liste: string[]) => {
      const sorgu = vi.spyOn(h.vt.$client, "query");
      const sonuc = await h.gosterim.gosterilecekFiyatlar(h.vt, liste);
      const sayi = sorgu.mock.calls.length;
      sorgu.mockRestore();
      expect(sonuc.size).toBe(liste.length);
      return sayi;
    };
    // İlk okuma mağaza ayarlarının ve vergi tablosunun başlangıç değerini bir kez yazar.
    await h.gosterim.gosterilecekFiyatlar(h.vt, birimler);
    expect(await say(birimler)).toBe(await say(birimler.slice(0, 1)));
  });

  it("olmayan ve bozuk kimlik yok sayılır", async () => {
    const h = await hazirla();
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 10_000 });
    const sonuc = await h.gosterim.gosterilecekFiyatlar(h.vt, [h.birim, randomUUID(), "bozuk"]);
    expect([...sonuc.keys()]).toEqual([h.birim]);
  });
});

describe("fiyat aralığı (kart 0085)", () => {
  const stok = stokServisi();

  // Tek seçenekli (Beden) varyantlı ürün: her miktar bir birleşim, stoğuyla.
  const varyantliAc = async (h: Awaited<ReturnType<typeof hazirla>>, miktarlar: number[]) => {
    const urunler = urunServisi(() => h.site.ayarlar.saatDilimi);
    const siniflar = await siteninVergiServisi(h.site).tabloyuOku(h.vt);
    const urun = await urunler.urunEkle(h.vt, yonetici(), {
      ad: `Varyantlı ${randomUUID().slice(0, 8)}`,
      vergiSinifi: siniflar.find((sinif) => sinif.ad === "Genel")?.kimlik ?? null,
    });
    await urunler.secenekEkle(h.vt, yonetici(), urun, {
      ad: "Beden",
      degerler: miktarlar.map((_, i) => `d${i}`),
    });
    const degerler = (await urunler.urunuOku(h.vt, urun))?.secenekler[0]?.degerler ?? [];
    const birimler: string[] = [];
    for (const [i, miktar] of miktarlar.entries()) {
      const birim = await urunler.birlesimEkle(h.vt, yonetici(), urun, {
        degerler: [degerler[i]?.kimlik ?? ""],
      });
      if (miktar > 0) {
        await stok.stokDuzelt(h.vt, yonetici(), birim, {
          yeniMiktar: miktar,
          gorulenMiktar: 0,
          sebep: "sayim",
        });
      }
      birimler.push(birim);
    }
    return { urun, birimler, urunler };
  };
  const fiyatlar = async (
    h: Awaited<ReturnType<typeof hazirla>>,
    birimler: string[],
    tutarlar: (number | undefined)[],
  ) => {
    for (const [i, birim] of birimler.entries()) {
      const tutar = tutarlar[i];
      if (tutar !== undefined)
        await h.fiyat.fiyatYaz(h.vt, yonetici(), birim, { satisFiyati: tutar });
    }
  };
  const uclar = async (h: Awaited<ReturnType<typeof hazirla>>, urun: string) => {
    const aralik = (await h.gosterim.fiyatAraliklari(h.vt, [urun])).get(urun);
    return aralik === undefined
      ? undefined
      : [aralik.enDusuk.tutar, aralik.enYuksek.tutar, aralik.tek];
  };

  it("yalnız satılabilir birleşimlerden: tükenmiş en ucuz birleşim aralığa girmez", async () => {
    const h = await hazirla();
    const { urun, birimler } = await varyantliAc(h, [0, 3, 5, 2]);
    // En ucuzu (19990) tükenmiş; fiyatı olmayan birleşim (son) sayılmaz.
    await fiyatlar(h, birimler, [19_990, 24_990, 27_990, undefined]);
    expect(await uclar(h, urun)).toEqual([24_990, 27_990, false]);
    // Tükenmiş birleşime stok gelince aralığa girer.
    await stok.stokDuzelt(h.vt, yonetici(), birimler[0] ?? "", {
      yeniMiktar: 1,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    expect(await uclar(h, urun)).toEqual([19_990, 27_990, false]);
  });

  it("hiçbiri satılamıyorsa bütün silinmemiş birleşimlerden; silinmiş birleşim hiç sayılmaz", async () => {
    const h = await hazirla();
    const { urun, birimler, urunler } = await varyantliAc(h, [0, 0, 0]);
    await fiyatlar(h, birimler, [10_000, 30_000, 5_000]);
    await urunler.birlesimSil(h.vt, yonetici(), birimler[2] ?? "");
    expect(await uclar(h, urun)).toEqual([10_000, 30_000, false]);
  });

  it("fiyatı olmayan birleşim satılabilir sayılmaz: aralık stoklu ama fiyatsız birleşimi atlar", async () => {
    const h = await hazirla();
    const { urun, birimler } = await varyantliAc(h, [4, 0]);
    // Stoklu birleşimin fiyatı yok (satın alınamaz); tükenmiş birleşim 100,00.
    await fiyatlar(h, birimler, [undefined, 10_000]);
    expect(await uclar(h, urun)).toEqual([10_000, 10_000, true]);
  });

  it("tutar aynı ama eski fiyat farklıysa tek fiyat sayılmaz", async () => {
    const h = await hazirla({ indirimdeEnDusukFiyat: false });
    const { urun, birimler } = await varyantliAc(h, [1, 1]);
    // Kapalı ayarda eski fiyat indirimden önceki satış fiyatıdır.
    await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[0] ?? "", {
      satisFiyati: 20_000,
      indirimliFiyat: 10_000,
    });
    await fiyatlar(h, birimler, [undefined, 10_000]);
    const aralik = (await h.gosterim.fiyatAraliklari(h.vt, [urun])).get(urun);
    expect([aralik?.enDusuk.tutar, aralik?.enYuksek.tutar, aralik?.tek]).toEqual([
      10_000,
      10_000,
      false,
    ]);
  });

  it("tutar aynı ama biri indirimdeyse (eski fiyatı gösterilmese de) tek fiyat sayılmaz", async () => {
    const h = await hazirla();
    const { urun, birimler } = await varyantliAc(h, [1, 1]);
    // Doğrudan indirimle girildi: önceki 30 günde fiyat yok, eski fiyat gösterilmez (karar 0067).
    await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[0] ?? "", {
      satisFiyati: 20_000,
      indirimliFiyat: 10_000,
    });
    await fiyatlar(h, birimler, [undefined, 10_000]);
    const aralik = (await h.gosterim.fiyatAraliklari(h.vt, [urun])).get(urun);
    expect(aralik?.enDusuk.eskiTutar).toBeUndefined();
    expect(aralik?.tek).toBe(false);
  });

  it("bütün birleşimler aynı fiyattaysa tek fiyattır; basit ürünün aralığı kendi fiyatıdır", async () => {
    const h = await hazirla();
    const { urun, birimler } = await varyantliAc(h, [1, 1]);
    await fiyatlar(h, birimler, [59_990, 59_990]);
    expect(await uclar(h, urun)).toEqual([59_990, 59_990, true]);
    await h.fiyat.fiyatYaz(h.vt, yonetici(), h.birim, { satisFiyati: 4_990 });
    const [basit] = await h.vt
      .select({ urun: urunBirimleri.urun_kimligi })
      .from(urunBirimleri)
      .where(eq(urunBirimleri.kimlik, h.birim));
    expect(await uclar(h, basit?.urun ?? "")).toEqual([4_990, 4_990, true]);
  });

  it("uçlar gösterilecek fiyattır: indirimli tutar, vergi çevirmesi ve eski fiyatıyla", async () => {
    const h = await hazirla({ fiyatGosterimi: "vergi-haric" });
    const { urun, birimler } = await varyantliAc(h, [1, 1]);
    await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[0] ?? "", {
      satisFiyati: 20_000,
      indirimliFiyat: 10_000,
    });
    await fiyatlar(h, birimler, [undefined, 11_800]);
    const aralik = (await h.gosterim.fiyatAraliklari(h.vt, [urun])).get(urun);
    // 10000 dahil → 8475 hariç; 11800 dahil → 11800 × 18 / 118 = 1800 → 10000 hariç.
    expect([aralik?.enDusuk.tutar, aralik?.enDusuk.indirimde, aralik?.enYuksek.tutar]).toEqual([
      8_475,
      true,
      10_000,
    ]);
    expect(aralik?.enDusuk.vergi).toBe("vergi-haric");
    // Aralığın yazılışı uçların gösterilecek tutarıyla, sitenin para biçiminde, simge bir kez (kart 0109).
    const bicim = siteninBicimleyicisi(h.site.ayarlar);
    expect(aralik?.yaziliAralik).toBe(bicim.paraAraligi(8_475, 10_000, " – "));
    expect(aralik?.yaziliAralik.startsWith(bicim.para(8_475).replace(/\s*\D+$/, ""))).toBe(true);
  });

  // Kart 0109 (karar 0085): indirim rozetinin oranı. Kapalı ayarda eski fiyat indirimden önceki satış
  // fiyatıdır; oranlar elle hesaplanmıştır.
  describe("indirim oranı", () => {
    const araligi = async (h: Awaited<ReturnType<typeof hazirla>>, urun: string) =>
      (await h.gosterim.fiyatAraliklari(h.vt, [urun])).get(urun);

    it("oran aşağı yuvarlanır: 299,90'dan 225,00'a indirim yüzde 24,97 → 24", async () => {
      const h = await hazirla({ indirimdeEnDusukFiyat: false });
      const { urun, birimler } = await varyantliAc(h, [1]);
      await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[0] ?? "", {
        satisFiyati: 29_990,
        indirimliFiyat: 22_500,
      });
      expect((await araligi(h, urun))?.indirim).toEqual({ oran: 24, varan: false });
    });

    it("yüzde 1'in altındaki indirimin ve eski fiyatı gösterilmeyen indirimin oranı yoktur", async () => {
      const h = await hazirla({ indirimdeEnDusukFiyat: false });
      const { urun, birimler } = await varyantliAc(h, [1]);
      // 10000'den 9901'e: yüzde 0,99.
      await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[0] ?? "", {
        satisFiyati: 10_000,
        indirimliFiyat: 9_901,
      });
      const kucuk = await araligi(h, urun);
      expect(kucuk?.enDusuk.eskiTutar).toBe(10_000);
      expect(kucuk?.indirim).toBeUndefined();
      // Ayar açık ve önceki 30 günde fiyat yok: eski fiyat gösterilmez, rozet de çıkmaz.
      const acik = await hazirla();
      const ikinci = await varyantliAc(acik, [1]);
      await acik.fiyat.fiyatYaz(acik.vt, yonetici(), ikinci.birimler[0] ?? "", {
        satisFiyati: 20_000,
        indirimliFiyat: 10_000,
      });
      const gosterilmeyen = await araligi(acik, ikinci.urun);
      expect(gosterilmeyen?.enDusuk.indirimde).toBe(true);
      expect(gosterilmeyen?.enDusuk.eskiTutar).toBeUndefined();
      expect(gosterilmeyen?.indirim).toBeUndefined();
    });

    it("birleşimlerin oranları farklıysa en büyüğüne varan indirimdir; indirimsiz birleşim de farktır", async () => {
      const h = await hazirla({ indirimdeEnDusukFiyat: false });
      const { urun, birimler } = await varyantliAc(h, [1, 1, 1]);
      // 20000 → 15000 yüzde 25; 20000 → 18000 yüzde 10; üçüncüsü indirimsiz.
      await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[0] ?? "", {
        satisFiyati: 20_000,
        indirimliFiyat: 15_000,
      });
      await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[1] ?? "", {
        satisFiyati: 20_000,
        indirimliFiyat: 18_000,
      });
      await fiyatlar(h, birimler, [undefined, undefined, 20_000]);
      expect((await araligi(h, urun))?.indirim).toEqual({ oran: 25, varan: true });
    });

    it("bütün birleşimler aynı oranda indirimdeyse varan değildir; tükenmiş birleşimin oranı sayılmaz", async () => {
      const h = await hazirla({ indirimdeEnDusukFiyat: false });
      const { urun, birimler } = await varyantliAc(h, [1, 1, 0]);
      // İkisi yüzde 20 (farklı tutarlarda); tükenmiş üçüncüsü yüzde 50.
      const indirimler = [
        [10_000, 8_000],
        [20_000, 16_000],
        [20_000, 10_000],
      ] as const;
      for (const [i, [satisFiyati, indirimliFiyat]] of indirimler.entries()) {
        await h.fiyat.fiyatYaz(h.vt, yonetici(), birimler[i] ?? "", {
          satisFiyati,
          indirimliFiyat,
        });
      }
      const aralik = await araligi(h, urun);
      expect(aralik?.tek).toBe(false);
      expect(aralik?.indirim).toEqual({ oran: 20, varan: false });
    });

    it("indirimsiz ürünün oranı yoktur", async () => {
      const h = await hazirla();
      const { urun, birimler } = await varyantliAc(h, [1]);
      await fiyatlar(h, birimler, [10_000]);
      expect((await araligi(h, urun))?.indirim).toBeUndefined();
    });
  });

  it("fiyatı olmayan, olmayan ve bozuk ürün haritada yoktur; sorgu sayısı ürün sayısıyla artmaz", async () => {
    const h = await hazirla();
    const fiyatsiz = await varyantliAc(h, [1]);
    const urunlerde = await Promise.all([0, 1, 2].map(() => varyantliAc(h, [1, 1])));
    for (const u of urunlerde) await fiyatlar(h, u.birimler, [1_000, 2_000]);
    const kimlikler = urunlerde.map((u) => u.urun);
    const sonuc = await h.gosterim.fiyatAraliklari(h.vt, [
      ...kimlikler,
      fiyatsiz.urun,
      randomUUID(),
      "bozuk",
    ]);
    expect([...sonuc.keys()].toSorted()).toEqual(kimlikler.toSorted());
    const say = async (liste: string[]) => {
      const sorgu = vi.spyOn(h.vt.$client, "query");
      await h.gosterim.fiyatAraliklari(h.vt, liste);
      const sayi = sorgu.mock.calls.length;
      sorgu.mockRestore();
      return sayi;
    };
    expect(await say(kimlikler)).toBe(await say(kimlikler.slice(0, 1)));
  });
});
