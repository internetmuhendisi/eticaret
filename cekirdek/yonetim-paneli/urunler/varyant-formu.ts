// Ürün ekranının seçenekler bölümünün kuralları (kart 0264, karar 0163): ekran ve testleri aynı işlevleri kullanır.
//
// - Formdaki seçenek ve değerin anahtarı kaydedilmişse kimliğidir, yeniyse ekranın verdiği "yeni-..." anahtarıdır.
//   Birleşimin anahtarı değer anahtarlarının sıralı hâlidir ("|" ile): seçeneklerin sırası değişse de aynıdır.
// - Birleşimler bütün değerlerin birleşimidir (servisle aynı); satırlar seçeneklerin ve değerlerin sırasıyla gelir.
// - Kaydedilmemiş bir satır, servisin yeni seçenek kuralıyla (karar 0163) var olan bir birimden dönecekse o birimin
//   alanlarını gösterir: yeni seçeneklerin ilk değerleri çıkarılınca kalan anahtar kayıtlı bir birleşimse (basit
//   üründe boş anahtar, basit birimin alanları) o birleşimin alanları satırın başlangıcıdır.
// - Sunucuya giden girdi seçeneklerin son hâli ve satırların alanlarıdır; değerler her seçenekteki değerin sırasıdır.
//   Kayıtlı ya da dönen satır bütün alanlarını gönderir (boş alan null, boşaltır); yeni satır yalnız dolu alanlarını.
export type VaryantDegeriFormu = { anahtar: string; kimlik?: string; ad: string };
export type VaryantSecenegiFormu = {
  anahtar: string;
  kimlik?: string;
  ad: string;
  degerler: VaryantDegeriFormu[];
};
// Birleşimin ekrandaki alanları: ağırlık sitenin biriminde yazılı metin, görsel galeri öğesinin kimliği.
export type BirlesimFormu = {
  stokKodu: string;
  barkod: string;
  agirlik: string;
  gorsel: string | null;
};
export type VaryantFormu = {
  secenekler: VaryantSecenegiFormu[];
  // Birleşimin anahtarından alanlarına; yalnız kaydedilmiş ya da ekranda değiştirilmiş birleşimler.
  birlesimler: Record<string, BirlesimFormu>;
};

export const bosBirlesim: BirlesimFormu = { stokKodu: "", barkod: "", agirlik: "", gorsel: null };

export const birlesimAnahtari = (anahtarlar: readonly string[]): string =>
  anahtarlar.toSorted().join("|");

export type BirlesimSatiri = {
  anahtar: string;
  // Her seçenekteki değerin sırası (sunucunun girdisi).
  yol: number[];
  degerler: VaryantDegeriFormu[];
  alanlar: BirlesimFormu;
  // Kayıtlı bir birim bu satırın birimidir (kendisi ya da yeni seçenekle dönen).
  kayitli: boolean;
};

// Yeni seçenekler çıkarılınca kalan anahtar: satır var olan birimden dönüyorsa onun anahtarı.
const donenAnahtar = (degerler: readonly VaryantDegeriFormu[], form: VaryantFormu) => {
  const yeniIlkler = new Set(
    form.secenekler
      .filter((secenek) => secenek.kimlik === undefined)
      .flatMap((secenek) =>
        secenek.degerler[0] === undefined ? [] : [secenek.degerler[0].anahtar],
      ),
  );
  const yeniSecenekDegerleri = new Set(
    form.secenekler
      .filter((secenek) => secenek.kimlik === undefined)
      .flatMap((secenek) => secenek.degerler.map((deger) => deger.anahtar)),
  );
  // Yeni seçenekte ilk olmayan değer taşıyan satır dönmez, yeni açılır.
  if (degerler.some((d) => yeniSecenekDegerleri.has(d.anahtar) && !yeniIlkler.has(d.anahtar))) {
    return undefined;
  }
  return birlesimAnahtari(degerler.filter((d) => !yeniIlkler.has(d.anahtar)).map((d) => d.anahtar));
};

