#!/usr/bin/env bash
# Geçmiş kalkanı.
# Claude bir dosyayı düzenlemeden ya da yazmadan önce çalışır.
# Dosya .git klasörünün içindeyse işlemi durdurur; projenin kayıt geçmişi elle değiştirilmez.
# Çıkış kodu 2 işlemi durdurur, hata çıktısındaki yazı Claude'a iletilir.
set -u

girdi=$(cat)

engelle() {
  echo "Engellendi: $1 dosyası .git klasörünün içinde. Bu klasör projenin kayıt geçmişidir, elle değiştirilemez; değişiklik yalnız git komutlarıyla yapılır." >&2
  exit 2
}

# jq yoksa kalkan girdiyi okuyamaz. Girdide .git geçiyorsa durdur.
if ! command -v jq >/dev/null 2>&1; then
  if grep -q '\.git' <<<"$girdi"; then
    echo "Engellendi: geçmiş kalkanı çalışamadı, jq aracı kurulu değil" >&2
    exit 2
  fi
  exit 0
fi

yol=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$girdi")
[ -n "$yol" ] || exit 0
dizin=$(jq -r '.cwd // empty' <<<"$girdi")
[ -n "$dizin" ] || dizin=$PWD

case "$yol" in
  /*) tam=$yol ;;
  *) tam="$dizin/$yol" ;;
esac

# Yolun kendisine ve kısayollar çözülmüş hâline bak.
gercek=$(realpath -m -- "$tam" 2>/dev/null || echo "$tam")
for aday in "$tam" "$gercek"; do
  case "/$aday/" in
    */.git/*) engelle "$yol" ;;
  esac
done
exit 0
