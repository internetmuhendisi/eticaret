// Siparişin panelden yönetimi gerçek veritabanıyla (kart 0234, karar 0145):
// - Havale onayı yalnız havalede, hazırlamaya alma yalnız kapıda ödemede; onaylanan havaleyi iptal taraması iptal
//   etmez. Ödemenin alındığı an havalede onayda, kapıda ödemede teslimde yazılır.
// - Kargoya verme listedeki firmayla, takip numarası ve firmanın kalıbından kurulan takip adresiyle; firma listesi
//   sonradan değişse de sipariş değişmez. Kargo düzeltme durumu değiştirmez. Teslim edildi yalnız kargodan.
// - Ekranın gördüğü durum artık geçerli değilse "cakisma", hiçbir şey yazılmaz; açık duran işlemin arkasındaki işlem
//   satırın kilidinde bekler (sıra kurularak). Kayıtta olmayan geçişi serviste ve veritabanında tetikleyici reddeder;
//   tetikleyicinin geçişleri kayıtla aynıdır.
// - Her işlem geçmişe kim, neden ile yazılır; notlar değiştirilemez, ayrıntıda yazanın e-postasıyla gelir.
// - Liste durum süzgeci, sayıları, arama (joker yok), sayfası ve havale işaretiyle.
// - Yorum için satın alma yalnız teslim edilmiş siparişte sayılır.
// - Kargo firmaları listesi gördüğü hâliyle değişir; takip adresi denetlenir.
// - Saklama süresi dolan siparişin kişisel bilgileri silinir, yenisi kalır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { siparisDurumlari, siparisDurumTanimlari } from "../../../kayitlar/siparis.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { odemeOturumlari } from "../../odeme/model.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { satinAldiMi } from "../../yorum/satin-alma.ts";
import { siparisAyarlari } from "../ayarlar.ts";
import { havaleBildirimleri, siparisGecmisi, siparisler, siparisNotlari } from "../model.ts";
import { havaleBildirimiFormuSemasi, siparisListesiSemasi } from "../semalar.ts";
import { siparisServisi } from "../servis.ts";
import { kisiselVeriTemizligi } from "../temizlik.ts";
import { siparisYonetimi } from "../yonetim.ts";

