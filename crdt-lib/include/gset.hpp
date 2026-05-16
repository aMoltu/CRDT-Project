#pragma once
#include <set>
#include <vector>

template<typename T>
class GSet {
public:
    GSet() = default;

    void insert(const T& item) {
        items.insert(item);
    }

    void merge(const GSet<T>& other) {
        items.insert(other.items.begin(), other.items.end());
    }

    std::vector<T> state() const {
        std::vector<T> converted(items.begin(), items.end());
        return converted;
    }

    int size() const { return static_cast<int>(items.size()); }

private:
    std::set<T> items{};
};
