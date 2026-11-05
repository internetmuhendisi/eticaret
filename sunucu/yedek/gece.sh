#!/bin/bash
# Sitelerin veritabanı yedeği (kart 0024, karar 0037). Sunucuda çalışır, kökle.
#
#   gece.sh                         bütün siteler, süresi dolanları temizler (zamanlayıcı)
#   gece.sh <ortam> <kod> <tür>     tek site (elle, geri yükleme öncesi)
#   gece.sh --temizle <ortam> <kod> tek sitenin süresi dolanlarını temizler
#
# Yedek sitenin kendi açık anahtarıyla şifrelenir; açma anahtarı sunucuda yoktur. Dosya süresi
# dolana kadar depoda silme kilidiyle durur. Hiçbir site atlanmaz: anahtarı olmayan veritabanı
# başarısız sayılır. Her sonuç kayda yazılır. Bir yedek başarısızsa çıkış kodu 1'dir.
set -uo pipefail
umask 077
# shellcheck disable=SC1091
. "$(dirname "$(readlink -f "$0")")/ortak.sh"

exec 9>"$K/.kilit"
if ! flock -w 3600 9; then
  kayit "-" "-" "gece" "basarisiz" "kilit-alinamadi" "" 0
  echo "yedek kilidi alınamadı" >&2
  exit 1
fi

bilgiyi_oku() { read -r acik saklama marj <"$K/siteler/$1/$2"; }

yedekle() {
  local ortam="$1" kod="$2" tur="$3" acik saklama marj
  local db="site_${kod//-/_}"
  if ! bilgiyi_oku "$ortam" "$kod" 2>/dev/null || [ -z "${marj:-}" ]; then
    kayit "$ortam" "$kod" "$tur" "basarisiz" "anahtar-yok" "" 0
    echo "HATA $ortam/$kod: anahtar bilgisi yok" >&2
    return 1
  fi
  local ad g boyut uzak bitis sebep=""
  ad="$(date -u +%Y%m%dT%H%M%SZ).dump.age"
  g="$(mktemp -d -p "$K/gecici")"
  if ! docker exec "veritabani-$ortam" pg_dump -U postgres -Fc -d "$db" </dev/null | age -r "$acik" >"$g/$ad"; then
    sebep="dokum-alinamadi"
  elif ! boyut="$(stat -c %s "$g/$ad")" || [ "$boyut" -eq 0 ]; then
    sebep="dokum-bos"
  else
    bitis="$(date -u -d "+$saklama seconds" +%Y-%m-%dT%H:%M:%SZ)"
    if ! RC_BAGLA="$g:/veri:ro" rc "$ortam" copyto "/veri/$ad" "depo:$KOVA/$ortam/$kod/$ad" \
      --s3-object-lock-mode COMPLIANCE --s3-object-lock-retain-until-date "$bitis"; then
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

# Süresi dolan yedekler silinir. Bu adım yalnız o gece yedek başarılıysa çalışır, en yeni yedek
# hiçbir zaman silinmez. Kilitli bir yedeğin üstündeki silme işareti de burada kalkar ve komut
# hata döner: birisi süresi dolmamış yedeği silmeye çalışmış demektir.
temizle() {
  local ortam="$1" kod="$2" acik saklama marj
  bilgiyi_oku "$ortam" "$kod" || return 1
  rc "$ortam" delete --min-age "$((saklama + marj))s" "depo:$KOVA/$ortam/$kod" &&
    rc "$ortam" backend cleanup-hidden "depo:$KOVA/$ortam/$kod" || {
    kayit "$ortam" "$kod" "temizlik" "basarisiz" "temizlik-yarim" "" 0
    return 1
  }
}

if [ "${1:-}" = "--temizle" ]; then
  temizle "$2" "$3"
  exit $?
fi
if [ $# -ge 3 ]; then
  yedekle "$1" "$2" "$3"
  exit $?
fi

durum=0
for klasor in "$K"/siteler/*/; do
  [ -d "$klasor" ] || continue
  ortam="$(basename "$klasor")"
  bilinen=" "
  for dosya in "$klasor"*; do
    [ -f "$dosya" ] || continue
    kod="$(basename "$dosya")"
    bilinen="$bilinen site_${kod//-/_} "
    if yedekle "$ortam" "$kod" "gece"; then
      temizle "$ortam" "$kod" || durum=1
    else
      durum=1
    fi
  done
  # Anahtarı olmayan site sessizce yedeksiz kalmasın.
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
