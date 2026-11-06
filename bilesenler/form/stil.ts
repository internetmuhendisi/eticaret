// CSS modülünün sınıf adları. Modülün kendi türü her adı kabul eder, burada bilinen adlara indirilir.
import ham from "./form.module.css";

export const stil = ham as Record<
  "alan" | "hata" | "giris" | "dugme" | "uyari" | "yukleniyor",
  string
>;
