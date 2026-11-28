#!/bin/bash
# Sitelerin veritabanı ve dosya yedeği (kart 0024, karar 0037; dosyalar kart 0093, karar 0207). Sunucuda çalışır, kökle.
#
#   gece.sh                         bütün siteler, süresi dolanları temizler (zamanlayıcı)
#   gece.sh <ortam> <kod> <tür>     tek site (elle, geri yükleme öncesi)
#   gece.sh --temizle <ortam> <kod> tek sitenin süresi dolanlarını temizler
#   gece.sh --dosya <ortam> <kod>   tek sitenin dosyalarını yedekler (elle)
#
# Yedek sitenin kendi açık anahtarıyla şifrelenir; açma anahtarı sunucuda yoktur. Dosya süresi
# dolana kadar depoda silme kilidiyle durur. Hiçbir site atlanmaz: anahtarı olmayan veritabanı
# başarısız sayılır, ortamlar çalışan veritabanı kutularından bulunur. Her sonuç kayda yazılır. Bir
# yedek başarısızsa çıkış kodu 1'dir.
set -uo pipefail
umask 077
# shellcheck disable=SC1091
. "$(dirname "$(readlink -f "$0")")/ortak.sh"

exec 9>"$K/.kilit"
if ! flock -w "${YEDEK_KILIT_SN:-3600}" 9; then
  kayit "-" "-" "gece" "basarisiz" "kilit-alinamadi" "" 0
  echo "yedek kilidi alınamadı" >&2
  exit 1
fi

# Kayıt büyümesin: son 2000 satır kalır. Onay bekleyen temizlik hataları ve onaylar silinmez.
if [ -f "$K/kayit.jsonl" ] && [ "$(wc -l <"$K/kayit.jsonl")" -gt 3000 ]; then
  toplam="$(wc -l <"$K/kayit.jsonl")"
  awk -v bas="$((toplam - 2000))" 'NR > bas || /"tur":"temizlik-onay"/ || (/"tur":"temizlik"/ && /"sonuc":"basarisiz"/)' \
    "$K/kayit.jsonl" >"$K/kayit.jsonl.yeni" && mv -f "$K/kayit.jsonl.yeni" "$K/kayit.jsonl"
fi

# Site bilgisi: açık anahtar, kilit süresi (saniye), temizlik payı (saniye). Bozuk satır kullanılmaz:
# boş bir süre "her şeyi sil" anlamına gelirdi.
bilgiyi_oku() {
  read -r acik saklama marj <"$K/siteler/$1/$2" || return 1
  [[ "$acik" =~ ^age1[0-9a-z]{58}$ && "$saklama" =~ ^[1-9][0-9]*$ && "${marj:-}" =~ ^[0-9]+$ ]]
}

