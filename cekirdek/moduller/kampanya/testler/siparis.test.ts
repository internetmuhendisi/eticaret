// Kuponlu ödeme, sipariş, iptal ve iade gerçek veritabanıyla (kart 0312, karar 0185, karar 0187). Site vergi dahil
// girişli (Genel yüzde 18); kargo 59,00 ve vergisiz (kargo sınıfı yok). Tutarlar elle hesaplanır.
// - Sipariş kuponun kodunu, türünü, indirimini ve kalemlerin payını saklar; kalemin vergisiz tutarı ve vergisi
//   kupondan sonradır; ara toplam − indirim + kargo toplamdır. Kullanım siparişe bağlanır.
// - Kişi başı sınır ödemede e-postayla sayılır; iptalde ve tam iadede hak geri verilir, kısmi iadede verilmez.
// - Kısmi iade kalemin ödenen tutarını döndürür; ücretsiz kargo kuponunda kargo iadesi yoktur.
// - Aynı anda dört siparişte toplam sınır (1) aşılmaz.
// - Kartla ödemede sipariş bankadan dönüşte kurulurken kupon oturumun açıldığı ana göre denetlenir; ayırmanın süresi
//   dolup sınır başkasınca doldurulduysa sipariş kurulmaz.
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { eklentiliSiparisiKur, SiparisKurulamadi } from "../../odeme/oturum-hesabi.ts";
import { siparisIadeleri, siparisler } from "../../siparis/model.ts";
import { kisiselVeriTemizligi } from "../../siparis/temizlik.ts";
import { kuponlar } from "../model.ts";
import { bilgiler, hatasi, hazirla, iade, odeme, site, yapan } from "./siparis-hazirligi.ts";

vi.setConfig({ testTimeout: 90_000 });

