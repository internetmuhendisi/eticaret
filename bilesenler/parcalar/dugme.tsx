// Düğme (kart 0103; shadcn/ui button). Metni kullanan sayfa verir. Form gönderemez: formun tek gönderme
// düğmesi bilesenler/form/form.tsx içindeki GonderDugmesi'dir. Yalnız ikonu olan düğme IkonDugmesi'dir:
// adı zorunludur, üzerine gelince ve odaklanınca ipucu olarak görünür.
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import type { IkonAdi } from "../ikonlar/sozluk.ts";
import { Ipucu } from "./ipucu.tsx";
import { sinif } from "./sinif.ts";

// Yükseklik 11 (44 px): parmakla rahat basılır. Kapalı düğme gri zemindedir, renge bağlı değildir.
export const dugmeSiniflari = cva(
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 text-center font-en-kalin transition-colors duration-kisa disabled:cursor-not-allowed disabled:bg-yuzey disabled:text-soluk-yazi",
  {
    variants: {
      tur: {
        // Sayfanın asıl eylemi.
        birincil: "rounded-dugme bg-birincil px-5 text-birincil-ustu hover:bg-birincil/90",
        // Koyu düğme: zemini yazının rengidir, iki temada da en güçlü ikinci vurgu.
        ikincil: "rounded-dugme bg-yazi px-5 text-zemin hover:bg-yazi/85",
        // Kenarı yazının rengindedir; şeridin önceki ve sonraki düğmeleri de bu türdür.
        cerceveli: "rounded-dugme border border-yazi bg-transparent px-5 text-yazi hover:bg-yuzey",
        sade: "rounded-dugme bg-transparent px-5 text-yazi hover:bg-yuzey",
        // Geri dönüşsüz eylem: silme, iptal.
        tehlike: "rounded-dugme bg-tehlike px-5 text-tehlike-ustu hover:bg-tehlike-yazi",
        // Bağlantı gibi görünen düğme.
        baglanti: "px-0 text-yazi underline underline-offset-2 hover:no-underline",
        // Afişin düğmesi (kart 0124): rengi ve harf biçimi temanındır (afis-dugmesi, baslik-bicimi).
        afis: "rounded-dugme bg-afis-dugmesi px-5 text-afis-dugmesi-ustu baslik-bicimi hover:bg-afis-dugmesi/85",
      },
      // Yalnız ikonu olan düğme kare ve hap biçimindedir.
      ikonlu: { evet: "size-11 rounded-dugme px-0", hayir: "" },
    },
    defaultVariants: { tur: "birincil", ikonlu: "hayir" },
  },
);

export type DugmeTuru = NonNullable<VariantProps<typeof dugmeSiniflari>["tur"]>;

type DugmeOzellikleri = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  type?: "button" | "reset";
  tur?: DugmeTuru;
};

export function Dugme({ type = "button", tur, className, ...ozellikler }: DugmeOzellikleri) {
  return (
    <button
      type={type}
      data-slot="dugme"
      className={sinif(dugmeSiniflari({ tur }), className)}
      {...ozellikler}
    />
  );
}

export function IkonDugmesi({
  ikon,
  etiket,
  tur = "sade",
  type = "button",
  className,
  ...ozellikler
}: Omit<DugmeOzellikleri, "children" | "aria-label"> & {
  ikon: IkonAdi;
  // Ekran okuyucunun okuduğu ve ipucunda görünen ad. Zorunludur.
  etiket: string;
}) {
  return (
    <Ipucu metin={etiket}>
      <button
        type={type}
        data-slot="ikon-dugmesi"
        aria-label={etiket}
        className={sinif(dugmeSiniflari({ tur, ikonlu: "evet" }), className)}
        {...ozellikler}
      >
        <Ikon ad={ikon} />
      </button>
    </Ipucu>
  );
}