yedekle() {
  local ortam="$1" kod="$2" tur="$3" acik saklama marj
  local db="site_${kod//-/_}"
  if ! bilgiyi_oku "$ortam" "$kod" 2>/dev/null; then
    kayit "$ortam" "$kod" "$tur" "basarisiz" "anahtar-yok" "" 0
    echo "HATA $ortam/$kod: anahtar bilgisi yok" >&2
    return 1
  fi
  local ad g boyut uzak bitis sebep=""
  # Dosya adı türü taşır: geri yüklemeyi seçen kişi bozuk hâlin yedeğini gece yedeğinden ayırsın.
  ad="$(date -u +%Y%m%dT%H%M%SZ)-$tur.dump.age"
  g="$(mktemp -d -p "$K/gecici")"
  # age boş girdiyi de şifreler; dökümün başı bu yüzden şifrelemeden önce ölçülür (PGDMP imzası).
  # Site kullanıcısı veritabanının ayarıyla yönetici oturumunu değiştiremesin (karar 0053).
  if ! docker exec -e PGOPTIONS='-c search_path=pg_catalog -c role=none -c local_preload_libraries=' "veritabani-$ortam" pg_dump -U postgres -Fc -d "$db" </dev/null |
    {
      dd bs=5 count=1 iflag=fullblock of="$g/bas" status=none
      cat "$g/bas" -
    } | age -r "$acik" >"$g/$ad"; then
    sebep="dokum-alinamadi"
  elif [ "$(cat "$g/bas" 2>/dev/null)" != "PGDMP" ]; then
    sebep="dokum-bos"
  elif ! boyut="$(stat -c %s "$g/$ad")" || [ "$boyut" -eq 0 ]; then
    sebep="dokum-bos"
  else
    bitis="$(date -u -d "+$saklama seconds" +%Y-%m-%dT%H:%M:%SZ)"
    if ! RC_BAGLA="$g:/veri:ro" rc "$ortam" copyto "/veri/$ad" "depo:$KOVA/$ortam/$kod/$ad" \
      --s3-no-check-bucket --s3-object-lock-mode COMPLIANCE --s3-object-lock-retain-until-date "$bitis"; then
      sebep="yuklenemedi"
    else
      uzak="$(rc "$ortam" lsf --format s "depo:$KOVA/$ortam/$kod/$ad")"
      [ "$uzak" = "$boyut" ] || sebep="boyut-tutmadi"
    fi
  fi
  rm -rf "$g"
  if [ -n "$sebep" ]; then
    kayit "$ortam" "$kod" "$tur" "basarisiz" "$sebep" "$ad" 0
    echo "HATA $ortam/$kod: $sebep" >&2
    return 1
  fi
  kayit "$ortam" "$kod" "$tur" "basarili" "" "$ad" "$boyut"
  echo "yedeklendi $ortam/$kod $ad $boyut"
}

# Süresi dolan yedekler silinir. Kilitli bir yedeğin üstündeki silme işareti de burada kalkar ve
# komut hata döner: birisi süresi dolmamış yedeği silmeye çalışmış olabilir, kayda yazılır. Süresi
# dolmamış yedek görünmüyorsa süresi dolanlar işaretlenmez: en yeni yedek silinmesin. Kovada kova
# yokken yükleme hata verir, kilitsiz yeni kova açılmaz (--s3-no-check-bucket).
temizle() {
  local ortam="$1" kod="$2" acik saklama marj sinir genc
  if ! bilgiyi_oku "$ortam" "$kod" 2>/dev/null; then
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "site-bilgisi-bozuk" "" 0
    return 1
  fi
  sinir="$((saklama + marj))s"
  if ! genc="$(rc "$ortam" lsf --files-only --max-age "$sinir" "depo:$KOVA/$ortam/$kod")"; then
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "liste-okunamadi" "" 0
    return 1
  fi
  # Görünen yeni yedek yoksa hepsi silme işareti altında olabilir: yeni silme yapılmaz, işaretler
  # kaldırılır, kilitli yedek geri gelir. Kilidi dolmuş işaretli sürüm bu adımda kalıcı silinir.
  if [ -z "$genc" ]; then
    rc "$ortam" backend cleanup-hidden "depo:$KOVA/$ortam/$kod" || true
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "yeni-yedek-yok" "" 0
    return 1
  fi
  # Yalnız veritabanı yedekleri: dosya kopyalarının temizliği dosya yedeği başarılı olunca yapılır.
  if ! rc "$ortam" delete --max-depth 1 --min-age "$sinir" "depo:$KOVA/$ortam/$kod" ||
    ! rc "$ortam" backend cleanup-hidden "depo:$KOVA/$ortam/$kod"; then
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "temizlik-yarim" "" 0
    return 1
  fi
  kayit "$ortam" "$kod" "temizlik" "basarili" "" "" 0
}

# Dosyalar (kart 0093, karar 0207). Dosya sonradan değişmez (adı kaydın kimliğidir): her dosya depoya bir kez,
# sitenin açık anahtarıyla şifrelenip "<ad>.<zaman>.age" adıyla ve saklama süresi kadar silme kilidiyle gider.
# Kilidi bitmeye yaklaşan (yaşı saklama süresinden "yenileme payı" kadar eksik) dosyanın yeni bir kopyası
# gönderilir: diskte duran her dosyanın kilitli bir kopyası hep vardır. Silinmiş işaretli dosya diskte kaldıkça
# yedeklenir; site onu saklama süresinden uzun bekletip siler (dosyaTemizligiAyari.kaliciSilmeGun).
# Gönderim parti parti yapılır: geçici klasör bütün dosyaların şifreli kopyasını birden tutmaz.
PARTI_SINIRI="${DOSYA_PARTI_SINIRI:-536870912}"

