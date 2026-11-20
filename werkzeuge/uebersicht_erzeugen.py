# Übergangs-Werkzeug (Python) bis zum TypeScript-Projekt in M2. Aufruf aus dem Repo-Hauptordner.
import yaml,glob
B={}
for f in sorted(glob.glob('inhalte/bausteine/*.yaml')):
    B.update(yaml.safe_load(open(f))['bausteine'])
lb=yaml.safe_load(open('inhalte/gym/kl8/lb1-terme-und-gleichungen.yaml'))
o=[]
w=o.append
w('# Übersicht: Gym Kl. 8 – „Arbeiten mit Termen und Gleichungen“\n')
w('> Automatisch aus den Dateien in `inhalte/` erzeugt – bitte nicht von Hand bearbeiten.')
w(f'> Status: **{"fachlich geprüft" if lb["status"]=="geprueft" else "Entwurf zur fachlichen Prüfung"}**\n')
w(f'Lehrplan: Gymnasium Mathematik, Kl. 8, LB {lb["nummer"]} ({lb["richtstunden"]} Ustd.), S. 20.\n')
w('## Lernziele laut Lehrplan\n')
for k,v in lb['lernziele'].items():
    w(f'- **{v["lehrplan"]}**')
    for u in v.get('unterpunkte',[]): w(f'  - {u}')
w('\n## Level und Bausteine\n')
w('AFB = Anforderungsbereich · oH = ohne Hilfsmittel · Darstellung: sym = symbolisch, graf = grafisch, tab = Tabelle, text = Text/Sachaufgabe\n')
kurz={'symbolisch':'sym','grafisch':'graf','tabelle':'tab','text':'text'}
for i,l in enumerate(lb['level'],1):
    lz=lb['lernziele'][l['lernziel']]['niveau']
    w(f'### Level {i}: {l["titel"]}' + ('' if lz=='beherrschen' else f' *({lz})*'))
    if l.get('hinweis'): w(f'\n> {l["hinweis"]}')
    w('\n| Baustein | Inhalt | AFB | oH | Darstellung | Fehlertypen | braucht |')
    w('|---|---|---|---|---|---|---|')
    for b in l['bausteine']:
        v=B[b]
        vor=', '.join(('**'+B[d]['titel']+'**' if a=='notwendig' else B[d]['titel']) for d,a in v['voraussetzungen']) or '–'
        w(f'| {v["titel"]} | {" ".join(v.get("beschreibung","").split())} | {"/".join(v["afb"])} | {"ja" if v["ohne_hm"] else "nein"} | {", ".join(kurz[x] for x in v["darstellungen"])} | {", ".join(v["fehlertypen"])} | {vor} |')
    w('')
w('**fett** = notwendige Voraussetzung, normal = hilfreich.\n')
w('## Reparatur-Bausteine aus Kl. 5–7\n')
w('| Kl. | Baustein | Inhalt | braucht |')
w('|---|---|---|---|')
for k,v in sorted(B.items(), key=lambda x:(x[1]['klasse'],x[0])):
    if v['klasse']<8:
        vor=', '.join(B[d]['titel'] for d,_ in v['voraussetzungen']) or '–'
        w(f'| {v["klasse"]} | {v["titel"]} | {" ".join(v.get("beschreibung","").split()) or "–"} | {vor} |')
w('\n## Voraussetzungs-Netz\n')
w('Pfeil A → B heißt: „A wird für B gebraucht“. Durchgezogen = notwendig, gestrichelt = hilfreich. Grau = Reparatur-Bausteine aus Kl. 5–7.\n')
w('```mermaid'); w('flowchart LR')
nid={k:f'n{i}' for i,k in enumerate(B)}
for k,v in B.items():
    w(f'  {nid[k]}["{v["titel"]}"]')
for k,v in B.items():
    for d,a in v['voraussetzungen']:
        w(f'  {nid[d]} {"-->" if a=="notwendig" else "-.->"} {nid[k]}')
w('  classDef alt fill:#eee,stroke:#999,color:#333')
alt=[nid[k] for k,v in B.items() if v['klasse']<8]
w('  class '+','.join(alt)+' alt')
w('```\n')
w('## Geheime Level (nie testrelevant)\n')
titel={l['id']:l['titel'] for l in lb['level']}
for g in lb['geheime_level']:
    w(f'- **{g["titel"]}** – {g["idee"]} *(frei nach Meisterung von „{titel[g["freischalten_durch"]]}“ ohne Hilfen)*')
open('inhalte/UEBERSICHT.md','w').write('\n'.join(o)+'\n')
