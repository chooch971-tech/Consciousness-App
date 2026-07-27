import Foundation
import Observation
#if canImport(UIKit)
import UIKit
#endif

@Observable
final class GameEngine {

    var state = GameState.new()
    /// Lap phase per generator, 0…1. Purely cosmetic, never saved.
    var phase = [Double](repeating: 0, count: Gen.count)
    /// Timestamp of the last visible lap completion, for the fire-off flash.
    var lastLap = [Double](repeating: -999, count: Gen.count)
    var now = Date.timeIntervalSinceReferenceDate
    var offlineReport: OfflineReport?

    @ObservationIgnored private var timer: Timer?
    @ObservationIgnored private var lastTick = Date.timeIntervalSinceReferenceDate
    @ObservationIgnored private var lastSave = Date.timeIntervalSinceReferenceDate

    init() {
        load()
        applyOfflineProgress()
        start()
    }

    // MARK: - Clock

    func start() {
        timer?.invalidate()
        lastTick = Date.timeIntervalSinceReferenceDate
        let t = Timer(timeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in self?.frame() }
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        state.lastSeen = Date()
        save()
    }

    private func frame() {
        let t = Date.timeIntervalSinceReferenceDate
        let dt = min(max(t - lastTick, 0), 1.0)
        lastTick = t
        now = t
        tick(dt)
        advancePhase(dt)
        state.playTime += dt
        if t - lastSave > 5 {
            lastSave = t
            state.lastSeen = Date()
            save()
        }
    }

    // MARK: - Simulation

    func tick(_ dt: Double) {
        guard dt > 0 else { return }
        let rate = lapRate * dt

        // Walk outward-in so each generator's laps build the one beneath it.
        if Gen.count > 1 {
            for i in stride(from: Gen.count - 1, through: 1, by: -1) {
                let n = state.owned[i]
                if n > 0 { state.owned[i - 1] += n * rate }
            }
        }

        let energy = state.owned[0] * rate * energyPerLap
        state.energy += energy
        state.energyThisRun += energy
        state.lifetimeEnergy += energy

        if state.perks.contains(.autobuy) { autobuy() }
    }

    /// Cosmetic only. Real lap rates run into the millions, so the visible spin
    /// is capped — past a few laps a second the eye reads it as "fast" anyway.
    private func advancePhase(_ dt: Double) {
        for i in 0..<Gen.count {
            let spin = min(lapsPerSecond(i), 2.5)
            guard spin > 0 else { continue }
            let next = phase[i] + spin * dt
            if next >= 1 { lastLap[i] = now }
            phase[i] = next.truncatingRemainder(dividingBy: 1)
        }
    }

    /// 0…1, decaying — a line flashes as it fires, and the pulse it throws at
    /// the line above rides the same value.
    func fire(_ i: Int) -> Double {
        let age = now - lastLap[i]
        guard age >= 0, age < 1 else { return 0 }
        return exp(-age * 7)
    }

    // MARK: - Derived

    /// Laps per second per unit owned, after every global multiplier.
    var lapRate: Double {
        var m = Gen.baseLapRate
        if state.perks.contains(.overdrive1) { m *= 2 }
        if state.perks.contains(.overdrive2) { m *= 3 }
        if state.perks.contains(.overdrive3) { m *= 5 }
        m *= 1 + Balance.corePermanentBonus * state.lifetimeCores
        return m
    }

    var energyPerLap: Double {
        state.perks.contains(.richLap) ? 10 : 1
    }

    func lapsPerSecond(_ i: Int) -> Double {
        state.owned[i] * lapRate
    }

    var energyPerSecond: Double {
        state.owned[0] * lapRate * energyPerLap
    }

    /// What one more purchase of this generator adds to its laps per second.
    func lapGain(_ i: Int) -> Double {
        lapRate
    }

    // MARK: - Buying

    func cost(_ i: Int) -> Double {
        Gen.baseCost[i] * pow(Gen.costGrowth, Double(state.purchases[i]))
    }

    func canBuy(_ i: Int) -> Bool {
        state.unlocked(i) && state.energy >= cost(i)
    }

    @discardableResult func buy(_ i: Int) -> Bool {
        guard purchase(i) else { return false }
        haptic(.light)
        return true
    }

    /// Silent purchase. The autobuyer runs every frame, so it must never
    /// buzz the phone or it would vibrate continuously.
    @discardableResult private func purchase(_ i: Int) -> Bool {
        guard canBuy(i) else { return false }
        state.energy -= cost(i)
        state.owned[i] += 1
        state.purchases[i] += 1
        return true
    }

    /// How many units of `i` the current bank could buy, in closed form —
    /// the price is a geometric series, so there's no need to loop.
    func affordableCount(_ i: Int) -> Int {
        guard state.unlocked(i) else { return 0 }
        let c = cost(i)
        guard state.energy >= c else { return 0 }
        let g = Gen.costGrowth
        let n = log(1 + state.energy * (g - 1) / c) / log(g)
        return max(1, Int(n.rounded(.down)))
    }

