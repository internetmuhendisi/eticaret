// Panonun verisi gerçek veritabanıyla (kart 0186, karar 0199):
// - Açılış adımları: yeni sitede dördü eksik, her biri ölçüsüyle tamamlanır (ürün, mağaza bilgileri, kullanılabilir
//   ödeme yöntemi, logo), hepsi tamamlanınca kutu kalkar; yalnız mağaza sahibi görür.
// - Bakılması gerekenler: havale bildirimi, iade talebi, hazırlanacak sipariş, onay bekleyen yorum, düşük ve tükenen
//   stok, stok bildirimi (eklenti); sıfır satır yazılmaz; tek siparişte ayrıntısına, birden çokta süzülmüş listeye
//   gider; sayılar listelerin sayısıyla aynı (sipariş listesinin "bakılacak" ve durum sayıları, ürün listesinin stok
//   süzgeci); eklenti kapalıyken satırı yok.
// - Sayılar: bugün ve son 7 gün raporun servisiyle aynı, hazırlanacak ve ödeme bekleyen.
// - İzin: mağaza sahibi her kutuyu, görevli sipariş, yorum ve stoğu (satış yok), sipariş görevlisi yalnız siparişi,
//   içerik editörü ve rolsüz yönetici hiçbir kutuyu görmez; kısayollar sayfanın izniyle.
// - Okunamayan kutu "hata" olur, öteki kutular gelir.
// - Selam saate göre, sitenin saat diliminde.
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { takvimGunu } from "../../metinler/bicimleyici.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import { rolVer, tamYetkiliYoneticiAc, yoneticininYetkileri } from "../../moduller/ekip/servis.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { siteninServisi } from "../../moduller/magaza-ayarlari/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../moduller/odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../moduller/odeme/servis.ts";
import { odemeYontemiServisi } from "../../moduller/odeme/yontemler.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { satisRaporu } from "../../moduller/rapor/satis.ts";
import { iadeTalebiServisi } from "../../moduller/siparis/iade-talebi.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { siparisServisi } from "../../moduller/siparis/servis.ts";
import { siparisYonetimi } from "../../moduller/siparis/yonetim.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunPanelListesi } from "../../moduller/urun/panel-listesi.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { yorumServisi } from "../../moduller/yorum/servis.ts";
import { baglantiyiKapat, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import { panoVerisi, selam } from "../pano/veri.ts";

vi.setConfig({ testTimeout: 120_000 });

const ornekler = resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler");
const klasor = siteKlasorunuOku(join(ornekler, "vergi-dolu"));
const logolu = siteKlasorunuOku(join(ornekler, "marka-logolu"));
const site: Site = {
  ...klasor,
  ayarlar: { ...klasor.ayarlar, epostaGonderenAdresi: "pano@ornek.test", eklentiler: [] },
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    // Havale açık ama banka hesabı yok, kapıda ödeme kapalı: kullanılabilir yöntem yok.
    odemeYontemleri: [
      { kod: "havale", acik: true },
      { kod: "kapida-odeme", acik: false },
    ],
    kapidaOdemeSecenekleri: ["nakit"],
    bankaHesaplari: [],
    yorumYalnizSatinAlanlar: false,
    kargoFirmalari: [{ kimlik: "11111111-1111-4111-8111-111111111111", ad: "Deneme Kargo" }],
    dusukStokEsigi: 3,
  },
};
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");

