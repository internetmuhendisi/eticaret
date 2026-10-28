#!/usr/bin/env bash
# Gizli dosya kalkanı.
# Claude bir git commit ya da git push komutu çalıştırmadan önce çalışır.
# Kayda ya da gönderime girecek dosyalar arasında adı .env ile başlayan bir dosya
# varsa komutu durdurur. Örnek dosya .env.example bu yasağın dışındadır.
# Çıkış kodu 2 komutu durdurur, hata çıktısındaki yazı Claude'a iletilir.
set -u

girdi=$(cat)

engelle() {
  echo "Engellendi: gizli bilgi dosyası kayda giremez" >&2
  [ -n "${1:-}" ] && echo "Sorunlu dosyalar: $1" >&2
  exit 2
}

# jq yoksa kalkan girdiyi okuyamaz. Komut kayıt ya da gönderme olabilirse durdur.
if ! command -v jq >/dev/null 2>&1; then
  if grep -Eq 'git.*(commit|push)' <<<"$girdi"; then
    echo "Engellendi: gizli dosya kalkanı çalışamadı, jq aracı kurulu değil" >&2
    exit 2
  fi
  exit 0
fi

komut=$(jq -r '.tool_input.command // empty' <<<"$girdi")
dizin=$(jq -r '.cwd // empty' <<<"$girdi")
[ -n "$dizin" ] || dizin=$PWD

# Yalnız git commit ve git push içeren komutlara bakılır.
grep -Eq '(^|[^[:alnum:]_])git[[:space:]].*(commit|push)' <<<"$komut" || exit 0

# Komut başka bir klasörde çalışacaksa (cd X && ... ya da git -C X) oraya bakılır.
hedef=$(sed -nE 's/^[[:space:]]*cd[[:space:]]+"?([^"[:space:];&|]+)"?.*/\1/p' <<<"$komut" | head -n1)
[ -n "$hedef" ] || hedef=$(grep -oE 'git[[:space:]]+-C[[:space:]]+"?[^"[:space:];&|]+' <<<"$komut" | head -n1 | sed -E 's/.*-C[[:space:]]+"?//')
if [ -n "$hedef" ]; then
  case "$hedef" in
    /*) depo=$hedef ;;
    "~"*) depo="$HOME${hedef#\~}" ;;
    *) depo="$dizin/$hedef" ;;
  esac
else
  depo=$dizin
fi
git -C "$depo" rev-parse --git-dir >/dev/null 2>&1 || exit 0

gizli_mi() {
  local ad=${1##*/}
  [[ $ad == .env* && $ad != .env.example ]]
}

adaylar=""

# Komutu parçalarına ayır (&&, ||, ;, |, satır sonu).
parcalar=$(sed -E 's/(&&|\|\||;|\|)/\n/g' <<<"$komut")

if grep -Eq 'git[[:space:]].*commit' <<<"$komut"; then
  # Kayda hazırlanmış dosyalar (silinenler hariç; gizli dosyayı silmek serbesttir).
  adaylar+=$(git -C "$depo" diff --cached --name-only --diff-filter=d 2>/dev/null)$'\n'

  # commit -a: değişmiş bütün izlenen dosyalar da kayda girer.
  if grep -Eq 'commit.*[[:space:]](--all|-[[:alpha:]]*a[[:alpha:]]*)([[:space:]]|$)' <<<"$komut"; then
    adaylar+=$(git -C "$depo" diff --name-only --diff-filter=d 2>/dev/null)$'\n'
  fi
fi

# Aynı komuttaki git add parçaları: adı geçen dosyalar ve zorla ekleme.
while IFS= read -r parca; do
  grep -Eq '(^|[[:space:]])git[[:space:]].*add([[:space:]]|$)' <<<"$parca" || continue
  for kelime in $(tr '"='"'" '   ' <<<"$parca"); do
    adaylar+="$kelime"$'\n'
  done
  # -f / --force ile yoksayılan gizli dosyalar da eklenebilir.
  if grep -Eq '[[:space:]](--force|-[[:alpha:]]*f[[:alpha:]]*)([[:space:]]|$)' <<<"$parca"; then
    adaylar+=$(git -C "$depo" ls-files --others --ignored --exclude-standard 2>/dev/null)$'\n'
  fi
done <<<"$parcalar"

if grep -Eq 'git[[:space:]].*push' <<<"$komut"; then
  # Henüz gönderilmemiş kayıtlardaki dosyalar.
  adaylar+=$(git -C "$depo" log --branches --not --remotes --name-only --format= --diff-filter=d 2>/dev/null)$'\n'
  # Kayda hazırlanmış dosyalar (aynı komutta önce commit varsa).
  adaylar+=$(git -C "$depo" diff --cached --name-only --diff-filter=d 2>/dev/null)$'\n'
fi

sorunlu=""
while IFS= read -r dosya; do
  [ -n "$dosya" ] || continue
  if gizli_mi "$dosya"; then
    case " $sorunlu " in *" $dosya "*) ;; *) sorunlu+="$dosya " ;; esac
  fi
done <<<"$adaylar"

[ -z "$sorunlu" ] || engelle "${sorunlu% }"
exit 0
