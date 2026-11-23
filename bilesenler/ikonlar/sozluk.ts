// İkon sözlüğü (kart 0103, .claude/rules/tasarim-sistemi.md). Bütün ikonlar tek setten (Lucide) gelir ve
// burada kavramın adıyla tanımlanır. Bir kavramın ikonu her yerde aynıdır: sayfa ve parça ikonu
// <Ikon ad="kapat" /> ile ister, Lucide'yi doğrudan içe aktarmaz. Yeni bir kavram önce buraya eklenir.
import {
  ArrowDownIcon,
  ArrowDownWideNarrowIcon,
  ArrowUpIcon,
  ArrowUpNarrowWideIcon,
  BanknoteIcon,
  BoldIcon,
  BoxIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  CircleXIcon,
  CopyIcon,
  CreditCardIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FolderTreeIcon,
  GalleryHorizontalIcon,
  GiftIcon,
  GripVerticalIcon,
  Heading3Icon,
  HeadsetIcon,
  HeartIcon,
  HouseIcon,
  ImageIcon,
  InfoIcon,
  ItalicIcon,
  LandmarkIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  ListTreeIcon,
  LoaderCircleIcon,
  LogOutIcon,
  type LucideIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  MinusIcon,
  OctagonXIcon,
  PackageIcon,
  PaletteIcon,
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
  TagsIcon,
  Trash2Icon,
  TriangleAlertIcon,
  TruckIcon,
  Undo2Icon,
  UploadIcon,
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
  // Önceki ve sonraki: kaydırmalı şerit, kayan afiş, sayfalama, galeri. Köşeli ok (Canlı Çarşı taslağı, karar 0128).
  onceki: ChevronLeftIcon,
  sonraki: ChevronRightIcon,
  // Yükleniyor göstergesi (döner).
  yukleniyor: LoaderCircleIcon,
  // Dosya yükleme düğmesi (kart 0094, panel taslağı).
  yukle: UploadIcon,
  // Galerideki videonun kapağı ve "Video bağla" (kart 0266, panel taslağı).
  oynat: PlayIcon,
  // Bildirim ve uyarı türleri.
  basari: CircleCheckIcon,
  // Siparişin iptali (kart 0235).
  iptal: CircleXIcon,
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
  // Adedi azaltır (kart 0212: sepette ve ürün sayfasında adet seçici; artırmak "ekle"dir).
  azalt: MinusIcon,
  "yeni-sekme": ExternalLinkIcon,
  cikis: LogOutIcon,
  // Sıralanabilir liste (kart 0141): sürükleme tutamağı, bir yukarı ve bir aşağı taşıma.
  tutamak: GripVerticalIcon,
  "yukari-al": ArrowUpIcon,
  "asagi-al": ArrowDownIcon,
  // Panel listeleri (kart 0258): bir kısmı seçili sayfa kutusu, sütunun artan ve azalan sırası.
  "kismen-secili": MinusIcon,
  "sirala-artan": ArrowUpNarrowWideIcon,
  "sirala-azalan": ArrowDownWideNarrowIcon,
  // Panel listelerinin tarih süzgeci (kart 0267).
  takvim: CalendarIcon,
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
  // Tema ekranı (kart 0148): menüdeki sayfa.
  tema: PaletteIcon,
  // Sipariş alındı sayfası (kart 0214): IBAN'ı kopyala.
  kopyala: CopyIcon,
  // Ürünler listesi (kart 0262): menüdeki sayfa ve boş hâl.
  urunler: BoxIcon,
  // Kategoriler, markalar ve etiketler, özellikler ekranları (kart 0261): menüdeki sayfalar.
  kategoriler: FolderTreeIcon,
  markalar: TagsIcon,
  ozellikler: ListChecksIcon,
  // Biçimli metin alanının araç çubuğu (kart 0263).
  kalin: BoldIcon,
  egik: ItalicIcon,
  "ara-baslik": Heading3Icon,
  "madde-listesi": ListIcon,
  "sirali-liste": ListOrderedIcon,
} satisfies Record<string, LucideIcon>;

export type IkonAdi = keyof typeof ikonlar;
