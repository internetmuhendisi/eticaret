// Siparişin müşteriye gösterilen hâli gerçek veritabanıyla (kart 0238, karar 0145, 0150):
// - Siparişlerim yalnız hesabın kimliğiyle verilmiş siparişleri en yeni önce, sayfalı getirir; başka üyenin ve aynı
//   e-postayla üye olmadan verilmiş sipariş gelmez. Ayrıntı başka müşterinin, üye olmadan verilmiş ve olmayan
//   numarada null'dır. Sınır dışı sayfa son sayfaya çekilir.
// - İç not, iadenin nedeni ve açıklaması, başarısız iade ve yazanlar müşteriye gitmez; müşteriye not, geçmiş,
//   tamamlanan ve bekleyen iade gider; iade edilen adede yalnız tamamlanan iade sayılır.
// - Ürünün adı ve fiyatı sonradan değişince ayrıntı değişmez.
// - Takip: numara ve e-posta (harf büyüklüğü ayrımsız) eşleşince anahtar; eşleşmeyen e-posta, olmayan numara ve
//   kişisel bilgisi silinmiş sipariş aynı hatayı alır. Anahtarla okunan sipariş kısaltılmıştır (ad, soyad, telefon;
//   açık adres, posta kodu, fatura ve e-posta yok). Süresi dolan ve bozuk anahtar okumaz; yeni takip süresi
//   dolanları siler; kapatılan anahtar okumaz; kişisel bilgi silinince anahtar kapanır. Takipte mağazanın notu yoktur.
//   Bir sitenin siparişi başka sitede takip edilemez. İptal edilen siparişte iade edilen adet sıfırdır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { iadeServisi } from "../iade.ts";
import { siparisIadeleri, siparisler, siparisTakipErisimleri } from "../model.ts";
import { adiKisalt, musteriSiparisleri, telefonuKisalt } from "../musteri.ts";
import { erisimOzeti } from "../servis.ts";
import { kisiselVeriTemizligi } from "../temizlik.ts";
import { siparisYonetimi } from "../yonetim.ts";

vi.setConfig({ testTimeout: 90_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const firmaKimligi = randomUUID();
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
    odemeYontemleri: [
      { kod: "havale", acik: true },
      { kod: "kapida-odeme", acik: true },
    ],
    kapidaOdemeSecenekleri: ["nakit", "kart"],
    bankaHesaplari: [
      {
        kimlik: randomUUID(),
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
    kargoFirmalari: [
      {
        kimlik: firmaKimligi,
        ad: "Deneme Kargo",
        takipAdresi: "https://takip.deneme-kargo.test/sorgu/{takip}",
      },
    ],
  },
};
const odeme = odemeServisi(site);
const yonetim = siparisYonetimi(site);
const musteri = musteriSiparisleri();
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const hazirla = async (ad = "siparis-musteri") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async () => {
    const urun = await urunSrv.urunEkle(vt, yonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    await stok.stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return { urun, birim };
  };
  const musteriAc = async (eposta = `uye-${randomUUID().slice(0, 8)}@ornek.test`) =>
    (await hesapAc(vt, "musteri", { eposta, sifre: "uzun-bir-sifre-123" })).hesapKimligi;
  return { vt, urunAc, musteriAc };
};

const bilgiler = (odemeYontemi: OdemeYontemiSecimi) =>
  odemeBilgileriSemasi.parse({
    odemeYontemi,
    teslimat: {
      ad: "Deniz Can",
      soyad: "Yılmaz",
      telefon: "0555 000 00 42",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Atatürk Bulvarı No: 10",
        postaKodu: "06420",
      },
    },
    fatura: { tur: "bireysel", adresAyni: true },
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
  });

const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  ek: { musteri?: string; eposta?: string } = {},
) => {
  const kim: OdemeGirdisi["kim"] =
    ek.musteri === undefined
      ? { tur: "misafir", eposta: ek.eposta ?? "misafir@ornek.test", hesap: { ac: false } }
      : { tur: "uye", musteri: ek.musteri };
  const sonuc = await odeme.siparisVer(vt, { kim, bilgiler: bilgiler(kapida), kalemler }, 3600);
  return sonuc.siparis.numara;
};

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

