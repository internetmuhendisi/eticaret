// Panelin araması gerçek istek ve veritabanıyla (kart 0321, karar 0191):
// - Sipariş numarası, müşterinin adı ve e-postasıyla; ürün adı, stok kodu ve barkoduyla (birleşiminki de ürünü bulur);
//   müşteri adı ve e-postasıyla bulunur. Türkçe harfsiz ve büyük harfle bulur; "%" ve "_" düz harftir.
// - Silinmiş ürün, silinmiş birleşimin kodu ve silinmiş hesap gelmez; taslak ürün gelir.
// - Kişisel bilgisi silinmiş sipariş numarasıyla bulunur, adla ve e-postayla bulunmaz.
// - Bir türde en çok 5 sonuç, fazlası `dahaFazla`.
// - İzin: görevli siparişi ve ürünü arar, müşteriyi arayamaz (403); rolsüz yönetici, müşteri ve girişsiz ziyaretçi
//   hiçbir türü arayamaz. İzni olmayanın isteğinde aramanın sorgusu çalışmaz (veritabanının sorgu günlüğü sayılarak).
// - Kısa ve uzun metin doğrulama hatasıdır.
// - İki site birbirinin kaydını bulmaz.
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Site, siteKlasorunuOku } from "../../ayar-semasi/site-klasoru.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { panelAramaSinirlari } from "../../kayitlar/panel-arama.ts";
import { roller, yoneticiRolleri } from "../../moduller/ekip/model.ts";
import { siteninFiyatServisi } from "../../moduller/fiyat/servis.ts";
import { musteriler } from "../../moduller/musteri/model.ts";
import { musteriHesabiAc } from "../../moduller/musteri/servis.ts";
import { odemeBilgileriSemasi } from "../../moduller/odeme/semalar.ts";
import { type OdemeGirdisi, odemeServisi } from "../../moduller/odeme/servis.ts";
import { hesapAc } from "../../moduller/oturum/servis.ts";
import { siparisler } from "../../moduller/siparis/model.ts";
import { kisiselVeriTemizligi } from "../../moduller/siparis/temizlik.ts";
import { stokServisi } from "../../moduller/stok/servis.ts";
import { urunServisi } from "../../moduller/urun/servis.ts";
import { siteninVergiServisi } from "../../moduller/vergi/servis.ts";
import { baglantiyiKapat, siteninVeritabani, type Veritabani } from "../../veritabani/baglanti.ts";
import { denemeSitesiAc } from "../../veritabani/testler/deneme-sitesi.ts";
import {
  musteriAyrintisiAdresi,
  siparisAyrintisiAdresi,
  urunEkraniAdresi,
} from "../../yonetim-paneli/adresler.ts";
import {
  panelMusteriAramaUcu,
  panelSiparisAramaUcu,
  panelUrunAramaUcu,
} from "../yonetici/panel-arama.ts";
import { oturumCerezi } from "./erisim-denemesi.ts";

vi.setConfig({ testTimeout: 120_000 });

const klasor = siteKlasorunuOku(
  resolve(import.meta.dirname, "../../ayar-semasi/testler/ornek-siteler/vergi-dolu"),
);
const site: Site = {
  ...klasor,
  baslangic: {
    ...klasor.baslangic,
    vergiAdi: "Deneme vergisi",
    odemeYontemleri: [{ kod: "kapida-odeme", acik: true }],
    kapidaOdemeSecenekleri: ["nakit"],
  },
};
const ortak = globalThis as Record<symbol, unknown>;
const siteAnahtari = Symbol.for("cekirdek.calisanSite");

let vt: Veritabani;
let baglanti: string;
let sil: () => Promise<void>;
let ikinci: { vt: Veritabani; baglantiAdresi: string; sil: () => Promise<void> };
const urunSrv = urunServisi(() => site.ayarlar.saatDilimi);
const kim = (): DegisikligiYapan => ({ tur: "yonetici", kimlik: randomUUID() });
const ek = () => randomBytes(3).toString("hex");

beforeAll(async () => {
  const deneme = await denemeSitesiAc("panel-arama");
  vt = deneme.vt;
  baglanti = deneme.baglantiAdresi;
  sil = deneme.sil;
  ikinci = await denemeSitesiAc("panel-arama-ikinci");
  vi.stubEnv("VERITABANI_ADRESI", baglanti);
  vi.stubEnv("IKI_ASAMA_ANAHTARI", randomBytes(32).toString("hex"));
  await baglantiyiKapat();
}, 120_000);
beforeEach(() => {
  ortak[siteAnahtari] = site;
});
afterAll(async () => {
  delete ortak[siteAnahtari];
  await baglantiyiKapat();
  vi.unstubAllEnvs();
  await sil();
  await ikinci.sil();
});

