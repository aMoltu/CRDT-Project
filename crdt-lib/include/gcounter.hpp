#pragma once
#include <vector>
#include <numeric>
#include <algorithm>
#include <stdexcept>

class GCounter {
public:
    GCounter(int node_id, int num_nodes);
    void increment(int amount = 1);
    int value() const;
    void merge(const GCounter& other);
    const std::vector<int>& state() const;
    int slot(int index) const { return counts[index]; }
    int nodeId() const { return id; }
    int numNodes() const { return static_cast<int>(counts.size()); }
private:
    int id;
    std::vector<int> counts;
};
