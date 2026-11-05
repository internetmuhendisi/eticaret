// Hata izleme aracı: Bugsink (kart 0022, karar 0036). Sunucunun ve tarayıcının hata katmanı
// hatayı buradan araca gönderir. Bugsink, Sentry'nin gönderim biçimini kabul eder; biçimi hazır
// bir paket değil bu dosya kurar. Böylece araca yalnız hata katmanının verdiği maskelenmiş kayıt
// gider: istek başlığı, çerez, ziyaretçi adresi ya da gezinme izi hiç toplanmaz.
//
// Dosya Node.js'e özgü bir şey kullanmaz; sunucuda da tarayıcıda da aynı kod çalışır.
// Gönderilen olay gönderimden hemen önce bütünüyle bir kez daha maskelenir (ikinci ağ).
import type { GunlukSeviyesi } from "../kayitlar/izleme.ts";
import { maskele } from "./maskele.ts";

// Sitenin kutusuna yayın komutunun verdiği ortam değişkenleri (komutlar/yayin.mts). Adres
// Bugsink'in gönderim adresidir (DSN): yalnız gönderme izni verir, tarayıcıya da gider, gizli
// değildir. Okuma ve yönetim anahtarı sunucudan çıkmaz (komutlar/hata-izleme.mts).
export const hataIzlemeDegiskenleri = {
  adres: "HATA_IZLEME_ADRESI",
  ortam: "HATA_IZLEME_ORTAMI",
} as const;

export type HataIzlemeBilgisi = {
  adres: string;
  // Sitenin kod adı, çekirdek sürümü ve ortamı (deneme, canli): her olayın etiketi.
  site: string;
  surum: string;
  ortam: string;
};

export type HataKaynagi = "sunucu" | "tarayici";

type Gonderim = { adres: string; anahtar: string };

// Gönderim adresi: <şema>://<anahtar>@<sunucu>/<proje numarası>. Adres bozuksa araç bağlanmaz.
export const gonderimAdresiniCoz = (dsn: string): Gonderim | undefined => {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return undefined;
  }
  const proje = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!["https:", "http:"].includes(url.protocol) || !/^[0-9a-f]{32}$/.test(url.username)) {
    return undefined;
  }
  if (!/^\d+$/.test(proje)) return undefined;
  return { adres: `${url.protocol}//${url.host}/api/${proje}/store/`, anahtar: url.username };
};

type Cerceve = {
  filename: string;
  function?: string;
  lineno?: number;
  colno?: number;
  in_app: boolean;
};

