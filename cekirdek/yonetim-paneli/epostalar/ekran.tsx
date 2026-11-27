"use client";
// E-postalar ekranı (kart 0279, karar 0197; taslak: planlar/tasarim-yonu/panel-2.html, "E-posta metinleri"). İki kart:
// gönderen ve alt bilgi (gönderen adı, gönderim adresi yalnız okunur, yanıt adresi, alt bilgiye ek; ortak form yapısı,
// karar 0159) ve mağazanın müşteriye giden e-postalarının listesi (her satır değiştirilip değiştirilmediğini söyler ve
// metnin ekranına gider). Değiştirme izni olmayan yönetici alanları okur, kaydet çubuğunu görmez.
import { useId } from "react";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { epostaGondereniSinirlari } from "../../kayitlar/eposta";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import type { epostaMetinBirimleri } from "../../moduller/eposta/metin-birimleri";
import { epostaMetniAdresi } from "../adresler";
import { KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { type KodMetinleri, kodluAlanHatalari } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import type { EpostalarVerisi, GonderenFormu } from "./veri";

const gonderenHataMetinleri: KodMetinleri = {
  "gonderen-adi-eposta": "yonetim.epostalar.hata.gonderenAdiEposta",
  "kayda-uygun-degil": "yonetim.epostalar.hata.kaydaUygunDegil",
  "metin-gecersiz": "yonetim.epostalar.hata.metin",
  invalid_format: "yonetim.epostalar.hata.eposta",
  too_big: "yonetim.epostalar.hata.uzun",
};

export const epostaGenelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.epostalar.hata.yetki"
    : hata.kod === "cakisma"
      ? "yonetim.epostalar.hata.cakisma"
      : "yonetim.epostalar.hata.genel";

const gruplar = ["siparis", "hesap"] as const;

function GonderenKarti({ veri, izinli }: { veri: EpostalarVerisi; izinli: boolean }) {
  const metin = usePanelMetni();
  const baslik = useId();
  const islem = usePanelIslemi(epostaGenelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<GonderenFormu>(
    veri.gonderen,
  );
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const degistir = (alan: keyof GonderenFormu, deger: string) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem("eposta-gonderen", gonderilen, "yonetim.epostalar.gonderen.kaydedildi", {
        formda: true,
      }),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    // Uzunluk hatası alanın sınırını söyler (kayıttaki sınır).
    const alanlar = Object.fromEntries(
      Object.entries(kodluAlanHatalari(gonderenHataMetinleri, sonuc, Object.keys(form))).map(
        ([alan, anahtar]) => [
          alan,
          doldur(metin(anahtar), {
            sinir: String(epostaGondereniSinirlari[alan as keyof GonderenFormu]),
          }),
        ],
      ),
    );
    pf.hatalariGoster(
      alanlar,
      Object.keys(alanlar).length > 0 ? [] : [metin(epostaGenelHataMetni(sonuc))],
    );
    return false;
  };

  return (
    <PanelFormu
      durum={pf}
      gonder={async () => {
        await kaydet();
      }}
    >
      <Kart role="region" aria-labelledby={baslik} className="flex flex-col gap-5 p-4 tablet:p-6">
        <div className="flex flex-col gap-1">
          <h2 id={baslik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.epostalar.gonderen.baslik")}
          </h2>
          <p className="text-kucuk text-soluk-yazi">
            {metin("yonetim.epostalar.gonderen.aciklama")}
          </p>
        </div>
        <div className="grid gap-5 tablet:grid-cols-2">
          <PanelAlani
            ad="gonderenAdi"
            etiket={metin("yonetim.epostalar.gonderen.gonderenAdi")}
            aciklama={doldur(metin("yonetim.epostalar.gonderen.gonderenAdiAciklamasi"), {
              magaza: veri.magazaAdi,
            })}
            zorunlu={false}
          >
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                name="gonderenAdi"
                autoComplete="off"
                value={form.gonderenAdi}
                disabled={!izinli}
                onChange={(olay) => degistir("gonderenAdi", olay.target.value)}
              />
            )}
          </PanelAlani>
          <PanelAlani
            ad="yanitAdresi"
            etiket={metin("yonetim.epostalar.gonderen.yanitAdresi")}
            aciklama={metin("yonetim.epostalar.gonderen.yanitAdresiAciklamasi")}
            zorunlu={false}
          >
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                name="yanitAdresi"
                type="email"
                autoComplete="off"
                value={form.yanitAdresi}
                disabled={!izinli}
                onChange={(olay) => degistir("yanitAdresi", olay.target.value)}
              />
            )}
          </PanelAlani>
        </div>
        {veri.gonderenAdresi === null ? (
          <Uyari tur="bilgi">{metin("yonetim.epostalar.gonderen.gonderenAdresiYok")}</Uyari>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-kucuk font-kalin">
              {metin("yonetim.epostalar.gonderen.gonderenAdresi")}
            </span>
            <span className="break-all">{veri.gonderenAdresi}</span>
            <span className="text-kucuk text-soluk-yazi">
              {metin("yonetim.epostalar.gonderen.gonderenAdresiAciklamasi")}
            </span>
          </div>
        )}
        <PanelAlani
          ad="altBilgiEki"
          etiket={metin("yonetim.epostalar.gonderen.altBilgiEki")}
          aciklama={metin("yonetim.epostalar.gonderen.altBilgiEkiAciklamasi")}
          zorunlu={false}
        >
          {(baglanti) => (
            <UzunMetinAlani
              {...baglanti}
              name="altBilgiEki"
              rows={3}
              value={form.altBilgiEki}
              disabled={!izinli}
              onChange={(olay) => degistir("altBilgiEki", olay.target.value)}
            />
          )}
        </PanelAlani>
        {izinli ? (
          <KaydetCubugu
            sayfada
            durumYazisi
            degisiklikGerekli
            kaydetEtiketi={metin("yonetim.epostalar.gonderen.kaydet")}
            vazgec={() => {
              vazgec();
              pf.temizle();
            }}
          />
        ) : null}
      </Kart>
    </PanelFormu>
  );
}