// Siparişin sırası zamanla kurulur: aynı milisaniyede verilen siparişler kimlikle sıralanır, test sırayı zamanla
// ayırır.
const zamaniGeriAl = (vt: Veritabani, numara: string, saniye: number) =>
  vt.execute(
    sql`update siparisler set olusturma_zamani = olusturma_zamani - make_interval(secs => ${saniye}) where numara = ${numara}`,
  );

describe("Siparişlerim", () => {
  it("yalnız hesabın kimliğiyle verilmiş siparişler en yeni önce gelir; başka üyenin ve üye olmadan verilmiş sipariş gelmez", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const eposta = `uye-${randomUUID().slice(0, 8)}@ornek.test`;
    const a = await h.musteriAc(eposta);
    const b = await h.musteriAc();
    const eski = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    await zamaniGeriAl(h.vt, eski, 60);
    const yeni = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    const baskasinin = await ver(h.vt, [{ birim, adet: 1 }], { musteri: b });
    // Aynı e-postayla üye olmadan verilmiş sipariş (karar 0150).
    const uyesiz = await ver(h.vt, [{ birim, adet: 1 }], { eposta });

    const liste = await musteri.liste(h.vt, a, 1);
    expect(liste.toplam).toBe(2);
    expect(liste.siparisler.map((s) => s.numara)).toEqual([yeni, eski]);
    expect(liste.siparisler[1]).toMatchObject({
      durum: "odeme-bekleniyor",
      odemeYontemi: "kapida-odeme",
      kapidaSecenegi: "nakit",
      adet: 2,
      iadeToplami: 0,
      kalemler: [{ birim }],
    });
    expect(await musteri.ayrinti(h.vt, a, yeni)).toMatchObject({ numara: yeni });
    expect(await musteri.ayrinti(h.vt, a, baskasinin)).toBeNull();
    expect(await musteri.ayrinti(h.vt, a, uyesiz)).toBeNull();
    expect(await musteri.ayrinti(h.vt, a, "ORN-987654321")).toBeNull();
    expect(await musteri.ayrinti(h.vt, a, "bozuk")).toBeNull();
    expect((await musteri.liste(h.vt, b, 1)).siparisler.map((s) => s.numara)).toEqual([baskasinin]);
    expect(await musteri.liste(h.vt, await h.musteriAc(), 1)).toEqual({
      siparisler: [],
      toplam: 0,
      sayfa: 1,
    });
  });

  it("10'ar sayfa; sınır dışı sayfa son sayfaya, sıfır ilk sayfaya çekilir; ilk dört kalem gelir", async () => {
    const h = await hazirla();
    const birimler = await Promise.all([1, 2, 3, 4, 5].map(() => h.urunAc()));
    const a = await h.musteriAc();
    const numaralar: string[] = [];
    for (let i = 0; i < 11; i++) {
      const numara = await ver(
        h.vt,
        (i === 0 ? birimler : birimler.slice(0, 1)).map(({ birim }) => ({ birim, adet: 1 })),
        { musteri: a },
      );
      await zamaniGeriAl(h.vt, numara, 1000 - i);
      numaralar.push(numara);
    }
    const ilk = await musteri.liste(h.vt, a, 1);
    expect(ilk.toplam).toBe(11);
    expect(ilk.siparisler.map((s) => s.numara)).toEqual(numaralar.slice(1).reverse());
    const son = await musteri.liste(h.vt, a, 99);
    expect(son.sayfa).toBe(2);
    expect(son.siparisler.map((s) => s.numara)).toEqual([numaralar[0]]);
    expect(son.siparisler[0]?.adet).toBe(5);
    expect(son.siparisler[0]?.kalemler.map((k) => k.birim)).toEqual(
      birimler.slice(0, 4).map(({ birim }) => birim),
    );
    expect((await musteri.liste(h.vt, a, 0)).sayfa).toBe(1);
  });
});

