"""B6: navegador temporal sin sesion del usuario ni llamadas remotas."""
import json
from pathlib import Path
import subprocess
import time
from urllib.request import urlopen
from uuid import uuid4

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/'output/playwright'
CHROME=Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
HTML = (ROOT/'scripts/maintenance/publication_harness.html').read_text(encoding='utf-8')

def main():
    OUTPUT.mkdir(parents=True,exist_ok=True)
    (OUTPUT/'publication-harness.html').write_text(HTML,encoding='utf-8')
    server=subprocess.Popen(['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','18004','--strictPort'],
        cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        for _ in range(30):
            try:
                with urlopen('http://127.0.0.1:18004/output/playwright/publication-harness.html',timeout=2) as response:
                    if response.status==200:break
            except OSError:pass
            time.sleep(1)
        else:raise RuntimeError('temporary_vite_not_ready')
        for name,width,height in [('desktop',1280,1100),('mobile',390,950)]:
            profile=OUTPUT/f'b6-browser-{uuid4()}'
            browser=subprocess.Popen([str(CHROME),'--headless=new','--no-first-run','--disable-background-networking',
                '--disable-sync','--disable-extensions','--remote-debugging-port=0',f'--user-data-dir={profile}','about:blank'],
                stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
            try:
                for _ in range(30):
                    if (profile/'DevToolsActivePort').exists():break
                    time.sleep(1)
                port=(profile/'DevToolsActivePort').read_text().splitlines()[0]
                completed=subprocess.run(['node',str(ROOT/'scripts/maintenance/workflow_browser.mjs'),port,str(width),str(height),str(OUTPUT/f'publication-{name}.png'),'publication-harness.html','b6-test-result'],
                    capture_output=True,timeout=90,creationflags=subprocess.CREATE_NO_WINDOW)
                report=json.loads(completed.stdout.decode('utf-8').strip())
                print(name,report,flush=True)
                if not report.get('passed'):raise RuntimeError('publication_ui_failed')
            finally:
                if browser.poll() is None:
                    subprocess.run(['taskkill','/PID',str(browser.pid),'/T','/F'],capture_output=True,check=False,timeout=20)
                    browser.wait(timeout=20)
    finally:
        if server.poll() is None:
            subprocess.run(['taskkill','/PID',str(server.pid),'/T','/F'],capture_output=True,check=False,timeout=20)
            server.wait(timeout=20)


if __name__=='__main__':main()
