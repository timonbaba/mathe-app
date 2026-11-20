# Übergangs-Werkzeug (Python) bis zum TypeScript-Projekt in M2. Aufruf aus dem Repo-Hauptordner.
import yaml,sys,glob
B={}
for f in glob.glob('inhalte/bausteine/*.yaml'):
    for k,v in yaml.safe_load(open(f))['bausteine'].items():
        assert k not in B,k; B[k]=v
F=yaml.safe_load(open('inhalte/fehlertypen.yaml'))['fehlertypen']
lb=yaml.safe_load(open('inhalte/gym/kl8/lb1-terme-und-gleichungen.yaml'))
err=[]
for k,v in B.items():
    for d,art in v['voraussetzungen']:
        if d not in B: err.append(f'{k}: unbekannte Voraussetzung {d}')
        if art not in('notwendig','hilfreich'): err.append(f'{k}: art {art}')
    for t in v['fehlertypen']:
        if t not in F: err.append(f'{k}: Fehlertyp {t}')
# Zyklen
state={}
def dfs(n,path):
    if state.get(n)==1: err.append('Zyklus: '+' -> '.join(path+[n])); return
    if state.get(n)==2: return
    state[n]=1
    for d,_ in B[n]['voraussetzungen']:
        if d in B: dfs(d,path+[n])
    state[n]=2
for k in B: dfs(k,[])
used=[b for l in lb['level'] for b in l['bausteine']]
for b in used:
    if b not in B: err.append(f'Level nutzt unbekannten Baustein {b}')
dup={b for b in used if used.count(b)>1}
if dup: err.append(f'mehrfach in Leveln: {dup}')
kl8=[k for k,v in B.items() if v['klasse']==8]
miss=set(kl8)-set(used)
if miss: err.append(f'Kl.8-Bausteine ohne Level: {miss}')
for g in lb['geheime_level']:
    if g['freischalten_durch'] not in [l['id'] for l in lb['level']]: err.append('geheim '+g['id'])
print('\n'.join(err) or f'OK: {len(B)} Bausteine ({len(kl8)} Kl. 8), {len(lb["level"])} Level, {len(F)} Fehlertypen')
