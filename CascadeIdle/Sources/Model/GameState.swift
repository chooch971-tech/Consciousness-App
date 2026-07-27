import Foundation

struct GameState: Codable {
    var energy: Double = 0
    var cores: Double = 0
    /// Never spent — drives the permanent per-Core lap bonus.
    var lifetimeCores: Double = 0

    /// Units owned of each generator. Fractional, because generators build
    /// each other continuously rather than in whole steps.
    var owned: [Double] = []
    /// Purchases made of each generator, which is what its price scales on.
    var purchases: [Int] = []

    var perks: Set<Perk> = []

    var energyThisRun: Double = 0
    var lifetimeEnergy: Double = 0
    var promotions = 0

    var lastSeen = Date()
    var playTime: Double = 0

    static func new() -> GameState {
        var s = GameState()
        s.owned = [Double](repeating: 0, count: Gen.count)
        s.purchases = [Int](repeating: 0, count: Gen.count)
        s.owned[0] = 1          // one free unit so the top line moves immediately
        return s
    }

    /// A generator becomes visible once the one before it has been bought.
    func unlocked(_ i: Int) -> Bool {
        i == 0 || purchases[i - 1] > 0
    }

    var deepestUnlocked: Int {
        var deepest = 0
        for i in 0..<Gen.count where unlocked(i) { deepest = i }
        return deepest
    }
}

struct OfflineReport: Identifiable {
    let id = UUID()
    let elapsed: Double
    let efficiency: Double
    let energy: Double
}