// Satırlar sırasıyla. bilinen: sunucunun son verdiği hâl; basit: basit ürünün birim alanları (seçenek eklenince ilk
// birleşime dönecek birim).
export const birlesimSatirlari = (
  form: VaryantFormu,
  bilinen: VaryantFormu,
  basit: BirlesimFormu | undefined,
): BirlesimSatiri[] => {
  if (form.secenekler.length === 0) return [];
  const yollar = form.secenekler.reduce<number[][]>(
    (onceki, secenek) => onceki.flatMap((yol) => secenek.degerler.map((_, j) => [...yol, j])),
    [[]],
  );
  return yollar.map((yol) => {
    const degerler = yol.map((j, i) => form.secenekler[i]?.degerler[j] as VaryantDegeriFormu);
    const anahtar = birlesimAnahtari(degerler.map((d) => d.anahtar));
    const kendi = bilinen.birlesimler[anahtar];
    const donen = kendi === undefined ? donenAnahtar(degerler, form) : undefined;
    const kaynak =
      kendi ??
      (donen === undefined
        ? undefined
        : donen === "" && bilinen.secenekler.length === 0
          ? basit
          : bilinen.birlesimler[donen]);
    return {
      anahtar,
      yol,
      degerler,
      alanlar: form.birlesimler[anahtar] ?? kaynak ?? bosBirlesim,
      kayitli: kaynak !== undefined,
    };
  });
};

// Sunucuya giden girdi (ağırlık metin; sunucu panelVaryantiniCevir ile okur). gorulen: ekranın bildiği kayıtlı seçenek
// ve değerler; sunucuda bunlardan başkası varsa (başka ekrandan eklenmiş) hiçbir şey yazılmaz.
export const varyantGirdisi = (
  satirlar: readonly BirlesimSatiri[],
  form: VaryantFormu,
  bilinen: VaryantFormu,
) => ({
  gorulen: {
    secenekler: bilinen.secenekler.flatMap((s) => (s.kimlik === undefined ? [] : [s.kimlik])),
    degerler: bilinen.secenekler.flatMap((s) =>
      s.degerler.flatMap((d) => (d.kimlik === undefined ? [] : [d.kimlik])),
    ),
  },
  secenekler: form.secenekler.map((secenek) => ({
    ...(secenek.kimlik === undefined ? {} : { kimlik: secenek.kimlik }),
    ad: secenek.ad,
    degerler: secenek.degerler.map((deger) => ({
      ...(deger.kimlik === undefined ? {} : { kimlik: deger.kimlik }),
      ad: deger.ad,
    })),
  })),
  birlesimler: satirlar.map(({ yol, alanlar, kayitli }) => {
    const yazi = (deger: string) => (deger.trim() === "" ? (kayitli ? null : undefined) : deger);
    const birlesim = {
      degerler: yol,
      stokKodu: yazi(alanlar.stokKodu),
      barkod: yazi(alanlar.barkod),
      agirlik: yazi(alanlar.agirlik),
      gorsel: alanlar.gorsel ?? (kayitli ? null : undefined),
    };
    return Object.fromEntries(Object.entries(birlesim).filter(([, deger]) => deger !== undefined));
  }),
});

// Kayıtlı bir seçeneği ya da değeri çıkarmak kaç kayıtlı birleşimi siler: anahtarında o anahtar geçen birleşimler.
export const silinecekBirlesimSayisi = (bilinen: VaryantFormu, anahtar: string): number =>
  Object.keys(bilinen.birlesimler).filter((birlesim) => birlesim.split("|").includes(anahtar))
    .length;

// Çıkan değerin ya da seçeneğin ekranda değiştirilmiş birleşim alanları da çıkar: aynı değer yeniden eklenirse (yeni
// anahtarla) eski yazılanlar dönmez, "değişiklik var" yanlış kalmaz.
export const birlesimleriBudar = (
  birlesimler: Readonly<Record<string, BirlesimFormu>>,
  anahtarlar: readonly string[],
): Record<string, BirlesimFormu> =>
  Object.fromEntries(
    Object.entries(birlesimler).filter(
      ([anahtar]) => !anahtar.split("|").some((parca) => anahtarlar.includes(parca)),
    ),
  );
