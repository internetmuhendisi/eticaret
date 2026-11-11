// Vitrin sayfasının sekme başlığının kalıba dökülmesi (kart 0135, 0120; karar 0103): "<sayfa> | <mağaza adı>". Kalıp
// metin dosyasındadır (vitrin.sayfaBilgisi.kalip). Sunucuda sayfaBasligi (sayfa-bilgisi.ts), tarayıcıda hata sayfası
// bunu kullanır; bu dosya tarayıcıda da yüklenebilsin diye sunucu modülü almaz.
import { doldur } from "../eposta/sablon.ts";

export const sekmeBasligi = (kalip: string, baslik: string, magaza: string): string =>
  doldur(kalip, { baslik, magaza });