vi.setConfig({ testTimeout: 90_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const hesapKimligi = randomUUID();
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
        kimlik: hesapKimligi,
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
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const fiyat = siteninFiyatServisi(site);
const stok = stokServisi();

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const sistemYonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const hazirla = async () => {
  const deneme = await denemeSitesiAc("siparis-yonetim");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async () => {
    const urun = await urunSrv.urunEkle(vt, sistemYonetici(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await fiyat.fiyatYaz(vt, sistemYonetici(), birim, { satisFiyati: 10_000 });
    await stok.stokDuzelt(vt, sistemYonetici(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return { urun, birim };
  };
  // Panelin yöneticisi: geçmişte e-postasıyla görünür.
  const yonetici = async (): Promise<{ tur: "yonetici"; kimlik: string; eposta: string }> => {
    const eposta = `yonetici-${randomUUID().slice(0, 8)}@ornek.test`;
    const { hesapKimligi: kimlik } = await hesapAc(vt, "yonetici", {
      eposta,
      sifre: "uzun-bir-sifre-123",
    });
    return { tur: "yonetici", kimlik, eposta };
  };
  const musteriAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  return { vt, urunAc, yonetici, musteriAc };
};

const bilgiler = (odemeYontemi: OdemeYontemiSecimi, ad = "Deniz") =>
  odemeBilgileriSemasi.parse({
    odemeYontemi,
    teslimat: {
      ad,
      soyad: "Yılmaz",
      telefon: "0555 000 00 00",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Atatürk Bulvarı No: 10",
        postaKodu: "06420",
      },
    },
    fatura: { tur: "bireysel", adresAyni: true },
    not: "Zil çalışmıyor",
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
  });

const havale: OdemeYontemiSecimi = { yontem: "havale" };
const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };

const ver = async (
  vt: Veritabani,
  birim: string,
  yontem: OdemeYontemiSecimi,
  ek: { musteri?: string; eposta?: string; ad?: string } = {},
) => {
  const kim: OdemeGirdisi["kim"] =
    ek.musteri === undefined
      ? { tur: "misafir", eposta: ek.eposta ?? "misafir@ornek.test", hesap: { ac: false } }
      : { tur: "uye", musteri: ek.musteri };
  const sonuc = await odeme.siparisVer(
    vt,
    { kim, bilgiler: bilgiler(yontem, ek.ad), kalemler: [{ birim, adet: 1 }] },
    3600,
  );
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

const oku = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};

const gecmisSayisi = async (vt: Veritabani) =>
  (await vt.execute<{ n: number }>(sql`select count(*)::int as n from siparis_gecmisi`)).rows[0]
    ?.n ?? 0;

describe("durum işlemleri", () => {
  it("havale onaylanır, ödeme anı yazılır, onaylanan havaleyi iptal taraması iptal etmez; havalede hazırlamaya alınmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, havale);
    const kim = await h.yonetici();
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, kim, {
          numara,
          islem: "hazirlamaya-al",
          gorulenDurum: "odeme-bekleniyor",
        }),
      ),
    ).toMatchObject({ kod: "is-kurali", ayrinti: [{ kod: "yontem-uymuyor" }] });
    expect(
      await yonetim.islemYap(h.vt, kim, {
        numara,
        islem: "havale-onayla",
        gorulenDurum: "odeme-bekleniyor",
      }),
    ).toEqual({
      numara,
      durum: "hazirlaniyor",
    });
    const satir = await oku(h.vt, numara);
    expect(satir.durum).toBe("hazirlaniyor");
    expect(satir.odeme_zamani).not.toBeNull();
    // Süre dolmuş olsa da onaylanan sipariş iptal olmaz.
    await h.vt.execute(
      sql`update siparisler set odeme_son_zamani = now() - interval '1 day' where numara = ${numara}`,
    );
    expect(await siparisServisi(site).havaleIptalTaramasi(h.vt)).toBe(0);
    expect((await oku(h.vt, numara)).durum).toBe("hazirlaniyor");
    const ayrinti = await yonetim.ayrinti(h.vt, numara);
    expect(ayrinti?.gecmis[0]).toMatchObject({
      onceki: "odeme-bekleniyor",
      sonraki: "hazirlaniyor",
      neden: "havale-onaylandi",
      yazan: { tur: "yonetici", eposta: kim.eposta },
    });
    expect(ayrinti?.siparis).not.toHaveProperty("erisim_ozeti");
  });

  it("kapıda ödeme hazırlamaya alınır, kargoya verilir, kargo düzeltilir, teslim edilir; ödeme teslimde alınır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    const kim = await h.yonetici();
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, kim, {
          numara,
          islem: "havale-onayla",
          gorulenDurum: "odeme-bekleniyor",
        }),
      ),
    ).toMatchObject({ kod: "is-kurali", ayrinti: [{ kod: "yontem-uymuyor" }] });
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    expect((await oku(h.vt, numara)).odeme_zamani).toBeNull();
    // Kargo bilgisi zorunludur; listede olmayan firma reddedilir.
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, kim, { numara, islem: "kargoya-ver", gorulenDurum: "hazirlaniyor" }),
      ),
    ).toMatchObject({ kod: "dogrulama", ayrinti: [{ kod: "kargo-gerekli" }] });
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, kim, {
          numara,
          islem: "kargoya-ver",
          gorulenDurum: "hazirlaniyor",
          kargo: { firma: randomUUID() },
        }),
      ),
    ).toMatchObject({ kod: "dogrulama", ayrinti: [{ alan: "kargo.firma", kod: "firma-yok" }] });
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi, takipNumarasi: "ORK 12/34" },
    });
    let satir = await oku(h.vt, numara);
    expect(satir).toMatchObject({
      durum: "kargoda",
      kargo_firmasi: "Deneme Kargo",
      takip_numarasi: "ORK 12/34",
      takip_adresi: "https://takip.deneme-kargo.test/sorgu/ORK%2012%2F34",
    });
    const kargoZamani = satir.kargo_zamani;
    expect(kargoZamani).not.toBeNull();
    // Firma listesi değişse de sipariş değişmez.
    await siparisAyarlari(site).kargoFirmalariniKaydet(h.vt, kim, {
      onceki: [firmaKimligi],
      firmalar: [{ kimlik: firmaKimligi, ad: "Yeni Ad" }],
    });
    expect((await oku(h.vt, numara)).kargo_firmasi).toBe("Deneme Kargo");
    // Düzeltme: takip numarası kalkar, durum ve kargo anı aynı kalır.
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargo-duzelt",
      gorulenDurum: "kargoda",
      kargo: { firma: firmaKimligi },
    });
    satir = await oku(h.vt, numara);
    expect(satir).toMatchObject({
      durum: "kargoda",
      kargo_firmasi: "Yeni Ad",
      takip_numarasi: null,
      takip_adresi: null,
    });
    expect(satir.kargo_zamani).toEqual(kargoZamani);
    // Kargodaki sipariş hazırlamaya alınamaz, teslim edilir; ödeme teslimde alınır.
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, kim, { numara, islem: "hazirlamaya-al", gorulenDurum: "kargoda" }),
      ),
    ).toMatchObject({ kod: "is-kurali", ayrinti: [{ kod: "gecis-yok" }] });
    await yonetim.islemYap(h.vt, kim, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
    satir = await oku(h.vt, numara);
    expect(satir.durum).toBe("teslim-edildi");
    expect(satir.teslim_zamani).not.toBeNull();
    expect(satir.odeme_zamani).not.toBeNull();
    const ayrinti = await yonetim.ayrinti(h.vt, numara);
    expect(ayrinti?.gecmis.map((g) => g.neden)).toEqual([
      "teslim-edildi",
      "kargo-duzeltildi",
      "kargoya-verildi",
      "hazirlamaya-alindi",
      "olusturuldu",
    ]);
  });

  it("ekranın gördüğü durum geçerli değilse çakışır ve hiçbir şey yazılmaz; olmayan sipariş bulunamadı", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, havale);
    const kim = await h.yonetici();
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    const once = await gecmisSayisi(h.vt);
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, kim, {
          numara,
          islem: "havale-onayla",
          gorulenDurum: "odeme-bekleniyor",
        }),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "durum-degisti" }] });
    expect(await gecmisSayisi(h.vt)).toBe(once);
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, kim, {
          numara: "XX-1",
          islem: "teslim-edildi",
          gorulenDurum: "kargoda",
        }),
      ),
    ).toMatchObject({ kod: "bulunamadi" });
  });

  it("açık duran işlemin arkasındaki işlem siparişin kilidinde bekler ve çakışır (sıra kurularak)", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    const kim = await h.yonetici();
    let birak = () => {};
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    let kilitlendi = () => {};
    const kilitli = new Promise<void>((tamam) => {
      kilitlendi = tamam;
    });
    const birinci = h.vt.transaction(async (islem) => {
      await islem.select().from(siparisler).where(eq(siparisler.numara, numara)).for("update");
      kilitlendi();
      await bekle;
      await islem.update(siparisler).set({ durum: "iptal" }).where(eq(siparisler.numara, numara));
    });
    await Promise.race([kilitli, birinci]);
    const ikinci = hatasi(
      yonetim.islemYap(h.vt, kim, {
        numara,
        islem: "hazirlamaya-al",
        gorulenDurum: "odeme-bekleniyor",
      }),
    );
    await kilitBekleyeniGor(h.vt);
    birak();
    await birinci;
    expect((await ikinci).kod).toBe("cakisma");
    expect((await oku(h.vt, numara)).durum).toBe("iptal");
  });

  it("veritabanı kayıtta olmayan geçişi reddeder; tetikleyicinin geçişleri kayıtla aynıdır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    const kim = await h.yonetici();
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi },
    });
    // Kargodaki sipariş iptal edilemez (karar 0145).
    await expect(
      h.vt.execute(sql`update siparisler set durum = 'iptal' where numara = ${numara}`),
    ).rejects.toThrow();
    await expect(
      h.vt.execute(sql`update siparisler set durum = 'odeme-bekleniyor' where numara = ${numara}`),
    ).rejects.toThrow();
    const tanim =
      (
        await h.vt.execute<{ tanim: string }>(
          sql`select pg_get_functiondef('siparis_durum_gecisi'::regproc) as tanim`,
        )
      ).rows[0]?.tanim ?? "";
    const tetikleyicide = [...tanim.matchAll(/\('([a-z-]+)', '([a-z-]+)'\)/g)].map(
      ([, a, b]) => `${a}>${b}`,
    );
    const kayitta = siparisDurumlari.flatMap((durum) =>
      siparisDurumTanimlari[durum].gecis.map((sonraki) => `${durum}>${sonraki}`),
    );
    expect(tetikleyicide.toSorted()).toEqual(kayitta.toSorted());
  });
});

