"use client";
// Ortak form (kart 0057, .claude/rules/formlar.md). Elle <form> yazmak denetimde hatadır. Sayfanın kodu
// yüklenmeden form tarayıcının kendi yöntemiyle gönderilirse alanlar adres satırına yazılırdı: şifre ve
// kod tarayıcı geçmişine ve kayıtlara düşerdi. İki koruma vardır:
// - Gönder düğmesi kod yüklenene kadar kapalıdır. Düğmesi kapalı formu tarayıcı Enter ile de göndermez,
//   yazılanlar silinmez.
// - Yöntem POST'tur: koruma bir şekilde aşılsa da değerler adrese yazılmaz.
import {
  type ButtonHTMLAttributes,
  createContext,
  type FormHTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { type DugmeTuru, dugmeSiniflari } from "../parcalar/dugme.tsx";
import { sinif } from "../parcalar/sinif.ts";

const FormHazir = createContext(false);

export function Form({
  kodGerekliMetni,
  yukleniyorMetni,
  children,
  ...ozellikler
}: Omit<FormHTMLAttributes<HTMLFormElement>, "method" | "action"> & {
  // JavaScript kapalıysa form çalışmaz, kullanıcı nedenini görür.
  kodGerekliMetni: string;
  // Kod birkaç saniyede yüklenmezse görünür (zamanlamayı CSS yapar, kod gerekmez): düğme kapalıyken
  // kullanıcı neden bir şey olmadığını anlar, yayından sonra açık kalmış sekmede yenilemesi gerektiğini öğrenir.
  yukleniyorMetni: string;
  children: ReactNode;
}) {
  const [hazir, setHazir] = useState(false);
  useEffect(() => setHazir(true), []);
  return (
    <form method="post" noValidate aria-busy={!hazir} {...ozellikler}>
      <noscript>{kodGerekliMetni}</noscript>
      {hazir ? null : (
        <p className="invisible animate-geciken-gorunum" role="status">
          {yukleniyorMetni}
        </p>
      )}
      <FormHazir.Provider value={hazir}>{children}</FormHazir.Provider>
    </form>
  );
}

// Formun tek gönderme düğmesi: Dugme submit olamaz (tür kontrolü). Görünüşü Dugme ile aynıdır. Düğmenin kendi yöntemi ve adresi de
// verilemez, formun korumasını aşardı.
export function GonderDugmesi({
  disabled,
  className,
  tur = "birincil",
  ...ozellikler
}: Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "formMethod" | "formAction" | "formEncType" | "formNoValidate" | "formTarget"
> & { tur?: DugmeTuru }) {
  const hazir = useContext(FormHazir);
  return (
    <button
      type="submit"
      data-slot="gonder-dugmesi"
      className={sinif(dugmeSiniflari({ tur }), className)}
      disabled={disabled === true || !hazir}
      {...ozellikler}
    />
  );
}
