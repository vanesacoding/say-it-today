"""Split reviewed Oxford spreads, omit empty scan pages, create single-front covers.

Original images remain immutable for existing caches and reproducible imports.
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageOps
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
CATALOG=ROOT/'public/phonics/catalog.js'
SOURCE=ROOT/'content/learning-supplement/phonics-original-layout.json'
def dump(path,data,prefix=''):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(prefix+json.dumps(data,ensure_ascii=False,separators=(',',':'))+(';' if prefix else '')+'\n',encoding='utf-8')
if not SOURCE.exists():
    original=json.loads(CATALOG.read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
    assert all(not b.get('layoutVersion') for b in original['books'])
    dump(SOURCE,original)
data=json.loads(SOURCE.read_text(encoding='utf-8'));report={'version':2,'splitSources':[],'removed':[],'covers':[]};removed_previews=[]
def blank(im):
    # True blanks in this batch are almost pure white. Keep sparse text/artwork.
    sample=im.convert('L').resize((200,200));hist=sample.histogram()
    white=sum(hist[246:])/40000
    edge=sample.filter(ImageFilter.FIND_EDGES).crop((3,3,197,197));eh=edge.histogram();ink=sum(eh[35:])/(194*194)
    return white>.995 and ink<.0015
def trim_cover(im):
    gray=im.convert('L');mask=gray.point(lambda n:255 if n<242 else 0)
    bbox=mask.getbbox()
    if not bbox:return im
    pad=max(2,int(min(im.size)*.008));x0,y0,x1,y1=bbox
    return im.crop((max(0,x0-pad),max(0,y0-pad),min(im.width,x1+pad),min(im.height,y1+pad)))
for b in data['books']:
    original=b['pages'];pages=[];cover_image=None
    for source_index,p in enumerate(original):
        path=ROOT/'public'/p['image'][2:]
        with Image.open(path) as src:im=src.convert('RGB')
        wide=im.width/im.height>1.12
        panels=[('left',(0,0,im.width//2,im.height)),('right',(im.width//2,0,im.width,im.height))] if wide else [('full',(0,0,im.width,im.height))]
        if wide:report['splitSources'].append({'book':b['id'],'sourcePage':source_index,'image':p['image']})
        for panel,box in panels:
            part=im.crop(box)
            if blank(part):
                report['removed'].append({'book':b['id'],'sourcePage':source_index,'panel':panel})
                removed_previews.append((f"{b['id'].replace('oxford-phonics-','')} p{source_index+1} {panel}",part.copy()))
                continue
            if cover_image is None:cover_image=part.copy()
            item={**p,'sourcePage':source_index,'sourcePanel':panel}
            if wide:
                name=f'{source_index+1:02}-{panel}.webp';target=ROOT/'public/phonics/pages-v2'/b['id']/name;target.parent.mkdir(parents=True,exist_ok=True)
                if not target.exists():part.save(target,'WEBP',quality=88,method=4)
                item.update(image=f'./phonics/pages-v2/{b["id"]}/{name}',width=part.width,height=part.height)
            pages.append(item)
    assert pages and cover_image is not None
    cover=trim_cover(cover_image);cover.thumbnail((500,700))
    cover_path=ROOT/'public/phonics/pages-v2'/b['id']/'cover.webp';cover_path.parent.mkdir(parents=True,exist_ok=True)
    if not cover_path.exists():cover.save(cover_path,'WEBP',quality=88,method=4)
    b.update(pages=pages,cover=f'./phonics/pages-v2/{b["id"]}/cover.webp',coverWidth=cover.width,coverHeight=cover.height,layoutVersion=2,originalPageCount=len(original))
    report['covers'].append({'book':b['id'],'width':cover.width,'height':cover.height})
dump(CATALOG,data,'window.JIGU_PHONICS = ')
report['originalPages']=sum(b['originalPageCount'] for b in data['books']);report['readingPages']=sum(len(b['pages']) for b in data['books'])
dump(ROOT/'content/learning-supplement/phonics-layout-report.json',report)
# A compact visual audit artifact, kept outside the published site.
if removed_previews:
    from PIL import ImageDraw
    output=ROOT/'../../outputs/phonics-layout';output.mkdir(parents=True,exist_ok=True)
    canvas=Image.new('RGB',(1200,((len(removed_previews)+7)//8)*155),'#e9e4db');draw=ImageDraw.Draw(canvas)
    for i,(label,im) in enumerate(removed_previews):
        im=ImageOps.contain(im,(140,125));x=(i%8)*150;y=(i//8)*155;canvas.paste(im,(x+(150-im.width)//2,y));draw.text((x+2,y+130),label,fill='black')
    canvas.save(output/'removed-pages.jpg')
print(f"Phonics: {len(report['splitSources'])} spread sources, {len(report['removed'])} empty pages/panels removed; {report['originalPages']} source pages -> {report['readingPages']} reading pages; 66 single-front covers")
