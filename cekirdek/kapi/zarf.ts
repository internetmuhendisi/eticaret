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

export const basariliYanit = <Veri>(veri: Veri): Response =>
  Response.json({ basarili: true, veri } satisfies Zarf<Veri>);

export const hataliYanit = (kod: HataKodu, ayrinti?: unknown, basliklar?: HeadersInit): Response =>
  Response.json(
    {
      basarili: false,
      hata: ayrinti === undefined ? { kod } : { kod, ayrinti },
    } satisfies Zarf<never>,
    { status: hataKodlari[kod], ...(basliklar === undefined ? {} : { headers: basliklar }) },
  );
