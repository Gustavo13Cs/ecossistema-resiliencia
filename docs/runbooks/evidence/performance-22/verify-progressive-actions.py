# Verifica interações no build local com dados sintéticos, sem escrita em produção.
import asyncio, importlib.util, json, sys
from pathlib import Path
from playwright.async_api import async_playwright
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('measurement',str(Path(__file__).with_name('measure-progressive-loading.py')))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
async def main():
  results=[]
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for mobile in [False,True]:
      context=await browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900})
      page=await context.new_page(); errors=[]; requests=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      async def handle(route):
        path=m.urlparse(route.request.url).path
        if not route.request.url.startswith(m.BASE): await route.abort();return
        if not path.startswith('/api/'):
          await route.continue_();return
        api=path[4:];requests.append((route.request.method,api))
        data={'/auth/me':dict(user=dict(sub='p1',name='Profissional Sintético',role='NUTRITIONIST',email='prof@example.test'),csrfToken='synthetic-token'),'/clients':[m.CLIENT],'/lab-exams':m.EXAMS,'/lab-orders':[]}
        await route.fulfill(status=200,json=data.get(api,[]))
      await context.route('**/*',handle)
      await page.goto(m.BASE+'/exames')
      await page.get_by_role('button',name='Cards',exact=True).click()
      await page.get_by_role('button',name='Ver Aberto').first.wait_for()
      await page.get_by_role('button',name='Ver Aberto').first.click()
      await page.get_by_role('dialog',name='Cliente Sintético').wait_for()
      await page.keyboard.press('Escape')
      await page.get_by_role('dialog').wait_for(state='hidden')
      await page.get_by_role('button',name='Registrar Novo Laudo',exact=True).click()
      await page.get_by_role('dialog',name='Cadastrar Laudo de Exames Laboratoriais').wait_for()
      await page.get_by_role('button',name='Adicionar Marcador',exact=True).click()
      await page.keyboard.press('Escape')
      await page.get_by_role('dialog').wait_for(state='hidden')
      await page.get_by_role('button',name='Emitir Pedido de Exame',exact=True).click()
      await page.get_by_role('dialog',name='Emitir Pedido de Exames Padronizado').wait_for()
      await page.keyboard.press('Escape')
      await page.get_by_role('dialog').wait_for(state='hidden')
      await page.get_by_role('button',name='Comparativo Longitudinal').click()
      await page.get_by_role('heading',name='Comparativo Longitudinal de Biomarcadores').wait_for()
      # A seleção do marcador com dados deve produzir o SVG após o import.
      await page.locator('select').last.select_option(label='Glicemia em Jejum')
      await page.locator('.recharts-wrapper').wait_for()
      assert not errors,errors
      assert all(method=='GET' for method,_ in requests),requests
      results.append(dict(viewport='mobile' if mobile else 'desktop',checks=['drawer opens/closes','registry opens/adds marker/closes','order opens/closes','chart tab renders SVG'],errors=errors,writes=0))
      await context.close()
    for path,height in [('/clientes/c1',300),('/clientes/c1/exames',400)]:
      context=await browser.new_context(viewport={'width':390,'height':844})
      page=await context.new_page()
      async def slow_chart(route):
        request_path=m.urlparse(route.request.url).path
        if not route.request.url.startswith(m.BASE):
          await route.abort();return
        if request_path.endswith('.js'):
          file=m.ROOT/'.next'/request_path.removeprefix('/_next/')
          if file.exists() and 'recharts-responsive-container' in file.read_text():
            await asyncio.sleep(2)
        if request_path.startswith('/api/'):
          data={'/api/auth/me':dict(user=dict(sub='p1',name='Profissional Sintético',role='NUTRITIONIST'),csrfToken='synthetic-token'),'/api/clients/c1':m.CLIENT,'/api/assessments/client/c1':m.ASSESSMENTS,'/api/lab-exams/client/c1':m.EXAMS}
          await route.fulfill(status=200,json=data.get(request_path,[]));return
        await route.continue_()
      await context.route('**/*',slow_chart)
      await page.goto(m.BASE+path)
      loading=page.get_by_role('status',name='Carregando gráfico',exact=True)
      await loading.wait_for()
      box=await loading.bounding_box()
      assert box and box['height']==height,box
      await page.locator('.recharts-wrapper').first.wait_for()
      await loading.wait_for(state='hidden')
      results.append(dict(path=path,viewport='mobile',checks=['placeholder while chart chunk is delayed','reserved height','SVG replaces placeholder'],reservedHeight=height))
      await context.close()
    await browser.close()
  Path(__file__).with_name('actions.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
  print(json.dumps(results,ensure_ascii=False))
asyncio.run(main())
