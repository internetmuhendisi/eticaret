"use client";
// Siparişleri dışa aktarma (kart 0316, karar 0185; taslak: planlar/tasarim-yonu/panel-2.html, "Siparişleri dışa
// aktar"). Listenin komut çubuğundaki "Dışa aktar" listenin süzgeçleriyle, toplu çubuktaki seçili siparişlerle bu
// pencereyi açar. Pencere kapsamı, satır düzenini, sütunları ve kişisel veri uyarısını gösterir; "Dosyayı hazırla"
// dosyayı arka planda hazırlatır, pencere kapanır. Listenin üstündeki kutu dosya hazırlanırken durumu sorar (sayfa
// yenilenir), hazır olunca indirme bağlantısını gösterir. Arama kutusundaki metin kapsamda yoktur (adrese yazılmaz).
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { type SiparisDisaAktarmaDuzeni, siparisDisaAktarmaDuzenleri } from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { EylemDugmesi } from "../eylem-dugmesi";
import { AlanKabi, KaydetCubugu, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { panelIstegi, yoneticiUcu } from "../panel-istegi";

// Listenin süzgeçleri (adresin sorgusu ve süzgeçli sipariş sayısının sitenin biçimiyle yazısı; sunucu verir) ya da
// seçili siparişlerin numaraları.
export type DisaAktarmaKapsami =
  | { tur: "liste"; sorgu: string; sayiYazisi: string | null }
  | { tur: "secili"; numaralar: string[] };

// Listenin üstündeki kutunun verisi: yöneticinin son dışa aktarması (sunucu verir, servis `durum`).
export type DisaAktarmaKutusuVerisi = {
  kimlik: string;
  durum: "hazirlaniyor" | "hazir" | "hatali";
  // Sipariş sayısı sitenin biçimiyle.
  siparisSayisi: string;
} | null;

const yenilemeAraligi = 2000;

const hataMetni = (kod: string | undefined): MetinAnahtari =>
  kod === "siparis-yok" || kod === "cok-fazla-siparis"
    ? `yonetim.siparisDisaAktarma.hata.${kod}`
    : "yonetim.siparisDisaAktarma.hata.genel";

export function DisaAktarmaPenceresi({
  kapsam,
  kapat,
  sinirYazisi,
}: {
  kapsam: DisaAktarmaKapsami | null;
  kapat: () => void;
  // Bir dosyadaki en çok sipariş sayısı, sitenin biçimiyle (sunucu verir). Seçili siparişler bir sayfadır, sınırı
  // aşamaz: toplu çubuğun penceresi vermez.
  sinirYazisi?: string;
}) {
  const metin = usePanelMetni();
  return (
    <YanPencere open={kapsam !== null} onOpenChange={(acik) => (acik ? undefined : kapat())}>
      {kapsam === null ? null : (
        <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} className="tablet:max-w-form">
          <YanPencereUstu>
            <YanPencereBasligi>
              {metin("yonetim.siparisDisaAktarma.pencereBasligi")}
            </YanPencereBasligi>
            <YanPencereAciklamasi>
              {metin("yonetim.siparisDisaAktarma.aciklama")}
            </YanPencereAciklamasi>
          </YanPencereUstu>
          <DisaAktarmaFormu kapsam={kapsam} kapat={kapat} sinirYazisi={sinirYazisi} />
        </YanPencereIcerigi>
      )}
    </YanPencere>
  );
}

