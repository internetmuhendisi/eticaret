// Panelin kupon sorguları ve değişikliği gerçek veritabanıyla (kart 0313, karar 0188).
// - Liste: durum veritabanının saatiyle (kapalı önce, başlangıcı gelmemiş zamanlanmış, bitiş anı geçmiş süresi
//   dolmuş, öteki etkin); sayılar aramaya uyar, sekmeye uymaz; arama kodda ve adda, Türkçe harfsiz, jokersiz;
//   sıralamalar; kullanım siparişe bağlı ve geri verilmemiş kullanımdır.
// - Ayrıntı: özet (verilen indirim, kuponlu siparişlerin toplamı, iade sonrası net) yalnız sayılan kullanımlardan;
//   kullanıldığı siparişler iptal edileni de durumuyla, ad kısaltılmadan (ekran kısaltır), kişisel bilgisi silinmişte
//   adsız, sayfa sayfa.
// - Değişiklik: eski görülen anda çakışma ve hiçbir şey yazılmaz; aynı değer yazılmaz; kayda yalnız değişen alanlar;
//   kullanılmış kuponun kilitli alanları "kullanildi", süresi değişir; kapsamda kalan silinmiş kayıt değişikliği
//   engellemez, yeni eklenen silinmiş kayıt "kayit-yok"; kod başka kuponda varsa çakışma, kendisi sayılmaz.
// - Kurallar ve formun çevirisi: hatalar birlikte, alanın yoluyla.
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { yerelZamandan } from "../../../metinler/bicimleyici.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siparisler } from "../../siparis/model.ts";
import { urunler } from "../../urun/model.ts";
import { kuponlar } from "../model.ts";
import {
  kuponKullanimListesi,
  kuponPanelAyrintisi,
  kuponPanelListesi,
  panelKuponGirdisi,
} from "../panel.ts";
import { kuponServisi } from "../servis.ts";
import {
  bilgiler,
  hatasi,
  hazirla,
  iade,
  odeme,
  site,
  urunSrv,
  yapan,
} from "./siparis-hazirligi.ts";

vi.setConfig({ testTimeout: 90_000 });

const dil = { dil: site.ayarlar.dil };
const liste = (
  vt: Parameters<typeof kuponPanelListesi>[0],
  girdi: Partial<Parameters<typeof kuponPanelListesi>[1]> = {},
) => kuponPanelListesi(vt, { siralama: "yeni", sayfa: 1, sayfaBoyu: 25, ...girdi }, dil);

const iptalEt = (vt: Parameters<typeof kuponPanelListesi>[0], numara: string) =>
  iade.iadeYap(vt, yapan(), {
    numara,
    tur: "iptal",
    gorulenDurum: "odeme-bekleniyor",
    kalemler: [],
    kargo: false,
    stogaKoy: true,
    neden: "musteri-vazgecti",
  });

