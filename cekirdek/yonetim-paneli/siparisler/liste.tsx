// Siparişler ekranının listesi (kart 0234, karar 0145; kart 0233'ün taslağı): durum sekmeleri sayılarıyla, en yeni
// önce sipariş tablosu ve sayfalar. Sekme ve sayfa adreste durur (kişisel bilgi taşımaz); arama tarayıcıdaki ayrı
// kutudadır (siparis-aramasi.tsx), aranan ad ya da e-posta adrese yazılmaz. Masaüstünde tablo, telefonda her
// sipariş bir kart (.claude/rules/telefon-gorunumu.md). Havalesi bildirilmiş ve bekleyen iade talebi olan sipariş
// işaretlidir; "İade talepleri" sekmesi yalnız bekleyen talebi olanları listeler (kart 0239).
//
// Liste motoru henüz yok (.claude/rules/liste-motoru.md, "elle tablo" kuralı sonra): sütunlar burada yazılıdır;
// motor gelince bu tablo ona taşınır.
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { type SiparisDurumu, siparisDurumTanimlari } from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { panelAdresi } from "../adresler";
import { durumMetni, odemeYazisi } from "./metinler";
import { SiparisAramasi } from "./siparis-aramasi";
import type { SiparisListesiVerisi, SiparisSatiri } from "./veri";

export const siparislerAdresi = `${panelAdresi}/siparisler`;
export const ayrintiAdresi = (numara: string) =>
  `${siparislerAdresi}/ayrinti?numara=${encodeURIComponent(numara)}`;

const listeAdresi = (durum: SiparisDurumu | null, sayfa = 1, talep = false) => {
  const sorgu = new URLSearchParams();
  if (durum !== null) sorgu.set("durum", durum);
  if (talep) sorgu.set("talep", "evet");
  if (sayfa > 1) sorgu.set("sayfa", String(sayfa));
  const yazi = sorgu.toString();
  return yazi === "" ? siparislerAdresi : `${siparislerAdresi}?${yazi}`;
};

export function DurumRozeti({ durum }: { durum: SiparisDurumu }) {
  return <Rozet tur={siparisDurumTanimlari[durum].rozet}>{metin(durumMetni(durum))}</Rozet>;
}

function Musteri({ satir }: { satir: SiparisSatiri }) {
  return (
    <span className="flex flex-col">
      <span>
        {satir.musteri === "" ? metin("yonetim.siparisler.kisiselSilindi") : satir.musteri}
      </span>
      {satir.uye ? null : (
        <span className="text-kucuk text-soluk-yazi">{metin("yonetim.siparisler.uyeDegil")}</span>
      )}
    </span>
  );
}

function HavaleIsareti() {
  return (
    <span className="flex items-center gap-1 text-kucuk font-kalin text-uyari-yazi">
      <Ikon ad="havale" />
      {metin("yonetim.siparisler.havaleBildirildi")}
    </span>
  );
}

function TalepIsareti() {
  return (
    <span className="flex items-center gap-1 text-kucuk font-kalin text-uyari-yazi">
      <Ikon ad="iade" />
      {metin("yonetim.siparisler.iadeTalebi")}
    </span>
  );
}