dosya_yedekle() {
  local ortam="$1" kod="$2" acik saklama marj
  local klasor="$D/$ortam/$kod"
  if ! bilgiyi_oku "$ortam" "$kod" 2>/dev/null; then
    kayit "$ortam" "$kod" "dosya" "basarisiz" "anahtar-yok" "" 0
    echo "HATA $ortam/$kod: anahtar bilgisi yok" >&2
    return 1
  fi
  if [ ! -d "$klasor" ]; then
    kayit "$ortam" "$kod" "dosya" "basarisiz" "klasor-yok" "" 0
    echo "HATA $ortam/$kod: dosya klasörü yok" >&2
    return 1
  fi
  local g zaman bitis pay sinir uzak yerel ad sebep="" sayi=0 toplam=0 parti=0 boyut
  local -A en=()
  g="$(mktemp -d -p "$K/gecici")"
  mkdir "$g/parti"
  zaman="$(date -u +%Y%m%dT%H%M%SZ)"
  bitis="$(date -u -d "+$saklama seconds" +%Y-%m-%dT%H:%M:%SZ)"
  pay=$((saklama / 2 < 604800 ? saklama / 2 : 604800))
  sinir="$(date -u -d "-$((saklama - pay)) seconds" +%Y%m%dT%H%M%SZ)"
  gonder() {
    [ "$parti" -gt 0 ] || return 0
    RC_BAGLA="$g/parti:/veri:ro" rc "$ortam" copy /veri "depo:$KOVA/$ortam/$kod/dosyalar" \
      --s3-no-check-bucket --s3-object-lock-mode COMPLIANCE --s3-object-lock-retain-until-date "$bitis" || return 1
    find "$g/parti" -type f -printf '%s;%f\n' >>"$g/gonderilen"
    find "$g/parti" -type f -delete
    parti=0
  }
  if ! uzak="$(depodaki_dosyalar "$ortam" "$kod")"; then
    sebep="liste-okunamadi"
  elif ! yerel="$(find "$klasor" -maxdepth 1 -type f -printf '%f\n')"; then
    sebep="klasor-okunamadi"
  else
    while read -r ad z; do [ -n "$ad" ] && en["$ad"]="$z"; done <<<"$uzak"
    while read -r ad; do
      [[ "$ad" =~ $DOSYA_ADI ]] || continue
      # Kopyası var ve kilidi daha uzun sürecekse gönderilmez.
      if [ -n "${en[$ad]:-}" ] && [[ "${en[$ad]}" > "$sinir" ]]; then continue; fi
      if ! age -r "$acik" <"$klasor/$ad" >"$g/parti/$ad.$zaman.age"; then
        sebep="sifrelenemedi"
        break
      fi
      boyut="$(stat -c %s "$g/parti/$ad.$zaman.age")"
      sayi=$((sayi + 1))
      toplam=$((toplam + boyut))
      parti=$((parti + boyut))
      if [ "$parti" -ge "$PARTI_SINIRI" ] && ! gonder; then
        sebep="yuklenemedi"
        break
      fi
    done <<<"$yerel"
    if [ -z "$sebep" ] && ! gonder; then sebep="yuklenemedi"; fi
    # Bu çalışmada gönderilen her kopya depoda aynı boyutla durmalı.
    if [ -z "$sebep" ] && [ "$sayi" -gt 0 ]; then
      if ! uzak="$(rc "$ortam" lsf --files-only --format sp --include "*.$zaman.age" "depo:$KOVA/$ortam/$kod/dosyalar")" ||
        [ "$(printf '%s\n' "$uzak" | sort)" != "$(sort "$g/gonderilen")" ]; then
        sebep="boyut-tutmadi"
      fi
    fi
  fi
  rm -rf "$g"
  if [ -n "$sebep" ]; then
    kayit "$ortam" "$kod" "dosya" "basarisiz" "$sebep" "" 0
    echo "HATA $ortam/$kod dosyalar: $sebep" >&2
    return 1
  fi
  kayit "$ortam" "$kod" "dosya" "basarili" "" "$sayi" "$toplam"
  echo "dosyalar yedeklendi $ortam/$kod $sayi $toplam"
}