const temizlenecekler: (() => Promise<void>)[] = [];
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterEach(async () => {
  delete ortak[siteAnahtari];
  vi.unstubAllEnvs();
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const sistem = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const hazirla = async (secilen: Site = site) => {
  vi.stubEnv("SITE_ADRESI", "");
  const deneme = await denemeSitesiAc("pano");
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(secilen).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const { hesapKimligi: sahip } = await tamYetkiliYoneticiAc(
    vt,
    { eposta: `sahip-${randomUUID().slice(0, 8)}@ornek.test`, sifre: "uzun-bir-sifre-123" },
    sistem(),
  );
  const rollu = async (rol: string | null) => {
    const { hesapKimligi } = await hesapAc(vt, "yonetici", {
      eposta: `y-${randomUUID().slice(0, 8)}@ornek.test`,
      sifre: "uzun-bir-sifre-123",
    });
    if (rol !== null) await rolVer(vt, { yoneticiKimligi: hesapKimligi, rolKodu: rol }, sistem());
    return hesapKimligi;
  };
  const kisiler = {
    sahip,
    gorevli: await rollu("gorevli"),
    siparisGorevlisi: await rollu("siparis-gorevlisi"),
    editor: await rollu("icerik-editoru"),
    rolsuz: await rollu(null),
  };
  const urunAc = async (g: { ad?: string; miktar?: number } = {}) => {
    const urun = await urunServisi(() => secilen.ayarlar.saatDilimi).urunEkle(vt, sistem(), {
      ad: g.ad ?? `Ürün ${randomUUID().slice(0, 8)}`,
      vergiSinifi: genel,
      durum: "yayinda",
      stokTakibi: true,
    });
    const birim =
      (await urunServisi(() => secilen.ayarlar.saatDilimi).urunuOku(vt, urun))?.birimler[0]
        ?.kimlik ?? "";
    await siteninFiyatServisi(secilen).fiyatYaz(vt, sistem(), birim, { satisFiyati: 10_000 });
    await stokServisi().stokDuzelt(vt, sistem(), birim, {
      yeniMiktar: g.miktar ?? 50,
      gorulenMiktar: 0,
      sebep: "sayim",
    });
    return { urun, birim };
  };
  const pano = async (kisi: string, simdi?: Date) =>
    panoVerisi(vt, await yoneticininYetkileri(vt, kisi), {
      site: secilen,
      ...(simdi === undefined ? {} : { simdi }),
    });
  return { vt, kisiler, urunAc, pano };
};

// Havale ve kapıda ödeme kullanılabilir olsun (siparişler için).
const odemeyiAc = async (vt: Veritabani) => {
  const servis = odemeYontemiServisi(site);
  await servis.hesapEkle(vt, sistem(), {
    banka: "Deneme Bankası",
    sahip: "Deneme Ticaret",
    iban: "TR420001000000000000000001",
  });
};

const bilgiler = (odemeYontemi: OdemeYontemiSecimi) =>
  odemeBilgileriSemasi.parse({
    odemeYontemi,
    teslimat: {
      ad: "Deniz",
      soyad: "Yılmaz",
      telefon: "0555 123 45 67",
      adres: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Deneme Sokak No: 42",
        postaKodu: "06420",
      },
    },
    fatura: { tur: "bireysel", adresAyni: true },
    onBilgilendirmeOnayi: true,
    mesafeliSatisOnayi: true,
    pazarlamaIzni: false,
  });
const havale: OdemeYontemiSecimi = { yontem: "havale" };

const ver = async (vt: Veritabani, birim: string, musteri?: string) => {
  const kim: OdemeGirdisi["kim"] =
    musteri === undefined
      ? {
          tur: "misafir",
          eposta: `m-${randomUUID().slice(0, 8)}@ornek.test`,
          hesap: { ac: false },
        }
      : { tur: "uye", musteri };
  const sonuc = await odemeServisi(site).siparisVer(
    vt,
    { kim, bilgiler: bilgiler(havale), kalemler: [{ birim, adet: 1 }] },
    3600,
  );
  return sonuc.siparis.numara;
};

describe("açılış adımları", () => {
  it("yeni sitede dördü eksik; her biri ölçüsüyle tamamlanır, hepsi tamamlanınca kutu kalkar; yalnız mağaza sahibi", async () => {
    const h = await hazirla();
    const adimlar = async (secilen?: Site) => {
      const veri = await panoVerisi(h.vt, await yoneticininYetkileri(h.vt, h.kisiler.sahip), {
        site: secilen ?? site,
      });
      if (veri.adimlar === "hata") throw new Error("Adımlar okunamadı.");
      return veri.adimlar;
    };
    const ilk = await adimlar();
    expect(ilk?.tamam).toBe(0);
    expect(ilk?.adimlar.map((a) => [a.kod, a.tamam])).toEqual([
      ["urun", false],
      ["magaza", false],
      ["odeme", false],
      ["logo", false],
    ]);
    expect(ilk?.adimlar.map((a) => a.adres)).toEqual([
      "/yonetim/urunler/yeni",
      "/yonetim/magaza-bilgileri",
      "/yonetim/odeme-yontemleri",
      "/yonetim/tema/ayarlar",
    ]);
    await h.urunAc();
    // Telefon ve adres yetmez, satıcı bilgileri de gerekir.
    await siteninServisi(site).degistir(h.vt, sistem(), {
      iletisimTelefonu: "+90 312 000 00 00",
      magazaAdresi: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Deneme Sokak No: 1",
        postaKodu: "06420",
      },
    });
    expect((await adimlar())?.adimlar.map((a) => a.tamam)).toEqual([true, false, false, false]);
    await siteninServisi(site).degistir(h.vt, sistem(), {
      saticiBilgileri: {
        ulke: "TR",
        isletmeTuru: "sirket",
        unvan: "Deneme Ticaret A.Ş.",
        vergiDairesi: "Kavaklıdere",
        vergiNumarasi: "1111111114",
      },
    });
    await odemeyiAc(h.vt);
    const uc = await adimlar();
    expect(uc?.tamam).toBe(3);
    // Tamamlanan adımın bağlantısı, eylemi ve açıklaması yoktur.
    expect(uc?.adimlar[0]).toMatchObject({ tamam: true, adres: null, eylem: null, alt: null });
    // Logosu olan sitede dört adım tamam: kutu kalkar.
    expect(await adimlar({ ...site, markaLogosu: logolu.markaLogosu })).toBeNull();
    // Görevli adımları görmez.
    expect((await h.pano(h.kisiler.gorevli)).adimlar).toBeNull();
  });
});

