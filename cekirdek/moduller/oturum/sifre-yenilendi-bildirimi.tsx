// Giriş sayfalarında "şifreniz değişti" bildirimi (kart 0034). Yenileme formu buraya yönlendirir.
import { metin } from "../../metinler/site-metni";
import { sifreYenilendiParametresi } from "./sifirlama-adresleri";

export function SifreYenilendiBildirimi({
  parametreler,
}: {
  parametreler: Record<string, string | string[] | undefined>;
}) {
  if (parametreler[sifreYenilendiParametresi] === undefined) return null;
  return <p role="status">{metin("ortak.sifirlama.yenilendi")}</p>;
}
