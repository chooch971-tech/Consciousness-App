import SwiftUI

/// Ten generators, deliberately uniform. A generator has exactly one stat you
/// can buy, and buying it is the entire moment-to-moment interaction.
///
/// The chain runs inward: generator N's laps build generator N−1, and
/// generator I's laps pay Energy. Buying a deep generator therefore compounds
/// through every generator beneath it.
enum Gen {
    static let count = 10

    /// Laps per second contributed by a single unit, before multipliers.
    static let baseLapRate = 2.0

    /// Price of the first unit of each generator.
    /// Calibrated against a target unlock schedule rather than picked by hand.
    /// The gaps between tiers have to *widen* as you go: the chain compounds,
    /// so evenly-spaced prices make later generators arrive faster, not slower.
    static let baseCost: [Double] = [
        10, 55, 1.7e4, 1.3e7, 2.8e10, 7.5e14, 1.2e19, 8.0e24, 3.0e30, 5.0e36,
    ]

    /// Every purchase of a generator raises its own next price by this much.
    static let costGrowth = 2.6

    /// Red at generator I, sweeping to magenta at generator X.
    static func hue(_ i: Int) -> Double {
        Double(i) / Double(count - 1) * 0.85
    }

    static func color(_ i: Int) -> Color {
        Color(hue: hue(i), saturation: 0.85, brightness: 1.0)
    }

    /// Muted variant used for the buy tiles.
    static func tileColor(_ i: Int) -> Color {
        Color(hue: hue(i), saturation: 0.55, brightness: 0.52)
    }
}

/// Bought once each with Cores. Kept deliberately short — eight permanent
/// choices, no tree, no prerequisites to reason about.
enum Perk: String, Codable, CaseIterable, Identifiable {
    case overdrive1, overdrive2, overdrive3
    case headStart, deepStart
    case richLap
    case autobuy
    case coldStorage

    var id: String { rawValue }

    var name: String {
        switch self {
        case .overdrive1:  return "Overdrive I"
        case .overdrive2:  return "Overdrive II"
        case .overdrive3:  return "Overdrive III"
        case .headStart:   return "Head Start"
        case .deepStart:   return "Deep Start"
        case .richLap:     return "Rich Laps"
        case .autobuy:     return "Autobuyer"
        case .coldStorage: return "Cold Storage"
        }
    }

    var detail: String {
        switch self {
        case .overdrive1:  return "All laps ×2"
        case .overdrive2:  return "All laps ×3"
        case .overdrive3:  return "All laps ×5"
        case .headStart:   return "Start every run with 10 of generators I–III"
        case .deepStart:   return "Start every run with 5 of generators IV–VI"
        case .richLap:     return "Generator I laps pay ×10 Energy"
        case .autobuy:     return "Buys generators for you, cheapest first"
        case .coldStorage: return "Offline progress 100%, capped at 24h"
        }
    }

    var cost: Double {
        switch self {
        case .overdrive1:  return 2
        case .overdrive2:  return 10
        case .overdrive3:  return 50
        case .headStart:   return 5
        case .deepStart:   return 25
        case .richLap:     return 8
        case .autobuy:     return 30
        case .coldStorage: return 15
        }
    }

    var symbol: String {
        switch self {
        case .overdrive1, .overdrive2, .overdrive3: return "bolt.fill"
        case .headStart, .deepStart: return "flag.fill"
        case .richLap: return "circle.hexagongrid.fill"
        case .autobuy: return "wand.and.stars"
        case .coldStorage: return "moon.zzz.fill"
        }
    }
}

enum Balance {
    /// Energy needed this run before a Promote is worth anything.
    static let promoteFloor = 1e6
    /// Cores = coreScale * (log10(energy this run) - 6) ^ coreExponent
    static let coreScale = 0.55
    static let coreExponent = 1.1
    /// Each Core ever earned permanently speeds every lap up by this much.
    static let corePermanentBonus = 0.05
}