describe("kupon listesi", () => {
  it("durum veritabanının saatiyle; kapalı önce gelir; sayılar aramaya uyar, sekmeye uymaz", async () => {
    const h = await hazirla("kuponpanel1");
    const etkin = await h.kuponAc({ kod: "ETKIN" });
    const zaman = await h.kuponAc({ kod: "ZAMAN", baslangic: new Date(Date.now() + 3_600_000) });
    const bitti = await h.kuponAc({ kod: "BITTI" });
    const kapali = await h.kuponAc({
      kod: "KAPALI",
      acik: false,
      baslangic: new Date(Date.now() + 3_600_000),
    });
    // Bitiş anı geçmiş kupon süresi dolmuştur; bir saat sonrası etkin.
    await h.vt.execute(
      sql`update kuponlar set bitis_zamani = now() - interval '1 millisecond' where kimlik = ${bitti}`,
    );
    await h.vt.execute(
      sql`update kuponlar set bitis_zamani = now() + interval '1 hour' where kimlik = ${etkin}`,
    );
    const hepsi = await liste(h.vt);
    expect(Object.fromEntries(hepsi.satirlar.map((s) => [s.kimlik, s.durum]))).toEqual({
      [etkin]: "etkin",
      [zaman]: "zamanlanmis",
      [bitti]: "suresi-doldu",
      [kapali]: "kapali",
    });
    expect(hepsi.durumSayilari).toEqual({
      etkin: 1,
      zamanlanmis: 1,
      "suresi-doldu": 1,
      kapali: 1,
    });
    const sekme = await liste(h.vt, { durum: "zamanlanmis" });
    expect(sekme.satirlar.map((s) => s.kod)).toEqual(["ZAMAN"]);
    expect(sekme.toplam).toBe(1);
    // Sayılar aramaya uyar.
    expect((await liste(h.vt, { ara: "kap" })).durumSayilari).toEqual({
      etkin: 0,
      zamanlanmis: 0,
      "suresi-doldu": 0,
      kapali: 1,
    });
    // Silinmiş kupon listede yok.
    await h.vt
      .update(kuponlar)
      .set({ silinme_zamani: new Date() })
      .where(eq(kuponlar.kimlik, zaman));
    expect((await liste(h.vt)).toplam).toBe(3);
  });

  it("arama kodda ve adda, Türkçe harfsiz ve büyük harfle, kodun ortasından; % ve _ joker değil", async () => {
    const h = await hazirla("kuponpanel2");
    await h.kuponAc({ kod: "KASIM50", ad: "Yılbaşı öncesi" });
    await h.kuponAc({ kod: "YAZA", ad: "Yaz_10" });
    await h.kuponAc({ kod: "YAZB", ad: "Yaz110" });
    const kodlar = async (ara: string) =>
      (await liste(h.vt, { ara, siralama: "kod-artan" })).satirlar.map((s) => s.kod);
    expect(await kodlar("sim5")).toEqual(["KASIM50"]);
    expect(await kodlar("YILBASI")).toEqual(["KASIM50"]);
    expect(await kodlar("yılbaşı")).toEqual(["KASIM50"]);
    expect(await kodlar("_1")).toEqual(["YAZA"]);
    expect(await kodlar("%")).toEqual([]);
  });

  it("sıralamalar: son eklenen, kod, en çok kullanılan, bitişi en yakın (bitişsiz sonda)", async () => {
    const h = await hazirla("kuponpanel3");
    const a = await h.urunAc();
    await h.kuponAc({ kod: "CCC", bitis: new Date(Date.now() + 2 * 86_400_000) });
    await h.kuponAc({ kod: "AAA" });
    await h.kuponAc({ kod: "BBB", bitis: new Date(Date.now() + 86_400_000) });
    await h.ver([{ birim: a, adet: 1 }], "AAA", "a@ornek.test");
    await h.ver([{ birim: a, adet: 1 }], "AAA", "b@ornek.test");
    await h.ver([{ birim: a, adet: 1 }], "CCC", "c@ornek.test");
    const kodlar = async (siralama: Parameters<typeof liste>[1]["siralama"]) =>
      (await liste(h.vt, { siralama })).satirlar.map((s) => s.kod);
    expect(await kodlar("yeni")).toEqual(["BBB", "AAA", "CCC"]);
    expect(await kodlar("kod-artan")).toEqual(["AAA", "BBB", "CCC"]);
    expect(await kodlar("kullanim-azalan")).toEqual(["AAA", "CCC", "BBB"]);
    expect(await kodlar("bitis-artan")).toEqual(["BBB", "CCC", "AAA"]);
    expect((await liste(h.vt, { siralama: "kod-artan" })).satirlar.map((s) => s.kullanim)).toEqual([
      2, 0, 1,
    ]);
  });
});

