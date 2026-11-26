// Siparişin müşteriye gösterilen hâli (kart 0238, karar 0145, 0150): Siparişlerim, sipariş ayrıntısı ve üye olmayanın
// sipariş takibi bunu kullanır; iki yol aynı görünüşü çizer. Tutarlar, kalemler ve vergi dökümü siparişin saklanan
// değerleridir, yeniden hesaplanmaz.
//
// Müşteriye girmeyenler: iç notlar, yazanlar (yönetici e-postası, sistem adı), iadenin nedeni ve açıklaması
// (yöneticinin seçimi), başarısız iade (para dönmedi; mağaza yeniden dener), havale bildiriminin ayrıntısı, ödeme
// kuruluşunun kimlikleri, erişim ve oturum kimliği.
//
// Siparişlerim yalnız hesabın kimliğiyle verilmiş siparişleri gösterir: üye olmadan verilmiş sipariş, aynı e-postayla
// hesap açılsa da görünmez (kullanıcı kararı, karar 0150; kayıtta e-posta doğrulanmadığı için). Ayrıntı başka
// müşterinin numarasıyla bulunamadıdır.
//
// Takip: numara ve siparişteki e-posta (harf büyüklüğü ayrımsız) eşleşirse 30 dakikalık anahtar verilir; eşleşmezse
// sipariş yokmuş gibi bulunamadıdır (siparişin var olduğu belli olmaz). Takipte teslimatın adı, soyadı ve telefonu
// kısaltılır, sokak adresi, posta kodu, fatura bilgisi (fatura adresi ve vergi bilgisi), e-posta ve mağazanın notları
// görünmez; il ve ilçe görünür (karar 0145, 0150). Mağazanın kestiği faturanın numarası, tarihi ve PDF'i iki yolda da
// görünür (kart 0268, karar 0157): numara ve e-postayı bilen müşteridir. Müşteri takibi kapatabilir (takipKapat).
//
// İade talebi ve müşterinin iptali (kart 0239, karar 0151): müşteriye kendi talepleri (nedeni, açıklaması, mağazanın
// ret açıklaması) gider; yöneticinin kim olduğu gitmez. Talep açılabilir mi, son günü ve kalem başına talep edilebilir
// adet, iptal düğmesi görünür mü sitenin ayarlarıyla (MusteriKurallari) hesaplanır; servis yine denetler.
import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import { eklentiliMi } from "../../eklentiler/odeme-yontemleri.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { OdemeYontemi } from "../../kayitlar/odeme.ts";
import {
  type IadeKargosuOdeyen,
  type IadeTalebiDurumu,
  iadeyeAcikDurumlar,
  type MusteriIadeNedeni,
  type MusteriIptaliSecenegi,
  musteriSiparisSinirlari,
  type SiparisDurumu,
  siparisNumarasiKalibi,
  siparisTakipCerezi,
} from "../../kayitlar/siparis.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import type { Fatura, Teslimat } from "../odeme/semalar.ts";
import { musteriIptalEdebilirMi, talepEdilebilirAdetler } from "./iade-talebi.ts";
import {
  type Siparis,
  type SiparisKalemi,
  siparisGecmisi,
  siparisIadeleri,
  siparisIadeTalepleri,
  siparisKalemleri,
  siparisler,
  siparisNotlari,
  siparisTakipErisimleri,
  type Tahsilat,
} from "./model.ts";

const ozet = (anahtar: string): string => createHash("sha256").update(anahtar).digest("hex");
const anahtarKalibi = /^[A-Za-z0-9_-]{40,60}$/;

export type MusteriSiparisKalemi = Pick<
  SiparisKalemi,
  | "sira"
  | "birim_kimligi"
  | "urun_kimligi"
  | "urun_adi"
  | "secim"
  | "adet"
  | "birim_tutari"
  | "tutar"
> & {
  // Tamamlanan iadelerle geri dönen adet.
  iadeAdedi: number;
  // İade talebinde istenebilecek adet (kart 0239).
  talepEdilebilir: number;
};

// Sitenin ayarlarından gelen kurallar (kart 0239): müşterinin kendi iptali, iade talebi süresi, iade kargosu.
export type MusteriKurallari = {
  musteriIptali: MusteriIptaliSecenegi;
  iadeTalebiSuresi: number;
  iadeKargosu: IadeKargosuOdeyen;
};

