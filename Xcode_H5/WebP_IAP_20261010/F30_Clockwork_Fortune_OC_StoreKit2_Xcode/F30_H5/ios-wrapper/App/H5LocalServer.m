#import "H5LocalServer.h"
#import <arpa/inet.h>
#import <fcntl.h>
#import <netinet/in.h>
#import <sys/socket.h>
#import <unistd.h>

static NSString *const H5ServerErrorDomain = @"com.xzkj.clockworkfortuneh5.localserver";

@interface H5LocalServer ()
@property(nonatomic, copy) NSString *rootPath;
@property(nonatomic) int listenSocket;
@property(nonatomic) dispatch_source_t acceptSource;
@property(nonatomic) dispatch_queue_t serverQueue;
@property(nonatomic) dispatch_queue_t workerQueue;
@end

@implementation H5LocalServer

- (instancetype)init {
    self = [super init];
    if (self) {
        _listenSocket = -1;
        _serverQueue = dispatch_queue_create("com.xzkj.clockworkfortuneh5.accept", DISPATCH_QUEUE_SERIAL);
        _workerQueue = dispatch_queue_create("com.xzkj.clockworkfortuneh5.worker", DISPATCH_QUEUE_CONCURRENT);
    }
    return self;
}

- (NSURL *)startWithRootPath:(NSString *)rootPath error:(NSError **)error {
    [self stop];
    self.rootPath = rootPath.stringByStandardizingPath;

    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
        [self assignError:error code:errno message:@"Unable to create local server socket"];
        return nil;
    }

    int enabled = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &enabled, sizeof(enabled));

    struct sockaddr_in address;
    memset(&address, 0, sizeof(address));
    address.sin_len = sizeof(address);
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    // A stable origin preserves WKWebView localStorage between app launches.
    // Fail visibly on a collision instead of silently switching to a new save.
    address.sin_port = htons(19330);

    if (bind(fd, (struct sockaddr *)&address, sizeof(address)) != 0 || listen(fd, 16) != 0) {
        int savedError = errno;
        close(fd);
        [self assignError:error code:savedError message:@"Unable to bind local server socket"];
        return nil;
    }

    socklen_t length = sizeof(address);
    if (getsockname(fd, (struct sockaddr *)&address, &length) != 0) {
        int savedError = errno;
        close(fd);
        [self assignError:error code:savedError message:@"Unable to read local server port"];
        return nil;
    }

    fcntl(fd, F_SETFL, fcntl(fd, F_GETFL, 0) | O_NONBLOCK);
    self.listenSocket = fd;

    __weak typeof(self) weakSelf = self;
    self.acceptSource = dispatch_source_create(DISPATCH_SOURCE_TYPE_READ, (uintptr_t)fd, 0, self.serverQueue);
    dispatch_source_set_event_handler(self.acceptSource, ^{
        [weakSelf acceptConnections];
    });
    dispatch_source_set_cancel_handler(self.acceptSource, ^{
        close(fd);
    });
    dispatch_resume(self.acceptSource);

    uint16_t port = ntohs(address.sin_port);
    return [NSURL URLWithString:[NSString stringWithFormat:@"http://127.0.0.1:%u/index.html", port]];
}

- (void)stop {
    if (self.acceptSource) {
        dispatch_source_cancel(self.acceptSource);
        self.acceptSource = nil;
    } else if (self.listenSocket >= 0) {
        close(self.listenSocket);
    }
    self.listenSocket = -1;
}

- (void)dealloc {
    [self stop];
}

- (void)acceptConnections {
    while (self.listenSocket >= 0) {
        int client = accept(self.listenSocket, NULL, NULL);
        if (client < 0) {
            break;
        }
        // Scene crossfades can cancel an in-flight media request.
        int noSigPipe = 1;
        setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &noSigPipe, sizeof(noSigPipe));
        int flags = fcntl(client, F_GETFL, 0);
        if (flags >= 0) {
            fcntl(client, F_SETFL, flags & ~O_NONBLOCK);
        }
        NSString *root = self.rootPath;
        dispatch_async(self.workerQueue, ^{
            [self handleClient:client rootPath:root];
        });
    }
}