describe("kuponun sayfası", () => {
  it("özet ve kullanım yalnız sayılan kullanımlardan; iptal edilen sipariş listede durumuyla, geri verilmiş", async () => {
    const h = await hazirla("kuponpanel4");
    const a = await h.urunAc();
    const kupon = await h.kuponAc({ toplamSinir: 10 });
    // 118,00 − 11,80 + 59,00 = 165,20.
    const ilk = await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "ilk@ornek.test");
    const iptal = await h.ver([{ birim: a, adet: 1 }], "YUZDE10", "iptal@ornek.test");
    const kismi = await h.ver([{ birim: a, adet: 2 }], "YUZDE10", "kismi@ornek.test");
    await iptalEt(h.vt, iptal);
    await h.teslimEt(kismi);
    // Kısmi iade: bir adetin ödeneni 106,20.
    await iade.iadeYap(h.vt, yapan(), {
      numara: kismi,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi",
    });
    const ayrinti = await kuponPanelAyrintisi(h.vt, kupon, dil);
    expect(ayrinti).toMatchObject({
      kullanim: 2,
      kullanildi: true,
      toplamSinir: 10,
      // İlk: 11,80; kısmi (2 adet): 23,60. İptal sayılmaz.
      ozet: {
        verilenIndirim: 3_540,
        siparisToplami: 16_520 + 27_140,
        iadeSonrasi: 16_520 + 27_140 - 10_620,
      },
    });
    // Süren ödemenin ayırması kullanıma girmez, ayrılan olarak sayılır (vitrin sınıra sayar).
    await odeme.odemeOturumuAc(
      h.vt,
      {
        kim: { tur: "misafir", eposta: "suren@ornek.test", hesap: { ac: false } },
        bilgiler: bilgiler(),
        kalemler: [{ birim: a, adet: 1 }],
        kupon: "YUZDE10",
      },
      3600,
    );
    expect(await kuponPanelAyrintisi(h.vt, kupon, dil)).toMatchObject({ kullanim: 2, ayrilan: 1 });
    const kullanimlar = await kuponKullanimListesi(h.vt, kupon, { sayfa: 1, sayfaBoyu: 25 });
    expect(
      kullanimlar.satirlar.map((s) => [s.numara, s.durum, s.geriVerildi, s.indirim, s.uye]),
    ).toEqual([
      [kismi, "kismi-iade", false, 2_360, false],
      [iptal, "iptal", true, 1_180, false],
      [ilk, "odeme-bekleniyor", false, 1_180, false],
    ]);
    expect(kullanimlar.satirlar[0]?.adSoyad).toBe("Deniz Yılmaz");
    // Sayfa sayfa; sınır dışı sayfa son sayfaya çekilir.
    const ikinci = await kuponKullanimListesi(h.vt, kupon, { sayfa: 9, sayfaBoyu: 2 });
    expect(ikinci).toMatchObject({ toplam: 3, sayfa: 2, sayfaSayisi: 2 });
    expect(ikinci.satirlar.map((s) => s.numara)).toEqual([ilk]);
    // Kişisel bilgisi silinmiş siparişte ad yoktur.
    await h.vt
      .update(siparisler)
      .set({ kisisel_veri_silinme_zamani: new Date() })
      .where(eq(siparisler.numara, ilk));
    expect(
      (await kuponKullanimListesi(h.vt, kupon, { sayfa: 2, sayfaBoyu: 2 })).satirlar[0]?.adSoyad,
    ).toBeNull();
    // Olmayan, bozuk ve silinmiş kupon yok.
    expect(await kuponPanelAyrintisi(h.vt, "bozuk", dil)).toBeNull();
    await h.vt
      .update(kuponlar)
      .set({ silinme_zamani: new Date() })
      .where(eq(kuponlar.kimlik, kupon));
    expect(await kuponPanelAyrintisi(h.vt, kupon, dil)).toBeNull();
  });
});

