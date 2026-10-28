"""Import user-supplied media, matching stable IDs and reviewed book-title aliases."""
from pathlib import Path
import argparse, collections, hashlib, io, json, os, re, subprocess, zipfile
import pymupdf
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
def dump(path,data,prefix=''):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(prefix+json.dumps(data,ensure_ascii=False,separators=(',',':'))+(';' if prefix else '')+'\n',encoding='utf-8')
def normalize(s):
    return re.sub(r'[^a-z0-9]','',re.sub(r'^(a|an|the)\s+','',s.lower().strip()))

# Classification is independent of original learning levels. Every card has one theme.
GROUPS=[('animals','动物朋友'),('food','食物与饮品'),('colors','颜色与形状'),('school','学校与文具'),('home','居家物品'),('clothes','衣物与配饰'),('people','家人与职业'),('body','身体与健康'),('sports','运动与玩耍'),('actions','日常动作'),('places','地点与出行'),('nature','自然与天气'),('numbers','数字与时间'),('descriptions','感受与描述'),('language','方位与表达')]
ASSIGN={
'animals':{0:'51 81 83 84 85 86 87 88 90 96 116',1:'21 51 54 76 78 181 187 188 189',2:'170',3:'97 98 100 162',5:'30 173 177',6:'35 36'},
'food':{0:'102 104 105 138',1:'24 156 158 162 164 166',2:'28 106',3:'2 3',5:'1 3 9 11 12 13 15 18 19 20 23 140 151 153 168',6:'110 113 114'},
'school':{0:'32 34 35',1:'3 11 57 102',2:'1 3 4 9 13 14 24 38',3:'7 8 14 15 111 112',4:'71 76',6:'46'},
'home':{0:'111 117 133 151',1:'14 63 67 70 75 77 202',2:'30 40 41 42 131 133 136',3:'121',4:'14',5:'139'},
'clothes':{1:'101',3:'32 37 46',4:'16 21 22 27 28 157 158',6:'1 2 4 5 51 54'},
'people':{1:'23 83',2:'81 83 84 85 86 87 88 89 93',3:'82 85 86 88',4:'39 69 128 131 132 133',5:'88 90'},
'body':{0:'125 126 127 130 132',4:'135 141 142 145 148 151 160 191 197'},
'sports':{0:'5 9 68 135 144',1:'68 103 105 111 124 200',2:'53 57 58 62 63 69 146',3:'119 137 171 172 173',4:'9 18 116 168 171 210',5:'50 52 56 59 63 80 104 107 108 111 113 122 124 126 127',6:'17 126'},
'actions':{0:'1 55 74 75 76 100 139 146 147',1:'17 18 20 47 48 71 72',2:'20 43 44 95 97 98 121 142 144 160 162 190',3:'79 91 94 120 135 141 182',4:'52 61 63 101 120 122 123 164 167 199 200 204 206 211 212',5:'49 53 60 62 68 70 72 73 74 78 79 86 94 95 106 120 131 132',6:'11 13 15 18 57 116 118 119 120 123 141 142 162 163 165'},
'places':{3:'58 65 68 69 71 72 73 153 155 156 159 160 166 167',4:'178 180 181 182 183',5:'155 156 162',6:'34 64 66 81 83 85 94 101 102 105 106 108'},
'nature':{0:'92 94 113',1:'131 137 140',3:'123 161',4:'1 6 77 82 83 85',5:'136 138 141'},
'numbers':{0:'57 58 60 61 62',2:'25 196',3:'101 102 125 126 128',4:'67 188'},
'colors':{0:'14 38 40 42',1:'28 36 43',3:'50'},
'descriptions':{1:'92 113 115 116',2:'73',3:'52 80 187',4:'90 104 105 106 107 108',5:'35 38 40 43 46 48 143 144',6:'20 21 137 138 140'},
'language':{2:'140',3:'60 61',4:'70 109 110 111',6:'71 72 90'},
}

