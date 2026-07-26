import Foundation

// MARK: - Loops

/// One rung of the cascade. Loop 0 fills from time; every other loop fills only
/// from pulses sent up the chain when the loop below it completes.
struct LoopConfig: Identifiable {
    let id: Int
    let name: String
    let flavor: String
    /// Charge needed for one completion.
    let requirement: Double
    /// Energy granted per completion, before multipliers.
    let baseYield: Double
    /// Resonance granted per completion, before multipliers.
    let baseResonance: Double
    /// Energy price to bring this loop online.
    let unlockCost: Double
    /// Anchor price for this loop's repeatable upgrades.
    let upgradeBase: Double

    static let all: [LoopConfig] = [
        LoopConfig(id: 0, name: "Spark",       flavor: "Burns on its own. Everything downstream is its echo.",
                   requirement: 2.0,  baseYield: 1,     baseResonance: 0,      unlockCost: 0,      upgradeBase: 10),
        LoopConfig(id: 1, name: "Coil",        flavor: "Stores the Spark's beats until it can throw a heavier one.",
                   requirement: 5,    baseYield: 15,    baseResonance: 0,      unlockCost: 30,     upgradeBase: 250),
        LoopConfig(id: 2, name: "Rotor",       flavor: "Turns stored beats into torque. The machine starts moving.",
                   requirement: 7,    baseYield: 400,   baseResonance: 0,      unlockCost: 2_500,  upgradeBase: 1.5e4),
        LoopConfig(id: 3, name: "Furnace",     flavor: "Slow, hot, and worth waiting for. First taste of Resonance.",
                   requirement: 9,    baseYield: 1.5e4, baseResonance: 0.05,   unlockCost: 2.0e5,  upgradeBase: 1.2e6),
        LoopConfig(id: 4, name: "Cascade",     flavor: "The chain becomes self-evident. Modules start paying for themselves.",
                   requirement: 11,   baseYield: 9.0e5, baseResonance: 2,      unlockCost: 8.0e6,  upgradeBase: 1.0e8),
        LoopConfig(id: 5, name: "Nexus",       flavor: "Ties distant rungs together. Splitters shine here.",
                   requirement: 13,   baseYield: 8.0e7, baseResonance: 60,     unlockCost: 1.2e9,  upgradeBase: 1.5e10),
        LoopConfig(id: 6, name: "Aurora",      flavor: "Fires on the scale of hours. Each completion is an event.",
                   requirement: 15,   baseYield: 9.0e9, baseResonance: 2_500,  unlockCost: 2.0e11, upgradeBase: 2.5e12),
        LoopConfig(id: 7, name: "Singularity", flavor: "The last rung. Nothing downstream — it just pays.",
                   requirement: 18,   baseYield: 2.0e12, baseResonance: 1.2e5, unlockCost: 4.0e13, upgradeBase: 5.0e14),
    ]

    static var count: Int { all.count }
}

// MARK: - Modules

/// Slotted into individual loops. Modules change *how* a loop behaves, not just
/// how big its numbers are — that's where the build variety lives.
enum ModuleID: String, Codable, CaseIterable, Identifiable {
    case intakeCoil
    case amplifier
    case condenser
    case overflowValve
    case splitter
    case flywheel
    case resonator
    case governor

    var id: String { rawValue }

    var name: String {
        switch self {
        case .intakeCoil:    return "Intake Coil"
        case .amplifier:     return "Amplifier"
        case .condenser:     return "Condenser"
        case .overflowValve: return "Overflow Valve"
        case .splitter:      return "Splitter"
        case .flywheel:      return "Flywheel"
        case .resonator:     return "Resonator"
        case .governor:      return "Governor"
        }
    }

    var symbol: String {
        switch self {
        case .intakeCoil:    return "arrow.down.to.line"
        case .amplifier:     return "waveform.path.ecg"
        case .condenser:     return "bolt.fill"
        case .overflowValve: return "drop.triangle.fill"
        case .splitter:      return "arrow.triangle.branch"
        case .flywheel:      return "gyroscope"
        case .resonator:     return "waveform"
        case .governor:      return "dial.high.fill"
        }
    }

    var detail: String {
        switch self {
        case .intakeCoil:    return "×1.75 charge received by this loop."
        case .amplifier:     return "×2 pulse strength sent out of this loop."
        case .condenser:     return "×3 Energy from this loop."
        case .overflowValve: return "Excess charge carries into the next fill instead of being lost."
        case .splitter:      return "Completions also pulse two loops ahead at 50% strength."
        case .flywheel:      return "Every completion permanently speeds up the Spark this run."
        case .resonator:     return "×4 Resonance from this loop."
        case .governor:      return "−25% charge required per completion."
        }
    }

