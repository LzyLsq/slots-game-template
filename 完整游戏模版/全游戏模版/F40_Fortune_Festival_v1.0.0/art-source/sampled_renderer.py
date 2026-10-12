"""Offline SoundFont renderer. No audio driver, network or engine runtime dependency.
Requires numpy, FluidSynth >=2.3 and an explicitly supplied SoundFont. Only the
rendered PCM is shipped. The original note/event score is authored separately.
"""
import ctypes as C
import ctypes.util
import os
from pathlib import Path
import numpy as np

RATE = 32000
PROGRAMS = {'piano':0, 'celesta':8, 'vibes':11, 'bass':32, 'pizz':45,
            'harp':46, 'strings':48, 'trumpet':56, 'trombone':57, 'horn':60,
            'clarinet':71, 'flute':73, 'koto':107, 'wood':115, 'drums':0}
# Fixed mixing and panorama make each instrument readable without a wide wash.
PARTS = [('piano',83,56),('celesta',46,80),('vibes',68,75),('bass',91,64),
         ('pizz',62,45),('harp',65,38),('strings',50,64),('trumpet',58,59),
         ('trombone',51,47),('drums',79,64),('horn',68,77),('clarinet',82,68),
         ('flute',84,62),('koto',71,45),('wood',54,86)]
CHANNEL = {part[0]:i for i,part in enumerate(PARTS)}

class Score:
    def __init__(self, seconds, loop=False):
        self.seconds, self.loop, self.events = seconds, loop, []
    def note(self, part, pitch, at, gate, velocity=72):
        if at < 0 or at >= self.seconds: return
        channel=CHANNEL[part]
        self.events.append((round(at*RATE),1,channel,int(pitch),int(np.clip(velocity,1,120))))
        self.events.append((round((at+gate)*RATE),0,channel,int(pitch),0))
    def chord(self, part, notes, at, gate, velocity=65, spread=.012):
        for i,note in enumerate(notes): self.note(part,note,at+i*spread,gate,velocity-(i%2)*3)
    def drum(self, pitch, at, velocity=48): self.note('drums',pitch,at,.075,velocity)

class Renderer:
    def __init__(self, soundfont):
        path=os.environ.get('F40_FLUID_LIBRARY') or ctypes.util.find_library('fluidsynth')
        if not path: raise RuntimeError('Set F40_FLUID_LIBRARY to the installed FluidSynth library.')
        self.lib=C.CDLL(path); self.soundfont=str(Path(soundfont).resolve())
        def api(name, result, *args):
            fn=getattr(self.lib,name); fn.restype=result; fn.argtypes=list(args); return fn
        self.settings=api('new_fluid_settings',C.c_void_p)
        self.num=api('fluid_settings_setnum',C.c_int,C.c_void_p,C.c_char_p,C.c_double)
        self.integer=api('fluid_settings_setint',C.c_int,C.c_void_p,C.c_char_p,C.c_int)
        self.new=api('new_fluid_synth',C.c_void_p,C.c_void_p)
        self.load=api('fluid_synth_sfload',C.c_int,C.c_void_p,C.c_char_p,C.c_int)
        self.program=api('fluid_synth_program_select',C.c_int,C.c_void_p,C.c_int,C.c_int,C.c_int,C.c_int)
        self.cc=api('fluid_synth_cc',C.c_int,C.c_void_p,C.c_int,C.c_int,C.c_int)
        self.on=api('fluid_synth_noteon',C.c_int,C.c_void_p,C.c_int,C.c_int,C.c_int)
        self.off=api('fluid_synth_noteoff',C.c_int,C.c_void_p,C.c_int,C.c_int)
        self.write=api('fluid_synth_write_float',C.c_int,C.c_void_p,C.c_int,C.c_void_p,C.c_int,C.c_int,C.c_void_p,C.c_int,C.c_int)
        self.delete=api('delete_fluid_synth',None,C.c_void_p)
        self.delete_settings=api('delete_fluid_settings',None,C.c_void_p)
    def render(self, score):
        settings=self.settings()
        self.num(settings,b'synth.sample-rate',RATE)
        self.num(settings,b'synth.gain',.42)
        self.num(settings,b'synth.reverb.room-size',.32)
        self.num(settings,b'synth.reverb.damp',.72)
        self.num(settings,b'synth.reverb.width',.62)
        self.num(settings,b'synth.reverb.level',.16)
        self.integer(settings,b'synth.chorus.active',0)
        self.integer(settings,b'synth.polyphony',192)
        self.integer(settings,b'synth.cpu-cores',1)
        self.integer(settings,b'synth.threadsafe-api',0)
        synth=self.new(settings)
        try:
            sfid=self.load(synth,self.soundfont.encode(),0)
            if sfid<0: raise RuntimeError('SoundFont could not load')
            for channel,(part,volume,pan) in enumerate(PARTS):
                if self.program(synth,channel,sfid,128 if part=='drums' else 0,PROGRAMS[part])<0:
                    raise RuntimeError('Missing sampled instrument: '+part)
                self.cc(synth,channel,7,volume); self.cc(synth,channel,10,pan)
                self.cc(synth,channel,91,35 if part in ('strings','flute','horn') else 18)
            size=round(score.seconds*RATE); repetitions=3 if score.loop else 1
            events=[]
            for repeat in range(repetitions):
                events.extend((pos+repeat*size,kind,ch,n,v) for pos,kind,ch,n,v in score.events)
            events.sort(); end=size*repetitions
            result=np.zeros((end,2),dtype=np.float32); cursor=0
            def span(to):
                nonlocal cursor
                to=min(end,to)
                while cursor<to:
                    count=min(8192,to-cursor)
                    left=np.empty(count,dtype=np.float32);right=np.empty(count,dtype=np.float32)
                    self.write(synth,count,left.ctypes.data,0,1,right.ctypes.data,0,1)
                    result[cursor:cursor+count,0]=left;result[cursor:cursor+count,1]=right
                    cursor+=count
            for pos,kind,ch,n,v in events:
                if pos>end: break
                span(pos)
                if kind:self.on(synth,ch,n,v)
                else:self.off(synth,ch,n)
            span(end)
            return result[size:size*2].astype(np.float64) if score.loop else result.astype(np.float64)
        finally:
            self.delete(synth);self.delete_settings(settings)
