import Foundation

struct LoopState: Codable {
    var unlocked = false
    var charge: Double = 0
    var completions: Double = 0
    var yieldLevel = 0
    var intakeLevel = 0
    var pulseLevel = 0
    var modules: [ModuleID] = []
}

struct GameState: Codable {
    var energy: Double = 0
    var resonance: Double = 0
    var echoes: Double = 0

    /// Never spent — drives the permanent "+2% per Echo" yield bonus.
    var lifetimeEchoes: Double = 0
    var energyThisRun: Double = 0
    var lifetimeEnergy: Double = 0

    var loops: [LoopState] = []
    var nodes: Set<String> = []
    var modulesOwned: [String: Int] = [:]

    /// Flywheel accumulation, reset on Collapse.
    var flywheel: Double = 0
    var collapses = 0

    var lastSeen = Date()
    var runStart = Date()
    var playTime: Double = 0

    static func new() -> GameState {
        var s = GameState()
        s.loops = (0..<LoopConfig.count).map { _ in LoopState() }
        s.loops[0].unlocked = true
        return s
    }

    /// Highest loop brought online, as an index.
    var deepestTier: Int {
        var deepest = 0
        for (i, l) in loops.enumerated() where l.unlocked { deepest = i }
        return deepest
    }
}

struct OfflineReport: Identifiable {
    let id = UUID()
    let elapsed: Double
    let efficiency: Double
    let energy: Double
    let resonance: Double
    let completions: Double
}