function DisaAktarmaFormu({
  kapsam,
  kapat,
  sinirYazisi,
}: {
  kapsam: DisaAktarmaKapsami;
  kapat: () => void;
  sinirYazisi: string | undefined;
}) {
  const metin = usePanelMetni();
  const router = useRouter();
  const pf = usePanelFormu();
  const [duzen, setDuzen] = useState<SiparisDisaAktarmaDuzeni>(siparisDisaAktarmaDuzenleri[0]);
  const kapsamYazisi =
    kapsam.tur === "secili"
      ? doldur(metin("yonetim.siparisDisaAktarma.secililer"), {
          sayi: String(kapsam.numaralar.length),
        })
      : kapsam.sayiYazisi === null
        ? metin("yonetim.siparisDisaAktarma.listedekilerSayisiz")
        : doldur(metin("yonetim.siparisDisaAktarma.listedekiler"), { sayi: kapsam.sayiYazisi });
  const gonder = async () => {
    const sonuc = await pf.isle(() =>
      panelIstegi<{ kimlik: string }>("siparisler-disa-aktar", {
        kapsam:
          kapsam.tur === "liste"
            ? { tur: "liste", sorgu: kapsam.sorgu }
            : { tur: "secili", numaralar: kapsam.numaralar },
        duzen,
      }),
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      // Sonuç bildirim alanıyla duyurulur (her zaman sayfadadır); kutu yenilemeyle gelir, yeni eklenen bölge okunmayabilir.
      bildirimGoster("bilgi", metin("yonetim.siparisDisaAktarma.basladi"));
      kapat();
      router.refresh();
      return;
    }
    const kod = sonuc.ayrinti[0]?.kod;
    pf.hatalariGoster({}, [doldur(metin(hataMetni(kod)), { sayi: sinirYazisi ?? "" })]);
  };
  return (
    <PanelFormu durum={pf} gonder={gonder} className="gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-kalin">{metin("yonetim.siparisDisaAktarma.hangileri")}</span>
        <span>{kapsamYazisi}</span>
        {kapsam.tur === "liste" ? (
          <span className="text-kucuk text-soluk-yazi">
            {metin("yonetim.siparisDisaAktarma.aramaYok")}
          </span>
        ) : null}
      </div>
      <AlanKabi ad="duzen" etiket={metin("yonetim.siparisDisaAktarma.satirlar")}>
        <SecenekGrubu
          baslik={metin("yonetim.siparisDisaAktarma.satirlar")}
          etiket={metin("yonetim.siparisDisaAktarma.satirlar")}
          ogeler={siparisDisaAktarmaDuzenleri.map((deger) => ({
            deger,
            ad: metin(`yonetim.siparisDisaAktarma.duzen.${deger}`),
          }))}
          deger={duzen}
          onDegerDegisti={(deger) => setDuzen(deger as SiparisDisaAktarmaDuzeni)}
          secilemezEki=""
        />
      </AlanKabi>
      <p className="m-0 text-kucuk text-soluk-yazi">
        {metin("yonetim.siparisDisaAktarma.sutunlarIpucu")}
      </p>
      <Uyari tur="uyari">{metin("yonetim.siparisDisaAktarma.kisiselUyari")}</Uyari>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.siparisDisaAktarma.hazirla")} vazgec={kapat} />
    </PanelFormu>
  );
}

// Komut çubuğundaki "Dışa aktar": listenin süzgeçleriyle.
export function DisaAktarDugmesi({
  sorgu,
  sayiYazisi,
  sinirYazisi,
}: {
  sorgu: string;
  sayiYazisi: string | null;
  sinirYazisi: string;
}) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <EylemDugmesi eylem="disa-aktar" onClick={() => setAcik(true)} />
      <DisaAktarmaPenceresi
        kapsam={acik ? { tur: "liste", sorgu, sayiYazisi } : null}
        kapat={() => setAcik(false)}
        sinirYazisi={sinirYazisi}
      />
    </>
  );
}

// Listenin üstündeki kutu: hazırlanırken sayfa yenilenerek durum sorulur, hazır olunca indirme bağlantısı çıkar.
export function DisaAktarmaKutusu({ veri }: { veri: DisaAktarmaKutusuVerisi }) {
  const metin = usePanelMetni();
  const router = useRouter();
  const hazirlaniyor = veri?.durum === "hazirlaniyor";
  useEffect(() => {
    if (!hazirlaniyor) return;
    const zamanlayici = setInterval(() => router.refresh(), yenilemeAraligi);
    return () => clearInterval(zamanlayici);
  }, [hazirlaniyor, router]);
  if (veri === null) return null;
  const sayi = { sayi: veri.siparisSayisi };
  if (veri.durum === "hatali") {
    return <Uyari tur="tehlike">{metin("yonetim.siparisDisaAktarma.hatali")}</Uyari>;
  }
  // Bilgi kutusu sırası gelince okunur (role="status"); hazırlanırken kendisi de güncellenir.
  return (
    <Uyari
      tur="bilgi"
      baslik={metin(
        hazirlaniyor
          ? "yonetim.siparisDisaAktarma.hazirlaniyorBaslik"
          : "yonetim.siparisDisaAktarma.hazirBaslik",
      )}
    >
      <span className="flex flex-wrap items-center gap-3">
        <span>
          {doldur(
            metin(
              hazirlaniyor
                ? "yonetim.siparisDisaAktarma.hazirlaniyor"
                : "yonetim.siparisDisaAktarma.hazir",
            ),
            sayi,
          )}
        </span>
        {hazirlaniyor ? null : (
          <Baglanti
            href={`${yoneticiUcu("siparisler-disa-aktarma-indir")}?kimlik=${veri.kimlik}`}
            prefetch={false}
            download
            gorunum="birincil"
          >
            {metin("yonetim.siparisDisaAktarma.indir")}
          </Baglanti>
        )}
      </span>
    </Uyari>
  );
}
