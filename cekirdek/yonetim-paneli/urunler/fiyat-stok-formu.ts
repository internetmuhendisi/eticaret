// Ürün ekranının fiyat ve stok bölümlerinin sunucuya giden girdisi (kart 0265): ekran ve testleri aynı işlevi kullanır.
// Sunucu (cekirdek/moduller/urun/panel-fiyat-stok.ts) satırları fiyat ve stok servisine verir.
//
// - Yalnız değişen gider: fiyatı (satış, indirimli) sunucudaki hâlinden farklı olan satır, ortak indirim zamanı
//   değişince indirimli fiyatı olan her satır; stoğu farklı olan satır, gördüğü miktarla (arada değiştiyse çakışma).
// - Kayıtlı birimin satırı birimin kimliğini taşır: sunucu satırı değer sırasıyla bulur, kimlik tutmazsa çakışma.
// - Basit ürün: "fiyat" yeri; yeni üründe dolu fiyat ve başlangıç stoğu ("stok" yeri, sebep yeni mal). Var olan basit
//   ürünün stoğu pencereyle düzeltilir, burada gitmez.
// - Seçenekli ürün: birleşim tablosunun satırları ("birlesimler.3"), değerlerinin sırasıyla. Basit üründen dönen ilk
//   satır basit birimin sunucudaki fiyatı ve stoğuyla karşılaştırılır (formda değiştirilmiş fiyat dönen satırda da
//   gitsin).
import type { PanelFiyatStok } from "../../moduller/urun/panel-fiyat-stok";
import { ucYonluBirlestir } from "../sunucu-formu";
import type { UrunEkraniVerisi, UrunFormu } from "./urun-verisi";
import type { BirlesimSatiri } from "./varyant-formu";

type Satir = PanelFiyatStok["birimler"][number];

