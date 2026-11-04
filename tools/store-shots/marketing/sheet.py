import sys
from PIL import Image
alt=sys.argv[1]; n=int(sys.argv[2]) if len(sys.argv)>2 else 7
ims=[Image.open(f'out/{alt}/0{i}.png').convert('RGB').resize((330,717)) for i in range(1,n+1)]
sheet=Image.new('RGB',(340*n,717),(120,120,120))
for i,m in enumerate(ims): sheet.paste(m,(i*340,0))
sheet.save(f'out/{alt}-sheet.png'); print('sheet', sheet.size)