describe("kuponun değişikliği", () => {
  const degistir = (
    h: Awaited<ReturnType<typeof hazirla>>,
    kimlik: string,
    degisiklik: Parameters<ReturnType<typeof kuponServisi>["degistir"]>[3],
    gorulen: Date,
  ) =>
    h.vt.transaction((islem) =>
      kuponServisi(site).degistir(islem, yapan(), kimlik, degisiklik, gorulen),
    );
  const gorulenAn = async (h: Awaited<ReturnType<typeof hazirla>>, kimlik: string) => {
    const ayrinti = await kuponPanelAyrintisi(h.vt, kimlik, dil);
    if (ayrinti === null) throw new Error("Kupon yok.");
    return ayrinti.degismeZamani;
  };
  const kayitlari = (h: Awaited<ReturnType<typeof hazirla>>, kimlik: string) =>
    h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, kimlik))
      .orderBy(degisiklikKayitlari.zaman);

  it("eski görülen anda çakışma ve hiçbir şey yazılmaz; aynı değer yazılmaz; kayda yalnız değişen alanlar", async () => {
    const h = await hazirla("kuponpanel5");
    const kupon = await h.kuponAc({ toplamSinir: 5 });
    const ilk = await gorulenAn(h, kupon);
    const bitis = new Date(Date.now() + 86_400_000);
    const { degismeZamani } = await degistir(h, kupon, { bitis, toplamSinir: 5 }, ilk);
    expect(degismeZamani.getTime()).toBeGreaterThan(ilk.getTime());
    // Eski ekran: çakışma, kupon değişmez.
    expect(await hatasi(degistir(h, kupon, { acik: false }, ilk))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kupon", kod: "kupon-degisti" }],
    });
    const [satir] = await h.vt.select().from(kuponlar).where(eq(kuponlar.kimlik, kupon));
    expect(satir).toMatchObject({ acik: true, toplam_sinir: 5 });
    expect(satir?.bitis_zamani?.getTime()).toBe(bitis.getTime());
    // Aynı değer: hiçbir şey yazılmaz, değişme anı aynı kalır.
    const ayni = await degistir(h, kupon, { bitis, acik: true }, degismeZamani);
    expect(ayni.degismeZamani.getTime()).toBe(degismeZamani.getTime());
    const kayitlar = await kayitlari(h, kupon);
    expect(kayitlar.map((k) => k.islem)).toEqual(["kupon.eklendi", "kupon.degisti"]);
    expect(kayitlar[1]?.eski_deger).toEqual({ bitis: null });
    expect(kayitlar[1]?.yeni_deger).toEqual({ bitis: bitis.toISOString() });
  });

  it("kullanılmış kuponun kodu, türü, indirimi, kapsamı ve indirimde geçmezi değişmez; süresi, sınırı ve açıklığı değişir", async () => {
    const h = await hazirla("kuponpanel6");
    const a = await h.urunAc();
    const kupon = await h.kuponAc();
    await h.ver([{ birim: a, adet: 1 }], "YUZDE10");
    const an = await gorulenAn(h, kupon);
    expect(
      await hatasi(
        degistir(h, kupon, { kod: "YENI10", tur: "tutar", deger: 500, indirimdeGecmez: true }, an),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "kod", kod: "kullanildi" },
        { alan: "tur", kod: "kullanildi" },
        { alan: "deger", kod: "kullanildi" },
        { alan: "indirimdeGecmez", kod: "kullanildi" },
      ],
    });
    const urun = await urunSrv.urunEkle(h.vt, yapan(), { ad: "Kapsam", vergiSinifi: null });
    expect(
      await hatasi(degistir(h, kupon, { kapsam: "urunler", kapsamKayitlari: [urun] }, an)),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "kapsam", kod: "kullanildi" },
        { alan: "kapsamKayitlari", kod: "kullanildi" },
      ],
    });
    await degistir(h, kupon, { toplamSinir: 3, kisiBasiSinir: 1, acik: false, ad: "Yeni ad" }, an);
    const [satir] = await h.vt.select().from(kuponlar).where(eq(kuponlar.kimlik, kupon));
    expect(satir).toMatchObject({
      kod: "YUZDE10",
      deger: 10,
      toplam_sinir: 3,
      kisi_basi_sinir: 1,
      acik: false,
      ad: "Yeni ad",
    });
    // Adın kendisi kayda girmez.
    const kayit = (await kayitlari(h, kupon)).at(-1);
    expect(kayit?.yeni_deger).toMatchObject({ ad: "[ad]", acik: false });
  });

  it("kapsamda kalan silinmiş kayıt değişikliği engellemez; yeni eklenen silinmiş kayıt reddedilir; kod tekilliği kendisini saymaz", async () => {
    const h = await hazirla("kuponpanel7");
    const silinecek = await urunSrv.urunEkle(h.vt, yapan(), { ad: "Silinecek", vergiSinifi: null });
    const kalan = await urunSrv.urunEkle(h.vt, yapan(), { ad: "Kalan", vergiSinifi: null });
    const silinmis = await urunSrv.urunEkle(h.vt, yapan(), { ad: "Silinmiş", vergiSinifi: null });
    const kupon = await h.kuponAc({ kapsam: "urunler", kapsamKayitlari: [silinecek, kalan] });
    await h.kuponAc({ kod: "BASKA" });
    await h.vt
      .update(urunler)
      .set({ silinme_zamani: new Date() })
      .where(sql`${urunler.kimlik} in (${silinecek}, ${silinmis})`);
    let an = await gorulenAn(h, kupon);
    an = (await degistir(h, kupon, { toplamSinir: 7 }, an)).degismeZamani;
    expect(
      await hatasi(degistir(h, kupon, { kapsamKayitlari: [silinecek, kalan, silinmis] }, an)),
    ).toEqual({ kod: "dogrulama", ayrinti: [{ alan: "kapsamKayitlari", kod: "kayit-yok" }] });
    expect(await hatasi(degistir(h, kupon, { kod: "baska" }, an))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "kod", kod: "kod-var" }],
    });
    // Kendi kodunun harf büyüklüğü değişebilir (kullanılmamış kupon).
    await degistir(h, kupon, { kod: "yuzde10" }, an);
    // Listede kapsamın yalnız silinmemiş kayıtları sayılır; sayfa silinmişi işaretli gösterir.
    expect(await kuponPanelAyrintisi(h.vt, kupon, dil)).toMatchObject({
      kod: "yuzde10",
      kapsamSayisi: 1,
      kapsamKayitlari: expect.arrayContaining([
        expect.objectContaining({ kimlik: silinecek, silinmis: true }),
        expect.objectContaining({ kimlik: kalan, silinmis: false }),
      ]),
    });
  });

  it("kurallar: hatalar alanın yoluyla birlikte döner, hiçbir şey yazılmaz", async () => {
    const h = await hazirla("kuponpanel8");
    expect(
      await hatasi(
        h.kuponAc({
          kod: "AB",
          deger: 100,
          enAzTutar: -1,
          toplamSinir: 0,
          kisiBasiSinir: 1.5,
          baslangic: new Date("2026-12-02T00:00:00Z"),
          bitis: new Date("2026-12-01T00:00:00Z"),
          kapsam: "kategoriler",
        }),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [
        { alan: "kod", kod: "kod-gecersiz" },
        { alan: "deger", kod: "yuzde-gecersiz" },
        { alan: "enAzTutar", kod: "tutar-sinir-disi" },
        { alan: "toplamSinir", kod: "sayi-gecersiz" },
        { alan: "kisiBasiSinir", kod: "sayi-gecersiz" },
        { alan: "bitis", kod: "sure-ters" },
        { alan: "kapsamKayitlari", kod: "kapsam-bos" },
      ],
    });
    expect(await h.vt.select().from(kuponlar)).toEqual([]);
    await h.kuponAc({ deger: 99 });
    expect((await hatasi(h.kuponAc({ kod: "YUZDE0", deger: 0 }))).ayrinti).toEqual([
      { alan: "deger", kod: "yuzde-gecersiz" },
    ]);
    // Tutar kuponunun kendi hatası: sıfır ve sınırın üstü.
    for (const deger of [0, 100_000_000_01]) {
      expect((await hatasi(h.kuponAc({ kod: "TUTAR0", tur: "tutar", deger }))).ayrinti).toEqual([
        { alan: "deger", kod: "tutar-gecersiz" },
      ]);
    }
    expect(
      (await hatasi(h.kuponAc({ kod: "KARGO", tur: "ucretsiz-kargo", deger: 5 }))).ayrinti,
    ).toEqual([{ alan: "deger", kod: "deger-gecersiz" }]);
  });
});

