// Mağaza yöneticilerinin hesapları ve oturumları (kart 0025). Tablo biçimi ve aranan alanlar
// ortak tanımdadır: cekirdek/moduller/oturum/model.ts.
import { hesapTablosu, oturumTablosu } from "../oturum/model.ts";

export const yoneticiler = hesapTablosu("yoneticiler");
export const yoneticiOturumlari = oturumTablosu("yonetici_oturumlari", () => yoneticiler.kimlik);
