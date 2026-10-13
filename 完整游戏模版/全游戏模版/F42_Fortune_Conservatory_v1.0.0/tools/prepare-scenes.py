"""Build one continuous scene from a generated outpaint and its native portrait.
The portrait is a protected region, not a floating cabinet/sticker. Its pixels,
geometry and mascot are never stretched to match an unrelated scene.
"""
from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parents[1]

def prepare_scene(name, source_dir=ROOT/'art-source', output_dir=ROOT/'assets/art'):
    portrait_path=source_dir/f'{name}-festive-mobile.png'
    source_path=source_dir/f'{name}-festive-outpaint.png'
    portrait=Image.open(portrait_path).convert('RGB')
    assert portrait.size==(1024,1536), 'Protected portrait must be native 1024x1536'
    native=Image.open(source_path).convert('RGB')
    entry={'source':source_path.name,'protectedSource':portrait_path.name,
           'nativeSceneSize':list(native.size),'nativePortraitSize':list(portrait.size),
           'protectedRect':[0,256,1024,1536],'atlasCell':None,
           'trim':[0,0,3072,2560],'width':3072,'height':2560,'transparent':False}
    scene=native.resize((3072,2560),Image.Resampling.LANCZOS)
    # Match the extension to the protected native art using a harmonic RGB
    # correction. Only the upper 256 rows change; no blur, stretched cabinet,
    # runtime overlay or character pixels are involved. Predict the boundary
    # row from the native art's local slope, so both color and edge continuity
    # survive instead of leaving seamlessClone's uncorrected one-pixel rim.
    import numpy as np
    source=np.asarray(scene)
    target=source.copy()
    target[256:1792,:1024]=np.asarray(portrait)
    boundary=target[256].astype(float)-np.clip(
        target[257].astype(float)-target[256].astype(float),-24,24)
    delta=boundary-source[255].astype(float)
    # A reflected boundary keeps the left/right scene edges non-periodic.
    reflected=np.concatenate([delta,delta[::-1]],axis=0)
    coefficients=np.fft.rfft(reflected,axis=0)
    frequencies=2*np.pi*np.fft.rfftfreq(len(reflected))
    height=255
    joined=source.copy()
    for y in range(height+1):
        ratio=np.empty_like(frequencies)
        ratio[0]=y/height
        k=frequencies[1:]
        ratio[1:]=(np.exp(-k*(height-y))*(-np.expm1(-2*k*y))
                   /(-np.expm1(-2*k*height)))
        correction=np.fft.irfft(coefficients*ratio[:,None],
                               n=len(reflected),axis=0)[:3072]
        joined[y]=np.clip(np.rint(source[y].astype(float)+correction),0,255).astype('uint8')
    scene=Image.fromarray(joined)
    entry['continuationRepair']={'method':'offline harmonic boundary lighting integration',
         'source':source_path.name,'appliedRect':[0,0,3072,256]}
    # The exterior was generated from transparency, never a draft with old mascots.
    # Restore the native cabinet/character without stretching or moving its geometry.
    scene.paste(portrait,(0,256))
    scene.save(output_dir/f'{name}-cabinet.webp','WEBP',quality=95,method=6)
    return entry

if __name__=='__main__':
    output=ROOT/'assets/art';manifest=json.loads((output/'manifest.json').read_text())
    for name in ['tiger','koi','crane','tortoise']:
        manifest[name+'-cabinet']=prepare_scene(name)
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
    print('Built four protected festive continuations; one complete mascot per scene.')
