// İkon sözlüğü (kart 0103, .claude/rules/tasarim-sistemi.md). Bütün ikonlar tek setten (Lucide) gelir ve
// burada kavramın adıyla tanımlanır. Bir kavramın ikonu her yerde aynıdır: sayfa ve parça ikonu
// <Ikon ad="kapat" /> ile ister, Lucide'yi doğrudan içe aktarmaz. Yeni bir kavram önce buraya eklenir.
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanknoteIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  CreditCardIcon,
  HeartIcon,
  InfoIcon,
  LandmarkIcon,
  LinkIcon,
  LoaderCircleIcon,
  type LucideIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  OctagonXIcon,
  PhoneIcon,
  SearchIcon,
  ShoppingBagIcon,
  TriangleAlertIcon,
  UserIcon,
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
  // Vitrinin üst kısmı (kart 0108): telefonda menüyü açar, arama, favoriler, sepet ve hesap.
  menu: MenuIcon,
  arama: SearchIcon,
  favori: HeartIcon,
  sepet: ShoppingBagIcon,
  hesap: UserIcon,
  // İletişim bilgileri: telefon, e-posta, adres.
  telefon: PhoneIcon,
  eposta: MailIcon,
  konum: MapPinIcon,
  // Dış bağlantı (sosyal hesap: ikon setinde marka logoları yoktur).
  "dis-baglanti": LinkIcon,
  // Ödeme işaretleri (cekirdek/kayitlar/odeme.ts).
  kart: CreditCardIcon,
  havale: LandmarkIcon,
  "kapida-odeme": BanknoteIcon,
} satisfies Record<string, LucideIcon>;

export type IkonAdi = keyof typeof ikonlar;
