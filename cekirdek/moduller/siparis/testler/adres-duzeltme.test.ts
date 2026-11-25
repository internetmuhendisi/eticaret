// Siparişin teslimat ve fatura bilgilerinin düzeltilmesi gerçek veritabanıyla (kart 0269, karar 0180):
// - Ödeme beklenirken ve hazırlanırken düzeltilir; kargodaki, teslim edilmiş ve iptal edilmiş siparişte reddedilir.
// - Ekranın gördüğü hâl (surum) tutmazsa çakışma; aynı anda iki düzeltmeden biri geçer. Hiçbir hatada bir şey yazılmaz.
// - Telefonun zorunluluğu ve teslimat ülkesi ödeme adımının kuralıyla; kurumsal faturanın vergi numarası şemada.
// - Vergi bölgesi değişip oranlar farklıysa (İstanbul 34000'in ek oranı) reddedilir; oranlar aynıysa (İzmir) geçer;
//   vergi adresi faturaysa faturanın adresi belirler; vergi kapalı verilmiş siparişte bölge önemsizdir.
// - Geçmişe "adres-duzeltildi" (durum değişmez), önceki ve yeni bilgiler düzeltme tablosuna, kayda yalnız değişen
//   alanların adları ve bölge kodları (kişisel değer yok). Aynı bilgiler hiçbir şey yazmaz.
// - E-posta kutu işaretliyse bir kez, yeni adresle; işaretsizse yok. Siparişin tutarı ve vergisi değişmez.
// - Kişisel bilgisi silinmiş siparişte düzeltme yok; temizlik düzeltmelerin bilgilerini siler, geçmişin satırı kalır.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { epostaKayitlari } from "../../eposta/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { siteninMagazaAyarlari, siteninServisi } from "../../magaza-ayarlari/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { odemeServisi } from "../../odeme/servis.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { adresSurumu, siparisAdresServisi } from "../adres-duzeltme.ts";
import { siparisAdresDuzeltmeleri, siparisGecmisi, siparisler } from "../model.ts";
import { siparisAdresiSemasi } from "../semalar.ts";
import { kisiselVeriTemizligi } from "../temizlik.ts";
import { siparisYonetimi } from "../yonetim.ts";

