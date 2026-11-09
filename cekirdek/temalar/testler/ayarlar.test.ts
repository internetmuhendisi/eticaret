// Mağaza sahibinin tema ayarları (kart 0105): yalnız temanın açtığı renk ve seçenekler, okunmayan rengin
// reddi ve okunur en yakın tonun önerisi; okunur tonun bulunuşu.
import { describe, expect, it } from "vitest";
import { kontrastOrani, okunurTon } from "../../../bilesenler/tasarim-degerleri/kontrast.ts";
import { ornekRenk } from "../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import { temaAyariSorunlari, temaAyarlariSemasi } from "../ayarlar.ts";
import { okunmayanCiftler } from "../okunurluk.ts";
import { temaTanimiSemasi } from "../sema.ts";
import { denemeTemasi } from "./deneme-temasi.ts";

const tema = temaTanimiSemasi().parse(denemeTemasi());
const sorunlari = (girdi: Parameters<typeof temaAyarlariSemasi.parse>[0]) =>
  temaAyariSorunlari(tema, temaAyarlariSemasi.parse(girdi));

describe("ayarların şeması", () => {
  it("boş ayar: renk yok, koyu tema kapalı", () => {
    expect(temaAyarlariSemasi.parse({})).toEqual({ renkler: {}, koyuTema: false });
  });

  it("renk büyük harfe çevrilir; biçimi bozuk renk, bilinmeyen renk adı ve alan reddedilir", () => {
    expect(
      temaAyarlariSemasi.parse({ renkler: { birincil: ornekRenk.turuncuKucukHarfle } }).renkler,
    ).toEqual({
      birincil: ornekRenk.turuncu,
    });
    for (const bozuk of [
      { renkler: { birincil: ornekRenk.kisaBicim } },
      { renkler: { birincil: "red" } },
      { renkler: { birincil: ornekRenk.kacisli } },
      { renkler: { mor: ornekRenk.turuncu } },
      { yaziTipi: "Inter Variable" },
      { fazla: true },
    ]) {
      expect(temaAyarlariSemasi.safeParse(bozuk).success, JSON.stringify(bozuk)).toBe(false);
    }
  });
});

describe("ayarların temaya göre sorunları", () => {
  it("açtığı renk ve seçeneklerle sorun yok", () => {
    expect(
      sorunlari({
        renkler: { birincil: ornekRenk.turuncu },
        yaziTipi: "yalniz-inter",
        kose: "yumusak",
        dugmeBicimi: "hap",
        koyuTema: true,
      }),
    ).toEqual([]);
  });

  it("temanın açmadığı renk değiştirilemez", () => {
    expect(sorunlari({ renkler: { zemin: ornekRenk.beyaz } })).toEqual([
      { alan: "renkler.zemin", kod: "renk-degistirilemez" },
    ]);
  });

  it("temanın seçeneklerinde olmayan yazı tipi, köşe ve düğme biçimi", () => {
    expect(sorunlari({ yaziTipi: "roboto", kose: "egik", dugmeBicimi: "yildiz" })).toEqual([
      { alan: "yaziTipi", kod: "secenek-tanimsiz" },
      { alan: "kose", kod: "secenek-tanimsiz" },
      { alan: "dugmeBicimi", kod: "secenek-tanimsiz" },
    ]);
  });

  it("okunmayan renk kaydedilmez, okunur en yakın ton önerilir", () => {
    // Ana rengin üstündeki yazı koyudur: koyu lacivert ana renk onunla okunmaz.
    const [sorun, ...diger] = sorunlari({ renkler: { birincil: ornekRenk.koyuLacivert } });
    expect(diger).toEqual([]);
    expect(sorun).toMatchObject({ alan: "renkler.birincil", kod: "kontrast-yetersiz" });
    const oneri = sorun?.oneri ?? "";
    expect(oneri).toMatch(/^#[0-9A-F]{6}$/);
    expect(
      okunmayanCiftler({ ...tema.degerler.renkler.acik, birincil: oneri }, "birincil"),
    ).toEqual([]);
    // Öneri asıl renkten açıktır ve okunur olan tonların en yakınıdır: bir adım koyusu okunmaz.
    expect(kontrastOrani(tema.degerler.renkler.acik["birincil-ustu"], oneri)).toBeLessThan(4.6);
    // Önerinin kendisi kaydedilebilir.
    expect(sorunlari({ renkler: { birincil: oneri } })).toEqual([]);
  });

  it("hiçbir tonu okunur olmayan renkte öneri yoktur", () => {
    // Soluk yazı hem beyaz zeminde hem çok koyu yüzeyde okunmalı: hiçbir açıklık ikisini birden tutmaz.
    const ikiZeminli = structuredClone(tema);
    ikiZeminli.magazaSecenekleri.renkler = ["soluk-yazi"];
    ikiZeminli.degerler.renkler.acik.zemin = ornekRenk.beyaz;
    ikiZeminli.degerler.renkler.acik.yuzey = ornekRenk.cokKoyuGri;
    const [sorun] = temaAyariSorunlari(
      ikiZeminli,
      temaAyarlariSemasi.parse({ renkler: { "soluk-yazi": ornekRenk.ortaGri } }),
    );
    expect(sorun).toEqual({ alan: "renkler.soluk-yazi", kod: "kontrast-yetersiz" });
  });
});

describe("okunur ton", () => {
  it("geçen renk kendisi, büyük harfle", () => {
    expect(okunurTon(ornekRenk.turuncuKucukHarfle, () => true)).toBe(ornekRenk.turuncu);
  });

  it("aynı tonda, açıklığı en az değişen geçen renk", () => {
    const beyazdaOkunur = (aday: string) => kontrastOrani(aday, ornekRenk.beyaz) >= 4.5;
    const ton = okunurTon(ornekRenk.turuncu, beyazdaOkunur);
    expect(ton).toBeDefined();
    expect(beyazdaOkunur(ton ?? "")).toBe(true);
    expect(kontrastOrani(ton ?? "", ornekRenk.beyaz)).toBeLessThan(4.6);
  });

  it("hiç geçen yoksa undefined, bozuk renkte hata", () => {
    expect(okunurTon(ornekRenk.turuncu, () => false)).toBeUndefined();
    expect(() => okunurTon("FFB020", () => true)).toThrow();
  });
});
