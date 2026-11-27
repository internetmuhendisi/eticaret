// Satış raporu gerçek veritabanıyla (kart 0317, karar 0195):
// - Satış ödemesi alınmış siparişlerdir, ödeme gününde; gün sınırları sitenin saat dilimiyle, milisaniyesine kadar
//   (yaz saatine geçilen 23 saatlik gün de). Ödeme bekleyen ve ödenmeden iptal edilen sipariş sayılmaz.
// - Ödendikten sonra iptal edilen sipariş ödeme gününde satış, iptal gününde iadedir; kısmi iade tamamlandığı günde
//   tutarı ve vergisiyle düşülür. Bir siparişin iadeleri toplamını aşmaz (taksit farkı).
// - Kupon indirimi siparişin saklanan değeridir; başka para birimindeki sipariş ve iadesi sayılmaz.
// - Oran oran vergi satışların ve iadelerin dökümünden; önceki dönem aynı uzunlukta; seri günlük ve haftalık.
// - İki site ayrıdır.
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { Site } from "../../../ayar-semasi/site-klasoru.ts";
import { gunEkle, gununBasi } from "../../../metinler/bicimleyici.ts";
import { siparisIadeleri, siparisler } from "../../siparis/model.ts";
import { oncekiDonem } from "../donem.ts";
import { satisRaporu } from "../satis.ts";
import {
  gun,
  hazirla,
  iade,
  iadeAni,
  kapida,
  ms,
  ode,
  oku,
  site,
  teslimEt,
  tz,
  ver,
  yapan,
  yonetim,
} from "./ortak.ts";

vi.setConfig({ testTimeout: 120_000 });

const rapor = satisRaporu(site);

