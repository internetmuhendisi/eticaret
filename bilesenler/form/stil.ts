// CSS modülünün sınıf adları. Modülün kendi türü her adı kabul eder, burada bilinen adlara indirilir.
import ham from "./form.module.css";

export const stil = ham as Record<
  | "alan"
  | "aciklama"
  | "hata"
  | "giris"
  | "dugme"
  | "uyari"
  | "yukleniyor"
  | "onay"
  | "onayEtiketi"
  | "onayKutusu"
  | "baglanti",
  string
>;
