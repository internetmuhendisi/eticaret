// Giriş alanı (kart 0103; shadcn/ui input). Etiket, açıklama ve hata FormAlani ile gelir. Onay kutusu,
// düğme ve dosya alanı bu parçayla yazılmaz: her birinin kendi parçası vardır.
import type { InputHTMLAttributes } from "react";
import { sinif } from "./sinif.ts";

type YazilanTur =
  | "text"
  | "email"
  | "password"
  | "search"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "time"
  | "datetime-local";

export const girisAlaniSiniflari =
  "min-h-11 w-full min-w-0 rounded-dugme border border-alan-kenari bg-zemin px-4 text-yazi placeholder:text-soluk-yazi disabled:cursor-not-allowed disabled:bg-yuzey disabled:text-soluk-yazi aria-invalid:border-2 aria-invalid:border-tehlike";

export function GirisAlani({
  className,
  type = "text",
  ...ozellikler
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { type?: YazilanTur }) {
  return (
    <input
      type={type}
      data-slot="giris-alani"
      className={sinif(girisAlaniSiniflari, className)}
      {...ozellikler}
    />
  );
}