describe("aynı anda aynı kod", () => {
  it("açık duran eklemenin arkasındaki aynı kod tekil indekste bekler, kod-var alır; değişiklikte de", async () => {
    const h = await hazirla("kuponpanel9");
    const ekle = (islem: Parameters<Parameters<typeof h.vt.transaction>[0]>[0], kod: string) =>
      kuponServisi(site).ekle(islem, yapan(), { kod, tur: "yuzde", deger: 10, kapsam: "hepsi" });
    let ikinci: Promise<unknown> | undefined;
    await h.vt.transaction(async (islem) => {
      await ekle(islem, "YARIS");
      ikinci = hatasi(h.vt.transaction((islem2) => ekle(islem2, "yaris")));
      await kilitBekleyeniGor(h.vt);
    });
    expect(await ikinci).toEqual({ kod: "cakisma", ayrinti: [{ alan: "kod", kod: "kod-var" }] });
    // Değişiklik: başka kuponun kodu, açık duran eklemenin arkasında.
    const baska = await h.kuponAc({ kod: "BASKA" });
    const an = (await kuponPanelAyrintisi(h.vt, baska, dil))?.degismeZamani ?? new Date();
    await h.vt.transaction(async (islem) => {
      await ekle(islem, "YARIS2");
      ikinci = hatasi(
        h.vt.transaction((islem2) =>
          kuponServisi(site).degistir(islem2, yapan(), baska, { kod: "yaris2" }, an),
        ),
      );
      await kilitBekleyeniGor(h.vt);
    });
    expect(await ikinci).toEqual({ kod: "cakisma", ayrinti: [{ alan: "kod", kod: "kod-var" }] });
    expect((await liste(h.vt)).toplam).toBe(3);
  });
});

