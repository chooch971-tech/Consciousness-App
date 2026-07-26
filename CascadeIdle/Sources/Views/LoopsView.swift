import SwiftUI

struct LoopsView: View {
    @Environment(GameEngine.self) private var engine

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ForEach(0..<LoopConfig.count, id: \.self) { i in
                    if engine.state.loops[i].unlocked {
                        LoopCard(tier: i)
                        if i + 1 < LoopConfig.count, engine.state.loops[i + 1].unlocked {
                            PulseConnector(glow: engine.glow(i), color: Palette.tier(i), active: true)
                        }
                    } else if i == engine.nextLockedTier {
                        if i > 0 { PulseConnector(glow: 0, color: Palette.tier(i), active: false) }
                        LockedLoopCard(tier: i)
                    }
                }
                Footer()
            }
            .padding(.horizontal, 14)
            .padding(.top, 6)
            .padding(.bottom, 28)
        }
    }
}

// MARK: - Unlocked loop

private struct LoopCard: View {
    let tier: Int
    @Environment(GameEngine.self) private var engine

    private var cfg: LoopConfig { LoopConfig.all[tier] }
    private var color: Color { Palette.tier(tier) }

    var body: some View {
        Panel(tint: color) {
            VStack(alignment: .leading, spacing: 10) {
                header
                track
                stats
                upgrades
                if !engine.state.loops[tier].modules.isEmpty { moduleStrip }
            }
            .padding(13)
        }
    }

    private var header: some View {
        HStack(spacing: 9) {
            Text(romanNumerals[tier])
                .font(.system(size: 11, weight: .black, design: .serif))
                .foregroundStyle(color)
                .frame(width: 26, height: 22)
                .background(Capsule().fill(color.opacity(0.15)))
                .overlay(Capsule().strokeBorder(color.opacity(0.4), lineWidth: 1))

            Text(cfg.name)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(Palette.text)

            Spacer(minLength: 0)

            VStack(alignment: .trailing, spacing: 1) {
                Text(fmt(engine.state.loops[tier].completions))
                    .font(.mono(12, .bold)).foregroundStyle(Palette.text.opacity(0.8))
                Text("cycles").font(.system(size: 8, weight: .semibold)).foregroundStyle(Palette.dim)
            }
        }
    }

    private var track: some View {
        LoopTrack(progress: engine.progress(tier),
                  glow: engine.glow(tier),
                  color: color)
    }

    private var stats: some View {
        HStack(spacing: 0) {
            stat(fmt(engine.state.loops[tier].charge) + " / " + fmt(engine.requirement(tier)), "charge")
            Divider().frame(height: 20).overlay(Palette.stroke)
            stat(fmtTime(engine.cycleSeconds(tier)), "per cycle")
            Divider().frame(height: 20).overlay(Palette.stroke)
            stat(fmt(cfg.baseYield * engine.yieldMultiplier(tier)), "energy")
            if tier + 1 < LoopConfig.count {
                Divider().frame(height: 20).overlay(Palette.stroke)
                stat(fmt(engine.pulseStrength(tier)), "pulse out")
            }
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 1) {
            Text(value).font(.mono(11, .bold)).foregroundStyle(Palette.text.opacity(0.9))
            Text(label).font(.system(size: 8, weight: .semibold)).foregroundStyle(Palette.dim)
        }
        .frame(maxWidth: .infinity)
    }

    private var upgrades: some View {
        HStack(spacing: 7) {
            UpgradeButton(title: "Yield",
                          level: engine.state.loops[tier].yieldLevel,
                          effect: "×\(fmt(engine.yieldMultiplier(tier)))",
                          cost: engine.yieldCost(tier),
                          currency: Palette.energy,
                          affordable: engine.state.energy >= engine.yieldCost(tier)) {
                engine.buyYield(tier)
            }
            UpgradeButton(title: tier == 0 ? "Speed" : "Intake",
                          level: engine.state.loops[tier].intakeLevel,
                          effect: "×\(fmt(engine.intakeMultiplier(tier)))",
                          cost: engine.intakeCost(tier),
                          currency: Palette.energy,
                          affordable: engine.state.energy >= engine.intakeCost(tier)) {
                engine.buyIntake(tier)
            }
            if tier + 1 < LoopConfig.count {
                UpgradeButton(title: "Pulse",
                              level: engine.state.loops[tier].pulseLevel,
                              effect: "×\(fmt(engine.pulseStrength(tier)))",
                              cost: engine.pulseCost(tier),
                              currency: Palette.energy,
                              affordable: engine.state.energy >= engine.pulseCost(tier)) {
                    engine.buyPulse(tier)
                }
            }
        }
    }

    private var moduleStrip: some View {
        HStack(spacing: 6) {
            ForEach(engine.state.loops[tier].modules) { m in
                HStack(spacing: 4) {
                    Image(systemName: m.symbol).font(.system(size: 9, weight: .bold))
                    Text(m.name).font(.system(size: 9, weight: .semibold))
                }
                .foregroundStyle(Palette.resonance)
                .padding(.horizontal, 7).padding(.vertical, 4)
                .background(Capsule().fill(Palette.resonance.opacity(0.12)))
            }
            Spacer(minLength: 0)
        }
    }
}

// MARK: - Next loop to buy

private struct LockedLoopCard: View {
    let tier: Int
    @Environment(GameEngine.self) private var engine

    private var cfg: LoopConfig { LoopConfig.all[tier] }
    private var color: Color { Palette.tier(tier) }
    private var affordable: Bool { engine.state.energy >= cfg.unlockCost }

    var body: some View {
        Panel(tint: affordable ? color : .white) {
            VStack(alignment: .leading, spacing: 9) {
                HStack(spacing: 9) {
                    Image(systemName: affordable ? "lock.open.fill" : "lock.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(affordable ? color : Palette.dim)
                        .frame(width: 26, height: 22)
                        .background(Capsule().fill((affordable ? color : Palette.dim).opacity(0.12)))
                    Text(cfg.name)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(affordable ? Palette.text : Palette.dim)
                    Spacer(minLength: 0)
                }
                Text(cfg.flavor)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.dim)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 12) {
                    label("\(fmt(cfg.requirement))", "pulses to fill")
                    label(fmt(cfg.baseYield), "base energy")
                    if cfg.baseResonance > 0 { label(fmt(cfg.baseResonance), "base resonance") }
                }

                PrimaryButton(title: "Bring \(cfg.name) online",
                              subtitle: "\(fmt(cfg.unlockCost)) Energy",
                              tint: color,
                              enabled: affordable) {
                    engine.unlockLoop(tier)
                }
            }
            .padding(13)
        }
        .opacity(affordable ? 1 : 0.75)
    }

    private func label(_ v: String, _ l: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(v).font(.mono(12, .bold)).foregroundStyle(Palette.text.opacity(0.85))
            Text(l).font(.system(size: 8, weight: .semibold)).foregroundStyle(Palette.dim)
        }
    }
}

// MARK: - Chain complete

private struct Footer: View {
    @Environment(GameEngine.self) private var engine

    var body: some View {
        if engine.nextLockedTier == nil {
            VStack(spacing: 4) {
                Text("CHAIN COMPLETE")
                    .font(.system(size: 11, weight: .heavy)).kerning(1.6)
                    .foregroundStyle(Palette.tier(7))
                Text("Every rung is online. Collapse to bank the run.")
                    .font(.system(size: 11)).foregroundStyle(Palette.dim)
            }
            .padding(.top, 18)
        }
    }
}
