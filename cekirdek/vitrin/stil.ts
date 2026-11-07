// CSS modülünün sınıf adları. Modülün kendi türü her adı kabul eder, burada bilinen adlara indirilir.
import ham from "./vitrin.module.css";

export const stil = ham as Record<"icerik" | "form" | "hesapAlani" | "eposta" | "baglanti", string>;