vi.setConfig({ testTimeout: 90_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const firmaKimligi = randomUUID();
const siteKur = (ek: Record<string, unknown> = {}): Site => ({
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
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
    kargoFirmalari: [
      { kimlik: firmaKimligi, ad: "Deneme Kargo", takipAdresi: "https://takip.test/{takip}" },
    ],
    ...ek,
  },
});
const site = siteKur();

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const kim = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const hazirla = async (s: Site = site, secenek: { vergisiz?: boolean } = {}) => {
  const deneme = await denemeSitesiAc("adres-duzeltme");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(s).tabloyuOku(vt)).find(
    (sinif) => sinif.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urunSrv = urunServisi(() => s.ayarlar.saatDilimi);
  const urun = await urunSrv.urunEkle(vt, kim(), {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: secenek.vergisiz ? null : genel,
    durum: "yayinda",
    stokTakibi: true,
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(s).fiyatYaz(vt, kim(), birim, { satisFiyati: 10_000 });
  await stokServisi().stokDuzelt(vt, kim(), birim, {
    yeniMiktar: 50,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  return { vt, birim };
};

const ankara = {
  ulke: "TR",
  il: "TR-06",
  ilce: "TR-06-007",
  adres: "Atatürk Bulvarı No: 10",
  postaKodu: "06420",
};
const teslimatGirdisi = (adres: object = ankara, ek: object = {}) => ({
  ad: "Deniz",
  soyad: "Yılmaz",
  telefon: "0555 000 00 00",
  adres,
  ...ek,
});

const kapida: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };
const ver = async (
  vt: Veritabani,
  birim: string,
  s: Site = site,
  fatura: object = { tur: "bireysel", adresAyni: true },
) => {
  const sonuc = await odemeServisi(s).siparisVer(
    vt,
    {
      kim: { tur: "misafir", eposta: "musteri@ornek.test", hesap: { ac: false } },
      bilgiler: odemeBilgileriSemasi.parse({
        odemeYontemi: kapida,
        teslimat: teslimatGirdisi(),
        fatura,
        onBilgilendirmeOnayi: true,
        mesafeliSatisOnayi: true,
        pazarlamaIzni: false,
      }),
      kalemler: [{ birim, adet: 1 }],
    },
    3600,
  );
  return sonuc.siparis.numara;
};

const satiri = async (vt: Veritabani, numara: string) => {
  const [satir] = await vt.select().from(siparisler).where(eq(siparisler.numara, numara));
  if (satir === undefined) throw new Error("Sipariş yok.");
  return satir;
};

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return { kod: hata.kod, ayrinti: hata.ayrinti ?? [] };
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

// Siparişin bugünkü hâliyle düzeltme girdisi (ekranın gördüğü surum).
const girdi = async (
  vt: Veritabani,
  numara: string,
  degisiklik: { teslimat?: object; fatura?: object; eposta?: boolean } = {},
) => {
  const satir = await satiri(vt, numara);
  return siparisAdresiSemasi.parse({
    numara,
    surum: adresSurumu(satir),
    teslimat: degisiklik.teslimat ?? teslimatGirdisi(),
    fatura: degisiklik.fatura ?? { tur: "bireysel", adresAyni: true },
    eposta: degisiklik.eposta ?? true,
  });
};

const gecmis = async (vt: Veritabani, siparis: string) =>
  vt
    .select({
      kimlik: siparisGecmisi.kimlik,
      neden: siparisGecmisi.neden,
      onceki: siparisGecmisi.onceki_durum,
      sonraki: siparisGecmisi.sonraki_durum,
    })
    .from(siparisGecmisi)
    .where(eq(siparisGecmisi.siparis_kimligi, siparis))
    .orderBy(siparisGecmisi.zaman);
const adresEpostalari = async (vt: Veritabani) =>
  vt.select().from(epostaKayitlari).where(eq(epostaKayitlari.sablon, "adres-guncellendi"));
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
        eq(degisiklikKayitlari.islem, "siparis.adres-duzeltildi"),
      ),
    );

const servis = siparisAdresServisi(site);
const yonetim = siparisYonetimi(site);

describe("düzeltme", () => {
  it("teslimat ve fatura bilgileri yazılır; geçmiş, düzeltme tablosu, kayıt ve e-posta; tutar değişmez", async () => {
    const { vt, birim } = await hazirla();
    const numara = await ver(vt, birim);
    const once = await satiri(vt, numara);
    const izmir = {
      ulke: "TR",
      il: "TR-35",
      ilce: "TR-35-018",
      adres: "Kordon No: 5",
      postaKodu: "35210",
    };
    const yeniFatura = {
      tur: "kurumsal",
      firma: "Deneme Ticaret",
      vergiDairesi: "Çankaya",
      vergiNumarasi: "4540536920",
      adresAyni: true,
    };
    const sonuc = await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, {
        teslimat: teslimatGirdisi(izmir, { ad: "Ece", telefon: "0532 111 22 33" }),
        fatura: yeniFatura,
      }),
    );
    expect(sonuc).toEqual({ numara, degisti: true });
    const sonra = await satiri(vt, numara);
    expect(sonra.teslimat).toEqual({
      ad: "Ece",
      soyad: "Yılmaz",
      telefon: "+90 532 111 22 33",
      adres: izmir,
    });
    expect(sonra.fatura).toEqual(yeniFatura);
    // Tutar ve vergi aynı; durum aynı.
    for (const alan of [
      "toplam",
      "vergi_toplami",
      "vergi_dokumu",
      "ara_toplam",
      "durum",
    ] as const) {
      expect(sonra[alan]).toEqual(once[alan]);
    }

    const satirlar = await gecmis(vt, once.kimlik);
    const son = satirlar.at(-1);
    expect(son).toMatchObject({
      neden: "adres-duzeltildi",
      onceki: "odeme-bekleniyor",
      sonraki: "odeme-bekleniyor",
    });
    const [duzeltme] = await vt
      .select()
      .from(siparisAdresDuzeltmeleri)
      .where(eq(siparisAdresDuzeltmeleri.gecmis_kimligi, son?.kimlik ?? ""));
    expect(duzeltme?.onceki_teslimat).toEqual(once.teslimat);
    expect(duzeltme?.onceki_fatura).toEqual(once.fatura);
    expect(duzeltme?.yeni_teslimat).toEqual(sonra.teslimat);
    expect(duzeltme?.yeni_fatura).toEqual(sonra.fatura);

    const kayit = await kayitlar(vt, once.kimlik);
    expect(kayit).toEqual([
      {
        islem: "siparis.adres-duzeltildi",
        eski: {
          teslimatUlkesi: "TR",
          teslimatIli: "TR-06",
          teslimatIlcesi: "TR-06-007",
          faturaTuru: "bireysel",
        },
        yeni: {
          teslimatUlkesi: "TR",
          teslimatIli: "TR-35",
          teslimatIlcesi: "TR-35-018",
          faturaTuru: "kurumsal",
          degisenAlanlar: [
            "teslimat.ad",
            "teslimat.telefon",
            "teslimat.adres",
            "fatura.tur",
            "fatura.firma",
            "fatura.vergiDairesi",
            "fatura.vergiNumarasi",
          ],
        },
      },
    ]);
    // Kayıtta kişisel değer yok.
    expect(JSON.stringify(kayit)).not.toMatch(/Ece|Kordon|532 111|Deneme Ticaret|4540536920/);

    const epostalar = await adresEpostalari(vt);
    expect(epostalar).toHaveLength(1);
    expect(epostalar[0]?.alici).toBe("musteri@ornek.test");
    expect(epostalar[0]?.olay_anahtari).toBe(`siparis-gecmisi:${son?.kimlik}`);
    expect((epostalar[0]?.veri as { teslimat: unknown } | undefined)?.teslimat).toEqual(
      sonra.teslimat,
    );

    // Aynı bilgiler: hiçbir şey yazılmaz.
    const ayni = await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, {
        teslimat: teslimatGirdisi(izmir, { ad: "Ece", telefon: "+90 532 111 22 33" }),
        fatura: yeniFatura,
      }),
    );
    expect(ayni).toEqual({ numara, degisti: false });
    expect(await gecmis(vt, once.kimlik)).toHaveLength(satirlar.length);
    expect(await kayitlar(vt, once.kimlik)).toHaveLength(1);
    expect(await adresEpostalari(vt)).toHaveLength(1);
  });

  it("e-posta kutusu işaretsizse e-posta yok; hazırlanırken düzeltilir; kargoda düzeltilmez", async () => {
    const { vt, birim } = await hazirla();
    const numara = await ver(vt, birim);
    await yonetim.islemYap(vt, kim(), {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, {
        teslimat: teslimatGirdisi(ankara, { soyad: "Kaya" }),
        eposta: false,
      }),
    );
    expect((await satiri(vt, numara)).teslimat.soyad).toBe("Kaya");
    expect(await adresEpostalari(vt)).toEqual([]);

    await yonetim.islemYap(vt, kim(), {
      numara,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: firmaKimligi },
    });
    const once = await satiri(vt, numara);
    expect(
      await hatasi(
        servis.duzelt(
          vt,
          kim(),
          await girdi(vt, numara, { teslimat: teslimatGirdisi(ankara, { soyad: "Ak" }) }),
        ),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "siparis", kod: "adres-duzeltilemez" }] });
    expect((await satiri(vt, numara)).teslimat).toEqual(once.teslimat);
  });

  it("görülen hâl tutmazsa çakışma; aynı anda iki düzeltmeden biri geçer", async () => {
    const { vt, birim } = await hazirla();
    const numara = await ver(vt, birim);
    const eskiGirdi = await girdi(vt, numara, {
      teslimat: teslimatGirdisi(ankara, { soyad: "Bir" }),
    });
    await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, { teslimat: teslimatGirdisi(ankara, { soyad: "İki" }) }),
    );
    expect(await hatasi(servis.duzelt(vt, kim(), eskiGirdi))).toEqual({
      kod: "cakisma",
      ayrinti: [{ alan: "siparis", kod: "adres-degisti" }],
    });
    expect((await satiri(vt, numara)).teslimat.soyad).toBe("İki");

    // Durum değişince de çakışma (surum durumu da taşır).
    const durumOncesi = await girdi(vt, numara, {
      teslimat: teslimatGirdisi(ankara, { soyad: "Üç" }),
    });
    await yonetim.islemYap(vt, kim(), {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    expect((await hatasi(servis.duzelt(vt, kim(), durumOncesi))).kod).toBe("cakisma");

    const a = await girdi(vt, numara, { teslimat: teslimatGirdisi(ankara, { soyad: "Dört" }) });
    const b = await girdi(vt, numara, { teslimat: teslimatGirdisi(ankara, { soyad: "Beş" }) });
    const sonuclar = await Promise.allSettled([
      servis.duzelt(vt, kim(), a),
      servis.duzelt(vt, kim(), b),
    ]);
    expect(sonuclar.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    const reddedilen = sonuclar.find((s) => s.status === "rejected");
    expect(reddedilen?.status === "rejected" && reddedilen.reason).toMatchObject({
      kod: "cakisma",
    });
  });

  it("telefon zorunluluğu ve teslimat ülkesi ödeme adımının kuralıyla; kurumsal vergi numarası şemada", async () => {
    const { vt, birim } = await hazirla();
    const numara = await ver(vt, birim);
    expect(
      await hatasi(
        servis.duzelt(
          vt,
          kim(),
          await girdi(vt, numara, { teslimat: teslimatGirdisi(ankara, { telefon: "" }) }),
        ),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "teslimat.telefon", kod: "telefon-gerekli" }],
    });
    expect(
      await hatasi(
        servis.duzelt(
          vt,
          kim(),
          await girdi(vt, numara, {
            teslimat: teslimatGirdisi(
              { ulke: "DE", adres: "Hauptstraße 1", postaKodu: "10115" },
              { telefon: "+49 30 1234567" },
            ),
          }),
        ),
      ),
    ).toEqual({
      kod: "dogrulama",
      ayrinti: [{ alan: "teslimat.adres.ulke", kod: "ulke-teslimat-disi" }],
    });
    const satir = await satiri(vt, numara);
    const sema = siparisAdresiSemasi.safeParse({
      numara,
      surum: adresSurumu(satir),
      teslimat: teslimatGirdisi(),
      fatura: {
        tur: "kurumsal",
        firma: "Deneme",
        vergiDairesi: "Çankaya",
        vergiNumarasi: "4540536921",
        adresAyni: true,
      },
      eposta: true,
    });
    expect(sema.success).toBe(false);
    expect(sema.error?.issues[0]?.path).toEqual(["fatura", "vergiNumarasi"]);
    // İl ve ilçe tutarsız: şema reddeder.
    expect(
      siparisAdresiSemasi.safeParse({
        numara,
        surum: "x",
        teslimat: teslimatGirdisi({ ...ankara, ilce: "TR-35-018" }),
        fatura: { tur: "bireysel", adresAyni: true },
        eposta: true,
      }).success,
    ).toBe(false);
    expect((await satiri(vt, numara)).teslimat).toEqual(satir.teslimat);
  });

  it("teslimata dokunulmazsa sonradan açılan telefon zorunluluğu yalnız faturanın düzeltmesini engellemez", async () => {
    const telefonsuz = siteKur({ telefonZorunlu: false });
    const { vt, birim } = await hazirla(telefonsuz);
    const telefonsuzServis = siparisAdresServisi(telefonsuz);
    const sonuc = await odemeServisi(telefonsuz).siparisVer(
      vt,
      {
        kim: { tur: "misafir", eposta: "musteri@ornek.test", hesap: { ac: false } },
        bilgiler: odemeBilgileriSemasi.parse({
          odemeYontemi: kapida,
          teslimat: teslimatGirdisi(ankara, { telefon: "" }),
          fatura: { tur: "bireysel", adresAyni: true },
          onBilgilendirmeOnayi: true,
          mesafeliSatisOnayi: true,
          pazarlamaIzni: false,
        }),
        kalemler: [{ birim, adet: 1 }],
      },
      3600,
    );
    const numara = sonuc.siparis.numara;
    const teslimat = (await satiri(vt, numara)).teslimat;
    expect(teslimat.telefon).toBeUndefined();
    await siteninServisi(telefonsuz).degistir(
      vt,
      { tur: "sistem", ad: "deneme" },
      { telefonZorunlu: true },
    );
    const kurumsal = {
      tur: "kurumsal",
      firma: "Deneme Ticaret",
      vergiDairesi: "Çankaya",
      vergiNumarasi: "4540536920",
      adresAyni: true,
    };
    await telefonsuzServis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, { teslimat, fatura: kurumsal }),
    );
    expect((await satiri(vt, numara)).fatura.tur).toBe("kurumsal");
    // Teslimat değişince bugünkü kural uygulanır.
    expect(
      (
        await hatasi(
          telefonsuzServis.duzelt(
            vt,
            kim(),
            await girdi(vt, numara, {
              teslimat: { ...teslimat, ad: "Ayşe" },
              fatura: kurumsal,
            }),
          ),
        )
      ).ayrinti,
    ).toEqual([{ alan: "teslimat.telefon", kod: "telefon-gerekli" }]);
  });
});

