// Exercise the actual Objective-C HTTP handler through sockets without binding
// the app's port, changing saved data, or starting a second simulator process.
#import "H5LocalServer.h"
#import <sys/socket.h>
#import <unistd.h>

@interface H5LocalServer (TestHandler)
- (void)handleClient:(int)client rootPath:(NSString *)rootPath;
@end
static void check(BOOL value, NSString *message) {
    if (!value) { NSLog(@"FAIL %@", message); exit(1); }
}
static NSDictionary *request(H5LocalServer *server, NSString *root, NSString *method, NSString *range, NSString *path) {
    int pair[2]; check(socketpair(AF_UNIX, SOCK_STREAM, 0, pair) == 0, @"socketpair");
    int client = pair[0], worker = pair[1];
    struct timeval timeout = {5, 0}; setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    NSString *http = [NSString stringWithFormat:@"%@ %@ HTTP/1.1\r\nHost: 127.0.0.1\r\n%@\r\n", method, path, range ? [NSString stringWithFormat:@"Range: %@\r\n", range] : @""];
    NSData *query = [http dataUsingEncoding:NSUTF8StringEncoding];
    check(send(client, query.bytes, query.length, 0) == query.length, @"send request");
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{ [server handleClient:worker rootPath:root]; });
    NSMutableData *response = [NSMutableData data]; uint8_t buffer[16384]; ssize_t count;
    while ((count = recv(client, buffer, sizeof(buffer), 0)) > 0) [response appendBytes:buffer length:(NSUInteger)count];
    close(client);
    NSRange boundary = [response rangeOfData:[@"\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding] options:0 range:NSMakeRange(0, response.length)];
    check(boundary.location != NSNotFound, @"HTTP header present");
    NSString *headers = [[NSString alloc] initWithData:[response subdataWithRange:NSMakeRange(0, boundary.location)] encoding:NSUTF8StringEncoding];
    return @{@"headers": headers, @"body": [response subdataWithRange:NSMakeRange(NSMaxRange(boundary), response.length - NSMaxRange(boundary))]};
}
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        check(argc == 2, @"Pass the real F20_H5 directory");
        NSString *root = [NSString stringWithUTF8String:argv[1]];
        NSData *music = [NSData dataWithContentsOfFile:[root stringByAppendingPathComponent:@"audio/music-home.m4a"]];
        check(music.length > 100000, @"Real music present");
        H5LocalServer *server = [H5LocalServer new];
        for (NSDictionary *test in @[
            @{@"range": @"bytes=0-1", @"start": @0, @"count": @2},
            @{@"range": @"bytes=16-32", @"start": @16, @"count": @17},
            @{@"range": @"bytes=100-", @"start": @100, @"count": @(music.length - 100)},
            @{@"range": @"bytes=-16", @"start": @(music.length - 16), @"count": @16},
            @{@"range": @"bytes=0-999999999", @"start": @0, @"count": @(music.length)}
        ]) {
            NSDictionary *result = request(server, root, @"GET", test[@"range"], @"/audio/music-home.m4a");
            check([result[@"headers"] hasPrefix:@"HTTP/1.1 206 Partial Content"], test[@"range"]);
            check([result[@"headers"] containsString:@"Content-Type: audio/mp4"], @"AAC mime type");
            NSData *expected = [music subdataWithRange:NSMakeRange([test[@"start"] unsignedIntegerValue], [test[@"count"] unsignedIntegerValue])];
            check([result[@"body"] isEqualToData:expected], @"Exact range bytes");
        }
        for (NSString *range in @[@"bytes=999999999-", @"bytes=35-12", @"bytes=-0", @"bytes=x-y", @"bytes=999999999999999999999999-"]) {
            NSDictionary *result = request(server, root, @"GET", range, @"/audio/music-home.m4a");
            check([result[@"headers"] hasPrefix:@"HTTP/1.1 416"], @"Reject invalid/unsatisfiable ranges");
            check([result[@"headers"] containsString:[NSString stringWithFormat:@"Content-Range: bytes */%lu", (unsigned long)music.length]], @"416 total length");
        }
        NSDictionary *full = request(server, root, @"GET", nil, @"/audio/music-home.m4a");
        check([full[@"headers"] hasPrefix:@"HTTP/1.1 200"], @"Full GET still works");
        check([full[@"body"] isEqualToData:music], @"Full music unchanged");
        NSDictionary *head = request(server, root, @"HEAD", @"bytes=0-1", @"/audio/music-home.m4a");
        check([head[@"headers"] hasPrefix:@"HTTP/1.1 200"] && [head[@"body"] length] == 0, @"HEAD ignores Range and has no body");
        check([head[@"headers"] containsString:[NSString stringWithFormat:@"Content-Length: %lu", (unsigned long)music.length]], @"HEAD full size");
        NSDictionary *html = request(server, root, @"GET", nil, @"/index.html");
        check([html[@"headers"] containsString:@"text/html"] && [html[@"body"] length] > 0, @"Existing game entry preserved");
        NSDictionary *traversal = request(server, root, @"GET", nil, @"/%2e%2e/index.html");
        check([traversal[@"headers"] hasPrefix:@"HTTP/1.1 403"], @"Path traversal remains forbidden");
        puts("PASS actual Objective-C server: AAC MIME, Safari 0-1 probe, closed/open/suffix ranges, exact bytes, invalid/overflow 416, full GET/HEAD, game entry and traversal protection.");
    }
    return 0;
}
