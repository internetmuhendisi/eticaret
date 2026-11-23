// Siparişin faturası gerçek veritabanı ve klasörle (kart 0268, karar 0170):
// - Numara ve tarihle yazılır, PDF isteğe bağlıdır; ekranın gördüğü fatura tutmazsa çakışma, hiçbir şey yazılmaz.
// - Dosya yalnız silinmemiş belgeyse ve başka siparişin faturası değilse bağlanır; değişen ve kaldırılan dosya
//   silinmiş işaretlenir. Kişisel bilgisi silinmiş siparişe dosya bağlanmaz.
// - Her yazma ve kaldırma değişiklik kaydına girer; aynı fatura yeniden yazılmaz. "Faturanız hazır" e-postası
//   yalnız istenince, yazımla aynı işlemde ve bir kez yazılır.
// - Dosya yalnız siparişin sahibi üyeye, takip anahtarının siparişine ve panele verilir.
// - Kişisel veri temizliği dosyayı siparişten ayırıp silinmiş işaretler, numara ve tarih kalır.
// - Veritabanı yarım faturayı ve numarasız dosyayı reddeder; numara sınırı kayıtla aynıdır.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { dosyaKlasoruDegiskeni } from "../../../kayitlar/dosya.ts";
import { musteriIptaliSecenekleri, siparisSinirlari } from "../../../kayitlar/siparis.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { dosyalar } from "../../dosya/model.ts";
import { belgeKaydet, dosyaKaydet } from "../../dosya/servis.ts";
import { epostaKayitlari } from "../../eposta/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { siparisFaturaServisi } from "../fatura.ts";
import { siparisler } from "../model.ts";
import { type MusteriKurallari, musteriSiparisleri } from "../musteri.ts";
import { siparisFaturasiKaldirSemasi, siparisFaturasiSemasi } from "../semalar.ts";
import { kisiselVeriTemizligi } from "../temizlik.ts";

vi.setConfig({ testTimeout: 90_000 });

let dosyaKlasoru: string;
beforeAll(() => {
  dosyaKlasoru = mkdtempSync(join(tmpdir(), "fatura-"));
  process.env[dosyaKlasoruDegiskeni] = dosyaKlasoru;
});
afterAll(() => {
  rmSync(dosyaKlasoru, { recursive: true, force: true });
});

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

const fatura = siparisFaturaServisi(site);
const kim = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const pdf = (ek = "") => Buffer.from(`%PDF-1.7\n${ek}\n%%EOF\n`, "latin1");
const belge = async (vt: Veritabani, ek = "") => {
  const sonuc = await belgeKaydet(vt, pdf(ek));
  if (!sonuc.tamam) throw new Error(sonuc.hata);
  return sonuc.dosya.kimlik;
};
const yaz = (vt: Veritabani, girdi: Record<string, unknown>) =>
  fatura.yaz(vt, kim(), siparisFaturasiSemasi.parse(girdi));
const satiri = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};
const silinmisMi = async (vt: Veritabani, kimlik: string) =>
  (
    await vt
      .select({ s: dosyalar.silinme_zamani })
      .from(dosyalar)
      .where(eq(dosyalar.kimlik, kimlik))
  )[0]?.s !== null;
const kayitlar = async (vt: Veritabani, siparis: string) =>
  vt
    .select({
      islem: degisiklikKayitlari.islem,
      eski: degisiklikKayitlari.eski_deger,
      yeni: degisiklikKayitlari.yeni_deger,
    })
    .from(degisiklikKayitlari)
    .where(
      and(
        eq(degisiklikKayitlari.kayit_turu, "siparis"),
        eq(degisiklikKayitlari.kayit_kimligi, siparis),
      ),
    )
    .orderBy(degisiklikKayitlari.zaman);
const faturaEpostalari = async (vt: Veritabani) =>
  vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.sablon, "fatura-hazir"));