export const fiyatStokGirdisi = (
  form: UrunFormu,
  bilinen: UrunFormu,
  veri: UrunEkraniVerisi,
  satirlar: readonly BirlesimSatiri[],
): PanelFiyatStok | undefined => {
  const yeni = veri.kimlik === undefined;
  const zamanDegisti =
    form.fiyat.indirimBaslangici !== bilinen.fiyat.indirimBaslangici ||
    form.fiyat.indirimBitisi !== bilinen.fiyat.indirimBitisi;
  const zaman = {
    indirimBaslangici: form.fiyat.indirimBaslangici === "" ? null : form.fiyat.indirimBaslangici,
    indirimBitisi: form.fiyat.indirimBitisi === "" ? null : form.fiyat.indirimBitisi,
  };
  const birimKimligi = (anahtar: string | undefined) =>
    anahtar === undefined ? undefined : veri.fiyatStok.birimler[anahtar]?.kimlik;
  // Fiyat satırı: satış ya da indirimli fiyat değiştiyse ya da ortak zaman değişip satır indirimliyse gider. Yalnız
  // indirimli fiyatı yazılan satır da gider: sunucu satış fiyatının gerektiğini söyler (sessizce atılmaz). Ortak zaman
  // yalnız zaman değişince ya da indirim yeni girilince yazılır; yoksa birimin kendi zamanı kalır.
  const fiyatAlanlari = (
    alanlar: { satisFiyati: string; indirimliFiyat: string },
    kaynak: { satisFiyati: string; indirimliFiyat: string } | undefined,
  ): Pick<Satir, "satisFiyati" | "indirimliFiyat" | "ortakZaman"> => {
    const eskiSatis = kaynak?.satisFiyati ?? "";
    const eskiIndirimli = kaynak?.indirimliFiyat ?? "";
    const { satisFiyati, indirimliFiyat } = alanlar;
    const degisti =
      satisFiyati !== eskiSatis ||
      indirimliFiyat !== eskiIndirimli ||
      (zamanDegisti && indirimliFiyat !== "");
    const gider = degisti && (satisFiyati !== "" || indirimliFiyat !== "" || eskiSatis !== "");
    if (!gider) return {};
    const ortakZaman = indirimliFiyat !== "" && (zamanDegisti || eskiIndirimli === "");
    return { satisFiyati, indirimliFiyat, ...(ortakZaman ? { ortakZaman } : {}) };
  };
  const birimler: Satir[] = [];
  // Yeni ürünün ilk stokları "Yeni mal geldi" sebebiyle yazılır (sebep seçimi gösterilmez).
  const sebep = yeni ? "yeni-mal" : form.stokSebebi;

  if (form.varyant.secenekler.length === 0) {
    // Basit ürün (ya da son seçeneği kaldırılan ürün: sunucu yeni basit birimi açar, kimliği bilinmez).
    const basitKaldi = veri.tur === "basit" && !yeni;
    const fiyat = fiyatAlanlari(form.fiyat, basitKaldi || yeni ? bilinen.fiyat : undefined);
    if (fiyat.satisFiyati !== undefined) {
      const birim = basitKaldi ? birimKimligi("") : undefined;
      birimler.push({ yer: "fiyat", ...(birim === undefined ? {} : { birim }), ...fiyat });
    }
    if (yeni && form.baslangicStogu.trim() !== "" && form.baslangicStogu.trim() !== "0") {
      birimler.push({ yer: "stok", stok: { gorulen: 0, yeni: form.baslangicStogu } });
    }
  } else {
    const basittenDonen = bilinen.varyant.secenekler.length === 0;
    const basitStok = String(veri.fiyatStok.birimler[""]?.stok ?? 0);
    for (const [k, satir] of satirlar.entries()) {
      // Karşılaştırılan sunucu hâli: basitten dönen satırda basit birimin fiyatı ve stoğu.
      const donenBasit = satir.kayitli && basittenDonen;
      const kaynak = donenBasit
        ? {
            satisFiyati: bilinen.fiyat.satisFiyati,
            indirimliFiyat: bilinen.fiyat.indirimliFiyat,
            stok: basitStok,
          }
        : satir.kaynak;
      const fiyat = fiyatAlanlari(satir.alanlar, kaynak);
      const eskiStok = kaynak?.stok ?? "0";
      const stokGider = satir.alanlar.stok.trim() !== eskiStok;
      if (fiyat.satisFiyati === undefined && !stokGider) continue;
      const birim = satir.kayitli
        ? birimKimligi(donenBasit ? "" : satir.kaynakAnahtari)
        : undefined;
      birimler.push({
        yer: `birlesimler.${k}`,
        birlesim: satir.yol,
        ...(birim === undefined ? {} : { birim }),
        ...fiyat,
        ...(stokGider
          ? { stok: { gorulen: Number(eskiStok) || 0, yeni: satir.alanlar.stok } }
          : {}),
      });
    }
  }
  if (birimler.length === 0) return undefined;
  const fiyatVar = birimler.some((b) => b.satisFiyati !== undefined);
  const stokVar = birimler.some((b) => b.stok !== undefined);
  return {
    ...(fiyatVar ? zaman : {}),
    ...(stokVar ? { sebep, ...(form.stokNotu.trim() === "" ? {} : { not: form.stokNotu }) } : {}),
    birimler,
  };
};

// Kaydedilmemiş değişiklik varken sayfa yenilenince (başka işlem, düşen kayıt, çakışma) ürünün formu sunucunun yeni
// verisiyle birleşir (bağımsız kontrolün bulgusu): kullanıcının dokunmadığı alan yeni değeri alır, yoksa eski değeri
// "değişti" sayılıp sunucuya giderdi (siparişle düşen stok sessizce geri yazılıyordu). Birleşimin stoğu sunucuda
// değiştiyse kullanıcı dokunmuş olsa da güncel miktar görünür: yazdığı sayı eski miktara göreydi, yeniden girer
// (çakışmanın metni "güncel miktara bakıp yeniden kaydedin" der).
export const urunFormunuUzlastir = (
  form: UrunFormu,
  eski: UrunFormu,
  yeni: UrunFormu,
): UrunFormu => {
  const birlesik = ucYonluBirlestir(form, eski, yeni);
  const birlesimler = { ...birlesik.varyant.birlesimler };
  for (const [anahtar, alanlar] of Object.entries(birlesimler)) {
    const sunucuda = yeni.varyant.birlesimler[anahtar];
    const onceki = eski.varyant.birlesimler[anahtar];
    if (sunucuda !== undefined && onceki !== undefined && sunucuda.stok !== onceki.stok) {
      birlesimler[anahtar] = { ...alanlar, stok: sunucuda.stok };
    }
  }
  return { ...birlesik, varyant: { ...birlesik.varyant, birlesimler } };
};
