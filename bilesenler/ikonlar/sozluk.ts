// İkon sözlüğü (kart 0103, .claude/rules/tasarim-sistemi.md). Bütün ikonlar tek setten (Lucide) gelir ve
// burada kavramın adıyla tanımlanır. Bir kavramın ikonu her yerde aynıdır: sayfa ve parça ikonu
// <Ikon ad="kapat" /> ile ister, Lucide'yi doğrudan içe aktarmaz. Yeni bir kavram önce buraya eklenir.
// Bu sözlük vitrinin ve kütüphane parçalarınındır, vitrinin tarayıcı koduna bütünüyle gider. Yalnız panelin
// kullandığı ikon (menüdeki sayfa, panel eylemi) panel sözlüğüne yazılır (panel-sozlugu.ts, kart 0295, karar 0172):
// buraya yazılan her ikon vitrinin kodunu büyütür.
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknoteIcon,
  BoldIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CircleIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GiftIcon,
  GripVerticalIcon,
  Heading3Icon,
  HeadsetIcon,
  HeartIcon,
  ImageIcon,
  InfoIcon,
  ItalicIcon,
  LandmarkIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  LoaderCircleIcon,
  LogOutIcon,
  type LucideIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  MinusIcon,
  OctagonXIcon,
  PackageIcon,
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
  // Yeni kayıt ekleme, vitrini yeni sekmede açma, çıkış (kart 0141).
  ekle: PlusIcon,
  // Adedi azaltır (kart 0212: sepette ve ürün sayfasında adet seçici; artırmak "ekle"dir).
  azalt: MinusIcon,
  "yeni-sekme": ExternalLinkIcon,
  cikis: LogOutIcon,
  // Sıralanabilir liste (kart 0141): sürükleme tutamağı, bir yukarı ve bir aşağı taşıma.
  tutamak: GripVerticalIcon,
  "yukari-al": ArrowUpIcon,
  "asagi-al": ArrowDownIcon,
  // Tablo seçimi (kart 0258): bir kısmı seçili sayfa kutusu.
  "kismen-secili": MinusIcon,
  // Düzenle ve sil (kart 0142).
  duzenle: PencilIcon,
  sil: Trash2Icon,
  // Sipariş alındı sayfası (kart 0214): IBAN'ı kopyala.
  kopyala: CopyIcon,
  // Siparişin faturasını indir (kart 0268).
  indir: DownloadIcon,
  // Biçimli metin alanının araç çubuğu (kart 0263).
  kalin: BoldIcon,
  egik: ItalicIcon,
  "ara-baslik": Heading3Icon,
  "madde-listesi": ListIcon,
  "sirali-liste": ListOrderedIcon,
} satisfies Record<string, LucideIcon>;

export type IkonAdi = keyof typeof ikonlar;
// Sözlükten alınmış bir ikon: panel kendi sözlüğündeki ikonu kütüphane parçalarına bununla verir (kart 0295).
export type IkonBileseni = (typeof ikonlar)[IkonAdi];