describe("faturanın yazılması", () => {
  it("numara ve tarihle, dosyasız ve dosyalı yazılır; değişen dosya silinmiş işaretlenir; her yazma kayda girer, aynısı girmez", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    const { kimlik } = await satiri(h.vt, numara);
    const ilk = await yaz(h.vt, {
      numara,
      gorulen: null,
      fatura: { numara: "ORN2026000000142", tarih: "2026-11-17", dosya: null },
      eposta: false,
    });
    expect(ilk.fatura).toEqual({ numara: "ORN2026000000142", tarih: "2026-11-17", dosya: null });
    expect(await satiri(h.vt, numara)).toMatchObject({
      fatura_numarasi: "ORN2026000000142",
      fatura_tarihi: "2026-11-17",
      fatura_dosyasi: null,
    });
    const birinci = await belge(h.vt, "bir");
    const ikinci = await yaz(h.vt, {
      numara,
      gorulen: { numara: "ORN2026000000142", tarih: "2026-11-17", dosya: null },
      fatura: { numara: "ORN2026000000142", tarih: "2026-11-17", dosya: birinci },
      eposta: false,
    });
    expect(ikinci.fatura.dosya).toEqual({ kimlik: birinci, boyut: pdf("bir").length });
    const yeniDosya = await belge(h.vt, "iki");
    await yaz(h.vt, {
      numara,
      gorulen: { numara: "ORN2026000000142", tarih: "2026-11-17", dosya: birinci },
      fatura: { numara: "ORN-2026/143", tarih: "2026-11-18", dosya: yeniDosya },
      eposta: false,
    });
    expect(await silinmisMi(h.vt, birinci)).toBe(true);
    expect(await silinmisMi(h.vt, yeniDosya)).toBe(false);
    // Aynı fatura yeniden yazılmaz, kayda girmez.
    await yaz(h.vt, {
      numara,
      gorulen: { numara: "ORN-2026/143", tarih: "2026-11-18", dosya: yeniDosya },
      fatura: { numara: "ORN-2026/143", tarih: "2026-11-18", dosya: yeniDosya },
      eposta: true,
    });
    const kayit = await kayitlar(h.vt, kimlik);
    expect(kayit.map((k) => k.islem)).toEqual([
      "siparis.fatura-yazildi",
      "siparis.fatura-yazildi",
      "siparis.fatura-yazildi",
    ]);
    expect(kayit[0]).toMatchObject({
      eski: null,
      yeni: { numara: "ORN2026000000142", tarih: "2026-11-17", dosya: null },
    });
    expect(kayit[2]?.yeni).toEqual({
      numara: "ORN-2026/143",
      tarih: "2026-11-18",
      dosya: yeniDosya,
    });
    expect(await faturaEpostalari(h.vt)).toHaveLength(0);
    // Kaldırma: dosya silinmiş, kayıt, sipariş faturasız.
    await fatura.kaldir(
      h.vt,
      kim(),
      siparisFaturasiKaldirSemasi.parse({
        numara,
        gorulen: { numara: "ORN-2026/143", tarih: "2026-11-18", dosya: yeniDosya },
      }),
    );
    expect(await silinmisMi(h.vt, yeniDosya)).toBe(true);
    expect(await satiri(h.vt, numara)).toMatchObject({
      fatura_numarasi: null,
      fatura_tarihi: null,
      fatura_dosyasi: null,
      fatura_zamani: null,
    });
    expect((await kayitlar(h.vt, kimlik)).at(-1)).toMatchObject({
      islem: "siparis.fatura-kaldirildi",
      yeni: null,
    });
    expect(await fatura.oku(h.vt, kimlik)).toBeNull();
  });

  it("ekranın gördüğü fatura tutmazsa çakışma, hiçbir şey yazılmaz; yoksa ve olmayan sipariş", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    await yaz(h.vt, {
      numara,
      gorulen: null,
      fatura: { numara: "F-1", tarih: "2026-11-17", dosya: null },
      eposta: false,
    });
    for (const gorulen of [null, { numara: "F-0", tarih: "2026-11-17", dosya: null }]) {
      expect(
        await hatasi(
          yaz(h.vt, {
            numara,
            gorulen,
            fatura: { numara: "F-2", tarih: "2026-11-17", dosya: null },
            eposta: false,
          }),
        ),
      ).toMatchObject({ kod: "cakisma", ayrinti: [{ alan: "fatura", kod: "fatura-degisti" }] });
    }
    expect(
      await hatasi(
        fatura.kaldir(
          h.vt,
          kim(),
          siparisFaturasiKaldirSemasi.parse({
            numara,
            gorulen: { numara: "F-0", tarih: "2026-11-17", dosya: null },
          }),
        ),
      ),
    ).toMatchObject({ kod: "cakisma" });
    expect((await satiri(h.vt, numara)).fatura_numarasi).toBe("F-1");
    expect(
      await hatasi(
        yaz(h.vt, {
          numara: "ORN-999999",
          gorulen: null,
          fatura: { numara: "F-2", tarih: "2026-11-17", dosya: null },
          eposta: false,
        }),
      ),
    ).toMatchObject({ kod: "bulunamadi" });
  });

  it("dosya: olmayan, silinmiş, görsel ve başka siparişin faturası olan bağlanmaz; kişisel bilgisi silinmiş siparişe bağlanmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const bir = await ver(h.vt, birim, kapida);
    const iki = await ver(h.vt, birim, kapida);
    const ortak = await belge(h.vt);
    await yaz(h.vt, {
      numara: bir,
      gorulen: null,
      fatura: { numara: "F-1", tarih: "2026-11-17", dosya: ortak },
      eposta: false,
    });
    const silinen = await belge(h.vt);
    await h.vt
      .update(dosyalar)
      .set({ silinme_zamani: new Date() })
      .where(eq(dosyalar.kimlik, silinen));
    const resim = await dosyaKaydet(
      h.vt,
      await sharp({
        create: { width: 4, height: 4, channels: 3, background: { r: 128, g: 128, b: 128 } },
      })
        .png()
        .toBuffer(),
    );
    if (!resim.tamam) throw new Error(resim.hata);
    const dene = (dosya: string) =>
      hatasi(
        yaz(h.vt, {
          numara: iki,
          gorulen: null,
          fatura: { numara: "F-2", tarih: "2026-11-17", dosya },
          eposta: false,
        }),
      );
    expect(await dene(randomUUID())).toMatchObject({
      kod: "dogrulama",
      ayrinti: [{ alan: "fatura.dosya", kod: "dosya-yok" }],
    });
    expect(await dene(silinen)).toMatchObject({ ayrinti: [{ kod: "dosya-yok" }] });
    expect(await dene(resim.dosya.kimlik)).toMatchObject({ ayrinti: [{ kod: "dosya-yok" }] });
    expect(await dene(ortak)).toMatchObject({
      ayrinti: [{ alan: "fatura.dosya", kod: "dosya-kullanimda" }],
    });
    expect((await satiri(h.vt, iki)).fatura_numarasi).toBeNull();
    // Kişisel bilgisi silinmiş sipariş: numara yazılır, dosya bağlanmaz.
    await h.vt
      .update(siparisler)
      .set({ kisisel_veri_silinme_zamani: new Date() })
      .where(eq(siparisler.numara, iki));
    await yaz(h.vt, {
      numara: iki,
      gorulen: null,
      fatura: { numara: "F-2", tarih: "2026-11-17", dosya: null },
      eposta: false,
    });
    expect(
      await hatasi(
        yaz(h.vt, {
          numara: iki,
          gorulen: { numara: "F-2", tarih: "2026-11-17", dosya: null },
          fatura: { numara: "F-2", tarih: "2026-11-17", dosya: await belge(h.vt) },
          eposta: false,
        }),
      ),
    ).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ alan: "fatura.dosya", kod: "kisisel-veri-silindi" }],
    });
  });

  it("aynı dosya aynı anda iki siparişe yazılınca ikincisi kaydedilmeyi bekleyip dosya-kullanimda alır (sıra kurularak)", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const bir = await ver(h.vt, birim, kapida);
    const iki = await ver(h.vt, birim, kapida);
    const ortak = await belge(h.vt);
    // Birinci yazım dosyayı bağlamış ama kaydedilmemiş: ikincinin "başka siparişte mi" denetimi onu görmez.
    let birak = () => {};
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    let kilitlendi = () => {};
    const kilitli = new Promise<void>((tamam) => {
      kilitlendi = tamam;
    });
    const tutan = h.vt.transaction(async (islem) => {
      await islem
        .update(siparisler)
        .set({
          fatura_numarasi: "F-1",
          fatura_tarihi: "2026-11-17",
          fatura_dosyasi: ortak,
          fatura_zamani: sql`clock_timestamp()`,
        })
        .where(eq(siparisler.numara, bir));
      kilitlendi();
      await bekle;
    });
    await Promise.race([kilitli, tutan]);
    const ikinci = hatasi(
      yaz(h.vt, {
        numara: iki,
        gorulen: null,
        fatura: { numara: "F-2", tarih: "2026-11-17", dosya: ortak },
        eposta: true,
      }),
    );
    await kilitBekleyeniGor(h.vt);
    birak();
    await tutan;
    expect(await ikinci).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "fatura.dosya", kod: "dosya-kullanimda" }],
    });
    expect((await satiri(h.vt, iki)).fatura_numarasi).toBeNull();
    expect((await satiri(h.vt, bir)).fatura_dosyasi).toBe(ortak);
    expect(await faturaEpostalari(h.vt)).toHaveLength(0);
  });

  it("girdi: boş, uzun ve izinsiz harfli numara, takvimde olmayan tarih reddedilir", () => {
    const gecer = (numara: string, tarih = "2026-11-17") =>
      siparisFaturasiSemasi.safeParse({
        numara: "ORN-1",
        gorulen: null,
        fatura: { numara, tarih, dosya: null },
        eposta: true,
      }).success;
    expect(gecer("ORN2026000000142")).toBe(true);
    expect(gecer("GİB 2026/14-2.a")).toBe(true);
    expect(gecer("a".repeat(siparisSinirlari.faturaNumarasiEnCok))).toBe(true);
    expect(gecer("a".repeat(siparisSinirlari.faturaNumarasiEnCok + 1))).toBe(false);
    for (const bozuk of ["", " ", "fatura@ornek.test", "-142", "<b>1</b>", "1\n2"]) {
      expect(gecer(bozuk), bozuk).toBe(false);
    }
    expect(gecer("F-1", "2026-02-30")).toBe(false);
    expect(gecer("F-1", "17.11.2026")).toBe(false);
  });

  it("veritabanı yarım faturayı, numarasız dosyayı ve sınırı aşan numarayı reddeder", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    const dosya = await belge(h.vt);
    for (const deger of [
      { fatura_numarasi: "F-1" },
      { fatura_numarasi: "F-1", fatura_tarihi: "2026-11-17" },
      { fatura_dosyasi: dosya },
      {
        fatura_numarasi: "a".repeat(siparisSinirlari.faturaNumarasiEnCok + 1),
        fatura_tarihi: "2026-11-17",
        fatura_zamani: new Date(),
      },
      { fatura_numarasi: "", fatura_tarihi: "2026-11-17", fatura_zamani: new Date() },
    ]) {
      await expect(
        h.vt.update(siparisler).set(deger).where(eq(siparisler.numara, numara)),
        JSON.stringify(deger),
      ).rejects.toThrow();
    }
  });
});

