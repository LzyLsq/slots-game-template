// Build-time only. Render original scores with macOS's instrument bank.
// Neither Swift nor the sound bank is shipped with the app.
import AVFoundation
import Foundation

struct Instrument: Decodable { let program: UInt8; let volume: Float; let pan: Float; let percussion: Bool }
struct Note: Decodable { let instrument: Int; let note: UInt8; let time: Double; let duration: Double; let velocity: UInt8 }
struct Score: Decodable { let instruments: [Instrument]; let notes: [Note]; let duration: Double; let loop: Bool }
struct Event { let frame: Int; let instrument: Int; let note: UInt8; let velocity: UInt8; let on: Bool }

guard CommandLine.arguments.count == 3 else { fatalError("Usage: render-music score.json output.f32") }
let score = try JSONDecoder().decode(Score.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
let rate = 44100.0
let cycleFrames = Int((score.duration * rate).rounded())
let cycles = score.loop ? 2 : 1
let engine = AVAudioEngine()
let bank = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")
let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 2)!
let samplers = try score.instruments.map { instrument -> AVAudioUnitSampler in
    let sampler = AVAudioUnitSampler()
    engine.attach(sampler)
    try sampler.loadSoundBankInstrument(at: bank, program: instrument.program,
                                       bankMSB: instrument.percussion ? 120 : 121, bankLSB: 0)
    engine.connect(sampler, to: engine.mainMixerNode, format: format)
    // MIDI CCs provide stable musical balance before the common room effect.
    sampler.sendController(7, withValue: UInt8(max(1, min(127, instrument.volume * 127))), onChannel: 0)
    sampler.sendController(10, withValue: UInt8(max(0, min(127, (instrument.pan + 1) * 63.5))), onChannel: 0)
    sampler.sendController(91, withValue: 0, onChannel: 0)
    return sampler
}
let room = AVAudioUnitReverb()
room.loadFactoryPreset(.mediumRoom)
room.wetDryMix = 11
engine.attach(room)
engine.connect(engine.mainMixerNode, to: room, format: format)
engine.connect(room, to: engine.outputNode, format: format)
try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 1024)
try engine.start()
var events: [Event] = []
for cycle in 0..<cycles {
    for note in score.notes {
        let start = cycle * cycleFrames + Int((note.time * rate).rounded())
        events.append(Event(frame: start, instrument: note.instrument, note: note.note, velocity: note.velocity, on: true))
        events.append(Event(frame: start + Int((note.duration * rate).rounded()), instrument: note.instrument, note: note.note, velocity: 0, on: false))
    }
}
events.sort { $0.frame == $1.frame ? (!$0.on && $1.on) : $0.frame < $1.frame }
let buffer = AVAudioPCMBuffer(pcmFormat: engine.manualRenderingFormat, frameCapacity: 1024)!
let total = cycleFrames * cycles
let skip = score.loop ? cycleFrames : 0
var cursor = 0, eventIndex = 0, retries = 0
var rendered = [Float](repeating: 0, count: cycleFrames * 2)
while cursor < total {
    while eventIndex < events.count && events[eventIndex].frame <= cursor {
        let event = events[eventIndex]
        if event.on { samplers[event.instrument].startNote(event.note, withVelocity: event.velocity, onChannel: 0) }
        else { samplers[event.instrument].stopNote(event.note, onChannel: 0) }
        eventIndex += 1
    }
    let nextEvent = eventIndex < events.count ? events[eventIndex].frame : total
    let count = min(1024, min(total - cursor, max(1, nextEvent - cursor)))
    let status = try engine.renderOffline(AVAudioFrameCount(count), to: buffer)
    if status == .success {
        let channels = buffer.floatChannelData!
        for frame in 0..<Int(buffer.frameLength) where cursor + frame >= skip {
            let index = (cursor + frame - skip) * 2
            rendered[index] = channels[0][frame]
            rendered[index + 1] = channels[1][frame]
        }
        cursor += Int(buffer.frameLength); retries = 0
    } else if status == .cannotDoInCurrentContext || status == .insufficientDataFromInputNode {
        retries += 1
        if retries > 100 { fatalError("Offline rendering stalled") }
    } else { fatalError("Render error: \(status)") }
}
engine.stop()
try rendered.withUnsafeBufferPointer { pointer in
    try Data(buffer: pointer).write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
}
print("Rendered \(score.duration)s, \(score.notes.count) notes, \(samplers.count) instruments")