describe("satış raporu", () => {
  it("gün sınırı milisaniyesine kadar sitenin saat diliminde; ödeme bekleyen ve ödenmeden iptal edilen sayılmaz", async () => {
    const h = await hazirla();
    const birim = await h.urunAc();
    const gunu = "2026-10-14";
    const bas = gununBasi(gunu, tz);
    const son = gununBasi(gunEkle(gunu, 1), tz);
    // Günün ilk ve son milisaniyesi içeride, bir öncesi ve sonrası dışarıda.
    const icerideIlk = await ode(h.vt, await ver(h.vt, [{ birim, adet: 1 }]), bas);
    const icerideSon = await ode(h.vt, await ver(h.vt, [{ birim, adet: 2 }]), ms(son, -1));
    await ode(h.vt, await ver(h.vt, [{ birim, adet: 3 }]), ms(bas, -1));
    await ode(h.vt, await ver(h.vt, [{ birim, adet: 4 }]), son);
    // Ödeme bekleyen sipariş ve ödenmeden iptal edilen sipariş.
    await ver(h.vt, [{ birim, adet: 5 }]);
    const iptal = await ver(h.vt, [{ birim, adet: 6 }]);
    await iade.iadeYap(h.vt, yapan(), {
      numara: iptal,
      tur: "iptal",
      gorulenDurum: "odeme-bekleniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    await iadeAni(h.vt, iptal, ms(bas, 1000));

    const sonuc = await rapor.rapor(h.vt, gun(gunu), null);
    expect(sonuc.ozet.siparisSayisi).toBe(2);
    expect(sonuc.ozet.satis).toBe(icerideIlk.toplam + icerideSon.toplam);
    expect(sonuc.ozet.ortalamaSepet).toBe(Math.round((icerideIlk.toplam + icerideSon.toplam) / 2));
    // Ödenmeden iptal edilen siparişin iadesi tutarsızdır: iade sayılmaz.
    expect(sonuc.ozet.iade).toBe(0);
    expect(sonuc.ozet.iadeSayisi).toBe(0);
    expect(sonuc.ozet.netSatis).toBe(sonuc.ozet.satis);
    expect(sonuc.onceki).toBeNull();
  });

  it("yaz saatine geçilen 23 saatlik günde iki uç da sitenin saat dilimiyle", async () => {
    const h = await hazirla("rapor-yaz-saati");
    const newYork: Site = { ...site, ayarlar: { ...site.ayarlar, saatDilimi: "America/New_York" } };
    const birim = await h.urunAc();
    const gunu = "2026-03-08";
    const bas = gununBasi(gunu, "America/New_York");
    const son = gununBasi(gunEkle(gunu, 1), "America/New_York");
    expect(son.getTime() - bas.getTime()).toBe(23 * 3_600_000);
    const ilk = await ode(h.vt, await ver(h.vt, [{ birim, adet: 1 }]), bas);
    const sonuncu = await ode(h.vt, await ver(h.vt, [{ birim, adet: 2 }]), ms(son, -1));
    await ode(h.vt, await ver(h.vt, [{ birim, adet: 3 }]), son);
    const sonuc = await satisRaporu(newYork).rapor(h.vt, gun(gunu), null);
    expect(sonuc.ozet.siparisSayisi).toBe(2);
    expect(sonuc.ozet.satis).toBe(ilk.toplam + sonuncu.toplam);
    expect(sonuc.seri.noktalar).toEqual([
      { baslangic: gunu, bitis: gunu, satis: ilk.toplam + sonuncu.toplam, siparisSayisi: 2 },
    ]);
  });

  it("ödendikten sonra iptal: ödeme gününde satış, iptal gününde iade; geçmiş gün değişmez", async () => {
    const h = await hazirla("rapor-iptal");
    const birim = await h.urunAc();
    const odemeGunu = "2026-10-01";
    const iptalGunu = "2026-10-05";
    const numara = await ver(h.vt, [{ birim, adet: 2 }]);
    const siparis = await ode(h.vt, numara, ms(gununBasi(odemeGunu, tz), 3_600_000));
    await iade.iadeYap(h.vt, yapan(), {
      numara,
      tur: "iptal",
      gorulenDurum: "hazirlaniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    expect((await oku(h.vt, numara)).durum).toBe("iptal");
    await iadeAni(h.vt, numara, ms(gununBasi(iptalGunu, tz), 3_600_000));
    const odemede = await rapor.ozet(h.vt, gun(odemeGunu));
    expect(odemede).toMatchObject({ siparisSayisi: 1, satis: siparis.toplam, iade: 0 });
    const iptalde = await rapor.ozet(h.vt, gun(iptalGunu));
    expect(iptalde).toMatchObject({
      siparisSayisi: 0,
      satis: 0,
      iade: siparis.toplam,
      iadeSayisi: 1,
      netSatis: -siparis.toplam,
      ortalamaSepet: null,
    });
    // İki gün birlikte: satış ve iadesi birbirini götürür, vergi de.
    const ikisi = await rapor.ozet(h.vt, { baslangic: odemeGunu, bitis: iptalGunu });
    expect(ikisi.netSatis).toBe(0);
    expect(ikisi.vergiler).toEqual([]);
  });

  it("kısmi iade tamamlandığı günde tutarı ve oran oran vergisiyle düşülür; satışın vergisi dökümden", async () => {
    const h = await hazirla("rapor-kismi-iade");
    const genel = await h.urunAc({ fiyat: 12_000 });
    const indirimli = await h.urunAc({ fiyat: 5_000, sinif: h.indirimli });
    const gunu = "2026-10-10";
    const numara = await ver(
      h.vt,
      [
        { birim: genel, adet: 3 },
        { birim: indirimli, adet: 1 },
      ],
      kapida,
    );
    await yonetim.islemYap(h.vt, yapan(), {
      numara,
      islem: "hazirlamaya-al",
      gorulenDurum: "odeme-bekleniyor",
    });
    await teslimEt(h.vt, numara);
    await h.vt
      .update(siparisler)
      .set({ odeme_zamani: ms(gununBasi(gunu, tz), 60_000) })
      .where(eq(siparisler.numara, numara));
    const siparis = await oku(h.vt, numara);
    expect(siparis.vergi_dokumu.length).toBe(2);
    await iade.iadeYap(h.vt, yapan(), {
      numara,
      tur: "iade",
      gorulenDurum: "teslim-edildi",
      kalemler: [{ sira: 1, adet: 1 }],
      kargo: false,
      stogaKoy: true,
      neden: "beklentiyi-karsilamadi",
    });
    await iadeAni(h.vt, numara, ms(gununBasi(gunu, tz), 120_000));
    const [kayit] = await h.vt
      .select()
      .from(siparisIadeleri)
      .where(eq(siparisIadeleri.siparis_kimligi, siparis.kimlik));
    if (kayit === undefined) throw new Error("İade yok.");
    expect(kayit.tutar).toBeGreaterThan(0);
    const ozet = await rapor.ozet(h.vt, gun(gunu));
    expect(ozet).toMatchObject({
      siparisSayisi: 1,
      satis: siparis.toplam,
      iade: kayit.tutar,
      iadeSayisi: 1,
      netSatis: siparis.toplam - kayit.tutar,
    });
    const beklenen = siparis.vergi_dokumu
      .map((satir) => {
        const iadesi = kayit.vergi_dokumu.find((d) => d.ad === satir.ad && d.oran === satir.oran);
        return {
          ad: satir.ad ?? null,
          oran: satir.oran,
          matrah: satir.matrah - (iadesi?.matrah ?? 0),
          vergi: satir.vergi - (iadesi?.vergi ?? 0),
        };
      })
      // Bütünüyle iade edilen oranın satırı kalmaz.
      .filter((satir) => satir.matrah !== 0 || satir.vergi !== 0)
      .toSorted((a, b) => a.oran - b.oran);
    expect(beklenen.length).toBeGreaterThan(0);
    expect(ozet.vergiler.toSorted((a, b) => a.oran - b.oran)).toEqual(beklenen);
    // Başarısız iade sayılmaz: tek başına da, aynı siparişin tamamlanmış iadesinin yanında da.
    const { kimlik: _kimlik, ...kopya } = kayit;
    await h.vt.insert(siparisIadeleri).values({ ...kopya, durum: "basarisiz", tutar: 777 });
    const basarisizla = await rapor.ozet(h.vt, gun(gunu));
    expect(basarisizla).toMatchObject({ iade: kayit.tutar, iadeSayisi: 1 });
    // Başarısız iadenin vergisi de düşülmez.
    expect(basarisizla.vergiler.toSorted((a, b) => a.oran - b.oran)).toEqual(beklenen);
    await h.vt
      .update(siparisIadeleri)
      .set({ durum: "basarisiz" })
      .where(eq(siparisIadeleri.kimlik, kayit.kimlik));
    expect(await rapor.ozet(h.vt, gun(gunu))).toMatchObject({ iade: 0, iadeSayisi: 0 });
    await h.vt
      .update(siparisIadeleri)
      .set({ durum: "tamamlandi" })
      .where(eq(siparisIadeleri.kimlik, kayit.kimlik));
    // İade sonraki güne düşünce satış günü iadesiz kalır.
    await iadeAni(h.vt, numara, gununBasi(gunEkle(gunu, 1), tz));
    expect((await rapor.ozet(h.vt, gun(gunu))).iade).toBe(0);
    expect((await rapor.ozet(h.vt, gun(gunEkle(gunu, 1)))).iade).toBe(kayit.tutar);
  });

  it("siparişin iadeleri toplamını aşmaz (taksit farkı); kupon indirimi (ücretsiz kargo kuponu da) saklanan değerden", async () => {
    const h = await hazirla("rapor-taksit-kupon");
    const birim = await h.urunAc();
    const gunu = "2026-10-20";
    const numara = await ver(h.vt, [{ birim, adet: 2 }]);
    const siparis = await ode(h.vt, numara, ms(gununBasi(gunu, tz), 1000));
    await h.vt
      .update(siparisler)
      .set({ kupon_kodu: "DENEME10", kupon_turu: "yuzde", kupon_indirimi: 1_234 })
      .where(eq(siparisler.numara, numara));
    await iade.iadeYap(h.vt, yapan(), {
      numara,
      tur: "iptal",
      gorulenDurum: "hazirlaniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    await iadeAni(h.vt, numara, ms(gununBasi(gunu, tz), 2000));
    // Taksitli ödemenin iadesi taksit farkını da döndürür: satıştan fazlası sayılmaz.
    await h.vt
      .update(siparisIadeleri)
      .set({ tutar: sql`${siparisIadeleri.tutar} + 500` })
      .where(eq(siparisIadeleri.siparis_kimligi, siparis.kimlik));
    // Ücretsiz kargo kuponu: indirimi verilmeyen kargo ücretidir (karar 0187).
    const kargolu = await ode(
      h.vt,
      await ver(h.vt, [{ birim, adet: 1 }]),
      ms(gununBasi(gunu, tz), 3000),
    );
    await h.vt
      .update(siparisler)
      .set({
        kargo_turu: "ucretsiz",
        kargo_tutari: 0,
        kupon_kodu: "KARGO",
        kupon_turu: "ucretsiz-kargo",
        kupon_kargo_indirimi: 1_500,
      })
      .where(eq(siparisler.numara, kargolu.numara));
    const ozet = await rapor.ozet(h.vt, gun(gunu));
    expect(ozet).toMatchObject({
      siparisSayisi: 2,
      satis: siparis.toplam + kargolu.toplam,
      kuponIndirimi: 1_234 + 1_500,
      iade: siparis.toplam,
      netSatis: kargolu.toplam,
    });
  });

  it("başka para birimindeki sipariş ve iadesi sayılmaz", async () => {
    const h = await hazirla("rapor-para-birimi");
    const birim = await h.urunAc();
    const gunu = "2026-10-21";
    const sayilan = await ode(h.vt, await ver(h.vt, [{ birim, adet: 1 }]), gununBasi(gunu, tz));
    const baska = await ver(h.vt, [{ birim, adet: 2 }]);
    await ode(h.vt, baska, gununBasi(gunu, tz));
    await iade.iadeYap(h.vt, yapan(), {
      numara: baska,
      tur: "iptal",
      gorulenDurum: "hazirlaniyor",
      kalemler: [],
      kargo: false,
      stogaKoy: true,
      neden: "musteri-vazgecti",
    });
    await iadeAni(h.vt, baska, ms(gununBasi(gunu, tz), 1000));
    await h.vt
      .update(siparisler)
      .set({ para_birimi: site.ayarlar.paraBirimi === "EUR" ? "USD" : "EUR" })
      .where(eq(siparisler.numara, baska));
    const ozet = await rapor.ozet(h.vt, gun(gunu));
    expect(ozet).toMatchObject({ siparisSayisi: 1, satis: sayilan.toplam, iade: 0, iadeSayisi: 0 });
    const tek = sayilan.vergi_dokumu.map((d) => ({ ...d, ad: d.ad ?? null }));
    expect(ozet.vergiler).toEqual(tek);
  });

  it("önceki dönem aynı uzunlukta hemen önce; seri günlük ve uzun dönemde haftalık", async () => {
    const h = await hazirla("rapor-onceki-seri");
    const birim = await h.urunAc();
    const a = await ode(h.vt, await ver(h.vt, [{ birim, adet: 1 }]), gununBasi("2026-11-01", tz));
    const b = await ode(h.vt, await ver(h.vt, [{ birim, adet: 2 }]), gununBasi("2026-11-03", tz));
    const onceki = await ode(
      h.vt,
      await ver(h.vt, [{ birim, adet: 3 }]),
      ms(gununBasi("2026-11-01", tz), -1),
    );
    const donem = { baslangic: "2026-11-01", bitis: "2026-11-03" };
    const sonuc = await rapor.rapor(h.vt, donem, oncekiDonem(donem));
    expect(sonuc.onceki?.donem).toEqual({ baslangic: "2026-10-29", bitis: "2026-10-31" });
    expect(sonuc.onceki?.ozet).toMatchObject({ siparisSayisi: 1, satis: onceki.toplam });
    expect(sonuc.seri).toEqual({
      tur: "gunluk",
      noktalar: [
        { baslangic: "2026-11-01", bitis: "2026-11-01", satis: a.toplam, siparisSayisi: 1 },
        { baslangic: "2026-11-02", bitis: "2026-11-02", satis: 0, siparisSayisi: 0 },
        { baslangic: "2026-11-03", bitis: "2026-11-03", satis: b.toplam, siparisSayisi: 1 },
      ],
    });
    // 32 gün: haftalık, dönemin ilk gününden yedişer gün, son nokta kısa.
    const uzun = await rapor.rapor(h.vt, { baslangic: "2026-10-03", bitis: "2026-11-03" }, null);
    expect(uzun.seri.tur).toBe("haftalik");
    expect(uzun.seri.noktalar.map(({ baslangic, bitis }) => [baslangic, bitis])).toEqual([
      ["2026-10-03", "2026-10-09"],
      ["2026-10-10", "2026-10-16"],
      ["2026-10-17", "2026-10-23"],
      ["2026-10-24", "2026-10-30"],
      ["2026-10-31", "2026-11-03"],
    ]);
    expect(uzun.seri.noktalar.at(-1)).toMatchObject({
      satis: a.toplam + b.toplam + onceki.toplam,
      siparisSayisi: 3,
    });
    // 31 gün hâlâ günlük.
    const sinir = await rapor.rapor(h.vt, { baslangic: "2026-10-04", bitis: "2026-11-03" }, null);
    expect(sinir.seri.tur).toBe("gunluk");
    expect(sinir.seri.noktalar).toHaveLength(31);
  });

  it("iki site birbirinin satışını görmez", async () => {
    const birinci = await hazirla("rapor-site-a");
    const ikinci = await hazirla("rapor-site-b");
    const birim = await birinci.urunAc();
    const gunu = "2026-10-22";
    await ode(birinci.vt, await ver(birinci.vt, [{ birim, adet: 1 }]), gununBasi(gunu, tz));
    expect((await rapor.ozet(birinci.vt, gun(gunu))).siparisSayisi).toBe(1);
    expect(await rapor.ozet(ikinci.vt, gun(gunu))).toEqual({
      siparisSayisi: 0,
      satis: 0,
      kuponIndirimi: 0,
      iade: 0,
      iadeSayisi: 0,
      netSatis: 0,
      ortalamaSepet: null,
      vergiler: [],
    });
  });
});
