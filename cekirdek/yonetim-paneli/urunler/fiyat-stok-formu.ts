// Ürün ekranının fiyat ve stok bölümlerinin sunucuya giden girdisi (kart 0265): ekran ve testleri aynı işlevi kullanır.
// Sunucu (cekirdek/moduller/urun/panel-fiyat-stok.ts) satırları fiyat ve stok servisine verir.
//
// - Yalnız değişen gider: fiyatı (satış, indirimli) sunucudaki hâlinden farklı olan satır, ortak indirim zamanı
//   değişince indirimli fiyatı olan her satır; stoğu farklı olan satır, gördüğü miktarla (arada değiştiyse çakışma).
// - Basit ürün: "fiyat" yeri; yeni üründe dolu fiyat ve başlangıç stoğu ("stok" yeri, sebep yeni mal). Var olan basit
//   ürünün stoğu pencereyle düzeltilir, burada gitmez.
// - Seçenekli ürün: birleşim tablosunun satırları ("birlesimler.3"), değerlerinin sırasıyla. Basit üründen dönen ilk
//   satır basit birimin sunucudaki fiyatı ve stoğuyla karşılaştırılır (formda değiştirilmiş fiyat dönen satırda da
//   gitsin).
import type { PanelFiyatStok } from "../../moduller/urun/panel-fiyat-stok";
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
  const birimler: Satir[] = [];
  let sebep = form.stokSebebi;

  if (form.varyant.secenekler.length === 0) {
    // Basit ürün (ya da son seçeneği kaldırılan ürün: sunucu yeni basit birimi açar).
    const { satisFiyati, indirimliFiyat } = form.fiyat;
    const fiyatDegisti =
      satisFiyati !== bilinen.fiyat.satisFiyati ||
      indirimliFiyat !== bilinen.fiyat.indirimliFiyat ||
      (zamanDegisti && indirimliFiyat !== "");
    const basitKaldi = veri.tur === "basit" && !yeni;
    if ((fiyatDegisti || (yeni && satisFiyati !== "")) && (satisFiyati !== "" || basitKaldi)) {
      birimler.push({ yer: "fiyat", satisFiyati, indirimliFiyat });
    }
    if (yeni && form.baslangicStogu.trim() !== "" && form.baslangicStogu.trim() !== "0") {
      birimler.push({ yer: "stok", stok: { gorulen: 0, yeni: form.baslangicStogu } });
      sebep = "yeni-mal";
    }
  } else {
    const basittenDonen = bilinen.varyant.secenekler.length === 0;
    const basitStok = String(veri.fiyatStok.birimler[""]?.stok ?? 0);
    for (const [k, satir] of satirlar.entries()) {
      // Karşılaştırılan sunucu hâli: basitten dönen satırda basit birimin fiyatı ve stoğu.
      const kaynak =
        satir.kayitli && basittenDonen
          ? {
              satisFiyati: bilinen.fiyat.satisFiyati,
              indirimliFiyat: bilinen.fiyat.indirimliFiyat,
              stok: basitStok,
            }
          : satir.kaynak;
      const { satisFiyati, indirimliFiyat, stok } = satir.alanlar;
      const fiyatDegisti =
        satisFiyati !== (kaynak?.satisFiyati ?? "") ||
        indirimliFiyat !== (kaynak?.indirimliFiyat ?? "") ||
        (zamanDegisti && indirimliFiyat !== "");
      const eskiStok = kaynak?.stok ?? "0";
      const fiyatGider = fiyatDegisti && (satisFiyati !== "" || (kaynak?.satisFiyati ?? "") !== "");
      const stokGider = stok.trim() !== eskiStok;
      if (!fiyatGider && !stokGider) continue;
      birimler.push({
        yer: `birlesimler.${k}`,
        birlesim: satir.yol,
        ...(fiyatGider ? { satisFiyati, indirimliFiyat } : {}),
        ...(stokGider ? { stok: { gorulen: Number(eskiStok) || 0, yeni: stok } } : {}),
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
