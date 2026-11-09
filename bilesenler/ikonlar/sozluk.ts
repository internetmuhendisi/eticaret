// İkon sözlüğü (kart 0103, .claude/rules/tasarim-sistemi.md). Bütün ikonlar tek setten (Lucide) gelir ve
// burada kavramın adıyla tanımlanır. Bir kavramın ikonu her yerde aynıdır: sayfa ve parça ikonu
// <Ikon ad="kapat" /> ile ister, Lucide'yi doğrudan içe aktarmaz. Yeni bir kavram önce buraya eklenir.
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  InfoIcon,
  LoaderCircleIcon,
  type LucideIcon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";

export const ikonlar = {
  // Pencere, bildirim, yan pencere: kapatır.
  kapat: XIcon,
  // Seçili öğe, işaretli kutu.
  onay: CheckIcon,
  // Seçili radyo öğesi.
  nokta: CircleIcon,
  // Açılır liste ve akordeon: aşağı açılır; liste kaydırma.
  asagi: ChevronDownIcon,
  yukari: ChevronUpIcon,
  // Alt menüye geçer.
  "alt-menu": ChevronRightIcon,
  // Kaydırmalı şerit: önceki ve sonraki.
  onceki: ArrowLeftIcon,
  sonraki: ArrowRightIcon,
  // Yükleniyor göstergesi (döner).
  yukleniyor: LoaderCircleIcon,
  // Bildirim ve uyarı türleri.
  basari: CircleCheckIcon,
  bilgi: InfoIcon,
  uyari: TriangleAlertIcon,
  hata: OctagonXIcon,
} satisfies Record<string, LucideIcon>;

export type IkonAdi = keyof typeof ikonlar;