describe("ayrıntı", () => {
  it("iç not, iade nedeni, başarısız iade ve yazanlar gitmez; müşteriye not, geçmiş, kargo ve tamamlanan iade gider", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 3 }], { musteri: a });
    const kim = {
      tur: "yonetici" as const,
      kimlik: (
        await hesapAc(h.vt, "yonetici", {
          eposta: `yonetici-${randomUUID().slice(0, 8)}@ornek.test`,
          sifre: "uzun-bir-sifre-123",
        })
      ).hesapKimligi,
    };
    await yonetim.notEkle(h.vt, kim, { numara, tur: "ic", metin: "İç not: müşteri zor" });
    await yonetim.notEkle(h.vt, kim, {
      numara,
      tur: "musteri",
      metin: "Hediye paketiyle gönderdik",
    });
    for (const [islem, gorulenDurum] of [
      ["hazirlamaya-al", "odeme-bekleniyor"],
      ["kargoya-ver", "hazirlaniyor"],
      ["teslim-edildi", "kargoda"],
    ] as const) {
      await yonetim.islemYap(h.vt, kim, {
        numara,
        islem,
        gorulenDurum,
        ...(islem === "kargoya-ver"
          ? { kargo: { firma: firmaKimligi, takipNumarasi: "ORK 1234" } }
          : {}),
      });
    }
    await iadeServisi(site).iadeYap(h.vt, yonetici(), {
      numara,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "kusurlu-hasarli",
      aciklama: "Gizli açıklama",
    });
    // Başarısız iade (para dönmedi) müşteriye görünmez.
    const [kayit] = await h.vt.select().from(siparisler).where(eq(siparisler.numara, numara));
    await h.vt.insert(siparisIadeleri).values({
      siparis_kimligi: kayit?.kimlik ?? "",
      tur: "iade",
      durum: "basarisiz",
      yontem: "elle",
      tutar: 500,
      vergi_dokumu: [],
      kalemler: [],
      kargo_tutari: 0,
      stoga_konacak: false,
      neden: "diger",
      kim_turu: "sistem",
      kim_adi: "deneme",
    });

    // Bekleyen iade (kuruluşun yanıtı beklenir) geçmişte görünür, iade edilen adede sayılmaz.
    await h.vt.insert(siparisIadeleri).values({
      siparis_kimligi: kayit?.kimlik ?? "",
      tur: "iade",
      durum: "bekliyor",
      yontem: "elle",
      tutar: 700,
      vergi_dokumu: [],
      kalemler: [{ sira: 0, adet: 1, tutar: 700 }],
      kargo_tutari: 0,
      stoga_konacak: false,
      neden: "diger",
      kim_turu: "sistem",
      kim_adi: "deneme",
    });
    const ayrinti = await musteri.ayrinti(h.vt, a, numara);
    expect(ayrinti?.durum).toBe("kismi-iade");
    expect(ayrinti?.notlar.map((n) => n.metin)).toEqual(["Hediye paketiyle gönderdik"]);
    expect(ayrinti?.gecmis.map((g) => g.neden)).toEqual([
      "olusturuldu",
      "hazirlamaya-alindi",
      "kargoya-verildi",
      "teslim-edildi",
      "iade-yapildi",
    ]);
    expect(ayrinti?.kargo).toMatchObject({
      firma: "Deneme Kargo",
      takipNumarasi: "ORK 1234",
      takipAdresi: "https://takip.deneme-kargo.test/sorgu/ORK%201234",
    });
    expect(ayrinti?.iadeler.map((iade) => iade.durum)).toEqual(["tamamlandi", "bekliyor"]);
    expect(ayrinti?.iadeler[0]).toMatchObject({
      tur: "iade",
      durum: "tamamlandi",
      kalemler: [{ sira: 0, adet: 1 }],
    });
    expect(ayrinti?.kalemler[0]?.iadeAdedi).toBe(1);
    const metin = JSON.stringify(ayrinti);
    for (const gizli of [
      "İç not",
      "Gizli açıklama",
      "kusurlu-hasarli",
      "yonetici-",
      "erisim",
      "oturum",
    ]) {
      expect(metin).not.toContain(gizli);
    }
    // Tam bilgiler hesapta görünür.
    expect(ayrinti?.teslimat).toMatchObject({
      ad: "Deniz Can",
      telefon: expect.stringContaining("42"),
    });
    expect(ayrinti?.teslimat.adres.adres).toBe("Atatürk Bulvarı No: 10");
    expect(ayrinti?.fatura).toMatchObject({ tur: "bireysel" });
    expect(ayrinti?.eposta).toMatch(/@ornek\.test$/);
  });

  it("iptal edilen siparişte ürünler iade edilmiş sayılmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    await iadeServisi(site).iadeYap(h.vt, yonetici(), {
      numara,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    const ayrinti = await musteri.ayrinti(h.vt, a, numara);
    expect(ayrinti?.durum).toBe("iptal");
    expect(ayrinti?.iadeler).toMatchObject([{ tur: "iptal", durum: "tamamlandi", tutar: 0 }]);
    expect(ayrinti?.kalemler.map((kalem) => kalem.iadeAdedi)).toEqual([0]);
  });

  it("ürünün adı ve fiyatı sonradan değişince ayrıntı değişmez", async () => {
    const h = await hazirla();
    const { urun, birim } = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    const once = await musteri.ayrinti(h.vt, a, numara);
    await urunSrv.urunDegistir(h.vt, yonetici(), urun, { ad: "Yepyeni ad" });
    await fiyat.fiyatYaz(h.vt, yonetici(), birim, { satisFiyati: 99_900 });
    const sonra = await musteri.ayrinti(h.vt, a, numara);
    expect(sonra?.kalemler[0]).toMatchObject({
      urun_adi: once?.kalemler[0]?.urun_adi,
      birim_tutari: 10_000,
      tutar: 20_000,
    });
    expect(sonra?.toplam).toBe(once?.toplam);
    expect(sonra?.vergiDokumu).toEqual(once?.vergiDokumu);
  });
});

