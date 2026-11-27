# WMK AI Track Lab — Python 3, biblioteca padrão, MIT
import os, json, urllib.request, urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCHEMA=json.loads((ROOT/'ai'/'track.schema.json').read_text(encoding='utf-8'))
SYSTEM=(ROOT/'ai'/'knowledge.txt').read_text(encoding='utf-8')
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def reply(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
    def do_POST(self):
        if self.path!='/api/track': return self.reply(404,{'error':'Rota desconhecida'})
        if self.headers.get('Origin') not in (None,'http://127.0.0.1:8768','http://localhost:8768'): return self.reply(403,{'error':'Origem não autorizada'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<=16000: raise ValueError('Tamanho inválido')
            d=json.loads(self.rfile.read(size)); provider=d['provider']; model=d['model']; prompt=d['prompt']
            if not isinstance(model,str) or not 0<len(model)<=150 or not isinstance(prompt,str) or not 0<len(prompt)<=6000: raise ValueError('Modelo ou prompt inválido')
            mode=d.get('mode','preset')
            if mode not in ('preset','custom'): raise ValueError('Modo inválido')
            schema=json.loads(json.dumps(SCHEMA))
            schema.pop('allOf',None)
            if mode=='preset':
                schema['properties']['type']['enum'].remove('custom')
                for field in ('points','twists'): schema['properties'].pop(field,None)
            else:
                schema['properties']['type']={'type':'string','enum':['custom']}
                schema['required'].append('points')
            context=d.get('context','')
            examples=d.get('examples',[])
            if not isinstance(context,str) or not isinstance(examples,list): raise ValueError('Contexto inválido')
            messages=[{'role':'system','content':SYSTEM+'\nModo obrigatório: '+mode+'\nSchema: '+json.dumps(schema)+'\nInstruções extras: '+context[:2000]+'\nExemplos aprovados: '+json.dumps(examples[-5:],ensure_ascii=False)[:6000]},{'role':'user','content':prompt}]
            headers={'Content-Type':'application/json'}
            if provider=='ollama':
                url='http://127.0.0.1:11434/api/chat'; payload={'model':model,'messages':messages,'stream':False,'format':schema,'options':{'temperature':0.1,'num_predict':2048}}
            elif provider=='groq':
                key=os.environ.get('GROQ_API_KEY')
                if not key: raise ValueError('Defina GROQ_API_KEY no terminal antes de iniciar')
                url='https://api.groq.com/openai/v1/chat/completions';headers['Authorization']='Bearer '+key;payload={'model':model,'messages':messages,'response_format':{'type':'json_object'}}
            else: raise ValueError('Provedor inválido')
            req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers=headers,method='POST')
            with urllib.request.urlopen(req,timeout=180) as response: result=json.loads(response.read(2000000))
            content=result['message']['content'] if provider=='ollama' else result['choices'][0]['message']['content']
            self.reply(200,{'track':json.loads(content)})
        except urllib.error.HTTPError as e: self.reply(502,{'error':'Provedor retornou HTTP '+str(e.code)})
        except (ValueError,KeyError,TypeError) as e: self.reply(400,{'error':str(e)[:300]})
        except Exception as e: self.reply(502,{'error':'Falha de conexão ou resposta do provedor: '+type(e).__name__})
if __name__=='__main__':
    print('WMK AI Lab: http://127.0.0.1:8768/ai/')
    ThreadingHTTPServer(('127.0.0.1',8768),Handler).serve_forever()
