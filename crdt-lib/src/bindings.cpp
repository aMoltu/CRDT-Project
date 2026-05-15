#include <emscripten/bind.h>
#include "gcounter.hpp"
#include "orset.hpp"
#include "line_segment.hpp"

using namespace emscripten;

// To expose a new element type with ORSet, add a value_object<YourType>
// and a class_<ORSet<YourType>> block below.

EMSCRIPTEN_BINDINGS(crdt) {

    // ── GCounter ──────────────────────────────────────────────────────────────

    class_<GCounter>("GCounter")
        .constructor<int, int>()
        .function("increment", &GCounter::increment)
        .function("value",     &GCounter::value)
        .function("merge",     &GCounter::merge)
        .function("slot",      &GCounter::slot)
        .function("nodeId",    &GCounter::nodeId)
        .function("numNodes",  &GCounter::numNodes);
}