export type MusteriIadeTalebi = {
  kimlik: string;
  durum: IadeTalebiDurumu;
  kalemler: { sira: number; adet: number }[];
  neden: MusteriIadeNedeni;
  aciklama: string | null;
  retAciklamasi: string | null;
  zaman: Date;
  kararZamani: Date | null;
};

export type MusteriSiparisi = {
  numara: string;
  olusturma: Date;
  durum: SiparisDurumu;
  odemeYontemi: string;
  kapidaSecenegi: string | null;
  gosterim: "vergi-dahil" | "vergi-haric" | "yok";
  kargoTuru: "yok" | "ucretsiz" | "ucretli";
  araToplam: number;
  kargoTutari: number;
  vergiToplami: number;
  toplam: number;
  vergiDokumu: Siparis["vergi_dokumu"];
  tahsilat: Pick<Tahsilat, "odenen" | "taksit"> | null;
  odemeSonZamani: Date | null;
  odemeZamani: Date | null;
  kargo: {
    firma: string;
    takipNumarasi: string | null;
    takipAdresi: string | null;
    zaman: Date;
  } | null;
  teslimZamani: Date | null;
  // Takipte kısaltılmış (ad, soyad, telefon), adres yalnız ülke, il ve ilçe.
  teslimat: Teslimat;
  // Takipte yoktur.
  fatura: Fatura | null;
  // Mağazanın kestiği fatura (kart 0268, karar 0170): numara, takvim günü ve PDF'i var mı; hem hesapta hem takipte
  // görünür (karar 0157). Yoksa null.
  faturaBelgesi: { numara: string; tarih: string; dosya: boolean } | null;
  eposta: string | null;
  kalemler: MusteriSiparisKalemi[];
  // Durum geçmişi, eskiden yeniye: zaman, yeni durum ve neden (cekirdek/kayitlar/siparis.ts).
  gecmis: { zaman: Date; durum: SiparisDurumu; neden: string }[];
  // Mağazanın müşteriye notları, eskiden yeniye.
  notlar: { zaman: Date; metin: string }[];
  // Bekleyen ve tamamlanan iptal ve iadeler, eskiden yeniye.
  iadeler: {
    tur: "iptal" | "iade";
    durum: "bekliyor" | "tamamlandi";
    tutar: number;
    kargoTutari: number;
    kalemler: { sira: number; adet: number }[];
    zaman: Date;
  }[];
  kisiselVeriSilindi: boolean;
  // Takipte teslimat kısaltılmıştır: telefon yalnız son iki rakamdır.
  kisaltilmis: boolean;
  // İade talepleri, eskiden yeniye (kart 0239).
  talepler: MusteriIadeTalebi[];
  // İade talebi: açılabilir mi, açılamıyorsa neden; son an (teslim + süre). Teslim edilmemiş siparişte "yok".
  iadeTalebi: {
    durum: "acik" | "bekleyen-var" | "sure-doldu" | "kalan-yok" | "yok";
    sonZaman: Date | null;
    kargo: IadeKargosuOdeyen;
  };
  // Müşteri bu siparişi kendisi iptal edebilir mi (ayar, durum, ödeme kuralı). Ödendiği için iptal edemiyorsa
  // "magazadan" (ekran mağazayla iletişimi söyler).
  iptal: "acik" | "magazadan" | "yok";
};

export type MusteriSiparisOzeti = {
  numara: string;
  olusturma: Date;
  durum: SiparisDurumu;
  odemeYontemi: string;
  kapidaSecenegi: string | null;
  toplam: number;
  adet: number;
  // Tamamlanan iadelerin toplamı (kuruş); yoksa 0.
  iadeToplami: number;
  // İlk dört kalemin birimi ve ürünü (görseller), sırasıyla.
  kalemler: { birim: string; urun: string; urunAdi: string }[];
};

// "Deniz Yılmaz" → "D*** Y***": her sözcüğün ilk harfi (kod noktasıyla, emoji ve birleşik harf bölünmez).
export const adiKisalt = (ad: string): string =>
  ad
    .normalize("NFC")
    .trim()
    .split(/\s+/u)
    .filter((sozcuk) => sozcuk !== "")
    .map((sozcuk) => `${Array.from(sozcuk)[0] ?? ""}***`)
    .join(" ");

// Telefonun yalnız son iki rakamı kalır: "+905550000012" → "12". Maskeyi ekran metin dosyasından yazar
// (vitrin.siparis.kisaTelefon): rakam gruplaması ülkeye göre değişir.
export const telefonuKisalt = (telefon: string): string => {
  const rakamlar = telefon.replace(/\D/g, "");
  return rakamlar.length < 2 ? "" : rakamlar.slice(-2);
};