describe("formun çevirisi", () => {
  it("tutar sitenin para biçimiyle, yüzde tam sayı, zaman sitenin saat diliminde; boş metin yok; hatalar birlikte", () => {
    expect(
      panelKuponGirdisi(site, {
        kod: " YAZ ",
        ad: "  ",
        tur: "tutar",
        deger: "1.250,5",
        enAzTutar: "",
        baslangic: "2026-12-01T09:00",
        bitis: "",
        toplamSinir: "100",
        kisiBasiSinir: "",
      }),
    ).toEqual({
      kod: " YAZ ",
      ad: null,
      tur: "tutar",
      deger: 125_050,
      enAzTutar: null,
      baslangic: yerelZamandan("2026-12-01T09:00", site.ayarlar.saatDilimi),
      bitis: null,
      toplamSinir: 100,
      kisiBasiSinir: null,
    });
    expect(panelKuponGirdisi(site, { tur: "yuzde", deger: "15" })).toEqual({
      tur: "yuzde",
      deger: 15,
    });
    expect(panelKuponGirdisi(site, { tur: "ucretsiz-kargo", deger: "" })).toEqual({
      tur: "ucretsiz-kargo",
      deger: 0,
    });
    let hata: unknown;
    try {
      panelKuponGirdisi(site, {
        kod: "",
        tur: "yuzde",
        deger: "10,5",
        enAzTutar: "abc",
        baslangic: "2026-13-01T09:00",
        bitis: "yarın",
        toplamSinir: "-1",
        kisiBasiSinir: "bir",
      });
    } catch (yakalanan) {
      hata = yakalanan;
    }
    expect(hata).toMatchObject({
      kod: "dogrulama",
      ayrinti: [
        { alan: "kod", kod: "kod-gecersiz" },
        { alan: "deger", kod: "yuzde-gecersiz" },
        { alan: "enAzTutar", kod: "tutar-okunamadi" },
        { alan: "baslangic", kod: "zaman-gecersiz" },
        { alan: "bitis", kod: "zaman-gecersiz" },
        { alan: "toplamSinir", kod: "sayi-gecersiz" },
        { alan: "kisiBasiSinir", kod: "sayi-gecersiz" },
      ],
    });
    expect(() => panelKuponGirdisi(site, { tur: "tutar", deger: "abc" })).toThrow();
  });
});