describe("kuponlu sipariş", () => {
  it("sipariş kuponu, indirimi ve kalemlerin payını saklar; vergi kupondan sonradır; kullanım siparişe bağlanır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc(23_600);
    await h.kuponAc();
    const numara = await h.ver(
      [
        { birim: a, adet: 1 },
        { birim: b, adet: 1 },
      ],
      "yuzde10",
    );
    const siparis = await h.oku(numara);
    // 354,00 × yüzde 10 = 35,40: 11,80 + 23,60. Kalanlar 106,20 ve 212,40; vergileri 16,20 ve 32,40.
    expect(siparis).toMatchObject({
      kupon_kodu: "YUZDE10",
      kupon_turu: "yuzde",
      kupon_indirimi: 3_540,
      kupon_kargo_indirimi: 0,
      ara_toplam: 35_400,
      kargo_turu: "ucretli",
      kargo_tutari: 5_900,
      vergi_toplami: 4_860,
      toplam: 37_760,
    });
    expect(siparis.kalemler.map((k) => [k.tutar, k.indirim, k.vergisiz, k.vergi])).toEqual([
      [11_800, 1_180, 9_000, 1_620],
      [23_600, 2_360, 18_000, 3_240],
    ]);
    expect(siparis.ara_toplam - siparis.kupon_indirimi + siparis.kargo_tutari).toBe(siparis.toplam);
    expect(await h.kullanimlar()).toEqual([
      expect.objectContaining({
        siparis_kimligi: siparis.kimlik,
        eposta: "misafir@ornek.test",
        serbest_zamani: null,
      }),
    ]);
  });

  it("kuponsuz sipariş kupon alanlarını boş bırakır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const siparis = await h.oku(await h.ver([{ birim: a, adet: 1 }], undefined));
    expect(siparis).toMatchObject({ kupon_kodu: null, kupon_turu: null, kupon_indirimi: 0 });
    expect(siparis.kalemler[0]?.indirim).toBe(0);
  });

  it("geçmeyen kupon onayı nedeniyle durdurur, hiçbir şey yazılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ enAzTutar: 50_000 });
    expect(await hatasi(h.ver([{ birim: a, adet: 1 }], "YUZDE10"))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "kupon", kod: "kupon-gecmedi", neden: "en-az", kalan: 38_200 }],
    });
    expect(await h.vt.select().from(siparisler)).toEqual([]);
    expect(await h.kullanimlar()).toEqual([]);
  });

  it("kişi başı sınır ödemede e-postayla (harf ayrımsız) sayılır; iptal hakkı geri verir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ kisiBasiSinir: 1 });
    const ilk = await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "Ayse@Ornek.Test");
    expect(await hatasi(h.ver([{ birim: a, adet: 1 }], "YUZDE10", "ayse@ornek.test"))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "kupon", kod: "kupon-gecmedi", neden: "kullanildi" }],
    });
    await iade.iadeYap(h.vt, yapan(), {
      numara: ilk,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    expect((await h.kullanimlar())[0]?.serbest_zamani).not.toBeNull();
    await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "ayse@ornek.test");
  });

  it("kısmi iade kalemin ödenen tutarını döndürür ve hakkı geri vermez; tam iade geri verir", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 1 });
    const numara = await h.ver([{ birim: a, adet: 2 }], "YUZDE10");
    // 236,00 − 23,60 = 212,40: kalem başına 106,20 (90,00 + 16,20).
    await h.teslimEt(numara);
    const girdi = {
      numara,
      tur: "iade" as const,
      gorulenDurum: "teslim-edildi" as const,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi" as const,
    };
    await iade.iadeYap(h.vt, yapan(), { ...girdi, kalemler: [{ sira: 0, adet: 1 }], kargo: false });
    const ilk = (await h.vt.select().from(siparisIadeleri))[0];
    expect(ilk).toMatchObject({ tutar: 10_620, kalemler: [{ sira: 0, adet: 1, tutar: 10_620 }] });
    expect(ilk?.vergi_dokumu.map((satir) => [satir.matrah, satir.vergi])).toEqual([[9_000, 1_620]]);
    expect((await h.kullanimlar())[0]?.serbest_zamani).toBeNull();
    // Kalan adet ve kargo: 106,20 + 59,00. Siparişin tamamı iade edildi, hak geri verilir.
    await iade.iadeYap(h.vt, yapan(), {
      ...girdi,
      gorulenDurum: "kismi-iade",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: true,
    });
    const iadeler = await h.vt.select().from(siparisIadeleri);
    expect(iadeler.map((satir) => satir.tutar).sort()).toEqual([10_620, 16_520]);
    expect((await h.oku(numara)).durum).toBe("iade-edildi");
    expect((await h.kullanimlar())[0]?.serbest_zamani).not.toBeNull();
    // Sınır (1) yeniden açıldı.
    await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "baska@ornek.test");
  });

  it("ücretsiz kargo kuponu: kargo ücretsiz, verilmeyen ücret saklanır; tam iade ödenen toplamdır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ kod: "KARGOBEDAVA", tur: "ucretsiz-kargo", deger: 0 });
    const numara = await h.ver([{ birim: a, adet: 1 }], "kargobedava");
    expect(await h.oku(numara)).toMatchObject({
      kupon_turu: "ucretsiz-kargo",
      kupon_indirimi: 0,
      kupon_kargo_indirimi: 5_900,
      kargo_turu: "ucretsiz",
      kargo_tutari: 0,
      toplam: 11_800,
    });
    await h.teslimEt(numara);
    await iade.iadeYap(h.vt, yapan(), {
      numara,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: true,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi",
    });
    expect((await h.vt.select().from(siparisIadeleri))[0]).toMatchObject({ tutar: 11_800 });
  });

  it("kişisel veri temizliği kullanımın e-postasını siler; kullanım siparişe bağlı ve sayılı kalır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 5 });
    const numara = await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "temizlik@ornek.test");
    const yil = site.ayarlar.kisiselVeriSaklamaYili;
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${yil}, days => 1) where numara = ${numara}`,
    );
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    expect(await h.kullanimlar()).toEqual([
      expect.objectContaining({ eposta: null, siparis_kimligi: (await h.oku(numara)).kimlik }),
    ]);
  });

  it("müşteri yeniden onaylayınca bir önceki oturumunun ayırması kişi başı ve toplam sınırı doldurmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ kisiBasiSinir: 1, toplamSinir: 1 });
    const ac = (onceki?: string) =>
      odeme.odemeOturumuAc(
        h.vt,
        {
          kim: { tur: "misafir", eposta: "tekrar@ornek.test", hesap: { ac: false } },
          bilgiler: bilgiler(),
          kalemler: [{ birim: a, adet: 1 }],
          kupon: "YUZDE10",
          onceki,
        },
        3600,
      );
    const ilk = await ac();
    const ikinci = await ac(ilk.oturum);
    expect((await h.kullanimlar()).map((satir) => satir.oturum_kimligi)).toEqual([ikinci.oturum]);
    // Bir önceki oturum verilmezse (başka sekme) kendi ayırması sınırı doldurur.
    expect(await hatasi(ac())).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "kupon", kod: "kupon-gecmedi", neden: "sinir-doldu" }],
    });
  });

  it("aynı anda dört siparişte toplam sınır (1) aşılmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 1 });
    const sonuclar = await Promise.allSettled(
      [1, 2, 3, 4].map((sira) => h.ver([{ birim: a, adet: 1 }], "YUZDE10", `k${sira}@ornek.test`)),
    );
    expect(sonuclar.filter((sonuc) => sonuc.status === "fulfilled")).toHaveLength(1);
    expect(await h.vt.select().from(siparisler)).toHaveLength(1);
    expect((await h.kullanimlar()).filter((satir) => satir.siparis_kimligi !== null)).toHaveLength(
      1,
    );
  });
});

describe("kartla ödemenin dönüşünde kupon", () => {
  const karttan = (h: Awaited<ReturnType<typeof hazirla>>, oturum: string, tutar: number) =>
    eklentiliSiparisiKur(
      h.vt,
      site,
      {
        oturum,
        odeme: { yontem: "kart" },
        tahsilat: { odenen: tutar, taksit: 1, odemeKimligi: randomUUID() },
        tutar,
        paraBirimi: site.ayarlar.paraBirimi,
      },
      { once: async () => {}, sonra: async () => {} },
    );
  const oturumAc = async (
    h: Awaited<ReturnType<typeof hazirla>>,
    birim: string,
    eposta: string,
  ) => {
    const { oturum } = await odeme.odemeOturumuAc(
      h.vt,
      {
        kim: { tur: "misafir", eposta, hesap: { ac: false } },
        bilgiler: bilgiler(),
        kalemler: [{ birim, adet: 1 }],
        kupon: "YUZDE10",
      },
      3600,
    );
    return oturum;
  };

  it("kupon oturumdan sonra bitse de sipariş oturumun açıldığı ana göre kurulur", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const kupon = await h.kuponAc({ toplamSinir: 1 });
    const oturum = await oturumAc(h, a, "kart@ornek.test");
    // Kullanım oturumla aynı işlemde, siparişe bağlanmadan ayrılır.
    expect(await h.kullanimlar()).toEqual([
      expect.objectContaining({
        oturum_kimligi: oturum,
        siparis_kimligi: null,
        kupon_kimligi: kupon,
      }),
    ]);
    await h.vt.update(kuponlar).set({ bitis_zamani: new Date() }).where(eq(kuponlar.kimlik, kupon));
    // 118,00 − 11,80 + 59,00.
    const siparis = await karttan(h, oturum, 16_520);
    expect(await h.oku(siparis.numara)).toMatchObject({ kupon_indirimi: 1_180, toplam: 16_520 });
  });

  it("ödeme sürerken mağaza kuponu kapatsa ya da silse de ayırması geçerli oturumun siparişi kurulur", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const kupon = await h.kuponAc();
    const kapali = await oturumAc(h, a, "kart1@ornek.test");
    await h.vt.update(kuponlar).set({ acik: false }).where(eq(kuponlar.kimlik, kupon));
    expect(await h.oku((await karttan(h, kapali, 16_520)).numara)).toMatchObject({
      kupon_kodu: "YUZDE10",
      kupon_indirimi: 1_180,
    });
    // Silinip aynı kodla yenisi açılsa da oturum kendi kuponunu kimliğiyle bulur.
    await h.vt.update(kuponlar).set({ acik: true }).where(eq(kuponlar.kimlik, kupon));
    const silinen = await oturumAc(h, a, "kart2@ornek.test");
    await h.vt
      .update(kuponlar)
      .set({ silinme_zamani: new Date() })
      .where(eq(kuponlar.kimlik, kupon));
    await h.kuponAc({ deger: 50 });
    const siparis = await h.oku((await karttan(h, silinen, 16_520)).numara);
    expect(siparis.kupon_indirimi).toBe(1_180);
    expect(
      (await h.kullanimlar()).filter((satir) => satir.siparis_kimligi === siparis.kimlik),
    ).toEqual([expect.objectContaining({ kupon_kimligi: kupon })]);
  });

  it("ayırması süresi dolmuş oturumda kapatılmış kupon geçmez, sipariş kurulmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const kupon = await h.kuponAc();
    const oturum = await oturumAc(h, a, "kart@ornek.test");
    await h.vt.execute(
      sql`update kupon_kullanimlari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    await h.vt.update(kuponlar).set({ acik: false }).where(eq(kuponlar.kimlik, kupon));
    await expect(karttan(h, oturum, 16_520)).rejects.toEqual(
      new SiparisKurulamadi("sepet-degisti"),
    );
  });

  it("ayırmanın süresi dolup sınır başkasınca doldurulduysa sipariş kurulmaz", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    await h.kuponAc({ toplamSinir: 1 });
    const oturum = await oturumAc(h, a, "kart@ornek.test");
    await h.vt.execute(
      sql`update kupon_kullanimlari set bitis_zamani = now() - interval '1 millisecond'`,
    );
    await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "baska@ornek.test");
    await expect(karttan(h, oturum, 16_520)).rejects.toEqual(
      new SiparisKurulamadi("sepet-degisti"),
    );
    expect(await h.vt.select().from(siparisler)).toHaveLength(1);
  });
});
