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
                        row("Energy per second", fmt(engine.energyPerSecond))
                        row("Laps per second, per unit", fmt(engine.lapRate))
                        row("Energy per lap", fmt(engine.energyPerLap))
                        row("Energy this run", fmt(engine.state.energyThisRun))
                        row("Energy all time", fmt(engine.state.lifetimeEnergy))
                        row("Promotions", "\(engine.state.promotions)")
                        row("Time played", fmtTime(engine.state.playTime), last: true)
                    }
                    .padding(.vertical, 4)
                }

                SectionHeader(title: "Generators")

                Panel {
                    VStack(spacing: 0) {
                        ForEach(0..<Gen.count, id: \.self) { i in
                            if engine.state.owned[i] > 0 || engine.state.unlocked(i) {
                                HStack(spacing: 9) {
                                    Circle().fill(Gen.color(i)).frame(width: 8, height: 8)
                                    Text(romanNumerals[i])
                                        .font(.system(size: 11, weight: .black, design: .serif))
                                        .foregroundStyle(Palette.text)
                                        .frame(width: 30, alignment: .leading)
                                    Text("×\(fmt(engine.state.owned[i]))")
                                        .font(.mono(11, .bold)).foregroundStyle(Palette.dim)
                                    Spacer()
                                    Text("\(fmt(engine.lapsPerSecond(i)))/s")
                                        .font(.mono(11, .bold)).foregroundStyle(Gen.color(i))
                                }
                                .padding(.horizontal, 13).padding(.vertical, 8)
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
            .padding(.bottom, 24)
        }
        .alert("Erase everything?", isPresented: $confirmingReset) {
            Button("Erase", role: .destructive) { engine.hardReset() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This wipes Cores and perks too. There is no undo.")
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
