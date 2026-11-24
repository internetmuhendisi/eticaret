// Panelin ikon sözlüğü (kart 0295, karar 0172): yalnız yönetim panelinin, bileşen kataloğunun ve yalnız panelde
// kullanılan kütüphane parçalarının (biçimli metin alanı, dosya yükleme) ikonları.
// Ortak sözlükteki (sozluk.ts) her ikon vitrinin tarayıcı koduna gider; panelin menü sayfaları ve eylemleri vitrini
// büyütmesin diye burada durur. Panel ikonu yalnız panelin PanelIkon'u ile çizilir (cekirdek/yonetim-paneli/
// panel-ikon.tsx), kütüphane parçası ikonu doğrudan bu sözlükten alır. Vitrinin hiçbir dosyasından bu dosyaya içe
// aktarma zinciri varmaz (cekirdek/testler/vitrin-kodu.test.ts); vitrin panel adını tür kontrolünde kullanamaz
// (IkonAdi yalnız ortak adlardır).
import {
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  BoldIcon,
  BoxIcon,
  CalendarIcon,
  CircleXIcon,
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  FileIcon,
  FolderTreeIcon,
  GalleryHorizontalIcon,
  Heading3Icon,
  HouseIcon,
  ItalicIcon,
  KeyRoundIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  ListTreeIcon,
  type LucideIcon,
  MessageSquareTextIcon,
  PaletteIcon,
  PanelsTopLeftIcon,
  PrinterIcon,
  StoreIcon,
  TagsIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import type { IkonAdi } from "./sozluk.ts";

export const panelIkonlari = {
  // Karşılama sayfası (kart 0141).
  ev: HouseIcon,
  // Panel listelerinin sütun sırası (kart 0258) ve tarih süzgeci (kart 0267).
  "sirala-artan": ArrowUpNarrowWideIcon,
  "sirala-azalan": ArrowDownWideNarrowIcon,
  takvim: CalendarIcon,
  // Müşteriye şifre sıfırlama bağlantısı (kart 0271).
  sifre: KeyRoundIcon,
  // Sipariş fişini yazdırma (kart 0270), siparişin iptali (kart 0235).
  yazici: PrinterIcon,
  iptal: CircleXIcon,
  // Vitrin bölümleri ekranı (kart 0142): görünürlük düğmesi bölümün bugünkü durumunu gösterir (görünür: goster,
  // gizli: gizle); satırın öteki işlemleri.
  goster: EyeIcon,
  gizle: EyeOffIcon,
  diger: EllipsisIcon,
  // Menüdeki sayfalar: slider kısayolu ve vitrin bölümleri (kart 0142), menüler (kart 0143), tema (kart 0148),
  // kategoriler, markalar ve etiketler, özellikler (kart 0261), ürünler (kart 0262). Boş hâlleri de aynı ikonu kullanır.
  tema: PaletteIcon,
  urunler: BoxIcon,
  slider: GalleryHorizontalIcon,
  bolumler: PanelsTopLeftIcon,
  menuler: ListTreeIcon,
  kategoriler: FolderTreeIcon,
  markalar: TagsIcon,
  ozellikler: ListChecksIcon,
  // Yorumlar (kart 0277): menüdeki sayfa ve boş hâli.
  yorumlar: MessageSquareTextIcon,
  // Mağaza bilgileri (kart 0278).
  magaza: StoreIcon,
  // Ekip (kart 0274).
  ekip: UsersIcon,
  // Sabit sayfalar (kart 0273): menüdeki sayfa ve boş hâli.
  sayfa: FileIcon,
  // Dosya yükleme düğmesi (kart 0094) ve biçimli metin alanının araç çubuğu (kart 0263): yalnız panelde kullanılan
  // kütüphane parçaları.
  yukle: UploadIcon,
  kalin: BoldIcon,
  egik: ItalicIcon,
  "ara-baslik": Heading3Icon,
  "madde-listesi": ListIcon,
  "sirali-liste": ListOrderedIcon,
} satisfies Record<string, LucideIcon>;

// Panelde kullanılabilen bütün ikon adları: ortak sözlük ve panelin sözlüğü.
export type PanelIkonAdi = IkonAdi | keyof typeof panelIkonlari;
