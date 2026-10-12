from pathlib import Path

OUT=Path('public/art/controls')
OUT.mkdir(parents=True,exist_ok=True)

themes={
 'royal-mint':dict(shape='round',metal1='#fff0a0',metal2='#d89a35',metal3='#6b2d13',face1='#a92c38',face2='#40070f',glow='#ffca55',detail='#ffdf7d'),
 'jade-treasury':dict(shape='jade',metal1='#f0f2b2',metal2='#b3a85a',metal3='#4d5824',face1='#3b9277',face2='#0a3128',glow='#86f1b8',detail='#d8f3a5'),
 'diamond-foundry':dict(shape='diamond',metal1='#f4fdff',metal2='#9cc9e8',metal3='#385978',face1='#4380ae',face2='#091d36',glow='#b9edff',detail='#d9f5ff'),
 'crown-wheel':dict(shape='crown',metal1='#fff3aa',metal2='#e5ad35',metal3='#773115',face1='#a11f2d',face2='#38070d',glow='#ffd25d',detail='#ffe59a'),
}

def defs(c):
 return f'''<defs>
 <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{c['metal1']}"/><stop offset=".19" stop-color="{c['metal2']}"/><stop offset=".48" stop-color="{c['metal3']}"/><stop offset=".72" stop-color="{c['metal1']}"/><stop offset="1" stop-color="{c['metal2']}"/></linearGradient>
 <radialGradient id="glass" cx="34%" cy="22%" r="82%"><stop stop-color="{c['detail']}"/><stop offset=".1" stop-color="{c['face1']}"/><stop offset=".6" stop-color="{c['face2']}"/><stop offset="1" stop-color="#080207"/></radialGradient>
 <linearGradient id="lip" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff9cf" stop-opacity=".95"/><stop offset=".18" stop-color="{c['metal2']}"/><stop offset=".58" stop-color="{c['metal3']}"/><stop offset="1" stop-color="#160506"/></linearGradient>
 <pattern id="engrave" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M-3 12L12-3M3 21L21 3" stroke="{c['detail']}" stroke-opacity=".11" stroke-width="2"/></pattern>
 <filter id="shadow" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#090104" flood-opacity=".82"/><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="{c['glow']}" flood-opacity=".36"/></filter>
 <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
 </defs>'''

def paths(shape,kind):
 if kind in ('spin','orb','utility'):
  if shape=='jade': return ('<path d="M128 8C180 8 229 50 240 102C251 153 218 218 158 240C101 260 34 229 14 172C-8 111 31 42 91 17C102 12 115 8 128 8Z"/>','<path d="M128 30C171 30 208 62 218 105C228 148 199 201 153 217C108 233 55 208 38 166C20 120 48 68 94 43C104 37 116 30 128 30Z"/>')
  if shape=='diamond': return ('<path d="M128 4L224 42L252 128L218 218L128 252L36 218L4 128L36 38Z"/>','<path d="M128 28L204 57L227 128L199 198L128 226L57 199L29 128L56 58Z"/>')
  if shape=='crown': return ('<path d="M128 4L151 19L178 12L194 35L222 39L226 68L249 84L240 112L252 137L232 158L235 188L207 198L195 226L165 224L142 247L116 234L88 246L68 222L38 219L32 190L7 175L17 146L4 120L25 99L22 70L51 59L64 32L94 34Z"/>','<circle cx="128" cy="128" r="94"/>')
  return ('<circle cx="128" cy="128" r="122"/>','<circle cx="128" cy="128" r="98"/>')
 if shape=='jade': return ('<path d="M18 20H202L240 64L202 108H18L-20 64Z"/>','<path d="M16 34H204L224 64L204 94H16L-4 64Z"/>')
 if shape=='diamond': return ('<path d="M18 8H202L238 40V88L202 120H18L-18 88V40Z"/>','<path d="M18 27H202L219 43V85L202 101H18L1 85V43Z"/>')
 if shape=='crown': return ('<path d="M8 28L34 12L62 24L92 6L120 25L150 6L180 24L208 12L232 28L220 112H20Z"/>','<path d="M22 39L43 28L65 40L93 23L120 43L148 23L176 40L198 28L218 39L208 96H32Z"/>')
 return ('<path d="M22 9H218Q239 9 239 30V98Q239 119 218 119H22Q1 119 1 98V30Q1 9 22 9Z"/>','<path d="M26 27H214Q221 27 221 34V94Q221 101 214 101H26Q19 101 19 94V34Q19 27 26 27Z"/>')