def flashcards(archive):
    path=ROOT/'public/flashcards/oxford/catalog.js'
    data=json.loads(path.read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
    mapping={}
    for category,levels in ASSIGN.items():
        for level,indices in levels.items():
            for i in indices.split():
                key=f'lgc{level}-{int(i):03}'
                assert key not in mapping,key
                mapping[key]=category
    z=zipfile.ZipFile(archive);names=[n for n in z.namelist() if n.endswith('.mp3')]
    byid=collections.defaultdict(list);byword=collections.defaultdict(list)
    for n in names:
        m=re.search(r'(lgc\d-\d{3})(.*)\.mp3$',n,re.I)
        if not m:continue
        byid[m[1]].append(n)
        label=re.sub(r'_20\d{6}.*$','',m[2].strip(' _-'))
        if label and label!='X':byword[normalize(label.replace('_',' '))].append(n)
    report=[]
    for c in data['cards']:
        assert c['id'] in mapping,('Unclassified',c['id'],c['label'])
        c['category']=mapping[c['id']]
        candidates=byid.get(c['id'],[]);method='stable-id'
        if not candidates:candidates=byword.get(normalize(c['label']),[]);method='exact-label'
        if candidates:
            payload=z.read(sorted(candidates)[0]);assert payload[:3]==b'ID3' or payload[0]==255
            target=ROOT/f"public/flashcards/supplement/{c['id']}.mp3"
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(payload)
            c['audio']='./flashcards/supplement/'+target.name
            report.append({'card':c['id'],'label':c['label'],'source':sorted(candidates)[0],'match':method,'sha256':hashlib.sha256(payload).hexdigest()})
    data['categories']=[{'id':i,'label':label} for i,label in GROUPS]
    dump(path,data,'window.JIGU_FLASHCARDS = ')
    dump(ROOT/'content/learning-supplement/flashcard-audio.json',report)
    print('Flashcards:',len(data['cards']),'classified;',len(report),'recordings matched',flush=True)

ALIASES={'cruch':'crunch','fizzbuzz':'thefizzbuzz','poshshop':'poshshops','therockandthering':'therookandthering','unclemaxandthetreasure':'unclemaxandthetreasue'}
def title_key(n):
    return re.sub('[^a-z]','',re.sub(r'^\d[+]?[-.]\d+[ .-]*','',Path(n).stem).lower())
def phonics(archive):
    ffmpeg=os.environ.get('FFMPEG','ffmpeg')
    ffprobe=os.environ.get('FFPROBE','ffprobe')
    z=zipfile.ZipFile(archive);pdfs=sorted(n for n in z.namelist() if n.endswith('.pdf'));audios=[n for n in z.namelist() if n.endswith('.mp3')]
    books=[];report=[];used=set()
    temp=ROOT/'.reading-audio/phonics-import';temp.mkdir(parents=True,exist_ok=True)
    for name in pdfs:
        level=int(name.split('/')[0]);number=int(re.search(r'-(\d+)',name)[1]);bookid=f'oxford-phonics-{level}-{number:02}'
        key=title_key(name);key=ALIASES.get(key,key)
        matches=[n for n in audios if n.split('/')[0]==str(level) and title_key(n)==key]
        assert len(matches)==1,(name,matches)
        audio=matches[0];assert audio not in used;used.add(audio)
        base=ROOT/'public/phonics/media'/bookid;base.mkdir(parents=True,exist_ok=True)
        raw=z.read(name);doc=pymupdf.open(stream=raw,filetype='pdf');pages=[]
        for i,page in enumerate(doc):
            target=base/f'{i+1:02}.webp'
            width=min(1200,max([int(page.rect.width)]+[im[2] for im in page.get_images(full=True)]));matrix=pymupdf.Matrix(width/page.rect.width,width/page.rect.width)
            if not target.exists() or Image.open(target).width!=width:
                pix=page.get_pixmap(matrix=matrix,alpha=False)
                Image.frombytes('RGB',[pix.width,pix.height],pix.samples).save(target,'WEBP',quality=82,method=4)
            with Image.open(target) as im:w,h=im.size
            pages.append({'image':f'./phonics/media/{bookid}/{target.name}','width':w,'height':h})
        source=temp/(bookid+'.mp3');target=base/'story.mp3'
        if not target.exists():
            source.write_bytes(z.read(audio))
            subprocess.run([ffmpeg,'-v','error','-y','-i',str(source),'-map_metadata','-1','-ac','1','-ar','44100','-c:a','libmp3lame','-b:a','64k',str(target)],check=True)
        duration=float(subprocess.check_output([ffprobe,'-v','error','-show_entries','format=duration','-of','csv=p=0',str(target)]));assert duration>10
        title=re.sub(r'^\d[+]?\.\d+\.','',Path(audio).stem).strip()
        if bookid=='oxford-phonics-6-06':title='Uncle Max and the Treasure'
        books.append({'id':bookid,'level':str(level),'levelLabel':'Level 1+' if level==1 else f'Level {level}','title':title,'cover':pages[0]['image'],'pages':pages,'audio':f'./phonics/media/{bookid}/story.mp3','duration':round(duration,2),'publisher':'Oxford University Press'})
        report.append({'id':bookid,'pdf':name,'audio':audio,'pdfSha256':hashlib.sha256(raw).hexdigest(),'audioSha256':hashlib.sha256(z.read(audio)).hexdigest(),'pages':len(pages),'duration':round(duration,2)})
        print(bookid,title,len(pages),'pages',flush=True)
    assert len(books)==len(used)==66
    dump(ROOT/'public/phonics/catalog.js',{'books':books},'window.JIGU_PHONICS = ')
    dump(ROOT/'content/learning-supplement/phonics-import.json',report)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--flashcards');p.add_argument('--phonics');a=p.parse_args()
    if a.flashcards:flashcards(a.flashcards)
    if a.phonics:phonics(a.phonics)
