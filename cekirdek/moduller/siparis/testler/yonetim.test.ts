// Siparişin panelden yönetimi gerçek veritabanıyla (kart 0234, karar 0145):
// - Havale onayı yalnız havalede, hazırlamaya alma yalnız kapıda ödemede; onaylanan havaleyi iptal taraması iptal
//   etmez. Ödemenin alındığı an havalede onayda, kapıda ödemede teslimde yazılır.
// - Kargoya verme listedeki firmayla, takip numarası ve firmanın kalıbından kurulan takip adresiyle; firma listesi
//   sonradan değişse de sipariş değişmez. Kargo düzeltme durumu değiştirmez. Teslim edildi yalnız kargodan.
// - Ekranın gördüğü durum artık geçerli değilse "cakisma", hiçbir şey yazılmaz; açık duran işlemin arkasındaki işlem
//   satırın kilidinde bekler (sıra kurularak). Kayıtta olmayan geçişi serviste ve veritabanında tetikleyici reddeder;
//   tetikleyicinin geçişleri kayıtla aynıdır.
// - Her işlem geçmişe kim, neden ile yazılır; notlar değiştirilemez, ayrıntıda yazanın e-postasıyla gelir.
// - Liste durum süzgeci, sayıları, arama (joker yok), sayfası ve havale işaretiyle; tarih (saat dilimi, gece yarısı,
//   yaz saati), bakılması gereken işler ve kargo firması süzgeçleri (kart 0267).
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
import { yapilabilirIslemler } from "../../../kayitlar/siparis.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { odemeOturumlari } from "../../odeme/model.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { yorumlar } from "../../yorum/model.ts";
import { satinAldiMi } from "../../yorum/satin-alma.ts";
import { yorumServisi } from "../../yorum/servis.ts";
import { siparisAyarlari } from "../ayarlar.ts";
import { havaleBildirimiFormuSemasi } from "../havale-bildirimi-semalari.ts";
import {
  havaleBildirimleri,
  siparisGecmisi,
  siparisIadeleri,
  siparisIadeTalepleri,
  siparisler,
  siparisNotlari,
} from "../model.ts";
import {
  kargoFirmalariSemasi,
  siparisListesiSemasi,
  siparisTopluIslemiSemasi,
} from "../semalar.ts";
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

const kurumsalFatura = {
  tur: "kurumsal",
  firma: "Deniz Yılmaz Ticaret",
  vergiDairesi: "Çankaya",
  vergiNumarasi: "1111111114",
  adresAyni: false,
  adres: {
    ulke: "TR",
    il: "TR-06",
    ilce: "TR-06-007",
    adres: "İş Sokak No: 5",
    postaKodu: "06510",
  },
};

