# Medição local de build com APIs sintéticas; nunca acessa dados de produção.
# Requer Playwright e Chromium disponíveis no ambiente, sem dependência nova no app.
import argparse, asyncio, json, gzip
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[4] / 'web'
BASE = 'http://127.0.0.1:3101'
CLIENT = dict(id='c1', professionalId='p1', name='Cliente Sintético', email='teste@example.test', phone=None, birthDate=None, gender='F', goal='Teste', status='ACTIVE', height=165, initialWeight=65, createdAt='2026-09-01T12:00:00Z', updatedAt='2026-11-01T12:00:00Z')
for k in ['allergies','pathologies','typicalSleep','stressLevel','foodRelationship','psychologyHistory','exerciseType','exerciseFrequency','exerciseDuration','hasPersonal','workActivityLevel','professionalNotes','privacyNotes']:
    CLIENT[k] = None
ASSESSMENTS = [dict(id=f'a{i}', clientId='c1', date=date, weight=65-i, bodyFat=25-i, muscleMass=40+i, waist=75-i, hips=95, squat1RM=75+i, benchPress1RM=40+i, deadlift1RM=90+i, client={'id':'c1','name':CLIENT['name']}) for i,date in enumerate(['2026-09-01T12:00:00Z','2026-11-01T12:00:00Z'])]
EXAMS = [dict(id=f'e{i}', clientId='c1', client={'id':'c1','name':CLIENT['name']}, date=d, createdAt=d, notes='Registro sintético', markers=[dict(id=f'm{i}', name='Glicemia em Jejum',value=90+i,unit='mg/dL')]) for i,d in enumerate(['2026-09-01T12:00:00Z','2026-11-01T12:00:00Z'])]

