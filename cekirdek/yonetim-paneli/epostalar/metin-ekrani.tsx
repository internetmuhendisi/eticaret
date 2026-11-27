"use client";
// Bir e-postanın metni (kart 0279, karar 0197; taslak: "E-posta metinleri", metin düzenleme). Solda konu, giriş ve
// kapanış metni ile "Bilgi ekle" düğmeleri (son bulunulan alanda imlecin yerine "[Müşteri adı]" ekler); sağda
// önizleme (bilgisayar ve telefon genişliği, örnek siparişle, sunucunun çizdiği e-posta) ve deneme e-postası.
//
// Kurallar sunucudadır (metin-servisi.ts): hata alanın altında, birden çok hatada özette (ortak form yapısı, karar
// 0159). Bilinmeyen bilginin metni hangi adların yazıldığını ve kullanılabilenleri söyler. Kayıt ekranın gördüğü
// sürümü gönderir; arada değişen metin "cakisma" alır, sayfa yenilenir. Değiştirme izni olmayan yönetici alanları
// okur, düğmeleri görmez.
import { useEffect, useId, useRef, useState } from "react";
import { useCizimdenSonraOdak } from "../../../bilesenler/parcalar/cizimden-sonra-odak";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { YukleniyorGostergesi } from "../../../bilesenler/parcalar/yukleniyor";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import {
  type EpostaBilgisi,
  type EpostaMetinAlani,
  epostaMetinSinirlari,
  metniCoz,
} from "../../moduller/eposta/metin-birimleri";
import { KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { type KodMetinleri, kodluAlanHatalari } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { panelIstegi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import { epostaGenelHataMetni } from "./ekran";
import type { EpostaMetniFormu, EpostaMetniVerisi } from "./veri";

const alanHataMetinleri: KodMetinleri = {
  too_small: "yonetim.epostalar.hata.zorunlu",
  too_big: "yonetim.epostalar.hata.uzun",
  "metin-gecersiz": "yonetim.epostalar.hata.metin",
  "bilinmeyen-bilgi": "yonetim.epostalar.hata.bilinmeyenBilgi",
};

// Önizleme formun değişmesinden bu kadar sonra istenir (her tuşta istek gitmesin).
const onizlemeBeklemesiMs = 400;

type Genislik = "bilgisayar" | "telefon";

function Onizleme({
  veri,
  form,
  izinli,
}: {
  veri: EpostaMetniVerisi;
  form: EpostaMetniFormu;
  izinli: boolean;
}) {
  const metin = usePanelMetni();
  const baslik = useId();
  const islem = usePanelIslemi(epostaGenelHataMetni);
  const [genislik, setGenislik] = useState<Genislik>("bilgisayar");
  const [onizleme, setOnizleme] = useState(veri.onizleme);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(veri.onizleme === null);
  const istekSirasi = useRef(0);
  const ilk = useRef(true);
  const cerceve = useRef<HTMLIFrameElement>(null);

  // Form değişince önizleme yeniden istenir; geç gelen eski cevap yenisini ezmez.
  // biome-ignore lint/correctness/useExhaustiveDependencies: yalnız metinler değişince istenir.
  useEffect(() => {
    if (ilk.current && veri.onizleme !== null) {
      ilk.current = false;
      return;
    }
    ilk.current = false;
    const sira = ++istekSirasi.current;
    setYukleniyor(true);
    const zamanlayici = window.setTimeout(async () => {
      const sonuc = await panelIstegi<{ konu: string; html: string }>("eposta-onizleme", {
        kod: veri.kod,
        ...form,
      });
      if (sira !== istekSirasi.current) return;
      setYukleniyor(false);
      setHata(!sonuc.tamam);
      if (sonuc.tamam) setOnizleme(sonuc.veri);
    }, onizlemeBeklemesiMs);
    return () => window.clearTimeout(zamanlayici);
  }, [form.konu, form.giris, form.kapanis]);

  // Çerçeve içeriği kadar uzar (iç kaydırma çubuğu olmasın). İçerik betik çalıştırmaz (sandbox); boy dışarıdan,
  // belge yüklenince ve görselleri (logo) yüklenince ölçülür. Sunucuda çizilen çerçeve sayfa bağlanmadan yüklenmiş
  // olabilir: bağlanınca da ölçülür.
  const boyla = () => {
    const oge = cerceve.current;
    const belge = oge?.contentDocument;
    if (oge === null || oge === undefined || belge === null || belge === undefined) return;
    oge.style.height = `${belge.documentElement.scrollHeight}px`;
    for (const gorsel of belge.images) {
      if (!gorsel.complete) gorsel.addEventListener("load", boyla, { once: true });
    }
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: önizleme ve genişlik değişince yeniden ölçülür.
  useEffect(() => {
    if (cerceve.current?.contentDocument?.readyState === "complete") boyla();
  }, [onizleme, genislik]);

  return (
    <Kart
      role="region"
      aria-labelledby={baslik}
      className="flex min-w-0 flex-col gap-4 p-4 tablet:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={baslik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.epostalar.onizleme.baslik")}
        </h2>
        <SecenekGrubu
          baslik={<span className="sr-only">{metin("yonetim.epostalar.onizleme.genislik")}</span>}
          etiket={metin("yonetim.epostalar.onizleme.genislik")}
          ogeler={(["bilgisayar", "telefon"] as const).map((deger) => ({
            deger,
            ad: metin(`yonetim.epostalar.onizleme.${deger}`),
          }))}
          deger={genislik}
          onDegerDegisti={(deger) => setGenislik(deger as Genislik)}
          secilemezEki=""
        />
      </div>
      <p className="text-kucuk text-soluk-yazi">
        {doldur(metin("yonetim.epostalar.onizleme.ornekNotu"), { numara: veri.ornekNumara })}
      </p>
      <div aria-live="polite" className="text-kucuk">
        {yukleniyor ? (
          <YukleniyorGostergesi etiket={metin("yonetim.epostalar.onizleme.yukleniyor")} />
        ) : hata ? (
          <Uyari tur="uyari">{metin("yonetim.epostalar.onizleme.hata")}</Uyari>
        ) : null}
      </div>
      {onizleme === null ? null : (
        <div
          className={sinif(
            "flex w-full flex-col gap-2",
            genislik === "telefon" ? "mx-auto max-w-telefon" : "",
          )}
        >
          <p className="break-words font-kalin">
            {doldur(metin("yonetim.epostalar.onizleme.konu"), { konu: onizleme.konu })}
          </p>
          <iframe
            ref={cerceve}
            title={metin("yonetim.epostalar.onizleme.cerceve")}
            srcDoc={onizleme.html}
            sandbox="allow-same-origin"
            onLoad={boyla}
            className="w-full rounded-orta border border-kenar bg-zemin"
          />
        </div>
      )}
      {izinli ? (
        veri.gidebilir ? (
          <Dugme
            type="button"
            tur="cerceveli"
            className="self-start"
            onClick={() =>
              void islem(
                "eposta-denemesi",
                { kod: veri.kod, ...form },
                "yonetim.epostalar.onizleme.denemeGitti",
              )
            }
          >
            {metin("yonetim.epostalar.onizleme.deneme")}
          </Dugme>
        ) : (
          <p className="text-kucuk text-soluk-yazi">
            {metin("yonetim.epostalar.onizleme.denemeYok")}
          </p>
        )
      ) : null}
    </Kart>
  );
}

export function EpostaMetniEkrani({ veri, izinli }: { veri: EpostaMetniVerisi; izinli: boolean }) {
  const metin = usePanelMetni();
  const baslik = useId();
  const islem = usePanelIslemi(epostaGenelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<EpostaMetniFormu>(
    veri.form,
  );
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const alanlar = useRef<Record<EpostaMetinAlani, HTMLInputElement | HTMLTextAreaElement | null>>({
    konu: null,
    giris: null,
    kapanis: null,
  });
  const sonAlan = useRef<EpostaMetinAlani>("giris");
  const odakla = useCizimdenSonraOdak();
  const [onay, setOnay] = useState(false);
  const adlar = Object.fromEntries(veri.bilgiler.map((b) => [b.kod, b.ad])) as Record<
    EpostaBilgisi,
    string
  >;

  const degistir = (alan: EpostaMetinAlani, deger: string) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  // Bilgiyi son bulunulan alanda imlecin yerine ekler; odak ve imleç eklenen yazının sonuna döner.
  const bilgiEkle = (ad: string) => {
    const alan = sonAlan.current;
    const oge = alanlar.current[alan];
    const yazi = `[${ad}]`;
    const deger = form[alan];
    const bas = oge?.selectionStart ?? deger.length;
    const son = oge?.selectionEnd ?? deger.length;
    degistir(alan, `${deger.slice(0, bas)}${yazi}${deger.slice(son)}`);
    // Yeni değer çizildikten sonra imleç eklenen yazının sonuna konur, odak alana döner (kart 0307).
    odakla(() => {
      oge?.setSelectionRange(bas + yazi.length, bas + yazi.length);
      return oge;
    });
  };

  // Hatanın metni: bilinmeyen bilgide yazılan adlar ve kullanılabilenler, uzunlukta sınır.
  const alanMetni = (
    alan: EpostaMetinAlani,
    anahtar: MetinAnahtari,
    gonderilen: EpostaMetniFormu,
  ) =>
    anahtar === "yonetim.epostalar.hata.bilinmeyenBilgi"
      ? doldur(metin(anahtar), {
          adlar: metniCoz(gonderilen[alan], {
            adlar,
            izinli: veri.bilgiler.map((b) => b.kod),
            dil: veri.dil,
          })
            .bilinmeyenler.map((ad) => `[${ad}]`)
            .join(", "),
          kullanilabilenler: veri.bilgiler.map((b) => `[${b.ad}]`).join(", "),
        })
      : doldur(metin(anahtar), { sinir: String(epostaMetinSinirlari[alan]) });

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem(
        "eposta-metni",
        { kod: veri.kod, ...gonderilen, surum: veri.surum },
        "yonetim.epostalar.metin.kaydedildi",
        { formda: true },
      ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    const hatalar = Object.fromEntries(
      Object.entries(kodluAlanHatalari(alanHataMetinleri, sonuc, Object.keys(form))).map(
        ([alan, anahtar]) => [alan, alanMetni(alan as EpostaMetinAlani, anahtar, gonderilen)],
      ),
    );
    pf.hatalariGoster(
      hatalar,
      Object.keys(hatalar).length > 0 ? [] : [metin(epostaGenelHataMetni(sonuc))],
    );
    return false;
  };

  const alanOzellikleri = (alan: EpostaMetinAlani) => ({
    name: alan,
    value: form[alan],
    disabled: !izinli,
    onFocus: () => {
      sonAlan.current = alan;
    },
  });

  return (
    <div className="grid min-w-0 gap-6 masaustu:grid-cols-2 masaustu:items-start">
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <Kart
          role="region"
          aria-labelledby={baslik}
          className="flex min-w-0 flex-col gap-5 p-4 tablet:p-6"
        >
          <h2 id={baslik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("yonetim.epostalar.metin.baslik")}
          </h2>
          <PanelAlani ad="konu" etiket={metin("yonetim.epostalar.metin.konu")} zorunlu>
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                {...alanOzellikleri("konu")}
                ref={(oge) => {
                  alanlar.current.konu = oge;
                }}
                autoComplete="off"
                onChange={(olay) => degistir("konu", olay.target.value)}
              />
            )}
          </PanelAlani>
          <PanelAlani ad="giris" etiket={metin("yonetim.epostalar.metin.giris")} zorunlu>
            {(baglanti) => (
              <UzunMetinAlani
                {...baglanti}
                {...alanOzellikleri("giris")}
                ref={(oge: HTMLTextAreaElement | null) => {
                  alanlar.current.giris = oge;
                }}
                rows={5}
                onChange={(olay) => degistir("giris", olay.target.value)}
              />
            )}
          </PanelAlani>
          <PanelAlani
            ad="kapanis"
            etiket={metin("yonetim.epostalar.metin.kapanis")}
            aciklama={metin("yonetim.epostalar.metin.kapanisAciklamasi")}
            zorunlu={false}
          >
            {(baglanti) => (
              <UzunMetinAlani
                {...baglanti}
                {...alanOzellikleri("kapanis")}
                ref={(oge: HTMLTextAreaElement | null) => {
                  alanlar.current.kapanis = oge;
                }}
                rows={3}
                onChange={(olay) => degistir("kapanis", olay.target.value)}
              />
            )}
          </PanelAlani>
          {izinli ? (
            <div className="flex flex-col gap-2">
              <span className="font-kalin" id={`${baslik}-bilgi`}>
                {metin("yonetim.epostalar.metin.bilgiEkle")}
              </span>
              <ul
                aria-labelledby={`${baslik}-bilgi`}
                className="m-0 flex list-none flex-wrap gap-2 p-0"
              >
                {veri.bilgiler.map((bilgi) => (
                  <li key={bilgi.kod}>
                    <Dugme
                      type="button"
                      tur="cerceveli"
                      aria-label={doldur(metin("yonetim.epostalar.metin.bilgiEkleAdi"), {
                        ad: bilgi.ad,
                      })}
                      onMouseDown={(olay) => olay.preventDefault()}
                      onClick={() => bilgiEkle(bilgi.ad)}
                    >
                      {bilgi.ad}
                    </Dugme>
                  </li>
                ))}
              </ul>
              <p className="text-kucuk text-soluk-yazi">
                {metin("yonetim.epostalar.metin.bilgiEkleAciklamasi")}
              </p>
            </div>
          ) : null}
          <Uyari tur="bilgi">{metin("yonetim.epostalar.metin.degismez")}</Uyari>
          {izinli && veri.degisti ? (
            <Dugme
              type="button"
              tur="sade"
              className="self-start"
              data-varsayilana-don=""
              onClick={() => setOnay(true)}
            >
              {metin("yonetim.epostalar.metin.varsayilanaDon")}
            </Dugme>
          ) : null}
          {izinli ? (
            <KaydetCubugu
              sayfada
              durumYazisi
              degisiklikGerekli
              kaydetEtiketi={metin("yonetim.epostalar.metin.kaydet")}
              vazgec={() => {
                vazgec();
                pf.temizle();
              }}
            />
          ) : null}
        </Kart>
      </PanelFormu>
      <Onizleme veri={veri} form={form} izinli={izinli} />
      <OnayPenceresi
        acik={onay}
        acikDegisince={setOnay}
        baslik={metin("yonetim.epostalar.metin.varsayilanSorusu")}
        aciklama={metin("yonetim.epostalar.metin.varsayilanAciklamasi")}
        onayEtiketi={metin("yonetim.epostalar.metin.varsayilanEvet")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          // Kaydedilmemiş değişiklik bırakılır: varsayılan metin sunucudan gelir.
          vazgec();
          pf.temizle();
          await islem(
            "eposta-metni-varsayilan",
            { kod: veri.kod, surum: veri.surum },
            "yonetim.epostalar.metin.varsayilanaDonuldu",
          );
        }}
        tur="tehlike"
      />
    </div>
  );
}
