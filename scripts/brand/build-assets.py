import json,os
d=json.load(open('/tmp/brand/word.json')); WM=d['main']; DOTS=d['dots']; WW=d['width']
NAVY="#041B5E"; TEAL="#0AEBCB"; TEAL_L="#08B9A0"; WHITE="#F5FAFF"
OUT="/home/claude/webineer/public/brand"
Wpath="M32 52L60 114L80 72L100 114L128 52"
def mark(tile,glyph,x=0,y=0,size=160,rx=42):
    k=size/160
    return f'<g transform="translate({x} {y}) scale({k})"><rect width="160" height="160" rx="{rx}" fill="{tile}"/><path d="{Wpath}" stroke="{glyph}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></g>'
def word(fill,dot,x,base,size):
    k=size/100
    return f'<g transform="translate({x} {base}) scale({k})"><path d="{WM}" fill="{fill}"/><path d="{DOTS}" fill="{dot}"/></g>'
def svg(w,h,title,body):
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t"><title id="t">{title}</title>{body}</svg>\n'
def horizontal(tile,glyph,wfill,dot,title):
    S=56; fs=42; k=fs/100
    base=S/2+ (72.6*k)/2   # centre the ascender height on the tile
    wx=S+16; w=round(wx+WW*k,1)
    return svg(w,S,title,mark(tile,glyph,0,0,S,15)+word(wfill,dot,wx,round(base,2),fs)), w, S, base
def wordonly(wfill,dot,title):
    k=0.6; h=round(76*k+6,1); w=round(WW*k,1)
    return svg(w,h,title,word(wfill,dot,0,round(72.6*k+2,2),60))
def icon(tile,glyph,title,size=512):
    return svg(size,size,title,mark(tile,glyph,0,0,size,round(size*0.26)))
files={}
for name,(t,g,wf,dt,ti) in {
 'logo-primary':(NAVY,TEAL,NAVY,TEAL_L,'Webineer logo'),
 'logo-light':(NAVY,TEAL,NAVY,TEAL_L,'Webineer logo for light backgrounds'),
 'logo-dark':(TEAL,NAVY,WHITE,TEAL,'Webineer logo for dark backgrounds'),
 'webineer-logo':(NAVY,TEAL,NAVY,TEAL_L,'Webineer logo'),
 'webineer-logo-light':(NAVY,TEAL,NAVY,TEAL_L,'Webineer logo for light backgrounds'),
 'webineer-logo-dark':(TEAL,NAVY,WHITE,TEAL,'Webineer logo for dark backgrounds')}.items():
    files[name+'.svg']=horizontal(t,g,wf,dt,ti)[0]
files['webineer-wordmark.svg']=wordonly(NAVY,TEAL_L,'Webineer wordmark')
files['webineer-wordmark-light.svg']=files['webineer-wordmark.svg']
files['webineer-wordmark-dark.svg']=wordonly(WHITE,TEAL,'Webineer wordmark for dark backgrounds')
for n in ('logo-icon','webineer-icon','webineer-icon-light'): files[n+'.svg']=icon(NAVY,TEAL,'Webineer icon')
files['webineer-icon-dark.svg']=icon(TEAL,NAVY,'Webineer icon for dark backgrounds')
for n,v in files.items(): open(f'{OUT}/{n}','w').write(v)
open('/home/claude/webineer/public/favicon.svg','w').write(icon(NAVY,TEAL,'Webineer',256))
open('/home/claude/webineer/src/app/icon.svg','w').write(icon(NAVY,TEAL,'Webineer',256))
print(len(files),'files; horizontal',horizontal(NAVY,TEAL,NAVY,TEAL,'x')[1:])
