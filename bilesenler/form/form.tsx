"use client";
// Ortak form (kart 0057, .claude/rules/formlar.md). Elle <form> yazmak denetimde hatadır. Sayfanın kodu
// yüklenmeden form tarayıcının kendi yöntemiyle gönderilirse alanlar adres satırına yazılırdı: şifre ve
// kod tarayıcı geçmişine ve kayıtlara düşerdi. İki koruma vardır:
// - Gönder düğmesi kod yüklenene kadar kapalıdır. Düğmesi kapalı formu tarayıcı Enter ile de göndermez,
//   yazılanlar silinmez.
// - Yöntem POST'tur: koruma bir şekilde aşılsa da değerler adrese yazılmaz.
//
// Arama formu (AramaFormu, kart 0137) bu korumaların dışındadır: aranan metin gizli değildir, adreste durmalıdır
// (paylaşılır, geri tuşu çalışır). Yöntemi GET'tir, kod yüklenmeden de tarayıcının kendi yöntemiyle gönderilir. Şifre,
// e-posta ya da kişisel bilgi taşıyan form AramaFormu ile yazılmaz.
import {
  type ButtonHTMLAttributes,
  createContext,
  type FormHTMLAttributes,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useState,
} from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import { type DugmeTuru, dugmeSiniflari } from "../parcalar/dugme.tsx";
import { GirisAlani } from "../parcalar/giris-alani.tsx";
import { Ipucu } from "../parcalar/ipucu.tsx";
import { sinif } from "../parcalar/sinif.ts";

const FormHazir = createContext(false);

export function Form({
  kodGerekliMetni,
  yukleniyorMetni,
  children,
  ...ozellikler
}: Omit<FormHTMLAttributes<HTMLFormElement>, "method" | "action"> & {
  // Formun öğesi (panelin form yapısı hatalı alanı bununla bulur, kart 0259).
  ref?: Ref<HTMLFormElement>;
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

// Arama formu (kart 0137): <search> öğesinde, tek arama alanı ve gönder düğmesi. Alan adı ve adres kullanan sayfanın.
// Metinler zorunludur (bilesenler.md). Düğmenin yalnız ikonu vardır, adı ipucunda görünür.
export function AramaFormu({
  adres,
  alanAdi,
  deger,
  etiket,
  yerTutucu,
  dugmeEtiketi,
  enCokUzunluk,
  className,
}: {
  adres: string;
  alanAdi: string;
  // Alanın başlangıç değeri (aranan metin).
  deger?: string;
  // Alanın ve formun ekran okuyucudaki adı.
  etiket: string;
  yerTutucu: string;
  dugmeEtiketi: string;
  enCokUzunluk?: number;
  className?: string;
}) {
  return (
    <search aria-label={etiket} data-slot="arama-formu" className={sinif("min-w-0", className)}>
      <form
        method="get"
        action={adres}
        className="flex min-h-11 min-w-0 items-center overflow-hidden rounded-dugme border border-alan-kenari bg-yuzey"
      >
        <GirisAlani
          type="search"
          name={alanAdi}
          defaultValue={deger}
          aria-label={etiket}
          placeholder={yerTutucu}
          enterKeyHint="search"
          maxLength={enCokUzunluk}
          className="min-w-0 flex-1 rounded-none border-0 bg-transparent"
        />
        <Ipucu metin={dugmeEtiketi}>
          <button
            type="submit"
            aria-label={dugmeEtiketi}
            data-slot="arama-dugmesi"
            className={sinif(dugmeSiniflari({ tur: "birincil", ikonlu: "evet" }), "shrink-0")}
          >
            <Ikon ad="arama" />
          </button>
        </Ipucu>
      </form>
    </search>
  );
}
