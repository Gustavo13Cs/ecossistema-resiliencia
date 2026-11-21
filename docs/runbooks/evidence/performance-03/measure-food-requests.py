# Conta chamadas reais do browser contra builds locais com APIs sintéticas.
import argparse, asyncio, json, time
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.async_api import async_playwright

FOOD=dict(id='rice',name='Arroz de teste',source='TACO',baseUnit='g',baseAmount=100,kcal=130,protein=3,carbs=28,fat=1,fiber=1,sodium=0,calcium=0,iron=0)
CLIENT=dict(id='c1',professionalId='p1',name='Cliente Sintético',email='cliente@example.test',phone=None,birthDate='1990-01-01',gender='F',goal='Teste',height=165,initialWeight=65,status='ACTIVE',createdAt='2026-09-01T12:00:00Z',updatedAt='2026-11-01T12:00:00Z')
for key in ['allergies','pathologies','typicalSleep','stressLevel','foodRelationship','psychologyHistory','exerciseType','exerciseFrequency','exerciseDuration','hasPersonal','workActivityLevel','professionalNotes','privacyNotes']:CLIENT[key]=None

async def main():
  parser=argparse.ArgumentParser();parser.add_argument('--origin',required=True);parser.add_argument('--output',required=True);parser.add_argument('--expect-single',action='store_true');args=parser.parse_args()
  origin=args.origin.rstrip('/');assert urlparse(origin).hostname in ['localhost','127.0.0.1']
  trace=[];writes=[];errors=[];phase='initial';started=time.perf_counter()
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=await browser.new_context(viewport={'width':1440,'height':900})
    page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    async def route_handler(route):
      request=route.request;u=urlparse(request.url)
      if not request.url.startswith(origin) or request.headers.get('next-router-prefetch'):
        await route.abort();return
      if not u.path.startswith('/api/'):
        await route.continue_();return
      path=u.path[4:];query=parse_qs(u.query)
      if request.method=='GET':
        if path in ['/foods','/foods/search']:
          trace.append(dict(phase=phase,path=path,query=query,atMs=(time.perf_counter()-started)*1000))
          await route.fulfill(status=200,json=[FOOD]);return
        data={'/auth/me':dict(user=dict(sub='p1',name='Profissional Sintético',email='prof@example.test',role='NUTRITIONIST'),csrfToken='synthetic-token'),'/clients/c1':CLIENT,'/diet-plans/client/c1/active':None,'/foods/rice/preference':None}
        await route.fulfill(status=200,json=data.get(path,[]));return
      if request.method=='POST' and path=='/diet-plans':
        writes.append(dict(path=path,body=request.post_data_json));await route.fulfill(status=201,json={'id':'plan-synthetic'});return
      raise AssertionError(f'Escrita não prevista: {request.method} {path}')
    await context.route('**/*',route_handler)
    await page.goto(origin+'/clientes/c1/nova-dieta',timeout=60000)
    trigger=page.get_by_role('button',name='Buscar e Adicionar Alimento ou Receita')
    await trigger.wait_for()
    # Aguarda também o debounce antigo de 500 ms para detectar chamadas tardias.
    await page.wait_for_timeout(850)
    await trigger.click()
    dialog=page.get_by_role('dialog',name='Banco de Alimentos e Receitas')
    await dialog.get_by_text('Arroz de teste',exact=True).wait_for()
    phase='source-TACO';await dialog.get_by_role('button',name='TACO',exact=True).click();await page.wait_for_timeout(850)
    phase='search';search=dialog.get_by_role('textbox',name='Buscar alimentos')
    await search.fill('ar');await page.wait_for_timeout(150);await search.fill('arroz');await page.wait_for_timeout(850)
    phase='clear';await search.fill('');await page.wait_for_timeout(850)
    phase='source-TODAS';await dialog.get_by_role('button',name='TODAS',exact=True).click();await page.wait_for_timeout(850)
    phase='reopen';await dialog.get_by_role('button',name='Fechar seletor').click();await trigger.click();await page.wait_for_timeout(850)
    phase='add-and-save';await dialog.get_by_role('button',name='Add',exact=True).click();await dialog.wait_for(state='hidden')
    await page.get_by_role('spinbutton',name='Quantidade de Arroz de teste').wait_for()
    await page.get_by_role('button',name='Finalizar',exact=True).click()
    # O salvamento só ocorre no interceptador local, sem API/banco real.
    for _ in range(30):
      if writes:break
      await page.wait_for_timeout(100)
    assert len(writes)==1,writes
    assert writes[0]['body']['clientId']=='c1'
    assert writes[0]['body']['meals'][0]['items'][0]['foodId']=='rice'
    assert not errors,errors
    await browser.close()
  counts={name:sum(r['phase']==name for r in trace) for name in ['initial','source-TACO','search','clear','source-TODAS','reopen','add-and-save']}
  result=dict(origin=origin,method={'fixture':'one synthetic food; private session intercepted in browser','scope':'catalogue GET requests only; no production traffic','settleMs':850,'debounceMs':500,'viewport':'1440x900'},counts=counts,totalCatalogueRequests=len(trace),trace=trace,saveChecks={'singleSyntheticSave':True,'clientId':'c1','foodId':'rice'},errors=errors)
  Path(args.output).parent.mkdir(parents=True,exist_ok=True);Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
  print(json.dumps(counts), 'total',len(trace))
  if args.expect_single:assert counts=={'initial':1,'source-TACO':1,'search':1,'clear':1,'source-TODAS':1,'reopen':0,'add-and-save':0},counts

if __name__=='__main__':asyncio.run(main())
