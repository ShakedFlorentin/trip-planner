#!/bin/zsh
# shot.sh <frame> <lang> <outdir> : one 1080x1920 frame of guide.html at frame/30 seconds
i=$1; lang=$2; out=$3
t=$(printf "%.4f" $(echo "$i/30" | bc -l)); n=$(printf "%04d" $i)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1080,1920 --virtual-time-budget=500 \
  --user-data-dir=${out:?}/prof-$lang-$i --screenshot=$out/f$n.png "file://${0:A:h}/guide.html#t=$t&lang=$lang" >/dev/null 2>&1; rm -rf "${out:?}/prof-$lang-$i"
