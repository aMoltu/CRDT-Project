cmake_minimum_required(VERSION 3.20)
project(crdt-server CXX C)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

# ── nlohmann/json ──────────────────────────────────────────────────────────────
FetchContent_Declare(json
    GIT_REPOSITORY https://github.com/nlohmann/json
    GIT_TAG        v3.11.3
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(json)

# ── uSockets (C foundation required by uWebSockets) ───────────────────────────
FetchContent_Declare(uSockets
    GIT_REPOSITORY https://github.com/uNetworking/uSockets
    GIT_TAG        v0.8.8
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(uSockets)

add_library(uSockets_lib STATIC
    ${usockets_SOURCE_DIR}/src/bsd.c
    ${usockets_SOURCE_DIR}/src/context.c
    ${usockets_SOURCE_DIR}/src/loop.c
    ${usockets_SOURCE_DIR}/src/socket.c
    ${usockets_SOURCE_DIR}/src/udp.c
    ${usockets_SOURCE_DIR}/src/eventing/epoll_kqueue.c
)
target_include_directories(uSockets_lib PUBLIC ${usockets_SOURCE_DIR}/src)
target_compile_definitions(uSockets_lib PUBLIC LIBUS_NO_SSL=1)

# ── uWebSockets (header-only C++) ─────────────────────────────────────────────
FetchContent_Declare(uWebSockets
    GIT_REPOSITORY https://github.com/uNetworking/uWebSockets
    GIT_TAG        v20.62.0
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(uWebSockets)

# ── crdt-lib ──────────────────────────────────────────────────────────────────
add_subdirectory(../crdt-lib ${CMAKE_BINARY_DIR}/crdt-lib)

# ── crdt-server ───────────────────────────────────────────────────────────────
add_executable(crdt-server src/main.cpp)

target_include_directories(crdt-server PRIVATE
    ${uwebsockets_SOURCE_DIR}/src
    ${usockets_SOURCE_DIR}/src
)
target_link_libraries(crdt-server PRIVATE
    crdt
    uSockets_lib
    nlohmann_json::nlohmann_json
)
target_compile_definitions(crdt-server PRIVATE LIBUS_NO_SSL=1 UWS_NO_ZLIB=1)