- (void)handleClient:(int)client rootPath:(NSString *)rootPath {
    struct timeval timeout = {5, 0};
    setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    setsockopt(client, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));

    NSMutableData *requestData = [NSMutableData data];
    uint8_t buffer[4096];
    while (requestData.length < 65536) {
        ssize_t count = recv(client, buffer, sizeof(buffer), 0);
        if (count <= 0) {
            break;
        }
        [requestData appendBytes:buffer length:(NSUInteger)count];
        NSData *separator = [@"\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding];
        if ([requestData rangeOfData:separator options:0 range:NSMakeRange(0, requestData.length)].location != NSNotFound) {
            break;
        }
    }

    NSString *request = [[NSString alloc] initWithData:requestData encoding:NSUTF8StringEncoding];
    NSString *firstLine = [request componentsSeparatedByString:@"\r\n"].firstObject;
    NSArray<NSString *> *parts = [firstLine componentsSeparatedByString:@" "];
    BOOL isHead = parts.count > 0 && [parts[0] isEqualToString:@"HEAD"];
    BOOL isGet = parts.count > 0 && [parts[0] isEqualToString:@"GET"];
    if (parts.count < 2 || (!isGet && !isHead)) {
        [self sendStatus:405 body:[@"Method Not Allowed" dataUsingEncoding:NSUTF8StringEncoding] mime:@"text/plain; charset=utf-8" client:client head:NO];
        close(client);
        return;
    }

    NSString *path = [parts[1] componentsSeparatedByString:@"?"].firstObject.stringByRemovingPercentEncoding;
    if (path.length == 0 || [path isEqualToString:@"/"]) {
        path = @"/index.html";
    }

    NSArray<NSString *> *components = [path componentsSeparatedByString:@"/"];
    if ([components containsObject:@".."] || [path containsString:@"\\"] || [path containsString:@"\0"]) {
        [self sendStatus:403 body:[@"Forbidden" dataUsingEncoding:NSUTF8StringEncoding] mime:@"text/plain; charset=utf-8" client:client head:isHead];
        close(client);
        return;
    }

    NSString *relativePath = [path hasPrefix:@"/"] ? [path substringFromIndex:1] : path;
    NSString *filePath = [rootPath stringByAppendingPathComponent:relativePath];
    BOOL isDirectory = NO;
    if ([[NSFileManager defaultManager] fileExistsAtPath:filePath isDirectory:&isDirectory] && isDirectory) {
        filePath = [filePath stringByAppendingPathComponent:@"index.html"];
    }

    NSData *body = [NSData dataWithContentsOfFile:filePath options:NSDataReadingMappedIfSafe error:nil];
    if (!body) {
        [self sendStatus:404 body:[@"Not Found" dataUsingEncoding:NSUTF8StringEncoding] mime:@"text/plain; charset=utf-8" client:client head:isHead];
        close(client);
        return;
    }

    NSString *mime = [self mimeTypeForPath:filePath data:body];
    NSString *rangeHeader = nil;
    for (NSString *line in [request componentsSeparatedByString:@"\r\n"]) {
        NSRange colon = [line rangeOfString:@":"];
        if (colon.location == NSNotFound) continue;
        if ([[line substringToIndex:colon.location].lowercaseString isEqualToString:@"range"]) {
            rangeHeader = [[line substringFromIndex:colon.location + 1] stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceCharacterSet];
            break;
        }
    }
    // Safari/WKWebView probes bytes=0-1 before starting local AAC playback.
    // Support a single byte range. Ignore multipart/unknown units as HTTP permits.
    if (isGet && [rangeHeader.lowercaseString hasPrefix:@"bytes="] && ![rangeHeader containsString:@","]) {
        NSArray<NSString *> *bounds = [[rangeHeader substringFromIndex:6] componentsSeparatedByString:@"-"];
        unsigned long long start = 0, end = body.length ? body.length - 1 : 0, value = 0;
        BOOL valid = bounds.count == 2 && body.length > 0;
        if (valid && bounds[0].length == 0) {
            valid = [self readRangeNumber:bounds[1] value:&value] && value > 0;
            start = valid && value < body.length ? body.length - value : 0;
        } else if (valid) {
            valid = [self readRangeNumber:bounds[0] value:&start] && start < body.length;
            if (valid && bounds[1].length) {
                valid = [self readRangeNumber:bounds[1] value:&value] && value >= start;
                end = MIN(value, end);
            }
        }
        if (!valid) {
            NSString *headers = [NSString stringWithFormat:@"Accept-Ranges: bytes\r\nContent-Range: bytes */%lu\r\n", (unsigned long)body.length];
            [self sendStatus:416 body:NSData.data mime:mime extraHeaders:headers client:client head:NO];
        } else {
            NSString *headers = [NSString stringWithFormat:@"Accept-Ranges: bytes\r\nContent-Range: bytes %llu-%llu/%lu\r\n", start, end, (unsigned long)body.length];
            NSData *partial = [body subdataWithRange:NSMakeRange((NSUInteger)start, (NSUInteger)(end - start + 1))];
            [self sendStatus:206 body:partial mime:mime extraHeaders:headers client:client head:NO];
        }
    } else {
        [self sendStatus:200 body:body mime:mime extraHeaders:@"Accept-Ranges: bytes\r\n" client:client head:isHead];
    }
    close(client);
}