describe("notlar", () => {
  it("iç not ve müşteriye not yazanıyla geçmişte görünür; değiştirilemez ve silinemez", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, havale);
    const kim = await h.yonetici();
    await yonetim.notEkle(h.vt, kim, { numara, tur: "ic", metin: "Paket yapılacak" });
    await yonetim.notEkle(h.vt, kim, {
      numara,
      tur: "musteri",
      metin: "Hediye paketiyle gönderdik",
    });
    const ayrinti = await yonetim.ayrinti(h.vt, numara);
    expect(ayrinti?.notlar.map((n) => [n.tur, n.metin, n.yazan])).toEqual([
      ["musteri", "Hediye paketiyle gönderdik", { tur: "yonetici", eposta: kim.eposta }],
      ["ic", "Paket yapılacak", { tur: "yonetici", eposta: kim.eposta }],
    ]);
    await expect(h.vt.execute(sql`update siparis_notlari set metin = 'x'`)).rejects.toThrow();
    await expect(h.vt.execute(sql`delete from siparis_notlari`)).rejects.toThrow();
    await expect(h.vt.execute(sql`truncate siparis_notlari`)).rejects.toThrow();
    expect(
      await hatasi(yonetim.notEkle(h.vt, kim, { numara: "XX-9", tur: "ic", metin: "x" })),
    ).toMatchObject({
      kod: "bulunamadi",
    });
    // Veritabanı türü ve boş notu reddeder.
    const [siparis] = await h.vt.select({ kimlik: siparisler.kimlik }).from(siparisler);
    await expect(
      h.vt.insert(siparisNotlari).values({
        siparis_kimligi: siparis?.kimlik ?? "",
        tur: "baska",
        metin: "x",
        kim_turu: "yonetici",
        kim_kimligi: kim.kimlik,
      }),
    ).rejects.toThrow();
  });
});