const hesap = async (
  kisi: "magaza-sahibi" | "gorevli" | "rolsuz" | "musteri",
  hedef: Veritabani = vt,
) => {
  const tur = kisi === "musteri" ? "musteri" : "yonetici";
  const { hesapKimligi } = await hesapAc(hedef, tur, {
    eposta: `arama-${ek()}@ornek.test`,
    sifre: "uzun-bir-deneme-sifresi",
  });
  if (kisi === "magaza-sahibi" || kisi === "gorevli") {
    const [rol] = await hedef
      .select({ kimlik: roller.kimlik })
      .from(roller)
      .where(eq(roller.kod, kisi));
    if (rol === undefined) throw new Error(`${kisi} rolü yok.`);
    await hedef
      .insert(yoneticiRolleri)
      .values({ yonetici_kimligi: hesapKimligi, rol_kimligi: rol.kimlik });
  }
  return oturumCerezi(hedef, tur, hesapKimligi);
};

type Yanit = {
  basarili: boolean;
  veri?: { satirlar: { baslik: string; alt: string; adres: string }[]; dahaFazla: boolean };
  hata?: { kod: string };
};
const ucunuCagir = async (
  uc: (istek: Request) => Promise<Response>,
  ara: string,
  oturum: string | undefined,
): Promise<{ durum: number; govde: Yanit }> => {
  const yanit = await uc(
    new Request(`http://magaza.ornek.test/kapi/yonetici/ara?${new URLSearchParams({ ara })}`, {
      headers: {
        "x-forwarded-for": `2001:db8:${randomBytes(2).toString("hex")}::1`,
        ...(oturum === undefined ? {} : { cookie: oturum }),
      },
    }),
  );
  return { durum: yanit.status, govde: (await yanit.json()) as Yanit };
};
const adresler = (govde: Yanit) => (govde.veri?.satirlar ?? []).map((satir) => satir.adres);

// Bir ürün: fiyatı ve stoğu olan basit ürün; vergi sınıfı Genel.
const genelSinif = async () => {
  const genel = (await siteninVergiServisi(site).tabloyuOku(vt)).find((s) => s.ad === "Genel");
  if (genel === undefined) throw new Error("Genel sınıf yok.");
  return genel.kimlik;
};

