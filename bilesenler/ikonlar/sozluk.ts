// İkon sözlüğü (kart 0103, .claude/rules/tasarim-sistemi.md). Bütün ikonlar tek setten (Lucide) gelir ve
// burada kavramın adıyla tanımlanır. Bir kavramın ikonu her yerde aynıdır: sayfa ve parça ikonu
// <Ikon ad="kapat" /> ile ister, Lucide'yi doğrudan içe aktarmaz. Yeni bir kavram önce buraya eklenir.
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BanknoteIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  CreditCardIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  GalleryHorizontalIcon,
  GiftIcon,
  GripVerticalIcon,
  HeadsetIcon,
  HeartIcon,
  HouseIcon,
  ImageIcon,
  InfoIcon,
  LandmarkIcon,
  LinkIcon,
  ListTreeIcon,
  LoaderCircleIcon,
  LogOutIcon,
  type LucideIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  OctagonXIcon,
  PackageIcon,
  PanelsTopLeftIcon,
  PauseIcon,
  PencilIcon,
  PhoneIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SlidersHorizontalIcon,
  StarIcon,
  Trash2Icon,
  TriangleAlertIcon,
  TruckIcon,
  Undo2Icon,
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
  // Ürün kartı (kart 0109): görseli olmayan ürünün yer tutucusu ve puan.
  gorsel: ImageIcon,
  yildiz: StarIcon,
  // Kayan afiş (kart 0110): kendiliğinden geçişi durdurur ve başlatır.
  durdur: PauseIcon,
  baslat: PlayIcon,
  // Güven şeridi (kart 0110): kargo, kargoya verme, iade, güvenli alışveriş, destek, hediye. Ödeme için kart,
  // havale ve kapıda ödeme ikonları yukarıdadır.
  kargo: TruckIcon,
  paket: PackageIcon,
  iade: Undo2Icon,
  guvenlik: ShieldCheckIcon,
  destek: HeadsetIcon,
  hediye: GiftIcon,
  // Vitrinin hata sayfası (kart 0120): sayfayı yeniden dener.
  yenile: RefreshCwIcon,
  // Ürün listesi (kart 0136): telefonda filtreleri açar.
  filtre: SlidersHorizontalIcon,
  // Yönetim paneli (kart 0141): karşılama sayfası, yeni kayıt ekleme, vitrini yeni sekmede açma, çıkış.
  ev: HouseIcon,
  ekle: PlusIcon,
  "yeni-sekme": ExternalLinkIcon,
  cikis: LogOutIcon,
  // Sıralanabilir liste (kart 0141): sürükleme tutamağı, bir yukarı ve bir aşağı taşıma.
  tutamak: GripVerticalIcon,
  "yukari-al": ArrowUpIcon,
  "asagi-al": ArrowDownIcon,
  // Vitrin bölümleri ekranı (kart 0142): menüdeki iki sayfa (slider kısayolu, bölümler); görünürlük düğmesi
  // bölümün bugünkü durumunu gösterir (görünür: goster, gizli: gizle; taslak); düzenle, satırın öteki işlemleri, sil.
  slider: GalleryHorizontalIcon,
  bolumler: PanelsTopLeftIcon,
  goster: EyeIcon,
  gizle: EyeOffIcon,
  duzenle: PencilIcon,
  diger: EllipsisIcon,
  sil: Trash2Icon,
  // Menüler ekranı (kart 0143): menüdeki sayfa.
  menuler: ListTreeIcon,
} satisfies Record<string, LucideIcon>;

export type IkonAdi = keyof typeof ikonlar;
