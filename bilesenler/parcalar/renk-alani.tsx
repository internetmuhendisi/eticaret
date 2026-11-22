"use client";
// Renk alanı (kart 0260, karar 0168): rengin onaltılık kodunun yazıldığı giriş alanı ve solunda tarayıcının renk
// seçicisi. İkisi aynı değeri gösterir: seçicide seçilen renk alana "#RRGGBB" olarak yazılır, alana yazılan geçerli
// kod seçiciye geçer; yazılırken geçersiz kalan kod seçicide son geçerli rengi bırakır. Seçici klavyeyle açılır
// (Enter, boşluk) ve ekran okuyucu adını kullanan sayfadan alır. Etiket, açıklama ve hata FormAlani ile gelir
// (yazılan alana bağlanır).
import { type InputHTMLAttributes, useRef } from "react";
import { GirisAlani } from "./giris-alani.tsx";
import { sinif } from "./sinif.ts";

const gecerliRenk = /^#[0-9A-Fa-f]{6}$/;

export function RenkAlani({
  value,
  onDegerDegisti,
  seciciEtiketi,
  disabled,
  className,
  ...ozellikler
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  // Alanın değeri: yazılan kod, geçersiz de olabilir.
  value: string;
  onDegerDegisti: (deger: string) => void;
  // Renk seçicinin ekran okuyucudaki adı, örneğin "Ana renk: renk seçici".
  seciciEtiketi: string;
}) {
  // Seçici yalnız küçük harfli geçerli kodu gösterebilir: geçersiz yazılışta son geçerli renk kalır. Hiç geçerli kod
  // görülmediyse seçici tarayıcının kendi başlangıç rengiyle açılır (denetimsiz; anahtar değişince yeniden kurulur).
  const sonGecerli = useRef<string | undefined>(undefined);
  if (gecerliRenk.test(value)) sonGecerli.current = value.toLowerCase();
  return (
    <span data-slot="renk-alani" className={sinif("flex items-center gap-2", className)}>
      {/* Tarayıcının renk seçicisi; kütüphanenin içinde ham giriş öğesi serbesttir. */}
      <input
        key={sonGecerli.current === undefined ? "bos" : "renkli"}
        type="color"
        aria-label={seciciEtiketi}
        disabled={disabled}
        {...(sonGecerli.current === undefined ? {} : { value: sonGecerli.current })}
        onChange={(olay) => onDegerDegisti(olay.target.value.toUpperCase())}
        className="size-11 shrink-0 cursor-pointer rounded-dugme border border-alan-kenari bg-zemin p-1 disabled:cursor-not-allowed"
      />
      <GirisAlani
        {...ozellikler}
        value={value}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        maxLength={7}
        onChange={(olay) => onDegerDegisti(olay.target.value)}
        className="font-kod uppercase"
      />
    </span>
  );
}
