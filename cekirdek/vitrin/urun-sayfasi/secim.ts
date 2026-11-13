// Ürün sayfasında renk ve beden seçimi (kart 0138, karar 0108). Saf işlevlerdir: sunucu sayfanın ilk seçimini
// adresten kurar, tarayıcı müşterinin seçimini aynı işlevlerle değiştirir. Birimin satılabilir olup olmadığı
// sunucuda çekirdeğin tek işlevlerinden gelir (stokDurumu ve fiyat); burada yalnız seçime uygulanır.
//
// Kurallar:
// - Seçenekler ürünün seçenek sırasıyla gelir. Bir değerin durumu kendisinden önceki seçeneklerde seçilen
//   değerlerle birlikte bulunur: bu ön ekle ve bu değerle satılabilir bir birleşim varsa "satilabilir", birleşim
//   var ama hiçbiri satılamıyorsa "tukendi", hiç birleşim yoksa "yok". "yok" değer hiç gösterilmez; "tukendi"
//   değer mağaza sahibinin ayarına göre üstü çizili görünür ya da gösterilmez, iki durumda da seçilemez.
// - Bir seçenek değişince sonraki seçeneklerde önce müşterinin o seçenekte elle seçtiği son değere (tercih),
//   o satılamıyorsa seçili değere, o da satılamıyorsa aynı seçenekteki ilk satılabilir değere geçilir; hiçbiri
//   yoksa seçim kalkar. Müşteri satılamayan bir birleşimde kalmaz; seçtiği beden başka renkte yoksa geçici
//   olarak değişir, o bedenin olduğu renge dönünce geri gelir (bağımsız kontrolün bulgusu).
// - Bütün seçeneklerde değer seçiliyse seçili birim o birleşimdir.
// - Seçim adreste "secenek-<seçenek>=<değer>" ile durur (ürün listesinin filtresiyle aynı parametre ve aynı
//   okunur anahtar). Sayfa ilk açılırken adresteki tam ve var olan bir birleşim (tükenmiş olsa da) önce gelir;
//   yoksa adresteki değerlerden öncekilerle birlikte bir birleşimi olanlar (uyumsuz sonraki değer düşer) ve
//   onlara uyan ilk satılabilir birleşim; o da yoksa ayara göre ilk satılabilir birleşim ya da seçimsiz (kalan
//   adres değerleriyle).
// - Stoğa gelince haber ver eklentisi açıkken (kart 0144, kullanıcı kararı) tükenmiş değer seçilebilir: seçilince
//   "Tükendi" ve eklentinin formu görünür, satın alınamaz. Sonraki seçeneklerde müşterinin seçtiği değer, birleşimi
//   varsa tükenmiş olsa da korunur (kart 0167, kullanıcı kararı): beyazı seçip M'ye geçen müşteri "M Beyaz tükendi"
//   görür, sessizce siyaha geçmez. Seçtiği değerin bu seçimle birleşimi yoksa ilk satılabilir, o da yoksa birleşimi
//   olan değere geçilir. Tükenmiş değeri gizleyen sitede değer görünmediği için seçilemez.
// - Sonraki bir seçenekteki değer müşterinin seçtiğinden başkasına geçince bu bir satırla söylenir
//   (degisenSecimler, kart 0167): "Renk: Beyaz bu seçimle tükendi, Siyah seçildi."
import type { SecenekOnSecimi } from "../../kayitlar/urun.ts";
import { listeParametreleri } from "../urun-listesi/adres.ts";

export type SecimDegeri = { kimlik: string; anahtar: string; ad: string };
export type SecimSecenegi = {
  kimlik: string;
  anahtar: string;
  ad: string;
  degerler: SecimDegeri[];
};
// Birleşimin değer kimlikleri seçeneklerin sırasıyladır.
export type SecimBirimi = { kimlik: string; degerler: readonly string[]; satilabilir: boolean };
// Her seçenek için seçili değerin kimliği; seçilmemişse undefined.
export type Secim = readonly (string | undefined)[];
export type DegerDurumu = "satilabilir" | "tukendi" | "yok";

