"""Bake source-registered, two-joint hall greetings from CC Switch artwork.

Usage: python3 tools/process-hall-waves.py /absolute/cc-switch-work [animal] [--preview]
Original generated fingers/palm stay rigid. The forearm and hanging sleeve lift
from a fixed shoulder attachment; a small wrist gesture follows with its own lag.
The analytic trajectory is continuous through neutral (no stop/start keyframe
knots). A newly CC Switch-generated arm-removal underlay clears the original
limb footprint. Faces/body/room do not move. This is offline articulation of
generated texture, NOT drawn art, generated video or optical-flow cross-dissolves.
Runtime continues to use 64 cached, opaque, registered patches at 30 fps.
"""
from pathlib import Path
import sys, json, hashlib
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[1]
ANIMALS = ['otter', 'rabbit', 'fox', 'dragon']
W = H = 224
N, G, S = 64, 2, 3
# Small joint motion, independently timed per animal. No whole-image breathing.
WRIST_BLEND = 16.0

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def ease(t):
    t = np.clip(t, 0, 1)
    return t**3 * (t * (6*t - 15) + 10)

def angles_at(rig, t):
    """C2 neutral endpoints; no artificial halt at interior neutral crossings."""
    if t <= 0 or t >= 1:
        return (0.0, 0.0)
    envelope = np.sin(np.pi*t)
    root = rig['liftDegrees'] * envelope**4
    u = max(0.0, (t-rig['phaseLag'])/(1-rig['phaseLag']))
    wrist = rig['wristDegrees'] * np.sin(np.pi*u)**3 * np.sin(2*np.pi*rig['waveCycles']*u)
    return (float(root), float(wrist))

def axis_for(rig):
    v = np.array(rig['palm'], float) - np.array(rig['wrist'], float)
    return v / np.linalg.norm(v)

def weight_for(x, y, rig):
    p = np.array(rig['wrist'], float); axis = axis_for(rig)
    # The wrist field must not extend into the fixed shoulder/trunk.
    local=ease((p[0]+26-x)/8)
    return ease(((x-p[0])*axis[0] + (y-p[1])*axis[1])/rig.get('wristBlend',WRIST_BLEND))*local

def root_weight_for(x, y, rig):
    p=rig['shoulder']; axis=rig['rootAxis']
    return ease(((x-p[0])*axis[0]+(y-p[1])*axis[1])/rig['shoulderBlend'])

def turn(x,y,p,angle):
    co,si=np.cos(angle),np.sin(angle);rx,ry=x-p[0],y-p[1]
    return p[0]+co*rx-si*ry,p[1]+si*rx+co*ry

def forward(x, y, rig, angles):
    root,wrist=angles
    x,y=turn(x,y,rig['wrist'],np.deg2rad(wrist)*weight_for(x,y,rig))
    return turn(x,y,rig['shoulder'],np.deg2rad(root)*root_weight_for(x,y,rig))

def ease_derivative(t):
    inside=(t>0)&(t<1);t=np.clip(t,0,1)
    return 30*t*t*(t-1)**2*inside

def weight_gradient(x,y,rig,weight):
    if weight is root_weight_for:
        p=rig['shoulder'];axis=rig['rootAxis'];blend=rig['shoulderBlend']
        d=ease_derivative(((x-p[0])*axis[0]+(y-p[1])*axis[1])/blend)/blend
        return d*axis[0],d*axis[1]
    p=rig['wrist'];axis=axis_for(rig);blend=rig.get('wristBlend',WRIST_BLEND)
    u=((x-p[0])*axis[0]+(y-p[1])*axis[1])/blend;v=(p[0]+26-x)/8
    du=ease_derivative(u)/blend;dv=-ease_derivative(v)/8
    return du*axis[0]*ease(v)+ease(u)*dv,du*axis[1]*ease(v)

