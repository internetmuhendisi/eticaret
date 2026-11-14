// Uygulamanın ara katmanı. Beş işi vardır (dördüncüsü arama sayfasının istek sınırı, beşincisi tema demosu, aşağıda):
// - Panel adresleri (kart 0027, karar 0042). İş cekirdek/kapi/panel-korumasi.ts içindedir. Veritabanına
//   ulaşılamazsa panel açılmaz.
// - Geliştirme adresleri, yani bileşen kataloğu (kart 0104, karar 0078). Katalogun açık olmadığı kutuda
//   istek sayfaya hiç ulaşmaz: gövdesiz 404. Next.js'te düzenin notFound() vermesi sayfanın çizilmesini
//   durdurmaz; içerik 404'ün gövdesinde ve RSC isteğinde 200 ile gidiyordu (bağımsız kontrol, ölçüldü).
// - Site ikonu (kart 0120, karar 0104). Tarayıcı her sayfada kendiliğinden /favicon.ico ister. Bu adres vitrinin
//   yakalayıcısına düşerse çerçeveli "bulunamadı" sayfası veritabanını okuyarak çizilirdi; site ikonu gelene kadar
//   (kart 0150) gövdesiz 404 alır.
import { type NextRequest, NextResponse } from "next/server";
import { calisanSite } from "../ayar-semasi/calisan-site";
import { hatayiKaydet } from "../izleme/hata-katmani";
import { istegiSay, istemciAdresi, sayacAdresi } from "../kapi/istek-siniri";
import { panelYoklamasi } from "../kapi/panel-korumasi";
import { katalogAcikMi } from "../katalog/acik-mi";
import { temaDemosu } from "../kayitlar/tema";
import { vitrinAdresleri } from "../vitrin/adresler";
import { adresinAramasi } from "../vitrin/urun-listesi/adres";
import { aramaSiniriBasligi } from "../vitrin/urun-listesi/arama-siniri";

export const config = {
  matcher: [
    "/yonetim",
    "/yonetim/:path*",
    "/gelistirme",
    "/gelistirme/:path*",
    "/favicon.ico",
    "/arama",
    // Vitrin sayfaları (kart 0116): Next.js'in kendi dosyaları ve kapı dışında her adres. Tema demosu olmayan sitede
    // ara katman bu adreslerde hiçbir şey yapmaz.
    "/((?!_next/|kapi/).*)",
  ],
};

// Eşleme listesi adresi çözülmüş hâliyle eşler; karşılaştırma da çözülmüş adresle yapılır. Kodlanmış
// yazılış (/%67elistirme/..., /gelistirme%2F...) yoksa katalog kapısına uğramadan panel dalına düşüyordu
// (bağımsız kontrol, ölçüldü). Çözülemeyen adres katalog adresi sayılır: kapalıysa 404 alır.
const gelistirmeAdresiMi = (hamYol: string) => {
  let yol: string;
  try {
    yol = decodeURIComponent(hamYol);
  } catch {
    return true;
  }
  return yol === "/gelistirme" || yol.startsWith("/gelistirme/");
};

export const siteIkonuYolu = "/favicon.ico";

// Arama sayfası (kart 0137): aranan metinle gelen istek istemci başına sayılır (IPv6 ilk 64 bitiyle). Sınır aşılınca
// sayfa arama yapmaz: istek 429 ile aynı adrese, bekleme süresini taşıyan başlıkla geçer, sayfa "biraz bekleyin"
// der (cekirdek/vitrin/urun-listesi/arama-sayfasi.tsx). Başlık dışarıdan gönderilse de silinir.
const aramaSiniri = (istek: NextRequest): NextResponse => {
  const basliklar = new Headers(istek.headers);
  basliklar.delete(aramaSiniriBasligi);
  if (adresinAramasi(istek.nextUrl.searchParams) !== undefined) {
    const sonuc = istegiSay(
      `GET ${istek.nextUrl.pathname} ${sayacAdresi(istemciAdresi(istek))}`,
      "arama",
    );
    if (!sonuc.izinli) {
      basliklar.set(aramaSiniriBasligi, String(sonuc.bekleSaniye));
      return NextResponse.rewrite(istek.nextUrl, {
        status: 429,
        headers: { "Retry-After": String(sonuc.bekleSaniye) },
        request: { headers: basliklar },
      });
    }
  }
  return NextResponse.next({ request: { headers: basliklar } });
};

