// Ürün ekranının sunucuya gönderdiği girdi (kart 0263, bağımsız kontrolün bulguları): yeni üründe boş isteğe bağlı alan
// gönderilmez; değişiklikte yalnız sunucudan gelen hâline göre değişen alan gider (dokunulmayan yayın zamanı, açıklama
// ve ağırlık yeniden yazılmaz), boşaltılan alan null olur; zamanlanmış durumda boş zaman gönderilmez; varyantlı üründe
// birimin alanları gitmez; özelliklerin gönderilme sırası hatanın alanını bulur.
import { describe, expect, it } from "vitest";
import { girdiyiKur } from "../urunler/urun-ekrani";
import type { UrunEkraniVerisi, UrunFormu } from "../urunler/urun-verisi";

const form: UrunFormu = {
  ad: "Kupa",
  adresAdi: "kupa",
  kisaAciklama: "",
  uzunAciklama: "<p>Açıklama</p>",
  kategoriler: [{ kimlik: "k1", ad: "Kupalar" }],
  marka: null,
  etiketler: [],
  vergiSinifi: "",
  kargoGerekmez: false,
  stokKodu: "",
  barkod: "",
  agirlik: "0,35",
  enAzAdet: "1",
  enCokAdet: "",
  durum: "zamanlanmis",
  yayinZamani: "2026-11-01T01:30",
  ozellikler: { o1: "", o2: "12,5", o3: "evet" },
  ilgiliUrunler: [],
  varyant: { secenekler: [], birlesimler: {} },
};
const veri = (ek: Partial<UrunEkraniVerisi> = {}): UrunEkraniVerisi => ({
  kimlik: "u1",
  form,
  tur: "basit",
  vergiSiniflari: [],
  ozellikler: [
    { kimlik: "o1", ad: "Renk", tur: "liste", secenekler: [] },
    { kimlik: "o2", ad: "Hacim", tur: "sayi", secenekler: [] },
    { kimlik: "o3", ad: "Yıkanır", tur: "evet-hayir", secenekler: [] },
  ],
  agirlikBirimi: "kg",
  baslikAlti: [],
  galeriGorselleri: [],
  izinler: { degistir: true, sil: true },
  ...ek,
});

describe("ürün ekranının girdisi", () => {
  it("değişiklikte yalnız değişen alanlar gider; dokunulmayan yayın zamanı, açıklama ve ağırlık gitmez", () => {
    expect(girdiyiKur(form, form, veri()).girdi).toEqual({});
    const { girdi } = girdiyiKur({ ...form, kisaAciklama: "Yeni" }, form, veri());
    expect(girdi).toEqual({ kisaAciklama: "Yeni" });
  });

  it("boşaltılan alan null, boş liste boş liste olur", () => {
    const { girdi } = girdiyiKur(
      { ...form, agirlik: " ", kategoriler: [], uzunAciklama: "" },
      form,
      veri(),
    );
    expect(girdi).toEqual({ agirlik: null, kategoriler: [], uzunAciklama: null });
  });

  it("zamanlanmış durumda boş zaman null gider (sunucu 'gerekli' der), başka durumda zaman null olur", () => {
    expect(girdiyiKur({ ...form, yayinZamani: "" }, form, veri()).girdi).toEqual({
      yayinZamani: null,
    });
    expect(girdiyiKur({ ...form, durum: "yayinda" }, form, veri()).girdi).toEqual({
      durum: "yayinda",
      yayinZamani: null,
    });
  });

  it("yeni üründe boş isteğe bağlı alan gönderilmez, dolu olanlar gider", () => {
    const yeni = veri({ kimlik: undefined } as Partial<UrunEkraniVerisi>);
    delete yeni.kimlik;
    const { girdi, ozellikSirasi } = girdiyiKur(
      { ...form, durum: "taslak", yayinZamani: "" },
      form,
      yeni,
    );
    expect(girdi).toEqual({
      ad: "Kupa",
      uzunAciklama: "<p>Açıklama</p>",
      kategoriler: ["k1"],
      marka: null,
      etiketler: [],
      vergiSinifi: null,
      kargoGerekmez: false,
      enAzAdet: 1,
      durum: "taslak",
      ilgiliUrunler: [],
      ozellikler: [
        { ozellik: "o2", deger: "12,5" },
        { ozellik: "o3", deger: true },
      ],
      agirlik: "0,35",
    });
    // Boş özellik gönderilmez; sıra hatanın yolunu alana eşler (ozellikler.0 → o2).
    expect(ozellikSirasi).toEqual(["o2", "o3"]);
  });

  it("varyantlı üründe birimin alanları gitmez; sayı olmayan adet olduğu gibi gider", () => {
    const yeni = { ...veri({ tur: "varyantli" }) };
    delete yeni.kimlik;
    // Formda seçenek var: birimin alanları birleşimlerdedir (kart 0264).
    const secenekli = {
      ...form,
      varyant: {
        secenekler: [{ anahtar: "b", ad: "Beden", degerler: [{ anahtar: "s", ad: "S" }] }],
        birlesimler: {},
      },
    };
    const { girdi } = girdiyiKur(
      { ...secenekli, stokKodu: "A-1", enAzAdet: "iki" },
      secenekli,
      yeni,
    );
    expect(girdi).not.toHaveProperty("stokKodu");
    expect(girdi).not.toHaveProperty("agirlik");
    expect(girdi["enAzAdet"]).toBe("iki");
  });

  it("son seçeneği kaldırılan ürünün birim alanları gider, seçeneği olan ürününkiler gitmez (kart 0264)", () => {
    const varyantli = veri({ tur: "varyantli" });
    const secenekli = {
      ...form,
      varyant: {
        secenekler: [
          {
            anahtar: "b",
            kimlik: "b",
            ad: "Beden",
            degerler: [{ anahtar: "s", kimlik: "s", ad: "S" }],
          },
        ],
        birlesimler: {},
      },
    };
    expect(
      girdiyiKur({ ...secenekli, stokKodu: "A-1" }, secenekli, varyantli).girdi,
    ).not.toHaveProperty("stokKodu");
    const { girdi, varyant } = girdiyiKur({ ...form, stokKodu: "A-1" }, secenekli, varyantli);
    expect(girdi).toMatchObject({ stokKodu: "A-1" });
    expect(varyant).toMatchObject({ secenekler: [], birlesimler: [] });
  });
});
