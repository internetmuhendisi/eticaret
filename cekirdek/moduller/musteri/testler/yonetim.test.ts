// Panelin müşteri ekranlarının servisi gerçek veritabanıyla (kart 0271, karar 0173):
// - Listede yalnız üyeler (silinmiş hesap yok); üye olmadan verilen sipariş hiçbir müşteriye sayılmaz.
// - Sipariş sayısı ve toplam iptal edilmemiş siparişlerden, tamamlanan iadeler düşülerek; başarısız iade düşülmez.
// - Ad: son siparişin teslimat adı, yoksa varsayılan teslimat adresi, yoksa boş.
// - Arama: e-postada ve adda, Türkçe harfsiz ve büyük harfle; "%" ve "_" düz harftir.
// - Süzgeçler: kampanya izni (en yeni onay), sipariş var/yok, kayıt günü (sitenin saat dilimiyle); sıralama, sayfa.
// - Ayrıntı: sayılar, son siparişler, adresler, üyelik onayının sürümü, notlar en yeni önce ve yazanıyla; olmayan,
//   silinmiş ve bozuk kimlik null.
// - Not: eklenir ve silinir, değişiklik kaydına metin girmez; başka müşterinin notu silinmez; silinmiş hesaba not
//   yazılmaz; not müşterinin hesap bilgilerinde, adreslerinde ve siparişlerinde yoktur; hesap silinince not gider.
// - Şifre sıfırlama bağlantısı: e-posta kuyruğa girer, değişiklik kaydı e-postasız yazılır; hesap sınırı dolunca
//   "istek-siniri", silinmiş hesapta "bulunamadi".
// - İki site birbirinin müşterisini ve notunu görmez.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../../kapi/zarf.ts";
import type { DegisikligiYapan } from "../../../kayitlar/degisiklik-islemleri.ts";
import { musteriPanelSinirlari } from "../../../kayitlar/musteri-paneli.ts";
import { baglantiyiKapat, type Veritabani } from "../../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../../veritabani/testler/deneme-sitesi.ts";
import { degisiklikKayitlari } from "../../degisiklik-kaydi/model.ts";
import { epostaKayitlari } from "../../eposta/model.ts";
import { siteninFiyatServisi } from "../../fiyat/servis.ts";
import { type OdemeYontemiSecimi, odemeBilgileriSemasi } from "../../odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../odeme/servis.ts";
import { denemeleriSil } from "../../oturum/deneme-siniri.ts";
import { iadeServisi } from "../../siparis/iade.ts";
import { siparisIadeleri, siparisler } from "../../siparis/model.ts";
import { musteriSiparisleri } from "../../siparis/musteri.ts";
import { siparisYonetimi } from "../../siparis/yonetim.ts";
import { stokServisi } from "../../stok/servis.ts";
import { urunServisi } from "../../urun/servis.ts";
import { siteninVergiServisi } from "../../vergi/servis.ts";
import { adresServisi } from "../adres.ts";
import { adresFormuSemasi } from "../adres-semalari.ts";
import { musteriler, musteriNotlari } from "../model.ts";
import { musteriListesiSemasi } from "../panel-semalari.ts";
import { hesapBilgileri, musteriHesabiAc, pazarlamaIzniniDegistir } from "../servis.ts";
import { musteriYonetimi } from "../yonetim.ts";

vi.setConfig({ testTimeout: 120_000 });

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
    odemeYontemleri: [{ kod: "kapida-odeme", acik: true }],
    kapidaOdemeSecenekleri: ["nakit"],
    kargoFirmalari: [
      {
        kimlik: firmaKimligi,
        ad: "Deneme Kargo",
        takipAdresi: "https://takip.deneme-kargo.test/{takip}",
      },
    ],
  },
};

// Şifre sıfırlama bağlantısı çalışan sitenin adresini okur (siteAdresi).
const siteAnahtari = Symbol.for("cekirdek.calisanSite");
const ortak = globalThis as Record<symbol, unknown>;
let onceki: unknown;
beforeAll(() => {
  onceki = ortak[siteAnahtari];
  ortak[siteAnahtari] = site;
});
afterAll(() => {
  ortak[siteAnahtari] = onceki;
});

