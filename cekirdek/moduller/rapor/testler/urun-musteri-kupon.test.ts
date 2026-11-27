// Ürün, müşteri ve kupon raporları gerçek veritabanıyla, elle hesaplanmış örneklerle (kart 0318, karar 0196):
// - Ürün: dönemde ödenen siparişlerin kalemleri (adet, kupon payı düşülmemiş tutar), dönemde tamamlanan iadelerin
//   adedi (satışı dönem dışında olsa da), seçenekli ürünün birleşimleri, tutar ve adet sırası, ödeme bekleyen sipariş
//   yok; ürün sonradan silinse ve adı değişse de siparişteki adıyla, silinmiş işaretiyle.
// - Müşteri: yeni ve dönen üye, üyelerin ve üye olmayanların sipariş sayısı, ödenmemiş sipariş yok; en çok alışveriş
//   yapanlar tutar sırasıyla; kişisel bilgisi silinmiş siparişler sayılır ama ad taşımaz; kapatılmış hesap işaretli.
// - Kupon: kupon başına kullanım, indirim, kuponlu satış ve iade sonrası (siparişin sonradan tamamlanan iadesi de
//   düşülür); dönem dışı ve kuponsuz sipariş yok; kuponlu siparişin payı için bütün siparişler.
// - İki site ayrıdır.
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { gunEkle, gununBasi } from "../../../metinler/bicimleyici.ts";
import { kuponServisi } from "../../kampanya/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { siparisIadeleri, siparisKalemleri, siparisler } from "../../siparis/model.ts";
import { urunServisi } from "../../urun/servis.ts";
import { kuponRaporu } from "../kupon.ts";
import { musteriRaporu } from "../musteri.ts";
import { urunRaporu } from "../urun.ts";
import {
  gun,
  hazirla,
  iade,
  iadeAni,
  ms,
  ode,
  oku,
  site,
  teslimEt,
  tz,
  ver,
  yapan,
} from "./ortak.ts";

vi.setConfig({ testTimeout: 120_000 });

const urunler = urunRaporu(site);
const musteriler = musteriRaporu(site);
const kuponlar = kuponRaporu(site);
const gunu = "2026-10-14";
const gunde = (fark = 3_600_000) => ms(gununBasi(gunu, tz), fark);
const oncekiGunde = () => ms(gununBasi(gunu, tz), -3_600_000);

const kalemTutari = async (vt: Parameters<typeof oku>[0], numara: string) => {
  const siparis = await oku(vt, numara);
  return vt
    .select()
    .from(siparisKalemleri)
    .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik))
    .orderBy(siparisKalemleri.sira);
};

