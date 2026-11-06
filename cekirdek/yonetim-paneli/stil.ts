// CSS modülünün sınıf adları. Modülün kendi türü her adı kabul eder, burada bilinen adlara indirilir.
import ham from "./panel.module.css";

export const stil = ham as Record<
  "sarmal" | "icerik" | "altyapiAdi" | "form" | "karekod" | "metinAnahtar" | "yedekKodlar",
  string
>;