    func totalCost(_ i: Int, count n: Int) -> Double {
        guard n > 0 else { return 0 }
        let c = cost(i), g = Gen.costGrowth
        return c * (pow(g, Double(n)) - 1) / (g - 1)
    }

    @discardableResult func buyMax(_ i: Int) -> Int {
        let n = affordableCount(i)
        guard n > 0 else { return 0 }
        state.energy -= totalCost(i, count: n)
        state.owned[i] += Double(n)
        state.purchases[i] += n
        haptic(.medium)
        return n
    }

    /// Buys every generator it can afford, deepest first, so a single tap
    /// pushes the whole machine forward.
    func buyAll(max: Bool) {
        for i in stride(from: Gen.count - 1, through: 0, by: -1) {
            guard state.unlocked(i) else { continue }
            if max { buyMax(i) } else { buy(i) }
        }
    }

    private func autobuy() {
        for i in 0..<Gen.count where state.unlocked(i) {
            // Leave headroom so the autobuyer never empties the bank.
            if cost(i) <= state.energy * 0.25 { purchase(i) }
        }
    }

    // MARK: - Promote (prestige)

    var canPromote: Bool { pendingCores >= 1 }

    var pendingCores: Double {
        guard state.energyThisRun > Balance.promoteFloor else { return 0 }
        let raw = Balance.coreScale * pow(log10(state.energyThisRun) - 6, Balance.coreExponent)
        return max(0, raw.rounded(.down))
    }

    /// Energy this run required for one more Core — the "just one more" readout.
    var energyForNextCore: Double {
        let target = pendingCores + 1
        return pow(10, pow(target / Balance.coreScale, 1 / Balance.coreExponent) + 6)
    }

    func promote() {
        guard canPromote else { return }
        let gained = pendingCores

        var fresh = GameState.new()
        fresh.cores = state.cores + gained
        fresh.lifetimeCores = state.lifetimeCores + gained
        fresh.lifetimeEnergy = state.lifetimeEnergy
        fresh.perks = state.perks
        fresh.promotions = state.promotions + 1
        fresh.playTime = state.playTime

        if state.perks.contains(.headStart) {
            for i in 0..<min(3, Gen.count) {
                fresh.owned[i] += 10
                fresh.purchases[i] = 10
            }
        }
        if state.perks.contains(.deepStart) {
            for i in 3..<min(6, Gen.count) {
                fresh.owned[i] += 5
                fresh.purchases[i] = 5
            }
        }

        state = fresh
        phase = [Double](repeating: 0, count: Gen.count)
        lastLap = [Double](repeating: -999, count: Gen.count)
        haptic(.heavy)
        save()
    }

    // MARK: - Perks

    func owns(_ p: Perk) -> Bool { state.perks.contains(p) }
    func canAfford(_ p: Perk) -> Bool { !owns(p) && state.cores >= p.cost }

    @discardableResult func buy(_ p: Perk) -> Bool {
        guard canAfford(p) else { return false }
        state.cores -= p.cost
        state.perks.insert(p)
        haptic(.medium)
        return true
    }

    // MARK: - Offline

    private var offlineEfficiency: Double {
        state.perks.contains(.coldStorage) ? 1.0 : 0.5
    }
    private var offlineCap: Double {
        state.perks.contains(.coldStorage) ? 24 * 3600 : 4 * 3600
    }

    func applyOfflineProgress() {
        let elapsed = Date().timeIntervalSince(state.lastSeen)
        guard elapsed > 60 else {
            state.lastSeen = Date()
            return
        }
        let effective = min(elapsed, offlineCap) * offlineEfficiency
        let before = state.energy

        // Generators compound into each other, so this has to be integrated in
        // steps rather than multiplied out.
        let steps = 2000
        let dt = effective / Double(steps)
        for _ in 0..<steps { tick(dt) }

        state.lastSeen = Date()
        offlineReport = OfflineReport(elapsed: elapsed,
                                      efficiency: offlineEfficiency,
                                      energy: state.energy - before)
    }

    // MARK: - Persistence

    private var saveURL: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("cascade-save.json")
    }

    func save() {
        do {
            try JSONEncoder().encode(state).write(to: saveURL, options: .atomic)
        } catch {
            print("Cascade: save failed — \(error)")
        }
    }

    func load() {
        guard let data = try? Data(contentsOf: saveURL),
              let loaded = try? JSONDecoder().decode(GameState.self, from: data) else { return }
        state = loaded
        // Tolerate a save written when the generator count was different.
        while state.owned.count < Gen.count { state.owned.append(0) }
        while state.purchases.count < Gen.count { state.purchases.append(0) }
        if state.owned.count > Gen.count { state.owned.removeLast(state.owned.count - Gen.count) }
        if state.purchases.count > Gen.count { state.purchases.removeLast(state.purchases.count - Gen.count) }
    }

    func hardReset() {
        state = GameState.new()
        phase = [Double](repeating: 0, count: Gen.count)
        lastLap = [Double](repeating: -999, count: Gen.count)
        save()
    }

    // MARK: - Feel

    #if canImport(UIKit)
    private func haptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
    #else
    private enum HapticStyle { case light, medium, heavy }
    private func haptic(_ style: HapticStyle) {}
    #endif
}
