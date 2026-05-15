cmake_minimum_required(VERSION 3.15)
project(crdt-lib CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(crdt STATIC
    src/gcounter.cpp
    src/crdt_c_api.cpp
)
target_include_directories(crdt PUBLIC include)

if(EMSCRIPTEN)
    add_executable(crdt_wasm
        src/gcounter.cpp
        src/crdt_c_api.cpp
    )
    target_include_directories(crdt_wasm PRIVATE include)
    target_link_options(crdt_wasm PRIVATE
        "SHELL:-s MODULARIZE=1"
        "SHELL:-s EXPORT_NAME='CRDTModule'"
        "SHELL:-s EXPORTED_FUNCTIONS=[\"_gcounter_create\",\"_gcounter_destroy\",\"_gcounter_increment\",\"_gcounter_value\",\"_gcounter_merge\",\"_gcounter_num_nodes\",\"_gcounter_slot\"]"
        "SHELL:-s EXPORTED_RUNTIME_METHODS=[\"cwrap\",\"ccall\"]"
        "SHELL:-s ALLOW_MEMORY_GROWTH=1"
        "--no-entry"
    )
    set_target_properties(crdt_wasm PROPERTIES SUFFIX ".js")

    # Copy .js and .wasm to frontend/public after build
    add_custom_command(TARGET crdt_wasm POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy
            "${CMAKE_CURRENT_BINARY_DIR}/crdt_wasm.js"
            "${CMAKE_SOURCE_DIR}/../frontend/public/crdt_wasm.js"
        COMMAND ${CMAKE_COMMAND} -E copy
            "${CMAKE_CURRENT_BINARY_DIR}/crdt_wasm.wasm"
            "${CMAKE_SOURCE_DIR}/../frontend/public/crdt_wasm.wasm"
        COMMENT "Copying WASM output to frontend/public"
    )
endif()