export function SiparisListesi({ veri }: { veri: SiparisListesiVerisi }) {
  const sekmeler: { durum: SiparisDurumu | null; adet: number; talep?: true }[] = [
    { durum: null, adet: veri.hepsi },
    ...veri.sayilar.filter(({ adet, durum }) => adet > 0 || (durum === veri.durum && !veri.talep)),
    ...(veri.talepSayisi > 0 || veri.talep
      ? [{ durum: null, adet: veri.talepSayisi, talep: true as const }]
      : []),
  ];
  const tablo =
    veri.satirlar.length === 0 ? (
      veri.durum === null && !veri.talep ? (
        <BosHal
          ikon="paket"
          baslik={metin("yonetim.siparisler.bos.baslik")}
          aciklama={metin("yonetim.siparisler.bos.metin")}
        >
          <Baglanti href="/" target="_blank" gorunum="sade">
            {metin("yonetim.siparisler.bos.dugme")}
          </Baglanti>
        </BosHal>
      ) : (
        <BosHal
          ikon="paket"
          baslik={metin("yonetim.siparisler.bosDurum.baslik")}
          aciklama={metin("yonetim.siparisler.bosDurum.metin")}
        >
          <Baglanti href={listeAdresi(null)} gorunum="sade">
            {metin("yonetim.siparisler.bosDurum.dugme")}
          </Baglanti>
        </BosHal>
      )
    ) : (
      <>
        <table className="hidden w-full border-collapse overflow-hidden rounded-orta border border-kenar bg-zemin text-kucuk tablet:table">
          <caption className="sr-only">{metin("yonetim.siparisler.liste")}</caption>
          <thead>
            <tr className="border-b border-kenar text-soluk-yazi">
              {(["siparis", "tarih", "musteri", "durum", "odeme"] as const).map((sutun) => (
                <th key={sutun} scope="col" className="px-3 py-2 text-left font-normal">
                  {metin(`yonetim.siparisler.sutun.${sutun}`)}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-normal">
                {metin("yonetim.siparisler.sutun.tutar")}
              </th>
            </tr>
          </thead>
          <tbody>
            {veri.satirlar.map((satir) => (
              <tr key={satir.numara} className="border-b border-kenar last:border-b-0">
                <td className="px-3 py-3 align-middle">
                  <span className="flex flex-col gap-1">
                    <Baglanti
                      href={ayrintiAdresi(satir.numara)}
                      aria-label={doldur(metin("yonetim.siparisler.ayrintiAdi"), {
                        numara: satir.numara,
                      })}
                      className="w-fit"
                    >
                      {satir.numara}
                    </Baglanti>
                    {satir.havaleBildirildi ? <HavaleIsareti /> : null}
                    {satir.iadeTalebi ? <TalepIsareti /> : null}
                  </span>
                </td>
                <td className="px-3 py-3 align-middle">{satir.zaman}</td>
                <td className="px-3 py-3 align-middle">
                  <Musteri satir={satir} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <DurumRozeti durum={satir.durum} />
                </td>
                <td className="px-3 py-3 align-middle">
                  {odemeYazisi(metin, satir.odeme.yontem, satir.odeme.secenek)}
                </td>
                <td className="px-3 py-3 text-right align-middle font-kalin whitespace-nowrap">
                  {satir.tutar}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul
          aria-label={metin("yonetim.siparisler.liste")}
          className="flex flex-col gap-2 tablet:hidden"
        >
          {veri.satirlar.map((satir) => (
            <li key={satir.numara}>
              <Kart className="gap-2 p-4 tablet:p-4">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <Baglanti
                    href={ayrintiAdresi(satir.numara)}
                    aria-label={doldur(metin("yonetim.siparisler.ayrintiAdi"), {
                      numara: satir.numara,
                    })}
                  >
                    {satir.numara}
                  </Baglanti>
                  <DurumRozeti durum={satir.durum} />
                </span>
                <span className="flex flex-wrap items-end justify-between gap-2 text-kucuk">
                  <span className="flex flex-col">
                    <span className="text-soluk-yazi">{satir.zaman}</span>
                    <Musteri satir={satir} />
                  </span>
                  <span className="font-kalin">{satir.tutar}</span>
                </span>
                {satir.havaleBildirildi ? <HavaleIsareti /> : null}
                {satir.iadeTalebi ? <TalepIsareti /> : null}
              </Kart>
            </li>
          ))}
        </ul>
        <Sayfalama
          sayfa={veri.sayfa}
          toplamSayfa={veri.sayfaSayisi}
          adres={(sayfa) => listeAdresi(veri.durum, sayfa, veri.talep)}
          metinler={{
            etiket: metin("ortak.parca.sayfalar"),
            onceki: metin("ortak.parca.oncekiSayfa"),
            sonraki: metin("ortak.parca.sonrakiSayfa"),
            sayfaAdi: (sira) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
            bosluk: metin("ortak.parca.atlananSayfalar"),
          }}
        />
      </>
    );
  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label={metin("yonetim.siparisler.durumSuzgeci")}
        className="overflow-x-auto border-b border-kenar"
      >
        <ul className="flex gap-1">
          {sekmeler.map(({ durum, adet, talep = false }) => {
            const secili = durum === veri.durum && talep === veri.talep;
            return (
              <li key={talep ? "iade-talebi" : (durum ?? "hepsi")} className="shrink-0">
                <a
                  href={listeAdresi(durum, 1, talep)}
                  aria-current={secili ? "page" : undefined}
                  className={sinif(
                    "flex min-h-11 items-center gap-2 border-b-2 px-3 text-kucuk font-kalin whitespace-nowrap no-underline",
                    secili ? "border-yazi text-yazi" : "border-transparent text-soluk-yazi",
                  )}
                >
                  {talep
                    ? metin("yonetim.siparisler.iadeTalepleri")
                    : durum === null
                      ? metin("yonetim.siparisler.tumu")
                      : metin(durumMetni(durum))}
                  <Rozet tur="ikincil">{adet}</Rozet>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <SiparisAramasi durum={veri.durum} />
      {tablo}
    </div>
  );
}
