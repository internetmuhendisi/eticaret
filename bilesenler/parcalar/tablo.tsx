// Tablo (kart 0258; shadcn/ui table'ın yapısıyla). Sayfada elle <table> yazılmaz (denetim/kurallar/elle-tablo.grit):
// panelin listeleri liste motoruyla (cekirdek/yonetim-paneli/liste/), küçük tablolar (ürünün özellikleri, taksitler,
// iade ve elle sipariş kalemleri) bu parçalarla çizilir. Parça yalnız tablonun iskeletini ve satır çizgisini verir;
// iç boşluk, hizalama ve yazı boyu kullananın sınıfıdır. Metni kullanan sayfa verir.
// Sunucuda da çizilir (tarayıcı kodu yoktur); satır seçiminin kutusu tablo-secimi.tsx'tedir.
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { sinif } from "./sinif.ts";

export function Tablo({ className, ...ozellikler }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      data-slot="tablo"
      className={sinif("w-full border-collapse", className)}
      {...ozellikler}
    />
  );
}

export function TabloBasligi({
  className,
  ...ozellikler
}: HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption data-slot="tablo-basligi" className={className} {...ozellikler} />;
}

export function TabloUstu(ozellikler: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead data-slot="tablo-ustu" {...ozellikler} />;
}

export function TabloGovdesi(ozellikler: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody data-slot="tablo-govdesi" {...ozellikler} />;
}

export function TabloSatiri({ className, ...ozellikler }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      data-slot="tablo-satiri"
      className={sinif("border-b border-kenar", className)}
      {...ozellikler}
    />
  );
}

export function TabloBasHucresi({
  className,
  ...ozellikler
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th data-slot="tablo-bas-hucresi" className={sinif("text-left", className)} {...ozellikler} />
  );
}

export function TabloHucresi({ className, ...ozellikler }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td data-slot="tablo-hucresi" className={className} {...ozellikler} />;
}
