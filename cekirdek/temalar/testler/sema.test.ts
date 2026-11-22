// Tema tanımının şeması (kart 0105): bozuk tema açılmaz. Eksik değer, tanımsız seçenek, kütüphanede olmayan
// ya da o alana konamayan bölüm, eksik ya da tanımsız görünüm, sitede olmayan yazı tipi ve okunmayan renk
// her biri kendi koduyla reddedilir. Hazır temaların hepsi şemadan geçer.
import { describe, expect, it } from "vitest";
import { ornekRenk } from "../../../bilesenler/tasarim-degerleri/testler/ornek-renkler.ts";
import { temaAyariSorunlari, temaAyarlariSemasi } from "../ayarlar.ts";
import { okunmayanCiftler } from "../okunurluk.ts";
import { cekirdekKutuphanesi, temaTanimiSemasi } from "../sema.ts";
import { hazirTemaKodlari, hazirTemalar, hazirTemayiOku } from "../temalar.ts";
import { denemeKutuphanesi, denemeTemasi, kutuphaneliDenemeTemasi } from "./deneme-temasi.ts";

const sema = temaTanimiSemasi(denemeKutuphanesi);

// Şemanın döndürdüğü sorunlar: [yer, kod ya da ileti].
const sorunlar = (tema: unknown) => {
  const sonuc = sema.safeParse(tema);
  if (sonuc.success) return [];
  return sonuc.error.issues.map((sorun) => [sorun.path.join("."), sorun.message]);
};
const kodlari = (tema: unknown) => {
  const sonuc = sema.safeParse(tema);
  return sonuc.success ? [] : sonuc.error.issues.map((sorun) => sorun.code);
};

describe("geçerli tema", () => {
  it("deneme teması bölüm ve görünümleriyle geçer", () => {
    expect(sorunlar(kutuphaneliDenemeTemasi())).toEqual([]);
  });

  it("gizli alanı verilmeyen bölüm görünür başlar", () => {
    const tema = sema.parse(kutuphaneliDenemeTemasi());
    expect(tema.baslangicDuzeni["ana-sayfa"].map((bolum) => bolum.gizli)).toEqual([false, true]);
  });

  it("üç hazır tema kayıtlı, ilki Canlı Çarşı (karar 0075, kart 0114)", () => {
    expect(hazirTemaKodlari()).toEqual(["canli-carsi", "yumusak-mevsim", "keskin-cizgi"]);
  });

  it("her hazır temanın her yazı ve işaret çifti açık ve koyu temada okunur (kart 0114)", () => {
    for (const kod of hazirTemaKodlari()) {
      const sonuc = hazirTemayiOku(kod);
      if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
      for (const mod of ["acik", "koyu"] as const) {
        const { degerler } = sonuc.tema.tanim;
        expect(
          okunmayanCiftler({ renkler: degerler.renkler[mod], baglar: degerler.renkBaglari, mod }),
          `${kod} ${mod}`,
        ).toEqual([]);
      }
    }
  });

  it("her hazır temanın mağaza sahibine açtığı her seçenek kaydedilebilir (kart 0114)", () => {
    for (const kod of hazirTemaKodlari()) {
      const sonuc = hazirTemayiOku(kod);
      if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
      const { yaziTipleri, koseler, dugmeBicimleri } = sonuc.tema.tanim.magazaSecenekleri;
      expect(Object.keys(yaziTipleri)).toEqual(["inter-jost", "manrope", "inter-archivo"]);
      for (const yaziTipi of Object.keys(yaziTipleri)) {
        for (const kose of Object.keys(koseler)) {
          for (const dugmeBicimi of Object.keys(dugmeBicimleri)) {
            const ayarlar = temaAyarlariSemasi.parse({ yaziTipi, kose, dugmeBicimi });
            expect(temaAyariSorunlari(sonuc.tema.tanim, ayarlar)).toEqual([]);
          }
        }
      }
    }
  });

  it("her hazır tema çekirdeğin kütüphanesiyle geçer", () => {
    expect(hazirTemaKodlari().length).toBeGreaterThan(0);
    for (const kod of hazirTemaKodlari()) {
      const sonuc = hazirTemayiOku(kod);
      expect(sonuc.gecerli ? [] : sonuc.hatalar).toEqual([]);
    }
  });
});