    /// Resonance price of the first copy. Each additional copy costs ×2.6.
    var baseCost: Double {
        switch self {
        case .intakeCoil:    return 3
        case .amplifier:     return 8
        case .condenser:     return 5
        case .overflowValve: return 12
        case .splitter:      return 40
        case .flywheel:      return 25
        case .resonator:     return 18
        case .governor:      return 30
        }
    }
}

// MARK: - The Array (prestige tree)

struct ArrayNode: Identifiable {
    let id: String
    let name: String
    let detail: String
    let cost: Double
    let requires: [String]
    let column: Int

    static let all: [ArrayNode] = [
        // Column 0 — raw throughput
        ArrayNode(id: "speed1", name: "Overclock I", detail: "Spark base speed ×1.5",
                  cost: 3, requires: [], column: 0),
        ArrayNode(id: "speed2", name: "Overclock II", detail: "Spark base speed ×2",
                  cost: 15, requires: ["speed1"], column: 0),
        ArrayNode(id: "speed3", name: "Overclock III", detail: "Spark base speed ×3",
                  cost: 80, requires: ["speed2"], column: 0),
        ArrayNode(id: "pulseGlobal", name: "Harmonic Bus", detail: "All pulses ×1.5",
                  cost: 25, requires: ["speed1"], column: 0),
        ArrayNode(id: "yieldGlobal", name: "Grand Condenser", detail: "All Energy yields ×3",
                  cost: 35, requires: ["pulseGlobal"], column: 0),

        // Column 1 — head start
        ArrayNode(id: "seed1", name: "Prewired I", detail: "Start each run with Coil and Rotor online",
                  cost: 5, requires: [], column: 1),
        ArrayNode(id: "seed2", name: "Prewired II", detail: "Start each run with loops up to Cascade online",
                  cost: 30, requires: ["seed1"], column: 1),
        ArrayNode(id: "startEnergy", name: "Jumpstart", detail: "Start each run with 1M Energy",
                  cost: 18, requires: ["seed1"], column: 1),
        ArrayNode(id: "keepRes", name: "Resonance Vault", detail: "Keep Resonance and installed Modules through a Collapse",
                  cost: 12, requires: [], column: 1),
        ArrayNode(id: "echoGain", name: "Deep Echo", detail: "+60% Echoes from every Collapse",
                  cost: 60, requires: ["seed2"], column: 1),

        // Column 2 — machine capacity
        ArrayNode(id: "slots1", name: "Expanded Housings", detail: "+1 module slot on every loop",
                  cost: 8, requires: [], column: 2),
        ArrayNode(id: "slots2", name: "Deep Housings", detail: "+1 more module slot on every loop",
                  cost: 45, requires: ["slots1"], column: 2),
        ArrayNode(id: "offline1", name: "Cold Storage I", detail: "Offline progress 60% → 85%, cap 12h",
                  cost: 10, requires: [], column: 2),
        ArrayNode(id: "offline2", name: "Cold Storage II", detail: "Offline progress 100%, cap 24h",
                  cost: 55, requires: ["offline1"], column: 2),

        // Column 3 — automation
        ArrayNode(id: "autoYield", name: "Yield Autobuyer", detail: "Buys Yield upgrades automatically",
                  cost: 20, requires: [], column: 3),
        ArrayNode(id: "autoIntake", name: "Intake Autobuyer", detail: "Buys Intake upgrades automatically",
                  cost: 40, requires: ["autoYield"], column: 3),
        ArrayNode(id: "autoPulse", name: "Pulse Autobuyer", detail: "Buys Pulse upgrades automatically",
                  cost: 90, requires: ["autoIntake"], column: 3),
        ArrayNode(id: "autoLoop", name: "Loop Autobuyer", detail: "Brings new loops online automatically",
                  cost: 120, requires: ["autoPulse"], column: 3),
    ]

    static func byID(_ id: String) -> ArrayNode? { all.first { $0.id == id } }
}

enum Balance {
    // Each track's cost growth must outrun its own benefit growth, or the
    // economy runs away and the whole chain finishes in minutes. Pulse is the
    // steepest because it compounds through every loop downstream of it.
    static let yieldStep = 1.30
    static let yieldCostGrowth = 1.55
    static let intakeStep = 1.22
    static let intakeCostGrowth = 1.60
    static let pulseStep = 1.18
    static let pulseCostGrowth = 1.70

    static let moduleCostGrowth = 2.6
    static let baseModuleSlots = 2
    static let basePulse = 1.0
    static let flywheelPerCompletion = 0.0005

    /// A Collapse needs the cascade to actually reach its middle.
    static let collapseUnlockTier = 4
}
