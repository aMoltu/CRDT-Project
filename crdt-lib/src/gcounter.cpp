#include "gcounter.hpp"

GCounter::GCounter(int node_id, int num_nodes)
    : id(node_id), counts(num_nodes, 0) {
    if (node_id < 0 || node_id >= num_nodes)
        throw std::invalid_argument("node_id out of range");
}

void GCounter::increment(int amount) {
    counts[id] += amount;
}

int GCounter::value() const {
    return std::accumulate(counts.begin(), counts.end(), 0);
}

void GCounter::merge(const GCounter& other) {
    if (counts.size() != other.counts.size())
        throw std::invalid_argument("counter size mismatch");
    for (size_t i = 0; i < counts.size(); ++i)
        counts[i] = std::max(counts[i], other.counts[i]);
}

const std::vector<int>& GCounter::state() const {
    return counts;
}
