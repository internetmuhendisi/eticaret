// Tema ayarları ekranının formu (kart 0260, karar 0168): sunucunun verdiği hâlden formun başlangıcı ve formdan tema
// ucunun girdisi. Tarayıcıda da sunucuda da çalışır; tema tanımını taşımaz, sunucunun hazırladığı veriyi okur.
//
// Seçimde boş değer ("") temanın kendi değeridir. Mağaza sahibi bir seçeneği hiç seçmemişse ve temanın kendi değeri
// seçeneklerden biriyle aynıysa o seçenek seçili görünür; dokunulmadan kaydedilirse ayar yine yazılmaz (vitrin aynı
// kalır, gereksiz sürüm yazılmaz). Temanın kendi rengine dönen renk de yazılmaz.
import type {
  DugmeBicimiSecenegi,
  KoseSecenegi,
  MagazaRengi,
  UrunFiltresiGorunumu,
} from "../../kayitlar/tema";
import type { EkranLogosu } from "../../moduller/magaza-ayarlari/logo";

// Bir seçenek grubunun hâli: seçenekler, mağaza sahibinin kayıtlı seçimi ve temanın kendi değerine eşit seçenek.
export type SecimGrubu<Kod extends string, Ek> = {
  secenekler: ({ kod: Kod } & Ek)[];
  // Mağaza sahibinin kayıtlı seçimi; yoksa temanın kendi değeri geçerlidir.
  kayitli?: Kod;
  // Temanın kendi değerine eşit seçenek; yoksa ekranda "Temanın kendi" seçeneği görünür (temaninKendi ile).
  eslesen?: Kod;
  temaninKendi: Ek;
};

export type YaziTipiOrnegi = { baslik: string; govde: string };

export type TemaAyarlariVerisi = {
  // Logo bölümünün verisi (kart 0094): logo, en büyük dosya ve türlerin adları sitenin biçimiyle.
  logo: EkranLogosu;
  enCokDosyaBoyutu: string;
  dosyaTurleri: string;
  tema: { kod: string; ad: string; demo?: string };
  // Geçerli sürümün sırası ("Önceki hâline dön" bunu gönderir) ve yayın anı (sitenin biçimiyle).
  sira: number;
  sonYayin: string;
  // "Mağaza sahibi temayı değiştirebilir" (altyapı sahibinin ayarı).
  degistirilebilir: boolean;
  // Kayıtlı tema bu sitede artık kullanılamıyor: vitrin başlangıç temasıyla çizilir, ayarlar kaydedilemez; önce Tema
  // sayfasından bir tema seçilir.
  temaKullanilamaz: boolean;
  // Temanın açtığı renkler: kayıtlı renk ya da temanın kendi rengi (açık tema).
  renkler: { ad: MagazaRengi; temaninRengi: string; kayitli?: string }[];
  yaziTipleri: SecimGrubu<string, YaziTipiOrnegi>;
  koseler: SecimGrubu<KoseSecenegi, { kucuk: string; orta: string }>;
  dugmeBicimleri: SecimGrubu<DugmeBicimiSecenegi, { deger: string }>;
  koyuTema: boolean;
  urunFiltresi: { kayitli?: UrunFiltresiGorunumu; temaninki: UrunFiltresiGorunumu };
};

export type TemaAyarlariFormu = {
  renkler: Partial<Record<MagazaRengi, string>>;
  yaziTipi: string;
  kose: string;
  dugmeBicimi: string;
  koyuTema: boolean;
  urunFiltresi: UrunFiltresiGorunumu;
};

const secim = <Kod extends string>(grup: SecimGrubu<Kod, unknown>): string =>
  grup.kayitli ?? grup.eslesen ?? "";

export const temaAyarlariFormu = (veri: TemaAyarlariVerisi): TemaAyarlariFormu => ({
  renkler: Object.fromEntries(
    veri.renkler.map(({ ad, temaninRengi, kayitli }) => [ad, kayitli ?? temaninRengi]),
  ),
  yaziTipi: secim(veri.yaziTipleri),
  kose: secim(veri.koseler),
  dugmeBicimi: secim(veri.dugmeBicimleri),
  koyuTema: veri.koyuTema,
  urunFiltresi: veri.urunFiltresi.kayitli ?? veri.urunFiltresi.temaninki,
});

// Seçim yazılacak mı: boş değer temanın kendisidir; hiç seçilmemiş grupta temanın değerine eşit seçenek de yazılmaz.
const yazilacak = <Kod extends string>(
  grup: { kayitli?: Kod | undefined; eslesen?: Kod | undefined },
  deger: string,
): string | undefined => {
  if (deger === "") return undefined;
  if (grup.kayitli === undefined && deger === grup.eslesen) return undefined;
  return deger;
};

// Tema ucunun girdisi (POST /kapi/yonetici/tema): tema aynıdır, düzenin yolu gerekmez. Ekranın gördüğü sürüm gider:
// arada başka bir yayın ya da geri dönüş yazıldıysa sunucu hiçbir şey yazmaz (çakışma), eski ayarlar yenisini ezmez.
export const temaAyarlariGirdisi = (form: TemaAyarlariFormu, veri: TemaAyarlariVerisi) => {
  const renkler: Partial<Record<MagazaRengi, string>> = {};
  for (const { ad, temaninRengi } of veri.renkler) {
    const deger = (form.renkler[ad] ?? "").trim();
    if (deger.toUpperCase() !== temaninRengi.toUpperCase()) renkler[ad] = deger;
  }
  const yaziTipi = yazilacak(veri.yaziTipleri, form.yaziTipi);
  const kose = yazilacak(veri.koseler, form.kose);
  const dugmeBicimi = yazilacak(veri.dugmeBicimleri, form.dugmeBicimi);
  const urunFiltresi = yazilacak(
    { kayitli: veri.urunFiltresi.kayitli, eslesen: veri.urunFiltresi.temaninki },
    form.urunFiltresi,
  );
  return {
    tema: veri.tema.kod,
    son: veri.sira,
    ayarlar: {
      renkler,
      ...(yaziTipi === undefined ? {} : { yaziTipi }),
      ...(kose === undefined ? {} : { kose }),
      ...(dugmeBicimi === undefined ? {} : { dugmeBicimi }),
      koyuTema: form.koyuTema,
      ...(urunFiltresi === undefined ? {} : { urunFiltresi }),
    },
  };
};

// Yazı tipi listesinin ekranda görünen adı: listedeki ilk yazı tipinin adı ("Jost Variable, Inter…" → "Jost").
export const yaziTipiAdi = (liste: string): string =>
  (liste.split(",")[0] ?? liste).trim().replace(/ Variable$/, "");