const siparisVer = async (
  birim: string,
  ad: string,
  soyad: string,
  eposta: string,
  musteri?: string,
) => {
  const kimSiparis: OdemeGirdisi["kim"] =
    musteri === undefined
      ? { tur: "misafir", eposta, hesap: { ac: false } }
      : { tur: "uye", musteri };
  const bilgiler = odemeBilgileriSemasi.parse({
    odemeYontemi: { yontem: "kapida-odeme", secenek: "nakit" },
    teslimat: {
      ad,
      soyad,
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
    { kim: kimSiparis, bilgiler, kalemler: [{ birim, adet: 1 }] },
    3600,
  );
  return sonuc.siparis.numara;
};

const satilikUrun = async (ad: string) => {
  const urun = await urunSrv.urunEkle(vt, kim(), {
    ad,
    vergiSinifi: await genelSinif(),
    durum: "yayinda",
    stokTakibi: true,
  });
  const birim = (await urunSrv.urunuOku(vt, urun))?.birimler[0]?.kimlik ?? "";
  await siteninFiyatServisi(site).fiyatYaz(vt, kim(), birim, { satisFiyati: 10_000 });
  await stokServisi().stokDuzelt(vt, kim(), birim, {
    yeniMiktar: 100,
    gorulenMiktar: 0,
    sebep: "sayim",
  });
  return { urun, birim };
};

describe("panelin araması", () => {
  it("sipariş numara, ad ve e-postayla; Türkçe harfsiz ve büyük harfle; en yeni önce", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { birim } = await satilikUrun(`Sipariş ürünü ${ek()}`);
    const soyad = `Çağlayanöz${ek()}`;
    const eposta = `gul.${ek()}@ornek.test`;
    const eski = await siparisVer(birim, "Şükrü", soyad, eposta);
    const yeni = await siparisVer(birim, "Ayşe", soyad, `baska-${ek()}@ornek.test`);
    // Soyadın Türkçe harfsiz ve büyük harfli yazılışı iki siparişi bulur, en yeni önce.
    const adla = await ucunuCagir(
      panelSiparisAramaUcu,
      soyad.replace("Ç", "C").replace("ğ", "g").replace("ö", "o").toUpperCase(),
      sahip,
    );
    expect(adla.durum).toBe(200);
    expect(adresler(adla.govde)).toEqual([
      siparisAyrintisiAdresi(yeni),
      siparisAyrintisiAdresi(eski),
    ]);
    // Satır: kısa ad ve numara; durum ve tutar sitenin biçimiyle.
    expect(adla.govde.veri?.satirlar[0]?.baslik).toBe(`Ayşe ${soyad.slice(0, 1)}. · ${yeni}`);
    expect(adla.govde.veri?.satirlar[0]?.alt).toMatch(/^Ödeme bekleniyor · /);
    // Türkçe harfli büyük yazılış da bulur (aranan metin de harf kuralından geçer).
    const turkce = await ucunuCagir(panelSiparisAramaUcu, soyad.toLocaleUpperCase("tr"), sahip);
    expect(adresler(turkce.govde)).toHaveLength(2);
    // E-postanın büyük harfli yazılışıyla yalnız ilk sipariş.
    const epostayla = await ucunuCagir(panelSiparisAramaUcu, eposta.toUpperCase(), sahip);
    expect(adresler(epostayla.govde)).toEqual([siparisAyrintisiAdresi(eski)]);
    // Numarayla.
    const numarayla = await ucunuCagir(panelSiparisAramaUcu, yeni.toLowerCase(), sahip);
    expect(adresler(numarayla.govde)).toEqual([siparisAyrintisiAdresi(yeni)]);
  });

  it("kişisel bilgisi silinmiş sipariş numarasıyla bulunur, adla ve e-postayla bulunmaz", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { birim } = await satilikUrun(`Eski sipariş ürünü ${ek()}`);
    const soyad = `Silinecek${ek()}`;
    const eposta = `silinecek-${ek()}@ornek.test`;
    const numara = await siparisVer(birim, "Deniz", soyad, eposta);
    await vt.execute(
      sql`update siparisler set olusturma_zamani = now() - interval '30 years' where numara = ${numara}`,
    );
    await kisiselVeriTemizligi(vt, site);
    const [silinmis] = await vt
      .select({ zaman: siparisler.kisisel_veri_silinme_zamani })
      .from(siparisler)
      .where(eq(siparisler.numara, numara));
    expect(silinmis?.zaman).not.toBeNull();
    expect(adresler((await ucunuCagir(panelSiparisAramaUcu, soyad, sahip)).govde)).toEqual([]);
    expect(adresler((await ucunuCagir(panelSiparisAramaUcu, eposta, sahip)).govde)).toEqual([]);
    const numarayla = await ucunuCagir(panelSiparisAramaUcu, numara, sahip);
    expect(adresler(numarayla.govde)).toEqual([siparisAyrintisiAdresi(numara)]);
    // Adı yoktur: başlık yalnız numara.
    expect(numarayla.govde.veri?.satirlar[0]?.baslik).toBe(numara);
  });

  it("ürün adı, stok kodu ve barkoduyla; birleşimin kodu ürünü bulur; silinmiş birleşim ve ürün gelmez; taslak gelir", async () => {
    const sahip = await hesap("magaza-sahibi");
    const kod = ek();
    // Basit ürün: kodu ve barkodu.
    const basit = await urunSrv.urunEkle(vt, kim(), {
      ad: `Şişe Çanta ${kod}`,
      vergiSinifi: null,
      stokKodu: `BST_${kod}`,
    });
    // Seçenekli taslak ürün: birleşimlerinin kodu ve barkodu.
    const secenekli = await urunSrv.urunEkle(vt, kim(), { ad: `Tişört ${kod}`, vergiSinifi: null });
    await urunSrv.secenekEkle(vt, kim(), secenekli, { ad: "Renk", degerler: ["Kırmızı", "Mavi"] });
    const okunan = await urunSrv.urunuOku(vt, secenekli);
    const [kirmizi] = (okunan?.birimler ?? []).filter((b) => !b.silindi);
    const mavi = okunan?.secenekler[0]?.degerler.find((d) => d.ad === "Mavi");
    if (kirmizi === undefined || mavi === undefined) throw new Error("Birleşim yok.");
    await urunSrv.birlesimDegistir(vt, kim(), kirmizi.kimlik, {
      stokKodu: `KRM-${kod}`,
      barkod: "4006381333931",
    });
    const maviBirim = await urunSrv.birlesimEkle(vt, kim(), secenekli, {
      degerler: [mavi.kimlik],
      stokKodu: `MAV-${kod}`,
    });
    // Silinmiş ürün.
    const silinen = await urunSrv.urunEkle(vt, kim(), {
      ad: `Şişe silinen ${kod}`,
      vergiSinifi: null,
    });
    await urunSrv.urunSil(vt, kim(), silinen);

    // Adın Türkçe harfsiz ve büyük harfli yazılışı; silinen ürün gelmez.
    const adla = await ucunuCagir(panelUrunAramaUcu, `SISE`, sahip);
    expect(adresler(adla.govde)).toContain(urunEkraniAdresi(basit));
    expect(adresler(adla.govde)).not.toContain(urunEkraniAdresi(silinen));
    // "_" düz harftir: "BST_" bulur, "BSTx" gibi yazılışı joker saymaz.
    const alt = await ucunuCagir(panelUrunAramaUcu, `bst_${kod}`, sahip);
    expect(adresler(alt.govde)).toEqual([urunEkraniAdresi(basit)]);
    expect(alt.govde.veri?.satirlar[0]?.alt).toBe(`BST_${kod} · Taslak`);
    expect(adresler((await ucunuCagir(panelUrunAramaUcu, `bst%${kod}`, sahip)).govde)).toEqual([]);
    expect(adresler((await ucunuCagir(panelUrunAramaUcu, `bstx${kod}`, sahip)).govde)).toEqual([]);
    // Birleşimin stok kodu ve barkodu seçenekli (taslak) ürünü bulur; satırda eşleşen kod yazar.
    const birlesimKodu = await ucunuCagir(panelUrunAramaUcu, `mav-${kod}`, sahip);
    expect(adresler(birlesimKodu.govde)).toEqual([urunEkraniAdresi(secenekli)]);
    expect(birlesimKodu.govde.veri?.satirlar[0]?.alt).toBe(`MAV-${kod} · Taslak`);
    const barkodla = await ucunuCagir(panelUrunAramaUcu, "4006381333931", sahip);
    expect(adresler(barkodla.govde)).toContain(urunEkraniAdresi(secenekli));
    // Silinen birleşimin kodu artık bulmaz.
    await urunSrv.birlesimSil(vt, kim(), maviBirim);
    expect(adresler((await ucunuCagir(panelUrunAramaUcu, `mav-${kod}`, sahip)).govde)).toEqual([]);
  });

  it("bir türde en çok 5 sonuç; fazlası dahaFazla", async () => {
    const sahip = await hesap("magaza-sahibi");
    const kod = ek();
    for (let i = 0; i <= panelAramaSinirlari.grupta; i += 1) {
      await urunSrv.urunEkle(vt, kim(), { ad: `Çok ${kod} ${i}`, vergiSinifi: null });
    }
    const sonuc = await ucunuCagir(panelUrunAramaUcu, `çok ${kod}`, sahip);
    expect(sonuc.govde.veri?.satirlar).toHaveLength(panelAramaSinirlari.grupta);
    expect(sonuc.govde.veri?.dahaFazla).toBe(true);
    const tek = await ucunuCagir(panelUrunAramaUcu, `çok ${kod} 0`, sahip);
    expect(tek.govde.veri?.dahaFazla).toBe(false);
  });

  it("müşteri adı ve e-postayla; silinmiş hesap gelmez", async () => {
    const sahip = await hesap("magaza-sahibi");
    const { birim } = await satilikUrun(`Müşteri ürünü ${ek()}`);
    const ac = (eposta: string) =>
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
                pazarlamaIzni: false,
              },
              3600,
            )
          ).musteri,
      );
    const soyad = `Öztürkoğlu${ek()}`;
    const eposta = `ilk.${ek()}@ornek.test`;
    const musteri = await ac(eposta);
    await siparisVer(birim, "İlkay", soyad, eposta, musteri);
    const silinecek = await ac(`silinecek.${ek()}@ornek.test`);
    await siparisVer(birim, "Ömer", soyad, `x${ek()}@ornek.test`, silinecek);
    await vt
      .update(musteriler)
      .set({ silinme_zamani: new Date() })
      .where(eq(musteriler.kimlik, silinecek));
    const adla = await ucunuCagir(
      panelMusteriAramaUcu,
      soyad.replace("Ö", "O").toUpperCase(),
      sahip,
    );
    expect(adresler(adla.govde)).toEqual([musteriAyrintisiAdresi(musteri)]);
    expect(adla.govde.veri?.satirlar[0]).toMatchObject({
      baslik: `İlkay ${soyad}`,
      alt: `${eposta} · 1 sipariş`,
    });
    const epostayla = await ucunuCagir(panelMusteriAramaUcu, eposta.toUpperCase(), sahip);
    expect(adresler(epostayla.govde)).toEqual([musteriAyrintisiAdresi(musteri)]);
  });

  it("kısa ve uzun metin doğrulama hatasıdır", async () => {
    const sahip = await hesap("magaza-sahibi");
    for (const ara of ["a", " a ", "x".repeat(panelAramaSinirlari.enCok + 1)]) {
      const yanit = await ucunuCagir(panelUrunAramaUcu, ara, sahip);
      expect(yanit.durum).toBe(400);
      expect(yanit.govde.hata?.kod).toBe("dogrulama");
    }
  });
});

