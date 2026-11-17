// Kapının tek yanıt zarfı (karar 0024). Başarılı yanıtta veri, hatalı yanıtta sabit hata kodu
// ve isteğe bağlı ayrıntı döner. Bütün uçlar yanıtını yalnız buradan kurar.
import { type HataKodu, hataKodlari } from "../kayitlar/kapi.ts";

export type Zarf<Veri> =
  | { basarili: true; veri: Veri }
  | { basarili: false; hata: { kod: HataKodu; ayrinti?: unknown } };

// Servisin bildiği, istemciye kodu ve ayrıntısıyla gösterilebilen hata.
// Ayrıntıya kişisel veri ya da iç hata mesajı yazılmaz.
// Komutlar bu dosyayı Node ile doğrudan çalıştırır, bu yüzden yalnız silinebilir tür sözdizimi kullanılır.
export class BilinenHata extends Error {
  readonly kod: HataKodu;
  readonly ayrinti: unknown;
  readonly basliklar: HeadersInit | undefined;

  constructor(kod: HataKodu, ayrinti?: unknown, basliklar?: HeadersInit) {
    super(kod);
    this.name = "BilinenHata";
    this.kod = kod;
    this.ayrinti = ayrinti;
    this.basliklar = basliklar;
  }
}

// Dosya veren uç (kart 0073) servisten bunu döndürür; kapı zarf yerine dosyanın kendisini yanıtlar.
// Hata yine zarfla döner. Tür tarayıcıya tahmin ettirilmez (nosniff), önbellek süresi kısadır;
// etiket içeriğin özetidir, aynı etiketle gelen isteğe gövdesiz 304 döner.
export class DosyaYaniti {
  readonly icerik: Uint8Array;
  readonly mime: string;
  readonly etiket: string;

  // Yetkili uçların dosyası (panelin görsel önizlemesi, kart 0142) yalnız tarayıcının kendi önbelleğinde tutulur:
  // aradaki ortak bir önbellek onu oturumu olmayan birine veremez.
  readonly onbellek: "ortak" | "ozel";

  constructor(
    icerik: Uint8Array,
    mime: string,
    etiket: string,
    onbellek: "ortak" | "ozel" = "ortak",
  ) {
    this.icerik = icerik;
    this.mime = mime;
    this.etiket = etiket;
    this.onbellek = onbellek;
  }
}

// Dosya yanıtının önbellek süresi (saniye). Logo değişince en geç bu kadar sonra yenisi görünür.
export const dosyaOnbellekSuresi = 300;

export const dosyaYanitla = (dosya: DosyaYaniti, istek: Request): Response => {
  const etiket = `"${dosya.etiket}"`;
  const basliklar = {
    "Content-Type": dosya.mime,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": `${dosya.onbellek === "ozel" ? "private" : "public"}, max-age=${dosyaOnbellekSuresi}`,
    ETag: etiket,
  };
  const eslesen = istek.headers
    .get("if-none-match")
    ?.split(",")
    .map((parca) => parca.trim());
  if (eslesen?.includes(etiket)) return new Response(null, { status: 304, headers: basliklar });
  const govde = istek.method === "HEAD" ? null : new Uint8Array(dosya.icerik);
  return new Response(govde, {
    status: 200,
    headers: { ...basliklar, "Content-Length": String(dosya.icerik.length) },
  });
};

// Zarfla dönen her yanıt önbelleğe alınmaz (kart 0065, karar 0139): başarılı ve hatalı, her girişte. Yanıt kişiye
// özel olabilir (hesap, favoriler, panel verisi); aradaki ya da tarayıcının önbelleği onu başkasına ya da sonradan
// geri veremez. Tek istisna dosya yanıtıdır (logo, görseller): kendi süresini yukarıda yazar, hatası yine buradan.
export const zarfOnbellegi = "no-store";

const zarfBasliklari = (basliklar?: HeadersInit): Headers => {
  const sonuc = new Headers(basliklar);
  sonuc.set("Cache-Control", zarfOnbellegi);
  return sonuc;
};

export const basariliYanit = <Veri>(veri: Veri): Response =>
  Response.json({ basarili: true, veri } satisfies Zarf<Veri>, { headers: zarfBasliklari() });

export const hataliYanit = (kod: HataKodu, ayrinti?: unknown, basliklar?: HeadersInit): Response =>
  Response.json(
    {
      basarili: false,
      hata: ayrinti === undefined ? { kod } : { kod, ayrinti },
    } satisfies Zarf<never>,
    { status: hataKodlari[kod], headers: zarfBasliklari(basliklar) },
  );

// Tarayıcıyı başka bir sayfaya gönderen yanıt (kart 0215): ödeme kuruluşunun tarayıcıyla geri gönderdiği form isteği
// (dış kuruluşun dönüşü, uc.ts) müşteriyi sitenin bir sayfasına götürür. Yalnız sitenin kendi yolu verilir (başka
// siteye yönlendirme yok); yanıt önbelleğe alınmaz.
export class Yonlendirme {
  readonly yol: string;
  constructor(yol: string) {
    this.yol = yol;
    if (!yol.startsWith("/") || yol.startsWith("//") || yol.includes("\\")) {
      throw new Error("Yönlendirme yalnız sitenin kendi yoluna yapılır.");
    }
  }
}

export const yonlendir = (yonlendirme: Yonlendirme): Response =>
  new Response(null, {
    status: 303,
    headers: zarfBasliklari({ Location: yonlendirme.yol }),
  });
