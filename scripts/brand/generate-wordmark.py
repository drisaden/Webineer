import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
f=TTFont('/tmp/font/node_modules/@fontsource/outfit/files/outfit-latin-700-normal.woff')
gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
text="Webineer"; size=100; s=size/upm; track=-1.5
x=0; main=[]; dots=[]
import re
for ch in text:
    g=cmap[ord(ch)]; gl=gs[g]
    pen=SVGPathPen(gs, ntos=lambda v:("%.2f"%v).rstrip('0').rstrip('.'))
    tp=TransformPen(pen,(s,0,0,-s,x,0)); gl.draw(tp)
    d=pen.getCommands()
    if ch=='i':
        # split contours: dot is the one with smallest y (top, after flip most negative)
        parts=re.findall(r'M[^M]*',d)
        def ymin(p): 
            ys=[float(v) for v in re.findall(r'-?\d+\.?\d*',p)[1::2]]; return min(ys)
        parts.sort(key=ymin)
        dots.append(parts[0]); main.append(''.join(parts[1:]))
    else: main.append(d)
    x+=gl.width*s+track
W=x-track
bp=BoundsPen(gs)
# bounds approx: cap height ~ 70, descender none
json.dump({"main":' '.join(main),"dots":' '.join(dots),"width":round(W,2)},open('/tmp/brand/word.json','w'))
print(W, len(' '.join(main)))
