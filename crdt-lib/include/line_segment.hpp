#pragma once

struct LineSegment {
    float x1, y1, x2, y2;
    float r, g, b;
    float width;
};

inline bool operator<(const LineSegment& a, const LineSegment& b) {
    if (a.x1 != b.x1) return a.x1 < b.x1;
    if (a.y1 != b.y1) return a.y1 < b.y1;
    if (a.x2 != b.x2) return a.x2 < b.x2;
    if (a.y2 != b.y2) return a.y2 < b.y2;
    if (a.r != b.r) return a.r < b.r;
    if (a.g != b.g) return a.g < b.g;
    if (a.b != b.b) return a.b < b.b;
    return a.width < b.width;
}
