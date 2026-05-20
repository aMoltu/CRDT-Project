#include <emscripten/bind.h>
#include "gcounter.hpp"
#include "gset.hpp"
#include "rga.hpp"
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

    // ── LineSegment (used for GSet and ORSet) ─────────────────────────────────

    value_object<LineSegment>("LineSegment")
        .field("x1",    &LineSegment::x1)
        .field("y1",    &LineSegment::y1)
        .field("x2",    &LineSegment::x2)
        .field("y2",    &LineSegment::y2)
        .field("r",     &LineSegment::r)
        .field("g",     &LineSegment::g)
        .field("b",     &LineSegment::b)
        .field("width", &LineSegment::width);

    register_vector<LineSegment>("VectorLineSegment");

    // ── GSet<LineSegment> ─────────────────────────────────────────────────────

    class_<GSet<LineSegment>>("GSet")
        .constructor()
        .function("insert", &GSet<LineSegment>::insert)
        .function("merge",  &GSet<LineSegment>::merge)
        .function("size",   &GSet<LineSegment>::size)
        .function("state",  &GSet<LineSegment>::state);

    // ── RGA ───────────────────────────────────────────────────────────────────

    class_<RGA>("RGA")
        .constructor<int>()
        .function("insert",               &RGA::insert)
        .function("insert_remote",        &RGA::insert_remote)
        .function("remove_at",            &RGA::remove_at)
        .function("remove_by_id",         &RGA::remove_by_id)
        .function("merge",                &RGA::merge)
        .function("text",                 &RGA::text)
        .function("left_node_id_at",      &RGA::left_node_id_at)
        .function("left_seq_at",          &RGA::left_seq_at)
        .function("node_id_at",           &RGA::node_id_at)
        .function("seq_at",               &RGA::seq_at)
        .function("get_node_id",          &RGA::get_node_id)
        .function("last_insert_seq",      &RGA::last_insert_seq)
        .function("last_insert_lamport",  &RGA::last_insert_lamport)
        .function("chars_json",           &RGA::chars_json);
}
