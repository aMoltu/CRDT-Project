#pragma once

#ifdef __cplusplus
extern "C" {
#endif

void* gcounter_create(int node_id, int num_nodes);
void  gcounter_destroy(void* handle);
void  gcounter_increment(void* handle, int amount);
int   gcounter_value(void* handle);
void  gcounter_merge(void* handle, void* other);
int   gcounter_num_nodes(void* handle);
int   gcounter_slot(void* handle, int index);

#ifdef __cplusplus
}
#endif