const kisaltilmisTeslimat = (teslimat: Teslimat): Teslimat => ({
  ad: adiKisalt(teslimat.ad),
  soyad: adiKisalt(teslimat.soyad),
  ...(teslimat.telefon === undefined || teslimat.telefon === ""
    ? {}
    : { telefon: telefonuKisalt(teslimat.telefon) }),
  adres: {
    ulke: teslimat.adres.ulke,
    adres: "",
    ...(teslimat.adres.il === undefined ? {} : { il: teslimat.adres.il }),
    ...(teslimat.adres.ilce === undefined ? {} : { ilce: teslimat.adres.ilce }),
  },
});

// Siparişin müşteri hâli (kısaltma takipte uygulanır). Dört sorgu, sipariş başına.
const musteriHali = async (
  vt: Veritabani,
  siparis: Siparis,
  kisalt: boolean,
  kurallar: MusteriKurallari,
): Promise<MusteriSiparisi> => {
  const [kalemler, gecmis, notlar, iadeler, talepler] = await Promise.all([
    vt
      .select()
      .from(siparisKalemleri)
      .where(eq(siparisKalemleri.siparis_kimligi, siparis.kimlik))
      .orderBy(asc(siparisKalemleri.sira)),
    vt
      .select({
        zaman: siparisGecmisi.zaman,
        durum: siparisGecmisi.sonraki_durum,
        neden: siparisGecmisi.neden,
      })
      .from(siparisGecmisi)
      .where(eq(siparisGecmisi.siparis_kimligi, siparis.kimlik))
      .orderBy(asc(siparisGecmisi.zaman), asc(siparisGecmisi.kimlik)),
    vt
      .select({ zaman: siparisNotlari.zaman, metin: siparisNotlari.metin })
      .from(siparisNotlari)
      .where(
        and(eq(siparisNotlari.siparis_kimligi, siparis.kimlik), eq(siparisNotlari.tur, "musteri")),
      )
      .orderBy(asc(siparisNotlari.zaman), asc(siparisNotlari.kimlik)),
    vt
      .select({
        tur: siparisIadeleri.tur,
        durum: siparisIadeleri.durum,
        tutar: siparisIadeleri.tutar,
        kargoTutari: siparisIadeleri.kargo_tutari,
        kalemler: siparisIadeleri.kalemler,
        zaman: siparisIadeleri.olusturma_zamani,
        talep: siparisIadeleri.talep_kimligi,
        kaynak: siparisIadeleri.kaynak,
      })
      .from(siparisIadeleri)
      .where(
        and(
          eq(siparisIadeleri.siparis_kimligi, siparis.kimlik),
          ne(siparisIadeleri.durum, "basarisiz"),
        ),
      )
      .orderBy(asc(siparisIadeleri.olusturma_zamani), asc(siparisIadeleri.kimlik)),
    vt
      .select()
      .from(siparisIadeTalepleri)
      .where(eq(siparisIadeTalepleri.siparis_kimligi, siparis.kimlik))
      .orderBy(asc(siparisIadeTalepleri.olusturma_zamani), asc(siparisIadeTalepleri.kimlik)),
  ]);
  const talepEdilebilir = talepEdilebilirAdetler(kalemler, iadeler, talepler);
  const durum = siparis.durum as SiparisDurumu;
  // Son an ve sürenin dolup dolmadığı servisle aynı hesapla, veritabanının saatiyle (bağımsız kontrolün bulgusu: gün
  // eklemek yaz saati olan dilimde 24 saat değildir).
  const sure =
    siparis.teslim_zamani === null
      ? null
      : (
          await vt.execute<{ son: string; dolmadi: boolean }>(
            sql`select (${siparis.teslim_zamani}::timestamptz + make_interval(days => ${kurallar.iadeTalebiSuresi})) as son, now() < ${siparis.teslim_zamani}::timestamptz + make_interval(days => ${kurallar.iadeTalebiSuresi}) as dolmadi`,
          )
        ).rows[0];
  const sonZaman = sure === undefined || sure === null ? null : new Date(sure.son);
  const iadeTalebi: MusteriSiparisi["iadeTalebi"] = {
    durum: !(iadeyeAcikDurumlar.iade as readonly string[]).includes(durum)
      ? "yok"
      : sure === undefined || sure === null || !sure.dolmadi
        ? "sure-doldu"
        : talepler.some((talep) => talep.durum === "bekliyor")
          ? "bekleyen-var"
          : [...talepEdilebilir.values()].every((adet) => adet === 0)
            ? "kalan-yok"
            : "acik",
    sonZaman,
    kargo: kurallar.iadeKargosu,
  };
  const odendi = siparis.odeme_zamani !== null;
  const parasiKurulustan = eklentiliMi(siparis.odeme_yontemi as OdemeYontemi);
  const iptal: MusteriSiparisi["iptal"] = musteriIptalEdebilirMi(kurallar.musteriIptali, {
    durum,
    odendi,
    parasiKurulustan,
  })
    ? "acik"
    : musteriIptalEdebilirMi(kurallar.musteriIptali, { durum, odendi: false, parasiKurulustan })
      ? "magazadan"
      : "yok";
  const iadeAdetleri = new Map<number, number>();
  for (const iade of iadeler) {
    // İptal siparişin bütün kalemlerini taşır ama ürün dönmez: iade edilen adede yalnız tamamlanan iade sayılır
    // (bağımsız kontrolün bulgusu).
    if (iade.durum !== "tamamlandi" || iade.tur !== "iade") continue;
    for (const kalem of iade.kalemler) {
      iadeAdetleri.set(kalem.sira, (iadeAdetleri.get(kalem.sira) ?? 0) + kalem.adet);
    }
  }
  return {
    numara: siparis.numara,
    olusturma: siparis.olusturma_zamani,
    durum: siparis.durum as SiparisDurumu,
    odemeYontemi: siparis.odeme_yontemi,
    kapidaSecenegi: siparis.kapida_secenegi,
    gosterim: siparis.gosterim as MusteriSiparisi["gosterim"],
    kargoTuru: siparis.kargo_turu as MusteriSiparisi["kargoTuru"],
    araToplam: siparis.ara_toplam,
    kargoTutari: siparis.kargo_tutari,
    vergiToplami: siparis.vergi_toplami,
    toplam: siparis.toplam,
    vergiDokumu: siparis.vergi_dokumu,
    tahsilat:
      siparis.tahsilat === null
        ? null
        : { odenen: siparis.tahsilat.odenen, taksit: siparis.tahsilat.taksit },
    odemeSonZamani: siparis.odeme_son_zamani,
    odemeZamani: siparis.odeme_zamani,
    kargo:
      siparis.kargo_firmasi === null || siparis.kargo_zamani === null
        ? null
        : {
            firma: siparis.kargo_firmasi,
            takipNumarasi: siparis.takip_numarasi,
            takipAdresi: siparis.takip_adresi,
            zaman: siparis.kargo_zamani,
          },
    teslimZamani: siparis.teslim_zamani,
    teslimat: kisalt ? kisaltilmisTeslimat(siparis.teslimat) : siparis.teslimat,
    fatura: kisalt ? null : siparis.fatura,
    faturaBelgesi:
      siparis.fatura_numarasi === null || siparis.fatura_tarihi === null
        ? null
        : {
            numara: siparis.fatura_numarasi,
            tarih: siparis.fatura_tarihi,
            dosya: siparis.fatura_dosyasi !== null,
          },
    eposta: kisalt || siparis.eposta === "" ? null : siparis.eposta,
    kalemler: kalemler.map((kalem) => ({
      sira: kalem.sira,
      birim_kimligi: kalem.birim_kimligi,
      urun_kimligi: kalem.urun_kimligi,
      urun_adi: kalem.urun_adi,
      secim: kalem.secim,
      adet: kalem.adet,
      birim_tutari: kalem.birim_tutari,
      tutar: kalem.tutar,
      iadeAdedi: iadeAdetleri.get(kalem.sira) ?? 0,
      talepEdilebilir: talepEdilebilir.get(kalem.sira) ?? 0,
    })),
    gecmis: gecmis.map((satir) => ({ ...satir, durum: satir.durum as SiparisDurumu })),
    // Takipte mağazanın notları görünmez: nota kişisel bilgi yazılmış olabilir, taslağın takip sonucunda geçmiş
    // yoktur (bağımsız kontrolün bulgusu, karar 0150).
    notlar: kisalt ? [] : notlar,
    // Sistemin iptali (süresi dolan havale, kart 0246) müşteriye geçmişin "ödeme süresi doldu" olayıyla görünür: iade
    // satırı ikinci kez "iptal edildi" yazdırmasın. Bu karttan önce iptal edilen siparişlerde iade satırı yoktur.
    iadeler: iadeler
      .filter((iade) => iade.kaynak !== "sistem")
      .map((iade) => ({
        tur: iade.tur as "iptal" | "iade",
        durum: iade.durum as "bekliyor" | "tamamlandi",
        tutar: iade.tutar,
        kargoTutari: iade.kargoTutari,
        kalemler: iade.kalemler.map(({ sira, adet }) => ({ sira, adet })),
        zaman: iade.zaman,
      })),
    kisiselVeriSilindi: siparis.kisisel_veri_silinme_zamani !== null,
    kisaltilmis: kisalt,
    talepler: talepler.map((talep) => ({
      kimlik: talep.kimlik,
      durum: talep.durum as IadeTalebiDurumu,
      kalemler: talep.kalemler,
      neden: talep.neden as MusteriIadeNedeni,
      // Takipte müşterinin açıklaması gitmez (kısaltılmış görünüş; bağımsız kontrolün bulgusu).
      aciklama: kisalt ? null : talep.aciklama,
      retAciklamasi: talep.ret_aciklamasi,
      zaman: talep.olusturma_zamani,
      kararZamani: talep.karar_zamani,
    })),
    iadeTalebi,
    iptal,
  };
};