describe("bakılması gerekenler ve sayılar", () => {
  it("satırlar, sayılar ve bağlantılar listelerle aynı; sıfır satır yazılmaz; rollere göre kutular", async () => {
    const h = await hazirla();
    await odemeyiAc(h.vt);
    // Boş sitede bakılacak yok.
    const bos = await h.pano(h.kisiler.sahip);
    expect(bos.bakilacaklar).toEqual({ satirlar: [], eksik: false });

    const { urun, birim } = await h.urunAc({ ad: "Deneme Fincanı", miktar: 5 });
    const { birim: tukenecek } = await h.urunAc({ ad: "Son Kupa", miktar: 1 });
    // Üç havale siparişi: biri bildirilir, biri ödenip hazırlanır.
    const [bildirilen, hazirlanan, bekleyen] = [
      await ver(h.vt, birim),
      await ver(h.vt, birim),
      await ver(h.vt, birim),
    ];
    await ver(h.vt, tukenecek);
    const [satir] = await h.vt
      .select()
      .from(siparisler)
      .where(eq(siparisler.numara, bildirilen ?? ""));
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta: satir?.eposta ?? "" },
      {
        numara: bildirilen ?? "",
        gonderen: "Deniz Yılmaz",
        hesap: (await odemeYontemiServisi(site).oku(h.vt)).bankaHesaplari[0]?.kimlik ?? "",
        tutar: siteninBicimleyicisi(site.ayarlar).paraYazisi(satir?.toplam ?? 0),
        odemeTarihi: new Date().toISOString().slice(0, 10),
      },
    );
    await siparisYonetimi(site).islemYap(h.vt, sistem(), {
      numara: hazirlanan ?? "",
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yorumServisi(site).yorumYaz(
      h.vt,
      (
        await hesapAc(h.vt, "musteri", {
          eposta: `u-${randomUUID().slice(0, 8)}@ornek.test`,
          sifre: "uzun-bir-sifre-123",
        })
      ).hesapKimligi,
      { urun, puan: 4, ad: "Ayşe Kaya", metin: "Güzel." },
    );

    const veri = await h.pano(h.kisiler.sahip);
    if (veri.bakilacaklar === "hata" || veri.bakilacaklar === null) throw new Error();
    expect(veri.bakilacaklar.eksik).toBe(false);
    const satirlar = Object.fromEntries(veri.bakilacaklar.satirlar.map((s) => [s.kod, s]));
    expect(Object.keys(satirlar)).toEqual([
      "bakilacak",
      "hazirlanacak",
      "yorum",
      "dusuk",
      "tukendi",
    ]);
    // Tek sipariş: ayrıntısına gider; alt yazı işlerin dökümü.
    expect(satirlar["bakilacak"]).toMatchObject({
      baslik: "1 sipariş bakılmayı bekliyor",
      alt: "1 havale bildirimi",
      adres: `/yonetim/siparisler/ayrinti?numara=${encodeURIComponent(bildirilen ?? "")}`,
      eylem: "Siparişe git",
    });
    expect(satirlar["hazirlanacak"]?.baslik).toBe("1 sipariş hazırlanmayı bekliyor");
    expect(satirlar["yorum"]).toMatchObject({
      baslik: "1 yorum onay bekliyor",
      alt: "Deneme Fincanı",
      adres: "/yonetim/yorumlar",
    });
    // Stok: 5 → 2 düşük, 1 → 0 tükendi; sayı ürün listesinin stok süzgeciyle aynı.
    const stokAyarlari = {
      paraBirimi: site.ayarlar.paraBirimi,
      dusukStokEsigi: 3,
      an: new Date(),
      dil: site.ayarlar.dil,
    };
    for (const durum of ["dusuk", "tukendi"] as const) {
      const liste = await urunPanelListesi(
        h.vt,
        { stok: [durum], sayfa: 1, sayfaBoyu: 50, siralama: "ad-artan" },
        stokAyarlari,
      );
      expect(satirlar[durum]?.baslik.startsWith(`${liste.toplam} `)).toBe(true);
      expect(satirlar[durum]?.adres).toBe(`/yonetim/urunler?stok=${durum}`);
    }
    expect(satirlar["dusuk"]?.alt).toBe("Deneme Fincanı");
    expect(satirlar["tukendi"]?.alt).toBe("Son Kupa");

    // İkinci bildirim: birden çok, "Bakılması gereken" sekmesine; alt yazıda numaralar en eskiden.
    const [ikinci] = await h.vt
      .select()
      .from(siparisler)
      .where(eq(siparisler.numara, bekleyen ?? ""));
    await siparisServisi(site).havaleBildir(
      h.vt,
      { tur: "eposta", eposta: ikinci?.eposta ?? "" },
      {
        numara: bekleyen ?? "",
        gonderen: "Deniz Yılmaz",
        hesap: (await odemeYontemiServisi(site).oku(h.vt)).bankaHesaplari[0]?.kimlik ?? "",
        tutar: siteninBicimleyicisi(site.ayarlar).paraYazisi(ikinci?.toplam ?? 0),
        odemeTarihi: new Date().toISOString().slice(0, 10),
      },
    );
    // Üyenin teslim edilmiş siparişine iade talebi: sekmenin öteki koşulu; satırın sayısı yine sekmeninki.
    const uye = (
      await hesapAc(h.vt, "musteri", {
        eposta: `t-${randomUUID().slice(0, 8)}@ornek.test`,
        sifre: "uzun-bir-sifre-123",
      })
    ).hesapKimligi;
    const teslim = await ver(h.vt, birim, uye);
    const yonetim = siparisYonetimi(site);
    await yonetim.islemYap(h.vt, sistem(), {
      numara: teslim,
      islem: "havale-onayla",
      gorulenDurum: "odeme-bekleniyor",
    });
    await yonetim.islemYap(h.vt, sistem(), {
      numara: teslim,
      islem: "kargoya-ver",
      gorulenDurum: "hazirlaniyor",
      kargo: { firma: "11111111-1111-4111-8111-111111111111" },
    });
    await yonetim.islemYap(h.vt, sistem(), {
      numara: teslim,
      islem: "teslim-edildi",
      gorulenDurum: "kargoda",
    });
    await iadeTalebiServisi(site).talepAc(
      h.vt,
      { tur: "musteri", musteri: uye },
      {
        numara: teslim,
        kalemler: [{ sira: 0, adet: 1 }],
        neden: "kusurlu-hasarli",
        aciklama: "Kırık.",
      },
    );
    const iki = await h.pano(h.kisiler.sahip);
    if (iki.bakilacaklar === "hata" || iki.bakilacaklar === null) throw new Error();
    const havaleSatiri = iki.bakilacaklar.satirlar.find((s) => s.kod === "bakilacak");
    const liste = await siparisYonetimi(site).liste(h.vt, {
      sayfa: 1,
      sayfaBoyu: 50,
      siralama: "en-yeni",
    });
    expect(liste.bakilacakSayisi).toBe(3);
    expect(havaleSatiri).toMatchObject({
      // Sayı sekmenin sayısıdır: satır tam o listeyi açar.
      baslik: `${liste.bakilacakSayisi} sipariş bakılmayı bekliyor`,
      alt: "2 havale bildirimi, 1 iade talebi",
      adres: "/yonetim/siparisler?durum=bakilacak",
      eylem: "Siparişler",
    });

    // Sayılar: bugün ve son 7 gün raporla aynı; hazırlanacak ve ödeme bekleyen listenin sayılarıyla.
    if (iki.sayilar === "hata" || iki.sayilar === null) throw new Error();
    expect(iki.sayilar.eksik).toBe(false);
    const kutular = Object.fromEntries(iki.sayilar.kutular.map((k) => [k.kod, k]));
    const bugun = takvimGunu(new Date(), site.ayarlar.saatDilimi);
    const rapor = await satisRaporu(site).rapor(h.vt, { baslangic: bugun, bitis: bugun }, null);
    const b = siteninBicimleyicisi(site.ayarlar);
    expect(kutular["bugun"]).toMatchObject({
      deger: b.para(rapor.ozet.satis),
      alt: `${rapor.ozet.siparisSayisi} sipariş`,
      adres: "/yonetim/raporlar?donem=bugun",
    });
    expect(kutular["son-7-gun"]?.adres).toBe("/yonetim/raporlar?donem=son-7-gun");
    expect(kutular["hazirlanacak"]).toMatchObject({
      deger: String(liste.sayilar.hazirlaniyor),
      adres: "/yonetim/siparisler?durum=hazirlaniyor",
    });
    // Kapıda ödemeli sipariş ödemesi alınmadan hazırlanır: alt yazı ödeme iddia etmez, en eskisinin zamanıdır.
    expect(kutular["hazirlanacak"]?.alt?.startsWith("En eskisi")).toBe(true);
    expect(kutular["odemeBekleyen"]?.deger).toBe(String(liste.sayilar["odeme-bekleniyor"]));

    // Satış grafiği: 14 gün, raporlara bağlantı.
    if (iki.satis === "hata" || iki.satis === null) throw new Error();
    expect(iki.satis.noktalar).toHaveLength(14);
    expect(iki.satis.baslik).toBe("Son 14 günün satışı");
    // Raporlar bağlantısı grafikteki 14 günle açılır.
    const ilkGun = new Date(Date.parse(`${bugun}T00:00:00Z`) - 13 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(iki.satis.raporAdresi).toBe(`/yonetim/raporlar?donem=${ilkGun}_${bugun}`);

    // Roller.
    const gorevli = await h.pano(h.kisiler.gorevli);
    expect(gorevli.satis).toBeNull();
    expect(gorevli.adimlar).toBeNull();
    if (gorevli.sayilar === "hata" || gorevli.sayilar === null) throw new Error();
    expect(gorevli.sayilar.kutular.map((k) => k.kod)).toEqual(["hazirlanacak", "odemeBekleyen"]);
    if (gorevli.bakilacaklar === "hata" || gorevli.bakilacaklar === null) throw new Error();
    expect(gorevli.bakilacaklar.satirlar.map((s) => s.kod)).toEqual([
      "bakilacak",
      "hazirlanacak",
      "yorum",
      "dusuk",
      "tukendi",
    ]);
    expect(gorevli.kisayollar.map((k) => k.kod)).toEqual(["yeni-urun", "elle-siparis"]);
    const siparisci = await h.pano(h.kisiler.siparisGorevlisi);
    if (siparisci.bakilacaklar === "hata" || siparisci.bakilacaklar === null) throw new Error();
    expect(siparisci.bakilacaklar.satirlar.map((s) => s.kod)).toEqual([
      "bakilacak",
      "hazirlanacak",
    ]);
    expect(siparisci.kisayollar.map((k) => k.kod)).toEqual(["elle-siparis"]);
    const editor = await h.pano(h.kisiler.editor);
    expect([editor.bakilacaklar, editor.sayilar, editor.satis, editor.adimlar]).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(editor.kisayollar.map((k) => k.kod)).toEqual(["vitrin-bolumleri", "menuler"]);
    const rolsuz = await h.pano(h.kisiler.rolsuz);
    expect([rolsuz.bakilacaklar, rolsuz.sayilar, rolsuz.satis, rolsuz.adimlar]).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(rolsuz.kisayollar).toEqual([]);
    expect(veri.kisayollar.map((k) => k.kod)).toEqual([
      "yeni-urun",
      "elle-siparis",
      "yeni-kupon",
      "vitrin-bolumleri",
      "menuler",
    ]);
  });

  it("stok bildirimi eklentisinin satırı yalnız eklenti açıkken", async () => {
    const acik: Site = {
      ...site,
      ayarlar: { ...site.ayarlar, eklentiler: ["stoga-gelince-haber-ver"] },
    };
    ortak[siteAnahtari] = acik;
    const h = await hazirla(acik);
    const { birim } = await h.urunAc({ ad: "Beklenen Kupa", miktar: 0 });
    const { stokBildirimiServisi } = await import(
      "../../eklentiler/stoga-gelince-haber-ver/servis.ts"
    );
    await stokBildirimiServisi(acik).talepYaz(h.vt, birim, "a@ornek.test");
    await stokBildirimiServisi(acik).talepYaz(h.vt, birim, "b@ornek.test");
    const veri = await h.pano(h.kisiler.sahip);
    if (veri.bakilacaklar === "hata" || veri.bakilacaklar === null) throw new Error();
    expect(veri.bakilacaklar.satirlar.find((s) => s.kod === "stok-bildirimleri")).toMatchObject({
      baslik: "2 stok bildirimi talebi bekliyor",
      alt: "Beklenen Kupa",
      adres: "/yonetim/stok-bildirimleri",
    });
    const kapali = await panoVerisi(h.vt, await yoneticininYetkileri(h.vt, h.kisiler.sahip), {
      site,
    });
    if (kapali.bakilacaklar === "hata" || kapali.bakilacaklar === null) throw new Error();
    expect(kapali.bakilacaklar.satirlar.some((s) => s.kod === "stok-bildirimleri")).toBe(false);
  });

  it("okunamayan kaynak yalnız kendi satırını düşürür, kutu eksik olduğunu söyler; hiçbiri okunamazsa hata", async () => {
    const h = await hazirla();
    await h.urunAc({ ad: "Son Kupa", miktar: 0 });
    await h.vt.execute(sql`alter table yorumlar rename to yorumlar_gizli`);
    const veri = await h.pano(h.kisiler.sahip);
    // Yorum okunamadı: stok satırı gelir, kutu eksik.
    expect(veri.bakilacaklar).toMatchObject({ eksik: true });
    if (veri.bakilacaklar === "hata" || veri.bakilacaklar === null) throw new Error();
    expect(veri.bakilacaklar.satirlar.map((s) => s.kod)).toEqual(["tukendi"]);
    expect(veri.sayilar).toMatchObject({ eksik: false });
    expect(veri.satis).not.toBe("hata");
    expect(veri.adimlar).not.toBe("hata");
    await h.vt.execute(sql`alter table yorumlar_gizli rename to yorumlar`);
    // Siparişler okunamadı: bakılacaklarda stok satırı kalır; sayılarda satış ve sipariş kutuları düşer.
    await h.vt.execute(sql`alter table siparisler rename to siparisler_gizli`);
    const ikinci = await h.pano(h.kisiler.sahip);
    expect(ikinci.bakilacaklar).toMatchObject({ eksik: true });
    if (ikinci.bakilacaklar === "hata" || ikinci.bakilacaklar === null) throw new Error();
    expect(ikinci.bakilacaklar.satirlar.map((s) => s.kod)).toEqual(["tukendi"]);
    expect(ikinci.sayilar).toBe("hata");
    await h.vt.execute(sql`alter table siparisler_gizli rename to siparisler`);
    // Yalnız siparişlerin sayıları okunamadı (talep tablosu yok), satış okunur: satış kutuları gelir, kutu eksik.
    await h.vt.execute(
      sql`alter table siparis_iade_talepleri rename to siparis_iade_talepleri_gizli`,
    );
    const ucuncu = await h.pano(h.kisiler.sahip);
    expect(ucuncu.sayilar).toMatchObject({ eksik: true });
    if (ucuncu.sayilar === "hata" || ucuncu.sayilar === null) throw new Error();
    expect(ucuncu.sayilar.kutular.map((k) => k.kod)).toEqual(["bugun", "son-7-gun"]);
    // Görevli: yalnız sipariş sayıları okunamaz, kutunun tamamı hata.
    expect((await h.pano(h.kisiler.siparisGorevlisi)).bakilacaklar).toBe("hata");
  });
});

describe("selam", () => {
  it("saate göre, sitenin saat diliminde", () => {
    // İstanbul UTC+3.
    expect(selam(new Date("2026-11-27T01:59:00Z"), "Europe/Istanbul")).toBe("iyiAksamlar");
    expect(selam(new Date("2026-11-27T02:00:00Z"), "Europe/Istanbul")).toBe("gunaydin");
    expect(selam(new Date("2026-11-27T08:59:00Z"), "Europe/Istanbul")).toBe("gunaydin");
    expect(selam(new Date("2026-11-27T09:00:00Z"), "Europe/Istanbul")).toBe("iyiGunler");
    expect(selam(new Date("2026-11-27T14:59:00Z"), "Europe/Istanbul")).toBe("iyiGunler");
    expect(selam(new Date("2026-11-27T15:00:00Z"), "Europe/Istanbul")).toBe("iyiAksamlar");
    // Aynı an New York'ta gece.
    expect(selam(new Date("2026-11-27T09:00:00Z"), "America/New_York")).toBe("iyiAksamlar");
  });
});
