#include <emscripten/bind.h>
#include "gcounter.hpp"
#include "gset.hpp"
#include "line_segment.hpp"

using namespace emscripten;

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

    // ── LineSegment (used for GSet) ────────────────────

    value_object<LineSegment>("LineSegment")
        .field("x1",    &LineSegment::x1)
        .field("y1",    &LineSegment::y1)
        .field("x2",    &LineSegment::x2)
        .field("y2",    &LineSegment::y2)
        .field("r",     &LineSegment::r)
        .field("g",     &LineSegment::g)
        .field("b",     &LineSegment::b)
        .field("width", &LineSegment::width);

    // Needed so embind can return std::vector<LineSegment> from state()
    register_vector<LineSegment>("VectorLineSegment");

    // ── GSet<LineSegment> ─────────────────────────────────────────────────────

    class_<GSet<LineSegment>>("GSet")
        .constructor()
        .function("insert", &GSet<LineSegment>::insert)
        .function("merge",  &GSet<LineSegment>::merge)
        .function("size",   &GSet<LineSegment>::size)
        .function("state",  &GSet<LineSegment>::state);
}