describe("takip", () => {
  it("numara ve e-posta eşleşince anahtar verilir; okunan sipariş kısaltılmıştır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { eposta: "Deniz@Ornek.test" });
    // Mağazanın müşteriye notu takipte görünmez (nota kişisel bilgi yazılmış olabilir, karar 0150).
    await yonetim.notEkle(h.vt, yonetici(), { numara, tur: "musteri", metin: "Kapı kodu 1234" });
    const { anahtar } = await musteri.takipBaslat(h.vt, { numara, eposta: "DENIZ@ornek.TEST" });
    expect(anahtar).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const okunan = await musteri.takipleOku(h.vt, anahtar);
    expect(okunan?.numara).toBe(numara);
    expect(okunan?.teslimat).toEqual({
      ad: "D*** C***",
      soyad: "Y***",
      telefon: "42",
      adres: { ulke: "TR", adres: "", il: "TR-06", ilce: "TR-06-007" },
    });
    expect(okunan?.kisaltilmis).toBe(true);
    expect(okunan?.fatura).toBeNull();
    expect(okunan?.eposta).toBeNull();
    expect(JSON.stringify(okunan)).not.toContain("Atatürk");
    expect(JSON.stringify(okunan)).not.toContain("06420");
    expect(okunan?.notlar).toEqual([]);
    expect(JSON.stringify(okunan)).not.toContain("Kapı kodu");
  });

  it("eşleşmeyen e-posta, olmayan numara ve kişisel bilgisi silinmiş sipariş aynı hatayı alır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { eposta: "deniz@ornek.test" });
    const yanlis = await hatasi(musteri.takipBaslat(h.vt, { numara, eposta: "baska@ornek.test" }));
    const olmayan = await hatasi(
      musteri.takipBaslat(h.vt, { numara: "ORN-987654321", eposta: "deniz@ornek.test" }),
    );
    expect(yanlis).toEqual({ kod: "bulunamadi", ayrinti: undefined });
    expect(olmayan).toEqual(yanlis);
    // Kişisel bilgiler silinince e-posta boştur: hiçbir e-posta eşleşmez; açık takip anahtarı da kapanır.
    const { anahtar } = await musteri.takipBaslat(h.vt, { numara, eposta: "deniz@ornek.test" });
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - interval '40 years' where numara = ${numara}`,
    );
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    expect(await musteri.takipleOku(h.vt, anahtar)).toBeNull();
    expect(await hatasi(musteri.takipBaslat(h.vt, { numara, eposta: "deniz@ornek.test" }))).toEqual(
      yanlis,
    );
    expect(await hatasi(musteri.takipBaslat(h.vt, { numara, eposta: "" }))).toEqual(yanlis);
    expect(await h.vt.select().from(siparisTakipErisimleri)).toEqual([]);
  });

  it("süresi dolan ve bozuk anahtar okumaz; yeni takip süresi dolanları siler, açık olanı bırakır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { eposta: "deniz@ornek.test" });
    const girdi = { numara, eposta: "deniz@ornek.test" };
    const { anahtar: eski } = await musteri.takipBaslat(h.vt, girdi);
    const { anahtar: acik } = await musteri.takipBaslat(h.vt, girdi);
    // Bitiş veritabanının saatiyle 30 dakika sonradır.
    const [bitis] = (
      await h.vt.execute<{ fark: number }>(
        sql`select extract(epoch from max(bitis_zamani) - now())::int as fark from siparis_takip_erisimleri`,
      )
    ).rows;
    expect(bitis?.fark).toBeGreaterThan(1790);
    expect(bitis?.fark).toBeLessThanOrEqual(1800);
    await h.vt.execute(
      sql`update siparis_takip_erisimleri set bitis_zamani = now() - interval '1 second' where ozet = ${erisimOzeti(eski)}`,
    );
    expect(await musteri.takipleOku(h.vt, eski)).toBeNull();
    expect(await musteri.takipleOku(h.vt, acik)).not.toBeNull();
    expect(await musteri.takipleOku(h.vt, undefined)).toBeNull();
    expect(await musteri.takipleOku(h.vt, "kisa")).toBeNull();
    // Tek harfi değişmiş anahtar (son harf her zaman başka bir harfe çevrilir).
    expect(
      await musteri.takipleOku(h.vt, `${acik.slice(0, -1)}${acik.endsWith("A") ? "B" : "A"}`),
    ).toBeNull();
    await musteri.takipBaslat(h.vt, girdi);
    expect(await h.vt.select().from(siparisTakipErisimleri)).toHaveLength(2);
    expect(await musteri.takipleOku(h.vt, acik)).not.toBeNull();
  });

  it("takip kapatılınca anahtar okumaz; başka anahtar açık kalır; bozuk ve olmayan anahtar bir şey yapmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { eposta: "deniz@ornek.test" });
    const girdi = { numara, eposta: "deniz@ornek.test" };
    const { anahtar: kapanan } = await musteri.takipBaslat(h.vt, girdi);
    const { anahtar: kalan } = await musteri.takipBaslat(h.vt, girdi);
    await musteri.takipKapat(h.vt, undefined);
    await musteri.takipKapat(h.vt, "bozuk");
    await musteri.takipKapat(h.vt, kapanan);
    expect(await musteri.takipleOku(h.vt, kapanan)).toBeNull();
    expect(await musteri.takipleOku(h.vt, kalan)).not.toBeNull();
    expect(await h.vt.select().from(siparisTakipErisimleri)).toHaveLength(1);
  });

  it("bir sitenin siparişi başka sitede takip edilemez, başka sitede listelenmez", async () => {
    const h1 = await hazirla("siparis-musteri-1");
    const h2 = await hazirla("siparis-musteri-2");
    const { birim } = await h1.urunAc();
    const a = await h1.musteriAc();
    const numara = await ver(h1.vt, [{ birim, adet: 1 }], { eposta: "deniz@ornek.test" });
    await ver(h1.vt, [{ birim, adet: 1 }], { musteri: a });
    const { anahtar } = await musteri.takipBaslat(h1.vt, { numara, eposta: "deniz@ornek.test" });
    expect(
      await hatasi(musteri.takipBaslat(h2.vt, { numara, eposta: "deniz@ornek.test" })),
    ).toMatchObject({ kod: "bulunamadi" });
    expect(await musteri.takipleOku(h2.vt, anahtar)).toBeNull();
    expect((await musteri.liste(h2.vt, a, 1)).toplam).toBe(0);
  });
});

describe("kısaltma", () => {
  it("adın her sözcüğünün ilk harfi, telefonun son iki rakamı kalır", () => {
    expect(adiKisalt("  Deniz   Can ")).toBe("D*** C***");
    expect(adiKisalt("Ömer")).toBe("Ö***");
    expect(adiKisalt("")).toBe("");
    expect(telefonuKisalt("+90 555 000 00 42")).toBe("42");
    expect(telefonuKisalt("7")).toBe("");
  });
});
