"use client";
// Her katalog parçasının canlı örneği (kart 0104). Anahtar kayit.ts'teki koddur; eksik ya da fazla anahtar
// tür kontrolünde hatadır.
import type { ComponentType } from "react";
import type { katalogParcalari } from "./kayit";
import { AcilirMenuOrnegi } from "./ornekler/acilir-menu";
import { AkordeonOrnegi } from "./ornekler/akordeon";
import { BaglantiOrnegi } from "./ornekler/baglanti";
import { BildirimOrnegi } from "./ornekler/bildirim";
import { BosHalOrnegi } from "./ornekler/bos-hal";
import { DugmeOrnegi } from "./ornekler/dugme";
import { EtiketOrnegi } from "./ornekler/etiket";
import { FormOrnegi } from "./ornekler/form";
import { FormAlaniOrnegi } from "./ornekler/form-alani";
import { GirisAlaniOrnegi } from "./ornekler/giris-alani";
import { IkonOrnegi } from "./ornekler/ikon";
import { IpucuOrnegi } from "./ornekler/ipucu";
import { IskeletOrnegi } from "./ornekler/iskelet";
import { KartOrnegi } from "./ornekler/kart";
import { OnayKutusuOrnegi } from "./ornekler/onay-kutusu";
import { OnayPenceresiOrnegi } from "./ornekler/onay-penceresi";
import { PencereOrnegi } from "./ornekler/pencere";
import { RozetOrnegi } from "./ornekler/rozet";
import { SayfaBasligiOrnegi } from "./ornekler/sayfa-basligi";
import { SayfaYoluOrnegi } from "./ornekler/sayfa-yolu";
import { SayfalamaOrnegi } from "./ornekler/sayfalama";
import { SecenekGrubuOrnegi } from "./ornekler/secenek-grubu";
import { SecimKutusuOrnegi } from "./ornekler/secim-kutusu";
import { SekmelerOrnegi } from "./ornekler/sekmeler";
import { SeritOrnegi } from "./ornekler/serit";
import { SiralanabilirListeOrnegi } from "./ornekler/siralanabilir-liste";
import { UyariOrnegi } from "./ornekler/uyari";
import { UzunMetinAlaniOrnegi } from "./ornekler/uzun-metin-alani";
import { YanPencereOrnegi } from "./ornekler/yan-pencere";
import { YukleniyorOrnegi } from "./ornekler/yukleniyor";

export type ParcaKodu = (typeof katalogParcalari)[number]["kod"];

const ornekler: Record<ParcaKodu, ComponentType> = {
  dugme: DugmeOrnegi,
  baglanti: BaglantiOrnegi,
  etiket: EtiketOrnegi,
  "giris-alani": GirisAlaniOrnegi,
  "uzun-metin-alani": UzunMetinAlaniOrnegi,
  "form-alani": FormAlaniOrnegi,
  "secim-kutusu": SecimKutusuOrnegi,
  "onay-kutusu": OnayKutusuOrnegi,
  "secenek-grubu": SecenekGrubuOrnegi,
  "siralanabilir-liste": SiralanabilirListeOrnegi,
  form: FormOrnegi,
  "acilir-menu": AcilirMenuOrnegi,
  pencere: PencereOrnegi,
  "onay-penceresi": OnayPenceresiOrnegi,
  "yan-pencere": YanPencereOrnegi,
  sekmeler: SekmelerOrnegi,
  kart: KartOrnegi,
  rozet: RozetOrnegi,
  uyari: UyariOrnegi,
  bildirim: BildirimOrnegi,
  ipucu: IpucuOrnegi,
  iskelet: IskeletOrnegi,
  yukleniyor: YukleniyorOrnegi,
  serit: SeritOrnegi,
  akordeon: AkordeonOrnegi,
  "sayfa-yolu": SayfaYoluOrnegi,
  "sayfa-basligi": SayfaBasligiOrnegi,
  "bos-hal": BosHalOrnegi,
  sayfalama: SayfalamaOrnegi,
  ikon: IkonOrnegi,
};

export function KatalogOrnegi({ kod }: { kod: ParcaKodu }) {
  const Ornek = ornekler[kod];
  return <Ornek />;
}
