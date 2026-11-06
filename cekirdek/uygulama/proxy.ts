// Panel adreslerinin ara katmanı (kart 0027, karar 0042). İş cekirdek/kapi/panel-korumasi.ts içindedir.
// Veritabanına ulaşılamazsa panel açılmaz.
import { type NextRequest, NextResponse } from "next/server";
import { hatayiKaydet } from "../izleme/hata-katmani";
import { panelYoklamasi } from "../kapi/panel-korumasi";

export const config = { matcher: ["/yonetim", "/yonetim/:path*"] };

export async function proxy(istek: NextRequest) {
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
