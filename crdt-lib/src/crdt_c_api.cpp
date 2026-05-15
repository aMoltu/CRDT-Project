#include "crdt_c_api.h"
#include "gcounter.hpp"

void* gcounter_create(int node_id, int num_nodes) {
    return new GCounter(node_id, num_nodes);
}

void gcounter_destroy(void* handle) {
    delete static_cast<GCounter*>(handle);
}

void gcounter_increment(void* handle, int amount) {
    static_cast<GCounter*>(handle)->increment(amount);
}

int gcounter_value(void* handle) {
    return static_cast<GCounter*>(handle)->value();
}

void gcounter_merge(void* handle, void* other) {
    static_cast<GCounter*>(handle)->merge(*static_cast<GCounter*>(other));
}

int gcounter_num_nodes(void* handle) {
    return static_cast<GCounter*>(handle)->numNodes();
}

int gcounter_slot(void* handle, int index) {
    return static_cast<GCounter*>(handle)->state()[index];
}
