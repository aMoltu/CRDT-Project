FROM ubuntu:24.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake git build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY crdt-lib ./crdt-lib
COPY server   ./server

RUN cmake -B out -S server -DCMAKE_BUILD_TYPE=Release \
    && cmake --build out --parallel "$(nproc)"

# ── Runtime image ──────────────────────────────────────────────────────────────
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/out/crdt-server /usr/local/bin/crdt-server
EXPOSE 8080
CMD ["crdt-server"]