def inverse_turn(x,y,rig,p,degrees,weight):
    # Solve a - theta(R(-a) destination) = 0 with safeguarded Newton.
    # Plain fixed-point iteration can oscillate at the shoulder-side wrist
    # taper despite a positive Jacobian, causing tiny holes or a remote paw.
    rad=np.deg2rad(degrees)
    if abs(rad)<1e-14:return np.array(x,copy=True),np.array(y,copy=True)
    angle=rad*weight(x,y,rig);lo=np.full_like(angle,min(0,rad));hi=np.full_like(angle,max(0,rad))
    for _ in range(24):
        qx,qy=turn(x,y,p,-angle)
        f=angle-rad*weight(qx,qy,rig)
        gx,gy=weight_gradient(qx,qy,rig,weight)
        derivative=1-rad*(gx*(qy-p[1])-gy*(qx-p[0]))
        lo=np.where(f<0,angle,lo);hi=np.where(f>0,angle,hi)
        candidate=angle-f/np.maximum(derivative,.05)
        candidate=np.where((candidate<lo)|(candidate>hi),(lo+hi)/2,candidate)
        angle=np.where(np.abs(f)<1e-12,angle,candidate)
    return turn(x,y,p,-angle)

def inverse(x, y, rig, angles):
    root,wrist=angles
    x,y=inverse_turn(x,y,rig,rig['shoulder'],root,root_weight_for)
    return inverse_turn(x,y,rig,rig['wrist'],wrist,weight_for)

def skin_matte(rig, scale=S):
    x,y,w,h=rig['rect']; im=Image.new('L',(w*scale,h*scale))
    d=ImageDraw.Draw(im)
    for contour in (rig['contour'],rig['sleeveContour']):
        d.polygon([((a-x)*scale,(b-y)*scale) for a,b in contour],fill=255)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(.32*scale)),np.float32)/255

def geometry_metrics(rig, angles):
    """Check both joints through the whole limb, not just its fingertips."""
    contours=np.array(rig['contour']+rig['sleeveContour'],float)
    xs,ys=contours[:,0],contours[:,1]
    xx,yy=np.meshgrid(np.arange(xs.min()-2,xs.max()+3,.5),np.arange(ys.min()-2,ys.max()+3,.5))
    fx,fy=forward(xx,yy,rig,angles)
    fx_y,fx_x=np.gradient(fx,.5,.5);fy_y,fy_x=np.gradient(fy,.5,.5)
    det=fx_x*fy_y-fx_y*fy_x
    qx,qy=inverse(fx,fy,rig,angles)
    return {'minimumJacobian':float(det.min()),'maximumJacobian':float(det.max()),
            'maxInverseResidualPixels':float(np.hypot(qx-xx,qy-yy).max())}