describe("vergi bölgesi", () => {
  const istanbul34000 = {
    ulke: "TR",
    il: "TR-34",
    ilce: "TR-34-018",
    adres: "Merkez No: 1",
    postaKodu: "34000",
  };
  const istanbul = { ...istanbul34000, postaKodu: "34100" };

  it("oranlar farklı bölgeye düzeltme reddedilir, aynı orana geçer", async () => {
    const { vt, birim } = await hazirla();
    const numara = await ver(vt, birim);
    const once = await satiri(vt, numara);
    expect(
      await hatasi(
        servis.duzelt(
          vt,
          kim(),
          await girdi(vt, numara, { teslimat: teslimatGirdisi(istanbul34000) }),
        ),
      ),
    ).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "teslimat.adres.il", kod: "vergi-bolgesi-degisir" }],
    });
    expect((await satiri(vt, numara)).teslimat).toEqual(once.teslimat);
    // İstanbul'un başka posta kodu: ek oran yok, oranlar aynı.
    await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, { teslimat: teslimatGirdisi(istanbul) }),
    );
    expect((await satiri(vt, numara)).teslimat.adres.il).toBe("TR-34");
    // Yalnız posta kodu bölgeyi değiştirirse hata posta koduna bağlanır.
    expect(
      (
        await hatasi(
          servis.duzelt(
            vt,
            kim(),
            await girdi(vt, numara, { teslimat: teslimatGirdisi(istanbul34000) }),
          ),
        )
      ).ayrinti,
    ).toEqual([{ alan: "teslimat.adres.postaKodu", kod: "vergi-bolgesi-degisir" }]);
  });

  it("vergilenmiş kalemi olmayan siparişte bölge önemsizdir", async () => {
    const { vt, birim } = await hazirla(site, { vergisiz: true });
    const numara = await ver(vt, birim);
    expect((await satiri(vt, numara)).vergi_dokumu).toEqual([]);
    await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, { teslimat: teslimatGirdisi(istanbul34000) }),
    );
    expect((await satiri(vt, numara)).teslimat.adres.postaKodu).toBe("34000");
  });

  it("vergi adresi faturaysa faturanın adresi belirler; teslimat serbest", async () => {
    const faturaSitesi = siteKur({ vergiAdresi: "fatura" });
    const { vt, birim } = await hazirla(faturaSitesi);
    const numara = await ver(vt, birim, faturaSitesi, {
      tur: "bireysel",
      adresAyni: false,
      adres: ankara,
    });
    const faturaServisi = siparisAdresServisi(faturaSitesi);
    // Teslimat 34000'e gider: vergi faturanın adresinden, değişmez.
    await faturaServisi.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, {
        teslimat: teslimatGirdisi(istanbul34000),
        fatura: { tur: "bireysel", adresAyni: false, adres: ankara },
      }),
    );
    expect(
      await hatasi(
        faturaServisi.duzelt(
          vt,
          kim(),
          await girdi(vt, numara, {
            teslimat: teslimatGirdisi(istanbul34000),
            fatura: { tur: "bireysel", adresAyni: false, adres: istanbul34000 },
          }),
        ),
      ),
    ).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "fatura.adres.il", kod: "vergi-bolgesi-degisir" }],
    });
    // "Teslimat adresiyle aynı"ya çevrilince de fatura bölgesi teslimatınki (34000) olur: reddedilir.
    expect(
      (
        await hatasi(
          faturaServisi.duzelt(
            vt,
            kim(),
            await girdi(vt, numara, {
              teslimat: teslimatGirdisi(istanbul34000),
              fatura: { tur: "bireysel", adresAyni: true },
            }),
          ),
        )
      ).ayrinti,
    ).toEqual([{ alan: "teslimat.adres.il", kod: "vergi-bolgesi-degisir" }]);
  });

  it("vergi kapalı verilmiş siparişte bölge önemsizdir", async () => {
    const { vt, birim } = await hazirla();
    await siteninServisi(site).degistir(vt, { tur: "sistem", ad: "deneme" }, { vergiAcik: false });
    expect((await siteninMagazaAyarlari(vt, site)).vergiAcik).toBe(false);
    const numara = await ver(vt, birim);
    expect((await satiri(vt, numara)).gosterim).toBe("yok");
    await siteninServisi(site).degistir(vt, { tur: "sistem", ad: "deneme" }, { vergiAcik: true });
    await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, { teslimat: teslimatGirdisi(istanbul34000) }),
    );
    expect((await satiri(vt, numara)).teslimat.adres.postaKodu).toBe("34000");
  });
});

