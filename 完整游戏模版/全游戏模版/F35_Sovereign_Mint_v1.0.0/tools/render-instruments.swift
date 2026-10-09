import Foundation
import AVFoundation
struct Note:Decodable {let program:Int;let pitch:Int;let at:Double;let duration:Double;let velocity:Int;let pan:Float?;let percussion:Bool?;var samplerKey:Int {program + (percussion == true ? 128 : 0)}}
struct Score:Decodable {let name:String;let duration:Double;let notes:[Note]}
struct Event {let frame:Int64;let program:Int;let pitch:UInt8;let velocity:UInt8;let on:Bool}
let scores=try JSONDecoder().decode([Score].self,from:Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1])))
let destination=CommandLine.arguments[2], rate=44100.0
try FileManager.default.createDirectory(atPath:destination,withIntermediateDirectories:true)
for score in scores {
 let engine=AVAudioEngine(),format=AVAudioFormat(standardFormatWithSampleRate:rate,channels:2)!
 var samplers=[Int:AVAudioUnitSampler](),events=[Event]()
 for program in Set(score.notes.map{$0.samplerKey}).sorted(){
  let sampler=AVAudioUnitSampler();engine.attach(sampler);engine.connect(sampler,to:engine.mainMixerNode,format:nil)
  try sampler.loadSoundBankInstrument(at:URL(fileURLWithPath:"/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls"),program:UInt8(program % 128),bankMSB:UInt8(program >= 128 ? kAUSampler_DefaultPercussionBankMSB : kAUSampler_DefaultMelodicBankMSB),bankLSB:0)
  sampler.masterGain = -8;sampler.stereoPan = score.notes.first(where:{$0.samplerKey==program})?.pan ?? 0
  samplers[program]=sampler
 }
 for n in score.notes {
  events.append(Event(frame:Int64((n.at*rate).rounded()),program:n.samplerKey,pitch:UInt8(n.pitch),velocity:UInt8(n.velocity),on:true))
  events.append(Event(frame:Int64(((n.at+n.duration)*rate).rounded()),program:n.samplerKey,pitch:UInt8(n.pitch),velocity:0,on:false))
 }
 events.sort{if $0.frame == $1.frame{return !$0.on && $1.on};return $0.frame<$1.frame}
 try engine.enableManualRenderingMode(.offline,format:format,maximumFrameCount:2048);try engine.start()
 let output=try AVAudioFile(forWriting:URL(fileURLWithPath:destination+"/"+score.name+".wav"),settings:format.settings)
 let buffer=AVAudioPCMBuffer(pcmFormat:engine.manualRenderingFormat,frameCapacity:2048)!,total=Int64((score.duration*rate).rounded())
 var frame:Int64=0,index=0,retries=0,active=[String:Int]()
 while frame<total {
  while index<events.count && events[index].frame<=frame {
   let ev=events[index],key="\(ev.program):\(ev.pitch)"
   if ev.on {active[key,default:0]+=1;samplers[ev.program]!.startNote(ev.pitch,withVelocity:ev.velocity,onChannel:0)}
   else {active[key,default:0]=max(0,active[key,default:0]-1);if active[key]==0{samplers[ev.program]!.stopNote(ev.pitch,onChannel:0)}}
   index+=1
  }
  let next=index<events.count ? events[index].frame:total, count=AVAudioFrameCount(min(2048,total-frame,max(1,next-frame)))
  let status=try engine.renderOffline(count,to:buffer)
  switch status {
   case .success:try output.write(from:buffer);frame+=Int64(buffer.frameLength);retries=0
   case .cannotDoInCurrentContext:retries+=1;if retries>30{fatalError("Renderer unavailable")}
   case .insufficientDataFromInputNode: fatalError("Insufficient sampler data")
   case .error:fatalError("Audio render failed")
   @unknown default:fatalError("Unknown audio render status")
  }
 }
 engine.stop();print("RENDER \(score.name) \(score.duration)s \(score.notes.count) notes")
}