describe("liste", () => {
  it("durum süzgeci, sayılar, arama, sayfa ve havale işareti", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const kim = await h.yonetici();
    const birinci = await ver(h.vt, birim, havale, { eposta: "ayse@ornek.test", ad: "Ayşe" });
    const ikinci = await ver(h.vt, birim, kapida, { eposta: "mert%@ornek.test", ad: "Mert" });
    await yonetim.islemYap(h.vt, kim, {
      numara: ikinci,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta: "ayse@ornek.test" },
      havaleBildirimiFormuSemasi.parse({
        numara: birinci,
        gonderen: "Ayşe Yılmaz",
        hesap: hesapKimligi,
        tutar: "100,00",
        odemeTarihi: new Date().toISOString().slice(0, 10),
      }),
    );
    const liste = (girdi: Record<string, unknown>) =>
      yonetim.liste(h.vt, siparisListesiSemasi.parse(girdi));
    const hepsi = await liste({});
    expect(hepsi.satirlar.map((s) => s.numara)).toEqual([ikinci, birinci]);
    expect(hepsi.sayilar).toMatchObject({ "odeme-bekleniyor": 1, hazirlaniyor: 1, kargoda: 0 });
    expect(hepsi.satirlar.find((s) => s.numara === birinci)?.havaleBildirildi).toBe(true);
    expect(hepsi.satirlar.find((s) => s.numara === ikinci)).toMatchObject({
      uye: false,
      ad: "Mert",
      havaleBildirildi: false,
    });
    expect((await liste({ durum: "hazirlaniyor" })).satirlar.map((s) => s.numara)).toEqual([
      ikinci,
    ]);
    // Arama: numara, e-posta, ad soyad; "%" ve "_" joker değildir. Sayılar aramadan bağımsızdır.
    expect((await liste({ ara: "ayşe yıl" })).satirlar.map((s) => s.numara)).toEqual([birinci]);
    expect((await liste({ ara: birinci.toLowerCase() })).satirlar.map((s) => s.numara)).toEqual([
      birinci,
    ]);
    expect((await liste({ ara: "mert%" })).satirlar.map((s) => s.numara)).toEqual([ikinci]);
    expect((await liste({ ara: "%" })).satirlar.map((s) => s.numara)).toEqual([ikinci]);
    expect((await liste({ ara: "_" })).toplam).toBe(0);
    expect((await liste({ ara: "yok" })).sayilar.hazirlaniyor).toBe(1);
    // Sınır dışı sayfa son sayfaya çekilir.
    expect(await liste({ sayfa: 99 })).toMatchObject({ sayfa: 1, sayfaSayisi: 1, toplam: 2 });
  });
});

