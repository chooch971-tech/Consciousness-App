import SwiftUI

struct StatsView: View {
    @Environment(GameEngine.self) private var engine
    @State private var confirmingReset = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                SectionHeader(title: "Readout")

                Panel(tint: Palette.energy) {
                    VStack(spacing: 0) {
                        row("Energy per second", fmt(engine.cachedRates.energyPerSecond))
                        row("Resonance per second", fmt(engine.cachedRates.resonancePerSecond))
                        row("Energy this run", fmt(engine.state.energyThisRun))
                        row("Energy all time", fmt(engine.state.lifetimeEnergy))
                        row("Permanent yield bonus", "×\(fmt(engine.echoMultiplier))")
                        row("Spark speed", "×\(fmt(engine.sparkGain))")
                        row("Flywheel", "+\(fmt(engine.state.flywheel * 100))%")
                        row("Collapses", "\(engine.state.collapses)")
                        row("Time played", fmtTime(engine.state.playTime), last: true)
                    }
                    .padding(.vertical, 4)
                }

                SectionHeader(title: "Chain", subtitle: "Estimated steady-state cycle times.")

                Panel {
                    VStack(spacing: 0) {
                        ForEach(0..<LoopConfig.count, id: \.self) { i in
                            if engine.state.loops[i].unlocked {
                                HStack(spacing: 9) {
                                    Text(romanNumerals[i])
                                        .font(.system(size: 10, weight: .black, design: .serif))
                                        .foregroundStyle(Palette.tier(i))
                                        .frame(width: 24)
                                    Text(LoopConfig.all[i].name)
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Palette.text)
                                    Spacer()
                                    Text(fmtTime(engine.cycleSeconds(i)))
                                        .font(.mono(11, .bold)).foregroundStyle(Palette.dim)
                                    Text(fmt(engine.state.loops[i].completions))
                                        .font(.mono(11, .bold))
                                        .foregroundStyle(Palette.tier(i))
                                        .frame(width: 58, alignment: .trailing)
                                }
                                .padding(.horizontal, 13).padding(.vertical, 9)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }

                Button { confirmingReset = true } label: {
                    Text("Erase save")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.red.opacity(0.75))
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color.red.opacity(0.08)))
                }
                .buttonStyle(.plain)
                .padding(.top, 8)
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 28)
        }
        .alert("Erase everything?", isPresented: $confirmingReset) {
            Button("Erase", role: .destructive) { engine.hardReset() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This wipes Echoes and the Array too. There is no undo.")
        }
    }

    private func row(_ label: String, _ value: String, last: Bool = false) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label).font(.system(size: 12)).foregroundStyle(Palette.dim)
                Spacer()
                Text(value).font(.mono(12, .bold)).foregroundStyle(Palette.text)
            }
            .padding(.horizontal, 13).padding(.vertical, 8)
            if !last { Divider().overlay(Palette.stroke).padding(.leading, 13) }
        }
    }
}