describe("ürün raporu", () => {
  it("adet, tutar ve iade adedi elle hesaplanan örnekle; birleşimler, sıra, silinmiş ve adı değişmiş ürün", async () => {
    const h = await hazirla("rapor-urun");
    const a = await h.urunAc({ fiyat: 12_000 });
    const b = await h.varyantliUrunAc("Bedenli Ürün", { S: 5_000, M: 7_000 });
    // Dönemde ödenen: A×2 (biri iade edilir), A×1, B S×1, B M×3.
    const o1 = await ver(h.vt, [{ birim: a, adet: 2 }]);
    await ode(h.vt, o1, gunde());
    await ode(h.vt, await ver(h.vt, [{ birim: a, adet: 1 }]), gunde(7_200_000));
    const o3 = await ver(h.vt, [
      { birim: b.S, adet: 1 },
      { birim: b.M, adet: 3 },
    ]);
    await ode(h.vt, o3, gunde());
    // Dönem dışında ödenen A×1; iadesi dönemde tamamlanır (iade adedine girer, satışa girmez).
    const o4 = await ver(h.vt, [{ birim: a, adet: 1 }]);
    await ode(h.vt, o4, oncekiGunde());
    // Ödeme bekleyen A×5 sayılmaz.
    await ver(h.vt, [{ birim: a, adet: 5 }]);
    // o1'den 1 adet iade (teslimden sonra), o4 iptal; ikisi de dönemde tamamlanır.
    await teslimEt(h.vt, o1);
    await iade.iadeYap(h.vt, yapan(), {
      numara: o1,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi",
    });
    await iadeAni(h.vt, o1, gunde(10_800_000));
    await iade.iadeYap(h.vt, yapan(), {
      numara: o4,
      tur: "iptal",
      gorulenDurum: "hazirlaniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    await iadeAni(h.vt, o4, gunde(10_800_000));

    // Başarısız iade adede girmez: o1'in iadesinin başarısız kopyası.
    const o1Kaydi = await oku(h.vt, o1);
    const [o1Iadesi] = await h.vt
      .select()
      .from(siparisIadeleri)
      .where(eq(siparisIadeleri.siparis_kimligi, o1Kaydi.kimlik));
    if (o1Iadesi === undefined) throw new Error("İade yok.");
    const { kimlik: _kimlik, ...kopya } = o1Iadesi;
    await h.vt.insert(siparisIadeleri).values({ ...kopya, durum: "basarisiz" });
    const [kalemA] = await kalemTutari(h.vt, o1);
    const birimA = (kalemA?.tutar ?? 0) / 2;
    const [kalemS, kalemM] = await kalemTutari(h.vt, o3);
    const tutarS = kalemS?.tutar ?? 0;
    const tutarM = kalemM?.tutar ?? 0;
    // Elle: fiyatlar vergi dahil girilip gösterilir, kalem tutarı fiyat çarpı adettir.
    expect([birimA, tutarS, tutarM]).toEqual([12_000, 5_000, 21_000]);
    // Kalem tutarı birim tutarı çarpı adettir: A 3 adet, B 4 adet.
    expect(tutarM).toBe((kalemM?.birim_tutari ?? 0) * 3);

    const tutara = await urunler.satirlar(h.vt, gun(gunu), "tutar");
    expect(
      tutara.map(({ urun, adet, tutar, iadeAdedi }) => ({ urun, adet, tutar, iadeAdedi })),
    ).toEqual(
      [
        { urun: (await urunServisiOku(h.vt, a)).urun, adet: 3, tutar: birimA * 3, iadeAdedi: 2 },
        { urun: b.urun, adet: 4, tutar: tutarS + tutarM, iadeAdedi: 0 },
      ].toSorted((x, y) => y.tutar - x.tutar),
    );
    const satirB = tutara.find((satir) => satir.urun === b.urun);
    expect(satirB?.birlesimler.map(({ birim, adet, tutar }) => ({ birim, adet, tutar }))).toEqual([
      { birim: b.M, adet: 3, tutar: tutarM },
      { birim: b.S, adet: 1, tutar: tutarS },
    ]);
    expect(satirB?.birlesimler[0]?.secim).toEqual([{ secenek: "Beden", deger: "M" }]);
    // Basit ürünün birleşim satırı yoktur.
    expect(tutara.find((satir) => satir.urun !== b.urun)?.birlesimler).toEqual([]);
    // Adede göre: B (4) önce.
    expect((await urunler.satirlar(h.vt, gun(gunu), "adet"))[0]?.urun).toBe(b.urun);

    // Ürünün adı değişir ve ürün silinir: rapor siparişteki adı ve silinmiş işaretini gösterir.
    const servis = urunServisi(() => tz);
    const adA = kalemA?.urun_adi ?? "";
    const urunKimligiA = (await urunServisiOku(h.vt, a)).urun;
    await servis.urunDegistir(h.vt, yapan(), urunKimligiA, { ad: "Yeni Ad" });
    await servis.urunSil(h.vt, yapan(), urunKimligiA);
    const sonra = (await urunler.satirlar(h.vt, gun(gunu), "tutar")).find(
      (satir) => satir.urun === urunKimligiA,
    );
    expect(sonra).toMatchObject({ ad: adA, silindi: true, adet: 3 });
    expect((await urunler.satirlar(h.vt, gun(gunEkle(gunu, 1)), "tutar")).length).toBe(0);
  });
});

// Birimin ürünü.
const urunServisiOku = async (vt: Parameters<typeof oku>[0], birim: string) => {
  const [satir] = await vt
    .select({ urun: siparisKalemleri.urun_kimligi })
    .from(siparisKalemleri)
    .where(eq(siparisKalemleri.birim_kimligi, birim))
    .limit(1);
  if (satir === undefined) throw new Error("Birimin kalemi yok.");
  return satir;
};

describe("müşteri raporu", () => {
  it("yeni ve dönen üye, üye ve üye olmayan siparişler; en çok alışveriş yapanlar; silinmiş kişisel veri ve kapalı hesap", async () => {
    const h = await hazirla("rapor-musteri");
    const birim = await h.urunAc({ fiyat: 10_000 });
    const donen = await h.uyeAc();
    const yeni = await h.uyeAc();
    const odemeyen = await h.uyeAc();
    // Dönen: dönemden önce ödenmiş bir siparişi var.
    await ode(
      h.vt,
      await ver(h.vt, [{ birim, adet: 1 }], undefined, { musteri: donen }),
      ms(gununBasi(gunu, tz), -10 * 86_400_000),
    );
    // Dönenin tek siparişi 5 adet: tutarı yeninin iki siparişinden büyük (sıra tutarla, sipariş sayısıyla değil).
    const d1 = await ver(h.vt, [{ birim, adet: 5 }], undefined, { musteri: donen });
    await ode(h.vt, d1, gunde());
    // Yeni: dönemden önce yalnız ödenmemiş siparişi var; dönemde iki siparişi.
    await ver(h.vt, [{ birim, adet: 1 }], undefined, { musteri: yeni });
    const y1 = await ver(h.vt, [{ birim, adet: 2 }], undefined, { musteri: yeni });
    const y2 = await ver(h.vt, [{ birim, adet: 1 }], undefined, { musteri: yeni });
    await ode(h.vt, y1, gunde());
    await ode(h.vt, y2, gunde(60_000));
    // Ödemeyen üye sayılmaz; üye olmayan bir sipariş.
    await ver(h.vt, [{ birim, adet: 1 }], undefined, { musteri: odemeyen });
    await ode(h.vt, await ver(h.vt, [{ birim, adet: 1 }]), gunde());

    expect(await musteriler.ozet(h.vt, gun(gunu))).toEqual({
      yeni: 1,
      donen: 1,
      uyeSiparisi: 3,
      misafirSiparisi: 1,
    });
    const toplam = async (...numaralar: string[]) => {
      let sonuc = 0;
      for (const numara of numaralar) sonuc += (await oku(h.vt, numara)).toplam;
      return sonuc;
    };
    const liste = await musteriler.enCokAlanlar(h.vt, gun(gunu));
    expect(await toplam(d1)).toBeGreaterThan(await toplam(y1, y2));
    expect(liste).toEqual([
      {
        musteri: donen,
        ad: "Deniz Yılmaz",
        hesapKapali: false,
        siparisSayisi: 1,
        tutar: await toplam(d1),
      },
      {
        musteri: yeni,
        ad: "Deniz Yılmaz",
        hesapKapali: false,
        siparisSayisi: 2,
        tutar: await toplam(y1, y2),
      },
    ]);

    // Kişisel bilgisi silinmiş siparişler sayılır ama ad taşımaz; kapatılmış hesap işaretlidir.
    await h.vt
      .update(siparisler)
      .set({ kisisel_veri_silinme_zamani: sql`now()` })
      .where(eq(siparisler.musteri_kimligi, donen));
    await h.vt.execute(sql`update musteriler set silinme_zamani = now() where kimlik = ${yeni}`);
    const sonra = await musteriler.enCokAlanlar(h.vt, gun(gunu));
    expect(
      sonra.map(({ musteri, ad, hesapKapali, siparisSayisi }) => ({
        musteri,
        ad,
        hesapKapali,
        siparisSayisi,
      })),
    ).toEqual([
      { musteri: donen, ad: null, hesapKapali: false, siparisSayisi: 1 },
      { musteri: yeni, ad: "Deniz Yılmaz", hesapKapali: true, siparisSayisi: 2 },
    ]);
    expect((await musteriler.ozet(h.vt, gun(gunu))).donen).toBe(1);
  });
});

describe("kupon raporu", () => {
  it("kupon başına kullanım, indirim, kuponlu satış ve iade sonrası; dönem dışı ve kuponsuz sipariş yok", async () => {
    const h = await hazirla("rapor-kupon");
    const birim = await h.urunAc({ fiyat: 20_000 });
    const kupon = (kod: string) =>
      h.vt.transaction((islem) =>
        kuponServisi(site).ekle(islem, yapan(), { kod, tur: "yuzde", deger: 10, kapsam: "hepsi" }),
      );
    await siteninServisi(site).degistir(h.vt, yapan(), { kargoUcreti: 5_900 });
    const k1 = await kupon("RAPOR10");
    const k2 = await kupon("BASKA10");
    const k3 = await h.vt.transaction((islem) =>
      kuponServisi(site).ekle(islem, yapan(), {
        kod: "KARGO",
        tur: "ucretsiz-kargo",
        deger: 0,
        kapsam: "hepsi",
      }),
    );
    const a = await ver(h.vt, [{ birim, adet: 1 }], undefined, { kupon: "RAPOR10" });
    const b = await ver(h.vt, [{ birim, adet: 2 }], undefined, { kupon: "rapor10" });
    const c = await ver(h.vt, [{ birim, adet: 1 }], undefined, { kupon: "BASKA10" });
    const kuponsuz = await ver(h.vt, [{ birim, adet: 1 }]);
    const disari = await ver(h.vt, [{ birim, adet: 1 }], undefined, { kupon: "RAPOR10" });
    const sa = await ode(h.vt, a, gunde());
    const sb = await ode(h.vt, b, gunde());
    const sc = await ode(h.vt, c, gunde());
    const sk = await ode(h.vt, kuponsuz, gunde());
    const kargo = await ver(h.vt, [{ birim, adet: 1 }], undefined, { kupon: "KARGO" });
    const sg = await ode(h.vt, kargo, gunde());
    expect([sg.kupon_indirimi, sg.kupon_kargo_indirimi]).toEqual([0, 5_900]);
    await ode(h.vt, disari, oncekiGunde());
    // b sonradan (dönemden sonra) iptal edilir: iade sonrasından düşer.
    await iade.iadeYap(h.vt, yapan(), {
      numara: b,
      tur: "iptal",
      gorulenDurum: "hazirlaniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    await iadeAni(h.vt, b, gunde(20 * 86_400_000));
    // b'nin iadesi taksit farkıyla toplamını aşar: iade sonrası eksiye inmez. a'nın başarısız iadesi düşülmez.
    const kayitB = await oku(h.vt, b);
    await h.vt
      .update(siparisIadeleri)
      .set({ tutar: sql`${siparisIadeleri.tutar} + 500` })
      .where(eq(siparisIadeleri.siparis_kimligi, kayitB.kimlik));
    const [iadeB] = await h.vt
      .select()
      .from(siparisIadeleri)
      .where(eq(siparisIadeleri.siparis_kimligi, kayitB.kimlik));
    if (iadeB === undefined) throw new Error("İade yok.");
    const { kimlik: _k, ...kopyaB } = iadeB;
    await h.vt
      .insert(siparisIadeleri)
      .values({ ...kopyaB, siparis_kimligi: sa.kimlik, durum: "basarisiz", tutar: 1_000 });
    const indirim = (s: typeof sa) => s.kupon_indirimi + s.kupon_kargo_indirimi;
    // Elle: yüzde 10, 20.000'lik ürün başına 2.000.
    expect([indirim(sa), indirim(sb), indirim(sc)]).toEqual([2_000, 4_000, 2_000]);

    expect(await kuponlar.ozet(h.vt, gun(gunu))).toEqual({
      kuponluSiparis: 4,
      butunSiparis: 5,
      indirim: indirim(sa) + indirim(sb) + indirim(sc) + 5_900,
      satis: sa.toplam + sb.toplam + sc.toplam + sg.toplam,
      iadeSonrasi: sa.toplam + sc.toplam + sg.toplam,
    });
    expect(sk.kupon_kodu).toBeNull();
    expect(await kuponlar.satirlar(h.vt, gun(gunu))).toEqual([
      {
        kupon: k1,
        kod: "RAPOR10",
        kullanim: 2,
        indirim: indirim(sa) + indirim(sb),
        satis: sa.toplam + sb.toplam,
        iadeSonrasi: sa.toplam,
      },
      {
        kupon: k3,
        kod: "KARGO",
        kullanim: 1,
        indirim: 5_900,
        satis: sg.toplam,
        iadeSonrasi: sg.toplam,
      },
      {
        kupon: k2,
        kod: "BASKA10",
        kullanim: 1,
        indirim: indirim(sc),
        satis: sc.toplam,
        iadeSonrasi: sc.toplam,
      },
    ]);
  });
});

describe("iki site", () => {
  it("bir sitenin siparişi öteki sitenin raporlarında yok", async () => {
    const birinci = await hazirla("rapor-iki-a");
    const ikinci = await hazirla("rapor-iki-b");
    const birim = await birinci.urunAc();
    await ode(birinci.vt, await ver(birinci.vt, [{ birim, adet: 1 }]), gunde());
    expect((await urunler.satirlar(birinci.vt, gun(gunu), "tutar")).length).toBe(1);
    expect(await urunler.satirlar(ikinci.vt, gun(gunu), "tutar")).toEqual([]);
    expect(await musteriler.ozet(ikinci.vt, gun(gunu))).toEqual({
      yeni: 0,
      donen: 0,
      uyeSiparisi: 0,
      misafirSiparisi: 0,
    });
    expect(await kuponlar.satirlar(ikinci.vt, gun(gunu))).toEqual([]);
  });
});
