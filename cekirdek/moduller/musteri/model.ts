// Müşterilerin hesapları ve oturumları (kart 0025). Tablo biçimi ve aranan alanlar ortak
// tanımdadır: cekirdek/moduller/oturum/model.ts.
import { hesapTablosu, oturumTablosu } from "../oturum/model.ts";

export const musteriler = hesapTablosu("musteriler");
export const musteriOturumlari = oturumTablosu("musteri_oturumlari", () => musteriler.kimlik);
