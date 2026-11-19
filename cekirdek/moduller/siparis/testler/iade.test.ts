// İptal, tam ve kısmi iade gerçek veritabanıyla (kart 0235, karar 0147). Kartla ödemedeki iade kartla ödeme
// eklentisinin testindedir (cekirdek/eklentiler/kartla-odeme/testler/servis.test.ts).
// - İptal ödeme bekleniyor ve hazırlanıyor durumunda: ödenmemişte tutar 0, ödenmişte ödenen tutar (elle).
// - Kısmi iade siparişin saklanan kalem değerlerinden; iki kısmi iadeden sonra "iade edildi", yeni iade yapılamaz.
// - Stoğa geri koymak seçimlidir; geri konan adet yalnız siparişin düşürüp geri konmamış adedidir.
// - Geçmiş ve değişiklik kaydı; ekranın gördüğü durum eskiyse çakışma; aynı anda iki iadeden biri (sıra kurularak).
// - Bekleyen iade varken ne durum işlemi ne yeni iade yapılır. İki site ayrıdır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { siteninBicimleyicisi } from "../../../metinler/site-metni.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { kilitBekleyeniGor } from "../../../veritabani/testler/kilit-bekleyen.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { birimStoklari } from "../../stok/model.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { type IadeGirdisi, iadeServisi } from "../iade.ts";
import { siparisGecmisi, siparisIadeleri, siparisKalemleri, siparisler } from "../model.ts";
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
const iade = iadeServisi(site);
const yonetim = siparisYonetimi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const yapan = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const hazirla = async (ad = "siparis-iade") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunAc = async ({ takip = true, fiyat = 10_000 } = {}) => {
    const urun = await urunSrv.urunEkle(vt, yapan(), {
      ad: `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: takip,
    });
    const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
    await siteninFiyatServisi(site).fiyatYaz(vt, yapan(), birim, { satisFiyati: fiyat });
    if (takip) {
      await stokServisi().stokDuzelt(vt, yapan(), birim, {
        yeniMiktar: 50,
        gorulenMiktar: 0,
        sebep: "sayim",
      });
    }
    return birim;
  };
  return { vt, urunAc };
};

const havale: OdemeYontemiSecimi = { yontem: "havale" };
const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };

const ver = async (
  vt: Veritabani,
  kalemler: { birim: string; adet: number }[],
  yontem: OdemeYontemiSecimi = kapida,
) =>
  (
    await odemeServisi(site).siparisVer(
      vt,
      {
        kim: { tur: "misafir", eposta: "misafir@ornek.test", hesap: { ac: false } },
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: yontem,
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
    )
  ).siparis.numara;

// Kapıda ödemeli siparişi teslim edildiye getirir (ödeme teslimde alınır).
const teslimEt = async (vt: Veritabani, numara: string) => {
  const kim = yapan();
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
  await yonetim.islemYap(vt, kim, { numara, islem: "teslim-edildi", gorulenDurum: "kargoda" });
};

const oku = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};
const stogu = async (vt: Veritabani, birim: string) =>
  (await vt.select().from(birimStoklari).where(eq(birimStoklari.birim_kimligi, birim)))[0]?.miktar;
const kalemleri = async (vt: Veritabani, numara: string) => {
  const siparis = await oku(vt, numara);
  return vt
    .select()
    .from(siparisKalemleri)
    .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik))
    .orderBy(siparisKalemleri.sira);
};
const iadeleri = async (vt: Veritabani, numara: string) => {
  const siparis = await oku(vt, numara);
  return vt
    .select()
    .from(siparisIadeleri)
    .where(eq(siparisIadeleri.siparis_kimligi, siparis.kimlik));
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

const girdi = (numara: string, ek: Partial<IadeGirdisi>): IadeGirdisi => ({
  numara,
  tur: "iade",
  gorulenDurum: "teslim-edildi",
  kalemler: [],
  kargo: false,
  stogaKoy: true,
  neden: "beklentiyi-karsilamadi",
  ...ek,
});

describe("iptal", () => {
  it("ödenmemiş sipariş iptal edilir: tutar 0, stok döner, geçmiş ve değişiklik kaydı yazılır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 3 }], havale);
    expect(await stogu(h.vt, birim)).toBe(47);
    const kim = yapan();
    expect(
      await iade.iadeYap(
        h.vt,
        kim,
        girdi(numara, {
          tur: "iptal",
          gorulenDurum: "odeme-bekleniyor",
          neden: "musteri-vazgecti",
        }),
      ),
    ).toEqual({ numara, durum: "iptal", iade: "tamamlandi" });
    expect(await stogu(h.vt, birim)).toBe(50);
    const [kayit] = await iadeleri(h.vt, numara);
    expect(kayit).toMatchObject({
      tur: "iptal",
      durum: "tamamlandi",
      yontem: "yok",
      tutar: 0,
      neden: "musteri-vazgecti",
    });
    const siparis = await oku(h.vt, numara);
    const gecmis = await h.vt
      .select()
      .from(siparisGecmisi)
      .where(
        and(
          eq(siparisGecmisi.siparis_kimligi, siparis.kimlik),
          eq(siparisGecmisi.neden, "yonetici-iptali"),
        ),
      );
    expect(gecmis).toMatchObject([
      { onceki_durum: "odeme-bekleniyor", sonraki_durum: "iptal", kim_turu: "yonetici" },
    ]);
    const kayitlar = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.islem, "siparis.iptal-edildi"));
    expect(kayitlar).toHaveLength(1);
    expect(kayitlar[0]?.yeni_deger).toMatchObject({ durum: "iptal", tutar: 0, stogaKondu: true });
  });

  it("ödemesi alınmış (onaylı havale) sipariş iptalinde ödenen tutar elle geri ödenir", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }], havale);
    await yonetim.islemYap(h.vt, yapan(), {
      numara,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    const siparis = await oku(h.vt, numara);
    await iade.iadeYap(
      h.vt,
      yapan(),
      girdi(numara, { tur: "iptal", gorulenDurum: "hazirlaniyor", stogaKoy: false }),
    );
    expect((await oku(h.vt, numara)).durum).toBe("iptal");
    expect(await iadeleri(h.vt, numara)).toMatchObject([
      {
        tur: "iptal",
        yontem: "elle",
        tutar: siparis.toplam,
        vergi_dokumu: siparis.vergi_dokumu,
        stoga_konacak: false,
      },
    ]);
    // Stoğa geri koyma seçilmedi: stok düşmüş kalır.
    expect(await stogu(h.vt, birim)).toBe(49);
  });

  it("kargodaki ve teslim edilmiş sipariş iptal edilmez; ekranın gördüğü durum eskiyse çakışır", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }]);
    await teslimEt(h.vt, numara);
    expect(
      await hatasi(iade.iadeYap(h.vt, yapan(), girdi(numara, { tur: "iptal" }))),
    ).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ alan: "tur", kod: "gecis-yok" }],
    });
    expect(
      await hatasi(
        iade.iadeYap(h.vt, yapan(), girdi(numara, { tur: "iptal", gorulenDurum: "hazirlaniyor" })),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "durum-degisti" }] });
    expect(await iadeleri(h.vt, numara)).toEqual([]);
  });
});

describe("iade", () => {
  it("iki kısmi iade: tutar ve vergi siparişin kaleminden, kısmi iade sonra iade edildi; sonra iade yapılmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc({ fiyat: 3333 });
    const numara = await ver(h.vt, [{ birim, adet: 3 }]);
    await teslimEt(h.vt, numara);
    const [kalem] = await kalemleri(h.vt, numara);
    if (kalem === undefined) throw new Error("Kalem yok.");
    const siparis = await oku(h.vt, numara);
    // Elle: 1 adetin payı round(maliyet/3), vergisi round(vergi/3).
    const maliyet = kalem.vergisiz + kalem.vergi;
    const birAdet = Math.round(maliyet / 3);
    const birVergi = Math.round(kalem.vergi / 3);
    expect(
      await iade.iadeYap(
        h.vt,
        yapan(),
        girdi(numara, { kalemler: [{ sira: kalem.sira, adet: 1 }] }),
      ),
    ).toEqual({ numara, durum: "kismi-iade", iade: "tamamlandi" });
    const [ilk] = await iadeleri(h.vt, numara);
    expect(ilk).toMatchObject({ tutar: birAdet, yontem: "elle", kargo_tutari: 0 });
    expect(ilk?.vergi_dokumu.reduce((t, satir) => t + satir.vergi, 0)).toBe(birVergi);
    expect(await stogu(h.vt, birim)).toBe(48);

    // Kalan 2 adet ve kargo, stoğa koymadan: ödenen kalan (toplam − ilk) döner.
    expect(
      await iade.iadeYap(
        h.vt,
        yapan(),
        girdi(numara, {
          gorulenDurum: "kismi-iade",
          kalemler: [{ sira: kalem.sira, adet: 2 }],
          kargo: true,
          stogaKoy: false,
          neden: "kusurlu-hasarli",
        }),
      ),
    ).toEqual({ numara, durum: "iade-edildi", iade: "tamamlandi" });
    const toplam = (await iadeleri(h.vt, numara)).reduce((t, satir) => t + satir.tutar, 0);
    expect(toplam).toBe(siparis.toplam);
    expect(await stogu(h.vt, birim)).toBe(48);
    expect(
      await hatasi(
        iade.iadeYap(h.vt, yapan(), girdi(numara, { gorulenDurum: "iade-edildi", kalemler: [] })),
      ),
    ).toMatchObject({ kod: "is-kurali", ayrinti: [{ kod: "gecis-yok" }] });
  });

  it("toplam ödenen tutarı aşamaz; okunamayan elle tutar alanın hatasıdır; hiçbir şey yazılmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }]);
    await teslimEt(h.vt, numara);
    const siparis = await oku(h.vt, numara);
    const fazla = siteninBicim(siparis.toplam + 1);
    expect(
      await hatasi(iade.iadeYap(h.vt, yapan(), girdi(numara, { tutar: fazla }))),
    ).toMatchObject({
      kod: "is-kurali",
      ayrinti: [{ alan: "tutar", kod: "tutar-fazla" }],
    });
    expect(
      await hatasi(iade.iadeYap(h.vt, yapan(), girdi(numara, { tutar: "on beş" }))),
    ).toMatchObject({
      kod: "dogrulama",
      ayrinti: [{ alan: "tutar", kod: "tutar-okunamadi" }],
    });
    // Tam tutar elle yazılınca geçer.
    await iade.iadeYap(h.vt, yapan(), girdi(numara, { tutar: siteninBicim(siparis.toplam) }));
    expect((await iadeleri(h.vt, numara)).map((satir) => satir.tutar)).toEqual([siparis.toplam]);
    expect((await oku(h.vt, numara)).durum).toBe("kismi-iade");
  });

  it("stoğa yalnız siparişin düşürüp geri konmamış adedi konur; takibi kapalı ürüne hiçbir şey konmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const takipsiz = await h.urunAc({ takip: false });
    const numara = await ver(h.vt, [
      { birim, adet: 2 },
      { birim: takipsiz, adet: 1 },
    ]);
    await teslimEt(h.vt, numara);
    // Siparişin stoğunun bir adedi başka yoldan geri konmuş gibi: geçmişe iade satırı yazılır.
    const siparis = await oku(h.vt, numara);
    await h.vt.transaction((islem) =>
      stokServisi().stokArtir(islem, yapan(), [{ birim, adet: 1 }], {
        sebep: "siparis-iadesi",
        kaynak: siparis.kimlik,
      }),
    );
    expect(await stogu(h.vt, birim)).toBe(49);
    const kalemler = await kalemleri(h.vt, numara);
    await iade.iadeYap(
      h.vt,
      yapan(),
      girdi(numara, {
        kalemler: kalemler.map((kalem) => ({ sira: kalem.sira, adet: kalem.adet })),
      }),
    );
    // 2 adet seçildi, yalnız kalan 1 adet geri konur.
    expect(await stogu(h.vt, birim)).toBe(50);
    expect(await stogu(h.vt, takipsiz)).toBeUndefined();
  });

  it("aynı anda iki tam iadeden yalnız biri yazılır (sıra kurularak)", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }]);
    await teslimEt(h.vt, numara);
    const [kalem] = await kalemleri(h.vt, numara);
    const tam = girdi(numara, { kalemler: [{ sira: kalem?.sira ?? 0, adet: 1 }], kargo: true });
    let birak = () => {};
    const bekle = new Promise<void>((tamam) => {
      birak = tamam;
    });
    let kilitlendi = () => {};
    const kilitli = new Promise<void>((tamam) => {
      kilitlendi = tamam;
    });
    // Birinci iade siparişin satırını tutar gibi: satır kilitli, iade bu işlemin içinde yapılır gibi bekler.
    const tutan = h.vt.transaction(async (islem) => {
      await islem.select().from(siparisler).where(eq(siparisler.numara, numara)).for("update");
      kilitlendi();
      await bekle;
    });
    await Promise.race([kilitli, tutan]);
    const birinci = iade.iadeYap(h.vt, yapan(), tam);
    await kilitBekleyeniGor(h.vt);
    const ikinci = iade.iadeYap(h.vt, yapan(), tam).then(
      (sonuc) => sonuc,
      (hata: unknown) => hata,
    );
    await kilitBekleyeniGor(h.vt, 2);
    birak();
    await tutan;
    const sonuclar = await Promise.all([birinci, ikinci]);
    expect(sonuclar[0]).toMatchObject({ durum: "iade-edildi" });
    expect(sonuclar[1]).toBeInstanceOf(BilinenHata);
    expect((sonuclar[1] as BilinenHata).kod).toBe("cakisma");
    expect(await iadeleri(h.vt, numara)).toHaveLength(1);
  });

  it("bekleyen iade varken durum işlemi ve yeni iade yapılmaz; veritabanı ikinci bekleyeni reddeder", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const numara = await ver(h.vt, [{ birim, adet: 1 }]);
    await yonetim.islemYap(h.vt, yapan(), {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    const siparis = await oku(h.vt, numara);
    const bekleyen = {
      siparis_kimligi: siparis.kimlik,
      tur: "iptal",
      durum: "bekliyor",
      yontem: "kurulus",
      tutar: 100,
      vergi_dokumu: [],
      kalemler: [],
      kargo_tutari: 0,
      stoga_konacak: true,
      neden: "diger",
      kim_turu: "sistem",
      kim_adi: "test",
    };
    await h.vt.insert(siparisIadeleri).values(bekleyen);
    expect(
      await hatasi(
        yonetim.islemYap(h.vt, yapan(), {
          numara,
          islem: "kargoya-ver",
          gorulenDurum: "hazirlaniyor",
          kargo: { firma: firmaKimligi },
        }),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "iade-bekliyor" }] });
    expect(
      await hatasi(
        iade.iadeYap(h.vt, yapan(), girdi(numara, { tur: "iptal", gorulenDurum: "hazirlaniyor" })),
      ),
    ).toMatchObject({ kod: "cakisma", ayrinti: [{ kod: "iade-bekliyor" }] });
    await expect(h.vt.insert(siparisIadeleri).values(bekleyen)).rejects.toThrow();
    // Tutarı olmayan iade "yok" yönteminde, tutarlı iade yöntemli olmalı (veritabanı denetimi).
    await expect(
      h.vt.insert(siparisIadeleri).values({ ...bekleyen, durum: "tamamlandi", yontem: "yok" }),
    ).rejects.toThrow();
    expect((await oku(h.vt, numara)).durum).toBe("hazirlaniyor");
  });

  it("veritabanının tür, durum, yöntem ve neden denetimi kayıtla aynı", async () => {
    const h = await hazirla();
    const tanim = await h.vt.execute<{ ad: string; tanim: string }>(
      sql`select conname as ad, pg_get_constraintdef(oid) as tanim from pg_constraint where conrelid = 'siparis_iadeleri'::regclass and contype = 'c'`,
    );
    const { iadeDurumlari, iadeNedenleri, iadeTurleri } = await import(
      "../../../kayitlar/siparis.ts"
    );
    const degerler = (ad: string) =>
      [...(tanim.rows.find((satir) => satir.ad === ad)?.tanim ?? "").matchAll(/'([^']+)'/g)]
        .map((e) => e[1])
        .sort();
    expect(degerler("siparis_iadeleri_tur")).toEqual([...iadeTurleri].sort());
    expect(degerler("siparis_iadeleri_durum")).toEqual([...iadeDurumlari].sort());
    expect(degerler("siparis_iadeleri_neden")).toEqual([...iadeNedenleri].sort());
  });

  it("bir sitenin siparişi öteki sitede bulunamaz", async () => {
    const a = await hazirla("siparis-iade-a");
    const b = await hazirla("siparis-iade-b");
    const birim = await a.urunAc();
    const numara = await ver(a.vt, [{ birim, adet: 1 }], havale);
    expect(
      await hatasi(
        iade.iadeYap(
          b.vt,
          yapan(),
          girdi(numara, { tur: "iptal", gorulenDurum: "odeme-bekleniyor" }),
        ),
      ),
    ).toMatchObject({ kod: "bulunamadi" });
    expect((await oku(a.vt, numara)).durum).toBe("odeme-bekleniyor");
  });
});

// Sitenin para biçimiyle simgesiz yazılış (panelin tutar alanı gibi).
const siteninBicim = (kurus: number) => siteninBicimleyicisi(site.ayarlar).paraYazisi(kurus);
