#include "App.h"
#include <nlohmann/json.hpp>
#include "rga.hpp"
#include "gcounter.hpp"
#include "gset.hpp"
#include "line_segment.hpp"

#include <cstdlib>
#include <iostream>
#include <map>
#include <string>
#include <unordered_set>
#include <vector>

using json = nlohmann::json;

// ── G-Counter room ─────────────────────────────────────────────────────────────
//
// Each connected client owns one slot. The server tracks a map of nodeId → count.
// On increment, the server updates the slot and fans out the op to all other clients.

struct GCData { int node_id = -1; };

struct GCounterRoom {
    std::map<int, int> slots;
    int next_node_id = 0;
    std::unordered_set<uWS::WebSocket<false, true, GCData>*> clients;
};

void mount_gcounter(uWS::App& app, GCounterRoom& room) {
    app.ws<GCData>("/gcounter", {
        .compression = uWS::DISABLED,
        .open = [&room](auto* ws) {
            int nid = room.next_node_id++;
            ws->getUserData()->node_id = nid;
            room.slots[nid] = 0;
            room.clients.insert(ws);

            json msg;
            msg["type"]    = "gcounter_init";
            msg["node_id"] = nid;
            msg["slots"]   = json::object();
            for (auto& [id, v] : room.slots)
                msg["slots"][std::to_string(id)] = v;
            ws->send(msg.dump(), uWS::OpCode::TEXT);
        },
        .message = [&room](auto* ws, std::string_view data, uWS::OpCode) {
            try {
                json op = json::parse(data);
                if (op.value("type", "") != "gcounter_increment") return;
                int nid   = op["node_id"].get<int>();
                int delta = op["delta"].get<int>();
                if (delta > 0) room.slots[nid] += delta;
                std::string out = op.dump();
                for (auto* c : room.clients)
                    if (c != ws) c->send(out, uWS::OpCode::TEXT);
            } catch (...) {}
        },
        .close = [&room](auto* ws, int, std::string_view) {
            room.clients.erase(ws);
        }
    });
}

// ── G-Set room ─────────────────────────────────────────────────────────────────
//
// Server accumulates all segments. New clients receive a full snapshot; ongoing
// inserts are fanned out as individual ops.

struct GSData {};

struct GSetRoom {
    std::vector<LineSegment> segments;
    std::unordered_set<uWS::WebSocket<false, true, GSData>*> clients;
};

static json seg_to_json(const LineSegment& s) {
    return { {"x1",s.x1},{"y1",s.y1},{"x2",s.x2},{"y2",s.y2},
             {"r",s.r},  {"g",s.g},  {"b",s.b},  {"width",s.width} };
}

void mount_gset(uWS::App& app, GSetRoom& room) {
    app.ws<GSData>("/gset", {
        .compression = uWS::DISABLED,
        .open = [&room](auto* ws) {
            room.clients.insert(ws);
            json segs = json::array();
            for (const auto& s : room.segments) segs.push_back(seg_to_json(s));
            json msg; msg["type"] = "gset_init"; msg["segments"] = segs;
            ws->send(msg.dump(), uWS::OpCode::TEXT);
        },
        .message = [&room](auto* ws, std::string_view data, uWS::OpCode) {
            try {
                json op = json::parse(data);
                if (op.value("type", "") != "gset_insert") return;
                auto& s = op["seg"];
                room.segments.push_back({
                    s["x1"].get<float>(), s["y1"].get<float>(),
                    s["x2"].get<float>(), s["y2"].get<float>(),
                    s["r"].get<float>(),  s["g"].get<float>(),
                    s["b"].get<float>(),  s["width"].get<float>()
                });
                std::string out = op.dump();
                for (auto* c : room.clients)
                    if (c != ws) c->send(out, uWS::OpCode::TEXT);
            } catch (...) {}
        },
        .close = [&room](auto* ws, int, std::string_view) {
            room.clients.erase(ws);
        }
    });
}

// ── RGA room ───────────────────────────────────────────────────────────────────
//
// Server holds a replica (nodeId=0 as placeholder, it never inserts itself).
// Clients receive their assigned nodeId + full char state on connect.
// Inserts/removes are applied to the server replica and fanned out.

struct RGAData { int node_id = -1; };

struct RGARoom {
    RGA  rga{0};
    int  next_node_id = 0;
    std::unordered_set<uWS::WebSocket<false, true, RGAData>*> clients;
};

void mount_rga(uWS::App& app, RGARoom& room) {
    app.ws<RGAData>("/rga", {
        .compression = uWS::DISABLED,
        .open = [&room](auto* ws) {
            int nid = room.next_node_id++;
            ws->getUserData()->node_id = nid;
            room.clients.insert(ws);

            json msg;
            msg["type"]    = "rga_init";
            msg["node_id"] = nid;
            msg["chars"]   = json::parse(room.rga.chars_json());
            ws->send(msg.dump(), uWS::OpCode::TEXT);
        },
        .message = [&room](auto* ws, std::string_view data, uWS::OpCode) {
            try {
                json op   = json::parse(data);
                std::string type = op.value("type", "");

                if (type == "rga_insert") {
                    room.rga.insert_remote(
                        op["left_node_id"].get<int>(),
                        op["left_seq"].get<int>(),
                        op["char"].get<std::string>(),
                        op["node_id"].get<int>(),
                        op["seq"].get<int>(),
                        op["lamport"].get<int>()
                    );
                } else if (type == "rga_remove") {
                    room.rga.remove_by_id(
                        op["node_id"].get<int>(),
                        op["seq"].get<int>()
                    );
                } else return;

                std::string out = op.dump();
                for (auto* c : room.clients)
                    if (c != ws) c->send(out, uWS::OpCode::TEXT);
            } catch (...) {}
        },
        .close = [&room](auto* ws, int, std::string_view) {
            room.clients.erase(ws);
        }
    });
}

// ── Entry point ────────────────────────────────────────────────────────────────

int main() {
    const char* port_env = std::getenv("PORT");
    int port = port_env ? std::stoi(port_env) : 8080;

    GCounterRoom gc_room;
    GSetRoom     gs_room;
    RGARoom      rga_room;

    uWS::App app;
    mount_gcounter(app, gc_room);
    mount_gset(app, gs_room);
    mount_rga(app, rga_room);

    app.listen(port, [port](auto* token) {
        if (token) std::cout << "Listening on port " << port << "\n";
        else { std::cerr << "Failed to listen on port " << port << "\n"; std::exit(1); }
    }).run();
}