def ornament(shape,kind,c):
 if kind in ('spin','orb','utility'):
  extras=[]
  for a in range(0,360,30):
   extras.append(f'<circle cx="128" cy="13" r="3.4" fill="{c["detail"]}" transform="rotate({a} 128 128)" opacity=".82"/>')
  core=''.join(extras)
  if shape=='diamond': core += f'<path d="M128 39L188 69L217 128L187 188L128 216L68 187L39 128L69 68Z" fill="none" stroke="{c["detail"]}" stroke-opacity=".46" stroke-width="3"/>'
  if shape=='jade': core += f'<path d="M62 157C50 112 78 70 122 61C158 54 194 72 204 104C212 132 194 158 167 161C144 163 126 147 130 128C134 111 153 104 166 112" fill="none" stroke="{c["detail"]}" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>'
  if shape=='crown': core += f'<path d="M77 87L98 101L128 72L158 101L181 87L170 137H87Z" fill="none" stroke="{c["detail"]}" stroke-opacity=".55" stroke-width="5"/>'
  return core
 return f'<path d="M34 64H206" stroke="{c["detail"]}" stroke-opacity=".38" stroke-width="2"/><circle cx="26" cy="64" r="4" fill="{c["detail"]}" opacity=".7"/><circle cx="214" cy="64" r="4" fill="{c["detail"]}" opacity=".7"/>'

def make_square(name,c,kind):
 outer,inner=paths(c['shape'],kind)
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">{defs(c)}
 <g filter="url(#shadow)"><g fill="url(#lip)" stroke="{c['metal1']}" stroke-width="4">{outer}</g><g fill="url(#engrave)" opacity=".9">{outer}</g><g fill="url(#glass)" stroke="{c['metal2']}" stroke-width="5">{inner}</g>{ornament(c['shape'],kind,c)}
 <ellipse cx="105" cy="72" rx="56" ry="22" fill="#fff" opacity=".13" transform="rotate(-18 105 72)" filter="url(#soft)"/><path d="M73 186C107 212 158 207 186 177" fill="none" stroke="#040104" stroke-opacity=".54" stroke-width="7" stroke-linecap="round"/></g></svg>'''

def make_wide(name,c,kind):
 outer,inner=paths(c['shape'],kind)
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 128">{defs(c)}
 <g filter="url(#shadow)"><g fill="url(#lip)" stroke="{c['metal1']}" stroke-width="3">{outer}</g><g fill="url(#engrave)" opacity=".95">{outer}</g><g fill="url(#glass)" stroke="{c['metal2']}" stroke-width="4">{inner}</g>{ornament(c['shape'],kind,c)}
 <path d="M37 43C77 24 155 23 202 42" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="7" stroke-linecap="round" filter="url(#soft)"/></g></svg>'''

for name,c in themes.items():
 for kind in ('spin','orb','utility'):
  (OUT/f'{name}-{kind}.svg').write_text(make_square(name,c,kind))
 for kind in ('auto','plaque'):
  (OUT/f'{name}-{kind}.svg').write_text(make_wide(name,c,kind))
print(f'generated {len(themes)*5} control assets in {OUT}')

def make_deck(c):
 if c['shape']=='jade':
  body='<path d="M55 32C88 3 161 0 221 14L286 4L349 18L450 5L551 18L614 4L679 14C739 0 812 3 845 32L892 90L854 191C777 218 661 209 574 200L450 218L326 200C239 209 123 218 46 191L8 90Z"/>'
  inset='<path d="M62 51C133 27 231 33 308 43L450 27L592 43C669 33 767 27 838 51L862 94L830 168C744 188 644 178 565 172L450 192L335 172C256 178 156 188 70 168L38 94Z"/>'
 elif c['shape']=='diamond':
  body='<path d="M34 22H170L213 4H687L730 22H866L898 72L866 195H34L2 72Z"/>'
  inset='<path d="M54 43H184L224 26H676L716 43H846L871 76L844 171H56L29 76Z"/>'
 elif c['shape']=='crown':
  body='<path d="M26 55L88 15L160 35L240 6L323 33L450 2L577 33L660 6L740 35L812 15L874 55L894 174L828 205L691 190L565 212L450 190L335 212L209 190L72 205L6 174Z"/>'
  inset='<path d="M49 67L98 37L163 55L242 28L326 54L450 24L574 54L658 28L737 55L802 37L851 67L867 159L813 181L689 169L562 190L450 169L338 190L211 169L87 181L33 159Z"/>'
 else:
  body='<path d="M28 50C108 2 212 14 300 29L450 2L600 29C688 14 792 2 872 50L896 166C821 218 700 196 603 187L450 215L297 187C200 196 79 218 4 166Z"/>'
  inset='<path d="M51 64C123 26 216 36 305 49L450 24L595 49C684 36 777 26 849 64L869 151C795 187 696 173 594 164L450 190L306 164C204 173 105 187 31 151Z"/>'
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 220">{defs(c)}<g filter="url(#shadow)"><g fill="url(#lip)" stroke="{c['metal1']}" stroke-width="5">{body}</g><g fill="url(#engrave)" opacity=".88">{body}</g><g fill="url(#glass)" stroke="{c['metal2']}" stroke-width="4">{inset}</g><path d="M76 66C244 22 657 22 824 66" fill="none" stroke="#fff" stroke-opacity=".17" stroke-width="13" stroke-linecap="round" filter="url(#soft)"/><path d="M68 167C245 197 655 197 832 167" fill="none" stroke="#050103" stroke-opacity=".52" stroke-width="10" stroke-linecap="round"/></g></svg>'''

for name,c in themes.items():
 (OUT/f'{name}-deck.svg').write_text(make_deck(c))