- (BOOL)readRangeNumber:(NSString *)text value:(unsigned long long *)value {
    if (text.length == 0 || text.length > 19 || [text rangeOfCharacterFromSet:NSCharacterSet.decimalDigitCharacterSet.invertedSet].location != NSNotFound) return NO;
    NSScanner *scanner = [NSScanner scannerWithString:text];
    return [scanner scanUnsignedLongLong:value] && scanner.isAtEnd;
}

- (NSString *)mimeTypeForPath:(NSString *)path data:(NSData *)data {
    if (data.length >= 12) {
        const uint8_t *bytes = data.bytes;
        if (memcmp(bytes, "RIFF", 4) == 0 && memcmp(bytes + 8, "WEBP", 4) == 0) {
            return @"image/webp";
        }
    }
    NSDictionary<NSString *, NSString *> *types = @{
        @"html": @"text/html; charset=utf-8",
        @"js": @"text/javascript; charset=utf-8",
        @"css": @"text/css; charset=utf-8",
        @"json": @"application/json; charset=utf-8",
        @"png": @"image/png",
        @"jpg": @"image/jpeg",
        @"jpeg": @"image/jpeg",
        @"webp": @"image/webp",
        @"svg": @"image/svg+xml",
        @"mp3": @"audio/mpeg",
        @"ogg": @"audio/ogg",
        @"wav": @"audio/wav",
        @"m4a": @"audio/mp4",
        @"aac": @"audio/aac",
        @"bin": @"application/octet-stream",
        @"wasm": @"application/wasm"
    };
    return types[path.pathExtension.lowercaseString] ?: @"application/octet-stream";
}

- (void)sendStatus:(NSInteger)status body:(NSData *)body mime:(NSString *)mime client:(int)client head:(BOOL)head {
    [self sendStatus:status body:body mime:mime extraHeaders:@"" client:client head:head];
}

- (void)sendStatus:(NSInteger)status body:(NSData *)body mime:(NSString *)mime extraHeaders:(NSString *)extraHeaders client:(int)client head:(BOOL)head {
    NSString *reason = @{@200: @"OK", @206: @"Partial Content", @403: @"Forbidden", @404: @"Not Found", @405: @"Method Not Allowed", @416: @"Range Not Satisfiable"}[@(status)] ?: @"Error";
    NSString *header = [NSString stringWithFormat:
        @"HTTP/1.1 %ld %@\r\nContent-Type: %@\r\nContent-Length: %lu\r\n%@Cache-Control: no-cache\r\nConnection: close\r\n\r\n",
        (long)status, reason, mime, (unsigned long)body.length, extraHeaders];
    [self sendData:[header dataUsingEncoding:NSUTF8StringEncoding] client:client];
    if (!head) {
        [self sendData:body client:client];
    }
}

- (void)sendData:(NSData *)data client:(int)client {
    const uint8_t *bytes = data.bytes;
    NSUInteger sent = 0;
    while (sent < data.length) {
        ssize_t count = send(client, bytes + sent, data.length - sent, 0);
        if (count <= 0) {
            return;
        }
        sent += (NSUInteger)count;
    }
}

- (void)assignError:(NSError **)error code:(NSInteger)code message:(NSString *)message {
    if (error) {
        *error = [NSError errorWithDomain:H5ServerErrorDomain
                                     code:code
                                 userInfo:@{NSLocalizedDescriptionKey: message}];
    }
}

@end