const bilgiler = (
  odemeYontemi: OdemeYontemiSecimi,
  ad = "Deniz",
  fatura: object = { tur: "bireysel", adresAyni: true },
) =>
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
    fatura,
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
  ek: { musteri?: string; eposta?: string; ad?: string; fatura?: object } = {},
) => {
  const kim: OdemeGirdisi["kim"] =
    ek.musteri === undefined
      ? { tur: "misafir", eposta: ek.eposta ?? "misafir@ornek.test", hesap: { ac: false } }
      : { tur: "uye", musteri: ek.musteri };
  const sonuc = await odeme.siparisVer(
    vt,
    { kim, bilgiler: bilgiler(yontem, ek.ad, ek.fatura), kalemler: [{ birim, adet: 1 }] },
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

  it("veritabanı kayıtta olmayan geçişi reddeder", async () => {
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
    // Tetikleyicinin geçişlerinin kayıtla aynı olduğu durum.test.ts'tedir.
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
    // Aramanın harf kuralı: Türkçe harfsiz ve büyük harfle de bulur.
    expect((await liste({ ara: "AYSE YIL" })).satirlar.map((s) => s.numara)).toEqual([birinci]);
    expect((await liste({ ara: birinci.toLowerCase() })).satirlar.map((s) => s.numara)).toEqual([
      birinci,
    ]);
    expect((await liste({ ara: "mert%" })).satirlar.map((s) => s.numara)).toEqual([ikinci]);
    expect((await liste({ ara: "%" })).satirlar.map((s) => s.numara)).toEqual([ikinci]);
    expect((await liste({ ara: "_" })).toplam).toBe(0);
    expect((await liste({ ara: "yok" })).sayilar.hazirlaniyor).toBe(1);
    // Havale onaylanınca bildirim artık bakılacak iş değildir: işaret kalkar.
    await yonetim.islemYap(h.vt, kim, {
      numara: birinci,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    expect((await liste({})).satirlar.find((s) => s.numara === birinci)?.havaleBildirildi).toBe(
      false,
    );
    // Sınır dışı sayfa son sayfaya çekilir.
    expect(await liste({ sayfa: 99 })).toMatchObject({ sayfa: 1, sayfaSayisi: 1, toplam: 2 });
  });
  it("ödeme yöntemi süzgeci sayılara da uyar, dört sıralama, sayfa başına satır ve sayfa sınırları (kart 0258)", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const kapidakiler: string[] = [];
    for (let i = 0; i < 3; i++) kapidakiler.push(await ver(h.vt, birim, kapida));
    const havaledeki = await ver(h.vt, birim, havale);
    // Tutarlar farklı olsun: havaledeki en pahalı, ilk kapıdaki en ucuz.
    await h.vt.update(siparisler).set({ toplam: 99_000 }).where(eq(siparisler.numara, havaledeki));
    await h.vt
      .update(siparisler)
      .set({ toplam: 100 })
      .where(eq(siparisler.numara, kapidakiler[0] ?? ""));
    const liste = (girdi: Record<string, unknown>) =>
      yonetim.liste(h.vt, siparisListesiSemasi.parse(girdi));
    const numaralar = async (girdi: Record<string, unknown>) =>
      (await liste(girdi)).satirlar.map((s) => s.numara);

    const yalnizKapida = await liste({ odeme: ["kapida-odeme"] });
    expect(yalnizKapida.toplam).toBe(3);
    expect(yalnizKapida.sayilar["odeme-bekleniyor"]).toBe(3);
    expect((await liste({ odeme: ["kapida-odeme", "havale"] })).toplam).toBe(4);
    expect((await liste({ odeme: ["kart"] })).toplam).toBe(0);
    expect((await liste({ odeme: ["kart"] })).sayilar["odeme-bekleniyor"]).toBe(0);

    expect(await numaralar({})).toEqual([havaledeki, ...kapidakiler.toReversed()]);
    expect(await numaralar({ siralama: "en-eski" })).toEqual([...kapidakiler, havaledeki]);
    expect((await numaralar({ siralama: "tutar-azalan" }))[0]).toBe(havaledeki);
    expect((await numaralar({ siralama: "tutar-artan" }))[0]).toBe(kapidakiler[0]);

    // Sayfa başına satır yalnız ayarın seçenekleri; sınır dışı sayfa son sayfaya çekilir.
    expect(() => siparisListesiSemasi.parse({ sayfaBoyu: 20 })).toThrow();
    const ilk = await liste({ sayfaBoyu: 25 });
    expect(ilk).toMatchObject({ sayfa: 1, sayfaSayisi: 1, sayfaBoyu: 25, toplam: 4 });
    for (let i = 0; i < 23; i++) await ver(h.vt, birim, kapida);
    expect(await liste({ sayfa: 2 })).toMatchObject({ sayfa: 2, sayfaSayisi: 2, toplam: 27 });
    expect((await liste({ sayfa: 2 })).satirlar).toHaveLength(2);
    expect(await liste({ sayfa: 9 })).toMatchObject({ sayfa: 2 });
    expect((await liste({ sayfa: 1, sayfaBoyu: 50 })).satirlar).toHaveLength(27);
  });
});

describe("liste süzgeçleri (kart 0267)", () => {
  const liste = (vt: Veritabani, girdi: Record<string, unknown>, ile = yonetim) =>
    ile.liste(vt, siparisListesiSemasi.parse(girdi));
  const numaralar = async (vt: Veritabani, girdi: Record<string, unknown>, ile = yonetim) =>
    (await liste(vt, girdi, ile)).satirlar.map((s) => s.numara).toSorted();
  const zamanla = (vt: Veritabani, numara: string, an: string) =>
    vt
      .update(siparisler)
      .set({ olusturma_zamani: new Date(an) })
      .where(eq(siparisler.numara, numara));

  it("tarih günü sitenin saat dilimiyle sayar: gece yarısı sınırı, iki uç dahil, boş uç sınırsız, sayılara da uyar", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const [a, b, c, d] = [
      await ver(h.vt, birim, havale),
      await ver(h.vt, birim, havale),
      await ver(h.vt, birim, kapida),
      await ver(h.vt, birim, kapida),
    ] as [string, string, string, string];
    // İstanbul (UTC+3): a 20 Kasım'ın son milisaniyesi, b 21 Kasım'ın ilk anı, c 21'in sonu, d 22'nin başı.
    await zamanla(h.vt, a, "2026-11-20T20:59:59.999Z");
    await zamanla(h.vt, b, "2026-11-20T21:00:00.000Z");
    await zamanla(h.vt, c, "2026-11-21T20:59:59.999Z");
    await zamanla(h.vt, d, "2026-11-21T21:00:00.000Z");
    const istanbul = siparisYonetimi({
      ...site,
      ayarlar: { ...site.ayarlar, saatDilimi: "Europe/Istanbul" },
    });
    const gun = (baslangic: string | null, bitis: string | null) => ({
      tarih: { baslangic, bitis },
    });
    expect(await numaralar(h.vt, gun("2026-11-21", "2026-11-21"), istanbul)).toEqual(
      [b, c].toSorted(),
    );
    expect(await numaralar(h.vt, gun("2026-11-20", "2026-11-21"), istanbul)).toEqual(
      [a, b, c].toSorted(),
    );
    expect(await numaralar(h.vt, gun("2026-11-21", null), istanbul)).toEqual([b, c, d].toSorted());
    expect(await numaralar(h.vt, gun(null, "2026-11-20"), istanbul)).toEqual([a]);
    // Sekme sayıları tarih süzgecine uyar (a ve b havale, ödeme bekliyor).
    expect(
      (await liste(h.vt, gun("2026-11-21", "2026-11-21"), istanbul)).sayilar["odeme-bekleniyor"],
    ).toBe(2);
    // Aynı anlar New York'ta (UTC-5) başka günlerdir: 21 Kasım 05.00Z ile 22 Kasım 05.00Z arası.
    const newYork = siparisYonetimi({
      ...site,
      ayarlar: { ...site.ayarlar, saatDilimi: "America/New_York" },
    });
    expect(await numaralar(h.vt, gun("2026-11-21", "2026-11-21"), newYork)).toEqual(
      [c, d].toSorted(),
    );
    expect(await numaralar(h.vt, gun("2026-11-20", "2026-11-20"), newYork)).toEqual(
      [a, b].toSorted(),
    );
    // Yaz saatine geçilen gün 23 saattir: 8 Mart'ın sonu 9 Mart 04.00Z (05.00Z değil).
    await zamanla(h.vt, a, "2026-03-09T03:59:59.999Z");
    await zamanla(h.vt, b, "2026-03-09T04:00:00.000Z");
    expect(await numaralar(h.vt, gun("2026-03-08", "2026-03-08"), newYork)).toEqual([a]);
    expect(await numaralar(h.vt, gun("2026-03-09", "2026-03-09"), newYork)).toEqual([b]);
  });

  it("tarih girdisi: takvimde olmayan gün, iki ucu boş ve ters aralık reddedilir", () => {
    const gecer = (tarih: unknown) => siparisListesiSemasi.safeParse({ tarih }).success;
    expect(gecer({ baslangic: "2026-11-01", bitis: "2026-11-01" })).toBe(true);
    expect(gecer({ baslangic: null, bitis: "2026-11-01" })).toBe(true);
    expect(gecer({ baslangic: null, bitis: null })).toBe(false);
    expect(gecer({ baslangic: "2026-11-02", bitis: "2026-11-01" })).toBe(false);
    expect(gecer({ baslangic: "2026-02-30", bitis: null })).toBe(false);
    expect(gecer({ baslangic: "2026-11-01T00:00", bitis: null })).toBe(false);
  });

  it("bakılması gereken: bildirilmiş havale yalnız ödeme beklerken, bekleyen iade talebi ve sonucu beklenen iade; işaretler ve sayı", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const kim = await h.yonetici();
    const bildirilen = await ver(h.vt, birim, havale, { eposta: "ayse@ornek.test" });
    const onaylanan = await ver(h.vt, birim, havale, { eposta: "mert@ornek.test" });
    const talepli = await ver(h.vt, birim, kapida);
    const iadeli = await ver(h.vt, birim, kapida);
    const sade = await ver(h.vt, birim, kapida);
    for (const [numara, eposta] of [
      [bildirilen, "ayse@ornek.test"],
      [onaylanan, "mert@ornek.test"],
    ] as const) {
      await siparisServisi(site).havaleBildir(
        h.vt,
        { tur: "eposta", eposta },
        havaleBildirimiFormuSemasi.parse({
          numara,
          gonderen: "Deniz Yılmaz",
          hesap: hesapKimligi,
          tutar: "100,00",
          odemeTarihi: new Date().toISOString().slice(0, 10),
        }),
      );
    }
    // Onaylanan havalenin bildirimi artık bakılacak iş değildir.
    await yonetim.islemYap(h.vt, kim, {
      numara: onaylanan,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    const kimligi = async (numara: string) =>
      (
        await h.vt
          .select({ kimlik: siparisler.kimlik })
          .from(siparisler)
          .where(eq(siparisler.numara, numara))
      )[0]?.kimlik ?? "";
    await h.vt.insert(siparisIadeTalepleri).values({
      siparis_kimligi: await kimligi(talepli),
      durum: "bekliyor",
      kalemler: [{ sira: 1, adet: 1 }],
      neden: "diger",
      kim_turu: "sistem",
      kim_adi: "deneme",
    });
    // Sonucu beklenen iade: kartla iade kuruluşun cevabını bekliyor (sahte satır).
    const iade = {
      siparis_kimligi: await kimligi(iadeli),
      tur: "iptal",
      durum: "bekliyor",
      yontem: "kurulus",
      tutar: 100,
      vergi_dokumu: [],
      kalemler: [],
      kargo_tutari: 0,
      stoga_konacak: false,
      neden: "diger",
      kim_turu: "sistem",
      kim_adi: "deneme",
    };
    await h.vt.insert(siparisIadeleri).values(iade);

    const bakilacak = await liste(h.vt, { bakilacak: true });
    expect(bakilacak.satirlar.map((s) => s.numara).toSorted()).toEqual(
      [bildirilen, talepli, iadeli].toSorted(),
    );
    expect(bakilacak.bakilacakSayisi).toBe(3);
    const satir = (numara: string) => bakilacak.satirlar.find((s) => s.numara === numara);
    expect(satir(bildirilen)).toMatchObject({
      havaleBildirildi: true,
      iadeTalebi: false,
      iadeBekliyor: false,
    });
    expect(satir(talepli)).toMatchObject({ havaleBildirildi: false, iadeTalebi: true });
    expect(satir(iadeli)).toMatchObject({ iadeTalebi: false, iadeBekliyor: true });
    const hepsi = await liste(h.vt, {});
    expect(hepsi.satirlar.find((s) => s.numara === sade)).toMatchObject({
      havaleBildirildi: false,
      iadeTalebi: false,
      iadeBekliyor: false,
    });
    // Sayı sekmenin dışındaki süzgeçlere uyar, sekmeden ve aramadan bağımsızdır.
    expect((await liste(h.vt, { odeme: ["havale"] })).bakilacakSayisi).toBe(1);
    expect((await liste(h.vt, { durum: "hazirlaniyor", ara: "yok" })).bakilacakSayisi).toBe(3);
    // İade sonuçlanınca ve talep karara bağlanınca bakılacak iş kalmaz.
    await h.vt
      .update(siparisIadeleri)
      .set({ durum: "basarisiz", sonuc_zamani: new Date() })
      .where(eq(siparisIadeleri.siparis_kimligi, iade.siparis_kimligi));
    expect(await numaralar(h.vt, { bakilacak: true })).toEqual([bildirilen, talepli].toSorted());
  });

  it("kargo firması siparişin adıyla süzülür; firmalar tekrarsız ve sitenin dilinin harf sırasıyla, sayılar uyar", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const siparisler3 = [
      await ver(h.vt, birim, kapida),
      await ver(h.vt, birim, kapida),
      await ver(h.vt, birim, kapida),
      await ver(h.vt, birim, kapida),
      await ver(h.vt, birim, kapida),
    ];
    const adlar = ["Çok Hızlı", "Cep Kargo", "Hızlı, Kargo", "Cep Kargo", null];
    for (const [sira, numara] of siparisler3.entries()) {
      const ad = adlar[sira];
      if (ad === null || ad === undefined) continue;
      await h.vt
        .update(siparisler)
        .set({ kargo_firmasi: ad, kargo_zamani: new Date() })
        .where(eq(siparisler.numara, numara));
    }
    // Ç, C'den sonra gelir (Unicode sırasında Z'den sonra olurdu); kargosuz sipariş firma vermez.
    expect(await yonetim.kargoFirmalari(h.vt)).toEqual(["Cep Kargo", "Çok Hızlı", "Hızlı, Kargo"]);
    expect(await numaralar(h.vt, { kargo: ["Cep Kargo"] })).toEqual(
      [siparisler3[1], siparisler3[3]].toSorted(),
    );
    expect(await numaralar(h.vt, { kargo: ["Hızlı, Kargo", "Çok Hızlı"] })).toEqual(
      [siparisler3[0], siparisler3[2]].toSorted(),
    );
    // Firma adı tam eşleşir: büyük küçük harf ve parça eşleşmez.
    expect((await liste(h.vt, { kargo: ["cep kargo"] })).toplam).toBe(0);
    expect((await liste(h.vt, { kargo: ["Cep"] })).toplam).toBe(0);
    expect((await liste(h.vt, { kargo: ["Cep Kargo"] })).sayilar["odeme-bekleniyor"]).toBe(2);
    // Girdinin sınırı: boş ad ve liste sınırı.
    expect(siparisListesiSemasi.safeParse({ kargo: [] }).success).toBe(false);
    expect(siparisListesiSemasi.safeParse({ kargo: [" "] }).success).toBe(false);
    expect(
      siparisListesiSemasi.safeParse({ kargo: Array.from({ length: 51 }, (_, i) => `F${i}`) })
        .success,
    ).toBe(false);
  });
});