// Yığın satırları iki biçimde gelir:
// - V8 (Node.js, Chrome): "at islev (dosya:satir:sutun)" ya da "at dosya:satir:sutun",
// - Safari ve Firefox: "islev@dosya:satir:sutun" ya da "@dosya:satir:sutun".
// Bugsink çerçeveleri eskiden yeniye ister; yığın yeniden eskiye yazılır, sıra çevrilir.
// Dosya adresinin sorgu ve parça kısmı atılır: sayfa adresi gibi değer taşıyabilir.
const v8Satiri = /^\s*at (?:async )?(?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/;
const safariSatiri = /^\s*([^@\s]*)@(.+?):(\d+):(\d+)\s*$/;

export const yiginiCoz = (yigin: unknown): Cerceve[] => {
  if (typeof yigin !== "string") return [];
  const cerceveler: Cerceve[] = [];
  for (const satir of yigin.split("\n")) {
    const eslesme = satir.match(v8Satiri) ?? satir.match(safariSatiri);
    if (!eslesme) continue;
    const [, islev, ham = "", satirNo, sutun] = eslesme;
    const dosya = ham.replace(/[?#].*$/, "");
    cerceveler.push({
      filename: dosya,
      ...(islev ? { function: islev } : {}),
      lineno: Number(satirNo),
      colno: Number(sutun),
      in_app: !/node_modules|node:|\(native\)/.test(dosya),
    });
  }
  return cerceveler.reverse();
};

// Araca giden olay. Bilinen alanlar adıyla yazılır; değerleri maskelenmiş olduğu için bilinmez.
export type Olay = {
  event_id?: unknown;
  timestamp?: unknown;
  platform?: unknown;
  level?: unknown;
  release?: unknown;
  environment?: unknown;
  tags?: { site?: unknown; cekirdek_surumu?: unknown; kaynak?: unknown };
  exception?: { values?: { type?: unknown; value?: unknown; stacktrace?: unknown }[] };
  extra?: unknown;
  [alan: string]: unknown;
};

const seviyeler: Record<Extract<GunlukSeviyesi, "hata" | "olumcul">, string> = {
  hata: "error",
  olumcul: "fatal",
};

const kayitMi = (deger: unknown): deger is Record<string, unknown> =>
  typeof deger === "object" && deger !== null && !Array.isArray(deger);

// Maskelenmiş hatadan olay kurulur. Hata nesnesi maskelenince ad, mesaj, yığın ve neden
// alanlarıyla açılır (maskele.ts); öteki değerler olduğu gibi ek bilgiye girer.
export const olayKur = ({
  hata,
  baglam,
  seviye,
  kaynak,
  bilgi,
  olayNumarasi,
  zaman,
}: {
  hata: unknown;
  baglam: unknown;
  seviye: Extract<GunlukSeviyesi, "hata" | "olumcul">;
  kaynak: HataKaynagi;
  bilgi: Omit<HataIzlemeBilgisi, "adres">;
  olayNumarasi: string;
  zaman: Date;
}): Olay => {
  const acik = maskele(hata);
  const { ad, mesaj, yigin, ...ek } = kayitMi(acik) ? acik : { mesaj: acik };
  const cerceveler = yiginiCoz(yigin);
  const olay = {
    platform: kaynak === "sunucu" ? "node" : "javascript",
    level: seviyeler[seviye],
    release: bilgi.surum,
    environment: bilgi.ortam,
    tags: { site: bilgi.site, cekirdek_surumu: bilgi.surum, kaynak },
    exception: {
      values: [
        {
          type: typeof ad === "string" && ad ? ad : "Hata",
          value: typeof mesaj === "string" ? mesaj : JSON.stringify(mesaj ?? null),
          ...(cerceveler.length > 0 ? { stacktrace: { frames: cerceveler } } : {}),
        },
      ],
    },
    extra: {
      ...(Object.keys(ek).length > 0 ? { hata: ek } : {}),
      ...(baglam === undefined ? {} : { baglam }),
    },
  };
  // İkinci ağ: olayın bütünü (etiketler, yığın, bağlam) bir kez daha maskelenir. Olay numarası
  // ve zaman bizim ürettiğimiz değerlerdir ve maskelenmez: numaradaki uzun bir rakam dizisi
  // kısaltılsaydı araç olayı reddederdi.
  return {
    event_id: olayNumarasi,
    timestamp: zaman.toISOString(),
    ...(maskele(olay) as Olay),
  };
};

// Olay numarası: 32 küçük onaltılık hane. crypto.randomUUID sunucuda ve tarayıcıda vardır.
const olayNumarasiUret = (): string => crypto.randomUUID().replaceAll("-", "");

export type Gonderici = (adres: string, istek: RequestInit) => Promise<Response>;

export type AracSecenekleri = {
  kaynak: HataKaynagi;
  // Gönderim başarısız olunca çağrılır (sunucuda günlüğe uyarı yazar). Hata izleme aracı
  // kendi hatasını yine kendisine göndermez.
  basarisiz?: (neden: unknown) => void;
  gonder?: Gonderici;
  // Bir süreçte (tarayıcıda bir sayfa açılışında) gönderilecek en çok olay. Döngüye giren bir
  // hata aracı ve ziyaretçinin bağlantısını doldurmaz. Sınır yoksa undefined.
  enCokOlay?: number;
  zamanAsimi?: number;
};

export type HataGonderici = (
  hata: unknown,
  baglam: unknown,
  seviye: Extract<GunlukSeviyesi, "hata" | "olumcul">,
) => void;

// Hata izleme aracına gönderen işlev. Adres bozuksa undefined döner; araç bağlanmaz.
export const hataIzlemeAraciKur = (
  bilgi: HataIzlemeBilgisi,
  {
    kaynak,
    basarisiz = () => {},
    gonder = (adres, istek) => fetch(adres, istek),
    enCokOlay,
    zamanAsimi = 5000,
  }: AracSecenekleri,
): HataGonderici | undefined => {
  const gonderim = gonderimAdresiniCoz(bilgi.adres);
  if (gonderim === undefined) return undefined;
  let gonderilen = 0;
  return (hata, baglam, seviye) => {
    if (enCokOlay !== undefined && gonderilen >= enCokOlay) return;
    gonderilen += 1;
    const olay = olayKur({
      hata,
      baglam,
      seviye,
      kaynak,
      bilgi,
      olayNumarasi: olayNumarasiUret(),
      zaman: new Date(),
    });
    gonder(gonderim.adres, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${gonderim.anahtar}, sentry_client=altyapi/${bilgi.surum}`,
      },
      body: JSON.stringify(olay),
      // Tarayıcıda sayfa kapanırken de gönderim sürer; çerez gönderilmez.
      keepalive: true,
      credentials: "omit",
      signal: AbortSignal.timeout(zamanAsimi),
    }).then(
      (yanit) => {
        if (!yanit.ok) basarisiz(new Error(`hata izleme aracı ${yanit.status} döndü`));
      },
      (neden: unknown) => basarisiz(neden),
    );
  };
};
