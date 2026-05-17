#pragma once
#include <string>
#include <vector>
#include <utility>
#include <algorithm>

struct RGAChar {
    int  node_id;
    int  seq;
    int  lamport;
    int  left_node_id;  // -1 = start of document
    int  left_seq;
    char value;
    bool deleted;
};

class RGA {
public:
    explicit RGA(int node_id) : node_id_(node_id), next_seq_(0), clock_(0) {}

    void insert(int left_node_id, int left_seq, const std::string& value) {
        if (value.empty()) return;
        RGAChar c{ node_id_, next_seq_++, ++clock_, left_node_id, left_seq, value[0], false };
        place(c);
    }

    void remove_at(int k) {
        int count = -1;
        for (auto& c : chars_) {
            if (!c.deleted && ++count == k) {
                c.deleted = true;
                return;
            }
        }
    }

    void merge(const RGA& other) {
        for (const auto& oc : other.chars_) {
            if (!oc.deleted) continue;
            for (auto& c : chars_)
                if (c.node_id == oc.node_id && c.seq == oc.seq) c.deleted = true;
        }
        bool progress;
        do {
            progress = false;
            for (const auto& oc : other.chars_) {
                if (has(oc.node_id, oc.seq)) continue;
                if (oc.left_node_id == -1 || has(oc.left_node_id, oc.left_seq)) {
                    clock_ = std::max(clock_, oc.lamport);
                    place(oc);
                    progress = true;
                }
            }
        } while (progress);
    }

    std::string text() const {
        std::string s;
        for (const auto& c : chars_)
            if (!c.deleted) s += c.value;
        return s;
    }

    int left_node_id_at(int k) const { return k < 0 ? -1 : id_at(k).first; }
    int left_seq_at(int k)     const { return k < 0 ? -1 : id_at(k).second; }

    int get_node_id() const { return node_id_; }

    std::string chars_json() const {
        std::string out = "[";
        bool first = true;
        for (const auto& c : chars_) {
            if (!first) out += ",";
            first = false;
            std::string esc;
            switch (c.value) {
                case '"':  esc = "\\\""; break;
                case '\\': esc = "\\\\"; break;
                case '\n': esc = "\\n";  break;
                case '\r': esc = "\\r";  break;
                case '\t': esc = "\\t";  break;
                default:   esc = std::string(1, c.value);
            }
            out += "{\"n\":"  + std::to_string(c.node_id)
                 + ",\"s\":"  + std::to_string(c.seq)
                 + ",\"l\":"  + std::to_string(c.lamport)
                 + ",\"ln\":" + std::to_string(c.left_node_id)
                 + ",\"ls\":" + std::to_string(c.left_seq)
                 + ",\"v\":\"" + esc + "\""
                 + ",\"d\":"  + (c.deleted ? "true" : "false")
                 + "}";
        }
        out += "]";
        return out;
    }

private:
    int  node_id_;
    int  next_seq_;
    int  clock_;
    std::vector<RGAChar> chars_;

    bool has(int nid, int seq) const {
        for (const auto& c : chars_)
            if (c.node_id == nid && c.seq == seq) return true;
        return false;
    }

    int find_idx(int nid, int seq) const {
        if (nid == -1) return -1;
        for (int i = 0; i < (int)chars_.size(); i++)
            if (chars_[i].node_id == nid && chars_[i].seq == seq) return i;
        return -1;
    }

    std::pair<int,int> id_at(int k) const {
        int count = -1;
        for (const auto& c : chars_)
            if (!c.deleted && ++count == k) return { c.node_id, c.seq };
        return { -1, -1 };
    }

    void place(const RGAChar& c) {
        int left_idx  = find_idx(c.left_node_id, c.left_seq);
        int insert_at = left_idx + 1;

        while (insert_at < (int)chars_.size()) {
            const auto& d = chars_[insert_at];
            int d_left_idx = find_idx(d.left_node_id, d.left_seq);
            if (d_left_idx < left_idx) break;
            if (d.lamport > c.lamport || (d.lamport == c.lamport && d.node_id > c.node_id))
                insert_at++;
            else
                break;
        }

        chars_.insert(chars_.begin() + insert_at, c);

        if (c.node_id == node_id_ && c.seq >= next_seq_)
            next_seq_ = c.seq + 1;
    }
};