describe("bozuk tema açılmaz", () => {
  it("eksik değer", () => {
    const tema = kutuphaneliDenemeTemasi();
    delete (tema.degerler.renkler.koyu as Partial<typeof tema.degerler.renkler.koyu>).yazi;
    expect(sorunlar(tema)).toContainEqual(["degerler.renkler.koyu.yazi", expect.any(String)]);
    const golgesiz = kutuphaneliDenemeTemasi();
    delete (golgesiz.degerler as Partial<typeof golgesiz.degerler>).golgeler;
    expect(sorunlar(golgesiz)).toContainEqual(["degerler.golgeler", expect.any(String)]);
  });

  it("eksik bölüm alanı ve eksik seçenek grubu", () => {
    const tema = kutuphaneliDenemeTemasi();
    delete (tema.baslangicDuzeni as Partial<typeof tema.baslangicDuzeni>)["alt-kisim"];
    expect(sorunlar(tema)).toContainEqual(["baslangicDuzeni.alt-kisim", expect.any(String)]);
    const secenegi = kutuphaneliDenemeTemasi();
    delete (secenegi.magazaSecenekleri as Partial<typeof secenegi.magazaSecenekleri>).koseler;
    expect(sorunlar(secenegi)).toContainEqual(["magazaSecenekleri.koseler", expect.any(String)]);
  });

  it("bilinmeyen alan", () => {
    expect(kodlari({ ...kutuphaneliDenemeTemasi(), fazla: true })).toContain("unrecognized_keys");
    const tema = kutuphaneliDenemeTemasi();
    expect(
      kodlari({ ...tema, magazaSecenekleri: { ...tema.magazaSecenekleri, golge: {} } }),
    ).toContain("unrecognized_keys");
  });

  it("tanımsız seçenek: olmayan renk adı, bozuk seçenek kodu, ölçü olmayan köşe", () => {
    const renk = kutuphaneliDenemeTemasi();
    (renk.magazaSecenekleri.renkler as string[]).push("mor");
    expect(sorunlar(renk)).toContainEqual(["magazaSecenekleri.renkler.2", expect.any(String)]);
    const kod = kutuphaneliDenemeTemasi();
    kod.magazaSecenekleri.dugmeBicimleri = { "Büyük Hap": "9999px" };
    expect(sorunlar(kod).map(([yer]) => yer)).toContain(
      "magazaSecenekleri.dugmeBicimleri.Büyük Hap",
    );
    const olcu = kutuphaneliDenemeTemasi();
    olcu.magazaSecenekleri.koseler = { kirik: { kucuk: "0;}body{", orta: "0" } };
    expect(sorunlar(olcu).map(([yer]) => yer)).toContain("magazaSecenekleri.koseler.kirik.kucuk");
  });

  it("okunurluğu hiçbir çiftte ölçülmeyen renk mağaza sahibine açılmaz", () => {
    const tema = kutuphaneliDenemeTemasi();
    // Başarının doygun tonu yalnız işarettir, hiçbir yazı ya da işaret çiftinde yoktur.
    tema.magazaSecenekleri.renkler = ["birincil", "basari"];
    expect(sorunlar(tema)).toEqual([
      ["magazaSecenekleri.renkler.1", "renk-olculmuyor"],
      ["magazaSecenekleri.renkler.1", "renk-acilamaz"],
    ]);
  });

  // Panelin tema ayarları ekranı açılan rengi ve seçeneği kayıttaki adıyla gösterir (kart 0260).
  it("panelde adı olmayan renk ve köşe ya da düğme seçeneği açılmaz", () => {
    const renk = kutuphaneliDenemeTemasi();
    renk.magazaSecenekleri.renkler = ["birincil", "zemin"];
    expect(sorunlar(renk)).toContainEqual(["magazaSecenekleri.renkler.1", "renk-acilamaz"]);
    const kose = kutuphaneliDenemeTemasi();
    kose.magazaSecenekleri.koseler = { egri: { kucuk: "2px", orta: "4px" } };
    expect(sorunlar(kose)).toEqual([["magazaSecenekleri.koseler.egri", "secenek-adsiz"]]);
    const dugme = kutuphaneliDenemeTemasi();
    dugme.magazaSecenekleri.dugmeBicimleri = { kare: "0" };
    expect(sorunlar(dugme)).toEqual([["magazaSecenekleri.dugmeBicimleri.kare", "secenek-adsiz"]]);
  });

  it("aynı renk iki kez açılmaz", () => {
    const tema = kutuphaneliDenemeTemasi();
    tema.magazaSecenekleri.renkler = ["birincil", "birincil"];
    expect(sorunlar(tema)).toContainEqual(["magazaSecenekleri.renkler", "ayni-renk-iki-kez"]);
  });

  it("kütüphanede olmayan bölüm ve o alana konamayan bölüm", () => {
    const tema = kutuphaneliDenemeTemasi();
    tema.baslangicDuzeni["ana-sayfa"].push({ tur: "olmayan-bolum" });
    tema.baslangicDuzeni["ust-kisim"].push({
      tur: "deneme-bolumu",
      degerler: { baslik: "Yanlış yer" },
    });
    expect(sorunlar(tema)).toEqual([
      ["baslangicDuzeni.ust-kisim.1.tur", "bolum-alani-uygun-degil"],
      ["baslangicDuzeni.ana-sayfa.2.tur", "bolum-tanimsiz"],
    ]);
  });

  it("başlangıç düzeninde tanımsız bölüm görünümü, tarife uymayan değer ve kayda başvuran alan (kart 0106)", () => {
    const tema = kutuphaneliDenemeTemasi();
    tema.baslangicDuzeni["ana-sayfa"] = [
      { tur: "deneme-bolumu", gorunum: "capraz", degerler: { baslik: "Seçkiler" } },
      { tur: "deneme-bolumu", degerler: {} },
      { tur: "deneme-bolumu", degerler: { baslik: "Seçkiler", fazla: 1 } },
      {
        tur: "deneme-bolumu",
        degerler: { baslik: "Seçkiler", kategori: "8d8f4bb1-7d6c-4f3a-9a52-0c5f3d1e2b7a" },
      },
      // Tema bir sitenin kaydını bilemez: sitenin düzenindeki gibi adres adıyla da başvuramaz (kart 0114).
      { tur: "deneme-bolumu", degerler: { baslik: "Seçkiler", marka: "giyim" } },
      {
        tur: "deneme-bolumu",
        degerler: { baslik: "Seçkiler", urunler: { tur: "kategori", kategori: "giyim", adet: 4 } },
      },
    ];
    const bulunan = sorunlar(tema);
    expect(bulunan).toContainEqual(["baslangicDuzeni.ana-sayfa.0.gorunum", "gorunum-tanimsiz"]);
    expect(bulunan.map(([yer]) => yer)).toContain("baslangicDuzeni.ana-sayfa.1.degerler.baslik");
    expect(bulunan.map(([yer]) => yer)).toContain("baslangicDuzeni.ana-sayfa.2.degerler");
    expect(bulunan).toContainEqual([
      "baslangicDuzeni.ana-sayfa.3.degerler.kategori",
      "baslangicta-kayit-secilemez",
    ]);
    expect(bulunan).toContainEqual([
      "baslangicDuzeni.ana-sayfa.4.degerler.marka",
      "baslangicta-kayit-secilemez",
    ]);
    expect(bulunan.map(([yer]) => yer)).toContain(
      "baslangicDuzeni.ana-sayfa.5.degerler.urunler.tur",
    );
  });

  it("eksik görünüm, kayıtta olmayan parça ve parçanın görünümlerinde olmayan görünüm", () => {
    const eksik = kutuphaneliDenemeTemasi();
    eksik.gorunumler = {};
    expect(sorunlar(eksik)).toEqual([["gorunumler.deneme-kart", "gorunum-eksik"]]);
    const tanimsiz = kutuphaneliDenemeTemasi();
    tanimsiz.gorunumler = { "deneme-kart": "capraz", "olmayan-parca": "dikey" };
    expect(sorunlar(tanimsiz)).toEqual([
      ["gorunumler.deneme-kart", "gorunum-tanimsiz"],
      ["gorunumler.olmayan-parca", "parca-tanimsiz"],
    ]);
  });

  it("sitede barındırılmayan yazı tipi, değerlerde ve seçeneklerde", () => {
    const tema = kutuphaneliDenemeTemasi();
    tema.degerler.yaziTipleri.govde = "Comic Sans MS, sans-serif";
    tema.magazaSecenekleri.yaziTipleri = {
      ...tema.magazaSecenekleri.yaziTipleri,
      roboto: { govde: "Roboto, sans-serif", baslik: "Inter Variable, sans-serif" },
    };
    expect(sorunlar(tema)).toEqual([
      ["degerler.yaziTipleri.govde", "yazi-tipi-yuklu-degil"],
      ["magazaSecenekleri.yaziTipleri.roboto.govde", "yazi-tipi-yuklu-degil"],
    ]);
  });

  it("açık ya da koyu temada okunmayan renk", () => {
    const tema = kutuphaneliDenemeTemasi();
    tema.degerler.renkler.koyu["soluk-yazi"] = ornekRenk.koyuKenar;
    tema.degerler.renkler.acik.odak = ornekRenk.cokAcikGri;
    const bulunan = sorunlar(tema);
    expect(bulunan).toContainEqual(["degerler.renkler.koyu.soluk-yazi", "kontrast-yetersiz"]);
    expect(bulunan).toContainEqual(["degerler.renkler.acik.odak", "kontrast-yetersiz"]);
  });

  // Kart 0124: bağlı renk çözülerek ölçülür; sorun bağın yeriyle döner.
  it("bağlı rengi okunmayan tema açılmaz", () => {
    const tema = kutuphaneliDenemeTemasi();
    tema.degerler.renkBaglari.rozet = ornekRenk.beyaz;
    tema.degerler.renkBaglari["rozet-ustu"] = { acik: "zemin", koyu: "yazi" };
    const bulunan = sorunlar(tema);
    expect(bulunan).toContainEqual(["degerler.renkBaglari.rozet-ustu", "kontrast-yetersiz"]);
    expect(bulunan.filter(([yer]) => String(yer).startsWith("degerler.renkler"))).toEqual([]);
  });

  it("çekirdeğin kütüphanesiyle kütüphaneli deneme teması geçmez", () => {
    const sonuc = temaTanimiSemasi(cekirdekKutuphanesi).safeParse(kutuphaneliDenemeTemasi());
    expect(sonuc.success).toBe(false);
  });

  it("kayıtta olmayan hazır tema okunmaz, bozuk hazır tema hatasını verir", () => {
    expect(hazirTemayiOku("olmayan").gecerli).toBe(false);
    const bozuk = denemeTemasi();
    bozuk.degerler.renkler.acik.yazi = ornekRenk.beyaz;
    const sonuc = hazirTemayiOku("bozuk", { bozuk: { ad: "tema.ad.canliCarsi", tanim: bozuk } });
    expect(sonuc.gecerli ? [] : sonuc.hatalar.join("\n")).toContain(
      "cekirdek/temalar/hazir (bozuk): degerler.renkler.acik.yazi: kontrast-yetersiz",
    );
    expect(Object.keys(hazirTemalar)).toEqual(hazirTemaKodlari());
  });
});
