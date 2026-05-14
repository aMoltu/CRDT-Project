#include <array>
#include <algorithm>
#include <iostream>
#include <numeric>
#include <cassert>

class GCounter {
    int id;
    std::array<int, 4> counters{}; // Max 4 replicas
    
    public:
    GCounter(int node_id): id(node_id) {};
    void increment(){
        counters[id]++;
    }
    void merge(const GCounter& other){
        assert(counters.size() == other.counters.size());
        for (int i = 0; i < counters.size(); i++){
            if (i == id) continue;
            counters[i] = std::max(counters[i], other.counters[i]);
        }
    }
    int getCount(){
        return std::accumulate(counters.begin(), counters.end(), 0);
    }
};
