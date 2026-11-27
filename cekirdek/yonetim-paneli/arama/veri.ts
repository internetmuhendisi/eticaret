// Panelin aramasının sonuçları ekran için, sunucuda (kart 0321, karar 0191): her tür kendi servisinin `ara`
// işleviyle, aramanın harf kuralıyla aranır; satırın başlığı, alt yazısı ve adresi burada kurulur (tutar ve durum
// sitenin biçimi ve metinleriyle). Bir grupta en çok `grupta` kadar satır; fazlası varsa `dahaFazla`.
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { panelAramaSinirlari } from "../../kayitlar/panel-arama";
import type { SiparisDurumu } from "../../kayitlar/siparis";
import type { UrunDurumu } from "../../kayitlar/urun";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { musteriYonetimi } from "../../moduller/musteri/yonetim";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { urunPanelAramasi } from "../../moduller/urun/panel-listesi";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { musteriAyrintisiAdresi, siparisAyrintisiAdresi, urunEkraniAdresi } from "../adresler";
import { durumMetni } from "../siparisler/metinler";

export const panelAramaSemasi = z.strictObject({
  ara: z.string().trim().min(panelAramaSinirlari.enAz).max(panelAramaSinirlari.enCok),
});

export type PanelAramaSatiri = { baslik: string; alt: string; adres: string };
export type PanelAramaSonucu = { satirlar: PanelAramaSatiri[]; dahaFazla: boolean };

const sonuc = <T>(satirlar: T[], satir: (oge: T) => PanelAramaSatiri): PanelAramaSonucu => ({
  satirlar: satirlar.slice(0, panelAramaSinirlari.grupta).map(satir),
  dahaFazla: satirlar.length > panelAramaSinirlari.grupta,
});

const ayrac = () => metin("yonetim.arama.ayrac");

export const siparisAramasi = async (ara: string): Promise<PanelAramaSonucu> => {
  const site = calisanSite();
  const b = siteninBicimleyicisi(site.ayarlar);
  const satirlar = await siparisYonetimi(site).ara(
    siteninVeritabani(),
    ara,
    panelAramaSinirlari.grupta + 1,
  );
  return sonuc(satirlar, (s) => {
    const teslimat = s.teslimat as { ad?: string; soyad?: string } | null;
    const ad = `${teslimat?.ad ?? ""} ${teslimat?.soyad ?? ""}`.trim();
    return {
      // Kişisel bilgisi silinmiş siparişte ad yoktur: yalnız numara.
      baslik: ad === "" ? s.numara : `${b.kisaAd(ad)}${ayrac()}${s.numara}`,
      alt: `${metin(durumMetni(s.durum as SiparisDurumu))}${ayrac()}${
        s.paraBirimi === site.ayarlar.paraBirimi ? b.para(s.toplam) : s.paraBirimi
      }`,
      adres: siparisAyrintisiAdresi(s.numara),
    };
  });
};

export const urunAramasi = async (ara: string): Promise<PanelAramaSonucu> => {
  const satirlar = await urunPanelAramasi(siteninVeritabani(), ara, panelAramaSinirlari.grupta + 1);
  return sonuc(satirlar, (u) => ({
    baslik: u.ad,
    alt:
      u.kod === null
        ? metin(urunDurumAdi(u.durum))
        : `${u.kod}${ayrac()}${metin(urunDurumAdi(u.durum))}`,
    adres: urunEkraniAdresi(u.kimlik),
  }));
};

export const musteriAramasi = async (ara: string): Promise<PanelAramaSonucu> => {
  const satirlar = await musteriYonetimi(calisanSite()).ara(
    siteninVeritabani(),
    ara,
    panelAramaSinirlari.grupta + 1,
  );
  return sonuc(satirlar, (m) => ({
    baslik: m.ad ?? m.eposta,
    alt: `${m.ad === null ? "" : `${m.eposta}${ayrac()}`}${doldur(
      metin("yonetim.arama.siparisSayisi"),
      {
        sayi: String(m.siparisSayisi),
      },
    )}`,
    adres: musteriAyrintisiAdresi(m.kimlik),
  }));
};

const urunDurumAdi = (durum: UrunDurumu) => `yonetim.urunler.durum.${durum}` as const;