function EpostaListesi({ veri }: { veri: EpostalarVerisi }) {
  const metin = usePanelMetni();
  const baslik = useId();
  return (
    <Kart role="region" aria-labelledby={baslik} className="flex flex-col gap-4 p-4 tablet:p-6">
      <h2 id={baslik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.epostalar.liste.baslik")}
      </h2>
      {gruplar.map((grup) => {
        const birimler = veri.birimler.filter((b) => b.grup === grup);
        const grupBasligi = `${baslik}-${grup}`;
        return (
          <section key={grup} aria-labelledby={grupBasligi} className="flex flex-col gap-2">
            <h3 id={grupBasligi} className="text-kucuk font-kalin text-soluk-yazi">
              {metin(`yonetim.epostalar.liste.grup.${grup}`)}
            </h3>
            <ul className="m-0 flex list-none flex-col rounded-orta border border-kenar p-0">
              {birimler.map((birim) => {
                const ad = metin(`yonetim.epostalar.birim.${birim.kod}.ad`);
                return (
                  <li
                    key={birim.kod}
                    data-eposta={birim.kod}
                    className="flex min-w-0 flex-wrap items-center gap-3 border-b border-kenar p-3 last:border-b-0 tablet:px-4"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1 break-words">
                      <span className="flex flex-wrap items-center gap-2 font-kalin">
                        {ad}
                        {birim.degisti ? (
                          <Rozet tur="uyari">{metin("yonetim.epostalar.liste.degistirildi")}</Rozet>
                        ) : null}
                      </span>
                      <span className="text-kucuk text-soluk-yazi">
                        {birim.degisiklik ?? metin("yonetim.epostalar.liste.varsayilan")}
                      </span>
                    </div>
                    <Baglanti
                      href={epostaMetniAdresi(birim.kod)}
                      aria-label={doldur(metin("yonetim.epostalar.liste.duzenleAdi"), { ad })}
                      className="inline-flex min-h-11 items-center px-2"
                    >
                      {metin("yonetim.epostalar.liste.duzenle")}
                    </Baglanti>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-kucuk text-soluk-yazi">{metin("yonetim.epostalar.liste.yoneticiNotu")}</p>
    </Kart>
  );
}

// Birimin kaydı ekrana yalnız adın anahtarı için gelir; tür denetimi bütün birimlerin metni olduğunu söyler.
export const birimAdiAnahtari = (kod: keyof typeof epostaMetinBirimleri): MetinAnahtari =>
  `yonetim.epostalar.birim.${kod}.ad`;

export function EpostalarEkrani({ veri, izinli }: { veri: EpostalarVerisi; izinli: boolean }) {
  return (
    <div className="flex max-w-metin flex-col gap-6">
      <GonderenKarti veri={veri} izinli={izinli} />
      <EpostaListesi veri={veri} />
    </div>
  );
}