export const musteriSiparisleri = () => {
  // Hesabın siparişleri, en yeni önce, sayfalı. Sınır dışı sayfa en yakın geçerli sayfaya çekilir.
  const liste = async (
    vt: Veritabani,
    musteri: string,
    istenenSayfa: number,
  ): Promise<{ siparisler: MusteriSiparisOzeti[]; toplam: number; sayfa: number }> => {
    const boy = musteriSiparisSinirlari.sayfaBoyu;
    const [sayi] = await vt
      .select({ toplam: count() })
      .from(siparisler)
      .where(eq(siparisler.musteri_kimligi, musteri));
    const toplam = sayi?.toplam ?? 0;
    const sonSayfa = Math.min(
      Math.max(1, Math.ceil(toplam / boy)),
      musteriSiparisSinirlari.enCokSayfa,
    );
    const sayfa = Math.min(
      Math.max(1, Number.isSafeInteger(istenenSayfa) ? istenenSayfa : 1),
      sonSayfa,
    );
    if (toplam === 0) return { siparisler: [], toplam, sayfa };
    const satirlar = await vt
      .select({
        kimlik: siparisler.kimlik,
        numara: siparisler.numara,
        olusturma: siparisler.olusturma_zamani,
        durum: siparisler.durum,
        odemeYontemi: siparisler.odeme_yontemi,
        kapidaSecenegi: siparisler.kapida_secenegi,
        toplam: siparisler.toplam,
      })
      .from(siparisler)
      .where(eq(siparisler.musteri_kimligi, musteri))
      .orderBy(desc(siparisler.olusturma_zamani), desc(siparisler.kimlik))
      .limit(boy)
      .offset((sayfa - 1) * boy);
    const kimlikler = satirlar.map((satir) => satir.kimlik);
    const [kalemler, iadeler] = await Promise.all([
      vt
        .select({
          siparis: siparisKalemleri.siparis_kimligi,
          birim: siparisKalemleri.birim_kimligi,
          urun: siparisKalemleri.urun_kimligi,
          urunAdi: siparisKalemleri.urun_adi,
          adet: siparisKalemleri.adet,
        })
        .from(siparisKalemleri)
        .where(inArray(siparisKalemleri.siparis_kimligi, kimlikler))
        .orderBy(asc(siparisKalemleri.sira)),
      vt
        .select({
          siparis: siparisIadeleri.siparis_kimligi,
          toplam: sql<number>`sum(${siparisIadeleri.tutar})::bigint`.mapWith(Number),
        })
        .from(siparisIadeleri)
        .where(
          and(
            inArray(siparisIadeleri.siparis_kimligi, kimlikler),
            eq(siparisIadeleri.durum, "tamamlandi"),
          ),
        )
        .groupBy(siparisIadeleri.siparis_kimligi),
    ]);
    const iadeHaritasi = new Map(iadeler.map((satir) => [satir.siparis, satir.toplam]));
    return {
      toplam,
      sayfa,
      siparisler: satirlar.map((satir) => {
        const kendi = kalemler.filter((kalem) => kalem.siparis === satir.kimlik);
        return {
          numara: satir.numara,
          olusturma: satir.olusturma,
          durum: satir.durum as SiparisDurumu,
          odemeYontemi: satir.odemeYontemi,
          kapidaSecenegi: satir.kapidaSecenegi,
          toplam: satir.toplam,
          adet: kendi.reduce((toplamAdet, kalem) => toplamAdet + kalem.adet, 0),
          iadeToplami: iadeHaritasi.get(satir.kimlik) ?? 0,
          kalemler: kendi.slice(0, 4).map(({ birim, urun, urunAdi }) => ({ birim, urun, urunAdi })),
        };
      }),
    };
  };

  // Hesabın bir siparişi; başka müşterinin, üye olmadan verilmiş ya da olmayan numarada null.
  const ayrinti = async (
    vt: Veritabani,
    musteri: string,
    numara: string,
    kurallar: MusteriKurallari,
  ): Promise<MusteriSiparisi | null> => {
    if (!siparisNumarasiKalibi.test(numara)) return null;
    const [siparis] = await vt
      .select()
      .from(siparisler)
      .where(and(eq(siparisler.numara, numara), eq(siparisler.musteri_kimligi, musteri)));
    return siparis === undefined ? null : musteriHali(vt, siparis, false, kurallar);
  };

  // Numara ve e-posta eşleşirse takip anahtarı (çereze yazılır); eşleşmezse bulunamadı. Süresi dolmuş anahtarlar
  // burada silinir. Kişisel bilgisi silinmiş siparişte e-posta boştur: hiçbir e-postayla eşleşmez.
  const takipBaslat = async (
    vt: Veritabani,
    girdi: { numara: string; eposta: string },
  ): Promise<{ anahtar: string }> => {
    const eposta = girdi.eposta.trim().toLowerCase();
    const [siparis] = await vt
      .select({ kimlik: siparisler.kimlik, eposta: siparisler.eposta })
      .from(siparisler)
      .where(eq(siparisler.numara, girdi.numara));
    if (siparis === undefined || siparis.eposta === "" || siparis.eposta.toLowerCase() !== eposta) {
      throw new BilinenHata("bulunamadi");
    }
    const anahtar = randomBytes(32).toString("base64url");
    await vt.transaction(async (islem) => {
      await islem
        .delete(siparisTakipErisimleri)
        .where(lte(siparisTakipErisimleri.bitis_zamani, sql`now()`));
      await islem.insert(siparisTakipErisimleri).values({
        siparis_kimligi: siparis.kimlik,
        ozet: ozet(anahtar),
        bitis_zamani: sql`now() + make_interval(secs => ${siparisTakipCerezi.saniye})`,
      });
    });
    return { anahtar };
  };

  // Takip anahtarıyla siparişin kısaltılmış hâli; anahtar yoksa, bozuksa ya da süresi dolduysa null.
  const takipleOku = async (
    vt: Veritabani,
    anahtar: string | undefined,
    kurallar: MusteriKurallari,
  ): Promise<MusteriSiparisi | null> => {
    const satir = await takipSiparisi(vt, anahtar);
    return satir === null ? null : musteriHali(vt, satir, true, kurallar);
  };

  // Takip anahtarının siparişi (talep ve iptal uçları da kullanır); yoksa, bozuksa ya da süresi dolduysa null.
  const takipSiparisi = async (
    vt: Veritabani,
    anahtar: string | undefined,
  ): Promise<Siparis | null> => {
    if (anahtar === undefined || !anahtarKalibi.test(anahtar)) return null;
    const [satir] = await vt
      .select({ siparis: siparisler })
      .from(siparisTakipErisimleri)
      .innerJoin(siparisler, eq(siparisler.kimlik, siparisTakipErisimleri.siparis_kimligi))
      .where(
        and(
          eq(siparisTakipErisimleri.ozet, ozet(anahtar)),
          gt(siparisTakipErisimleri.bitis_zamani, sql`now()`),
        ),
      );
    return satir?.siparis ?? null;
  };

  // Takibi kapatır (ortak bilgisayar): anahtarın satırı silinir. Anahtar yoksa ya da bozuksa bir şey yapmaz.
  const takipKapat = async (vt: Veritabani, anahtar: string | undefined): Promise<void> => {
    if (anahtar === undefined || !anahtarKalibi.test(anahtar)) return;
    await vt.delete(siparisTakipErisimleri).where(eq(siparisTakipErisimleri.ozet, ozet(anahtar)));
  };

  return { liste, ayrinti, takipBaslat, takipleOku, takipSiparisi, takipKapat };
};
