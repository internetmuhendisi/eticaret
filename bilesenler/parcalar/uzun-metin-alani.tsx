// Uzun metin alanı (kart 0106; shadcn/ui textarea). Giriş alanıyla aynı kenar, zemin ve hata görünüşündedir;
// köşesi hap değil, çok satırlı metin için orta köşedir. Yazdıkça uzar. Etiket, açıklama ve hata FormAlani
// ile gelir.
import type { Ref, TextareaHTMLAttributes } from "react";
import { sinif } from "./sinif.ts";

export const uzunMetinAlaniSiniflari =
  "field-sizing-content min-h-20 w-full min-w-0 rounded-orta border border-alan-kenari bg-zemin px-4 py-3 text-yazi placeholder:text-soluk-yazi disabled:cursor-not-allowed disabled:bg-yuzey disabled:text-soluk-yazi aria-invalid:border-2 aria-invalid:border-tehlike";

export function UzunMetinAlani({
  className,
  ...ozellikler
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  // İmlecin yerine yazı eklemek için (e-posta metninin "Bilgi ekle"si, kart 0279).
  ref?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      data-slot="uzun-metin-alani"
      className={sinif(uzunMetinAlaniSiniflari, className)}
      {...ozellikler}
    />
  );
}
