# Benchmark local com sessão e APIs sintéticas; não conecta à produção.
import argparse, asyncio, hashlib, io, json
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from PIL import Image
from playwright.async_api import async_playwright

BASE='http://127.0.0.1:3102'
ROOT=Path(__file__).resolve().parents[4]
USER=dict(sub='p1',name='Profissional Sintético',email='prof@example.test',role='NUTRITIONIST')
CLIENT=dict(id='c1',name='Cliente Sintético',status='ACTIVE',professionalId='p1',createdAt='2026-09-01T12:00:00Z',updatedAt='2026-11-01T12:00:00Z')

async def measure(browser,path,label,width,dpr,out_dir,phase):
  context=await browser.new_context(viewport={'width':width,'height':900 if width>1000 else 844},device_scale_factor=dpr,is_mobile=width<1000,has_touch=width<1000)
  page=await context.new_page();errors=[];responses=[];pending=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  async def route_handler(route):
    request=route.request;u=urlparse(request.url)
    if u.hostname not in ['127.0.0.1','localhost'] or request.headers.get('next-router-prefetch'):
      await route.abort();return
    if u.path.startswith('/api/'):
      if path!='/clientes' and u.path in ['/api/auth/me','/api/auth/refresh']:
        await route.fulfill(status=401,json={'message':'Sessão ausente no cenário público'});return
      assert request.method=='GET', 'Benchmark não permite escritas'
      data={'/api/auth/csrf':dict(csrfToken='synthetic-token'),'/api/auth/me':dict(user=USER,csrfToken='synthetic-token'),'/api/clients':[CLIENT],'/api/users/p1':USER}
      await route.fulfill(status=200,json=data.get(u.path,[]));return
    await route.continue_()
  await context.route('**/*',route_handler)
  async def on_response(response):
    if response.request.resource_type!='image':return
    body=await response.body(); u=urlparse(response.url)
    with Image.open(io.BytesIO(body)) as image:
      physical=dict(width=image.width,height=image.height,format=image.format,mode=image.mode)
    responses.append(dict(path=u.path+('?' + u.query if u.query else ''),status=response.status,bodyBytes=len(body),sha256=hashlib.sha256(body).hexdigest(),contentType=response.headers.get('content-type'),cache=response.headers.get('x-nextjs-cache'),vary=response.headers.get('vary'),**physical))
  page.on('response',lambda r:pending.append(asyncio.create_task(on_response(r))))
  cdp=await context.new_cdp_session(page)
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
  await page.add_init_script('''window.perf02={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.perf02.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.perf02.cls+=e.value}).observe({type:'layout-shift',buffered:true});''')
  await page.goto(BASE+path)
  if path=='/clientes':
    await page.get_by_role('heading',name='Clientes',exact=True).wait_for()
    if width<1000:
      await page.get_by_role('button',name='Abrir menu',exact=True).click()
      await page.get_by_role('dialog',name='Menu de navegação').wait_for()
  elif path=='/auth/login': await page.get_by_role('heading',name='Entrar no SafeMove').wait_for()
  elif path=='/auth/register': await page.get_by_role('heading',name='Criar conta profissional').wait_for()
  else: await page.get_by_role('navigation',name='Navegação principal').wait_for()
  await page.wait_for_load_state('networkidle')
  assert urlparse(page.url).path==path, page.url
  await page.evaluate('''Promise.all(Array.from(document.images).filter(i=>i.getBoundingClientRect().width>0&&i.getBoundingClientRect().height>0&&i.getBoundingClientRect().bottom>0&&i.getBoundingClientRect().top<innerHeight).map(i=>i.decode()))''')
  await asyncio.gather(*pending)
  images=await page.locator('img').evaluate_all('''els=>els.map(i=>({src:i.getAttribute('src'),currentSrc:i.currentSrc ? new URL(i.currentSrc).pathname+new URL(i.currentSrc).search : null,sizes:i.sizes,loading:i.loading,fetchPriority:i.fetchPriority,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,cssWidth:i.getBoundingClientRect().width,cssHeight:i.getBoundingClientRect().height,inViewport:i.getBoundingClientRect().bottom>0&&i.getBoundingClientRect().top<innerHeight,visible:i.getClientRects().length>0&&i.getBoundingClientRect().width>0,complete:i.complete}))''')
  for i in images:
    if i['visible'] and i['inViewport']:assert i['complete'] and i['naturalWidth']>0,i
  if path=='/' or path=='/auth/login' or path=='/clientes':
    visible=page.locator('img:visible').first
    await visible.screenshot(path=str(out_dir/f'{phase}-{label}-{path.strip("/").replace("/","-") or "landing"}.png'))
  performance=await page.evaluate('''({lcpMs:window.perf02.lcp,cls:window.perf02.cls,images:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='img'||new URL(r.name).pathname==='/_next/image'||new URL(r.name).pathname==='/logo.png').map(r=>({path:new URL(r.name).pathname+new URL(r.name).search,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,durationMs:r.duration}))})''')
  result=dict(route=path,viewport=label,width=width,dpr=dpr,images=images,responses=responses,totalImageBodyBytes=sum(x['bodyBytes'] for x in responses),imageRequests=len(responses),performance=performance,errors=errors)
  assert not errors,errors
  await context.close(); return result

async def main():
  p=argparse.ArgumentParser();p.add_argument('--phase',choices=['before','after'],required=True);p.add_argument('--output',required=True);a=p.parse_args()
  out_dir=Path(a.output).parent;out_dir.mkdir(parents=True,exist_ok=True)
  results=[]
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for label,width,dpr in [('desktop-1x',1440,1),('desktop-2x',1440,2),('mobile-3x',390,3)]:
      for path in ['/','/auth/login','/auth/register','/clientes']:
        r=await measure(browser,path,label,width,dpr,out_dir,a.phase);results.append(r)
        print(label,path,r['totalImageBodyBytes'],[(x['format'],x['width'],x['bodyBytes']) for x in r['responses']],flush=True)
    await browser.close()
  Path(a.output).write_text(json.dumps(dict(phase=a.phase,method={'origin':BASE,'viewports':['1440x900 DPR1','1440x900 DPR2','390x844 DPR3'],'api':'synthetic browser interception; no production access','cache':'browser disabled; server cache recorded','metric':'response body bytes of image requests; all visible images decoded','timings':'local; not Lighthouse or RUM'},results=results),ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__': asyncio.run(main())
