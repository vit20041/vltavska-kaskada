import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':int(__import__('os').environ.get('VW','1500')),'height':int(__import__('os').environ.get('VH','1000'))})
        errs=[]
        pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in('error','warning') else None)
        pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('file:///home/claude/vk/index.html')
        await pg.wait_for_timeout(800)
        act=sys.argv[1] if len(sys.argv)>1 else ''
        if act:
            await pg.evaluate(act)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shot.png',full_page=__import__('os').environ.get('FULL','1')=='1')
        print('\n'.join(errs[:20]))
        await b.close()
asyncio.run(main())