describe("satın alma", () => {
  it("yalnız teslim edilmiş siparişin ürünü satın alınmış sayılır", async () => {
    const h = await hazirla();
    const a = await h.urunAc();
    const b = await h.urunAc();
    const musteri = await h.musteriAc();
    const baska = await h.musteriAc();
    const kim = await h.yonetici();
    const numara = await ver(h.vt, a.birim, kapida, { musteri });
    expect(await satinAldiMi(h.vt, musteri, a.urun)).toBe(false);
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi },
    });
    expect(await satinAldiMi(h.vt, musteri, a.urun)).toBe(false);
    await yonetim.islemYap(h.vt, kim, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
    expect(await satinAldiMi(h.vt, musteri, a.urun)).toBe(true);
    expect(await satinAldiMi(h.vt, musteri.toUpperCase(), a.urun.toUpperCase())).toBe(true);
    expect(await satinAldiMi(h.vt, musteri, b.urun)).toBe(false);
    expect(await satinAldiMi(h.vt, baska, a.urun)).toBe(false);
  });
});

describe("kargo firmaları", () => {
  it("liste gördüğü hâliyle değişir; arada değişen liste çakışır; takip adresi denetlenir", async () => {
    const h = await hazirla();
    const kim = await h.yonetici();
    const ayarlar = siparisAyarlari(site);
    const sonuc = await ayarlar.kargoFirmalariniKaydet(h.vt, kim, {
      onceki: [firmaKimligi],
      firmalar: [
        { kimlik: firmaKimligi, ad: "Deneme Kargo" },
        { ad: "Elden teslim" },
        // Listede olmayan kimlik yeni firma sayılır.
        { kimlik: randomUUID(), ad: "Üçüncü", takipAdresi: "https://a.test/{takip}" },
      ],
    });
    expect(sonuc.kargoFirmalari.map((f) => f.ad)).toEqual([
      "Deneme Kargo",
      "Elden teslim",
      "Üçüncü",
    ]);
    expect(sonuc.kargoFirmalari[0]).toEqual({ kimlik: firmaKimligi, ad: "Deneme Kargo" });
    expect(new Set(sonuc.kargoFirmalari.map((f) => f.kimlik)).size).toBe(3);
    expect(
      await hatasi(
        ayarlar.kargoFirmalariniKaydet(h.vt, kim, { onceki: [firmaKimligi], firmalar: [] }),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "liste-degisti" }] });
    for (const takipAdresi of [
      "http://a.test/{takip}",
      "https://a.test/",
      "https://a.test/{takip}/{takip}",
    ]) {
      expect(
        await hatasi(
          ayarlar.kargoFirmalariniKaydet(h.vt, kim, {
            onceki: sonuc.kargoFirmalari.map((f) => f.kimlik),
            firmalar: [{ ad: "Bozuk", takipAdresi }],
          }),
        ),
      ).toMatchObject({
        kod: "dogrulama",
        ayrinti: [{ alan: "firmalar.0.takipAdresi", kod: "takip-adresi-gecersiz" }],
      });
    }
    expect((await ayarlar.oku(h.vt)).kargoFirmalari).toHaveLength(3);
  });
});

