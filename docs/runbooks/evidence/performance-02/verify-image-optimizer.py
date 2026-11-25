# Verifica o otimizador real do Next no servidor local, sem banco ou APIs externas.
import asyncio, io, json, time, os
from urllib.parse import urlparse
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
BASE=os.environ.get('PERF02_IMAGE_ORIGIN','http://127.0.0.1:3102').rstrip('/')
assert urlparse(BASE).hostname in ['127.0.0.1','localhost'], 'Verificação restrita ao servidor local'
OUT=Path(__file__).with_name(os.environ.get('PERF02_RESULT_FILE','optimizer.json'))
async def main():
  results=[];denied=[]
  async with async_playwright() as p:
    context=await p.request.new_context()
    for width in [20,24,32,36,40,48,60,64,72,96,108]:
      for accept,fmt in [('image/avif,image/webp','AVIF'),('image/webp','WEBP')]:
        url=f'{BASE}/_next/image?url=%2Flogo.png&w={width}&q=85';start=time.perf_counter()
        response=await context.get(url,headers={'Accept':accept});body=await response.body()
        elapsed=(time.perf_counter()-start)*1000
        assert response.status==200, (url,response.status,await response.text())
        with Image.open(io.BytesIO(body)) as image:
          assert (image.width,image.height,image.format)==(width,width,fmt),(width,image.size,image.format)
          assert image.mode=='RGBA',image.mode
          result=dict(width=width,format=fmt,bodyBytes=len(body),mode=image.mode,elapsedMs=elapsed,cache=response.headers.get('x-nextjs-cache'),vary=response.headers.get('vary'),cacheControl=response.headers.get('cache-control'))
        results.append(result)
    response=await context.get(BASE+'/_next/image?url=%2Flogo.png&w=36&q=85',headers={'Accept':'image/png'})
    assert response.status==200
    with Image.open(io.BytesIO(await response.body())) as image:
      assert image.format=='PNG' and image.size==(36,36) and ('A' in image.getbands() or 'transparency' in image.info), (image.format,image.size,image.mode)
      fallback=dict(status=response.status,width=image.width,mode=image.mode,transparency=('A' in image.getbands() or 'transparency' in image.info))
    for query in ['url=%2Fapi%2Fclients&w=36&q=85','url=https%3A%2F%2Fexample.com%2Flogo.png&w=36&q=85','url=%2Flogo.png%3Fextra%3D1&w=36&q=85','url=%2Ficon.svg&w=36&q=85','url=%2Flogo.png&w=37&q=85','url=%2Flogo.png&w=36&q=100']:
      response=await context.get(BASE+'/_next/image?'+query,headers={'Accept':'image/avif,image/webp'})
      assert response.status==400,(query,response.status)
      denied.append(dict(query=query,status=response.status))
    await context.dispose()
  OUT.write_text(json.dumps(dict(results=results,fallbackPng=fallback,denied=denied),ensure_ascii=False,indent=2)+'\n')
  for row in results: print(row['width'],row['format'],row['bodyBytes'],round(row['elapsedMs'],1),row['cache'])
  print('Bloqueios:',len(denied))
asyncio.run(main())