describe("toplu işlem (kart 0258)", () => {
  it("girdi: en az bir, en çok bir sayfa (100), her numara bir kez, yalnız kayıttaki işlem", () => {
    const siparis = (numara: string) => ({ numara, gorulenDurum: "odeme-bekleniyor" });
    const gecer = (siparisler: unknown[], islem = "hazirlamaya-al") =>
      siparisTopluIslemiSemasi.safeParse({ islem, siparisler }).success;
    expect(gecer([siparis("ORN-1")])).toBe(true);
    expect(gecer([])).toBe(false);
    expect(gecer([siparis("ORN-1"), siparis("orn-1")])).toBe(false);
    expect(gecer(Array.from({ length: 100 }, (_, i) => siparis(`ORN-${i + 1}`)))).toBe(true);
    expect(gecer(Array.from({ length: 101 }, (_, i) => siparis(`ORN-${i + 1}`)))).toBe(false);
    expect(gecer([siparis("ORN-1")], "kargoya-ver")).toBe(false);
  });

  it("her sipariş tekil işlemle aynı denetimden geçer, işlenemeyenler nedeniyle döner, ötekiler işlenir", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const kim = await h.yonetici();
    const kapidaBir = await ver(h.vt, birim, kapida);
    const kapidaIki = await ver(h.vt, birim, kapida);
    const havaledeki = await ver(h.vt, birim, havale);
    const eskiGoren = await ver(h.vt, birim, kapida);
    const zatenHazir = await ver(h.vt, birim, kapida);
    await yonetim.islemYap(h.vt, kim, {
      numara: zatenHazir,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    const oncekiGecmis = await gecmisSayisi(h.vt);
    const sonuc = await yonetim.topluIslem(h.vt, kim, {
      islem: "hazirlamaya-al",
      siparisler: [
        { numara: kapidaBir, gorulenDurum: "odeme-bekleniyor" },
        { numara: havaledeki, gorulenDurum: "odeme-bekleniyor" },
        // Ekran eski durumu gördü: sipariş bu arada hazırlamaya alındı.
        { numara: zatenHazir, gorulenDurum: "odeme-bekleniyor" },
        // Ekran hazırlanıyor gördü: geçiş yok.
        { numara: eskiGoren, gorulenDurum: "hazirlaniyor" },
        { numara: "YOK-1", gorulenDurum: "odeme-bekleniyor" },
        { numara: kapidaIki, gorulenDurum: "odeme-bekleniyor" },
      ],
    });
    expect(sonuc.islenen).toEqual([kapidaBir, kapidaIki]);
    expect(sonuc.islenemeyen).toEqual([
      { anahtar: havaledeki, kod: "yontem-uymuyor" },
      { anahtar: zatenHazir, kod: "durum-degisti" },
      { anahtar: eskiGoren, kod: "durum-degisti" },
      { anahtar: "YOK-1", kod: "bulunamadi" },
    ]);
    expect((await oku(h.vt, kapidaBir)).durum).toBe("hazirlaniyor");
    expect((await oku(h.vt, kapidaIki)).durum).toBe("hazirlaniyor");
    expect((await oku(h.vt, havaledeki)).durum).toBe("odeme-bekleniyor");
    expect((await oku(h.vt, eskiGoren)).durum).toBe("odeme-bekleniyor");
    // Yalnız işlenen iki sipariş geçmişe yazılır, yazanıyla.
    expect(await gecmisSayisi(h.vt)).toBe(oncekiGecmis + 2);
    const ayrinti = await yonetim.ayrinti(h.vt, kapidaBir);
    expect(ayrinti?.gecmis[0]).toMatchObject({
      neden: "hazirlamaya-alindi",
      yazan: { tur: "yonetici", eposta: kim.eposta },
    });
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
    const uydurma = randomUUID();
    const sonuc = await ayarlar.kargoFirmalariniKaydet(h.vt, kim, {
      onceki: [firmaKimligi],
      firmalar: [
        { kimlik: firmaKimligi, ad: "Deneme Kargo" },
        { ad: "Elden teslim" },
        // Listede olmayan kimlik yeni firma sayılır.
        { kimlik: uydurma, ad: "Üçüncü", takipAdresi: "https://a.test/{takip}" },
      ],
    });
    expect(sonuc.kargoFirmalari.map((f) => f.ad)).toEqual([
      "Deneme Kargo",
      "Elden teslim",
      "Üçüncü",
    ]);
    expect(sonuc.kargoFirmalari[0]).toEqual({ kimlik: firmaKimligi, ad: "Deneme Kargo" });
    expect(new Set(sonuc.kargoFirmalari.map((f) => f.kimlik)).size).toBe(3);
    expect(sonuc.kargoFirmalari.map((f) => f.kimlik)).not.toContain(uydurma);
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

describe("bağımsız kontrolün bulguları", () => {
  it("panelin düğmeleri durum, ödeme yöntemi ve izinle bulunur; görevli havale onayını görmez", () => {
    const sahip = () => true;
    const gorevli = (izin: string) => izin === "siparis.yonet";
    expect(yapilabilirIslemler("odeme-bekleniyor", "havale", sahip)).toEqual(["havale-onayla"]);
    expect(yapilabilirIslemler("odeme-bekleniyor", "havale", gorevli)).toEqual([]);
    expect(yapilabilirIslemler("odeme-bekleniyor", "kapida-odeme", gorevli)).toEqual([
      "hazirlamaya-al",
    ]);
    expect(yapilabilirIslemler("hazirlaniyor", "havale", gorevli)).toEqual(["kargoya-ver"]);
    expect(yapilabilirIslemler("kargoda", "kart", gorevli)).toEqual([
      "kargo-duzelt",
      "teslim-edildi",
    ]);
    expect(yapilabilirIslemler("teslim-edildi", "kart", sahip)).toEqual([]);
  });

  it("değişmeyen kargo düzeltmesi geçmişe yazılmaz; ayrıntı oturum ve ödeme kimliğini vermez", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    const kim = await h.yonetici();
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    const kargo = { firma: firmaKimligi, takipNumarasi: "A 1" };
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo,
    });
    const once = await gecmisSayisi(h.vt);
    await yonetim.islemYap(h.vt, kim, {
      numara,
      islem: "kargo-duzelt",
      gorulenDurum: "kargoda",
      kargo,
    });
    expect(await gecmisSayisi(h.vt)).toBe(once);
    const ayrinti = await yonetim.ayrinti(h.vt, numara);
    expect(ayrinti?.siparis).not.toHaveProperty("oturum_kimligi");
    expect(ayrinti?.siparis.tahsilat).toBeNull();
  });

  it("firma adında ve takip adresinde e-posta biçimi alanın hatasıdır", () => {
    const sonuc = kargoFirmalariSemasi.safeParse({
      onceki: [],
      firmalar: [{ ad: "destek@kargo" }],
    });
    expect(sonuc.success).toBe(false);
    expect(sonuc.error?.issues[0]?.path).toEqual(["firmalar", 0, "ad"]);
  });

  it("takip adresinde kullanıcı adı reddedilir", async () => {
    const h = await hazirla();
    const kim = await h.yonetici();
    expect(
      await hatasi(
        siparisAyarlari(site).kargoFirmalariniKaydet(h.vt, kim, {
          onceki: [firmaKimligi],
          firmalar: [{ ad: "Kargo", takipAdresi: "https://kullanici@kargo.test/{takip}" }],
        }),
      ),
    ).toMatchObject({ kod: "dogrulama", ayrinti: [{ alan: "firmalar.0.takipAdresi" }] });
  });

  it("teslim edilen siparişin müşterisi yorum servisinden yazar ve doğrulanmış alıcı işareti alır", async () => {
    const h = await hazirla();
    const { urun, birim } = await h.urunAc();
    await siteninServisi(site).degistir(h.vt, sistemYonetici(), { yorumYalnizSatinAlanlar: true });
    const musteri = await h.musteriAc();
    const kim = await h.yonetici();
    const numara = await ver(h.vt, birim, kapida, { musteri });
    const servis = yorumServisi(site);
    expect(await servis.yorumIzni(h.vt, musteri, urun)).toBe("satin-alma-gerekli");
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
    expect(await servis.yorumIzni(h.vt, musteri, urun)).toBe("satin-alma-gerekli");
    await yonetim.islemYap(h.vt, kim, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
    expect(await servis.yorumIzni(h.vt, musteri, urun)).toBe("yazabilir");
    await servis.yorumYaz(h.vt, musteri, {
      urun,
      puan: 5,
      metin: "Güzel ürün",
      ad: "Deniz Yılmaz",
    });
    const [yorum] = await h.vt.select().from(yorumlar);
    expect(yorum?.dogrulanmis_alici).toBe(true);
  });

  it("kurumsal faturanın firma, vergi bilgisi ve ayrı adresi silinir; silinmiş sipariş adres önermez", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const musteri = await h.musteriAc();
    const numara = await ver(h.vt, birim, havale, { musteri, fatura: kurumsalFatura });
    expect((await siparisServisi(site).sonTeslimat(h.vt, musteri))?.ad).toBe("Deniz");
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${site.ayarlar.kisiselVeriSaklamaYili}, days => 1) where numara = ${numara}`,
    );
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    const satir = await oku(h.vt, numara);
    expect(satir.fatura).toEqual({
      tur: "kurumsal",
      adresAyni: false,
      firma: "",
      vergiDairesi: "",
      vergiNumarasi: "",
      adres: { ulke: "TR", il: "TR-06", ilce: "TR-06-007", adres: "" },
    });
    expect(await siparisServisi(site).sonTeslimat(h.vt, musteri)).toBeNull();
  });

  it("bir sitenin siparişi başka sitede görünmez", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, havale);
    const baska = await denemeSitesiAc("siparis-yonetim-b");
    temizlenecekler.push(baska.sil);
    expect(await yonetim.ayrinti(baska.vt, numara)).toBeNull();
    expect((await yonetim.liste(baska.vt, siparisListesiSemasi.parse({}))).toplam).toBe(0);
    expect(
      await hatasi(
        yonetim.islemYap(baska.vt, await h.yonetici(), {
          numara,
          islem: "havale-onayla",
          gorulenDurum: "odeme-bekleniyor",
        }),
      ),
    ).toMatchObject({ kod: "bulunamadi" });
  });
});