describe("kişisel verinin saklanması", () => {
  it("süresi dolan siparişin kişisel bilgileri silinir; tutarlar ve yenisi kalır; ikinci çalışma bir şey yapmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const eski = await ver(h.vt, birim, havale, { eposta: "eski@ornek.test" });
    const yeni = await ver(h.vt, birim, havale, { eposta: "yeni@ornek.test" });
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta: "eski@ornek.test" },
      havaleBildirimiFormuSemasi.parse({
        numara: eski,
        gonderen: "Deniz Yılmaz",
        hesap: hesapKimligi,
        tutar: "100,00",
        odemeTarihi: new Date().toISOString().slice(0, 10),
        not: "Akşam gönderdim",
      }),
    );
    const yil = site.ayarlar.kisiselVeriSaklamaYili;
    // Saklama süresinden bir gün eski ve bir gün yeni.
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${yil}, days => 1) where numara = ${eski}`,
    );
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${yil}) + interval '1 day' where numara = ${yeni}`,
    );
    const eskiOnce = await oku(h.vt, eski);
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    const eskiSonra = await oku(h.vt, eski);
    expect(eskiSonra).toMatchObject({
      eposta: "",
      not: null,
      teslimat: {
        ad: "",
        soyad: "",
        adres: { ulke: "TR", il: "TR-06", ilce: "TR-06-007", adres: "" },
      },
      fatura: { tur: "bireysel", adresAyni: true },
      toplam: eskiOnce.toplam,
      vergi_dokumu: eskiOnce.vergi_dokumu,
    });
    expect(eskiSonra.teslimat).not.toHaveProperty("telefon");
    expect(eskiSonra.teslimat.adres).not.toHaveProperty("postaKodu");
    expect(eskiSonra.kisisel_veri_silinme_zamani).not.toBeNull();
    const [oturum] = await h.vt
      .select()
      .from(odemeOturumlari)
      .where(eq(odemeOturumlari.kimlik, eskiSonra.oturum_kimligi));
    expect(oturum).toMatchObject({ eposta: "", not: null, teslimat: { ad: "" } });
    const [bildirimSatiri] = await h.vt.select().from(havaleBildirimleri);
    expect(bildirimSatiri).toMatchObject({ gonderen: "", not: null });
    expect((await oku(h.vt, yeni)).eposta).toBe("yeni@ornek.test");
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(0);
    // Geçmiş satırları değişmez.
    expect((await h.vt.select().from(siparisGecmisi)).length).toBeGreaterThan(0);
  });
});