describe("kişisel veri", () => {
  it("silinmiş siparişte düzeltme yok; temizlik düzeltmelerin bilgilerini siler, geçmiş kalır", async () => {
    const { vt, birim } = await hazirla();
    const numara = await ver(vt, birim);
    await servis.duzelt(
      vt,
      kim(),
      await girdi(vt, numara, { teslimat: teslimatGirdisi(ankara, { soyad: "Kaya" }) }),
    );
    const satir = await satiri(vt, numara);
    // Pencere temizlikten önce açıldı: gördüğü hâl eskidir, yine de nedeni kişisel verinin silinmesidir.
    const eskiGirdi = await girdi(vt, numara, {
      teslimat: teslimatGirdisi(ankara, { soyad: "Ak" }),
    });
    await vt
      .update(siparisler)
      .set({ olusturma_zamani: new Date(Date.now() - 20 * 365 * 24 * 3600 * 1000) })
      .where(eq(siparisler.kimlik, satir.kimlik));
    expect(await kisiselVeriTemizligi(vt, site)).toBe(1);
    expect(
      await vt
        .select()
        .from(siparisAdresDuzeltmeleri)
        .where(eq(siparisAdresDuzeltmeleri.siparis_kimligi, satir.kimlik)),
    ).toEqual([]);
    expect((await gecmis(vt, satir.kimlik)).map((g) => g.neden)).toContain("adres-duzeltildi");
    expect(
      await hatasi(
        servis.duzelt(
          vt,
          kim(),
          await girdi(vt, numara, { teslimat: teslimatGirdisi(ankara, { soyad: "Ak" }) }),
        ),
      ),
    ).toEqual({ kod: "is-kurali", ayrinti: [{ alan: "siparis", kod: "kisisel-veri-silindi" }] });
    expect(await hatasi(servis.duzelt(vt, kim(), eskiGirdi))).toEqual({
      kod: "is-kurali",
      ayrinti: [{ alan: "siparis", kod: "kisisel-veri-silindi" }],
    });
  });
});
