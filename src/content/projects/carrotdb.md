---
title: CarrotDB
summary: An in-memory key-value database built from scratch in modern C++ to understand Redis internals and distributed systems.
publishedAt: 2026-08-30
type: Database internals
stack: [C++23, Redis internals, epoll, RESP]
featured: true
repository: https://github.com/kiranpratyush/carrotdb
draft: false
---

CarrotDB is a Redis-compatible, in-memory key-value database built as a hands-on study of database internals. It implements the RESP protocol and uses a reactor-style, epoll-based event loop for concurrent client connections.

The project explores strings, lists, streams, sorted sets, geospatial indexes, transactions, pub/sub, access control, RDB snapshot loading, and primary-replica synchronization. Several core structures—including listpacks, skiplists, radix trees, and geohashes—are implemented directly to make their trade-offs visible.

CarrotDB is an educational system under active development, not a production database. The goal is to understand the machinery beneath Redis by building and reasoning about each part.
