// Müşterinin iade talebi ve kendi iptali gerçek veritabanıyla (kart 0239, karar 0151):
// - Talep yalnız teslim edilmiş ya da kısmen iade edilmiş siparişte, süre içinde açılır; süre veritabanının saatiyle,
//   son an kapalıdır (bir an önce açık, sonra kapalı). Ödeme bekleyen, kargodaki ve iptal edilen sipariş kapalıdır.
// - Talep edilebilir adet: iade edilmiş, bekleyen talepteki ve onaylanmış ama iadesi yapılmamış talepteki adet
//   istenemez; reddedilen talebin adedi yeniden istenebilir. Bir siparişte bir bekleyen talep: aynı anda iki talepten
//   biri (sıra kurularak).
// - Talep, onay ve ret geçmişe yazılır, durum değişmez; karar değişiklik kaydına girer; ikinci karar çakışır.
//   Veritabanı ret açıklamasız reddi ve ikinci bekleyen talebi reddeder; denetimler kayıtla aynıdır.
// - Onaylanan talepten iade talebe bağlanır; aynı talepten ikinci iade, bekleyen ya da reddedilen talepten iade
//   yapılmaz.
// - Müşterinin iptali ayarın üç değerinde ve durum sınırında; ödemesi havaleyle alınmış sipariş iptal edilmez;
//   geçmişe musteri-iptali, iadeye kaynak "musteri" yazılır, stok döner; eski görülen durum çakışır.
// - Başkasının siparişine (başka üye, üye olmadan verilmiş, başka takip anahtarının siparişi) talep ve iptal yok.
// - Müşterinin görünüşünde talepler, talep edilebilir adet, talebin ve iptalin durumu. İki site ayrıdır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import type { MusteriIptaliSecenegi } from "../../../kayitlar/siparis.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { hesapAc } from "../../oturum/servis.ts";
import { birimStoklari } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { siparisAyarlari } from "../ayarlar.ts";
import { iadeServisi } from "../iade.ts";
import { iadeTalebiServisi, talepEdilebilirAdetler } from "../iade-talebi.ts";
import {
  siparisGecmisi,
  siparisIadeleri,
  siparisIadeTalepleri,
  siparisKalemleri,
  siparisler,
} from "../model.ts";
import { musteriSiparisleri } from "../musteri.ts";
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
    kapidaOdemeSecenekleri: ["nakit"],
    bankaHesaplari: [
      {
        kimlik: randomUUID(),
        banka: "Deneme Bankası",
        sahip: "Deneme Ticaret",
        iban: "TR420001000000000000000001",
      },
    ],
    kargoFirmalari: [{ kimlik: firmaKimligi, ad: "Deneme Kargo" }],
  },
};
const talepSrv = iadeTalebiServisi(site);
const iade = iadeServisi(site);
const yonetim = siparisYonetimi(site);
const musteri = musteriSiparisleri();
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const yonetici = (): DegisikligiYapan & { tur: "yonetici" } => ({
  tur: "yonetici",
  kimlik: randomUUID(),
});

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async (ad = "iade-talebi") => {
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
    await siteninFiyatServisi(site).fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
    await stokServisi().stokDuzelt(vt, yonetici(), birim, {
      yeniMiktar: 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return birim;
  };
  const musteriAc = async () =>
    (
      await hesapAc(vt, "musteri", {
        eposta: `uye-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
  const ayarla = (musteriIptali: MusteriIptaliSecenegi, iadeTalebiSuresi = 14) =>
    siparisAyarlari(site).iptalVeIadeAyarlariniKaydet(vt, yonetici(), {
      musteriIptali,
      iadeTalebiSuresi,
      iadeKargosu: "magaza",
    });
  return { vt, urunAc, musteriAc, ayarla };
};

const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };
const havale: OdemeYontemiSecimi = { yontem: "havale" };

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  ek: { musteri?: string; yontem?: OdemeYontemiSecimi } = {},
) => {
  const kim: OdemeGirdisi["kim"] =
    ek.musteri === undefined
      ? { tur: "misafir", eposta: "misafir@ornek.test", hesap: { ac: false } }
      : { tur: "uye", musteri: ek.musteri };
  const sonuc = await odemeServisi(site).siparisVer(
    vt,
    {
      kim,
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: ek.yontem ?? kapida,
        teslimat: {
          ad: "Deniz",
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
        onBilgilendirmeOnayi: true,
        mesafeliSatisOnayi: true,
        pazarlamaIzni: false,
      }),
      kalemler,
    },
    3600,
  );
  return sonuc.siparis.numara;
};

// Kapıda ödemeli siparişi kargoya ya da teslime kadar getirir.
const ilerlet = async (vt: Veritabani, numara: string, kadar: "kargoda" | "teslim-edildi") => {
  const kim = yonetici();
  await yonetim.islemYap(vt, kim, {
    numara,
    islem: "hazirlamaya-al",
    gorulenDurum: "odeme-bekleniyor",
  });
  await yonetim.islemYap(vt, kim, {
    numara,
    islem: "kargoya-ver",
    gorulenDurum: "hazirlaniyor",
    kargo: { firma: firmaKimligi },
  });
  if (kadar === "teslim-edildi") {
    await yonetim.islemYap(vt, kim, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
  }
};

const oku = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};
const kalemler = async (vt: Veritabani, numara: string) =>
  vt
    .select()
    .from(siparisKalemleri)
    .where(eq(siparisKalemleri.siparis_kimligi, (await oku(vt, numara)).kimlik))
    .orderBy(siparisKalemleri.sira);
const gecmisi = async (vt: Veritabani, numara: string) =>
  vt
    .select()
    .from(siparisGecmisi)
    .where(eq(siparisGecmisi.siparis_kimligi, (await oku(vt, numara)).kimlik))
    .orderBy(siparisGecmisi.zaman);
const talepleri = async (vt: Veritabani, numara: string) =>
  vt
    .select()
    .from(siparisIadeTalepleri)
    .where(eq(siparisIadeTalepleri.siparis_kimligi, (await oku(vt, numara)).kimlik))
    .orderBy(siparisIadeTalepleri.olusturma_zamani);
const stogu = async (vt: Veritabani, birim: string) =>
  (await vt.select().from(birimStoklari).where(eq(birimStoklari.birim_kimligi, birim)))[0]?.miktar;

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

const kurallar = {
  musteriIptali: "odeme-bekleniyor",
  iadeTalebiSuresi: 14,
  iadeKargosu: "magaza",
} as const;

// Teslimi verilen kadar geriye alır (süre testleri); kayıt veritabanının saatiyle yazılır.
const teslimiGeriAl = (vt: Veritabani, numara: string, aralik: string) =>
  vt.execute(
    sql`update siparisler set teslim_zamani = now() - ${aralik}::interval where numara = ${numara}`,
  );

describe("talep edilebilir adet (saf)", () => {
  it("iade edilmiş, bekleyen ve onaylanıp iadesi yapılmamış talep düşülür; reddedilen ve başarısız sayılmaz", () => {
    const kalem = [{ sira: 0, adet: 5 }];
    const iadeEdilen = { tur: "iade", durum: "tamamlandi", kalemler: [{ sira: 0, adet: 1 }] };
    expect(
      talepEdilebilirAdetler(
        kalem,
        [
          { ...iadeEdilen, talep: null },
          { tur: "iade", durum: "basarisiz", kalemler: [{ sira: 0, adet: 3 }], talep: null },
          { tur: "iptal", durum: "tamamlandi", kalemler: [{ sira: 0, adet: 5 }], talep: null },
        ],
        [
          { kimlik: "a", durum: "onaylandi", kalemler: [{ sira: 0, adet: 2 }] },
          { kimlik: "b", durum: "reddedildi", kalemler: [{ sira: 0, adet: 2 }] },
        ],
      ).get(0),
    ).toBe(2);
    // Onaylanan talebin iadesi yapılınca talep düşülmez, iadenin adedi düşülür.
    expect(
      talepEdilebilirAdetler(
        kalem,
        [{ ...iadeEdilen, kalemler: [{ sira: 0, adet: 2 }], talep: "a" }],
        [{ kimlik: "a", durum: "onaylandi", kalemler: [{ sira: 0, adet: 2 }] }],
      ).get(0),
    ).toBe(3);
    expect(
      talepEdilebilirAdetler(kalem, [], [{ kimlik: "c", durum: "bekliyor", kalemler: kalem }]).get(
        0,
      ),
    ).toBe(0);
  });
});

describe("iade talebi", () => {
  it("teslim edilmiş siparişte açılır; geçmişe yazılır, durum değişmez; teslim edilmemiş ve iptal edilen sipariş kapalıdır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const bekleyen = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    const istek = (numara: string) =>
      talepSrv.talepAc(
        h.vt,
        { tur: "musteri", musteri: a },
        { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "beden-uymadi" },
      );
    expect(await hatasi(istek(bekleyen))).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ kod: "talebe-kapali" }],
    });
    const kargodaki = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    await ilerlet(h.vt, kargodaki, "kargoda");
    expect((await hatasi(istek(kargodaki))).ayrinti).toEqual([
      { alan: "numara", kod: "talebe-kapali" },
    ]);
    const iptalEdilen = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    await iade.iadeYap(h.vt, yonetici(), {
      numara: iptalEdilen,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    expect((await hatasi(istek(iptalEdilen))).kod).toBe("is-kurali");

    const numara = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const sonuc = await talepSrv.talepAc(
      h.vt,
      { tur: "musteri", musteri: a },
      {
        numara,
        kalemler: [{ sira: 0, adet: 1 }],
        neden: "kusurlu-hasarli",
        aciklama: "Kapağı kırık geldi.",
      },
    );
    expect(sonuc.numara).toBe(numara);
    const [talep] = await talepleri(h.vt, numara);
    expect(talep).toMatchObject({
      kimlik: sonuc.talep,
      durum: "bekliyor",
      kalemler: [{ sira: 0, adet: 1 }],
      neden: "kusurlu-hasarli",
      aciklama: "Kapağı kırık geldi.",
      kim_turu: "musteri",
      kim_kimligi: a,
      karar_zamani: null,
    });
    expect((await oku(h.vt, numara)).durum).toBe("teslim-edildi");
    expect((await gecmisi(h.vt, numara)).at(-1)).toMatchObject({
      onceki_durum: "teslim-edildi",
      sonraki_durum: "teslim-edildi",
      neden: "iade-talebi-alindi",
      kim_turu: "musteri",
      kim_kimligi: a,
    });
  });

  it("süre veritabanının saatiyle: son andan önce açık, son anda kapalı; süre ayarı uygulanır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const istek = () =>
      talepSrv.talepAc(
        h.vt,
        { tur: "musteri", musteri: a },
        { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "diger" },
      );
    // Son an teslim + 14 gündür: tam sınırda (ve sonrasında) kapalı.
    await teslimiGeriAl(h.vt, numara, "14 days");
    expect(await hatasi(istek())).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ alan: "numara", kod: "sure-doldu" }],
    });
    expect((await musteri.ayrinti(h.vt, a, numara, kurallar))?.iadeTalebi.durum).toBe("sure-doldu");
    // Sınırdan bir an (bir dakika) önce açık.
    await teslimiGeriAl(h.vt, numara, "14 days - 1 minute");
    expect((await musteri.ayrinti(h.vt, a, numara, kurallar))?.iadeTalebi.durum).toBe("acik");
    await istek();
    // Ayar kısalınca aynı sipariş kapanır.
    await h.vt.delete(siparisIadeTalepleri);
    await h.ayarla("odeme-bekleniyor", 7);
    expect((await hatasi(istek())).ayrinti).toEqual([{ alan: "numara", kod: "sure-doldu" }]);
  });

  it("istenen adet talep edilebilir adedi aşamaz: iade edilmiş, onaylanmış ve iadesiz talep düşülür, reddedilen geri gelir", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 4 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const sahip = { tur: "musteri" as const, musteri: a };
    const iste = (adet: number, sira = 0) =>
      talepSrv.talepAc(h.vt, sahip, {
        numara,
        kalemler: [{ sira, adet }],
        neden: "beklentiyi-karsilamadi",
      });
    // Mağaza bir adedi talepsiz iade etti.
    await iade.iadeYap(h.vt, yonetici(), {
      numara,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "diger",
    });
    expect((await hatasi(iste(4))).ayrinti).toEqual([{ alan: "kalemler.0", kod: "adet-fazla" }]);
    expect((await hatasi(iste(1, 7))).ayrinti).toEqual([{ alan: "kalemler.7", kod: "kalem-yok" }]);
    expect((await hatasi(iste(0))).ayrinti).toEqual([{ alan: "kalemler", kod: "kalem-yok" }]);
    const birinci = await iste(2);
    // Bekleyen talep varken ikinci talep çakışır.
    expect(await hatasi(iste(1))).toMatchObject({
      kod: "cakisma",
      ayrinti: [{ kod: "talep-bekliyor" }],
    });
    await talepSrv.kararVer(h.vt, yonetici(), {
      numara,
      talep: birinci.talep,
      karar: "onayla",
    });
    // Onaylanmış, iadesi yapılmamış talepteki iki adet istenemez: kalan bir.
    expect((await hatasi(iste(2))).ayrinti).toEqual([{ alan: "kalemler.0", kod: "adet-fazla" }]);
    const ikinci = await iste(1);
    await talepSrv.kararVer(h.vt, yonetici(), {
      numara,
      talep: ikinci.talep,
      karar: "reddet",
      retAciklamasi: "Ürün kullanılmış.",
    });
    // Reddedilen talebin adedi yeniden istenebilir.
    const ucuncu = await iste(1);
    expect((await musteri.ayrinti(h.vt, a, numara, kurallar))?.kalemler[0]?.talepEdilebilir).toBe(
      0,
    );
    expect((await musteri.ayrinti(h.vt, a, numara, kurallar))?.iadeTalebi.durum).toBe(
      "bekleyen-var",
    );
    await talepSrv.kararVer(h.vt, yonetici(), {
      numara,
      talep: ucuncu.talep,
      karar: "reddet",
      retAciklamasi: "Hayır.",
    });
    // Onaylanan talebin iadesi yapılınca talep düşülmez, iadenin adedi düşülür: 4 − 1 − 2 = 1.
    await iade.iadeYap(h.vt, yonetici(), {
      numara,
      tur: "iade",
      gorulenDurum: "kismi-iade",
      kalemler: [{ sira: 0, adet: 2 }],
      kargo: false,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi",
      talep: birinci.talep,
    });
    const gorunus = await musteri.ayrinti(h.vt, a, numara, kurallar);
    expect(gorunus?.kalemler[0]?.talepEdilebilir).toBe(1);
    expect(gorunus?.iadeTalebi.durum).toBe("acik");
  });

  it("aynı anda iki talepten yalnız biri yazılır (sıra kurularak); veritabanı ikinci bekleyen talebi reddeder", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const girdi = { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "diger" as const };
    let birak = () => {};
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    let kilitlendi = () => {};
    const kilitli = new Promise<void>((tamam) => {
      kilitlendi = tamam;
    });
    const tutan = h.vt.transaction(async (islem) => {
      await islem.select().from(siparisler).where(eq(siparisler.numara, numara)).for("update");
      kilitlendi();
      await bekle;
    });
    await Promise.race([kilitli, tutan]);
    const birinci = talepSrv.talepAc(h.vt, { tur: "musteri", musteri: a }, girdi);
    await kilitBekleyeniGor(h.vt);
    const ikinci = talepSrv.talepAc(h.vt, { tur: "musteri", musteri: a }, girdi).then(
      (sonuc) => sonuc,
      (hata: unknown) => hata,
    );
    await kilitBekleyeniGor(h.vt, 2);
    birak();
    await tutan;
    const sonuclar = await Promise.all([birinci, ikinci]);
    expect(sonuclar[0]).toMatchObject({ numara });
    expect(sonuclar[1]).toBeInstanceOf(BilinenHata);
    expect((sonuclar[1] as BilinenHata).kod).toBe("cakisma");
    expect(await talepleri(h.vt, numara)).toHaveLength(1);
    // Servisi atlayan ikinci bekleyen talep veritabanında reddedilir.
    const siparis = await oku(h.vt, numara);
    await expect(
      h.vt.insert(siparisIadeTalepleri).values({
        siparis_kimligi: siparis.kimlik,
        durum: "bekliyor",
        kalemler: [{ sira: 0, adet: 1 }],
        neden: "diger",
        kim_turu: "musteri",
        kim_kimligi: a,
      }),
    ).rejects.toThrow();
  });

  it("onay ve ret geçmişe ve değişiklik kaydına yazılır; ikinci karar çakışır; ret açıklamasız yazılmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 3 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const sahip = { tur: "musteri" as const, musteri: a };
    const girdi = { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "diger" as const };
    const birinci = await talepSrv.talepAc(h.vt, sahip, girdi);
    const karari = yonetici();
    expect(
      await talepSrv.kararVer(h.vt, karari, { numara, talep: birinci.talep, karar: "onayla" }),
    ).toEqual({ numara, durum: "onaylandi" });
    expect(
      await hatasi(
        talepSrv.kararVer(h.vt, yonetici(), {
          numara,
          talep: birinci.talep,
          karar: "reddet",
          retAciklamasi: "Geç.",
        }),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "talep-degisti" }] });
    const ikinci = await talepSrv.talepAc(h.vt, sahip, girdi);
    await talepSrv.kararVer(h.vt, karari, {
      numara,
      talep: ikinci.talep,
      karar: "reddet",
      retAciklamasi: "İade süresi içinde değil.",
    });
    const [onaylanan, reddedilen] = await talepleri(h.vt, numara);
    expect(onaylanan).toMatchObject({ durum: "onaylandi", karar_veren_kimligi: karari.kimlik });
    expect(onaylanan?.karar_zamani).not.toBeNull();
    expect(reddedilen).toMatchObject({
      durum: "reddedildi",
      ret_aciklamasi: "İade süresi içinde değil.",
    });
    expect((await gecmisi(h.vt, numara)).slice(-4).map((satir) => satir.neden)).toEqual([
      "iade-talebi-alindi",
      "iade-talebi-onaylandi",
      "iade-talebi-alindi",
      "iade-talebi-reddedildi",
    ]);
    const kayitlar = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, (await oku(h.vt, numara)).kimlik),
          sql`${degisiklikKayitlari.islem} like 'siparis.iade-talebi-%'`,
        ),
      );
    expect(kayitlar.map((kayit) => kayit.islem).sort()).toEqual([
      "siparis.iade-talebi-onaylandi",
      "siparis.iade-talebi-reddedildi",
    ]);
    // Ret açıklaması (müşteriye yazılan serbest metin) kayda girmez.
    expect(JSON.stringify(kayitlar)).not.toContain("İade süresi");
    // Başka siparişin talebi ya da olmayan talep bulunamaz.
    expect(
      (
        await hatasi(
          talepSrv.kararVer(h.vt, karari, { numara, talep: randomUUID(), karar: "onayla" }),
        )
      ).kod,
    ).toBe("bulunamadi");
    // Veritabanı açıklamasız reddi ve açıklamalı onayı reddeder.
    const ucuncu = await talepSrv.talepAc(h.vt, sahip, girdi);
    await expect(
      h.vt
        .update(siparisIadeTalepleri)
        .set({ durum: "reddedildi", karar_zamani: sql`now()`, karar_veren_kimligi: randomUUID() })
        .where(eq(siparisIadeTalepleri.kimlik, ucuncu.talep)),
    ).rejects.toThrow();
    await expect(
      h.vt
        .update(siparisIadeTalepleri)
        .set({
          durum: "onaylandi",
          karar_zamani: sql`now()`,
          karar_veren_kimligi: randomUUID(),
          ret_aciklamasi: "x",
        })
        .where(eq(siparisIadeTalepleri.kimlik, ucuncu.talep)),
    ).rejects.toThrow();
  });

  it("onaylanan talepten yapılan iade talebe bağlanır; aynı talepten ikinci iade, bekleyen ve iptalde talep reddedilir", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 3 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const sahip = { tur: "musteri" as const, musteri: a };
    const { talep } = await talepSrv.talepAc(h.vt, sahip, {
      numara,
      kalemler: [{ sira: 0, adet: 1 }],
      neden: "yanlis-urun",
    });
    const iadeGirdisi = {
      numara,
      tur: "iade" as const,
      gorulenDurum: "teslim-edildi" as const,
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "yanlis-urun" as const,
      talep,
    };
    expect(await hatasi(iade.iadeYap(h.vt, yonetici(), iadeGirdisi))).toMatchObject({
      kod: "cakisma",
      ayrinti: [{ kod: "talep-onayli-degil" }],
    });
    await talepSrv.kararVer(h.vt, yonetici(), { numara, talep, karar: "onayla" });
    expect(
      (
        await hatasi(
          iade.iadeYap(h.vt, yonetici(), {
            ...iadeGirdisi,
            talep: randomUUID(),
          }),
        )
      ).kod,
    ).toBe("bulunamadi");
    await iade.iadeYap(h.vt, yonetici(), iadeGirdisi);
    const [yapilan] = await h.vt.select().from(siparisIadeleri);
    expect(yapilan).toMatchObject({
      talep_kimligi: talep,
      kaynak: "yonetici",
      neden: "yanlis-urun",
    });
    expect(
      await hatasi(iade.iadeYap(h.vt, yonetici(), { ...iadeGirdisi, gorulenDurum: "kismi-iade" })),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "talep-iade-edildi" }] });
    // Panelin ayrıntısında talebin iadesi yapılmış görünür.
    expect((await yonetim.ayrinti(h.vt, numara))?.talepler[0]).toMatchObject({
      kimlik: talep,
      iadeYapildi: true,
    });
    // Veritabanı: iptal talebe bağlanamaz.
    await expect(
      h.vt
        .update(siparisIadeleri)
        .set({ tur: "iptal" })
        .where(eq(siparisIadeleri.talep_kimligi, talep)),
    ).rejects.toThrow();
  });

  it("başkasının siparişine talep yok: başka üye, üye olmadan verilmiş sipariş, başka takip siparişi; iki site ayrıdır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const b = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    const uyesiz = await ver(h.vt, [{ birim, adet: 1 }]);
    await ilerlet(h.vt, numara, "teslim-edildi");
    await ilerlet(h.vt, uyesiz, "teslim-edildi");
    const girdi = (n: string) => ({
      numara: n,
      kalemler: [{ sira: 0, adet: 1 }],
      neden: "diger" as const,
    });
    expect(
      (await hatasi(talepSrv.talepAc(h.vt, { tur: "musteri", musteri: b }, girdi(numara)))).kod,
    ).toBe("bulunamadi");
    expect(
      (await hatasi(talepSrv.talepAc(h.vt, { tur: "musteri", musteri: a }, girdi(uyesiz)))).kod,
    ).toBe("bulunamadi");
    // Takip anahtarının siparişi başka numarayla kullanılamaz.
    const uyesizKimlik = (await oku(h.vt, uyesiz)).kimlik;
    expect(
      (await hatasi(talepSrv.talepAc(h.vt, { tur: "takip", siparis: uyesizKimlik }, girdi(numara))))
        .kod,
    ).toBe("bulunamadi");
    expect(
      (
        await hatasi(
          talepSrv.musteriIptali(
            h.vt,
            { tur: "musteri", musteri: b },
            { numara, gorulenDurum: "teslim-edildi" },
          ),
        )
      ).kod,
    ).toBe("bulunamadi");
    // Takiple açılan talep üye olmayan müşteri adıyla yazılır.
    await talepSrv.talepAc(h.vt, { tur: "takip", siparis: uyesizKimlik }, girdi(uyesiz));
    expect((await talepleri(h.vt, uyesiz))[0]).toMatchObject({
      kim_turu: "sistem",
      kim_adi: "uye-olmayan-musteri",
      kim_kimligi: null,
    });
    expect(await talepleri(h.vt, numara)).toEqual([]);
    // Başka sitenin veritabanında aynı numara bulunamaz.
    const h2 = await hazirla("iade-talebi-iki");
    expect(
      (await hatasi(talepSrv.talepAc(h2.vt, { tur: "musteri", musteri: a }, girdi(numara)))).kod,
    ).toBe("bulunamadi");
  });

  it("veritabanının talep durum ve neden denetimi, iadenin kaynak denetimi kayıtla aynı", async () => {
    const h = await hazirla();
    const { iadeTalebiDurumlari, musteriIadeNedenleri, iadeKaynaklari } = await import(
      "../../../kayitlar/siparis.ts"
    );
    const degerler = async (tablo: string, ad: string) => {
      const tanim = await h.vt.execute<{ ad: string; tanim: string }>(
        sql`select conname as ad, pg_get_constraintdef(oid) as tanim from pg_constraint where conrelid = ${tablo}::regclass and contype = 'c'`,
      );
      return [...(tanim.rows.find((satir) => satir.ad === ad)?.tanim ?? "").matchAll(/'([^']+)'/g)]
        .map((e) => e[1])
        .sort();
    };
    expect(await degerler("siparis_iade_talepleri", "siparis_iade_talepleri_durum")).toEqual(
      [...iadeTalebiDurumlari].sort(),
    );
    expect(await degerler("siparis_iade_talepleri", "siparis_iade_talepleri_neden")).toEqual(
      [...musteriIadeNedenleri].sort(),
    );
    expect(await degerler("siparis_iadeleri", "siparis_iadeleri_kaynak")).toEqual(
      [...iadeKaynaklari].sort(),
    );
  });
});

describe("bağımsız kontrolün bulguları", () => {
  it("iadesi bitmiş siparişte talep onaylanmaz, reddedilir", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const { talep } = await talepSrv.talepAc(
      h.vt,
      { tur: "musteri", musteri: a },
      { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "diger" },
    );
    // Mağaza ürünü talepsiz iade etti: sipariş "iade edildi".
    await iade.iadeYap(h.vt, yonetici(), {
      numara,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: true,
      stogaKoy: true,
      neden: "diger",
    });
    expect((await oku(h.vt, numara)).durum).toBe("iade-edildi");
    expect(
      await hatasi(talepSrv.kararVer(h.vt, yonetici(), { numara, talep, karar: "onayla" })),
    ).toMatchObject({ kod: "is-kurali", ayrinti: [{ kod: "talebe-kapali" }] });
    expect(
      await talepSrv.kararVer(h.vt, yonetici(), {
        numara,
        talep,
        karar: "reddet",
        retAciklamasi: "Ürün zaten iade edildi.",
      }),
    ).toEqual({ numara, durum: "reddedildi" });
  });

  it("takipte müşterinin talep açıklaması gitmez; kişisel veri temizliği açıklamayı siler, ret açıklaması kalır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }]);
    await ilerlet(h.vt, numara, "teslim-edildi");
    const siparis = await oku(h.vt, numara);
    const { talep } = await talepSrv.talepAc(
      h.vt,
      { tur: "takip", siparis: siparis.kimlik },
      { numara, kalemler: [{ sira: 0, adet: 1 }], neden: "diger", aciklama: "Tel 0555 000 00 00" },
    );
    await talepSrv.kararVer(h.vt, yonetici(), {
      numara,
      talep,
      karar: "reddet",
      retAciklamasi: "Fotoğraf gönderin.",
    });
    const { anahtar } = await musteri.takipBaslat(h.vt, {
      numara,
      eposta: "misafir@ornek.test",
    });
    const takipteki = await musteri.takipleOku(h.vt, anahtar, kurallar);
    expect(takipteki?.talepler[0]).toMatchObject({
      aciklama: null,
      retAciklamasi: "Fotoğraf gönderin.",
    });
    await h.vt.execute(
      sql`update siparisler set olusturma_zamani = now() - interval '20 years' where numara = ${numara}`,
    );
    await kisiselVeriTemizligi(h.vt, site);
    expect((await talepleri(h.vt, numara))[0]).toMatchObject({
      aciklama: null,
      ret_aciklamasi: "Fotoğraf gönderin.",
    });
  });

  it("görünüşün son anı veritabanının saatiyle gün eklenerek bulunur", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const beklenen = await h.vt.execute<{ son: string }>(
      sql`select teslim_zamani + make_interval(days => 14) as son from siparisler where numara = ${numara}`,
    );
    const gorunus = await musteri.ayrinti(h.vt, a, numara, kurallar);
    expect(gorunus?.iadeTalebi.sonZaman?.getTime()).toBe(
      new Date(beklenen.rows[0]?.son ?? "").getTime(),
    );
  });
});

describe("müşterinin kendi iptali", () => {
  it("ödeme beklenirken (varsayılan): iptal edilir, stok döner, geçmişe musteri-iptali, iadeye kaynak müşteri", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    expect(await stogu(h.vt, birim)).toBe(48);
    expect((await musteri.ayrinti(h.vt, a, numara, kurallar))?.iptal).toBe("acik");
    // Ekranın gördüğü durum eskiyse çakışır.
    expect(
      (
        await hatasi(
          talepSrv.musteriIptali(
            h.vt,
            { tur: "musteri", musteri: a },
            { numara, gorulenDurum: "hazirlaniyor" },
          ),
        )
      ).kod,
    ).toBe("cakisma");
    const sonuc = await talepSrv.musteriIptali(
      h.vt,
      { tur: "musteri", musteri: a },
      { numara, gorulenDurum: "odeme-bekleniyor" },
    );
    expect(sonuc).toMatchObject({ numara, durum: "iptal", iade: "tamamlandi" });
    expect(await stogu(h.vt, birim)).toBe(50);
    expect((await gecmisi(h.vt, numara)).at(-1)).toMatchObject({
      sonraki_durum: "iptal",
      neden: "musteri-iptali",
      kim_turu: "musteri",
      kim_kimligi: a,
    });
    const [yapilan] = await h.vt.select().from(siparisIadeleri);
    expect(yapilan).toMatchObject({
      tur: "iptal",
      kaynak: "musteri",
      neden: "musteri-vazgecti",
      tutar: 0,
    });
    // Panelin iptali yonetici-iptali yazar (kaynak yönetici).
    const panelden = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    await iade.iadeYap(h.vt, yonetici(), {
      numara: panelden,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "stok-yok",
    });
    expect((await gecmisi(h.vt, panelden)).at(-1)?.neden).toBe("yonetici-iptali");
  });

  it("ayarın üç değeri ve durum sınırı: hazırlanan yalnız 'kargoya verilene kadar'da, kargodaki hiçbirinde, kapalıda hiçbiri", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const sahip = { tur: "musteri" as const, musteri: a };
    const hazirlanan = async () => {
      const numara = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
      await yonetim.islemYap(h.vt, yonetici(), {
        numara,
        islem: "hazirlamaya-al",
        gorulenDurum: "odeme-bekleniyor",
      });
      return numara;
    };
    const iptal = (numara: string, gorulenDurum: "odeme-bekleniyor" | "hazirlaniyor" | "kargoda") =>
      talepSrv.musteriIptali(h.vt, sahip, { numara, gorulenDurum });
    const birinci = await hazirlanan();
    expect(await hatasi(iptal(birinci, "hazirlaniyor"))).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ kod: "iptal-kapali" }],
    });
    expect((await musteri.ayrinti(h.vt, a, birinci, kurallar))?.iptal).toBe("yok");
    await h.ayarla("kargoya-verilene-kadar");
    const genis = { ...kurallar, musteriIptali: "kargoya-verilene-kadar" } as const;
    expect((await musteri.ayrinti(h.vt, a, birinci, genis))?.iptal).toBe("acik");
    expect(await iptal(birinci, "hazirlaniyor")).toMatchObject({ durum: "iptal" });
    const kargodaki = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    await ilerlet(h.vt, kargodaki, "kargoda");
    expect((await hatasi(iptal(kargodaki, "kargoda"))).kod).toBe("is-kurali");
    await h.ayarla("kapali");
    const bekleyen = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a });
    expect(await hatasi(iptal(bekleyen, "odeme-bekleniyor"))).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ kod: "iptal-kapali" }],
    });
    expect(
      (await musteri.ayrinti(h.vt, a, bekleyen, { ...kurallar, musteriIptali: "kapali" }))?.iptal,
    ).toBe("yok");
    expect((await oku(h.vt, bekleyen)).durum).toBe("odeme-bekleniyor");
  });

  it("ödemesi havaleyle alınmış sipariş müşteri tarafından iptal edilmez; görünüş mağazayı söyler", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    await h.ayarla("kargoya-verilene-kadar");
    const numara = await ver(h.vt, [{ birim, adet: 1 }], { musteri: a, yontem: havale });
    await yonetim.islemYap(h.vt, yonetici(), {
      numara,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    expect(
      await hatasi(
        talepSrv.musteriIptali(
          h.vt,
          { tur: "musteri", musteri: a },
          { numara, gorulenDurum: "hazirlaniyor" },
        ),
      ),
    ).toMatchObject({ kod: "is-kurali", ayrinti: [{ kod: "iptal-magazadan" }] });
    expect(
      (
        await musteri.ayrinti(h.vt, a, numara, {
          ...kurallar,
          musteriIptali: "kargoya-verilene-kadar",
        })
      )?.iptal,
    ).toBe("magazadan");
    expect((await oku(h.vt, numara)).durum).toBe("hazirlaniyor");
    expect(await h.vt.select().from(siparisIadeleri)).toEqual([]);
  });
});

describe("müşterinin görünüşü", () => {
  it("talepler nedeni, ret açıklaması ve karar zamanıyla gelir; kararı veren yönetici gelmez", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const a = await h.musteriAc();
    const numara = await ver(h.vt, [{ birim, adet: 2 }], { musteri: a });
    await ilerlet(h.vt, numara, "teslim-edildi");
    const { talep } = await talepSrv.talepAc(
      h.vt,
      { tur: "musteri", musteri: a },
      { numara, kalemler: [{ sira: 0, adet: 2 }], neden: "beden-uymadi", aciklama: "Küçük." },
    );
    await talepSrv.kararVer(h.vt, yonetici(), {
      numara,
      talep,
      karar: "reddet",
      retAciklamasi: "Etiketi koparılmış.",
    });
    const gorunus = await musteri.ayrinti(h.vt, a, numara, kurallar);
    expect(gorunus?.talepler).toEqual([
      {
        kimlik: talep,
        durum: "reddedildi",
        kalemler: [{ sira: 0, adet: 2 }],
        neden: "beden-uymadi",
        aciklama: "Küçük.",
        retAciklamasi: "Etiketi koparılmış.",
        zaman: expect.any(Date),
        kararZamani: expect.any(Date),
      },
    ]);
    expect(gorunus?.iadeTalebi).toMatchObject({ durum: "acik", kargo: "magaza" });
    expect(gorunus?.iadeTalebi.sonZaman?.getTime()).toBe(
      ((await oku(h.vt, numara)).teslim_zamani?.getTime() ?? 0) + 14 * 24 * 60 * 60 * 1000,
    );
    expect((await kalemler(h.vt, numara))[0]?.adet).toBe(2);
  });
});