describe("izin", () => {
  // Kapının okuduğu veritabanı istemcisindeki sorgular: reddedilen istekte müşteri tablosu hiç okunmaz.
  const sorgulariTopla = () => {
    const metinler: string[] = [];
    const istemci = siteninVeritabani().$client;
    const asil = istemci.query.bind(istemci);
    const casus = vi.spyOn(istemci, "query").mockImplementation(((...arg: unknown[]) => {
      const ilk = arg[0] as string | { text?: string };
      metinler.push(typeof ilk === "string" ? ilk : (ilk.text ?? ""));
      return (asil as (...a: unknown[]) => unknown)(...arg);
    }) as typeof istemci.query);
    return { metinler, birak: () => casus.mockRestore() };
  };

  it("görevli siparişi ve ürünü arar, müşteriyi arayamaz; reddedilende müşteri sorgusu çalışmaz", async () => {
    const gorevli = await hesap("gorevli");
    const sahip = await hesap("magaza-sahibi");
    expect((await ucunuCagir(panelSiparisAramaUcu, "zz", gorevli)).durum).toBe(200);
    expect((await ucunuCagir(panelUrunAramaUcu, "zz", gorevli)).durum).toBe(200);
    // Ölçümün kendisi: izni olan istekte müşteri tablosu okunur.
    const izinli = sorgulariTopla();
    try {
      expect((await ucunuCagir(panelMusteriAramaUcu, "zz", sahip)).durum).toBe(200);
    } finally {
      izinli.birak();
    }
    expect(izinli.metinler.some((metin) => metin.includes('from "musteriler"'))).toBe(true);
    const izinsiz = sorgulariTopla();
    let yanit: Awaited<ReturnType<typeof ucunuCagir>>;
    try {
      yanit = await ucunuCagir(panelMusteriAramaUcu, "zz", gorevli);
    } finally {
      izinsiz.birak();
    }
    expect(yanit.durum).toBe(403);
    expect(yanit.govde.hata?.kod).toBe("yetki");
    expect(izinsiz.metinler.length).toBeGreaterThan(0);
    expect(izinsiz.metinler.some((metin) => metin.includes('"musteriler"'))).toBe(false);
  });

  it.each([
    ["rolsüz yönetici", "rolsuz", 403],
    ["müşteri", "musteri", 401],
    ["girişsiz ziyaretçi", "girissiz", 401],
  ] as const)("%s hiçbir türü arayamaz", async (_ad, kisi, durum) => {
    const oturum = kisi === "girissiz" ? undefined : await hesap(kisi);
    for (const uc of [panelSiparisAramaUcu, panelUrunAramaUcu, panelMusteriAramaUcu]) {
      const yanit = await ucunuCagir(uc, "zz", oturum);
      expect(yanit.durum).toBe(durum);
      expect(yanit.govde.veri).toBeUndefined();
    }
  });
});

describe("iki site", () => {
  it("bir sitenin araması öteki sitenin ürününü bulmaz", async () => {
    const kod = ek();
    await urunSrv.urunEkle(ikinci.vt, kim(), { ad: `Öteki site ${kod}`, vergiSinifi: null });
    const sahip = await hesap("magaza-sahibi");
    expect(
      adresler((await ucunuCagir(panelUrunAramaUcu, `öteki site ${kod}`, sahip)).govde),
    ).toEqual([]);
    // Aynı arama ikinci sitenin kendi panelinde bulur.
    vi.stubEnv("VERITABANI_ADRESI", ikinci.baglantiAdresi);
    await baglantiyiKapat();
    try {
      const ikinciSahip = await hesap("magaza-sahibi", ikinci.vt);
      const bulunan = await ucunuCagir(panelUrunAramaUcu, `öteki site ${kod}`, ikinciSahip);
      expect(bulunan.govde.veri?.satirlar).toHaveLength(1);
    } finally {
      vi.stubEnv("VERITABANI_ADRESI", baglanti);
      await baglantiyiKapat();
    }
  });
});