const yonetim = musteriYonetimi(site);
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);

const temizlenecekler: (() => Promise<void>)[] = [];
afterEach(async () => {
  await baglantiyiKapat();
  for (const temizle of temizlenecekler.splice(0)) await temizle();
});

const yonetici = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });

const hazirla = async (ad = "musteri-yonetimi") => {
  const deneme = await denemeSitesiAc(ad);
  temizlenecekler.push(deneme.sil);
  const vt = deneme.vt;
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find(
    (s) => s.ad === "Genel",
  )?.kimlik;
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  const urun = await urunSrv.urunEkle(vt, yonetici(), {
    ad: `Ürün ${randomUUID().slice(0, 8)}`,
    vergiSinifi: genel,
    durum: "yayinda",
    stokTakibi: true,
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(site).fiyatYaz(vt, yonetici(), birim, { satisFiyati: 10_000 });
  await stokServisi().stokDuzelt(vt, yonetici(), birim, {
    yeniMiktar: 100,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  const musteriAc = async (eposta: string, pazarlamaIzni = false) =>
    vt.transaction(
      async (islem) =>
        (
          await musteriHesabiAc(
            islem,
            {
              eposta,
              sifre: "uzun-bir-sifre-123",
              uyelikOnayi: true,
              kvkkOnayi: true,
              pazarlamaIzni,
            },
            3600,
          )
        ).musteri,
    );
  const ver = async (
    adet: number,
    ek: { musteri?: string; eposta?: string; ad?: string; soyad?: string } = {},
  ) => {
    const kim: OdemeGirdisi["kim"] =
      ek.musteri === undefined
        ? { tur: "misafir", eposta: ek.eposta ?? "misafir@ornek.test", hesap: { ac: false } }
        : { tur: "uye", musteri: ek.musteri };
    const odemeYontemi: OdemeYontemiSecimi = { yontem: "kapida-odeme", secenek: "nakit" };
    const bilgiler = odemeBilgileriSemasi.parse({
      odemeYontemi,
      teslimat: {
        ad: ek.ad ?? "Ayşe",
        soyad: ek.soyad ?? "Şahin",
        telefon: "0555 000 00 42",
        adres: {
          ulke: "TR",
          il: "TR-06",
          ilce: "TR-06-007",
          adres: "Bulvar No: 1",
          postaKodu: "06420",
        },
      },
      fatura: { tur: "bireysel", adresAyni: true },
      onBilgilendirmeOnayi: true,
      mesafeliSatisOnayi: true,
      pazarlamaIzni: false,
    });
    const sonuc = await odemeServisi(site).siparisVer(
      vt,
      { kim, bilgiler, kalemler: [{ birim, adet }] },
      3600,
    );
    return sonuc.siparis.numara;
  };
  const siparisToplami = async (numara: string) =>
    (
      await vt
        .select({ toplam: siparisler.toplam })
        .from(siparisler)
        .where(eq(siparisler.numara, numara))
    )[0]?.toplam ?? 0;
  return { vt, musteriAc, ver, siparisToplami };
};

const listele = (vt: Veritabani, girdi: Record<string, unknown> = {}) =>
  yonetim.liste(vt, musteriListesiSemasi.parse(girdi));

const hatasi = async (is: Promise<unknown>) => {
  try {
    await is;
  } catch (hata) {
    if (hata instanceof BilinenHata) return hata.kod;
    throw hata;
  }
  throw new Error("Hata bekleniyordu.");
};

const zamaniKaydir = (vt: Veritabani, numara: string, saniye: number) =>
  vt.execute(
    sql`update siparisler set olusturma_zamani = olusturma_zamani - make_interval(secs => ${saniye}) where numara = ${numara}`,
  );

describe("müşteri listesi", () => {
  it("yalnız üyeler; sipariş sayısı ve toplam iptal ve iade düşülerek; ad son siparişten, adresten ya da boş", async () => {
    const h = await hazirla();
    const kim = yonetici();
    const a = await h.musteriAc(`ayse-${randomUUID().slice(0, 6)}@ornek.test`);
    const eski = await h.ver(2, { musteri: a, ad: "Eski", soyad: "Ad" });
    await zamaniKaydir(h.vt, eski, 120);
    const iptalEdilen = await h.ver(1, { musteri: a, ad: "İptal", soyad: "Ad" });
    await zamaniKaydir(h.vt, iptalEdilen, 60);
    const teslim = await h.ver(3, { musteri: a, ad: "Ayşe", soyad: "Şahin" });
    // Üye olmadan verilen sipariş hiçbir müşteriye sayılmaz.
    await h.ver(5, { eposta: "misafir@ornek.test" });
    await iadeServisi(site).iadeYap(h.vt, kim, {
      numara: iptalEdilen,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    const s = siparisYonetimi(site);
    for (const [islem, gorulenDurum] of [
      ["hazirlamaya-al", "odeme-bekleniyor"],
      ["kargoya-ver", "hazirlaniyor"],
      ["teslim-edildi", "kargoda"],
    ] as const) {
      await s.islemYap(h.vt, kim, {
        numara: teslim,
        islem,
        gorulenDurum,
        ...(islem === "kargoya-ver" ? { kargo: { firma: firmaKimligi } } : {}),
      });
    }
    await iadeServisi(site).iadeYap(h.vt, kim, {
      numara: teslim,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 0, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "kusurlu-hasarli",
    });
    const [iade] = await h.vt
      .select({ satir: siparisIadeleri })
      .from(siparisIadeleri)
      .innerJoin(siparisler, eq(siparisler.kimlik, siparisIadeleri.siparis_kimligi))
      .where(eq(siparisler.numara, teslim));
    if (iade === undefined) throw new Error("İade yok.");
    // Başarısız iade (para dönmedi) toplamdan düşülmez.
    const { kimlik: _kimlik, ...kopya } = iade.satir;
    await h.vt.insert(siparisIadeleri).values({ ...kopya, durum: "basarisiz", tutar: 999 });

    const b = await h.musteriAc(`b-${randomUUID().slice(0, 6)}@ornek.test`);
    await adresServisi(site).adresEkle(
      h.vt,
      b,
      adresFormuSemasi.parse({
        baslik: "Ev",
        teslimat: {
          ad: "Selin",
          soyad: "Bulut",
          telefon: "0555 000 00 00",
          adres: {
            ulke: "TR",
            il: "TR-06",
            ilce: "TR-06-007",
            adres: "Sokak No: 2",
            postaKodu: "06420",
          },
        },
        varsayilanTeslimat: true,
        varsayilanFatura: true,
      }),
    );
    const c = await h.musteriAc(`c-${randomUUID().slice(0, 6)}@ornek.test`);
    const silinen = await h.musteriAc(`silinen-${randomUUID().slice(0, 6)}@ornek.test`);
    await h.vt
      .update(musteriler)
      .set({ silinme_zamani: new Date() })
      .where(eq(musteriler.kimlik, silinen));

    const liste = await listele(h.vt);
    expect(liste.toplam).toBe(3);
    const satir = (kimlik: string) => liste.satirlar.find((x) => x.kimlik === kimlik);
    expect(satir(silinen)).toBeUndefined();
    const beklenen =
      (await h.siparisToplami(eski)) + (await h.siparisToplami(teslim)) - iade.satir.tutar;
    expect(satir(a)).toMatchObject({
      siparisSayisi: 2,
      toplam: beklenen,
      ad: "Ayşe Şahin",
      kampanyaIzni: false,
    });
    expect(satir(b)).toMatchObject({ siparisSayisi: 0, toplam: 0, ad: "Selin Bulut" });
    expect(satir(c)).toMatchObject({ siparisSayisi: 0, toplam: 0, ad: null });

    // Sıralama ve süzgeçler.
    expect((await listele(h.vt, { siralama: "toplam-azalan" })).satirlar[0]?.kimlik).toBe(a);
    expect((await listele(h.vt, { siparis: ["var"] })).satirlar.map((x) => x.kimlik)).toEqual([a]);
    expect((await listele(h.vt, { siparis: ["yok"] })).toplam).toBe(2);
    expect((await listele(h.vt, { siparis: ["var", "yok"] })).toplam).toBe(3);
  });

  it("arama e-postada ve adda Türkçe harfsiz ve büyük harfle; % ve _ düz harftir; sayfa", async () => {
    const h = await hazirla();
    const ek = randomUUID().slice(0, 6);
    const a = await h.musteriAc(`deniz_${ek}@ornek.test`);
    await h.ver(1, { musteri: a, ad: "Şükrü", soyad: "Çağlayan" });
    const b = await h.musteriAc(`denizx${ek}@ornek.test`);
    const bul = async (ara: string) =>
      (await listele(h.vt, { ara })).satirlar.map((x) => x.kimlik).sort();
    expect(await bul("SUKRU")).toEqual([a]);
    expect(await bul("caglayan")).toEqual([a]);
    expect(await bul(`DENIZ_${ek}`)).toEqual([a]);
    expect(await bul("deniz")).toEqual([a, b].sort());
    // "_" joker değildir: "denizx" ile eşleşmez.
    expect(await bul(`deniz_${ek}`)).toEqual([a]);
    expect(await bul("%")).toEqual([]);
    const sayfali = await listele(h.vt, { sayfaBoyu: 25, sayfa: 9 });
    expect(sayfali).toMatchObject({ sayfa: 1, sayfaSayisi: 1, toplam: 2 });
  });

  it("kampanya izni en yeni onaydan; kayıt günü sitenin saat dilimiyle", async () => {
    const h = await hazirla();
    const izinli = await h.musteriAc(`izin-${randomUUID().slice(0, 6)}@ornek.test`, true);
    const geriAlan = await h.musteriAc(`geri-${randomUUID().slice(0, 6)}@ornek.test`, true);
    await pazarlamaIzniniDegistir(h.vt, geriAlan, false);
    const izinsiz = await h.musteriAc(`yok-${randomUUID().slice(0, 6)}@ornek.test`);
    const kimler = async (girdi: Record<string, unknown>) =>
      (await listele(h.vt, girdi)).satirlar.map((x) => x.kimlik).sort();
    expect(await kimler({ kampanya: ["var"] })).toEqual([izinli]);
    expect(await kimler({ kampanya: ["yok"] })).toEqual([geriAlan, izinsiz].sort());
    // Kayıt günü: İstanbul'da 2026-03-10 00:00 (UTC 2026-03-09 21:00) ve bir milisaniye öncesi.
    await h.vt
      .update(musteriler)
      .set({ olusturulma_zamani: new Date("2026-03-09T21:00:00.000Z") })
      .where(eq(musteriler.kimlik, izinli));
    await h.vt
      .update(musteriler)
      .set({ olusturulma_zamani: new Date("2026-03-09T20:59:59.999Z") })
      .where(eq(musteriler.kimlik, izinsiz));
    expect(await kimler({ kayit: { baslangic: "2026-03-10", bitis: "2026-03-10" } })).toEqual([
      izinli,
    ]);
    expect(await kimler({ kayit: { baslangic: null, bitis: "2026-03-09" } })).toEqual([izinsiz]);
  });
});

describe("müşteri ayrıntısı ve notlar", () => {
  it("ayrıntı: sayılar, siparişler, adresler, üyelik onayı, notlar yazanıyla en yeni önce; olmayan ve silinmiş null", async () => {
    const h = await hazirla();
    const a = await h.musteriAc(`a-${randomUUID().slice(0, 6)}@ornek.test`, true);
    const numara = await h.ver(2, { musteri: a });
    const kim = yonetici();
    await yonetim.notEkle(h.vt, kim, { musteri: a, metin: "Birinci not" });
    await yonetim.notEkle(h.vt, kim, { musteri: a, metin: "İkinci not\nikinci satır" });
    const ayrinti = await yonetim.ayrinti(h.vt, a);
    expect(ayrinti).toMatchObject({
      kimlik: a,
      siparisSayisi: 1,
      toplam: await h.siparisToplami(numara),
      kampanyaIzni: true,
      uyelikSurumu: "taslak-1",
      siparisler: [{ numara, durum: "odeme-bekleniyor" }],
      adresler: [],
    });
    expect(ayrinti?.kampanyaZamani).toBeInstanceOf(Date);
    expect(ayrinti?.notlar.map((n) => n.metin)).toEqual([
      "İkinci not\nikinci satır",
      "Birinci not",
    ]);
    expect(ayrinti?.notlar[0]?.yazan).toEqual({ tur: "yonetici", eposta: null });
    expect(await yonetim.ayrinti(h.vt, randomUUID())).toBeNull();
    await h.vt
      .update(musteriler)
      .set({ silinme_zamani: new Date() })
      .where(eq(musteriler.kimlik, a));
    expect(await yonetim.ayrinti(h.vt, a)).toBeNull();
  });

  it("not değişiklik kaydına metinsiz girer; başkasının notu silinmez; silinmiş hesaba not yazılmaz; müşteriye gitmez; hesap silinince not gider", async () => {
    const h = await hazirla();
    const a = await h.musteriAc(`a-${randomUUID().slice(0, 6)}@ornek.test`);
    const b = await h.musteriAc(`b-${randomUUID().slice(0, 6)}@ornek.test`);
    const numara = await h.ver(1, { musteri: a });
    const gizli = `Gizli not ${randomUUID()}`;
    const kim = yonetici();
    const { kimlik: not } = await yonetim.notEkle(h.vt, kim, { musteri: a, metin: gizli });
    const kayitlar = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(eq(degisiklikKayitlari.kayit_kimligi, not));
    expect(kayitlar).toHaveLength(1);
    expect(kayitlar[0]).toMatchObject({
      islem: "musteri-notu.eklendi",
      kayit_turu: "musteri-notu",
    });
    expect(JSON.stringify(kayitlar)).not.toContain(gizli);

    // Müşterinin gördüğü hiçbir yerde yok: hesap bilgileri, adresler, siparişleri ve sipariş ayrıntısı.
    const musteriyeGiden = JSON.stringify([
      await hesapBilgileri(h.vt, a),
      await adresServisi(site).adresListesi(h.vt, a),
      await musteriSiparisleri().liste(h.vt, a, 1),
      await musteriSiparisleri().ayrinti(h.vt, a, numara, {
        musteriIptali: "odeme-bekleniyor",
        iadeTalebiSuresi: 14,
        iadeKargosu: "magaza",
      }),
    ]);
    expect(musteriyeGiden).not.toContain(gizli);

    expect(await hatasi(yonetim.notSil(h.vt, kim, { musteri: b, not }))).toBe("bulunamadi");
    expect(await hatasi(yonetim.notSil(h.vt, kim, { musteri: a, not: randomUUID() }))).toBe(
      "bulunamadi",
    );
    await yonetim.notSil(h.vt, kim, { musteri: a, not });
    const silmeKaydi = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, not),
          eq(degisiklikKayitlari.islem, "musteri-notu.silindi"),
        ),
      );
    expect(silmeKaydi).toHaveLength(1);
    expect(JSON.stringify(silmeKaydi)).not.toContain(gizli);
    expect((await yonetim.ayrinti(h.vt, a))?.notlar).toEqual([]);

    await h.vt
      .update(musteriler)
      .set({ silinme_zamani: new Date() })
      .where(eq(musteriler.kimlik, b));
    expect(await hatasi(yonetim.notEkle(h.vt, kim, { musteri: b, metin: "x" }))).toBe("bulunamadi");
    expect(await hatasi(yonetim.notEkle(h.vt, kim, { musteri: randomUUID(), metin: "x" }))).toBe(
      "bulunamadi",
    );

    // Satırı kalıcı silinen müşterinin notları da silinir (veritabanı bağı). Onayı ve siparişi olmayan hesap.
    const cKimlik = (
      await h.vt
        .insert(musteriler)
        .values({ eposta: `c-${randomUUID().slice(0, 6)}@ornek.test`, sifre_ozeti: "x" })
        .returning({ kimlik: musteriler.kimlik })
    )[0]?.kimlik;
    if (cKimlik === undefined) throw new Error("Müşteri açılamadı.");
    await yonetim.notEkle(h.vt, kim, { musteri: cKimlik, metin: "Silinecek" });
    await h.vt.delete(musteriler).where(eq(musteriler.kimlik, cKimlik));
    expect(
      await h.vt.select().from(musteriNotlari).where(eq(musteriNotlari.musteri_kimligi, cKimlik)),
    ).toEqual([]);
  });

  it("veritabanı uzun ve boş notu reddeder; sınır kayıtla aynı", async () => {
    const h = await hazirla();
    const a = await h.musteriAc(`a-${randomUUID().slice(0, 6)}@ornek.test`);
    const yaz = (metin: string) =>
      h.vt
        .insert(musteriNotlari)
        .values({ musteri_kimligi: a, metin, kim_turu: "sistem", kim_adi: "deneme" });
    await yaz("x".repeat(musteriPanelSinirlari.notEnCok));
    await expect(yaz("x".repeat(musteriPanelSinirlari.notEnCok + 1))).rejects.toThrow();
    await expect(yaz("")).rejects.toThrow();
  });

  it("şifre sıfırlama bağlantısı kuyruğa girer, kayıt e-postasız; sınır dolunca istek-siniri; silinmiş hesapta bulunamadi", async () => {
    const h = await hazirla();
    const eposta = `sifre-${randomUUID().slice(0, 6)}@ornek.test`;
    const a = await h.musteriAc(eposta);
    const kim = yonetici();
    denemeleriSil(`musteri sifirlama ${eposta}`);
    denemeleriSil(`musteri sifirlama gunluk ${eposta}`);
    expect(await yonetim.sifreSifirlamaGonder(h.vt, kim, a)).toEqual({ sonuc: "gonderildi" });
    const epostalar = await h.vt
      .select()
      .from(epostaKayitlari)
      .where(and(eq(epostaKayitlari.alici, eposta), eq(epostaKayitlari.sablon, "sifre-sifirlama")));
    expect(epostalar).toHaveLength(1);
    const kayit = await h.vt
      .select()
      .from(degisiklikKayitlari)
      .where(
        and(
          eq(degisiklikKayitlari.kayit_kimligi, a),
          eq(degisiklikKayitlari.islem, "musteri.sifre-sifirlama-gonderildi"),
        ),
      );
    expect(kayit).toHaveLength(1);
    expect(JSON.stringify(kayit)).not.toContain(eposta);
    await yonetim.sifreSifirlamaGonder(h.vt, kim, a);
    await yonetim.sifreSifirlamaGonder(h.vt, kim, a);
    expect(await hatasi(yonetim.sifreSifirlamaGonder(h.vt, kim, a))).toBe("istek-siniri");
    denemeleriSil(`musteri sifirlama ${eposta}`);
    denemeleriSil(`musteri sifirlama gunluk ${eposta}`);
    await h.vt
      .update(musteriler)
      .set({ silinme_zamani: new Date() })
      .where(eq(musteriler.kimlik, a));
    expect(await hatasi(yonetim.sifreSifirlamaGonder(h.vt, kim, a))).toBe("bulunamadi");
  });

  it("iki site birbirinin müşterisini ve notunu görmez", async () => {
    const birinci = await hazirla("musteri-yonetimi-a");
    const ikinci = await hazirla("musteri-yonetimi-b");
    const a = await birinci.musteriAc(`a-${randomUUID().slice(0, 6)}@ornek.test`);
    await yonetim.notEkle(birinci.vt, yonetici(), { musteri: a, metin: "Birinci sitenin notu" });
    expect((await listele(ikinci.vt)).satirlar.map((x) => x.kimlik)).not.toContain(a);
    expect(await yonetim.ayrinti(ikinci.vt, a)).toBeNull();
    expect(await hatasi(yonetim.notEkle(ikinci.vt, yonetici(), { musteri: a, metin: "x" }))).toBe(
      "bulunamadi",
    );
  });
});