const onEkeUyar = (birim: SecimBirimi, secim: Secim, sinir: number): boolean => {
  for (let j = 0; j < sinir; j++) {
    const secili = secim[j];
    if (secili !== undefined && birim.degerler[j] !== secili) return false;
  }
  return true;
};

export const degerDurumu = (
  birimler: readonly SecimBirimi[],
  secim: Secim,
  sira: number,
  deger: string,
): DegerDurumu => {
  let durum: DegerDurumu = "yok";
  for (const birim of birimler) {
    if (birim.degerler[sira] !== deger || !onEkeUyar(birim, secim, sira)) continue;
    if (birim.satilabilir) return "satilabilir";
    durum = "tukendi";
  }
  return durum;
};

export const seciliBirim = (
  birimler: readonly SecimBirimi[],
  secim: Secim,
  secenekSayisi: number,
): SecimBirimi | undefined => {
  if (secenekSayisi === 0) return birimler.length === 1 ? birimler[0] : undefined;
  for (let i = 0; i < secenekSayisi; i++) if (secim[i] === undefined) return undefined;
  return birimler.find((birim) =>
    Array.from({ length: secenekSayisi }, (_, i) => birim.degerler[i] === secim[i]).every(Boolean),
  );
};

// Müşteri bir değeri seçince yeni seçim. Satılamayan değer seçilemez (tukenmisSecilebilir değilse): seçim değişmez.
// Tercih, müşterinin her seçenekte elle seçtiği son değerdir (verilmezse seçimin kendisi).
export const secimiDegistir = (
  secenekler: readonly SecimSecenegi[],
  birimler: readonly SecimBirimi[],
  secim: Secim,
  sira: number,
  deger: string,
  tercih: Secim = secim,
  tukenmisSecilebilir = false,
): Secim => {
  const durum = degerDurumu(birimler, secim, sira, deger);
  if (durum === "yok" || (durum === "tukendi" && !tukenmisSecilebilir)) return secim;
  const yeni = secenekler.map((_, i) => (i === sira ? deger : secim[i]));
  for (let j = sira + 1; j < secenekler.length; j++) {
    const adaylar = [tercih[j], yeni[j]].filter((aday) => aday !== undefined);
    if (adaylar.length === 0) continue;
    const satilabilir = (aday: string) => degerDurumu(birimler, yeni, j, aday) === "satilabilir";
    const birlesimiVar = (aday: string) => degerDurumu(birimler, yeni, j, aday) !== "yok";
    // Tükenmiş değer seçilebiliyorsa müşterinin seçtiği değer tükenmiş olsa da korunur (kart 0167).
    const korunur = tukenmisSecilebilir ? birlesimiVar : satilabilir;
    const degerler = secenekler[j]?.degerler.map((aday) => aday.kimlik) ?? [];
    yeni[j] =
      adaylar.find(korunur) ??
      degerler.find(satilabilir) ??
      (tukenmisSecilebilir
        ? (adaylar.find(birlesimiVar) ?? degerler.find(birlesimiVar))
        : undefined);
  }
  return yeni;
};

export type DegisenSecim = {
  secenek: string;
  eski: string;
  yeni: string;
  // Müşterinin seçtiği değerin bu seçimle durumu: birleşimi tükenmiş ya da hiç yok.
  neden: "tukendi" | "yok";
};

// Seçim değişince sonraki seçeneklerde müşterinin seçtiği (tercih) değerden başkasına geçilenler (kart 0167).
// Önceki seçimde de başka değerdeyse yeniden söylenmez; seçim kalktıysa (değer yok) söylenecek yeni değer yoktur.
export const degisenSecimler = (
  secenekler: readonly SecimSecenegi[],
  birimler: readonly SecimBirimi[],
  onceki: Secim,
  yeni: Secim,
  tercih: Secim,
  sira: number,
): DegisenSecim[] =>
  secenekler.flatMap((secenek, j) => {
    const istenen = tercih[j];
    const secilen = yeni[j];
    if (j <= sira || istenen === undefined || secilen === undefined) return [];
    if (secilen === istenen || secilen === onceki[j]) return [];
    const ad = (kimlik: string) => secenek.degerler.find((deger) => deger.kimlik === kimlik)?.ad;
    const eski = ad(istenen);
    const yeniAd = ad(secilen);
    if (eski === undefined || yeniAd === undefined) return [];
    const durum = degerDurumu(birimler, yeni, j, istenen);
    return [
      { secenek: secenek.ad, eski, yeni: yeniAd, neden: durum === "yok" ? "yok" : "tukendi" },
    ];
  });

