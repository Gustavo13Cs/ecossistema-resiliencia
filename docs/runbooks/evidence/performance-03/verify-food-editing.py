# Exercita edição, exclusão e cadastro no catálogo com APIs locais sintéticas.
import argparse,asyncio,importlib.util,json,sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('catalogue_fixture',Path(__file__).with_name('measure-food-requests.py'))
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)

async def main():
  parser=argparse.ArgumentParser();parser.add_argument('--origin',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
  origin=args.origin.rstrip('/');assert urlparse(origin).hostname in ['127.0.0.1','localhost']
  rows=[{**fixture.FOOD,'id':'manual-old','name':'Alimento manual de teste','source':'MANUAL'}];mutations=[];catalogue=[];errors=[]
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    async def confirm(dialog):await dialog.accept()
    page.on('dialog',confirm)
    async def handler(route):
      request=route.request;path=urlparse(request.url).path
      if not request.url.startswith(origin) or request.headers.get('next-router-prefetch'):
        await route.abort();return
      if not path.startswith('/api/'):
        await route.continue_();return
      path=path[4:]
      if request.method=='GET':
        if path in ['/foods','/foods/search']:
          catalogue.append(path);await route.fulfill(status=200,json=rows);return
        data={'/auth/me':dict(user=dict(sub='p1',name='Profissional Sintético',role='NUTRITIONIST'),csrfToken='synthetic-token'),'/clients/c1':fixture.CLIENT,'/diet-plans/client/c1/active':None}
        await route.fulfill(status=200,json=data.get(path,None));return
      body=request.post_data_json if request.post_data else None
      mutations.append(dict(method=request.method,path=path,body=body))
      if request.method=='PUT' and path=='/foods/manual-old':
        rows[0]={**rows[0],**body};await route.fulfill(status=200,json=rows[0]);return
      if request.method=='DELETE' and path=='/foods/manual-old':
        rows.clear();await route.fulfill(status=200,json={'deleted':True});return
      if request.method=='POST' and path=='/foods':
        rows.append(dict(id='manual-new',**body));await route.fulfill(status=201,json=rows[-1]);return
      if request.method=='POST' and path=='/diet-plans':
        await route.fulfill(status=201,json={'id':'synthetic-plan'});return
      raise AssertionError(f'Escrita não prevista: {request.method} {path}')
    await page.route('**/*',handler)
    await page.goto(origin+'/clientes/c1/nova-dieta')
    await page.get_by_role('button',name='Buscar e Adicionar Alimento ou Receita').click()
    picker=page.get_by_role('dialog',name='Banco de Alimentos e Receitas')
    await picker.get_by_role('button',name='Editar Alimento manual de teste').click()
    form=page.get_by_role('dialog',name='Editar Alimento',exact=True)
    await form.get_by_placeholder('Ex: Panqueca de Aveia do Nutri').fill('Alimento renomeado')
    await form.get_by_role('button',name='Salvar Alterações',exact=True).click()
    await picker.get_by_role('button',name='Excluir Alimento renomeado').click()
    await picker.get_by_text('Alimento renomeado',exact=True).wait_for(state='hidden')
    await picker.get_by_role('button',name='Cadastrar Manualmente').click()
    form=page.get_by_role('dialog',name='Criar Alimento',exact=True)
    await form.get_by_placeholder('Ex: Panqueca de Aveia do Nutri').fill('Alimento novo')
    await form.get_by_role('button',name='Cadastrar no Banco').click()
    await page.get_by_role('spinbutton',name='Quantidade de Alimento novo').wait_for()
    await page.get_by_role('button',name='Finalizar',exact=True).click()
    for _ in range(30):
      if any(x['path']=='/diet-plans' for x in mutations):break
      await page.wait_for_timeout(100)
    assert [(x['method'],x['path']) for x in mutations]==[('PUT','/foods/manual-old'),('DELETE','/foods/manual-old'),('POST','/foods'),('POST','/diet-plans')],mutations
    plan=mutations[-1]['body'];assert plan['clientId']=='c1' and plan['meals'][0]['items'][0]['foodId']=='manual-new'
    assert not errors,errors
    assert catalogue==['/foods'],catalogue
    await browser.close()
  Path(args.output).write_text(json.dumps(dict(checks=['edit reflects response','delete removes unused food','create adds food to meal','save keeps client and food ids'],catalogueRequests=len(catalogue),mutations=mutations,errors=errors,productionAccess=False),ensure_ascii=False,indent=2)+'\n')
  print('Edição, exclusão, cadastro e prescrição: OK; catálogo GET',len(catalogue))

if __name__=='__main__':asyncio.run(main())
