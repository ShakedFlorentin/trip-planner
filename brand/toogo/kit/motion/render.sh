#!/bin/zsh
# Re-render the Toogo logo animation: 150 frames (5 s at 30 fps) from toogo-logo-motion.html, then the videos.
# Needs Google Chrome and ffmpeg. Edit the timings in the HTML, then run: ./render.sh
set -e
cd "${0:A:h}"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
F=$(mktemp -d)
HTML="file://$PWD/toogo-logo-motion.html"
shot() { local t=$(printf "%.4f" $(echo "$1/30" | bc -l)); local n=$(printf "%04d" $1)
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=500 --window-size=1080,1080 \
    --user-data-dir=$F/prof-$(($1 % 8)) --screenshot=$F/f$n.png "$HTML#t=$t" >/dev/null 2>&1 }
for i in {0..149}; do shot $i & (( i % 8 == 7 )) && wait; done; wait
X=(-c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -movflags +faststart)
ffmpeg -loglevel error -y -framerate 30 -i $F/f%04d.png $X toogo-logo-1x1.mp4
ffmpeg -loglevel error -y -framerate 30 -i $F/f%04d.png -vf "pad=1920:1080:420:0:color=0xfaf7f2" $X toogo-logo-16x9.mp4
ffmpeg -loglevel error -y -framerate 30 -i $F/f%04d.png -vf "pad=1080:1920:0:420:color=0xfaf7f2" $X toogo-logo-9x16.mp4
ffmpeg -loglevel error -y -framerate 30 -i $F/f%04d.png -vf "fps=20,scale=540:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=32[p];[b][p]paletteuse" toogo-logo.gif
rm -rf $F
echo done
