import Foundation

private let suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc"]

/// Compact idle-game number formatting: 1.2K, 850M, 4.06Qa, then 1.23e48.
func fmt(_ value: Double) -> String {
    if value.isNaN { return "0" }
    if value.isInfinite { return "∞" }
    let v = abs(value)
    if v < 1 { return v == 0 ? "0" : trimmed(value, 2) }
    if v < 1000 {
        if v < 10 { return trimmed(value, 2) }
        if v < 100 { return trimmed(value, 1) }
        return trimmed(value, 0)
    }
    let group = Int(floor(log10(v) / 3))
    if group < suffixes.count {
        let scaled = value / pow(1000, Double(group))
        let a = abs(scaled)
        return trimmed(scaled, a < 10 ? 2 : (a < 100 ? 1 : 0)) + suffixes[group]
    }
    let e = Int(floor(log10(v)))
    return trimmed(value / pow(10, Double(e)), 2) + "e" + String(e)
}

private func trimmed(_ v: Double, _ decimals: Int) -> String {
    var s = String(format: "%.\(decimals)f", v)
    guard s.contains(".") else { return s }
    while s.hasSuffix("0") { s.removeLast() }
    if s.hasSuffix(".") { s.removeLast() }
    return s
}

/// "4.2s", "3m 12s", "5h 08m", "2d 6h", "—"
func fmtTime(_ seconds: Double) -> String {
    guard seconds.isFinite, seconds > 0 else { return "—" }
    if seconds < 10 { return trimmed(seconds, 1) + "s" }
    if seconds < 60 { return "\(Int(seconds))s" }
    if seconds < 3600 {
        let m = Int(seconds) / 60, s = Int(seconds) % 60
        return "\(m)m \(String(format: "%02d", s))s"
    }
    if seconds < 86_400 {
        let h = Int(seconds) / 3600, m = (Int(seconds) % 3600) / 60
        return "\(h)h \(String(format: "%02d", m))m"
    }
    if seconds < 86_400 * 365 {
        let d = Int(seconds) / 86_400, h = (Int(seconds) % 86_400) / 3600
        return "\(d)d \(h)h"
    }
    return fmt(seconds / (86_400 * 365)) + "y"
}

let romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
