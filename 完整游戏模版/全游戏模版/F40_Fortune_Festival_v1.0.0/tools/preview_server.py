#!/usr/bin/env python3
"""Serve the Cocos web build without stale browser caches during review."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--directory", default="build/web-mobile")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=6040, type=int)
    args = parser.parse_args()
    handler = partial(NoCacheHandler, directory=args.directory)
    ThreadingHTTPServer((args.host, args.port), handler).serve_forever()


if __name__ == "__main__":
    main()