describe("faturanız hazır e-postası", () => {
  it("istenince yazımla aynı işlemde bir kez yazılır, numara, tarih ve dosyanın varlığıyla; istenmeyince yazılmaz", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida, { eposta: "fatura-alici@ornek.test" });
    const dosya = await belge(h.vt);
    await yaz(h.vt, {
      numara,
      gorulen: null,
      fatura: { numara: "F-1", tarih: "2026-11-17", dosya },
      eposta: true,
    });
    const epostalar = await faturaEpostalari(h.vt);
    expect(epostalar).toHaveLength(1);
    expect(epostalar[0]).toMatchObject({ alici: "fatura-alici@ornek.test" });
    expect(epostalar[0]?.veri).toMatchObject({ numara, fatura: { numara: "F-1", dosya: true } });
    // Değişiklik yeni bir olaydır: yeni e-posta; istenmeyince yok.
    await yaz(h.vt, {
      numara,
      gorulen: { numara: "F-1", tarih: "2026-11-17", dosya },
      fatura: { numara: "F-2", tarih: "2026-11-17", dosya },
      eposta: true,
    });
    await yaz(h.vt, {
      numara,
      gorulen: { numara: "F-2", tarih: "2026-11-17", dosya },
      fatura: { numara: "F-3", tarih: "2026-11-17", dosya },
      eposta: false,
    });
    expect(await faturaEpostalari(h.vt)).toHaveLength(2);
    // Kişisel bilgisi silinmiş siparişe yazılmaz.
    await h.vt
      .update(siparisler)
      .set({ kisisel_veri_silinme_zamani: new Date() })
      .where(eq(siparisler.numara, numara));
    await yaz(h.vt, {
      numara,
      gorulen: { numara: "F-3", tarih: "2026-11-17", dosya },
      fatura: { numara: "F-4", tarih: "2026-11-17", dosya },
      eposta: true,
    });
    expect(await faturaEpostalari(h.vt)).toHaveLength(2);
  });

  it("e-posta yazılamazsa fatura da yazılmaz (aynı işlem)", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    await h.vt.execute(
      sql`alter table eposta_kayitlari add constraint gecici_0268 check (sablon <> 'fatura-hazir') not valid`,
    );
    try {
      await expect(
        yaz(h.vt, {
          numara,
          gorulen: null,
          fatura: { numara: "F-1", tarih: "2026-11-17", dosya: null },
          eposta: true,
        }),
      ).rejects.toThrow();
    } finally {
      await h.vt.execute(sql`alter table eposta_kayitlari drop constraint gecici_0268`);
    }
    expect((await satiri(h.vt, numara)).fatura_numarasi).toBeNull();
  });
});

