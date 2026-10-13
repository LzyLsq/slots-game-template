import AppKit
let size = 512
let image = NSImage(size:NSSize(width:size,height:size))
image.lockFocus()
let attributes:[NSAttributedString.Key:Any] = [.font:NSFont.systemFont(ofSize:435),.foregroundColor:NSColor(calibratedRed:1,green:0.98,blue:0.94,alpha:1)]
let text = "\u{F8FF}" as NSString
let measured = text.size(withAttributes:attributes)
text.draw(at:NSPoint(x:(512-measured.width)/2,y:(512-measured.height)/2+15),withAttributes:attributes)
image.unlockFocus()
let bitmap=NSBitmapImageRep(data:image.tiffRepresentation!)!
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