# Süresi dolan dosya kopyaları silinir; yalnız o gece dosya yedeği başarılıysa çalışır. Diskte duran her
# dosyanın en yeni kopyası saklama süresinden gençtir, silinmez. Silme işareti veritabanı yedeklerindeki
# gibi kaldırılır ve hata kayda yazılır (aynı onayla kapanır).
dosya_temizle() {
  local ortam="$1" kod="$2" acik saklama marj liste
  if ! bilgiyi_oku "$ortam" "$kod" 2>/dev/null; then
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "site-bilgisi-bozuk" "dosyalar" 0
    return 1
  fi
  if ! liste="$(rc "$ortam" lsf -R --files-only --include 'dosyalar/**' "depo:$KOVA/$ortam/$kod")"; then
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "liste-okunamadi" "dosyalar" 0
    return 1
  fi
  # Hiç kopya yoksa (dosyasız site) silinecek bir şey de yoktur.
  [ -n "$liste" ] || return 0
  if ! rc "$ortam" delete --min-age "$((saklama + marj))s" "depo:$KOVA/$ortam/$kod/dosyalar" ||
    ! rc "$ortam" backend cleanup-hidden "depo:$KOVA/$ortam/$kod/dosyalar"; then
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "temizlik-yarim" "dosyalar" 0
    return 1
  fi
  kayit "$ortam" "$kod" "temizlik" "basarili" "" "dosyalar" 0
}

if [ "${1:-}" = "--dosya" ]; then
  dosya_yedekle "$2" "$3"
  exit $?
fi
if [ "${1:-}" = "--temizle" ]; then
  temizle "$2" "$3"
  exit $?
fi
if [ $# -ge 3 ]; then
  yedekle "$1" "$2" "$3"
  exit $?
fi

durum=0
# Ortamlar hem kurulu site bilgilerinden hem çalışan veritabanı kutularından gelir: yedek işi hiç
# kurulmamış bir ortam da görünür.
if ! kutular="$(docker ps --format '{{.Names}}' --filter 'name=^veritabani-' </dev/null)"; then
  kayit "-" "-" "gece" "basarisiz" "kutu-listesi-okunamadi" "" 0
  durum=1
fi
ortamlar="$(
  for kutu in $kutular; do echo "${kutu#veritabani-}"; done
  for klasor in "$K"/siteler/*/; do [ -d "$klasor" ] && basename "$klasor"; done
)"
for ortam in $(printf '%s\n' "$ortamlar" | sort -u); do
  bilinen=" "
  for dosya in "$K/siteler/$ortam"/*; do
    [ -f "$dosya" ] || continue
    kod="$(basename "$dosya")"
    bilinen="$bilinen site_${kod//-/_} "
    if yedekle "$ortam" "$kod" "gece"; then
      temizle "$ortam" "$kod" || durum=1
    else
      durum=1
    fi
    if dosya_yedekle "$ortam" "$kod"; then
      dosya_temizle "$ortam" "$kod" || durum=1
    else
      durum=1
    fi
  done
  # Anahtarı olmayan site sessizce yedeksiz kalmasın. Çift alt çizgili adlar geri yüklemenin ara
  # veritabanlarıdır, sunucu denetimi onları ayrıca kırmızı sayar.
  if ! dblar="$(docker exec "veritabani-$ortam" psql -U postgres -Atc "select datname from pg_database where datname like 'site\_%' and datname not like '%\_\_%'" </dev/null)"; then
    kayit "$ortam" "-" "gece" "basarisiz" "site-listesi-okunamadi" "" 0
    durum=1
    continue
  fi
  for db in $dblar; do
    case "$bilinen" in
    *" $db "*) ;;
    *)
      kayit "$ortam" "$db" "gece" "basarisiz" "anahtar-yok" "" 0
      echo "HATA $ortam/$db: anahtar bilgisi yok" >&2
      durum=1
      ;;
    esac
  done
done
exit "$durum"