describe("faturanın dosyası ve müşteri", () => {
  it("dosya üyeye yalnız kendi siparişinde, takipte yalnız anahtarın siparişinde verilir; görünüşte numara, tarih ve dosya", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const uye = await h.musteriAc();
    const baskasi = await h.musteriAc();
    const numara = await ver(h.vt, birim, kapida, { musteri: uye });
    const oteki = await ver(h.vt, birim, kapida, { musteri: baskasi });
    const dosya = await belge(h.vt, "uye");
    await yaz(h.vt, {
      numara,
      gorulen: null,
      fatura: { numara: "F-1", tarih: "2026-11-17", dosya },
      eposta: false,
    });
    await yaz(h.vt, {
      numara: oteki,
      gorulen: null,
      fatura: { numara: "F-2", tarih: "2026-11-17", dosya: null },
      eposta: false,
    });
    const okunan = await fatura.dosyaOku(h.vt, { numara, musteri: uye });
    expect(okunan?.icerik.equals(pdf("uye"))).toBe(true);
    expect(okunan?.siparis).toBe(numara);
    expect(await fatura.dosyaOku(h.vt, { numara, musteri: baskasi })).toBeUndefined();
    expect(await fatura.dosyaOku(h.vt, { numara: oteki, musteri: baskasi })).toBeUndefined();
    const { kimlik } = await satiri(h.vt, numara);
    expect(await fatura.dosyaOku(h.vt, { numara, kimlik })).toBeDefined();
    expect(await fatura.dosyaOku(h.vt, { numara: oteki, kimlik })).toBeUndefined();
    expect(await fatura.dosyaOku(h.vt, { numara })).toBeDefined();
    const kurallar: MusteriKurallari = {
      iadeTalebiSuresi: 14,
      iadeKargosu: "musteri",
      musteriIptali: musteriIptaliSecenekleri[0],
    };
    const gorunus = await musteriSiparisleri().ayrinti(h.vt, uye, numara, kurallar);
    expect(gorunus?.faturaBelgesi).toEqual({ numara: "F-1", tarih: "2026-11-17", dosya: true });
    expect(
      (await musteriSiparisleri().ayrinti(h.vt, baskasi, oteki, kurallar))?.faturaBelgesi,
    ).toEqual({
      numara: "F-2",
      tarih: "2026-11-17",
      dosya: false,
    });
  });

  it("kişisel veri temizliği dosyayı siparişten ayırıp silinmiş işaretler, numara ve tarih kalır", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    const dosya = await belge(h.vt);
    await yaz(h.vt, {
      numara,
      gorulen: null,
      fatura: { numara: "F-1", tarih: "2026-11-17", dosya },
      eposta: false,
    });
    const yil = site.ayarlar.kisiselVeriSaklamaYili;
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - make_interval(years => ${yil}, days => 1) where numara = ${numara}`,
    );
    expect(await kisiselVeriTemizligi(h.vt, site)).toBe(1);
    expect(await satiri(h.vt, numara)).toMatchObject({
      fatura_numarasi: "F-1",
      fatura_tarihi: "2026-11-17",
      fatura_dosyasi: null,
    });
    expect(await silinmisMi(h.vt, dosya)).toBe(true);
    expect(await fatura.dosyaOku(h.vt, { numara })).toBeUndefined();
  });

  it("iki site birbirinin faturasını görmez", async () => {
    const h = await hazirla();
    const { birim } = await h.urunAc();
    const numara = await ver(h.vt, birim, kapida);
    await yaz(h.vt, {
      numara,
      gorulen: null,
      fatura: { numara: "F-1", tarih: "2026-11-17", dosya: await belge(h.vt) },
      eposta: false,
    });
    const baska = await denemeSitesiAc("fatura-baska");
    temizlenecekler.push(baska.sil);
    expect(await fatura.dosyaOku(baska.vt, { numara })).toBeUndefined();
  });
});
