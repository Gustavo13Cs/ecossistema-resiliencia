# API e PostgreSQL locais reais; sessão sintética, sem tráfego de produção.
import argparse, asyncio, json, re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright, expect
OWNER='79000000-0000-4000-8000-000000000001'
async def main():
    parser=argparse.ArgumentParser();parser.add_argument('--origin',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
    origin=args.origin.rstrip('/');assert urlparse(origin).hostname in ['localhost','127.0.0.1']
    errors=[];trace=[];checks=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width,height in [(1440,900),(390,844)]:
            context=await browser.new_context(viewport={'width':width,'height':height},extra_http_headers={'x-test-user-id':OWNER,'x-test-role':'NUTRITIONIST'})
            async def route_handler(route):
                u=urlparse(route.request.url)
                if not route.request.url.startswith(origin) or route.request.headers.get('next-router-prefetch'):await route.abort();return
                if u.path=='/api/auth/me':
                    await route.fulfill(status=200,json={'user':{'sub':OWNER,'name':'Profissional sintético','role':'NUTRITIONIST','email':'pagination@example.test'},'csrfToken':'synthetic-token'});return
                await route.continue_()
            await context.route('**/*',route_handler)
            page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            async def response_handler(response):
                u=urlparse(response.url)
                if u.path in ['/api/clients','/api/lab-exams','/api/lab-orders','/api/lab-exams/longitudinal']:
                    body=await response.json();trace.append({'width':width,'path':u.path,'query':parse_qs(u.query),'status':response.status,'rows':len(body if isinstance(body,list) else body.get('items',[]))})
            page.on('response',response_handler)
            await page.goto(origin+'/clientes')
            nav=page.get_by_role('navigation',name='Paginação de clientes')
            await expect(nav).to_contain_text('1–25 de 600')
            await nav.get_by_role('button',name='Próxima',exact=True).click();await expect(nav).to_contain_text('26–50 de 600')
            search=page.get_by_role('searchbox',name='Buscar clientes')
            await search.fill('100%');await expect(nav).to_contain_text('1–1 de 1')
            await page.get_by_role('link',name='Abrir prontuário de Cliente100%literal').wait_for()
            await search.fill('');await expect(nav).to_contain_text('1–25 de 600')
            await page.get_by_role('button',name='Arquivar cliente Cliente0001',exact=True).click()
            await page.get_by_role('button',name='Confirmar arquivamento',exact=True).click();await expect(nav).to_contain_text('de 599')
            await page.get_by_role('button',name='Arquivados',exact=True).click();await expect(nav).to_contain_text('1–1 de 1')
            await page.get_by_role('button',name='Restaurar cliente Cliente0001',exact=True).click()
            await page.get_by_role('button',name='Confirmar restauração',exact=True).click();await expect(nav).to_contain_text('0–0 de 0')
            await page.get_by_role('button',name='Ativos',exact=True).click();await expect(nav).to_contain_text('1–25 de 600')
            bounds=await nav.bounding_box();assert bounds['x']+bounds['width']<=width+1
            checks.append({'width':width,'clients':'next/search/archive/restore/reset/fit passed'})
            await page.goto(origin+'/exames')
            exams=page.get_by_role('navigation',name='Paginação de exames');await expect(exams).to_contain_text('1–25 de 600')
            assert not any(row['path'].endswith('/longitudinal') and row['width']==width for row in trace)
            await exams.get_by_role('button',name='Próxima',exact=True).click();await expect(exams).to_contain_text('26–50 de 600')
            search=page.get_by_placeholder('Buscar por paciente, laboratório ou marcador...')
            await search.press_sequentially('glicemia',delay=35);await expect(search).to_have_value('glicemia');await expect(search).to_be_focused();await expect(exams).to_contain_text('1–25 de 600')
            await search.fill('Marcador próprio');await expect(exams).to_contain_text('1–1 de 1');await expect(page.get_by_text('600',exact=True).first).to_be_visible()
            await search.fill('');await expect(exams).to_contain_text('1–25 de 600')
            await page.locator('select').nth(1).select_option('ALERT');await expect(exams).to_contain_text('1–25 de 200')
            await page.locator('select').nth(2).select_option('VITAMINS_MINERALS');await expect(exams).to_contain_text('1–25 de 200')
            await page.get_by_role('button',name='Limpar',exact=True).click();await expect(exams).to_contain_text('1–25 de 600')
            await page.get_by_role('button',name=re.compile('Pedidos Emitidos')).click()
            orders=page.get_by_role('navigation',name='Paginação de pedidos');await expect(orders).to_contain_text('1–25 de 60')
            await orders.get_by_role('button',name='Próxima',exact=True).click();await expect(orders).to_contain_text('26–50 de 60')
            await page.get_by_role('button',name='Comparativo Longitudinal',exact=True).click();await expect(page.get_by_text('600 laudos',exact=True)).to_be_visible(timeout=30000)
            checks.append({'width':width,'exams':'next/global KPIs/custom search/status + category/orders next/all 600 graph points passed'})
            await context.close()
        await browser.close()
    assert not errors,errors
    assert all(row['status']==200 and row['rows']<=int(row['query'].get('pageSize',['100'])[0]) for row in trace),trace
    Path(args.output).write_text(json.dumps({'scope':'Production Next + local Nest/PostgreSQL/RLS; auth/me and JWT guard synthetic; no production traffic','checks':checks,'errors':errors,'requests':trace},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(checks,ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())