const adrestenDegerler = (
  secenekler: readonly SecimSecenegi[],
  sorgu: Readonly<Record<string, string | readonly string[] | undefined>>,
): Secim =>
  secenekler.map((secenek) => {
    const ham = sorgu[`${listeParametreleri.secenekOneki}${secenek.anahtar}`];
    const anahtar = Array.isArray(ham) ? ham[0] : ham;
    return secenek.degerler.find((deger) => deger.anahtar === anahtar)?.kimlik;
  });

export const ilkSecim = (
  secenekler: readonly SecimSecenegi[],
  birimler: readonly SecimBirimi[],
  sorgu: Readonly<Record<string, string | readonly string[] | undefined>>,
  onSecim: SecenekOnSecimi,
): Secim => {
  if (secenekler.length === 0) return [];
  const adresten = adrestenDegerler(secenekler, sorgu);
  if (seciliBirim(birimler, adresten, secenekler.length) !== undefined) return adresten;
  // Adresteki değerlerden öncekilerle birlikte bir birleşimi olanlar kalır.
  const kalan: (string | undefined)[] = [];
  adresten.forEach((deger, i) => {
    kalan[i] =
      deger !== undefined && degerDurumu(birimler, kalan, i, deger) !== "yok" ? deger : undefined;
  });
  const adresteDeger = kalan.some((deger) => deger !== undefined);
  const birim =
    (adresteDeger
      ? birimler.find((aday) => aday.satilabilir && onEkeUyar(aday, kalan, secenekler.length))
      : undefined) ??
    (onSecim === "ilk-satilabilir" ? birimler.find((aday) => aday.satilabilir) : undefined);
  if (birim !== undefined) return secenekler.map((_, i) => birim.degerler[i]);
  return kalan;
};

// Seçimin adresteki sorgu kısmı ("?secenek-renk=siyah&secenek-beden=m"); seçim yoksa boş. Adresin öteki
// parametreleri (kampanya izi gibi) korunur, yalnız seçenek parametreleri yeniden yazılır (bağımsız kontrolün
// bulgusu).
export const secimdenSorgu = (
  secenekler: readonly SecimSecenegi[],
  secim: Secim,
  mevcut = "",
): string => {
  const parametreler = new URLSearchParams(mevcut);
  for (const ad of [...parametreler.keys()]) {
    if (ad.startsWith(listeParametreleri.secenekOneki)) parametreler.delete(ad);
  }
  secenekler.forEach((secenek, i) => {
    const deger = secenek.degerler.find((aday) => aday.kimlik === secim[i]);
    if (deger !== undefined) {
      parametreler.set(`${listeParametreleri.secenekOneki}${secenek.anahtar}`, deger.anahtar);
    }
  });
  const metin = parametreler.toString();
  return metin === "" ? "" : `?${metin}`;
};

// Aynı listede tekil okunur anahtarlar: addan üretilen anahtar çakışırsa ("Şal" ile "Sal") sonrakine sıra
// numarası eklenir ("sal-2"). Sıra listenin sırasıdır, sayfa her açılışta aynı anahtarı üretir.
export const tekilAnahtarlar = (anahtarlar: readonly string[]): string[] => {
  const kullanilan = new Set<string>();
  return anahtarlar.map((anahtar) => {
    let aday = anahtar;
    for (let n = 2; kullanilan.has(aday); n++) aday = `${anahtar}-${n}`;
    kullanilan.add(aday);
    return aday;
  });
};
