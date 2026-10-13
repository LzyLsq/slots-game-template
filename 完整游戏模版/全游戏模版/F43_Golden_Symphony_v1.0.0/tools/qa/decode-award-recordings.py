"""Review complete award recordings, retaining source cadence without interpolation.

Usage: python3 tools/qa/decode-award-recordings.py OUTPUT_DIRECTORY
Requires the selected Python environment to provide OpenCV and Pillow.
Guardian crop coordinates target the 780x1688 canvas from direct-motion.cjs.
"""
from pathlib import Path
import json,sys,cv2
from PIL import Image,ImageDraw
assert len(sys.argv)==2, 'Pass the direct-motion output directory'
out=Path(sys.argv[1]);reports=[]
for video in sorted((out/'direct-canvas').glob('*-spin-award.webm')):
    cap=cv2.VideoCapture(str(video));times=[];selected=[];poses=[];next_frame=0.;next_pose=3.
    while True:
        ok,bgr=cap.read()
        if not ok:break
        t=cap.get(cv2.CAP_PROP_POS_MSEC)/1000
        assert not times or t>=times[-1]
        times.append(t)
        if t>=next_frame:
            im=Image.fromarray(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB))
            im.thumbnail((195,422));selected.append((im,t));next_frame+=.6
        if t>=next_pose and next_pose<9.:
            im=Image.fromarray(cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB))
            poses.append((im.crop((140,460,640,750)).resize((250,145),Image.Resampling.LANCZOS),t));next_pose+=.2
    cap.release()
    assert len(times)>30, f'Incomplete recording: {video}'
    def sheet(frames,width,height,cols,file):
        rows=(len(frames)+cols-1)//cols
        grid=Image.new('RGB',(cols*width,rows*height),'#18151b');draw=ImageDraw.Draw(grid)
        for i,(frame,t) in enumerate(frames):
            x=i%cols*width;y=i//cols*height;grid.paste(frame,(x,y));draw.text((x+6,y+height-18),f'{t:.3f} s',fill='white')
        grid.save(file,quality=93)
    sheet(selected,195,444,6,out/(video.stem+'-sequence.jpg'))
    sheet(poses,250,165,5,out/(video.stem+'-guardian-poses.jpg'))
    r={'video':str(video.relative_to(out)),'decodedFrames':len(times),'endSeconds':times[-1],
       'maxSourceGapSeconds':round(max(b-a for a,b in zip(times,times[1:])),4),
       'gapsOver100ms':sum(b-a>.1 for a,b in zip(times,times[1:])),
       'method':'sequential original recorded frames, no interpolation',
       'sequenceTimes': [round(t,3) for _,t in selected]}
    reports.append(r);print(json.dumps({k:v for k,v in r.items() if k!='sequenceTimes'}),flush=True)
(out/'sequential-decoding.json').write_text(json.dumps(reports,indent=2)+'\n')
