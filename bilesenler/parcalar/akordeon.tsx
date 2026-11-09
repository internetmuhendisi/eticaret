"use client";
// Akordeon (kart 0103; shadcn/ui accordion). Başlığa basınca altındaki içerik açılır ve kapanır. Enter ve
// boşluk açıp kapar, ok tuşları başlıklar arasında gezer. Başlık düzeyi sayfadaki yerine göre verilir.
import { Accordion } from "radix-ui";
import type { ComponentProps } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import { sinif } from "./sinif.ts";

export const Akordeon = Accordion.Root;

export function AkordeonOgesi({ className, ...ozellikler }: ComponentProps<typeof Accordion.Item>) {
  return (
    <Accordion.Item
      data-slot="akordeon-ogesi"
      className={sinif("border-b border-kenar last:border-b-0", className)}
      {...ozellikler}
    />
  );
}

export function AkordeonBasligi({
  className,
  children,
  duzey,
  ...ozellikler
}: ComponentProps<typeof Accordion.Trigger> & { duzey: 2 | 3 | 4 }) {
  const Baslik = `h${duzey}` as const;
  return (
    <Accordion.Header asChild>
      <Baslik className="flex text-govde">
        <Accordion.Trigger
          data-slot="akordeon-basligi"
          className={sinif(
            "group flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-4 py-3 text-left font-govde font-kalin hover:underline",
            className,
          )}
          {...ozellikler}
        >
          {children}
          <Ikon
            ad="asagi"
            className="text-soluk-yazi transition-transform duration-orta group-acik:rotate-180"
          />
        </Accordion.Trigger>
      </Baslik>
    </Accordion.Header>
  );
}

export function AkordeonIcerigi({
  className,
  children,
  ...ozellikler
}: ComponentProps<typeof Accordion.Content>) {
  return (
    <Accordion.Content
      data-slot="akordeon-icerigi"
      className="overflow-hidden acik:animate-akordeon-ac kapali:animate-akordeon-kapa"
      {...ozellikler}
    >
      <div className={sinif("pb-4", className)}>{children}</div>
    </Accordion.Content>
  );
}