async def scenario(browser, name, path, role='NUTRITIONIST', empty=False):
    context = await browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = await context.new_page()
    errors, unknown, posts = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    async def route_handler(route):
        request=route.request
        u=urlparse(request.url)
        if u.hostname not in ['127.0.0.1','localhost']:
            await route.abort(); return
        if request.headers.get('next-router-prefetch') or request.headers.get('purpose')=='prefetch':
            await route.abort(); return
        if not u.path.startswith('/api/'):
            await route.continue_(); return
        api=u.path[4:]
        user=dict(sub='p1',id='p1',name='Profissional Sintético',email='prof@example.test',role=role)
        data={
          '/auth/me':dict(user=user,csrfToken='synthetic-token'), '/auth/csrf':dict(csrfToken='synthetic-token'),
          '/clients':[CLIENT], '/clients/c1':CLIENT, '/users/p1':user,
          '/assessments':ASSESSMENTS, '/assessments/client/c1':[] if empty else ASSESSMENTS,
          '/lab-exams':EXAMS, '/lab-exams/client/c1':[] if empty else EXAMS, '/lab-orders':[],
          '/workouts/client/c1/overview':dict(client=dict(id='c1',status='ACTIVE'), activeWorkout=None,recentAssessments=ASSESSMENTS),
        }
        if request.method not in ['GET','OPTIONS']:
            posts.append(api)
            await route.fulfill(status=400,json={'message':'Escrita não prevista nesta medição'}); return
        if api not in data:
            unknown.append(api)
        await route.fulfill(status=200,json=data.get(api,[]))
    await context.route('**/*',route_handler)
    await page.add_init_script('''window.perf22={lcp:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.perf22.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});''')
    cdp=await context.new_cdp_session(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
    await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    await cdp.send('Network.emulateNetworkConditions',dict(offline=False,latency=150,downloadThroughput=1600000/8,uploadThroughput=750000/8))
    await page.goto(BASE+path)
    await page.wait_for_load_state('networkidle')
    if name in ['client-nutrition','client-personal']:
        await page.get_by_text('Cliente Sintético',exact=True).first.wait_for()
    async def snapshot():
        resources=await page.evaluate('''performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.endsWith('.js')).map(e=>({path:new URL(e.name).pathname,encoded:e.encodedBodySize,decoded:e.decodedBodySize,transfer:e.transferSize}))''')
        files=[]
        for item in resources:
            f=ROOT/'.next'/item['path'].removeprefix('/_next/')
            if f.exists():
                content=f.read_bytes()
                files.append({**item,'raw':len(content),'gzip':len(gzip.compress(content,mtime=0)),'recharts':'recharts-wrapper' in content.decode(errors='ignore') or 'recharts-responsive-container' in content.decode(errors='ignore')})
        return dict(files=files,jsRequests=len(files),rawBytes=sum(f['raw'] for f in files),gzipBytes=sum(f['gzip'] for f in files),encodedBytes=sum(f['encoded'] for f in files),transferBytes=sum(f['transfer'] for f in files),rechartsChunks=[f['path'] for f in files if f['recharts']],lcpMs=await page.evaluate('window.perf22.lcp'))
    # Aguarda o estado útil da tela, inclusive gráficos que já eram visíveis por padrão.
    if name in ['client-nutrition','client-exams','evolution-personal']:
        await page.locator('.recharts-wrapper').first.wait_for()
    elif name=='client-exams-empty':
        await page.get_by_text('Nenhum exame registado para este paciente.').wait_for()
    elif name=='exams':
        await page.get_by_role('button',name='Recolher Todos').wait_for()
    elif name=='evolution-nutrition':
        await page.get_by_role('button').filter(has_text='Cliente Sintético').wait_for()
    await page.wait_for_load_state('networkidle')
    initial=await snapshot()
    actions=[]
    async def click(label,locator,expectation):
        await locator.click()
        await expectation()
        await page.wait_for_load_state('networkidle')
        actions.append(dict(action=label,measurement=await snapshot()))
    if name=='exams':
        await click('comparativo', page.get_by_role('button',name='Comparativo Longitudinal'),lambda:page.locator('select').first.wait_for())
    if name in ['evolution-nutrition','evolution-personal']:
        locator=page.get_by_role('button',name='Ver Evolução') if role=='PERSONAL' else page.get_by_role('button').filter(has_text='Cliente Sintético')
        if await locator.count()==0:
            locator=page.get_by_text('Cliente Sintético',exact=True).last
        await click('abrir evolução',locator.first,lambda:page.locator('.recharts-wrapper').first.wait_for())
    if name=='client-nutrition':
        await page.get_by_role('button',name='Tabela',exact=True).click()
        await page.get_by_role('cell',name='64',exact=True).first.wait_for()
        await page.get_by_role('button',name='Gráfico',exact=True).click()
        await page.locator('.recharts-wrapper').first.wait_for()
        actions.append(dict(action='alternar tabela e gráfico',measurement=await snapshot()))
    result=dict(scenario=name,path=path,role=role,empty=empty,initial=initial,actions=actions,errors=errors,unknownApi=sorted(set(unknown)),unexpectedWrites=posts)
    await context.close()
    return result

async def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--output',required=True); parser.add_argument('--runs',type=int,default=1); parser.add_argument('--expect-deferred',action='store_true'); args=parser.parse_args()
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for _ in range(args.runs):
            for name,path,role,empty in [('client-nutrition','/clientes/c1','NUTRITIONIST',False),('client-personal','/clientes/c1','PERSONAL',False),('client-exams','/clientes/c1/exames','NUTRITIONIST',False),('client-exams-empty','/clientes/c1/exames','NUTRITIONIST',True),('exams','/exames','NUTRITIONIST',False),('evolution-nutrition','/evolucao','NUTRITIONIST',False),('evolution-personal','/evolucao','PERSONAL',False)]:
                try:
                    result=await scenario(browser,name,path,role,empty)
                    if args.expect_deferred and name in ['client-personal','client-exams-empty','exams','evolution-nutrition']:
                        assert not result['initial']['rechartsChunks'], f'{name}: Recharts carregado antes de ser necessário'
                    assert not result['errors'], result['errors']
                    assert not result['unexpectedWrites'], result['unexpectedWrites']
                    results.append(result)
                    print(name,result['initial']['gzipBytes'],result['initial']['rechartsChunks'],result['errors'],flush=True)
                except Exception as e:
                    print('SCENARIO_FAILED',name,str(e),flush=True); raise
        await browser.close()
    Path(args.output).write_text(json.dumps(dict(method={'browser':'Chromium local','viewport':'390x844','cpuSlowdown':4,'latencyMs':150,'downloadMbps':1.6,'uploadMbps':0.75,'cache':'disabled; prefetch requests blocked in both builds','data':'synthetic API interception; no real credentials or database','gzip':'gzip each requested build JS file individually; bytes without HTTP headers','runs':args.runs},results=results),ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    asyncio.run(main())