// Panel adresi: çözülmüş hâliyle /yonetim ya da altı. Çözülemeyen adres panel sayılmaz: bu adres eşleme listesinin
// panel kalıplarına da uymazdı (Next.js eşlemeyi çözülmüş adresle yapar), vitrin olarak geçer.
const panelAdresiMi = (hamYol: string) => {
  let yol: string;
  try {
    yol = decodeURIComponent(hamYol);
  } catch {
    return false;
  }
  return yol === "/yonetim" || yol.startsWith("/yonetim/");
};

// Tema demosu (kart 0116, karar 0127): adresteki geçerli ?tema= çereze yazılır ve istek aynı adrese parametresiz
// yönlenir (303); sonraki her sayfa, arama dahil, temayı çerezden okur (cekirdek/vitrin/tema-secimi.ts). Sitenin
// kullanamayacağı tema yok sayılır, sayfa olduğu gibi açılır.
const temaSecimi = (istek: NextRequest): NextResponse | undefined => {
  const site = calisanSite();
  const secilen = istek.nextUrl.searchParams.get(temaDemosu.parametre);
  if (!site.ayarlar.temaDemosu || !site.temalar.some((tema) => tema.kod === secilen)) {
    return undefined;
  }
  const adres = istek.nextUrl.clone();
  adres.searchParams.delete(temaDemosu.parametre);
  const yanit = NextResponse.redirect(adres, 303);
  yanit.cookies.set(temaDemosu.cerez, secilen as string, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  return yanit;
};

// Tema demosu arama motorlarına kapalıdır (kart 0116): ara katmandan geçen her yanıt başlığı taşır, sayfalar ayrıca
// noindex yazar (vitrinSayfaKalibi).
export async function proxy(istek: NextRequest) {
  const yanit = await yonlendir(istek);
  if (calisanSite().ayarlar.temaDemosu) yanit.headers.set("X-Robots-Tag", "noindex, nofollow");
  return yanit;
}

async function yonlendir(istek: NextRequest): Promise<NextResponse> {
  if (istek.nextUrl.pathname === siteIkonuYolu) return new NextResponse(null, { status: 404 });
  if (gelistirmeAdresiMi(istek.nextUrl.pathname)) {
    return katalogAcikMi() ? NextResponse.next() : new NextResponse(null, { status: 404 });
  }
  const panel = panelAdresiMi(istek.nextUrl.pathname);
  const secim = panel ? undefined : temaSecimi(istek);
  if (secim !== undefined) return secim;
  if (istek.nextUrl.pathname === vitrinAdresleri.arama) return aramaSiniri(istek);
  if (!panel) return NextResponse.next();
  // Panel sayfası POST kabul etmez: bu istek, kodu yüklenmeden gönderilen formdur (kart 0057). Gövdesi
  // okunmaz. 303 gövdeyi bırakır, tarayıcı aynı adresi temiz açar ve yenilemede şifreyi yeniden göndermez.
  if (istek.method !== "GET" && istek.method !== "HEAD") {
    return NextResponse.redirect(new URL(istek.nextUrl.pathname, istek.url), 303);
  }
  try {
    const { yonlendir, cerezler } = await panelYoklamasi(istek);
    // Next.js ara katmanda tam adres ister; aynı kökteki adresi yanıtta kendisi göreliye çevirir, bu
    // yüzden ön kapının arkasında da doğru adrese gider (yerel ortam denemesi ölçer).
    const yanit =
      yonlendir === null
        ? NextResponse.next()
        : NextResponse.redirect(new URL(yonlendir, istek.url), 307);
    for (const cerez of cerezler) yanit.headers.append("Set-Cookie", cerez);
    return yanit;
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "panel-korumasi" });
    return new NextResponse(null, { status: 503, headers: { "Retry-After": "30" } });
  }
}