def bake(rig, plate):
    x,y,w,h=rig['rect']; scene_path=ROOT/'assets/resources/art'/f"{rig['art']}.png"
    scene=Image.open(scene_path).convert('RGBA'); neutral=np.array(scene.crop((x,y,x+w,y+h)))
    src=np.array(Image.fromarray(neutral).resize((w*S,h*S),Image.Resampling.LANCZOS),np.float32)/255
    back=np.array(Image.open(plate).convert('RGB').resize((w*S,h*S),Image.Resampling.LANCZOS),np.float32)/255
    alpha=skin_matte(rig)
    # Background fill is used ONLY in the old greeting limb footprint. It never
    # replaces the full hall scene, face, other hand, ingot or room.
    removal=(alpha>.003).astype(np.float32)
    # Recover edge color against the original generated background; premultiply
    # BEFORE sampling to avoid dark/fringing color along moving fingertips.
    edge=np.maximum(alpha[...,None],.025)
    foreground=np.clip((src[...,:3]-(1-alpha[...,None])*back)/edge,0,1)
    premul=foreground*alpha[...,None]
    yy,xx=np.mgrid[:h*S,:w*S];tx=x+(xx+.5)/S-.5;ty=y+(yy+.5)/S-.5
    frames=[];metrics=[];support=np.zeros((h,w),bool);angles=[]
    for i in range(N):
        degrees=angles_at(rig,i/(N-1));angles.append(degrees)
        if max(map(abs,degrees))<1e-9:
            frames.append(neutral.copy());metrics.append(geometry_metrics(rig,(0,0)));continue
        contour=np.array(rig['contour']+rig['sleeveContour'],float)
        ex,ey=forward(contour[:,0],contour[:,1],rig,degrees)
        left=max(0,int(np.floor((ex.min()-x-3)*S)));right=min(w*S,int(np.ceil((ex.max()-x+3)*S)))
        top=max(0,int(np.floor((ey.min()-y-3)*S)));bottom=min(h*S,int(np.ceil((ey.max()-y+3)*S)))
        dx,dy=tx[top:bottom,left:right],ty[top:bottom,left:right]
        qx,qy=inverse(dx,dy,rig,degrees)
        coords=[(qy-y+.5)*S-.5,(qx-x+.5)*S-.5]
        # Only the forward-projected skin can contribute. Inverse samples far
        # outside a limb can have another/nonconverged numerical root; they
        # must never reproduce a second paw elsewhere in the costume/scene.
        valid=(dx>=ex.min()-2)&(dx<=ex.max()+2)&(dy>=ey.min()-2)&(dy<=ey.max()+2)
        fx,fy=forward(qx,qy,rig,degrees)
        valid &= np.hypot(fx-dx,fy-dy)<.02
        a=np.zeros(alpha.shape,np.float32);paw=np.zeros(src[...,:3].shape,np.float32)
        a[top:bottom,left:right]=np.clip(map_coordinates(alpha,coords,order=1,mode='constant',cval=0),0,1)*valid
        paw[top:bottom,left:right]=np.stack([map_coordinates(premul[:,:,c],coords,order=1,mode='constant',cval=0) for c in range(3)],-1)*valid[...,None]
        # Clear the old silhouette fully whenever motion is visible. Only the
        # first/last <0.15 source-pixel seam uses a coverage ramp; no ghost-pose
        # crossfade over the actual gesture. A fixed root never exposes underlay.
        displacement=float(np.hypot(ex-contour[:,0],ey-contour[:,1]).max())
        clean_strength=float(ease(displacement/.15))
        rm=removal*clean_strength
        bg=src[...,:3]*(1-rm[...,None])+back*rm[...,None]
        rgb=np.clip(bg*(1-a[...,None])+paw,0,1)
        rgba=np.dstack((np.rint(rgb*255).astype('uint8'),np.full(rgb.shape[:2],255,'uint8')))
        out=np.array(Image.fromarray(rgba).resize((w,h),Image.Resampling.LANCZOS))
        local=np.maximum(rm,a)
        loc=np.array(Image.fromarray(np.rint(local*255).astype('uint8')).resize((w,h),Image.Resampling.LANCZOS))>0
        # Pin all samples outside local skin support including exact rectangle
        # boundaries, so filtering cannot alter scene/cuff pixels at a distance.
        out[~loc]=neutral[~loc];out[:3]=neutral[:3];out[-3:]=neutral[-3:];out[:,:3]=neutral[:,:3];out[:,-3:]=neutral[:,-3:]
        frames.append(out);support|=loc;metrics.append(geometry_metrics(rig,degrees))
    assert np.array_equal(frames[0],neutral) and np.array_equal(frames[-1],neutral)
    atlas=np.empty(((h+2*G)*8,(w+2*G)*8,4),'uint8')
    for i,f in enumerate(frames):atlas[i//8*(h+2*G):(i//8+1)*(h+2*G),i%8*(w+2*G):(i%8+1)*(w+2*G)]=np.pad(f,((G,G),(G,G),(0,0)),mode='edge')
    return scene,frames,atlas,neutral,support,metrics,angles

def main():
    work=Path(sys.argv[1]).resolve();preview='--preview' in sys.argv
    animals=[a for a in sys.argv[2:] if a in ANIMALS] or ANIMALS
    rigs=json.loads((work/'hand-rigs.json').read_text());audit_path=ROOT/'docs/hall-wave-processing-audit.json'
    old={r['animal']:r for r in json.loads(audit_path.read_text())} if audit_path.exists() else {}
    for animal in animals:
        rig=rigs[animal];rig['animal']=animal;plate=work/f'{animal}-clean-plate.png'
        scene,frames,atlas,neutral,support,metrics,angles=bake(rig,plate)
        dest=(work if preview else ROOT/'assets/resources/art')/f'hall-{animal}-paw-motion.png'
        Image.fromarray(atlas).save(dest,optimize=True)
        x,y,w,h=rig['rect'];crop=(x-20,y-5,x+w+20,y+h+25)
        previews=[]
        for f in frames:
            im=scene.copy();im.paste(Image.fromarray(f),(x,y));previews.append(im.crop(crop).resize((396,381),Image.Resampling.LANCZOS))
        previews[0].save(work/f'{animal}-wrist-greeting.gif',save_all=True,append_images=previews[1:]+[previews[0]]*36,duration=33,loop=0,disposal=2)
        contact=Image.new('RGB',(6*300,2*288))
        for k,i in enumerate([0,6,10,14,18,24,31,37,42,46,52,63]):contact.paste(previews[i].resize((300,288),Image.Resampling.LANCZOS),(k%6*300,k//6*288))
        contact.save(work/f'{animal}-wrist-contact.jpg',quality=95)
        Image.fromarray((support*255).astype('uint8')).save(work/f'{animal}-motion-support.png')
        r={'animal':animal,'art':rig['art'],'atlas':dest.stem,'rect':rig['rect'],'rig':rig,'frames':N,'fps':30,
           'method':'original CC Switch generated arm and sleeve; fixed shoulder, articulated forearm and rigid distal paw with delayed wrist follow; continuous analytic timing; generated arm-removal underlay; no optical-flow texture blending; offline cached source-registered frames',
           'rigidDistalFromSourcePixels':WRIST_BLEND,'supersampling':S,'angles':angles,
           'supportRLE':[[int(yy),int(xs.min()),int(xs.max()+1)] for yy in range(h) if (xs:=np.flatnonzero(support[yy])).size],
           'uniqueFrames':len({f.tobytes() for f in frames}),
           'maxAdjacentMeanDelta':max(float(np.abs(a.astype('int16')-b.astype('int16')).mean()) for a,b in zip(frames,frames[1:])),
           'maxAngularStepDegrees':max(float(np.abs(np.array(a)-np.array(b)).max()) for a,b in zip(angles,angles[1:])),
           'geometryMetrics':metrics,'cleanPlateSource':str(plate),'cleanPlateSha256':sha(plate),
           'sha256':sha(dest),'sceneSha256':sha(ROOT/'assets/resources/art'/f"{rig['art']}.png"),
           'exactNeutralSeam':True,'exactBoundary':True,'onlyLocalArmChanged':True}
        (work/f'{animal}-processing-audit.json').write_text(json.dumps(r,indent=2)+'\n');old[animal]=r
        print(animal,r['uniqueFrames'],round(r['maxAdjacentMeanDelta'],3),'jacobian',round(min(m['minimumJacobian'] for m in metrics),3),flush=True)
    if not preview:
        audit_path.write_text(json.dumps([old[a] for a in ANIMALS],indent=2)+'\n')
        (ROOT/'assets/scripts/ui/HallKeeperArt.ts').write_text('''/** Source-integrated generated arm/sleeve with continuous two-joint articulation.
 * Fixed shoulder; forearm leads and a small rigid-palm gesture follows.
 * A CC Switch underlay clears the original arm footprint (no pose dissolves).
 * Cached opaque patches stay registered; face, torso and room remain fixed. */
export const HALL_KEEPER_ART = ['hall-otter-paw-motion', 'hall-rabbit-paw-motion', 'hall-fox-paw-motion', 'hall-dragon-paw-motion'] as const;
export const HALL_KEEPER_ATLAS = { columns: 8, rows: 8, width: 224, height: 224, gutter: 2, frames: 64 } as const;
export const HALL_KEEPER_PATCHES: readonly (readonly [number, number, number, number])[] = '''+json.dumps([rigs[a]['rect'] for a in ANIMALS])+''';
''')

if __name__=='__main__':main()
